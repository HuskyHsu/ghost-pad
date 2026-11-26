import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Clock,
  Film,
  Gamepad2,
  Keyboard,
  MonitorPlay,
  PauseCircle,
  Radio,
  Trash2,
  Zap,
} from "lucide-react";
import { useContent } from "../../i18n/useContent";
import { GhostMascot, SketchCard } from "../sketch";

type TrackId = "action" | "dpad" | "stick" | "shoulder" | "system";

interface ControlKeyDef {
  id: string;
  keyLabel: string;
  switchLabel: string;
  noteLabel: string;
  codes: string[];
  track: TrackId;
  color: string;
  glowColor: string;
  stickDelta?: { x: number; y: number };
}

interface TimelineSegment {
  id: number;
  keyId: string;
  track: TrackId;
  label: string;
  color: string;
  glowColor: string;
  startTime: number;
  endTime: number | null;
}

const DURATION_SEC = 30;
const WINDOW_MS = DURATION_SEC * 1000;
const MAJOR_TICKS = [0, 5, 10, 15, 20, 25, 30];
const ALL_SECOND_TICKS = Array.from({ length: DURATION_SEC + 1 }, (_, i) => i);

const CONTROL_KEYS: ControlKeyDef[] = [
  // Left Stick
  { id: "W", keyLabel: "W", switchLabel: "↑", noteLabel: "L▲", codes: ["KeyW"], track: "stick", color: "#06b6d4", glowColor: "rgba(6,182,212,0.7)", stickDelta: { x: 0, y: -1 } },
  { id: "A", keyLabel: "A", switchLabel: "←", noteLabel: "L◀", codes: ["KeyA"], track: "stick", color: "#06b6d4", glowColor: "rgba(6,182,212,0.7)", stickDelta: { x: -1, y: 0 } },
  { id: "S", keyLabel: "S", switchLabel: "↓", noteLabel: "L▼", codes: ["KeyS"], track: "stick", color: "#06b6d4", glowColor: "rgba(6,182,212,0.7)", stickDelta: { x: 0, y: 1 } },
  { id: "D", keyLabel: "D", switchLabel: "→", noteLabel: "L▶", codes: ["KeyD"], track: "stick", color: "#06b6d4", glowColor: "rgba(6,182,212,0.7)", stickDelta: { x: 1, y: 0 } },
  // Action buttons (exact desktop colors)
  { id: "I", keyLabel: "I", switchLabel: "X", noteLabel: "X", codes: ["KeyI"], track: "action", color: "#38bdf8", glowColor: "rgba(56,189,248,0.7)" },
  { id: "J", keyLabel: "J", switchLabel: "Y", noteLabel: "Y", codes: ["KeyJ"], track: "action", color: "#f59e0b", glowColor: "rgba(245,158,11,0.7)" },
  { id: "K", keyLabel: "K", switchLabel: "B", noteLabel: "B", codes: ["KeyK"], track: "action", color: "#ef4444", glowColor: "rgba(239,68,68,0.7)" },
  { id: "L", keyLabel: "L", switchLabel: "A", noteLabel: "A", codes: ["KeyL"], track: "action", color: "#10b981", glowColor: "rgba(16,185,129,0.7)" },
  // Shoulder triggers (mirrored ergonomic layout: Q=ZL, E=L, U=R, O=ZR)
  { id: "Q", keyLabel: "Q", switchLabel: "ZL", noteLabel: "ZL", codes: ["KeyQ"], track: "shoulder", color: "#f43f5e", glowColor: "rgba(244,63,94,0.7)" },
  { id: "E", keyLabel: "E", switchLabel: "L", noteLabel: "L", codes: ["KeyE"], track: "shoulder", color: "#ec4899", glowColor: "rgba(236,72,153,0.7)" },
  { id: "U", keyLabel: "U", switchLabel: "R", noteLabel: "R", codes: ["KeyU"], track: "shoulder", color: "#ec4899", glowColor: "rgba(236,72,153,0.7)" },
  { id: "O", keyLabel: "O", switchLabel: "ZR", noteLabel: "ZR", codes: ["KeyO"], track: "shoulder", color: "#f43f5e", glowColor: "rgba(244,63,94,0.7)" },
  // D-Pad (exact desktop colors & arrows)
  { id: "UP", keyLabel: "↑", switchLabel: "D↑", noteLabel: "▲", codes: ["ArrowUp"], track: "dpad", color: "#c084fc", glowColor: "rgba(192,132,252,0.7)" },
  { id: "LEFT", keyLabel: "←", switchLabel: "D←", noteLabel: "◀", codes: ["ArrowLeft"], track: "dpad", color: "#c084fc", glowColor: "rgba(192,132,252,0.7)" },
  { id: "DOWN", keyLabel: "↓", switchLabel: "D↓", noteLabel: "▼", codes: ["ArrowDown"], track: "dpad", color: "#c084fc", glowColor: "rgba(192,132,252,0.7)" },
  { id: "RIGHT", keyLabel: "→", switchLabel: "D→", noteLabel: "▶", codes: ["ArrowRight"], track: "dpad", color: "#c084fc", glowColor: "rgba(192,132,252,0.7)" },
  // System buttons (exact desktop colors & symbols)
  { id: "M", keyLabel: "M", switchLabel: "-", noteLabel: "−", codes: ["KeyM", "Minus"], track: "system", color: "#94a3b8", glowColor: "rgba(148,163,184,0.7)" },
  { id: "P", keyLabel: "P", switchLabel: "+", noteLabel: "+", codes: ["KeyP", "Equal"], track: "system", color: "#94a3b8", glowColor: "rgba(148,163,184,0.7)" },
  { id: "H", keyLabel: "H", switchLabel: "HOME", noteLabel: "⌂", codes: ["KeyH"], track: "system", color: "#38bdf8", glowColor: "rgba(56,189,248,0.7)" },
  { id: "N", keyLabel: "N", switchLabel: "CAP", noteLabel: "◉", codes: ["KeyN"], track: "system", color: "#94a3b8", glowColor: "rgba(148,163,184,0.7)" },
];

