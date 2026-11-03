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
    <div className="w-full bg-surface-card/95 border-t border-border-subtle backdrop-blur-md px-4 py-2.5 shrink-0 select-none shadow-md">
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
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs disabled:opacity-35 disabled:hover:bg-emerald-600 disabled:cursor-not-allowed transition-colors cursor-pointer active:scale-95"
                title={t("player.play_tooltip", "開始播放腳本")}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{t("player.play", "播放")}</span>
              </button>
            ) : isPaused ? (
              <button
                type="button"
                onClick={onResume}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer active:scale-95"
                title={t("player.resume_tooltip", "繼續播放")}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{t("player.resume", "繼續")}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onPause}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 shadow-xs transition-colors cursor-pointer active:scale-95"
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
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-surface-card hover:bg-rose-50 text-text-secondary hover:text-rose-700 border border-border-element hover:border-rose-300 disabled:opacity-35 disabled:hover:bg-surface-card disabled:hover:text-text-secondary disabled:hover:border-border-element disabled:cursor-not-allowed shadow-xs transition-colors cursor-pointer active:scale-95"
              title={t("player.stop_tooltip", "停止播放並重置手把中立 (Esc)")}
            >
              <Square className="w-3 h-3 fill-current" />
              <span className="hidden sm:inline">{t("player.stop", "停止")}</span>
              <kbd className="hidden lg:inline-block text-[9px] px-1 py-0.2 rounded bg-surface-input text-text-muted font-mono border border-border-subtle">
                Esc
              </kbd>
            </button>
          </div>

          {/* Script Name & Status Indicator */}
          <div className="flex flex-col">
            <div className="text-xs font-medium text-text-primary truncate max-w-[160px]">
              {script ? script.name : t("player.no_selection", "未選擇腳本")}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              {isPlaying ? (
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {isPaused
                    ? t("player.paused", "已暫停")
                    : t("player.loop_status", {
                        loop: status.currentLoop,
                        step: status.currentActionIndex + 1,
                        defaultValue: `循環 #${status.currentLoop} • 步 #${status.currentActionIndex + 1}`,
                      })}
                </span>
              ) : (
                <span className="text-text-muted">{t("player.standby", "待命就緒")}</span>
              )}
            </div>
          </div>
        </div>

        {/* Middle: Progress Bar */}
        <div className="flex-1 max-w-md min-w-[120px] mx-2 flex flex-col gap-1">
          <div className="flex items-center justify-between text-[10px] text-text-muted font-mono">
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
          <div className="w-full h-1.5 rounded-full bg-surface-input border border-border-subtle overflow-hidden relative">
            <div
              className="h-full bg-accent-primary transition-all duration-100 ease-out"
              style={{ width: `${status.progressPercent}%` }}
            />
          </div>
        </div>

        {/* Right: Loop Mode Controls */}
        <div className="shrink-0 flex items-center gap-2 justify-end">
          {/* Loop Mode Selector */}
          <div className="flex items-center gap-0.5 bg-surface-input p-0.5 rounded-md border border-border-subtle">
            <button
              type="button"
              onClick={() => onChangeConfig({ loopMode: "once" })}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                config.loopMode === "once"
                  ? "bg-surface-card text-text-primary border border-border-element shadow-xs"
                  : "text-text-muted hover:text-text-primary border border-transparent"
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
                  ? "bg-surface-card text-text-primary border border-border-element shadow-xs"
                  : "text-text-muted hover:text-text-primary border border-transparent"
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
                  ? "bg-surface-card text-text-primary border border-border-element shadow-xs"
                  : "text-text-muted hover:text-text-primary border border-transparent"
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
                ? "bg-surface-card border-border-focus cursor-text shadow-xs"
                : "bg-surface-input/60 border-border-subtle opacity-60 cursor-pointer hover:opacity-90"
            }`}
            title={config.loopMode === "count" ? t("player.count_tooltip_active", "可直接輸入或修改循環次數") : t("player.count_tooltip_inactive", "點擊切換為指定次數循環")}
          >
            <span className="text-[10px] text-text-muted font-mono select-none">{t("player.count_label", "次數:")}</span>
            {config.loopMode === "count" ? (
              <input
                type="number"
                min={2}
                max={999}
                value={config.loopCount}
                onChange={(e) =>
                  onChangeConfig({ loopCount: Math.max(2, Number(e.target.value) || 2) })
                }
                className="w-8 bg-transparent text-center font-mono font-bold text-text-primary focus:outline-none"
                autoFocus
              />
            ) : (
              <span className="w-8 text-center font-mono font-medium text-text-muted select-none">
                {config.loopMode === "once" ? "1" : "∞"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
