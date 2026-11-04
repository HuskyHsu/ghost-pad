# 🎮 Ghost-Pad Desktop: System Implementation & Feature Specification

<div align="center">

**[English](desktop_app_plan.md) | [繁體中文](desktop_app_plan.zh-TW.md) | [日本語](desktop_app_plan.ja.md)**

</div>

This document serves as the complete system implementation manual and feature checklist for **Ghost-Pad Desktop (Tauri v2 + Rust + React 19 + TypeScript)**. It records all implemented modules, data flows, core algorithms, and verification benchmarks.

---

## 📌 1. Architecture Overview & Tech Stack

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ Frontend UI (Tauri Webview / React 19 + TypeScript + Tailwind CSS)      │
│ - Live Gamepad Visualizer (Ghost Controller with Ditto Expressions)     │
│ - Live Input Timeline Stream (5-Track DAW / Reverse Taiko Style Canvas) │
│ - Macro Studio (3-2-1 Delta Recorder, Multi-Track Editor, Taiko Player) │
│ - Sequential Hardware Management & ESP32 Firmware Flasher Console       │
│ - Multi-Language i18n (Traditional Chinese zh-TW / English en / JA ja)  │
└────────────────────────────────────▲────────────────────────────────────┘
                                     │ Tauri IPC (invoke / emit)
┌────────────────────────────────────▼────────────────────────────────────┐
│ Backend Core (Rust Core / desktop/src-tauri)                            │
│ - gilrs          : Native physical gamepad polling (8BitDo / Joy-Con)   │
│ - serial.rs      : High-speed USB serial, 60Hz heartbeat & 200ms WD    │
│ - protocol.rs    : UARTSwitchCon 9-Byte CRC8 & Custom 10-Byte XOR pack  │
│ - gamepad.rs     : Tri-input merge algorithm (Physical ∪ Virtual)       │
│ - lib.rs         : Native system dialogs (File save/open) & IPC bridge  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ USB Serial (19200 baud / Flash: 460800)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Hardware Target (ESP32 Dev Module)                                      │
│ - High-speed serial receiver and CRC8 / XOR checksum validation         │
│ - Genuine Nintendo Switch Pro Controller simulation (BT Classic BR/EDR) │
│ - 200ms fail-safe watchdog timer                                        │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Bluetooth HID (Report ID 0x30)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Console Target (Nintendo Switch)                                        │
│ - Paired via "Change Grip / Order" as a standard 1P wireless controller  │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Desktop Framework**: Tauri v2 (macOS Universal binary, Apple Silicon + Intel)
- **Backend Language**: Rust (`serialport`, `gilrs`, `tokio`, `serde`, `crc8`)
- **Frontend Technologies**: React 19, TypeScript, Tailwind CSS, Lucide React, i18next
- **Automated Testing**: Vitest, React Testing Library, Cargo Test (All 109 unit tests passing)

---

## 📋 2. Implemented Core Modules & Functional Specifications

### 1. Gamepad Management & Tri-Input Bridge

- [x] **1.1 Hotplug Detection & Automatic Scanning**:
  - Automatically lists all connected gamepads via `gilrs` on application startup.
  - Detects disconnects, reconnections, and Bluetooth pairings in real time.
- [x] **1.2 Broad Controller Support & Input Normalization**:
  - Supports 8BitDo Micro (D-mode / S-mode), Joy-Con (Left/Right/Dual), Switch Pro Controller, etc.
  - Normalizes button codes and stick axes across operating systems and hardware vendors.
- [x] **1.3 Pairing Guides & System Shortcuts**:
  - Built-in visual mode-switching and pairing guides for 8BitDo Micro and Joy-Cons.
  - One-click shortcut to launch macOS Bluetooth system settings.
