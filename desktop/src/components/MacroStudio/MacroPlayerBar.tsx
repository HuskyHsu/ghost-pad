import React from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("macro");
  const isPlaying = status.isPlaying;
  const isPaused = status.isPaused;

  return (
    <div className="w-full bg-zinc-900/90 border-t border-white/[0.06] backdrop-blur-md px-4 py-2.5 shrink-0 select-none shadow-xl">
      {/* Control Console Row: 3 columns with fixed left and right */}
      <div className="w-full flex items-center justify-between gap-4">
        {/* Left: Playback Controls & Script Title */}
        <div className="flex items-center gap-3 shrink-0 min-w-[260px]">
          {/* Main Play / Pause / Stop Group */}
          <div className="flex items-center gap-1.5">
            {!isPlaying ? (
              <button
                type="button"
                disabled={!script || script.actions.length === 0}
                onClick={onPlay}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 disabled:opacity-30 disabled:hover:bg-zinc-100 shadow-xs transition-colors cursor-pointer active:scale-95"
                title={t("player.play_tooltip", "開始播放腳本")}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{t("player.play", "播放")}</span>
              </button>
            ) : isPaused ? (
              <button
                type="button"
                onClick={onResume}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 transition-colors cursor-pointer active:scale-95"
                title={t("player.resume_tooltip", "繼續播放")}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{t("player.resume", "繼續")}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onPause}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 transition-colors cursor-pointer active:scale-95"
                title={t("player.pause_tooltip", "暫停播放")}
              >
                <Pause className="w-3.5 h-3.5" />
                <span>{t("player.pause", "暫停")}</span>
              </button>
            )}

            {/* Emergency Stop Button */}
            <button
              type="button"
              disabled={!isPlaying}
              onClick={onStop}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-300 border border-white/[0.08] hover:border-rose-500/30 disabled:opacity-30 transition-colors cursor-pointer active:scale-95"
              title={t("player.stop_tooltip", "停止播放並重置手把中立 (Esc)")}
            >
              <Square className="w-3 h-3 fill-current" />
              <span className="hidden sm:inline">{t("player.stop", "停止")}</span>
              <kbd className="hidden lg:inline-block text-[9px] px-1 py-0.2 rounded bg-black/40 text-zinc-500 font-mono">
                Esc
              </kbd>
            </button>
          </div>

          {/* Script Name & Status Indicator */}
          <div className="flex flex-col">
            <div className="text-xs font-medium text-zinc-200 truncate max-w-[160px]">
              {script ? script.name : t("player.no_selection", "未選擇腳本")}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              {isPlaying ? (
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {isPaused
                    ? t("player.paused", "已暫停")
                    : t("player.loop_status", {
                        loop: status.currentLoop,
                        step: status.currentActionIndex + 1,
                        defaultValue: `循環 #${status.currentLoop} • 步 #${status.currentActionIndex + 1}`,
                      })}
                </span>
              ) : (
                <span className="text-zinc-500">{t("player.standby", "待命就緒")}</span>
              )}
            </div>
          </div>
        </div>

        {/* Middle: Progress Bar */}
        <div className="flex-1 max-w-md min-w-[120px] mx-2 flex flex-col gap-1">
          <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
            <span>{t("player.progress", { percent: status.progressPercent, defaultValue: `進度：${status.progressPercent}%` })}</span>
            <span>
              {script
                ? t("player.step_progress", {
                    current: status.currentActionIndex + (isPlaying ? 1 : 0),
                    total: script.actions.length,
                    defaultValue: `${status.currentActionIndex + (isPlaying ? 1 : 0)} / ${script.actions.length} 步`,
                  })
                : "0 / 0"}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-zinc-950 border border-white/[0.06] overflow-hidden relative">
            <div
              className="h-full bg-zinc-300 transition-all duration-100 ease-out"
              style={{ width: `${status.progressPercent}%` }}
            />
          </div>
        </div>

        {/* Right: Loop Mode Controls */}
        <div className="shrink-0 flex items-center gap-2 justify-end">
          {/* Loop Mode Selector */}
          <div className="flex items-center gap-0.5 bg-zinc-950 p-0.5 rounded-md border border-white/[0.06]">
            <button
              type="button"
              onClick={() => onChangeConfig({ loopMode: "once" })}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                config.loopMode === "once"
                  ? "bg-zinc-800 text-zinc-100 border border-white/[0.08] shadow-xs"
                  : "text-zinc-500 hover:text-zinc-300 border border-transparent"
              }`}
              title={t("player.single_play_tooltip", "單次播放")}
            >
              {t("player.single_play", "單次")}
            </button>

            <button
              type="button"
              onClick={() => onChangeConfig({ loopMode: "count" })}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                config.loopMode === "count"
                  ? "bg-zinc-800 text-zinc-100 border border-white/[0.08] shadow-xs"
                  : "text-zinc-500 hover:text-zinc-300 border border-transparent"
              }`}
              title={t("player.loop_count_tooltip", "循環指定次數")}
            >
              <Repeat className="w-3 h-3" />
              <span>{t("player.loop_count", "循環")}</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeConfig({ loopMode: "infinite" })}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                config.loopMode === "infinite"
                  ? "bg-zinc-800 text-zinc-100 border border-white/[0.08] shadow-xs"
                  : "text-zinc-500 hover:text-zinc-300 border border-transparent"
              }`}
              title={t("player.loop_infinite_tooltip", "無限循環 (直到手動按下停止)")}
            >
              {t("player.loop_infinite", "∞ 無限")}
            </button>
          </div>

          {/* Fixed-width Loop Count Card */}
          <div
            onClick={() => {
              if (config.loopMode !== "count") {
                onChangeConfig({ loopMode: "count" });
              }
            }}
            className={`w-20 h-[28px] flex items-center justify-between px-2 rounded-md border text-xs transition-all ${
              config.loopMode === "count"
                ? "bg-zinc-950 border-white/[0.16] cursor-text"
                : "bg-zinc-950/40 border-white/[0.04] opacity-40 cursor-pointer hover:opacity-70"
            }`}
            title={config.loopMode === "count" ? t("player.count_tooltip_active", "可直接輸入或修改循環次數") : t("player.count_tooltip_inactive", "點擊切換為指定次數循環")}
          >
            <span className="text-[10px] text-zinc-500 font-mono select-none">{t("player.count_label", "次數:")}</span>
            {config.loopMode === "count" ? (
              <input
                type="number"
                min={2}
                max={999}
                value={config.loopCount}
                onChange={(e) =>
                  onChangeConfig({ loopCount: Math.max(2, Number(e.target.value) || 2) })
                }
                className="w-8 bg-transparent text-center font-mono font-bold text-zinc-100 focus:outline-none"
                autoFocus
              />
            ) : (
              <span className="w-8 text-center font-mono font-medium text-zinc-500 select-none">
                {config.loopMode === "once" ? "1" : "∞"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
