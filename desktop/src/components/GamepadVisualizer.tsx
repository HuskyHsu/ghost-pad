import React, { useState, useRef, useEffect } from "react";
import { ControllerState } from "../types";
import { Keyboard, X as CloseIcon, CircleDot, Square, Gamepad2 } from "lucide-react";
import { KEYBOARD_GUIDE } from "../hooks/useVirtualGamepad";
import { usePulsedButtonPress } from "../hooks/usePulsedButtonPress";
import { useStickDrag } from "../hooks/useStickDrag";
import { InputTimelineStream } from "./InputTimelineStream";

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
}

export const GamepadVisualizer: React.FC<Props> = ({
  state,
  gamepadName,
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
}) => {
  // Ghost only wakes up when ESP32 virtual controller service is started
  const isGhostAwake = Boolean(esp32Connected);
  const [showKeyGuide, setShowKeyGuide] = useState(false);

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
    tapThreshold: 6,
    getScale: () => scaleRef.current,
    onTriggerStick,
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
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950 relative">
      {/* 1. Unified Top Header */}
      <div className="h-16 px-6 border-b border-white/[0.06] flex items-center justify-between shrink-0 bg-zinc-950/80 backdrop-blur-sm z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-zinc-300 shadow-xs shrink-0">
            <Gamepad2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-tight text-zinc-100">
                即時儀表板
              </h1>
              <span
                className={`px-1.5 py-0.5 rounded font-mono text-[10px] border flex items-center gap-1.5 ${
                  gamepadName
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-zinc-850 text-zinc-400 border-white/[0.06]"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${gamepadName ? "bg-emerald-400" : "bg-zinc-500"}`} />
                <span>{gamepadName || "本機控制模式"}</span>
              </span>
            </div>
            <p className="text-xs text-zinc-400 truncate hidden sm:block">
              {gamepadName
                ? "實體手把已連線，可混用鍵盤、點擊與搖桿拖曳"
                : "鍵盤與畫面按鈕皆可直接操作 (支援外接實體手把)"}
            </p>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2 text-xs font-mono">
          {/* Quick Macro Recording Button */}
          {recordingPhase === "recording" ? (
            <button
              type="button"
              onClick={onStopRecord}
              className="flex items-center gap-2 h-8 px-3 rounded-md bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-medium text-xs transition-colors cursor-pointer select-none"
              title="點擊停止側錄並儲存巨集腳本"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
              <span>
                側錄中 {(recordingElapsedMs / 1000).toFixed(1)}s ({recordedActionsCount} 步)
              </span>
              <Square className="w-3 h-3 fill-rose-300 ml-0.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onStartRecord}
              disabled={recordingPhase === "countdown"}
              className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-zinc-850 hover:bg-zinc-800 border border-white/[0.08] hover:border-white/[0.14] text-rose-300 hover:text-rose-200 font-medium text-xs transition-colors shadow-xs cursor-pointer select-none"
              title="開始側錄手把與鍵盤操作 (倒數 321 後開始捕捉)"
            >
              <CircleDot className="w-3.5 h-3.5 text-rose-400" />
              <span>側錄巨集</span>
            </button>
          )}

          {/* Keyboard Guide Toggle Button */}
          <button
            onClick={() => setShowKeyGuide(!showKeyGuide)}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-zinc-850 hover:bg-zinc-800 border border-white/[0.08] hover:border-white/[0.14] text-zinc-300 hover:text-zinc-100 font-medium text-xs transition-colors shadow-xs cursor-pointer"
            title="查看電腦鍵盤與畫面操作對照"
          >
            <Keyboard className="w-3.5 h-3.5 text-zinc-400" />
            <span>鍵盤對照表</span>
          </button>
        </div>
      </div>

      {/* Keyboard Guide Modal Overlay */}
      {showKeyGuide && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-white/[0.1] rounded-xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-100 font-semibold text-xs tracking-tight">
                <Keyboard className="w-4 h-4 text-zinc-400" />
                <span>電腦鍵盤操作對照表</span>
              </div>
              <button
                onClick={() => setShowKeyGuide(false)}
                className="p-1 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-zinc-800/40 border border-white/[0.06] text-zinc-300 text-[11px] leading-relaxed">
                <span className="font-medium text-zinc-100">外接手把非必須</span>：Ghost-Pad 支援純電腦操作！您可以直接敲擊鍵盤（WASD 類比搖桿、L/K/I/J 確認取消）或直接用滑鼠點擊畫面按鈕與拖曳搖桿，皆能即時驅動 Switch。
              </div>

              <div className="grid grid-cols-2 gap-2">
                {KEYBOARD_GUIDE.map((item) => (
                  <div
                    key={item.key}
                    className="p-2 rounded-md bg-zinc-950/60 border border-white/[0.06] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded font-mono font-medium bg-zinc-800 text-zinc-200 border border-white/[0.08] text-[11px]">
                        {item.key}
                      </span>
                      <span className="text-zinc-400 text-[11px]">{item.label}</span>
                    </div>
                    <span className="font-mono font-medium text-zinc-300 text-xs px-1.5 py-0.5 rounded bg-zinc-900 border border-white/[0.06]">
                      {item.button}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3.5 bg-zinc-950/40 border-t border-white/[0.06] flex justify-end">
              <button
                onClick={() => setShowKeyGuide(false)}
                className="px-3.5 py-1.5 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium transition-colors cursor-pointer shadow-xs"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Responsive Dashboard Stage */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-3 flex flex-col justify-between items-center w-full max-w-5xl xl:max-w-6xl mx-auto min-h-0">
        {/* Flexible Controller Showcase Stage (Responsive Scaled) */}
        <div
          ref={stageContainerRef}
          className="flex-1 w-full flex items-center justify-center min-h-[240px] overflow-hidden py-1"
        >
          <div
            style={{
              width: 620,
              height: 390,
              transform: `scale(${scale})`,
              transformOrigin: "center center",
            }}
            className="relative select-none flex items-center justify-center shrink-0 transition-transform duration-100 ease-out"
          >
          {/* SVG Cute Ghost Silhouette with Raised Little Hands & Minimalist Face */}
          <svg
            viewBox="0 0 620 390"
            className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-500 ease-out drop-shadow-[0_12px_28px_rgba(0,0,0,0.6)]"
          >
            <defs>
              {/* Frosted Translucent Ghost Sheet Gradient */}
              <linearGradient id="cuteGhostGradTranslucent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#27272a" stopOpacity="0.55" />
                <stop offset="30%" stopColor="#1c1c1f" stopOpacity="0.60" />
                <stop offset="70%" stopColor="#141416" stopOpacity="0.68" />
                <stop offset="100%" stopColor="#09090b" stopOpacity="0.75" />
              </linearGradient>

              {/* Luminous Off-White Ghost Sheet Gradient */}
              <linearGradient id="cuteGhostGradWhite" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="30%" stopColor="#fafafa" stopOpacity="1" />
                <stop offset="70%" stopColor="#f4f4f5" stopOpacity="0.99" />
                <stop offset="100%" stopColor="#e4e4e7" stopOpacity="0.98" />
              </linearGradient>
            </defs>

            {/* Cute Ghost Silhouette with Animated Drooping Hands (Sleeping) vs Raised Hands (Awake) */}
            <path
              d={
                isGhostAwake
                  ? "M 310, 38 C 352, 38, 385, 49, 406, 75 C 416, 85, 428, 87, 442, 75 C 465, 54, 492, 28, 532, 26 C 564, 25, 588, 44, 584, 70 C 580, 95, 568, 130, 562, 168 C 553, 215, 558, 272, 550, 345 C 530, 328, 514, 362, 494, 346 C 474, 328, 458, 362, 438, 346 C 418, 328, 402, 362, 374, 346 C 346, 328, 330, 362, 308, 346 C 286, 362, 270, 328, 242, 346 C 214, 362, 198, 328, 178, 346 C 158, 362, 142, 328, 122, 346 C 102, 362, 86, 328, 66, 345 C 58, 270, 64, 210, 54, 160 C 46, 118, 34, 80, 30, 55 C 26, 30, 46, 12, 78, 14 C 120, 16, 150, 46, 170, 70 C 186, 84, 200, 84, 210, 74 C 230, 46, 264, 38, 310, 38 Z"
                  : "M 310, 38 C 352, 38, 385, 52, 408, 78 C 424, 94, 444, 108, 470, 118 C 496, 128, 522, 136, 546, 126 C 564, 118, 574, 105, 568, 132 C 562, 158, 558, 180, 556, 205 C 550, 242, 556, 285, 550, 345 C 530, 328, 514, 362, 494, 346 C 474, 328, 458, 362, 438, 346 C 418, 328, 402, 362, 374, 346 C 346, 328, 330, 362, 308, 346 C 286, 362, 270, 328, 242, 346 C 214, 362, 198, 328, 178, 346 C 158, 362, 142, 328, 122, 346 C 102, 362, 86, 328, 66, 345 C 58, 285, 64, 242, 54, 205 C 50, 180, 44, 158, 48, 132 C 54, 105, 66, 118, 86, 126 C 110, 136, 136, 128, 162, 118 C 188, 108, 200, 94, 212, 78 C 230, 48, 264, 38, 310, 38 Z"
              }
              fill={isGhostAwake ? "url(#cuteGhostGradWhite)" : "url(#cuteGhostGradTranslucent)"}
              stroke={isGhostAwake ? "rgba(212, 212, 216, 0.8)" : "rgba(255, 255, 255, 0.16)"}
              strokeWidth={isGhostAwake ? "2" : "1.5"}
              style={{
                transition: "d 0.7s cubic-bezier(0.34, 1.56, 0.64, 1), fill 0.5s ease-out, stroke 0.5s ease-out",
              }}
            />

            {/* Asymmetric Underarm & Cloth Drape Creases */}
            <path
              d={
                isGhostAwake
                  ? "M 170, 70 C 152, 105 136, 165 128, 230"
                  : "M 162, 118 C 150, 142 136, 180 128, 230"
              }
              fill="none"
              stroke={isGhostAwake ? "rgba(113, 113, 122, 0.3)" : "rgba(255, 255, 255, 0.08)"}
              strokeWidth="1"
              strokeDasharray="4 2"
              style={{ transition: "d 0.7s ease-out, stroke 0.5s ease-out" }}
            />
            <path
              d={
                isGhostAwake
                  ? "M 442, 75 C 462, 112 482, 172 490, 235"
                  : "M 470, 118 C 478, 145 484, 185 490, 235"
              }
              fill="none"
              stroke={isGhostAwake ? "rgba(113, 113, 122, 0.3)" : "rgba(255, 255, 255, 0.08)"}
              strokeWidth="1"
              strokeDasharray="4 2"
              style={{ transition: "d 0.7s ease-out, stroke 0.5s ease-out" }}
            />

            {/* Ghost Expression */}
            {!isGhostAwake ? (
              /* Sleeping Face */
              <g className="transition-opacity duration-300">
                <path
                  d="M 275, 89 Q 282, 82 289, 89"
                  fill="none"
                  stroke="#71717a"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M 331, 89 Q 338, 82 345, 89"
                  fill="none"
                  stroke="#71717a"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M 306, 96 Q 310, 98 314, 96"
                  fill="none"
                  stroke="#52525b"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <g className="select-none pointer-events-none opacity-40">
                  <text x="350" y="74" fill="#71717a" fontSize="10" fontFamily="monospace" fontWeight="bold">z</text>
                  <text x="359" y="63" fill="#52525b" fontSize="13" fontFamily="monospace" fontWeight="bold">Z</text>
                </g>
              </g>
            ) : (
              /* Awake Face */
              <g className="transition-opacity duration-300">
                <circle cx="282" cy="88" r="3.8" fill="#18181b" />
                <circle cx="338" cy="88" r="3.8" fill="#18181b" />
                <circle cx="283.5" cy="86.5" r="1.2" fill="#ffffff" />
                <circle cx="339.5" cy="86.5" r="1.2" fill="#ffffff" />

                {isAnyButtonPressed ? (
                  <path
                    d="M 300, 94 Q 305, 98 310, 94 Q 315, 98 320, 94"
                    fill="none"
                    stroke="#27272a"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                ) : (
                  <path
                    d="M 302, 95 Q 310, 100.5 318, 95"
                    fill="none"
                    stroke="#27272a"
                    strokeWidth="2"
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
              className={`flex items-center gap-1.5 p-1 rounded-lg transition-all duration-500 ease-out pointer-events-auto border ${
                isGhostAwake
                  ? "translate-y-0 rotate-[-2deg] translate-x-0 opacity-100"
                  : "translate-y-[40px] rotate-[-12deg] -translate-x-1 opacity-90"
              } ${
                isLeftHandActive
                  ? "bg-zinc-800/90 border-white/[0.2]"
                  : "bg-zinc-900/80 border-zinc-700/60 shadow-md"
              }`}
            >
              <button
                {...bindButton("zl")}
                className={`w-[72px] py-2 text-center rounded-md text-xs font-mono font-bold tracking-wider border transition-all cursor-pointer pointer-events-auto select-none active:scale-95 ${
                  state.zl
                    ? "bg-zinc-100 text-zinc-950 border-white shadow-xs scale-[0.98]"
                    : "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-white/[0.1] shadow-xs"
                }`}
                title="ZL 按鍵 (左板機鍵)"
              >
                ZL
              </button>
              <button
                {...bindButton("l")}
                className={`w-[64px] py-2 text-center rounded-md text-xs font-mono font-bold tracking-wider border transition-all cursor-pointer pointer-events-auto select-none active:scale-95 ${
                  state.l
                    ? "bg-zinc-100 text-zinc-950 border-white shadow-xs scale-[0.98]"
                    : "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-white/[0.1] shadow-xs"
                }`}
                title="L 按鍵 (左肩鍵)"
              >
                L
              </button>
            </div>

            {/* Right Ghost Hand */}
            <div
              className={`flex items-center gap-1.5 p-1 rounded-lg transition-all duration-500 ease-out pointer-events-auto border ${
                isGhostAwake
                  ? "mt-2.5 translate-y-0 rotate-[3deg] translate-x-0 opacity-100"
                  : "mt-2.5 translate-y-[42px] rotate-[12deg] translate-x-1 opacity-90"
              } ${
                isRightHandActive
                  ? "bg-zinc-800/90 border-white/[0.2]"
                  : "bg-zinc-900/80 border-zinc-700/60 shadow-md"
              }`}
            >
              <button
                {...bindButton("r")}
                className={`w-[64px] py-2 text-center rounded-md text-xs font-mono font-bold tracking-wider border transition-all cursor-pointer pointer-events-auto select-none active:scale-95 ${
                  state.r
                    ? "bg-zinc-100 text-zinc-950 border-white shadow-xs scale-[0.98]"
                    : "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-white/[0.1] shadow-xs"
                }`}
                title="R 按鍵 (右肩鍵)"
              >
                R
              </button>
              <button
                {...bindButton("zr")}
                className={`w-[72px] py-2 text-center rounded-md text-xs font-mono font-bold tracking-wider border transition-all cursor-pointer pointer-events-auto select-none active:scale-95 ${
                  state.zr
                    ? "bg-zinc-100 text-zinc-950 border-white shadow-xs scale-[0.98]"
                    : "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-white/[0.1] shadow-xs"
                }`}
                title="ZR 按鍵 (右板機鍵)"
              >
                ZR
              </button>
            </div>
          </div>

          {/* Main Controls Grid Embedded in the Ghost Torso */}
          <div className="w-full h-full pt-[82px] pb-[25px] px-[45px] grid grid-cols-3 items-center z-10 pointer-events-none">
            {/* Left Flank: Stick (L3) & D-Pad */}
            <div className="flex flex-col items-center justify-around h-full py-1">
              {/* Left Thumbstick (L3) */}
              <div
                ref={leftStickBaseRef}
                onPointerDown={(e) => startStickDrag("left", leftStickBaseRef, leftKnobRef, setIsDraggingLeft, e)}
                className={`relative w-24 h-24 rounded-full bg-zinc-950 border transition-all duration-150 select-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] flex items-center justify-center touch-none cursor-grab active:cursor-grabbing pointer-events-auto ${
                  isDraggingLeft
                    ? "border-white/[0.3] ring-2 ring-white/[0.1]"
                    : "border-white/[0.08] hover:border-white/[0.16]"
                }`}
                title="左類比搖桿 (可拖曳移動，輕點為 L3)"
              >
                {/* Subtle Direction Guide Markers */}
                <span className="absolute top-1 text-[8px] font-mono text-zinc-600 select-none pointer-events-none">▲</span>
                <span className="absolute bottom-1 text-[8px] font-mono text-zinc-600 select-none pointer-events-none">▼</span>
                <span className="absolute left-1.5 text-[8px] font-mono text-zinc-600 select-none pointer-events-none">◀</span>
                <span className="absolute right-1.5 text-[8px] font-mono text-zinc-600 select-none pointer-events-none">▶</span>

                <div
                  ref={leftKnobRef}
                  className={`w-14 h-14 rounded-full border flex items-center justify-center text-xs font-mono font-bold select-none shadow-md pointer-events-none ${
                    isDraggingLeft ? "transition-none" : "transition-transform duration-100 ease-out"
                  } ${
                    state.l_stick_click
                      ? "bg-zinc-100 text-zinc-950 border-white scale-95 shadow-xs"
                      : isDraggingLeft || (state.left_stick_x !== 128 || state.left_stick_y !== 128)
                      ? "bg-zinc-200 text-zinc-950 border-white shadow-xs"
                      : "bg-zinc-800 text-zinc-300 border-white/[0.1] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]"
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
              <div className="relative w-26 h-26 flex items-center justify-center select-none pointer-events-auto">
                <div className="absolute w-9 h-26 bg-zinc-950 border border-white/[0.08] rounded-md shadow-md pointer-events-none" />
                <div className="absolute w-26 h-9 bg-zinc-950 border border-white/[0.08] rounded-md shadow-md pointer-events-none" />

                <button
                  {...bindButton("dpad_up")}
                  className={`absolute top-0 w-9 h-9 rounded-t-md flex items-center justify-center text-xs font-bold transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    isUp ? "bg-zinc-100 text-zinc-950" : "text-zinc-400 hover:text-white hover:bg-zinc-850"
                  }`}
                  title="十字鍵 上"
                >
                  ▲
                </button>
                <button
                  {...bindButton("dpad_down")}
                  className={`absolute bottom-0 w-9 h-9 rounded-b-md flex items-center justify-center text-xs font-bold transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    isDown ? "bg-zinc-100 text-zinc-950" : "text-zinc-400 hover:text-white hover:bg-zinc-850"
                  }`}
                  title="十字鍵 下"
                >
                  ▼
                </button>
                <button
                  {...bindButton("dpad_left")}
                  className={`absolute left-0 w-9 h-9 rounded-l-md flex items-center justify-center text-xs font-bold transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    isLeft ? "bg-zinc-100 text-zinc-950" : "text-zinc-400 hover:text-white hover:bg-zinc-850"
                  }`}
                  title="十字鍵 左"
                >
                  ◀
                </button>
                <button
                  {...bindButton("dpad_right")}
                  className={`absolute right-0 w-9 h-9 rounded-r-md flex items-center justify-center text-xs font-bold transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    isRight ? "bg-zinc-100 text-zinc-950" : "text-zinc-400 hover:text-white hover:bg-zinc-850"
                  }`}
                  title="十字鍵 右"
                >
                  ▶
                </button>
                <div className="w-5 h-5 rounded-full bg-zinc-900 border border-white/[0.06] z-10 pointer-events-none" />
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
                      ? "bg-zinc-100 text-zinc-950 border-white shadow-xs"
                      : "bg-zinc-900 text-zinc-200 border-zinc-700/80 hover:border-zinc-500 hover:bg-zinc-800 shadow-sm"
                  }`}
                  title="Minus 按鍵 (減號)"
                >
                  −
                </button>
                <button
                  {...bindButton("plus")}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold border transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    state.plus
                      ? "bg-zinc-100 text-zinc-950 border-white shadow-xs"
                      : "bg-zinc-900 text-zinc-200 border-zinc-700/80 hover:border-zinc-500 hover:bg-zinc-800 shadow-sm"
                  }`}
                  title="Plus 按鍵 (加號)"
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
                    ? "text-zinc-200 border-emerald-500/30 bg-zinc-900 hover:border-emerald-500/50"
                    : "text-zinc-500 border-white/[0.08] bg-zinc-950/80 hover:border-white/[0.14] hover:text-zinc-300"
                }`}
                title={
                  isGhostAwake
                    ? "ESP32 服務運作中 (點擊停止)"
                    : "ESP32 待命中 (點擊啟動)"
                }
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    isGhostAwake
                      ? "bg-emerald-400"
                      : "bg-zinc-600"
                  }`}
                />
                <span>GHOST-PAD</span>
              </button>

              {/* Capture & Home */}
              <div className="flex items-center gap-10 pb-1">
                <button
                  {...bindButton("capture")}
                  className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold border transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    state.capture
                      ? "bg-zinc-100 text-zinc-950 border-white shadow-xs"
                      : "bg-zinc-900 text-zinc-200 border-zinc-700/80 hover:border-zinc-500 hover:bg-zinc-800 shadow-sm"
                  }`}
                  title="Capture 按鍵 (截圖)"
                >
                  ◉
                </button>
                <button
                  {...bindButton("home")}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    state.home
                      ? "bg-zinc-100 text-zinc-950 border-white shadow-xs"
                      : "bg-zinc-900 text-zinc-200 border-zinc-700/80 hover:border-zinc-500 hover:bg-zinc-800 shadow-sm"
                  }`}
                  title="Home 按鍵 (主畫面)"
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
                      ? "bg-zinc-100 text-zinc-950 border-white shadow-xs scale-95"
                      : "bg-zinc-900 text-zinc-100 border-zinc-700/80 hover:border-zinc-500 hover:bg-zinc-800 shadow-md"
                  }`}
                >
                  X
                </button>
                <button
                  {...bindButton("b")}
                  className={`absolute bottom-0 w-9 h-9 rounded-full border flex items-center justify-center text-xs font-bold transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    state.b
                      ? "bg-zinc-100 text-zinc-950 border-white shadow-xs scale-95"
                      : "bg-zinc-900 text-zinc-100 border-zinc-700/80 hover:border-zinc-500 hover:bg-zinc-800 shadow-md"
                  }`}
                >
                  B
                </button>
                <button
                  {...bindButton("y")}
                  className={`absolute left-0 w-9 h-9 rounded-full border flex items-center justify-center text-xs font-bold transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    state.y
                      ? "bg-zinc-100 text-zinc-950 border-white shadow-xs scale-95"
                      : "bg-zinc-900 text-zinc-100 border-zinc-700/80 hover:border-zinc-500 hover:bg-zinc-800 shadow-md"
                  }`}
                >
                  Y
                </button>
                <button
                  {...bindButton("a")}
                  className={`absolute right-0 w-9 h-9 rounded-full border flex items-center justify-center text-xs font-bold transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
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
                className={`relative w-24 h-24 rounded-full bg-zinc-950 border transition-all duration-150 select-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] flex items-center justify-center touch-none cursor-grab active:cursor-grabbing pointer-events-auto ${
                  isDraggingRight
                    ? "border-white/[0.3] ring-2 ring-white/[0.1]"
                    : "border-white/[0.08] hover:border-white/[0.16]"
                }`}
                title="右類比搖桿 (可拖曳移動，輕點為 R3)"
              >
                {/* Subtle Direction Guide Markers */}
                <span className="absolute top-1 text-[8px] font-mono text-zinc-600 select-none pointer-events-none">▲</span>
                <span className="absolute bottom-1 text-[8px] font-mono text-zinc-600 select-none pointer-events-none">▼</span>
                <span className="absolute left-1.5 text-[8px] font-mono text-zinc-600 select-none pointer-events-none">◀</span>
                <span className="absolute right-1.5 text-[8px] font-mono text-zinc-600 select-none pointer-events-none">▶</span>

                <div
                  ref={rightKnobRef}
                  className={`w-14 h-14 rounded-full border flex items-center justify-center text-xs font-mono font-bold select-none shadow-md pointer-events-none ${
                    isDraggingRight ? "transition-none" : "transition-transform duration-100 ease-out"
                  } ${
                    state.r_stick_click
                      ? "bg-zinc-100 text-zinc-950 border-white scale-95 shadow-xs"
                      : isDraggingRight || (state.right_stick_x !== 128 || state.right_stick_y !== 128)
                      ? "bg-zinc-200 text-zinc-950 border-white shadow-xs"
                      : "bg-zinc-800 text-zinc-300 border-white/[0.1] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]"
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

        {/* Real-Time Live Input Timeline Stream */}
        <div className="w-full shrink-0 pt-1 pb-1">
          <InputTimelineStream state={state} />
        </div>
      </div>
    </div>
  );
};
