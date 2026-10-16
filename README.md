# 👻 Ghost-Pad (PC-to-Switch Controller Bridge)

Ghost-Pad 是專為 Nintendo Switch 打造的高效能虛擬手把代理、視覺化儀表板與自動化控制系統。  
透過電腦作為智慧控制器核心，經由 USB 序列埠傳輸指令給 ESP32 開發板，以原廠藍牙無線模擬 **Nintendo Switch Pro Controller**。

---

## 🌟 核心特色

- 🎮 **三路並行操作橋接 (Tri-Input Bridge)**：
  - **實體手把**：藍牙或 USB 連接 8BitDo Micro、Switch Pro Controller、Joy-Con 原生低延遲輪詢。
  - **電腦鍵盤**：預設 WASD 與鍵盤鍵位映射，支援斜向推動與確認/取消/功能鍵。
  - **螢幕觸控 / 滑鼠**：直接點擊幽靈控制器按鈕或平滑拖曳類比搖桿（支援 120Hz 零延遲硬體加速）。
- 👻 **幽靈手把動態儀表板 (Live Visualizer)**：
  - 擬真可愛幽靈造型手把，動態表情回饋與搖桿角度視覺化。
  - 響應式自動等比縮放，支援自適應切換迷你懸浮 HUD 模式視窗。
- 🎼 **即時操作時序流 (Live Timeline Stream)**：
  - 5 軌專業音樂五線譜架構（動作鍵、十字鍵、搖桿、肩鍵、系統鍵），即時記錄操作時序長按光帶。
- ⚡ **嚴格三步硬體管理 (Hardware Control)**：
  - ESP32 序列埠與晶片自動識別（CH340 / CP2102 / FTDI 等）。
  - 一鍵開關 60Hz 心跳封包傳輸線程與防暴走看門狗（Watchdog Fail-Safe）。
  - Switch 自動配對記憶與快速 A 鍵喚醒回連。

---

## 📁 專案架構導覽

```
ghost-pad/
├── desktop/                  # 🖥️ 主桌面應用程式 (Tauri v2 + React 19 + TypeScript + Rust)
│   ├── ARCHITECTURE.md       # 詳細技術架構手冊與通訊規格
│   ├── README.md             # 桌面端使用與編譯教學
│   ├── src/                  # 前端 React 視覺化與互動 UI
│   └── src-tauri/            # 後端 Rust (gilrs 手把輪詢、serial 60Hz 心跳、protocol 封包)
├── firmware/                 # 🔌 ESP32 韌體資源
│   └── PRO-UART0.bin         # 預設 Switch Pro Controller 藍牙模擬韌體
└── docs/                     # 📚 開發與規劃文件
    ├── technical_spec.md     # 底層二進位協定 (CRC8 / XOR) 規格書
    └── desktop_app_plan.md   # 系統需求與實作清單
```

---

## 🚀 快速啟動桌面端 (Getting Started)

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
- 📖 [桌面端完整使用手冊 (desktop/README.md)](file:///Users/shihchi/Developer/ghost-pad/desktop/README.md)
- 📐 [系統架構與通訊協定手冊 (desktop/ARCHITECTURE.md)](file:///Users/shihchi/Developer/ghost-pad/desktop/ARCHITECTURE.md)

---

## 🧪 自動化測試 (Automated Testing)

本專案具備完整的前後端單元測試與 GitHub Actions CI/CD 流程：

```bash
# 執行前端測試 (57 項全通)
cd desktop && npm test

# 執行 Rust 後端通訊與狀態合併測試 (18 項全通)
cd desktop/src-tauri && cargo test
```
