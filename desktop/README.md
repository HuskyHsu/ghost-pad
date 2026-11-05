# 👻 Ghost-Pad Desktop (Virtual Gamepad Visualizer & Bridge Dashboard)

Ghost-Pad Desktop is a high-performance virtual controller bridge, live visualizer dashboard, and macro automation studio built for the Nintendo Switch.  
Powered by **Tauri v2 + React 19 + TypeScript + Tailwind CSS**, it delivers ultra-low system resource utilization, sub-millisecond responsiveness, and a fluid, aesthetically polished interface.

---

## 🌟 Core Features

- 🎮 **Ghost-Pad Visualizer**:
  - Whimsical ghost-shaped controller supporting 120Hz smooth dual-analog stick dragging and dynamic facial expression feedback.
  - Full Nintendo Switch button layout support: ABXY, D-Pad, L/R, ZL/ZR, Minus (-), Plus (+), Home, Capture, and L3/R3 stick clicks.
- 🎼 **Live Multi-Track Timeline Stream (Reverse Taiko / DAW Score Sheet)**:
  - 5-track musical notation architecture (Action, D-Pad, Sticks, Shoulders, System).
  - Real-time stretched ribbons for button holds, configurable time windows (10s / 15s / 30s / 60s), and 5s / 1s time division grid lines.
  - Live onscreen action counter statistics.
- ⌨️ **Tri-Input Bridge**:
  - **Physical Gamepad**: Bluetooth or USB connection for 8BitDo Micro, Switch Pro Controller, Joy-Cons, etc.
  - **Keyboard Mapping**: Preconfigured keyboard controls supporting WASD analog stick emulation and action buttons.
  - **Touch & Mouse HUD**: Direct pointer clicks and analog drag interaction on screen.
- 📐 **Responsive Layout & Mini Floating HUD Mode**:
  - Intelligent auto scale-to-fit layout ensuring zero clipping on any laptop screen or external display.
  - Automatically switches to a compact HUD widget mode when the window is resized below 720×460.
- 🎬 **Macro Studio & Loop Playback Engine**:
  - **Real-Time Delta Recording**: 3-2-1 countdown sequence with millisecond-precision capture of hold durations and analog vector movements.
  - **Multi-Track Score Sheet Editor**: 5 visual tracks for ABXY, D-Pad, Sticks, Shoulders, and System buttons to visually align actions and pauses.
  - **Step-by-Step Script Editing**: Tweak hold duration (ms), reorder steps, and trim idle frames with one click.
  - **Flexible Playback & Speed Adjustment**: Single play, N-repeat loops, or infinite loop playback with 0.5x~2.0x playback speed and a global `Esc` fail-safe abort.
  - **JSON Backup & Presets**: Export individual scripts, drag-and-drop import, and full-library backup, with built-in templates (Pokemon egg hatching, Animal Crossing shooting star wishing, etc.).

---

## 🛠️ Prerequisites

Ensure the following dependencies are installed before getting started:

1. **Node.js**: `v18.0.0` or higher (includes `npm`).
2. **Rust Toolchain** (required for Tauri backend compilation):
   - Install via terminal if not present:
     ```bash
     curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
     ```
   - Ensure environment variables are loaded:
     ```bash
     source "$HOME/.cargo/env"
     cargo --version
     ```
3. **Build Essentials** (macOS Xcode Command Line Tools):
   ```bash
   xcode-select --install
   ```

---

## 🚀 Getting Started

Open your terminal and navigate to the `desktop` directory:

```bash
cd desktop
```

### 1. Install Dependencies

```bash
npm install
```

---

### 2. Development Mode

#### Mode A: Full Desktop Application Mode (Recommended)
Launches the native Tauri desktop window with the Rust backend gamepad polling (`gilrs`) and frontend Hot Reload:

```bash
npm run tauri dev
```

> **Tip**: If your terminal cannot find `cargo` or reports a `cargo metadata` error, execute `source "$HOME/.cargo/env"` first to load your Rust environment variables.

#### Mode B: Frontend-Only Browser Mode
To tweak UI components, styles, or canvas animations without hardware/Tauri bindings:

```bash
npm run dev
```
Open your browser at `http://localhost:1420/`.

---

### 3. Build & Release

#### Frontend Type Checking & Production Build
```bash
npm run build
```

#### Package Production Desktop Installer (.dmg / .app)
```bash
npm run tauri build
```
The packaged bundles will be generated under `src-tauri/target/release/bundle/`.

---

## ⌨️ Default Keyboard Mapping

Click the **Keyboard Map** button in the top-right corner of the application to view the shortcuts at any time:

| Switch Button | Keyboard Key | Description |
| :--- | :--- | :--- |
| **Left Analog Stick** | `W` / `A` / `S` / `D` | Up / Left / Down / Right (supports diagonals) |
| **D-Pad** | `↑` / `↓` / `←` / `→` | Up / Down / Left / Right directional arrows |
| **A Button** | `L` | Confirm / East button |
| **B Button** | `K` | Cancel / South button |
| **X Button** | `I` | Menu / North button |
| **Y Button** | `J` | Function / West button |
| **L Button** | `Q` | Left Shoulder |
| **R Button** | `E` | Right Shoulder |
| **ZL Trigger** | `U` or `1` | Left Trigger |
| **ZR Trigger** | `O` or `2` | Right Trigger |
| **Minus (-)** | `M` or `-` | Minus / Select |
| **Plus (+)** | `P` or `=` | Plus / Start |
| **Home (⌂)** | `H` | Home Button |
| **Capture (◉)** | `N` | Capture / Screenshot |
| **L3 / R3** | `F` / `G` | Left / Right Stick Click |

