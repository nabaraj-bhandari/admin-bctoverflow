"use client";

import { PDFSection } from "@/lib/types";
import { Plus, Zap, Loader2 } from "lucide-react";
import { Document, pdfjs } from "react-pdf";
import { useState } from "react";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface LibrarySidebarProps {
  pdfs: string[];
  compressedPdfs: string[];
  subject: string;
  setSections: React.Dispatch<React.SetStateAction<PDFSection[]>>;
  sections: PDFSection[];
  numPages: Record<string, number>;
  setNumPages: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  maxTimelinePage: number;
}

export default function LibrarySidebar({
  pdfs,
  compressedPdfs,
  subject,
  setSections,
  sections,
  numPages,
  setNumPages,
  maxTimelinePage,
}: LibrarySidebarProps) {
  const [processingPdfs, setProcessingPdfs] = useState<Set<string>>(new Set());

  const handleCompress = async (pdf: string) => {
    setProcessingPdfs((prev) => new Set(prev).add(pdf));

    try {
      const res = await fetch("/api/admin/compress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, pdf }),
      });

      if (!res.ok) {
        throw new Error("Compression failed");
      }
    } catch (error) {
      console.error("Compression error:", error);
      alert("Failed to compress PDF. Please try again.");
    } finally {
      setProcessingPdfs((prev) => {
        const newSet = new Set(prev);
        newSet.delete(pdf);
        return newSet;
      });
    }
  };

  const handleAddSection = (pdfName: string) => {
    const pageCount = numPages[pdfName] || 1;
    const newSection: PDFSection = {
      id: `sec-${Date.now()}`,
      pdfName,
      title: "Untitled Section",
      startPage: 1,
      endPage: pageCount,
      position: maxTimelinePage,
      duration: pageCount,
      color: "#3b82f6",
    };

    setSections([...sections, newSection]);
  };

  return (
    <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col overflow-hidden">
      <div className="overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        <section>
          <SectionHeader title="Compressed PDFs" />
          <div className="space-y-2">
            {compressedPdfs.length === 0 ? (
              <EmptyMessage message="No compressed PDFs yet" />
            ) : (
              compressedPdfs.map((pdf) => (
                <CompressedPdfItem
                  key={pdf}
                  pdfName={pdf}
                  subject={subject}
                  onAdd={() => handleAddSection(pdf)}
                  onLoadPages={(pages) =>
                    setNumPages((prev) => ({ ...prev, [pdf]: pages }))
                  }
                />
              ))
            )}
          </div>
        </section>

        <section>
          <SectionHeader title="All PDFs" />
          <div className="space-y-2">
            {pdfs.length === 0 ? (
              <EmptyMessage message="No PDFs uploaded" />
            ) : (
              pdfs.map((pdf) => (
                <UncompressedPdfItem
                  key={pdf}
                  pdfName={pdf}
                  isProcessing={processingPdfs.has(pdf)}
                  onCompress={() => handleCompress(pdf)}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="text-[10px] font-black text-slate-500 border-b border-slate-800 pb-2 mb-3 uppercase tracking-widest">
      {title}
    </h2>
  );
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <div className="text-xs text-slate-600 text-center py-4 italic">
      {message}
    </div>
  );
}

interface CompressedPdfItemProps {
  pdfName: string;
  subject: string;
  onAdd: () => void;
  onLoadPages: (pages: number) => void;
}

function CompressedPdfItem({
  pdfName,
  subject,
  onAdd,
  onLoadPages,
}: CompressedPdfItemProps) {
  return (
    <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 flex justify-between items-center group hover:border-slate-600 transition-colors">
      <span className="text-[11px] font-bold truncate pr-4 flex-1">
        {pdfName}
      </span>

      <button
        onClick={onAdd}
        className="bg-blue-600 hover:bg-blue-500 p-1.5 rounded-lg transition-all shrink-0"
        aria-label="Add to timeline"
      >
        <Plus className="w-4 h-4" />
      </button>

      <div className="hidden">
        <Document
          file={`/output/${subject}/${pdfName}`}
          onLoadSuccess={(doc) => onLoadPages(doc.numPages)}
        />
      </div>
    </div>
  );
}

interface UncompressedPdfItemProps {
  pdfName: string;
  isProcessing: boolean;
  onCompress: () => void;
}

function UncompressedPdfItem({
  pdfName,
  isProcessing,
  onCompress,
}: UncompressedPdfItemProps) {
  return (
    <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 flex justify-between items-center hover:bg-slate-800/70 transition-colors">
      <span className="text-[11px] font-bold truncate pr-4 flex-1">
        {pdfName}
      </span>

      <button
        onClick={onCompress}
        disabled={isProcessing}
        className="text-[10px] bg-blue-600/20 text-blue-400 border border-blue-600/30 px-3 py-1 rounded-lg flex items-center gap-1 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            PROCESSING
          </>
        ) : (
          <>
            <Zap className="w-3 h-3" />
            COMPRESS
          </>
        )}
      </button>
    </div>
  );
}
