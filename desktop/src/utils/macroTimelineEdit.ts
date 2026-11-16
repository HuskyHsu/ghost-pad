import { MacroAction } from '../types/macro';

export interface TimelineGap {
  startMs: number;
  endMs: number;
  durationMs: number;
}

export interface SnapOptions {
  gridMs: number;
  snapThresholdMs?: number;
  disableSnap?: boolean;
}

export interface SnapResult {
  startTimeMs: number;
  guideTimeMs: number | null;
  snappedTo: 'neighbor' | 'grid' | 'none';
}

/**
 * Computes a snapped `startTimeMs` for a dragged action.
 * Prioritizes aligning the dragged action's start or end with other actions'
 * start/end edges within `snapThresholdMs`, falling back to `gridMs`.
 */
export function computeSnappedStartTime(
  rawStartMs: number,
  durationMs: number,
  otherActions: MacroAction[],
  options: SnapOptions,
): SnapResult {
  const clampedRaw = Math.max(0, rawStartMs);
  if (options.disableSnap) {
    return {
      startTimeMs: Math.round(clampedRaw),
      guideTimeMs: null,
      snappedTo: 'none',
    };
  }

  const threshold = options.snapThresholdMs ?? 25;
  const rawEnd = clampedRaw + durationMs;

  let bestDiff = threshold + 1;
  let bestStart = clampedRaw;
  let bestGuide: number | null = null;

  for (const act of otherActions) {
    if (act.type === 'wait') continue;
    const otherStart = Math.max(0, act.startTimeMs);
    const otherEnd = otherStart + Math.max(10, act.durationMs);

    // Check dragged start -> other start / other end
    for (const target of [otherStart, otherEnd]) {
      const diff = Math.abs(clampedRaw - target);
      if (diff <= threshold && diff < bestDiff) {
        bestDiff = diff;
        bestStart = target;
        bestGuide = target;
      }
    }

    // Check dragged end -> other start / other end
    for (const target of [otherStart, otherEnd]) {
      const candidateStart = target - durationMs;
      if (candidateStart < 0) continue;
      const diff = Math.abs(rawEnd - target);
      if (diff <= threshold && diff < bestDiff) {
        bestDiff = diff;
        bestStart = candidateStart;
        bestGuide = target;
      }
    }
  }

  if (bestGuide !== null) {
    return {
      startTimeMs: Math.max(0, Math.round(bestStart)),
      guideTimeMs: Math.round(bestGuide),
      snappedTo: 'neighbor',
    };
  }

  if (options.gridMs > 0) {
    const gridSnapped = Math.max(0, Math.round(clampedRaw / options.gridMs) * options.gridMs);
    return {
      startTimeMs: gridSnapped,
      guideTimeMs: null,
      snappedTo: 'grid',
    };
  }

  return {
    startTimeMs: Math.round(clampedRaw),
    guideTimeMs: null,
    snappedTo: 'none',
  };
}

/**
 * Returns true if two actions cannot overlap in time on the controller
 * (D-Pad directions, same-side analog sticks, or identical buttons).
 */
export function areActionsMutuallyExclusive(a: MacroAction, b: MacroAction): boolean {
  if (a.type === 'wait' || b.type === 'wait') return false;
  if (a.type !== b.type) return false;
  if (a.type === 'dpad') return true;
  if (a.type === 'stick') return a.stick === b.stick;
  if (a.type === 'button') return a.button === b.button;
  return false;
}

/**
 * Clamps `candidateStartMs` so that `draggedAction` (starting from `initialStartMs`)
 * cannot overlap or jump across any mutually exclusive action in `otherActions`.
 */
export function clampStartTimeWithoutOverlap(
  draggedAction: MacroAction,
  initialStartMs: number,
  candidateStartMs: number,
  otherActions: MacroAction[],
): number {
  const duration = Math.max(10, draggedAction.durationMs);
  const initialEnd = initialStartMs + duration;

  let minStart = 0;
  let maxStart = Number.POSITIVE_INFINITY;

  for (const other of otherActions) {
    if (!areActionsMutuallyExclusive(draggedAction, other)) continue;
    const otherStart = Math.max(0, other.startTimeMs);
    const otherEnd = otherStart + Math.max(10, other.durationMs);

    if (otherEnd <= initialStartMs) {
      minStart = Math.max(minStart, otherEnd);
    } else if (otherStart >= initialEnd) {
      maxStart = Math.min(maxStart, otherStart - duration);
    }
  }

  if (minStart > maxStart) {
    return Math.max(0, candidateStartMs);
  }

  return Math.max(minStart, Math.min(maxStart, candidateStartMs));
}

