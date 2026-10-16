import React from "react";
import {
  MacroScript,
  MacroPlayerStatus,
  MacroPlaybackConfig,
} from "../../types/macro";
import {
  Play,
  Pause,
  Square,
  Repeat,
} from "lucide-react";

interface Props {
  script: MacroScript | null;
  status: MacroPlayerStatus;
  config: MacroPlaybackConfig;
  onChangeConfig: (updates: Partial<MacroPlaybackConfig>) => void;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export const MacroPlayerBar: React.FC<Props> = ({
  script,
  status,
  config,
  onChangeConfig,
  onPlay,
  onPause,
  onResume,
  onStop,
}) => {
  const isPlaying = status.isPlaying;
  const isPaused = status.isPaused;

  return (
    <div className="w-full bg-zinc-900 border-t border-zinc-800 px-4 py-3 shrink-0 select-none shadow-2xl">
      {/* Control Console Row: 3 columns with fixed left and right to prevent any horizontal jumping */}
      <div className="w-full flex items-center justify-between gap-4">
        {/* Left: Script Title & Playback State (Fixed shrink-0 to prevent shifting) */}
        <div className="flex items-center gap-3 shrink-0 min-w-[260px]">
          {/* Play / Pause / Resume / Stop Main Button Group */}
          <div className="flex items-center gap-1.5">
            {!isPlaying ? (
              <button
                type="button"
                disabled={!script || script.actions.length === 0}
                onClick={onPlay}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 transition-all cursor-pointer active:scale-95"
                title="開始播放腳本"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>播放腳本</span>
              </button>
            ) : isPaused ? (
              <button
                type="button"
                onClick={onResume}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-lg shadow-amber-500/30 transition-all cursor-pointer active:scale-95"
                title="繼續播放"
              >
                <Play className="w-4 h-4 fill-zinc-950" />
                <span>繼續</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onPause}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-lg shadow-amber-500/30 transition-all cursor-pointer active:scale-95"
                title="暫停播放"
              >
                <Pause className="w-4 h-4" />
                <span>暫停</span>
              </button>
            )}

            {/* Stop / Fail-Safe Button */}
            <button
              type="button"
              disabled={!isPlaying}
              onClick={onStop}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 disabled:opacity-30 disabled:hover:bg-rose-600/20 disabled:hover:text-rose-300 transition-all cursor-pointer active:scale-95"
              title="停止播放並重置手把中立 (Esc)"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">緊急中止</span>
              <kbd className="hidden lg:inline-block text-[9px] px-1 py-0.2 rounded bg-black/40 text-rose-200">
                Esc
              </kbd>
            </button>
          </div>

          {/* Script Name & Status Indicator */}
          <div className="flex flex-col">
            <div className="text-xs font-semibold text-zinc-100 truncate max-w-[160px]">
              {script ? script.name : "尚未選擇腳本"}
            </div>
            <div className="flex items-center gap-1.5 text-[10px]">
              {isPlaying ? (
                <span className="flex items-center gap-1 text-emerald-400 font-medium animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {isPaused
                    ? "已暫停"
                    : `播放中 (第 ${status.currentLoop} 次 / 步驟 #${status.currentActionIndex + 1})`}
                </span>
              ) : (
                <span className="text-zinc-500">待命就緒</span>
              )}
            </div>
          </div>
        </div>

        {/* Middle: Progress Bar */}
        <div className="flex-1 max-w-md min-w-[120px] mx-2 flex flex-col gap-1">
          <div className="flex items-center justify-between text-[10px] text-zinc-400">
            <span>進度：{status.progressPercent}%</span>
            <span>
              {script ? `${status.currentActionIndex + (isPlaying ? 1 : 0)} / ${script.actions.length} 步驟` : "0 / 0"}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-violet-500 via-cyan-400 to-emerald-400 transition-all duration-100 ease-out"
              style={{ width: `${status.progressPercent}%` }}
            />
          </div>
        </div>

        {/* Right: Loop Mode Controls (Fixed width, perfectly stable, no speed multiplier) */}
        <div className="shrink-0 flex items-center gap-2 justify-end">
          {/* Loop Mode Selector */}
          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => onChangeConfig({ loopMode: "once" })}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                config.loopMode === "once"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title="單次播放"
            >
              單次
            </button>

            <button
              type="button"
              onClick={() => onChangeConfig({ loopMode: "count" })}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                config.loopMode === "count"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title="循環指定次數"
            >
              <Repeat className="w-3 h-3" />
              <span>循環</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeConfig({ loopMode: "infinite" })}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                config.loopMode === "infinite"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title="無限循環 (直到手動按下停止)"
            >
              ∞ 無限
            </button>
          </div>

          {/* Fixed-width Loop Count Card: Stays in place across all modes, zero layout shift */}
          <div
            onClick={() => {
              if (config.loopMode !== "count") {
                onChangeConfig({ loopMode: "count" });
              }
            }}
            className={`w-24 h-[30px] flex items-center justify-between px-2.5 rounded-xl border text-xs transition-all ${
              config.loopMode === "count"
                ? "bg-zinc-950 border-violet-500/50 shadow-[0_0_10px_rgba(139,92,246,0.15)] cursor-text"
                : "bg-zinc-950/40 border-zinc-800/60 opacity-40 cursor-pointer hover:opacity-70"
            }`}
            title={config.loopMode === "count" ? "可直接輸入或修改循環次數" : "點擊切換為指定次數循環"}
          >
            <span className="text-[10px] text-zinc-400 font-medium select-none">次數:</span>
            {config.loopMode === "count" ? (
              <input
                type="number"
                min={2}
                max={999}
                value={config.loopCount}
                onChange={(e) =>
                  onChangeConfig({ loopCount: Math.max(2, Number(e.target.value) || 2) })
                }
                className="w-10 bg-transparent text-center font-mono font-bold text-violet-300 focus:outline-none"
                autoFocus
              />
            ) : (
              <span className="w-10 text-center font-mono font-bold text-zinc-400 select-none">
                {config.loopMode === "once" ? "1" : "∞"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
