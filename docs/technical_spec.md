# 🛠️ Ghost-Pad: Technical Specification & Communication Protocol

<div align="center">

**[English](technical_spec.md) | [繁體中文](technical_spec.zh-TW.md) | [日本語](technical_spec.ja.md)**

</div>

This document specifies the low-level system architecture, serial communication protocol, ESP32 Bluetooth emulation internals, handshake state machine, and Rust core backend design for **Ghost-Pad (PC-to-Switch Controller Bridge)**.

---

## 1. System Architecture & Hardware Link

```text
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ PC Desktop (Ghost-Pad Desktop: Tauri v2 + Rust Core + React 19)         │
  │  - Gamepad polling engine (gilrs native low-latency listener)           │
  │  - Keyboard & touch mappings (WASD stick math, Pointer Capture 120Hz)   │
  │  - Tri-input dynamic merging (Digital OR, Analog Override, Mute)        │
  │  - 60Hz heartbeat timer thread & HeldPort anti-reset protection         │
  │  - Macro Studio (3-2-1 delta recorder, score sheet editor, loop engine) │
  │  - 109 automated tests (89 frontend Vitest + 20 backend Rust)           │
  └────────────────────────────────────┬────────────────────────────────────┘
                                       │ USB Serial Port (Baudrate: 19200)
                                       │ Binary Packet Stream (UARTSwitchCon 9-Byte)
                                       ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ ESP32 Dev Board (Bluetooth Classic BR/EDR HID)                          │
  │  - High-speed serial RX interrupt and CRC-8 checksum verification       │
  │  - 200ms heartbeat fail-safe watchdog timer                             │
  │  - Genuine Pro Controller emulation (VID: 0x057E, PID: 0x2009)          │
  │  - L+R pairing pulse, A/Home wake reconnection, Clear Bonds             │
  └────────────────────────────────────┬────────────────────────────────────┘
                                       │ Wireless Bluetooth HID (Report ID 0x30, 48 Bytes)
                                       ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ Nintendo Switch Console                                                 │
  │  - Paired via "Change Grip / Order" as a standard 1P wireless controller │
  └─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Communication Protocol Specifications

Ghost-Pad supports two binary serial protocols. The default standard protocol is **UARTSwitchCon 9-Byte**.

### 2.1 UARTSwitchCon 9-Byte Serial Protocol (Default Standard)

Baudrate is configured at **19200 bps**, 8 data bits, no parity, 1 stop bit (8N1). Each control packet has a fixed length of 9 bytes:

| Byte (Offset) | Field Name | Type / Range | Specification & Definition |
| :---: | :--- | :---: | :--- |
| **Byte 0** | `btn_hi` (System Function Mask) | `u8` (Bitmask) | • Bit 0: Minus (-)<br>• Bit 1: Plus (+)<br>• Bit 2: L Stick Click (L3)<br>• Bit 3: R Stick Click (R3)<br>• Bit 4: Home (⌂)<br>• Bit 5: Capture (◉)<br>• Bit 6~7: Reserved (`0`) |
| **Byte 1** | `btn_lo` (Action Buttons Mask) | `u8` (Bitmask) | • Bit 0: Y<br>• Bit 1: B<br>• Bit 2: A<br>• Bit 3: X<br>• Bit 4: L<br>• Bit 5: R<br>• Bit 6: ZL<br>• Bit 7: ZR |
| **Byte 2** | `dpad` (D-Pad Direction) | `u8` (0~8) | `0`=Up, `1`=Up-Right, `2`=Right, `3`=Down-Right,<br>`4`=Down, `5`=Down-Left, `6`=Left, `7`=Up-Left,<br>`8`=Neutral Center |
| **Byte 3** | `left_stick_x` (Left Stick X) | `u8` (0~255) | `0`=Full Left, `128`=Center, `255`=Full Right |
| **Byte 4** | `left_stick_y` (Left Stick Y) | `u8` (0~255) | Inverted: `255 - app_y`<br>`0`=Full Top, `128`=Center, `255`=Full Bottom |
| **Byte 5** | `right_stick_x` (Right Stick X) | `u8` (0~255) | `0`=Full Left, `128`=Center, `255`=Full Right |
| **Byte 6** | `right_stick_y` (Right Stick Y) | `u8` (0~255) | Inverted: `255 - app_y`<br>`0`=Full Top, `128`=Center, `255`=Full Bottom |
| **Byte 7** | `reserved` (Reserved) | `u8` | Fixed at `0x00` |
| **Byte 8** | `crc8` (Checksum) | `u8` | Standard **CRC-8** over Bytes 0 to 7 (Polynomial `0x07`, Init `0x00`) |

#### CRC-8 Algorithm Implementation (Rust)

```rust
pub fn calculate_crc8(data: &[u8]) -> u8 {
    let mut crc: u8 = 0x00;
    for &byte in data {
        crc ^= byte;
        for _ in 0..8 {
            if (crc & 0x80) != 0 {
                crc = (crc << 1) ^ 0x07;
            } else {
                crc <<= 1;
            }
        }
    }
    crc
}
```

---

### 2.2 Serial Handshake State Machine

To synchronize the ESP32 firmware with the PC desktop app, the connection sequence follows a strict 3-stage handshake:

```mermaid
sequenceDiagram
    participant PC as PC Desktop (Ghost-Pad)
    participant ESP as ESP32 Board
    participant SW as Switch Console

    Note over PC, ESP: Stage 1: 3-Stage Handshake Synchronization
    PC->>ESP: Send 0xFF (Probe / Syn)
    ESP-->>PC: Reply 0xFF (or 0x90 if already linked)
    PC->>ESP: Send 0x33
    ESP-->>PC: Reply 0xCC
    PC->>ESP: Send 0xCC
    ESP-->>PC: Reply 0x33
    Note over PC, ESP: Handshake verified; 60Hz heartbeat thread starts

    loop Every 16.6ms (60Hz Heartbeat Loop)
        PC->>ESP: 9-Byte Control Packet (Bytes 0..8)
        opt Switch Bluetooth connection active
            ESP->>SW: Bluetooth HID Report 0x30
            ESP-->>PC: Reply 0x90 (LINK_ACK_BYTE)
        end
    end
