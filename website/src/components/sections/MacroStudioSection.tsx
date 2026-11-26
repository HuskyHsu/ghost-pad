import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  CircleDot,
  Clock,
  Download,
  FileJson,
  Gamepad2,
  Infinity as InfinityIcon,
  Link2,
  MonitorPlay,
  Pause,
  Play,
  Plus,
  Repeat,
  Repeat1,
  RotateCcw,
  Trash2,
  Undo2,
} from "lucide-react";
import { useContent } from "../../i18n/useContent";
import { GhostMascot, SketchCard, SketchHighlight } from "../sketch";

type MacroStepId = "record" | "edit" | "loop";
type LoopMode = "once" | "count" | "infinite";

interface DemoBlock {
  id: string;
  trackIndex: number;
  label: string;
  durationMs: number;
  isWait?: boolean;
}

const INITIAL_TIMELINE_BLOCKS: DemoBlock[] = [
  { id: "b1", trackIndex: 0, label: "A", durationMs: 600 },
  { id: "b2", trackIndex: 2, label: "↑", durationMs: 1000 },
  { id: "b3", trackIndex: 4, label: "Wait", durationMs: 800, isWait: true },
  { id: "b4", trackIndex: 0, label: "A", durationMs: 600 },
  { id: "b5", trackIndex: 3, label: "R", durationMs: 700 },
];

const EXTRA_ACTIONS = [
  { trackIndex: 0, label: "B", durationMs: 600 },
  { trackIndex: 1, label: "↓", durationMs: 700 },
  { trackIndex: 0, label: "X", durationMs: 600 },
];

const ROW_SCALE_OPTIONS = [5000, 10000] as const;

const SPEED_OPTIONS = [0.5, 1, 1.5, 2] as const;

