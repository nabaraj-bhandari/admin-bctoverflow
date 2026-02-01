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
  const [numPages, setNumPages] = useState<Record<string, number>>({});

  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [resizing, setResizing] = useState<{
    id: string;
    edge: "left" | "right";
  } | null>(null);

  const timelineRef = useRef<HTMLDivElement>(null);

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
    (updater: PDFSection[] | ((prev: PDFSection[]) => PDFSection[])) => {
      setSections((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        setHistory((h) => [...h, prev]);
        return next;
      });
    },
    [],
  );

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setSections(previous);
    setHistory((prev) => prev.slice(0, -1));
  }, [history]);

  const activeSectionId = useMemo(() => {
    const active = sections.find(
      (s) => currentPage >= s.position && currentPage < s.position + s.duration,
    );
    return active?.id ?? null;
  }, [sections, currentPage]);

  const maxTimelinePage = useMemo(
    () =>
      sections.reduce((max, s) => Math.max(max, s.position + s.duration), 0),
    [sections],
  );

  const maxNavigablePage = useMemo(
    () => Math.max(0, maxTimelinePage - 1),
    [maxTimelinePage],
  );

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

  const splitAtCursor = useCallback(() => {
    const target = sections.find(
      (s) => currentPage >= s.position && currentPage < s.position + s.duration,
    );

    if (!target || currentPage === target.position) return;

    const splitOffset = Math.floor(currentPage - target.position);
    const splitPageInPdf = target.startPage + splitOffset;

    const part1: PDFSection = {
      ...target,
      endPage: splitPageInPdf - 1,
      duration: splitOffset,
    };

    const part2: PDFSection = {
      ...target,
      id: `sec-${Date.now()}`,
      startPage: splitPageInPdf,
      duration: target.endPage - splitPageInPdf + 1,
    };

    const newSections = sections.flatMap((s) =>
      s.id === target.id ? [part1, part2] : [s],
    );
    updateSectionsWithHistory(applyMagneticLogic(newSections));
  }, [sections, currentPage, applyMagneticLogic, updateSectionsWithHistory]);

  const deleteActiveSection = useCallback(() => {
    if (!activeSectionId) return;
    updateSectionsWithHistory(
      applyMagneticLogic(sections.filter((s) => s.id !== activeSectionId)),
    );
  }, [
    activeSectionId,
    sections,
    applyMagneticLogic,
    updateSectionsWithHistory,
  ]);

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

  const openRenameModal = useCallback(() => {
    if (!activeSectionId) return;
    const sec = sections.find((s) => s.id === activeSectionId);
    if (sec) {
      setRenameValue(sec.title);
      setIsRenameModalOpen(true);
    }
  }, [activeSectionId, sections]);

  const navigateRight = useCallback(() => {
    setCurrentPage((p) => Math.min(p + 1, maxNavigablePage));
  }, [maxNavigablePage]);

  const navigateLeft = useCallback(() => {
    setCurrentPage((p) => Math.max(p - 1, 0));
  }, []);

  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + 10, 150));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - 5, 10));
  }, []);

  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const scrollLeft = timelineRef.current.scrollLeft;
      const mouseX = e.clientX - rect.left + scrollLeft - rect.width / 2;
      const newPage = Math.round(mouseX / zoom);

      setSections((prev) => {
        const target = prev.find((s) => s.id === resizing.id);
        if (!target) return prev;

        let updated: PDFSection;

        if (resizing.edge === "left") {
          const minPage = 0;
          const maxPage = target.position + target.duration - 1;
          const clampedPage = Math.max(minPage, Math.min(newPage, maxPage));
          const delta = clampedPage - target.position;

          updated = {
            ...target,
            position: clampedPage,
            startPage: target.startPage + delta,
            duration: target.duration - delta,
          };
        } else {
          const minPage = target.position + 1;
          const clampedPage = Math.max(minPage, newPage);
          const newDuration = clampedPage - target.position;
          const newEndPage = target.startPage + newDuration - 1;

          if (newEndPage > target.endPage) return prev;

          updated = {
            ...target,
            duration: newDuration,
            endPage: newEndPage,
          };
        }

        return prev.map((s) => (s.id === resizing.id ? updated : s));
      });
    };

    const handleMouseUp = () => {
      if (resizing) {
        updateSectionsWithHistory(applyMagneticLogic(sections));
      }
      setResizing(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizing, zoom, sections, applyMagneticLogic, updateSectionsWithHistory]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      const shortcuts: Record<string, () => void> = {
        "Shift+KeyU": () => {
          e.preventDefault();
          undo();
        },
        "Shift++": () => {
          e.preventDefault();
          zoomIn();
        },
        "Shift+=": () => {
          e.preventDefault();
          zoomIn();
        },
        "Shift+-": () => {
          e.preventDefault();
          zoomOut();
        },
        "Shift+_": () => {
          e.preventDefault();
          zoomOut();
        },
        "Shift+KeyS": () => {
          e.preventDefault();
          splitAtCursor();
        },
        "Shift+KeyR": () => {
          e.preventDefault();
          openRenameModal();
        },
      };

      const key = `${e.shiftKey ? "Shift+" : ""}${e.code || e.key}`;
      const action = shortcuts[key];
      if (action) {
        action();
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && activeSectionId) {
        e.preventDefault();
        deleteActiveSection();
      }

      if (e.key === "ArrowRight") navigateRight();
      if (e.key === "ArrowLeft") navigateLeft();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeSectionId,
    undo,
    zoomIn,
    zoomOut,
    splitAtCursor,
    openRenameModal,
    deleteActiveSection,
    navigateRight,
    navigateLeft,
  ]);

  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollLeft = currentPage * zoom;
    }
  }, [currentPage, zoom]);

  return (
    <main className="flex h-screen w-screen bg-[#0f172a] text-slate-100 overflow-hidden select-none p-4 gap-4">
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
          setSections={(updater) =>
            updateSectionsWithHistory((prev) =>
              applyMagneticLogic(
                typeof updater === "function" ? updater(prev) : updater,
              ),
            )
          }
          maxTimelinePage={maxTimelinePage}
        />

        <TimelineEditor
          timelineRef={timelineRef}
          sections={sections}
          selectedSection={activeSectionId}
          currentPage={currentPage}
          PIXELS_PER_PAGE={zoom}
          setResizing={setResizing}
          maxTimelinePage={maxTimelinePage}
        />
      </div>

      <PreviewMonitor
        currentInfo={currentInfo}
        subject={subject}
        currentPage={currentPage}
      />

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
