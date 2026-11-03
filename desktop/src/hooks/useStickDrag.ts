import { useState, useRef, useEffect, useCallback } from "react";

export interface UseStickDragOptions {
  stickMaxTravel: number;
  tapThreshold?: number;
  getScale?: () => number;
  onTriggerStick?: (stick: "left" | "right", x: number, y: number) => void;
  onButtonPress?: (button: string, pressed: boolean) => void;
}

/**
 * Reusable hook for analog stick dragging with pointer capture,
 * hardware-accelerated direct DOM transform, requestAnimationFrame IPC throttling,
 * scale compensation, and tap detection for L3/R3 clicks.
 */
export function useStickDrag({
  stickMaxTravel,
  tapThreshold = 6,
  getScale,
  onTriggerStick,
  onButtonPress,
}: UseStickDragOptions) {
  const leftStickBaseRef = useRef<HTMLDivElement>(null);
  const rightStickBaseRef = useRef<HTMLDivElement>(null);
  const leftKnobRef = useRef<HTMLDivElement>(null);
  const rightKnobRef = useRef<HTMLDivElement>(null);

  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);

  // Active cleanup tracker for unmount
  const activeCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (activeCleanupRef.current) {
        activeCleanupRef.current();
        activeCleanupRef.current = null;
      }
    };
  }, []);

  const startStickDrag = useCallback(
    (
      stick: "left" | "right",
      baseRef: React.RefObject<HTMLDivElement | null>,
      knobRef: React.RefObject<HTMLDivElement | null>,
      setDragging: (d: boolean) => void,
      e: React.PointerEvent<HTMLDivElement>
    ) => {
      e.preventDefault();
      const base = baseRef.current;
      const knob = knobRef.current;
      if (!base) return;

      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch (_) {}

      setDragging(true);
      if (knob) {
        knob.style.transition = "none";
      }

      const rect = base.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      let totalMoved = 0;

      let targetStickX = 128;
      let targetStickY = 128;
      let lastDispatchedX = 128;
      let lastDispatchedY = 128;
      let rafId: number | null = null;

      const handlePointerMove = (moveEv: PointerEvent) => {
        const scale = getScale ? getScale() || 1 : 1;
        const dx = (moveEv.clientX - centerX) / scale;
        const dy = (moveEv.clientY - centerY) / scale;
        totalMoved += Math.abs(moveEv.movementX || 0) + Math.abs(moveEv.movementY || 0);

        const dist = Math.hypot(dx, dy);
        const clampedDist = Math.min(dist, stickMaxTravel);
        const angle = Math.atan2(dy, dx);

        const clampedX = clampedDist > 0 ? Math.cos(angle) * clampedDist : 0;
        const clampedY = clampedDist > 0 ? Math.sin(angle) * clampedDist : 0;

        // 1. Direct hardware-accelerated DOM update for smooth 120Hz tracking
        if (knob) {
          knob.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0)`;
        }

        // 2. Compute Switch stick coordinates (0..255)
        const normX = clampedDist > 0 ? clampedX / stickMaxTravel : 0;
        const normY = clampedDist > 0 ? clampedY / stickMaxTravel : 0;
        targetStickX = Math.round(Math.max(0, Math.min(255, 128 + normX * 127)));
        targetStickY = Math.round(Math.max(0, Math.min(255, 128 - normY * 127)));

        // 3. Throttle IPC via requestAnimationFrame
        if (rafId === null) {
          rafId = requestAnimationFrame(() => {
            rafId = null;
            if (targetStickX !== lastDispatchedX || targetStickY !== lastDispatchedY) {
              lastDispatchedX = targetStickX;
              lastDispatchedY = targetStickY;
              onTriggerStick?.(stick, targetStickX, targetStickY);
            }
          });
        }
      };

      const handlePointerUp = (upEv: PointerEvent) => {
        cleanup();

        try {
          if (base && base.hasPointerCapture(upEv.pointerId)) {
            base.releasePointerCapture(upEv.pointerId);
          }
        } catch (_) {}

        setDragging(false);

        // Snap back with tactile spring animation
        if (knob) {
          knob.style.transition = "transform 0.18s cubic-bezier(0.18, 0.89, 0.32, 1.28)";
          knob.style.transform = "translate3d(0px, 0px, 0)";
        }

        // Send neutral center coordinate
        onTriggerStick?.(stick, 128, 128);

        // Tap without drag triggers L3 / R3 click
        const upDx = upEv.clientX - centerX;
        const upDy = upEv.clientY - centerY;
        const upDist = Math.hypot(upDx, upDy);
        if (totalMoved < tapThreshold || upDist < tapThreshold) {
          const btn = stick === "left" ? "l3" : "r3";
          onButtonPress?.(btn, true);
          setTimeout(() => {
            onButtonPress?.(btn, false);
          }, 140);
        }
      };

      const cleanup = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        activeCleanupRef.current = null;
      };

      activeCleanupRef.current = cleanup;

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    },
    [getScale, onButtonPress, onTriggerStick, stickMaxTravel, tapThreshold]
  );

  return {
    leftStickBaseRef,
    rightStickBaseRef,
    leftKnobRef,
    rightKnobRef,
    isDraggingLeft,
    isDraggingRight,
    setIsDraggingLeft,
    setIsDraggingRight,
    startStickDrag,
  };
}
