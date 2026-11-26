import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMotionValue, useSpring, type MotionValue } from "framer-motion";
import type { GhostMascotProps } from "./GhostMascot";

export const IDLE_SLEEP_MS = 8000;
export const ROAMING_DOCK_ID = "__roaming__";
const ROAMING_SIZE_DESKTOP = 76;
const ROAMING_SIZE_MOBILE = 64;
const ROAMING_MARGIN_PX = 20;
const HYSTERESIS_PX = 80;
const MAX_GAZE_PX = 3.8;
const WAKE_THROTTLE_MS = 500;

export type SyncReason = "scroll" | "layout";

export interface GhostDockConfig {
  mood?: Exclude<GhostMascotProps["mood"], "sleeping">;
  stickX?: number;
  stickY?: number;
  activeButtons?: string[];
  showSignals?: boolean;
  onPoke?: () => void;
  ariaLabel?: string;
}

export interface ViewportRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RegisteredDock {
  id: string;
  element: HTMLElement;
  config: GhostDockConfig;
}

interface GhostDockRegistryValue {
  activeDockId: string | null;
  registerDock: (id: string, element: HTMLElement, config: GhostDockConfig) => void;
  updateDockConfig: (id: string, config: GhostDockConfig) => void;
  unregisterDock: (id: string) => void;
}

interface GhostLayerContextValue {
  activeDockId: string | null;
  activeConfig: GhostDockConfig;
  isSleeping: boolean;
  gazeX: MotionValue<number>;
  gazeY: MotionValue<number>;
  getTargetViewportRect: (dockId: string | null) => ViewportRect;
  subscribeScrollSync: (listener: (reason: SyncReason) => void) => () => void;
  wakeUp: () => void;
}

const GhostDockRegistryContext = createContext<GhostDockRegistryValue | null>(null);
const GhostLayerContext = createContext<GhostLayerContextValue | null>(null);

function configsEqual(a: GhostDockConfig, b: GhostDockConfig): boolean {
  if (
    a.mood !== b.mood ||
    a.stickX !== b.stickX ||
    a.stickY !== b.stickY ||
    a.showSignals !== b.showSignals ||
    a.ariaLabel !== b.ariaLabel ||
    a.onPoke !== b.onPoke
  ) {
    return false;
  }
  const ab = a.activeButtons ?? [];
  const bb = b.activeButtons ?? [];
  if (ab.length !== bb.length) return false;
  for (let i = 0; i < ab.length; i++) {
    if (ab[i] !== bb[i]) return false;
  }
  return true;
}

function computeRoamingRect(
  side: "left" | "right",
  yRatio: number,
): ViewportRect {
  const vw = typeof window !== "undefined" ? window.innerWidth || 1024 : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight || 768 : 768;

  if (vw < 1024) {
    return {
      x: Math.max(16, vw - ROAMING_SIZE_MOBILE - 16),
      y: Math.max(16, vh - ROAMING_SIZE_MOBILE - 16),
      width: ROAMING_SIZE_MOBILE,
      height: ROAMING_SIZE_MOBILE,
    };
  }

  const x =
    side === "left"
      ? ROAMING_MARGIN_PX
      : Math.max(ROAMING_MARGIN_PX, vw - ROAMING_SIZE_DESKTOP - ROAMING_MARGIN_PX);
  const minY = 96;
  const maxY = Math.max(minY, vh - ROAMING_SIZE_DESKTOP - 28);
  const rawY = Math.round(vh * yRatio - ROAMING_SIZE_DESKTOP / 2);
  const y = Math.max(minY, Math.min(maxY, rawY));

  return {
    x,
    y,
    width: ROAMING_SIZE_DESKTOP,
    height: ROAMING_SIZE_DESKTOP,
  };
}

