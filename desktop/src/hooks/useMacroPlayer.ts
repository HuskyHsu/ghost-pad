import { useCallback, useEffect, useRef, useState } from 'react';
import { MacroPlaybackConfig, MacroPlayerStatus, MacroScript } from '../types/macro';
import { getScriptTotalDurationMs } from '../utils/macroStorage';

export const DEFAULT_PLAYBACK_CONFIG: MacroPlaybackConfig = {
  loopMode: 'once',
  loopCount: 1,
  loopDelayMs: 500,
  speedMultiplier: 1.0,
};

interface UseMacroPlayerOptions {
  onTriggerButton?: (button: string, pressed: boolean) => void;
  onTriggerStick?: (stick: 'left' | 'right', x: number, y: number) => void;
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
  const currentLoopRef = useRef<number>(1);
  const configRef = useRef<MacroPlaybackConfig>(DEFAULT_PLAYBACK_CONFIG);
  configRef.current = config;

  // Active leases to prevent button release race conditions
  const activeButtonCountsRef = useRef<Map<string, number>>(new Map());
  const activeSticksRef = useRef<{ left: number; right: number }>({ left: 0, right: 0 });
  const activeDpadCountRef = useRef<number>(0);

  // Timers and playhead
  const pendingTimeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const playheadTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loopStartTimeRef = useRef<number>(0);
  const pausedOffsetMsRef = useRef<number>(0);

  const clearAllScheduled = useCallback(() => {
    pendingTimeoutsRef.current.forEach((t) => clearTimeout(t));
    pendingTimeoutsRef.current = [];
  }, []);

  const resetActiveLeasesAndOutputs = useCallback(() => {
    activeButtonCountsRef.current.clear();
    activeSticksRef.current = { left: 0, right: 0 };
    activeDpadCountRef.current = 0;

    if (optionsRef.current?.onResetInputs) {
      optionsRef.current.onResetInputs();
    } else {
      optionsRef.current?.onTriggerStick?.('left', 128, 128);
      optionsRef.current?.onTriggerStick?.('right', 128, 128);
      optionsRef.current?.onTriggerDpad?.(8);
    }
  }, []);

  // Emergency Fail-Safe Stop
  const stop = useCallback(() => {
    clearAllScheduled();
    if (playheadTimerRef.current) {
      clearInterval(playheadTimerRef.current);
      playheadTimerRef.current = null;
    }

    isPlayingRef.current = false;
    isPausedRef.current = false;
    activeScriptRef.current = null;
    currentLoopRef.current = 1;
    pausedOffsetMsRef.current = 0;

    resetActiveLeasesAndOutputs();

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
  }, [clearAllScheduled, resetActiveLeasesAndOutputs]);

