import React from "react";
import { ControllerState, GamepadInfo } from "../types";
import { usePulsedButtonPress } from "../hooks/usePulsedButtonPress";
import { useStickDrag } from "../hooks/useStickDrag";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useTranslation } from "react-i18next";

interface Props {
  state: ControllerState;
  gamepads: GamepadInfo[];
  isMuted: boolean;
  onToggleMute: () => void;
  fps: number;
  onTriggerButton?: (button: string, pressed: boolean) => void;
  onTriggerStick?: (stick: "left" | "right", x: number, y: number) => void;
}

export const CompactWidget: React.FC<Props> = ({
  state,
  gamepads,
  isMuted,
  onToggleMute,
  fps,
  onTriggerButton,
  onTriggerStick,
}) => {
  const { t } = useTranslation("dashboard");
  const activeGamepad = gamepads.find((g) => g.is_active);

  const STICK_MAX_TRAVEL = 15; // Travel radius in px for compact mode

  // Reusable button pulse holding & binding
  const { handleButtonPress, bindButton } = usePulsedButtonPress({
    minHoldMs: 140,
    onTriggerButton,
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
    tapThreshold: 5,
    onTriggerStick,
    onButtonPress: handleButtonPress,
  });

  // Scaled stick offsets for compact view (-12px .. +12px)
  const lxOffset = ((state.left_stick_x - 128) / 128) * 12;
  const lyOffset = -((state.left_stick_y - 128) / 128) * 12;
  const rxOffset = ((state.right_stick_x - 128) / 128) * 12;
  const ryOffset = -((state.right_stick_y - 128) / 128) * 12;

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

  return (
    <div className="flex flex-col h-full w-full bg-window-base text-text-primary select-none p-3 justify-between overflow-hidden">
      {/* Top HUD Status Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border-subtle text-xs shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              activeGamepad && !isMuted ? "bg-emerald-500" : "bg-border-element"
            }`}
          />
          <span className="font-medium text-xs text-text-primary truncate">
            {isMuted ? t("compact.paused", "已暫停") : activeGamepad?.name || t("compact.waiting", "等待連線")}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onToggleMute}
            className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-medium border transition-colors flex items-center gap-1 ${
              isMuted
                ? "bg-amber-50 border-amber-300 text-amber-800"
                : "bg-emerald-50 border-emerald-300 text-emerald-800"
            }`}
          >
            {isMuted ? t("compact.paused", "暫停中") : t("compact.running", "已啟用")}
          </button>
          <span className="text-[10px] font-mono text-text-muted">{fps}Hz</span>
          <LanguageSwitcher />
        </div>
      </div>

      {/* Rectangular Handheld Controller Chassis */}
      <div className="w-full max-w-[480px] bg-surface-card border border-border-subtle rounded-xl p-3 shadow-md relative overflow-hidden flex flex-col gap-3 my-auto mx-auto shrink-0 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8)]">
        {/* Top Edge: Shoulder Buttons (ZL, L, R, ZR) + Brand Header */}
        <div className="flex items-center justify-between gap-2 border-b border-border-subtle pb-2">
          {/* Left Shoulder / Triggers */}
          <div className="flex items-center gap-1.5">
            <button
              {...bindButton("zl")}
              className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider border transition-all cursor-pointer select-none active:scale-95 ${
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
              className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider border transition-all cursor-pointer select-none active:scale-95 ${
                state.l
                  ? "bg-accent text-accent-foreground border-border-focus shadow-xs scale-95"
                  : "bg-surface-input text-text-primary border-border-subtle hover:border-border-element hover:bg-interactive-hover shadow-xs"
              }`}
              title={t("buttons.l", "L 肩鍵")}
            >
              L
            </button>
          </div>

          {/* Center Brand Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-input border border-border-subtle text-[9px] font-mono tracking-widest text-text-muted select-none pointer-events-none">
            <span
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                isAnyButtonPressed ? "bg-emerald-500" : "bg-border-element"
              }`}
            />
            <span>GHOST-PAD</span>
          </div>

          {/* Right Shoulder / Triggers */}
          <div className="flex items-center gap-1.5">
            <button
              {...bindButton("r")}
              className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider border transition-all cursor-pointer select-none active:scale-95 ${
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
              className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider border transition-all cursor-pointer select-none active:scale-95 ${
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
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-1">
          {/* Left Flank */}
          <div className="flex flex-col items-center justify-between gap-3">
            {/* Left Thumbstick (L3) */}
            <div
              ref={leftStickBaseRef}
              onPointerDown={(e) => startStickDrag("left", leftStickBaseRef, leftKnobRef, setIsDraggingLeft, e)}
              className={`relative w-18 h-18 rounded-full bg-surface-input border transition-all duration-150 select-none shadow-[inset_0_1px_3px_rgba(15,23,42,0.08)] flex items-center justify-center touch-none cursor-grab active:cursor-grabbing pointer-events-auto ${
                isDraggingLeft
                  ? "border-border-focus ring-1 ring-border-focus/20"
                  : "border-border-element hover:border-border-focus"
              }`}
              title={t("buttons.l_stick", "左類比搖桿")}
            >
              <span className="absolute top-1 text-[7px] font-mono text-text-muted select-none pointer-events-none">▲</span>
              <span className="absolute bottom-1 text-[7px] font-mono text-text-muted select-none pointer-events-none">▼</span>
              <span className="absolute left-1.5 text-[7px] font-mono text-text-muted select-none pointer-events-none">◀</span>
              <span className="absolute right-1.5 text-[7px] font-mono text-text-muted select-none pointer-events-none">▶</span>

              <div
                ref={leftKnobRef}
                className={`w-11 h-11 rounded-full border flex items-center justify-center text-[10px] font-mono font-bold select-none shadow-sm pointer-events-none ${
                  isDraggingLeft ? "transition-none" : "transition-transform duration-100 ease-out"
                } ${
                  state.l_stick_click
                    ? "bg-accent text-accent-foreground border-border-focus scale-95 shadow-xs"
                    : isDraggingLeft || (state.left_stick_x !== 128 || state.left_stick_y !== 128)
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
            <div className="relative w-20 h-20 flex items-center justify-center select-none pointer-events-auto">
              <div className="absolute w-7 h-20 bg-surface-input border border-border-element rounded-md shadow-xs pointer-events-none" />
              <div className="absolute w-20 h-7 bg-surface-input border border-border-element rounded-md shadow-xs pointer-events-none" />
              <button
                {...bindButton("dpad_up")}
                className={`absolute top-0 w-7 h-7 rounded-t-md flex items-center justify-center text-xs font-bold transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                  isUp ? "bg-accent text-accent-foreground" : "text-text-secondary hover:text-text-primary hover:bg-interactive-hover"
                }`}
                title={t("buttons.dpad_up", "十字鍵 上")}
              >
                ▲
              </button>
              <button
                {...bindButton("dpad_down")}
                className={`absolute bottom-0 w-7 h-7 rounded-b-md flex items-center justify-center text-xs font-bold transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                  isDown ? "bg-accent text-accent-foreground" : "text-text-secondary hover:text-text-primary hover:bg-interactive-hover"
                }`}
                title={t("buttons.dpad_down", "十字鍵 下")}
              >
                ▼
              </button>
              <button
                {...bindButton("dpad_left")}
                className={`absolute left-0 w-7 h-7 rounded-l-md flex items-center justify-center text-xs font-bold transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                  isLeft ? "bg-accent text-accent-foreground" : "text-text-secondary hover:text-text-primary hover:bg-interactive-hover"
                }`}
                title={t("buttons.dpad_left", "十字鍵 左")}
              >
                ◀
              </button>
              <button
                {...bindButton("dpad_right")}
                className={`absolute right-0 w-7 h-7 rounded-r-md flex items-center justify-center text-xs font-bold transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                  isRight ? "bg-accent text-accent-foreground" : "text-text-secondary hover:text-text-primary hover:bg-interactive-hover"
                }`}
                title={t("buttons.dpad_right", "十字鍵 右")}
              >
                ▶
              </button>
              <div className="w-3.5 h-3.5 rounded-full bg-surface-card border border-border-subtle z-10 pointer-events-none" />
            </div>
          </div>

          {/* Center Column: System controls */}
          <div className="flex flex-col items-center justify-between h-full py-1 gap-3">
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
              <svg viewBox="0 0 70 30" className="w-full h-full">
                <circle cx="22" cy="12" r="2.8" fill="#0f172a" />
                <circle cx="48" cy="12" r="2.8" fill="#0f172a" />
                {isAnyButtonPressed ? (
                  <path
                    d="M 28, 18 Q 32, 22 35, 18 Q 38, 22 42, 18"
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                ) : (
                  <path
                    d="M 28, 17 Q 35, 22 42, 17"
                    fill="none"
                    stroke="#64748b"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
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
          <div className="flex flex-col items-center justify-between gap-3">
            {/* ABXY Diamond */}
            <div className="relative w-20 h-20 flex items-center justify-center select-none pointer-events-auto">
              <button
                {...bindButton("x")}
                className={`absolute top-0 w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold transition-colors cursor-pointer select-none active:scale-95 ${
                  state.x
                    ? "bg-accent text-accent-foreground border-border-focus shadow-xs scale-95"
                    : "bg-surface-input text-text-primary border-border-subtle hover:border-border-element hover:bg-interactive-hover shadow-xs"
                }`}
              >
                X
              </button>
              <button
                {...bindButton("b")}
                className={`absolute bottom-0 w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold transition-colors cursor-pointer select-none active:scale-95 ${
                  state.b
                    ? "bg-accent text-accent-foreground border-border-focus shadow-xs scale-95"
                    : "bg-surface-input text-text-primary border-border-subtle hover:border-border-element hover:bg-interactive-hover shadow-xs"
                }`}
              >
                B
              </button>
              <button
                {...bindButton("y")}
                className={`absolute left-0 w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold transition-colors cursor-pointer select-none active:scale-95 ${
                  state.y
                    ? "bg-accent text-accent-foreground border-border-focus shadow-xs scale-95"
                    : "bg-surface-input text-text-primary border-border-subtle hover:border-border-element hover:bg-interactive-hover shadow-xs"
                }`}
              >
                Y
              </button>
              <button
                {...bindButton("a")}
                className={`absolute right-0 w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold transition-colors cursor-pointer select-none active:scale-95 ${
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
              onPointerDown={(e) => startStickDrag("right", rightStickBaseRef, rightKnobRef, setIsDraggingRight, e)}
              className={`relative w-18 h-18 rounded-full bg-surface-input border transition-all duration-150 select-none shadow-[inset_0_1px_3px_rgba(15,23,42,0.08)] flex items-center justify-center touch-none cursor-grab active:cursor-grabbing pointer-events-auto ${
                isDraggingRight
                  ? "border-border-focus ring-1 ring-border-focus/20"
                  : "border-border-element hover:border-border-focus"
              }`}
              title={t("buttons.r_stick", "右類比搖桿")}
            >
              <span className="absolute top-1 text-[7px] font-mono text-text-muted select-none pointer-events-none">▲</span>
              <span className="absolute bottom-1 text-[7px] font-mono text-text-muted select-none pointer-events-none">▼</span>
              <span className="absolute left-1.5 text-[7px] font-mono text-text-muted select-none pointer-events-none">◀</span>
              <span className="absolute right-1.5 text-[7px] font-mono text-text-muted select-none pointer-events-none">▶</span>

              <div
                ref={rightKnobRef}
                className={`w-11 h-11 rounded-full border flex items-center justify-center text-[10px] font-mono font-bold select-none shadow-sm pointer-events-none ${
                  isDraggingRight ? "transition-none" : "transition-transform duration-100 ease-out"
                } ${
                  state.r_stick_click
                    ? "bg-accent text-accent-foreground border-border-focus scale-95 shadow-xs"
                    : isDraggingRight || (state.right_stick_x !== 128 || state.right_stick_y !== 128)
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
      </div>

      {/* Bottom Coordinates Bar */}
      <div className="pt-1.5 border-t border-border-subtle flex items-center justify-between text-[10px] font-mono text-text-muted shrink-0">
        <span>L: {state.left_stick_x},{state.left_stick_y}</span>
        <span>R: {state.right_stick_x},{state.right_stick_y}</span>
      </div>
    </div>
  );
};