export function GhostCompanionProvider({ children }: { children: ReactNode }) {
  const docksRef = useRef<Map<string, RegisteredDock>>(new Map());
  const activeDockIdRef = useRef<string | null>(null);
  const roamingSideRef = useRef<"left" | "right">("right");
  const roamingYRatioRef = useRef<number>(0.42);

  // Cached active center in viewport coordinates so pointermove never forces layout reflow
  const cachedCenterRef = useRef<{ cx: number; cy: number; valid: boolean }>({
    cx: 0,
    cy: 0,
    valid: false,
  });

  const isSleepingRef = useRef(false);
  const lastWakeResetRef = useRef(0);
  const idleTimerRef = useRef<number | null>(null);
  const evalRafRef = useRef<number | null>(null);
  const pendingReasonRef = useRef<SyncReason>("scroll");
  const gazeRafRef = useRef<number | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const scrollListenersRef = useRef<Set<(reason: SyncReason) => void>>(new Set());

  const [activeDockId, setActiveDockId] = useState<string | null>(null);
  const [activeConfig, setActiveConfig] = useState<GhostDockConfig>({
    mood: "happy",
    showSignals: true,
  });
  const [isSleeping, setIsSleeping] = useState(false);

  const rawGazeX = useMotionValue(0);
  const rawGazeY = useMotionValue(0);
  const gazeX = useSpring(rawGazeX, { stiffness: 180, damping: 24 });
  const gazeY = useSpring(rawGazeY, { stiffness: 180, damping: 24 });

  const getTargetViewportRect = useCallback((dockId: string | null): ViewportRect => {
    if (!dockId || dockId === ROAMING_DOCK_ID) {
      return computeRoamingRect(roamingSideRef.current, roamingYRatioRef.current);
    }
    const dock = docksRef.current.get(dockId);
    if (!dock) {
      return computeRoamingRect(roamingSideRef.current, roamingYRatioRef.current);
    }
    const rect = dock.element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      return { x: 0, y: 0, width: 160, height: 160 };
    }
    return {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    };
  }, []);

  const updateCachedCenter = useCallback((rect: ViewportRect) => {
    if (rect.width > 0 && rect.height > 0) {
      cachedCenterRef.current = {
        cx: rect.x + rect.width / 2,
        cy: rect.y + rect.height / 2,
        valid: true,
      };
    } else {
      cachedCenterRef.current.valid = false;
    }
  }, []);

  const notifyScrollSync = useCallback((reason: SyncReason) => {
    scrollListenersRef.current.forEach((fn) => fn(reason));
  }, []);

  const subscribeScrollSync = useCallback((listener: (reason: SyncReason) => void) => {
    scrollListenersRef.current.add(listener);
    return () => {
      scrollListenersRef.current.delete(listener);
    };
  }, []);

  const evaluateActiveDock = useCallback(
    (reason: SyncReason = "layout") => {
      const docks = Array.from(docksRef.current.values());
      if (docks.length === 0) return;

      const viewportH = window.innerHeight || 800;
      const targetY = viewportH * 0.44;
      const entryTop = viewportH * 0.18;
      const entryBottom = viewportH * 0.72;
      const stayTop = viewportH * 0.12;
      const stayBottom = viewportH * 0.82;
      const docHeight = document.documentElement.scrollHeight || 0;
      const nearTop = window.scrollY < 80;
      const nearBottom =
        docHeight > viewportH + 100 &&
        window.scrollY + viewportH >= docHeight - 140;

      let anyHasLayout = false;
      let bestCandidate: { id: string; dist: number } | null = null;
      let currentStayDist: number | null = null;
      let ctaInView = false;
      let measuredRects: Map<string, DOMRect> | null = null;

      for (const dock of docks) {
        const rect = dock.element.getBoundingClientRect();
        const hasLayout = rect.width > 0 && rect.height > 0;
        if (hasLayout) anyHasLayout = true;
        if (!hasLayout) continue;

        if (!measuredRects) measuredRects = new Map();
        measuredRects.set(dock.id, rect);

        const centerY = rect.top + rect.height / 2;
        const inStayZone =
          (centerY >= stayTop && centerY <= stayBottom) ||
          (nearTop && dock.id === "hero" && rect.bottom > 80) ||
          (nearBottom && dock.id === "cta" && rect.top < viewportH - 40);
        const inEntryZone =
          (centerY >= entryTop && centerY <= entryBottom) ||
          (nearTop && dock.id === "hero" && rect.bottom > 80);

        if (dock.id === "cta" && rect.top < viewportH - 40 && rect.bottom > 80) {
          ctaInView = true;
        }

        const dist = Math.abs(centerY - targetY);

        if (dock.id === activeDockIdRef.current && inStayZone) {
          currentStayDist = dist;
        }
        if (inEntryZone && (!bestCandidate || dist < bestCandidate.dist)) {
          bestCandidate = { id: dock.id, dist };
        }
      }

      let nextId: string | null = activeDockIdRef.current;

      if (!anyHasLayout) {
        nextId = docks[0].id;
      } else if (nearBottom && ctaInView) {
        nextId = "cta";
      } else if (bestCandidate) {
        if (
          nextId === null ||
          nextId === ROAMING_DOCK_ID ||
          currentStayDist === null ||
          (bestCandidate.id !== nextId && bestCandidate.dist + HYSTERESIS_PX < currentStayDist)
        ) {
          nextId = bestCandidate.id;
        }
      } else if (currentStayDist === null) {
        nextId = ROAMING_DOCK_ID;
      }

      if (nextId !== activeDockIdRef.current) {
        const prevId = activeDockIdRef.current;

        if (nextId === ROAMING_DOCK_ID && prevId && prevId !== ROAMING_DOCK_ID) {
          const r =
            measuredRects?.get(prevId) ??
            docksRef.current.get(prevId)?.element.getBoundingClientRect();
          if (r && r.width > 0) {
            const vw = window.innerWidth || 1024;
            const centerX = r.left + r.width / 2;
            const centerY = r.top + r.height / 2;
            roamingSideRef.current = centerX < vw / 2 ? "left" : "right";
            roamingYRatioRef.current = Math.max(0.24, Math.min(0.56, centerY / viewportH));
          }
        }

        activeDockIdRef.current = nextId;
        setActiveDockId(nextId);
        if (nextId === ROAMING_DOCK_ID) {
          setActiveConfig({ mood: "happy", showSignals: true });
        } else {
          const chosen = nextId ? docksRef.current.get(nextId) : null;
          if (chosen) {
            setActiveConfig(chosen.config);
          }
        }
      }

      // Refresh cached gaze center from already-measured rect (no extra reflow!)
      if (nextId === ROAMING_DOCK_ID) {
        updateCachedCenter(computeRoamingRect(roamingSideRef.current, roamingYRatioRef.current));
      } else if (nextId && measuredRects?.has(nextId)) {
        const r = measuredRects.get(nextId)!;
        updateCachedCenter({ x: r.left, y: r.top, width: r.width, height: r.height });
      }

      notifyScrollSync(reason);
    },
    [notifyScrollSync, updateCachedCenter],
  );

  const scheduleEvaluate = useCallback(
    (reason: SyncReason) => {
      if (reason === "layout") {
        pendingReasonRef.current = "layout";
      }
      if (evalRafRef.current !== null) return;
      evalRafRef.current = window.requestAnimationFrame(() => {
        evalRafRef.current = null;
        const r = pendingReasonRef.current;
        pendingReasonRef.current = "scroll";
        evaluateActiveDock(r);
      });
    },
    [evaluateActiveDock],
  );

  const wakeUp = useCallback((force = false) => {
    const now = Date.now();
    if (isSleepingRef.current) {
      isSleepingRef.current = false;
      setIsSleeping(false);
    } else if (!force && now - lastWakeResetRef.current < WAKE_THROTTLE_MS) {
      // Avoid clearing & recreating timers at 120Hz on continuous mouse/scroll input
      return;
    }

    lastWakeResetRef.current = now;
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = window.setTimeout(() => {
      isSleepingRef.current = true;
      setIsSleeping(true);
    }, IDLE_SLEEP_MS);
  }, []);

  useEffect(() => {
    if (isSleeping) {
      rawGazeX.set(0);
      rawGazeY.set(0);
    }
  }, [isSleeping, rawGazeX, rawGazeY]);

  useEffect(() => {
    wakeUp(true);

    const onScroll = () => {
      wakeUp();
      scheduleEvaluate("scroll");
    };

    const onResize = () => {
      scheduleEvaluate("layout");
    };

    const flushGaze = () => {
      gazeRafRef.current = null;
      const ptr = lastPointerRef.current;
      const center = cachedCenterRef.current;
      if (!ptr || !center.valid || isSleepingRef.current) return;

      const dx = ptr.x - center.cx;
      const dy = ptr.y - center.cy;
      const dist = Math.hypot(dx, dy);

      if (dist < 2) {
        rawGazeX.set(0);
        rawGazeY.set(0);
        return;
      }

      const strength = Math.min(1, dist / 220);
      rawGazeX.set((dx / dist) * MAX_GAZE_PX * strength);
      rawGazeY.set((dy / dist) * MAX_GAZE_PX * strength);
    };

    const onPointerMove = (e: PointerEvent) => {
      wakeUp();
      if (e.pointerType === "touch") return;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      if (gazeRafRef.current === null) {
        gazeRafRef.current = window.requestAnimationFrame(flushGaze);
      }
    };

    const onActivity = () => {
      wakeUp();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity, { passive: true });
    window.addEventListener("touchstart", onActivity, { passive: true });

    let bodyObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && document.body) {
      bodyObserver = new ResizeObserver(() => {
        scheduleEvaluate("layout");
      });
      bodyObserver.observe(document.body);
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("touchstart", onActivity);
      bodyObserver?.disconnect();
      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current);
      }
      if (evalRafRef.current !== null) {
        window.cancelAnimationFrame(evalRafRef.current);
      }
      if (gazeRafRef.current !== null) {
        window.cancelAnimationFrame(gazeRafRef.current);
      }
    };
  }, [wakeUp, scheduleEvaluate, rawGazeX, rawGazeY]);

  const registerDock = useCallback(
    (id: string, element: HTMLElement, config: GhostDockConfig) => {
      docksRef.current.set(id, { id, element, config });
      evaluateActiveDock("layout");
    },
    [evaluateActiveDock],
  );

  const updateDockConfig = useCallback((id: string, config: GhostDockConfig) => {
    const existing = docksRef.current.get(id);
    if (!existing) return;
    if (configsEqual(existing.config, config)) return;
    existing.config = config;
    if (activeDockIdRef.current === id) {
      setActiveConfig(config);
    }
  }, []);

  const unregisterDock = useCallback(
    (id: string) => {
      docksRef.current.delete(id);
      if (activeDockIdRef.current === id) {
        activeDockIdRef.current = null;
        evaluateActiveDock("layout");
      }
    },
    [evaluateActiveDock],
  );

  // Split contexts so GhostDock slots never re-render when activeConfig (key presses) or isSleeping changes
  const registryValue = useMemo<GhostDockRegistryValue>(
    () => ({
      activeDockId,
      registerDock,
      updateDockConfig,
      unregisterDock,
    }),
    [activeDockId, registerDock, updateDockConfig, unregisterDock],
  );

  const layerValue = useMemo<GhostLayerContextValue>(
    () => ({
      activeDockId,
      activeConfig,
      isSleeping,
      gazeX,
      gazeY,
      getTargetViewportRect,
      subscribeScrollSync,
      wakeUp: () => wakeUp(true),
    }),
    [
      activeDockId,
      activeConfig,
      isSleeping,
      gazeX,
      gazeY,
      getTargetViewportRect,
      subscribeScrollSync,
      wakeUp,
    ],
  );

  return (
    <GhostDockRegistryContext.Provider value={registryValue}>
      <GhostLayerContext.Provider value={layerValue}>
        {children}
      </GhostLayerContext.Provider>
    </GhostDockRegistryContext.Provider>
  );
}

export function useGhostDockRegistry() {
  const ctx = useContext(GhostDockRegistryContext);
  if (!ctx) {
    throw new Error("useGhostDockRegistry must be used inside GhostCompanionProvider");
  }
  return ctx;
}

export function useGhostCompanion() {
  const ctx = useContext(GhostLayerContext);
  if (!ctx) {
    throw new Error("useGhostCompanion must be used inside GhostCompanionProvider");
  }
  return ctx;
}