---

## 📁 Project Directory Structure

> For in-depth architectural specifications, data flow diagrams, and protocol details, refer to [ARCHITECTURE.md](ARCHITECTURE.md).

```
desktop/
├── ARCHITECTURE.md           # System architecture, tri-input bridge, and protocol reference
├── src/                      # Frontend React + TypeScript source code
│   ├── components/           # UI component library
│   │   ├── GamepadVisualizer.tsx   # Ghost gamepad interactive canvas and drag handlers
│   │   ├── InputTimelineStream.tsx # 60~120Hz musical score timeline stream canvas
│   │   ├── CompactWidget.tsx       # Floating mini HUD mode window
│   │   ├── HardwareSettings.tsx    # ESP32 serial port and firmware manager
│   │   ├── MacroStudio.tsx         # Macro recorder, timeline editor, and player
│   │   └── Sidebar.tsx             # Navigation sidebar and controller status
│   ├── hooks/                # Custom React hooks
│   │   ├── useVirtualGamepad.ts    # Keyboard mapping and virtual controller state
│   │   ├── useStickDrag.ts         # Analog stick dragging, RAF IPC throttling, and spring physics
│   │   ├── usePulsedButtonPress.ts # Button pulse duration guarantee and pointer capture
│   │   ├── useMacroRecorder.ts     # Real-time 3-2-1 delta recording hook
│   │   └── useMacroPlayer.ts       # Loop playback engine with Esc fail-safe abort
│   ├── utils/                # Utility helpers
│   │   ├── macroStorage.ts   # Macro library persistence and JSON import/export
│   │   └── tauri.ts          # Tauri desktop environment detection
│   ├── types/                # TypeScript type definitions (controller, macros)
│   ├── App.tsx               # Root application entry and adaptive window controller
│   └── index.css             # Tailwind CSS design system styles
├── src-tauri/                # Tauri Rust backend
│   ├── src/
│   │   ├── gamepad.rs        # gilrs polling and physical/virtual state merging
│   │   ├── protocol.rs       # Switch protocol definitions (9-Byte CRC8 & 10-Byte XOR)
│   │   ├── serial.rs         # Serial communication and 60Hz heartbeat worker thread
│   │   ├── error.rs          # Unified AppError serialization and IPC reporting
│   │   └── lib.rs            # Tauri IPC command bridge registration
│   └── tauri.conf.json       # Tauri window configuration and bundler settings
└── package.json              # Frontend dependencies and npm scripts
```

---

## 🧪 Testing & CI/CD

The project includes automated frontend and backend testing suites integrated with GitHub Actions:

### 1. Running Tests Locally

#### Frontend Unit & Component Tests (Vitest + React Testing Library)
```bash
# Run all frontend tests once
npm test

# Run tests in watch mode (TDD mode)
npm run test:watch
```
Test coverage spans (89 tests passing):
- `types.test.ts`: Verifies default controller structures (neutral stick, centered D-Pad, unpressed buttons).
- `useVirtualGamepad.test.ts`: Keyboard mapping, D-Pad 8-way resolution, tri-input concurrency, and muting.
- `InputTimelineStream.test.ts`: 5-track layout, 8-way stick angle calculation, deadzone filtering, and duration controls.
- `components.test.tsx`: Sidebar navigation, device status badges, mute toggle, HUD mode, and keyboard mapping dialog.
- `MacroStudio.test.tsx` / `useMacroRecorder.test.ts` / `useMacroPlayer.test.ts` / `macroStorage.test.ts`: 3-2-1 delta recording, timeline editing, loop playback, and backup sanitization.
- `HardwareSettings.test.tsx`: Serial port manager, 3-stage handshake, Switch pairing guide, and firmware flashing.
- `i18n.test.ts`: Localization loading, runtime language switching, and translation completeness.

#### Backend Rust Tests (Cargo Test)
```bash
# Run within desktop/src-tauri
cargo test

# Or run from workspace root
cargo test --manifest-path desktop/src-tauri/Cargo.toml
```
Test coverage spans (20 tests passing):
- `protocol.rs`: CRC-8 calculation, UART 9-byte packet encoding, 10-byte XOR verification, D-Pad direction serialization.
- `gamepad.rs`: Analog axis deadzone scaling (`axis_to_u8`), 8-way D-Pad mapping (`compute_dpad`), state merging (`merge`), and mute mode.
- `serial.rs`: Serial manager instantiation, offline safe-command handling, and port scanning.
- `error.rs`: Cross-process `AppError` type serialization and IPC reporting.

---

### 2. GitHub Actions CI/CD Pipeline

The workflows are defined in [`.github/workflows/desktop-ci.yml`](file:///.github/workflows/desktop-ci.yml) and [`.github/workflows/release.yml`](file:///.github/workflows/release.yml):
- **Triggers**:
  - Automatically runs CI verification on pushes to any branch affecting `desktop/**`.
  - Runs on pull requests targeting `main`.
  - Automatically packages and publishes multi-platform releases when a `v*` version tag is pushed.
- **Workflow Jobs**:
  1. **Frontend Check**: Node 20 cache, `npm ci`, TypeScript static analysis (`tsc`), `vite build` production compilation, and all 89 Vitest tests.
  2. **Rust Backend Check**: System libraries, Rust toolchain, Cargo cache, and all 20 Cargo tests.
  3. **Universal Release Build**: Builds universal dual-architecture `.dmg` installers (Apple Silicon M1/M2/M3/M4 + Intel x86_64) on macOS runners and attaches artifacts to GitHub Releases.
