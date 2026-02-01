"use client";
import { PDFSection } from "@/lib/types";
import { FileText } from "lucide-react";
import { Document, Page } from "react-pdf";

interface PreviewMonitorInterface {
  currentInfo: {
    section: PDFSection;
    page: number;
  } | null;
  subject: string;
  currentPage: number;
}
export default function PreviewMonitor({
  currentInfo,
  subject,
  currentPage,
}: PreviewMonitorInterface) {
  return (
    <section
      className="w-[40%] bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center justify-center relative shadow-2xl overflow-hidden p-6"
      tabIndex={-1}
    >
      {currentInfo ? (
        <div className="flex flex-col items-center h-full w-full">
          <div className="flex-1 bg-white rounded shadow-2xl overflow-hidden mb-4 max-w-full">
            <Document
              file={`/output/${subject}/${currentInfo.section.pdfName}`}
            >
              <Page
                pageNumber={currentInfo.page}
                height={window.innerHeight - 200}
                className="h-full w-auto"
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>
          </div>
          <div className="bg-black/60 px-4 py-1.5 rounded-full text-[11px] text-slate-300 font-mono flex items-center gap-3">
            <span className="text-blue-400 font-bold">PAGE {currentPage}</span>
            <span className="w-px h-3 bg-slate-700"></span>
            <span className="uppercase tracking-wider">
              {currentInfo.section.title}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center opacity-10">
          <FileText className="w-20 h-20 mb-4" />
          <p className="text-lg font-bold uppercase tracking-widest">
            Preview Monitor
          </p>
        </div>
      )}
    </section>
  );
}