```

- **ACK and Link Timeout Management**:
  - Whenever the ESP32 is actively linked to the Switch, every valid 9-byte packet received is acknowledged with `0x90` (`LINK_ACK_BYTE`).
  - If no `0x90` ACK is received for 1500ms, the desktop app flags the Switch connection as disconnected or in sleep mode.
  - While unlinked in pairing mode, the ESP32 periodically pulses an L+R button packet (250ms duration every 3 seconds) to facilitate swift pairing on the Switch "Change Grip / Order" screen.

---

### 2.3 Custom 10-Byte XOR Protocol (Legacy Compatibility)

For compatibility with certain custom Arduino firmware sketches, the Rust backend also provides a 10-Byte XOR packet encoder:

| Offset | Field | Description |
| :---: | :--- | :--- |
| `0` | Header 0 | Fixed header byte `0xAA` |
| `1` | Header 1 | Fixed header byte `0x55` |
| `2` | `btn_lo` | Action button bitmask (`Y, B, A, X, L, R, ZL, ZR`) |
| `3` | `btn_hi` | System button bitmask (`Minus, Plus, L3, R3, Home, Capture`) |
| `4` | `dpad` | D-Pad direction code (`0~8`) |
| `5` | `left_stick_x` | Left Stick X (`0~255`) |
| `6` | `left_stick_y` | Left Stick Y (`0~255`) |
| `7` | `right_stick_x` | Right Stick X (`0~255`) |
| `8` | `right_stick_y` | Right Stick Y (`0~255`) |
| `9` | `checksum` | XOR Checksum: `btn_lo ^ btn_hi ^ dpad ^ lx ^ ly ^ rx ^ ry` |

---

## 3. ESP32 Bluetooth Classic Emulation & Firmware Architecture

### 3.1 Bluetooth Classic (BR/EDR) HID Profile

The Nintendo Switch strictly requires **Bluetooth Classic HID (Human Interface Device)** gamepads and does not support BLE gamepads:
- **Vendor ID (VID)**: `0x057E` (Nintendo Co., Ltd.)
- **Product ID (PID)**: `0x2009` (Switch Pro Controller)
- **L2CAP Channels**: PSM `0x11` (HID Control), PSM `0x13` (HID Interrupt)
- **Input Report 0x30**:
  - Standard 48-byte report containing 3 bytes for buttons, 12-bit ADC mapping for analog sticks, and 6-axis gyroscope and accelerometer (IMU) telemetry data.

### 3.2 Pre-Compiled Merged Firmware (`firmware/PRO-UART0.bin`)

The repository includes a ready-to-flash binary file [`firmware/PRO-UART0.bin`](../firmware/PRO-UART0.bin):
- Integrates the ESP-IDF Bootloader, Partition Table, NVS storage partition, and the UARTSwitchCon core application.
- Flash offset begins at address `0x00000000`.
- Can be flashed with one click via the Ghost-Pad desktop app, or using `esptool`:
  ```bash
  python -m esptool --port <YOUR_PORT> --baud 460800 write-flash 0x0 firmware/PRO-UART0.bin
  ```

---

## 4. Rust Core Architecture (`desktop/src-tauri`)

The Rust backend is structured into modular components:

1. **`gamepad.rs` (Input Listener & Merge Engine)**:
   - Integrates the `gilrs` crate on a dedicated worker thread for physical gamepad polling.
   - Implements dual-source state merging (`GamepadManager::merge`): digital buttons use logical OR; stick axes and D-Pad prioritize active virtual inputs.
   - Applies stick deadzone clamping (`axis_to_u8`) to eliminate drift.
2. **`serial.rs` (Serial Communication & Heartbeat Loop)**:
   - Manages 19200 baud serial communications and maintains the 60Hz (16.6ms) heartbeat loop.
   - Features `HeldPort` management: holds the verified port open between sessions to prevent macOS DTR/RTS resets from rebooting the ESP32.
   - Handles commands: `PairLR` (pairing pulse), `WakeReconnect` (A/Home wake pulse), `ClearBonds` (reset memory), and `EmergencyNeutral` (safe neutral state).
3. **`protocol.rs` (Packet Serialization & Verification)**:
   - Defines `ControllerState` and serializer methods for 9-byte CRC8 and 10-byte XOR packets.
   - Contains unit-tested standard CRC-8 calculation.
4. **`lib.rs` (Tauri IPC Bridge & Dialogs)**:
   - Exposes IPC commands: `send_virtual_button`, `send_virtual_stick`, `toggle_serial`, `flash_firmware`, `save_file_dialog`, etc.

---

## 5. Fail-Safe Watchdogs & Safety Mechanisms

1. **ESP32 Onboard Watchdog (200ms Timeout)**:
   - If the ESP32 does not receive a valid serial packet for 200ms, it automatically centers both analog sticks (`128, 128`) and releases all buttons to prevent runaway character actions.
2. **Safe Disconnect Protocol**:
   - Before closing the serial port or terminating the app, the backend transmits neutral state packets to ensure the controller state on the Switch is completely clear.
3. **Emergency Abort (`Esc` Key)**:
   - During macro playback, pressing the keyboard `Esc` key or clicking the UI "Emergency Abort" button instantly cancels all pending timers and issues `reset_virtual_inputs` to release all buttons.
