"use client";

import { CloudUpload, CheckCircle, AlertCircle } from "lucide-react";
import { useState } from "react";
import { PDFSection } from "@/lib/types";

interface ConfigHeaderProps {
  title: string;
  setTitle: React.Dispatch<React.SetStateAction<string>>;
  subject: string;
  sections: PDFSection[];
}

type UploadStatus = "idle" | "processing" | "success" | "error";

export default function ConfigHeader({
  title,
  setTitle,
  subject,
  sections,
}: ConfigHeaderProps) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleUpload = async () => {
    // Validation
    if (!title.trim()) {
      setErrorMessage("Please enter a resource title");
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
      return;
    }

    if (sections.length === 0) {
      setErrorMessage("Please add at least one section to the timeline");
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
      return;
    }

    setStatus("processing");
    setErrorMessage("");

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectCode: subject,
          resourceTitle: title,
          sections: sections.map((s) => ({
            id: s.id,
            title: s.title,
            sourcePdf: s.pdfName,
            startPage: s.startPage,
            endPage: s.endPage,
          })),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Upload failed");
      }

      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (error) {
      console.error("Upload error:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Upload failed. Please try again.",
      );
      setStatus("error");
      setTimeout(() => setStatus("idle"), 5000);
    }
  };

  const isDisabled = status === "processing" || !title.trim();

  return (
    <header className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl flex flex-col gap-4">
      <div className="flex gap-4 items-end">
        {/* Title Input */}
        <div className="flex-1 space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase px-1">
            Resource Title
          </label>
          <input
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Introduction to Graphics"
            disabled={status === "processing"}
            maxLength={100}
          />
        </div>

        {/* Upload Button */}
        <UploadButton
          status={status}
          isDisabled={isDisabled}
          onClick={handleUpload}
        />
      </div>

      {/* Status Messages */}
      {status === "error" && errorMessage && (
        <StatusMessage type="error" message={errorMessage} />
      )}
      {status === "success" && (
        <StatusMessage
          type="success"
          message="Processing complete! PDFs generated successfully."
        />
      )}

      {/* Section Count */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>
          {sections.length} section{sections.length !== 1 ? "s" : ""} in
          timeline
        </span>
        {sections.length > 0 && (
          <>
            <span className="w-1 h-1 bg-slate-700 rounded-full" />
            <span>
              {sections.reduce((total, s) => total + s.duration, 0)} total pages
            </span>
          </>
        )}
      </div>
    </header>
  );
}

// ===== SUBCOMPONENTS =====

interface UploadButtonProps {
  status: UploadStatus;
  isDisabled: boolean;
  onClick: () => void;
}

function UploadButton({ status, isDisabled, onClick }: UploadButtonProps) {
  const getButtonContent = () => {
    switch (status) {
      case "processing":
        return (
          <>
            <CloudUpload className="w-4 h-4 animate-spin" />
            PROCESSING...
          </>
        );
      case "success":
        return (
          <>
            <CheckCircle className="w-4 h-4" />
            SUCCESS
          </>
        );
      case "error":
        return (
          <>
            <AlertCircle className="w-4 h-4" />
            TRY AGAIN
          </>
        );
      default:
        return (
          <>
            <CloudUpload className="w-4 h-4" />
            UPLOAD
          </>
        );
    }
  };

  const getButtonColor = () => {
    switch (status) {
      case "success":
        return "bg-green-600 hover:bg-green-500";
      case "error":
        return "bg-red-600 hover:bg-red-500";
      default:
        return "bg-amber-600 hover:bg-amber-500";
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`${getButtonColor()} px-4 py-2 rounded-lg font-bold text-xs h-10 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {getButtonContent()}
    </button>
  );
}

interface StatusMessageProps {
  type: "success" | "error";
  message: string;
}

function StatusMessage({ type, message }: StatusMessageProps) {
  const colors = {
    success: "bg-green-500/10 border-green-500/30 text-green-400",
    error: "bg-red-500/10 border-red-500/30 text-red-400",
  };

  const Icon = type === "success" ? CheckCircle : AlertCircle;

  return (
    <div
      className={`${colors[type]} border rounded-lg p-3 flex items-center gap-2 text-xs animate-in fade-in slide-in-from-top-2 duration-300`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
