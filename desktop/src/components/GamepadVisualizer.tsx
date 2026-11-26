import React, { useState, useRef, useEffect, useCallback } from "react";
import { ControllerState } from "../types";
import { Keyboard, X as CloseIcon, CircleDot, Square, Gamepad2 } from "lucide-react";
import { KEYBOARD_GUIDE } from "../hooks/useVirtualGamepad";
import { usePulsedButtonPress } from "../hooks/usePulsedButtonPress";
import { useStickDrag } from "../hooks/useStickDrag";
import { InputTimelineStream } from "./InputTimelineStream";
import { MacroPlayerBar } from "./MacroStudio/MacroPlayerBar";
import { MacroPlaybackConfig, MacroPlayerStatus, MacroScript } from "../types/macro";
import { useTranslation } from "react-i18next";

interface Props {
  state: ControllerState;
  gamepadName?: string;
  isMuted?: boolean;
  esp32Connected?: boolean;
  switchPairingState?: string;
  fps?: number;
  onTriggerButton?: (button: string, pressed: boolean) => void;
  onTriggerStick?: (stick: "left" | "right", x: number, y: number) => void;
  onToggleMute?: () => void;
  onToggleEsp32?: () => void;
  // Phase 3 Recording Props
  recordingPhase?: "idle" | "countdown" | "recording";
  recordingElapsedMs?: number;
  recordedActionsCount?: number;
  onStartRecord?: () => void;
  onStopRecord?: () => void;
  // Quick Macro Player Props
  macros?: MacroScript[];
  selectedMacroId?: string | null;
  onSelectMacro?: (id: string) => void;
  onEditMacro?: (id: string) => void;
  macroPlayerStatus?: MacroPlayerStatus;
  macroPlayerConfig?: MacroPlaybackConfig;
  onChangeMacroPlayerConfig?: (updates: Partial<MacroPlaybackConfig>) => void;
  onPlayMacro?: (script: MacroScript, startOffsetMs?: number) => void;
  onPauseMacro?: () => void;
  onAutoPauseMacro?: () => void;
  onResumeMacro?: () => void;
  onSeekMacro?: (ms: number) => void;
  onStopMacro?: () => void;
  isAutoPaused?: boolean;
}

