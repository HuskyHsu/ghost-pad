import React, { useState, useEffect } from "react";
import { MacroScript, MacroAction } from "../../types/macro";
import { MacroScoreSheet } from "./MacroScoreSheet";
import { getScriptTotalDurationMs, exportMacroAsJson } from "../../utils/macroStorage";
import {
  Save,
  Download,
  Copy,
  Trash2,
  Clock,
  FileCode2,
  Tag,
  Check,
  ArrowLeft,
} from "lucide-react";

interface Props {
  script: MacroScript;
  activeActionIndex?: number;
  onSaveScript: (updated: MacroScript) => void;
  onDuplicateScript: (script: MacroScript) => void;
  onDeleteScript: (id: string) => void;
  onBackToList?: () => void;
}

export const MacroEditor: React.FC<Props> = ({
  script,
  activeActionIndex = -1,
  onSaveScript,
  onDuplicateScript,
  onDeleteScript,
  onBackToList,
}) => {
  const [name, setName] = useState(script.name);
  const [description, setDescription] = useState(script.description || "");
  const [tags, setTags] = useState<string[]>(script.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [actions, setActions] = useState<MacroAction[]>(script.actions);
  const [hasSaved, setHasSaved] = useState(false);

  // Sync when script prop changes
  useEffect(() => {
    setName(script.name);
    setDescription(script.description || "");
    setTags(script.tags || []);
    setActions(script.actions);
    setHasSaved(false);
  }, [script.id]);

  const handleSave = () => {
    const updated: MacroScript = {
      ...script,
      name: name.trim() || "未命名腳本",
      description: description.trim(),
      tags,
      actions,
      updatedAt: Date.now(),
    };
    onSaveScript(updated);
    setHasSaved(true);
    setTimeout(() => setHasSaved(false), 2000);
  };

  const handleAddTag = (t: string) => {
    const trimmed = t.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter((item) => item !== t));
  };

  const currentDurationMs = getScriptTotalDurationMs({ ...script, actions });

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 md:p-8 space-y-6 bg-zinc-950 select-none">
      {/* Editor Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800 shadow-sm">
        <div className="flex-1 space-y-2">
          {/* Back Navigation & Title */}
          <div className="flex items-center gap-3">
            {onBackToList && (
              <button
                type="button"
                onClick={onBackToList}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer border border-zinc-700 shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>返回清單</span>
              </button>
            )}

            <div className="flex items-center gap-2 flex-wrap flex-1">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-lg font-bold bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-violet-500 focus:outline-none text-zinc-100 max-w-md px-1 py-0.5 rounded transition-colors"
                placeholder="腳本標題..."
              />
              {script.isPreset && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/20 text-violet-400 border border-violet-500/30">
                  範本
                </span>
              )}
            </div>
          </div>

          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full text-xs text-zinc-400 bg-transparent border-b border-transparent hover:border-zinc-800 focus:border-violet-500/50 focus:outline-none px-1 py-0.5"
            placeholder="點此填寫腳本備註說明或使用場合..."
          />

          {/* Tags Pills */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <Tag className="w-3.5 h-3.5 text-zinc-500" />
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700/80"
              >
                #{t}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(t)}
                  className="hover:text-rose-400 cursor-pointer ml-0.5"
                >
                  ×
                </button>
              </span>
            ))}

            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTag(tagInput);
                  setTagInput("");
                }
              }}
              placeholder="+ 標籤"
              className="w-16 px-1.5 py-0.5 text-[10px] bg-zinc-950 border border-zinc-800 rounded text-zinc-300 focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>

        {/* Stats & Actions */}
        <div className="flex flex-col items-end gap-3 shrink-0">
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <strong className="text-zinc-200">
                {(currentDurationMs / 1000).toFixed(2)}s
              </strong>
            </span>
            <span className="text-zinc-600">|</span>
            <span className="flex items-center gap-1">
              <FileCode2 className="w-3.5 h-3.5 text-violet-400" />
              <strong className="text-zinc-200">{actions.length}</strong> 個動作
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportMacroAsJson({ ...script, name, description, tags, actions })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors cursor-pointer"
              title="匯出單一 JSON 腳本檔案"
            >
              <Download className="w-3.5 h-3.5" />
              <span>匯出</span>
            </button>

            <button
              type="button"
              onClick={() => onDuplicateScript({ ...script, name, description, tags, actions })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors cursor-pointer"
              title="複製一份新腳本"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>複製</span>
            </button>

            <button
              type="button"
              onClick={() => onDeleteScript(script.id)}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
              title="刪除此腳本"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                hasSaved
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                  : "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/30"
              }`}
            >
              {hasSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              <span>{hasSaved ? "已儲存！" : "儲存變更"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Multi-Line Musical Stave Score Sheet with Right-Click Context Menu */}
      <MacroScoreSheet
        script={{ ...script, actions }}
        activeActionIndex={activeActionIndex}
        onChangeActions={setActions}
      />
    </div>
  );
};
