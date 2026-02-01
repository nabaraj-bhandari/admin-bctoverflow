import "server-only";

import { fileURLToPath } from "url";
import path from "node:path";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT_FOLDER = path.join(__dirname, "../admin/input");
const OUTPUT_FOLDER = path.join(__dirname, "../public/output");

export function listSubjects() {
  if (!fs.existsSync(INPUT_FOLDER)) {
    fs.mkdirSync(INPUT_FOLDER, { recursive: true });
    return [];
  }
  return fs.readdirSync(INPUT_FOLDER);
}

export function listPDFs(subjectCode: string) {
  if (!subjectCode) {
    throw new Error("Cannot be passed empty subjectCode");
  }
  const subjectPath = path.join(INPUT_FOLDER, subjectCode);

  if (!fs.existsSync(subjectPath)) {
    return [];
  }
  return fs
    .readdirSync(subjectPath)
    .filter((f) => f.endsWith(".pdf"))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function listCompressedPDFs(subjectCode: string) {
  if (!subjectCode) {
    throw new Error("Cannot be passed empty subjectCode");
  }
  const subjectPath = path.join(OUTPUT_FOLDER, subjectCode);

  if (!fs.existsSync(subjectPath)) {
    return [];
  }
  return fs
    .readdirSync(subjectPath)
    .filter((f) => f.endsWith(".pdf"))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}
