import React, { useState, useMemo } from "react";
import { MacroScript } from "../../types/macro";
import { getScriptTotalDurationMs, exportMacroAsJson } from "../../utils/macroStorage";
import {
  Search,
  Plus,
  Upload,
  Download,
  FileCode2,
  Clock,
  Play,
  Copy,
  Trash2,
  ArrowRight,
} from "lucide-react";

interface Props {
  scripts: MacroScript[];
  onSelectAndEdit: (id: string) => void;
  onCreateNew: () => void;
  onDuplicateScript: (script: MacroScript) => void;
  onDeleteScript: (id: string) => void;
  onImportJson: () => void;
  onExportAll: () => void;
  onQuickPlay: (script: MacroScript) => void;
}

export const MacroLibraryView: React.FC<Props> = ({
  scripts,
  onSelectAndEdit,
  onCreateNew,
  onDuplicateScript,
  onDeleteScript,
  onImportJson,
  onExportAll,
  onQuickPlay,
}) => {
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("全部");

  const allTags = useMemo(() => {
    const set = new Set<string>();
    scripts.forEach((s) => s.tags?.forEach((t) => set.add(t)));
    return ["全部", ...Array.from(set)];
  }, [scripts]);

  const filtered = useMemo(() => {
    return scripts.filter((s) => {
      const matchSearch =
        search.trim() === "" ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(search.toLowerCase()));

      const matchTag =
        selectedTag === "全部" || (s.tags && s.tags.includes(selectedTag));

      return matchSearch && matchTag;
    });
  }, [scripts, search, selectedTag]);

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

          <button
            type="button"
            onClick={onCreateNew}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>建立新空白腳本</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜尋巨集名稱、備註或標籤..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-violet-500/80"
          />
        </div>

        {/* Tag Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTag(t)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                selectedTag === t
                  ? "bg-violet-600 text-white shadow-sm"
                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Full-Width Grid of Script Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((script) => {
          const totalMs = getScriptTotalDurationMs(script);

          return (
            <div
              key={script.id}
              onClick={() => onSelectAndEdit(script.id)}
              className="group p-5 rounded-3xl bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800/80 hover:border-violet-500/50 transition-all cursor-pointer shadow-sm flex flex-col justify-between gap-4"
            >
              {/* Card Header */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-sm text-zinc-100 group-hover:text-violet-300 transition-colors truncate">
                    {script.name}
                  </h3>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        exportMacroAsJson(script);
                      }}
                      className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 cursor-pointer"
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
                      className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 cursor-pointer"
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
                      className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 cursor-pointer"
                      title="刪除腳本"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-zinc-400 line-clamp-2 min-h-[32px]">
                  {script.description || "尚無備註說明，點擊進入編輯動作時序。"}
                </p>

                {/* Tags */}
                <div className="flex items-center gap-1 flex-wrap pt-1">
                  {script.tags?.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded-md text-[10px] bg-zinc-800 text-zinc-400"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80 text-xs text-zinc-400">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 font-mono text-zinc-300">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    {(totalMs / 1000).toFixed(1)}s
                  </span>
                  <span>•</span>
                  <span>{script.actions.length} 步驟</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickPlay(script);
                    }}
                    className="flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 transition-all cursor-pointer"
                    title="立即播放此腳本"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>播放</span>
                  </button>

                  <span className="text-violet-400 flex items-center gap-0.5 font-medium group-hover:translate-x-1 transition-transform">
                    <span>編輯</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
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
              您可以前往「即時儀表板」點擊「側錄巨集」開始 3-2-1 錄製手把行為，或點擊下方按鈕建立空白腳本！
            </p>
          </div>
          <button
            type="button"
            onClick={onCreateNew}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>建立第一個巨集腳本</span>
          </button>
        </div>
      )}
    </div>
  );
};
