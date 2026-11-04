import { beforeEach, describe, expect, it } from 'vitest';
import { MacroAction, MacroScript } from '../types/macro';
import { getScriptTotalDurationMs, importAllMacrosFromJson, importMacroFromJson, loadMacros, trimMacroActions } from '../utils/macroStorage';

describe('Macro Storage and Utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty array when storage is empty (no preset scripts)', () => {
    const macros = loadMacros();
    expect(macros).toEqual([]);
  });

  it('calculates total script duration correctly', () => {
    const script: MacroScript = {
      id: 'test',
      name: 'Test',
      description: '',
      createdAt: 0,
      updatedAt: 0,
      actions: [
        { id: '1', type: 'button', button: 'a', durationMs: 100 },
        { id: '2', type: 'wait', durationMs: 50 },
        { id: '3', type: 'button', button: 'b', durationMs: 200 },
      ],
    };
    expect(getScriptTotalDurationMs(script)).toBe(350);
  });

  it('trims trailing excessive wait delays', () => {
    const actions: MacroAction[] = [
      { id: '1', type: 'wait', durationMs: 150 },
      { id: '2', type: 'button', button: 'a', durationMs: 100 },
      { id: '3', type: 'wait', durationMs: 500 },
    ];
    const trimmed = trimMacroActions(actions);
    expect(trimmed.length).toBe(2);
    expect(trimmed[0].type).toBe('button');
    expect(trimmed[1].type).toBe('wait');
    expect(trimmed[1].durationMs).toBe(100);
  });

  it('imports single macro JSON and sanitizes fields without legacy tags, isPreset, action notes or delayAfterMs', () => {
    const rawJson = JSON.stringify({
      name: '自訂連擊',
      tags: ['舊標籤'],
      isPreset: false,
      actions: [
        { type: 'button', button: 'a', durationMs: 150, delayAfterMs: 120, note: '舊備註' },
        { type: 'wait', durationMs: 200 },
      ],
    });
    const imported = importMacroFromJson(rawJson);
    expect(imported).not.toBeNull();
    expect(imported?.name).toBe('自訂連擊');
    expect((imported as any)?.tags).toBeUndefined();
    expect((imported as any)?.isPreset).toBeUndefined();
    expect(imported?.actions.length).toBe(2);
    expect(imported?.actions[0].button).toBe('a');
    expect((imported?.actions[0] as any)?.note).toBeUndefined();
    expect((imported?.actions[0] as any)?.delayAfterMs).toBeUndefined();
    expect(imported?.actions[1].type).toBe('wait');
    expect(imported?.actions[1].durationMs).toBe(200);
  });

  it('imports all macros backup JSON successfully', () => {
    const backupJson = JSON.stringify({
      version: '1.0',
      macros: [
        { name: '腳本1', actions: [{ type: 'wait', durationMs: 100 }] },
        { name: '腳本2', actions: [{ type: 'button', button: 'x', durationMs: 200 }] },
      ],
    });
    const importedList = importAllMacrosFromJson(backupJson);
    expect(importedList).not.toBeNull();
    expect(importedList?.length).toBe(2);
    expect(importedList?.[0].name).toBe('腳本1');
  });
});
