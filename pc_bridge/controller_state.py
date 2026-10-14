"""
PC-to-Switch Controller Bridge: Controller State Manager
========================================================
Maintains the virtual Nintendo Switch Pro Controller state in a thread-safe
manner and serializes it into binary packets.
"""

import threading
from typing import Dict, Set
from .protocol import (
    Button,
    DPad,
    NEUTRAL_STICK,
    DPAD_DIRECTION_MAP,
    pack_controller_state,
    pack_uart_switchcon,
)

# Friendly string name aliases to Button Enum values
BUTTON_NAME_MAP: Dict[str, Button] = {
    "A": Button.A,
    "B": Button.B,
    "X": Button.X,
    "Y": Button.Y,
    "L": Button.L,
    "R": Button.R,
    "ZL": Button.ZL,
    "ZR": Button.ZR,
    "PLUS": Button.PLUS,
    "+": Button.PLUS,
    "START": Button.PLUS,
    "MINUS": Button.MINUS,
    "-": Button.MINUS,
    "SELECT": Button.MINUS,
    "HOME": Button.HOME,
    "CAPTURE": Button.CAPTURE,
    "L3": Button.L_STICK_CLICK,
    "R3": Button.R_STICK_CLICK,
    "LSTICK": Button.L_STICK_CLICK,
    "RSTICK": Button.R_STICK_CLICK,
}

# D-Pad friendly aliases
DPAD_NAME_MAP: Dict[str, DPad] = {
    "UP": DPad.UP,
    "DPAD_UP": DPad.UP,
    "RIGHT": DPad.RIGHT,
    "DPAD_RIGHT": DPad.RIGHT,
    "DOWN": DPad.DOWN,
    "DPAD_DOWN": DPad.DOWN,
    "LEFT": DPad.LEFT,
    "DPAD_LEFT": DPad.LEFT,
    "CENTER": DPad.CENTER,
    "NONE": DPad.CENTER,
}


class ControllerState:
    """Thread-safe state container for a virtual Nintendo Switch Pro Controller."""

    def __init__(self):
        self._lock = threading.Lock()
        self._buttons_mask: int = 0
        self._dpad: DPad = DPad.CENTER
        self._left_x: int = NEUTRAL_STICK
        self._left_y: int = NEUTRAL_STICK
        self._right_x: int = NEUTRAL_STICK
        self._right_y: int = NEUTRAL_STICK

        # Keep track of active D-pad direction vector (dx, dy)
        self._dpad_dx: int = 0
        self._dpad_dy: int = 0

    def reset_neutral(self) -> None:
        """Resets all buttons to released state and sticks/dpad to center."""
        with self._lock:
            self._buttons_mask = 0
            self._dpad = DPad.CENTER
            self._left_x = NEUTRAL_STICK
            self._left_y = NEUTRAL_STICK
            self._right_x = NEUTRAL_STICK
            self._right_y = NEUTRAL_STICK
            self._dpad_dx = 0
            self._dpad_dy = 0

    def press_button(self, button: Button | str) -> None:
        """Sets a button to pressed."""
        btn_val = self._resolve_button(button)
        if btn_val is not None:
            with self._lock:
                self._buttons_mask |= btn_val

    def release_button(self, button: Button | str) -> None:
        """Sets a button to released."""
        btn_val = self._resolve_button(button)
        if btn_val is not None:
            with self._lock:
                self._buttons_mask &= ~btn_val

    def set_button(self, button: Button | str, pressed: bool) -> None:
        """Sets a button to pressed or released."""
        if pressed:
            self.press_button(button)
        else:
            self.release_button(button)

    def set_dpad(self, dpad: DPad | str) -> None:
        """Sets the D-Pad direction explicitly."""
        resolved = self._resolve_dpad(dpad)
        with self._lock:
            self._dpad = resolved

    def update_dpad_vector(self, dx: int, dy: int) -> None:
        """Updates D-Pad based on directional component dx in {-1,0,1}, dy in {-1,0,1}."""
        with self._lock:
            self._dpad_dx = max(-1, min(1, dx))
            self._dpad_dy = max(-1, min(1, dy))
            self._dpad = DPAD_DIRECTION_MAP.get(
                (self._dpad_dx, self._dpad_dy), DPad.CENTER
            )

    def set_left_stick(self, x: int, y: int) -> None:
        """Sets left analog stick coordinates (0~255, 128 is center)."""
        with self._lock:
            self._left_x = max(0, min(255, int(x)))
            self._left_y = max(0, min(255, int(y)))

    def set_right_stick(self, x: int, y: int) -> None:
        """Sets right analog stick coordinates (0~255, 128 is center)."""
        with self._lock:
            self._right_x = max(0, min(255, int(x)))
            self._right_y = max(0, min(255, int(y)))

    def to_bytes(self) -> bytes:
        """Serializes current state into a 10-byte binary packet."""
        with self._lock:
            return pack_controller_state(
                buttons_mask=self._buttons_mask,
                dpad=self._dpad,
                left_x=self._left_x,
                left_y=self._left_y,
                right_x=self._right_x,
                right_y=self._right_y,
            )

    def to_uart_bytes(self) -> bytes:
        """Serializes current state into UARTSwitchCon 9-byte packet format."""
        with self._lock:
            return pack_uart_switchcon(
                buttons_mask=self._buttons_mask,
                dpad=self._dpad,
                left_x=self._left_x,
                left_y=self._left_y,
                right_x=self._right_x,
                right_y=self._right_y,
            )

    def snapshot(self) -> dict:
        """Returns a snapshot dictionary of the current state."""
        with self._lock:
            active_buttons = [
                b.name
                for b in Button
                if (self._buttons_mask & b.value)
            ]
            return {
                "buttons": active_buttons,
                "dpad": self._dpad.name,
                "left_stick": (self._left_x, self._left_y),
                "right_stick": (self._right_x, self._right_y),
            }

    @staticmethod
    def _resolve_button(btn: Button | str) -> int | None:
        if isinstance(btn, Button):
            return btn.value
        if isinstance(btn, str):
            normalized = btn.strip().upper()
            if normalized in BUTTON_NAME_MAP:
                return BUTTON_NAME_MAP[normalized].value
        return None

    @staticmethod
    def _resolve_dpad(val: DPad | str) -> DPad:
        if isinstance(val, DPad):
            return val
        if isinstance(val, str):
            normalized = val.strip().upper()
            return DPAD_NAME_MAP.get(normalized, DPad.CENTER)
        return DPad.CENTER