export interface DurationSnapResult {
  durationMs: number;
  guideTimeMs: number | null;
}

/**
 * Computes a snapped `durationMs` when resizing an action's right edge,
 * snapping its end timestamp to nearby actions or `gridMs`, and clamping
 * so it never overlaps any mutually exclusive action to its right.
 */
export function computeSnappedDuration(
  draggedAction: MacroAction,
  initialEndMs: number,
  rawDurationMs: number,
  otherActions: MacroAction[],
  options: SnapOptions,
): DurationSnapResult {
  const start = Math.max(0, draggedAction.startTimeMs);
  const minDuration = 10;
  const clampedRawDur = Math.max(minDuration, rawDurationMs);

  // Find hard upper bound from mutually exclusive actions to the right
  let maxEnd = Number.POSITIVE_INFINITY;
  for (const other of otherActions) {
    if (!areActionsMutuallyExclusive(draggedAction, other)) continue;
    const otherStart = Math.max(0, other.startTimeMs);
    if (otherStart >= initialEndMs) {
      maxEnd = Math.min(maxEnd, otherStart);
    }
  }

  const maxAllowedDur = maxEnd === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : Math.max(minDuration, maxEnd - start);

  if (options.disableSnap) {
    return {
      durationMs: Math.min(maxAllowedDur, Math.round(clampedRawDur)),
      guideTimeMs: null,
    };
  }

  const threshold = options.snapThresholdMs ?? 25;
  const rawEnd = start + clampedRawDur;

  let bestDiff = threshold + 1;
  let bestEnd = rawEnd;
  let bestGuide: number | null = null;

  for (const act of otherActions) {
    if (act.type === 'wait') continue;
    const otherStart = Math.max(0, act.startTimeMs);
    const otherEnd = otherStart + Math.max(10, act.durationMs);

    for (const target of [otherStart, otherEnd]) {
      if (target < start + minDuration) continue;
      if (target > maxEnd) continue;
      const diff = Math.abs(rawEnd - target);
      if (diff <= threshold && diff < bestDiff) {
        bestDiff = diff;
        bestEnd = target;
        bestGuide = target;
      }
    }
  }

  if (bestGuide !== null) {
    return {
      durationMs: Math.min(maxAllowedDur, Math.max(minDuration, Math.round(bestEnd - start))),
      guideTimeMs: Math.round(bestGuide),
    };
  }

  const gridDur = options.gridMs > 0 ? Math.max(minDuration, Math.round(clampedRawDur / options.gridMs) * options.gridMs) : Math.round(clampedRawDur);
  return {
    durationMs: Math.min(maxAllowedDur, gridDur),
    guideTimeMs: null,
  };
}

export interface LeftResizeSnapResult {
  startTimeMs: number;
  durationMs: number;
  guideTimeMs: number | null;
}

/**
 * Computes a snapped `{ startTimeMs, durationMs }` when resizing an action's left edge
 * while keeping its end timestamp (`initialStartMs + initialDurationMs`) fixed.
 * Respects `0ms` floor, `10ms` minimum duration, and mutually exclusive actions to the left.
 */
