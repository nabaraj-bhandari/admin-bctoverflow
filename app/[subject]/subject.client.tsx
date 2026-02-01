"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { type PDFSection, type SubjectClientProps } from "@/lib/types";
import LibrarySidebar from "@/components/LibrarySidebar";
import TimelineEditor from "@/components/TimelineEditor";
import PreviewMonitor from "@/components/PreviewMonitor";
import ConfigHeader from "@/components/ConfigHeader";

export default function ClientSubjectPage({
  subject,
  pdfs,
  compressedPdfs,
}: SubjectClientProps) {
  const [resourceTitle, setResourceTitle] = useState("");
  const [sections, setSections] = useState<PDFSection[]>([]);
  const [history, setHistory] = useState<PDFSection[][]>([]);
  const [zoom, setZoom] = useState(30);
  const [currentPage, setCurrentPage] = useState(0);
  const [numPages, setNumPages] = useState<{ [key: string]: number }>({});

  // UI State
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [resizing, setResizing] = useState<{
    id: string;
    edge: "left" | "right";
  } | null>(null);

  const timelineRef = useRef<HTMLDivElement | null>(null);

  // --- CORE LOGIC: MAGNETIC SNAP ---
  const applyMagneticLogic = useCallback(
    (items: PDFSection[]): PDFSection[] => {
      const sorted = [...items].sort((a, b) => a.position - b.position);
      let currentPos = 0;
      return sorted.map((s) => {
        const updated = { ...s, position: currentPos };
        currentPos += s.duration;
        return updated;
      });
    },
    [],
  );

  const updateSectionsWithHistory = useCallback(
    (newSections: PDFSection[]) => {
      setHistory((prev) => [...prev, sections]);
      setSections(newSections);
    },
    [sections],
  );

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setSections(previous);
    setHistory((prev) => prev.slice(0, -1));
  }, [history]);

  // --- DERIVED STATE ---
  const activeSectionId = useMemo(() => {
    const active = sections.find(
      (s) => currentPage >= s.position && currentPage < s.position + s.duration,
    );
    return active ? active.id : null;
  }, [sections, currentPage]);

  const maxTimelinePage = useMemo(
    () =>
      sections.reduce((max, s) => Math.max(max, s.position + s.duration), 0),
    [sections],
  );

  // --- THE FIXED SPLIT ---
  const splitAtCursor = useCallback(() => {
    const target = sections.find(
      (s) => currentPage >= s.position && currentPage < s.position + s.duration,
    );

    if (!target || currentPage === target.position) return;

    const splitOffset = Math.floor(currentPage - target.position);
    const splitPageInPdf = target.startPage + splitOffset;

    const part1 = {
      ...target,
      endPage: splitPageInPdf - 1,
      duration: splitOffset,
    };

    const part2 = {
      ...target,
      id: `sec-${Date.now()}`,
      startPage: splitPageInPdf,
      duration: target.endPage - splitPageInPdf + 1,
    };

    const newSections = sections.flatMap((s) =>
      s.id === target.id ? [part1, part2] : s,
    );
    updateSectionsWithHistory(applyMagneticLogic(newSections));
  }, [sections, currentPage, applyMagneticLogic, updateSectionsWithHistory]);

  // --- CLOSE MODAL HANDLER ---
  const closeRenameModal = useCallback(() => {
    setIsRenameModalOpen(false);
    setRenameValue("");
  }, []);

  const handleRename = useCallback(() => {
    if (!activeSectionId) return;
    setSections((prev) =>
      prev.map((s) =>
        s.id === activeSectionId ? { ...s, title: renameValue } : s,
      ),
    );
    closeRenameModal();
  }, [activeSectionId, renameValue, closeRenameModal]);

  // --- KEYBOARD LISTENERS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      // Undo (Shift+U)
      if (e.shiftKey && e.code === "KeyU") {
        e.preventDefault();
        undo();
      }

      // Zoom (Shift +/-)
      if (e.shiftKey && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        setZoom((z) => Math.min(z + 10, 150));
      }
      if (e.shiftKey && (e.key === "-" || e.key === "_")) {
        e.preventDefault();
        setZoom((z) => Math.max(z - 5, 10));
      }

      // Delete/Backspace
      if ((e.key === "Delete" || e.key === "Backspace") && activeSectionId) {
        e.preventDefault();
        updateSectionsWithHistory(
          applyMagneticLogic(sections.filter((s) => s.id !== activeSectionId)),
        );
      }

      // Split (Shift+S)
      if (e.shiftKey && e.code === "KeyS") {
        e.preventDefault();
        splitAtCursor();
      }

      // Rename (Shift+R)
      if (e.shiftKey && e.code === "KeyR" && activeSectionId) {
        e.preventDefault();
        const sec = sections.find((s) => s.id === activeSectionId);
        if (sec) {
          setRenameValue(sec.title);
          setIsRenameModalOpen(true);
        }
      }

      // Navigation
      if (e.key === "ArrowRight")
        setCurrentPage((p) => Math.min(p + 1, maxTimelinePage));
      if (e.key === "ArrowLeft") setCurrentPage((p) => Math.max(p - 1, 0));
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeSectionId,
    sections,
    maxTimelinePage,
    splitAtCursor,
    undo,
    applyMagneticLogic,
    updateSectionsWithHistory,
  ]);

  // --- SYNC SCROLL ---
  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollTo({
        left: currentPage * zoom,
        behavior: "auto",
      });
    }
  }, [currentPage, zoom]);

  const currentInfo = useMemo(() => {
    const s = sections.find(
      (sec) =>
        currentPage >= sec.position &&
        currentPage < sec.position + sec.duration,
    );
    return s
      ? { section: s, page: s.startPage + (currentPage - s.position) }
      : null;
  }, [sections, currentPage]);

  return (
    <main
      className="flex h-screen w-screen bg-[#0f172a] text-slate-100 overflow-hidden select-none p-4 gap-4"
      onMouseUp={() => setResizing(null)}
    >
      <div className="w-[60%] flex flex-col gap-4 min-w-0">
        <ConfigHeader
          title={resourceTitle}
          setTitle={setResourceTitle}
          sections={sections}
          subject={subject}
        />
        <LibrarySidebar
          pdfs={pdfs}
          compressedPdfs={compressedPdfs}
          subject={subject}
          numPages={numPages}
          setNumPages={setNumPages}
          sections={sections}
          setSections={(s: any) =>
            updateSectionsWithHistory(applyMagneticLogic(s))
          }
          maxTimelinePage={maxTimelinePage}
        />

        <TimelineEditor
          timelineRef={timelineRef}
          sections={sections}
          selectedSection={activeSectionId}
          setSelectedSection={() => {}}
          currentPage={currentPage}
          PIXELS_PER_PAGE={zoom}
          setResizing={setResizing}
          setDraggingSection={() => {}}
          setDragOffset={() => {}}
          maxTimelinePage={maxTimelinePage}
        />
      </div>

      <PreviewMonitor
        currentInfo={currentInfo}
        subject={subject}
        currentPage={currentPage}
      />

      {/* Rename Modal */}
      {isRenameModalOpen && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={closeRenameModal}
        >
          <div
            className="bg-[#1e293b] border border-slate-700 p-6 rounded-2xl w-96 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest">
              Rename Section
            </h3>
            <input
              autoFocus
              className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-white"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleRename();
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  closeRenameModal();
                }
              }}
            />
          </div>
        </div>
      )}
    </main>
  );
}
