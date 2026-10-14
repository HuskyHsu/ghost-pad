"""
PC-to-Switch Controller Bridge: Declarative Script Execution Engine
===================================================================
Parses and executes structured automation scripts (JSON or YAML) with
precise timing, looping support, and fail-safe interrupt handling.
"""

import json
import logging
import os
import sys
import threading
import time
from typing import Any, Dict, List, Optional

try:
    import yaml
except ImportError:
    yaml = None

from .controller_state import ControllerState
from .protocol import NEUTRAL_STICK, DPad
from .serial_client import SerialClient

logger = logging.getLogger("ScriptRunner")


class ScriptRunner:
    """Executes declarative scripts against the ControllerState."""

    def __init__(self, controller: ControllerState, serial_client: SerialClient):
        self.controller = controller
        self.serial = serial_client
        self._abort_flag = threading.Event()

    def abort(self) -> None:
        """Triggers emergency stop and aborts the running script."""
        logger.warning("Script execution aborted by user.")
        self._abort_flag.set()
        self.serial.emergency_stop(self.controller)

    def load_script(self, filepath: str) -> List[Dict[str, Any]]:
        """Loads a script file formatted as JSON or YAML."""
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Script file not found: {filepath}")

        ext = os.path.splitext(filepath)[1].lower()
        with open(filepath, "r", encoding="utf-8") as f:
            if ext in (".yaml", ".yml"):
                if yaml is None:
                    raise RuntimeError("PyYAML not installed! Run `pip install pyyaml`.")
                data = yaml.safe_load(f)
            else:
                data = json.load(f)

        if isinstance(data, dict):
            # If the file is structured as {"name": "...", "actions": [...]}
            return data.get("actions", [])
        elif isinstance(data, list):
            return data
        else:
            raise ValueError("Script must be a JSON/YAML list of actions or contain an 'actions' list.")

    def run_file(self, filepath: str, loop_count: int = 1) -> None:
        """Loads and executes a script file."""
        actions = self.load_script(filepath)
        print(f"\n▶ Starting script: {os.path.basename(filepath)} (Iterations: {loop_count})")
        self.run_actions(actions, loop_count=loop_count)

    def run_actions(self, actions: List[Dict[str, Any]], loop_count: int = 1) -> None:
        """
        Executes a sequence of actions.
        loop_count = 0 or negative means infinite loop until aborted.
        """
        self._abort_flag.clear()
        iteration = 0

        try:
            while not self._abort_flag.is_set():
                iteration += 1
                if loop_count > 0 and iteration > loop_count:
                    break

                if loop_count > 1 or loop_count <= 0:
                    print(f"--- Iteration #{iteration} ---")

                self._execute_action_list(actions)

        except KeyboardInterrupt:
            print("\n[KeyboardInterrupt] Stopping script...")
        finally:
            self.abort()
            print("[Script finished. Controller reset to neutral.]\n")

    def _execute_action_list(self, actions: List[Dict[str, Any]]) -> None:
        for idx, act in enumerate(actions):
            if self._abort_flag.is_set():
                break
            self._execute_single_action(act, idx)

    def _execute_single_action(self, action: Dict[str, Any], index: int) -> None:
        # 1. Action: press button(s) with duration (and optional release)
        if "press" in action:
            btns = action["press"]
            if isinstance(btns, str):
                btns = [btns]
            duration = float(action.get("duration", 0.1))
            wait_after = float(action.get("wait", 0.05))

            for b in btns:
                self.controller.press_button(b)
            self._precise_sleep(duration)

            for b in btns:
                self.controller.release_button(b)
            if wait_after > 0:
                self._precise_sleep(wait_after)

        # 2. Action: hold button(s) without automatic release
        elif "hold" in action:
            btns = action["hold"]
            if isinstance(btns, str):
                btns = [btns]
            for b in btns:
                self.controller.press_button(b)

        # 3. Action: release button(s)
        elif "release" in action:
            btns = action["release"]
            if btns == "all":
                self.controller.reset_neutral()
            else:
                if isinstance(btns, str):
                    btns = [btns]
                for b in btns:
                    self.controller.release_button(b)

        # 4. Action: analog stick movement
        elif "stick" in action:
            stick_cfg = action["stick"]
            duration = float(action.get("duration", 0.2))
            wait_after = float(action.get("wait", 0.0))

            if "left" in stick_cfg:
                lx, ly = stick_cfg["left"]
                self.controller.set_left_stick(lx, ly)
            if "right" in stick_cfg:
                rx, ry = stick_cfg["right"]
                self.controller.set_right_stick(rx, ry)

            self._precise_sleep(duration)

            # Auto reset sticks if requested (default True)
            if action.get("auto_reset", True):
                if "left" in stick_cfg:
                    self.controller.set_left_stick(NEUTRAL_STICK, NEUTRAL_STICK)
                if "right" in stick_cfg:
                    self.controller.set_right_stick(NEUTRAL_STICK, NEUTRAL_STICK)

            if wait_after > 0:
                self._precise_sleep(wait_after)

        # 5. Action: dpad direction
        elif "dpad" in action:
            dpad_dir = action["dpad"]
            duration = float(action.get("duration", 0.1))
            wait_after = float(action.get("wait", 0.05))

            self.controller.set_dpad(dpad_dir)
            self._precise_sleep(duration)

            if action.get("auto_reset", True):
                self.controller.set_dpad(DPad.CENTER)
            if wait_after > 0:
                self._precise_sleep(wait_after)

        # 6. Action: pure wait / sleep
        elif "wait" in action or "sleep" in action:
            wait_time = float(action.get("wait", action.get("sleep", 0.1)))
            self._precise_sleep(wait_time)

        # 7. Action: nested repeat / loop
        elif "repeat" in action or "loop" in action:
            sub_actions = action.get("actions", [])
            count = int(action.get("repeat", action.get("loop", 1)))
            for _ in range(count):
                if self._abort_flag.is_set():
                    break
                self._execute_action_list(sub_actions)

        # 8. Action: log / comment
        elif "log" in action:
            print(f"  [LOG] {action['log']}")

        else:
            logger.warning(f"Unknown action format at index {index}: {action}")

    def _precise_sleep(self, seconds: float) -> None:
        """High-resolution sleep using perf_counter with periodic abort checks."""
        if seconds <= 0:
            return

        target = time.perf_counter() + seconds
        # Sleep for bulk of time in short chunks to remain responsive to abort
        while not self._abort_flag.is_set():
            remaining = target - time.perf_counter()
            if remaining <= 0:
                break
            # Sleep in intervals no larger than 20ms for instant fail-safe response
            time.sleep(min(0.02, remaining))