export function computeSnappedLeftResize(
  draggedAction: MacroAction,
  initialStartMs: number,
  initialDurationMs: number,
  rawStartMs: number,
  otherActions: MacroAction[],
  options: SnapOptions,
): LeftResizeSnapResult {
  const fixedEnd = Math.max(10, initialStartMs + initialDurationMs);
  const minDuration = 10;
  const maxStart = Math.max(0, fixedEnd - minDuration);

  let minStart = 0;
  for (const other of otherActions) {
    if (!areActionsMutuallyExclusive(draggedAction, other)) continue;
    const otherStart = Math.max(0, other.startTimeMs);
    const otherEnd = otherStart + Math.max(10, other.durationMs);
    if (otherEnd <= initialStartMs) {
      minStart = Math.max(minStart, otherEnd);
    }
  }
  minStart = Math.min(minStart, maxStart);

  const clampedRaw = Math.max(minStart, Math.min(maxStart, rawStartMs));

  if (options.disableSnap) {
    const start = Math.max(minStart, Math.min(maxStart, Math.round(clampedRaw)));
    return {
      startTimeMs: start,
      durationMs: Math.max(minDuration, fixedEnd - start),
      guideTimeMs: null,
    };
  }

  const threshold = options.snapThresholdMs ?? 25;
  let bestDiff = threshold + 1;
  let bestStart = clampedRaw;
  let bestGuide: number | null = null;

  for (const act of otherActions) {
    if (act.type === 'wait') continue;
    const otherStart = Math.max(0, act.startTimeMs);
    const otherEnd = otherStart + Math.max(10, act.durationMs);

    for (const target of [otherStart, otherEnd]) {
      if (target < minStart || target > maxStart) continue;
      const diff = Math.abs(clampedRaw - target);
      if (diff <= threshold && diff < bestDiff) {
        bestDiff = diff;
        bestStart = target;
        bestGuide = target;
      }
    }
  }

  if (bestGuide !== null) {
    const start = Math.max(minStart, Math.min(maxStart, Math.round(bestStart)));
    return {
      startTimeMs: start,
      durationMs: Math.max(minDuration, fixedEnd - start),
      guideTimeMs: Math.round(bestGuide),
    };
  }

  const gridStart = options.gridMs > 0 ? Math.round(clampedRaw / options.gridMs) * options.gridMs : Math.round(clampedRaw);
  const start = Math.max(minStart, Math.min(maxStart, gridStart));
  return {
    startTimeMs: start,
    durationMs: Math.max(minDuration, fixedEnd - start),
    guideTimeMs: null,
  };
}

export interface SubRowLayout<T> {
  rowCount: number;
  items: Array<{ item: T; subRow: number }>;
}

/**
 * Packs overlapping timeline items in a single lane into non-overlapping sub-rows.
 * Items that only touch at boundaries (`prevEnd <= nextStart`) share the same sub-row.
 */
export function assignSubRows<T extends { startTimeMs: number; endTimeMs: number }>(items: T[]): SubRowLayout<T> {
  if (items.length === 0) {
    return { rowCount: 1, items: [] };
  }

  const sorted = [...items].sort((a, b) => a.startTimeMs - b.startTimeMs || a.endTimeMs - b.endTimeMs);
  const rowEnds: number[] = [];
  const placed: Array<{ item: T; subRow: number }> = [];

  for (const item of sorted) {
    let assignedRow = -1;
    for (let r = 0; r < rowEnds.length; r++) {
      if (rowEnds[r] <= item.startTimeMs) {
        assignedRow = r;
        rowEnds[r] = item.endTimeMs;
        break;
      }
    }
    if (assignedRow === -1) {
      assignedRow = rowEnds.length;
      rowEnds.push(item.endTimeMs);
    }
    placed.push({ item, subRow: assignedRow });
  }

  return {
    rowCount: Math.max(1, rowEnds.length),
    items: placed,
  };
}

/**
 * Finds all empty intervals where no non-wait input action is active.
 * Includes leading gap from 0ms if the first non-wait action starts after 0ms,
 * and trailing gap if `wait` actions extend past the last non-wait action.
 */
