import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Download } from "lucide-react";
import { useContent } from "../../i18n/useContent";
import {
  GhostMascot,
  SketchCard,
  SketchHighlight,
  SpeechBubble,
} from "../sketch";

function LaptopGlyph() {
  return (
    <svg
      viewBox="0 0 64 48"
      className="h-11 w-14 text-ink sm:h-12 sm:w-16"
      fill="none"
      aria-hidden="true"
    >
      {/* Screen lid */}
      <rect
        x="12"
        y="7"
        width="40"
        height="26"
        rx="3.5"
        fill="#FFFFFF"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      {/* Inner screen */}
      <rect
        x="16"
        y="11"
        width="32"
        height="18"
        rx="1.5"
        fill="#E8F6FD"
      />
      {/* Tiny Ghost-Pad signal indicator on screen */}
      <circle cx="26" cy="20" r="2.2" fill="#033157" />
      <path
        d="M33 20h7"
        stroke="#0284C7"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Laptop base */}
      <path
        d="M6 34h52l-3 6.5a2 2 0 0 1-1.8 1.2H10.8a2 2 0 0 1-1.8-1.2L6 34Z"
        fill="#F6F1E7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Esp32BoardGlyph() {
  return (
    <svg
      viewBox="0 0 64 48"
      className="h-11 w-14 text-ink sm:h-12 sm:w-16"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="8"
        y="6"
        width="48"
        height="36"
        rx="5"
        fill="#FFFFFF"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      {/* Antenna trace */}
      <path
        d="M14 12h6v4h-4v4h6"
        stroke="#0284C7"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Main ESP32 RF shield */}
      <rect
        x="24"
        y="12"
        width="20"
        height="24"
        rx="2.5"
        fill="#E8F6FD"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="34" cy="24" r="3" fill="#56C2F0" />
      {/* USB port */}
      <rect
        x="4"
        y="18"
        width="6"
        height="12"
        rx="1.5"
        fill="#F6F1E7"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      {/* Pin headers */}
      <g fill="currentColor">
        <circle cx="14" cy="37" r="1.4" />
        <circle cx="20" cy="37" r="1.4" />
        <circle cx="26" cy="37" r="1.4" />
        <circle cx="32" cy="37" r="1.4" />
        <circle cx="38" cy="37" r="1.4" />
        <circle cx="44" cy="37" r="1.4" />
        <circle cx="50" cy="37" r="1.4" />
      </g>
    </svg>
  );
}

function SwitchConsoleGlyph() {
  return (
    <svg
      viewBox="0 0 68 48"
      className="h-11 w-14 text-ink sm:h-12 sm:w-16"
      fill="none"
      aria-hidden="true"
    >
      {/* Left Joy-Con */}
      <path
        d="M15 8h-5a6 6 0 0 0-6 6v20a6 6 0 0 0 6 6h5V8Z"
        fill="#E8F6FD"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <circle cx="10" cy="18" r="2.2" fill="currentColor" />
      {/* Screen */}
      <rect
        x="15"
        y="8"
        width="38"
        height="32"
        fill="#FFFFFF"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      {/* 1P green LED indicator */}
      <rect x="24" y="21" width="20" height="8" rx="4" fill="#A7F3D0" />
      <circle cx="29" cy="25" r="2" fill="#047857" />
      <text
        x="34"
        y="27.5"
        fontSize="7"
        fontWeight="700"
        fill="#033157"
        fontFamily="var(--font-mono)"
      >
        1P
      </text>
      {/* Right Joy-Con */}
      <path
        d="M53 8h5a6 6 0 0 1 6 6v20a6 6 0 0 1-6 6h-5V8Z"
        fill="#FECACA"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <circle cx="58" cy="29" r="2.2" fill="currentColor" />
    </svg>
  );
}

