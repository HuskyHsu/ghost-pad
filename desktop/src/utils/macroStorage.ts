import { MacroScript, MacroAction } from "../types/macro";
import i18n from "../i18n";

const STORAGE_KEY = "ghostpad_macros_v1";

export interface ScheduledAction extends MacroAction {
  startTimeMs: number;
  endTimeMs: number;
  index: number;
}

export function computeScheduledActions(actions: MacroAction[]): ScheduledAction[] {
  let currentTime = 0;
  return actions.map((act, index) => {
    const start = currentTime;
    const end = start + (act.durationMs || 100);
    currentTime = end + (act.delayAfterMs || 0);
    return {
      ...act,
      startTimeMs: start,
      endTimeMs: end,
      index,
    };
  });
}

export function getScriptTotalDurationMs(script: MacroScript): number {
  return script.actions.reduce(
    (acc, act) => acc + (act.durationMs || 0) + (act.delayAfterMs || 0),
    0
  );
}

export function loadMacros(): MacroScript[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      let needsResave = false;
      const result = parsed.map((m) => {
        const hasLegacyDelays = Array.isArray(m.actions) && m.actions.some(
          (a: any) => typeof a.delayAfterMs === "number" && a.delayAfterMs > 0
        );
        if (hasLegacyDelays) {
          needsResave = true;
          return {
            ...m,
            actions: splitDelaysToWaitActions(m.actions),
          };
        }
        return m;
      });

      if (needsResave) {
        saveMacros(result);
      }
      return result;
    }
    return [];
  } catch (err) {
    console.error("Failed to load macros from localStorage:", err);
    return [];
  }
}

export function saveMacros(macros: MacroScript[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(macros));
  } catch (err) {
    console.error("Failed to save macros to localStorage:", err);
  }
}

