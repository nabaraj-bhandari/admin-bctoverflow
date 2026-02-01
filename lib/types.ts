export interface PDFSection {
  id: string;
  pdfName: string;
  title: string;
  startPage: number;
  endPage: number;
  position: number;
  duration: number;
  color: string;
}

export interface SubjectClientProps {
  subject: string;
  pdfs: string[];
  compressedPdfs: string[];
}

export const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];
