import React from "react";
import { ControllerState, GamepadInfo } from "../types";


interface Props {
  state: ControllerState;
  gamepads: GamepadInfo[];
  isMuted: boolean;
  onToggleMute: () => void;
  fps: number;
  onTriggerButton?: (button: string, pressed: boolean) => void;
}

export const CompactWidget: React.FC<Props> = ({
  state,
  gamepads,
  isMuted,
  onToggleMute,
  fps,
  onTriggerButton,
}) => {
  const activeGamepad = gamepads.find((g) => g.is_active);

  const bindButton = (buttonName: string) => ({
    role: "button",
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch (_) {}
      onTriggerButton?.(buttonName, true);
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.preventDefault();
      onTriggerButton?.(buttonName, false);
    },
    onPointerCancel: (e: React.PointerEvent) => {
      e.preventDefault();
      onTriggerButton?.(buttonName, false);
    },
  });

  // Scaled stick offsets for compact view (-10px .. +10px)
  const lxOffset = ((state.left_stick_x - 128) / 128) * 10;
  const lyOffset = -((state.left_stick_y - 128) / 128) * 10;
  const rxOffset = ((state.right_stick_x - 128) / 128) * 10;
  const ryOffset = -((state.right_stick_y - 128) / 128) * 10;

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
    state.dpad !== 8
  );

  const isLeftHandActive = Boolean(state.zl || state.l);
  const isRightHandActive = Boolean(state.zr || state.r);

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-100 select-none p-3 justify-between overflow-hidden">
      {/* Top HUD Header */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              activeGamepad && !isMuted ? "bg-emerald-500 animate-pulse" : "bg-zinc-600"
            }`}
          />
          <span className="font-semibold text-xs text-zinc-200 truncate">
            {isMuted ? "已暫停" : activeGamepad?.name || "未連線"}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Mute button */}
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

      {/* Main Micro Pad Arena with Cute Ghost Silhouette */}
      <div className="relative w-[350px] h-[250px] mx-auto select-none flex flex-col items-center justify-center shrink-0 my-auto">
        {/* Ghost Body Wrapper (Static, No bobbing) */}
        <div className="relative w-full h-[235px] flex items-center justify-center">
          {/* SVG Cute Ghost Silhouette with Raised Hands */}
          <svg
            viewBox="0 0 620 390"
            className="absolute inset-0 w-full h-full drop-shadow-[0_12px_24px_rgba(255,255,255,0.06)] pointer-events-none"
          >
            <defs>
              <linearGradient id="compactGhostGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#32323e" stopOpacity="0.9" />
                <stop offset="30%" stopColor="#22222a" stopOpacity="0.92" />
                <stop offset="70%" stopColor="#15151c" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#0d0d12" stopOpacity="0.98" />
              </linearGradient>

              {/* Hand Aura */}
              <radialGradient id="compactHandGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Reactive Hand Glows */}
            {isLeftHandActive && (
              <ellipse cx="110" cy="42" rx="85" ry="45" fill="url(#compactHandGlow)" />
            )}
            {isRightHandActive && (
              <ellipse cx="515" cy="54" rx="85" ry="45" fill="url(#compactHandGlow)" />
            )}

            {/* Asymmetric Ghost Body with Raised Hands */}
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
              fill="url(#compactGhostGrad)"
              stroke="rgba(255, 255, 255, 0.28)"
              strokeWidth="2.2"
            />

            {/* Asymmetric Underarm Creases */}
            <path d="M 170, 70 C 152, 105 136, 165 128, 230" fill="none" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="1.2" strokeDasharray="4 2" />
            <path d="M 442, 75 C 462, 112 482, 172 490, 235" fill="none" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="1.2" strokeDasharray="4 2" />

            {/* DITTO MINIMALIST FACE (百變怪純真表情，無腮紅) */}
            <circle cx="282" cy="88" r="3.6" fill="#f4f4f5" />
            <circle cx="338" cy="88" r="3.6" fill="#f4f4f5" />

            {/* Ditto Line Mouth */}
            {isAnyButtonPressed ? (
              <path d="M 302, 95 Q 306, 98.5 310, 95 Q 314, 98.5 318, 95" fill="none" stroke="#22d3ee" strokeWidth="2.2" strokeLinecap="round" />
            ) : (
              <path d="M 302, 95 Q 310, 100 318, 95" fill="none" stroke="#f4f4f5" strokeWidth="2.2" strokeLinecap="round" />
            )}
          </svg>

          {/* Asymmetric Raised Hands Triggers (ZL, L, R, ZR) */}
          <div className="absolute top-[8px] left-[20px] right-[20px] flex justify-between items-start z-20">
            {/* Left Hand (Higher, slightly angled) */}
            <div
              className={`flex items-center gap-1 p-0.5 rounded-xl transition-all rotate-[-2deg] ${
                isLeftHandActive ? "ring-1 ring-cyan-400 bg-cyan-500/20" : ""
              }`}
            >
              <div
                {...bindButton("zl")}
                className={`w-9 py-1 text-center rounded-lg text-[8px] font-black border transition-colors cursor-pointer select-none active:scale-95 ${
                  state.zl ? "bg-white text-zinc-950 border-white shadow-sm scale-95" : "bg-zinc-850 text-zinc-200 border-zinc-650"
                }`}
              >
                ZL
              </div>
              <div
                {...bindButton("l")}
                className={`w-8 py-1 text-center rounded-lg text-[8px] font-bold border transition-colors cursor-pointer select-none active:scale-95 ${
                  state.l ? "bg-white text-zinc-950 border-white shadow-sm scale-95" : "bg-zinc-850 text-zinc-300 border-zinc-650"
                }`}
              >
                L
              </div>
            </div>

            {/* Right Hand (Slightly lower & tilted) */}
            <div
              className={`flex items-center gap-1 p-0.5 rounded-xl transition-all mt-1.5 rotate-[3deg] ${
                isRightHandActive ? "ring-1 ring-cyan-400 bg-cyan-500/20" : ""
              }`}
            >
              <div
                {...bindButton("r")}
                className={`w-8 py-1 text-center rounded-lg text-[8px] font-bold border transition-colors cursor-pointer select-none active:scale-95 ${
                  state.r ? "bg-white text-zinc-950 border-white shadow-sm scale-95" : "bg-zinc-850 text-zinc-300 border-zinc-650"
                }`}
              >
                R
              </div>
              <div
                {...bindButton("zr")}
                className={`w-9 py-1 text-center rounded-lg text-[8px] font-black border transition-colors cursor-pointer select-none active:scale-95 ${
                  state.zr ? "bg-white text-zinc-950 border-white shadow-sm scale-95" : "bg-zinc-850 text-zinc-200 border-zinc-650"
                }`}
              >
                ZR
              </div>
            </div>
          </div>

          {/* Embedded Controls */}
          <div className="w-full h-full pt-[46px] pb-[20px] px-[36px] grid grid-cols-3 items-center z-20">
            {/* Left Flank */}
            <div className="flex flex-col items-center justify-between h-full py-1">
              <div className="relative w-12 h-12 rounded-full bg-zinc-950 border border-white/20 flex items-center justify-center">
                <div
                  {...bindButton("l3")}
                  className={`w-7 h-7 rounded-full border flex items-center justify-center text-[7px] font-bold transition-transform duration-75 shadow-xs cursor-pointer select-none active:scale-90 ${
                    state.l_stick_click ? "bg-zinc-100 text-zinc-950 border-white scale-95" : "bg-zinc-800 text-zinc-300 border-zinc-650"
                  }`}
                  style={{ transform: `translate(${lxOffset * 0.7}px, ${lyOffset * 0.7}px)` }}
                >
                  L3
                </div>
              </div>

              <div className="relative w-11 h-11 flex items-center justify-center select-none">
                <div className="absolute w-4 h-11 bg-zinc-950/90 border border-white/20 rounded-xs pointer-events-none" />
                <div className="absolute w-11 h-4 bg-zinc-950/90 border border-white/20 rounded-xs pointer-events-none" />
                <div {...bindButton("dpad_up")} className={`absolute top-0 w-4 h-4 flex items-center justify-center text-[6px] font-bold cursor-pointer select-none active:scale-95 ${isUp ? "bg-zinc-100 text-zinc-950" : "text-zinc-400"}`}>▲</div>
                <div {...bindButton("dpad_down")} className={`absolute bottom-0 w-4 h-4 flex items-center justify-center text-[6px] font-bold cursor-pointer select-none active:scale-95 ${isDown ? "bg-zinc-100 text-zinc-950" : "text-zinc-400"}`}>▼</div>
                <div {...bindButton("dpad_left")} className={`absolute left-0 w-4 h-4 flex items-center justify-center text-[6px] font-bold cursor-pointer select-none active:scale-95 ${isLeft ? "bg-zinc-100 text-zinc-950" : "text-zinc-400"}`}>◀</div>
                <div {...bindButton("dpad_right")} className={`absolute right-0 w-4 h-4 flex items-center justify-center text-[6px] font-bold cursor-pointer select-none active:scale-95 ${isRight ? "bg-zinc-100 text-zinc-950" : "text-zinc-400"}`}>▶</div>
              </div>
            </div>

            {/* Center Column */}
            <div className="flex flex-col items-center justify-between h-full py-1">
              <div className="flex items-center gap-5">
                <div {...bindButton("minus")} className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold border cursor-pointer select-none active:scale-95 ${state.minus ? "bg-zinc-100 text-zinc-950 border-white" : "bg-zinc-950/90 text-zinc-400 border-white/20"}`}>−</div>
                <div {...bindButton("plus")} className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold border cursor-pointer select-none active:scale-95 ${state.plus ? "bg-zinc-100 text-zinc-950 border-white" : "bg-zinc-950/90 text-zinc-400 border-white/20"}`}>+</div>
              </div>

              <span className="text-[6px] font-mono tracking-widest text-zinc-400 uppercase select-none pointer-events-none">GHOST</span>

              <div className="flex items-center gap-5">
                <div {...bindButton("capture")} className={`w-3.5 h-3.5 rounded-xs flex items-center justify-center text-[6px] border cursor-pointer select-none active:scale-95 ${state.capture ? "bg-zinc-100 text-zinc-950 border-white" : "bg-zinc-950/90 text-zinc-400 border-white/20"}`}>◉</div>
                <div {...bindButton("home")} className={`w-4 h-4 rounded-full flex items-center justify-center text-[7px] border cursor-pointer select-none active:scale-95 ${state.home ? "bg-cyan-400 text-zinc-950 border-cyan-300" : "bg-zinc-950/90 text-zinc-400 border-white/20"}`}>⌂</div>
              </div>
            </div>

            {/* Right Flank */}
            <div className="flex flex-col items-center justify-between h-full py-1">
              <div className="relative w-12 h-12 flex items-center justify-center select-none">
                <div {...bindButton("x")} className={`absolute top-0 w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[7px] font-bold cursor-pointer select-none active:scale-95 ${state.x ? "bg-zinc-100 text-zinc-950 border-white" : "bg-zinc-950/90 text-zinc-300 border-white/20"}`}>X</div>
                <div {...bindButton("b")} className={`absolute bottom-0 w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[7px] font-bold cursor-pointer select-none active:scale-95 ${state.b ? "bg-zinc-100 text-zinc-950 border-white" : "bg-zinc-950/90 text-zinc-300 border-white/20"}`}>B</div>
                <div {...bindButton("y")} className={`absolute left-0 w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[7px] font-bold cursor-pointer select-none active:scale-95 ${state.y ? "bg-zinc-100 text-zinc-950 border-white" : "bg-zinc-950/90 text-zinc-300 border-white/20"}`}>Y</div>
                <div {...bindButton("a")} className={`absolute right-0 w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[7px] font-bold cursor-pointer select-none active:scale-95 ${state.a ? "bg-zinc-100 text-zinc-950 border-white" : "bg-zinc-950/90 text-zinc-300 border-white/20"}`}>A</div>
              </div>

              <div className="relative w-12 h-12 rounded-full bg-zinc-950 border border-white/20 flex items-center justify-center">
                <div
                  {...bindButton("r3")}
                  className={`w-7 h-7 rounded-full border flex items-center justify-center text-[7px] font-bold transition-transform duration-75 shadow-xs cursor-pointer select-none active:scale-90 ${
                    state.r_stick_click ? "bg-zinc-100 text-zinc-950 border-white scale-95" : "bg-zinc-800 text-zinc-300 border-zinc-650"
                  }`}
                  style={{ transform: `translate(${rxOffset * 0.7}px, ${ryOffset * 0.7}px)` }}
                >
                  R3
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Coordinates Bar */}
      <div className="pt-1.5 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono text-zinc-400">
        <span>L: {state.left_stick_x},{state.left_stick_y}</span>
        <span>R: {state.right_stick_x},{state.right_stick_y}</span>
      </div>
    </div>
  );
};