export function findEmptyGaps(actions: MacroAction[], minGapMs = 20): TimelineGap[] {
  const busy = actions
    .filter((act) => act.type !== 'wait')
    .map((act) => {
      const start = Math.max(0, act.startTimeMs);
      const end = start + Math.max(10, act.durationMs);
      return { start, end };
    })
    .sort((a, b) => a.start - b.start);

  const maxWaitEnd = actions
    .filter((act) => act.type === 'wait')
    .reduce((max, act) => Math.max(max, Math.max(0, act.startTimeMs) + Math.max(10, act.durationMs)), 0);

  if (busy.length === 0) {
    if (maxWaitEnd >= minGapMs) {
      return [{ startMs: 0, endMs: maxWaitEnd, durationMs: maxWaitEnd }];
    }
    return [];
  }

  // Merge overlapping busy intervals
  const merged: Array<{ start: number; end: number }> = [busy[0]];
  for (let i = 1; i < busy.length; i++) {
    const prev = merged[merged.length - 1];
    if (busy[i].start <= prev.end) {
      prev.end = Math.max(prev.end, busy[i].end);
    } else {
      merged.push({ ...busy[i] });
    }
  }

  const gaps: TimelineGap[] = [];

  if (merged[0].start >= minGapMs) {
    gaps.push({
      startMs: 0,
      endMs: merged[0].start,
      durationMs: merged[0].start,
    });
  }

  for (let i = 0; i < merged.length - 1; i++) {
    const gapStart = merged[i].end;
    const gapEnd = merged[i + 1].start;
    const duration = gapEnd - gapStart;
    if (duration >= minGapMs) {
      gaps.push({
        startMs: gapStart,
        endMs: gapEnd,
        durationMs: duration,
      });
    }
  }

  const lastBusyEnd = merged[merged.length - 1].end;
  if (maxWaitEnd - lastBusyEnd >= minGapMs) {
    gaps.push({
      startMs: lastBusyEnd,
      endMs: maxWaitEnd,
      durationMs: maxWaitEnd - lastBusyEnd,
    });
  }

  return gaps;
}

/**
 * Resizes an empty gap `[gapStartMs, gapEndMs]` from its right edge to `newDurationMs`.
 * - Expanding (`newDurationMs > oldDuration`) shifts all actions at or after `gapEndMs` forward.
 * - Shrinking (`newDurationMs < oldDuration`) shifts them backward.
 * - Setting `newDurationMs = 0` completely closes the gap and removes enclosed `wait` actions.
 */
export function resizeGapInterval(
  actions: MacroAction[],
  gapStartMs: number,
  gapEndMs: number,
  newDurationMs: number,
): MacroAction[] {
  const oldDuration = gapEndMs - gapStartMs;
  if (oldDuration <= 0) return actions;

  const clampedDuration = Math.max(0, newDurationMs);
  const delta = clampedDuration - oldDuration;
  if (delta === 0) return actions;

  return actions
    .filter((act) => {
      if (clampedDuration > 0 || act.type !== 'wait') return true;
      const start = Math.max(0, act.startTimeMs);
      const end = start + Math.max(10, act.durationMs);
      // Remove wait actions wholly contained within the closed gap
      return !(start >= gapStartMs && end <= gapEndMs);
    })
    .map((act) => {
      const start = Math.max(0, act.startTimeMs);
      if (start >= gapEndMs) {
        return {
          ...act,
          startTimeMs: Math.max(gapStartMs, start + delta),
        };
      }

      if (act.type === 'wait') {
        const end = start + Math.max(10, act.durationMs);
        if (start >= gapStartMs && end <= gapEndMs) {
          return {
            ...act,
            durationMs: Math.max(10, act.durationMs + delta),
          };
        }
      }

      return act;
    });
}

/**
 * Resizes an empty gap `[gapStartMs, gapEndMs]` by moving its left edge (`gapStartMs`)
 * by `deltaMs` (shifting all actions ending at or before `gapStartMs` by `deltaMs`).
 * Clamped so no action starts before 0ms and `gapStartMs` does not exceed `gapEndMs`.
 */
export function resizeGapFromLeft(
  actions: MacroAction[],
  gapStartMs: number,
  gapEndMs: number,
  deltaMs: number,
): MacroAction[] {
  if (gapStartMs <= 0 && deltaMs < 0) return actions;

  const leftActions = actions.filter((act) => {
    const start = Math.max(0, act.startTimeMs);
    const end = start + Math.max(10, act.durationMs);
    return end <= gapStartMs;
  });

  if (leftActions.length === 0) return actions;

  const minLeftStart = Math.min(...leftActions.map((a) => Math.max(0, a.startTimeMs)));
  const maxRightShift = gapEndMs - gapStartMs;
  const clampedDelta = Math.max(-minLeftStart, Math.min(maxRightShift, deltaMs));

  if (clampedDelta === 0) return actions;

  return actions.map((act) => {
    const start = Math.max(0, act.startTimeMs);
    const end = start + Math.max(10, act.durationMs);
    if (end <= gapStartMs) {
      return {
        ...act,
        startTimeMs: Math.max(0, start + clampedDelta),
      };
    }
    return act;
  });
}
