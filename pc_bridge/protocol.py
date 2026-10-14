"""
PC-to-Switch Controller Bridge: Binary Protocol Definition
==========================================================
Defines the ultra-lightweight 10-byte binary packet structure between
PC (Python) and ESP32 over high-speed Serial UART.
"""

from enum import IntEnum
import struct
from typing import NamedTuple, Tuple

# Packet Constants
HEADER_BYTE_0 = 0xAA
HEADER_BYTE_1 = 0x55
PACKET_SIZE = 10
NEUTRAL_STICK = 128


class Button(IntEnum):
    # Byte 2 (btn_lo)
    Y = 1 << 0
    B = 1 << 1
    A = 1 << 2
    X = 1 << 3
    L = 1 << 4
    R = 1 << 5
    ZL = 1 << 6
    ZR = 1 << 7

    # Byte 3 (btn_hi)
    MINUS = 1 << 8
    PLUS = 1 << 9
    HOME = 1 << 10
    CAPTURE = 1 << 11
    L_STICK_CLICK = 1 << 12
    R_STICK_CLICK = 1 << 13


class DPad(IntEnum):
    UP = 0
    UP_RIGHT = 1
    RIGHT = 2
    DOWN_RIGHT = 3
    DOWN = 4
    DOWN_LEFT = 5
    LEFT = 6
    UP_LEFT = 7
    CENTER = 8


# Mapping 2D directions (dx, dy) where dx in {-1, 0, 1}, dy in {-1, 0, 1}
# dy: 1 = UP, -1 = DOWN
DPAD_DIRECTION_MAP = {
    (0, 0): DPad.CENTER,
    (0, 1): DPad.UP,
    (1, 1): DPad.UP_RIGHT,
    (1, 0): DPad.RIGHT,
    (1, -1): DPad.DOWN_RIGHT,
    (0, -1): DPad.DOWN,
    (-1, -1): DPad.DOWN_LEFT,
    (-1, 0): DPad.LEFT,
    (-1, 1): DPad.UP_LEFT,
}


class PacketData(NamedTuple):
    btn_lo: int
    btn_hi: int
    dpad: int
    left_stick_x: int
    left_stick_y: int
    right_stick_x: int
    right_stick_y: int


def calculate_checksum(
    btn_lo: int,
    btn_hi: int,
    dpad: int,
    lx: int,
    ly: int,
    rx: int,
    ry: int
) -> int:
    """Calculates XOR checksum across all 7 payload fields."""
    return (btn_lo ^ btn_hi ^ dpad ^ lx ^ ly ^ rx ^ ry) & 0xFF


def pack_controller_state(
    buttons_mask: int,
    dpad: DPad | int,
    left_x: int = NEUTRAL_STICK,
    left_y: int = NEUTRAL_STICK,
    right_x: int = NEUTRAL_STICK,
    right_y: int = NEUTRAL_STICK,
) -> bytes:
    """
    Packs controller states into the 10-byte binary packet format.
    
    Packet layout:
      [0] Header 0 (0xAA)
      [1] Header 1 (0x55)
      [2] btn_lo (uint8)
      [3] btn_hi (uint8)
      [4] dpad (uint8)
      [5] left_stick_x (uint8, 0-255)
      [6] left_stick_y (uint8, 0-255)
      [7] right_stick_x (uint8, 0-255)
      [8] right_stick_y (uint8, 0-255)
      [9] checksum (uint8)
    """
    btn_lo = buttons_mask & 0xFF
    btn_hi = (buttons_mask >> 8) & 0xFF
    dpad_val = int(dpad) & 0xFF
    lx = max(0, min(255, int(left_x)))
    ly = max(0, min(255, int(left_y)))
    rx = max(0, min(255, int(right_x)))
    ry = max(0, min(255, int(right_y)))

    checksum = calculate_checksum(btn_lo, btn_hi, dpad_val, lx, ly, rx, ry)

    return struct.pack(
        "<BBBBBBBBBB",
        HEADER_BYTE_0,
        HEADER_BYTE_1,
        btn_lo,
        btn_hi,
        dpad_val,
        lx,
        ly,
        rx,
        ry,
        checksum,
    )


def unpack_packet(raw_bytes: bytes) -> Tuple[bool, PacketData | None]:
    """
    Unpacks and validates a 10-byte binary packet.
    Returns (is_valid, PacketData).
    """
    if len(raw_bytes) != PACKET_SIZE:
        return False, None

    h0, h1, btn_lo, btn_hi, dpad, lx, ly, rx, ry, checksum = struct.unpack(
        "<BBBBBBBBBB", raw_bytes
    )

    if h0 != HEADER_BYTE_0 or h1 != HEADER_BYTE_1:
        return False, None

    expected_checksum = calculate_checksum(btn_lo, btn_hi, dpad, lx, ly, rx, ry)
    if checksum != expected_checksum:
        return False, None

    return True, PacketData(
        btn_lo=btn_lo,
        btn_hi=btn_hi,
        dpad=dpad,
        left_stick_x=lx,
        left_stick_y=ly,
        right_stick_x=rx,
        right_stick_y=ry,
    )


def pack_uart_switchcon(
    buttons_mask: int,
    dpad: DPad | int,
    left_x: int = NEUTRAL_STICK,
    left_y: int = NEUTRAL_STICK,
    right_x: int = NEUTRAL_STICK,
    right_y: int = NEUTRAL_STICK,
) -> bytes:
    """
    Packs controller state into UARTSwitchCon 9-byte packet format:
      [0]: btn_hi (Minus, Plus, L3, R3, Home, Capture, SL, SR)
      [1]: btn_lo (Y, B, A, X, L, R, ZL, ZR)
      [2]: dpad (0x08 = Center, 0=U, 1=UR, 2=R, 3=DR, 4=D, 5=DL, 6=L, 7=UL)
      [3]: left_x (0~255)
      [4]: left_y (0~255, 0 is Top, 255 is Bottom)
      [5]: right_x (0~255)
      [6]: right_y (0~255, 0 is Top, 255 is Bottom)
      [7]: 0x00
      [8]: crc8 of bytes 0..7
    """
    import crc8

    btn_lo = buttons_mask & 0xFF
    btn_hi = (buttons_mask >> 8) & 0xFF
    dpad_val = int(dpad) & 0xFF

    lx = max(0, min(255, int(left_x)))
    # Invert Y coordinate so 255 (Up) in Python maps to 0 (Up) for Switch Pro Controller
    ly = max(0, min(255, 255 - int(left_y)))
    rx = max(0, min(255, int(right_x)))
    ry = max(0, min(255, 255 - int(right_y)))

    payload = bytearray([btn_hi, btn_lo, dpad_val, lx, ly, rx, ry, 0x00])
    h = crc8.crc8()
    h.update(payload)
    payload.append(h.digest()[0])
    return bytes(payload)
