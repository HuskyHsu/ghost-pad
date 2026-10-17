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
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950 select-none relative">
      {/* 1. Unified Top Header */}
      <div className="h-16 px-6 border-b border-white/[0.06] flex items-center justify-between shrink-0 bg-zinc-950/80 backdrop-blur-sm z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-zinc-300 shadow-xs shrink-0">
            <FileCode2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-tight text-zinc-100">
                巨集腳本庫
              </h1>
              <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-zinc-850 text-zinc-400 border border-white/[0.06]">
                {scripts.length} 筆
              </span>
            </div>
            <p className="text-xs text-zinc-400 truncate hidden sm:block">
              點選任一腳本即可進入多軌五線譜詳細編輯；支援即時側錄、循環播放與 JSON 備份
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onImportJson}
            className="flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium bg-zinc-850 hover:bg-zinc-800 text-zinc-200 border border-white/[0.08] hover:border-white/[0.14] transition-colors cursor-pointer shadow-xs"
            title="匯入 JSON 腳本檔案"
          >
            <Upload className="w-3.5 h-3.5 text-zinc-400" />
            <span>匯入腳本</span>
          </button>

          <button
            type="button"
            onClick={onExportAll}
            disabled={scripts.length === 0}
            className="flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium bg-zinc-850 hover:bg-zinc-800 text-zinc-200 border border-white/[0.08] hover:border-white/[0.14] transition-colors cursor-pointer disabled:opacity-40 shadow-xs"
            title="打包備份全部腳本為 JSON"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span>備份全部</span>
          </button>
        </div>
      </div>

      {/* 2. Unified Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 w-full max-w-6xl mx-auto space-y-5 min-h-0">

      {/* Full-Width Search Bar */}
      <div className="relative w-full">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜尋巨集名稱或備註..."
          className="w-full pl-9 pr-4 py-2 rounded-md bg-zinc-900/80 border border-white/[0.08] text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/[0.22] transition-colors"
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
              className="group w-full px-4 py-3 rounded-lg bg-zinc-900/30 hover:bg-zinc-900/70 border border-white/[0.06] hover:border-white/[0.14] transition-all cursor-pointer flex items-center justify-between gap-4"
            >
              {/* Left: Icon, Name & Description */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-7 h-7 rounded-md bg-zinc-850 border border-white/[0.06] flex items-center justify-center text-zinc-400 group-hover:text-zinc-200 transition-colors shrink-0">
                  <FileCode2 className="w-3.5 h-3.5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-xs md:text-sm text-zinc-200 group-hover:text-white transition-colors truncate">
                      {script.name}
                    </h3>
                    {script.description && (
                      <span className="text-xs text-zinc-500 truncate hidden md:inline">
                        — {script.description}
                      </span>
                    )}
                  </div>
                  {script.description && (
                    <p className="text-[11px] text-zinc-500 truncate md:hidden">
                      {script.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Right: Duration, Steps, Actions & Edit Button */}
              <div className="flex items-center gap-3.5 md:gap-4 shrink-0 text-xs text-zinc-400">
                <div className="flex items-center gap-2 font-mono text-zinc-400 text-xs">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    {(totalMs / 1000).toFixed(1)}s
                  </span>
                  <span className="text-zinc-700">•</span>
                  <span>{script.actions.length} 步</span>
                </div>

                {/* Quick Actions (export, duplicate, delete) */}
                <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      exportMacroAsJson(script);
                    }}
                    className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 cursor-pointer transition-colors"
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
                    className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 cursor-pointer transition-colors"
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
                    className="p-1 rounded-md text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 cursor-pointer transition-colors"
                    title="刪除腳本"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Edit Indicator */}
                <div className="flex items-center gap-1 pl-3 border-l border-white/[0.06] text-xs font-medium text-zinc-400 group-hover:text-zinc-200">
                  <span>編輯</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {scripts.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-white/[0.08] bg-zinc-900/10 space-y-4 my-8">
          <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-white/[0.06] flex items-center justify-center text-zinc-500">
            <FileCode2 className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="text-xs font-medium text-zinc-200">巨集腳本庫目前為空</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              您可以前往「即時儀表板」點擊「側錄巨集」開始 3-2-1 錄製手把行為，或透過上方按鈕匯入 JSON 腳本檔案。
            </p>
          </div>
          <button
            type="button"
            onClick={onImportJson}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 shadow-xs transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>匯入巨集腳本 (JSON)</span>
          </button>
        </div>
      )}
      </div>

      {/* 3. Unified Bottom Footer Bar */}
      <div className="h-9 px-6 border-t border-white/[0.06] bg-zinc-950/90 backdrop-blur-sm flex items-center justify-between text-[11px] font-mono text-zinc-400 select-none shrink-0 z-20">
        <div className="flex items-center gap-3">
          <span>● 巨集庫共 {scripts.length} 個腳本 (點選編輯進入多軌五線譜)</span>
        </div>
        <div className="flex items-center gap-3">
          <span>格式: PRO-UART0 JSON v2</span>
          <span className="text-zinc-700">|</span>
          <span>Switch 輸出: 1P Pro Controller</span>
        </div>
      </div>
    </div>
  );
};
