import React, { useState, useMemo } from "react";
import { MacroAction, MacroScript, MacroButtonName, MacroPlayerStatus } from "../../types/macro";
import { computeScheduledActions, trimMacroActions } from "../../utils/macroStorage";
import { LANES, getStickDirection } from "../InputTimelineStream";
import {
  Clock,
  Trash2,
  Scissors,
  X,
  ArrowUp,
  ArrowDown,
  Gamepad2,
} from "lucide-react";

interface Props {
  script: MacroScript;
  activeActionIndex?: number;
  playerStatus?: MacroPlayerStatus;
  onChangeActions: (actions: MacroAction[]) => void;
}

interface ActionPickerState {
  visible: boolean;
  insertIndex?: number;
  durationMs: number;
}

interface ActionPresetOption {
  label: string;
  subLabel: string;
  type: "button" | "stick" | "dpad";
  button?: MacroButtonName;
  dpad?: number;
  stick?: "left" | "right";
  stickX?: number;
  stickY?: number;
  style: string;
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
      label: dir,
      style: "bg-purple-600 text-white border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.5)]",
    };
  }

  if (act.type === "wait") {
    const formatted = act.durationMs >= 1000 ? `${(act.durationMs / 1000).toFixed(1)}s` : `${act.durationMs}ms`;
    return {
      lane: 4,
      label: `⏸ ${formatted}`,
      style: "bg-zinc-800 text-amber-300 border border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.15)]",
    };
  }

  return {
    lane: 4,
    label: "Wait",
    style: "bg-zinc-800 text-zinc-300 border-zinc-600",
  };
}

const ABXY_ITEMS: ActionPresetOption[] = [
  {
    label: "A",
    subLabel: "A 鍵 (右/確認)",
    type: "button",
    button: "a",
    style: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30 hover:border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]",
  },
  {
    label: "B",
    subLabel: "B 鍵 (下/取消)",
    type: "button",
    button: "b",
    style: "bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30 hover:border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.2)]",
  },
  {
    label: "X",
    subLabel: "X 鍵 (上/選單)",
    type: "button",
    button: "x",
    style: "bg-sky-500/20 text-sky-300 border-sky-500/40 hover:bg-sky-500/30 hover:border-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.2)]",
  },
  {
    label: "Y",
    subLabel: "Y 鍵 (左/特殊)",
    type: "button",
    button: "y",
    style: "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 hover:border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.2)]",
  },
];

const DPAD_ITEMS: ActionPresetOption[] = [
  {
    label: "▲",
    subLabel: "十字方向上",
    type: "dpad",
    dpad: 0,
    style: "bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30 hover:border-purple-400",
  },
  {
    label: "▼",
    subLabel: "十字方向下",
    type: "dpad",
    dpad: 4,
    style: "bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30 hover:border-purple-400",
  },
  {
    label: "◀",
    subLabel: "十字方向左",
    type: "dpad",
    dpad: 6,
    style: "bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30 hover:border-purple-400",
  },
  {
    label: "▶",
    subLabel: "十字方向右",
    type: "dpad",
    dpad: 2,
    style: "bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30 hover:border-purple-400",
  },
];

const SHOULDER_ITEMS: ActionPresetOption[] = [
  {
    label: "L",
    subLabel: "左前肩鍵",
    type: "button",
    button: "l",
    style: "bg-pink-500/20 text-pink-300 border-pink-500/40 hover:bg-pink-500/30 hover:border-pink-400 font-bold",
  },
  {
    label: "ZL",
    subLabel: "左後扳機鍵",
    type: "button",
    button: "zl",
    style: "bg-pink-500/20 text-pink-300 border-pink-500/40 hover:bg-pink-500/30 hover:border-pink-400 font-bold",
  },
  {
    label: "ZR",
    subLabel: "右後扳機鍵",
    type: "button",
    button: "zr",
    style: "bg-pink-500/20 text-pink-300 border-pink-500/40 hover:bg-pink-500/30 hover:border-pink-400 font-bold",
  },
  {
    label: "R",
    subLabel: "右前肩鍵",
    type: "button",
    button: "r",
    style: "bg-pink-500/20 text-pink-300 border-pink-500/40 hover:bg-pink-500/30 hover:border-pink-400 font-bold",
  },
];

