import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MacroStudio } from "../components/MacroStudio/MacroStudio";
import { MacroScript } from "../types/macro";
import { DEFAULT_PLAYBACK_CONFIG } from "../hooks/useMacroPlayer";

describe("MacroStudio Component (Full-Width Library & Score Sheet)", () => {
  const defaultStatus = {
    isPlaying: false,
    isPaused: false,
    currentScriptId: null,
    currentActionIndex: 0,
    currentLoop: 1,
    totalLoops: 1,
    progressPercent: 0,
    elapsedMs: 0,
  };

  const sampleMacro: MacroScript = {
    id: "macro-1",
    name: "測試連擊巨集",
    description: "自訂測試說明",
    tags: ["測試"],
    createdAt: 1000,
    updatedAt: 1000,
    actions: [
      { id: "act-1", type: "button", button: "a", durationMs: 150, delayAfterMs: 80 },
      { id: "act-2", type: "button", button: "b", durationMs: 120, delayAfterMs: 50 },
    ],
  };

  it("renders empty state when there are no scripts", () => {
    render(
      <MacroStudio
        macros={[]}
        selectedScriptId={null}
        onSelectScript={vi.fn()}
        onSaveScript={vi.fn()}
        onDuplicateScript={vi.fn()}
        onDeleteScript={vi.fn()}
        onImportScripts={vi.fn()}
        playerStatus={defaultStatus}
        playerConfig={DEFAULT_PLAYBACK_CONFIG}
        onChangePlayerConfig={vi.fn()}
        onPlay={vi.fn()}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onStop={vi.fn()}
      />
    );

    expect(screen.getByText(/巨集腳本庫目前為空/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /匯入巨集腳本/ })).toBeInTheDocument();
  });

  it("renders full-width library cards and enters score sheet editor on card click", () => {
    const onSelect = vi.fn();
    const onSave = vi.fn();

    render(
      <MacroStudio
        macros={[sampleMacro]}
        selectedScriptId={sampleMacro.id}
        onSelectScript={onSelect}
        onSaveScript={onSave}
        onDuplicateScript={vi.fn()}
        onDeleteScript={vi.fn()}
        onImportScripts={vi.fn()}
        playerStatus={defaultStatus}
        playerConfig={DEFAULT_PLAYBACK_CONFIG}
        onChangePlayerConfig={vi.fn()}
        onPlay={vi.fn()}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onStop={vi.fn()}
      />
    );

    // Shows script card
    expect(screen.getAllByText("測試連擊巨集")[0]).toBeInTheDocument();
    expect(screen.getByText("自訂測試說明")).toBeInTheDocument();

    // Click card to enter editor
    fireEvent.click(screen.getAllByText("測試連擊巨集")[0]);
    expect(onSelect).toHaveBeenCalledWith(sampleMacro.id);

    // Now in editor view: shows score sheet and back button
    expect(screen.getByText(/多行動作時序軌道/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /返回清單/ })).toBeInTheDocument();

    // Click back button returns to list view
    fireEvent.click(screen.getByRole("button", { name: /返回清單/ }));
    expect(screen.getByText(/筆腳本/)).toBeInTheDocument();
  });

  it("opens context menu on right click on note in score sheet", () => {
    render(
      <MacroStudio
        macros={[sampleMacro]}
        selectedScriptId={sampleMacro.id}
        onSelectScript={vi.fn()}
        onSaveScript={vi.fn()}
        onDuplicateScript={vi.fn()}
        onDeleteScript={vi.fn()}
        onImportScripts={vi.fn()}
        playerStatus={defaultStatus}
        playerConfig={DEFAULT_PLAYBACK_CONFIG}
        onChangePlayerConfig={vi.fn()}
        onPlay={vi.fn()}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onStop={vi.fn()}
      />
    );

    // Enter editor
    fireEvent.click(screen.getAllByText("測試連擊巨集")[0]);

    // Find note element and trigger left click
    const noteEl = screen.getByTitle(/#1 A/);
    expect(noteEl).toBeInTheDocument();

    fireEvent.click(noteEl);

    // Shows unified action editor modal
    expect(screen.getByText(/動作編輯/)).toBeInTheDocument();
    expect(screen.getByText(/按壓持續時間/)).toBeInTheDocument();
    expect(screen.getByText(/在此後插入等待/)).toBeInTheDocument();
    expect(screen.getByText(/刪除此步驟/)).toBeInTheDocument();
  });
});
