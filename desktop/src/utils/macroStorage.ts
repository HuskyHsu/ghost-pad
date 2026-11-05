import { invoke } from '@tauri-apps/api/core';
import i18n from '../i18n';
import { MacroAction, MacroScript } from '../types/macro';
import { isTauriAvailable } from './tauri';

const STORAGE_KEY = 'ghostpad_macros_v2';

export interface ScheduledAction extends MacroAction {
  startTimeMs: number;
  endTimeMs: number;
  index: number;
}

export function computeScheduledActions(actions: MacroAction[]): ScheduledAction[] {
  return actions
    .map((act, index) => {
      const start = Math.max(0, Number(act.startTimeMs) || 0);
      const dur = Math.max(10, Number(act.durationMs) || 100);
      return {
        ...act,
        startTimeMs: start,
        endTimeMs: start + dur,
        durationMs: dur,
        index,
      };
    })
    .sort((a, b) => a.startTimeMs - b.startTimeMs);
}

export function getScriptTotalDurationMs(script: MacroScript): number {
  if (!script.actions || script.actions.length === 0) return 0;
  return Math.max(0, ...script.actions.map((act) => (act.startTimeMs || 0) + (act.durationMs || 0)));
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
      const result = parsed.map((m: any) => {
        const cleanedActions = (Array.isArray(m.actions) ? m.actions : []).map((a: any) => {
          if ('note' in a || 'delayAfterMs' in a) needsResave = true;
          const { note, delayAfterMs, ...rest } = a;
          return {
            ...rest,
            startTimeMs: Math.max(0, Number(rest.startTimeMs) || 0),
          };
        });
        if ('tags' in m || 'isPreset' in m) {
          needsResave = true;
        }
        const { tags, isPreset, ...cleanScript } = m;
        return {
          ...cleanScript,
          actions: cleanedActions,
        };
      });

      if (needsResave) {
        saveMacros(result);
      }
      return result;
    }
    return [];
  } catch (err) {
    console.error('Failed to load macros from localStorage:', err);
    return [];
  }
}

export function saveMacros(macros: MacroScript[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(macros));
  } catch (err) {
    console.error('Failed to save macros to localStorage:', err);
  }
}

export async function exportMacroAsJson(macro: MacroScript): Promise<string | null> {
  const json = JSON.stringify(macro, null, 2);
  const safeName = macro.name.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '_');
  const defaultName = `ghostpad_macro_${safeName}.json`;

  if (isTauriAvailable()) {
    try {
      const savedPath = await invoke<string | null>('save_file_dialog', {
        defaultName,
        content: json,
      });
      return savedPath;
    } catch (err) {
      console.error('Tauri save_file_dialog failed, falling back to browser download:', err);
    }
  }

  // Web fallback (standard browser download)
  try {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultName;
    a.click();
    URL.revokeObjectURL(url);
    return defaultName;
  } catch (err) {
    console.error('Failed to export macro via web fallback:', err);
    return null;
  }
}

export async function exportAllMacrosAsJson(macros: MacroScript[]): Promise<string | null> {
  const json = JSON.stringify({ version: '1.0', exportedAt: Date.now(), macros }, null, 2);
  const defaultName = `ghostpad_macros_backup_${new Date().toISOString().slice(0, 10)}.json`;

  if (isTauriAvailable()) {
    try {
      const savedPath = await invoke<string | null>('save_file_dialog', {
        defaultName,
        content: json,
      });
      return savedPath;
    } catch (err) {
      console.error('Tauri save_file_dialog failed, falling back to browser download:', err);
    }
  }

  // Web fallback (standard browser download)
  try {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultName;
    a.click();
    URL.revokeObjectURL(url);
    return defaultName;
  } catch (err) {
    console.error('Failed to export all macros via web fallback:', err);
    return null;
  }
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
    console.error('Invalid JSON for macro import:', err);
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
    console.error('Invalid JSON for backup import:', err);
    return null;
  }
}

// Count how many adjacent consecutive wait actions exist
export function countConsecutiveWaitMerges(actions: MacroAction[]): number {
  let count = 0;
  for (let i = 0; i < actions.length - 1; i++) {
    if (actions[i].type === 'wait' && actions[i + 1].type === 'wait') {
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
    if (curr.type === 'wait' && result.length > 0 && result[result.length - 1].type === 'wait') {
      const prev = result[result.length - 1];
      result[result.length - 1] = {
        ...prev,
        durationMs: (prev.durationMs || 0) + (curr.durationMs || 0),
      };
    } else {
      result.push({ ...curr });
    }
  }

  return result;
}

function sanitizeMacro(data: any): MacroScript {
  const rawActions = Array.isArray(data.actions)
    ? data.actions.map((act: any, idx: number) => ({
        id: act.id || `act-imp-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        type: act.type || 'button',
        button: act.button,
        stick: act.stick,
        stickX: typeof act.stickX === 'number' ? act.stickX : 128,
        stickY: typeof act.stickY === 'number' ? act.stickY : 128,
        dpad: typeof act.dpad === 'number' ? act.dpad : 8,
        startTimeMs: Math.max(0, Number(act.startTimeMs) || 0),
        durationMs: Math.max(20, Number(act.durationMs) || 100),
      }))
    : [];

  return {
    id: `macro-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: String(data.name || i18n.t('macro:imported_script_default_name', { defaultValue: '匯入之腳本' })),
    description: String(data.description || ''),
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
    updatedAt: Date.now(),
    actions: (rawActions as MacroAction[]).sort((a, b) => a.startTimeMs - b.startTimeMs),
  };
}

// Trim excessive leading and trailing delays
export function trimMacroActions(actions: MacroAction[]): MacroAction[] {
  if (actions.length === 0) return [];
  let copy = actions.map((a) => ({ ...a }));

  // 1. If first action is an explicit wait at start, remove it
  if (copy.length > 0 && copy[0].type === 'wait' && copy[0].startTimeMs === 0) {
    copy.shift();
  }

  // 2. If earliest action starts after 0ms, shift all actions to 0
  if (copy.length > 0) {
    const minStart = Math.min(...copy.map((a) => a.startTimeMs));
    if (minStart > 0) {
      copy = copy.map((a) => ({
        ...a,
        startTimeMs: Math.max(0, a.startTimeMs - minStart),
      }));
    }
  }

  // 3. If last action is wait, limit its duration to at most 100ms
  if (copy.length > 0) {
    const last = copy[copy.length - 1];
    if (last.type === 'wait' && last.durationMs > 100) {
      copy[copy.length - 1] = { ...last, durationMs: 100 };
    }
  }
  return copy;
}
