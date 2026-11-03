import { useCallback, useEffect, useRef } from "react";

export interface UsePulsedButtonPressOptions {
  minHoldMs?: number;
  onTriggerButton?: (button: string, pressed: boolean) => void;
}

/**
 * Reusable hook managing on-screen controller button presses.
 * Enforces a minimum hold duration (default 140ms) to guarantee that rapid taps
 * produce visible feedback and transmit reliable packets.
 * Supports pointer capture and accessibility keyboard activation (Enter/Space).
 * Automatically cleans up pending timers on unmount to prevent memory leaks.
 */
export function usePulsedButtonPress({
  minHoldMs = 140,
  onTriggerButton,
}: UsePulsedButtonPressOptions) {
  const pressTimeoutsRef = useRef<Record<string, number>>({});
  const pressStartTimesRef = useRef<Record<string, number>>({});

  // Ensure all active timeouts are cleared when the component unmounts
  useEffect(() => {
    const timeouts = pressTimeoutsRef.current;
    return () => {
      Object.values(timeouts).forEach((tid) => clearTimeout(tid));
    };
  }, []);

  const handleButtonPress = useCallback(
    (buttonName: string, pressed: boolean) => {
      const now = Date.now();
      if (pressed) {
        if (pressTimeoutsRef.current[buttonName]) {
          clearTimeout(pressTimeoutsRef.current[buttonName]);
          delete pressTimeoutsRef.current[buttonName];
        }
        pressStartTimesRef.current[buttonName] = now;
        onTriggerButton?.(buttonName, true);
      } else {
        const startTime = pressStartTimesRef.current[buttonName] || 0;
        const elapsed = now - startTime;
        if (elapsed < minHoldMs) {
          pressTimeoutsRef.current[buttonName] = window.setTimeout(() => {
            delete pressTimeoutsRef.current[buttonName];
            delete pressStartTimesRef.current[buttonName];
            onTriggerButton?.(buttonName, false);
          }, minHoldMs - elapsed);
        } else {
          delete pressStartTimesRef.current[buttonName];
          onTriggerButton?.(buttonName, false);
        }
      }
    },
    [minHoldMs, onTriggerButton]
  );

  const bindButton = useCallback(
    (buttonName: string) => ({
      type: "button" as const,
      onPointerDown: (e: React.PointerEvent) => {
        e.stopPropagation();
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch (_) {}
        handleButtonPress(buttonName, true);
      },
      onPointerUp: (e: React.PointerEvent) => {
        e.stopPropagation();
        try {
          if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
          }
        } catch (_) {}
        handleButtonPress(buttonName, false);
      },
      onPointerCancel: (e: React.PointerEvent) => {
        e.stopPropagation();
        try {
          if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
          }
        } catch (_) {}
        handleButtonPress(buttonName, false);
      },
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        // Keyboard accessibility (Space or Enter, e.detail === 0): pulse the button
        if (e.detail === 0) {
          handleButtonPress(buttonName, true);
          setTimeout(() => handleButtonPress(buttonName, false), minHoldMs);
        }
      },
    }),
    [handleButtonPress, minHoldMs]
  );

  return {
    handleButtonPress,
    bindButton,
  };
}
