# 👻 Ghost-Pad Desktop (桌面端手把視覺化與代理儀表板)

Ghost-Pad Desktop 是專為 Nintendo Switch 打造的高效能虛擬手把代理與即時視覺化監控桌面應用程式。  
基於 **Tauri v2 + React 19 + TypeScript + Tailwind CSS** 開發，兼具極低資源佔用、毫秒級反應速度與精美流暢的視覺體驗。

---

## 🌟 核心特色

- 🎮 **即時手把視覺化 (Ghost-Pad Visualizer)**：
  - 可愛幽靈造型控制器，支援雙類比搖桿 120Hz 絲滑拖曳與動態百變怪表情回饋。
  - 完整支援 Nintendo Switch 鍵位：ABXY、十字鍵 (D-Pad)、L/R、ZL/ZR、Minus(-)、Plus(+)、Home、Capture 及 L3/R3 搖桿下壓。
- 🎼 **反向太鼓 / DAW 五線譜即時操作時序流 (Live Timeline Stream)**：
  - 5 軌專業音符架構（動作鍵、十字鍵、搖桿、肩鍵、系統鍵）。
  - 長按光帶即時拉伸，支援 10s / 15s / 30s / 60s 速度調控與 5s / 1s 時間刻度網格。
  - 動態即時統計螢幕可見操作次數。
- ⌨️ **三路並行操作輸入 (Tri-Input Bridge)**：
  - **實體手把**：藍牙或 USB 連接 8BitDo Micro、Switch Pro Controller、Joy-Con 等。
  - **鍵盤直控**：預設映射鍵盤鍵位，支援按鍵與 WASD 類比搖桿推動。
  - **螢幕觸控 / 點擊**：直接於畫面上點擊或拖曳手把按鈕。
- 📐 **全面響應式佈局 (RWD) & 迷你懸浮 HUD 模式**：
  - 手把本體智慧自動等比縮放（Auto Scale-to-Fit），在任何筆電與外接螢幕皆零破版。
  - 視窗縮小（< 720x460）自動切換為長方形極簡精簡版 HUD 浮動視窗。

---

## 🛠️ 環境需求 (Prerequisites)

在啟動專案前，請確認電腦已安裝以下環境：

1. **Node.js**：建議 `v18.0.0` 或更高版本（包含 `npm`）。
2. **Rust 工具鏈**（Tauri 後端編譯所需）：
   - 若尚未安裝，請於終端機執行：
     ```bash
     curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
     ```
   - 確認環境變數生效：
     ```bash
     source "$HOME/.cargo/env"
     cargo --version
     ```
3. **系統相依套件**（macOS 通常內建完整環境，Xcode Command Line Tools 即可）：
   ```bash
   xcode-select --install
   ```

---

## 🚀 專案啟動方式 (Getting Started)

請先開啟終端機並切換至 `desktop` 目錄：

```bash
cd /Users/shihchi/Developer/ghost-pad/desktop
```

### 1. 安裝相依套件

初次使用或套件更新時執行：

```bash
npm install
```

---

### 2. 開發模式啟動 (Dev Mode)

#### 模式 A：完整桌面應用程式模式（推薦）
啟動 Tauri 原生桌面視窗，包含 Rust 後端手把輪詢（gilrs）與前端熱重載（Hot Reload）：

```bash
npm run tauri dev
```

> **提示**：若終端機提示找不到 `cargo` 或 `cargo metadata` 錯誤，請先執行 `source "$HOME/.cargo/env"` 載入 Rust 環境變數後再執行。

#### 模式 B：純前端瀏覽器調試模式
若僅需調整前端 UI、CSS 樣式或畫布動畫，可直接啟動 Vite 本地網頁伺服器：

```bash
npm run dev
```
啟動後於瀏覽器開啟：`http://localhost:1420/`

---

### 3. 編譯與打包 (Build & Release)

#### 檢查前端類型與編譯
```bash
npm run build
```

#### 打包正式版桌面安裝檔 (.dmg / .app)
```bash
npm run tauri build
```
打包完成後，安裝檔將產生於 `src-tauri/target/release/bundle/` 目錄中。

---

## ⌨️ 鍵盤操控手把快捷鍵對照表

開啟應用程式後，點擊右上角 **「鍵盤對照表」** 亦可隨時查閱：

| 手把鍵位 | 電腦鍵盤按鍵 | 備註說明 |
| :--- | :--- | :--- |
| **左類比搖桿** | `W` / `A` / `S` / `D` | 上 / 左 / 下 / 右（支援斜向推動） |
| **十字鍵 (D-Pad)** | `↑` / `↓` / `←` / `→` | 方向鍵上下左右 |
| **A 鍵** | `L` | 確認 / 東側鍵 |
| **B 鍵** | `K` | 取消 / 南側鍵 |
| **X 鍵** | `I` | 選單 / 北側鍵 |
| **Y 鍵** | `J` | 功能 / 西側鍵 |
| **L 鍵** | `Q` | 左肩鍵 |
| **R 鍵** | `E` | 右肩鍵 |
| **ZL 鍵** | `U` 或 `1` | 左板機鍵 |
| **ZR 鍵** | `O` 或 `2` | 右板機鍵 |
| **Minus (-)** | `M` 或 `-` | 減號鍵 / Select |
| **Plus (+)** | `P` 或 `=` | 加號鍵 / Start |
| **Home (⌂)** | `H` | 主畫面鍵 |
| **Capture (◉)** | `N` | 截圖錄影鍵 |
| **L3 / R3** | `F` / `G` | 左右類比下壓 |

