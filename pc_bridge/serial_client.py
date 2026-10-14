"""
PC-to-Switch Controller Bridge: Serial Transmission Engine
==========================================================
Handles high-speed USB-to-UART Serial communication with the ESP32.
Maintains a 60Hz transmission heartbeat loop, automatic handshake,
and fail-safe stop logic.
"""

import logging
import sys
import threading
import time
from typing import Optional

try:
    import serial
except ImportError:
    serial = None

from .controller_state import ControllerState
from .protocol import pack_uart_switchcon, DPad, NEUTRAL_STICK

logger = logging.getLogger("SerialClient")


class SerialClient:
    """Manages the Serial connection and periodic packet dispatch to the ESP32."""

    def __init__(
        self,
        port: Optional[str] = None,
        baudrate: int = 19200,
        rate_hz: float = 60.0,
        mock_mode: bool = False,
    ):
        self.port_name = port
        self.baudrate = baudrate
        self.interval = 1.0 / rate_hz
        self.mock_mode = mock_mode

        self.serial: Optional["serial.Serial"] = None
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()

        if self.mock_mode or serial is None:
            if not self.mock_mode and serial is None:
                logger.warning("pyserial is not installed! Defaulting to Mock mode.")
            self.mock_mode = True

    def connect(self) -> bool:
        """Opens the serial port and executes handshake. Returns True if connected."""
        if self.mock_mode:
            logger.info(f"[MOCK] Serial connection simulated on {self.port_name or 'VIRTUAL'}")
            return True

        if not self.port_name:
            raise ValueError("Serial port name not specified.")

        try:
            self.serial = serial.Serial(
                port=self.port_name,
                baudrate=self.baudrate,
                timeout=0.3,
                write_timeout=0.3,
            )
            # Give ESP32 a moment to settle after DTR/RTS
            time.sleep(0.2)
            self.serial.reset_input_buffer()
            self.serial.reset_output_buffer()

            # Execute handshake
            if self._perform_handshake():
                logger.info(f"Connected to ESP32 on {self.port_name} @ {self.baudrate} baud (Handshake OK).")
            else:
                logger.info(f"Connected to ESP32 on {self.port_name} @ {self.baudrate} baud.")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to {self.port_name}: {e}")
            return False

    def _perform_handshake(self) -> bool:
        """Performs 3-step handshake with UARTSwitchCon firmware."""
        if not self.serial or not self.serial.is_open:
            return False

        try:
            # Step 1: Send 0xFF, expect 0xFF or 0x90 (if already connected)
            self.serial.write(b'\xFF')
            r1 = self.serial.read(1)

            # Step 2: Send 0x33, expect 0xCC
            self.serial.write(b'\x33')
            r2 = self.serial.read(1)

            # Step 3: Send 0xCC, expect 0x33
            self.serial.write(b'\xCC')
            r3 = self.serial.read(1)

            return bool(r1 or r2 or r3)
        except Exception as e:
            logger.debug(f"Handshake notice: {e}")
            return False

    def start_loop(self, controller: ControllerState) -> None:
        """Starts the background continuous transmission loop (heartbeat at 60Hz)."""
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(
            target=self._transmit_loop, args=(controller,), daemon=True
        )
        self._thread.start()

    def _transmit_loop(self, controller: ControllerState) -> None:
        """Background thread executing at 50-60Hz to keep ESP32 watchdog refreshed."""
        logger.debug("Serial transmission loop started.")
        while self._running:
            t_start = time.perf_counter()
            # Serialize into UARTSwitchCon 9-byte packet
            packet = controller.to_uart_bytes()
            self.send_packet(packet)

            elapsed = time.perf_counter() - t_start
            sleep_time = self.interval - elapsed
            if sleep_time > 0:
                time.sleep(sleep_time)

    def send_packet(self, packet: bytes) -> bool:
        """Directly writes a raw packet to the serial stream and drains ACK."""
        if self.mock_mode:
            return True

        if not self.serial or not self.serial.is_open:
            return False

        try:
            with self._lock:
                self.serial.write(packet)
                self.serial.flush()
                # Non-blocking read of response byte (0x90)
                waiting = self.serial.in_waiting
                if waiting > 0:
                    self.serial.read(waiting)
            return True
        except Exception as e:
            logger.error(f"Serial write error: {e}")
            return False

    def emergency_stop(self, controller: Optional[ControllerState] = None) -> None:
        """
        Fail-safe procedure:
        1. Resets controller state to neutral
        2. Sends 3 consecutive neutral packets to guarantee the ESP32 clears state
        """
        logger.warning("EMERGENCY STOP / FAIL-SAFE triggered!")
        if controller:
            controller.reset_neutral()
            neutral_pkt = controller.to_uart_bytes()
        else:
            neutral_pkt = pack_uart_switchcon(0, DPad.CENTER, NEUTRAL_STICK, NEUTRAL_STICK, NEUTRAL_STICK, NEUTRAL_STICK)

        # Send bursts of neutral packets
        for _ in range(3):
            self.send_packet(neutral_pkt)
            time.sleep(0.01)

    def close(self, controller: Optional[ControllerState] = None) -> None:
        """Stops background loop, resets to neutral, and closes serial port."""
        self._running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=0.5)

        self.emergency_stop(controller)

        if self.serial and self.serial.is_open:
            try:
                self.serial.close()
                logger.info("Serial port closed.")
            except Exception as e:
                logger.error(f"Error closing serial port: {e}")
        self.serial = None
