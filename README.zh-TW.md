# 👻 Ghost-Pad (PC-to-Switch Controller Bridge)

<div align="center">

**[English](README.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md)**

高效能 PC 轉 Nintendo Switch 虛擬手把代理、視覺化儀表板與巨集自動化控制系統。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tauri v2](https://img.shields.io/badge/Tauri-v2-24C8DB?logo=tauri&logoColor=white)](https://tauri.app/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Rust](https://img.shields.io/badge/Rust-2021-DEA584?logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-109%20Passed-brightgreen)](desktop)

</div>

---

Ghost-Pad 是專為 Nintendo Switch 打造的高效能虛擬手把代理、視覺化儀表板與巨集自動化控制系統。  
透過電腦作為智慧控制器核心，經由 USB 序列埠傳輸指令給 ESP32 開發板，以原廠藍牙無線模擬 **Nintendo Switch Pro Controller**（VID: `0x057E`，PID: `0x2009`）。

---

## 🌟 核心特色

- 🎮 **三路並行操作橋接 (Tri-Input Bridge)**：
  - **實體手把**：藍牙或 USB 連接 8BitDo Micro、Switch Pro Controller、Joy-Con 原生低延遲輪詢（`gilrs`，延遲 < 1ms）。
  - **電腦鍵盤**：預設 WASD 與鍵盤鍵位映射，支援斜向推動與確認/取消/功能鍵。
  - **螢幕觸控 / 滑鼠**：直接點擊幽靈控制器按鈕或平滑拖曳類比搖桿（支援 120Hz 硬體加速 DOM Transform、Pointer Capture 與物理彈簧回彈）。
  - **智慧狀態合併**：數位鍵聯集（OR 邏輯）、方向與搖桿動態覆蓋、一鍵靜音（Mute）模式防止誤觸。
- 👻 **幽靈手把動態儀表板 (Live Visualizer) & HUD 模式**：
  - 擬真可愛幽靈造型手把，動態百變怪表情回饋與雙搖桿角度視覺化。
  - 響應式自動等比縮放（Auto Scale-to-Fit），視窗縮小時自適應切換為極簡迷你懸浮 HUD 模式視窗。
- 🎼 **即時操作時序流 (Live Timeline Stream)**：
  - 5 軌專業音樂五線譜架構（動作鍵、十字鍵、搖桿、肩鍵、系統鍵），即時記錄操作時序長按光帶。
  - 支援 10s / 15s / 30s / 60s 速度調控與動態操作統計。
- 🎬 **巨集工作坊與循環播放引擎 (Macro Studio & Playback)**：
  - **即時差分側錄 (Delta Recording)**：3-2-1 倒數緩衝，精確以毫秒級捕捉按鍵時長與搖桿向量。
  - **五線譜時間軸與卡片編輯器**：視覺化微調每步動作持續時間 (`duration`) 與間隔延遲 (`delay`)，支援拖曳排序與一鍵修剪空白。
  - **全自動循環回放**：單次播放、指定 N 次循環或 ∞ 無限循環，支援 0.5x~2.0x 動作調速，全域 `Esc` 鍵緊急中斷卡鍵保護。
  - **腳本庫與雲端備份**：內建寶可夢自動孵蛋、動森流星許願等範本，支援單一 JSON 匯出匯入與全庫打包備份。
- ⚡ **嚴格硬體序列管理 (Hardware Management)**：
  - ESP32 序列埠與晶片自動識別（CH340 / CP2102 / FTDI 等），自動過濾虛擬序列埠。
  - 60Hz 心跳封包傳輸線程與防暴走看門狗（Watchdog Fail-Safe，200ms 超時保護）。
  - Switch 專屬引導、自動配對記憶與快速 A/Home 鍵喚醒回連。
  - 內建一鍵韌體燒錄工具（預載 `firmware/PRO-UART0.bin`，免裝額外環境）。
- 🌐 **多國語系原生支援 (i18n)**：
  - 內建繁體中文 (`zh-TW`)、英文 (`en`)、日文 (`ja`)，支援即時無縫切換。

---

## 📁 專案架構導覽

```
ghost-pad/
├── desktop/                  # 🖥️ 主桌面應用程式 (Tauri v2 + React 19 + TypeScript + Rust)
│   ├── ARCHITECTURE.md       # 詳細技術架構手冊與元件設計規格
│   ├── README.md             # 桌面端完整使用與編譯教學
│   ├── src/                  # 前端 React 視覺化與互動 UI
│   │   ├── components/       # 幽靈儀表板、五線譜畫布、硬體管理、巨集工作坊
│   │   ├── hooks/            # useVirtualGamepad, useStickDrag, useMacroRecorder, useMacroPlayer
│   │   └── i18n/             # 多語系配置 (zh-TW, en, ja)
│   └── src-tauri/            # 後端 Rust (gilrs 手把輪詢、serial 60Hz 心跳、protocol 封包)
├── firmware/                 # 🔌 ESP32 韌體資源
│   └── PRO-UART0.bin         # 預設 Switch Pro Controller 藍牙模擬整合韌體 (0x0 起始位址)
└── docs/                     # 📚 規格與實作文件
    ├── technical_spec.md     # 底層二進位協定 (CRC8 / XOR) 與 ESP32 藍牙規格書 (預設英文)
    ├── technical_spec.zh-TW.md # 底層二進位協定規格書 (繁體中文版)
    ├── desktop_app_plan.md   # 桌面系統完整實作規格與模組驗收手冊 (預設英文)
    └── desktop_app_plan.zh-TW.md # 桌面系統實作規格手冊 (繁體中文版)
```

---

## 📦 下載與安裝 (Download & Releases)

一般使用者無需自行安裝開發環境或編譯程式碼：
- 請前往本專案的 **[GitHub Releases 頁面](https://github.com/shihchi/ghost-pad/releases)**。
- 下載最新的 **`Ghost-Pad_<version>_universal.dmg`**（通用二進位版本，同時支援 Apple Silicon M1/M2/M3/M4 與 Intel Mac）。
- 開啟 `.dmg` 檔案，將 **Ghost-Pad** 拖入「應用程式 (Applications)」資料夾即可直接使用！

---

## 🚀 開發者快速啟動 (Getting Started)

請確保電腦已安裝 **Node.js 18+** 與 **Rust 工具鏈**，切換至 `desktop` 目錄即可啟動：

```bash
cd desktop

# 安裝相依套件
npm install

# 啟動桌面端完整開發模式 (Tauri 原生桌面視窗 + Rust 後端)
npm run tauri dev

# 或啟動純前端瀏覽器調試模式 (預覽 UI 與畫布)
npm run dev
```

詳細安裝、快捷鍵對照與架構規範請參閱：
- 📖 [桌面端完整使用手冊 (desktop/README.md)](desktop/README.md)
- 📐 [系統架構與通訊協定手冊 (desktop/ARCHITECTURE.md)](desktop/ARCHITECTURE.md)
- 🔌 [底層通訊與硬體協定規範 (docs/technical_spec.zh-TW.md)](docs/technical_spec.zh-TW.md)
- 📝 [系統實作規格手冊 (docs/desktop_app_plan.zh-TW.md)](docs/desktop_app_plan.zh-TW.md)

---

## 🧪 自動化測試與 CI/CD (Testing & Releases)

本專案具備完整的前後端單元測試（共 109 項測試全數通過）與 GitHub Actions CI/CD 發布流程：

```bash
# 執行前端測試 (89 項全通)
cd desktop && npm test

# 執行 Rust 後端通訊與狀態合併測試 (20 項全通)
cd desktop/src-tauri && cargo test
```

### 🏷️ 建立與發布新版本 (Release Tagging)

每當在 Git 打上版本標籤（例如 `v1.0.0`）並推送到 GitHub 時，CI/CD 會自動啟動：
1. 自動同步版本號至前端與後端設定檔。
2. 執行所有前端（89 項）與後端（20 項）單元測試。
3. 在 macOS Runner 上建置 Universal 二進位應用程式（支援 Apple Silicon 與 Intel）。
4. 自動發布至 **GitHub Releases**，包含 `.dmg` 安裝檔與 `.zip` 壓縮檔供使用者直接下載。

```bash
# 打上版本標籤並推送
git tag v1.0.0
git push origin v1.0.0
```

---

## 📄 授權條款 (License)

本專案基於 [MIT License](LICENSE) 條款開源發布。

