import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  computeDpadVal,
  KEYBOARD_MAP,
  KEYBOARD_GUIDE,
  useVirtualGamepad,
} from "../hooks/useVirtualGamepad";
import { invoke } from "@tauri-apps/api/core";
import { DEFAULT_CONTROLLER_STATE } from "../types";

describe("useVirtualGamepad and helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("computeDpadVal", () => {
    it("returns 0 for Up only", () => {
      expect(computeDpadVal(true, false, false, false)).toBe(0);
    });

    it("returns 1 for Up + Right", () => {
      expect(computeDpadVal(true, false, false, true)).toBe(1);
    });

    it("returns 2 for Right only", () => {
      expect(computeDpadVal(false, false, false, true)).toBe(2);
    });

    it("returns 3 for Down + Right", () => {
      expect(computeDpadVal(false, true, false, true)).toBe(3);
    });

    it("returns 4 for Down only", () => {
      expect(computeDpadVal(false, true, false, false)).toBe(4);
    });

    it("returns 5 for Down + Left", () => {
      expect(computeDpadVal(false, true, true, false)).toBe(5);
    });

    it("returns 6 for Left only", () => {
      expect(computeDpadVal(false, false, true, false)).toBe(6);
    });

    it("returns 7 for Up + Left", () => {
      expect(computeDpadVal(true, false, true, false)).toBe(7);
    });

    it("returns 8 for Neutral / Opposing keys", () => {
      expect(computeDpadVal(false, false, false, false)).toBe(8);
      expect(computeDpadVal(true, true, false, false)).toBe(8);
      expect(computeDpadVal(false, false, true, true)).toBe(8);
    });
  });

  describe("KEYBOARD_MAP", () => {
    it("maps standard Nintendo layout ABXY keys", () => {
      expect(KEYBOARD_MAP["KeyL"]).toBe("a");
      expect(KEYBOARD_MAP["KeyK"]).toBe("b");
      expect(KEYBOARD_MAP["KeyI"]).toBe("x");
      expect(KEYBOARD_MAP["KeyJ"]).toBe("y");
    });

    it("maps arrow keys to D-pad", () => {
      expect(KEYBOARD_MAP["ArrowUp"]).toBe("dpad_up");
      expect(KEYBOARD_MAP["ArrowDown"]).toBe("dpad_down");
      expect(KEYBOARD_MAP["ArrowLeft"]).toBe("dpad_left");
      expect(KEYBOARD_MAP["ArrowRight"]).toBe("dpad_right");
    });

    it("maps shoulder triggers and system buttons", () => {
      expect(KEYBOARD_MAP["KeyQ"]).toBe("l");
      expect(KEYBOARD_MAP["KeyE"]).toBe("r");
      expect(KEYBOARD_MAP["KeyU"]).toBe("zl");
      expect(KEYBOARD_MAP["KeyO"]).toBe("zr");
      expect(KEYBOARD_MAP["KeyM"]).toBe("minus");
      expect(KEYBOARD_MAP["KeyP"]).toBe("plus");
      expect(KEYBOARD_MAP["KeyH"]).toBe("home");
      expect(KEYBOARD_MAP["KeyN"]).toBe("capture");
    });
  });

  describe("KEYBOARD_GUIDE", () => {
    it("has guide entries with valid labels and keys", () => {
      expect(KEYBOARD_GUIDE.length).toBeGreaterThan(10);
      KEYBOARD_GUIDE.forEach((item) => {
        expect(item.key).toBeTruthy();
        expect(item.button).toBeTruthy();
        expect(item.label).toBeTruthy();
      });
    });
  });

  describe("useVirtualGamepad hook", () => {
    it("calls invoke with send_virtual_button when sendButton is called and not muted", async () => {
      const setState = vi.fn();
      const { result } = renderHook(() => useVirtualGamepad(false, setState));

      await act(async () => {
        await result.current.sendButton("a", true);
      });

      expect(invoke).toHaveBeenCalledWith("send_virtual_button", {
        button: "a",
        pressed: true,
      });

      // Verify optimistic state update
      expect(setState).toHaveBeenCalled();
    });

    it("does not call invoke when isMuted is true", async () => {
      const setState = vi.fn();
      const { result } = renderHook(() => useVirtualGamepad(true, setState));

      await act(async () => {
        await result.current.sendButton("a", true);
        await result.current.sendStick("left", 200, 100);
      });

      expect(invoke).not.toHaveBeenCalled();
      expect(setState).not.toHaveBeenCalled();
    });

    it("calls invoke with send_virtual_stick when sendStick is called", async () => {
      const setState = vi.fn();
      const { result } = renderHook(() => useVirtualGamepad(false, setState));

      await act(async () => {
        await result.current.sendStick("left", 200, 100);
      });

      expect(invoke).toHaveBeenCalledWith("send_virtual_stick", {
        stick: "left",
        x: 200,
        y: 100,
      });
    });

    it("resets inputs when resetInputs is called", async () => {
      const setState = vi.fn();
      const { result } = renderHook(() => useVirtualGamepad(false, setState));

      await act(async () => {
        result.current.resetInputs();
      });

      expect(invoke).toHaveBeenCalledWith("reset_virtual_inputs");
      expect(setState).toHaveBeenCalled();
      const updater = setState.mock.calls[0][0];
      const nextState = typeof updater === "function" ? updater(DEFAULT_CONTROLLER_STATE) : updater;
      expect(nextState).toEqual(DEFAULT_CONTROLLER_STATE);
    });
  });
});
