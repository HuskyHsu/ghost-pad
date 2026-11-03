import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { MacroAction, MacroScript, MacroButtonName, MacroPlayerStatus } from "../../types/macro";
import { computeScheduledActions } from "../../utils/macroStorage";
import { LANES, getStickDirection } from "../InputTimelineStream";
import {
  Clock,
  Trash2,
  X,
  ArrowUp,
  ArrowDown,
  Gamepad2,
  Sparkles,
  GitMerge,
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
  descKey?: string;
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
        a: "bg-emerald-100 text-emerald-800 border-emerald-300",
        b: "bg-rose-100 text-rose-800 border-rose-300",
        x: "bg-sky-100 text-sky-800 border-sky-300",
        y: "bg-amber-100 text-amber-900 border-amber-300",
      };
      return { lane: 0, label: btn.toUpperCase(), style: colors[btn] || colors.a };
    }
    if (["l", "r", "zl", "zr"].includes(btn)) {
      return {
        lane: 3,
        label: btn.toUpperCase(),
        style: "bg-pink-100 text-pink-800 border-pink-300 font-mono",
      };
    }
    if (["l_stick_click", "r_stick_click"].includes(btn)) {
      return {
        lane: 2,
        label: btn === "l_stick_click" ? "L3" : "R3",
        style: "bg-cyan-100 text-cyan-900 border-cyan-300 font-mono",
      };
    }
    return {
      lane: 4,
      label: btn === "home" ? "⌂" : btn === "capture" ? "◉" : btn === "plus" ? "+" : "−",
      style: "bg-slate-100 text-slate-800 border-slate-300 font-mono",
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
      style: "bg-cyan-100 text-cyan-900 border-cyan-300 font-mono",
    };
  }

  if (act.type === "dpad") {
    const dpadMap = ["▲", "↗", "▶", "↘", "▼", "↙", "◀", "↖"];
    const dir = dpadMap[act.dpad ?? 0] || "▲";
    return {
      lane: 1,
      label: dir,
      style: "bg-purple-100 text-purple-900 border-purple-300 font-mono",
    };
  }

  if (act.type === "wait") {
    const formatted = act.durationMs >= 1000 ? `${(act.durationMs / 1000).toFixed(1)}s` : `${act.durationMs}ms`;
    return {
      lane: 4,
      label: `⏸ ${formatted}`,
      style: "bg-amber-100 text-amber-900 border-amber-300 font-mono",
    };
  }

  return {
    lane: 4,
    label: "Wait",
    style: "bg-surface-input text-text-secondary border-border-subtle font-mono",
  };
}

const ABXY_ITEMS: ActionPresetOption[] = [
  {
    label: "A",
    subLabel: "A 鍵 (右/確認)",
    descKey: "btn_a_desc",
    type: "button",
    button: "a",
    style: "bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200 hover:border-emerald-400 font-bold",
  },
  {
    label: "B",
    subLabel: "B 鍵 (下/取消)",
    descKey: "btn_b_desc",
    type: "button",
    button: "b",
    style: "bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200 hover:border-rose-400 font-bold",
  },
  {
    label: "X",
    subLabel: "X 鍵 (上/選單)",
    descKey: "btn_x_desc",
    type: "button",
    button: "x",
    style: "bg-sky-100 text-sky-800 border-sky-300 hover:bg-sky-200 hover:border-sky-400 font-bold",
  },
  {
    label: "Y",
    subLabel: "Y 鍵 (左/特殊)",
    descKey: "btn_y_desc",
    type: "button",
    button: "y",
    style: "bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200 hover:border-amber-400 font-bold",
  },
];

const DPAD_ITEMS: ActionPresetOption[] = [
  {
    label: "▲",
    subLabel: "十字方向上",
    descKey: "dpad_up_desc",
    type: "dpad",
    dpad: 0,
    style: "bg-purple-100 text-purple-900 border-purple-300 hover:bg-purple-200 hover:border-purple-400 font-bold",
  },
  {
    label: "▼",
    subLabel: "十字方向下",
    descKey: "dpad_down_desc",
    type: "dpad",
    dpad: 4,
    style: "bg-purple-100 text-purple-900 border-purple-300 hover:bg-purple-200 hover:border-purple-400 font-bold",
  },
  {
    label: "◀",
    subLabel: "十字方向左",
    descKey: "dpad_left_desc",
    type: "dpad",
    dpad: 6,
    style: "bg-purple-100 text-purple-900 border-purple-300 hover:bg-purple-200 hover:border-purple-400 font-bold",
  },
  {
    label: "▶",
    subLabel: "十字方向右",
    descKey: "dpad_right_desc",
    type: "dpad",
    dpad: 2,
    style: "bg-purple-100 text-purple-900 border-purple-300 hover:bg-purple-200 hover:border-purple-400 font-bold",
  },
];

