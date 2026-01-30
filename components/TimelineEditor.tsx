"use client";

import { PDFSection } from "@/lib/types";

interface TimelineEditorProps {
  timelineRef: React.RefObject<HTMLDivElement>;
  sections: PDFSection[];
  selectedSection: string | null;
  setSelectedSection: (id: string | null) => void;
  currentPage: number;
  PIXELS_PER_PAGE: number;
  setResizing: (val: any) => void;
  setDraggingSection: (id: string | null) => void;
  setDragOffset: (val: number) => void;
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
  return (
    <div className="h-48 bg-[#1e293b]/50 border border-slate-800 rounded-2xl p-4 shrink-0 relative">
      {/* PLAYHEAD (Blue Vertical Line) */}
      <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-blue-500 z-[60] pointer-events-none -translate-x-1/2">
        <div className="w-3 h-3 bg-blue-500 rotate-45 -ml-[5px] -mt-1" />
      </div>

      <div
        ref={timelineRef}
        className="relative h-full bg-[#0f172a] rounded-xl border border-slate-800 overflow-hidden"
      >
        <div
          style={{
            width: maxTimelinePage * PIXELS_PER_PAGE,
            paddingLeft: "50%",
            paddingRight: "50%",
            display: "inline-block",
          }}
          className="relative h-full"
        >
          <div className="relative mt-8 h-24">
            {sections.map((s) => (
              <div
                key={s.id}
                className={`absolute h-16 rounded-lg border-2 transition-all duration-150 ${
                  selectedSection === s.id
                    ? "border-blue-500 bg-blue-500/20 z-50 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                    : "border-slate-700 bg-slate-800/40"
                }`}
                style={{
                  left: s.position * PIXELS_PER_PAGE,
                  width: s.duration * PIXELS_PER_PAGE,
                }}
              >
                <div className="p-2 truncate pointer-events-none">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">
                    {s.title || "Untitled Section"}
                  </span>
                </div>

                {/* Right Resize Handle */}
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setResizing({ id: s.id, edge: "right" });
                  }}
                  className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/10"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
