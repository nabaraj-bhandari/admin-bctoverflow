"use client";
import { PDFSection } from "@/lib/types";
import { Plus, Zap } from "lucide-react";
import { Document, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface LibrarySidebarInterface {
  pdfs: string[];
  compressedPdfs: string[];
  subject: string;
  setSections: React.Dispatch<React.SetStateAction<PDFSection[]>>;
  sections: PDFSection[];
  numPages: {
    [key: string]: number;
  };
  setNumPages: React.Dispatch<
    React.SetStateAction<{
      [key: string]: number;
    }>
  >;
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
}: LibrarySidebarInterface) {
  const handleProcess = async (pdf: string) => {
    await fetch("/api/admin/compress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, pdf }),
    });
  };

  return (
    <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col overflow-hidden">
      <div className="overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        <h2 className="text-[10px] font-black text-slate-500 border-b uppercase tracking-widest">
          Compressed PDFs
        </h2>
        <div className="space-y-2 border-slate-800">
          {compressedPdfs.map((cpdf: string) => (
            <div
              key={cpdf}
              className="bg-slate-800 p-3 rounded-xl border border-slate-700 flex justify-between items-center group"
            >
              <span className="text-[11px] font-bold truncate pr-4">
                {cpdf}
              </span>
              <button
                onClick={() => {
                  const p = numPages[cpdf] || 1;
                  setSections([
                    ...sections,
                    {
                      id: `sec-${Date.now()}`,
                      pdfName: cpdf,
                      title: "Untitled Section",
                      startPage: 1,
                      endPage: p,
                      position: maxTimelinePage,
                      duration: p,
                      color: "#3b82f6",
                    },
                  ]);
                }}
                className="bg-blue-600 hover:bg-blue-500 p-1.5 rounded-lg transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
              <div className="hidden">
                <Document
                  file={`/output/${subject}/${cpdf}`}
                  onLoadSuccess={(d) =>
                    setNumPages((prev) => ({
                      ...prev,
                      [cpdf]: d.numPages,
                    }))
                  }
                />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <h2 className="text-[10px] font-black text-slate-500 border-b uppercase tracking-widest">
            All PDFs
          </h2>
          {pdfs.map((pdf: string) => (
            <div
              key={pdf}
              className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 flex justify-between items-center"
            >
              <span className="text-[11px] font-bold truncate pr-4">{pdf}</span>
              <button
                onClick={() => handleProcess(pdf)}
                className="text-[10px] bg-blue-600/20 text-blue-400 border border-blue-600/30 px-3 py-1 rounded-lg flex items-center gap-1 hover:bg-blue-600 hover:text-white transition-all"
              >
                <Zap className="w-3 h-3" /> COMPRESS
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