const L_STICK_ITEMS: ActionPresetOption[] = [
  {
    label: "L▲",
    subLabel: "左搖桿向上",
    type: "stick",
    stick: "left",
    stickX: 128,
    stickY: 255,
    style: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30 hover:border-cyan-400",
  },
  {
    label: "L▼",
    subLabel: "左搖桿向下",
    type: "stick",
    stick: "left",
    stickX: 128,
    stickY: 0,
    style: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30 hover:border-cyan-400",
  },
  {
    label: "L◀",
    subLabel: "左搖桿向左",
    type: "stick",
    stick: "left",
    stickX: 0,
    stickY: 128,
    style: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30 hover:border-cyan-400",
  },
  {
    label: "L▶",
    subLabel: "左搖桿向右",
    type: "stick",
    stick: "left",
    stickX: 255,
    stickY: 128,
    style: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30 hover:border-cyan-400",
  },
  {
    label: "L3",
    subLabel: "左搖桿按壓 (L3)",
    type: "button",
    button: "l_stick_click",
    style: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30 hover:border-cyan-400 font-bold",
  },
];

const R_STICK_ITEMS: ActionPresetOption[] = [
  {
    label: "R▲",
    subLabel: "右搖桿向上",
    type: "stick",
    stick: "right",
    stickX: 128,
    stickY: 255,
    style: "bg-teal-500/20 text-teal-300 border-teal-500/40 hover:bg-teal-500/30 hover:border-teal-400",
  },
  {
    label: "R▼",
    subLabel: "右搖桿向下",
    type: "stick",
    stick: "right",
    stickX: 128,
    stickY: 0,
    style: "bg-teal-500/20 text-teal-300 border-teal-500/40 hover:bg-teal-500/30 hover:border-teal-400",
  },
  {
    label: "R◀",
    subLabel: "右搖桿向左",
    type: "stick",
    stick: "right",
    stickX: 0,
    stickY: 128,
    style: "bg-teal-500/20 text-teal-300 border-teal-500/40 hover:bg-teal-500/30 hover:border-teal-400",
  },
  {
    label: "R▶",
    subLabel: "右搖桿向右",
    type: "stick",
    stick: "right",
    stickX: 255,
    stickY: 128,
    style: "bg-teal-500/20 text-teal-300 border-teal-500/40 hover:bg-teal-500/30 hover:border-teal-400",
  },
  {
    label: "R3",
    subLabel: "右搖桿按壓 (R3)",
    type: "button",
    button: "r_stick_click",
    style: "bg-teal-500/20 text-teal-300 border-teal-500/40 hover:bg-teal-500/30 hover:border-teal-400 font-bold",
  },
];

const SYSTEM_ITEMS: ActionPresetOption[] = [
  {
    label: "+",
    subLabel: "Plus 開始鍵",
    type: "button",
    button: "plus",
    style: "bg-slate-700/40 text-slate-200 border-slate-600 hover:bg-slate-600/50 hover:border-slate-500 font-mono text-sm",
  },
  {
    label: "−",
    subLabel: "Minus 選擇鍵",
    type: "button",
    button: "minus",
    style: "bg-slate-700/40 text-slate-200 border-slate-600 hover:bg-slate-600/50 hover:border-slate-500 font-mono text-sm",
  },
  {
    label: "⌂",
    subLabel: "Home 主頁鍵",
    type: "button",
    button: "home",
    style: "bg-slate-700/40 text-slate-200 border-slate-600 hover:bg-slate-600/50 hover:border-slate-500",
  },
  {
    label: "◉",
    subLabel: "Capture 截圖鍵",
    type: "button",
    button: "capture",
    style: "bg-slate-700/40 text-slate-200 border-slate-600 hover:bg-slate-600/50 hover:border-slate-500",
  },
];

