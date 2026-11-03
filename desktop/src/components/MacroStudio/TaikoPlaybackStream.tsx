import React, { useEffect, useRef } from "react";
import { MacroScript } from "../../types/macro";
import { computeScheduledActions, ScheduledAction } from "../../utils/macroStorage";
import { LANES, getStickDirection } from "../InputTimelineStream";

interface Props {
  script: MacroScript;
  isPlaying: boolean;
  isPaused: boolean;
  currentPlayheadMs: number; // current elapsed ms in current loop
  activeActionIndex?: number;
  speedMultiplier?: number;
}

// Maps action to lane and visual styles matching InputTimelineStream
function getActionLaneInfo(action: ScheduledAction) {
  if (action.type === "button") {
    const btn = (action.button || "a").toLowerCase();
    if (["a", "b", "x", "y"].includes(btn)) {
      const colorMap: Record<string, { color: string; glow: string }> = {
        a: { color: "#10b981", glow: "rgba(16,185,129,0.8)" },
        b: { color: "#ef4444", glow: "rgba(239,68,68,0.8)" },
        x: { color: "#38bdf8", glow: "rgba(56,189,248,0.8)" },
        y: { color: "#f59e0b", glow: "rgba(245,158,11,0.8)" },
      };
      return {
        lane: 0,
        label: btn.toUpperCase(),
        color: colorMap[btn]?.color || "#38bdf8",
        glow: colorMap[btn]?.glow || "rgba(56,189,248,0.8)",
      };
    }
    if (["l", "r", "zl", "zr"].includes(btn)) {
      return {
        lane: 3,
        label: btn.toUpperCase(),
        color: "#f43f5e",
        glow: "rgba(244,63,94,0.8)",
      };
    }
    if (["minus", "plus", "home", "capture"].includes(btn)) {
      const labelMap: Record<string, string> = {
        minus: "−",
        plus: "+",
        home: "⌂",
        capture: "◉",
      };
      return {
        lane: 4,
        label: labelMap[btn] || btn.toUpperCase(),
        color: btn === "home" ? "#38bdf8" : "#94a3b8",
        glow: "rgba(148,163,184,0.8)",
      };
    }
    if (["l_stick_click", "r_stick_click"].includes(btn)) {
      return {
        lane: 2,
        label: btn === "l_stick_click" ? "L3" : "R3",
        color: "#06b6d4",
        glow: "rgba(6,182,212,0.8)",
      };
    }
  }

  if (action.type === "stick") {
    const prefix = action.stick === "left" ? "L" : "R";
    const sx = typeof action.stickX === "number" ? action.stickX : 128;
    const sy = typeof action.stickY === "number" ? action.stickY : 128;
    const dir = getStickDirection(sx, sy, prefix) || `${prefix}•`;
    return {
      lane: 2,
      label: dir,
      color: "#06b6d4",
      glow: "rgba(6,182,212,0.8)",
    };
  }

  if (action.type === "dpad") {
    const dpadMap = ["▲", "↗", "▶", "↘", "▼", "↙", "◀", "↖"];
    const dir = dpadMap[action.dpad ?? 0] || "▲";
    return {
      lane: 1,
      label: dir,
      color: "#c084fc",
      glow: "rgba(192,132,252,0.8)",
    };
  }

  return {
    lane: 4,
    label: "Wait",
    color: "#64748b",
    glow: "rgba(100,116,139,0.5)",
  };
}

