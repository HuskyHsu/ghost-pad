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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm select-none p-4 animate-fade-in">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-white/[0.1] rounded-xl shadow-2xl p-5 text-zinc-100 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-white/[0.08] flex items-center justify-center text-zinc-300">
              <FileCode2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-zinc-100 flex items-center gap-2">
                {t("save_modal.title", "儲存側錄巨集")}
                <span className="px-1.5 py-0.2 rounded font-mono text-[9px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {t("save_modal.recorded_badge", "錄製完成")}
                </span>
              </h3>
              <p className="text-[11px] text-zinc-500">{t("save_modal.subtitle", "已捕捉按鍵時序與操作軌跡，可儲存至腳本庫管理")}</p>
            </div>
          </div>
          <button
            onClick={onDiscard}
            className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats Pill */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-zinc-950/60 border border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-zinc-400" />
            <div>
              <div className="text-[10px] text-zinc-500 font-mono uppercase">{t("save_modal.actions_count", "動作數量")}</div>
              <div className="text-xs font-semibold text-zinc-200 font-mono">
                {t("step_count", { count: actions.length, defaultValue: `${actions.length} 步驟` })}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-zinc-400" />
            <div>
              <div className="text-[10px] text-zinc-500 font-mono uppercase">{t("save_modal.total_duration", "總錄製時長")}</div>
              <div className="text-xs font-semibold text-zinc-200 font-mono">
                {(durationMs / 1000).toFixed(2)}s ({durationMs}ms)
              </div>
            </div>
          </div>
        </div>

        {/* Form Inputs */}
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-300">{t("save_modal.name_label", "腳本名稱")}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("save_modal.name_placeholder", "請輸入腳本名稱...")}
              className="w-full px-3 py-2 rounded-md bg-zinc-950 border border-white/[0.08] text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/[0.22] transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-300">{t("save_modal.desc_label", "備註說明 (選填)")}</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("save_modal.desc_placeholder", "說明本腳本適用遊戲場合或觸發條件...")}
              className="w-full px-3 py-2 rounded-md bg-zinc-950 border border-white/[0.08] text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/[0.22] transition-colors resize-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={onDiscard}
            className="px-3 py-1.5 rounded-md text-xs font-medium text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
          >
            {t("save_modal.discard", "捨棄錄製")}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSaveInternal(false)}
              className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-zinc-800 text-zinc-200 hover:bg-zinc-750 transition-colors cursor-pointer border border-white/[0.08]"
            >
              {t("save_modal.save_only", "僅儲存腳本")}
            </button>
            <button
              type="button"
              onClick={() => handleSaveInternal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 shadow-xs transition-colors cursor-pointer"
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
