import "server-only";

import { fileURLToPath } from "url";
import path from "node:path";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT_FOLDER = path.join(__dirname, "../../admin/input/");
const OUTPUT_FOLDER = path.join(__dirname, "../../public/output/");

function sha256File(filePath: string) {
  const hash = crypto.createHash("sha256");
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return hash.digest("hex");
}

function compressPDFCommand(inputPDF: string, outputPDF: string) {
  execFileSync(
    "gs",
    [
      "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.4",
      "-dNOPAUSE",
      "-dBATCH",
      "-dSAFER",
      "-dDownsampleColorImages=true",
      "-dColorImageResolution=150",
      "-dDownsampleGrayImages=true",
      "-dGrayImageResolution=150",
      "-dDownsampleMonoImages=true",
      "-dMonoImageResolution=300",
      `-sOutputFile=` + outputPDF,
      inputPDF,
    ],
    {
      encoding: "utf-8",
    },
  );
}

export default function compressPDF(
  subject: string,
  pdf: string,
  inputFolder: string = INPUT_FOLDER,
  outputFolder: string = OUTPUT_FOLDER,
) {
  const subjectInput = path.join(inputFolder, subject);
  const subjectOutput = path.join(outputFolder, subject);

  fs.mkdirSync(subjectOutput, { recursive: true });

  const inputPDF = path.join(subjectInput, pdf);
  const sanitizedPdfName = pdf.replace(/\s+/g, "-");
  const compressedPDF = path.join(
    subjectOutput,
    `compressed-${sanitizedPdfName}`,
  );

  compressPDFCommand(inputPDF, compressedPDF);

  const checksum = sha256File(compressedPDF);

  return {
    filePath: compressedPDF,
    checksum,
  };
}