  // Global ESC shortcut to trigger emergency stop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPlayingRef.current) {
        stop();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearAllScheduled();
    };
  }, [stop, clearAllScheduled]);

  // Schedule all timeline events for the current loop starting from offsetMs
  const scheduleLoopTimeline = useCallback(
    (script: MacroScript, loopIndex: number, offsetMs: number) => {
      if (!isPlayingRef.current || isPausedRef.current) return;

      clearAllScheduled();
      const speed = configRef.current.speedMultiplier || 1.0;
      const totalDuration = Math.max(50, getScriptTotalDurationMs(script));

      // 1. Schedule each action's press and release events
      script.actions.forEach((act) => {
        const actStart = act.startTimeMs;
        const actEnd = act.startTimeMs + act.durationMs;

        // Press (Activate)
        if (actStart >= offsetMs) {
          const delayStart = Math.max(0, Math.round((actStart - offsetMs) / speed));
          const activate = () => {
            if (!isPlayingRef.current || isPausedRef.current) return;

            if (act.type === 'button' && act.button) {
              const count = (activeButtonCountsRef.current.get(act.button) || 0) + 1;
              activeButtonCountsRef.current.set(act.button, count);
              if (count === 1) {
                optionsRef.current?.onTriggerButton?.(act.button, true);
              }
            } else if (act.type === 'stick' && act.stick) {
              const sx = typeof act.stickX === 'number' ? act.stickX : 128;
              const sy = typeof act.stickY === 'number' ? act.stickY : 128;
              if (act.stick === 'left') activeSticksRef.current.left++;
              else activeSticksRef.current.right++;
              optionsRef.current?.onTriggerStick?.(act.stick, sx, sy);
            } else if (act.type === 'dpad') {
              activeDpadCountRef.current++;
              const d = typeof act.dpad === 'number' ? act.dpad : 8;
              optionsRef.current?.onTriggerDpad?.(d);
            }
          };

          if (delayStart === 0) {
            activate();
          } else {
            const tId = setTimeout(activate, delayStart);
            pendingTimeoutsRef.current.push(tId);
          }
        }

        // Release (Deactivate)
        if (actEnd > offsetMs) {
          const delayEnd = Math.max(10, Math.round((actEnd - offsetMs) / speed));
          const tId = setTimeout(() => {
            if (!isPlayingRef.current || isPausedRef.current) return;

            if (act.type === 'button' && act.button) {
              const count = (activeButtonCountsRef.current.get(act.button) || 1) - 1;
              if (count <= 0) {
                activeButtonCountsRef.current.delete(act.button);
                optionsRef.current?.onTriggerButton?.(act.button, false);
              } else {
                activeButtonCountsRef.current.set(act.button, count);
              }
            } else if (act.type === 'stick' && act.stick) {
              if (act.stick === 'left') activeSticksRef.current.left = Math.max(0, activeSticksRef.current.left - 1);
              else activeSticksRef.current.right = Math.max(0, activeSticksRef.current.right - 1);

              const stillActive = act.stick === 'left' ? activeSticksRef.current.left > 0 : activeSticksRef.current.right > 0;
              if (!stillActive) {
                optionsRef.current?.onTriggerStick?.(act.stick, 128, 128);
              }
            } else if (act.type === 'dpad') {
              activeDpadCountRef.current = Math.max(0, activeDpadCountRef.current - 1);
              if (activeDpadCountRef.current <= 0) {
                optionsRef.current?.onTriggerDpad?.(8);
              }
            }
          }, delayEnd);
          pendingTimeoutsRef.current.push(tId);
        }
      });

      // 2. Schedule Loop Completion
      const delayLoopEnd = Math.max(20, Math.round((totalDuration - offsetMs) / speed));
      const endTimeoutId = setTimeout(() => {
        if (!isPlayingRef.current || isPausedRef.current) return;

        resetActiveLeasesAndOutputs();

        const loopMode = configRef.current.loopMode;
        const maxLoops = configRef.current.loopCount;
        const shouldContinue = loopMode === 'infinite' || (loopMode === 'count' && loopIndex < maxLoops);

        if (shouldContinue) {
          const delayBetween = Math.max(50, Math.round((configRef.current.loopDelayMs || 500) / speed));
          const nextLoopId = setTimeout(() => {
            if (!isPlayingRef.current || isPausedRef.current) return;
            loopStartTimeRef.current = performance.now();
            currentLoopRef.current = loopIndex + 1;
            setStatus((prev) => ({
              ...prev,
              currentLoop: loopIndex + 1,
              progressPercent: 0,
              elapsedMs: 0,
            }));
            scheduleLoopTimeline(script, loopIndex + 1, 0);
          }, delayBetween);
          pendingTimeoutsRef.current.push(nextLoopId);
        } else {
          // Playback finished completely
          stop();
          optionsRef.current?.onPlaybackComplete?.(script);
        }
      }, delayLoopEnd);

      pendingTimeoutsRef.current.push(endTimeoutId);
    },
    [clearAllScheduled, resetActiveLeasesAndOutputs, stop],
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
      currentLoopRef.current = 1;
      pausedOffsetMsRef.current = 0;

      const totalLoops = effectiveConfig.loopMode === 'infinite' ? Infinity : effectiveConfig.loopMode === 'count' ? effectiveConfig.loopCount : 1;
      const totalDuration = Math.max(50, getScriptTotalDurationMs(script));

      loopStartTimeRef.current = performance.now();
      if (playheadTimerRef.current) clearInterval(playheadTimerRef.current);
      playheadTimerRef.current = setInterval(() => {
        if (!isPlayingRef.current || isPausedRef.current) return;
        const now = performance.now();
        const speed = configRef.current.speedMultiplier || 1.0;
        const elapsed = Math.round((now - loopStartTimeRef.current) * speed);

        // Find currently active action index for UI feedback
        let activeIdx = 0;
        const idx = script.actions.findIndex((a) => elapsed >= a.startTimeMs && elapsed < a.startTimeMs + a.durationMs);
        if (idx !== -1) {
          activeIdx = idx;
        } else {
          // Closest past action
          const past = script.actions.filter((a) => a.startTimeMs <= elapsed);
          activeIdx = Math.max(0, past.length - 1);
        }

        const pct = Math.min(100, Math.round((elapsed / totalDuration) * 100));
        setStatus((prev) => ({
          ...prev,
          currentActionIndex: activeIdx,
          progressPercent: pct,
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

      scheduleLoopTimeline(script, 1, 0);
    },
    [scheduleLoopTimeline],
  );

  const pause = useCallback(() => {
    if (!isPlayingRef.current || isPausedRef.current) return;
    clearAllScheduled();

    const speed = configRef.current.speedMultiplier || 1.0;
    const elapsed = Math.round((performance.now() - loopStartTimeRef.current) * speed);
    pausedOffsetMsRef.current = elapsed;

    isPausedRef.current = true;
    resetActiveLeasesAndOutputs();

    setStatus((prev) => ({ ...prev, isPaused: true }));
  }, [clearAllScheduled, resetActiveLeasesAndOutputs]);

  const resume = useCallback(() => {
    if (!isPlayingRef.current || !isPausedRef.current || !activeScriptRef.current) return;

    const speed = configRef.current.speedMultiplier || 1.0;
    loopStartTimeRef.current = performance.now() - pausedOffsetMsRef.current / speed;

    isPausedRef.current = false;
    setStatus((prev) => ({ ...prev, isPaused: false }));

    scheduleLoopTimeline(activeScriptRef.current, currentLoopRef.current, pausedOffsetMsRef.current);
  }, [scheduleLoopTimeline]);

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
