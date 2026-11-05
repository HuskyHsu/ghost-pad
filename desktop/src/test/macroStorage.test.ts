import { beforeEach, describe, expect, it } from 'vitest';
import { MacroAction, MacroScript } from '../types/macro';
import {
  computeScheduledActions,
  getScriptTotalDurationMs,
  importAllMacrosFromJson,
  importMacroFromJson,
  loadMacros,
  trimMacroActions,
} from '../utils/macroStorage';

describe('Macro Storage and Utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty array when storage is empty (no preset scripts)', () => {
    const macros = loadMacros();
    expect(macros).toEqual([]);
  });

  it('calculates total script duration correctly with timeline offsets and overlapping actions', () => {
    const script: MacroScript = {
      id: 'test',
      name: 'Test',
      description: '',
      createdAt: 0,
      updatedAt: 0,
      actions: [
        { id: '1', type: 'button', button: 'zl', startTimeMs: 0, durationMs: 300 },
        { id: '2', type: 'button', button: 'a', startTimeMs: 100, durationMs: 150 },
        { id: '3', type: 'stick', stick: 'left', stickX: 128, stickY: 0, startTimeMs: 50, durationMs: 400 },
      ],
    };
    // ZL ends at 300ms, A ends at 250ms, Stick ends at 450ms -> Max is 450ms
    expect(getScriptTotalDurationMs(script)).toBe(450);
  });

  it('computes scheduled actions preserving startTimeMs and calculating endTimeMs', () => {
    const actions: MacroAction[] = [
      { id: '2', type: 'button', button: 'b', startTimeMs: 100, durationMs: 150 },
      { id: '1', type: 'button', button: 'a', startTimeMs: 0, durationMs: 200 },
    ];
    const scheduled = computeScheduledActions(actions);
    expect(scheduled.length).toBe(2);
    expect(scheduled[0].id).toBe('1');
    expect(scheduled[0].startTimeMs).toBe(0);
    expect(scheduled[0].endTimeMs).toBe(200);
    expect(scheduled[1].id).toBe('2');
    expect(scheduled[1].startTimeMs).toBe(100);
    expect(scheduled[1].endTimeMs).toBe(250);
  });

  it('trims leading idle delays by shifting startTimeMs and clamps trailing wait', () => {
    const actions: MacroAction[] = [
      { id: '1', type: 'button', button: 'a', startTimeMs: 200, durationMs: 100 },
      { id: '2', type: 'button', button: 'b', startTimeMs: 350, durationMs: 100 },
      { id: '3', type: 'wait', startTimeMs: 450, durationMs: 500 },
    ];
    const trimmed = trimMacroActions(actions);
    expect(trimmed.length).toBe(3);
    // Shifted forward by 200ms
    expect(trimmed[0].startTimeMs).toBe(0);
    expect(trimmed[1].startTimeMs).toBe(150);
    expect(trimmed[2].startTimeMs).toBe(250);
    // Trailing wait clamped to 100ms
    expect(trimmed[2].durationMs).toBe(100);
  });

  it('imports single macro JSON and sanitizes fields with startTimeMs', () => {
    const rawJson = JSON.stringify({
      name: '自訂連擊',
      tags: ['舊標籤'],
      isPreset: false,
      actions: [
        { type: 'button', button: 'a', startTimeMs: 100, durationMs: 150, delayAfterMs: 120, note: '舊備註' },
        { type: 'wait', startTimeMs: 250, durationMs: 200 },
      ],
    });
    const imported = importMacroFromJson(rawJson);
    expect(imported).not.toBeNull();
    expect(imported?.name).toBe('自訂連擊');
    expect((imported as any)?.tags).toBeUndefined();
    expect((imported as any)?.isPreset).toBeUndefined();
    expect(imported?.actions.length).toBe(2);
    expect(imported?.actions[0].button).toBe('a');
    expect(imported?.actions[0].startTimeMs).toBe(100);
    expect((imported?.actions[0] as any)?.note).toBeUndefined();
    expect((imported?.actions[0] as any)?.delayAfterMs).toBeUndefined();
    expect(imported?.actions[1].type).toBe('wait');
    expect(imported?.actions[1].startTimeMs).toBe(250);
    expect(imported?.actions[1].durationMs).toBe(200);
  });

  it('imports all macros backup JSON successfully', () => {
    const backupJson = JSON.stringify({
      version: '1.0',
      macros: [
        { name: '腳本1', actions: [{ type: 'wait', startTimeMs: 0, durationMs: 100 }] },
        { name: '腳本2', actions: [{ type: 'button', button: 'x', startTimeMs: 50, durationMs: 200 }] },
      ],
    });
    const importedList = importAllMacrosFromJson(backupJson);
    expect(importedList).not.toBeNull();
    expect(importedList?.length).toBe(2);
    expect(importedList?.[0].name).toBe('腳本1');
  });
});
