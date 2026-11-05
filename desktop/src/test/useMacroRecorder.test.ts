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
    expect(typeof result.current.recordedActions[0].startTimeMs).toBe("number");

    // Stop recording
    act(() => {
      result.current.stopRecording();
    });
    expect(result.current.phase).toBe("idle");
    expect(onComplete).toHaveBeenCalled();
  });

  it("records simultaneous overlapping button presses with independent startTimeMs and durations", () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useMacroRecorder({ onRecordingComplete: onComplete }));

    // Start recording immediately
    act(() => {
      result.current.startCountdown();
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.phase).toBe("recording");

    // Advance 100ms, then press A
    act(() => {
      vi.advanceTimersByTime(100);
      result.current.feedControllerState({
        ...DEFAULT_CONTROLLER_STATE,
        a: true,
      });
    });

    // Advance 50ms (at 150ms), press B (while A is still held down)
    act(() => {
      vi.advanceTimersByTime(50);
      result.current.feedControllerState({
        ...DEFAULT_CONTROLLER_STATE,
        a: true,
        b: true,
      });
    });

    // Advance 150ms (at 300ms), release A (while B is still held down)
    act(() => {
      vi.advanceTimersByTime(150);
      result.current.feedControllerState({
        ...DEFAULT_CONTROLLER_STATE,
        a: false,
        b: true,
      });
    });

    // Advance 100ms (at 400ms), release B
    act(() => {
      vi.advanceTimersByTime(100);
      result.current.feedControllerState({
        ...DEFAULT_CONTROLLER_STATE,
        a: false,
        b: false,
      });
    });

    // Stop recording
    act(() => {
      result.current.stopRecording();
    });

    expect(onComplete).toHaveBeenCalled();
    const [finalActions] = onComplete.mock.calls[0];

    const actionA = finalActions.find((a: any) => a.button === "a");
    const actionB = finalActions.find((a: any) => a.button === "b");

    expect(actionA).toBeDefined();
    expect(actionB).toBeDefined();
    expect(actionA.startTimeMs).toBe(100);
    expect(actionA.durationMs).toBe(200);
    expect(actionB.startTimeMs).toBe(150);
    expect(actionB.durationMs).toBe(250);
  });
});
