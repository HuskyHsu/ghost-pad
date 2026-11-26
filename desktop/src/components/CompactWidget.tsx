import React, { useCallback, useEffect, useRef, useState } from "react";
import { ControllerState, GamepadInfo } from "../types";
import { MacroPlaybackConfig, MacroPlayerStatus, MacroScript } from "../types/macro";
import { usePulsedButtonPress } from "../hooks/usePulsedButtonPress";
import { useStickDrag } from "../hooks/useStickDrag";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useTranslation } from "react-i18next";
import {
  Play,
  Pause,
  Square,
  Repeat,
  CircleDot,
  FileCode2,
  ChevronDown,
} from "lucide-react";

interface Props {
  state: ControllerState;
  gamepads: GamepadInfo[];
  isMuted: boolean;
  onToggleMute: () => void;
  fps: number;
  esp32Connected?: boolean;
  onToggleEsp32?: () => void;
  onTriggerButton?: (button: string, pressed: boolean) => void;
  onTriggerStick?: (stick: "left" | "right", x: number, y: number) => void;
  // Recording Props
  recordingPhase?: "idle" | "countdown" | "recording";
  recordingElapsedMs?: number;
  recordedActionsCount?: number;
  onStartRecord?: () => void;
  onStopRecord?: () => void;
  // Quick Macro Player Props
  macros?: MacroScript[];
  selectedMacroId?: string | null;
  onSelectMacro?: (id: string) => void;
  macroPlayerStatus?: MacroPlayerStatus;
  macroPlayerConfig?: MacroPlaybackConfig;
  onChangeMacroPlayerConfig?: (updates: Partial<MacroPlaybackConfig>) => void;
  onPlayMacro?: (script: MacroScript, startOffsetMs?: number) => void;
  onPauseMacro?: () => void;
  onAutoPauseMacro?: () => void;
  onResumeMacro?: () => void;
  onStopMacro?: () => void;
  isAutoPaused?: boolean;
}

const CHASSIS_BASE_W = 420;
const CHASSIS_BASE_H = 216;