const CODE_TO_KEY = new Map<string, ControlKeyDef>();
const ID_TO_KEY = new Map<string, ControlKeyDef>();
for (const def of CONTROL_KEYS) {
  ID_TO_KEY.set(def.id, def);
  for (const code of def.codes) {
    CODE_TO_KEY.set(code, def);
  }
}

function getStickDirectionLabel(sx: number, sy: number): string | null {
  if (sx === 0 && sy === 0) return null;
  if (sx > 0 && sy < 0) return "L↗";
  if (sx > 0 && sy > 0) return "L↘";
  if (sx < 0 && sy < 0) return "L↖";
  if (sx < 0 && sy > 0) return "L↙";
  if (sy < 0) return "L▲";
  if (sy > 0) return "L▼";
  if (sx < 0) return "L◀";
  return "L▶";
}

interface KeycapButtonProps {
  keyDef: ControlKeyDef;
  pressed: boolean;
  accentBg: string;
  onPress: (id: string) => void;
  onRelease: (id: string) => void;
  wide?: boolean;
}

function KeycapButton({
  keyDef,
  pressed,
  accentBg,
  onPress,
  onRelease,
  wide = false,
}: KeycapButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={`${keyDef.keyLabel} (${keyDef.switchLabel})`}
      onPointerDown={(e) => {
        e.preventDefault();
        onPress(keyDef.id);
      }}
      onPointerUp={() => onRelease(keyDef.id)}
      onPointerLeave={() => {
        if (pressed) onRelease(keyDef.id);
      }}
      onPointerCancel={() => onRelease(keyDef.id)}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onPress(keyDef.id);
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onRelease(keyDef.id);
        }
      }}
      className={`keycap-surface select-none touch-none flex flex-col items-center justify-center rounded-xl border-2 font-[family-name:var(--font-mono)] ${
        wide ? "h-11 min-w-[3.4rem] px-2.5" : "h-12 w-12"
      } ${
        pressed
          ? `keycap-surface-pressed border-ink text-paper ${accentBg}`
          : "border-ink/25 bg-paper-card text-ink hover:border-ink/45 hover:bg-paper-warm"
      }`}
    >
      <span className="text-sm font-bold leading-none">{keyDef.keyLabel}</span>
      <span
        className={`mt-1 text-[10px] font-semibold leading-none ${
          pressed ? "text-paper/90" : "text-ink-muted"
        }`}
      >
        {keyDef.switchLabel}
      </span>
    </button>
  );
}

