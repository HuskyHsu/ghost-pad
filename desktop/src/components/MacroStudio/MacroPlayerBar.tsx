import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  MacroScript,
  MacroPlayerStatus,
  MacroPlaybackConfig,
} from "../../types/macro";
import { getScriptTotalDurationMs } from "../../utils/macroStorage";
import {
  Play,
  Pause,
  Square,
  Repeat,
  Pencil,
  FileCode2,
  Info,
  AlertCircle,
} from "lucide-react";

interface Props {
  script: MacroScript | null;
  macros?: MacroScript[];
  onSelectScript?: (id: string) => void;
  onEditScript?: (id: string) => void;
  disablePlay?: boolean;
  isAutoPaused?: boolean;
  isOfflinePreview?: boolean;
  status: MacroPlayerStatus;
  config: MacroPlaybackConfig;
  onChangeConfig: (updates: Partial<MacroPlaybackConfig>) => void;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSeek?: (ms: number) => void;
}

export const MacroPlayerBar: React.FC<Props> = ({
  script,
  macros,
  onSelectScript,
  onEditScript,
  disablePlay = false,
  isAutoPaused = false,
  isOfflinePreview = false,
  status,
  config,
  onChangeConfig,
  onPlay,
  onPause,
  onResume,
  onStop,
  onSeek,
}) => {
  const { t } = useTranslation("macro");
  const isSeekingRef = useRef(false);
  const isAnyPlaying = status.isPlaying;
  const isThisScriptPlaying = Boolean(status.isPlaying && script && status.currentScriptId === script.id);
  const isThisScriptPaused = isThisScriptPlaying && status.isPaused;
  const totalDurationMs = script ? getScriptTotalDurationMs(script) : 0;
  const displayedElapsedMs = isThisScriptPlaying
    ? Math.min(totalDurationMs, Math.max(0, status.elapsedMs))
    : 0;
  const displayedProgressPercent = isThisScriptPlaying ? status.progressPercent : 0;
  const canSeek = Boolean(onSeek && isThisScriptPaused && totalDurationMs > 0);
  const showAutoPausedBanner = isThisScriptPaused && isAutoPaused;
  const showOfflineBanner = isThisScriptPlaying && isOfflinePreview;

  const seekFromClientX = (el: HTMLElement, clientX: number) => {
    if (!canSeek || !onSeek) return;
    const rect = el.getBoundingClientRect();
    const ratio = rect.width > 0 ? Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) : 0;
    const targetMs = Math.round((ratio * totalDurationMs) / 10) * 10;
    onSeek(targetMs);
  };

  return (
    <div className="relative w-full bg-surface-card/95 border-t border-border-subtle backdrop-blur-md px-4 py-2 shrink-0 select-none shadow-md space-y-2">
      {/* Floating Persistent Status Pills (Zero Layout Shift) */}
      {(showAutoPausedBanner || showOfflineBanner) && (
        <div className="absolute bottom-full left-4 right-4 mb-2 z-30 flex items-center justify-center gap-2 flex-wrap pointer-events-none">
          {showAutoPausedBanner && (
            <div className="pointer-events-auto flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50/95 backdrop-blur-md border border-amber-300/90 text-amber-900 text-[11px] font-medium shadow-md">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>
                {t("player.auto_paused_title", "已自動暫停巨集")}：{t("player.auto_paused_desc", "偵測到手動操作，接手完成後可按「繼續」恢復播放")}
              </span>
            </div>
          )}
          {showOfflineBanner && (
            <div className="pointer-events-auto flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-card/95 backdrop-blur-md border border-border-element text-text-secondary text-[11px] font-medium shadow-md">
              <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>
                {t("player.offline_preview_title", "僅於畫面預覽播放")}：{t("player.offline_preview_desc", "ESP32 尚未連線，目前不會傳送訊號至 Switch")}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Row 1: Full-Width Slim Progress Strip (Click / Drag to Seek when Paused) */}
      <div className="w-full flex items-center gap-3">
        <span className="text-[10px] text-text-muted font-mono whitespace-nowrap shrink-0">
          {t("player.progress", { percent: displayedProgressPercent, defaultValue: `進度：${displayedProgressPercent}%` })}
        </span>
        <div
          role={canSeek ? "slider" : undefined}
          aria-label={canSeek ? t("player.seek_progress", "暫停中：點擊或拖曳進度條跳轉位置") : undefined}
          aria-valuemin={canSeek ? 0 : undefined}
          aria-valuemax={canSeek ? totalDurationMs : undefined}
          aria-valuenow={canSeek ? displayedElapsedMs : undefined}
          title={canSeek ? t("player.seek_progress", "暫停中：點擊或拖曳進度條跳轉位置") : undefined}
          onPointerDown={(e) => {
            if (!canSeek) return;
            isSeekingRef.current = true;
            if (typeof e.currentTarget.setPointerCapture === "function") {
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {}
            }
            seekFromClientX(e.currentTarget, e.clientX);
          }}
          onPointerMove={(e) => {
            if (!isSeekingRef.current || !canSeek) return;
            seekFromClientX(e.currentTarget, e.clientX);
          }}
          onPointerUp={() => {
            isSeekingRef.current = false;
          }}
          onPointerCancel={() => {
            isSeekingRef.current = false;
          }}
          className={`flex-1 py-1.5 -my-1.5 min-w-[60px] flex items-center ${canSeek ? "cursor-pointer group" : ""}`}
        >
          <div
            className={`w-full h-1.5 rounded-full bg-surface-input border border-border-subtle relative transition-all ${
              canSeek ? "group-hover:h-2" : "overflow-hidden"
            }`}
          >
            <div
              className={`h-full rounded-full transition-all duration-100 ease-out ${
                isThisScriptPaused ? "bg-amber-500" : isThisScriptPlaying ? "bg-emerald-500" : "bg-accent-primary"
              }`}
              style={{ width: `${displayedProgressPercent}%` }}
            />
            {canSeek && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-amber-500 border-2 border-white shadow-sm pointer-events-none"
                style={{ left: `${displayedProgressPercent}%` }}
              />
            )}
          </div>
        </div>
        <span className="text-[10px] text-text-muted font-mono whitespace-nowrap shrink-0">
          {`${(displayedElapsedMs / 1000).toFixed(1)}s / ${(totalDurationMs / 1000).toFixed(1)}s`}
        </span>
      </div>

      {/* Row 2: Controls Bar */}
      <div className="w-full flex items-center justify-between gap-2.5 flex-wrap">
        {/* Left: Optional Script Selector + Playback Controls & Live Status */}
        <div className="flex items-center gap-2 shrink-0">
          {macros && macros.length > 0 && onSelectScript && (
            <div className="flex items-center gap-1.5 shrink-0">
              <div
                className={`h-8 px-2 rounded-md bg-surface-input border border-border-element flex items-center gap-1.5 shadow-xs ${
                  isAnyPlaying ? "opacity-60" : ""
                }`}
              >
                <FileCode2 className="w-3.5 h-3.5 text-text-muted shrink-0 pointer-events-none" />
                <select
                  aria-label={t("player.select_macro", "選擇巨集腳本")}
                  value={script?.id || macros[0]?.id || ""}
                  disabled={isAnyPlaying}
                  onChange={(e) => onSelectScript(e.target.value)}
                  className="bg-transparent border-0 text-xs font-medium text-text-primary focus:outline-none cursor-pointer disabled:cursor-not-allowed max-w-[140px] truncate"
                >
                  {macros.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              {onEditScript && script && (
                <button
                  type="button"
                  onClick={() => onEditScript(script.id)}
                  title={t("player.edit_macro_tooltip", "在巨集工作室編輯此腳本")}
                  aria-label={t("player.edit_macro_tooltip", "在巨集工作室編輯此腳本")}
                  className="h-8 w-8 rounded-md flex items-center justify-center bg-surface-card hover:bg-interactive-hover text-text-secondary hover:text-text-primary border border-border-element transition-colors cursor-pointer shadow-xs shrink-0"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              <div className="w-px h-5 bg-border-subtle mx-0.5 shrink-0" />
            </div>
          )}

          {/* Main Play / Pause / Stop Group */}
          <div className="flex items-center gap-1.5 shrink-0">
            {!isThisScriptPlaying ? (
              <button
                type="button"
                disabled={disablePlay || !script || script.actions.length === 0}
                onClick={onPlay}
                className="h-8 flex items-center gap-1.5 px-3 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs disabled:opacity-35 disabled:hover:bg-emerald-600 disabled:cursor-not-allowed transition-colors cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
                title={t("player.play_tooltip", "開始播放腳本")}
              >
                <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                <span className="whitespace-nowrap">{t("player.play", "播放")}</span>
              </button>
            ) : isThisScriptPaused ? (
              <button
                type="button"
                onClick={onResume}
                className="h-8 flex items-center gap-1.5 px-3 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
                title={t("player.resume_tooltip", "繼續播放")}
              >
                <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                <span className="whitespace-nowrap">{t("player.resume", "繼續")}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onPause}
                className="h-8 flex items-center gap-1.5 px-3 rounded-md text-xs font-semibold bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 shadow-xs transition-colors cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
                title={t("player.pause_tooltip", "暫停播放")}
              >
                <Pause className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">{t("player.pause", "暫停")}</span>
              </button>
            )}

            {/* Emergency Stop Button */}
            <button
              type="button"
              disabled={!isThisScriptPlaying}
              onClick={onStop}
              className="h-8 flex items-center gap-1 px-2.5 rounded-md text-xs font-medium bg-surface-card hover:bg-rose-50 text-text-secondary hover:text-rose-700 border border-border-element hover:border-rose-300 disabled:opacity-35 disabled:hover:bg-surface-card disabled:hover:text-text-secondary disabled:hover:border-border-element disabled:cursor-not-allowed shadow-xs transition-colors cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
              title={t("player.stop_tooltip", "停止播放並重置手把中立 (Esc)")}
            >
              <Square className="w-3 h-3 fill-current shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">{t("player.stop", "停止")}</span>
              <kbd className="hidden lg:inline-block text-[9px] px-1 py-0.2 rounded bg-surface-input text-text-muted font-mono border border-border-subtle shrink-0">
                Esc
              </kbd>
            </button>
          </div>

          {/* Active Live Status Badge (Only shown when running or paused) */}
          {isThisScriptPlaying && (
            <div className="h-8 flex items-center gap-1.5 px-2.5 rounded-md font-mono text-[11px] border border-border-element bg-surface-input/50 shrink-0 whitespace-nowrap shadow-xs">
              {isThisScriptPaused ? (
                <span className="flex items-center gap-1.5 text-amber-700 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>{t("player.paused", "已暫停")}</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    {t("player.loop_badge", {
                      loop: status.currentLoop,
                      defaultValue: `循環 #${status.currentLoop}`,
                    })}
                  </span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: Loop Mode Controls */}
        <div className="shrink-0 flex items-center gap-2 justify-end">
          {/* Loop Mode Selector */}
          <div className="h-8 flex items-center gap-0.5 bg-surface-input p-0.5 rounded-md border border-border-subtle shrink-0">
            <button
              type="button"
              onClick={() => onChangeConfig({ loopMode: "once" })}
              className={`h-full px-2.5 rounded text-xs font-medium transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
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
              className={`h-full flex items-center gap-1 px-2.5 rounded text-xs font-medium transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                config.loopMode === "count"
                  ? "bg-surface-card text-text-primary border border-border-element shadow-xs"
                  : "text-text-muted hover:text-text-primary border border-transparent"
              }`}
              title={t("player.loop_count_tooltip", "循環指定次數")}
            >
              <Repeat className="w-3 h-3 shrink-0" />
              <span>{t("player.loop_count", "循環")}</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeConfig({ loopMode: "infinite" })}
              className={`h-full px-2.5 rounded text-xs font-medium transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
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
            className={`w-20 h-8 flex items-center justify-between px-2 rounded-md border text-xs transition-all ${
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
