import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMacroPlayer } from "../hooks/useMacroPlayer";
import { MacroScript } from "../types/macro";

describe("useMacroPlayer Hook", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  const mockScript: MacroScript = {
    id: "test-script",
    name: "測試腳本",
    description: "",
    tags: [],
    createdAt: 0,
    updatedAt: 0,
    actions: [
      { id: "1", type: "button", button: "a", durationMs: 100, delayAfterMs: 50 },
      { id: "2", type: "button", button: "b", durationMs: 100, delayAfterMs: 50 },
    ],
  };

  it("plays script and triggers button presses with durations", () => {
    const onButton = vi.fn();
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useMacroPlayer({
        onTriggerButton: onButton,
        onPlaybackComplete: onComplete,
      })
    );

    act(() => {
      result.current.play(mockScript, { loopMode: "once" });
    });

    expect(result.current.status.isPlaying).toBe(true);
    // Button A down
    expect(onButton).toHaveBeenCalledWith("a", true);

    // Advance 100ms -> Button A up
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(onButton).toHaveBeenCalledWith("a", false);

    // Advance 50ms delay -> Button B down
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(onButton).toHaveBeenCalledWith("b", true);

    // Advance 100ms + 50ms -> finishes playback
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current.status.isPlaying).toBe(false);
    expect(onComplete).toHaveBeenCalled();
  });

  it("supports emergency stop and resets inputs", () => {
    const onReset = vi.fn();
    const { result } = renderHook(() =>
      useMacroPlayer({
        onResetInputs: onReset,
      })
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

  it("supports loop mode count", () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useMacroPlayer({
        onPlaybackComplete: onComplete,
      })
    );

    act(() => {
      result.current.play(mockScript, {
        loopMode: "count",
        loopCount: 2,
        loopDelayMs: 200,
      });
    });

    expect(result.current.status.currentLoop).toBe(1);

    // Run through loop 1 (100+50+100+50 = 300ms)
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Advance loop delay (200ms)
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.status.currentLoop).toBe(2);

    // Run through loop 2 (300ms)
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.status.isPlaying).toBe(false);
    expect(onComplete).toHaveBeenCalled();
  });
});