function SignalPath({
  label,
  variant,
  reducedMotion,
}: {
  label: string;
  variant: "usb" | "bt";
  reducedMotion: boolean;
}) {
  const strokeColor = variant === "usb" ? "#0284C7" : "#047857";
  const dotColor = variant === "usb" ? "#56C2F0" : "#047857";

  return (
    <div className="flex flex-row items-center justify-center gap-2 py-0 md:flex-col md:gap-1.5 md:px-1 md:py-0">
      <span
        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold sm:text-xs ${
          variant === "usb"
            ? "bg-ghost-sky-pale text-ghost-sky-deep"
            : "bg-marker-mint/55 text-marker-mint-deep"
        }`}
      >
        {label}
      </span>

      {/* Horizontal path (md+) */}
      <svg
        viewBox="0 0 112 24"
        className="hidden h-6 w-24 overflow-visible md:block lg:w-28"
        fill="none"
        aria-hidden="true"
      >
        {variant === "usb" ? (
          <path
            d="M4 12 C 30 9, 76 15, 104 12"
            stroke={strokeColor}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeDasharray="5 5"
          />
        ) : (
          <path
            d="M4 12 Q 20 4, 36 12 T 68 12 T 104 12"
            stroke={strokeColor}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        )}
        <path
          d="M98 7 L107 12 L98 17"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {!reducedMotion && (
          <>
            <motion.circle
              r="3.8"
              fill={dotColor}
              initial={{ cx: 8, cy: 12, opacity: 0 }}
              animate={{
                cx: [8, 56, 102],
                cy: variant === "usb" ? [12, 12, 12] : [12, 8, 12],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: "linear",
              }}
            />
            <motion.circle
              r="3.2"
              fill={strokeColor}
              initial={{ cx: 8, cy: 12, opacity: 0 }}
              animate={{
                cx: [8, 56, 102],
                cy: variant === "usb" ? [12, 12, 12] : [12, 16, 12],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 1.8,
                delay: 0.9,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          </>
        )}
      </svg>

      {/* Vertical path (mobile) */}
      <svg
        viewBox="0 0 24 44"
        className="h-6 w-5 md:hidden"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M12 4 C 10 16, 14 28, 12 38"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeDasharray={variant === "usb" ? "4 4" : undefined}
        />
        <path
          d="M7 33 L12 40 L17 33"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {!reducedMotion && (
          <motion.circle
            cx="12"
            r="3.2"
            fill={dotColor}
            initial={{ cy: 6, opacity: 0 }}
            animate={{ cy: [6, 22, 37], opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
        )}
      </svg>
    </div>
  );
}

export function HeroSection() {
  const content = useContent();
  const prefersReducedMotion = Boolean(useReducedMotion());
  const [mascotExcited, setMascotExcited] = useState(false);

  useEffect(() => {
    if (!mascotExcited) return;
    const timer = window.setTimeout(() => setMascotExcited(false), 1400);
    return () => window.clearTimeout(timer);
  }, [mascotExcited]);

  const entrance = (delay: number) =>
    prefersReducedMotion
      ? {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: { duration: 0.2, ease: "easeOut" as const },
        }
      : {
          initial: { opacity: 0, y: 12, filter: "blur(4px)" },
          animate: { opacity: 1, y: 0, filter: "blur(0px)" },
          transition: { duration: 0.3, delay, ease: "easeOut" as const },
        };

  return (
    <section className="relative px-4 pt-8 pb-10 sm:px-6 md:pt-12 md:pb-14">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-8">
          {/* Left column: Hero headline + lead + CTAs */}
          <div className="lg:col-span-7">
            <motion.h1
              {...entrance(0)}
              className="font-[family-name:var(--font-display)] text-4xl font-bold leading-[1.18] tracking-[-0.025em] text-balance text-ink sm:text-5xl lg:text-[3.3rem]"
            >
              {content.hero.title}
            </motion.h1>

            <motion.p
              {...entrance(0.1)}
              className="mt-5 max-w-[58ch] text-lg leading-[1.75] text-ink-soft sm:text-xl"
            >
              {content.hero.lead}
            </motion.p>

            <motion.div
              {...entrance(0.2)}
              className="mt-8 flex flex-wrap items-center gap-3.5"
            >
              <a
                href={content.meta.releasesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-6 py-3.5 text-base font-semibold text-paper paper-shadow-sm transition-[transform,background-color] duration-150 ease-out hover:bg-ink-soft active:scale-[0.96] sm:w-auto"
              >
                <Download className="h-5 w-5" aria-hidden="true" />
                <span>{content.hero.secondaryCta}</span>
              </a>
            </motion.div>
          </div>

          {/* Right column: Animated GhostMascot + SpeechBubble */}
          <div className="flex flex-col items-center lg:col-span-5">
            <SpeechBubble tail="bottom" className="mb-3 max-w-sm">
              <p className="text-sm font-medium leading-relaxed text-ink sm:text-base">
                {content.hero.mascotBubble}
              </p>
            </SpeechBubble>

            <button
              type="button"
              onClick={() => setMascotExcited(true)}
              aria-label={content.meta.brand}
              className="group relative rounded-full p-2 transition-[transform] duration-150 ease-out active:scale-[0.96]"
            >
              <GhostMascot
                className="h-52 w-52 sm:h-60 sm:w-60"
                mood={mascotExcited ? "excited" : "happy"}
                activeButtons={mascotExcited ? ["A", "X"] : []}
                showSignals={true}
              />
            </button>
          </div>
        </div>

        {/* 10-second visual signal flow diagram */}
        <div className="mt-8 sm:mt-12">
          <SketchCard
            tone="warm"
            tape="corners"
            roughBorder
            className="p-4 sm:p-7"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2 sm:gap-3">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold tracking-[-0.02em] text-ink sm:text-2xl">
                <SketchHighlight variant="underline" color="sky">
                  {content.hero.diagram.title}
                </SketchHighlight>
              </h2>
              <p className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft sm:text-sm">
                <CheckCircle2
                  className="h-4 w-4 shrink-0 text-marker-mint-deep"
                  aria-hidden="true"
                />
                <span>{content.hero.diagram.note}</span>
              </p>
            </div>

            <div className="mt-4 grid grid-cols-1 items-center gap-1.5 md:mt-6 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:gap-2">
              {/* Node 1: PC Ghost-Pad */}
              <div className="flex items-center gap-3 border-2 border-ink/15 bg-paper-card px-3.5 py-2.5 sketch-corner sm:gap-3.5 sm:p-4">
                <div className="flex w-14 shrink-0 items-center justify-center sm:w-16">
                  <LaptopGlyph />
                </div>
                <div className="min-w-0">
                  <p className="font-[family-name:var(--font-display)] text-sm font-bold text-ink sm:text-base">
                    {content.hero.diagram.nodes[0].title}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-ink-muted sm:text-sm">
                    {content.hero.diagram.nodes[0].sub}
                  </p>
                </div>
              </div>

              <SignalPath
                label={content.hero.diagram.links.usb}
                variant="usb"
                reducedMotion={prefersReducedMotion}
              />

              {/* Node 2: ESP32 */}
              <div className="flex items-center gap-3 border-2 border-ghost-sky-deep/25 bg-ghost-sky-pale/75 px-3.5 py-2.5 sketch-corner sm:gap-3.5 sm:p-4">
                <div className="flex w-14 shrink-0 items-center justify-center sm:w-16">
                  <Esp32BoardGlyph />
                </div>
                <div className="min-w-0">
                  <p className="font-[family-name:var(--font-display)] text-sm font-bold text-ink sm:text-base">
                    {content.hero.diagram.nodes[1].title}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-ink-soft sm:text-sm">
                    {content.hero.diagram.nodes[1].sub}
                  </p>
                </div>
              </div>

              <SignalPath
                label={content.hero.diagram.links.bt}
                variant="bt"
                reducedMotion={prefersReducedMotion}
              />

              {/* Node 3: Nintendo Switch */}
              <div className="flex items-center gap-3 border-2 border-ink/15 bg-paper-card px-3.5 py-2.5 sketch-corner sm:gap-3.5 sm:p-4">
                <div className="flex w-14 shrink-0 items-center justify-center sm:w-16">
                  <SwitchConsoleGlyph />
                </div>
                <div className="min-w-0">
                  <p className="font-[family-name:var(--font-display)] text-sm font-bold text-ink sm:text-base">
                    {content.hero.diagram.nodes[2].title}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-ink-muted sm:text-sm">
                    {content.hero.diagram.nodes[2].sub}
                  </p>
                </div>
              </div>
            </div>
          </SketchCard>
        </div>
      </div>
    </section>
  );
}
