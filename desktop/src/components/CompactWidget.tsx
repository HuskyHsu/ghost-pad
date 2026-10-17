import React from "react";
import { ControllerState, GamepadInfo } from "../types";
import { usePulsedButtonPress } from "../hooks/usePulsedButtonPress";
import { useStickDrag } from "../hooks/useStickDrag";

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
    <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-100 select-none p-3 justify-between overflow-hidden">
      {/* Top HUD Status Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06] text-xs shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              activeGamepad && !isMuted ? "bg-emerald-400" : "bg-zinc-600"
            }`}
          />
          <span className="font-medium text-xs text-zinc-200 truncate">
            {isMuted ? "已暫停" : activeGamepad?.name || "等待連線"}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onToggleMute}
            className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-medium border transition-colors flex items-center gap-1 ${
              isMuted
                ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
            }`}
          >
            {isMuted ? "暫停中" : "已啟用"}
          </button>
          <span className="text-[10px] font-mono text-zinc-500">{fps}Hz</span>
        </div>
      </div>

      {/* Rectangular Handheld Controller Chassis */}
      <div className="w-full max-w-[480px] bg-zinc-900/60 border border-white/[0.08] rounded-xl p-3 shadow-xl relative overflow-hidden flex flex-col gap-3 my-auto mx-auto shrink-0 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
        {/* Top Edge: Shoulder Buttons (ZL, L, R, ZR) + Brand Header */}
        <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-2">
          {/* Left Shoulder / Triggers */}
          <div className="flex items-center gap-1.5">
            <button
              {...bindButton("zl")}
              className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider border transition-all cursor-pointer select-none active:scale-95 ${
                state.zl
                  ? "bg-zinc-100 text-zinc-950 border-white shadow-xs scale-95"
                  : "bg-zinc-850 text-zinc-200 border-white/[0.08] hover:border-white/[0.14]"
              }`}
              title="ZL 板機鍵"
            >
              ZL
            </button>
            <button
              {...bindButton("l")}
              className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider border transition-all cursor-pointer select-none active:scale-95 ${
                state.l
                  ? "bg-zinc-100 text-zinc-950 border-white shadow-xs scale-95"
                  : "bg-zinc-850 text-zinc-200 border-white/[0.08] hover:border-white/[0.14]"
              }`}
              title="L 肩鍵"
            >
              L
            </button>
          </div>

          {/* Center Brand Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-950 border border-white/[0.08] text-[9px] font-mono tracking-widest text-zinc-400 select-none pointer-events-none">
            <span
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                isAnyButtonPressed ? "bg-emerald-400" : "bg-zinc-600"
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
                  ? "bg-zinc-100 text-zinc-950 border-white shadow-xs scale-95"
                  : "bg-zinc-850 text-zinc-200 border-white/[0.08] hover:border-white/[0.14]"
              }`}
              title="R 肩鍵"
            >
              R
            </button>
            <button
              {...bindButton("zr")}
              className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider border transition-all cursor-pointer select-none active:scale-95 ${
                state.zr
                  ? "bg-zinc-100 text-zinc-950 border-white shadow-xs scale-95"
                  : "bg-zinc-850 text-zinc-200 border-white/[0.08] hover:border-white/[0.14]"
              }`}
              title="ZR 板機鍵"
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
              className={`relative w-18 h-18 rounded-full bg-zinc-950 border transition-all duration-150 select-none shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)] flex items-center justify-center touch-none cursor-grab active:cursor-grabbing pointer-events-auto ${
                isDraggingLeft
                  ? "border-white/[0.3] ring-1 ring-white/[0.1]"
                  : "border-white/[0.08] hover:border-white/[0.14]"
              }`}
              title="左類比搖桿"
            >
              <span className="absolute top-1 text-[7px] font-mono text-zinc-600 select-none pointer-events-none">▲</span>
              <span className="absolute bottom-1 text-[7px] font-mono text-zinc-600 select-none pointer-events-none">▼</span>
              <span className="absolute left-1.5 text-[7px] font-mono text-zinc-600 select-none pointer-events-none">◀</span>
              <span className="absolute right-1.5 text-[7px] font-mono text-zinc-600 select-none pointer-events-none">▶</span>

              <div
                ref={leftKnobRef}
                className={`w-11 h-11 rounded-full border flex items-center justify-center text-[10px] font-mono font-bold select-none shadow-sm pointer-events-none ${
                  isDraggingLeft ? "transition-none" : "transition-transform duration-100 ease-out"
                } ${
                  state.l_stick_click
                    ? "bg-zinc-100 text-zinc-950 border-white scale-95 shadow-xs"
                    : isDraggingLeft || (state.left_stick_x !== 128 || state.left_stick_y !== 128)
                    ? "bg-zinc-200 text-zinc-950 border-white shadow-xs"
                    : "bg-zinc-800 text-zinc-300 border-white/[0.1]"
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
              <div className="absolute w-7 h-20 bg-zinc-950 border border-white/[0.08] rounded-md shadow-sm pointer-events-none" />
              <div className="absolute w-20 h-7 bg-zinc-950 border border-white/[0.08] rounded-md shadow-sm pointer-events-none" />
              <button
                {...bindButton("dpad_up")}
                className={`absolute top-0 w-7 h-7 rounded-t-md flex items-center justify-center text-xs font-bold transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                  isUp ? "bg-zinc-100 text-zinc-950" : "text-zinc-400 hover:text-white hover:bg-zinc-850"
                }`}
                title="十字鍵 上"
              >
                ▲
              </button>
              <button
                {...bindButton("dpad_down")}
                className={`absolute bottom-0 w-7 h-7 rounded-b-md flex items-center justify-center text-xs font-bold transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                  isDown ? "bg-zinc-100 text-zinc-950" : "text-zinc-400 hover:text-white hover:bg-zinc-850"
                }`}
                title="十字鍵 下"
              >
                ▼
              </button>
              <button
                {...bindButton("dpad_left")}
                className={`absolute left-0 w-7 h-7 rounded-l-md flex items-center justify-center text-xs font-bold transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                  isLeft ? "bg-zinc-100 text-zinc-950" : "text-zinc-400 hover:text-white hover:bg-zinc-850"
                }`}
                title="十字鍵 左"
              >
                ◀
              </button>
              <button
                {...bindButton("dpad_right")}
                className={`absolute right-0 w-7 h-7 rounded-r-md flex items-center justify-center text-xs font-bold transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                  isRight ? "bg-zinc-100 text-zinc-950" : "text-zinc-400 hover:text-white hover:bg-zinc-850"
                }`}
                title="十字鍵 右"
              >
                ▶
              </button>
              <div className="w-3.5 h-3.5 rounded-full bg-zinc-900 border border-white/[0.06] z-10 pointer-events-none" />
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
                    ? "bg-zinc-100 text-zinc-950 border-white shadow-xs"
                    : "bg-zinc-900 text-zinc-200 border-zinc-700/80 hover:border-zinc-500 hover:bg-zinc-800 shadow-sm"
                }`}
                title="Minus 按鍵 (減號)"
              >
                −
              </button>
              <button
                {...bindButton("plus")}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-colors cursor-pointer select-none active:scale-95 ${
                  state.plus
                    ? "bg-zinc-100 text-zinc-950 border-white shadow-xs"
                    : "bg-zinc-900 text-zinc-200 border-zinc-700/80 hover:border-zinc-500 hover:bg-zinc-800 shadow-sm"
                }`}
                title="Plus 按鍵 (加號)"
              >
                +
              </button>
            </div>

            {/* Minimalist Expression Screen */}
            <div className="w-12 h-8 rounded-lg bg-zinc-950 border border-white/[0.06] flex items-center justify-center p-1 select-none">
              <svg viewBox="0 0 70 30" className="w-full h-full">
                <circle cx="22" cy="12" r="2.8" fill="#e4e4e7" />
                <circle cx="48" cy="12" r="2.8" fill="#e4e4e7" />
                {isAnyButtonPressed ? (
                  <path
                    d="M 28, 18 Q 32, 22 35, 18 Q 38, 22 42, 18"
                    fill="none"
                    stroke="#e4e4e7"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                ) : (
                  <path
                    d="M 28, 17 Q 35, 22 42, 17"
                    fill="none"
                    stroke="#71717a"
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
                    ? "bg-zinc-100 text-zinc-950 border-white shadow-xs"
                    : "bg-zinc-900 text-zinc-200 border-zinc-700/80 hover:border-zinc-500 hover:bg-zinc-800 shadow-sm"
                }`}
                title="Capture 按鍵"
              >
                ◉
              </button>
              <button
                {...bindButton("home")}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold border transition-colors cursor-pointer select-none active:scale-95 ${
                  state.home
                    ? "bg-zinc-100 text-zinc-950 border-white shadow-xs"
                    : "bg-zinc-900 text-zinc-200 border-zinc-700/80 hover:border-zinc-500 hover:bg-zinc-800 shadow-sm"
                }`}
                title="Home 按鍵"
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
                    ? "bg-zinc-100 text-zinc-950 border-white shadow-xs scale-95"
                    : "bg-zinc-900 text-zinc-100 border-zinc-700/80 hover:border-zinc-500 hover:bg-zinc-800 shadow-md"
                }`}
              >
                X
              </button>
              <button
                {...bindButton("b")}
                className={`absolute bottom-0 w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold transition-colors cursor-pointer select-none active:scale-95 ${
                  state.b
                    ? "bg-zinc-100 text-zinc-950 border-white shadow-xs scale-95"
                    : "bg-zinc-900 text-zinc-100 border-zinc-700/80 hover:border-zinc-500 hover:bg-zinc-800 shadow-md"
                }`}
              >
                B
              </button>
              <button
                {...bindButton("y")}
                className={`absolute left-0 w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold transition-colors cursor-pointer select-none active:scale-95 ${
                  state.y
                    ? "bg-zinc-100 text-zinc-950 border-white shadow-xs scale-95"
                    : "bg-zinc-900 text-zinc-100 border-zinc-700/80 hover:border-zinc-500 hover:bg-zinc-800 shadow-md"
                }`}
              >
                Y
              </button>
              <button
                {...bindButton("a")}
                className={`absolute right-0 w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold transition-colors cursor-pointer select-none active:scale-95 ${
                  state.a
                    ? "bg-zinc-100 text-zinc-950 border-white shadow-xs scale-95"
                    : "bg-zinc-900 text-zinc-100 border-zinc-700/80 hover:border-zinc-500 hover:bg-zinc-800 shadow-md"
                }`}
              >
                A
              </button>
            </div>

            {/* Right Thumbstick (R3) */}
            <div
              ref={rightStickBaseRef}
              onPointerDown={(e) => startStickDrag("right", rightStickBaseRef, rightKnobRef, setIsDraggingRight, e)}
              className={`relative w-18 h-18 rounded-full bg-zinc-950 border transition-all duration-150 select-none shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)] flex items-center justify-center touch-none cursor-grab active:cursor-grabbing pointer-events-auto ${
                isDraggingRight
                  ? "border-white/[0.3] ring-1 ring-white/[0.1]"
                  : "border-white/[0.08] hover:border-white/[0.14]"
              }`}
              title="右類比搖桿"
            >
              <span className="absolute top-1 text-[7px] font-mono text-zinc-600 select-none pointer-events-none">▲</span>
              <span className="absolute bottom-1 text-[7px] font-mono text-zinc-600 select-none pointer-events-none">▼</span>
              <span className="absolute left-1.5 text-[7px] font-mono text-zinc-600 select-none pointer-events-none">◀</span>
              <span className="absolute right-1.5 text-[7px] font-mono text-zinc-600 select-none pointer-events-none">▶</span>

              <div
                ref={rightKnobRef}
                className={`w-11 h-11 rounded-full border flex items-center justify-center text-[10px] font-mono font-bold select-none shadow-sm pointer-events-none ${
                  isDraggingRight ? "transition-none" : "transition-transform duration-100 ease-out"
                } ${
                  state.r_stick_click
                    ? "bg-zinc-100 text-zinc-950 border-white scale-95 shadow-xs"
                    : isDraggingRight || (state.right_stick_x !== 128 || state.right_stick_y !== 128)
                    ? "bg-zinc-200 text-zinc-950 border-white shadow-xs"
                    : "bg-zinc-800 text-zinc-300 border-white/[0.1]"
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
      <div className="pt-1.5 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-zinc-500 shrink-0">
        <span>L: {state.left_stick_x},{state.left_stick_y}</span>
        <span>R: {state.right_stick_x},{state.right_stick_y}</span>
      </div>
    </div>
  );
};
