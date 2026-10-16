import { useState, useRef, useEffect, useCallback } from "react";
import { ControllerState } from "../types";
import { MacroAction, MacroButtonName, RecordingPhase } from "../types/macro";
import { getStickDirection } from "../components/InputTimelineStream";

const BUTTON_KEYS: MacroButtonName[] = [
  "a",
  "b",
  "x",
  "y",
  "l",
  "r",
  "zl",
  "zr",
  "minus",
  "plus",
  "home",
  "capture",
  "l_stick_click",
  "r_stick_click",
];

interface RawActionWithTiming extends MacroAction {
  _startedAt: number;
  _endedAt: number;
}

interface InFlightStick {
  startedAt: number;
  direction: string;
  x: number;
  y: number;
}

interface InFlightDpad {
  startedAt: number;
  direction: number;
}

interface UseMacroRecorderOptions {
  onRecordingComplete?: (actions: MacroAction[], durationMs: number) => void;
}

export function useMacroRecorder(options?: UseMacroRecorderOptions) {
  const [phase, setPhase] = useState<RecordingPhase>("idle");
  const [countdown, setCountdown] = useState<number>(3);
  const [recordedActions, setRecordedActions] = useState<MacroAction[]>([]);
  const [recordingElapsedMs, setRecordingElapsedMs] = useState<number>(0);

  // Timers and refs
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartTimeRef = useRef<number>(0);

  // Active in-flight inputs
  const activeButtonsRef = useRef<Map<MacroButtonName, number>>(new Map()); // button -> startTime
  const activeStickLeftRef = useRef<InFlightStick | null>(null);
  const activeStickRightRef = useRef<InFlightStick | null>(null);
  const activeDpadRef = useRef<InFlightDpad | null>(null);

  // Completed actions tracking with exact timestamps for sorting
  const completedActionsRef = useRef<RawActionWithTiming[]>([]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, []);

  const startRecordingImmediate = useCallback(() => {
    setPhase("recording");
    const now = performance.now();
    recordingStartTimeRef.current = now;
    completedActionsRef.current = [];
    setRecordedActions([]);
    setRecordingElapsedMs(0);

    activeButtonsRef.current.clear();
    activeStickLeftRef.current = null;
    activeStickRightRef.current = null;
    activeDpadRef.current = null;

    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    elapsedTimerRef.current = setInterval(() => {
      setRecordingElapsedMs(Math.round(performance.now() - recordingStartTimeRef.current));
    }, 50);
  }, []);

  const startCountdown = useCallback(() => {
    if (phase !== "idle") return;
    setPhase("countdown");
    setCountdown(3);

    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    let current = 3;
    countdownTimerRef.current = setInterval(() => {
      current -= 1;
      if (current > 0) {
        setCountdown(current);
      } else {
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        startRecordingImmediate();
      }
    }, 1000);
  }, [phase, startRecordingImmediate]);

  const cancelCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setPhase("idle");
    setCountdown(3);
  }, []);

  const stopRecording = useCallback(() => {
    if (phase !== "recording") return;

    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }

    const now = performance.now();
    const finalDuration = Math.round(now - recordingStartTimeRef.current);

    // 1. Finalize any currently held down buttons
    activeButtonsRef.current.forEach((startTime, btn) => {
      const dur = Math.max(30, Math.round(now - startTime));
      completedActionsRef.current.push({
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: "button",
        button: btn,
        durationMs: dur,
        delayAfterMs: 40,
        note: `按壓 ${btn.toUpperCase()}`,
        _startedAt: startTime,
        _endedAt: now,
      });
    });
    activeButtonsRef.current.clear();

    // 2. Finalize active Left Stick
    if (activeStickLeftRef.current) {
      const { startedAt, x, y } = activeStickLeftRef.current;
      completedActionsRef.current.push({
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: "stick",
        stick: "left",
        stickX: x,
        stickY: y,
        durationMs: Math.max(40, Math.round(now - startedAt)),
        delayAfterMs: 40,
        note: `推動左搖桿`,
        _startedAt: startedAt,
        _endedAt: now,
      });
      activeStickLeftRef.current = null;
    }

    // 3. Finalize active Right Stick
    if (activeStickRightRef.current) {
      const { startedAt, x, y } = activeStickRightRef.current;
      completedActionsRef.current.push({
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: "stick",
        stick: "right",
        stickX: x,
        stickY: y,
        durationMs: Math.max(40, Math.round(now - startedAt)),
        delayAfterMs: 40,
        note: `推動右搖桿`,
        _startedAt: startedAt,
        _endedAt: now,
      });
      activeStickRightRef.current = null;
    }

    // 4. Finalize active D-Pad
    if (activeDpadRef.current) {
      const { startedAt, direction } = activeDpadRef.current;
      completedActionsRef.current.push({
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: "dpad",
        dpad: direction,
        durationMs: Math.max(40, Math.round(now - startedAt)),
        delayAfterMs: 40,
        note: `十字鍵`,
        _startedAt: startedAt,
        _endedAt: now,
      });
      activeDpadRef.current = null;
    }

    // 5. Sort all actions STRICTLY chronologically by _startedAt
    const sorted = [...completedActionsRef.current].sort((a, b) => a._startedAt - b._startedAt);

    // 6. Split gaps into independent 'wait' actions instead of embedding in delayAfterMs
    const finalActions: MacroAction[] = [];
    for (let idx = 0; idx < sorted.length; idx++) {
      const item = sorted[idx];
      finalActions.push({
        id: item.id,
        type: item.type,
        button: item.button,
        stick: item.stick,
        stickX: item.stickX,
        stickY: item.stickY,
        dpad: item.dpad,
        durationMs: item.durationMs,
        delayAfterMs: 0,
        note: item.note,
      });

      // If gap before next action >= 10ms, insert an independent wait action
      if (idx < sorted.length - 1) {
        const gap = Math.round(sorted[idx + 1]._startedAt - item._endedAt);
        if (gap >= 10) {
          finalActions.push({
            id: `act-wait-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            type: "wait",
            durationMs: gap,
            delayAfterMs: 0,
            note: "等待暫停",
          });
        }
      }
    }

    setRecordedActions(finalActions);
    setPhase("idle");

    if (options?.onRecordingComplete) {
      options.onRecordingComplete(finalActions, finalDuration);
    }
    return { actions: finalActions, durationMs: finalDuration };
  }, [phase, options]);

  // Feed live state into recorder
  const feedControllerState = useCallback(
    (state: ControllerState) => {
      if (phase !== "recording") return;

      const now = performance.now();

      // 1. Process Buttons
      for (const btn of BUTTON_KEYS) {
        const isPressed = Boolean(state[btn]);
        const wasPressed = activeButtonsRef.current.has(btn);

        if (isPressed && !wasPressed) {
          // Button down
          activeButtonsRef.current.set(btn, now);
        } else if (!isPressed && wasPressed) {
          // Button up -> record completed button action
          const startTime = activeButtonsRef.current.get(btn)!;
          activeButtonsRef.current.delete(btn);
          const duration = Math.max(20, Math.round(now - startTime));

          completedActionsRef.current.push({
            id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            type: "button",
            button: btn,
            durationMs: duration,
            delayAfterMs: 40,
            note: `按壓 ${btn.toUpperCase()}`,
            _startedAt: startTime,
            _endedAt: now,
          });

          // Live preview in sorted chronological order
          const liveSorted = [...completedActionsRef.current]
            .sort((a, b) => a._startedAt - b._startedAt)
            .map((item) => ({ ...item }));
          setRecordedActions(liveSorted);
        }
      }

      // 2. Process Left Stick Direction Transitions
      const currLDir = getStickDirection(state.left_stick_x, state.left_stick_y, "L");
      const prevLDir = activeStickLeftRef.current?.direction || null;

      if (currLDir !== prevLDir) {
        // Finalize previous direction if was active
        if (activeStickLeftRef.current) {
          const { startedAt, x, y } = activeStickLeftRef.current;
          completedActionsRef.current.push({
            id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            type: "stick",
            stick: "left",
            stickX: x,
            stickY: y,
            durationMs: Math.max(30, Math.round(now - startedAt)),
            delayAfterMs: 40,
            note: `左搖桿推動`,
            _startedAt: startedAt,
            _endedAt: now,
          });
          activeStickLeftRef.current = null;
        }

        // Start new direction if deflected
        if (currLDir) {
          activeStickLeftRef.current = {
            startedAt: now,
            direction: currLDir,
            x: state.left_stick_x,
            y: state.left_stick_y,
          };
        }

        const liveSorted = [...completedActionsRef.current]
          .sort((a, b) => a._startedAt - b._startedAt)
          .map((item) => ({ ...item }));
        setRecordedActions(liveSorted);
      }

      // 3. Process Right Stick Direction Transitions
      const currRDir = getStickDirection(state.right_stick_x, state.right_stick_y, "R");
      const prevRDir = activeStickRightRef.current?.direction || null;

      if (currRDir !== prevRDir) {
        if (activeStickRightRef.current) {
          const { startedAt, x, y } = activeStickRightRef.current;
          completedActionsRef.current.push({
            id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            type: "stick",
            stick: "right",
            stickX: x,
            stickY: y,
            durationMs: Math.max(30, Math.round(now - startedAt)),
            delayAfterMs: 40,
            note: `右搖桿推動`,
            _startedAt: startedAt,
            _endedAt: now,
          });
          activeStickRightRef.current = null;
        }

        if (currRDir) {
          activeStickRightRef.current = {
            startedAt: now,
            direction: currRDir,
            x: state.right_stick_x,
            y: state.right_stick_y,
          };
        }

        const liveSorted = [...completedActionsRef.current]
          .sort((a, b) => a._startedAt - b._startedAt)
          .map((item) => ({ ...item }));
        setRecordedActions(liveSorted);
      }

      // 4. Process D-Pad Direction Transitions
      const dpadVal = typeof state.dpad === "number" ? state.dpad : 8;
      const prevDpadVal = activeDpadRef.current?.direction ?? 8;

      if (dpadVal !== prevDpadVal) {
        if (activeDpadRef.current) {
          const { startedAt, direction } = activeDpadRef.current;
          completedActionsRef.current.push({
            id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            type: "dpad",
            dpad: direction,
            durationMs: Math.max(30, Math.round(now - startedAt)),
            delayAfterMs: 40,
            note: `十字鍵`,
            _startedAt: startedAt,
            _endedAt: now,
          });
          activeDpadRef.current = null;
        }

        if (dpadVal !== 8) {
          activeDpadRef.current = {
            startedAt: now,
            direction: dpadVal,
          };
        }

        const liveSorted = [...completedActionsRef.current]
          .sort((a, b) => a._startedAt - b._startedAt)
          .map((item) => ({ ...item }));
        setRecordedActions(liveSorted);
      }
    },
    [phase]
  );

  return {
    phase,
    countdown,
    recordedActions,
    recordingElapsedMs,
    startCountdown,
    cancelCountdown,
    stopRecording,
    feedControllerState,
  };
}