- [x] **1.4 Tri-Input Bridge Merging Algorithm**:
  - **Physical Gamepad**: Low-latency polling via `gilrs` (< 1ms latency).
  - **Computer Keyboard**: Default WASD analog stick simulation and key mappings with 8-direction conflict resolution.
  - **Screen Touch / Mouse**: 120Hz direct DOM Transform hardware acceleration, pointer capture, and spring physics snapback (`useStickDrag`), protected by a minimum 140ms pulse duration (`usePulsedButtonPress`).
  - **State Merging (`gamepad.rs`)**: Digital buttons use logical OR; stick axes and D-Pad prioritize active virtual inputs; one-click Mute mode neutralizes all signals to avoid accidental presses.
- [x] **1.5 Live Ghost Visualizer & Mini HUD Mode**:
  - Ghost-themed 2D controller with dynamic Ditto expression feedback and real-time stick angle rendering.
  - Responsive Auto Scale-to-Fit; automatically switches to a compact HUD widget when window width < 720px or height < 460px.

---

### 2. Live Input Timeline Stream

- [x] **2.1 5-Track Reverse Taiko / DAW Style Music Score Canvas**:
  - Track 0: Action buttons (ABXY)
  - Track 1: D-Pad directions
  - Track 2: Analog sticks & L3/R3 clicks
  - Track 3: Shoulder buttons (L/R/ZL/ZR)
  - Track 4: System buttons (Minus/Plus/Home/Capture)
- [x] **2.2 Real-time Optical Beam Stretching & Grid Markers**:
  - Dynamically stretches optical trail beams during sustained presses.
  - Supports speed presets (10s / 15s / 30s / 60s) with 5s / 1s time division grid markers.
- [x] **2.3 High-Performance Rendering**:
  - Supports `devicePixelRatio` scaling for crisp rendering on Retina displays.
  - Boundary fade gradient mask with dynamic visible action count statistics.

---

### 3. ESP32 Sequential Hardware Management & Firmware Flasher

- [x] **3.1 Serial Port Enumeration & Chip Detection**:
  - Automatically discovers serial ports and prioritizes ESP32 chips (CH340, CP2102, FTDI).
  - Filters virtual Bluetooth serial ports and redundant macOS tty devices.
- [x] **3.2 60Hz Heartbeat & 3-Step Handshake State Machine**:
  - Establishes a 19200 baud serial connection with a 3-step handshake (`0xFF` ➔ `0x33` ➔ `0xCC`) and checks for `0x90` ACK replies.
  - Background thread maintains a strict 60Hz heartbeat packet loop backed by ESP32's 200ms fail-safe watchdog.
- [x] **3.3 Switch Pairing & Quick Reconnection**:
  - Guides the user through the Switch "Change Grip / Order" pairing screen using L+R signals.
  - Remembers pairing bonds for one-click A / Home button wake-up reconnection.
  - Provides a "Clear Bonds" command for pairing with different Switch consoles.
  - Automatically sends neutral packets (Safe Disconnect) when closing the serial link.
- [x] **3.4 One-Click Firmware Flasher**:
  - Pre-bundled with merged binary `firmware/PRO-UART0.bin` (flashed at address `0x0`).
  - Supports custom user `.bin` firmware files.
  - Integrated 460800 baud high-speed flasher with live terminal logs and progress percentage display; automatically resets the board upon completion.

---

### 4. Macro Studio - Real-Time Delta Recorder

- [x] **4.1 3-2-1 Countdown Overlay**:
  - Triggers a prominent 3-2-1 countdown animation upon clicking "Record", giving the user time to ready their hands on the gamepad or keyboard.
- [x] **4.2 Millisecond-Precision Delta Capture Algorithm (`useMacroRecorder.ts`)**:
  - Digital buttons: Records timestamp on press; calculates precise `durationMs` and subsequent `delayAfterMs` on release.
  - Analog sticks: Starts recording when stick movement exceeds the deadzone threshold (`STICK_DEADZONE = 25`), packing vector and duration upon recentering.
  - D-Pad: Records direction and duration as soon as input departs from center (`8`).
- [x] **4.3 Dynamic Recording UI & Step Counter**:
  - Displays a pulsing red recording indicator, elapsed timer, and live recorded action counter.