export const GamepadVisualizer: React.FC<Props> = ({
  state,
  gamepadName,
  isMuted = false,
  esp32Connected = false,
  onTriggerButton,
  onTriggerStick,
  onToggleMute,
  onToggleEsp32,
  recordingPhase = "idle",
  recordingElapsedMs = 0,
  recordedActionsCount = 0,
  onStartRecord,
  onStopRecord,
  macros,
  selectedMacroId,
  onSelectMacro,
  onEditMacro,
  macroPlayerStatus,
  macroPlayerConfig,
  onChangeMacroPlayerConfig,
  onPlayMacro,
  onPauseMacro,
  onAutoPauseMacro,
  onResumeMacro,
  onSeekMacro,
  onStopMacro,
  isAutoPaused = false,
}) => {
  const activeMacroScript =
    macros && macros.length > 0
      ? (macroPlayerStatus?.isPlaying && macroPlayerStatus.currentScriptId
          ? macros.find((m) => m.id === macroPlayerStatus.currentScriptId)
          : undefined) ||
        macros.find((m) => m.id === selectedMacroId) ||
        macros[0]
      : null;
  // Ghost only wakes up when ESP32 virtual controller service is started AND input forwarding is active
  const isGhostAwake = Boolean(esp32Connected && !isMuted);
  const [showKeyGuide, setShowKeyGuide] = useState(false);
  const [scrubPreviewMs, setScrubPreviewMs] = useState<number | null>(null);
  const { t } = useTranslation(["dashboard", "common"]);

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

  // Responsive stage scaling state
  const stageContainerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);
  scaleRef.current = scale;

  // Auto-scale controller to fit available viewport dimensions gracefully
  useEffect(() => {
    const el = stageContainerRef.current;
    if (!el) return;

    const updateScale = () => {
      const rect = el.getBoundingClientRect();
      const availW = rect.width - 24;
      const availH = rect.height - 16;
      if (availW <= 0 || availH <= 0) return;

      const scaleW = availW / 620;
      const scaleH = availH / 390;
      // Cap scale between 0.65 and 1.15 for crisp visual fidelity
      const computedScale = Math.min(1.15, Math.min(scaleW, scaleH));
      setScale(Math.max(0.65, Math.min(1.15, Number(computedScale.toFixed(2)))));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const STICK_MAX_TRAVEL = 22; // Travel radius in px

  // Reusable button pulse holding & binding (auto-pauses running macro on manual takeover)
  const { handleButtonPress, bindButton } = usePulsedButtonPress({
    minHoldMs: 140,
    onTriggerButton: handleManualButton,
  });

  // Reusable analog stick drag tracking & IPC throttling
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
    tapThreshold: 6,
    getScale: () => scaleRef.current,
    onTriggerStick: handleManualStick,
    onButtonPress: handleButtonPress,
  });

  // Convert 0..255 stick values to offset in pixels (-18px .. +18px)
  const lxOffset = ((state.left_stick_x - 128) / 128) * 18;
  const lyOffset = -((state.left_stick_y - 128) / 128) * 18;
  const rxOffset = ((state.right_stick_x - 128) / 128) * 18;
  const ryOffset = -((state.right_stick_y - 128) / 128) * 18;

  // D-Pad helpers: robust against number (0..8) and string ("Up", "Down", etc.)
  const dpadVal = typeof state.dpad === "number" ? state.dpad : (() => {
    switch (String(state.dpad).toLowerCase()) {
      case "up": return 0;
      case "upright": return 1;
      case "right": return 2;
      case "downright": return 3;
      case "down": return 4;
      case "downleft": return 5;
      case "left": return 6;
      case "upleft": return 7;
      default: return 8;
    }
  })();
  const isUp = [0, 1, 7].includes(dpadVal);
  const isRight = [1, 2, 3].includes(dpadVal);
  const isDown = [3, 4, 5].includes(dpadVal);
  const isLeft = [5, 6, 7].includes(dpadVal);

  // Check if any button is currently pressed for reactive ghost expressions
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

  const isLeftHandActive = Boolean(state.zl || state.l);
  const isRightHandActive = Boolean(state.zr || state.r);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-window-base relative">
      {/* 1. Unified Top Header */}
      <div className="h-16 px-6 border-b border-border-subtle flex items-center justify-between shrink-0 bg-surface-card/80 backdrop-blur-sm z-30 gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-lg bg-surface-card border border-border-element flex items-center justify-center text-text-primary shadow-xs shrink-0">
            <Gamepad2 className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-tight text-text-primary whitespace-nowrap">
                {t("live_controls.title")}
              </h1>
              <span
                className={`px-1.5 py-0.5 rounded font-mono text-[10px] border flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  gamepadName
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    : "bg-surface-card text-text-secondary border-border-element shadow-xs"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${gamepadName ? "bg-emerald-500" : "bg-text-disabled"}`} />
                <span className="truncate">{gamepadName || t("live_controls.local_mode")}</span>
              </span>
            </div>
            <p className="text-xs text-text-secondary truncate hidden sm:block">
              {gamepadName
                ? t("live_controls.gamepad_mixed")
                : t("live_controls.local_mode_desc")}
            </p>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2 text-xs font-mono shrink-0">
          {/* Quick Macro Recording Button */}
          {recordingPhase === "recording" ? (
            <button
              type="button"
              onClick={onStopRecord}
              className="flex items-center gap-2 h-8 px-3 rounded-md bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-600 font-medium text-xs transition-colors cursor-pointer select-none shrink-0 whitespace-nowrap"
              title={t("live_controls.rec_tooltip_stop")}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
              <span className="whitespace-nowrap">
                {t("live_controls.recording")} {(recordingElapsedMs / 1000).toFixed(1)}s ({recordedActionsCount})
              </span>
              <Square className="w-3 h-3 fill-rose-500 ml-0.5 shrink-0" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onStartRecord}
              disabled={recordingPhase === "countdown" || Boolean(macroPlayerStatus?.isPlaying)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-surface-card hover:bg-interactive-hover border border-border-element text-rose-600 hover:text-rose-700 font-medium text-xs transition-colors shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none shrink-0 whitespace-nowrap"
              title={t("live_controls.rec_tooltip_start")}
            >
              <CircleDot className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span className="whitespace-nowrap">{t("live_controls.record_macro")}</span>
            </button>
          )}

          {/* Keyboard Guide Toggle Button */}
          <button
            onClick={() => setShowKeyGuide(!showKeyGuide)}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-surface-card hover:bg-interactive-hover border border-border-element text-text-primary font-medium text-xs transition-colors shadow-xs cursor-pointer shrink-0 whitespace-nowrap"
            title={t("live_controls.help_tooltip")}
          >
            <Keyboard className="w-3.5 h-3.5 text-text-muted shrink-0" />
            <span className="whitespace-nowrap">{t("sidebar.keyboard_title")}</span>
          </button>
        </div>
      </div>

      {/* Keyboard Guide Modal Overlay */}
      {showKeyGuide && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-6 animate-in fade-in duration-150">
          <div className="bg-surface-modal border border-border-element rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-border-subtle flex items-center justify-between">
              <div className="flex items-center gap-2 text-text-primary font-semibold text-xs tracking-tight">
                <Keyboard className="w-4 h-4 text-text-muted" />
                <span>{t("sidebar.keyboard_modal_title", "電腦鍵盤操作對照表")}</span>
              </div>
              <button
                onClick={() => setShowKeyGuide(false)}
                className="p-1 rounded-md hover:bg-interactive-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                title={t("actions.close", { ns: "common", defaultValue: "關閉" })}
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-surface-card border border-border-subtle text-text-secondary text-[11px] leading-relaxed shadow-xs">
                <span className="font-medium text-text-primary">{t("sidebar.note_title", "外接手把非必須")}</span>：{t("sidebar.note_desc", "Ghost-Pad 支援純電腦操作！您可以直接敲擊鍵盤（WASD 類比搖桿、L/K/I/J 確認取消）或直接用滑鼠點擊畫面按鈕與拖曳搖桿，皆能即時驅動 Switch。")}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {KEYBOARD_GUIDE.map((item) => (
                  <div
                    key={item.key}
                    className="px-2.5 py-2 rounded-md bg-surface-input border border-border-subtle flex items-center justify-between gap-2 min-w-0"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-2 py-0.5 rounded font-mono font-medium bg-surface-card text-text-primary border border-border-element text-[11px] shadow-xs whitespace-nowrap shrink-0">
                        {item.key}
                      </span>
                      <span className="text-text-secondary text-[11px] truncate">
                        {t(`guide_keys.${item.id}`, item.label)}
                      </span>
                    </div>
                    <span className="font-mono font-medium text-text-primary text-xs px-1.5 py-0.5 rounded bg-surface-card border border-border-subtle shadow-xs whitespace-nowrap shrink-0">
                      {item.button}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3.5 bg-surface-input/50 border-t border-border-subtle flex justify-end">
              <button
                onClick={() => setShowKeyGuide(false)}
                className="px-3.5 py-1.5 rounded-md bg-accent text-accent-foreground hover:bg-accent-hover text-xs font-medium transition-colors cursor-pointer shadow-xs"
              >
                {t("actions.close", { ns: "common", defaultValue: "關閉" })}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Responsive Dashboard Stage */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-3 flex flex-col justify-between items-center w-full max-w-5xl xl:max-w-6xl mx-auto min-h-0">
        {/* Flexible Controller Showcase Stage (Responsive Scaled, Borderless) */}
        <div
          ref={stageContainerRef}
          className="flex-1 w-full flex items-center justify-center min-h-[240px] overflow-visible py-1 relative select-none"
        >
          {/* Scaled Ghost Canvas */}
          <div
            style={{
              width: 620,
              height: 390,
              transform: `scale(${scale})`,
              transformOrigin: "center center",
            }}
            className="relative select-none flex items-center justify-center shrink-0 transition-transform duration-100 ease-out"
          >
            {/* SVG Cute Ghost Silhouette Styled to Match Ghost-Pad Logo */}
            <svg
              viewBox="0 0 620 390"
              className={`absolute inset-0 w-full h-full pointer-events-none transition-all duration-700 ease-out ${
                isGhostAwake
                  ? "drop-shadow-[0_14px_30px_rgba(125,211,252,0.32)] drop-shadow-[0_12px_24px_rgba(3,49,87,0.10)]"
                  : "drop-shadow-[0_10px_22px_rgba(3,49,87,0.08)]"
              }`}
            >
              <defs>
                {/* Sleeping / Standby Warm Creamy Porcelain Gradient */}
                <linearGradient id="cuteGhostGradTranslucent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FCFBF7" stopOpacity="0.98" />
                  <stop offset="45%" stopColor="#F5F7FA" stopOpacity="0.94" />
                  <stop offset="100%" stopColor="#E8F1F8" stopOpacity="0.9" />
                </linearGradient>

                {/* Awake Luminous Logo Creamy Gradient */}
                <linearGradient id="cuteGhostGradWhite" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
                  <stop offset="45%" stopColor="#FCFBF7" stopOpacity="1" />
                  <stop offset="100%" stopColor="#EAF6FD" stopOpacity="0.99" />
                </linearGradient>
              </defs>

              {/* Wireless Signal Arcs (Top-Right of Head, echoes Logo when Awake) */}
              {isGhostAwake && (
                <g className="pointer-events-none">
                  <path
                    d="M 380, 35 C 390, 35 398, 43 398, 53"
                    fill="none"
                    stroke="#56C2F0"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    className="animate-signal-arc-inner"
                  />
                  <path
                    d="M 380, 23 C 396, 23 410, 36 410, 53"
                    fill="none"
                    stroke="#AFDDF5"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    className="animate-signal-arc-outer"
                  />
                </g>
              )}

              {/* Cute Ghost Silhouette with Plump Logo-Style Rounded Bottom Scallops */}
              <path
                d={
                  isGhostAwake
                    ? "M 310, 38 C 352, 38, 385, 49, 406, 75 C 416, 85, 428, 87, 442, 75 C 465, 54, 492, 28, 532, 26 C 564, 25, 588, 44, 584, 70 C 580, 95, 568, 130, 562, 168 C 553, 215, 558, 272, 550, 340 C 548, 355, 526, 360, 502, 360 C 478, 360, 464, 342, 453, 342 C 442, 342, 428, 360, 405, 360 C 382, 360, 368, 342, 356, 342 C 344, 342, 332, 360, 308, 360 C 284, 360, 272, 342, 260, 342 C 248, 342, 234, 360, 211, 360 C 188, 360, 174, 342, 163, 342 C 152, 342, 138, 360, 114, 360 C 90, 360, 68, 355, 66, 340 C 58, 270, 64, 210, 54, 160 C 46, 118, 34, 80, 30, 55 C 26, 30, 46, 12, 78, 14 C 120, 16, 150, 46, 170, 70 C 186, 84, 200, 84, 210, 74 C 230, 46, 264, 38, 310, 38 Z"
                    : "M 310, 38 C 352, 38, 385, 52, 408, 78 C 424, 94, 444, 108, 470, 118 C 496, 128, 522, 136, 546, 126 C 564, 118, 574, 105, 568, 132 C 562, 158, 558, 180, 556, 205 C 550, 242, 556, 285, 550, 340 C 548, 355, 526, 360, 502, 360 C 478, 360, 464, 342, 453, 342 C 442, 342, 428, 360, 405, 360 C 382, 360, 368, 342, 356, 342 C 344, 342, 332, 360, 308, 360 C 284, 360, 272, 342, 260, 342 C 248, 342, 234, 360, 211, 360 C 188, 360, 174, 342, 163, 342 C 152, 342, 138, 360, 114, 360 C 90, 360, 68, 355, 66, 340 C 58, 285, 64, 242, 54, 205 C 50, 180, 44, 158, 48, 132 C 54, 105, 66, 118, 86, 126 C 110, 136, 136, 128, 162, 118 C 188, 108, 200, 94, 212, 78 C 230, 48, 264, 38, 310, 38 Z"
                }
                fill={isGhostAwake ? "url(#cuteGhostGradWhite)" : "url(#cuteGhostGradTranslucent)"}
                stroke={isGhostAwake ? "rgba(3, 49, 87, 0.20)" : "rgba(3, 49, 87, 0.14)"}
                strokeWidth={isGhostAwake ? "2.25" : "2"}
                strokeLinejoin="round"
                style={{
                  transition: "d 0.7s cubic-bezier(0.34, 1.56, 0.64, 1), fill 0.6s ease-out, stroke 0.6s ease-out",
                }}
              />

              {/* Subtle Soft Drape Accent Lines */}
              <path
                d={
                  isGhostAwake
                    ? "M 170, 70 C 152, 105 136, 165 128, 230"
                    : "M 162, 118 C 150, 142 136, 180 128, 230"
                }
                fill="none"
                stroke="rgba(3, 49, 87, 0.12)"
                strokeWidth="1.25"
                strokeDasharray="4 3"
                style={{ transition: "d 0.7s ease-out, stroke 0.5s ease-out" }}
              />
              <path
                d={
                  isGhostAwake
                    ? "M 442, 75 C 462, 112 482, 172 490, 235"
                    : "M 470, 118 C 478, 145 484, 185 490, 235"
                }
                fill="none"
                stroke="rgba(3, 49, 87, 0.12)"
                strokeWidth="1.25"
                strokeDasharray="4 3"
                style={{ transition: "d 0.7s ease-out, stroke 0.5s ease-out" }}
              />

              {/* Signature Logo Lavender Diagonal Blush Stripes (#BCB6D7) */}
              <g opacity={isGhostAwake ? 1 : 0.6} className="transition-opacity duration-300">
                <rect x="248" y="96" width="8.5" height="3.2" rx="1.6" transform="rotate(-60 252 97.6)" fill="#BCB6D7" />
                <rect x="255" y="96" width="8.5" height="3.2" rx="1.6" transform="rotate(-60 259 97.6)" fill="#BCB6D7" />
                <rect x="262" y="96" width="8.5" height="3.2" rx="1.6" transform="rotate(-60 266 97.6)" fill="#BCB6D7" />

                <rect x="349" y="96" width="8.5" height="3.2" rx="1.6" transform="rotate(-60 353 97.6)" fill="#BCB6D7" />
                <rect x="356" y="96" width="8.5" height="3.2" rx="1.6" transform="rotate(-60 360 97.6)" fill="#BCB6D7" />
                <rect x="363" y="96" width="8.5" height="3.2" rx="1.6" transform="rotate(-60 367 97.6)" fill="#BCB6D7" />
              </g>

              {/* Ghost Expression in Signature Ocean Navy (#033157) */}
              {!isGhostAwake ? (
                /* Sleeping Face (Soft Ocean Navy with Gentle Snore) */
                <g className="transition-opacity duration-300">
                  <path
                    d="M 275, 87 Q 282, 80 289, 87"
                    fill="none"
                    stroke="#033157"
                    strokeOpacity="0.72"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 331, 87 Q 338, 80 345, 87"
                    fill="none"
                    stroke="#033157"
                    strokeOpacity="0.72"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 304, 95 Q 310, 99 316, 95"
                    fill="none"
                    stroke="#033157"
                    strokeOpacity="0.72"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                  />
                  <g className="select-none pointer-events-none">
                    <text x="352" y="72" fill="#56C2F0" fontSize="11" fontFamily="monospace" fontWeight="bold">z</text>
                    <text x="363" y="59" fill="#033157" fillOpacity="0.6" fontSize="14" fontFamily="monospace" fontWeight="bold">Z</text>
                  </g>
                </g>
              ) : (
                /* Awake Face with Logo-Style Ocean Navy Eyes & Friendly Rounded Smile */
                <g className="transition-opacity duration-300">
                  <circle cx="282" cy="85" r="4.4" fill="#033157" />
                  <circle cx="338" cy="85" r="4.4" fill="#033157" />
                  <circle cx="283.6" cy="83.4" r="1.5" fill="#AFDDF5" />
                  <circle cx="339.6" cy="83.4" r="1.5" fill="#AFDDF5" />

                  {isAnyButtonPressed ? (
                    <path
                      d="M 299, 93 Q 304.5, 98.5 310, 93 Q 315.5, 98.5 321, 93"
                      fill="none"
                      stroke="#033157"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                    />
                  ) : (
                    <path
                      d="M 300, 93 C 300, 93 303, 99.5 310, 99.5 C 317, 99.5 320, 93 320, 93"
                      fill="none"
                      stroke="#033157"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                    />
                  )}
                </g>
              )}
            </svg>

            {/* Asymmetric Ghost Hands (ZL, L, R, ZR) */}
            <div className="absolute top-[12px] left-[36px] right-[36px] flex justify-between items-start z-30 pointer-events-auto">
              {/* Left Ghost Hand */}
              <div
                className={`flex items-center gap-1.5 p-1 rounded-xl transition-all duration-500 ease-out pointer-events-auto border ${
                  isGhostAwake
                    ? "translate-y-0 rotate-[-2deg] translate-x-0 opacity-100 bg-[#033157]/95 border-[#064273] shadow-md backdrop-blur-xs"
                    : "translate-y-[40px] rotate-[-12deg] -translate-x-1 opacity-90 bg-[#033157]/85 border-[#064273]/80 shadow-sm backdrop-blur-xs"
                } ${
                  isLeftHandActive
                    ? "ring-2 ring-[#AFDDF5]/60"
                    : ""
                }`}
              >
                <button
                  {...bindButton("zl")}
                  className={`w-[72px] py-2 text-center rounded-lg text-xs font-mono font-bold tracking-wider border transition-all cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    state.zl
                      ? "bg-[#AFDDF5] text-[#033157] border-[#D1F2FF] shadow-[0_0_10px_rgba(175,221,245,0.55)] scale-[0.98]"
                      : "bg-[#063D6B] hover:bg-[#0A4D85] text-[#FCFBF7] border-[#AFDDF5]/20 hover:border-[#AFDDF5]/45 shadow-sm"
                  }`}
                  title={t("buttons.zl", "ZL 按鍵 (左板機鍵)")}
                >
                  ZL
                </button>
                <button
                  {...bindButton("l")}
                  className={`w-[64px] py-2 text-center rounded-lg text-xs font-mono font-bold tracking-wider border transition-all cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    state.l
                      ? "bg-[#AFDDF5] text-[#033157] border-[#D1F2FF] shadow-[0_0_10px_rgba(175,221,245,0.55)] scale-[0.98]"
                      : "bg-[#063D6B] hover:bg-[#0A4D85] text-[#FCFBF7] border-[#AFDDF5]/20 hover:border-[#AFDDF5]/45 shadow-sm"
                  }`}
                  title={t("buttons.l", "L 按鍵 (左肩鍵)")}
                >
                  L
                </button>
              </div>

              {/* Right Ghost Hand */}
              <div
                className={`flex items-center gap-1.5 p-1 rounded-xl transition-all duration-500 ease-out pointer-events-auto border ${
                  isGhostAwake
                    ? "mt-2.5 translate-y-0 rotate-[3deg] translate-x-0 opacity-100 bg-[#033157]/95 border-[#064273] shadow-md backdrop-blur-xs"
                    : "mt-2.5 translate-y-[42px] rotate-[12deg] translate-x-1 opacity-90 bg-[#033157]/85 border-[#064273]/80 shadow-sm backdrop-blur-xs"
                } ${
                  isRightHandActive
                    ? "ring-2 ring-[#AFDDF5]/60"
                    : ""
                }`}
              >
                <button
                  {...bindButton("r")}
                  className={`w-[64px] py-2 text-center rounded-lg text-xs font-mono font-bold tracking-wider border transition-all cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    state.r
                      ? "bg-[#AFDDF5] text-[#033157] border-[#D1F2FF] shadow-[0_0_10px_rgba(175,221,245,0.55)] scale-[0.98]"
                      : "bg-[#063D6B] hover:bg-[#0A4D85] text-[#FCFBF7] border-[#AFDDF5]/20 hover:border-[#AFDDF5]/45 shadow-sm"
                  }`}
                  title={t("buttons.r", "R 按鍵 (右肩鍵)")}
                >
                  R
                </button>
                <button
                  {...bindButton("zr")}
                  className={`w-[72px] py-2 text-center rounded-lg text-xs font-mono font-bold tracking-wider border transition-all cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    state.zr
                      ? "bg-[#AFDDF5] text-[#033157] border-[#D1F2FF] shadow-[0_0_10px_rgba(175,221,245,0.55)] scale-[0.98]"
                      : "bg-[#063D6B] hover:bg-[#0A4D85] text-[#FCFBF7] border-[#AFDDF5]/20 hover:border-[#AFDDF5]/45 shadow-sm"
                  }`}
                  title={t("buttons.zr", "ZR 按鍵 (右板機鍵)")}
                >
                  ZR
                </button>
              </div>
            </div>

          {/* Main Controls Grid Embedded in the Ghost Torso */}
          <div className="w-full h-full pt-[82px] pb-[25px] px-[45px] grid grid-cols-3 items-center z-10 pointer-events-none">
            {/* Left Flank: Stick (L3) & D-Pad */}
            <div className="flex flex-col items-center justify-around h-full py-1">
              {/* Left Thumbstick (L3) - Echoes Logo's Ocean Navy Socket + Sky-Blue Cap */}
              <div
                ref={leftStickBaseRef}
                onPointerDown={(e) => startStickDrag("left", leftStickBaseRef, leftKnobRef, setIsDraggingLeft, e)}
                className={`relative w-24 h-24 rounded-full bg-[#033157] border transition-all duration-150 select-none shadow-[inset_0_3px_6px_rgba(1,22,41,0.55)] flex items-center justify-center touch-none cursor-grab active:cursor-grabbing pointer-events-auto ${
                  isDraggingLeft
                    ? "border-[#56C2F0] ring-2 ring-[#AFDDF5]/40"
                    : "border-[#064273] hover:border-[#56C2F0]/60"
                }`}
                title={t("buttons.l_stick", "左類比搖桿 (可拖曳移動，輕點為 L3)")}
              >
                {/* Subtle Direction Guide Markers */}
                <span className="absolute top-1 text-[8px] font-mono text-[#AFDDF5]/45 select-none pointer-events-none">▲</span>
                <span className="absolute bottom-1 text-[8px] font-mono text-[#AFDDF5]/45 select-none pointer-events-none">▼</span>
                <span className="absolute left-1.5 text-[8px] font-mono text-[#AFDDF5]/45 select-none pointer-events-none">◀</span>
                <span className="absolute right-1.5 text-[8px] font-mono text-[#AFDDF5]/45 select-none pointer-events-none">▶</span>

                <div
                  ref={leftKnobRef}
                  className={`w-14 h-14 rounded-full border flex items-center justify-center text-xs font-mono font-bold select-none shadow-md pointer-events-none ${
                    isDraggingLeft ? "transition-none" : "transition-transform duration-100 ease-out"
                  } ${
                    state.l_stick_click
                      ? "bg-[#FCFBF7] text-[#033157] border-white scale-95 shadow-xs"
                      : isDraggingLeft || (state.left_stick_x !== 128 || state.left_stick_y !== 128)
                      ? "bg-[#D1F2FF] text-[#033157] border-white shadow-[0_0_12px_rgba(175,221,245,0.65)]"
                      : "bg-[#AFDDF5] text-[#033157] border-[#D1F2FF]/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5)]"
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

              {/* D-Pad (Logo-Style Rounded Ocean Navy Cross) */}
              <div className="relative w-26 h-26 flex items-center justify-center select-none pointer-events-auto">
                <div className="absolute w-9 h-26 bg-[#033157] border border-[#064273] rounded-xl shadow-md pointer-events-none" />
                <div className="absolute w-26 h-9 bg-[#033157] border border-[#064273] rounded-xl shadow-md pointer-events-none" />

                <button
                  {...bindButton("dpad_up")}
                  className={`absolute top-0 w-9 h-9 rounded-t-xl flex items-center justify-center text-xs font-bold transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    isUp ? "bg-[#AFDDF5] text-[#033157]" : "text-[#AFDDF5]/75 hover:text-[#FCFBF7] hover:bg-[#064273]"
                  }`}
                  title={t("buttons.dpad_up", "十字鍵 上")}
                >
                  ▲
                </button>
                <button
                  {...bindButton("dpad_down")}
                  className={`absolute bottom-0 w-9 h-9 rounded-b-xl flex items-center justify-center text-xs font-bold transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    isDown ? "bg-[#AFDDF5] text-[#033157]" : "text-[#AFDDF5]/75 hover:text-[#FCFBF7] hover:bg-[#064273]"
                  }`}
                  title={t("buttons.dpad_down", "十字鍵 下")}
                >
                  ▼
                </button>
                <button
                  {...bindButton("dpad_left")}
                  className={`absolute left-0 w-9 h-9 rounded-l-xl flex items-center justify-center text-xs font-bold transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    isLeft ? "bg-[#AFDDF5] text-[#033157]" : "text-[#AFDDF5]/75 hover:text-[#FCFBF7] hover:bg-[#064273]"
                  }`}
                  title={t("buttons.dpad_left", "十字鍵 左")}
                >
                  ◀
                </button>
                <button
                  {...bindButton("dpad_right")}
                  className={`absolute right-0 w-9 h-9 rounded-r-xl flex items-center justify-center text-xs font-bold transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    isRight ? "bg-[#AFDDF5] text-[#033157]" : "text-[#AFDDF5]/75 hover:text-[#FCFBF7] hover:bg-[#064273]"
                  }`}
                  title={t("buttons.dpad_right", "十字鍵 右")}
                >
                  ▶
                </button>
                <div className="w-5 h-5 rounded-full bg-[#022440] border border-[#AFDDF5]/15 z-10 pointer-events-none" />
              </div>
            </div>

            {/* Center Column: System Controls */}
            <div className="flex flex-col items-center justify-around h-full py-1">
              {/* Minus (-) & Plus (+) Buttons */}
              <div className="flex items-center gap-10">
                <button
                  {...bindButton("minus")}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold border transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    state.minus
                      ? "bg-[#AFDDF5] text-[#033157] border-[#D1F2FF] shadow-xs"
                      : "bg-[#033157] text-[#FCFBF7] border-[#064273] hover:bg-[#064273] shadow-sm"
                  }`}
                  title={t("buttons.minus", "Minus 按鍵 (減號)")}
                >
                  −
                </button>
                <button
                  {...bindButton("plus")}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold border transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    state.plus
                      ? "bg-[#AFDDF5] text-[#033157] border-[#D1F2FF] shadow-xs"
                      : "bg-[#033157] text-[#FCFBF7] border-[#064273] hover:bg-[#064273] shadow-sm"
                  }`}
                  title={t("buttons.plus", "Plus 按鍵 (加號)")}
                >
                  +
                </button>
              </div>

              {/* Minimalist Ghost-Pad Badge */}
              <button
                type="button"
                onClick={onToggleEsp32 || onToggleMute}
                className={`px-3 py-1 rounded-full text-[10px] font-mono tracking-wider border shadow-xs flex items-center gap-1.5 select-none transition-all cursor-pointer pointer-events-auto active:scale-95 ${
                  isGhostAwake
                    ? "text-[#033157] border-[#56C2F0]/60 bg-[#EAF6FD] hover:bg-[#D1F2FF]/80 shadow-[0_0_12px_rgba(86,194,240,0.28)]"
                    : "text-[#033157]/75 border-[#033157]/15 bg-[#FCFBF7]/95 hover:bg-[#EAF6FD] hover:text-[#033157] shadow-2xs"
                }`}
                title={
                  isGhostAwake
                    ? t("live_controls.esp32_active_stop", "ESP32 已連線 (點擊斷開並釋放 1P)")
                    : t("live_controls.esp32_idle_start", "ESP32 已斷開 (點擊開啟連線)")
                }
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    isGhostAwake
                      ? "bg-[#0EA5E9] shadow-[0_0_6px_rgba(14,165,233,0.75)]"
                      : "bg-[#BCB6D7]"
                  }`}
                />
                <span>GHOST-PAD</span>
              </button>

              {/* Capture & Home */}
              <div className="flex items-center gap-10 pb-1">
                <button
                  {...bindButton("capture")}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold border transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    state.capture
                      ? "bg-[#AFDDF5] text-[#033157] border-[#D1F2FF] shadow-xs"
                      : "bg-[#033157] text-[#FCFBF7] border-[#064273] hover:bg-[#064273] shadow-sm"
                  }`}
                  title={t("buttons.capture", "Capture 按鍵 (截圖)")}
                >
                  ◉
                </button>
                <button
                  {...bindButton("home")}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    state.home
                      ? "bg-[#AFDDF5] text-[#033157] border-[#D1F2FF] shadow-xs"
                      : "bg-[#033157] text-[#FCFBF7] border-[#064273] hover:bg-[#064273] shadow-sm"
                  }`}
                  title={t("buttons.home", "Home 按鍵 (主畫面)")}
                >
                  ⌂
                </button>
              </div>
            </div>

            {/* Right Flank: ABXY & Right Stick (R3) */}
            <div className="flex flex-col items-center justify-around h-full py-1">
              {/* ABXY Diamond */}
              <div className="relative w-26 h-26 flex items-center justify-center select-none">
                <button
                  {...bindButton("x")}
                  className={`absolute top-0 w-9 h-9 rounded-full border flex items-center justify-center text-xs font-bold transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    state.x
                      ? "bg-[#AFDDF5] text-[#033157] border-[#D1F2FF] shadow-[0_0_10px_rgba(175,221,245,0.6)] scale-95"
                      : "bg-[#033157] text-[#FCFBF7] border-[#064273] hover:bg-[#064273] shadow-md"
                  }`}
                >
                  X
                </button>
                <button
                  {...bindButton("b")}
                  className={`absolute bottom-0 w-9 h-9 rounded-full border flex items-center justify-center text-xs font-bold transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    state.b
                      ? "bg-[#AFDDF5] text-[#033157] border-[#D1F2FF] shadow-[0_0_10px_rgba(175,221,245,0.6)] scale-95"
                      : "bg-[#033157] text-[#FCFBF7] border-[#064273] hover:bg-[#064273] shadow-md"
                  }`}
                >
                  B
                </button>
                <button
                  {...bindButton("y")}
                  className={`absolute left-0 w-9 h-9 rounded-full border flex items-center justify-center text-xs font-bold transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    state.y
                      ? "bg-[#AFDDF5] text-[#033157] border-[#D1F2FF] shadow-[0_0_10px_rgba(175,221,245,0.6)] scale-95"
                      : "bg-[#033157] text-[#FCFBF7] border-[#064273] hover:bg-[#064273] shadow-md"
                  }`}
                >
                  Y
                </button>
                <button
                  {...bindButton("a")}
                  className={`absolute right-0 w-9 h-9 rounded-full border flex items-center justify-center text-xs font-bold transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    state.a
                      ? "bg-[#AFDDF5] text-[#033157] border-[#D1F2FF] shadow-[0_0_10px_rgba(175,221,245,0.6)] scale-95"
                      : "bg-[#033157] text-[#FCFBF7] border-[#064273] hover:bg-[#064273] shadow-md"
                  }`}
                >
                  A
                </button>
              </div>

              {/* Right Thumbstick (R3) - Echoes Logo's Ocean Navy Socket + Sky-Blue Cap */}
              <div
                ref={rightStickBaseRef}
                onPointerDown={(e) => startStickDrag("right", rightStickBaseRef, rightKnobRef, setIsDraggingRight, e)}
                className={`relative w-24 h-24 rounded-full bg-[#033157] border transition-all duration-150 select-none shadow-[inset_0_3px_6px_rgba(1,22,41,0.55)] flex items-center justify-center touch-none cursor-grab active:cursor-grabbing pointer-events-auto ${
                  isDraggingRight
                    ? "border-[#56C2F0] ring-2 ring-[#AFDDF5]/40"
                    : "border-[#064273] hover:border-[#56C2F0]/60"
                }`}
                title={t("buttons.r_stick", "右類比搖桿 (可拖曳移動，輕點為 R3)")}
              >
                {/* Subtle Direction Guide Markers */}
                <span className="absolute top-1 text-[8px] font-mono text-[#AFDDF5]/45 select-none pointer-events-none">▲</span>
                <span className="absolute bottom-1 text-[8px] font-mono text-[#AFDDF5]/45 select-none pointer-events-none">▼</span>
                <span className="absolute left-1.5 text-[8px] font-mono text-[#AFDDF5]/45 select-none pointer-events-none">◀</span>
                <span className="absolute right-1.5 text-[8px] font-mono text-[#AFDDF5]/45 select-none pointer-events-none">▶</span>

                <div
                  ref={rightKnobRef}
                  className={`w-14 h-14 rounded-full border flex items-center justify-center text-xs font-mono font-bold select-none shadow-md pointer-events-none ${
                    isDraggingRight ? "transition-none" : "transition-transform duration-100 ease-out"
                  } ${
                    state.r_stick_click
                      ? "bg-[#FCFBF7] text-[#033157] border-white scale-95 shadow-xs"
                      : isDraggingRight || (state.right_stick_x !== 128 || state.right_stick_y !== 128)
                      ? "bg-[#D1F2FF] text-[#033157] border-white shadow-[0_0_12px_rgba(175,221,245,0.65)]"
                      : "bg-[#AFDDF5] text-[#033157] border-[#D1F2FF]/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5)]"
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
          </div>
        </div>

        {/* Real-Time Live Input Timeline Stream (with ghost overlay while scrubbing paused macro) */}
        <div className="w-full shrink-0 pt-1 pb-1">
          <InputTimelineStream
            state={state}
            previewScript={scrubPreviewMs !== null ? activeMacroScript : null}
            previewPlayheadMs={scrubPreviewMs}
          />
        </div>
      </div>

      {/* Bottom Sticky Quick Macro Player Bar for Live Run & Instant Manual Rescue */}
      {macros &&
        macros.length > 0 &&
        activeMacroScript &&
        macroPlayerStatus &&
        macroPlayerConfig &&
        onChangeMacroPlayerConfig &&
        onPlayMacro &&
        onPauseMacro &&
        onResumeMacro &&
        onStopMacro && (
          <MacroPlayerBar
            script={activeMacroScript}
            macros={macros}
            onSelectScript={onSelectMacro}
            onEditScript={onEditMacro}
            disablePlay={recordingPhase !== "idle"}
            isAutoPaused={isAutoPaused}
            isOfflinePreview={!esp32Connected}
            status={macroPlayerStatus}
            config={macroPlayerConfig}
            onChangeConfig={onChangeMacroPlayerConfig}
            onPlay={() => onPlayMacro(activeMacroScript)}
            onPause={onPauseMacro}
            onResume={onResumeMacro}
            onStop={onStopMacro}
            onSeek={onSeekMacro}
            onPreviewSeek={setScrubPreviewMs}
          />
        )}
    </div>
  );
};
