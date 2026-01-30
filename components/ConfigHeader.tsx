import { Download } from "lucide-react";
import type { PDFSection } from "@/lib/types";

export default function ConfigHeader({
  title,
  setTitle,
  url,
  setUrl,
  sections,
  subject,
}: any) {
  const handleExport = async () => {
    const res = await fetch("/api/export-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectCode: subject,
        resourceId: title.toLowerCase().replace(/\s+/g, "-"),
        resourceTitle: title,
        baseUrl: url,
        resourceType: "notes",
        sections: sections.map((s: PDFSection) => ({
          id: s.title.toLowerCase().replace(/\s+/g, "-"),
          title: s.title,
          sourcePdf: s.pdfName,
          startPage: s.startPage,
          endPage: s.endPage,
        })),
      }),
    });
    if (res.ok) alert("Export Successful!");
  };

  return (
    <header className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl flex flex-col gap-4">
      <div className="flex gap-4 items-end">
        <div className="flex-1 space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase px-1">
            Resource Title
          </label>
          <input
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <button
          onClick={handleExport}
          className="bg-blue-600 px-6 py-2 rounded-lg font-bold text-sm h-10 hover:bg-blue-500 flex items-center gap-2"
        >
          <Download className="w-4 h-4" /> EXPORT
        </button>
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-slate-500 uppercase px-1">
          CDN Base URL
        </label>
        <input
          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>
    </header>
  );
}