const SHOULDER_ITEMS: ActionPresetOption[] = [
  {
    label: "L",
    subLabel: "左前肩鍵",
    descKey: "l_shoulder_desc",
    type: "button",
    button: "l",
    style: "bg-pink-100 text-pink-800 border-pink-300 hover:bg-pink-200 hover:border-pink-400 font-bold",
  },
  {
    label: "ZL",
    subLabel: "左後扳機鍵",
    descKey: "zl_trigger_desc",
    type: "button",
    button: "zl",
    style: "bg-pink-100 text-pink-800 border-pink-300 hover:bg-pink-200 hover:border-pink-400 font-bold",
  },
  {
    label: "ZR",
    subLabel: "右後扳機鍵",
    descKey: "zr_trigger_desc",
    type: "button",
    button: "zr",
    style: "bg-pink-100 text-pink-800 border-pink-300 hover:bg-pink-200 hover:border-pink-400 font-bold",
  },
  {
    label: "R",
    subLabel: "右前肩鍵",
    descKey: "r_shoulder_desc",
    type: "button",
    button: "r",
    style: "bg-pink-100 text-pink-800 border-pink-300 hover:bg-pink-200 hover:border-pink-400 font-bold",
  },
];

const L_STICK_ITEMS: ActionPresetOption[] = [
  {
    label: "L▲",
    subLabel: "左搖桿向上",
    descKey: "l_stick_up_desc",
    type: "stick",
    stick: "left",
    stickX: 128,
    stickY: 255,
    style: "bg-cyan-100 text-cyan-900 border-cyan-300 hover:bg-cyan-200 hover:border-cyan-400 font-semibold",
  },
  {
    label: "L▼",
    subLabel: "左搖桿向下",
    descKey: "l_stick_down_desc",
    type: "stick",
    stick: "left",
    stickX: 128,
    stickY: 0,
    style: "bg-cyan-100 text-cyan-900 border-cyan-300 hover:bg-cyan-200 hover:border-cyan-400 font-semibold",
  },
  {
    label: "L◀",
    subLabel: "左搖桿向左",
    descKey: "l_stick_left_desc",
    type: "stick",
    stick: "left",
    stickX: 0,
    stickY: 128,
    style: "bg-cyan-100 text-cyan-900 border-cyan-300 hover:bg-cyan-200 hover:border-cyan-400 font-semibold",
  },
  {
    label: "L▶",
    subLabel: "左搖桿向右",
    descKey: "l_stick_right_desc",
    type: "stick",
    stick: "left",
    stickX: 255,
    stickY: 128,
    style: "bg-cyan-100 text-cyan-900 border-cyan-300 hover:bg-cyan-200 hover:border-cyan-400 font-semibold",
  },
  {
    label: "L3",
    subLabel: "左搖桿按壓 (L3)",
    descKey: "l_stick_click_desc",
    type: "button",
    button: "l_stick_click",
    style: "bg-cyan-100 text-cyan-900 border-cyan-300 hover:bg-cyan-200 hover:border-cyan-400 font-bold",
  },
];