const GamepadKeypadMatrix: React.FC<{
  currentAction?: MacroAction | null;
  onSelectAction: (opt: ActionPresetOption) => void;
  onSetWait?: () => void;
  showWaitOption?: boolean;
}> = ({ currentAction, onSelectAction, onSetWait, showWaitOption }) => {
  const isSelected = (item: ActionPresetOption) => {
    if (!currentAction) return false;
    if (currentAction.type !== item.type) return false;
    if (item.type === "button") return currentAction.button === item.button;
    if (item.type === "dpad") return currentAction.dpad === item.dpad;
    if (item.type === "stick") {
      return (
        currentAction.stick === item.stick &&
        currentAction.stickX === item.stickX &&
        currentAction.stickY === item.stickY
      );
    }
    return false;
  };

  const renderKeyButton = (item: ActionPresetOption) => {
    const selected = isSelected(item);
    return (
      <button
        key={`${item.type}-${item.label}-${item.button || item.dpad || item.stick}`}
        type="button"
        title={item.subLabel}
        onClick={() => onSelectAction(item)}
        className={`w-full h-9 rounded-xl border flex items-center justify-center font-black text-xs transition-all cursor-pointer select-none ${
          item.style
        } ${
          selected
            ? "ring-2 ring-white scale-105 shadow-[0_0_12px_rgba(255,255,255,0.7)] brightness-125 z-10"
            : "opacity-85 hover:opacity-100 hover:scale-[1.03]"
        }`}
      >
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <div className="space-y-3 select-none">
      {/* Row 1: D-Pad (Left) & ABXY (Right) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* D-Pad */}
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-zinc-400 px-1 uppercase tracking-wider">
            十字方向鍵 (D-Pad)
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {DPAD_ITEMS.map(renderKeyButton)}
          </div>
        </div>

        {/* ABXY */}
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-zinc-400 px-1 uppercase tracking-wider">
            動作鍵 (ABXY)
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {ABXY_ITEMS.map(renderKeyButton)}
          </div>
        </div>
      </div>

      {/* Row 2: Shoulders & Triggers (L, ZL, ZR, R) */}
      <div className="space-y-1">
        <div className="text-[10px] font-bold text-zinc-400 px-1 uppercase tracking-wider">
          肩鍵與扳機 (Shoulders & Triggers)
        </div>
        <div className="grid grid-cols-4 gap-2">
          {SHOULDER_ITEMS.map(renderKeyButton)}
        </div>
      </div>

      {/* Row 3: Left Stick (Left) & Right Stick (Right) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Left Stick */}
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-zinc-400 px-1 uppercase tracking-wider">
            左類比搖桿 (L-Stick)
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {L_STICK_ITEMS.map(renderKeyButton)}
          </div>
        </div>

        {/* Right Stick */}
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-zinc-400 px-1 uppercase tracking-wider">
            右類比搖桿 (R-Stick)
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {R_STICK_ITEMS.map(renderKeyButton)}
          </div>
        </div>
      </div>

      {/* Row 4: System Keys & Wait Switch */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-zinc-800/80 items-end">
        {/* System Keys (Left 50%, perfectly aligned with D-Pad above) */}
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-zinc-400 px-1 uppercase tracking-wider">
            系統功能鍵
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {SYSTEM_ITEMS.map(renderKeyButton)}
          </div>
        </div>

        {/* Wait Option (Right 50%, aligned with ABXY above) */}
        {showWaitOption && onSetWait ? (
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-zinc-400 px-1 uppercase tracking-wider">
              空白等待 (Wait)
            </div>
            <button
              type="button"
              onClick={onSetWait}
              className="w-full h-9 px-3 rounded-xl bg-amber-950/20 hover:bg-amber-900/30 border border-amber-600/40 text-xs font-bold text-amber-300 hover:text-amber-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>轉為空白等待 (Wait)</span>
            </button>
          </div>
        ) : (
          <div className="hidden sm:block" />
        )}
      </div>
    </div>
  );
};

export const MacroScoreSheet: React.FC<Props> = ({
  script,
  activeActionIndex = -1,
  playerStatus,
  onChangeActions,
}) => {
  // Line duration setting (e.g. 8s per line)
  const [lineDurationSec, setLineDurationSec] = useState<number>(8);
  const lineDurationMs = lineDurationSec * 1000;

  // Active playback tracking
  const isScriptPlaying =
    Boolean(playerStatus?.isPlaying || playerStatus?.isPaused) &&
    playerStatus?.currentScriptId === script.id;
  const currentElapsedMs = isScriptPlaying ? (playerStatus?.elapsedMs ?? 0) : null;

  // Action Picker Modal state
  const [actionPicker, setActionPicker] = useState<ActionPickerState | null>(null);

  // Active Action Editor Modal index (null if closed)
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const currentEditingAction =
    editingIndex !== null && editingIndex >= 0 && editingIndex < script.actions.length
      ? script.actions[editingIndex]
      : null;

  // Compute absolute timestamps
  const scheduled = useMemo(() => computeScheduledActions(script.actions), [script.actions]);
  const totalDurationMs =
    scheduled.length > 0
      ? scheduled[scheduled.length - 1].endTimeMs +
        (scheduled[scheduled.length - 1].delayAfterMs || 0)
      : 0;

  // Number of lines needed
  const numLines = Math.max(1, Math.ceil(Math.max(totalDurationMs, 1000) / lineDurationMs));

  const handleDeleteAction = (index: number) => {
    const next = script.actions.filter((_, i) => i !== index);
    onChangeActions(next);
    setEditingIndex(null);
  };

  const handleInsertWaitAfter = (index: number) => {
    const next = [...script.actions];
    const newAct: MacroAction = {
      id: `act-wait-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: "wait",
      durationMs: 150,
      delayAfterMs: 0,
      note: "等待暫停",
    };
    next.splice(index + 1, 0, newAct);
    onChangeActions(next);
    setEditingIndex(index + 1);
  };

  const handleMoveAction = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= script.actions.length) return;
    const next = [...script.actions];
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;
    onChangeActions(next);
    setEditingIndex(targetIdx);
  };

  const handleUpdateActionField = (index: number, updates: Partial<MacroAction>) => {
    const next = [...script.actions];
    next[index] = { ...next[index], ...updates };
    onChangeActions(next);
  };

  const handleSelectPickerAction = (opt: ActionPresetOption) => {
    if (!actionPicker) return;
    const id = `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newAct: MacroAction = {
      id,
      type: opt.type,
      button: opt.button,
      dpad: opt.dpad,
      stick: opt.stick,
      stickX: opt.stickX,
      stickY: opt.stickY,
      durationMs: actionPicker.durationMs,
      delayAfterMs: 0,
      note: opt.subLabel || opt.label,
    };

    if (actionPicker.insertIndex !== undefined && actionPicker.insertIndex >= 0) {
      const next = [...script.actions];
      next.splice(actionPicker.insertIndex + 1, 0, newAct);
      onChangeActions(next);
    } else {
      onChangeActions([...script.actions, newAct]);
    }
    setActionPicker(null);
  };

  const handleAppendWait = () => {
    const id = `act-wait-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newAct: MacroAction = {
      id,
      type: "wait",
      durationMs: 200,
      delayAfterMs: 0,
      note: "等待暫停",
    };
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
              className="px-2 py-1 rounded bg-zinc-950 border border-zinc-700 text-xs text-zinc-200 focus:outline-none cursor-pointer font-medium"
            >
              <option value={4}>4 秒 / 行 (特大放大 • 微操清晰)</option>
              <option value={6}>6 秒 / 行 (清晰平衡)</option>
              <option value={8}>8 秒 / 行 (標準)</option>
              <option value={10}>10 秒 / 行</option>
              <option value={12}>12 秒 / 行</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => onChangeActions(trimMacroActions(script.actions))}
            className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors cursor-pointer"
            title="自動修剪頭尾空白與微隙雜訊"
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

          // Is playhead currently on this line?
          const isPlayheadOnThisLine =
            currentElapsedMs !== null &&
            currentElapsedMs >= lineStartMs &&
            (currentElapsedMs < lineEndMs || (lineIndex === numLines - 1 && currentElapsedMs >= lineEndMs));

          const playheadPct = isPlayheadOnThisLine
            ? Math.min(100, Math.max(0, ((currentElapsedMs - lineStartMs) / lineDurationMs) * 100))
            : 0;

          return (
            <div
              key={lineIndex}
              className="w-full rounded-2xl bg-zinc-950 border border-zinc-800 shadow-md overflow-hidden"
            >
              {/* Line Header */}
              <div className="flex items-center justify-between px-3 py-1 bg-zinc-900/80 border-b border-zinc-800 text-[10px] font-mono text-zinc-400">
                <span className="font-bold text-violet-400">
                  第 {lineIndex + 1} 行 ({(lineStartMs / 1000).toFixed(1)}s ~ {(lineEndMs / 1000).toFixed(1)}s)
                </span>
                <span className="text-[9px] text-zinc-500 font-sans">
                  每格 1 秒 • 共 {lineDurationSec} 秒
                </span>
              </div>

              {/* Time Ruler (Proportionally aligned with lanes below) */}
              <div className="flex items-center px-2 py-0.5 bg-zinc-900/40 border-b border-zinc-800/60 text-[8px] font-mono text-zinc-400">
                {/* Left track spacer (matches w-14 shrink-0 lane header) */}
                <div className="w-14 shrink-0 flex items-center gap-1.5 pl-2 select-none pointer-events-none">
                  <Clock className="w-2.5 h-2.5 text-zinc-500" />
                  <span className="text-[8px] font-bold text-zinc-500">
                    時間軸
                  </span>
                </div>

                {/* Ruler timeline track (matches flex-1 lane body) */}
                <div className="flex-1 h-3 relative overflow-visible">
                  {Array.from({ length: lineDurationSec + 1 }).map((__, sec) => {
                    const leftPct = (sec / lineDurationSec) * 100;
                    return (
                      <div
                        key={sec}
                        className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-none"
                        style={{
                          left: `${leftPct}%`,
                          transform:
                            sec === 0
                              ? "translateX(0)"
                              : sec === lineDurationSec
                              ? "translateX(-100%)"
                              : "translateX(-50%)",
                        }}
                      >
                        <span className="text-[8px] leading-none text-zinc-400 font-mono select-none">
                          +{sec}s
                        </span>
                        <div className="w-px h-1 bg-zinc-600 mt-0.5" />
                      </div>
                    );
                  })}

                  {/* Playhead marker in Time Ruler */}
                  {isPlayheadOnThisLine && (
                    <div
                      className="absolute top-0 bottom-0 pointer-events-none z-30"
                      style={{
                        left: `${playheadPct}%`,
                        transform: "translateX(-50%)",
                      }}
                    >
                      <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-cyan-400 filter drop-shadow-[0_0_6px_rgba(34,211,238,0.95)]" />
                    </div>
                  )}
                </div>
              </div>

              {/* 5-Track Score Lanes */}
              <div className="relative p-1.5 space-y-0.5">
                {/* Playhead Blue Line across all 5 lanes */}
                {isPlayheadOnThisLine && (
                  <div className="absolute inset-y-0 left-1.5 right-1.5 flex pointer-events-none z-30">
                    <div className="w-14 shrink-0" />
                    <div className="flex-1 relative h-full">
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,1)]"
                        style={{
                          left: `${playheadPct}%`,
                          transform: "translateX(-50%)",
                        }}
                      >
                        {/* Glowing aura */}
                        <div className="absolute inset-y-0 -left-1 -right-1 bg-cyan-400/25 blur-xs" />
                      </div>
                    </div>
                  </div>
                )}

                {LANES.map((lane, laneIdx) => {
                  const laneTitle = laneIdx === 4 ? "系統/等待" : lane.name;
                  return (
                    <div
                      key={lane.name}
                      className="h-6 rounded-md bg-zinc-900/40 border border-zinc-800/40 relative flex items-center"
                    >
                      {/* Left Track Name with Color Indicator Dot */}
                      <div className="w-14 shrink-0 flex items-center gap-1.5 pl-2 select-none pointer-events-none">
                        <div
                          className="w-1.5 h-1.5 rounded-full shrink-0 shadow-[0_0_6px_currentColor]"
                          style={{ backgroundColor: laneIdx === 4 ? "#f59e0b" : lane.color, color: laneIdx === 4 ? "#f59e0b" : lane.color }}
                        />
                        <span className="text-[8.5px] font-bold text-zinc-300 truncate">
                          {laneTitle}
                        </span>
                      </div>

                      {/* Line track body where notes are rendered proportionally */}
                      <div className="flex-1 h-full relative overflow-visible">
                        {/* Background vertical second guide grid lines */}
                        {Array.from({ length: lineDurationSec + 1 }).map((__, sec) => (
                          <div
                            key={sec}
                            className="absolute top-0 bottom-0 w-px bg-zinc-800/40 pointer-events-none"
                            style={{ left: `${(sec / lineDurationSec) * 100}%` }}
                          />
                        ))}

                        {lineActions.map((act) => {
                          const vis = getActionVisual(act);
                          if (vis.lane !== laneIdx) return null;

                          // Compute horizontal position % on this line
                          const noteStartInLine = Math.max(0, act.startTimeMs - lineStartMs);
                          const noteEndInLine = Math.min(lineDurationMs, act.endTimeMs - lineStartMs);
                          const leftPct = (noteStartInLine / lineDurationMs) * 100;
                          const rawWidthPct = ((noteEndInLine - noteStartInLine) / lineDurationMs) * 100;
                          const widthPct = Math.max(1.2, rawWidthPct);

                          // Synchronize highlighting with exact playhead time during playback
                          const isActive =
                            isScriptPlaying && currentElapsedMs !== null
                              ? currentElapsedMs >= act.startTimeMs && currentElapsedMs < act.endTimeMs
                              : activeActionIndex === act.index;
                          const isWaitAct = act.type === "wait";

                          return (
                            <div
                              key={act.id}
                              onClick={() => setEditingIndex(act.index)}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setEditingIndex(act.index);
                              }}
                              style={{
                                left: `${leftPct}%`,
                                width: `${widthPct}%`,
                              }}
                              className={`absolute top-0.5 bottom-0.5 rounded-md border flex items-center justify-center ${
                                isWaitAct ? "min-w-[16px] px-0.5" : "min-w-[18px] px-0.5"
                              } text-[10px] font-black cursor-pointer transition-all hover:scale-105 hover:z-20 z-10 select-none shadow-sm ${
                                vis.style
                              } ${
                                isActive
                                  ? "ring-2 ring-white scale-105 shadow-[0_0_15px_rgba(255,255,255,0.9)] z-30"
                                  : ""
                              }`}
                              title={
                                act.type === "wait"
                                  ? `#${act.index + 1} 等待暫停 (${act.durationMs}ms) • 點擊編輯時間與動作設定`
                                  : `#${act.index + 1} ${vis.label} (持續 ${act.durationMs}ms) • 點擊編輯時間與動作設定`
                              }
                            >
                              {isWaitAct ? (
                                <div className="flex items-center gap-0.5 overflow-hidden justify-center leading-none">
                                  <span className="text-[9px] leading-none shrink-0 font-sans">⏸</span>
                                  {widthPct >= 3.5 && (
                                    <span className="font-mono text-[8px] font-bold tracking-tighter truncate opacity-90">
                                      {act.durationMs >= 1000 ? `${(act.durationMs / 1000).toFixed(1)}s` : `${act.durationMs}ms`}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="leading-none tracking-tight font-black select-none truncate px-0.5">
                                  {vis.label}
                                </span>
                              )}
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
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => setActionPicker({ visible: true, durationMs: 150 })}
          className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-emerald-500/60 hover:border-emerald-400 bg-emerald-950/20 hover:bg-emerald-900/30 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-all cursor-pointer shadow-sm"
        >
          <Gamepad2 className="w-4 h-4 text-emerald-400" />
          <span>+ 新增手把動作 (可選按鍵 / 搖桿方向)</span>
        </button>

        <button
          type="button"
          onClick={handleAppendWait}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border border-dashed border-amber-600/60 hover:border-amber-400 bg-amber-950/20 hover:bg-amber-900/30 text-xs font-bold text-amber-400 hover:text-amber-300 transition-all cursor-pointer shadow-sm"
        >
          <Clock className="w-4 h-4 text-amber-400" />
          <span>+ 新增空白等待 (Wait)</span>
        </button>
      </div>

      {/* Unified Action Editor Modal (左鍵點擊開啟完整編輯控制) */}
      {editingIndex !== null && currentEditingAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150"
          onClick={() => setEditingIndex(null)}
        >
          <div
            className="w-full max-w-2xl rounded-3xl bg-zinc-900 border border-zinc-700/80 p-5 shadow-2xl flex flex-col gap-3.5 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: 步驟編號、動作標籤與順序微調 */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-1.5 rounded-xl border ${
                    currentEditingAction.type === "wait"
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                      : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  }`}
                >
                  {currentEditingAction.type === "wait" ? (
                    <Clock className="w-4 h-4" />
                  ) : (
                    <Gamepad2 className="w-4 h-4" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-zinc-100">
                    步驟 #{editingIndex + 1} 動作編輯
                  </h4>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                    {getActionVisual(currentEditingAction).label}
                  </span>
                  <span className="text-xs text-zinc-400 font-medium">
                    {currentEditingAction.note || (currentEditingAction.type === "wait" ? "空白等待" : "")}
                  </span>
                </div>
              </div>

              {/* 右側順序微調按鈕組與關閉按鈕 */}
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-0.5 bg-zinc-800/80 p-0.5 rounded-xl border border-zinc-700/60">
                  <button
                    type="button"
                    disabled={editingIndex === 0}
                    onClick={() => handleMoveAction(editingIndex, -1)}
                    className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 disabled:opacity-25 disabled:hover:bg-transparent cursor-pointer transition-colors"
                    title="向前移動順序"
                  >
                    <ArrowUp className="w-3.5 h-3.5 text-cyan-400" />
                  </button>
                  <button
                    type="button"
                    disabled={editingIndex === script.actions.length - 1}
                    onClick={() => handleMoveAction(editingIndex, 1)}
                    className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 disabled:opacity-25 disabled:hover:bg-transparent cursor-pointer transition-colors"
                    title="向後移動順序"
                  >
                    <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingIndex(null)}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Hold / Wait Duration Setting */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-xs font-semibold text-zinc-300">
                  {currentEditingAction.type === "wait"
                    ? "空白等待時間："
                    : "按壓持續時間："}
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={10}
                    step={10}
                    value={currentEditingAction.durationMs}
                    onChange={(e) =>
                      handleUpdateActionField(editingIndex, {
                        durationMs: Math.max(10, Number(e.target.value) || 10),
                      })
                    }
                    className="w-16 px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs font-mono font-bold text-cyan-300 text-center focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-xs text-zinc-400 font-mono">ms</span>
                </div>
              </div>

              {/* Quick Preset Pills */}
              <div className="flex items-center gap-1">
                {[60, 100, 150, 300, 500].map((presetMs) => (
                  <button
                    key={presetMs}
                    type="button"
                    onClick={() =>
                      handleUpdateActionField(editingIndex, {
                        durationMs: presetMs,
                      })
                    }
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-semibold transition-colors cursor-pointer ${
                      currentEditingAction.durationMs === presetMs
                        ? "bg-cyan-500 text-zinc-950 font-bold shadow-sm"
                        : "bg-zinc-800/90 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {presetMs}ms
                  </button>
                ))}
              </div>
            </div>

            {/* Compact Gamepad Keypad Matrix (清爽對稱無捲軸) */}
            <div className="pt-0.5">
              <GamepadKeypadMatrix
                currentAction={currentEditingAction}
                onSelectAction={(item) =>
                  handleUpdateActionField(editingIndex, {
                    type: item.type,
                    button: item.button,
                    dpad: item.dpad,
                    stick: item.stick,
                    stickX: item.stickX,
                    stickY: item.stickY,
                    note: item.subLabel || item.label,
                  })
                }
                showWaitOption={currentEditingAction.type !== "wait"}
                onSetWait={() =>
                  handleUpdateActionField(editingIndex, {
                    type: "wait",
                    button: undefined,
                    dpad: undefined,
                    stick: undefined,
                    stickX: undefined,
                    stickY: undefined,
                    note: "等待暫停",
                  })
                }
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
              <button
                type="button"
                onClick={() => handleDeleteAction(editingIndex)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-800/50 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>刪除此步驟</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleInsertWaitAfter(editingIndex)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/20 hover:bg-amber-900/30 border border-amber-600/40 text-xs font-semibold text-amber-300 transition-colors cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>在此後插入等待</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const idx = editingIndex;
                    setEditingIndex(null);
                    setActionPicker({ visible: true, insertIndex: idx, durationMs: 150 });
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/20 hover:bg-emerald-900/30 border border-emerald-600/40 text-xs font-semibold text-emerald-300 transition-colors cursor-pointer"
                >
                  <Gamepad2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>在此後插入動作...</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditingIndex(null)}
                  className="px-5 py-1.5 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white shadow-md cursor-pointer transition-colors"
                >
                  完成
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Picker Modal (手把動作選擇器) */}
      {actionPicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150"
          onClick={() => setActionPicker(null)}
        >
          <div
            className="w-full max-w-2xl rounded-3xl bg-zinc-900 border border-zinc-700/80 p-5 shadow-2xl flex flex-col gap-3.5 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <Gamepad2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-100">
                    新增手把動作
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    {actionPicker.insertIndex !== undefined && actionPicker.insertIndex >= 0
                      ? `將於步驟 #${actionPicker.insertIndex + 1} 之後插入`
                      : "將新增至腳本末端"}
                    ，點選按鍵或搖桿動作以加入
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActionPicker(null)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Hold Duration Setting Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-semibold text-zinc-300">
                  按壓持續時間 (Hold Duration)：
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={20}
                    step={10}
                    value={actionPicker.durationMs}
                    onChange={(e) =>
                      setActionPicker({
                        ...actionPicker,
                        durationMs: Math.max(20, Number(e.target.value) || 20),
                      })
                    }
                    className="w-16 px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs font-mono font-bold text-emerald-300 text-center focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-xs text-zinc-400 font-mono">ms</span>
                </div>
              </div>

              {/* Quick Preset Pills */}
              <div className="flex items-center gap-1">
                {[60, 100, 150, 300, 500].map((presetMs) => (
                  <button
                    key={presetMs}
                    type="button"
                    onClick={() =>
                      setActionPicker({
                        ...actionPicker,
                        durationMs: presetMs,
                      })
                    }
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-semibold transition-colors cursor-pointer ${
                      actionPicker.durationMs === presetMs
                        ? "bg-emerald-500 text-zinc-950 font-bold shadow-sm"
                        : "bg-zinc-800/90 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {presetMs}ms
                  </button>
                ))}
              </div>
            </div>

            {/* Compact Gamepad Keypad Matrix */}
            <div className="pt-0.5">
              <GamepadKeypadMatrix
                onSelectAction={handleSelectPickerAction}
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
              <span className="text-[11px] text-zinc-500">
                💡 點選上方任意手把動作鍵帽，將以設定之持續時間即刻送出
              </span>
              <button
                type="button"
                onClick={() => setActionPicker(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 cursor-pointer"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
