import { CDN_BASE } from "@/lib/data";
import { getSha, uploadPdf } from "@/lib/github";
import { slugify } from "@/lib/helperFunctions";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { existsSync, readFileSync } from "fs";
import fs from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { PDFDocument } from "pdf-lib";

type Section = {
  id: string;
  title: string;
  sourcePdf: string;
  startPage: number;
  endPage: number;
};

function getFileData(filePath: string) {
  const buffer = readFileSync(filePath);
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  return { buffer, hash };
}

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

const splitPdf = async (
  outputBase: string,
  sections: Section[],
  sectionsDir: string,
) => {
  const sourceCache = new Map();
  const createdFiles: string[] = []; // Track created files

  for (const section of sections) {
    const sourcePath = path.join(outputBase, section.sourcePdf);

    if (!existsSync(sourcePath)) {
      throw new Error(
        `Source PDF not found at: ${sourcePath}. Did you compress it first?`,
      );
    }

    if (!sourceCache.has(section.sourcePdf)) {
      const sourceBytes = await fs.readFile(sourcePath);
      sourceCache.set(section.sourcePdf, await PDFDocument.load(sourceBytes));
    }

    const srcDoc = sourceCache.get(section.sourcePdf);
    const newDoc = await PDFDocument.create();

    const totalPages = srcDoc.getPageCount();
    const start = Math.max(0, section.startPage - 1);
    const end = Math.min(totalPages, section.endPage);

    // Validation
    if (section.startPage < 1 || section.endPage < section.startPage) {
      throw new Error(
        `Invalid page range for section "${section.title}": ${section.startPage}-${section.endPage}`,
      );
    }

    if (end > totalPages) {
      throw new Error(
        `Section "${section.title}" end page ${section.endPage} exceeds total pages ${totalPages}`,
      );
    }

    const pageIndices = [];
    for (let i = start; i < end; i++) {
      pageIndices.push(i);
    }

    if (pageIndices.length > 0) {
      const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
      copiedPages.forEach((p) => newDoc.addPage(p));

      const pdfBytes = await newDoc.save();
      const fileName = `${section.id}.pdf`;
      await fs.writeFile(path.join(sectionsDir, fileName), pdfBytes);
      createdFiles.push(fileName);
    }
  }

  // Clear cache to free memory
  sourceCache.clear();

  return createdFiles;
};

const uploadFiles = async (
  files: string[],
  subjectCode: string,
  resourceId: string,
  resourceTitle: string,
  sectionsDir: string,
  sectionsMetadata: Section[], // Pass section metadata for titles
) => {
  // Ensure subject exists
  await prisma.subject.upsert({
    where: { code: subjectCode },
    update: {},
    create: {
      code: subjectCode,
    },
  });

  // Ensure resource exists
  const resource = await prisma.resource.upsert({
    where: {
      id_subjectCode: { id: resourceId, subjectCode },
    },
    update: {
      title: resourceTitle,
    },
    create: {
      id: resourceId,
      subjectCode,
      title: resourceTitle,
      githubPath: `resources/${subjectCode}/${resourceId}`,
    },
  });

  const conflicts: string[] = [];

  for (const file of files) {
    const sectionId = file.replace(".pdf", "");
    const localPath = path.join(sectionsDir, file);

    // Find the section metadata to get the title
    const sectionMeta = sectionsMetadata.find((s) => s.id === sectionId);
    const sectionTitle = sectionMeta?.title || sectionId.replace(/-/g, " ");

    const { buffer, hash } = getFileData(localPath);

    const existing = await prisma.section.findUnique({
      where: {
        id_resourceId: {
          id: sectionId,
          resourceId: resource.id,
        },
      },
    });

    // Check if already up to date
    if (existing && existing.checksum === hash) {
      console.log(`✓ Skipping ${sectionId}, already up to date.`);
      continue;
    }

    // Check for conflicts (existing but different content)
    if (existing) {
      conflicts.push(sectionId);
      console.warn(`⚠ Conflict detected for section: ${sectionId}`);
      continue; // Continue to next section instead of stopping
    }

    const githubPath = `${resource.githubPath}/sections/${file}`;
    const sha = await getSha(githubPath);

    await uploadPdf(githubPath, buffer, sha ?? undefined);
    await delay(200);

    const url = `${CDN_BASE}/${githubPath}`;

    await prisma.section.create({
      data: {
        id: sectionId,
        title: sectionTitle,
        checksum: hash,
        url,
        resource: {
          connect: {
            id: resource.id,
          },
        },
      },
    });

    console.log(`✓ Uploaded section: ${sectionTitle}`);
  }

  // If there were conflicts, throw error with all conflicts
  if (conflicts.length > 0) {
    throw new Error(
      `Conflicts detected for sections: ${conflicts.join(", ")}. These sections already exist with different content.`,
    );
  }
};

export async function POST(req: NextRequest) {
  try {
    const { subjectCode, resourceTitle, sections } = await req.json();

    // Validation
    if (!subjectCode || !resourceTitle || !sections || sections.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const resourceId = slugify(resourceTitle);

    const outputBase = path.join(
      process.cwd(),
      "public",
      "output",
      subjectCode,
    );
    const resourceDir = path.join(outputBase, resourceId);
    const sectionsDir = path.join(resourceDir, "sections");

    await fs.mkdir(sectionsDir, { recursive: true });

    // Split PDFs and get list of created files
    const createdFiles = await splitPdf(outputBase, sections, sectionsDir);

    console.log(`Created ${createdFiles.length} section PDFs`);

    // Upload files with metadata
    await uploadFiles(
      createdFiles,
      subjectCode,
      resourceId,
      resourceTitle,
      sectionsDir,
      sections, // Pass sections for title lookup
    );

    return NextResponse.json({
      success: true,
      sectionsProcessed: createdFiles.length,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("CRITICAL PROCESS ERROR:", error.message);
    return NextResponse.json(
      { error: error.message },
      { status: error.message.includes("Conflict") ? 409 : 500 },
    );
  }
}