export const CompactWidget: React.FC<Props> = ({
  state,
  gamepads,
  isMuted,
  onToggleMute,
  fps,
  esp32Connected = false,
  onToggleEsp32,
  onTriggerButton,
  onTriggerStick,
  recordingPhase = "idle",
  recordingElapsedMs = 0,
  recordedActionsCount = 0,
  onStartRecord,
  onStopRecord,
  macros,
  selectedMacroId,
  onSelectMacro,
  macroPlayerStatus,
  macroPlayerConfig,
  onChangeMacroPlayerConfig,
  onPlayMacro,
  onPauseMacro,
  onAutoPauseMacro,
  onResumeMacro,
  onStopMacro,
  isAutoPaused = false,
}) => {
  const { t } = useTranslation(["dashboard", "macro"]);
  const activeGamepad = gamepads.find((g) => g.is_active);
  const isGhostAwake = Boolean(esp32Connected && !isMuted);

  const activeMacroScript =
    macros && macros.length > 0
      ? (macroPlayerStatus?.isPlaying && macroPlayerStatus.currentScriptId
          ? macros.find((m) => m.id === macroPlayerStatus.currentScriptId)
          : undefined) ||
        macros.find((m) => m.id === selectedMacroId) ||
        macros[0]
      : null;

  const isAnyMacroPlaying = Boolean(macroPlayerStatus?.isPlaying);
  const isThisMacroPlaying = Boolean(
    macroPlayerStatus?.isPlaying &&
      activeMacroScript &&
      macroPlayerStatus.currentScriptId === activeMacroScript.id
  );
  const isThisMacroPaused = Boolean(isThisMacroPlaying && macroPlayerStatus?.isPaused);
  const displayedProgressPercent = isThisMacroPlaying ? macroPlayerStatus?.progressPercent ?? 0 : 0;

  // Responsive stage scaling so the controller chassis never clips at any compact window size
  const stageContainerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);
  scaleRef.current = scale;

  useEffect(() => {
    const el = stageContainerRef.current;
    if (!el) return;

    const updateScale = () => {
      const rect = el.getBoundingClientRect();
      const availW = rect.width - 12;
      const availH = rect.height - 8;
      if (availW <= 0 || availH <= 0) return;

      const scaleW = availW / CHASSIS_BASE_W;
      const scaleH = availH / CHASSIS_BASE_H;
      const computed = Math.min(1.2, Math.min(scaleW, scaleH));
      setScale(Math.max(0.35, Number(computed.toFixed(3))));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleManualTakeoverPause = useCallback(() => {
    if (macroPlayerStatus?.isPlaying && !macroPlayerStatus?.isPaused) {
      if (onAutoPauseMacro) {
        onAutoPauseMacro();
      } else {
        onPauseMacro?.();
      }
    }
  }, [macroPlayerStatus?.isPlaying, macroPlayerStatus?.isPaused, onAutoPauseMacro, onPauseMacro]);

  const handleManualButton = useCallback(
    (button: string, pressed: boolean) => {
      if (pressed) handleManualTakeoverPause();
      onTriggerButton?.(button, pressed);
    },
    [handleManualTakeoverPause, onTriggerButton]
  );

  const handleManualStick = useCallback(
    (stick: "left" | "right", x: number, y: number) => {
      if (x !== 128 || y !== 128) handleManualTakeoverPause();
      onTriggerStick?.(stick, x, y);
    },
    [handleManualTakeoverPause, onTriggerStick]
  );

  const STICK_MAX_TRAVEL = 14; // Travel radius in px for compact mode

  // Reusable button pulse holding & binding
  const { handleButtonPress, bindButton } = usePulsedButtonPress({
    minHoldMs: 140,
    onTriggerButton: handleManualButton,
  });

  // Reusable analog stick drag tracking & IPC throttling (scale-aware)
  const {
    leftStickBaseRef,
    rightStickBaseRef,
    leftKnobRef,
    rightKnobRef,
    isDraggingLeft,
    isDraggingRight,
    setIsDraggingLeft,
    setIsDraggingRight,
    startStickDrag,
  } = useStickDrag({
    stickMaxTravel: STICK_MAX_TRAVEL,
    tapThreshold: 5,
    getScale: () => scaleRef.current,
    onTriggerStick: handleManualStick,
    onButtonPress: handleButtonPress,
  });

  // Scaled stick offsets for compact view (-11px .. +11px)
  const lxOffset = ((state.left_stick_x - 128) / 128) * 11;
  const lyOffset = -((state.left_stick_y - 128) / 128) * 11;
  const rxOffset = ((state.right_stick_x - 128) / 128) * 11;
  const ryOffset = -((state.right_stick_y - 128) / 128) * 11;

  // D-Pad helpers: robust against number (0..8) and string ("Up", "Down", etc.)
  const dpadVal =
    typeof state.dpad === "number"
      ? state.dpad
      : (() => {
          switch (String(state.dpad).toLowerCase()) {
            case "up":
              return 0;
            case "upright":
              return 1;
            case "right":
              return 2;
            case "downright":
              return 3;
            case "down":
              return 4;
            case "downleft":
              return 5;
            case "left":
              return 6;
            case "upleft":
              return 7;
            default:
              return 8;
          }
        })();
  const isUp = [0, 1, 7].includes(dpadVal);
  const isRight = [1, 2, 3].includes(dpadVal);
  const isDown = [3, 4, 5].includes(dpadVal);
  const isLeft = [5, 6, 7].includes(dpadVal);

  const isAnyButtonPressed = Boolean(
    state.a ||
      state.b ||
      state.x ||
      state.y ||
      state.l ||
      state.r ||
      state.zl ||
      state.zr ||
      state.minus ||
      state.plus ||
      state.home ||
      state.capture ||
      state.l_stick_click ||
      state.r_stick_click ||
      dpadVal !== 8
  );

  const handleCycleLoopMode = () => {
    if (!macroPlayerConfig || !onChangeMacroPlayerConfig) return;
    const nextMode =
      macroPlayerConfig.loopMode === "once"
        ? "count"
        : macroPlayerConfig.loopMode === "count"
        ? "infinite"
        : "once";
    onChangeMacroPlayerConfig({ loopMode: nextMode });
  };

  const loopButtonLabel = (() => {
    if (!macroPlayerConfig) return "1x";
    if (isThisMacroPlaying && macroPlayerStatus) {
      if (macroPlayerConfig.loopMode === "infinite") {
        return `${macroPlayerStatus.currentLoop}/∞`;
      }
      const total = macroPlayerConfig.loopMode === "count" ? macroPlayerConfig.loopCount : 1;
      return `${macroPlayerStatus.currentLoop}/${total}`;
    }
    if (macroPlayerConfig.loopMode === "infinite") return "∞";
    if (macroPlayerConfig.loopMode === "count") return `${macroPlayerConfig.loopCount}x`;
    return "1x";
  })();

  const hasMacroBar = Boolean(
    macros &&
      macroPlayerStatus &&
      macroPlayerConfig &&
      onPlayMacro &&
      onPauseMacro &&
      onResumeMacro &&
      onStopMacro
  );

  return (
    <div className="flex flex-col h-screen w-screen bg-window-base text-text-primary select-none overflow-hidden">
      {/* 1. Top HUD Status Header */}
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 border-b border-border-subtle bg-surface-card/85 backdrop-blur-sm text-xs shrink-0 z-20">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              activeGamepad && !isMuted ? "bg-emerald-500" : "bg-border-element"
            }`}
          />
          <span className="font-medium text-[11px] text-text-primary truncate">
            {isMuted
              ? t("compact.paused", "已暫停")
              : activeGamepad?.name || t("compact.waiting", "等待連線")}
          </span>
          <span className="hidden min-[480px]:inline text-[10px] font-mono text-text-muted shrink-0">
            {fps}Hz
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Quick Record / Stop Recording */}
          {onStartRecord && onStopRecord && (
            recordingPhase === "recording" ? (
              <button
                type="button"
                onClick={onStopRecord}
                className="h-6 px-2 rounded-md text-[10px] font-mono font-medium bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-600 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                title={t("live_controls.rec_tooltip_stop")}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                <span>{(recordingElapsedMs / 1000).toFixed(1)}s</span>
                <span className="hidden min-[440px]:inline">({recordedActionsCount})</span>
                <Square className="w-2.5 h-2.5 fill-rose-500 shrink-0" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onStartRecord}
                disabled={recordingPhase === "countdown" || isAnyMacroPlaying}
                className="h-6 px-2 rounded-md text-[10px] font-medium bg-surface-card hover:bg-interactive-hover border border-border-element text-rose-600 hover:text-rose-700 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                title={t("live_controls.rec_tooltip_start")}
              >
                <CircleDot className="w-3 h-3 text-rose-500 shrink-0" />
                <span className="hidden min-[460px]:inline whitespace-nowrap">
                  {t("live_controls.record_macro", "側錄")}
                </span>
              </button>
            )
          )}

          {/* Mute / Active Toggle */}
          <button
            type="button"
            onClick={onToggleMute}
            className={`h-6 px-2 rounded-md text-[10px] font-mono font-medium border transition-colors flex items-center gap-1 cursor-pointer shrink-0 ${
              isMuted
                ? "bg-amber-50 border-amber-300 text-amber-800"
                : "bg-emerald-50 border-emerald-300 text-emerald-800"
            }`}
          >
            {isMuted ? t("compact.paused", "已暫停") : t("compact.running", "已啟用")}
          </button>

          <LanguageSwitcher />
        </div>
      </div>

      {/* 2. Responsive Scaled Handheld Controller Stage */}
      <div
        ref={stageContainerRef}
        className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden px-1.5 py-1 relative"
      >
        <div
          style={{
            width: CHASSIS_BASE_W,
            height: CHASSIS_BASE_H,
            transform: `scale(${scale})`,
            transformOrigin: "center center",
          }}
          className="bg-surface-card border border-border-subtle rounded-xl px-3 py-2.5 shadow-md relative flex flex-col justify-between shrink-0 transition-transform duration-75 ease-out shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8)]"
        >
          {/* Top Edge: Shoulder Buttons (ZL, L, R, ZR) + Brand / ESP32 Pill */}
          <div className="flex items-center justify-between gap-2 border-b border-border-subtle pb-1.5 shrink-0">
            {/* Left Shoulder / Triggers */}
            <div className="flex items-center gap-1.5">
              <button
                {...bindButton("zl")}
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wider border transition-all cursor-pointer select-none active:scale-95 ${
                  state.zl
                    ? "bg-accent text-accent-foreground border-border-focus shadow-xs scale-95"
                    : "bg-surface-input text-text-primary border-border-subtle hover:border-border-element hover:bg-interactive-hover shadow-xs"
                }`}
                title={t("buttons.zl", "ZL 板機鍵")}
              >
                ZL
              </button>
              <button
                {...bindButton("l")}
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wider border transition-all cursor-pointer select-none active:scale-95 ${
                  state.l
                    ? "bg-accent text-accent-foreground border-border-focus shadow-xs scale-95"
                    : "bg-surface-input text-text-primary border-border-subtle hover:border-border-element hover:bg-interactive-hover shadow-xs"
                }`}
                title={t("buttons.l", "L 肩鍵")}
              >
                L
              </button>
            </div>

            {/* Center Brand / ESP32 Status Badge */}
            <button
              type="button"
              onClick={onToggleEsp32}
              disabled={!onToggleEsp32}
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[9px] font-mono tracking-widest select-none transition-colors ${
                onToggleEsp32 ? "cursor-pointer active:scale-95" : "pointer-events-none"
              } ${
                esp32Connected
                  ? "bg-sky-50 border-sky-300 text-sky-900 hover:bg-sky-100"
                  : "bg-surface-input border-border-subtle text-text-muted hover:bg-interactive-hover"
              }`}
              title={
                esp32Connected
                  ? t("live_controls.esp32_active_stop", "ESP32 已連線 (點擊斷開並釋放 1P)")
                  : t("live_controls.esp32_idle_start", "ESP32 已斷開 (點擊開啟連線)")
              }
            >
              <span
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  isAnyButtonPressed
                    ? "bg-emerald-500"
                    : esp32Connected
                    ? "bg-sky-500"
                    : "bg-border-element"
                }`}
              />
              <span>GHOST-PAD</span>
            </button>

            {/* Right Shoulder / Triggers */}
            <div className="flex items-center gap-1.5">
              <button
                {...bindButton("r")}
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wider border transition-all cursor-pointer select-none active:scale-95 ${
                  state.r
                    ? "bg-accent text-accent-foreground border-border-focus shadow-xs scale-95"
                    : "bg-surface-input text-text-primary border-border-subtle hover:border-border-element hover:bg-interactive-hover shadow-xs"
                }`}
                title={t("buttons.r", "R 肩鍵")}
              >
                R
              </button>
              <button
                {...bindButton("zr")}
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wider border transition-all cursor-pointer select-none active:scale-95 ${
                  state.zr
                    ? "bg-accent text-accent-foreground border-border-focus shadow-xs scale-95"
                    : "bg-surface-input text-text-primary border-border-subtle hover:border-border-element hover:bg-interactive-hover shadow-xs"
                }`}
                title={t("buttons.zr", "ZR 板機鍵")}
              >
                ZR
              </button>
            </div>
          </div>

          {/* Main Controls Grid */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 flex-1 py-1">
            {/* Left Flank */}
            <div className="flex flex-col items-center justify-between gap-2 h-full">
              {/* Left Thumbstick (L3) */}
              <div
                ref={leftStickBaseRef}
                onPointerDown={(e) =>
                  startStickDrag("left", leftStickBaseRef, leftKnobRef, setIsDraggingLeft, e)
                }
                className={`relative w-16 h-16 rounded-full bg-surface-input border transition-all duration-150 select-none shadow-[inset_0_1px_3px_rgba(15,23,42,0.08)] flex items-center justify-center touch-none cursor-grab active:cursor-grabbing pointer-events-auto ${
                  isDraggingLeft
                    ? "border-border-focus ring-1 ring-border-focus/20"
                    : "border-border-element hover:border-border-focus"
                }`}
                title={t("buttons.l_stick", "左類比搖桿")}
              >
                <span className="absolute top-0.5 text-[6px] font-mono text-text-muted select-none pointer-events-none">▲</span>
                <span className="absolute bottom-0.5 text-[6px] font-mono text-text-muted select-none pointer-events-none">▼</span>
                <span className="absolute left-1 text-[6px] font-mono text-text-muted select-none pointer-events-none">◀</span>
                <span className="absolute right-1 text-[6px] font-mono text-text-muted select-none pointer-events-none">▶</span>

                <div
                  ref={leftKnobRef}
                  className={`w-10 h-10 rounded-full border flex items-center justify-center text-[10px] font-mono font-bold select-none shadow-sm pointer-events-none ${
                    isDraggingLeft ? "transition-none" : "transition-transform duration-100 ease-out"
                  } ${
                    state.l_stick_click
                      ? "bg-accent text-accent-foreground border-border-focus scale-95 shadow-xs"
                      : isDraggingLeft || state.left_stick_x !== 128 || state.left_stick_y !== 128
                      ? "bg-surface-card text-text-primary border-border-focus shadow-xs"
                      : "bg-surface-card text-text-primary border-border-subtle shadow-xs"
                  }`}
                  style={
                    isDraggingLeft
                      ? undefined
                      : { transform: `translate3d(${lxOffset}px, ${lyOffset}px, 0)` }
                  }
                >
                  L3
                </div>
              </div>

              {/* D-Pad */}
              <div className="relative w-[72px] h-[72px] flex items-center justify-center select-none pointer-events-auto">
                <div className="absolute w-6 h-[72px] bg-surface-input border border-border-element rounded-md shadow-xs pointer-events-none" />
                <div className="absolute w-[72px] h-6 bg-surface-input border border-border-element rounded-md shadow-xs pointer-events-none" />
                <button
                  {...bindButton("dpad_up")}
                  className={`absolute top-0 w-6 h-6 rounded-t-md flex items-center justify-center text-[10px] font-bold transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    isUp
                      ? "bg-accent text-accent-foreground"
                      : "text-text-secondary hover:text-text-primary hover:bg-interactive-hover"
                  }`}
                  title={t("buttons.dpad_up", "十字鍵 上")}
                >
                  ▲
                </button>
                <button
                  {...bindButton("dpad_down")}
                  className={`absolute bottom-0 w-6 h-6 rounded-b-md flex items-center justify-center text-[10px] font-bold transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    isDown
                      ? "bg-accent text-accent-foreground"
                      : "text-text-secondary hover:text-text-primary hover:bg-interactive-hover"
                  }`}
                  title={t("buttons.dpad_down", "十字鍵 下")}
                >
                  ▼
                </button>
                <button
                  {...bindButton("dpad_left")}
                  className={`absolute left-0 w-6 h-6 rounded-l-md flex items-center justify-center text-[10px] font-bold transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    isLeft
                      ? "bg-accent text-accent-foreground"
                      : "text-text-secondary hover:text-text-primary hover:bg-interactive-hover"
                  }`}
                  title={t("buttons.dpad_left", "十字鍵 左")}
                >
                  ◀
                </button>
                <button
                  {...bindButton("dpad_right")}
                  className={`absolute right-0 w-6 h-6 rounded-r-md flex items-center justify-center text-[10px] font-bold transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    isRight
                      ? "bg-accent text-accent-foreground"
                      : "text-text-secondary hover:text-text-primary hover:bg-interactive-hover"
                  }`}
                  title={t("buttons.dpad_right", "十字鍵 右")}
                >
                  ▶
                </button>
                <div className="w-3 h-3 rounded-full bg-surface-card border border-border-subtle z-10 pointer-events-none" />
              </div>
            </div>

            {/* Center Column: System controls */}
            <div className="flex flex-col items-center justify-between h-full py-1 gap-2">
              {/* Minus & Plus */}
              <div className="flex items-center gap-4">
                <button
                  {...bindButton("minus")}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-colors cursor-pointer select-none active:scale-95 ${
                    state.minus
                      ? "bg-accent text-accent-foreground border-border-focus shadow-xs"
                      : "bg-surface-input text-text-primary border-border-subtle hover:border-border-element hover:bg-interactive-hover shadow-xs"
                  }`}
                  title={t("buttons.minus", "Minus 按鍵 (減號)")}
                >
                  −
                </button>
                <button
                  {...bindButton("plus")}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-colors cursor-pointer select-none active:scale-95 ${
                    state.plus
                      ? "bg-accent text-accent-foreground border-border-focus shadow-xs"
                      : "bg-surface-input text-text-primary border-border-subtle hover:border-border-element hover:bg-interactive-hover shadow-xs"
                  }`}
                  title={t("buttons.plus", "Plus 按鍵 (加號)")}
                >
                  +
                </button>
              </div>

              {/* Minimalist Expression Screen */}
              <div className="w-12 h-8 rounded-lg bg-surface-input border border-border-subtle flex items-center justify-center p-1 select-none">
                <svg
                  viewBox="0 0 70 30"
                  className="w-full h-full"
                  data-awake={isGhostAwake ? "true" : "false"}
                >
                  {!isGhostAwake ? (
                    <>
                      <path
                        d="M 17, 13 Q 22, 16.5 27, 13"
                        fill="none"
                        stroke="#033157"
                        strokeOpacity="0.72"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M 43, 13 Q 48, 16.5 53, 13"
                        fill="none"
                        stroke="#033157"
                        strokeOpacity="0.72"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M 30, 20 Q 35, 18.5 40, 20"
                        fill="none"
                        stroke="#033157"
                        strokeOpacity="0.72"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </>
                  ) : (
                    <>
                      <circle cx="22" cy="12" r="2.8" fill="#033157" />
                      <circle cx="48" cy="12" r="2.8" fill="#033157" />
                      {isAnyButtonPressed ? (
                        <path
                          d="M 28, 18 Q 32, 22 35, 18 Q 38, 22 42, 18"
                          fill="none"
                          stroke="#033157"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      ) : (
                        <path
                          d="M 28, 17 Q 35, 22 42, 17"
                          fill="none"
                          stroke="#033157"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      )}
                    </>
                  )}
                </svg>
              </div>

              {/* Capture & Home */}
              <div className="flex items-center gap-4">
                <button
                  {...bindButton("capture")}
                  className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold border transition-colors cursor-pointer select-none active:scale-95 ${
                    state.capture
                      ? "bg-accent text-accent-foreground border-border-focus shadow-xs"
                      : "bg-surface-input text-text-primary border-border-subtle hover:border-border-element hover:bg-interactive-hover shadow-xs"
                  }`}
                  title={t("buttons.capture", "Capture 按鍵")}
                >
                  ◉
                </button>
                <button
                  {...bindButton("home")}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold border transition-colors cursor-pointer select-none active:scale-95 ${
                    state.home
                      ? "bg-accent text-accent-foreground border-border-focus shadow-xs"
                      : "bg-surface-input text-text-primary border-border-subtle hover:border-border-element hover:bg-interactive-hover shadow-xs"
                  }`}
                  title={t("buttons.home", "Home 按鍵")}
                >
                  ⌂
                </button>
              </div>
            </div>

            {/* Right Flank */}
            <div className="flex flex-col items-center justify-between gap-2 h-full">
              {/* ABXY Diamond */}
              <div className="relative w-[72px] h-[72px] flex items-center justify-center select-none pointer-events-auto">
                <button
                  {...bindButton("x")}
                  className={`absolute top-0 w-6 h-6 rounded-full border flex items-center justify-center text-[11px] font-bold transition-colors cursor-pointer select-none active:scale-95 ${
                    state.x
                      ? "bg-accent text-accent-foreground border-border-focus shadow-xs scale-95"
                      : "bg-surface-input text-text-primary border-border-subtle hover:border-border-element hover:bg-interactive-hover shadow-xs"
                  }`}
                >
                  X
                </button>
                <button
                  {...bindButton("b")}
                  className={`absolute bottom-0 w-6 h-6 rounded-full border flex items-center justify-center text-[11px] font-bold transition-colors cursor-pointer select-none active:scale-95 ${
                    state.b
                      ? "bg-accent text-accent-foreground border-border-focus shadow-xs scale-95"
                      : "bg-surface-input text-text-primary border-border-subtle hover:border-border-element hover:bg-interactive-hover shadow-xs"
                  }`}
                >
                  B
                </button>
                <button
                  {...bindButton("y")}
                  className={`absolute left-0 w-6 h-6 rounded-full border flex items-center justify-center text-[11px] font-bold transition-colors cursor-pointer select-none active:scale-95 ${
                    state.y
                      ? "bg-accent text-accent-foreground border-border-focus shadow-xs scale-95"
                      : "bg-surface-input text-text-primary border-border-subtle hover:border-border-element hover:bg-interactive-hover shadow-xs"
                  }`}
                >
                  Y
                </button>
                <button
                  {...bindButton("a")}
                  className={`absolute right-0 w-6 h-6 rounded-full border flex items-center justify-center text-[11px] font-bold transition-colors cursor-pointer select-none active:scale-95 ${
                    state.a
                      ? "bg-accent text-accent-foreground border-border-focus shadow-xs scale-95"
                      : "bg-surface-input text-text-primary border-border-subtle hover:border-border-element hover:bg-interactive-hover shadow-xs"
                  }`}
                >
                  A
                </button>
              </div>

              {/* Right Thumbstick (R3) */}
              <div
                ref={rightStickBaseRef}
                onPointerDown={(e) =>
                  startStickDrag("right", rightStickBaseRef, rightKnobRef, setIsDraggingRight, e)
                }
                className={`relative w-16 h-16 rounded-full bg-surface-input border transition-all duration-150 select-none shadow-[inset_0_1px_3px_rgba(15,23,42,0.08)] flex items-center justify-center touch-none cursor-grab active:cursor-grabbing pointer-events-auto ${
                  isDraggingRight
                    ? "border-border-focus ring-1 ring-border-focus/20"
                    : "border-border-element hover:border-border-focus"
                }`}
                title={t("buttons.r_stick", "右類比搖桿")}
              >
                <span className="absolute top-0.5 text-[6px] font-mono text-text-muted select-none pointer-events-none">▲</span>
                <span className="absolute bottom-0.5 text-[6px] font-mono text-text-muted select-none pointer-events-none">▼</span>
                <span className="absolute left-1 text-[6px] font-mono text-text-muted select-none pointer-events-none">◀</span>
                <span className="absolute right-1 text-[6px] font-mono text-text-muted select-none pointer-events-none">▶</span>

                <div
                  ref={rightKnobRef}
                  className={`w-10 h-10 rounded-full border flex items-center justify-center text-[10px] font-mono font-bold select-none shadow-sm pointer-events-none ${
                    isDraggingRight ? "transition-none" : "transition-transform duration-100 ease-out"
                  } ${
                    state.r_stick_click
                      ? "bg-accent text-accent-foreground border-border-focus scale-95 shadow-xs"
                      : isDraggingRight || state.right_stick_x !== 128 || state.right_stick_y !== 128
                      ? "bg-surface-card text-text-primary border-border-focus shadow-xs"
                      : "bg-surface-card text-text-primary border-border-subtle shadow-xs"
                  }`}
                  style={
                    isDraggingRight
                      ? undefined
                      : { transform: `translate3d(${rxOffset}px, ${ryOffset}px, 0)` }
                  }
                >
                  R3
                </div>
              </div>
            </div>
          </div>

          {/* Subtle Stick Telemetry Corners */}
          <div className="pointer-events-none absolute bottom-1 left-2.5 right-2.5 flex items-center justify-between text-[8px] font-mono text-text-muted/75 tabular-nums">
            <span>L:{state.left_stick_x},{state.left_stick_y}</span>
            <span>R:{state.right_stick_x},{state.right_stick_y}</span>
          </div>
        </div>
      </div>

      {/* 3. Bottom Compact Macro Player Bar */}
      {hasMacroBar ? (
        <div className="shrink-0 bg-surface-card/95 border-t border-border-subtle backdrop-blur-md relative">
          {/* Ultra-slim Top Progress Strip */}
          <div className="w-full h-[3px] bg-surface-input overflow-hidden">
            <div
              className={`h-full transition-all duration-100 ease-out ${
                isThisMacroPaused
                  ? "bg-amber-500"
                  : isThisMacroPlaying
                  ? "bg-emerald-500"
                  : "bg-transparent"
              }`}
              style={{ width: `${displayedProgressPercent}%` }}
            />
          </div>

          <div className="px-2.5 py-1.5 flex items-center justify-between gap-1.5">
            {macros && macros.length > 0 && activeMacroScript ? (
              <>
                {/* Script Selector */}
                <div
                  className={`relative h-7 flex-1 min-w-0 max-w-[220px] rounded-md bg-surface-input border border-border-element flex items-center transition-colors ${
                    isAnyMacroPlaying ? "opacity-60" : "hover:bg-interactive-hover/60"
                  }`}
                >
                  <FileCode2 className="w-3 h-3 text-text-muted shrink-0 pointer-events-none absolute left-2" />
                  <select
                    aria-label={t("macro:player.select_macro", "選擇巨集腳本")}
                    value={activeMacroScript.id}
                    disabled={isAnyMacroPlaying}
                    onChange={(e) => onSelectMacro?.(e.target.value)}
                    className="appearance-none w-full h-full pl-6 pr-5 bg-transparent border-0 text-[11px] font-medium text-text-primary focus:outline-none cursor-pointer disabled:cursor-not-allowed truncate"
                  >
                    {macros.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-text-muted shrink-0 pointer-events-none absolute right-1.5" />
                </div>

                {/* Playback Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {!isThisMacroPlaying ? (
                    <button
                      type="button"
                      disabled={recordingPhase !== "idle" || activeMacroScript.actions.length === 0}
                      onClick={() => onPlayMacro?.(activeMacroScript)}
                      className="h-7 flex items-center gap-1 px-2.5 rounded-md text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
                      title={t("macro:player.play_tooltip", "開始播放腳本")}
                    >
                      <Play className="w-3 h-3 fill-current shrink-0" />
                      <span>{t("macro:player.play", "播放")}</span>
                    </button>
                  ) : isThisMacroPaused ? (
                    <button
                      type="button"
                      onClick={onResumeMacro}
                      className={`h-7 flex items-center gap-1 px-2.5 rounded-md text-[11px] font-semibold text-white shadow-xs transition-colors cursor-pointer active:scale-95 shrink-0 whitespace-nowrap ${
                        isAutoPaused
                          ? "bg-amber-600 hover:bg-amber-700"
                          : "bg-emerald-600 hover:bg-emerald-700"
                      }`}
                      title={
                        isAutoPaused
                          ? t("macro:player.auto_paused_title", "已自動暫停巨集")
                          : t("macro:player.resume_tooltip", "繼續播放")
                      }
                    >
                      <Play className="w-3 h-3 fill-current shrink-0" />
                      <span>{t("macro:player.resume", "繼續")}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onPauseMacro}
                      className="h-7 flex items-center gap-1 px-2.5 rounded-md text-[11px] font-semibold bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 shadow-xs transition-colors cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
                      title={t("macro:player.pause_tooltip", "暫停播放")}
                    >
                      <Pause className="w-3 h-3 shrink-0" />
                      <span>{t("macro:player.pause", "暫停")}</span>
                    </button>
                  )}

                  {/* Stop */}
                  <button
                    type="button"
                    disabled={!isThisMacroPlaying}
                    onClick={onStopMacro}
                    className="h-7 w-7 flex items-center justify-center rounded-md bg-surface-card hover:bg-rose-50 text-text-secondary hover:text-rose-700 border border-border-element hover:border-rose-300 disabled:opacity-35 disabled:cursor-not-allowed shadow-xs transition-colors cursor-pointer active:scale-95 shrink-0"
                    title={t("macro:player.stop_tooltip", "停止播放並重置手把中立 (Esc)")}
                    aria-label={t("macro:player.stop", "停止")}
                  >
                    <Square className="w-3 h-3 fill-current" />
                  </button>

                  {/* Compact Loop Mode Cycle / Live Counter */}
                  <button
                    type="button"
                    onClick={handleCycleLoopMode}
                    className={`h-7 px-2 flex items-center gap-1 rounded-md border text-[10px] font-mono font-semibold transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                      isThisMacroPlaying
                        ? isThisMacroPaused
                          ? "bg-amber-500/10 border-amber-500/40 text-amber-700"
                          : "bg-emerald-500/10 border-emerald-500/40 text-emerald-700"
                        : macroPlayerConfig?.loopMode !== "once"
                        ? "bg-surface-card border-border-focus text-text-primary"
                        : "bg-surface-input border-border-subtle text-text-muted hover:text-text-primary"
                    }`}
                    title={
                      macroPlayerConfig?.loopMode === "infinite"
                        ? t("macro:player.loop_infinite_tooltip", "無限循環 (直到手動按下停止)")
                        : macroPlayerConfig?.loopMode === "count"
                        ? t("macro:player.loop_count_tooltip", "循環指定次數")
                        : t("macro:player.single_play_tooltip", "單次播放")
                    }
                  >
                    <Repeat className="w-3 h-3 shrink-0" />
                    <span className="tabular-nums">{loopButtonLabel}</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="w-full flex items-center justify-between text-[11px] text-text-muted">
                <span className="truncate">{t("compact.no_macros", "尚無巨集腳本")}</span>
                <span className="font-mono text-[10px] shrink-0 tabular-nums">
                  L:{state.left_stick_x},{state.left_stick_y} · R:{state.right_stick_x},{state.right_stick_y}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="px-2.5 py-1 border-t border-border-subtle flex items-center justify-between text-[10px] font-mono text-text-muted shrink-0">
          <span>L: {state.left_stick_x},{state.left_stick_y}</span>
          <span>R: {state.right_stick_x},{state.right_stick_y}</span>
        </div>
      )}
    </div>
  );
};
