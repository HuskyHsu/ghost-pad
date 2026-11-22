import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MacroStudio } from '../components/MacroStudio/MacroStudio';
import { GamepadVisualizer } from '../components/GamepadVisualizer';
import { DEFAULT_CONTROLLER_STATE } from '../types';
import { DEFAULT_PLAYBACK_CONFIG } from '../hooks/useMacroPlayer';
import { MacroPlayerStatus, MacroScript } from '../types/macro';

describe('MacroStudio Component (Full-Width Library & Score Sheet)', () => {
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
    id: 'macro-1',
    name: '測試連擊巨集',
    description: '自訂測試說明',
    createdAt: 1000,
    updatedAt: 1000,
    actions: [
      { id: 'act-1', type: 'button', button: 'a', startTimeMs: 0, durationMs: 150 },
      { id: 'act-2', type: 'button', button: 'b', startTimeMs: 200, durationMs: 120 },
    ],
  };

  it('renders empty state when there are no scripts', () => {
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
      />,
    );

    expect(screen.getByText(/巨集腳本庫目前為空/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /匯入巨集腳本/ })).toBeInTheDocument();
  });

  it('renders full-width library cards and enters score sheet editor on card click', () => {
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
      />,
    );

    // Shows script card
    expect(screen.getAllByText('測試連擊巨集')[0]).toBeInTheDocument();
    expect(screen.getByText('自訂測試說明')).toBeInTheDocument();

    // Click card to enter editor
    fireEvent.click(screen.getAllByText('測試連擊巨集')[0]);
    expect(onSelect).toHaveBeenCalledWith(sampleMacro.id);

    // Now in editor view: shows score sheet and back button
    expect(screen.getByText(/多行動作時序軌道/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /返回清單/ })).toBeInTheDocument();

    // Click back button returns to list view
    fireEvent.click(screen.getByRole('button', { name: /返回清單/ }));
    expect(screen.getByText(/筆腳本/)).toBeInTheDocument();
  });

  it('opens context menu on right click on note in score sheet', () => {
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
      />,
    );

    // Enter editor
    fireEvent.click(screen.getAllByText('測試連擊巨集')[0]);

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

  it('renders 5-track gap rectangle, opens edit modal on click, and supports resizing or removing gap', () => {
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
      />,
    );

    // Enter editor
    fireEvent.click(screen.getAllByText('測試連擊巨集')[0]);

    // Gap rectangle between A (0..150) and B (200..320) is 50ms
    const gapRect = screen.getByTitle(/空白區間 \(50ms\)/);
    expect(gapRect).toBeInTheDocument();

    // Clicking opens the gap edit modal instead of deleting immediately
    fireEvent.click(gapRect);
    expect(screen.getByText(/空白區間編輯/)).toBeInTheDocument();
    expect(screen.getByTitle(/空白區間 \(50ms\)/)).toBeInTheDocument();

    // Expand gap to 200ms using quick preset
    fireEvent.click(screen.getByRole('button', { name: '200ms' }));
    expect(screen.getByTitle(/空白區間 \(200ms\)/)).toBeInTheDocument();

    // Remove gap completely
    fireEvent.click(screen.getByRole('button', { name: /移除此空白/ }));
    expect(screen.queryByText(/空白區間編輯/)).not.toBeInTheDocument();
    expect(screen.queryByTitle(/空白區間/)).not.toBeInTheDocument();

    // Undo restores the 200ms gap
    const undoBtn = screen.getByRole('button', { name: '復原' });
    const redoBtn = screen.getByRole('button', { name: '重做' });
    expect(undoBtn).not.toBeDisabled();
    fireEvent.click(undoBtn);
    expect(screen.getByTitle(/空白區間 \(200ms\)/)).toBeInTheDocument();

    // Redo removes it again
    expect(redoBtn).not.toBeDisabled();
    fireEvent.click(redoBtn);
    expect(screen.queryByTitle(/空白區間/)).not.toBeInTheDocument();
  });

  it('shows unsaved changes warning modal when leaving editor with unsaved edits', () => {
    const onDirtyChange = vi.fn();
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
        onDirtyChange={onDirtyChange}
      />,
    );

    // Enter editor and modify title without saving
    fireEvent.click(screen.getAllByText('測試連擊巨集')[0]);
    const titleInput = screen.getByPlaceholderText(/腳本標題/);
    fireEvent.change(titleInput, { target: { value: '已修改但未儲存' } });
    expect(onDirtyChange).toHaveBeenCalledWith(true);

    // Click back button -> warning modal appears instead of leaving
    fireEvent.click(screen.getByRole('button', { name: /返回清單/ }));
    expect(screen.getByText(/尚未儲存變更/)).toBeInTheDocument();
    expect(screen.getByText(/多行動作時序軌道/)).toBeInTheDocument();

    // Cancel stays in editor
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    expect(screen.queryByText(/尚未儲存變更/)).not.toBeInTheDocument();
    expect(screen.getByText(/多行動作時序軌道/)).toBeInTheDocument();

    // Discard & leave returns to library list
    fireEvent.click(screen.getByRole('button', { name: /返回清單/ }));
    fireEvent.click(screen.getByRole('button', { name: /捨棄變更並離開/ }));
    expect(screen.getByText(/筆腳本/)).toBeInTheDocument();
  });

  it('saves macro when pressing Ctrl+S / Cmd+S', () => {
    const onSaveScript = vi.fn();
    render(
      <MacroStudio
        macros={[sampleMacro]}
        selectedScriptId={sampleMacro.id}
        onSelectScript={vi.fn()}
        onSaveScript={onSaveScript}
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
      />,
    );

    fireEvent.click(screen.getAllByText('測試連擊巨集')[0]);
    fireEvent.keyDown(window, { key: 's', ctrlKey: true });
    expect(onSaveScript).toHaveBeenCalledTimes(1);
  });

  it('unifies insert-wait-after into 5-track gap modal and supports save-and-leave', () => {
    const onSaveScript = vi.fn();
    render(
      <MacroStudio
        macros={[sampleMacro]}
        selectedScriptId={sampleMacro.id}
        onSelectScript={vi.fn()}
        onSaveScript={onSaveScript}
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
      />,
    );

    fireEvent.click(screen.getAllByText('測試連擊巨集')[0]);

    // Click #1 A -> Insert Wait After -> opens unified 5-track gap modal (150ms + 50ms = 200ms)
    fireEvent.click(screen.getByTitle(/#1 A/));
    fireEvent.click(screen.getByText(/在此後插入等待/));
    expect(screen.getByText(/空白區間編輯/)).toBeInTheDocument();
    expect(screen.getByTitle(/空白區間 \(200ms\)/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '完成' }));

    // Leave with unsaved changes -> Save & Leave
    fireEvent.click(screen.getByRole('button', { name: /返回清單/ }));
    expect(screen.getByText(/尚未儲存變更/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /儲存並離開/ }));
    expect(onSaveScript).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/筆腳本/)).toBeInTheDocument();
  });

  it('sets playback start cursor from time ruler, formats >=1s hover pills, and renders conditional left resize handles', () => {
    const onPlay = vi.fn();
    const wideAndNarrowMacro: MacroScript = {
      id: 'macro-wide-narrow',
      name: '寬窄測試巨集',
      description: '',
      createdAt: 1000,
      updatedAt: 1000,
      actions: [
        { id: 'w1', type: 'button', button: 'a', startTimeMs: 0, durationMs: 500 }, // 5% of 10s -> has left & right handles
        { id: 'n1', type: 'button', button: 'b', startTimeMs: 2000, durationMs: 100 }, // 1% of 10s -> right handle only (1500ms gap before it)
      ],
    };

    render(
      <MacroStudio
        macros={[wideAndNarrowMacro]}
        selectedScriptId={wideAndNarrowMacro.id}
        onSelectScript={vi.fn()}
        onSaveScript={vi.fn()}
        onDuplicateScript={vi.fn()}
        onDeleteScript={vi.fn()}
        onImportScripts={vi.fn()}
        playerStatus={defaultStatus}
        playerConfig={DEFAULT_PLAYBACK_CONFIG}
        onChangePlayerConfig={vi.fn()}
        onPlay={onPlay}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onStop={vi.fn()}
      />,
    );

    fireEvent.click(screen.getAllByText('寬窄測試巨集')[0]);

    // 1500ms gap formats hover pill as 1.5s
    expect(screen.getByText('1.5s')).toBeInTheDocument();

    // Only the wide note (500ms >= 3%) renders left resize handle; both render right resize handles
    expect(screen.getAllByTitle(/拖曳左側邊緣調整起點與持續時間/)).toHaveLength(1);
    expect(screen.getAllByTitle(/拖曳右側邊緣調整持續時間/)).toHaveLength(2);

    // Click time ruler at 50% of 10s line -> sets playback start cursor to 5000ms (5s)
    const ruler = screen.getByTitle(/點擊時間軸可設定試播起點/);
    vi.spyOn(ruler, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      width: 1000,
      top: 0,
      right: 1000,
      bottom: 12,
      height: 12,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
    fireEvent.click(ruler, { clientX: 500 });

    const startBadge = screen.getByRole('button', { name: /起播 5s/ });
    expect(startBadge).toBeInTheDocument();

    // Play passes startOffsetMs = 5000 as 3rd argument
    fireEvent.click(screen.getByRole('button', { name: /播放/ }));
    expect(onPlay).toHaveBeenCalledWith(expect.objectContaining({ id: 'macro-wide-narrow' }), undefined, 5000);

    // Clicking badge resets start cursor back to 0
    fireEvent.click(startBadge);
    expect(screen.queryByRole('button', { name: /起播/ })).not.toBeInTheDocument();
  });

  it('auto-scrolls to the active line during playback and respects the auto-follow toggle', () => {
    const longMacro: MacroScript = {
      id: 'macro-long',
      name: '多行自動跟隨測試',
      description: '',
      createdAt: 1000,
      updatedAt: 1000,
      actions: [
        { id: 'l1', type: 'button', button: 'a', startTimeMs: 0, durationMs: 200 },
        { id: 'l2', type: 'button', button: 'b', startTimeMs: 12000, durationMs: 200 },
        { id: 'l3', type: 'button', button: 'x', startTimeMs: 24000, durationMs: 200 },
      ],
    };

    const scrolledLineIndices: string[] = [];
    const scrollIntoViewMock = vi.fn(function (this: HTMLElement) {
      scrolledLineIndices.push(this.getAttribute('data-line-index') ?? '');
    });
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scrollIntoViewMock;

    try {
      const renderProps = (statusOverrides: Partial<MacroPlayerStatus> = {}) => (
        <MacroStudio
          macros={[longMacro]}
          selectedScriptId={longMacro.id}
          onSelectScript={vi.fn()}
          onSaveScript={vi.fn()}
          onDuplicateScript={vi.fn()}
          onDeleteScript={vi.fn()}
          onImportScripts={vi.fn()}
          playerStatus={{ ...defaultStatus, ...statusOverrides }}
          playerConfig={DEFAULT_PLAYBACK_CONFIG}
          onChangePlayerConfig={vi.fn()}
          onPlay={vi.fn()}
          onPause={vi.fn()}
          onResume={vi.fn()}
          onStop={vi.fn()}
        />
      );

      const { rerender } = render(renderProps());
      fireEvent.click(screen.getAllByText('多行自動跟隨測試')[0]);

      // Not playing -> should not scroll
      expect(scrollIntoViewMock).not.toHaveBeenCalled();

      // Start playing on line 2 (12.0s -> line index 1)
      rerender(renderProps({ isPlaying: true, currentScriptId: longMacro.id, elapsedMs: 12000, currentLoop: 2, progressPercent: 50 }));
      expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
      expect(scrollIntoViewMock).toHaveBeenLastCalledWith({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      expect(scrolledLineIndices).toEqual(['1']);
      expect(screen.getByText('循環 #2')).toBeInTheDocument();
      expect(screen.getByText('進度：50%')).toBeInTheDocument();
      expect(screen.getByText('12.0s / 24.2s')).toBeInTheDocument();

      // Still on line 2 (15.0s -> line index 1) -> should not re-trigger scroll
      rerender(renderProps({ isPlaying: true, currentScriptId: longMacro.id, elapsedMs: 15000 }));
      expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);

      // Advance to line 3 (24.0s -> line index 2) -> scrolls to line 3
      rerender(renderProps({ isPlaying: true, currentScriptId: longMacro.id, elapsedMs: 24000 }));
      expect(scrollIntoViewMock).toHaveBeenCalledTimes(2);
      expect(scrolledLineIndices).toEqual(['1', '2']);

      // Disable auto-follow -> changing line should not scroll
      const autoFollowBtn = screen.getByRole('button', { name: /自動跟隨/ });
      expect(autoFollowBtn).toHaveAttribute('aria-pressed', 'true');
      fireEvent.click(autoFollowBtn);
      expect(autoFollowBtn).toHaveAttribute('aria-pressed', 'false');

      rerender(renderProps({ isPlaying: true, currentScriptId: longMacro.id, elapsedMs: 1000 }));
      expect(scrollIntoViewMock).toHaveBeenCalledTimes(2);

      // Re-enable auto-follow while playing -> immediately scrolls to current active line (line index 0)
      fireEvent.click(autoFollowBtn);
      expect(scrollIntoViewMock).toHaveBeenCalledTimes(3);
      expect(scrolledLineIndices).toEqual(['1', '2', '0']);
    } finally {
      Element.prototype.scrollIntoView = originalScrollIntoView;
    }
  });

  it('triggers onRunScript from library card Run button without entering edit mode', () => {
    const onRunScript = vi.fn();
    const onSelectScript = vi.fn();

    render(
      <MacroStudio
        macros={[sampleMacro]}
        selectedScriptId={sampleMacro.id}
        onSelectScript={onSelectScript}
        onRunScript={onRunScript}
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
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /執行/ }));
    expect(onRunScript).toHaveBeenCalledWith(sampleMacro);
    expect(onSelectScript).not.toHaveBeenCalled();
    expect(screen.queryByText(/多行動作時序軌道/)).not.toBeInTheDocument();
  });

  it('does not leak another script playback progress into MacroPlayerBar when editing a different script', () => {
    render(
      <MacroStudio
        macros={[sampleMacro]}
        selectedScriptId={sampleMacro.id}
        viewMode='edit'
        onSelectScript={vi.fn()}
        onSaveScript={vi.fn()}
        onDuplicateScript={vi.fn()}
        onDeleteScript={vi.fn()}
        onImportScripts={vi.fn()}
        playerStatus={{
          ...defaultStatus,
          isPlaying: true,
          currentScriptId: 'other-macro-id',
          currentLoop: 3,
          progressPercent: 75,
          elapsedMs: 9000,
        }}
        playerConfig={DEFAULT_PLAYBACK_CONFIG}
        onChangePlayerConfig={vi.fn()}
        onPlay={vi.fn()}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onStop={vi.fn()}
      />,
    );

    expect(screen.getByText('進度：0%')).toBeInTheDocument();
    expect(screen.getByText('0.0s / 0.3s')).toBeInTheDocument();
    expect(screen.queryByText('循環 #3')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /播放/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /停止/ })).toBeDisabled();
  });

  it('allows progress bar seek only when paused (click & drag) and renders persistent status banners', () => {
    const onSeek = vi.fn();
    const longMacro: MacroScript = {
      id: 'macro-seek',
      name: '進度跳轉測試',
      description: '',
      createdAt: 1000,
      updatedAt: 1000,
      actions: [{ id: 's1', type: 'button', button: 'a', startTimeMs: 0, durationMs: 10000 }],
    };

    const renderStudio = (
      statusOverrides: Partial<MacroPlayerStatus> = {},
      extra: { esp32Connected?: boolean; isAutoPaused?: boolean } = {},
    ) => (
      <MacroStudio
        macros={[longMacro]}
        selectedScriptId={longMacro.id}
        viewMode='edit'
        onSelectScript={vi.fn()}
        onSaveScript={vi.fn()}
        onDuplicateScript={vi.fn()}
        onDeleteScript={vi.fn()}
        onImportScripts={vi.fn()}
        playerStatus={{ ...defaultStatus, ...statusOverrides }}
        playerConfig={DEFAULT_PLAYBACK_CONFIG}
        onChangePlayerConfig={vi.fn()}
        onPlay={vi.fn()}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onSeek={onSeek}
        onStop={vi.fn()}
        esp32Connected={extra.esp32Connected ?? true}
        isAutoPaused={extra.isAutoPaused ?? false}
      />
    );

    // Stopped -> slider is not interactive, no banners
    const { rerender } = render(renderStudio({}, { esp32Connected: false }));
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(screen.queryByText(/僅於畫面預覽播放/)).not.toBeInTheDocument();

    // Actively playing (not paused) & offline -> offline banner shown, slider still NOT seekable
    rerender(
      renderStudio(
        { isPlaying: true, isPaused: false, currentScriptId: longMacro.id, elapsedMs: 2000, progressPercent: 20 },
        { esp32Connected: false },
      ),
    );
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(screen.getByText(/僅於畫面預覽播放/)).toBeInTheDocument();
    expect(screen.queryByText(/已自動暫停巨集/)).not.toBeInTheDocument();

    // Paused (auto-paused) & offline -> both persistent banners shown, slider IS seekable via pointerDown & pointerMove
    rerender(
      renderStudio(
        { isPlaying: true, isPaused: true, currentScriptId: longMacro.id, elapsedMs: 2000, progressPercent: 20 },
        { esp32Connected: false, isAutoPaused: true },
      ),
    );
    expect(screen.getByText(/已自動暫停巨集/)).toBeInTheDocument();
    expect(screen.getByText(/僅於畫面預覽播放/)).toBeInTheDocument();

    const slider = screen.getByRole('slider', { name: /暫停中：點擊或拖曳進度條跳轉位置/ });
    vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      width: 1000,
      top: 0,
      right: 1000,
      bottom: 12,
      height: 12,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    fireEvent.pointerDown(slider, { clientX: 400, pointerId: 1 });
    expect(onSeek).toHaveBeenLastCalledWith(4000);

    fireEvent.pointerMove(slider, { clientX: 700, pointerId: 1 });
    expect(onSeek).toHaveBeenLastCalledWith(7000);

    fireEvent.pointerUp(slider, { pointerId: 1 });
  });

  it('auto-pauses running macro on manual virtual gamepad button press in GamepadVisualizer', () => {
    const callOrder: string[] = [];
    const onPauseMacro = vi.fn(() => callOrder.push('pause'));
    const onTriggerButton = vi.fn((btn: string, pressed: boolean) => {
      if (pressed) callOrder.push(`btn:${btn}`);
    });

    render(
      <GamepadVisualizer
        state={DEFAULT_CONTROLLER_STATE}
        esp32Connected={true}
        onTriggerButton={onTriggerButton}
        onTriggerStick={vi.fn()}
        macros={[sampleMacro]}
        selectedMacroId={sampleMacro.id}
        onSelectMacro={vi.fn()}
        macroPlayerStatus={{ ...defaultStatus, isPlaying: true, isPaused: false, currentScriptId: sampleMacro.id, elapsedMs: 100 }}
        macroPlayerConfig={DEFAULT_PLAYBACK_CONFIG}
        onChangeMacroPlayerConfig={vi.fn()}
        onPlayMacro={vi.fn()}
        onPauseMacro={onPauseMacro}
        onResumeMacro={vi.fn()}
        onStopMacro={vi.fn()}
      />,
    );

    fireEvent.pointerDown(screen.getByRole('button', { name: 'A' }));
    expect(onPauseMacro).toHaveBeenCalledTimes(1);
    expect(onTriggerButton).toHaveBeenCalledWith('a', true);
    expect(callOrder).toEqual(['pause', 'btn:a']);
  });
});
