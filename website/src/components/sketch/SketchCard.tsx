import { useEffect, useRef } from "react";
import type React from "react";
import rough from "roughjs";

export interface SketchCardProps {
  children: React.ReactNode;
  className?: string;
  tone?: "paper" | "warm" | "sky" | "yellow" | "blush";
  tape?: "none" | "top" | "corners";
  roughBorder?: boolean;
}

const TONE_CLASSES: Record<NonNullable<SketchCardProps["tone"]>, string> = {
  paper: "bg-[#FFFFFF] text-[#033157]",
  warm: "bg-[#F6F1E7] text-[#033157]",
  sky: "bg-[#E8F6FD] text-[#033157]",
  yellow: "bg-[#FEF3C7] text-[#033157]",
  blush: "bg-[#F2F0F8] text-[#033157]",
};

function roundedRectPath(w: number, h: number, r: number, inset: number): string {
  const x = inset;
  const y = inset;
  const width = Math.max(0, w - inset * 2);
  const height = Math.max(0, h - inset * 2);
  const radius = Math.min(r, width / 2, height / 2);

  return [
    `M ${x + radius} ${y}`,
    `H ${x + width - radius}`,
    `Q ${x + width} ${y} ${x + width} ${y + radius}`,
    `V ${y + height - radius}`,
    `Q ${x + width} ${y + height} ${x + width - radius} ${y + height}`,
    `H ${x + radius}`,
    `Q ${x} ${y + height} ${x} ${y + height - radius}`,
    `V ${y + radius}`,
    `Q ${x} ${y} ${x + radius} ${y}`,
    "Z",
  ].join(" ");
}

export function SketchCard({
  children,
  className = "",
  tone = "paper",
  tape = "none",
  roughBorder = false,
}: SketchCardProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!roughBorder) return;
    const container = containerRef.current;
    const svg = svgRef.current;
    if (!container || !svg) return;

    const draw = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);
      if (width < 4 || height < 4) return;

      svg.setAttribute("width", String(width));
      svg.setAttribute("height", String(height));
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

      while (svg.firstChild) {
        svg.removeChild(svg.firstChild);
      }

      const rc = rough.svg(svg);
      const node = rc.path(roundedRectPath(width, height, 14, 2), {
        stroke: "rgba(3, 49, 87, 0.28)",
        strokeWidth: 1.5,
        roughness: 1.1,
        bowing: 0.85,
        seed: 42,
      });
      svg.appendChild(node);
    };

    draw();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(draw);
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [roughBorder]);

  return (
    <div
      ref={containerRef}
      className={`relative rounded-[14px] ${TONE_CLASSES[tone]} ${
        roughBorder ? "" : "paper-shadow"
      } ${className}`}
    >
      {tape === "top" && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-2.5 left-1/2 h-5 w-16 -translate-x-1/2 -rotate-1 bg-[#FDE68A]/75"
          style={{
            clipPath: "polygon(3% 6%, 97% 0%, 100% 92%, 0% 100%)",
          }}
        />
      )}

      {tape === "corners" && (
        <>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-2 left-3 h-4 w-12 -rotate-12 bg-[#FDE68A]/75"
            style={{
              clipPath: "polygon(4% 0%, 96% 8%, 100% 94%, 0% 100%)",
            }}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-2 right-3 h-4 w-12 rotate-12 bg-[#56C2F0]/45"
            style={{
              clipPath: "polygon(0% 8%, 96% 0%, 100% 100%, 4% 92%)",
            }}
          />
        </>
      )}

      {roughBorder && (
        <svg
          ref={svgRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        />
      )}

      <div className="relative z-10">{children}</div>
    </div>
  );
}
