import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { MacroScript, MacroAction, MacroPlayerStatus } from "../../types/macro";
import { getScriptTotalDurationMs, exportMacroAsJson } from "../../utils/macroStorage";
import { MacroScoreSheet } from "./MacroScoreSheet";
import {
  Save,
  Check,
  ArrowLeft,
  Copy,
  Trash2,
  Clock,
  FileCode2,
  Download,
} from "lucide-react";

interface Props {
  script: MacroScript;
  activeActionIndex?: number;
  playerStatus?: MacroPlayerStatus;
  onChangeScript: (script: MacroScript) => void;
  onSaveScript: (script: MacroScript) => void;
  onDuplicateScript: (script: MacroScript) => void;
  onDeleteScript: (id: string) => void;
  onBackToList?: () => void;
}

export const MacroEditor: React.FC<Props> = ({
  script,
  activeActionIndex = -1,
  playerStatus,
  onChangeScript,
  onSaveScript,
  onDuplicateScript,
  onDeleteScript,
  onBackToList,
}) => {
  const { t } = useTranslation("macro");
  const [name, setName] = useState(script.name);
  const [description, setDescription] = useState(script.description || "");
  const [actions, setActions] = useState<MacroAction[]>(script.actions);
  const [hasSaved, setHasSaved] = useState(false);

  // Sync state when incoming script ID changes
  useEffect(() => {
    setName(script.name);
    setDescription(script.description || "");
    setActions(script.actions);
  }, [script.id]);

  const handleActionsChange = (newActions: MacroAction[]) => {
    setActions(newActions);
    onChangeScript({
      ...script,
      name,
      description,
      actions: newActions,
      updatedAt: Date.now(),
    });
  };

  const handleSave = () => {
    const updated: MacroScript = {
      ...script,
      name: name.trim() || t("untitled_macro", "未命名巨集"),
      description: description.trim(),
      actions,
      updatedAt: Date.now(),
    };
    onSaveScript(updated);
    setHasSaved(true);
    setTimeout(() => setHasSaved(false), 2000);
  };

  const currentDurationMs = getScriptTotalDurationMs({ ...script, actions });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-window-base select-none relative">
      {/* 1. Unified Top Header */}
      <div className="h-16 px-6 border-b border-border-subtle flex items-center justify-between shrink-0 bg-surface-card/80 backdrop-blur-sm z-30">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {onBackToList && (
            <button
              type="button"
              onClick={onBackToList}
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium bg-surface-card hover:bg-interactive-hover text-text-primary transition-colors cursor-pointer border border-border-subtle hover:border-border-element shrink-0 shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-text-muted" />
              <span>{t("back_to_list", "返回清單")}</span>
            </button>
          )}

          <div className="w-9 h-9 rounded-lg bg-surface-sidebar border border-border-subtle flex items-center justify-center text-text-secondary shadow-xs shrink-0">
            <FileCode2 className="w-4 h-4" />
          </div>

          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-sm font-semibold tracking-tight text-text-primary bg-transparent border-b border-transparent hover:border-border-element focus:border-border-focus focus:outline-none max-w-xs sm:max-w-md px-1 py-0.5 rounded transition-colors"
                placeholder={t("title_placeholder", "腳本標題...")}
              />
              {script.isPreset && (
                <span className="px-1.5 py-0.2 rounded font-mono text-[9px] font-medium bg-surface-input text-text-secondary border border-border-subtle">
                  {t("preset_badge", "範本")}
                </span>
              )}
            </div>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs text-text-muted bg-transparent border-b border-transparent hover:border-border-subtle focus:border-border-focus focus:outline-none px-1 py-0.5 transition-colors truncate"
              placeholder={t("note_placeholder", "填寫腳本備註說明或使用場合...")}
            />
          </div>
        </div>

        {/* Stats & Actions */}
        <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
          <div className="hidden md:flex items-center gap-2 h-8 px-2.5 rounded-md bg-surface-input border border-border-subtle text-text-muted">
            <span className="flex items-center gap-1 text-[11px]">
              <Clock className="w-3 h-3 text-text-muted" />
              <span>{(currentDurationMs / 1000).toFixed(2)}s</span>
            </span>
            <span className="text-border-element">|</span>
            <span className="text-[11px]">{t("step_count", { count: actions.length, defaultValue: `${actions.length} 步` })}</span>
          </div>

          <button
            type="button"
            onClick={() => exportMacroAsJson({ ...script, name, description, actions })}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium bg-surface-card hover:bg-interactive-hover text-text-primary border border-border-subtle hover:border-border-element transition-colors cursor-pointer shadow-xs"
            title={t("export_json_tooltip", "匯出單一 JSON 腳本檔案")}
          >
            <Download className="w-3.5 h-3.5 text-text-muted" />
            <span className="hidden sm:inline">{t("export_single_btn", "匯出")}</span>
          </button>

          <button
            type="button"
            onClick={() => onDuplicateScript({ ...script, name, description, tags: script.tags || [], actions })}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium bg-surface-card hover:bg-interactive-hover text-text-primary border border-border-subtle hover:border-border-element transition-colors cursor-pointer shadow-xs"
            title={t("duplicate_tooltip", "複製一份新腳本")}
          >
            <Copy className="w-3.5 h-3.5 text-text-muted" />
            <span className="hidden sm:inline">{t("duplicate_btn", "複製")}</span>
          </button>

          <button
            type="button"
            onClick={() => onDeleteScript(script.id)}
            className="h-8 p-2 rounded-md text-text-muted hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            title={t("delete_tooltip", "刪除此腳本")}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleSave}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              hasSaved
                ? "bg-feedback-success-bg border border-feedback-success-border text-feedback-success-text"
                : "bg-accent hover:bg-accent/90 text-accent-foreground shadow-xs"
            }`}
          >
            {hasSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{hasSaved ? t("saved", "已儲存") : t("save_changes", "儲存變更")}</span>
          </button>
        </div>
      </div>

      {/* 2. Unified Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 w-full max-w-6xl mx-auto space-y-5 min-h-0">
        <MacroScoreSheet
          script={{ ...script, actions }}
          activeActionIndex={activeActionIndex}
          playerStatus={playerStatus}
          onChangeActions={handleActionsChange}
        />
      </div>
    </div>
  );
};
