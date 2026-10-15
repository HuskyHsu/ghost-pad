import React, { useState, useRef, useCallback } from "react";
import { ControllerState, GamepadInfo } from "../types";

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

  // References and states for Draggable Thumbsticks
  const leftStickBaseRef = useRef<HTMLDivElement>(null);
  const rightStickBaseRef = useRef<HTMLDivElement>(null);
  const leftKnobRef = useRef<HTMLDivElement>(null);
  const rightKnobRef = useRef<HTMLDivElement>(null);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);

  const STICK_MAX_TRAVEL = 15; // Travel radius in px for compact mode

  const pressTimeoutsRef = useRef<Record<string, number>>({});
  const pressStartTimesRef = useRef<Record<string, number>>({});

  const handleButtonPress = useCallback(
    (buttonName: string, pressed: boolean) => {
      const now = Date.now();
      if (pressed) {
        if (pressTimeoutsRef.current[buttonName]) {
          clearTimeout(pressTimeoutsRef.current[buttonName]);
          delete pressTimeoutsRef.current[buttonName];
        }
        pressStartTimesRef.current[buttonName] = now;
        onTriggerButton?.(buttonName, true);
      } else {
        const startTime = pressStartTimesRef.current[buttonName] || 0;
        const elapsed = now - startTime;
        const MIN_HOLD_MS = 140;
        if (elapsed < MIN_HOLD_MS) {
          pressTimeoutsRef.current[buttonName] = window.setTimeout(() => {
            delete pressTimeoutsRef.current[buttonName];
            delete pressStartTimesRef.current[buttonName];
            onTriggerButton?.(buttonName, false);
          }, MIN_HOLD_MS - elapsed);
        } else {
          delete pressStartTimesRef.current[buttonName];
          onTriggerButton?.(buttonName, false);
        }
      }
    },
    [onTriggerButton]
  );

  const startStickDrag = (
    stick: "left" | "right",
    baseRef: React.RefObject<HTMLDivElement | null>,
    knobRef: React.RefObject<HTMLDivElement | null>,
    setDragging: (d: boolean) => void,
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    e.preventDefault();
    const base = baseRef.current;
    const knob = knobRef.current;
    if (!base) return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}

    setDragging(true);
    if (knob) {
      knob.style.transition = "none";
    }

    const rect = base.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let totalMoved = 0;

    let targetStickX = 128;
    let targetStickY = 128;
    let lastDispatchedX = 128;
    let lastDispatchedY = 128;
    let rafId: number | null = null;

    const handlePointerMove = (moveEv: PointerEvent) => {
      const dx = moveEv.clientX - centerX;
      const dy = moveEv.clientY - centerY;
      totalMoved += Math.abs(moveEv.movementX || 0) + Math.abs(moveEv.movementY || 0);

      const dist = Math.sqrt(dx * dx + dy * dy);
      const clampedDist = Math.min(dist, STICK_MAX_TRAVEL);
      const angle = Math.atan2(dy, dx);

      const clampedX = clampedDist > 0 ? Math.cos(angle) * clampedDist : 0;
      const clampedY = clampedDist > 0 ? Math.sin(angle) * clampedDist : 0;

      if (knob) {
        knob.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0)`;
      }

      const normX = clampedDist > 0 ? clampedX / STICK_MAX_TRAVEL : 0;
      const normY = clampedDist > 0 ? clampedY / STICK_MAX_TRAVEL : 0;
      targetStickX = Math.round(Math.max(0, Math.min(255, 128 + normX * 127)));
      targetStickY = Math.round(Math.max(0, Math.min(255, 128 - normY * 127)));

      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          if (targetStickX !== lastDispatchedX || targetStickY !== lastDispatchedY) {
            lastDispatchedX = targetStickX;
            lastDispatchedY = targetStickY;
            onTriggerStick?.(stick, targetStickX, targetStickY);
          }
        });
      }
    };

    const handlePointerUp = (upEv: PointerEvent) => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);

      try {
        if (base && base.hasPointerCapture(upEv.pointerId)) {
          base.releasePointerCapture(upEv.pointerId);
        }
      } catch (_) {}

      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      setDragging(false);

      if (knob) {
        knob.style.transition = "transform 0.18s cubic-bezier(0.18, 0.89, 0.32, 1.28)";
        knob.style.transform = "translate3d(0px, 0px, 0)";
      }

      onTriggerStick?.(stick, 128, 128);

      const upDx = upEv.clientX - centerX;
      const upDy = upEv.clientY - centerY;
      const upDist = Math.sqrt(upDx * upDx + upDy * upDy);
      if (totalMoved < 5 || upDist < 5) {
        const btn = stick === "left" ? "l3" : "r3";
        handleButtonPress(btn, true);
        setTimeout(() => handleButtonPress(btn, false), 140);
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  };

  const bindButton = (buttonName: string) => ({
    type: "button" as const,
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch (_) {}
      handleButtonPress(buttonName, true);
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.preventDefault();
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (_) {}
      handleButtonPress(buttonName, false);
    },
    onPointerCancel: (e: React.PointerEvent) => {
      e.preventDefault();
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (_) {}
      handleButtonPress(buttonName, false);
    },
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      if (e.detail === 0) {
        handleButtonPress(buttonName, true);
        setTimeout(() => handleButtonPress(buttonName, false), 140);
      }
    },
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
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80 text-xs shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              activeGamepad && !isMuted ? "bg-emerald-500 animate-pulse" : "bg-zinc-600"
            }`}
          />
          <span className="font-semibold text-xs text-zinc-200 truncate">
            {isMuted ? "已暫停" : activeGamepad?.name || "等待連線"}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onToggleMute}
            className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors flex items-center gap-1 ${
              isMuted
                ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
            }`}
          >
            {isMuted ? "暫停中" : "已啟用"}
          </button>
          <span className="text-[10px] font-mono text-zinc-400">{fps}Hz</span>
        </div>
      </div>

      {/* Rectangular Handheld Controller Chassis */}
      <div className="w-full max-w-[480px] bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3.5 shadow-2xl relative overflow-hidden flex flex-col gap-3 my-auto mx-auto shrink-0">
        {/* Top Edge: Shoulder Buttons (ZL, L, R, ZR) + Brand Header */}
        <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
          {/* Left Shoulder / Triggers */}
          <div className="flex items-center gap-1.5">
            <button
              {...bindButton("zl")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wider border transition-all cursor-pointer select-none active:scale-95 ${
                state.zl
                  ? "bg-white text-zinc-950 border-white shadow-[0_0_10px_rgba(255,255,255,0.8)] scale-95"
                  : "bg-zinc-800/90 text-zinc-200 border-zinc-700 hover:border-zinc-500 hover:bg-zinc-750"
              }`}
              title="ZL 板機鍵"
            >
              ZL
            </button>
            <button
              {...bindButton("l")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider border transition-all cursor-pointer select-none active:scale-95 ${
                state.l
                  ? "bg-white text-zinc-950 border-white shadow-[0_0_10px_rgba(255,255,255,0.8)] scale-95"
                  : "bg-zinc-800/90 text-zinc-300 border-zinc-700 hover:border-zinc-500 hover:bg-zinc-750"
              }`}
              title="L 肩鍵"
            >
              L
            </button>
          </div>

          {/* Center Brand Badge with Reactive Status Indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-950 border border-zinc-700/80 text-[10px] font-mono tracking-widest text-zinc-300 shadow-inner select-none pointer-events-none">
            <span
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                isAnyButtonPressed ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]" : "bg-cyan-600"
              }`}
            />
            <span>GHOST-PAD</span>
          </div>

          {/* Right Shoulder / Triggers */}
          <div className="flex items-center gap-1.5">
            <button
              {...bindButton("r")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider border transition-all cursor-pointer select-none active:scale-95 ${
                state.r
                  ? "bg-white text-zinc-950 border-white shadow-[0_0_10px_rgba(255,255,255,0.8)] scale-95"
                  : "bg-zinc-800/90 text-zinc-300 border-zinc-700 hover:border-zinc-500 hover:bg-zinc-750"
              }`}
              title="R 肩鍵"
            >
              R
            </button>
            <button
              {...bindButton("zr")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wider border transition-all cursor-pointer select-none active:scale-95 ${
                state.zr
                  ? "bg-white text-zinc-950 border-white shadow-[0_0_10px_rgba(255,255,255,0.8)] scale-95"
                  : "bg-zinc-800/90 text-zinc-200 border-zinc-700 hover:border-zinc-500 hover:bg-zinc-750"
              }`}
              title="ZR 板機鍵"
            >
              ZR
            </button>
          </div>
        </div>

        {/* Main Controls Grid: Left Flank (Stick + D-Pad), Center (System Buttons), Right Flank (ABXY + Stick) */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-1">
          {/* Left Flank */}
          <div className="flex flex-col items-center justify-between gap-3">
            {/* Left Thumbstick (L3) */}
            <div
              ref={leftStickBaseRef}
              onPointerDown={(e) => startStickDrag("left", leftStickBaseRef, leftKnobRef, setIsDraggingLeft, e)}
              className={`relative w-18 h-18 rounded-full bg-zinc-950 border-2 transition-colors duration-150 select-none shadow-inner flex items-center justify-center touch-none cursor-grab active:cursor-grabbing pointer-events-auto ${
                isDraggingLeft
                  ? "border-cyan-400 ring-2 ring-cyan-500/30 shadow-[0_0_14px_rgba(34,211,238,0.35)]"
                  : "border-zinc-700/80 hover:border-zinc-500"
              }`}
              title="左類比搖桿 (按住拖曳移動，輕點為 L3 下壓)"
            >
              <span className="absolute top-1 text-[7px] font-mono text-zinc-600 select-none pointer-events-none">▲</span>
              <span className="absolute bottom-1 text-[7px] font-mono text-zinc-600 select-none pointer-events-none">▼</span>
              <span className="absolute left-1.5 text-[7px] font-mono text-zinc-600 select-none pointer-events-none">◀</span>
              <span className="absolute right-1.5 text-[7px] font-mono text-zinc-600 select-none pointer-events-none">▶</span>

              <div
                ref={leftKnobRef}
                className={`w-11 h-11 rounded-full border-2 flex items-center justify-center text-[10px] font-black select-none shadow-md pointer-events-none ${
                  isDraggingLeft ? "transition-none" : "transition-transform duration-100 ease-out"
                } ${
                  state.l_stick_click
                    ? "bg-white text-zinc-950 border-white shadow-[0_0_12px_rgba(255,255,255,0.7)] scale-95"
                    : isDraggingLeft || (state.left_stick_x !== 128 || state.left_stick_y !== 128)
                    ? "bg-gradient-to-br from-cyan-600 via-zinc-800 to-zinc-950 text-cyan-200 border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                    : "bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-900 text-zinc-100 border-zinc-500"
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

            {/* D-Pad (Classic Cross) */}
            <div className="relative w-20 h-20 flex items-center justify-center select-none pointer-events-auto">
              <div className="absolute w-7 h-20 bg-zinc-950 border border-zinc-700 rounded-md shadow-md pointer-events-none" />
              <div className="absolute w-20 h-7 bg-zinc-950 border border-zinc-700 rounded-md shadow-md pointer-events-none" />
              <button
                {...bindButton("dpad_up")}
                className={`absolute top-0 w-7 h-7 rounded-t flex items-center justify-center text-xs font-black transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                  isUp ? "bg-white text-zinc-950 shadow-md" : "text-zinc-300 hover:text-white hover:bg-zinc-800/80"
                }`}
                title="十字鍵 上"
              >
                ▲
              </button>
              <button
                {...bindButton("dpad_down")}
                className={`absolute bottom-0 w-7 h-7 rounded-b flex items-center justify-center text-xs font-black transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                  isDown ? "bg-white text-zinc-950 shadow-md" : "text-zinc-300 hover:text-white hover:bg-zinc-800/80"
                }`}
                title="十字鍵 下"
              >
                ▼
              </button>
              <button
                {...bindButton("dpad_left")}
                className={`absolute left-0 w-7 h-7 rounded-l flex items-center justify-center text-xs font-black transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                  isLeft ? "bg-white text-zinc-950 shadow-md" : "text-zinc-300 hover:text-white hover:bg-zinc-800/80"
                }`}
                title="十字鍵 左"
              >
                ◀
              </button>
              <button
                {...bindButton("dpad_right")}
                className={`absolute right-0 w-7 h-7 rounded-r flex items-center justify-center text-xs font-black transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                  isRight ? "bg-white text-zinc-950 shadow-md" : "text-zinc-300 hover:text-white hover:bg-zinc-800/80"
                }`}
                title="十字鍵 右"
              >
                ▶
              </button>
              <div className="w-4 h-4 rounded-full bg-zinc-900 border border-zinc-700 z-10 pointer-events-none" />
            </div>
          </div>

          {/* Center Column: System controls (- / + / Capture / Home) and Cute Mini Face */}
          <div className="flex flex-col items-center justify-between h-full py-2 gap-4">
            {/* Minus & Plus */}
            <div className="flex items-center gap-5">
              <button
                {...bindButton("minus")}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border transition-colors cursor-pointer select-none active:scale-95 ${
                  state.minus
                    ? "bg-white text-zinc-950 border-white shadow-[0_0_8px_rgba(255,255,255,0.7)]"
                    : "bg-zinc-800/90 text-zinc-200 border-zinc-650 hover:border-zinc-400"
                }`}
                title="Minus 按鍵 (減號)"
              >
                −
              </button>
              <button
                {...bindButton("plus")}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border transition-colors cursor-pointer select-none active:scale-95 ${
                  state.plus
                    ? "bg-white text-zinc-950 border-white shadow-[0_0_8px_rgba(255,255,255,0.7)]"
                    : "bg-zinc-800/90 text-zinc-200 border-zinc-650 hover:border-zinc-400"
                }`}
                title="Plus 按鍵 (加號)"
              >
                +
              </button>
            </div>

            {/* Minimalist Cute Expression Screen */}
            <div className="w-14 h-9 rounded-xl bg-zinc-950/80 border border-zinc-800/90 flex items-center justify-center p-1 shadow-inner select-none">
              <svg viewBox="0 0 70 30" className="w-full h-full">
                <circle cx="22" cy="12" r="3" fill="#e4e4e7" />
                <circle cx="48" cy="12" r="3" fill="#e4e4e7" />
                {isAnyButtonPressed ? (
                  <path
                    d="M 28, 18 Q 32, 22 35, 18 Q 38, 22 42, 18"
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                ) : (
                  <path
                    d="M 28, 17 Q 35, 23 42, 17"
                    fill="none"
                    stroke="#a1a1aa"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                )}
              </svg>
            </div>

            {/* Capture & Home */}
            <div className="flex items-center gap-5">
              <button
                {...bindButton("capture")}
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold border transition-colors cursor-pointer select-none active:scale-95 ${
                  state.capture
                    ? "bg-white text-zinc-950 border-white shadow-[0_0_8px_rgba(255,255,255,0.7)]"
                    : "bg-zinc-800/90 text-zinc-200 border-zinc-650 hover:border-zinc-400"
                }`}
                title="Capture 按鍵 (截圖)"
              >
                ◉
              </button>
              <button
                {...bindButton("home")}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs border transition-colors cursor-pointer select-none active:scale-95 ${
                  state.home
                    ? "bg-cyan-400 text-zinc-950 border-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.9)]"
                    : "bg-zinc-800/90 text-zinc-200 border-zinc-650 ring-1 ring-cyan-500/30 hover:border-zinc-400"
                }`}
                title="Home 按鍵 (主畫面)"
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
                className={`absolute top-0 w-7 h-7 rounded-full border border-zinc-600 flex items-center justify-center text-xs font-black transition-colors cursor-pointer select-none active:scale-95 ${
                  state.x
                    ? "bg-white text-zinc-950 border-white shadow-[0_0_10px_rgba(255,255,255,0.7)] scale-95"
                    : "bg-zinc-800/90 text-zinc-100 hover:border-zinc-400 shadow-xs"
                }`}
                title="X 按鍵"
              >
                X
              </button>
              <button
                {...bindButton("b")}
                className={`absolute bottom-0 w-7 h-7 rounded-full border border-zinc-600 flex items-center justify-center text-xs font-black transition-colors cursor-pointer select-none active:scale-95 ${
                  state.b
                    ? "bg-white text-zinc-950 border-white shadow-[0_0_10px_rgba(255,255,255,0.7)] scale-95"
                    : "bg-zinc-800/90 text-zinc-100 hover:border-zinc-400 shadow-xs"
                }`}
                title="B 按鍵"
              >
                B
              </button>
              <button
                {...bindButton("y")}
                className={`absolute left-0 w-7 h-7 rounded-full border border-zinc-600 flex items-center justify-center text-xs font-black transition-colors cursor-pointer select-none active:scale-95 ${
                  state.y
                    ? "bg-white text-zinc-950 border-white shadow-[0_0_10px_rgba(255,255,255,0.7)] scale-95"
                    : "bg-zinc-800/90 text-zinc-100 hover:border-zinc-400 shadow-xs"
                }`}
                title="Y 按鍵"
              >
                Y
              </button>
              <button
                {...bindButton("a")}
                className={`absolute right-0 w-7 h-7 rounded-full border border-zinc-600 flex items-center justify-center text-xs font-black transition-colors cursor-pointer select-none active:scale-95 ${
                  state.a
                    ? "bg-white text-zinc-950 border-white shadow-[0_0_10px_rgba(255,255,255,0.7)] scale-95"
                    : "bg-zinc-800/90 text-zinc-100 hover:border-zinc-400 shadow-xs"
                }`}
                title="A 按鍵"
              >
                A
              </button>
            </div>

            {/* Right Thumbstick (R3) */}
            <div
              ref={rightStickBaseRef}
              onPointerDown={(e) => startStickDrag("right", rightStickBaseRef, rightKnobRef, setIsDraggingRight, e)}
              className={`relative w-18 h-18 rounded-full bg-zinc-950 border-2 transition-colors duration-150 select-none shadow-inner flex items-center justify-center touch-none cursor-grab active:cursor-grabbing pointer-events-auto ${
                isDraggingRight
                  ? "border-cyan-400 ring-2 ring-cyan-500/30 shadow-[0_0_14px_rgba(34,211,238,0.35)]"
                  : "border-zinc-700/80 hover:border-zinc-500"
              }`}
              title="右類比搖桿 (按住拖曳移動，輕點為 R3 下壓)"
            >
              <span className="absolute top-1 text-[7px] font-mono text-zinc-600 select-none pointer-events-none">▲</span>
              <span className="absolute bottom-1 text-[7px] font-mono text-zinc-600 select-none pointer-events-none">▼</span>
              <span className="absolute left-1.5 text-[7px] font-mono text-zinc-600 select-none pointer-events-none">◀</span>
              <span className="absolute right-1.5 text-[7px] font-mono text-zinc-600 select-none pointer-events-none">▶</span>

              <div
                ref={rightKnobRef}
                className={`w-11 h-11 rounded-full border-2 flex items-center justify-center text-[10px] font-black select-none shadow-md pointer-events-none ${
                  isDraggingRight ? "transition-none" : "transition-transform duration-100 ease-out"
                } ${
                  state.r_stick_click
                    ? "bg-white text-zinc-950 border-white shadow-[0_0_12px_rgba(255,255,255,0.7)] scale-95"
                    : isDraggingRight || (state.right_stick_x !== 128 || state.right_stick_y !== 128)
                    ? "bg-gradient-to-br from-cyan-600 via-zinc-800 to-zinc-950 text-cyan-200 border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                    : "bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-900 text-zinc-100 border-zinc-500"
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
      <div className="pt-1.5 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono text-zinc-400 shrink-0">
        <span>L: {state.left_stick_x},{state.left_stick_y}</span>
        <span>R: {state.right_stick_x},{state.right_stick_y}</span>
      </div>
    </div>
  );
};
