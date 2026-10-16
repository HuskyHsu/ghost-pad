import React, { useState, useEffect, useMemo } from "react";
import { MacroAction, MacroScript, MacroButtonName } from "../../types/macro";
import { computeScheduledActions, trimMacroActions } from "../../utils/macroStorage";
import { LANES, getStickDirection } from "../InputTimelineStream";
import {
  Plus,
  Clock,
  Trash2,
  Edit3,
  Scissors,
  X,
  Compass,
  ArrowLeftRight,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

interface Props {
  script: MacroScript;
  activeActionIndex?: number;
  onChangeActions: (actions: MacroAction[]) => void;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  actionIndex: number;
}

function getActionVisual(act: MacroAction) {
  if (act.type === "button") {
    const btn = (act.button || "a").toLowerCase();
    if (["a", "b", "x", "y"].includes(btn)) {
      const colors: Record<string, string> = {
        a: "bg-emerald-500 text-white border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]",
        b: "bg-rose-500 text-white border-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.5)]",
        x: "bg-sky-500 text-white border-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.5)]",
        y: "bg-amber-500 text-white border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]",
      };
      return { lane: 0, label: btn.toUpperCase(), style: colors[btn] || colors.a };
    }
    if (["l", "r", "zl", "zr"].includes(btn)) {
      return {
        lane: 3,
        label: btn.toUpperCase(),
        style: "bg-pink-600 text-white border-pink-400 shadow-[0_0_10px_rgba(236,72,153,0.5)]",
      };
    }
    if (["l_stick_click", "r_stick_click"].includes(btn)) {
      return {
        lane: 2,
        label: btn === "l_stick_click" ? "L3" : "R3",
        style: "bg-cyan-600 text-white border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)]",
      };
    }
    return {
      lane: 4,
      label: btn === "home" ? "⌂" : btn === "capture" ? "◉" : btn === "plus" ? "+" : "−",
      style: "bg-slate-600 text-white border-slate-400 shadow-[0_0_10px_rgba(148,163,184,0.5)]",
    };
  }

  if (act.type === "stick") {
    const prefix = act.stick === "left" ? "L" : "R";
    const sx = typeof act.stickX === "number" ? act.stickX : 128;
    const sy = typeof act.stickY === "number" ? act.stickY : 128;
    const dir = getStickDirection(sx, sy, prefix) || `${prefix}•`;
    return {
      lane: 2,
      label: dir,
      style: "bg-cyan-600 text-white border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)]",
    };
  }

  if (act.type === "dpad") {
    const dpadMap = ["▲", "↗", "▶", "↘", "▼", "↙", "◀", "↖"];
    const dir = dpadMap[act.dpad ?? 0] || "▲";
    return {
      lane: 1,
      label: `十字${dir}`,
      style: "bg-purple-600 text-white border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.5)]",
    };
  }

  return {
    lane: 4,
    label: "Wait",
    style: "bg-zinc-700 text-zinc-300 border-zinc-600",
  };
}

export const MacroScoreSheet: React.FC<Props> = ({
  script,
  activeActionIndex = -1,
  onChangeActions,
}) => {
  // Line duration setting (e.g. 8s per line)
  const [lineDurationSec, setLineDurationSec] = useState<number>(8);
  const lineDurationMs = lineDurationSec * 1000;

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    actionIndex: -1,
  });

  // Edit Modal State for inline quick edits
  const [editingModal, setEditingModal] = useState<{
    visible: boolean;
    index: number;
    durationMs: number;
    delayAfterMs: number;
  } | null>(null);

  // Compute absolute timestamps
  const scheduled = useMemo(() => computeScheduledActions(script.actions), [script.actions]);
  const totalDurationMs =
    scheduled.length > 0
      ? scheduled[scheduled.length - 1].endTimeMs +
        (scheduled[scheduled.length - 1].delayAfterMs || 0)
      : 0;

  // Number of lines needed
  const numLines = Math.max(1, Math.ceil(Math.max(totalDurationMs, 1000) / lineDurationMs));

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) {
        setContextMenu((prev) => ({ ...prev, visible: false }));
      }
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, [contextMenu.visible]);

  const handleActionContextMenu = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: Math.min(window.innerWidth - 220, e.clientX),
      y: Math.min(window.innerHeight - 260, e.clientY),
      actionIndex: index,
    });
  };

  const handleDeleteAction = (index: number) => {
    const next = script.actions.filter((_, i) => i !== index);
    onChangeActions(next);
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  const handleInsertActionAfter = (index: number) => {
    const next = [...script.actions];
    const newAct: MacroAction = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: "button",
      button: "a",
      durationMs: 120,
      delayAfterMs: 80,
      note: "插入按鈕",
    };
    next.splice(index + 1, 0, newAct);
    onChangeActions(next);
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  const handleMoveAction = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= script.actions.length) return;
    const next = [...script.actions];
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;
    onChangeActions(next);
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  const handleReverseAllActions = () => {
    const next = [...script.actions].reverse();
    onChangeActions(next);
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  const handleUpdateActionField = (index: number, updates: Partial<MacroAction>) => {
    const next = [...script.actions];
    next[index] = { ...next[index], ...updates };
    onChangeActions(next);
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  const handleAppendAction = (type: "button" | "stick" | "wait") => {
    const id = `act-new-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    let newAct: MacroAction;

    if (type === "button") {
      newAct = {
        id,
        type: "button",
        button: "a",
        durationMs: 150,
        delayAfterMs: 100,
        note: "點擊 A",
      };
    } else if (type === "stick") {
      newAct = {
        id,
        type: "stick",
        stick: "left",
        stickX: 128,
        stickY: 255, // 255 is Up in Ghost-Pad protocol
        durationMs: 300,
        delayAfterMs: 50,
        note: "向上推左搖桿",
      };
    } else {
      newAct = {
        id,
        type: "wait",
        durationMs: 300,
        delayAfterMs: 0,
        note: "等待暫停",
      };
    }

    onChangeActions([...script.actions, newAct]);
  };

  return (
    <div className="flex-1 flex flex-col gap-4 select-none">
      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-zinc-200">
            多行動作時序軌道 ({script.actions.length} 步驟 • 共 {numLines} 行)
          </span>
          <span className="text-[10px] text-zinc-500">
            • 右鍵點擊任一動作區塊可進行時長修改、換鍵與刪除
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Seconds per line selector */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span className="text-[10px]">每行時長:</span>
            <select
              value={lineDurationSec}
              onChange={(e) => setLineDurationSec(Number(e.target.value))}
              className="px-2 py-1 rounded bg-zinc-950 border border-zinc-700 text-xs text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value={6}>6 秒 / 行</option>
              <option value={8}>8 秒 / 行</option>
              <option value={10}>10 秒 / 行</option>
              <option value={12}>12 秒 / 行</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleReverseAllActions}
            disabled={script.actions.length < 2}
            className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition-colors cursor-pointer disabled:opacity-40"
            title="將全部動作順序反轉 (首尾倒置)"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-400" />
            <span>反轉順序</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeActions(trimMacroActions(script.actions))}
            className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors cursor-pointer"
            title="自動修剪頭尾空白"
          >
            <Scissors className="w-3.5 h-3.5 text-amber-400" />
            <span>修剪空白</span>
          </button>
        </div>
      </div>

      {/* Multi-Line Staves Container */}
      <div className="space-y-4">
        {Array.from({ length: numLines }).map((_, lineIndex) => {
          const lineStartMs = lineIndex * lineDurationMs;
          const lineEndMs = lineStartMs + lineDurationMs;

          // Actions belonging to this line
          const lineActions = scheduled.filter(
            (act) => act.startTimeMs < lineEndMs && act.endTimeMs > lineStartMs
          );

          return (
            <div
              key={lineIndex}
              className="w-full rounded-2xl bg-zinc-950 border border-zinc-800 shadow-md overflow-hidden"
            >
              {/* Line Header & Time Ruler */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/80 border-b border-zinc-800 text-[10px] font-mono text-zinc-400">
                <span className="font-bold text-violet-400">
                  第 {lineIndex + 1} 軌 ({(lineStartMs / 1000).toFixed(1)}s ~ {(lineEndMs / 1000).toFixed(1)}s)
                </span>
                <div className="flex items-center gap-4 text-zinc-500">
                  {Array.from({ length: lineDurationSec + 1 }).map((__, sec) => (
                    <span key={sec}>+{(sec).toFixed(0)}s</span>
                  ))}
                </div>
              </div>

              {/* 5-Track Score Lanes */}
              <div className="relative p-2 space-y-1">
                {LANES.map((lane, laneIdx) => {
                  return (
                    <div
                      key={lane.name}
                      className="h-9 rounded-lg bg-zinc-900/40 border border-zinc-800/40 relative flex items-center"
                    >
                      {/* Left Track Name */}
                      <span className="w-14 shrink-0 text-[10px] font-bold text-zinc-500 pl-2 pointer-events-none select-none">
                        {lane.name}
                      </span>

                      {/* Line track body where notes are rendered proportionally */}
                      <div className="flex-1 h-full relative overflow-visible">
                        {lineActions.map((act) => {
                          const vis = getActionVisual(act);
                          if (vis.lane !== laneIdx) return null;

                          // Compute horizontal position % on this line
                          const noteStartInLine = Math.max(0, act.startTimeMs - lineStartMs);
                          const noteEndInLine = Math.min(lineDurationMs, act.endTimeMs - lineStartMs);
                          const leftPct = (noteStartInLine / lineDurationMs) * 100;
                          const widthPct = Math.max(2.5, ((noteEndInLine - noteStartInLine) / lineDurationMs) * 100);

                          const isActive = activeActionIndex === act.index;

                          return (
                            <div
                              key={act.id}
                              onContextMenu={(e) => handleActionContextMenu(e, act.index)}
                              onClick={() => {
                                setEditingModal({
                                  visible: true,
                                  index: act.index,
                                  durationMs: act.durationMs,
                                  delayAfterMs: act.delayAfterMs,
                                });
                              }}
                              style={{
                                left: `${leftPct}%`,
                                width: `${widthPct}%`,
                              }}
                              className={`absolute top-1 bottom-1 rounded-md border flex items-center justify-between px-2 text-[10px] font-bold cursor-pointer transition-all hover:scale-102 hover:z-20 ${
                                vis.style
                              } ${
                                isActive
                                  ? "ring-2 ring-white scale-105 shadow-[0_0_15px_rgba(255,255,255,0.9)] z-30"
                                  : ""
                              }`}
                              title={`#${act.index + 1} ${vis.label} (按住 ${act.durationMs}ms, 間隔 ${act.delayAfterMs}ms) • 右鍵點擊開啟功能選單`}
                            >
                              <div className="flex items-center gap-1 truncate">
                                <span className="opacity-75 text-[8px]">#{act.index + 1}</span>
                                <span className="font-black">{vis.label}</span>
                              </div>
                              <span className="text-[8px] font-mono opacity-80 shrink-0">
                                {act.durationMs}ms
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {script.actions.length === 0 && (
          <div className="p-8 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/30">
            目前本腳本尚無任何動作步驟。可點擊下方按鈕新增動作或透過即時儀表板進行側錄！
          </div>
        )}
      </div>

      {/* Bottom Append Buttons */}
      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          onClick={() => handleAppendAction("button")}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border border-dashed border-zinc-700 hover:border-emerald-500 bg-zinc-900/60 hover:bg-emerald-950/20 text-xs font-bold text-emerald-400 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ 新增按鍵動作</span>
        </button>

        <button
          type="button"
          onClick={() => handleAppendAction("stick")}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border border-dashed border-zinc-700 hover:border-cyan-500 bg-zinc-900/60 hover:bg-cyan-950/20 text-xs font-bold text-cyan-400 transition-colors cursor-pointer"
        >
          <Compass className="w-4 h-4" />
          <span>+ 新增搖桿動作</span>
        </button>

        <button
          type="button"
          onClick={() => handleAppendAction("wait")}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border border-dashed border-zinc-700 hover:border-violet-500 bg-zinc-900/60 hover:bg-violet-950/20 text-xs font-bold text-violet-400 transition-colors cursor-pointer"
        >
          <Clock className="w-4 h-4" />
          <span>+ 新增等待暫停</span>
        </button>
      </div>

      {/* Floating Right-Click Context Menu */}
      {contextMenu.visible && contextMenu.actionIndex >= 0 && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 w-52 bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl p-1.5 text-xs text-zinc-100 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
            步驟 #{contextMenu.actionIndex + 1} 動作編輯
          </div>

          <button
            type="button"
            onClick={() => {
              const act = script.actions[contextMenu.actionIndex];
              setEditingModal({
                visible: true,
                index: contextMenu.actionIndex,
                durationMs: act.durationMs,
                delayAfterMs: act.delayAfterMs,
              });
              setContextMenu((prev) => ({ ...prev, visible: false }));
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-violet-600/30 hover:text-white transition-colors cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>修改時長與間隔延遲</span>
          </button>

          {/* Move Earlier / Later */}
          <div className="flex items-center gap-1 px-1">
            <button
              type="button"
              disabled={contextMenu.actionIndex === 0}
              onClick={() => handleMoveAction(contextMenu.actionIndex, -1)}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-[11px] text-zinc-200 cursor-pointer"
              title="向前移動一位"
            >
              <ArrowUp className="w-3 h-3 text-cyan-400" />
              <span>向前移</span>
            </button>
            <button
              type="button"
              disabled={contextMenu.actionIndex === script.actions.length - 1}
              onClick={() => handleMoveAction(contextMenu.actionIndex, 1)}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-[11px] text-zinc-200 cursor-pointer"
              title="向後移動一位"
            >
              <ArrowDown className="w-3 h-3 text-cyan-400" />
              <span>向後移</span>
            </button>
          </div>

          {/* Quick Switch Button Sub-list */}
          <div className="px-3 py-1 text-[10px] text-zinc-400 font-semibold">快速換鍵：</div>
          <div className="grid grid-cols-4 gap-1 px-2 pb-1">
            {["a", "b", "x", "y"].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() =>
                  handleUpdateActionField(contextMenu.actionIndex, {
                    type: "button",
                    button: k as MacroButtonName,
                  })
                }
                className="py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-center font-bold text-xs uppercase cursor-pointer"
              >
                {k}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-1 px-2 pb-1">
            {["l", "r", "zl", "zr"].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() =>
                  handleUpdateActionField(contextMenu.actionIndex, {
                    type: "button",
                    button: k as MacroButtonName,
                  })
                }
                className="py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-center font-bold text-[10px] uppercase cursor-pointer"
              >
                {k}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => handleInsertActionAfter(contextMenu.actionIndex)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-zinc-800 transition-colors cursor-pointer border-t border-zinc-800 mt-1"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>在此之後插入新動作</span>
          </button>

          <button
            type="button"
            onClick={handleReverseAllActions}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-400" />
            <span>反轉全部動作順序</span>
          </button>

          <button
            type="button"
            onClick={() => handleDeleteAction(contextMenu.actionIndex)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>刪除此動作</span>
          </button>
        </div>
      )}

      {/* Quick Edit Modal */}
      {editingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl bg-zinc-900 border border-zinc-700 p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h4 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-violet-400" />
                <span>編輯動作步驟 #{editingModal.index + 1} 時序參數</span>
              </h4>
              <button
                onClick={() => setEditingModal(null)}
                className="p-1 rounded text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300">
                  按住持續時間 (Hold Duration ms)
                </label>
                <input
                  type="number"
                  min={20}
                  step={10}
                  value={editingModal.durationMs}
                  onChange={(e) =>
                    setEditingModal({
                      ...editingModal,
                      durationMs: Math.max(20, Number(e.target.value) || 20),
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs font-mono text-zinc-100 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300">
                  動作結束後等待延遲 (Delay After ms)
                </label>
                <input
                  type="number"
                  min={0}
                  step={10}
                  value={editingModal.delayAfterMs}
                  onChange={(e) =>
                    setEditingModal({
                      ...editingModal,
                      delayAfterMs: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs font-mono text-zinc-100 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:bg-zinc-800 cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={() => {
                  handleUpdateActionField(editingModal.index, {
                    durationMs: editingModal.durationMs,
                    delayAfterMs: editingModal.delayAfterMs,
                  });
                  setEditingModal(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white shadow-md cursor-pointer"
              >
                確認變更
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
