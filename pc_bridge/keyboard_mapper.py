"""
PC-to-Switch Controller Bridge: Real-Time Keyboard Mapper
=========================================================
Captures PC keyboard events using pynput, maps them to Nintendo Switch
buttons and analog sticks, and updates ControllerState in real time.
"""

import logging
import sys
import threading
import time
from typing import Callable, Dict, Optional, Set

try:
    from pynput import keyboard
except ImportError:
    keyboard = None

from .controller_state import ControllerState
from .protocol import Button, DPad, NEUTRAL_STICK
from .serial_client import SerialClient

logger = logging.getLogger("KeyboardMapper")

# Default Keymap Configuration
DEFAULT_KEYMAP = {
    # Action Buttons (Nintendo Layout: A=Right, B=Bottom, X=Top, Y=Left)
    "k": Button.A,
    "j": Button.B,
    "i": Button.X,
    "u": Button.Y,
    # Bumpers and Triggers
    "q": Button.L,
    "e": Button.R,
    "z": Button.ZL,
    "c": Button.ZR,
    # System buttons
    "enter": Button.PLUS,
    "backspace": Button.MINUS,
    "h": Button.HOME,
    "p": Button.CAPTURE,
    # Stick Clicks
    "shift": Button.L_STICK_CLICK,
    "space": Button.R_STICK_CLICK,
}


class KeyboardMapper:
    """Listens for keyboard events and updates ControllerState accordingly."""

    def __init__(
        self,
        controller: ControllerState,
        serial_client: SerialClient,
        on_exit_callback: Optional[Callable[[], None]] = None,
    ):
        self.controller = controller
        self.serial = serial_client
        self.on_exit = on_exit_callback

        self._active_keys: Set[str] = set()
        self._listener: Optional["keyboard.Listener"] = None
        self._stop_event = threading.Event()

    def start(self) -> None:
        """Starts the pynput keyboard listener."""
        if keyboard is None:
            raise RuntimeError(
                "pynput is not installed! Run `pip install pynput` to enable keyboard control."
            )

        self._listener = keyboard.Listener(
            on_press=self._on_key_press,
            on_release=self._on_key_release,
        )
        self._listener.start()
        logger.info("Keyboard listener started.")

    def stop(self) -> None:
        """Stops the listener and restores neutral state."""
        self._stop_event.set()
        if self._listener:
            self._listener.stop()
        self.controller.reset_neutral()

    def run_interactive(self) -> None:
        """
        Runs an interactive terminal loop displaying real-time HUD until Esc is pressed.
        """
        self.start()
        self._print_help_banner()

        try:
            while not self._stop_event.is_set():
                self._render_hud()
                time.sleep(0.08)
        except KeyboardInterrupt:
            logger.info("Keyboard interrupt received.")
        finally:
            self.stop()
            self.serial.emergency_stop(self.controller)
            print("\n[Exited Keyboard Mode. Controller reset to neutral.]\n")

    def _normalize_key(self, key) -> str:
        """Normalizes pynput key event to lowercase string token."""
        try:
            if hasattr(key, "char") and key.char:
                return key.char.lower()
            elif hasattr(key, "name"):
                return key.name.lower()
        except Exception:
            pass
        return str(key).lower()

    def _on_key_press(self, key) -> None:
        key_str = self._normalize_key(key)

        # Emergency Stop / Exit
        if key_str == "esc":
            logger.warning("[ESC] Emergency Stop & Exit triggered!")
            self._stop_event.set()
            if self.on_exit:
                self.on_exit()
            return

        if key_str in self._active_keys:
            return  # Ignore key repeat

        self._active_keys.add(key_str)
        self._process_active_inputs()

    def _on_key_release(self, key) -> None:
        key_str = self._normalize_key(key)
        self._active_keys.discard(key_str)
        self._process_active_inputs()

    def _process_active_inputs(self) -> None:
        """Evaluates active pressed keys and recalculates controller state."""
        # 1. Action Buttons
        for key_name, btn in DEFAULT_KEYMAP.items():
            is_down = key_name in self._active_keys
            self.controller.set_button(btn, is_down)

        # 2. Left Stick (WASD)
        lx = NEUTRAL_STICK
        ly = NEUTRAL_STICK
        w = "w" in self._active_keys
        s = "s" in self._active_keys
        a = "a" in self._active_keys
        d = "d" in self._active_keys

        if a and not d:
            lx = 0
        elif d and not a:
            lx = 255

        if s and not w:
            ly = 0      # Down / backward
        elif w and not s:
            ly = 255    # Up / forward

        self.controller.set_left_stick(lx, ly)

        # 3. Right Stick (Arrow Keys or IJKL alternate mode)
        # Arrow keys: up, down, left, right
        rx = NEUTRAL_STICK
        ry = NEUTRAL_STICK
        up = "up" in self._active_keys
        down = "down" in self._active_keys
        left = "left" in self._active_keys
        right = "right" in self._active_keys

        if left and not right:
            rx = 0
        elif right and not left:
            rx = 255

        if down and not up:
            ry = 0
        elif up and not down:
            ry = 255

        self.controller.set_right_stick(rx, ry)

        # 4. D-Pad (Number keys 1-4 or T/F/G/H)
        # Using [T=Up, G=Down, F=Left, H=Right]
        dx = 0
        dy = 0
        if "f" in self._active_keys:
            dx -= 1
        if "h" in self._active_keys:
            dx += 1
        if "t" in self._active_keys:
            dy += 1
        if "g" in self._active_keys:
            dy -= 1

        self.controller.update_dpad_vector(dx, dy)

    def _print_help_banner(self) -> None:
        banner = """
========================================================================
       🎮 PC-to-Switch Virtual Controller: Keyboard Direct Control
========================================================================
  [Left Stick]  : W (Up), S (Down), A (Left), D (Right)
  [Right Stick] : Arrow Keys (↑ ↓ ← →)
  [Buttons]     : K=A, J=B, I=X, U=Y
  [Bumpers]     : Q=L, E=R
  [Triggers]    : Z=ZL, C=ZR
  [D-Pad]       : T=Up, G=Down, F=Left, H=Right
  [Menu]        : Enter=Plus (+), Backspace=Minus (-), H=Home, P=Capture
  [Stick Click] : Shift=L3 (Left Click), Space=R3 (Right Click)
  [FAIL-SAFE]   : Press [ESC] at ANY time to Emergency Stop and Exit
------------------------------------------------------------------------
  💡 macOS 提示: 若按鍵無反應，請檢查「系統設定」➔「隱私權與安全性」➔
                「輔助使用 (Accessibility)」，將終端機應用程式勾選允許。
========================================================================
"""
        print(banner)

    def _render_hud(self) -> None:
        snap = self.controller.snapshot()
        active_btns = ", ".join(snap["buttons"]) if snap["buttons"] else "None"
        lx, ly = snap["left_stick"]
        rx, ry = snap["right_stick"]
        dpad = snap["dpad"]

        sys.stdout.write(
            f"\r\033[K[STATUS] Buttons: {active_btns:<20} | D-Pad: {dpad:<7} | "
            f"L-Stick: ({lx:>3}, {ly:>3}) | R-Stick: ({rx:>3}, {ry:>3}) | [ESC to Exit]"
        )
        sys.stdout.flush()
