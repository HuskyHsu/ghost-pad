import React from "react";
import { MacroAction, MacroScript } from "../../types/macro";
import { getScriptTotalDurationMs } from "../../utils/macroStorage";
import { Layers } from "lucide-react";

interface Props {
  script: MacroScript;
  activeActionIndex?: number;
  onSelectStep?: (index: number) => void;
}

interface TrackDef {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  matches: (action: MacroAction) => boolean;
}

const TRACKS: TrackDef[] = [
  {
    id: "abxy",
    name: "ABXY 動作",
    color: "text-emerald-400 border-emerald-500 bg-emerald-500/20",
    bgColor: "border-emerald-500/30",
    matches: (a) => a.type === "button" && ["a", "b", "x", "y"].includes(a.button || ""),
  },
  {
    id: "dpad",
    name: "十字鍵",
    color: "text-purple-400 border-purple-500 bg-purple-500/20",
    bgColor: "border-purple-500/30",
    matches: (a) => a.type === "dpad",
  },
  {
    id: "sticks",
    name: "類比搖桿",
    color: "text-cyan-400 border-cyan-500 bg-cyan-500/20",
    bgColor: "border-cyan-500/30",
    matches: (a) =>
      a.type === "stick" ||
      (a.type === "button" && ["l_stick_click", "r_stick_click"].includes(a.button || "")),
  },
  {
    id: "shoulders",
    name: "肩鍵 L/R",
    color: "text-pink-400 border-pink-500 bg-pink-500/20",
    bgColor: "border-pink-500/30",
    matches: (a) => a.type === "button" && ["l", "r", "zl", "zr"].includes(a.button || ""),
  },
  {
    id: "system",
    name: "系統鍵",
    color: "text-amber-400 border-amber-500 bg-amber-500/20",
    bgColor: "border-amber-500/30",
    matches: (a) =>
      a.type === "button" && ["minus", "plus", "home", "capture"].includes(a.button || ""),
  },
];

export const MacroTimelineTrack: React.FC<Props> = ({
  script,
  activeActionIndex = -1,
  onSelectStep,
}) => {
  const actions = script.actions;
  const totalDuration = Math.max(1000, getScriptTotalDurationMs(script));

  return (
    <div className="w-full flex flex-col rounded-2xl bg-zinc-950 border border-zinc-800/80 overflow-hidden shadow-inner">
      {/* Track Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/80 bg-zinc-900/40">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
          <Layers className="w-3.5 h-3.5 text-violet-400" />
          <span>多軌動作時間軸 (Multi-Track Timeline View)</span>
        </div>
        <div className="text-[10px] text-zinc-500 font-mono">
          總時長 {(totalDuration / 1000).toFixed(2)}s • {actions.length} 個時序動作
        </div>
      </div>

      {/* Tracks Container */}
      <div className="p-3 space-y-2 select-none">
        {TRACKS.map((track) => {
          const trackActionsWithIdx = actions
            .map((act, index) => ({ act, index }))
            .filter(({ act }) => track.matches(act));

          return (
            <div key={track.id} className="flex items-center gap-2">
              {/* Track Label */}
              <div className="w-20 shrink-0 text-[10px] font-medium text-zinc-400 text-right pr-2">
                {track.name}
              </div>

              {/* Lane */}
              <div className="flex-1 h-8 rounded-lg bg-zinc-900/60 border border-zinc-800/60 relative overflow-hidden flex items-center">
                {trackActionsWithIdx.map(({ act, index }) => {
                  const isActive = activeActionIndex === index;
                  const leftPct = (Math.max(0, act.startTimeMs) / totalDuration) * 100;
                  const widthPct = Math.max(2.5, (act.durationMs / totalDuration) * 100);

                  const label =
                    act.button?.toUpperCase() ||
                    (act.type === "stick" ? `${act.stick === "left" ? "L" : "R"}搖桿` : "D-Pad");

                  return (
                    <button
                      key={act.id}
                      onClick={() => onSelectStep?.(index)}
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                      }}
                      className={`absolute top-1 bottom-1 rounded px-1.5 text-[9px] font-bold border transition-all cursor-pointer flex items-center justify-between overflow-hidden shrink-0 ${
                        track.color
                      } ${
                        isActive
                          ? "ring-2 ring-white scale-105 shadow-[0_0_12px_rgba(255,255,255,0.7)] z-10"
                          : "hover:brightness-125 z-0"
                      }`}
                      title={`#${index + 1} ${label} (${act.startTimeMs}ms ~ ${act.startTimeMs + act.durationMs}ms)`}
                    >
                      <span className="truncate">{label}</span>
                      <span className="text-[7px] opacity-75 font-mono ml-0.5 truncate hidden sm:inline">
                        {act.durationMs}ms
                      </span>
                    </button>
                  );
                })}

                {trackActionsWithIdx.length === 0 && (
                  <div className="text-[10px] text-zinc-700 italic px-3 select-none">空</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
