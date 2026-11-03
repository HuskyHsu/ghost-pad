import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { MacroScript } from "../../types/macro";
import { getScriptTotalDurationMs, exportMacroAsJson } from "../../utils/macroStorage";
import {
  Search,
  Upload,
  Download,
  FileCode2,
  Clock,
  Copy,
  Trash2,
  ArrowRight,
} from "lucide-react";

interface Props {
  scripts: MacroScript[];
  onSelectAndEdit: (id: string) => void;
  onDuplicateScript: (script: MacroScript) => void;
  onDeleteScript: (id: string) => void;
  onImportJson: () => void;
  onExportAll: () => void;
}

export const MacroLibraryView: React.FC<Props> = ({
  scripts,
  onSelectAndEdit,
  onDuplicateScript,
  onDeleteScript,
  onImportJson,
  onExportAll,
}) => {
  const { t } = useTranslation("macro");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return scripts.filter((s) => {
      const matchSearch =
        search.trim() === "" ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(search.toLowerCase()));

      return matchSearch;
    });
  }, [scripts, search]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-window-base select-none relative">
      {/* 1. Unified Top Header */}
      <div className="h-16 px-6 border-b border-border-subtle flex items-center justify-between shrink-0 bg-surface-card/80 backdrop-blur-sm z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-surface-sidebar border border-border-subtle flex items-center justify-center text-text-secondary shadow-xs shrink-0">
            <FileCode2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-tight text-text-primary">
                {t("library_title", "巨集腳本庫")}
              </h1>
              <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-surface-input text-text-muted border border-border-subtle">
                {t("script_count", { count: scripts.length, defaultValue: `${scripts.length} 筆腳本` })}
              </span>
            </div>
            <p className="text-xs text-text-muted truncate hidden sm:block">
              {t("library_subtitle", "點選任一腳本即可進入多軌五線譜詳細編輯：支援即時側錄、循環播放與 JSON 備份")}
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onImportJson}
            className="flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium bg-surface-card hover:bg-interactive-hover text-text-primary border border-border-subtle hover:border-border-element transition-colors cursor-pointer shadow-xs"
            title={t("import_json_tooltip", "匯入 JSON 腳本檔案")}
          >
            <Upload className="w-3.5 h-3.5 text-text-muted" />
            <span>{t("import_json", "匯入腳本")}</span>
          </button>

          <button
            type="button"
            onClick={onExportAll}
            disabled={scripts.length === 0}
            className="flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium bg-surface-card hover:bg-interactive-hover text-text-primary border border-border-subtle hover:border-border-element transition-colors cursor-pointer disabled:opacity-40 shadow-xs"
            title={t("backup_all_tooltip", "打包備份全部腳本為 JSON")}
          >
            <Download className="w-3.5 h-3.5 text-text-muted" />
            <span>{t("backup_all", "備份全部")}</span>
          </button>
        </div>
      </div>

      {/* 2. Unified Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 w-full max-w-6xl mx-auto space-y-5 min-h-0">

      {/* Full-Width Search Bar */}
      <div className="relative w-full">
        <Search className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("search_placeholder", "搜尋巨集名稱或備註...")}
          className="w-full pl-9 pr-4 py-2 rounded-md bg-surface-card border border-border-subtle text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus transition-colors shadow-xs"
        />
      </div>

      {/* Full-Width Itemized List of Scripts */}
      <div className="flex flex-col gap-2 w-full">
        {filtered.map((script) => {
          const totalMs = getScriptTotalDurationMs(script);

          return (
            <div
              key={script.id}
              onClick={() => onSelectAndEdit(script.id)}
              className="group w-full px-4 py-3 rounded-lg bg-surface-card hover:bg-interactive-hover/80 border border-border-subtle hover:border-border-element transition-all cursor-pointer flex items-center justify-between gap-4 shadow-xs"
            >
              {/* Left: Icon, Name & Description */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-7 h-7 rounded-md bg-surface-input border border-border-subtle flex items-center justify-center text-text-muted group-hover:text-text-primary transition-colors shrink-0">
                  <FileCode2 className="w-3.5 h-3.5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-xs md:text-sm text-text-primary transition-colors truncate">
                      {script.name}
                    </h3>
                    {script.description && (
                      <span className="text-xs text-text-muted truncate hidden md:inline">
                        — {script.description}
                      </span>
                    )}
                  </div>
                  {script.description && (
                    <p className="text-[11px] text-text-muted truncate md:hidden">
                      {script.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Right: Duration, Steps, Actions & Edit Button */}
              <div className="flex items-center gap-3.5 md:gap-4 shrink-0 text-xs text-text-muted">
                <div className="flex items-center gap-2 font-mono text-text-muted text-xs">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-text-muted" />
                    {(totalMs / 1000).toFixed(1)}s
                  </span>
                  <span className="text-border-element">•</span>
                  <span>{t("step_count", { count: script.actions.length, defaultValue: `${script.actions.length} 步` })}</span>
                </div>

                {/* Quick Actions (export, duplicate, delete) */}
                <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      exportMacroAsJson(script);
                    }}
                    className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-input cursor-pointer transition-colors"
                    title={t("export_json_tooltip", "匯出單一 JSON 腳本檔案")}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateScript(script);
                    }}
                    className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-input cursor-pointer transition-colors"
                    title={t("duplicate_tooltip", "複製一份新腳本")}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteScript(script.id);
                    }}
                    className="p-1 rounded-md text-text-muted hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                    title={t("delete_tooltip", "刪除此腳本")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Edit Indicator */}
                <div className="flex items-center gap-1 pl-3 border-l border-border-subtle text-xs font-medium text-text-muted group-hover:text-text-primary">
                  <span>{t("edit", "編輯")}</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {scripts.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-border-element/60 bg-surface-card/60 space-y-4 my-8 shadow-xs">
          <div className="w-12 h-12 rounded-lg bg-surface-input border border-border-subtle flex items-center justify-center text-text-muted">
            <FileCode2 className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="text-xs font-medium text-text-primary">
              {t("empty_library", "巨集腳本庫目前為空")}
            </h3>
            <p className="text-xs text-text-muted leading-relaxed">
              {t("empty_library_desc", "您可以前往「即時儀表板」點擊「側錄巨集」開始 3-2-1 錄製手把行為，或透過上方按鈕匯入 JSON 腳本檔案。")}
            </p>
          </div>
          <button
            type="button"
            onClick={onImportJson}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium bg-accent hover:bg-accent/90 text-accent-foreground shadow-xs transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{t("import_json_empty_btn", "匯入巨集腳本 (JSON)")}</span>
          </button>
        </div>
      )}
      </div>

      {/* 3. Unified Bottom Footer Bar */}
      <div className="h-9 px-6 border-t border-border-subtle bg-surface-card/90 backdrop-blur-sm flex items-center justify-between text-[11px] font-mono text-text-muted select-none shrink-0 z-20">
        <div className="flex items-center gap-3">
          <span>{t("footer.scripts_total", { count: scripts.length, defaultValue: `● 巨集庫共 ${scripts.length} 個腳本 (點選編輯進入多軌五線譜)` })}</span>
        </div>
        <div className="flex items-center gap-3">
          <span>{t("footer.format", "格式: PRO-UART0 JSON v2")}</span>
          <span className="text-border-element">|</span>
          <span>{t("footer.switch_output", "Switch 輸出: 1P Pro Controller")}</span>
        </div>
      </div>
    </div>
  );
};
