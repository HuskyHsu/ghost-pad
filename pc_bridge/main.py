"""
PC-to-Switch Controller Bridge: CLI Main Entry Point
====================================================
Command-line interface to launch keyboard control, run declarative scripts,
or test connection to the ESP32.
"""

import argparse
import logging
import sys
import time

try:
    import serial.tools.list_ports
except ImportError:
    pass

from .controller_state import ControllerState
from .keyboard_mapper import KeyboardMapper
from .script_runner import ScriptRunner
from .serial_client import SerialClient


def list_serial_ports():
    """Lists available serial ports on the machine."""
    try:
        ports = serial.tools.list_ports.comports()
        if not ports:
            print("No serial ports detected.")
            return
        print("\nAvailable Serial Ports:")
        for p in ports:
            print(f"  - {p.device:<25} ({p.description})")
        print()
    except Exception as e:
        print(f"Could not scan serial ports: {e}")


def main():
    parser = argparse.ArgumentParser(
        description="PC Virtual Controller & ESP32 Switch Bluetooth Bridge"
    )
    parser.add_argument(
        "-p", "--port",
        type=str,
        default=None,
        help="ESP32 Serial Port (e.g. /dev/cu.usbserial-1110, /dev/ttyUSB0, COM3)",
    )
    parser.add_argument(
        "-b", "--baud",
        type=int,
        default=19200,
        help="Baud rate (default: 19200 for UARTSwitchCon)",
    )
    parser.add_argument(
        "--mock",
        action="store_true",
        help="Run in virtual mock mode without physical ESP32 connected",
    )
    parser.add_argument(
        "--rate",
        type=float,
        default=60.0,
        help="Transmission rate in Hz (default: 60Hz)",
    )
    parser.add_argument(
        "--ports",
        action="store_true",
        help="List available serial ports and exit",
    )

    subparsers = parser.add_subparsers(dest="mode", help="Execution mode")

    # Mode 1: keyboard
    subparsers.add_parser("keyboard", help="Interactive keyboard direct control")

    # Mode 2: script
    script_parser = subparsers.add_parser("script", help="Run declarative automation script")
    script_parser.add_argument("file", type=str, help="Path to script (.json or .yaml)")
    script_parser.add_argument(
        "-l", "--loop",
        type=int,
        default=1,
        help="Number of iterations (0 for infinite loop, default: 1)",
    )

    # Mode 3: record
    record_parser = subparsers.add_parser("record", help="Record live keyboard actions into a JSON macro script")
    record_parser.add_argument("file", type=str, help="Output script path (e.g. scripts/my_recording.json)")

    # Mode 4: test
    subparsers.add_parser("test", help="Test packet generation and serial communication")

    args = parser.parse_args()

    if args.ports:
        list_serial_ports()
        return

    if not args.mode:
        parser.print_help()
        list_serial_ports()
        return

    # Check port unless in mock mode
    if not args.mock and not args.port:
        print("Error: Serial port must be specified with -p / --port (or use --mock for simulation).\n")
        list_serial_ports()
        sys.exit(1)

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    # Initialize State & Serial Client
    controller = ControllerState()
    client = SerialClient(
        port=args.port,
        baudrate=args.baud,
        rate_hz=args.rate,
        mock_mode=args.mock,
    )

    if not client.connect():
        sys.exit(1)

    # Start 60Hz heartbeat transmission
    client.start_loop(controller)

    try:
        if args.mode == "keyboard":
            mapper = KeyboardMapper(
                controller=controller,
                serial_client=client,
                on_exit_callback=lambda: client.close(controller),
            )
            mapper.run_interactive()

        elif args.mode == "record":
            from .macro_recorder import MacroRecorder
            recorder = MacroRecorder(
                controller=controller,
                serial_client=client,
                output_path=args.file,
            )
            recorder.run_interactive()

        elif args.mode == "script":
            runner = ScriptRunner(
                controller=controller,
                serial_client=client,
            )
            runner.run_file(args.file, loop_count=args.loop)

        elif args.mode == "test":
            print(f"Testing serial streaming to ESP32 @ {args.rate}Hz for 3 seconds...")
            for i in range(3):
                controller.press_button("A")
                time.sleep(0.5)
                controller.release_button("A")
                time.sleep(0.5)
                print(f"Tick {i+1}: Packet preview = {controller.to_bytes().hex(' ').upper()}")
            print("Test completed successfully.")

    finally:
        client.close(controller)


if __name__ == "__main__":
    main()
