import React, { useState, useMemo } from "react";
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
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-zinc-950 p-6 md:p-8 space-y-6 select-none">
      {/* Full-Width Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-violet-600/30">
              <FileCode2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                巨集腳本庫
                <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-800 text-zinc-400 font-normal">
                  {scripts.length} 筆腳本
                </span>
              </h1>
              <p className="text-xs text-zinc-400">
                點選任一腳本即可進入多軌五線譜詳細編輯；支援即時側錄、循環播放與 JSON 備份
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onImportJson}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors cursor-pointer"
            title="匯入 JSON 腳本檔案"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>匯入腳本</span>
          </button>

          <button
            type="button"
            onClick={onExportAll}
            disabled={scripts.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors cursor-pointer disabled:opacity-40"
            title="打包備份全部腳本為 JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>備份全部</span>
          </button>
        </div>
      </div>

      {/* Full-Width Search Bar */}
      <div className="relative w-full">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜尋巨集名稱或備註..."
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-violet-500/80 shadow-sm"
        />
      </div>

      {/* Full-Width Itemized List of Scripts (寬度拉滿，高度下降，條列一筆一筆) */}
      <div className="flex flex-col gap-2.5 w-full">
        {filtered.map((script) => {
          const totalMs = getScriptTotalDurationMs(script);

          return (
            <div
              key={script.id}
              onClick={() => onSelectAndEdit(script.id)}
              className="group w-full px-5 py-3.5 rounded-2xl bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800/80 hover:border-violet-500/50 transition-all cursor-pointer shadow-sm flex items-center justify-between gap-4"
            >
              {/* Left: Icon, Name & Description */}
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 group-hover:scale-105 group-hover:bg-violet-600/20 transition-all shrink-0">
                  <FileCode2 className="w-4 h-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-xs md:text-sm text-zinc-100 group-hover:text-violet-300 transition-colors truncate">
                      {script.name}
                    </h3>
                    {script.description && (
                      <span className="text-xs text-zinc-500 truncate hidden md:inline">
                        — {script.description}
                      </span>
                    )}
                  </div>
                  {script.description && (
                    <p className="text-[11px] text-zinc-400 truncate md:hidden">
                      {script.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Right: Duration, Steps, Actions & Edit Button */}
              <div className="flex items-center gap-3.5 md:gap-5 shrink-0 text-xs text-zinc-400">
                <div className="flex items-center gap-2.5 font-mono text-zinc-300">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    {(totalMs / 1000).toFixed(1)}s
                  </span>
                  <span className="text-zinc-600">•</span>
                  <span>{script.actions.length} 步驟</span>
                </div>

                {/* Quick Actions (export, duplicate, delete) */}
                <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      exportMacroAsJson(script);
                    }}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 cursor-pointer transition-colors"
                    title="匯出此腳本"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateScript(script);
                    }}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 cursor-pointer transition-colors"
                    title="複製一份副本"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteScript(script.id);
                    }}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 cursor-pointer transition-colors"
                    title="刪除腳本"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Edit Indicator */}
                <div className="flex items-center gap-1 pl-3 border-l border-zinc-800 text-xs font-semibold text-violet-400 group-hover:text-violet-300">
                  <span>編輯</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {scripts.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/20 space-y-4 my-8">
          <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 shadow-inner">
            <FileCode2 className="w-8 h-8" />
          </div>
          <div className="space-y-1.5 max-w-sm">
            <h3 className="text-sm font-bold text-zinc-200">巨集腳本庫目前為空</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              您可以前往「即時儀表板」點擊「側錄巨集」開始 3-2-1 錄製手把行為，或透過上方按鈕匯入 JSON 腳本檔案。
            </p>
          </div>
          <button
            type="button"
            onClick={onImportJson}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/30 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>匯入巨集腳本 (JSON)</span>
          </button>
        </div>
      )}
    </div>
  );
};
