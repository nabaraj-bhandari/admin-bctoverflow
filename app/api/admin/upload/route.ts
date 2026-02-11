import { uploadPdf } from "@/lib/github";
import { slugify } from "@/lib/helperFunctions";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import fs from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { PDFDocument } from "pdf-lib";
import { getCatalog, catalogChecksum } from "@/lib/helperFunctions";

type Section = {
  id: string;
  title: string;
  sourcePdf: string;
  startPage: number;
  endPage: number;
};

type CreatedFile = {
  fileName: string;
  sectionId: string;
};

async function getFileData(filePath: string) {
  const buffer = await fs.readFile(filePath);
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  return { buffer, hash };
}

const splitPdf = async (
  outputBase: string,
  sections: Section[],
  sectionsDir: string,
): Promise<CreatedFile[]> => {
  const sourceCache = new Map<string, PDFDocument>();
  const created: CreatedFile[] = [];

  for (const section of sections) {
    const sourcePath = path.join(outputBase, section.sourcePdf);

    if (!sourceCache.has(section.sourcePdf)) {
      const bytes = await fs.readFile(sourcePath);
      sourceCache.set(section.sourcePdf, await PDFDocument.load(bytes));
    }

    const srcDoc = sourceCache.get(section.sourcePdf)!;
    const newDoc = await PDFDocument.create();

    const start = section.startPage - 1;
    const end = section.endPage;

    if (section.startPage < 1 || end < section.startPage) {
      throw new Error(`Invalid page range for "${section.title}"`);
    }

    if (end > srcDoc.getPageCount()) {
      throw new Error(`"${section.title}" exceeds page count`);
    }

    const pages = await newDoc.copyPages(
      srcDoc,
      Array.from({ length: end - start }, (_, i) => start + i),
    );

    pages.forEach((p) => newDoc.addPage(p));

    const pdfBytes = await newDoc.save();
    const fileName = `${slugify(section.title)}.pdf`;

    await fs.writeFile(path.join(sectionsDir, fileName), pdfBytes);

    created.push({
      fileName,
      sectionId: section.id,
    });
  }

  return created;
};

const uploadFiles = async (
  files: CreatedFile[],
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
      subjectCode_id: { subjectCode, id: resourceId },
    },
    update: {},
    create: {
      id: resourceId,
      subjectCode,
      title: resourceTitle,
      githubPath: `resources/${subjectCode}/${resourceId}`,
    },
  });

  const conflicts: string[] = [];

  for (const { fileName, sectionId } of files) {
    const meta = sectionsMeta.find((s) => s.id === sectionId);
    if (!meta) continue;

    const { buffer, hash } = await getFileData(
      path.join(sectionsDir, fileName),
    );

    const existing = await prisma.section.findUnique({
      where: {
        subjectCode_resourceId_id: {
          subjectCode,
          resourceId,
          id: sectionId,
        },
      },
    });

    if (existing) {
      if (existing.checksum !== hash) conflicts.push(sectionId);
      continue;
    }

    const githubPath = `${resource.githubPath}/sections/${fileName}`;
    await uploadPdf(githubPath, buffer);

    await prisma.section.create({
      data: {
        id: sectionId,
        subjectCode,
        resourceId,
        title: meta.title,
        checksum: hash,
      },
    });
  }

  if (conflicts.length) {
    throw new Error(`Conflicts detected for sections: ${conflicts.join(", ")}`);
  }
};

export async function POST(req: NextRequest) {
  try {
    const { subjectCode, resourceTitle, sections } = await req.json();

    if (!subjectCode || !resourceTitle || !sections?.length) {
      return NextResponse.json(
        { error: "subjectCode, resourceTitle, sections required" },
        { status: 400 },
      );
    }

    const trimmedTitle = resourceTitle.trim();
    if (!trimmedTitle) {
      return NextResponse.json(
        { error: "Resource title cannot be empty" },
        { status: 400 },
      );
    }

    const resourceId = slugify(trimmedTitle);

    const outputBase = path.join(
      process.cwd(),
      "public",
      "output",
      subjectCode,
    );

    const sectionsDir = path.join(outputBase, resourceId, "sections");
    await fs.mkdir(sectionsDir, { recursive: true });

    const createdFiles = await splitPdf(outputBase, sections, sectionsDir);

    await uploadFiles(
      createdFiles,
      subjectCode,
      resourceId,
      trimmedTitle,
      sectionsDir,
      sections,
    );

    const catalog = await getCatalog();
    const checksum = catalogChecksum(catalog);

    await prisma.metaData.upsert({
      where: { id: 1 },
      update: { checksum },
      create: { id: 1, checksum },
    });

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
