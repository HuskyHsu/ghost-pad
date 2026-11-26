import { motion, useReducedMotion } from "framer-motion";

export interface SketchArrowProps {
  direction?: "right" | "down" | "curved-right" | "curved-down" | "loop";
  className?: string;
  color?: string;
}

interface ArrowGeometry {
  viewBox: string;
  shaft: string;
  head: string;
  defaultSize: string;
}

const ARROW_GEOMETRY: Record<NonNullable<SketchArrowProps["direction"]>, ArrowGeometry> = {
  right: {
    viewBox: "0 0 72 24",
    shaft: "M4 13.5 C22 10.5 44 10.8 64 12.2",
    head: "M55 6.5 L65.5 12.2 L55.5 18",
    defaultSize: "w-16 h-6",
  },
  down: {
    viewBox: "0 0 24 72",
    shaft: "M12.5 4 C10.5 22 13.5 44 12 64",
    head: "M6.5 55 L12 65.5 L18 55.5",
    defaultSize: "w-6 h-16",
  },
  "curved-right": {
    viewBox: "0 0 84 44",
    shaft: "M6 34 C20 12 46 8 74 16",
    head: "M64 10 L76 16.5 L65.5 23.5",
    defaultSize: "w-20 h-11",
  },
  "curved-down": {
    viewBox: "0 0 56 76",
    shaft: "M10 8 C34 14 44 36 38 66",
    head: "M31.5 57.5 L38 68 L45.5 59",
    defaultSize: "w-14 h-18",
  },
  loop: {
    viewBox: "0 0 96 56",
    shaft: "M6 42 C24 44 44 30 42 16 C40 6 28 8 28 18 C28 30 50 38 84 26",
    head: "M74 21 L86 25.5 L77 34",
    defaultSize: "w-24 h-14",
  },
};

export function SketchArrow({
  direction = "right",
  className,
  color = "#033157",
}: SketchArrowProps) {
  const prefersReducedMotion = useReducedMotion();
  const geom = ARROW_GEOMETRY[direction];

  return (
    <svg
      viewBox={geom.viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className ?? geom.defaultSize}
    >
      <motion.path
        d={geom.shaft}
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={prefersReducedMotion ? { opacity: 0 } : { pathLength: 0, opacity: 0.2 }}
        whileInView={prefersReducedMotion ? { opacity: 1 } : { pathLength: 1, opacity: 1 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={
          prefersReducedMotion
            ? { duration: 0.2, ease: "easeOut" }
            : { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
        }
      />
      <motion.path
        d={geom.head}
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={prefersReducedMotion ? { opacity: 0 } : { pathLength: 0, opacity: 0 }}
        whileInView={prefersReducedMotion ? { opacity: 1 } : { pathLength: 1, opacity: 1 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={
          prefersReducedMotion
            ? { duration: 0.2, ease: "easeOut" }
            : { delay: 0.42, duration: 0.22, ease: "easeOut" }
        }
      />
    </svg>
  );
}
