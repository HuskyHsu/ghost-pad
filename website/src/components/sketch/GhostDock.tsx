import { useEffect, useRef } from "react";
import { useGhostDockRegistry, type GhostDockConfig } from "./GhostCompanionContext";

export interface GhostDockProps extends GhostDockConfig {
  id: string;
  className?: string;
}

export function GhostDock({
  id,
  className = "h-36 w-36",
  mood = "happy",
  stickX = 0,
  stickY = 0,
  activeButtons,
  showSignals = true,
  onPoke,
  ariaLabel,
}: GhostDockProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { activeDockId, registerDock, updateDockConfig, unregisterDock } =
    useGhostDockRegistry();

  const isDockedHere = activeDockId === id;

  // Register on mount / unregister on unmount
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    registerDock(id, el, {
      mood,
      stickX,
      stickY,
      activeButtons,
      showSignals,
      onPoke,
      ariaLabel,
    });
    return () => unregisterDock(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, registerDock, unregisterDock]);

  // Keep reactive props synced (e.g., InteractiveControls stick/buttons/mute or Hero poke)
  useEffect(() => {
    updateDockConfig(id, {
      mood,
      stickX,
      stickY,
      activeButtons,
      showSignals,
      onPoke,
      ariaLabel,
    });
  }, [id, mood, stickX, stickY, activeButtons, showSignals, onPoke, ariaLabel, updateDockConfig]);

  return (
    <div
      ref={ref}
      data-ghost-dock={id}
      className={`relative flex shrink-0 items-end justify-center ${className}`}
    >
      {/* Subtle sketchbook landing pad shown quietly only while the ghost is visiting another dock */}
      <div
        aria-hidden="true"
        className={`pointer-events-none mb-2 h-6 w-3/5 rounded-full border-2 border-dashed border-ink/18 bg-paper-warm/55 transition-opacity duration-300 ease-out ${
          isDockedHere ? "opacity-0" : "opacity-100"
        }`}
      />
    </div>
  );
}