export function InteractiveControlsSection() {
  const content = useContent();
  const prefersReducedMotion = Boolean(useReducedMotion());
  const [pressedIds, setPressedIds] = useState<Set<string>>(() => new Set());
  const [isMuted, setIsMuted] = useState(false);
  const [segments, setSegments] = useState<TimelineSegment[]>([]);
  const [now, setNow] = useState(() => performance.now());

  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;

  const sandboxRef = useRef<HTMLDivElement | null>(null);
  const nextSegIdRef = useRef(1);
  const activeSegByKeyRef = useRef<Map<string, number>>(new Map());
  const prevStickDirRef = useRef<string | null>(null);

  const pressKey = useCallback((id: string) => {
    const def = ID_TO_KEY.get(id);
    if (!def) return;

    setPressedIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    if (def.stickDelta || isMutedRef.current) return;
    if (activeSegByKeyRef.current.has(id)) return;

    const timestamp = performance.now();
    const segId = nextSegIdRef.current++;
    activeSegByKeyRef.current.set(id, segId);
    setNow(timestamp);
    setSegments((prev) => [
      ...prev.filter(
        (s) => s.endTime === null || timestamp - s.endTime < WINDOW_MS,
      ),
      {
        id: segId,
        keyId: id,
        track: def.track,
        label: def.noteLabel,
        color: def.color,
        glowColor: def.glowColor,
        startTime: timestamp,
        endTime: null,
      },
    ]);
  }, []);

  const releaseKey = useCallback((id: string) => {
    const def = ID_TO_KEY.get(id);
    setPressedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    if (def?.stickDelta) return;

    const activeSegId = activeSegByKeyRef.current.get(id);
    if (activeSegId === undefined) return;
    activeSegByKeyRef.current.delete(id);

    const timestamp = performance.now();
    setNow(timestamp);
    setSegments((prev) =>
      prev.map((seg) =>
        seg.id === activeSegId ? { ...seg, endTime: timestamp } : seg,
      ),
    );
  }, []);

  // Derive stick & button state
  const { stickX, stickY, activeButtons, stickDirLabel } = useMemo(() => {
    if (isMuted) {
      return {
        stickX: 0,
        stickY: 0,
        activeButtons: [] as string[],
        stickDirLabel: null as string | null,
      };
    }
    let sx = 0;
    let sy = 0;
    const buttons: string[] = [];

    pressedIds.forEach((id) => {
      const def = ID_TO_KEY.get(id);
      if (!def) return;
      if (def.stickDelta) {
        sx += def.stickDelta.x;
        sy += def.stickDelta.y;
      } else {
        buttons.push(def.switchLabel);
      }
    });

    const dirLabel = getStickDirectionLabel(sx, sy);

    if (sx !== 0 && sy !== 0) {
      sx *= 0.707;
      sy *= 0.707;
    }

    return {
      stickX: sx,
      stickY: sy,
      activeButtons: buttons,
      stickDirLabel: dirLabel,
    };
  }, [isMuted, pressedIds]);

  // Unified 8-direction Left Stick timeline ribbon (matching desktop app's InputTimelineStream)
  useEffect(() => {
    const prevDir = prevStickDirRef.current;
    if (stickDirLabel === prevDir) return;

    const timestamp = performance.now();
    const prevSegId = activeSegByKeyRef.current.get("stick_left");

    if (prevSegId !== undefined) {
      activeSegByKeyRef.current.delete("stick_left");
      setSegments((prev) =>
        prev.map((seg) =>
          seg.id === prevSegId ? { ...seg, endTime: timestamp } : seg,
        ),
      );
    }

    if (stickDirLabel && !isMuted) {
      const segId = nextSegIdRef.current++;
      activeSegByKeyRef.current.set("stick_left", segId);
      setNow(timestamp);
      setSegments((prev) => [
        ...prev.filter(
          (s) => s.endTime === null || timestamp - s.endTime < WINDOW_MS,
        ),
        {
          id: segId,
          keyId: "stick_left",
          track: "stick",
          label: stickDirLabel,
          color: "#06b6d4",
          glowColor: "rgba(6,182,212,0.75)",
          startTime: timestamp,
          endTime: null,
        },
      ]);
    }

    prevStickDirRef.current = stickDirLabel;
  }, [stickDirLabel, isMuted]);

  // Close any open timeline ribbons when muting
  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const nextMuted = !prev;
      if (nextMuted && activeSegByKeyRef.current.size > 0) {
        const timestamp = performance.now();
        const openIds = new Set(activeSegByKeyRef.current.values());
        activeSegByKeyRef.current.clear();
        prevStickDirRef.current = null;
        setSegments((segs) =>
          segs.map((seg) =>
            openIds.has(seg.id) && seg.endTime === null
              ? { ...seg, endTime: timestamp }
              : seg,
          ),
        );
      }
      return nextMuted;
    });
  }, []);

  const handleClearTimeline = useCallback(() => {
    activeSegByKeyRef.current.clear();
    prevStickDirRef.current = null;
    setSegments([]);
  }, []);

  // Global keyboard listeners
  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target.isContentEditable
      );
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditableTarget(event.target)) return;
      const def = CODE_TO_KEY.get(event.code);
      if (!def) return;

      if (
        def.track === "dpad" &&
        sandboxRef.current &&
        sandboxRef.current.contains(document.activeElement)
      ) {
        event.preventDefault();
      }
      if (!event.repeat) {
        pressKey(def.id);
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const def = CODE_TO_KEY.get(event.code);
      if (!def) return;
      releaseKey(def.id);
    };

    const onBlur = () => {
      const timestamp = performance.now();
      activeSegByKeyRef.current.clear();
      prevStickDirRef.current = null;
      setPressedIds(new Set());
      setSegments((prev) =>
        prev.map((seg) =>
          seg.endTime === null ? { ...seg, endTime: timestamp } : seg,
        ),
      );
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [pressKey, releaseKey]);

  // Smooth 60Hz loop only while timeline has visible segments
  const hasVisibleSegments = segments.length > 0;
  useEffect(() => {
    if (!hasVisibleSegments || isMuted) return;

    let frameId = 0;
    const tick = () => {
      const current = performance.now();
      setNow(current);
      setSegments((prev) => {
        const filtered = prev.filter(
          (s) => s.endTime === null || current - s.endTime < WINDOW_MS,
        );
        return filtered.length === prev.length ? prev : filtered;
      });
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [hasVisibleSegments, isMuted]);

  const mascotMood = isMuted
    ? "muted"
    : activeButtons.length > 0 || stickX !== 0 || stickY !== 0
      ? "excited"
      : "focused";

  const getKey = (id: string) => ID_TO_KEY.get(id)!;

  return (
    <section id="controls" className="px-4 py-12 sm:px-6 md:py-14">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-[-0.02em] text-ink sm:text-4xl">
            {content.controls.heading}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-ink-soft sm:text-lg">
            {content.controls.subheading}
          </p>
        </div>

        {/* Main interactive sandbox workbench */}
        <div ref={sandboxRef} tabIndex={-1} className="mt-8 outline-none">
          <SketchCard
            tone="paper"
            tape="corners"
            roughBorder
            className="p-5 sm:p-7"
          >
            {/* Clear browser-simulation preview banner */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-ghost-sky-deep/25 bg-ghost-sky-pale/80 px-3.5 py-2.5 text-ink">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium sm:text-sm">
                <span className="inline-flex items-center gap-1 rounded-md bg-ink px-2 py-0.5 font-[family-name:var(--font-display)] text-[11px] font-bold text-paper">
                  <MonitorPlay className="h-3.5 w-3.5 text-ghost-sky" aria-hidden="true" />
                  <span>{content.controls.simulationBadge}</span>
                </span>
                <span className="font-semibold text-ink">
                  {content.controls.simulationBanner}
                </span>
              </div>
            </div>

            {/* Top utility bar: tryHint + Mute toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-dashed border-ink/12 pb-4">
              <p className="inline-flex items-center gap-2 text-sm font-medium text-ink-soft">
                <Keyboard
                  className="h-4 w-4 shrink-0 text-ghost-sky-deep"
                  aria-hidden="true"
                />
                <span>{content.controls.tryHint}</span>
              </p>

              <button
                type="button"
                onClick={handleToggleMute}
                aria-pressed={isMuted}
                className={`inline-flex items-center gap-2 rounded-xl border-2 px-3.5 py-2 text-xs font-semibold transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-[0.96] sm:text-sm ${
                  isMuted
                    ? "border-marker-coral-deep/35 bg-marker-coral/45 text-marker-coral-deep"
                    : "border-marker-mint-deep/35 bg-marker-mint/45 text-marker-mint-deep"
                }`}
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  {isMuted ? (
                    <motion.span
                      key="muted"
                      initial={
                        prefersReducedMotion
                          ? { opacity: 0 }
                          : { opacity: 0, scale: 0.25, filter: "blur(4px)" }
                      }
                      animate={
                        prefersReducedMotion
                          ? { opacity: 1 }
                          : { opacity: 1, scale: 1, filter: "blur(0px)" }
                      }
                      exit={
                        prefersReducedMotion
                          ? { opacity: 0 }
                          : { opacity: 0, scale: 0.25, filter: "blur(4px)" }
                      }
                      transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                      className="flex items-center"
                    >
                      <PauseCircle className="h-4 w-4" aria-hidden="true" />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="active"
                      initial={
                        prefersReducedMotion
                          ? { opacity: 0 }
                          : { opacity: 0, scale: 0.25, filter: "blur(4px)" }
                      }
                      animate={
                        prefersReducedMotion
                          ? { opacity: 1 }
                          : { opacity: 1, scale: 1, filter: "blur(0px)" }
                      }
                      exit={
                        prefersReducedMotion
                          ? { opacity: 0 }
                          : { opacity: 0, scale: 0.25, filter: "blur(4px)" }
                      }
                      transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                      className="flex items-center"
                    >
                      <Radio className="h-4 w-4" aria-hidden="true" />
                    </motion.span>
                  )}
                </AnimatePresence>
                <span>
                  {isMuted
                    ? content.controls.muteToggle.mutedLabel
                    : content.controls.muteToggle.activeLabel}
                </span>
              </button>
            </div>

            {/* Center: Reactive Mascot + Virtual Keycap Deck */}
            <div className="mt-6 grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
              {/* Mascot column */}
              <div className="flex flex-col items-center justify-center lg:col-span-4">
                <GhostMascot
                  className="h-44 w-44 sm:h-48 sm:w-48"
                  mood={mascotMood}
                  stickX={stickX}
                  stickY={stickY}
                  activeButtons={activeButtons}
                  showSignals={!isMuted}
                />

                <div
                  aria-live="polite"
                  className="mt-2 flex min-h-[2rem] flex-wrap items-center justify-center gap-1.5"
                >
                  {isMuted ? (
                    <span className="rounded-full bg-marker-coral/40 px-3 py-0.5 font-[family-name:var(--font-mono)] text-xs font-semibold text-marker-coral-deep">
                      {content.controls.statusMuted}
                    </span>
                  ) : activeButtons.length > 0 || stickDirLabel ? (
                    <>
                      {stickDirLabel && (
                        <span className="rounded-full bg-[#06b6d4]/20 px-2.5 py-0.5 font-[family-name:var(--font-mono)] text-xs font-bold text-ink">
                          {stickDirLabel}
                        </span>
                      )}
                      {activeButtons.map((btn) => (
                        <span
                          key={btn}
                          className="rounded-full bg-ghost-sky-pale px-2.5 py-0.5 font-[family-name:var(--font-mono)] text-xs font-bold text-ghost-sky-deep"
                        >
                          {btn}
                        </span>
                      ))}
                    </>
                  ) : (
                    <span className="font-[family-name:var(--font-mono)] text-xs text-ink-muted">
                      {content.controls.statusIdle}
                    </span>
                  )}
                </div>
              </div>

              {/* Virtual keycap deck */}
              <div className="space-y-5 lg:col-span-8">
                {/* Shoulder triggers row: [Q: ZL] [E: L]   [U: R] [O: ZR] */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <KeycapButton
                      keyDef={getKey("Q")}
                      pressed={pressedIds.has("Q")}
                      accentBg="bg-[#f43f5e]"
                      onPress={pressKey}
                      onRelease={releaseKey}
                      wide
                    />
                    <KeycapButton
                      keyDef={getKey("E")}
                      pressed={pressedIds.has("E")}
                      accentBg="bg-[#ec4899]"
                      onPress={pressKey}
                      onRelease={releaseKey}
                      wide
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <KeycapButton
                      keyDef={getKey("U")}
                      pressed={pressedIds.has("U")}
                      accentBg="bg-[#ec4899]"
                      onPress={pressKey}
                      onRelease={releaseKey}
                      wide
                    />
                    <KeycapButton
                      keyDef={getKey("O")}
                      pressed={pressedIds.has("O")}
                      accentBg="bg-[#f43f5e]"
                      onPress={pressKey}
                      onRelease={releaseKey}
                      wide
                    />
                  </div>
                </div>

                {/* Main clusters: WASD + System + IJKL + Arrows */}
                <div className="grid grid-cols-1 gap-5 rounded-2xl bg-paper-warm/70 p-4 sm:grid-cols-3 sm:items-center">
                  {/* WASD Left Stick */}
                  <div className="flex flex-col items-center gap-1.5">
                    <KeycapButton
                      keyDef={getKey("W")}
                      pressed={pressedIds.has("W")}
                      accentBg="bg-[#06b6d4]"
                      onPress={pressKey}
                      onRelease={releaseKey}
                    />
                    <div className="flex items-center gap-1.5">
                      <KeycapButton
                        keyDef={getKey("A")}
                        pressed={pressedIds.has("A")}
                        accentBg="bg-[#06b6d4]"
                        onPress={pressKey}
                        onRelease={releaseKey}
                      />
                      <KeycapButton
                        keyDef={getKey("S")}
                        pressed={pressedIds.has("S")}
                        accentBg="bg-[#06b6d4]"
                        onPress={pressKey}
                        onRelease={releaseKey}
                      />
                      <KeycapButton
                        keyDef={getKey("D")}
                        pressed={pressedIds.has("D")}
                        accentBg="bg-[#06b6d4]"
                        onPress={pressKey}
                        onRelease={releaseKey}
                      />
                    </div>
                  </div>

                  {/* Center System keys + Arrow D-Pad */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      <KeycapButton
                        keyDef={getKey("M")}
                        pressed={pressedIds.has("M")}
                        accentBg="bg-[#64748b]"
                        onPress={pressKey}
                        onRelease={releaseKey}
                      />
                      <KeycapButton
                        keyDef={getKey("H")}
                        pressed={pressedIds.has("H")}
                        accentBg="bg-[#0284c7]"
                        onPress={pressKey}
                        onRelease={releaseKey}
                      />
                      <KeycapButton
                        keyDef={getKey("N")}
                        pressed={pressedIds.has("N")}
                        accentBg="bg-[#64748b]"
                        onPress={pressKey}
                        onRelease={releaseKey}
                      />
                      <KeycapButton
                        keyDef={getKey("P")}
                        pressed={pressedIds.has("P")}
                        accentBg="bg-[#64748b]"
                        onPress={pressKey}
                        onRelease={releaseKey}
                      />
                    </div>

                    <div className="flex flex-col items-center gap-1">
                      <KeycapButton
                        keyDef={getKey("UP")}
                        pressed={pressedIds.has("UP")}
                        accentBg="bg-[#a855f7]"
                        onPress={pressKey}
                        onRelease={releaseKey}
                      />
                      <div className="flex items-center gap-1">
                        <KeycapButton
                          keyDef={getKey("LEFT")}
                          pressed={pressedIds.has("LEFT")}
                          accentBg="bg-[#a855f7]"
                          onPress={pressKey}
                          onRelease={releaseKey}
                        />
                        <KeycapButton
                          keyDef={getKey("DOWN")}
                          pressed={pressedIds.has("DOWN")}
                          accentBg="bg-[#a855f7]"
                          onPress={pressKey}
                          onRelease={releaseKey}
                        />
                        <KeycapButton
                          keyDef={getKey("RIGHT")}
                          pressed={pressedIds.has("RIGHT")}
                          accentBg="bg-[#a855f7]"
                          onPress={pressKey}
                          onRelease={releaseKey}
                        />
                      </div>
                    </div>
                  </div>

                  {/* IJKL Action Diamond */}
                  <div className="flex flex-col items-center gap-1.5">
                    <KeycapButton
                      keyDef={getKey("I")}
                      pressed={pressedIds.has("I")}
                      accentBg="bg-[#0284c7]"
                      onPress={pressKey}
                      onRelease={releaseKey}
                    />
                    <div className="flex items-center gap-1.5">
                      <KeycapButton
                        keyDef={getKey("J")}
                        pressed={pressedIds.has("J")}
                        accentBg="bg-[#d97706]"
                        onPress={pressKey}
                        onRelease={releaseKey}
                      />
                      <KeycapButton
                        keyDef={getKey("K")}
                        pressed={pressedIds.has("K")}
                        accentBg="bg-[#dc2626]"
                        onPress={pressKey}
                        onRelease={releaseKey}
                      />
                      <KeycapButton
                        keyDef={getKey("L")}
                        pressed={pressedIds.has("L")}
                        accentBg="bg-[#059669]"
                        onPress={pressKey}
                        onRelease={releaseKey}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop-app parity 5-track DAW InputTimelineStream (30s, LEFT-TO-RIGHT) */}
            <div className="mt-7 border-t-2 border-dashed border-ink/12 pt-5">
              <div className="overflow-hidden rounded-xl border border-slate-200/95 bg-white shadow-xs">
                {/* DAW Stream Control Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/90 bg-white px-3 py-2 select-none sm:px-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-700">
                      <Film className="h-3 w-3" aria-hidden="true" />
                    </div>
                    <h3 className="text-xs font-semibold text-slate-800 sm:text-sm">
                      {content.controls.timelineTitle}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    {/* Live operation count badge */}
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-[family-name:var(--font-mono)] text-[11px] font-medium text-slate-600 tabular-nums">
                      <Zap className="h-3 w-3 text-amber-500" aria-hidden="true" />
                      <span>
                        {content.controls.timelineOpCountLabel}: {segments.length}
                      </span>
                    </span>

                    {/* 30s Duration badge */}
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 font-[family-name:var(--font-mono)] text-[11px] font-medium text-slate-700">
                      <Clock className="h-3 w-3 text-slate-400" aria-hidden="true" />
                      <span>{content.controls.timelineDurationLabel}</span>
                    </span>

                    {/* Clear timeline history button */}
                    <button
                      type="button"
                      onClick={handleClearTimeline}
                      aria-label={content.controls.timelineClearLabel}
                      title={content.controls.timelineClearLabel}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-[transform,background-color,color] duration-150 ease-out hover:bg-slate-100 hover:text-rose-600 active:scale-[0.96]"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* 5-Track DAW Score Sheet Canvas Area */}
                <div className="relative select-none bg-white">
                  <div className="grid grid-cols-[62px_1fr]">
                    {/* Top-left corner: 軌道 */}
                    <div className="flex h-[20px] items-center justify-center border-r border-b border-slate-200/90 bg-slate-100 text-[10px] font-bold text-slate-500">
                      {content.controls.timelineTracksHeader}
                    </div>

                    {/* Top Time Ruler (0s..30s with 1s minor ticks & NOW badge) */}
                    <div className="relative h-[20px] border-b border-slate-200/90 bg-slate-100">
                      {ALL_SECOND_TICKS.map((sec) => {
                        const pct = (sec / DURATION_SEC) * 100;
                        const isMajor = sec % 5 === 0;
                        return (
                          <span
                            key={`top-tick-${sec}`}
                            style={{ left: `${pct}%` }}
                            className={`pointer-events-none absolute bottom-0 w-px ${
                              isMajor
                                ? "h-[5px] bg-slate-400/80"
                                : "h-[3px] bg-slate-300/80"
                            }`}
                          />
                        );
                      })}
                      {MAJOR_TICKS.map((sec) => {
                        const pct = (sec / DURATION_SEC) * 100;
                        return (
                          <span
                            key={`top-label-${sec}`}
                            style={{ left: `${pct}%` }}
                            className={`pointer-events-none absolute top-[1px] font-[family-name:var(--font-mono)] text-[9.5px] font-bold leading-none ${
                              sec === 0
                                ? "translate-x-0.5 text-[#0284c7]"
                                : sec === DURATION_SEC
                                  ? "-translate-x-full pr-1 text-slate-500"
                                  : "-translate-x-1/2 text-slate-500"
                            }`}
                          >
                            {sec === 0
                              ? `${sec}s ${content.controls.timelineNowLabel}`
                              : `${sec}s`}
                          </span>
                        );
                      })}
                    </div>

                    {/* Left Sidebar Track Labels */}
                    <div className="border-r border-slate-200/90 bg-slate-50">
                      {content.controls.tracks.map((track) => (
                        <div
                          key={`sidebar-${track.id}`}
                          className="flex h-[26px] items-center gap-1.5 border-b border-slate-200/75 px-2 last:border-b-0"
                        >
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: track.color }}
                          />
                          <span className="truncate text-[10px] font-bold text-slate-700">
                            {track.label}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Playable 5-Track Staff Area (Events spawn LEFT at NOW and scroll RIGHT -> 30s) */}
                    <div className="relative overflow-hidden">
                      {/* 5s vertical grid lines */}
                      {MAJOR_TICKS.slice(1, -1).map((sec) => (
                        <div
                          key={`grid-${sec}`}
                          style={{ left: `${(sec / DURATION_SEC) * 100}%` }}
                          className="pointer-events-none absolute inset-y-0 z-0 w-px bg-slate-200/90"
                        />
                      ))}

                      {/* Left NOW Playhead Strike Line */}
                      <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-[1.5px] bg-[#0284c7]" />

                      {/* Right exit fade gradient (matching desktop FADE_W = 40px) */}
                      <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-10 bg-gradient-to-r from-transparent to-slate-50/95" />

                      {/* 5 horizontal track lanes */}
                      {content.controls.tracks.map((track, laneIdx) => {
                        const trackSegments = segments.filter(
                          (s) => s.track === track.id,
                        );

                        return (
                          <div
                            key={`lane-${track.id}`}
                            className={`relative h-[26px] border-b border-slate-200/85 last:border-b-0 ${
                              laneIdx % 2 === 0 ? "bg-white" : "bg-slate-50"
                            }`}
                          >
                            {trackSegments.map((seg) => {
                              const isHeld = seg.endTime === null;
                              const timeFromStartSec = Math.max(
                                0,
                                (now - seg.startTime) / 1000,
                              );
                              const headPct = Math.min(
                                105,
                                (timeFromStartSec / DURATION_SEC) * 100,
                              );
                              const tailPct = isHeld
                                ? 0
                                : Math.min(
                                    105,
                                    (Math.max(0, (now - seg.endTime!) / 1000) /
                                      DURATION_SEC) *
                                      100,
                                  );
                              const spanPct = Math.max(0, headPct - tailPct);

                              return (
                                <div
                                  key={seg.id}
                                  style={{
                                    left: `${tailPct}%`,
                                    width: `calc(${spanPct}% + 20px)`,
                                    background: isHeld
                                      ? `linear-gradient(90deg, ${seg.color} 0%, #ffffff 100%)`
                                      : seg.color,
                                    boxShadow: isHeld
                                      ? `0 0 8px ${seg.glowColor}`
                                      : undefined,
                                    borderColor: isHeld
                                      ? "rgba(15, 23, 42, 0.35)"
                                      : "rgba(15, 23, 42, 0.14)",
                                  }}
                                  className="absolute top-[3px] z-10 flex h-[20px] items-center justify-end rounded-full border"
                                >
                                  <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[10px] font-black leading-none text-slate-900">
                                    {seg.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>

                    {/* Bottom-left corner */}
                    <div className="h-[16px] border-t border-r border-slate-200/90 bg-slate-100" />

                    {/* Bottom Time Ruler */}
                    <div className="relative h-[16px] border-t border-slate-200/90 bg-slate-100">
                      {ALL_SECOND_TICKS.map((sec) => {
                        const pct = (sec / DURATION_SEC) * 100;
                        const isMajor = sec % 5 === 0;
                        return (
                          <span
                            key={`bot-tick-${sec}`}
                            style={{ left: `${pct}%` }}
                            className={`pointer-events-none absolute top-0 w-px ${
                              isMajor
                                ? "h-[4px] bg-slate-400/60"
                                : "h-[3px] bg-slate-300/80"
                            }`}
                          />
                        );
                      })}
                      {MAJOR_TICKS.map((sec) => {
                        const pct = (sec / DURATION_SEC) * 100;
                        return (
                          <span
                            key={`bot-label-${sec}`}
                            style={{ left: `${pct}%` }}
                            className={`pointer-events-none absolute bottom-[1px] font-[family-name:var(--font-mono)] text-[8.5px] font-semibold leading-none ${
                              sec === 0
                                ? "translate-x-0.5 text-[#0284c7]"
                                : sec === DURATION_SEC
                                  ? "-translate-x-full pr-1 text-slate-500"
                                  : "-translate-x-1/2 text-slate-500"
                            }`}
                          >
                            {sec}s
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <p className="mt-2.5 text-xs text-ink-muted sm:text-sm">
                {content.controls.timelineSubtitle}
              </p>
            </div>
          </SketchCard>
        </div>

        {/* Bottom reference area: Cheat sheet + 2 handy tips */}
        <div className="mt-8 grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
          {/* Clean keyboard cheat sheet */}
          <div className="lg:col-span-7">
            <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-ink">
              {content.controls.cheatSheetTitle}
            </h3>

            <div className="mt-3.5 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              {content.controls.keyGroups.map((group) => (
                <div
                  key={group.title}
                  className="border-t-2 border-ink/12 pt-2.5"
                >
                  <h4 className="font-[family-name:var(--font-display)] text-sm font-bold text-ink">
                    {group.title}
                  </h4>
                  <dl className="mt-2 space-y-1.5">
                    {group.keys.map((item) => (
                      <div
                        key={item.label}
                        className="flex items-baseline justify-between gap-3 text-sm"
                      >
                        <dt className="shrink-0 rounded-md border border-ink/15 bg-paper-card px-2 py-0.5 font-[family-name:var(--font-mono)] text-xs font-semibold text-ink">
                          {item.label}
                        </dt>
                        <dd className="text-right text-ink-soft">
                          {item.desc}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </div>

          {/* 2 plain-language handy tips */}
          <div className="space-y-4 lg:col-span-5">
            {content.controls.handyTips.map((tip, index) => (
              <SketchCard
                key={tip.title}
                tone={index === 0 ? "sky" : "warm"}
                tape={index === 0 ? "top" : "none"}
                roughBorder
                className="p-5"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-paper-card text-ink">
                    {index === 0 ? (
                      <PauseCircle
                        className="h-5 w-5 text-ghost-sky-deep"
                        aria-hidden="true"
                      />
                    ) : (
                      <Gamepad2
                        className="h-5 w-5 text-ink"
                        aria-hidden="true"
                      />
                    )}
                  </span>
                  <div>
                    <h4 className="font-[family-name:var(--font-display)] text-base font-bold text-ink">
                      {tip.title}
                    </h4>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                      {tip.body}
                    </p>
                    <p className="mt-2.5 inline-block rounded-full bg-paper-card/85 px-2.5 py-0.5 text-xs font-semibold text-ink">
                      {tip.note}
                    </p>
                  </div>
                </div>
              </SketchCard>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
