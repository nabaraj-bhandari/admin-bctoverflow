import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import fs from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const {
      subjectCode,
      subjectTitle,
      resourceId,
      resourceTitle,
      baseUrl,
      resourceType,
      sections,
    } = await req.json();

    const baseDir = path.join(
      process.cwd(),
      "public",
      "resources",
      subjectCode,
      resourceId,
    );
    const sectionsDir = path.join(baseDir, "sections");
    await fs.mkdir(sectionsDir, { recursive: true });

    const processedSections = [];

    for (const section of sections) {
      // 1. Load the specific compressed source
      const sourcePath = path.join(
        process.cwd(),
        "public",
        "output",
        subjectCode,
        section.sourcePdf,
      );
      const sourceBytes = await fs.readFile(sourcePath);
      const srcDoc = await PDFDocument.load(sourceBytes);
      const newDoc = await PDFDocument.create();

      // 2. Extract pages (pdf-lib is 0-indexed)
      const pageIndices = [];
      for (let i = section.startPage - 1; i < section.endPage; i++) {
        pageIndices.push(i);
      }

      const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
      copiedPages.forEach((p) => newDoc.addPage(p));

      // 3. Save individual PDF
      const fileName = `${section.id}.pdf`;
      const pdfBytes = await newDoc.save();
      await fs.writeFile(path.join(sectionsDir, fileName), pdfBytes);

      processedSections.push({
        id: section.id,
        title: section.title,
        url: `${baseUrl.replace(/\/$/, "")}/resources/${subjectCode}/${resourceId}/sections/${fileName}`,
      });
    }

    // 4. Create the final manifest
    const manifest = {
      subject: { code: subjectCode, title: subjectTitle },
      resources: [
        {
          id: resourceId,
          title: resourceTitle,
          type: resourceType,
          sections: processedSections,
        },
      ],
    };

    await fs.writeFile(
      path.join(baseDir, "manifest.json"),
      JSON.stringify(manifest, null, 2),
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Export Error:", error);
    return NextResponse.json({ error: error }, { status: 500 });
  }
}