export function exportMacroAsJson(macro: MacroScript): void {
  const json = JSON.stringify(macro, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeName = macro.name.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, "_");
  a.download = `ghostpad_macro_${safeName}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportAllMacrosAsJson(macros: MacroScript[]): void {
  const json = JSON.stringify({ version: "1.0", exportedAt: Date.now(), macros }, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ghostpad_macros_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importMacroFromJson(jsonString: string): MacroScript | null {
  try {
    const data = JSON.parse(jsonString);
    // Check if it's a backup format
    if (data && Array.isArray(data.macros)) {
      if (data.macros.length > 0) {
        return sanitizeMacro(data.macros[0]);
      }
      return null;
    }
    // Check if it's a single script
    if (data && Array.isArray(data.actions)) {
      return sanitizeMacro(data);
    }
    return null;
  } catch (err) {
    console.error("Invalid JSON for macro import:", err);
    return null;
  }
}

export function importAllMacrosFromJson(jsonString: string): MacroScript[] | null {
  try {
    const data = JSON.parse(jsonString);
    if (data && Array.isArray(data.macros)) {
      return data.macros.map((m: any) => sanitizeMacro(m));
    }
    if (Array.isArray(data)) {
      return data.map((m: any) => sanitizeMacro(m));
    }
    if (data && Array.isArray(data.actions)) {
      return [sanitizeMacro(data)];
    }
    return null;
  } catch (err) {
    console.error("Invalid JSON for backup import:", err);
    return null;
  }
}

// Clean and consolidate consecutive or micro waits (< 80ms)
export function cleanMicroWaitActions(actions: MacroAction[], minThresholdMs = 80): MacroAction[] {
  if (actions.length === 0) return [];
  const result: MacroAction[] = [];

  for (let i = 0; i < actions.length; i++) {
    const curr = actions[i];

    if (curr.type === "wait") {
      // 1. If micro wait (< 80ms), merge into preceding action's delayAfterMs if possible
      if (curr.durationMs < minThresholdMs) {
        if (result.length > 0) {
          const prev = result[result.length - 1];
          result[result.length - 1] = {
            ...prev,
            delayAfterMs: (prev.delayAfterMs || 0) + curr.durationMs,
          };
        }
        continue;
      }

      // 2. If consecutive wait actions, merge durations
      if (result.length > 0 && result[result.length - 1].type === "wait") {
        const prev = result[result.length - 1];
        result[result.length - 1] = {
          ...prev,
          durationMs: prev.durationMs + curr.durationMs,
        };
        continue;
      }
    }

    result.push({ ...curr });
  }

  return result;
}

// Count how many adjacent consecutive wait actions exist
export function countConsecutiveWaitMerges(actions: MacroAction[]): number {
  let count = 0;
  for (let i = 0; i < actions.length - 1; i++) {
    if (actions[i].type === "wait" && actions[i + 1].type === "wait") {
      count++;
    }
  }
  return count;
}

// Safely merge consecutive wait actions into a single wait with summed duration
export function mergeConsecutiveWaitActions(actions: MacroAction[]): MacroAction[] {
  if (actions.length === 0) return [];
  const result: MacroAction[] = [];

  for (let i = 0; i < actions.length; i++) {
    const curr = actions[i];
    if (curr.type === "wait" && result.length > 0 && result[result.length - 1].type === "wait") {
      const prev = result[result.length - 1];
      result[result.length - 1] = {
        ...prev,
        durationMs: (prev.durationMs || 0) + (curr.durationMs || 0),
        note: prev.note || curr.note || i18n.t("macro:notes.wait", { defaultValue: "等待暫停" }),
      };
    } else {
      result.push({ ...curr });
    }
  }

  return result;
}

// Convert embedded delayAfterMs into independent 'wait' actions if >= minThresholdMs (default 80ms)
export function splitDelaysToWaitActions(actions: MacroAction[], minThresholdMs = 80): MacroAction[] {
  const result: MacroAction[] = [];
  for (let i = 0; i < actions.length; i++) {
    const act = actions[i];
    const delay = act.delayAfterMs || 0;

    if (act.type === "wait") {
      result.push({ ...act, delayAfterMs: 0 });
      continue;
    }

    // Only split into independent wait action if delay is a substantial pause (>= 80ms)
    if (delay >= minThresholdMs) {
      result.push({
        ...act,
        delayAfterMs: 0,
      });
      result.push({
        id: `wait-${Date.now()}-${Math.random().toString(36).substring(2, 6)}-${i}`,
        type: "wait",
        durationMs: delay,
        delayAfterMs: 0,
        note: i18n.t("macro:notes.wait", { defaultValue: "等待暫停" }),
      });
    } else {
      // Keep small debounce/release gaps as action's intrinsic delay to avoid cluttering timeline
      result.push({
        ...act,
        delayAfterMs: delay,
      });
    }
  }
  return cleanMicroWaitActions(result, minThresholdMs);
}

function sanitizeMacro(data: any): MacroScript {
  const rawActions = Array.isArray(data.actions)
    ? data.actions.map((act: any, idx: number) => ({
        id: act.id || `act-imp-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        type: act.type || "button",
        button: act.button,
        stick: act.stick,
        stickX: typeof act.stickX === "number" ? act.stickX : 128,
        stickY: typeof act.stickY === "number" ? act.stickY : 128,
        dpad: typeof act.dpad === "number" ? act.dpad : 8,
        durationMs: Math.max(20, Number(act.durationMs) || 100),
        delayAfterMs: Math.max(0, Number(act.delayAfterMs) || 0),
        note: act.note ? String(act.note) : undefined,
      }))
    : [];

  return {
    id: `macro-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: String(data.name || i18n.t("macro:imported_script_default_name", { defaultValue: "匯入之腳本" })),
    description: String(data.description || ""),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [i18n.t("macro:imported_tag", { defaultValue: "已匯入" })],
    createdAt: typeof data.createdAt === "number" ? data.createdAt : Date.now(),
    updatedAt: Date.now(),
    actions: splitDelaysToWaitActions(rawActions),
    isPreset: false,
  };
}

// Trim excessive leading and trailing delays and clean up micro wait noise
export function trimMacroActions(actions: MacroAction[]): MacroAction[] {
  if (actions.length === 0) return [];
  const cleaned = cleanMicroWaitActions(actions);
  const copy = [...cleaned];

  // If first action is wait, remove it
  if (copy.length > 0 && copy[0].type === "wait") {
    copy.shift();
  }
  // If last action is wait, limit to at most 100ms
  if (copy.length > 0) {
    const last = copy[copy.length - 1];
    if (last.type === "wait" && last.durationMs > 100) {
      copy[copy.length - 1] = { ...last, durationMs: 100 };
    } else if (last.delayAfterMs && last.delayAfterMs > 100) {
      copy[copy.length - 1] = { ...last, delayAfterMs: 100 };
    }
  }
  return copy;
}
