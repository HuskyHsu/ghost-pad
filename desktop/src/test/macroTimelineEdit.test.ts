import { describe, expect, it } from 'vitest';
import { MacroAction } from '../types/macro';
import {
  areActionsMutuallyExclusive,
  assignSubRows,
  clampStartTimeWithoutOverlap,
  computeSnappedDuration,
  computeSnappedLeftResize,
  computeSnappedStartTime,
  findEmptyGaps,
  resizeGapFromLeft,
  resizeGapInterval,
} from '../utils/macroTimelineEdit';

const btn = (id: string, button: 'a' | 'b' | 'x', startTimeMs: number, durationMs: number): MacroAction => ({
  id,
  type: 'button',
  button,
  startTimeMs,
  durationMs,
});

const wait = (id: string, startTimeMs: number, durationMs: number): MacroAction => ({
  id,
  type: 'wait',
  startTimeMs,
  durationMs,
});

describe('macroTimelineEdit', () => {
  describe('findEmptyGaps', () => {
    it('detects empty gaps between merged busy intervals', () => {
      const actions = [
        btn('1', 'a', 100, 150), // 100..250
        btn('2', 'b', 200, 100), // overlaps -> merged 100..300
        wait('w1', 300, 200),
        btn('3', 'x', 500, 100), // 500..600
      ];
      const gaps = findEmptyGaps(actions);
      expect(gaps).toEqual([
        { startMs: 0, endMs: 100, durationMs: 100 },
        { startMs: 300, endMs: 500, durationMs: 200 },
      ]);
    });

    it('detects trailing wait intervals past the last non-wait action', () => {
      const actions = [btn('1', 'a', 0, 150), wait('w1', 150, 200)];
      const gaps = findEmptyGaps(actions);
      expect(gaps).toEqual([{ startMs: 150, endMs: 350, durationMs: 200 }]);

      const expanded = resizeGapInterval(actions, 150, 350, 400);
      expect(findEmptyGaps(expanded)).toEqual([{ startMs: 150, endMs: 550, durationMs: 400 }]);

      const removed = resizeGapInterval(actions, 150, 350, 0);
      expect(removed).toHaveLength(1);
    });
  });

  describe('resizeGapInterval (right edge / modal duration)', () => {
    it('expands a gap and shifts subsequent actions forward', () => {
      const actions = [btn('1', 'a', 0, 150), btn('2', 'b', 350, 100), btn('3', 'x', 500, 100)];
      const next = resizeGapInterval(actions, 150, 350, 400);
      expect(next.map((a) => a.startTimeMs)).toEqual([0, 550, 700]);
    });

    it('shrinks a gap and shifts subsequent actions backward', () => {
      const actions = [btn('1', 'a', 0, 150), btn('2', 'b', 350, 100)];
      const next = resizeGapInterval(actions, 150, 350, 50);
      expect(next.map((a) => a.startTimeMs)).toEqual([0, 200]);
    });

    it('closes a gap when newDurationMs is 0 and removes enclosed waits', () => {
      const actions = [
        btn('1', 'a', 0, 150),
        wait('w1', 150, 200),
        btn('2', 'b', 350, 100),
        btn('3', 'x', 500, 100),
      ];
      const next = resizeGapInterval(actions, 150, 350, 0);
      expect(next).toHaveLength(3);
      expect(next.map((a) => ({ id: a.id, start: a.startTimeMs }))).toEqual([
        { id: '1', start: 0 },
        { id: '2', start: 150 },
        { id: '3', start: 300 },
      ]);
    });
  });

  describe('resizeGapFromLeft (left edge)', () => {
    it('shifts left-side actions right to shrink the gap, clamped at gapEndMs', () => {
      const actions = [btn('1', 'a', 0, 150), btn('2', 'b', 350, 100)];
      const next = resizeGapFromLeft(actions, 150, 350, 100);
      expect(next.map((a) => a.startTimeMs)).toEqual([100, 350]);

      // Clamped so it does not push past gapEndMs (350)
      const clamped = resizeGapFromLeft(actions, 150, 350, 300);
      expect(clamped.map((a) => a.startTimeMs)).toEqual([200, 350]);
    });

    it('clamps leftward shift so no action starts before 0ms', () => {
      const actions = [btn('1', 'a', 50, 100), btn('2', 'b', 350, 100)];
      const next = resizeGapFromLeft(actions, 150, 350, -100);
      expect(next.map((a) => a.startTimeMs)).toEqual([0, 350]);
    });
  });

  describe('computeSnappedStartTime', () => {
    const others: MacroAction[] = [
      btn('1', 'a', 100, 150), // 100..250
      btn('2', 'b', 500, 100), // 500..600
    ];

    it('snaps dragged start to neighbor start or end within threshold', () => {
      const snapToStart = computeSnappedStartTime(112, 80, others, { gridMs: 50, snapThresholdMs: 25 });
      expect(snapToStart).toEqual({ startTimeMs: 100, guideTimeMs: 100, snappedTo: 'neighbor' });

      const snapToEnd = computeSnappedStartTime(238, 80, others, { gridMs: 50, snapThresholdMs: 25 });
      expect(snapToEnd).toEqual({ startTimeMs: 250, guideTimeMs: 250, snappedTo: 'neighbor' });
    });

    it('snaps dragged end to neighbor start or end within threshold', () => {
      // Dragged duration=100, rawStart=390 -> rawEnd=490, within 10ms of other start 500 -> snappedStart=400
      const snapEndToStart = computeSnappedStartTime(390, 100, others, { gridMs: 50, snapThresholdMs: 25 });
      expect(snapEndToStart).toEqual({ startTimeMs: 400, guideTimeMs: 500, snappedTo: 'neighbor' });
    });

    it('falls back to grid snapping when no neighbor is within threshold', () => {
      const gridSnap = computeSnappedStartTime(332, 80, others, { gridMs: 50, snapThresholdMs: 20 });
      expect(gridSnap).toEqual({ startTimeMs: 350, guideTimeMs: null, snappedTo: 'grid' });
    });

    it('bypasses all snapping when disableSnap is true', () => {
      const free = computeSnappedStartTime(112.4, 80, others, { gridMs: 50, snapThresholdMs: 25, disableSnap: true });
      expect(free).toEqual({ startTimeMs: 112, guideTimeMs: null, snappedTo: 'none' });
    });
  });

  describe('areActionsMutuallyExclusive & clampStartTimeWithoutOverlap', () => {
    const dpadUp: MacroAction = { id: 'd1', type: 'dpad', dpad: 0, startTimeMs: 100, durationMs: 100 };
    const dpadRight: MacroAction = { id: 'd2', type: 'dpad', dpad: 2, startTimeMs: 250, durationMs: 100 };
    const dpadDown: MacroAction = { id: 'd3', type: 'dpad', dpad: 4, startTimeMs: 450, durationMs: 100 };
    const leftStick: MacroAction = { id: 's1', type: 'stick', stick: 'left', stickX: 0, stickY: 128, startTimeMs: 0, durationMs: 100 };
    const rightStick: MacroAction = { id: 's2', type: 'stick', stick: 'right', stickX: 255, stickY: 128, startTimeMs: 0, durationMs: 100 };

    it('treats D-Pad, same-side sticks, and identical buttons as mutually exclusive, but allows ABXY or L/R sticks', () => {
      expect(areActionsMutuallyExclusive(dpadUp, dpadRight)).toBe(true);
      expect(areActionsMutuallyExclusive(leftStick, rightStick)).toBe(false);
      expect(areActionsMutuallyExclusive(btn('1', 'a', 0, 100), btn('2', 'b', 0, 100))).toBe(false);
      expect(areActionsMutuallyExclusive(btn('1', 'a', 0, 100), btn('2', 'a', 200, 100))).toBe(true);
    });

    it('blocks dragging a D-Pad action into or across neighboring D-Pad intervals', () => {
      const others = [dpadUp, dpadDown];
      // dpadRight (250..350, duration 100) dragged left to 150 -> clamped at dpadUp end (200)
      expect(clampStartTimeWithoutOverlap(dpadRight, 250, 150, others)).toBe(200);
      // dpadRight dragged right to 400 -> clamped at dpadDown start - duration (450 - 100 = 350)
      expect(clampStartTimeWithoutOverlap(dpadRight, 250, 400, others)).toBe(350);
      // dpadRight dragged to 280 -> allowed
      expect(clampStartTimeWithoutOverlap(dpadRight, 250, 280, others)).toBe(280);
    });
  });

  describe('assignSubRows', () => {
    it('stacks overlapping items into separate sub-rows and reuses rows when non-overlapping', () => {
      const items = [
        { id: 'a', startTimeMs: 0, endTimeMs: 150 },
        { id: 'b', startTimeMs: 50, endTimeMs: 200 },
        { id: 'x', startTimeMs: 150, endTimeMs: 250 }, // touches 'a' at 150 -> can share row 0
        { id: 'y', startTimeMs: 160, endTimeMs: 260 }, // overlaps 'x' (row 0) and 'b' (row 1) -> row 2
      ];
      const layout = assignSubRows(items);
      expect(layout.rowCount).toBe(3);
      expect(layout.items.map((x) => [x.item.id, x.subRow])).toEqual([
        ['a', 0],
        ['b', 1],
        ['x', 0],
        ['y', 2],
      ]);
    });
  });

  describe('computeSnappedDuration', () => {
    const a1 = btn('1', 'a', 100, 100); // 100..200
    const a2 = btn('2', 'a', 350, 100); // 350..450 (same button 'a', mutually exclusive)
    const b1 = btn('3', 'b', 300, 100); // 300..400 (different button 'b', allowed to overlap)

    it('snaps right edge to nearby action start/end and clamps before mutually exclusive action', () => {
      // Snap to b1 start (300) -> duration = 200
      expect(computeSnappedDuration(a1, 200, 192, [a2, b1], { gridMs: 10, snapThresholdMs: 25 })).toEqual({
        durationMs: 200,
        guideTimeMs: 300,
      });

      // Dragging past a2 start (350) is clamped at 350 - 100 = 250
      expect(computeSnappedDuration(a1, 200, 320, [a2, b1], { gridMs: 10, snapThresholdMs: 25 }).durationMs).toBe(250);
    });
  });

  describe('computeSnappedLeftResize', () => {
    const a1 = btn('1', 'a', 100, 100); // 100..200 (mutually exclusive)
    const b1 = btn('2', 'b', 250, 100); // 250..350 (different button)
    const a2 = btn('3', 'a', 300, 150); // 300..450

    it('keeps end fixed, snaps to nearby edges, and clamps at mutually exclusive action end', () => {
      // Snap left edge of a2 (300..450) to b1 start (250) -> start=250, duration=200
      expect(computeSnappedLeftResize(a2, 300, 150, 260, [a1, b1], { gridMs: 10, snapThresholdMs: 25 })).toEqual({
        startTimeMs: 250,
        durationMs: 200,
        guideTimeMs: 250,
      });

      // Dragging left past a1 end (200) is clamped at 200 -> duration=250
      expect(computeSnappedLeftResize(a2, 300, 150, 120, [a1, b1], { gridMs: 10, snapThresholdMs: 25 })).toEqual({
        startTimeMs: 200,
        durationMs: 250,
        guideTimeMs: 200,
      });
    });
  });
});
