import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMacroPlayer } from '../hooks/useMacroPlayer';
import { MacroScript } from '../types/macro';

describe('useMacroPlayer Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  const mockScript: MacroScript = {
    id: 'test-script',
    name: '測試腳本',
    description: '',
    createdAt: 0,
    updatedAt: 0,
    actions: [
      { id: '1', type: 'button', button: 'a', startTimeMs: 0, durationMs: 100 },
      { id: '2', type: 'button', button: 'b', startTimeMs: 150, durationMs: 100 },
    ],
  };

  it('plays script and triggers button presses with durations', () => {
    const onButton = vi.fn();
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useMacroPlayer({
        onTriggerButton: onButton,
        onPlaybackComplete: onComplete,
      }),
    );

    act(() => {
      result.current.play(mockScript, { loopMode: 'once' });
    });

    expect(result.current.status.isPlaying).toBe(true);
    // Button A down at t=0
    expect(onButton).toHaveBeenCalledWith('a', true);

    // Advance 100ms -> Button A up
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(onButton).toHaveBeenCalledWith('a', false);

    // Advance 50ms (at 150ms) -> Button B down
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(onButton).toHaveBeenCalledWith('b', true);

    // Advance 100ms (at 250ms) -> Button B up & finishes playback
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(onButton).toHaveBeenCalledWith('b', false);
    expect(result.current.status.isPlaying).toBe(false);
    expect(onComplete).toHaveBeenCalled();
  });

  it('plays concurrent overlapping button presses simultaneously', () => {
    const onButton = vi.fn();
    const onComplete = vi.fn();

    const concurrentScript: MacroScript = {
      id: 'concurrent-script',
      name: '同時按鍵腳本',
      description: '',
      createdAt: 0,
      updatedAt: 0,
      actions: [
        { id: '1', type: 'button', button: 'zl', startTimeMs: 0, durationMs: 300 },
        { id: '2', type: 'button', button: 'a', startTimeMs: 100, durationMs: 100 },
      ],
    };

    const { result } = renderHook(() =>
      useMacroPlayer({
        onTriggerButton: onButton,
        onPlaybackComplete: onComplete,
      }),
    );

    act(() => {
      result.current.play(concurrentScript, { loopMode: 'once' });
    });

    // At t=0: ZL down
    expect(onButton).toHaveBeenCalledWith('zl', true);
    expect(onButton).not.toHaveBeenCalledWith('a', true);

    // Advance 100ms: A down (ZL is still down!)
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(onButton).toHaveBeenCalledWith('a', true);
    expect(onButton).not.toHaveBeenCalledWith('zl', false);

    // Advance 100ms (at 200ms): A up (ZL is still down!)
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(onButton).toHaveBeenCalledWith('a', false);
    expect(onButton).not.toHaveBeenCalledWith('zl', false);

    // Advance 100ms (at 300ms): ZL up and finishes
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(onButton).toHaveBeenCalledWith('zl', false);
    expect(result.current.status.isPlaying).toBe(false);
    expect(onComplete).toHaveBeenCalled();
  });

  it('supports emergency stop and resets inputs', () => {
    const onReset = vi.fn();
    const { result } = renderHook(() =>
      useMacroPlayer({
        onResetInputs: onReset,
      }),
    );

    act(() => {
      result.current.play(mockScript);
    });
    expect(result.current.status.isPlaying).toBe(true);

    act(() => {
      result.current.stop();
    });
    expect(result.current.status.isPlaying).toBe(false);
    expect(onReset).toHaveBeenCalled();
  });

  it('supports loop mode count', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useMacroPlayer({
        onPlaybackComplete: onComplete,
      }),
    );

    act(() => {
      result.current.play(mockScript, {
        loopMode: 'count',
        loopCount: 2,
        loopDelayMs: 200,
      });
    });

    expect(result.current.status.currentLoop).toBe(1);

    // Run through loop 1 (total duration 250ms)
    act(() => {
      vi.advanceTimersByTime(250);
    });

    // Advance loop delay (200ms)
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.status.currentLoop).toBe(2);

    // Run through loop 2 (250ms)
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(result.current.status.isPlaying).toBe(false);
    expect(onComplete).toHaveBeenCalled();
  });
});
