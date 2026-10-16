import React from "react";
import { MacroAction, MacroButtonName } from "../../types/macro";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Scissors,
  Clock,
  Compass,
} from "lucide-react";
import { trimMacroActions } from "../../utils/macroStorage";

interface Props {
  actions: MacroAction[];
  activeActionIndex?: number;
  onChangeActions: (actions: MacroAction[]) => void;
}

const AVAILABLE_BUTTONS: { value: MacroButtonName; label: string }[] = [
  { value: "a", label: "A 按鍵" },
  { value: "b", label: "B 按鍵" },
  { value: "x", label: "X 按鍵" },
  { value: "y", label: "Y 按鍵" },
  { value: "l", label: "L 肩鍵" },
  { value: "r", label: "R 肩鍵" },
  { value: "zl", label: "ZL 扳機" },
  { value: "zr", label: "ZR 扳機" },
  { value: "minus", label: "Minus (-)" },
  { value: "plus", label: "Plus (+)" },
  { value: "home", label: "Home (⌂)" },
  { value: "capture", label: "Capture (◉)" },
  { value: "l_stick_click", label: "L3 下壓" },
  { value: "r_stick_click", label: "R3 下壓" },
];

export const MacroStepList: React.FC<Props> = ({
  actions,
  activeActionIndex = -1,
  onChangeActions,
}) => {
  const handleUpdateAction = (index: number, updates: Partial<MacroAction>) => {
    const next = [...actions];
    next[index] = { ...next[index], ...updates };
    onChangeActions(next);
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const next = [...actions];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    onChangeActions(next);
  };

  const handleMoveDown = (index: number) => {
    if (index >= actions.length - 1) return;
    const next = [...actions];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    onChangeActions(next);
  };

  const handleDelete = (index: number) => {
    const next = actions.filter((_, i) => i !== index);
    onChangeActions(next);
  };

  const handleAddDefaultAction = (type: "button" | "stick" | "wait") => {
    const id = `act-new-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    let newAct: MacroAction;

    if (type === "button") {
      newAct = {
        id,
        type: "button",
        button: "a",
        durationMs: 120,
        delayAfterMs: 0,
        note: "點擊按鈕",
      };
    } else if (type === "stick") {
      newAct = {
        id,
        type: "stick",
        stick: "left",
        stickX: 128,
        stickY: 0,
        durationMs: 300,
        delayAfterMs: 0,
        note: "推動搖桿",
      };
    } else {
      newAct = {
        id,
        type: "wait",
        durationMs: 200,
        delayAfterMs: 0,
        note: "等待暫停",
      };
    }

    onChangeActions([...actions, newAct]);
  };

  const handleTrim = () => {
    const trimmed = trimMacroActions(actions);
    onChangeActions(trimmed);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-300">
            動作時序清單 ({actions.length} 步驟)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTrim}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/80 transition-colors cursor-pointer"
            title="自動移除無效等待或過長空檔"
          >
            <Scissors className="w-3.5 h-3.5 text-amber-400" />
            <span>修剪頭尾空白</span>
          </button>
        </div>
      </div>

      {/* Action Cards List */}
      <div className="space-y-2 select-none">
        {actions.map((act, index) => {
          const isActive = activeActionIndex === index;

          return (
            <div
              key={act.id}
              className={`p-3 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                isActive
                  ? "bg-violet-950/40 border-violet-500 shadow-[0_0_15px_rgba(124,58,237,0.3)] ring-1 ring-violet-400"
                  : "bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700"
              }`}
            >
              {/* Left Section: Index & Type */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-bold ${
                    isActive
                      ? "bg-violet-600 text-white"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  #{index + 1}
                </div>

                {/* Type Selection */}
                <select
                  value={act.type}
                  onChange={(e) =>
                    handleUpdateAction(index, {
                      type: e.target.value as any,
                      button: e.target.value === "button" ? act.button || "a" : undefined,
                      stick: e.target.value === "stick" ? act.stick || "left" : undefined,
                    })
                  }
                  className="px-2 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 cursor-pointer"
                >
                  <option value="button">按鍵動作</option>
                  <option value="stick">搖桿位移</option>
                  <option value="dpad">十字鍵</option>
                  <option value="wait">等待時間</option>
                </select>

                {/* Sub-parameters based on Type */}
                {act.type === "button" && (
                  <select
                    value={act.button || "a"}
                    onChange={(e) =>
                      handleUpdateAction(index, {
                        button: e.target.value as MacroButtonName,
                      })
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-xs font-semibold text-emerald-300 focus:outline-none cursor-pointer"
                  >
                    {AVAILABLE_BUTTONS.map((b) => (
                      <option key={b.value} value={b.value}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                )}

                {act.type === "stick" && (
                  <div className="flex items-center gap-1.5">
                    <select
                      value={act.stick || "left"}
                      onChange={(e) =>
                        handleUpdateAction(index, { stick: e.target.value as any })
                      }
                      className="px-2 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-cyan-300 cursor-pointer"
                    >
                      <option value="left">左搖桿 (L)</option>
                      <option value="right">右搖桿 (R)</option>
                    </select>

                    {/* Quick Stick Direction */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateAction(index, { stickX: 128, stickY: 0 })}
                        className={`px-1.5 py-1 text-[10px] rounded border cursor-pointer ${
                          act.stickX === 128 && act.stickY === 0
                            ? "bg-cyan-500 text-zinc-950 border-cyan-400 font-bold"
                            : "bg-zinc-800 text-zinc-400 border-zinc-700"
                        }`}
                        title="向上推到底"
                      >
                        ▲ 上
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateAction(index, { stickX: 128, stickY: 255 })}
                        className={`px-1.5 py-1 text-[10px] rounded border cursor-pointer ${
                          act.stickX === 128 && act.stickY === 255
                            ? "bg-cyan-500 text-zinc-950 border-cyan-400 font-bold"
                            : "bg-zinc-800 text-zinc-400 border-zinc-700"
                        }`}
                        title="向下推到底"
                      >
                        ▼ 下
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateAction(index, { stickX: 0, stickY: 128 })}
                        className={`px-1.5 py-1 text-[10px] rounded border cursor-pointer ${
                          act.stickX === 0 && act.stickY === 128
                            ? "bg-cyan-500 text-zinc-950 border-cyan-400 font-bold"
                            : "bg-zinc-800 text-zinc-400 border-zinc-700"
                        }`}
                        title="向左推到底"
                      >
                        ◀ 左
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateAction(index, { stickX: 255, stickY: 128 })}
                        className={`px-1.5 py-1 text-[10px] rounded border cursor-pointer ${
                          act.stickX === 255 && act.stickY === 128
                            ? "bg-cyan-500 text-zinc-950 border-cyan-400 font-bold"
                            : "bg-zinc-800 text-zinc-400 border-zinc-700"
                        }`}
                        title="向右推到底"
                      >
                        ▶ 右
                      </button>
                    </div>
                  </div>
                )}

                {act.type === "dpad" && (
                  <select
                    value={act.dpad ?? 0}
                    onChange={(e) =>
                      handleUpdateAction(index, { dpad: Number(e.target.value) })
                    }
                    className="px-2 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-purple-300 cursor-pointer"
                  >
                    <option value={0}>▲ 上</option>
                    <option value={1}>↗ 右上</option>
                    <option value={2}>▶ 右</option>
                    <option value={3}>↘ 右下</option>
                    <option value={4}>▼ 下</option>
                    <option value={5}>↙ 左下</option>
                    <option value={6}>◀ 左</option>
                    <option value={7}>↖ 左上</option>
                  </select>
                )}
              </div>

              {/* Middle Section: Hold Duration & Delay After */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-zinc-400">
                    {act.type === "wait" ? "等待:" : "持續:"}
                  </span>
                  <input
                    type="number"
                    min={10}
                    step={10}
                    value={act.durationMs}
                    onChange={(e) =>
                      handleUpdateAction(index, {
                        durationMs: Math.max(10, Number(e.target.value) || 10),
                        delayAfterMs: 0,
                      })
                    }
                    className="w-16 px-2 py-1 rounded bg-zinc-950 border border-zinc-700 text-xs font-mono text-zinc-200 text-right focus:outline-none"
                  />
                  <span className="text-[10px] text-zinc-500">ms</span>
                </div>
              </div>

              {/* Right Section: Ordering & Deletion */}
              <div className="flex items-center gap-1 self-end md:self-auto">
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                  title="上移"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === actions.length - 1}
                  className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                  title="下移"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(index)}
                  className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                  title="刪除步驟"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {actions.length === 0 && (
          <div className="p-8 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/30">
            目前尚無動作步驟，可點擊下方按鈕新增步驟或從即時儀表板進行側錄！
          </div>
        )}
      </div>

      {/* Add Action Buttons Bar */}
      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          onClick={() => handleAddDefaultAction("button")}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-zinc-700 hover:border-emerald-500/80 bg-zinc-900/60 hover:bg-emerald-950/20 text-xs font-medium text-emerald-400 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ 新增按鍵動作</span>
        </button>
        <button
          type="button"
          onClick={() => handleAddDefaultAction("stick")}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-zinc-700 hover:border-cyan-500/80 bg-zinc-900/60 hover:bg-cyan-950/20 text-xs font-medium text-cyan-400 transition-colors cursor-pointer"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>+ 新增搖桿位移</span>
        </button>
        <button
          type="button"
          onClick={() => handleAddDefaultAction("wait")}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-zinc-700 hover:border-violet-500/80 bg-zinc-900/60 hover:bg-violet-950/20 text-xs font-medium text-violet-400 transition-colors cursor-pointer"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>+ 新增等待暫停</span>
        </button>
      </div>
    </div>
  );
};
