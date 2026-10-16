import { describe, it, expect, beforeEach } from "vitest";
import {
  loadMacros,
  getScriptTotalDurationMs,
  trimMacroActions,
  importMacroFromJson,
  importAllMacrosFromJson,
} from "../utils/macroStorage";
import { MacroScript, MacroAction } from "../types/macro";

describe("Macro Storage and Utilities", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns empty array when storage is empty (no preset scripts)", () => {
    const macros = loadMacros();
    expect(macros).toEqual([]);
  });

  it("calculates total script duration including delays correctly", () => {
    const script: MacroScript = {
      id: "test",
      name: "Test",
      description: "",
      tags: [],
      createdAt: 0,
      updatedAt: 0,
      actions: [
        { id: "1", type: "button", button: "a", durationMs: 100, delayAfterMs: 50 },
        { id: "2", type: "button", button: "b", durationMs: 200, delayAfterMs: 100 },
      ],
    };
    expect(getScriptTotalDurationMs(script)).toBe(450);
  });

  it("trims trailing excessive delays", () => {
    const actions: MacroAction[] = [
      { id: "1", type: "button", button: "a", durationMs: 100, delayAfterMs: 40 },
      { id: "2", type: "button", button: "b", durationMs: 100, delayAfterMs: 500 },
    ];
    const trimmed = trimMacroActions(actions);
    expect(trimmed[1].delayAfterMs).toBe(100);
  });

  it("imports single macro JSON and sanitizes fields", () => {
    const rawJson = JSON.stringify({
      name: "自訂連擊",
      actions: [
        { type: "button", button: "a", durationMs: 150, delayAfterMs: 50 },
      ],
    });
    const imported = importMacroFromJson(rawJson);
    expect(imported).not.toBeNull();
    expect(imported?.name).toBe("自訂連擊");
    expect(imported?.actions.length).toBe(1);
    expect(imported?.actions[0].button).toBe("a");
  });

  it("imports all macros backup JSON successfully", () => {
    const backupJson = JSON.stringify({
      version: "1.0",
      macros: [
        { name: "腳本1", actions: [{ type: "wait", durationMs: 100, delayAfterMs: 0 }] },
        { name: "腳本2", actions: [{ type: "button", button: "x", durationMs: 200, delayAfterMs: 50 }] },
      ],
    });
    const importedList = importAllMacrosFromJson(backupJson);
    expect(importedList).not.toBeNull();
    expect(importedList?.length).toBe(2);
    expect(importedList?.[0].name).toBe("腳本1");
  });
});
