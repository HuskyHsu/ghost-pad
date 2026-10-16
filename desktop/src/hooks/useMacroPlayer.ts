import { useState, useRef, useEffect, useCallback } from "react";
import {
  MacroScript,
  MacroPlaybackConfig,
  MacroPlayerStatus,
} from "../types/macro";

export const DEFAULT_PLAYBACK_CONFIG: MacroPlaybackConfig = {
  loopMode: "once",
  loopCount: 1,
  loopDelayMs: 500,
  speedMultiplier: 1.0,
};

interface UseMacroPlayerOptions {
  onTriggerButton?: (button: string, pressed: boolean) => void;
  onTriggerStick?: (stick: "left" | "right", x: number, y: number) => void;
  onTriggerDpad?: (direction: number) => void;
  onResetInputs?: () => void;
  onPlaybackComplete?: (script: MacroScript) => void;
}

export function useMacroPlayer(options?: UseMacroPlayerOptions) {
  const [status, setStatus] = useState<MacroPlayerStatus>({
    isPlaying: false,
    isPaused: false,
    currentScriptId: null,
    currentActionIndex: 0,
    currentLoop: 1,
    totalLoops: 1,
    progressPercent: 0,
    elapsedMs: 0,
  });

  const [config, setConfig] = useState<MacroPlaybackConfig>(DEFAULT_PLAYBACK_CONFIG);

  // Active script & options refs
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const activeScriptRef = useRef<MacroScript | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const currentActionIndexRef = useRef<number>(0);
  const currentLoopRef = useRef<number>(1);
  const configRef = useRef<MacroPlaybackConfig>(DEFAULT_PLAYBACK_CONFIG);
  configRef.current = config;

  // Timers
  const stepTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const releaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playheadTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loopStartTimeRef = useRef<number>(0);

  // Emergency Fail-Safe Stop
  const stop = useCallback(() => {
    if (stepTimeoutRef.current) {
      clearTimeout(stepTimeoutRef.current);
      stepTimeoutRef.current = null;
    }
    if (releaseTimeoutRef.current) {
      clearTimeout(releaseTimeoutRef.current);
      releaseTimeoutRef.current = null;
    }
    if (playheadTimerRef.current) {
      clearInterval(playheadTimerRef.current);
      playheadTimerRef.current = null;
    }

    isPlayingRef.current = false;
    isPausedRef.current = false;
    activeScriptRef.current = null;
    currentActionIndexRef.current = 0;
    currentLoopRef.current = 1;

    // Reset physical & virtual outputs to neutral immediately
    if (optionsRef.current?.onResetInputs) {
      optionsRef.current.onResetInputs();
    } else {
      // Fallback neutral triggers
      optionsRef.current?.onTriggerStick?.("left", 128, 128);
      optionsRef.current?.onTriggerStick?.("right", 128, 128);
      optionsRef.current?.onTriggerDpad?.(8);
    }

    setStatus({
      isPlaying: false,
      isPaused: false,
      currentScriptId: null,
      currentActionIndex: 0,
      currentLoop: 1,
      totalLoops: 1,
      progressPercent: 0,
      elapsedMs: 0,
    });
  }, []);

  // Global ESC shortcut to trigger emergency stop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isPlayingRef.current) {
        stop();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (stepTimeoutRef.current) clearTimeout(stepTimeoutRef.current);
      if (releaseTimeoutRef.current) clearTimeout(releaseTimeoutRef.current);
    };
  }, [stop]);

  // Execute single action step
  const executeStep = useCallback(
    (script: MacroScript, actionIndex: number, loopIndex: number) => {
      if (!isPlayingRef.current || isPausedRef.current) return;

      const actions = script.actions;
      if (actions.length === 0) {
        stop();
        return;
      }

      // Check if finished this loop
      if (actionIndex >= actions.length) {
        const loopMode = configRef.current.loopMode;
        const maxLoops = configRef.current.loopCount;
        const speed = configRef.current.speedMultiplier || 1.0;
        const delayBetween = Math.max(50, configRef.current.loopDelayMs / speed);

        const shouldContinue =
          loopMode === "infinite" || (loopMode === "count" && loopIndex < maxLoops);

        if (shouldContinue) {
          stepTimeoutRef.current = setTimeout(() => {
            if (!isPlayingRef.current || isPausedRef.current) return;
            loopStartTimeRef.current = performance.now();
            currentLoopRef.current = loopIndex + 1;
            currentActionIndexRef.current = 0;
            setStatus((prev) => ({
              ...prev,
              currentLoop: loopIndex + 1,
              currentActionIndex: 0,
              progressPercent: 0,
              elapsedMs: 0,
            }));
            executeStep(script, 0, loopIndex + 1);
          }, delayBetween);
          return;
        } else {
          // Playback finished completely
          stop();
          optionsRef.current?.onPlaybackComplete?.(script);
          return;
        }
      }

      const action = actions[actionIndex];
      const speed = configRef.current.speedMultiplier || 1.0;
      const duration = Math.max(10, Math.round(action.durationMs / speed));
      const delayAfter = action.delayAfterMs ? Math.round(action.delayAfterMs / speed) : 0;

      // Update progress
      const progress = Math.round(((actionIndex + 1) / actions.length) * 100);
      currentActionIndexRef.current = actionIndex;
      setStatus((prev) => ({
        ...prev,
        currentActionIndex: actionIndex,
        progressPercent: progress,
      }));

      // Trigger input based on action type
      if (action.type === "button" && action.button) {
        const btn = action.button;
        optionsRef.current?.onTriggerButton?.(btn, true);

        releaseTimeoutRef.current = setTimeout(() => {
          optionsRef.current?.onTriggerButton?.(btn, false);
        }, duration);
      } else if (action.type === "stick" && action.stick) {
        const sx = typeof action.stickX === "number" ? action.stickX : 128;
        const sy = typeof action.stickY === "number" ? action.stickY : 128;
        optionsRef.current?.onTriggerStick?.(action.stick, sx, sy);

        releaseTimeoutRef.current = setTimeout(() => {
          optionsRef.current?.onTriggerStick?.(action.stick!, 128, 128);
        }, duration);
      } else if (action.type === "dpad") {
        const d = typeof action.dpad === "number" ? action.dpad : 8;
        optionsRef.current?.onTriggerDpad?.(d);

        releaseTimeoutRef.current = setTimeout(() => {
          optionsRef.current?.onTriggerDpad?.(8);
        }, duration);
      }

      // Schedule next step after (duration + delayAfter)
      stepTimeoutRef.current = setTimeout(() => {
        executeStep(script, actionIndex + 1, loopIndex);
      }, duration + delayAfter);
    },
    [stop]
  );

  const play = useCallback(
    (script: MacroScript, overrideConfig?: Partial<MacroPlaybackConfig>) => {
      if (script.actions.length === 0) return;

      const effectiveConfig: MacroPlaybackConfig = {
        ...configRef.current,
        ...overrideConfig,
      };
      setConfig(effectiveConfig);
      configRef.current = effectiveConfig;

      activeScriptRef.current = script;
      isPlayingRef.current = true;
      isPausedRef.current = false;
      currentActionIndexRef.current = 0;
      currentLoopRef.current = 1;

      const totalLoops =
        effectiveConfig.loopMode === "infinite"
          ? Infinity
          : effectiveConfig.loopMode === "count"
          ? effectiveConfig.loopCount
          : 1;

      loopStartTimeRef.current = performance.now();
      if (playheadTimerRef.current) clearInterval(playheadTimerRef.current);
      playheadTimerRef.current = setInterval(() => {
        if (!isPlayingRef.current || isPausedRef.current) return;
        const now = performance.now();
        const speed = configRef.current.speedMultiplier || 1.0;
        const elapsed = Math.round((now - loopStartTimeRef.current) * speed);
        setStatus((prev) => ({
          ...prev,
          elapsedMs: elapsed,
        }));
      }, 16);

      setStatus({
        isPlaying: true,
        isPaused: false,
        currentScriptId: script.id,
        currentActionIndex: 0,
        currentLoop: 1,
        totalLoops,
        progressPercent: 0,
        elapsedMs: 0,
      });

      executeStep(script, 0, 1);
    },
    [executeStep]
  );

  const pause = useCallback(() => {
    if (!isPlayingRef.current || isPausedRef.current) return;
    if (stepTimeoutRef.current) clearTimeout(stepTimeoutRef.current);
    if (releaseTimeoutRef.current) clearTimeout(releaseTimeoutRef.current);

    isPausedRef.current = true;
    options?.onResetInputs?.();

    setStatus((prev) => ({ ...prev, isPaused: true }));
  }, [options]);

  const resume = useCallback(() => {
    if (!isPlayingRef.current || !isPausedRef.current || !activeScriptRef.current) return;

    isPausedRef.current = false;
    setStatus((prev) => ({ ...prev, isPaused: false }));

    executeStep(activeScriptRef.current, currentActionIndexRef.current, currentLoopRef.current);
  }, [executeStep]);

  return {
    status,
    config,
    setConfig,
    play,
    pause,
    resume,
    stop,
  };
}
