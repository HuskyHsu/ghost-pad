import React, { useEffect, useRef, useState, useCallback } from "react";
import { ControllerState } from "../types";
import { Film, Trash2, Zap, Clock } from "lucide-react";

interface Props {
  state: ControllerState;
}

interface NoteEvent {
  id: number;
  buttonId: string;
  label: string;
  lane: number; // 0: ABXY, 1: D-Pad, 2: Triggers, 3: Sticks & System
  color: string;
  glowColor: string;
  startTime: number;
  endTime: number | null; // null while held
}

// 5 distinct track lanes (五線譜五軌架構)
const LANES = [
  { name: "ABXY", color: "#38bdf8", desc: "動作鍵" },
  { name: "十字鍵", color: "#a855f7", desc: "D-Pad" },
  { name: "搖桿", color: "#06b6d4", desc: "類比搖桿與下壓" },
  { name: "肩鍵", color: "#f43f5e", desc: "L/R/ZL/ZR" },
  { name: "系統", color: "#94a3b8", desc: "功能鍵" },
];

const DURATION_OPTIONS = [10, 15, 30, 60];

// Helper to determine 8-directional stick state
const getStickDirection = (x: number, y: number, prefix: "L" | "R"): string | null => {
  const dx = x - 128;
  const dy = y - 128; // > 0 is Up, < 0 is Down
  const dist = Math.hypot(dx, dy);
  const DEADZONE = 36; // Deflection threshold out of 127

  if (dist < DEADZONE) return null;

  // 0 deg is Right, 90 deg is Up, 180 deg is Left, 270 deg is Down
  let deg = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;

  if (deg >= 337.5 || deg < 22.5) return `${prefix}▶`;
  if (deg >= 22.5 && deg < 67.5) return `${prefix}↗`;
  if (deg >= 67.5 && deg < 112.5) return `${prefix}▲`;
  if (deg >= 112.5 && deg < 157.5) return `${prefix}↖`;
  if (deg >= 157.5 && deg < 202.5) return `${prefix}◀`;
  if (deg >= 202.5 && deg < 247.5) return `${prefix}↙`;
  if (deg >= 247.5 && deg < 292.5) return `${prefix}▼`;
  return `${prefix}↘`;
};

