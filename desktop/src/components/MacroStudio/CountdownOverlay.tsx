import React from "react";
import { useTranslation } from "react-i18next";
import { X, Radio } from "lucide-react";

interface Props {
  countdown: number;
  onCancel: () => void;
}

export const CountdownOverlay: React.FC<Props> = ({ countdown, onCancel }) => {
  const { t } = useTranslation("macro");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in select-none">
      <div className="relative flex flex-col items-center justify-center max-w-sm w-full mx-4 p-8 rounded-xl bg-surface-modal border border-border-element shadow-2xl text-center">
        {/* Close / Cancel Button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-input transition-colors cursor-pointer"
          title={t("countdown.cancel_tooltip", "取消倒數")}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Target Indicator */}
        <div className="mb-5">
          <div className="w-12 h-12 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-xs">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        <h3 className="text-xs font-mono uppercase tracking-wider text-rose-600 font-semibold mb-1">
          {t("countdown.ready", "即將開始側錄")}
        </h3>
        <p className="text-xs text-text-muted mb-6 max-w-xs leading-relaxed">
          {t("countdown.desc", "請就位，倒數結束後將即時捕捉手把與鍵盤的完整時序動作")}
        </p>

        {/* Big Countdown Number */}
        <div className="relative flex items-center justify-center w-24 h-24 mb-6 rounded-lg bg-surface-input border border-border-subtle shadow-inner">
          <span
            key={countdown}
            className="text-5xl font-black tracking-tight text-text-primary font-mono animate-scale-up"
          >
            {countdown}
          </span>
        </div>

        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-md text-xs font-medium text-text-primary bg-surface-card hover:bg-interactive-hover transition-colors cursor-pointer border border-border-subtle shadow-xs"
        >
          {t("countdown.cancel", "取消錄製 (Esc)")}
        </button>
      </div>
    </div>
  );
};
