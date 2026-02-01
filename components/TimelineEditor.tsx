"use client";

import { PDFSection } from "@/lib/types";
import { useEffect, useState } from "react";

interface TimelineEditorProps {
  timelineRef: React.RefObject<HTMLDivElement | null>;
  sections: PDFSection[];
  selectedSection: string | null;
  currentPage: number;
  PIXELS_PER_PAGE: number;
  setResizing: (val: { id: string; edge: "left" | "right" } | null) => void;
  maxTimelinePage: number;
}

export default function TimelineEditor({
  timelineRef,
  sections,
  selectedSection,
  PIXELS_PER_PAGE,
  setResizing,
  maxTimelinePage,
}: TimelineEditorProps) {
  const [paddingPx, setPaddingPx] = useState(0);

  useEffect(() => {
    const updatePadding = () => {
      if (timelineRef.current) {
        setPaddingPx(timelineRef.current.clientWidth / 2);
      }
    };

    updatePadding();

    const resizeObserver = new ResizeObserver(updatePadding);
    if (timelineRef.current) {
      resizeObserver.observe(timelineRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [timelineRef]);

  return (
    <div className="h-48 bg-[#1e293b]/50 border border-slate-800 rounded-2xl p-4 shrink-0 relative">
      <Playhead />

      <div
        ref={timelineRef}
        className="relative h-full bg-[#0f172a] rounded-xl border border-slate-800 overflow-x-auto overflow-y-hidden scroll-smooth"
      >
        <div className="inline-flex h-full">
          {/* Left padding spacer */}
          <div style={{ width: paddingPx, flexShrink: 0 }} />

          {/* Content area */}
          <div
            style={{
              width: maxTimelinePage * PIXELS_PER_PAGE,
              flexShrink: 0,
            }}
            className="relative h-full"
          >
            <div className="relative mt-8 h-24">
              {sections.map((section) => (
                <TimelineSection
                  key={section.id}
                  section={section}
                  isSelected={selectedSection === section.id}
                  pixelsPerPage={PIXELS_PER_PAGE}
                  onResizeStart={setResizing}
                />
              ))}
            </div>
          </div>

          {/* Right padding spacer */}
          <div style={{ width: paddingPx, flexShrink: 0 }} />
        </div>
      </div>
    </div>
  );
}

function Playhead() {
  return (
    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-blue-500 z-60 pointer-events-none -translate-x-1/2">
      <div className="w-3 h-3 bg-blue-500 rotate-45 -ml-1.5 -mt-1" />
    </div>
  );
}

interface TimelineSectionProps {
  section: PDFSection;
  isSelected: boolean;
  pixelsPerPage: number;
  onResizeStart: (val: { id: string; edge: "left" | "right" }) => void;
}

function TimelineSection({
  section,
  isSelected,
  pixelsPerPage,
  onResizeStart,
}: TimelineSectionProps) {
  return (
    <div
      className={`absolute h-16 rounded-lg border-2 transition-all duration-150 ${
        isSelected
          ? "border-blue-500 bg-blue-500/20 z-50 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
          : "border-slate-700 bg-slate-800/40 hover:border-slate-600"
      }`}
      style={{
        left: section.position * pixelsPerPage,
        width: section.duration * pixelsPerPage,
      }}
    >
      <div className="p-2 truncate pointer-events-none">
        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">
          {section.title || "Untitled Section"}
        </span>
      </div>

      <ResizeHandle
        edge="left"
        onMouseDown={(e) => {
          e.stopPropagation();
          onResizeStart({ id: section.id, edge: "left" });
        }}
      />
      <ResizeHandle
        edge="right"
        onMouseDown={(e) => {
          e.stopPropagation();
          onResizeStart({ id: section.id, edge: "right" });
        }}
      />
    </div>
  );
}

interface ResizeHandleProps {
  edge: "left" | "right";
  onMouseDown: (e: React.MouseEvent) => void;
}

function ResizeHandle({ edge, onMouseDown }: ResizeHandleProps) {
  return (
    <div
      onMouseDown={onMouseDown}
      className={`absolute top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/10 z-10 ${
        edge === "left" ? "left-0" : "right-0"
      }`}
      aria-label={`Resize ${edge} edge`}
    />
  );
}