function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function MacroStudioSection() {
  const content = useContent();
  const { macro, controls } = content;
  const prefersReducedMotion = useReducedMotion();

  const [activeStep, setActiveStep] = useState<MacroStepId>("record");

  // Step 1: 3-2-1 countdown recording simulation
  const [countdownPhase, setCountdownPhase] = useState<3 | 2 | 1 | "rec">(3);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [countdownRunKey, setCountdownRunKey] = useState(0);

  // Step 2: 5-track visual editor state with strictly single-row fixed X-axis scale (5s / 10s)
  const [timelineBlocks, setTimelineBlocks] = useState<DemoBlock[]>(INITIAL_TIMELINE_BLOCKS);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>("b2");
  const [addedCounter, setAddedCounter] = useState(0);
  const [rowScaleMs, setRowScaleMs] = useState<(typeof ROW_SCALE_OPTIONS)[number]>(10000);

  const selectedBlock = timelineBlocks.find((b) => b.id === selectedBlockId) ?? null;
  const totalTimelineMs = timelineBlocks.reduce((sum, b) => sum + b.durationMs, 0);
  const majorTickStepSec = rowScaleMs === 10000 ? 2 : 1;
  const totalSecondsMarks = rowScaleMs / 1000;

  const nextActionTemplate = EXTRA_ACTIONS[addedCounter % EXTRA_ACTIONS.length];
  const NEXT_WAIT_DURATION_MS = 600;
  const canAddAction = totalTimelineMs + nextActionTemplate.durationMs <= rowScaleMs;
  const canAddWait = totalTimelineMs + NEXT_WAIT_DURATION_MS <= rowScaleMs;
  const canIncreaseSelected = Boolean(
    selectedBlock &&
      selectedBlock.durationMs + 100 <= 2500 &&
      totalTimelineMs + 100 <= rowScaleMs
  );
  const canDecreaseSelected = Boolean(selectedBlock && selectedBlock.durationMs - 100 >= 200);
  const isAtRowCap = !canAddAction || !canAddWait || totalTimelineMs + 100 > rowScaleMs;

  const handleAdjustSelectedDuration = (deltaMs: number) => {
    if (!selectedBlockId) return;
    if (deltaMs > 0 && totalTimelineMs + deltaMs > rowScaleMs) return;
    setTimelineBlocks((prev) =>
      prev.map((b) =>
        b.id === selectedBlockId
          ? { ...b, durationMs: Math.max(200, Math.min(2500, b.durationMs + deltaMs)) }
          : b
      )
    );
  };

  const handleDeleteSelected = () => {
    if (!selectedBlockId) return;
    setTimelineBlocks((prev) => prev.filter((b) => b.id !== selectedBlockId));
    setSelectedBlockId(null);
  };

  const handleAddDemoAction = () => {
    if (!canAddAction) return;
    const nextId = `added-act-${addedCounter + 1}`;
    setAddedCounter((c) => c + 1);
    setTimelineBlocks((prev) => [...prev, { id: nextId, ...nextActionTemplate }]);
    setSelectedBlockId(nextId);
  };

  const handleAddDemoWait = () => {
    if (!canAddWait) return;
    const nextId = `added-wait-${addedCounter + 1}`;
    setAddedCounter((c) => c + 1);
    setTimelineBlocks((prev) => [
      ...prev,
      { id: nextId, trackIndex: 4, label: "Wait", durationMs: NEXT_WAIT_DURATION_MS, isWait: true },
    ]);
    setSelectedBlockId(nextId);
  };

  const handleResetTimeline = () => {
    setTimelineBlocks(INITIAL_TIMELINE_BLOCKS);
    setSelectedBlockId("b2");
    setAddedCounter(0);
  };

  // Step 3: loop mode & repeat count
  const [loopMode, setLoopMode] = useState<LoopMode>("infinite");
  const [loopCount, setLoopCount] = useState(10);

  // Unified Dual-Screen Synced Showcase Player state & refs
  const appVideoRef = useRef<HTMLVideoElement | null>(null);
  const switchVideoRef = useRef<HTMLVideoElement | null>(null);
  const bothVideosReady = macro.showcase.appVideoReady && macro.showcase.switchVideoReady;
  const [isDualPlaying, setIsDualPlaying] = useState(false);
  const [dualCurrentTime, setDualCurrentTime] = useState(0);
  const [dualDuration, setDualDuration] = useState(0);
  const [dualSpeed, setDualSpeed] = useState<(typeof SPEED_OPTIONS)[number]>(1);

  const handleToggleDualPlay = async () => {
    if (!bothVideosReady) return;
    const vApp = appVideoRef.current;
    const vSwitch = switchVideoRef.current;
    if (!vApp || !vSwitch) return;

    if (isDualPlaying) {
      vApp.pause();
      vSwitch.pause();
      setIsDualPlaying(false);
      return;
    }

    vApp.playbackRate = dualSpeed;
    vSwitch.playbackRate = dualSpeed;
    if (Math.abs(vApp.currentTime - vSwitch.currentTime) > 0.05) {
      vSwitch.currentTime = vApp.currentTime;
    }
    try {
      await Promise.all([vApp.play(), vSwitch.play()]);
      setIsDualPlaying(true);
    } catch {
      vApp.pause();
      vSwitch.pause();
      setIsDualPlaying(false);
    }
  };

  const handleDualRestart = () => {
    if (!bothVideosReady) return;
    const vApp = appVideoRef.current;
    const vSwitch = switchVideoRef.current;
    if (vApp) vApp.currentTime = 0;
    if (vSwitch) vSwitch.currentTime = 0;
    setDualCurrentTime(0);
  };

  const handleDualSeek = (nextTime: number) => {
    if (!bothVideosReady) return;
    const vApp = appVideoRef.current;
    const vSwitch = switchVideoRef.current;
    if (vApp) vApp.currentTime = nextTime;
    if (vSwitch) vSwitch.currentTime = nextTime;
    setDualCurrentTime(nextTime);
  };

  const handleDualSpeedChange = (nextSpeed: (typeof SPEED_OPTIONS)[number]) => {
    setDualSpeed(nextSpeed);
    if (appVideoRef.current) appVideoRef.current.playbackRate = nextSpeed;
    if (switchVideoRef.current) switchVideoRef.current.playbackRate = nextSpeed;
  };

  const handleDualMetadata = () => {
    const d1 = appVideoRef.current?.duration ?? 0;
    const d2 = switchVideoRef.current?.duration ?? 0;
    const validMax = Math.max(
      Number.isFinite(d1) ? d1 : 0,
      Number.isFinite(d2) ? d2 : 0
    );
    if (validMax > 0) setDualDuration(validMax);
  };

  const handleAppTimeUpdate = () => {
    const vApp = appVideoRef.current;
    const vSwitch = switchVideoRef.current;
    if (!vApp) return;
    setDualCurrentTime(vApp.currentTime);
    if (vSwitch && Math.abs(vApp.currentTime - vSwitch.currentTime) > 0.15) {
      vSwitch.currentTime = vApp.currentTime;
    }
  };

  const handleDualEnded = () => {
    appVideoRef.current?.pause();
    switchVideoRef.current?.pause();
    setIsDualPlaying(false);
  };

  useEffect(() => {
    if (activeStep !== "record") return;

    setCountdownPhase(3);
    setElapsedMs(0);

    const t1 = window.setTimeout(() => setCountdownPhase(2), 650);
    const t2 = window.setTimeout(() => setCountdownPhase(1), 1300);
    const t3 = window.setTimeout(() => setCountdownPhase("rec"), 1950);

    let intervalId: number | undefined;
    const tRec = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        setElapsedMs((prev) => (prev >= 2400 ? 0 : prev + 80));
      }, 80);
    }, 1950);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearTimeout(tRec);
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, [activeStep, countdownRunKey]);

  const activeCaptureIndex =
    countdownPhase === "rec" ? Math.min(3, Math.floor(elapsedMs / 600)) : -1;
  const capturedSignals = ["A", "↑", "A", "B"];

  return (
    <section
      id="macro"
      aria-labelledby="macro-heading"
      className="mx-auto max-w-6xl px-5 py-12 sm:px-8 md:py-14"
    >
      {/* Section Header — no eyebrow pills */}
      <div className="max-w-2xl">
        <h2
          id="macro-heading"
          className="font-[var(--font-display)] text-3xl font-bold tracking-[-0.02em] text-ink sm:text-4xl"
        >
          {macro.heading}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-ink-soft sm:text-lg">
          {macro.subheading}
        </p>
      </div>

      {/* Interactive 3-Step Workbench: Asymmetric 5 / 7 split */}
      <div className="mt-8 grid gap-6 lg:grid-cols-12 lg:items-start">
        {/* Left: Step selector list */}
        <div
          role="tablist"
          aria-label={macro.workbench.tablistAriaLabel}
          className="flex flex-col gap-3 lg:col-span-5"
        >
          {macro.steps.map((step) => {
            const stepId = step.id as MacroStepId;
            const isSelected = activeStep === stepId;
            return (
              <button
                key={step.id}
                type="button"
                role="tab"
                id={`macro-tab-${step.id}`}
                aria-selected={isSelected}
                aria-controls={`macro-panel-${step.id}`}
                onClick={() => setActiveStep(stepId)}
                className={`group relative w-full cursor-pointer rounded-2xl border-2 px-5 py-4 text-left transition-[background-color,border-color,transform,box-shadow] duration-150 ease-out active:scale-[0.96] ${
                  isSelected
                    ? "border-ink bg-paper-card paper-shadow"
                    : "border-ink/15 bg-paper-warm/70 hover:border-ink/35 hover:bg-paper-card/80"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 font-[var(--font-display)] text-sm font-bold tabular-nums transition-[background-color,color,border-color] duration-150 ease-out ${
                      isSelected
                        ? "border-ink bg-marker-yellow text-ink"
                        : "border-ink/25 bg-paper text-ink-soft group-hover:border-ink/50"
                    }`}
                  >
                    {step.step}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-[var(--font-display)] text-base font-bold text-ink sm:text-lg">
                      {step.title}
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                      {step.desc}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Interactive Animated Stage */}
        <div className="lg:col-span-7">
          <SketchCard tone="paper" roughBorder className="p-5 sm:p-7">
            <AnimatePresence mode="wait" initial={false}>
              {activeStep === "record" && (
                <motion.div
                  key="record"
                  role="tabpanel"
                  id="macro-panel-record"
                  aria-labelledby="macro-tab-record"
                  initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="space-y-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                          countdownPhase === "rec"
                            ? "border-marker-coral-deep/40 bg-marker-coral/60 text-marker-coral-deep"
                            : "border-ink/20 bg-marker-yellow/70 text-ink"
                        }`}
                      >
                        <CircleDot className="h-3.5 w-3.5" aria-hidden="true" />
                        {countdownPhase === "rec"
                          ? macro.workbench.record.recordingBadge
                          : `${macro.workbench.record.countdownPrefix} ${countdownPhase}`}
                      </span>
                      <span className="font-[var(--font-mono)] text-xs font-medium text-ink-muted tabular-nums">
                        {(elapsedMs / 1000).toFixed(2)}s
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setCountdownRunKey((k) => k + 1)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-ink/20 bg-paper-warm px-3 py-1.5 text-xs font-semibold text-ink transition-[background-color,transform] duration-150 ease-out hover:bg-marker-yellow/60 active:scale-[0.96]"
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      {macro.workbench.record.replayButton}
                    </button>
                  </div>

                  {/* Countdown visual stage */}
                  <div className="grid items-center gap-5 rounded-2xl border border-ink/12 bg-paper-warm/65 p-5 sm:grid-cols-12">
                    <div className="flex flex-col items-center justify-center sm:col-span-5">
                      <GhostMascot
                        className="h-28 w-28"
                        mood={countdownPhase === "rec" ? "excited" : "focused"}
                        stickY={activeCaptureIndex === 1 ? -0.8 : 0}
                        activeButtons={
                          activeCaptureIndex === 0 || activeCaptureIndex === 2
                            ? ["A"]
                            : activeCaptureIndex === 3
                              ? ["B"]
                              : []
                        }
                        showSignals={countdownPhase === "rec"}
                      />
                    </div>

                    <div className="space-y-4 sm:col-span-7">
                      <div className="flex items-center gap-2.5">
                        {([3, 2, 1, "rec"] as const).map((phase) => {
                          const isCurrent = countdownPhase === phase;
                          return (
                            <div
                              key={String(phase)}
                              className={`flex h-12 flex-1 items-center justify-center rounded-xl border-2 font-[var(--font-display)] text-lg font-bold tabular-nums transition-[transform,background-color,border-color,color] duration-150 ease-out ${
                                isCurrent
                                  ? phase === "rec"
                                    ? "scale-105 border-marker-coral-deep bg-marker-coral text-marker-coral-deep"
                                    : "scale-105 border-ink bg-marker-yellow text-ink"
                                  : "border-ink/15 bg-paper text-ink-muted"
                              }`}
                            >
                              {phase === "rec" ? "REC" : phase}
                            </div>
                          );
                        })}
                      </div>

                      {/* Captured input pulse strip */}
                      <div className="rounded-xl border border-ink/12 bg-paper-card p-3.5">
                        <div className="flex items-center justify-between text-xs text-ink-muted">
                          <span>{macro.workbench.record.capturedTitle}</span>
                          <span className="font-[var(--font-mono)] tabular-nums">60Hz / 16ms</span>
                        </div>
                        <div className="mt-2.5 flex items-center gap-2">
                          {capturedSignals.map((sig, idx) => {
                            const lit = countdownPhase === "rec" && idx <= activeCaptureIndex;
                            return (
                              <div
                                key={`${sig}-${idx}`}
                                className={`flex h-9 flex-1 items-center justify-center rounded-lg border font-[var(--font-mono)] text-sm font-bold transition-[background-color,border-color,color,transform] duration-150 ease-out ${
                                  lit
                                    ? "border-ghost-sky-deep bg-ghost-sky-pale text-ink"
                                    : "border-dashed border-ink/20 bg-paper-warm/50 text-ink-muted/60"
                                }`}
                              >
                                {sig}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeStep === "edit" && (
                <motion.div
                  key="edit"
                  role="tabpanel"
                  id="macro-panel-edit"
                  aria-labelledby="macro-tab-edit"
                  initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-ink">
                        {macro.workbench.edit.previewTitle}
                      </span>
                      <span className="rounded-lg bg-paper-warm px-2.5 py-1 font-[var(--font-mono)] text-xs font-semibold text-ink-soft tabular-nums">
                        {macro.workbench.edit.totalLengthLabel}：{(totalTimelineMs / 1000).toFixed(2)}s
                      </span>
                      <div
                        role="group"
                        aria-label={macro.workbench.edit.rowScaleAriaLabel}
                        className="inline-flex items-center gap-1 rounded-xl border border-ink/15 bg-paper-warm/80 p-0.5"
                      >
                        {ROW_SCALE_OPTIONS.map((scaleOpt) => {
                          const isCurrent = rowScaleMs === scaleOpt;
                          const isScaleDisabled = scaleOpt === 5000 && totalTimelineMs > 5000;
                          return (
                            <button
                              key={scaleOpt}
                              type="button"
                              disabled={isScaleDisabled}
                              aria-pressed={isCurrent}
                              onClick={() => setRowScaleMs(scaleOpt)}
                              className={`rounded-lg px-2 py-1 font-[var(--font-mono)] text-[11px] font-bold tabular-nums transition-[background-color,color,transform] duration-150 ease-out enabled:cursor-pointer enabled:active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-45 ${
                                isCurrent
                                  ? "bg-paper-card text-ink paper-shadow-sm"
                                  : "text-ink-muted enabled:hover:text-ink"
                              }`}
                            >
                              {scaleOpt / 1000} {macro.workbench.edit.secPerRowUnit}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleResetTimeline}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-ink/20 bg-paper-warm px-3 py-1.5 text-xs font-bold text-ink transition-[background-color,transform] duration-150 ease-out hover:bg-marker-yellow/60 active:scale-[0.96]"
                    >
                      <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
                      {macro.workbench.edit.resetButton}
                    </button>
                  </div>

                  {/* 5-track visual timeline with strictly single-row fixed X-axis scale */}
                  <div className="rounded-2xl border border-ink/15 bg-paper-warm/70 p-4">
                    <div className="flex gap-3">
                      {/* Left track labels */}
                      <div className="w-16 shrink-0 pt-6 space-y-2.5">
                        {controls.tracks.map((track, trackIdx) => (
                          <div
                            key={track.id}
                            className="flex h-8 items-center justify-end text-right text-xs font-semibold text-ink-soft"
                          >
                            {trackIdx === 4
                              ? macro.workbench.edit.systemWaitTrackLabel
                              : track.label}
                          </div>
                        ))}
                      </div>

                      {/* Fixed single-row track canvas (0s..rowScaleMs) */}
                      <div className="min-w-0 flex-1">
                        <div className="relative w-full">
                          {/* Fixed X-axis time ruler */}
                          <div className="relative mb-1 h-5 border-b border-ink/15">
                            {Array.from({ length: totalSecondsMarks + 1 }, (_, sec) => {
                              const isMajor = sec % majorTickStepSec === 0;
                              if (!isMajor) return null;
                              const leftPct = ((sec * 1000) / rowScaleMs) * 100;
                              const alignClass =
                                sec === 0
                                  ? "translate-x-0"
                                  : sec === totalSecondsMarks
                                    ? "-translate-x-full"
                                    : "-translate-x-1/2";
                              return (
                                <span
                                  key={sec}
                                  style={{ left: `${leftPct}%` }}
                                  className={`absolute top-0 font-[var(--font-mono)] text-[10px] font-semibold text-ink-muted tabular-nums ${alignClass}`}
                                >
                                  +{sec}s
                                </span>
                              );
                            })}
                          </div>

                          {/* 5 tracks with 1-second vertical gridlines */}
                          <div className="relative space-y-2.5">
                            {/* Subtle 1s vertical gridlines */}
                            <div
                              aria-hidden="true"
                              className="pointer-events-none absolute inset-0 z-0"
                            >
                              {Array.from({ length: totalSecondsMarks }, (_, idx) => {
                                const sec = idx + 1;
                                const leftPct = ((sec * 1000) / rowScaleMs) * 100;
                                const isMajor = sec % majorTickStepSec === 0;
                                return (
                                  <div
                                    key={sec}
                                    style={{ left: `${leftPct}%` }}
                                    className={`absolute inset-y-0 border-l ${
                                      isMajor ? "border-ink/14" : "border-dashed border-ink/8"
                                    }`}
                                  />
                                );
                              })}
                            </div>

                            {controls.tracks.map((track, trackIdx) => {
                              let cursorMs = 0;
                              const positioned = timelineBlocks.map((block) => {
                                const startMs = cursorMs;
                                cursorMs += block.durationMs;
                                return { block, startMs };
                              });
                              const rowBlocks = positioned.filter(
                                (item) => item.block.trackIndex === trackIdx
                              );

                              return (
                                <div
                                  key={track.id}
                                  className="relative z-10 h-8 overflow-hidden rounded-lg border border-ink/10 bg-paper-card/85"
                                >
                                  {rowBlocks.map(({ block, startMs }) => {
                                    const leftPct = (startMs / rowScaleMs) * 100;
                                    const widthPct = (block.durationMs / rowScaleMs) * 100;
                                    const isSelected = selectedBlockId === block.id;
                                    return (
                                      <motion.button
                                        key={block.id}
                                        type="button"
                                        initial={false}
                                        animate={{
                                          left: `${leftPct}%`,
                                          width: `${widthPct}%`,
                                        }}
                                        transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                                        onClick={() => setSelectedBlockId(block.id)}
                                        aria-pressed={isSelected}
                                        style={{
                                          backgroundColor: block.isWait ? "#64748B" : track.color,
                                        }}
                                        className={`absolute top-1 bottom-1 flex cursor-pointer items-center justify-center overflow-hidden rounded-md px-1 font-[var(--font-mono)] text-[11px] font-bold whitespace-nowrap text-white transition-[box-shadow,transform] duration-150 ease-out active:scale-[0.96] ${
                                          isSelected
                                            ? "z-10 ring-2 ring-ink ring-offset-1 ring-offset-paper-card"
                                            : "opacity-90 hover:opacity-100"
                                        }`}
                                      >
                                        {block.label}
                                      </motion.button>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Selected block quick-edit bar (simulates right-click menu in desktop app) */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-ink/12 bg-paper-card px-3.5 py-2.5 text-xs">
                    {selectedBlock ? (
                      <>
                        <span className="font-semibold text-ink">
                          {macro.workbench.edit.selectedBlockLabel}：
                          <span className="ml-1 font-[var(--font-mono)] text-ghost-sky-deep">
                            {selectedBlock.label}
                          </span>
                          <span className="ml-1.5 font-[var(--font-mono)] text-ink-muted tabular-nums">
                            ({selectedBlock.durationMs}ms)
                          </span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={!canDecreaseSelected}
                            onClick={() => handleAdjustSelectedDuration(-100)}
                            className="rounded-lg border border-ink/20 bg-paper-warm px-2 py-1 font-[var(--font-mono)] font-bold text-ink transition-[background-color,transform] duration-150 ease-out enabled:cursor-pointer enabled:hover:bg-marker-yellow/60 enabled:active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            -100ms
                          </button>
                          <button
                            type="button"
                            disabled={!canIncreaseSelected}
                            onClick={() => handleAdjustSelectedDuration(100)}
                            className="rounded-lg border border-ink/20 bg-paper-warm px-2 py-1 font-[var(--font-mono)] font-bold text-ink transition-[background-color,transform] duration-150 ease-out enabled:cursor-pointer enabled:hover:bg-marker-yellow/60 enabled:active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            +100ms
                          </button>
                          <button
                            type="button"
                            onClick={handleDeleteSelected}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-marker-coral-deep/35 bg-marker-coral/40 px-2 py-1 font-bold text-marker-coral-deep transition-[background-color,transform] duration-150 ease-out hover:bg-marker-coral/70 active:scale-[0.96]"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            {macro.workbench.edit.deleteButton}
                          </button>
                        </div>
                      </>
                    ) : (
                      <span className="text-ink-muted">
                        {macro.workbench.edit.selectBlockHint}
                      </span>
                    )}
                  </div>

                  {/* Real desktop bottom action buttons: + 新增手把動作 / + 新增空白等待 (Wait) */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        disabled={!canAddAction}
                        onClick={handleAddDemoAction}
                        className="inline-flex items-center gap-1.5 rounded-xl border-2 border-ink bg-marker-yellow px-3.5 py-2 text-xs font-bold text-ink transition-[background-color,transform] duration-150 ease-out enabled:cursor-pointer enabled:hover:bg-marker-yellow/80 enabled:active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        {macro.workbench.edit.addActionButton}
                      </button>
                      <button
                        type="button"
                        disabled={!canAddWait}
                        onClick={handleAddDemoWait}
                        className="inline-flex items-center gap-1.5 rounded-xl border-2 border-ink/25 bg-paper-card px-3.5 py-2 text-xs font-bold text-ink transition-[background-color,border-color,transform] duration-150 ease-out enabled:cursor-pointer enabled:hover:border-ink enabled:hover:bg-ghost-sky-pale enabled:active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        {macro.workbench.edit.addWaitButton}
                      </button>
                    </div>

                    {isAtRowCap && (
                      <p className="text-xs font-medium text-ink-muted">
                        {rowScaleMs === 5000
                          ? macro.workbench.edit.rowCapHint5s
                          : macro.workbench.edit.rowCapHint10s}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {activeStep === "loop" && (
                <motion.div
                  key="loop"
                  role="tabpanel"
                  id="macro-panel-loop"
                  aria-labelledby="macro-tab-loop"
                  initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="space-y-5"
                >
                  {/* Loop mode & repeat count panel */}
                  <div className="rounded-2xl border border-ink/12 bg-paper-warm/65 p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-ink sm:text-sm">
                        <Repeat className="h-4 w-4 text-ghost-sky-deep" aria-hidden="true" />
                        <span>{macro.workbench.loop.panelTitle}</span>
                      </div>
                      <span className="font-[var(--font-mono)] text-xs text-ink-muted">
                        {macro.workbench.loop.jsonBadge}
                      </span>
                    </div>

                    <div className="mt-3.5 grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: "once", label: macro.workbench.loop.modeOnce, icon: Repeat1 },
                          { id: "count", label: macro.workbench.loop.modeCount, icon: Repeat },
                          {
                            id: "infinite",
                            label: macro.workbench.loop.modeInfinite,
                            icon: InfinityIcon,
                          },
                        ] as const
                      ).map((mode) => {
                        const Icon = mode.icon;
                        const selected = loopMode === mode.id;
                        return (
                          <button
                            key={mode.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setLoopMode(mode.id)}
                            className={`relative flex cursor-pointer items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-[color,transform] duration-150 ease-out active:scale-[0.96] sm:text-sm ${
                              selected ? "text-ink" : "text-ink-muted hover:text-ink"
                            }`}
                          >
                            {selected && (
                              <motion.span
                                layoutId="macro-loop-pill"
                                transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                                className="absolute inset-0 rounded-xl border-2 border-ink bg-ghost-sky-pale"
                              />
                            )}
                            <Icon className="relative z-10 h-4 w-4" aria-hidden="true" />
                            <span className="relative z-10">{mode.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/12 bg-paper-card px-4 py-2.5 text-xs">
                      {loopMode === "count" ? (
                        <>
                          <span className="font-semibold text-ink-soft">
                            {macro.workbench.loop.countLabel}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              aria-label={macro.workbench.loop.decreaseAriaLabel}
                              onClick={() => setLoopCount((c) => Math.max(2, c - 5))}
                              className="h-7 w-7 cursor-pointer rounded-lg border border-ink/20 bg-paper-warm font-bold text-ink transition-[background-color,transform] duration-150 ease-out hover:bg-marker-yellow/60 active:scale-[0.96]"
                            >
                              -
                            </button>
                            <span className="min-w-[3.5ch] text-center font-[var(--font-mono)] text-sm font-bold text-ink tabular-nums">
                              {loopCount}
                            </span>
                            <button
                              type="button"
                              aria-label={macro.workbench.loop.increaseAriaLabel}
                              onClick={() => setLoopCount((c) => Math.min(999, c + 5))}
                              className="h-7 w-7 cursor-pointer rounded-lg border border-ink/20 bg-paper-warm font-bold text-ink transition-[background-color,transform] duration-150 ease-out hover:bg-marker-yellow/60 active:scale-[0.96]"
                            >
                              +
                            </button>
                          </div>
                        </>
                      ) : loopMode === "once" ? (
                        <span className="text-ink-soft">
                          {macro.workbench.loop.onceDesc}
                        </span>
                      ) : (
                        <span className="text-ink-soft">
                          {macro.workbench.loop.infiniteDesc}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Live playback bar */}
                  <div className="flex items-center gap-4 rounded-2xl border border-ink/12 bg-paper-card p-4">
                    <GhostMascot className="h-14 w-14 shrink-0" mood="happy" showSignals />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between text-xs font-semibold text-ink">
                        <span className="inline-flex items-center gap-1.5">
                          <Play className="h-3.5 w-3.5 text-ghost-sky-deep" aria-hidden="true" />
                          {macro.workbench.loop.runningLabel}
                        </span>
                        <span className="font-[var(--font-mono)] text-ink-muted tabular-nums">
                          {loopMode === "once"
                            ? macro.workbench.loop.counterOnce
                            : loopMode === "count"
                              ? `1 / ${loopCount} ${macro.workbench.loop.counterUnit}`
                              : macro.workbench.loop.counterInfinite}
                        </span>
                      </div>
                      <div className="relative mt-2.5 h-3 overflow-hidden rounded-full bg-paper-warm">
                        <motion.div
                          key={loopMode}
                          initial={{ x: "-100%" }}
                          animate={prefersReducedMotion ? { x: "0%" } : { x: "100%" }}
                          transition={
                            prefersReducedMotion
                              ? { duration: 0 }
                              : {
                                  duration: 2.8,
                                  ease: "linear",
                                  repeat: loopMode === "once" ? 0 : Infinity,
                                }
                          }
                          className="h-full w-1/2 rounded-full bg-ghost-sky"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </SketchCard>
        </div>
      </div>

      {/* Quiet Esc shortcut footnote below the 3-step workbench */}
      <p className="mt-4 flex flex-wrap items-center gap-2 text-xs leading-relaxed text-ink-muted">
        <kbd className="inline-flex items-center justify-center rounded-md border border-ink/25 bg-paper-card px-1.5 py-0.5 font-[var(--font-mono)] text-[11px] font-semibold text-ink">
          Esc
        </kbd>
        <span>{macro.emergencyNote}</span>
      </p>

      {/* Reserved Real-World Showcase: Unified Dual-Screen Synced Player */}
      <div className="mt-10">
        <SketchCard tone="warm" tape="corners" roughBorder className="p-6 sm:p-8">
          <div className="max-w-3xl space-y-3">
            <h3 className="font-[var(--font-display)] text-xl font-bold leading-snug text-ink sm:text-2xl">
              <SketchHighlight variant="marker" color="yellow">
                {macro.showcase.title}
              </SketchHighlight>
            </h3>
            <p className="text-sm font-semibold text-ink-soft">{macro.showcase.subtitle}</p>
            <p className="text-sm leading-relaxed text-ink-soft sm:text-base">
              {macro.showcase.description}
            </p>
          </div>

          {/* One cohesive Dual-Screen Synced Player Frame */}
          <div className="mt-6 overflow-hidden rounded-2xl border-2 border-ink/25 bg-paper-card paper-shadow-sm">
            {/* Shared Top Sync Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink/15 bg-paper-warm/90 px-4 py-2.5 sm:px-5">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/20 bg-ghost-sky-pale px-3 py-1 text-xs font-bold text-ink">
                  <Link2 className="h-3.5 w-3.5 text-ghost-sky-deep" aria-hidden="true" />
                  {macro.showcase.syncBadge}
                </span>
                <span className="inline-flex items-center gap-1.5 font-[var(--font-mono)] text-xs font-bold text-ink-soft">
                  {macro.showcase.syncLinkLabel}
                </span>
              </div>

              <span className="inline-flex items-center gap-1.5 font-[var(--font-mono)] text-xs font-medium text-ink-muted tabular-nums">
                <span
                  className={`h-2 w-2 rounded-full ${
                    bothVideosReady ? "bg-marker-mint-deep" : "bg-ink-muted/45"
                  }`}
                  aria-hidden="true"
                />
                {bothVideosReady
                  ? macro.showcase.syncStatusReady
                  : macro.showcase.syncStatusWaiting}
              </span>
            </div>

            {/* Connected Dual 16:9 Screens */}
            <div className="relative grid grid-cols-1 divide-y-2 divide-ink/15 bg-paper-warm/25 lg:grid-cols-2 lg:divide-x-2 lg:divide-y-0">
              {/* Left Screen: Ghost-Pad Desktop App */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between gap-2 border-b border-ink/10 bg-ghost-sky-pale/45 px-4 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <MonitorPlay className="h-4 w-4 shrink-0 text-ghost-sky-deep" aria-hidden="true" />
                    <span className="truncate font-[var(--font-display)] text-xs font-bold text-ink sm:text-sm">
                      {macro.showcase.appScreenLabel}
                    </span>
                  </div>
                  <span className="hidden truncate text-[11px] text-ink-muted sm:inline">
                    {macro.showcase.appVideoCaption}
                  </span>
                </div>

                <div
                  className={`aspect-video w-full ${
                    macro.showcase.appVideoReady ? "bg-[#EFF1F4]" : "bg-paper-card"
                  }`}
                >
                  {macro.showcase.appVideoReady ? (
                    <video
                      ref={appVideoRef}
                      src={macro.showcase.appVideoSrc}
                      playsInline
                      preload="metadata"
                      onLoadedMetadata={handleDualMetadata}
                      onTimeUpdate={handleAppTimeUpdate}
                      onEnded={handleDualEnded}
                      className="h-full w-full bg-[#EFF1F4] object-contain"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center px-5 py-5 text-center">
                      <GhostMascot className="h-16 w-16 sm:h-20 sm:w-20" mood="happy" showSignals />
                      <p className="mt-3 font-[var(--font-display)] text-base font-bold text-ink">
                        {macro.showcase.appVideoPlaceholderTitle}
                      </p>
                      <p className="mt-2 max-w-md rounded-lg bg-paper-warm px-3 py-1.5 font-[var(--font-mono)] text-[11px] leading-relaxed text-ink-soft">
                        {macro.showcase.appVideoPlaceholderHint}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Screen: Nintendo Switch Gameplay */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between gap-2 border-b border-ink/10 bg-paper-warm/70 px-4 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Gamepad2 className="h-4 w-4 shrink-0 text-ghost-sky-deep" aria-hidden="true" />
                    <span className="truncate font-[var(--font-display)] text-xs font-bold text-ink sm:text-sm">
                      {macro.showcase.switchScreenLabel}
                    </span>
                  </div>
                  <span className="hidden truncate text-[11px] text-ink-muted sm:inline">
                    {macro.showcase.switchVideoCaption}
                  </span>
                </div>

                <div
                  className={`aspect-video w-full ${
                    macro.showcase.switchVideoReady ? "bg-[#0B1220]" : "bg-paper-card"
                  }`}
                >
                  {macro.showcase.switchVideoReady ? (
                    <video
                      ref={switchVideoRef}
                      src={macro.showcase.switchVideoSrc}
                      playsInline
                      muted
                      preload="metadata"
                      onLoadedMetadata={handleDualMetadata}
                      className="h-full w-full bg-[#0B1220] object-contain"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center px-5 py-5 text-center">
                      <GhostMascot className="h-16 w-16 sm:h-20 sm:w-20" mood="focused" />
                      <p className="mt-3 font-[var(--font-display)] text-base font-bold text-ink">
                        {macro.showcase.switchVideoPlaceholderTitle}
                      </p>
                      <p className="mt-2 max-w-md rounded-lg bg-paper-warm px-3 py-1.5 font-[var(--font-mono)] text-[11px] leading-relaxed text-ink-soft">
                        {macro.showcase.switchVideoPlaceholderHint}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Unified Synced Transport Bar */}
            <div className="border-t-2 border-ink/15 bg-paper-warm/80 px-4 py-3.5 sm:px-5">
              <div className="flex flex-wrap items-center gap-3">
                {/* Play / Pause & Restart */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={!bothVideosReady}
                    onClick={handleToggleDualPlay}
                    aria-label={
                      isDualPlaying
                        ? macro.showcase.pauseSyncAriaLabel
                        : macro.showcase.playSyncAriaLabel
                    }
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border-2 transition-[background-color,border-color,color,transform] duration-150 ease-out ${
                      bothVideosReady
                        ? "cursor-pointer border-ink bg-marker-yellow text-ink hover:bg-marker-yellow/80 active:scale-[0.96]"
                        : "cursor-not-allowed border-ink/20 bg-paper-card/70 text-ink-muted/60"
                    }`}
                  >
                    {isDualPlaying ? (
                      <Pause className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Play className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={!bothVideosReady}
                    onClick={handleDualRestart}
                    aria-label={macro.showcase.restartSyncAriaLabel}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border-2 transition-[background-color,border-color,color,transform] duration-150 ease-out ${
                      bothVideosReady
                        ? "cursor-pointer border-ink/25 bg-paper-card text-ink hover:border-ink hover:bg-ghost-sky-pale active:scale-[0.96]"
                        : "cursor-not-allowed border-ink/15 bg-paper-card/60 text-ink-muted/55"
                    }`}
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                {/* Shared Progress Scrubber */}
                <div className="flex min-w-[160px] flex-1 items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={dualDuration > 0 ? dualDuration : 100}
                    step={0.05}
                    value={bothVideosReady ? dualCurrentTime : 0}
                    disabled={!bothVideosReady}
                    onChange={(e) => handleDualSeek(Number(e.target.value))}
                    aria-label={macro.showcase.scrubberAriaLabel}
                    className="h-2 w-full accent-ghost-sky-deep disabled:cursor-not-allowed disabled:opacity-45"
                  />
                  <span className="shrink-0 font-[var(--font-mono)] text-xs font-semibold text-ink-soft tabular-nums">
                    {formatClock(dualCurrentTime)} / {formatClock(dualDuration)}
                  </span>
                </div>

                {/* Shared Speed Selector (0.5x / 1x / 1.5x / 2x) */}
                <div
                  role="group"
                  aria-label={macro.showcase.speedGroupAriaLabel}
                  className="inline-flex items-center gap-1 rounded-xl border border-ink/15 bg-paper-card/85 p-1"
                >
                  {SPEED_OPTIONS.map((opt) => {
                    const selected = dualSpeed === opt;
                    const label = opt === 1 ? "1x" : opt === 2 ? "2x" : `${opt}x`;
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={!bothVideosReady}
                        aria-pressed={selected}
                        onClick={() => handleDualSpeedChange(opt)}
                        className={`rounded-lg px-2 py-1 font-[var(--font-mono)] text-xs font-bold tabular-nums transition-[background-color,color,transform] duration-150 ease-out ${
                          bothVideosReady
                            ? selected
                              ? "cursor-pointer bg-ghost-sky-pale text-ink active:scale-[0.96]"
                              : "cursor-pointer text-ink-muted hover:text-ink active:scale-[0.96]"
                            : selected
                              ? "cursor-not-allowed bg-paper-warm text-ink-muted"
                              : "cursor-not-allowed text-ink-muted/55"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {!bothVideosReady && (
                <p className="mt-2.5 text-xs font-medium text-ink-muted">
                  {macro.showcase.syncStandbyHint}
                </p>
              )}
            </div>
          </div>

          {/* Integrated JSON Script Download Bar */}
          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-ink/15 bg-paper-card/85 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-relaxed text-ink-soft sm:text-sm">
              {macro.showcase.scriptHint}
            </p>

            <div className="shrink-0">
              {macro.showcase.scriptReady ? (
                <a
                  href={macro.showcase.scriptSrc}
                  download
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-ink bg-ghost-sky px-5 py-2.5 text-sm font-bold text-ink transition-[background-color,transform] duration-150 ease-out hover:bg-ghost-sky/85 active:scale-[0.96]"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  {macro.showcase.scriptReadyLabel}
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border-2 border-dashed border-ink/30 bg-paper-warm/70 px-5 py-2.5 text-sm font-semibold text-ink-muted"
                >
                  <FileJson className="h-4 w-4" aria-hidden="true" />
                  {macro.showcase.scriptPlaceholderLabel}
                </button>
              )}
            </div>
          </div>
        </SketchCard>
      </div>
    </section>
  );
}

export default MacroStudioSection;
