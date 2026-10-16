import { MacroScript, MacroAction } from "../types/macro";

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
      return parsed;
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

function sanitizeMacro(data: any): MacroScript {
  return {
    id: `macro-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: String(data.name || "匯入之腳本"),
    description: String(data.description || ""),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : ["已匯入"],
    createdAt: typeof data.createdAt === "number" ? data.createdAt : Date.now(),
    updatedAt: Date.now(),
    actions: Array.isArray(data.actions)
      ? data.actions.map((act: any, idx: number) => ({
          id: act.id || `act-imp-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          type: act.type || "button",
          button: act.button,
          stick: act.stick,
          stickX: typeof act.stickX === "number" ? act.stickX : 128,
          stickY: typeof act.stickY === "number" ? act.stickY : 128,
          dpad: typeof act.dpad === "number" ? act.dpad : 8,
          durationMs: Math.max(20, Number(act.durationMs) || 100),
          delayAfterMs: Math.max(0, Number(act.delayAfterMs) || 50),
          note: act.note ? String(act.note) : undefined,
        }))
      : [],
    isPreset: false,
  };
}

// Trim excessive leading and trailing delays from script
export function trimMacroActions(actions: MacroAction[]): MacroAction[] {
  if (actions.length === 0) return [];
  const copy = [...actions];
  // If first action has delay only, or trim excessive delay
  if (copy.length > 0 && copy[0].type === "wait") {
    copy.shift();
  }
  if (copy.length > 0) {
    // Limit last action's delayAfterMs to at most 100ms
    const last = copy[copy.length - 1];
    if (last.delayAfterMs > 100) {
      copy[copy.length - 1] = { ...last, delayAfterMs: 100 };
    }
  }
  return copy;
}
