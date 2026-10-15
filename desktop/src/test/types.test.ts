import { describe, it, expect } from "vitest";
import { DEFAULT_CONTROLLER_STATE } from "../types";

describe("DEFAULT_CONTROLLER_STATE", () => {
  it("initializes analog sticks to neutral 128", () => {
    expect(DEFAULT_CONTROLLER_STATE.left_stick_x).toBe(128);
    expect(DEFAULT_CONTROLLER_STATE.left_stick_y).toBe(128);
    expect(DEFAULT_CONTROLLER_STATE.right_stick_x).toBe(128);
    expect(DEFAULT_CONTROLLER_STATE.right_stick_y).toBe(128);
  });

  it("initializes D-pad to center (8)", () => {
    expect(DEFAULT_CONTROLLER_STATE.dpad).toBe(8);
  });

  it("initializes all digital action and shoulder buttons to false", () => {
    expect(DEFAULT_CONTROLLER_STATE.a).toBe(false);
    expect(DEFAULT_CONTROLLER_STATE.b).toBe(false);
    expect(DEFAULT_CONTROLLER_STATE.x).toBe(false);
    expect(DEFAULT_CONTROLLER_STATE.y).toBe(false);
    expect(DEFAULT_CONTROLLER_STATE.l).toBe(false);
    expect(DEFAULT_CONTROLLER_STATE.r).toBe(false);
    expect(DEFAULT_CONTROLLER_STATE.zl).toBe(false);
    expect(DEFAULT_CONTROLLER_STATE.zr).toBe(false);
    expect(DEFAULT_CONTROLLER_STATE.minus).toBe(false);
    expect(DEFAULT_CONTROLLER_STATE.plus).toBe(false);
    expect(DEFAULT_CONTROLLER_STATE.home).toBe(false);
    expect(DEFAULT_CONTROLLER_STATE.capture).toBe(false);
    expect(DEFAULT_CONTROLLER_STATE.l_stick_click).toBe(false);
    expect(DEFAULT_CONTROLLER_STATE.r_stick_click).toBe(false);
  });
});
