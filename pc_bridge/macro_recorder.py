"""
PC-to-Switch Controller Bridge: Macro Recorder
==============================================
Records user live keyboard actions in real-time while simultaneously
forwarding them to the Nintendo Switch. Automatically calculates press
durations and wait intervals, then exports clean declarative JSON scripts.
"""

import datetime
import json
import logging
import os
import sys
import threading
import time
from typing import Any, Dict, List, Optional, Set

try:
    from pynput import keyboard
except ImportError:
    keyboard = None

from .controller_state import ControllerState
from .keyboard_mapper import DEFAULT_KEYMAP
from .protocol import Button, DPad, NEUTRAL_STICK
from .serial_client import SerialClient

logger = logging.getLogger("MacroRecorder")


class MacroRecorder:
    """Records interactive gameplay into declarative JSON scripts."""

    def __init__(
        self,
        controller: ControllerState,
        serial_client: SerialClient,
        output_path: str,
    ):
        self.controller = controller
        self.serial = serial_client
        self.output_path = output_path

        self._active_keys: Set[str] = set()
        self._listener: Optional["keyboard.Listener"] = None
        self._stop_event = threading.Event()

        # Recording timeline
        self._actions: List[Dict[str, Any]] = []
        self._last_state_time: float = 0.0
        self._is_recording = False

        # Current active input state snapshot
        self._current_buttons: List[str] = []
        self._current_left_stick: tuple = (NEUTRAL_STICK, NEUTRAL_STICK)
        self._current_right_stick: tuple = (NEUTRAL_STICK, NEUTRAL_STICK)
        self._current_dpad: str = "CENTER"

    def start(self) -> None:
        """Starts recording keyboard inputs."""
        if keyboard is None:
            raise RuntimeError("pynput is not installed! Run `pip install pynput`.")

        self._listener = keyboard.Listener(
            on_press=self._on_key_press,
            on_release=self._on_key_release,
        )
        self._listener.start()
        self._is_recording = True
        self._last_state_time = time.perf_counter()

        logger.info(f"Macro recording started. Output will be saved to: {self.output_path}")

    def stop(self) -> None:
        """Stops recording and finalizes the script file."""
        if not self._is_recording:
            return

        self._commit_current_state(time.perf_counter())
        self._is_recording = False
        self._stop_event.set()

        if self._listener:
            self._listener.stop()

        self.controller.reset_neutral()
        self.serial.emergency_stop(self.controller)
        self._save_to_json()

    def run_interactive(self) -> None:
        """Runs the interactive recording session with terminal live status."""
        self._print_banner()
        self.start()

        try:
            while not self._stop_event.is_set():
                self._render_hud()
                time.sleep(0.08)
        except KeyboardInterrupt:
            logger.info("Keyboard interrupt received.")
        finally:
            self.stop()
            print(f"\n[Recording Completed! File saved to: {self.output_path}]\n")

    def _normalize_key(self, key) -> str:
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

        # ESC to stop and finish recording
        if key_str == "esc":
            self.stop()
            return

        if key_str in self._active_keys:
            return  # Filter out OS key repeat

        now = time.perf_counter()
        self._commit_current_state(now)

        self._active_keys.add(key_str)
        self._update_controller_and_snapshot()

    def _on_key_release(self, key) -> None:
        key_str = self._normalize_key(key)
        if key_str not in self._active_keys:
            return

        now = time.perf_counter()
        self._commit_current_state(now)

        self._active_keys.discard(key_str)
        self._update_controller_and_snapshot()

    def _update_controller_and_snapshot(self) -> None:
        """Recalculates controller state and updates current internal snapshot."""
        # 1. Action Buttons
        active_btn_names = []
        for key_name, btn in DEFAULT_KEYMAP.items():
            is_down = key_name in self._active_keys
            self.controller.set_button(btn, is_down)
            if is_down:
                active_btn_names.append(btn.name)

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
            ly = 0
        elif w and not s:
            ly = 255

        self.controller.set_left_stick(lx, ly)

        # 3. Right Stick (Arrows)
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

        # 4. D-Pad (T=Up, G=Down, F=Left, H=Right)
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
        snap = self.controller.snapshot()

        self._current_buttons = sorted(active_btn_names)
        self._current_left_stick = (lx, ly)
        self._current_right_stick = (rx, ry)
        self._current_dpad = snap["dpad"]

    def _commit_current_state(self, current_time: float) -> None:
        """Computes the duration of the state that just concluded, and records an action."""
        duration = round(current_time - self._last_state_time, 3)
        self._last_state_time = current_time

        if duration < 0.01:
            return  # Ignore micro jitter (< 10ms)

        # Determine if previous state was neutral (idle)
        is_neutral = (
            not self._current_buttons
            and self._current_left_stick == (NEUTRAL_STICK, NEUTRAL_STICK)
            and self._current_right_stick == (NEUTRAL_STICK, NEUTRAL_STICK)
            and self._current_dpad in ("CENTER", "NONE")
        )

        if is_neutral:
            # Record wait duration
            self._actions.append({"wait": duration})
        else:
            action: Dict[str, Any] = {}
            if self._current_buttons:
                action["press"] = self._current_buttons.copy()
            if self._current_left_stick != (NEUTRAL_STICK, NEUTRAL_STICK) or self._current_right_stick != (NEUTRAL_STICK, NEUTRAL_STICK):
                stick_dict = {}
                if self._current_left_stick != (NEUTRAL_STICK, NEUTRAL_STICK):
                    stick_dict["left"] = list(self._current_left_stick)
                if self._current_right_stick != (NEUTRAL_STICK, NEUTRAL_STICK):
                    stick_dict["right"] = list(self._current_right_stick)
                action["stick"] = stick_dict
            if self._current_dpad not in ("CENTER", "NONE"):
                action["dpad"] = self._current_dpad

            action["duration"] = duration
            self._actions.append(action)

    def _save_to_json(self) -> None:
        """Cleans up and writes the recording to JSON."""
        # Ensure parent directory exists
        os.makedirs(os.path.dirname(os.path.abspath(self.output_path)), exist_ok=True)

        # Consolidate consecutive waits if any
        optimized_actions: List[Dict[str, Any]] = []
        for act in self._actions:
            if "wait" in act and optimized_actions and "wait" in optimized_actions[-1]:
                optimized_actions[-1]["wait"] = round(optimized_actions[-1]["wait"] + act["wait"], 3)
            else:
                optimized_actions.append(act)

        data = {
            "name": f"Recorded Macro {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "description": "Live macro generated by ghost-pad MacroRecorder",
            "total_actions": len(optimized_actions),
            "actions": optimized_actions,
        }

        with open(self.output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def _print_banner(self) -> None:
        banner = f"""
========================================================================
       🔴 PC-to-Switch Controller Bridge: 腳本錄製模式 (Macro Recorder)
========================================================================
  [錄製目標]   : {self.output_path}
  [操作方式]   : 與鍵盤直控相同，即時操控並即時同步記錄按鍵維持時長與等待間隔
  [按鍵說明]   : K=A, J=B, I=X, U=Y, WASD=走位, 方向鍵=視角, Q/E=L/R, Z/C=ZL/ZR
  [結束錄製]   : 按下 [ESC] 鍵即刻停止錄製，自動最佳化並儲存腳本！
------------------------------------------------------------------------
  💡 macOS 提示: 若按鍵無反應，請至「系統設定」➔「隱私權與安全性」➔
                「輔助使用」，將目前終端機軟體勾選允許監聽。
========================================================================
"""
        print(banner)

    def _render_hud(self) -> None:
        active_btns = ", ".join(self._current_buttons) if self._current_buttons else "None"
        lx, ly = self._current_left_stick
        rx, ry = self._current_right_stick
        actions_count = len(self._actions)

        sys.stdout.write(
            f"\r\033[K● REC ({actions_count} 動作) | 按鍵: {active_btns:<15} | "
            f"L-Stick: ({lx:>3}, {ly:>3}) | R-Stick: ({rx:>3}, {ry:>3}) | [ESC 儲存結束]"
        )
        sys.stdout.flush()
