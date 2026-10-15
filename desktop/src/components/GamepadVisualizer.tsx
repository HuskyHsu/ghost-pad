import React, { useState, useRef, useCallback } from "react";
import { ControllerState } from "../types";
import { Activity, Terminal, Keyboard, X as CloseIcon } from "lucide-react";
import { KEYBOARD_GUIDE } from "../hooks/useVirtualGamepad";

interface Props {
  state: ControllerState;
  gamepadName?: string;
  isMuted?: boolean;
  fps?: number;
  onTriggerButton?: (button: string, pressed: boolean) => void;
  onTriggerStick?: (stick: "left" | "right", x: number, y: number) => void;
}

export const GamepadVisualizer: React.FC<Props> = ({
  state,
  gamepadName,
  isMuted = false,
  fps = 100,
  onTriggerButton,
  onTriggerStick,
}) => {
  const [showKeyGuide, setShowKeyGuide] = useState(false);

  // References and states for Draggable Thumbsticks
  const leftStickBaseRef = React.useRef<HTMLDivElement>(null);
  const rightStickBaseRef = React.useRef<HTMLDivElement>(null);
  const leftKnobRef = React.useRef<HTMLDivElement>(null);
  const rightKnobRef = React.useRef<HTMLDivElement>(null);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);

  const STICK_MAX_TRAVEL = 22; // Travel radius in px

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

      // 1. Direct hardware-accelerated DOM update: ZERO latency / buttery smooth 120Hz tracking
      if (knob) {
        knob.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0)`;
      }

      // 2. Compute Switch stick coords (0..255):
      const normX = clampedDist > 0 ? clampedX / STICK_MAX_TRAVEL : 0;
      const normY = clampedDist > 0 ? clampedY / STICK_MAX_TRAVEL : 0;
      targetStickX = Math.round(Math.max(0, Math.min(255, 128 + normX * 127)));
      targetStickY = Math.round(Math.max(0, Math.min(255, 128 - normY * 127)));

      // 3. Throttle IPC to 60Hz via requestAnimationFrame to avoid queue congestion
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

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);

      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      setDragging(false);

      // Snap back with smooth tactile spring bounce
      if (knob) {
        knob.style.transition = "transform 0.18s cubic-bezier(0.18, 0.89, 0.32, 1.28)";
        knob.style.transform = "translate3d(0px, 0px, 0)";
      }

      // Send neutral center
      onTriggerStick?.(stick, 128, 128);

      // If user tapped without dragging, trigger L3/R3 click
      if (totalMoved < 6) {
        const btn = stick === "left" ? "l3" : "r3";
        onTriggerButton?.(btn, true);
        setTimeout(() => {
          onTriggerButton?.(btn, false);
        }, 120);
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  };

  // Helper for on-screen mouse click / touch triggers with pulse holding
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
        const MIN_HOLD_MS = 140; // 140ms ensures crisp, visible glow and packet update even on rapid tap
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

  const bindButton = (buttonName: string) => ({
    type: "button" as const,
    onPointerDown: (e: React.PointerEvent) => {
      e.stopPropagation();
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch (_) {}
      handleButtonPress(buttonName, true);
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.stopPropagation();
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (_) {}
      handleButtonPress(buttonName, false);
    },
    onPointerCancel: (e: React.PointerEvent) => {
      e.stopPropagation();
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (_) {}
      handleButtonPress(buttonName, false);
    },
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      handleButtonPress(buttonName, true);
      setTimeout(() => handleButtonPress(buttonName, false), 140);
    },
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

  // Compute Raw UARTSwitchCon 9-Byte Hex string
  const computeRawHex = () => {
    let btnHi = 0;
    if (state.minus) btnHi |= 1 << 0;
    if (state.plus) btnHi |= 1 << 1;
    if (state.home) btnHi |= 1 << 2;
    if (state.capture) btnHi |= 1 << 3;
    if (state.l_stick_click) btnHi |= 1 << 4;
    if (state.r_stick_click) btnHi |= 1 << 5;

    let btnLo = 0;
    if (state.y) btnLo |= 1 << 0;
    if (state.b) btnLo |= 1 << 1;
    if (state.a) btnLo |= 1 << 2;
    if (state.x) btnLo |= 1 << 3;
    if (state.l) btnLo |= 1 << 4;
    if (state.r) btnLo |= 1 << 5;
    if (state.zl) btnLo |= 1 << 6;
    if (state.zr) btnLo |= 1 << 7;

    const dpad = dpadVal;
    const lx = state.left_stick_x;
    const ly = 255 - state.left_stick_y;
    const rx = state.right_stick_x;
    const ry = 255 - state.right_stick_y;

    const hex = (n: number) => n.toString(16).padStart(2, "0").toUpperCase();
    return `${hex(btnHi)} ${hex(btnLo)} ${hex(dpad)} ${hex(lx)} ${hex(ly)} ${hex(rx)} ${hex(ry)} 00`;
  };

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
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950 relative">
      {/* Top Header Bar */}
      <div className="h-14 px-6 border-b border-zinc-800/80 flex items-center justify-between shrink-0 bg-zinc-950/60 backdrop-blur-sm z-30">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              gamepadName && !isMuted ? "bg-emerald-500 animate-pulse" : "bg-zinc-600"
            }`}
          />
          <span className="font-semibold text-xs text-zinc-100">
            {isMuted ? "手把訊號暫停中" : gamepadName || "等待實體控制器連線"}
          </span>
        </div>

        <div className="flex items-center gap-2.5 text-xs text-zinc-400 font-mono">
          {/* Keyboard Guide Toggle Button */}
          <button
            onClick={() => setShowKeyGuide(!showKeyGuide)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-700/80 hover:border-zinc-500 text-zinc-200 transition-colors shadow-xs"
            title="查看電腦鍵盤對應手把鍵位"
          >
            <Keyboard className="w-3.5 h-3.5 text-cyan-400" />
            <span>鍵盤對照表</span>
          </button>

          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800">
            <Activity className="w-3.5 h-3.5 text-zinc-400" />
            <span>{fps} Hz</span>
          </span>
        </div>
      </div>

      {/* Keyboard Guide Modal Overlay */}
      {showKeyGuide && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-100 font-semibold text-sm">
                <Keyboard className="w-4 h-4 text-cyan-400" />
                <span>電腦鍵盤操作對照表 (3條輸入路線之一)</span>
              </div>
              <button
                onClick={() => setShowKeyGuide(false)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 text-xs">
              <p className="text-zinc-400 leading-relaxed text-[11px]">
                支援三路並行：無論按下實體手把、敲擊電腦鍵盤、或直接用滑鼠點擊螢幕上的幽靈手把按鈕，皆會觸發實體訊號並同步顯示回饋！
              </p>

              <div className="grid grid-cols-2 gap-2">
                {KEYBOARD_GUIDE.map((item) => (
                  <div
                    key={item.key}
                    className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded font-mono font-bold bg-zinc-800 text-cyan-300 border border-zinc-700 text-[11px]">
                        {item.key}
                      </span>
                      <span className="text-zinc-400 text-[11px]">{item.label}</span>
                    </div>
                    <span className="font-bold text-zinc-200 text-xs px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                      {item.button}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-zinc-950 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => setShowKeyGuide(false)}
                className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-100 font-medium transition-colors"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Canvas Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-between max-w-4xl mx-auto w-full space-y-6">
        {/* Cute Static Ghost Controller Stage (No Bobbing) */}
        <div className="relative w-full max-w-[620px] h-[390px] mx-auto select-none flex items-center justify-center shrink-0">
          {/* SVG Cute Ghost Silhouette with Raised Little Hands (Boo! 👻) & Kawaii Face */}
          <svg
            viewBox="0 0 620 390"
            className="absolute inset-0 w-full h-full drop-shadow-[0_22px_50px_rgba(0,0,0,0.85)] pointer-events-none"
          >
            <defs>
              {/* Frosted Translucent Ghost Sheet Gradient */}
              <linearGradient id="cuteGhostGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#30303c" stopOpacity="0.94" />
                <stop offset="30%" stopColor="#22222c" stopOpacity="0.95" />
                <stop offset="70%" stopColor="#15151c" stopOpacity="0.97" />
                <stop offset="100%" stopColor="#0c0c11" stopOpacity="0.99" />
              </linearGradient>

              {/* Hand Aura Gradients */}
              <radialGradient id="handGlowGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Reactive Left Hand Glow Aura (Higher) */}
            {isLeftHandActive && (
              <ellipse cx="110" cy="42" rx="85" ry="45" fill="url(#handGlowGrad)" />
            )}

            {/* Reactive Right Hand Glow Aura (Lower & Asymmetric) */}
            {isRightHandActive && (
              <ellipse cx="515" cy="54" rx="85" ry="45" fill="url(#handGlowGrad)" />
            )}

            {/* Asymmetric Ghost Silhouette with Playful Raised Hands (Left high, Right waved) */}
            <path
              d="M 310, 38
                 C 352, 38, 385, 49, 406, 75
                 C 416, 85, 428, 87, 442, 75
                 C 465, 54, 492, 28, 532, 26
                 C 564, 25, 588, 44, 584, 70
                 C 580, 95, 568, 130, 562, 168
                 C 553, 215, 558, 272, 550, 345
                 C 530, 328, 514, 362, 494, 346
                 C 474, 328, 458, 362, 438, 346
                 C 418, 328, 402, 362, 374, 346
                 C 346, 328, 330, 362, 308, 346
                 C 286, 362, 270, 328, 242, 346
                 C 214, 362, 198, 328, 178, 346
                 C 158, 362, 142, 328, 122, 346
                 C 102, 362, 86, 328, 66, 345
                 C 58, 270, 64, 210, 54, 160
                 C 46, 118, 34, 80, 30, 55
                 C 26, 30, 46, 12, 78, 14
                 C 120, 16, 150, 46, 170, 70
                 C 186, 84, 200, 84, 210, 74
                 C 230, 46, 264, 38, 310, 38 Z"
              fill="url(#cuteGhostGrad)"
              stroke="rgba(255, 255, 255, 0.3)"
              strokeWidth="2.2"
            />

            {/* Asymmetric Underarm & Cloth Drape Creases */}
            <path
              d="M 170, 70 C 152, 105 136, 165 128, 230"
              fill="none"
              stroke="rgba(255, 255, 255, 0.14)"
              strokeWidth="1.2"
              strokeDasharray="4 2"
            />
            <path
              d="M 442, 75 C 462, 112 482, 172 490, 235"
              fill="none"
              stroke="rgba(255, 255, 255, 0.14)"
              strokeWidth="1.2"
              strokeDasharray="4 2"
            />
            <path
              d="M 310, 38 C 310, 120 310, 240 310, 346"
              fill="none"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth="1"
            />

            {/* DITTO MINIMALIST FACE (百變怪純真線條表情，無腮紅) */}
            {/* Simple Beady Dot Eyes (•   •) */}
            <circle cx="282" cy="88" r="3.6" fill="#f4f4f5" />
            <circle cx="338" cy="88" r="3.6" fill="#f4f4f5" />

            {/* Ditto Minimalist Line Mouth ( ︶ / ~ ) */}
            {isAnyButtonPressed ? (
              /* Quirky Wavy Smile when pressing buttons */
              <path
                d="M 302, 95 Q 306, 98.5 310, 95 Q 314, 98.5 318, 95"
                fill="none"
                stroke="#22d3ee"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            ) : (
              /* Classic Relaxed Ditto Smile */
              <path
                d="M 302, 95 Q 310, 100 318, 95"
                fill="none"
                stroke="#f4f4f5"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            )}
          </svg>

          {/* Asymmetric Raised Little Ghost Hands (Boo! 👻 with ZL, L, R, ZR) */}
          <div className="absolute top-[12px] left-[36px] right-[36px] flex justify-between items-start z-30 pointer-events-auto">
            {/* Left Raised Ghost Hand (Higher, slightly jaunty angle) */}
            <div
              className={`flex items-center gap-2 p-1.5 rounded-2xl transition-all duration-200 rotate-[-2deg] pointer-events-auto ${
                isLeftHandActive
                  ? "bg-cyan-500/15 ring-2 ring-cyan-400/60 shadow-[0_0_25px_rgba(34,211,238,0.35)]"
                  : "bg-zinc-900/40 border border-white/5"
              }`}
            >
              <button
                {...bindButton("zl")}
                className={`w-[74px] py-2.5 text-center rounded-xl text-xs font-black tracking-wider border-2 transition-all cursor-pointer pointer-events-auto select-none active:scale-95 ${
                  state.zl
                    ? "bg-white text-zinc-950 border-white shadow-[0_0_18px_rgba(255,255,255,0.8)] scale-95"
                    : "bg-zinc-800/90 text-zinc-100 border-zinc-600 hover:border-zinc-400 shadow-md ring-1 ring-white/10"
                }`}
                title="ZL 按鍵 (左板機鍵 - 鍵盤: U 或 1)"
              >
                ZL
              </button>
              <button
                {...bindButton("l")}
                className={`w-[66px] py-2.5 text-center rounded-xl text-xs font-black tracking-wider border-2 transition-all cursor-pointer pointer-events-auto select-none active:scale-95 ${
                  state.l
                    ? "bg-white text-zinc-950 border-white shadow-[0_0_18px_rgba(255,255,255,0.8)] scale-95"
                    : "bg-zinc-800/90 text-zinc-100 border-zinc-600 hover:border-zinc-400 shadow-md ring-1 ring-white/10"
                }`}
                title="L 按鍵 (左肩鍵 - 鍵盤: Q)"
              >
                L
              </button>
            </div>

            {/* Right Raised Ghost Hand (Slightly lower & waved at a gentle angle) */}
            <div
              className={`flex items-center gap-2 p-1.5 rounded-2xl transition-all duration-200 mt-2.5 rotate-[3deg] pointer-events-auto ${
                isRightHandActive
                  ? "bg-cyan-500/15 ring-2 ring-cyan-400/60 shadow-[0_0_25px_rgba(34,211,238,0.35)]"
                  : "bg-zinc-900/40 border border-white/5"
              }`}
            >
              <button
                {...bindButton("r")}
                className={`w-[66px] py-2.5 text-center rounded-xl text-xs font-black tracking-wider border-2 transition-all cursor-pointer pointer-events-auto select-none active:scale-95 ${
                  state.r
                    ? "bg-white text-zinc-950 border-white shadow-[0_0_18px_rgba(255,255,255,0.8)] scale-95"
                    : "bg-zinc-800/90 text-zinc-100 border-zinc-600 hover:border-zinc-400 shadow-md ring-1 ring-white/10"
                }`}
                title="R 按鍵 (右肩鍵 - 鍵盤: E)"
              >
                R
              </button>
              <button
                {...bindButton("zr")}
                className={`w-[74px] py-2.5 text-center rounded-xl text-xs font-black tracking-wider border-2 transition-all cursor-pointer pointer-events-auto select-none active:scale-95 ${
                  state.zr
                    ? "bg-white text-zinc-950 border-white shadow-[0_0_18px_rgba(255,255,255,0.8)] scale-95"
                    : "bg-zinc-800/90 text-zinc-100 border-zinc-600 hover:border-zinc-400 shadow-md ring-1 ring-white/10"
                }`}
                title="ZR 按鍵 (右板機鍵 - 鍵盤: O 或 2)"
              >
                ZR
              </button>
            </div>
          </div>

          {/* Main Controls Grid Embedded in the Ghost Torso - Spacious & Large */}
          <div className="w-full h-full pt-[82px] pb-[25px] px-[45px] grid grid-cols-3 items-center z-10 pointer-events-none">
            {/* Left Flank: Stick (L3) & D-Pad - Large & Concentric */}
            <div className="flex flex-col items-center justify-around h-full py-1">
              {/* Left Thumbstick (L3) - Draggable & Clickable */}
              <div
                ref={leftStickBaseRef}
                onPointerDown={(e) => startStickDrag("left", leftStickBaseRef, leftKnobRef, setIsDraggingLeft, e)}
                className={`relative w-24 h-24 rounded-full bg-zinc-950 border-2 transition-colors duration-150 select-none shadow-inner flex items-center justify-center touch-none cursor-grab active:cursor-grabbing ${
                  isDraggingLeft
                    ? "border-cyan-400 ring-4 ring-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.35)]"
                    : "border-zinc-700/80 ring-1 ring-white/10 hover:border-zinc-500"
                }`}
                title="左類比搖桿 (按住可任意拖曳移動上下左右，輕點為 L3 下壓)"
              >
                {/* Subtle Direction Guide Markers */}
                <span className="absolute top-1 text-[8px] font-mono text-zinc-600 select-none pointer-events-none">▲</span>
                <span className="absolute bottom-1 text-[8px] font-mono text-zinc-600 select-none pointer-events-none">▼</span>
                <span className="absolute left-1.5 text-[8px] font-mono text-zinc-600 select-none pointer-events-none">◀</span>
                <span className="absolute right-1.5 text-[8px] font-mono text-zinc-600 select-none pointer-events-none">▶</span>

                <div
                  ref={leftKnobRef}
                  className={`w-14 h-14 rounded-full border-2 flex items-center justify-center text-xs font-black select-none shadow-xl pointer-events-none ${
                    isDraggingLeft ? "transition-none" : "transition-transform duration-100 ease-out"
                  } ${
                    state.l_stick_click
                      ? "bg-white text-zinc-950 border-white shadow-[0_0_15px_rgba(255,255,255,0.7)] scale-95"
                      : isDraggingLeft || (state.left_stick_x !== 128 || state.left_stick_y !== 128)
                      ? "bg-gradient-to-br from-cyan-600 via-zinc-800 to-zinc-950 text-cyan-200 border-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.5)]"
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

              {/* D-Pad (Classic Cross - Larger & Distinct) */}
              <div className="relative w-26 h-26 flex items-center justify-center select-none">
                <div className="absolute w-9 h-26 bg-zinc-950 border-2 border-zinc-600 rounded-md shadow-lg ring-1 ring-white/10 pointer-events-none" />
                <div className="absolute w-26 h-9 bg-zinc-950 border-2 border-zinc-600 rounded-md shadow-lg ring-1 ring-white/10 pointer-events-none" />

                <button
                  {...bindButton("dpad_up")}
                  className={`absolute top-0 w-9 h-9 rounded-t flex items-center justify-center text-sm font-black transition-colors cursor-pointer select-none active:scale-95 ${
                    isUp ? "bg-white text-zinc-950 shadow-md" : "text-zinc-200 hover:text-white"
                  }`}
                >
                  ▲
                </button>
                <button
                  {...bindButton("dpad_down")}
                  className={`absolute bottom-0 w-9 h-9 rounded-b flex items-center justify-center text-sm font-black transition-colors cursor-pointer select-none active:scale-95 ${
                    isDown ? "bg-white text-zinc-950 shadow-md" : "text-zinc-200 hover:text-white"
                  }`}
                >
                  ▼
                </button>
                <button
                  {...bindButton("dpad_left")}
                  className={`absolute left-0 w-9 h-9 rounded-l flex items-center justify-center text-sm font-black transition-colors cursor-pointer select-none active:scale-95 ${
                    isLeft ? "bg-white text-zinc-950 shadow-md" : "text-zinc-200 hover:text-white"
                  }`}
                >
                  ◀
                </button>
                <button
                  {...bindButton("dpad_right")}
                  className={`absolute right-0 w-9 h-9 rounded-r flex items-center justify-center text-sm font-black transition-colors cursor-pointer select-none active:scale-95 ${
                    isRight ? "bg-white text-zinc-950 shadow-md" : "text-zinc-200 hover:text-white"
                  }`}
                >
                  ▶
                </button>
                <div className="w-5 h-5 rounded-full bg-zinc-900 border border-zinc-650 z-10 pointer-events-none" />
              </div>
            </div>

            {/* Center Column: System Controls below the Kawaii Face */}
            <div className="flex flex-col items-center justify-around h-full py-1">
              {/* Minus (-) & Plus (+) Buttons - Larger & Distinct */}
              <div className="flex items-center gap-10">
                <button
                  {...bindButton("minus")}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-base font-black border-2 transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    state.minus
                      ? "bg-white text-zinc-950 border-white shadow-[0_0_12px_rgba(255,255,255,0.7)]"
                      : "bg-zinc-800/90 text-zinc-100 border-zinc-600 hover:border-zinc-400 shadow-md ring-1 ring-white/10"
                  }`}
                  title="Minus 按鍵 (減號)"
                >
                  −
                </button>
                <button
                  {...bindButton("plus")}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-base font-black border-2 transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    state.plus
                      ? "bg-white text-zinc-950 border-white shadow-[0_0_12px_rgba(255,255,255,0.7)]"
                      : "bg-zinc-800/90 text-zinc-100 border-zinc-600 hover:border-zinc-400 shadow-md ring-1 ring-white/10"
                  }`}
                  title="Plus 按鍵 (加號)"
                >
                  +
                </button>
              </div>

              {/* Ethereal Floating Ghost Badge */}
              <div className="px-4 py-1 rounded-full text-[11px] font-mono tracking-widest text-zinc-100 border-2 border-zinc-600 bg-zinc-950/95 shadow-md flex items-center gap-2 select-none pointer-events-none">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
                <span>GHOST-PAD</span>
              </div>

              {/* Capture & Home - Larger & Distinct */}
              <div className="flex items-center gap-10 pb-1">
                <button
                  {...bindButton("capture")}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold border-2 transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    state.capture
                      ? "bg-white text-zinc-950 border-white shadow-[0_0_12px_rgba(255,255,255,0.7)]"
                      : "bg-zinc-800/90 text-zinc-200 border-zinc-600 hover:border-zinc-400 shadow-md ring-1 ring-white/10"
                  }`}
                  title="Capture 按鍵 (截圖)"
                >
                  ◉
                </button>
                <button
                  {...bindButton("home")}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-base border-2 transition-colors relative cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    state.home
                      ? "bg-cyan-400 text-zinc-950 border-cyan-300 shadow-[0_0_16px_rgba(6,182,212,0.9)]"
                      : "bg-zinc-800/90 text-zinc-200 border-zinc-600 ring-1 ring-cyan-500/40 hover:border-zinc-400 shadow-md"
                  }`}
                  title="Home 按鍵 (主畫面)"
                >
                  ⌂
                </button>
              </div>
            </div>

            {/* Right Flank: ABXY & Right Stick (R3) - Larger & Concentric */}
            <div className="flex flex-col items-center justify-around h-full py-1">
              {/* ABXY Diamond - Prominent Large Buttons */}
              <div className="relative w-26 h-26 flex items-center justify-center select-none">
                <button
                  {...bindButton("x")}
                  className={`absolute top-0 w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-black transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    state.x
                      ? "bg-white text-zinc-950 border-white shadow-[0_0_15px_rgba(255,255,255,0.7)] scale-95"
                      : "bg-zinc-800/90 text-zinc-100 border-zinc-550 hover:border-zinc-400 shadow-md ring-1 ring-white/10"
                  }`}
                >
                  X
                </button>
                <button
                  {...bindButton("b")}
                  className={`absolute bottom-0 w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-black transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    state.b
                      ? "bg-white text-zinc-950 border-white shadow-[0_0_15px_rgba(255,255,255,0.7)] scale-95"
                      : "bg-zinc-800/90 text-zinc-100 border-zinc-550 hover:border-zinc-400 shadow-md ring-1 ring-white/10"
                  }`}
                >
                  B
                </button>
                <button
                  {...bindButton("y")}
                  className={`absolute left-0 w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-black transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    state.y
                      ? "bg-white text-zinc-950 border-white shadow-[0_0_15px_rgba(255,255,255,0.7)] scale-95"
                      : "bg-zinc-800/90 text-zinc-100 border-zinc-550 hover:border-zinc-400 shadow-md ring-1 ring-white/10"
                  }`}
                >
                  Y
                </button>
                <button
                  {...bindButton("a")}
                  className={`absolute right-0 w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-black transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    state.a
                      ? "bg-white text-zinc-950 border-white shadow-[0_0_15px_rgba(255,255,255,0.7)] scale-95"
                      : "bg-zinc-800/90 text-zinc-100 border-zinc-550 hover:border-zinc-400 shadow-md ring-1 ring-white/10"
                  }`}
                >
                  A
                </button>
              </div>

              {/* Right Thumbstick (R3) - Draggable & Clickable */}
              <div
                ref={rightStickBaseRef}
                onPointerDown={(e) => startStickDrag("right", rightStickBaseRef, rightKnobRef, setIsDraggingRight, e)}
                className={`relative w-24 h-24 rounded-full bg-zinc-950 border-2 transition-colors duration-150 select-none shadow-inner flex items-center justify-center touch-none cursor-grab active:cursor-grabbing ${
                  isDraggingRight
                    ? "border-cyan-400 ring-4 ring-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.35)]"
                    : "border-zinc-700/80 ring-1 ring-white/10 hover:border-zinc-500"
                }`}
                title="右類比搖桿 (按住可任意拖曳移動上下左右，輕點為 R3 下壓)"
              >
                {/* Subtle Direction Guide Markers */}
                <span className="absolute top-1 text-[8px] font-mono text-zinc-600 select-none pointer-events-none">▲</span>
                <span className="absolute bottom-1 text-[8px] font-mono text-zinc-600 select-none pointer-events-none">▼</span>
                <span className="absolute left-1.5 text-[8px] font-mono text-zinc-600 select-none pointer-events-none">◀</span>
                <span className="absolute right-1.5 text-[8px] font-mono text-zinc-600 select-none pointer-events-none">▶</span>

                <div
                  ref={rightKnobRef}
                  className={`w-14 h-14 rounded-full border-2 flex items-center justify-center text-xs font-black select-none shadow-xl pointer-events-none ${
                    isDraggingRight ? "transition-none" : "transition-transform duration-100 ease-out"
                  } ${
                    state.r_stick_click
                      ? "bg-white text-zinc-950 border-white shadow-[0_0_15px_rgba(255,255,255,0.7)] scale-95"
                      : isDraggingRight || (state.right_stick_x !== 128 || state.right_stick_y !== 128)
                      ? "bg-gradient-to-br from-cyan-600 via-zinc-800 to-zinc-950 text-cyan-200 border-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.5)]"
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

        {/* Bottom Hardware Diagnostic Deck */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
          {/* Left Analog Telemetry */}
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
              <span>左類比搖桿 (L3)</span>
              <span className="font-mono text-zinc-400 text-[11px]">
                X:{state.left_stick_x} Y:{state.left_stick_y}
              </span>
            </div>
            <div className="space-y-1 text-[10px] font-mono text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="w-3">X</span>
                <div className="flex-1 h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    className="h-full bg-zinc-300 transition-all"
                    style={{ width: `${(state.left_stick_x / 255) * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3">Y</span>
                <div className="flex-1 h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    className="h-full bg-zinc-300 transition-all"
                    style={{ width: `${(state.left_stick_y / 255) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Analog Telemetry */}
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
              <span>右類比搖桿 (R3)</span>
              <span className="font-mono text-zinc-400 text-[11px]">
                X:{state.right_stick_x} Y:{state.right_stick_y}
              </span>
            </div>
            <div className="space-y-1 text-[10px] font-mono text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="w-3">X</span>
                <div className="flex-1 h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    className="h-full bg-zinc-300 transition-all"
                    style={{ width: `${(state.right_stick_x / 255) * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3">Y</span>
                <div className="flex-1 h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    className="h-full bg-zinc-300 transition-all"
                    style={{ width: `${(state.right_stick_y / 255) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Raw Protocol Serial Packet Stream */}
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-zinc-400" />
                <span>UARTSwitchCon 封包</span>
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">9-Byte</span>
            </div>
            <div className="p-2 rounded bg-zinc-950 border border-zinc-800/80 font-mono text-[11px] text-zinc-200 tracking-wider overflow-x-auto text-center">
              {computeRawHex()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