const R_STICK_ITEMS: ActionPresetOption[] = [
  {
    label: "R▲",
    subLabel: "右搖桿向上",
    descKey: "r_stick_up_desc",
    type: "stick",
    stick: "right",
    stickX: 128,
    stickY: 255,
    style: "bg-teal-100 text-teal-900 border-teal-300 hover:bg-teal-200 hover:border-teal-400 font-semibold",
  },
  {
    label: "R▼",
    subLabel: "右搖桿向下",
    descKey: "r_stick_down_desc",
    type: "stick",
    stick: "right",
    stickX: 128,
    stickY: 0,
    style: "bg-teal-100 text-teal-900 border-teal-300 hover:bg-teal-200 hover:border-teal-400 font-semibold",
  },
  {
    label: "R◀",
    subLabel: "右搖桿向左",
    descKey: "r_stick_left_desc",
    type: "stick",
    stick: "right",
    stickX: 0,
    stickY: 128,
    style: "bg-teal-100 text-teal-900 border-teal-300 hover:bg-teal-200 hover:border-teal-400 font-semibold",
  },
  {
    label: "R▶",
    subLabel: "右搖桿向右",
    descKey: "r_stick_right_desc",
    type: "stick",
    stick: "right",
    stickX: 255,
    stickY: 128,
    style: "bg-teal-100 text-teal-900 border-teal-300 hover:bg-teal-200 hover:border-teal-400 font-semibold",
  },
  {
    label: "R3",
    subLabel: "右搖桿按壓 (R3)",
    descKey: "r_stick_click_desc",
    type: "button",
    button: "r_stick_click",
    style: "bg-teal-100 text-teal-900 border-teal-300 hover:bg-teal-200 hover:border-teal-400 font-bold",
  },
];