---

## 📁 目錄結構說明

> 詳細架構規格、資料流向圖與通訊協定請參閱完整技術文件：[ARCHITECTURE.md](file:///Users/shihchi/Developer/ghost-pad/desktop/ARCHITECTURE.md)。

```
desktop/
├── ARCHITECTURE.md           # 系統架構、三路輸入橋接與協定設計手冊
├── src/                      # 前端 React + TypeScript 原始碼
│   ├── components/           # UI 元件庫
│   │   ├── GamepadVisualizer.tsx   # 幽靈手把主舞台與拖曳邏輯
│   │   ├── InputTimelineStream.tsx # 60~120Hz 五線譜時序流 Canvas
│   │   ├── CompactWidget.tsx       # 迷你浮動 HUD 模式視窗
│   │   ├── HardwareSettings.tsx    # ESP32 硬體序列埠與韌體管理
│   │   └── Sidebar.tsx             # 側邊導航與手把連線管理
│   ├── hooks/                # 自訂 React Hooks
│   │   ├── useVirtualGamepad.ts    # 鍵盤映射與虛擬手把狀態
│   │   ├── useStickDrag.ts         # 類比搖桿拖曳、RAF IPC 節流與彈力回彈
│   │   └── usePulsedButtonPress.ts # 按鍵脈衝延遲保證與指標捕捉管理
│   ├── utils/                # 輔助函式庫
│   │   └── tauri.ts          # Tauri 桌面環境識別工具
│   ├── types.ts              # 手把狀態與協定型別定義
│   ├── App.tsx               # 根應用與自適應視窗模式切換
│   └── index.css             # Tailwind CSS 設計樣式
├── src-tauri/                # Tauri Rust 後端
│   ├── src/
│   │   ├── gamepad.rs        # gilrs 手把輪詢、實體虛擬狀態合併
│   │   ├── protocol.rs       # Switch 協定定義 (9-Byte CRC8 / 10-Byte XOR)
│   │   ├── serial.rs         # 序列通訊與 60Hz 心跳封包管理
│   │   └── lib.rs            # Tauri IPC 指令橋接
│   └── tauri.conf.json       # 視窗外觀與打包設定
└── package.json              # 專案相依套件與指令設定
```

---

## 🧪 自動化測試與 CI/CD (Testing & CI/CD)

本專案具備完整的前後端自動化測試與 GitHub Actions 持續整合流程：

### 1. 本地執行測試 (Local Testing)

#### 前端單元與元件測試 (Vitest + React Testing Library)
```bash
# 單次執行全部前端測試
npm test

# 啟用監聽模式 (TDD 模式)
npm run test:watch
```
測試範圍涵蓋：
- `types.test.ts`：預設手把狀態結構驗證（類比置中、D-Pad 置中、按鍵預設）。
- `useVirtualGamepad.test.ts`：鍵盤映射表、D-Pad 8 方向演算法、三路輸入並行與靜音機制。
- `InputTimelineStream.test.ts`：五線譜 5 軌定義、8 方向搖桿角度計算與死區過濾、時間長度切換與清空動作。
- `components.test.tsx`：側邊欄導航、設備狀態、靜音切換、HUD 模式與鍵盤對照表互動。

#### 後端 Rust 測試 (Cargo Test)
```bash
# 於 desktop/src-tauri 目錄下執行
cargo test

# 或於專案根目錄執行
cargo test --manifest-path desktop/src-tauri/Cargo.toml
```
測試範圍涵蓋：
- `protocol.rs`：CRC-8 演算法、UART 9-byte 封包、10-byte XOR 封包校驗、D-Pad 方向序列化/反序列化。
- `gamepad.rs`：類比軸死區計算（`axis_to_u8`）、十字鍵 8 向狀態映射（`compute_dpad`）、實體與虛擬輸入合併（`merge`）、靜音暫停機制。

---

### 2. GitHub Actions CI/CD 串接

工作流程定義於 [`.github/workflows/desktop-ci.yml`](file:///.github/workflows/desktop-ci.yml)：
- **觸發時機**：
  - 只要任何分支有 `desktop/**` 相關變更 `push` 推送即自動執行。
  - 任何分支發起、更新或合併 `pull_request` 時亦自動執行。
- **測試檢查項目**：
  1. **Frontend Check**：Node 20 環境快取、`npm ci`、TypeScript 靜態檢查（`tsc`）與 `vite build` 生產編譯驗證、Vitest 36+ 項全數通過。
  2. **Rust Backend Check**：Ubuntu 系統庫（WebKitGTK、libudev）、Rust toolchain、Cargo 依賴快取、`cargo test` 9+ 項全數通過。

