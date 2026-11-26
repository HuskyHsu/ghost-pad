import type React from "react";
import { motion, useReducedMotion } from "framer-motion";

export interface SketchHighlightProps {
  children: React.ReactNode;
  variant?: "marker" | "underline" | "circle";
  color?: "yellow" | "sky" | "mint" | "coral";
  className?: string;
}

const HIGHLIGHT_COLORS: Record<
  NonNullable<SketchHighlightProps["color"]>,
  { marker: string; stroke: string }
> = {
  yellow: { marker: "#FDE68A", stroke: "#EAB308" },
  sky: { marker: "#BAE6FD", stroke: "#0284C7" },
  mint: { marker: "#A7F3D0", stroke: "#047857" },
  coral: { marker: "#FECACA", stroke: "#DC2626" },
};

export function SketchHighlight({
  children,
  variant = "marker",
  color = "yellow",
  className = "",
}: SketchHighlightProps) {
  const prefersReducedMotion = useReducedMotion();
  const palette = HIGHLIGHT_COLORS[color];

  if (variant === "marker") {
    return (
      <motion.span
        className={`relative inline px-1 py-0.5 rounded-[5px] ${className}`}
        style={{
          boxDecorationBreak: "clone",
          WebkitBoxDecorationBreak: "clone",
          backgroundImage: `linear-gradient(transparent 40%, ${palette.marker} 40%, ${palette.marker} 94%, transparent 94%)`,
          backgroundRepeat: "no-repeat",
        }}
        initial={
          prefersReducedMotion
            ? { opacity: 0.9, backgroundSize: "100% 100%" }
            : { opacity: 0.7, backgroundSize: "0% 100%" }
        }
        whileInView={{ opacity: 1, backgroundSize: "100% 100%" }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.span>
    );
  }

  return (
    <span className={`relative inline-block ${className}`}>
      {variant === "underline" && (
        <svg
          aria-hidden="true"
          viewBox="0 0 120 12"
          preserveAspectRatio="none"
          className="pointer-events-none absolute -bottom-1 left-0 h-2.5 w-full overflow-visible"
        >
          <motion.path
            d="M2 7.5 C34 3.5 84 10 118 5.2"
            fill="none"
            stroke={palette.stroke}
            strokeWidth="3"
            strokeLinecap="round"
            initial={prefersReducedMotion ? { opacity: 0 } : { pathLength: 0, opacity: 0.25 }}
            whileInView={prefersReducedMotion ? { opacity: 0.85 } : { pathLength: 1, opacity: 0.85 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
      )}

      {variant === "circle" && (
        <svg
          aria-hidden="true"
          viewBox="0 0 140 52"
          preserveAspectRatio="none"
          className="pointer-events-none absolute -inset-x-2.5 -inset-y-1.5 h-[calc(100%+12px)] w-[calc(100%+20px)] overflow-visible"
        >
          <motion.path
            d="M16 11 C46 2 104 2 128 14 C140 22 137 40 116 46 C86 52 30 50 11 39 C0 31 4 14 26 9"
            fill="none"
            stroke={palette.stroke}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={prefersReducedMotion ? { opacity: 0 } : { pathLength: 0, opacity: 0.25 }}
            whileInView={prefersReducedMotion ? { opacity: 0.85 } : { pathLength: 1, opacity: 0.85 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
      )}

      <span className="relative z-10">{children}</span>
    </span>
  );
}
