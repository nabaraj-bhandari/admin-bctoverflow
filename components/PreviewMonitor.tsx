"use client";

import { PDFSection } from "@/lib/types";
import { FileText, AlertCircle } from "lucide-react";
import { Document, Page } from "react-pdf";
import { useState } from "react";

interface PreviewMonitorProps {
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
}: PreviewMonitorProps) {
  const [error, setError] = useState<string | null>(null);

  if (!currentInfo) {
    return <EmptyState />;
  }

  const pdfPath = `/output/${subject}/${currentInfo.section.pdfName}`;

  return (
    <section className="w-[40%] bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center justify-center relative shadow-2xl overflow-hidden p-6">
      <div className="flex flex-col items-center h-full w-full">
        <div className="flex-1 bg-white rounded shadow-2xl overflow-hidden mb-4 max-w-full flex items-center justify-center">
          {error ? (
            <ErrorState message={error} />
          ) : (
            <Document
              file={pdfPath}
              loading={<LoadingState />}
              error={<ErrorState message="Failed to load PDF" />}
              onLoadSuccess={() => {
                setError(null);
              }}
              onLoadError={(err) => {
                setError(err.message || "Failed to load PDF");
              }}
            >
              <Page
                pageNumber={currentInfo.page}
                height={window.innerHeight - 200}
                className="h-full w-auto"
                renderTextLayer={false}
                renderAnnotationLayer={false}
                loading={<LoadingState />}
              />
            </Document>
          )}
        </div>

        <InfoBar
          currentPage={currentPage}
          sectionTitle={currentInfo.section.title}
          pdfPage={currentInfo.page}
        />
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <section className="w-[40%] bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center justify-center relative shadow-2xl overflow-hidden p-6">
      <div className="flex flex-col items-center opacity-10">
        <FileText className="w-20 h-20 mb-4" />
        <p className="text-lg font-bold uppercase tracking-widest">
          Preview Monitor
        </p>
        <p className="text-xs text-slate-500 mt-2">
          Add a section to the timeline to preview
        </p>
      </div>
    </section>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center w-full h-full">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Loading PDF...</p>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center w-full h-full p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-sm font-semibold text-red-500">Error Loading PDF</p>
        <p className="text-xs text-slate-400 max-w-sm">{message}</p>
      </div>
    </div>
  );
}

interface InfoBarProps {
  currentPage: number;
  sectionTitle: string;
  pdfPage: number;
}

function InfoBar({ currentPage, sectionTitle, pdfPage }: InfoBarProps) {
  return (
    <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full text-[11px] text-slate-300 font-mono flex items-center gap-3 shadow-lg">
      <div className="flex items-center gap-2">
        <span className="text-blue-400 font-bold">PAGE {currentPage}</span>
        <span className="text-slate-600">→</span>
        <span className="text-slate-500">PDF: {pdfPage}</span>
      </div>
      <span className="w-px h-3 bg-slate-700" />
      <span className="uppercase tracking-wider truncate max-w-xs">
        {sectionTitle}
      </span>
    </div>
  );
}