export const InputTimelineStream: React.FC<Props> = ({ state }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Time window duration in seconds (default: 30s)
  const [duration, setDuration] = useState<number>(30);
  const [operationCount, setOperationCount] = useState<number>(0);

  // Persistent notes buffer
  const notesRef = useRef<NoteEvent[]>([]);
  const nextNoteIdRef = useRef<number>(1);
  const lastVisibleCountRef = useRef<number>(0);
  const prevStateRef = useRef<ControllerState>(state);
  const heldNotesMapRef = useRef<Map<string, NoteEvent>>(new Map());

  // Helper to extract active button booleans from state
  const getButtonStates = useCallback((s: ControllerState) => {
    // D-Pad numeric decode
    const dpadVal = typeof s.dpad === "number" ? s.dpad : 8;
    const isUp = [0, 1, 7].includes(dpadVal);
    const isRight = [1, 2, 3].includes(dpadVal);
    const isDown = [3, 4, 5].includes(dpadVal);
    const isLeft = [5, 6, 7].includes(dpadVal);

    return {
      // Lane 0: Action Buttons
      a: { active: s.a, label: "A", lane: 0, color: "#10b981", glow: "rgba(16,185,129,0.7)" },
      b: { active: s.b, label: "B", lane: 0, color: "#ef4444", glow: "rgba(239,68,68,0.7)" },
      x: { active: s.x, label: "X", lane: 0, color: "#38bdf8", glow: "rgba(56,189,248,0.7)" },
      y: { active: s.y, label: "Y", lane: 0, color: "#f59e0b", glow: "rgba(245,158,11,0.7)" },

      // Lane 1: D-Pad
      dpad_up: { active: isUp, label: "▲", lane: 1, color: "#c084fc", glow: "rgba(192,132,252,0.7)" },
      dpad_down: { active: isDown, label: "▼", lane: 1, color: "#c084fc", glow: "rgba(192,132,252,0.7)" },
      dpad_left: { active: isLeft, label: "◀", lane: 1, color: "#c084fc", glow: "rgba(192,132,252,0.7)" },
      dpad_right: { active: isRight, label: "▶", lane: 1, color: "#c084fc", glow: "rgba(192,132,252,0.7)" },

      // Lane 2: Stick Clicks
      l3: { active: s.l_stick_click, label: "L3", lane: 2, color: "#06b6d4", glow: "rgba(6,182,212,0.7)" },
      r3: { active: s.r_stick_click, label: "R3", lane: 2, color: "#14b8a6", glow: "rgba(20,184,166,0.7)" },

      // Lane 3: Shoulder Buttons
      l: { active: s.l, label: "L", lane: 3, color: "#ec4899", glow: "rgba(236,72,153,0.7)" },
      zl: { active: s.zl, label: "ZL", lane: 3, color: "#f43f5e", glow: "rgba(244,63,94,0.7)" },
      r: { active: s.r, label: "R", lane: 3, color: "#ec4899", glow: "rgba(236,72,153,0.7)" },
      zr: { active: s.zr, label: "ZR", lane: 3, color: "#f43f5e", glow: "rgba(244,63,94,0.7)" },

      // Lane 4: System Function Buttons
      minus: { active: s.minus, label: "−", lane: 4, color: "#94a3b8", glow: "rgba(148,163,184,0.7)" },
      plus: { active: s.plus, label: "+", lane: 4, color: "#94a3b8", glow: "rgba(148,163,184,0.7)" },
      capture: { active: s.capture, label: "◉", lane: 4, color: "#94a3b8", glow: "rgba(148,163,184,0.7)" },
      home: { active: s.home, label: "⌂", lane: 4, color: "#38bdf8", glow: "rgba(56,189,248,0.7)" },
    };
  }, []);

  // Detect state transitions and spawn / finalize notes
  useEffect(() => {
    const now = performance.now();
    const currButtons = getButtonStates(state);
    const prevButtons = getButtonStates(prevStateRef.current);
    let newOps = 0;

    // 1. Digital Button Transitions
    Object.entries(currButtons).forEach(([key, btn]) => {
      const prevActive = prevButtons[key as keyof typeof prevButtons]?.active ?? false;
      const currActive = btn.active;

      // Transition: Press (false -> true)
      if (!prevActive && currActive) {
        newOps++;
        const newNote: NoteEvent = {
          id: nextNoteIdRef.current++,
          buttonId: key,
          label: btn.label,
          lane: btn.lane,
          color: btn.color,
          glowColor: btn.glow,
          startTime: now,
          endTime: null,
        };
        notesRef.current.push(newNote);
        heldNotesMapRef.current.set(key, newNote);
      }

      // Transition: Release (true -> false)
      if (prevActive && !currActive) {
        const held = heldNotesMapRef.current.get(key);
        if (held) {
          held.endTime = now;
          heldNotesMapRef.current.delete(key);
        }
      }
    });

    // 2. Left Analog Thumbstick Movements
    const currLDir = getStickDirection(state.left_stick_x, state.left_stick_y, "L");
    const prevLDir = getStickDirection(prevStateRef.current.left_stick_x, prevStateRef.current.left_stick_y, "L");

    if (currLDir !== prevLDir) {
      if (prevLDir) {
        const held = heldNotesMapRef.current.get("stick_left");
        if (held) {
          held.endTime = now;
          heldNotesMapRef.current.delete("stick_left");
        }
      }
      if (currLDir) {
        newOps++;
        const newNote: NoteEvent = {
          id: nextNoteIdRef.current++,
          buttonId: "stick_left",
          label: currLDir,
          lane: 2, // 搖桿軌道
          color: "#06b6d4",
          glowColor: "rgba(6,182,212,0.8)",
          startTime: now,
          endTime: null,
        };
        notesRef.current.push(newNote);
        heldNotesMapRef.current.set("stick_left", newNote);
      }
    }

    // 3. Right Analog Thumbstick Movements
    const currRDir = getStickDirection(state.right_stick_x, state.right_stick_y, "R");
    const prevRDir = getStickDirection(prevStateRef.current.right_stick_x, prevStateRef.current.right_stick_y, "R");

    if (currRDir !== prevRDir) {
      if (prevRDir) {
        const held = heldNotesMapRef.current.get("stick_right");
        if (held) {
          held.endTime = now;
          heldNotesMapRef.current.delete("stick_right");
        }
      }
      if (currRDir) {
        newOps++;
        const newNote: NoteEvent = {
          id: nextNoteIdRef.current++,
          buttonId: "stick_right",
          label: currRDir,
          lane: 2, // 搖桿軌道
          color: "#14b8a6",
          glowColor: "rgba(20,184,166,0.8)",
          startTime: now,
          endTime: null,
        };
        notesRef.current.push(newNote);
        heldNotesMapRef.current.set("stick_right", newNote);
      }
    }

    prevStateRef.current = state;
  }, [state, getButtonStates]);

  // Clear timeline history
  const handleClear = () => {
    notesRef.current = [];
    heldNotesMapRef.current.clear();
    lastVisibleCountRef.current = 0;
    setOperationCount(0);
  };

  // High-performance 60~120Hz Canvas Rendering Loop
  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) {
        animId = requestAnimationFrame(render);
        return;
      }

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = rect.width;
      const height = rect.height;

      if (width <= 0 || height <= 0) {
        animId = requestAnimationFrame(render);
        return;
      }

      // Adjust canvas resolution for Retina screens
      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Reset & set transform directly without compounding
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Clear background
      ctx.clearRect(0, 0, width, height);

      const now = performance.now();
      const numLanes = LANES.length;

      // Top and bottom ruler dimensions
      const RULER_TOP_H = 18;
      const RULER_BOT_H = 14;
      const tracksH = height - RULER_TOP_H - RULER_BOT_H;
      const laneHeight = tracksH / numLanes;

      // Sidebar and Playhead start flush to left
      const SIDEBAR_W = 58;
      const strikeX = SIDEBAR_W;
      const trackWidth = Math.max(1, width - strikeX);

      // 1. Draw horizontal track lanes (DAW / Musical Stave lines)
      for (let i = 0; i < numLanes; i++) {
        const yTop = RULER_TOP_H + i * laneHeight;
        const yBottom = yTop + laneHeight;

        // Alternating subtle zebra striping
        ctx.fillStyle = i % 2 === 0 ? "rgba(18, 18, 22, 0.7)" : "rgba(12, 12, 15, 0.7)";
        ctx.fillRect(0, yTop, width, laneHeight);

        // Track divider line (stave line)
        ctx.strokeStyle = "rgba(63, 63, 70, 0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, yBottom);
        ctx.lineTo(width, yBottom);
        ctx.stroke();
      }

      // 2. Draw Top & Bottom Rulers and 5s Time Nodes / Grid lines
      // Calculate major step based on total duration (e.g. 5s for 30s)
      let majorStep = 5;
      if (duration <= 10) majorStep = 2;
      else if (duration <= 20) majorStep = 5;
      else if (duration <= 30) majorStep = 5;
      else majorStep = 10;

      // Top ruler background
      ctx.fillStyle = "rgba(18, 18, 22, 0.9)";
      ctx.fillRect(0, 0, width, RULER_TOP_H);
      ctx.strokeStyle = "rgba(63, 63, 70, 0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, RULER_TOP_H);
      ctx.lineTo(width, RULER_TOP_H);
      ctx.stroke();

      // Bottom ruler background
      ctx.fillStyle = "rgba(18, 18, 22, 0.85)";
      ctx.fillRect(0, height - RULER_BOT_H, width, RULER_BOT_H);
      ctx.beginPath();
      ctx.moveTo(0, height - RULER_BOT_H);
      ctx.lineTo(width, height - RULER_BOT_H);
      ctx.stroke();

      // Draw Time Ticks & Nodes
      for (let sec = 0; sec <= duration; sec += 1) {
        const x = strikeX + (sec / duration) * trackWidth;
        const isMajor = sec % majorStep === 0;

        if (isMajor) {
          // Vertical fine line traversing all lanes
          if (sec > 0 && sec < duration) {
            ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, RULER_TOP_H);
            ctx.lineTo(x, height - RULER_BOT_H);
            ctx.stroke();
          }

          // Top ruler tick & label
          ctx.strokeStyle = "rgba(161, 161, 170, 0.7)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, RULER_TOP_H - 5);
          ctx.lineTo(x, RULER_TOP_H);
          ctx.stroke();

          ctx.fillStyle = "#a1a1aa";
          ctx.font = "bold 9px monospace";
          ctx.textAlign = sec === 0 ? "left" : sec === duration ? "right" : "center";
          ctx.textBaseline = "bottom";
          ctx.fillText(`${sec}s`, x + (sec === 0 ? 3 : sec === duration ? -3 : 0), RULER_TOP_H - 4);

          // Bottom ruler tick & label
          ctx.strokeStyle = "rgba(161, 161, 170, 0.45)";
          ctx.beginPath();
          ctx.moveTo(x, height - RULER_BOT_H);
          ctx.lineTo(x, height - RULER_BOT_H + 4);
          ctx.stroke();

          ctx.fillStyle = "#71717a";
          ctx.font = "8px monospace";
          ctx.textAlign = sec === 0 ? "left" : sec === duration ? "right" : "center";
          ctx.textBaseline = "top";
          ctx.fillText(`${sec}s`, x + (sec === 0 ? 3 : sec === duration ? -3 : 0), height - RULER_BOT_H + 3);
        } else {
          // Minor 1-second tick at top & bottom
          ctx.strokeStyle = "rgba(113, 113, 122, 0.25)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, RULER_TOP_H - 3);
          ctx.lineTo(x, RULER_TOP_H);
          ctx.moveTo(x, height - RULER_BOT_H);
          ctx.lineTo(x, height - RULER_BOT_H + 3);
          ctx.stroke();
        }
      }

      // 3. Draw active & past Note Events (Pills and sustained ribbons)
      const NOTE_SIZE = Math.max(12, Math.min(18, laneHeight - 5));

      // Clip notes to playable track area so they don't bleed into the sidebar
      ctx.save();
      ctx.beginPath();
      ctx.rect(strikeX, RULER_TOP_H, trackWidth, tracksH);
      ctx.clip();

      let visibleNotes = 0;

      notesRef.current = notesRef.current.filter((note) => {
        const laneY = RULER_TOP_H + note.lane * laneHeight + (laneHeight - NOTE_SIZE) / 2;
        const timeFromStart = Math.max(0, (now - note.startTime) / 1000);
        const isHeld = note.endTime === null;

        // Head center: starts flush at (strikeX + NOTE_SIZE / 2) and advances continuously with time
        const headCenter = strikeX + NOTE_SIZE / 2 + (timeFromStart / duration) * trackWidth;
        const headRight = headCenter + NOTE_SIZE / 2;

        let tailLeft: number;
        if (isHeld) {
          // While actively held: ribbon tail is anchored flush to the 0s strike line
          tailLeft = strikeX;
        } else {
          // When released: tail departs 0s at the release timestamp
          const endTime = note.endTime ?? now;
          const timeFromEnd = Math.max(0, (now - endTime) / 1000);
          tailLeft = strikeX + (timeFromEnd / duration) * trackWidth;
        }

        // The note's bounding box: width is at least NOTE_SIZE, stretching smoothly with head
        const noteX = tailLeft;
        const noteW = Math.max(NOTE_SIZE, headRight - tailLeft);
        const textX = headCenter;

        // Purge when fully past right border
        if (noteX > width + 5) {
          return false;
        }

        visibleNotes++;

        // Render the Note Ribbon / Pill
        ctx.save();

        if (isHeld) {
          ctx.shadowColor = note.glowColor;
          ctx.shadowBlur = 10;
        }

        // Pill gradient background
        const grad = ctx.createLinearGradient(noteX, 0, noteX + noteW, 0);
        grad.addColorStop(0, note.color);
        grad.addColorStop(1, isHeld ? "#ffffff" : note.color);

        // Constant radius = half height ensures a perfect capsule / stadium pill
        const r = NOTE_SIZE / 2;

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(noteX, laneY, noteW, NOTE_SIZE, r);
        ctx.fill();

        // Stroke border
        ctx.strokeStyle = isHeld ? "rgba(255, 255, 255, 0.95)" : "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // If held, draw an active leading head pulse highlight
        if (isHeld) {
          ctx.beginPath();
          ctx.arc(headCenter, laneY + NOTE_SIZE / 2, NOTE_SIZE / 2, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
          ctx.fill();
        }

        // Text Icon inside the note pill (strictly centered inside the leading head circle)
        ctx.fillStyle = "#09090b";
        ctx.font = "900 10.5px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(note.label, textX, laneY + NOTE_SIZE / 2);

        ctx.restore();
        return true;
      });

      ctx.restore(); // End clipping

      // Dynamically update operation count to reflect active visible events on timeline
      if (lastVisibleCountRef.current !== visibleNotes) {
        lastVisibleCountRef.current = visibleNotes;
        setOperationCount(visibleNotes);
      }

      // 4. Smooth Edge Fade Gradient (notes fade as they reach the exit boundary)
      const FADE_W = 40;
      const fadeGrad = ctx.createLinearGradient(width - FADE_W, 0, width, 0);
      fadeGrad.addColorStop(0, "rgba(9, 9, 11, 0)");
      fadeGrad.addColorStop(1, "rgba(9, 9, 11, 0.95)");
      ctx.fillStyle = fadeGrad;
      ctx.fillRect(width - FADE_W, RULER_TOP_H, FADE_W, tracksH);

      // 5. Track Sidebar Column (Crisp DAW track header)
      ctx.fillStyle = "rgba(13, 13, 16, 0.97)";
      ctx.fillRect(0, 0, SIDEBAR_W, height);

      // Top-left corner title
      ctx.fillStyle = "#71717a";
      ctx.font = "bold 9px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("軌道", SIDEBAR_W / 2, RULER_TOP_H / 2);

      // Draw lane badges inside sidebar with crisp dividers
      for (let i = 0; i < numLanes; i++) {
        const yTop = RULER_TOP_H + i * laneHeight;
        const yBottom = yTop + laneHeight;
        const yCenter = yTop + laneHeight / 2;

        // Subtle row divider in sidebar
        ctx.strokeStyle = "rgba(63, 63, 70, 0.35)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, yBottom);
        ctx.lineTo(SIDEBAR_W, yBottom);
        ctx.stroke();

        // Color indicator dot
        const dotX = 9;
        ctx.fillStyle = LANES[i].color;
        ctx.beginPath();
        ctx.arc(dotX, yCenter, 3, 0, Math.PI * 2);
        ctx.fill();

        // Lane title
        ctx.fillStyle = "#e4e4e7";
        ctx.font = "bold 9px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(LANES[i].name, dotX + 7, yCenter);
      }

      // 6. Draw Strike Line (Playhead Line - flush to left border of tracks)
      ctx.save();
      ctx.shadowColor = "rgba(34, 211, 238, 0.85)";
      ctx.shadowBlur = 8;
      ctx.strokeStyle = "rgba(34, 211, 238, 0.95)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(strikeX, RULER_TOP_H);
      ctx.lineTo(strikeX, height - RULER_BOT_H);
      ctx.stroke();
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [duration]);

  return (
    <div className="w-full rounded-2xl bg-zinc-950/90 border border-zinc-800 shadow-xl overflow-hidden flex flex-col backdrop-blur-md">
      {/* Stream Control Header */}
      <div className="h-9 sm:h-10 px-3 sm:px-4 border-b border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-cyan-400">
            <Film className="w-3 h-3" />
          </div>
          <span className="text-xs font-semibold text-zinc-200">即時操作時序流 (Live Stream)</span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {/* Operation count badge */}
          <span className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 bg-zinc-900/80 px-2.5 py-1 rounded-lg border border-zinc-800">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>操作次數: <span className="text-zinc-100 font-bold">{operationCount}</span></span>
          </span>

          {/* Time Duration Window Selector */}
          <button
            onClick={() => {
              setDuration((prev) => {
                const idx = DURATION_OPTIONS.indexOf(prev);
                return DURATION_OPTIONS[(idx + 1) % DURATION_OPTIONS.length];
              });
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/80 text-zinc-200 text-[11px] transition-colors font-mono cursor-pointer"
            title="點擊切換時間軸總長度 (10s / 15s / 30s / 60s)"
          >
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>總長度 {duration}s</span>
          </button>

          {/* Clear history button */}
          <button
            onClick={handleClear}
            className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
            title="清空歷史紀錄"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Streaming Canvas Area */}
      <div
        ref={containerRef}
        className="w-full h-32 sm:h-36 relative bg-zinc-950 overflow-hidden select-none"
      >
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
      </div>
    </div>
  );
};