- [x] **4.4 Save Macro Modal (`SaveMacroModal.tsx`)**:
  - Modal prompts upon stopping recording, allowing custom names, descriptions, and tag categorization (`#Pokemon`, `#ACNH`, `#Spam`).

---

### 5. Macro Studio - Timeline Editor & Playback Engine

- [x] **5.1 Multi-Track Score Sheet & Step List Editor**:
  - Visual DAW-style blocks across 5 tracks (`MacroScoreSheet.tsx`, `MacroStepList.tsx`).
  - Direct inline editing of hold duration (`durationMs`) and wait delay (`delayAfterMs`).
  - Drag-and-drop step reordering, duplicate step, delete step, and one-click idle time trimming.
- [x] **5.2 Macro Library & Persistence (`macroStorage.ts`)**:
  - Built-in presets: Pokémon Infinite Spin, Animal Crossing Meteor Wish, Zelda Bullet Time Aim.
  - Persistent browser `localStorage` with tag filtering and search.
- [x] **5.3 File Import / Export & Full Backup**:
  - Export individual macros as `.json` files.
  - One-click full library backup (`ghostpad_macros_backup_*.json`).
  - Drag-and-drop JSON file upload with automatic schema validation and auto-repair.
- [x] **5.4 Loop Playback & Speed Adjustment (`useMacroPlayer.ts`)**:
  - Three playback loop modes: Single run (1), N loops (2–999), and infinite loop (∞).
  - 4 speed multipliers: 0.5x, 1.0x, 1.5x, 2.0x.
  - Taiko-style live playback stream tracking active steps and loop counters.
- [x] **5.5 Emergency Abort Fail-Safe**:
  - Pressing the keyboard `Esc` key or clicking the "Emergency Abort" button instantly cancels all pending timers.
  - Calls Rust backend `reset_virtual_inputs` to send a neutral packet immediately, preventing sticky buttons.

---

### 6. Native Internationalization (i18n)

- [x] **6.1 Full Trilingual Coverage**:
  - Complete translations for Traditional Chinese (`zh-TW`), English (`en`), and Japanese (`ja`).
  - Covers navigation, dashboard, hardware setup, macro studio, error codes, and toast notifications.
- [x] **6.2 Automatic Detection & Persistence**:
  - Detects operating system language on first launch.
  - Allows instant hot-switching via the top-right navbar dropdown, persisting preference to local storage.

---

## 🧪 3. Verification & Automated Testing

Ghost-Pad includes an automated testing pipeline covering both frontend and backend:

| Test Suite | Tool / Framework | Count | Scope | Result |
| :--- | :--- | :---: | :--- | :---: |
| **Frontend Unit & Component Tests** | Vitest + React Testing Library | **89** | Keyboard mapping, stick math, timeline canvas, macro studio, hardware UI, i18n | ✅ All Passed |
| **Backend Core Protocol Tests** | Cargo Test (Rust) | **20** | CRC8 verification, 9/10-byte encoding, state merging, axis clamping, serial manager | ✅ All Passed |
| **Total** | **Full-Stack Test Suite** | **109** | **Complete coverage from binary packets to UI interactions** | **100% Passed** |

---

## 🗺️ 4. Milestone Delivery Record

- **Phase 1 (Completed)**: Tauri v2 + React 19 foundation, `gilrs` physical gamepad polling, keyboard mapping, and 120Hz live visualizer.
- **Phase 2 (Completed)**: ESP32 60Hz heartbeat protocol, 3-step handshake, Switch pairing guide, and one-click firmware flasher.
- **Phase 3 (Completed)**: Macro Studio, 3-2-1 delta recording, DAW score sheet editor, loop playback engine, global `Esc` fail-safe abort, and JSON import/export.
- **Phase 4 (Completed)**: Live timeline stream canvas (InputTimelineStream), optical beam trails, and mini HUD widget auto-switching.
- **Phase 5 (Completed)**: Full i18n (zh-TW, en, ja), 109 automated tests passing, macOS Universal binary packaging, and GitHub Actions CI/CD release workflow.

