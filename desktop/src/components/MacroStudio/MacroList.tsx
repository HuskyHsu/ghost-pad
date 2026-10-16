import React, { useState, useMemo } from "react";
import { MacroScript } from "../../types/macro";
import { getScriptTotalDurationMs } from "../../utils/macroStorage";
import {
  Search,
  Plus,
  Upload,
  Download,
  FileCode2,
  Clock,
  ChevronRight,
} from "lucide-react";

interface Props {
  scripts: MacroScript[];
  selectedScriptId: string | null;
  onSelectScript: (id: string) => void;
  onCreateNew: () => void;
  onImportJson: () => void;
  onExportAll: () => void;
}

export const MacroList: React.FC<Props> = ({
  scripts,
  selectedScriptId,
  onSelectScript,
  onCreateNew,
  onImportJson,
  onExportAll,
}) => {
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("全部");

  // Collect all unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    scripts.forEach((s) => s.tags?.forEach((t) => set.add(t)));
    return ["全部", ...Array.from(set)];
  }, [scripts]);

  // Filter scripts
  const filteredScripts = useMemo(() => {
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
    <aside className="w-72 xl:w-80 h-full flex flex-col bg-zinc-950 border-r border-zinc-800/80 shrink-0 select-none">
      {/* Top Header & Actions */}
      <div className="p-4 border-b border-zinc-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <FileCode2 className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
              巨集腳本庫 ({scripts.length})
            </h2>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onImportJson}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
              title="匯入 JSON 腳本檔案"
            >
              <Upload className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onExportAll}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
              title="備份匯出全部腳本"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onCreateNew}
              className="p-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors cursor-pointer shadow-sm shadow-violet-600/30"
              title="建立空白新腳本"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜尋腳本或標籤..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-violet-500/80"
          />
        </div>

        {/* Tag Filters Pills */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTag(t)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors shrink-0 cursor-pointer ${
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

      {/* Script List Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredScripts.map((s) => {
          const isSelected = selectedScriptId === s.id;
          const totalMs = getScriptTotalDurationMs(s);

          return (
            <div
              key={s.id}
              onClick={() => onSelectScript(s.id)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 ${
                isSelected
                  ? "bg-violet-950/40 border-violet-500 shadow-lg shadow-violet-950/50 ring-1 ring-violet-500/50"
                  : "bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-900 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold text-xs text-zinc-100 truncate">
                  {s.name}
                </div>
                {s.isPreset && (
                  <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-500/20 text-violet-400 border border-violet-500/30">
                    範本
                  </span>
                )}
              </div>

              {s.description && (
                <p className="text-[10px] text-zinc-400 line-clamp-1">
                  {s.description}
                </p>
              )}

              <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-zinc-800/60">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-zinc-400">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    {(totalMs / 1000).toFixed(1)}s
                  </span>
                  <span>•</span>
                  <span>{s.actions.length} 步驟</span>
                </div>

                <div className="flex items-center gap-1">
                  {s.tags?.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.2 rounded text-[9px] bg-zinc-800 text-zinc-400"
                    >
                      #{tag}
                    </span>
                  ))}
                  <ChevronRight className="w-3 h-3 text-zinc-600" />
                </div>
              </div>
            </div>
          );
        })}

        {filteredScripts.length === 0 && (
          <div className="p-8 text-center text-xs text-zinc-500">
            查無相符腳本
          </div>
        )}
      </div>
    </aside>
  );
};
