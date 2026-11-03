import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { MacroAction, MacroScript } from "../../types/macro";
import { FileCode2, Clock, Layers, X, ArrowRight } from "lucide-react";

interface Props {
  actions: MacroAction[];
  durationMs: number;
  onSave: (script: MacroScript, openEditor: boolean) => void;
  onDiscard: () => void;
}

export const SaveMacroModal: React.FC<Props> = ({
  actions,
  durationMs,
  onSave,
  onDiscard,
}) => {
  const { t, i18n } = useTranslation("macro");
  const timeLocale = i18n.language === "en" ? "en-US" : i18n.language === "ja" ? "ja-JP" : "zh-TW";
  const defaultTitle = `${t("save_modal.default_title_prefix", "自訂巨集")}_${new Date().toLocaleTimeString(timeLocale, {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })}`;

  const [name, setName] = useState(defaultTitle);
  const [description, setDescription] = useState("");

  const handleSaveInternal = (openEditor: boolean) => {
    const newScript: MacroScript = {
      id: `macro-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim() || defaultTitle,
      description: description.trim(),
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      actions,
      isPreset: false,
    };
    onSave(newScript, openEditor);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm select-none p-4 animate-fade-in">
      <div className="relative w-full max-w-lg bg-surface-modal border border-border-element rounded-xl shadow-2xl p-5 text-text-primary flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-surface-sidebar border border-border-subtle flex items-center justify-center text-text-secondary shadow-xs">
              <FileCode2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-text-primary flex items-center gap-2">
                {t("save_modal.title", "儲存側錄巨集")}
                <span className="px-1.5 py-0.2 rounded font-mono text-[9px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {t("save_modal.recorded_badge", "錄製完成")}
                </span>
              </h3>
              <p className="text-[11px] text-text-muted">{t("save_modal.subtitle", "已捕捉按鍵時序與操作軌跡，可儲存至腳本庫管理")}</p>
            </div>
          </div>
          <button
            onClick={onDiscard}
            className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-input transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats Pill */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-surface-input border border-border-subtle">
          <div className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-text-muted" />
            <div>
              <div className="text-[10px] text-text-muted font-mono uppercase">{t("save_modal.actions_count", "動作數量")}</div>
              <div className="text-xs font-semibold text-text-primary font-mono">
                {t("step_count", { count: actions.length, defaultValue: `${actions.length} 步驟` })}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-text-muted" />
            <div>
              <div className="text-[10px] text-text-muted font-mono uppercase">{t("save_modal.total_duration", "總錄製時長")}</div>
              <div className="text-xs font-semibold text-text-primary font-mono">
                {(durationMs / 1000).toFixed(2)}s ({durationMs}ms)
              </div>
            </div>
          </div>
        </div>

        {/* Form Inputs */}
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary">{t("save_modal.name_label", "腳本名稱")}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("save_modal.name_placeholder", "請輸入腳本名稱...")}
              className="w-full px-3 py-2 rounded-md bg-surface-card border border-border-element text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus transition-colors shadow-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary">{t("save_modal.desc_label", "備註說明 (選填)")}</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("save_modal.desc_placeholder", "說明本腳本適用遊戲場合或觸發條件...")}
              className="w-full px-3 py-2 rounded-md bg-surface-card border border-border-element text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus transition-colors resize-none shadow-xs"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
          <button
            type="button"
            onClick={onDiscard}
            className="px-3 py-1.5 rounded-md text-xs font-medium text-text-muted hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            {t("save_modal.discard", "捨棄錄製")}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSaveInternal(false)}
              className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-surface-card text-text-primary hover:bg-interactive-hover transition-colors cursor-pointer border border-border-subtle shadow-xs"
            >
              {t("save_modal.save_only", "僅儲存腳本")}
            </button>
            <button
              type="button"
              onClick={() => handleSaveInternal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium bg-accent hover:bg-accent/90 text-accent-foreground shadow-xs transition-colors cursor-pointer"
            >
              <span>{t("save_modal.save_and_edit", "儲存並編輯")}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
