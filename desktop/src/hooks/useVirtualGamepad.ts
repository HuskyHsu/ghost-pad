import { useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ControllerState, DEFAULT_CONTROLLER_STATE } from "../types";

export { isTauriAvailable } from "../utils/tauri";
import { isTauriAvailable } from "../utils/tauri";

// Keyboard Key to Controller Button Mapping
export const KEYBOARD_MAP: Record<string, string> = {
  // Action Buttons (ABXY diamond - Nintendo layout)
  KeyL: "a", // East
  KeyK: "b", // South
  KeyI: "x", // North
  KeyJ: "y", // West

  // Triggers / Bumpers
  KeyQ: "l",
  KeyE: "r",
  KeyU: "zl",
  Digit1: "zl",
  KeyO: "zr",
  Digit2: "zr",

  // System Buttons
  Minus: "minus",
  KeyM: "minus",
  Equal: "plus",
  KeyP: "plus",
  KeyH: "home",
  KeyN: "capture",

  // Stick Clicks
  KeyF: "l_stick_click",
  KeyG: "r_stick_click",

  // D-Pad / Arrow keys (上下左右方向鍵)
  ArrowUp: "dpad_up",
  ArrowDown: "dpad_down",
  ArrowLeft: "dpad_left",
  ArrowRight: "dpad_right",
};

export interface KeyGuideItem {
  key: string;
  button: string;
  label: string;
  desc: string;
}

export const KEYBOARD_GUIDE: KeyGuideItem[] = [
  { key: "W / A / S / D", button: "L-Stick", label: "左類比搖桿", desc: "推動左類比搖桿上下左右" },
  { key: "↑ / ↓ / ← / →", button: "▲▼◀▶", label: "D-Pad 十字鍵", desc: "十字方向鍵上下左右" },
  { key: "L", button: "A", label: "A 鍵", desc: "確認 / 東側鍵" },
  { key: "K", button: "B", label: "B 鍵", desc: "取消 / 南側鍵" },
  { key: "I", button: "X", label: "X 鍵", desc: "選單 / 北側鍵" },
  { key: "J", button: "Y", label: "Y 鍵", desc: "功能 / 西側鍵" },
  { key: "Q", button: "L", label: "L 鍵", desc: "左肩鍵" },
  { key: "E", button: "R", label: "R 鍵", desc: "右肩鍵" },
  { key: "U / 1", button: "ZL", label: "ZL 鍵", desc: "左板機鍵" },
  { key: "O / 2", button: "ZR", label: "ZR 鍵", desc: "右板機鍵" },
  { key: "M / -", button: "−", label: "Minus 鍵", desc: "減號 / Select" },
  { key: "P / =", button: "+", label: "Plus 鍵", desc: "加號 / Start" },
  { key: "H", button: "⌂", label: "Home 鍵", desc: "主畫面鍵" },
  { key: "N", button: "◉", label: "Capture 鍵", desc: "截圖鍵" },
  { key: "F", button: "L3", label: "L3 鍵", desc: "左類比下壓" },
  { key: "G", button: "R3", label: "R3 鍵", desc: "右類比下壓" },
];

export function computeDpadVal(up: boolean, down: boolean, left: boolean, right: boolean): number {
  if (up && !down && !left && !right) return 0;
  if (up && !down && !left && right) return 1;
  if (!up && !down && !left && right) return 2;
  if (!up && down && !left && right) return 3;
  if (!up && down && !left && !right) return 4;
  if (!up && down && left && !right) return 5;
  if (!up && !down && left && !right) return 6;
  if (up && !down && left && !right) return 7;
  return 8;
}

