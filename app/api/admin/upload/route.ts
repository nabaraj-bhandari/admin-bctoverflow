import { getSha, uploadPdf } from "@/lib/github";
import { slugify } from "@/lib/helperFunctions";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { readFileSync } from "fs";
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
  const createdFiles: string[] = [];

  for (const section of sections) {
    const sourcePath = path.join(outputBase, section.sourcePdf);

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
      const fileName = `${slugify(section.title)}.pdf`;
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
  sectionsMeta: Section[],
) => {
  await prisma.subject.upsert({
    where: { code: subjectCode },
    update: {},
    create: { code: subjectCode },
  });

  const resource = await prisma.resource.upsert({
    where: {
      subjectCode_id: {
        subjectCode,
        id: resourceId,
      },
    },
    update: {},
    create: {
      id: resourceId,
      subjectCode,
      title: resourceTitle,
    },
  });

  const conflicts: string[] = [];

  for (const file of files) {
    const sectionId = file.replace(".pdf", "");
    const localPath = path.join(sectionsDir, file);
    const { hash, buffer } = getFileData(localPath);

    const meta = sectionsMeta.find((s) => s.id === sectionId);
    const sectionTitle = meta?.title ?? sectionId;

    const existing = await prisma.section.findUnique({
      where: {
        subjectCode_resourceId_id: {
          subjectCode,
          resourceId: resource.id,
          id: sectionId,
        },
      },
    });

    if (existing) {
      if (existing.checksum !== hash) {
        conflicts.push(sectionId);
      }
      continue;
    }

    const githubPath = `resources/${subjectCode}/${resourceId}/sections/${file}`;
    const sha = await getSha(githubPath);

    await uploadPdf(githubPath, buffer, sha ?? undefined);
    await delay(200);

    await prisma.section.create({
      data: {
        id: sectionId,
        title: sectionTitle,
        checksum: hash,
        resourceId: resource.id,
        subjectCode,
      },
    });
  }

  if (conflicts.length > 0) {
    throw new Error(`Conflicts detected for sections: ${conflicts.join(", ")}`);
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
      sections,
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
