import { CloudUpload } from "lucide-react";
import { useState } from "react";
import { PDFSection } from "@/lib/types";

type ConfigHeaderProps = {
  title: string;
  setTitle: React.Dispatch<React.SetStateAction<string>>;
  subject: string;
  sections: PDFSection[];
};
export default function ConfigHeader({
  title,
  setTitle,
  subject,
  sections,
}: ConfigHeaderProps) {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleUpload = async () => {
    if (!title) return alert("Please enter a Resource Title first.");
    setIsProcessing(true);
    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectCode: subject,
          resourceTitle: title,
          sections: sections.map((s: PDFSection) => ({
            id: s.id,
            title: s.title,
            sourcePdf: s.pdfName,
            startPage: s.startPage,
            endPage: s.endPage,
          })),
        }),
      });
      if (res.ok) alert("Processing Complete! PDFs generated locally.");
      else throw new Error("Processing failed");
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      alert("Error: Processing failed. Check server console.");
    } finally {
      setIsProcessing(false);
    }
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
            placeholder="e.g. Introduction to Graphics"
          />
        </div>

        <button
          onClick={handleUpload}
          disabled={isProcessing || !title}
          className="bg-amber-600 px-4 py-2 rounded-lg font-bold text-xs h-10 hover:bg-amber-500 disabled:opacity-50 flex items-center gap-2 transition-all"
        >
          <CloudUpload
            className={`w-4 h-4 ${isProcessing ? "animate-spin" : ""}`}
          />
          {isProcessing ? "PROCESSING..." : "UPLOAD"}
        </button>
      </div>
    </header>
  );
}
