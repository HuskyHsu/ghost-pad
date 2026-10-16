import React, { useState } from "react";
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
  const defaultTitle = `自訂巨集_${new Date().toLocaleTimeString("zh-TW", {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md select-none p-4 animate-fade-in">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700/80 rounded-3xl shadow-2xl p-6 text-zinc-100 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <FileCode2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                儲存側錄巨集腳本
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  錄製成功
                </span>
              </h3>
              <p className="text-xs text-zinc-400">已捕捉按鍵時序與操作軌跡，可儲存至腳本庫管理與循環播放</p>
            </div>
          </div>
          <button
            onClick={onDiscard}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Pill */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-violet-400" />
            <div>
              <div className="text-[10px] text-zinc-500">捕捉動作數量</div>
              <div className="text-xs font-bold text-zinc-200">{actions.length} 個步驟</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-[10px] text-zinc-500">總錄製時長</div>
              <div className="text-xs font-bold text-zinc-200">
                {(durationMs / 1000).toFixed(2)} 秒 (約 {durationMs}ms)
              </div>
            </div>
          </div>
        </div>

        {/* Form Inputs */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">腳本名稱</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="請輸入腳本名稱..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">腳本備註說明 (選填)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="說明本腳本適用遊戲場合或觸發條件..."
              className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 resize-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
          <button
            type="button"
            onClick={onDiscard}
            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-rose-400 hover:bg-rose-950/20 transition-colors cursor-pointer"
          >
            捨棄錄製
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSaveInternal(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-colors cursor-pointer border border-zinc-700"
            >
              僅儲存腳本
            </button>
            <button
              type="button"
              onClick={() => handleSaveInternal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-rose-600 text-white shadow-lg shadow-violet-600/30 hover:opacity-95 transition-opacity cursor-pointer"
            >
              <span>儲存並開啟編輯器</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
