export interface PDFSection {
  id: string;
  pdfName: string; // e.g., 'compressed-InsightsCG.pdf'
  title: string; // e.g., 'Introduction to Graphics'
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