export function useVirtualGamepad(
  isMuted: boolean,
  onStateUpdate?: React.Dispatch<React.SetStateAction<ControllerState>>
) {
  const activeKeys = useRef<Set<string>>(new Set());
  const dpadRef = useRef({ up: false, down: false, left: false, right: false });

  // Direct trigger function used by on-screen click and keyboard
  const sendButton = useCallback(
    async (button: string, pressed: boolean) => {
      const btnLower = button.toLowerCase();

      // 1. Optimistic UI update: Immediate visual and timeline stream feedback with zero latency
      if (onStateUpdate) {
        onStateUpdate((prev) => {
          const next = { ...prev };
          switch (btnLower) {
            case "a": next.a = pressed; break;
            case "b": next.b = pressed; break;
            case "x": next.x = pressed; break;
            case "y": next.y = pressed; break;
            case "l": next.l = pressed; break;
            case "r": next.r = pressed; break;
            case "zl": next.zl = pressed; break;
            case "zr": next.zr = pressed; break;
            case "minus": next.minus = pressed; break;
            case "plus": next.plus = pressed; break;
            case "home": next.home = pressed; break;
            case "capture": next.capture = pressed; break;
            case "l_stick_click":
            case "l3": next.l_stick_click = pressed; break;
            case "r_stick_click":
            case "r3": next.r_stick_click = pressed; break;
            case "dpad_up":
            case "up":
              dpadRef.current.up = pressed;
              next.dpad = computeDpadVal(dpadRef.current.up, dpadRef.current.down, dpadRef.current.left, dpadRef.current.right);
              break;
            case "dpad_down":
            case "down":
              dpadRef.current.down = pressed;
              next.dpad = computeDpadVal(dpadRef.current.up, dpadRef.current.down, dpadRef.current.left, dpadRef.current.right);
              break;
            case "dpad_left":
            case "left":
              dpadRef.current.left = pressed;
              next.dpad = computeDpadVal(dpadRef.current.up, dpadRef.current.down, dpadRef.current.left, dpadRef.current.right);
              break;
            case "dpad_right":
            case "right":
              dpadRef.current.right = pressed;
              next.dpad = computeDpadVal(dpadRef.current.up, dpadRef.current.down, dpadRef.current.left, dpadRef.current.right);
              break;
            default: break;
          }
          return next;
        });
      }

      // 2. Tauri IPC bridge to ESP32 serial packet sender
      if (!isMuted && isTauriAvailable()) {
        try {
          await invoke("send_virtual_button", { button, pressed });
        } catch (err) {
          console.error(`Failed to send virtual button ${button}:`, err);
        }
      }
    },
    [isMuted, onStateUpdate]
  );

  // In-flight coalescing queue for high-frequency analog stick IPC
  const stickPendingRef = useRef<Record<string, { x: number; y: number }>>({});
  const stickInFlightRef = useRef<Record<string, boolean>>({});

  // Analog stick position sender with coalescing
  const sendStick = useCallback(
    async (stick: "left" | "right", x: number, y: number) => {
      // 1. Optimistic UI update
      if (onStateUpdate) {
        onStateUpdate((prev) => {
          const next = { ...prev };
          if (stick === "left") {
            next.left_stick_x = x;
            next.left_stick_y = y;
          } else {
            next.right_stick_x = x;
            next.right_stick_y = y;
          }
          return next;
        });
      }

      // 2. Coalescing IPC queue
      if (!isMuted && isTauriAvailable()) {
        if (stickInFlightRef.current[stick]) {
          stickPendingRef.current[stick] = { x, y };
          return;
        }
        stickInFlightRef.current[stick] = true;
        try {
          await invoke("send_virtual_stick", { stick, x, y });
        } catch (err) {
          console.error(`Failed to send virtual stick ${stick}:`, err);
        } finally {
          stickInFlightRef.current[stick] = false;
          const next = stickPendingRef.current[stick];
          if (next) {
            delete stickPendingRef.current[stick];
            sendStick(stick, next.x, next.y);
          }
        }
      }
    },
    [isMuted, onStateUpdate]
  );

  // Reset all virtual inputs
  const resetInputs = useCallback(async () => {
    activeKeys.current.clear();
    dpadRef.current = { up: false, down: false, left: false, right: false };
    if (onStateUpdate) {
      onStateUpdate((prev) => ({
        ...prev,
        ...DEFAULT_CONTROLLER_STATE,
      }));
    }
    if (isTauriAvailable()) {
      try {
        await invoke("reset_virtual_inputs");
      } catch (err) {
        console.error("Failed to reset virtual inputs:", err);
      }
    }
  }, [onStateUpdate]);

  // Compute Left Stick position from WASD
  const updateWasdStick = useCallback(() => {
    const up = activeKeys.current.has("KeyW");
    const down = activeKeys.current.has("KeyS");
    const left = activeKeys.current.has("KeyA");
    const right = activeKeys.current.has("KeyD");

    let x = 128;
    let y = 128;

    if (left && !right) x = 0;
    else if (right && !left) x = 255;

    if (up && !down) y = 255; // Up in Switch is 255
    else if (down && !up) y = 0; // Down in Switch is 0

    sendStick("left", x, y);
  }, [sendStick]);

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      if (e.repeat) return;

      // Handle WASD -> Left Stick movement
      if (["KeyW", "KeyA", "KeyS", "KeyD"].includes(e.code)) {
        e.preventDefault();
        activeKeys.current.add(e.code);
        updateWasdStick();
        return;
      }

      // Handle other buttons / D-Pad arrows
      const button = KEYBOARD_MAP[e.code];
      if (button) {
        e.preventDefault();
        activeKeys.current.add(e.code);
        sendButton(button, true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (["KeyW", "KeyA", "KeyS", "KeyD"].includes(e.code)) {
        e.preventDefault();
        activeKeys.current.delete(e.code);
        updateWasdStick();
        return;
      }

      const button = KEYBOARD_MAP[e.code];
      if (button) {
        e.preventDefault();
        activeKeys.current.delete(e.code);
        sendButton(button, false);
      }
    };

    const handleBlur = () => {
      if (activeKeys.current.size > 0) {
        resetInputs();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
      resetInputs();
    };
  }, [sendButton, sendStick, updateWasdStick, resetInputs]);

  return {
    sendButton,
    sendStick,
    resetInputs,
    keyboardGuide: KEYBOARD_GUIDE,
  };
}