export const PlaybackTimelineStream: React.FC<Props> = ({
  script,
  isPlaying,
  currentPlayheadMs,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Time window visible on screen (e.g. 5 seconds visible to the right of hit target)
  const WINDOW_MS = 5000;

  // Pre-calculate timing for all actions
  const scheduled = computeScheduledActions(script.actions);

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

      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const numLanes = LANES.length;
      const RULER_TOP_H = 18;
      const tracksH = height - RULER_TOP_H - 12;
      const laneH = tracksH / numLanes;

      // Clean trigger line anchored on the left
      const HIT_X = 64;
      const playableW = Math.max(1, width - HIT_X);

      // 1. Draw 5-track lanes
      for (let i = 0; i < numLanes; i++) {
        const yTop = RULER_TOP_H + i * laneH;
        const yBottom = yTop + laneH;

        ctx.fillStyle = i % 2 === 0 ? "rgba(18, 18, 24, 0.8)" : "rgba(12, 12, 16, 0.8)";
        ctx.fillRect(0, yTop, width, laneH);

        ctx.strokeStyle = "rgba(63, 63, 70, 0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, yBottom);
        ctx.lineTo(width, yBottom);
        ctx.stroke();

        // Left Lane Label
        ctx.fillStyle = "rgba(161, 161, 170, 0.7)";
        ctx.font = "9px Inter, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(LANES[i].name, HIT_X - 12, yTop + laneH / 2 + 3);
      }

      // 2. Draw Notes Streaming from Right towards Left
      // Any note that finished before currentPlayheadMs disappears upon completing hit!
      const NOTE_H = Math.max(14, laneH - 6);
      let isAnyNoteHitting = false;

      ctx.save();
      // Clip so notes disappear cleanly to the left of the trigger line
      ctx.beginPath();
      ctx.rect(HIT_X - 2, RULER_TOP_H, width, tracksH);
      ctx.clip();

      scheduled.forEach((item) => {
        // Disappear check: If note has completed its hit, it vanishes!
        if (currentPlayheadMs >= item.endTimeMs) {
          return;
        }

        const info = getActionLaneInfo(item);
        const laneY = RULER_TOP_H + info.lane * laneH + (laneH - NOTE_H) / 2;

        // Position: Moves towards HIT_X as currentPlayheadMs increases
        const msUntilHit = item.startTimeMs - currentPlayheadMs;
        const xStart = HIT_X + (msUntilHit / WINDOW_MS) * playableW;
        const noteWidth = Math.max(18, (item.durationMs / WINDOW_MS) * playableW);
        const xEnd = xStart + noteWidth;

        // Active hit check (Triggering right at the hit target!)
        const isHitting = currentPlayheadMs >= item.startTimeMs && currentPlayheadMs < item.endTimeMs;
        if (isHitting) {
          isAnyNoteHitting = true;
        }

        // Render if within view
        if (xEnd >= HIT_X - 2 && xStart <= width + 50) {
          // Draw sustained ribbon tail
          ctx.fillStyle = info.color;
          ctx.globalAlpha = isHitting ? 0.95 : 0.75;
          ctx.beginPath();
          ctx.roundRect(xStart, laneY, noteWidth, NOTE_H, 4);
          ctx.fill();

          // Glowing border for active triggering note
          if (isHitting) {
            ctx.shadowColor = info.glow;
            ctx.shadowBlur = 14;
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.shadowBlur = 0;
          } else {
            ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
            ctx.lineWidth = 1;
            ctx.stroke();
          }

          // Note label inside pill
          ctx.globalAlpha = 1;
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 9px monospace";
          ctx.textAlign = "center";
          ctx.fillText(info.label, xStart + noteWidth / 2, laneY + NOTE_H / 2 + 3);
        }
      });

      ctx.restore();

      // 3. Draw Clean Vertical Trigger Line (No Circles)
      ctx.save();
      ctx.strokeStyle = isAnyNoteHitting
        ? "#22d3ee"
        : isPlaying
        ? "rgba(34, 211, 238, 0.6)"
        : "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = isAnyNoteHitting ? 2.5 : 1.5;
      if (isAnyNoteHitting) {
        ctx.shadowColor = "rgba(34, 211, 238, 0.9)";
        ctx.shadowBlur = 10;
      }
      ctx.beginPath();
      ctx.moveTo(HIT_X, RULER_TOP_H);
      ctx.lineTo(HIT_X, height - 12);
      ctx.stroke();
      ctx.restore();

      // Top label for trigger line
      ctx.fillStyle = isAnyNoteHitting ? "#22d3ee" : isPlaying ? "rgba(34, 211, 238, 0.8)" : "#71717a";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillText("▼", HIT_X, RULER_TOP_H - 4);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [script, isPlaying, currentPlayheadMs, scheduled]);

  return (
    <div
      ref={containerRef}
      className="w-full h-32 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-inner overflow-hidden select-none relative"
      title="即時播放時序流 (動作向左推進至觸發線，觸發後消失)"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
      <div className="absolute top-1.5 right-3 text-[10px] font-mono text-zinc-500 pointer-events-none flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        <span>即時播放時序流</span>
      </div>
    </div>
  );
};

// Export alias for compatibility
export const TaikoPlaybackStream = PlaybackTimelineStream;