const SYSTEM_ITEMS: ActionPresetOption[] = [
  {
    label: "+",
    subLabel: "Plus 開始鍵",
    descKey: "plus_desc",
    type: "button",
    button: "plus",
    style: "bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200 hover:border-slate-400 font-mono text-sm font-semibold",
  },
  {
    label: "−",
    subLabel: "Minus 選擇鍵",
    descKey: "minus_desc",
    type: "button",
    button: "minus",
    style: "bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200 hover:border-slate-400 font-mono text-sm font-semibold",
  },
  {
    label: "⌂",
    subLabel: "Home 主頁鍵",
    descKey: "home_desc",
    type: "button",
    button: "home",
    style: "bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200 hover:border-slate-400 font-semibold",
  },
  {
    label: "◉",
    subLabel: "Capture 截圖鍵",
    descKey: "capture_desc",
    type: "button",
    button: "capture",
    style: "bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200 hover:border-slate-400 font-semibold",
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
        title={item.descKey ? t(`notes.${item.descKey}`, item.subLabel) : item.subLabel}
        onClick={() => onSelectAction(item)}
        className={`w-full h-8 rounded-md border flex items-center justify-center font-bold text-xs transition-all cursor-pointer select-none ${
          item.style
        } ${
          selected
            ? "ring-2 ring-slate-900 shadow-sm z-10 scale-[1.02]"
            : "hover:scale-[1.01]"
        }`}
      >
        <span>{item.label}</span>
      </button>
    );
  };

  const { t } = useTranslation("macro");

  return (
    <div className="space-y-3 select-none">
      {/* Row 1: D-Pad (Left) & ABXY (Right) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* D-Pad */}
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-text-muted px-1 uppercase tracking-wider">
            {t("score_sheet.matrix.dpad", "十字方向鍵 (D-Pad)")}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {DPAD_ITEMS.map(renderKeyButton)}
          </div>
        </div>

        {/* ABXY */}
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-text-muted px-1 uppercase tracking-wider">
            {t("score_sheet.matrix.actions", "動作鍵 (ABXY)")}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {ABXY_ITEMS.map(renderKeyButton)}
          </div>
        </div>
      </div>

      {/* Row 2: Shoulders & Triggers (L, ZL, ZR, R) */}
      <div className="space-y-1">
        <div className="text-[10px] font-bold text-text-muted px-1 uppercase tracking-wider">
          {t("score_sheet.matrix.shoulders", "肩鍵與扳機 (Shoulders & Triggers)")}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {SHOULDER_ITEMS.map(renderKeyButton)}
        </div>
      </div>

      {/* Row 3: Left Stick (Left) & Right Stick (Right) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Left Stick */}
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-text-muted px-1 uppercase tracking-wider">
            {t("score_sheet.matrix.left_stick", "左類比搖桿 (L-Stick)")}
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {L_STICK_ITEMS.map(renderKeyButton)}
          </div>
        </div>

        {/* Right Stick */}
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-text-muted px-1 uppercase tracking-wider">
            {t("score_sheet.matrix.right_stick", "右類比搖桿 (R-Stick)")}
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {R_STICK_ITEMS.map(renderKeyButton)}
          </div>
        </div>
      </div>

      {/* Row 4: System Keys & Wait Switch */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border-subtle items-end">
        {/* System Keys (Left 50%, perfectly aligned with D-Pad above) */}
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-text-muted px-1 uppercase tracking-wider">
            {t("score_sheet.matrix.system", "系統功能鍵")}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {SYSTEM_ITEMS.map(renderKeyButton)}
          </div>
        </div>

        {/* Wait Option (Right 50%, aligned with ABXY above) */}
        {showWaitOption && onSetWait ? (
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-text-muted px-1 uppercase tracking-wider">
              {t("score_sheet.matrix.wait", "空白等待 (Wait)")}
            </div>
            <button
              type="button"
              onClick={onSetWait}
              className="w-full h-9 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-xs font-bold text-amber-900 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>{t("score_sheet.matrix.convert_to_wait", "轉為空白等待 (Wait)")}</span>
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
  const { t } = useTranslation("macro");
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

  // Consecutive wait junctions between adjacent wait steps
  const waitJunctions = useMemo(() => {
    const junctions: Array<{
      firstIndex: number;
      timeMs: number;
      duration1: number;
      duration2: number;
    }> = [];
    for (let i = 0; i < script.actions.length - 1; i++) {
      if (script.actions[i]?.type === "wait" && script.actions[i + 1]?.type === "wait") {
        junctions.push({
          firstIndex: i,
          timeMs: scheduled[i]?.endTimeMs ?? 0,
          duration1: script.actions[i].durationMs,
          duration2: script.actions[i + 1].durationMs,
        });
      }
    }
    return junctions;
  }, [script.actions, scheduled]);

  const handleMergeJunction = (firstIndex: number) => {
    const next = [...script.actions];
    if (
      firstIndex < 0 ||
      firstIndex >= next.length - 1 ||
      next[firstIndex]?.type !== "wait" ||
      next[firstIndex + 1]?.type !== "wait"
    ) {
      return;
    }
    const mergedDuration = next[firstIndex].durationMs + next[firstIndex + 1].durationMs;
    next[firstIndex] = {
      ...next[firstIndex],
      durationMs: mergedDuration,
    };
    next.splice(firstIndex + 1, 1);
    if (editingIndex === firstIndex + 1) {
      setEditingIndex(firstIndex);
    } else if (editingIndex !== null && editingIndex > firstIndex + 1) {
      setEditingIndex(editingIndex - 1);
    }
    onChangeActions(next);
  };

  const isCurrentWait = editingIndex !== null && currentEditingAction?.type === "wait";
  const hasAdjacentWait =
    isCurrentWait &&
    editingIndex !== null &&
    ((editingIndex > 0 && script.actions[editingIndex - 1]?.type === "wait") ||
      (editingIndex < script.actions.length - 1 && script.actions[editingIndex + 1]?.type === "wait"));

  const handleMergeThisWait = () => {
    if (editingIndex === null || !currentEditingAction || currentEditingAction.type !== "wait") return;
    const actions = [...script.actions];
    const idx = editingIndex;
    // If next is wait, merge next into current
    if (idx < actions.length - 1 && actions[idx + 1].type === "wait") {
      actions[idx] = {
        ...actions[idx],
        durationMs: actions[idx].durationMs + actions[idx + 1].durationMs,
      };
      actions.splice(idx + 1, 1);
      onChangeActions(actions);
      return;
    }
    // If prev is wait, merge current into prev
    if (idx > 0 && actions[idx - 1].type === "wait") {
      const prevIdx = idx - 1;
      actions[prevIdx] = {
        ...actions[prevIdx],
        durationMs: actions[prevIdx].durationMs + actions[idx].durationMs,
      };
      actions.splice(idx, 1);
      setEditingIndex(prevIdx);
      onChangeActions(actions);
      return;
    }
  };

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
      note: t("notes.wait", "等待暫停"),
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
      note: opt.descKey ? t(`notes.${opt.descKey}`, opt.subLabel) : (opt.subLabel || opt.label),
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
      note: t("notes.wait", "等待暫停"),
    };
    onChangeActions([...script.actions, newAct]);
  };

  return (
    <div className="flex-1 flex flex-col gap-4 select-none">
      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-surface-card border border-border-subtle shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-text-primary">
            {t("score_sheet.title", {
              actions: script.actions.length,
              lines: numLines,
              defaultValue: `多行動作時序軌道 (${script.actions.length} 步驟 • 共 ${numLines} 行)`,
            })}
          </span>
          <span className="text-[10px] text-text-muted">
            {t("score_sheet.tip", "• 右鍵點擊任一動作區塊可進行時長修改、換鍵與刪除")}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Seconds per line selector */}
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className="text-[10px]">{t("score_sheet.line_duration_label", "每行時長:")}</span>
            <select
              value={lineDurationSec}
              onChange={(e) => setLineDurationSec(Number(e.target.value))}
              className="px-2 py-1 rounded bg-surface-input border border-border-element text-xs text-text-primary focus:outline-none cursor-pointer font-medium shadow-xs"
            >
              <option value={4}>{t("score_sheet.opt_4s", "4 秒 / 行 (特大放大 • 微操清晰)")}</option>
              <option value={6}>{t("score_sheet.opt_6s", "6 秒 / 行 (清晰平衡)")}</option>
              <option value={8}>{t("score_sheet.opt_8s", "8 秒 / 行 (標準)")}</option>
              <option value={10}>{t("score_sheet.opt_10s", "10 秒 / 行")}</option>
              <option value={12}>{t("score_sheet.opt_12s", "12 秒 / 行")}</option>
            </select>
          </div>
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

          // Consecutive wait junctions falling on this line
          const lineJunctions = waitJunctions.filter(
            (j) =>
              j.timeMs >= lineStartMs &&
              (lineIndex === numLines - 1 ? j.timeMs <= lineEndMs : j.timeMs < lineEndMs)
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
              className="w-full rounded-xl bg-surface-card border border-border-subtle overflow-hidden shadow-xs"
            >
              {/* Line Header */}
              <div className="flex items-center justify-between px-3 py-1 bg-surface-card/90 border-b border-border-subtle text-[10px] font-mono text-text-muted">
                <span className="font-medium text-text-primary">
                  {t("score_sheet.line_header", {
                    line: lineIndex + 1,
                    start: (lineStartMs / 1000).toFixed(1),
                    end: (lineEndMs / 1000).toFixed(1),
                    defaultValue: `第 ${lineIndex + 1} 行 (${(lineStartMs / 1000).toFixed(1)}s ~ ${(lineEndMs / 1000).toFixed(1)}s)`,
                  })}
                </span>
                <span className="text-[9px] text-text-muted font-mono">
                  {t("score_sheet.grid_scale", {
                    sec: lineDurationSec,
                    defaultValue: `每格 1 秒 • 共 ${lineDurationSec} 秒`,
                  })}
                </span>
              </div>

              {/* Time Ruler (Proportionally aligned with lanes below) */}
              <div className="flex items-center px-2 py-0.5 bg-surface-input/40 border-b border-border-subtle text-[8px] font-mono text-text-muted">
                {/* Left track spacer (matches w-14 shrink-0 lane header) */}
                <div className="w-14 shrink-0 flex items-center gap-1.5 pl-2 select-none pointer-events-none">
                  <Clock className="w-2.5 h-2.5 text-text-muted" />
                  <span className="text-[8px] font-medium text-text-muted font-mono">
                    {t("score_sheet.timeline", "時間軸")}
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
                        <span className="text-[8px] leading-none text-text-muted font-mono select-none">
                          +{sec}s
                        </span>
                        <div className="w-px h-1 bg-border-element mt-0.5" />
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
                      <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-text-primary" />
                    </div>
                  )}
                </div>
              </div>

              {/* 5-Track Score Lanes */}
              <div className="relative p-1.5 space-y-0.5">
                {/* Playhead Line across all 5 lanes */}
                {isPlayheadOnThisLine && (
                  <div className="absolute inset-y-0 left-1.5 right-1.5 flex pointer-events-none z-30">
                    <div className="w-14 shrink-0" />
                    <div className="flex-1 relative h-full">
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-text-primary"
                        style={{
                          left: `${playheadPct}%`,
                          transform: "translateX(-50%)",
                        }}
                      />
                    </div>
                  </div>
                )}

                {LANES.map((lane, laneIdx) => {
                  const trackKeys = ["actions", "dpad", "sticks", "shoulders", "system_wait"];
                  const laneTitle = t(`score_sheet.tracks.${trackKeys[laneIdx]}`, lane.name);
                  return (
                    <div
                      key={lane.name}
                      className="h-6 rounded-md bg-surface-input/30 border border-border-subtle/60 relative flex items-center"
                    >
                      {/* Left Track Name with Color Indicator Dot */}
                      <div className="w-14 shrink-0 flex items-center gap-1.5 pl-2 select-none pointer-events-none">
                        <div
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: laneIdx === 4 ? "#71717a" : lane.color }}
                        />
                        <span className="text-[8.5px] font-medium text-text-secondary truncate">
                          {laneTitle}
                        </span>
                      </div>

                      {/* Line track body where notes are rendered proportionally */}
                      <div className="flex-1 h-full relative overflow-visible">
                        {/* Background vertical second guide grid lines */}
                        {Array.from({ length: lineDurationSec + 1 }).map((__, sec) => (
                          <div
                            key={sec}
                            className="absolute top-0 bottom-0 w-px bg-border-element/25 pointer-events-none"
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
                          const isConsecutiveWithNeighbor =
                            isWaitAct &&
                            ((act.index > 0 && script.actions[act.index - 1]?.type === "wait") ||
                              (act.index < script.actions.length - 1 &&
                                script.actions[act.index + 1]?.type === "wait"));

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
                              } text-[10px] font-bold cursor-pointer transition-all hover:scale-105 hover:z-20 z-10 select-none ${
                                vis.style
                              } ${
                                isActive
                                  ? "ring-2 ring-slate-900 shadow-md scale-105 z-30"
                                  : isConsecutiveWithNeighbor
                                  ? "ring-1 ring-amber-500"
                                  : ""
                              }`}
                              title={
                                act.type === "wait"
                                  ? isConsecutiveWithNeighbor
                                    ? t("score_sheet.wait_consecutive_tooltip", {
                                        index: act.index + 1,
                                        duration: act.durationMs,
                                        defaultValue: `#${act.index + 1} 等待暫停 (${act.durationMs}ms) • 建議與相鄰等待合併 • 點擊編輯時間`,
                                      })
                                    : t("score_sheet.wait_note_tooltip", {
                                        index: act.index + 1,
                                        duration: act.durationMs,
                                        defaultValue: `#${act.index + 1} 等待暫停 (${act.durationMs}ms) • 點擊編輯時間與動作設定`,
                                      })
                                  : t("score_sheet.action_note_tooltip", {
                                      index: act.index + 1,
                                      label: vis.label,
                                      duration: act.durationMs,
                                      defaultValue: `#${act.index + 1} ${vis.label} (持續 ${act.durationMs}ms) • 點擊編輯時間與動作設定`,
                                    })
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

                        {/* Seam Merge Buttons for Consecutive Waits (Lane 4: 系統/等待) */}
                        {laneIdx === 4 &&
                          lineJunctions.map((j) => {
                            const leftPct = ((j.timeMs - lineStartMs) / lineDurationMs) * 100;
                            return (
                              <button
                                key={`junction-${j.firstIndex}`}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMergeJunction(j.firstIndex);
                                }}
                                style={{ left: `${leftPct}%` }}
                                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-30 flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 hover:bg-amber-400 active:scale-90 text-slate-900 shadow-md border border-amber-200 hover:scale-125 transition-all cursor-pointer group ring-2 ring-white"
                                title={t("score_sheet.merge_junction_tooltip", {
                                  d1: j.duration1,
                                  d2: j.duration2,
                                  defaultValue: `點擊合併相鄰等待 (${j.duration1}ms + ${j.duration2}ms)`,
                                })}
                              >
                                <GitMerge className="w-2.5 h-2.5 shrink-0 transition-transform group-hover:scale-110" />
                              </button>
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
          <div className="p-8 text-center text-xs text-text-muted border border-dashed border-border-element/60 rounded-xl bg-surface-card/60 shadow-xs">
            {t("score_sheet.empty_script", "目前本腳本尚無任何動作步驟。可點擊下方按鈕新增動作或透過即時儀表板進行側錄！")}
          </div>
        )}
      </div>

      {/* Bottom Append Buttons */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => setActionPicker({ visible: true, durationMs: 150 })}
          className="flex-[2] flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-border-element hover:border-border-focus bg-surface-card hover:bg-interactive-hover text-xs font-medium text-text-primary transition-all cursor-pointer shadow-xs"
        >
          <Gamepad2 className="w-3.5 h-3.5 text-text-muted" />
          <span>+ {t("score_sheet.btn_add_action", "新增手把動作 (可選按鍵 / 搖桿方向)")}</span>
        </button>

        <button
          type="button"
          onClick={handleAppendWait}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-dashed border-border-element hover:border-border-focus bg-surface-card hover:bg-interactive-hover text-xs font-medium text-text-secondary transition-all cursor-pointer shadow-xs"
        >
          <Clock className="w-3.5 h-3.5 text-text-muted" />
          <span>+ {t("score_sheet.btn_add_wait", "新增空白等待 (Wait)")}</span>
        </button>
      </div>

      {/* Unified Action Editor Modal */}
      {editingIndex !== null && currentEditingAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setEditingIndex(null)}
        >
          <div
            className="w-full max-w-2xl rounded-xl bg-surface-modal border border-border-element p-5 shadow-2xl flex flex-col gap-3.5 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-1.5 rounded-md border ${
                    currentEditingAction.type === "wait"
                      ? "bg-amber-50 border-amber-200 text-amber-700"
                      : "bg-emerald-50 border-emerald-200 text-emerald-700"
                  }`}
                >
                  {currentEditingAction.type === "wait" ? (
                    <Clock className="w-4 h-4" />
                  ) : (
                    <Gamepad2 className="w-4 h-4" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold text-text-primary">
                    {t("score_sheet.step_edit_title", { index: editingIndex + 1, defaultValue: `步驟 #${editingIndex + 1} 動作編輯` })}
                  </h4>
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-surface-input text-text-primary border border-border-subtle">
                    {getActionVisual(currentEditingAction).label}
                  </span>
                  <span className="text-xs text-text-muted font-medium">
                    {currentEditingAction.note || (currentEditingAction.type === "wait" ? t("notes.wait", "空白等待") : "")}
                  </span>
                </div>
              </div>

              {/* Order adjust and close */}
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-0.5 bg-surface-input p-0.5 rounded-md border border-border-subtle">
                  <button
                    type="button"
                    disabled={editingIndex === 0}
                    onClick={() => handleMoveAction(editingIndex, -1)}
                    className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-card disabled:opacity-25 disabled:hover:bg-transparent cursor-pointer transition-colors"
                    title={t("score_sheet.move_forward", "向前移動順序")}
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={editingIndex === script.actions.length - 1}
                    onClick={() => handleMoveAction(editingIndex, 1)}
                    className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-card disabled:opacity-25 disabled:hover:bg-transparent cursor-pointer transition-colors"
                    title={t("score_sheet.move_backward", "向後移動順序")}
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingIndex(null)}
                  className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-input transition-colors cursor-pointer"
                  title={t("actions.close", "關閉")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Adjacent Wait Merge Recommendation Banner */}
            {hasAdjacentWait && (
              <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 shadow-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>
                    {t(
                      "score_sheet.adjacent_wait_tip",
                      "此步驟與相鄰步驟皆為空白等待，建議點選合併以精簡時序。"
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleMergeThisWait}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-100 hover:bg-amber-200 active:scale-95 border border-amber-300 text-[11px] font-semibold text-amber-900 transition-all cursor-pointer shrink-0 shadow-xs"
                >
                  <GitMerge className="w-3 h-3" />
                  <span>{t("score_sheet.btn_merge_this", "合併相鄰等待")}</span>
                </button>
              </div>
            )}

            {/* Hold / Wait Duration Setting */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 rounded-lg bg-surface-input border border-border-subtle">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-text-muted" />
                <span className="text-xs font-medium text-text-secondary">
                  {currentEditingAction.type === "wait"
                    ? t("score_sheet.wait_duration_label", "空白等待時間：")
                    : t("score_sheet.hold_duration_label", "按壓持續時間：")}
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
                    className="w-16 px-2 py-0.5 rounded-md bg-surface-card border border-border-element text-xs font-mono font-bold text-text-primary text-center focus:outline-none focus:border-border-focus shadow-xs"
                  />
                  <span className="text-xs text-text-muted font-mono">ms</span>
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
                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-medium transition-colors cursor-pointer ${
                      currentEditingAction.durationMs === presetMs
                        ? "bg-accent text-accent-foreground font-bold shadow-xs"
                        : "bg-surface-card hover:bg-interactive-hover text-text-secondary border border-border-subtle shadow-xs"
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
                currentAction={currentEditingAction}
                onSelectAction={(item) =>
                  handleUpdateActionField(editingIndex, {
                    type: item.type,
                    button: item.button,
                    dpad: item.dpad,
                    stick: item.stick,
                    stickX: item.stickX,
                    stickY: item.stickY,
                    note: item.descKey ? t(`notes.${item.descKey}`, item.subLabel) : (item.subLabel || item.label),
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
                    note: t("notes.wait", "等待暫停"),
                  })
                }
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border-subtle pt-3">
              <button
                type="button"
                onClick={() => handleDeleteAction(editingIndex)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t("score_sheet.delete_step", "刪除此步驟")}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleInsertWaitAfter(editingIndex)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-card hover:bg-interactive-hover border border-border-subtle text-xs font-medium text-text-primary transition-colors cursor-pointer shadow-xs"
                >
                  <Clock className="w-3.5 h-3.5 text-text-muted" />
                  <span>{t("score_sheet.insert_wait_after", "在此後插入等待")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const idx = editingIndex;
                    setEditingIndex(null);
                    setActionPicker({ visible: true, insertIndex: idx, durationMs: 150 });
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-card hover:bg-interactive-hover border border-border-subtle text-xs font-medium text-text-primary transition-colors cursor-pointer shadow-xs"
                >
                  <Gamepad2 className="w-3.5 h-3.5 text-text-muted" />
                  <span>{t("score_sheet.insert_action", "插入動作...")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditingIndex(null)}
                  className="px-4 py-1.5 rounded-md text-xs font-medium bg-accent hover:bg-accent/90 text-accent-foreground shadow-xs cursor-pointer transition-colors"
                >
                  {t("actions.done", "完成")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Picker Modal */}
      {actionPicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setActionPicker(null)}
        >
          <div
            className="w-full max-w-2xl rounded-xl bg-surface-modal border border-border-element p-5 shadow-2xl flex flex-col gap-3.5 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-surface-input border border-border-subtle text-text-primary">
                  <Gamepad2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-text-primary">
                    {t("score_sheet.picker.title", "新增手把動作")}
                  </h4>
                  <p className="text-[11px] text-text-muted">
                    {actionPicker.insertIndex !== undefined && actionPicker.insertIndex >= 0
                      ? t("score_sheet.picker.insert_after", { step: actionPicker.insertIndex + 1, defaultValue: `將於步驟 #${actionPicker.insertIndex + 1} 之後插入` })
                      : t("score_sheet.picker.append_end", "將新增至腳本末端")}
                    {t("score_sheet.picker.select_hint", "，點選按鍵或搖桿動作以加入")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActionPicker(null)}
                className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-input transition-colors cursor-pointer"
                title={t("actions.close", "關閉")}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Hold Duration Setting Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 rounded-lg bg-surface-input border border-border-subtle">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-text-muted" />
                <span className="text-xs font-medium text-text-secondary">
                  {t("score_sheet.picker.duration_label", "按壓持續時間 (Hold Duration)：")}
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
                    className="w-16 px-2 py-0.5 rounded-md bg-surface-card border border-border-element text-xs font-mono font-bold text-text-primary text-center focus:outline-none focus:border-border-focus shadow-xs"
                  />
                  <span className="text-xs text-text-muted font-mono">ms</span>
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
                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-medium transition-colors cursor-pointer ${
                      actionPicker.durationMs === presetMs
                        ? "bg-accent text-accent-foreground font-bold shadow-xs"
                        : "bg-surface-card hover:bg-interactive-hover text-text-secondary border border-border-subtle shadow-xs"
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
            <div className="flex items-center justify-between border-t border-border-subtle pt-3">
              <span className="text-[11px] text-text-muted">
                {t("score_sheet.picker.footer_hint", "點選上方任意按鈕動作，將以設定之持續時間即刻加入")}
              </span>
              <button
                type="button"
                onClick={() => setActionPicker(null)}
                className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-surface-card hover:bg-interactive-hover text-text-primary border border-border-subtle cursor-pointer transition-colors shadow-xs"
              >
                {t("actions.close", "關閉")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
