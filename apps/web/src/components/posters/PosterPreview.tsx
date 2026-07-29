"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import PosterCanvas from "./PosterCanvas";
import type { PosterCanvasProps } from "./types";

export default function PosterPreview({
  canvasRef,
  ...canvasProps
}: PosterCanvasProps & { canvasRef: RefObject<HTMLDivElement> }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(0);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const update = () =>
      setAvailableWidth(Math.max(0, viewport.clientWidth - 32));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  const scale =
    availableWidth > 0 ? Math.min(1, availableWidth / canvasProps.width) : 0.5;

  return (
    <div
      ref={viewportRef}
      className="w-full overflow-auto rounded-[28px] bg-slate-200/80 p-4 dark:bg-slate-950"
    >
      <div
        className="relative mx-auto overflow-visible"
        style={{
          width: canvasProps.width * scale,
          height: canvasProps.height * scale,
        }}
      >
        <div
          ref={canvasRef}
          data-poster-canvas="true"
          className="absolute left-0 top-0 origin-top-left overflow-hidden bg-white shadow-[0_28px_70px_rgba(15,23,42,0.28)]"
          style={{
            width: canvasProps.width,
            height: canvasProps.height,
            transform: `scale(${scale})`,
          }}
        >
          <PosterCanvas {...canvasProps} />
        </div>
      </div>
    </div>
  );
}
