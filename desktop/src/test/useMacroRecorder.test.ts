import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMacroRecorder } from "../hooks/useMacroRecorder";
import { DEFAULT_CONTROLLER_STATE } from "../types";

describe("useMacroRecorder Hook", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("initializes with idle phase", () => {
    const { result } = renderHook(() => useMacroRecorder());
    expect(result.current.phase).toBe("idle");
    expect(result.current.countdown).toBe(3);
    expect(result.current.recordedActions).toEqual([]);
  });

  it("handles 3-2-1 countdown and transitions to recording phase", () => {
    const { result } = renderHook(() => useMacroRecorder());

    act(() => {
      result.current.startCountdown();
    });

    expect(result.current.phase).toBe("countdown");
    expect(result.current.countdown).toBe(3);

    // Advance 1s -> countdown 2
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.countdown).toBe(2);

    // Advance 1s -> countdown 1
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.countdown).toBe(1);

    // Advance 1s -> enters recording
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.phase).toBe("recording");
  });

  it("allows cancelling countdown before recording starts", () => {
    const { result } = renderHook(() => useMacroRecorder());

    act(() => {
      result.current.startCountdown();
    });
    expect(result.current.phase).toBe("countdown");

    act(() => {
      result.current.cancelCountdown();
    });
    expect(result.current.phase).toBe("idle");
    expect(result.current.countdown).toBe(3);
  });

  it("records button press down and release into macro action", () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useMacroRecorder({ onRecordingComplete: onComplete }));

    // Advance to recording
    act(() => {
      result.current.startCountdown();
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.phase).toBe("recording");

    // Press A down
    act(() => {
      result.current.feedControllerState({
        ...DEFAULT_CONTROLLER_STATE,
        a: true,
      });
      vi.advanceTimersByTime(150);
    });

    // Release A
    act(() => {
      result.current.feedControllerState({
        ...DEFAULT_CONTROLLER_STATE,
        a: false,
      });
    });

    expect(result.current.recordedActions.length).toBe(1);
    expect(result.current.recordedActions[0].button).toBe("a");
    expect(result.current.recordedActions[0].type).toBe("button");

    // Stop recording
    act(() => {
      result.current.stopRecording();
    });
    expect(result.current.phase).toBe("idle");
    expect(onComplete).toHaveBeenCalled();
  });
});
