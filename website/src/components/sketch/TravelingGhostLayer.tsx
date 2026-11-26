import { useEffect, useLayoutEffect, useRef } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  type AnimationPlaybackControls,
} from "framer-motion";
import { ROAMING_DOCK_ID, useGhostCompanion } from "./GhostCompanionContext";
import { GhostMascot } from "./GhostMascot";

// Fixed high-res base size used ONLY during GPU flight scaling; on landing we snap to native 1:1 width/height with scale=1 for razor-sharp SVG rendering.
const BASE_SIZE = 240;

export function TravelingGhostLayer() {
  const {
    activeDockId,
    activeConfig,
    isSleeping,
    gazeX,
    gazeY,
    getTargetViewportRect,
    subscribeScrollSync,
    wakeUp,
  } = useGhostCompanion();
  const prefersReducedMotion = Boolean(useReducedMotion());

  const layerRef = useRef<HTMLDivElement | null>(null);
  const positionModeRef = useRef<"absolute" | "fixed">("absolute");
  const isFlyingRef = useRef(false);
  const hasMountedRef = useRef(false);
  const flightTokenRef = useRef(0);
  const activeDockIdRef = useRef<string | null>(activeDockId);
  activeDockIdRef.current = activeDockId;

  const animControlsRef = useRef<AnimationPlaybackControls[]>([]);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const width = useMotionValue(BASE_SIZE);
  const height = useMotionValue(BASE_SIZE);
  const scale = useMotionValue(1);

  const stopAnimations = () => {
    flightTokenRef.current += 1;
    for (const ctrl of animControlsRef.current) {
      ctrl.stop();
    }
    animControlsRef.current = [];
  };

  const lockToDocument = (dockId: string) => {
    stopAnimations();
    const rect = getTargetViewportRect(dockId);
    const w = Math.round(rect.width > 0 ? rect.width : 160);
    const h = Math.round(rect.height > 0 ? rect.height : 160);
    if (layerRef.current) {
      layerRef.current.style.position = "absolute";
    }
    positionModeRef.current = "absolute";
    isFlyingRef.current = false;
    width.jump(w);
    height.jump(h);
    scale.jump(1);
    x.jump(Math.round(rect.x + window.scrollX));
    y.jump(Math.round(rect.y + window.scrollY));
  };

  const lockToViewport = (dockId: string) => {
    stopAnimations();
    const rect = getTargetViewportRect(dockId);
    const w = Math.round(rect.width > 0 ? rect.width : 76);
    const h = Math.round(rect.height > 0 ? rect.height : 76);
    if (layerRef.current) {
      layerRef.current.style.position = "fixed";
    }
    positionModeRef.current = "fixed";
    isFlyingRef.current = false;
    width.jump(w);
    height.jump(h);
    scale.jump(1);
    x.jump(Math.round(rect.x));
    y.jump(Math.round(rect.y));
  };

  const flyToTarget = (dockId: string, duration: number) => {
    stopAnimations();
    const token = flightTokenRef.current;
    const isTargetRoaming = dockId === ROAMING_DOCK_ID;
    const rect = getTargetViewportRect(dockId);
    const targetScale = rect.width > 0 ? rect.width / BASE_SIZE : 160 / BASE_SIZE;

    isFlyingRef.current = true;
    const spring = { type: "spring" as const, duration, bounce: 0 };

    const cx = animate(x, rect.x, spring);
    const cy = animate(y, rect.y, spring);
    const cs = animate(scale, targetScale, spring);
    animControlsRef.current = [cx, cy, cs];

    // Wait for ALL axes (x, y, scale) to settle before locking back to 1:1 native layout
    Promise.all([cx.finished, cy.finished, cs.finished]).then(() => {
      if (flightTokenRef.current !== token) return;
      if (activeDockIdRef.current !== dockId) return;
      if (isTargetRoaming) {
        lockToViewport(dockId);
      } else {
        lockToDocument(dockId);
      }
    });
  };

  // Switch between native 1:1 document-locked (zero scroll lag & razor-sharp SVG) and fixed-viewport GPU flight
  useLayoutEffect(() => {
    if (!activeDockId) return;
    const isTargetRoaming = activeDockId === ROAMING_DOCK_ID;

    if (!hasMountedRef.current || prefersReducedMotion) {
      hasMountedRef.current = true;
      if (isTargetRoaming) {
        lockToViewport(activeDockId);
      } else {
        lockToDocument(activeDockId);
      }
      return;
    }

    // Convert current visual position & size into fixed viewport + BASE_SIZE scale in the exact same frame
    const startVpX =
      positionModeRef.current === "absolute" ? x.get() - window.scrollX : x.get();
    const startVpY =
      positionModeRef.current === "absolute" ? y.get() - window.scrollY : y.get();
    const currentVisualSize = width.get() * scale.get();

    if (layerRef.current) {
      layerRef.current.style.position = "fixed";
    }
    positionModeRef.current = "fixed";
    width.jump(BASE_SIZE);
    height.jump(BASE_SIZE);
    scale.jump(currentVisualSize / BASE_SIZE);
    x.jump(startVpX);
    y.jump(startVpY);

    flyToTarget(activeDockId, 1.35);

    return () => {
      stopAnimations();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDockId, prefersReducedMotion]);

  // Keep position aligned during mid-flight scrolling or layout/resize changes
  useEffect(() => {
    return subscribeScrollSync((reason) => {
      const id = activeDockIdRef.current;
      if (!id) return;

      if (!isFlyingRef.current) {
        // While settled, scrolling requires ZERO JS work for both document-locked docks and fixed roaming perch!
        if (reason === "scroll") return;

        if (id === ROAMING_DOCK_ID) {
          lockToViewport(id);
        } else {
          const rect = getTargetViewportRect(id);
          const docX = Math.round(rect.x + window.scrollX);
          const docY = Math.round(rect.y + window.scrollY);
          const w = Math.round(rect.width > 0 ? rect.width : 160);
          const h = Math.round(rect.height > 0 ? rect.height : 160);
          if (
            Math.abs(x.get() - docX) > 1 ||
            Math.abs(y.get() - docY) > 1 ||
            Math.abs(width.get() - w) > 1 ||
            Math.abs(height.get() - h) > 1
          ) {
            width.jump(w);
            height.jump(h);
            scale.jump(1);
            x.jump(docX);
            y.jump(docY);
          }
        }
        return;
      }

      // Mid-flight: retarget smoothly AND preserve full-axis landing callback
      if (!prefersReducedMotion) {
        flyToTarget(id, 0.75);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribeScrollSync, getTargetViewportRect, prefersReducedMotion]);

  if (!activeDockId) return null;

  const isRoaming = activeDockId === ROAMING_DOCK_ID;
  const effectiveMood = isSleeping ? "sleeping" : activeConfig.mood ?? "happy";

  const mascotNode = (
    <GhostMascot
      className="h-full w-full"
      mood={effectiveMood}
      stickX={activeConfig.stickX}
      stickY={activeConfig.stickY}
      activeButtons={activeConfig.activeButtons}
      showSignals={activeConfig.showSignals ?? true}
      gazeX={gazeX}
      gazeY={gazeY}
    />
  );

  // NOTE: Do NOT pass inline style={{ position }} here, because React re-renders (e.g. sleep/wake)
  // would clobber the imperative layerRef.current.style.position ("absolute" vs "fixed")!
  return (
    <div
      ref={layerRef}
      className="pointer-events-none inset-0 z-20 overflow-x-clip"
      aria-live="off"
    >
      <motion.div
        style={{
          x,
          y,
          width,
          height,
          scale,
          transformOrigin: "top left",
        }}
        className={`absolute top-0 left-0 transition-opacity duration-300 ease-out ${
          isRoaming ? "opacity-92" : "opacity-100"
        }`}
      >
        {activeConfig.onPoke && !isRoaming ? (
          <button
            type="button"
            onClick={() => {
              wakeUp();
              activeConfig.onPoke?.();
            }}
            aria-label={activeConfig.ariaLabel ?? "Ghost-Pad"}
            className="pointer-events-auto block h-full w-full cursor-pointer rounded-full transition-[transform] duration-150 ease-out active:scale-[0.96]"
          >
            {mascotNode}
          </button>
        ) : (
          <div className="h-full w-full">{mascotNode}</div>
        )}
      </motion.div>
    </div>
  );
}
