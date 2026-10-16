import React, { useState, useRef, useEffect } from "react";
import { ControllerState } from "../types";
import { Activity, Keyboard, X as CloseIcon, CircleDot, Square } from "lucide-react";
import { KEYBOARD_GUIDE } from "../hooks/useVirtualGamepad";
import { usePulsedButtonPress } from "../hooks/usePulsedButtonPress";
import { useStickDrag } from "../hooks/useStickDrag";
import { InputTimelineStream } from "./InputTimelineStream";

interface Props {
  state: ControllerState;
  gamepadName?: string;
  isMuted?: boolean;
  esp32Connected?: boolean;
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
  isMuted: _isMuted = true,
  esp32Connected = false,
  fps = 100,
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
      {/* Top Header Bar */}
      <div className="h-14 px-6 border-b border-zinc-800/80 flex items-center justify-between shrink-0 bg-zinc-950/60 backdrop-blur-sm z-30">
        <div className="flex items-center gap-2 text-xs select-none">
          <span
            className={`w-2 h-2 rounded-full transition-colors ${
              gamepadName
                ? "bg-emerald-500 animate-pulse"
                : "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]"
            }`}
          />
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs text-zinc-100">
              {gamepadName || "本機控制模式"}
            </span>
            <span className="text-[11px] text-zinc-400">
              {gamepadName
                ? "• 實體手把已就緒 (可同時混用鍵盤與點擊)"
                : "• 鍵盤與畫面按鈕皆可直接操作 (外接手把非必須)"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-xs text-zinc-400 font-mono">
          {/* Phase 3: Quick Macro Recording Button */}
          {recordingPhase === "recording" ? (
            <button
              type="button"
              onClick={onStopRecord}
              className="flex items-center gap-2 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-[0_0_15px_rgba(244,63,94,0.6)] animate-pulse transition-all cursor-pointer select-none"
              title="點擊停止側錄並儲存巨集腳本"
            >
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>
                側錄中 {(recordingElapsedMs / 1000).toFixed(1)}s ({recordedActionsCount} 步)
              </span>
              <Square className="w-3 h-3 fill-white ml-0.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onStartRecord}
              disabled={recordingPhase === "countdown"}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-900 border border-rose-500/40 hover:border-rose-400 hover:bg-rose-950/30 text-rose-300 hover:text-rose-100 transition-colors shadow-xs cursor-pointer select-none"
              title="開始側錄手把與鍵盤操作 (倒數 321 後開始捕捉)"
            >
              <CircleDot className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
              <span>側錄巨集</span>
            </button>
          )}

          {/* Keyboard Guide Toggle Button */}
          <button
            onClick={() => setShowKeyGuide(!showKeyGuide)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-700/80 hover:border-zinc-500 text-zinc-200 transition-colors shadow-xs cursor-pointer"
            title="查看電腦鍵盤與畫面操作對照 (外接手把非必須)"
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
                <span>電腦鍵盤操作對照表 (外接手把非必須)</span>
              </div>
              <button
                onClick={() => setShowKeyGuide(false)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 text-xs">
              <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-cyan-200 text-[11px] leading-relaxed">
                💡 <strong>外接手把非必須</strong>：Ghost-Pad 支援純電腦操作！您可以直接敲擊鍵盤（WASD 類比搖桿、L/K/I/J 確認取消）或直接用滑鼠點擊畫面按鈕與拖曳搖桿，皆能即時驅動 Switch。
              </div>

              <p className="text-zinc-400 leading-relaxed text-[11px]">
                支援三路並行：實體手把、電腦鍵盤、螢幕點擊拖曳皆可隨時混用！
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
          {/* SVG Cute Ghost Silhouette with Raised Little Hands (Boo! 👻) & Kawaii Face */}
          <svg
            viewBox="0 0 620 390"
            className={`absolute inset-0 w-full h-full pointer-events-none transition-all duration-500 ease-out ${
              isGhostAwake
                ? "drop-shadow-[0_0_35px_rgba(255,255,255,0.22)] drop-shadow-[0_22px_45px_rgba(0,0,0,0.65)]"
                : "drop-shadow-[0_22px_50px_rgba(0,0,0,0.85)]"
            }`}
          >
            <defs>
              {/* Frosted Translucent Ghost Sheet Gradient (休眠/未啟用時的半透明暗色幽靈質感) */}
              <linearGradient id="cuteGhostGradTranslucent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#353544" stopOpacity="0.55" />
                <stop offset="30%" stopColor="#242432" stopOpacity="0.60" />
                <stop offset="70%" stopColor="#171720" stopOpacity="0.68" />
                <stop offset="100%" stopColor="#0d0d14" stopOpacity="0.75" />
              </linearGradient>

              {/* Luminous Pure White Ghost Sheet Gradient (啟用時的白色底為主色) */}
              <linearGradient id="cuteGhostGradWhite" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="30%" stopColor="#fcfcfd" stopOpacity="1" />
                <stop offset="70%" stopColor="#f4f4f7" stopOpacity="0.99" />
                <stop offset="100%" stopColor="#e4e4e9" stopOpacity="0.98" />
              </linearGradient>

              {/* Hand Aura Gradients */}
              <radialGradient id="handGlowGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Reactive Left Hand Glow Aura */}
            {isLeftHandActive && (
              <ellipse
                cx={isGhostAwake ? "110" : "118"}
                cy={isGhostAwake ? "42" : "88"}
                rx="85"
                ry="45"
                fill="url(#handGlowGrad)"
                className="transition-all duration-700 ease-out"
              />
            )}

            {/* Reactive Right Hand Glow Aura */}
            {isRightHandActive && (
              <ellipse
                cx={isGhostAwake ? "515" : "508"}
                cy={isGhostAwake ? "54" : "96"}
                rx="85"
                ry="45"
                fill="url(#handGlowGrad)"
                className="transition-all duration-700 ease-out"
              />
            )}

            {/* Cute Ghost Silhouette with Animated Drooping Hands (Sleeping) vs Raised Hands (Awake) */}
            <path
              d={
                isGhostAwake
                  ? "M 310, 38 C 352, 38, 385, 49, 406, 75 C 416, 85, 428, 87, 442, 75 C 465, 54, 492, 28, 532, 26 C 564, 25, 588, 44, 584, 70 C 580, 95, 568, 130, 562, 168 C 553, 215, 558, 272, 550, 345 C 530, 328, 514, 362, 494, 346 C 474, 328, 458, 362, 438, 346 C 418, 328, 402, 362, 374, 346 C 346, 328, 330, 362, 308, 346 C 286, 362, 270, 328, 242, 346 C 214, 362, 198, 328, 178, 346 C 158, 362, 142, 328, 122, 346 C 102, 362, 86, 328, 66, 345 C 58, 270, 64, 210, 54, 160 C 46, 118, 34, 80, 30, 55 C 26, 30, 46, 12, 78, 14 C 120, 16, 150, 46, 170, 70 C 186, 84, 200, 84, 210, 74 C 230, 46, 264, 38, 310, 38 Z"
                  : "M 310, 38 C 352, 38, 385, 52, 408, 78 C 424, 94, 444, 108, 470, 118 C 496, 128, 522, 136, 546, 126 C 564, 118, 574, 105, 568, 132 C 562, 158, 558, 180, 556, 205 C 550, 242, 556, 285, 550, 345 C 530, 328, 514, 362, 494, 346 C 474, 328, 458, 362, 438, 346 C 418, 328, 402, 362, 374, 346 C 346, 328, 330, 362, 308, 346 C 286, 362, 270, 328, 242, 346 C 214, 362, 198, 328, 178, 346 C 158, 362, 142, 328, 122, 346 C 102, 362, 86, 328, 66, 345 C 58, 285, 64, 242, 54, 205 C 50, 180, 44, 158, 48, 132 C 54, 105, 66, 118, 86, 126 C 110, 136, 136, 128, 162, 118 C 188, 108, 200, 94, 212, 78 C 230, 48, 264, 38, 310, 38 Z"
              }
              fill={isGhostAwake ? "url(#cuteGhostGradWhite)" : "url(#cuteGhostGradTranslucent)"}
              stroke={isGhostAwake ? "rgba(203, 213, 225, 0.95)" : "rgba(255, 255, 255, 0.25)"}
              strokeWidth={isGhostAwake ? "2.4" : "2.2"}
              style={{
                transition: "d 0.7s cubic-bezier(0.34, 1.56, 0.64, 1), fill 0.5s ease-out, stroke 0.5s ease-out, stroke-width 0.5s ease-out",
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
              stroke={isGhostAwake ? "rgba(100, 116, 139, 0.35)" : "rgba(255, 255, 255, 0.14)"}
              strokeWidth="1.2"
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
              stroke={isGhostAwake ? "rgba(100, 116, 139, 0.35)" : "rgba(255, 255, 255, 0.14)"}
              strokeWidth="1.2"
              strokeDasharray="4 2"
              style={{ transition: "d 0.7s ease-out, stroke 0.5s ease-out" }}
            />
            <path
              d="M 310, 38 C 310, 120 310, 240 310, 346"
              fill="none"
              stroke={isGhostAwake ? "rgba(100, 116, 139, 0.2)" : "rgba(255, 255, 255, 0.05)"}
              strokeWidth="1"
              className="transition-colors duration-500"
            />

            {/* DITTO GHOST EXPRESSION (休眠睡覺 vs 啟用醒來) */}
            {!isGhostAwake ? (
              /* SLEEPING FACE (休眠狀態：閉眼安詳睡覺，伴隨浮動 zZ) */
              <g className="transition-opacity duration-300">
                {/* Sleeping Closed Eyes (⌒   ⌒) */}
                <path
                  d="M 275, 89 Q 282, 82 289, 89"
                  fill="none"
                  stroke="#a1a1aa"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M 331, 89 Q 338, 82 345, 89"
                  fill="none"
                  stroke="#a1a1aa"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Peaceful Relaxed Sleep Mouth */}
                <path
                  d="M 306, 96 Q 310, 98 314, 96"
                  fill="none"
                  stroke="#71717a"
                  strokeWidth="2"
                  strokeLinecap="round"
                />

                {/* Floating Sleep 'z' 'Z' Indicator */}
                <g className="select-none pointer-events-none opacity-50">
                  <text x="350" y="74" fill="#a1a1aa" fontSize="11" fontFamily="monospace" fontWeight="bold">z</text>
                  <text x="359" y="63" fill="#71717a" fontSize="14" fontFamily="monospace" fontWeight="bold">Z</text>
                </g>
              </g>
            ) : (
              /* AWAKE FACE (啟用狀態：黑瞳圓眼醒來、神采奕奕，伴隨腮紅與動態笑容) */
              <g className="transition-opacity duration-300">
                {/* Rosy Cheeks */}
                <ellipse cx="268" cy="95" rx="5.5" ry="3.5" fill="#fb7185" opacity="0.35" />
                <ellipse cx="352" cy="95" rx="5.5" ry="3.5" fill="#fb7185" opacity="0.35" />

                {/* Awake Beady Eyes (•   •) with Sparkle Catchlights */}
                <circle cx="282" cy="88" r="4.2" fill="#18181b" />
                <circle cx="338" cy="88" r="4.2" fill="#18181b" />
                <circle cx="283.5" cy="86.5" r="1.4" fill="#ffffff" />
                <circle cx="339.5" cy="86.5" r="1.4" fill="#ffffff" />

                {/* Awake Smile (Ditto Minimalist Line Mouth) */}
                {isAnyButtonPressed ? (
                  /* Quirky Wavy Smile when pressing buttons */
                  <path
                    d="M 300, 94 Q 305, 98.5 310, 94 Q 315, 98.5 320, 94"
                    fill="none"
                    stroke="#0891b2"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                ) : (
                  /* Classic Happy Awake Ditto Smile */
                  <path
                    d="M 302, 95 Q 310, 101.5 318, 95"
                    fill="none"
                    stroke="#18181b"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                )}
              </g>
            )}
          </svg>

          {/* Asymmetric Ghost Hands (Boo! 👻 with ZL, L, R, ZR) - Drooping during sleep, raised when awake */}
          <div className="absolute top-[12px] left-[36px] right-[36px] flex justify-between items-start z-30 pointer-events-auto">
            {/* Left Ghost Hand */}
            <div
              className={`flex items-center gap-2 p-1.5 rounded-2xl transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] pointer-events-auto ${
                isGhostAwake
                  ? "translate-y-0 rotate-[-2deg] translate-x-0 opacity-100 scale-100"
                  : "translate-y-[40px] rotate-[-12deg] -translate-x-1 opacity-90 scale-[0.98]"
              } ${
                isLeftHandActive
                  ? "bg-cyan-500/15 ring-2 ring-cyan-400/60 shadow-[0_0_25px_rgba(34,211,238,0.35)]"
                  : isGhostAwake
                  ? "bg-white/40 border border-zinc-300/60 shadow-xs backdrop-blur-[2px]"
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

            {/* Right Ghost Hand */}
            <div
              className={`flex items-center gap-2 p-1.5 rounded-2xl transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] pointer-events-auto ${
                isGhostAwake
                  ? "mt-2.5 translate-y-0 rotate-[3deg] translate-x-0 opacity-100 scale-100"
                  : "mt-2.5 translate-y-[42px] rotate-[12deg] translate-x-1 opacity-90 scale-[0.98]"
              } ${
                isRightHandActive
                  ? "bg-cyan-500/15 ring-2 ring-cyan-400/60 shadow-[0_0_25px_rgba(34,211,238,0.35)]"
                  : isGhostAwake
                  ? "bg-white/40 border border-zinc-300/60 shadow-xs backdrop-blur-[2px]"
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
                className={`relative w-24 h-24 rounded-full bg-zinc-950 border-2 transition-colors duration-150 select-none shadow-inner flex items-center justify-center touch-none cursor-grab active:cursor-grabbing pointer-events-auto ${
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
              <div className="relative w-26 h-26 flex items-center justify-center select-none pointer-events-auto">
                <div className="absolute w-9 h-26 bg-zinc-950 border-2 border-zinc-600 rounded-md shadow-lg ring-1 ring-white/10 pointer-events-none" />
                <div className="absolute w-26 h-9 bg-zinc-950 border-2 border-zinc-600 rounded-md shadow-lg ring-1 ring-white/10 pointer-events-none" />

                <button
                  {...bindButton("dpad_up")}
                  className={`absolute top-0 w-9 h-9 rounded-t flex items-center justify-center text-sm font-black transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    isUp ? "bg-white text-zinc-950 shadow-md" : "text-zinc-200 hover:text-white hover:bg-zinc-800/80"
                  }`}
                  title="十字鍵 上 (D-Pad Up - 鍵盤: ↑)"
                >
                  ▲
                </button>
                <button
                  {...bindButton("dpad_down")}
                  className={`absolute bottom-0 w-9 h-9 rounded-b flex items-center justify-center text-sm font-black transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    isDown ? "bg-white text-zinc-950 shadow-md" : "text-zinc-200 hover:text-white hover:bg-zinc-800/80"
                  }`}
                  title="十字鍵 下 (D-Pad Down - 鍵盤: ↓)"
                >
                  ▼
                </button>
                <button
                  {...bindButton("dpad_left")}
                  className={`absolute left-0 w-9 h-9 rounded-l flex items-center justify-center text-sm font-black transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    isLeft ? "bg-white text-zinc-950 shadow-md" : "text-zinc-200 hover:text-white hover:bg-zinc-800/80"
                  }`}
                  title="十字鍵 左 (D-Pad Left - 鍵盤: ←)"
                >
                  ◀
                </button>
                <button
                  {...bindButton("dpad_right")}
                  className={`absolute right-0 w-9 h-9 rounded-r flex items-center justify-center text-sm font-black transition-colors cursor-pointer pointer-events-auto select-none active:scale-95 ${
                    isRight ? "bg-white text-zinc-950 shadow-md" : "text-zinc-200 hover:text-white hover:bg-zinc-800/80"
                  }`}
                  title="十字鍵 右 (D-Pad Right - 鍵盤: →)"
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
              <button
                type="button"
                onClick={onToggleEsp32 || onToggleMute}
                className={`px-4 py-1 rounded-full text-[11px] font-mono tracking-widest border-2 shadow-md flex items-center gap-2 select-none transition-all cursor-pointer pointer-events-auto active:scale-95 ${
                  isGhostAwake
                    ? "text-zinc-100 border-cyan-500/70 bg-zinc-950 shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:border-cyan-400"
                    : "text-zinc-400 border-zinc-600 bg-zinc-950/95 hover:border-zinc-500 hover:text-zinc-200"
                }`}
                title={
                  isGhostAwake
                    ? "ESP32 服務運作中 (Ghost 已醒來，點擊停止)"
                    : "ESP32 待命中 (Ghost 休眠中，點擊啟動)"
                }
              >
                <span
                  className={`w-2 h-2 rounded-full transition-colors ${
                    isGhostAwake
                      ? "bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.9)]"
                      : "bg-zinc-600"
                  }`}
                />
                <span>GHOST-PAD</span>
              </button>

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
                className={`relative w-24 h-24 rounded-full bg-zinc-950 border-2 transition-colors duration-150 select-none shadow-inner flex items-center justify-center touch-none cursor-grab active:cursor-grabbing pointer-events-auto ${
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
        </div>

        {/* Real-Time Live Input Timeline Stream (Reverse Taiko / DAW Musical Stave) */}
        <div className="w-full shrink-0 pt-1 pb-1">
          <InputTimelineStream state={state} />
        </div>
      </div>
    </div>
  );
};
