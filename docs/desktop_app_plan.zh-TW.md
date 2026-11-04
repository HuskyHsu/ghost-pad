# 🎮 Ghost-Pad Desktop: 系統實作與規格手冊 (System Implementation & Feature Specification)

<div align="center">

**[English](desktop_app_plan.md) | [繁體中文](desktop_app_plan.zh-TW.md) | [日本語](desktop_app_plan.ja.md)**

</div>

本文件為 **Ghost-Pad Desktop (Tauri v2 + Rust + React 19 + TypeScript)** 的完整系統實作規格手冊與功能清單。記錄所有已完成實作之模組規格、資料流向、演算法及驗收成果。

---

## 📌 一、核心架構與技術棧

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ 前端 UI (Tauri Webview / React 19 + TypeScript + Tailwind CSS)          │
│ - 幽靈手把動態儀表板 (Live Gamepad Visualizer with Ditto Expressions)   │
│ - 反向太鼓 / DAW 五線譜即時操作時序流 (Live Timeline Stream)            │
│ - 巨集工作坊 (Macro Studio: 3-2-1 側錄、多軌編輯器、Taiko 回放串流)       │
│ - 序列埠與 ESP32 韌體燒錄控制台 (Sequential Hardware Management)        │
│ - 多國語系 (i18n: 繁體中文 zh-TW / 英文 en / 日文 ja)                   │
└────────────────────────────────────▲────────────────────────────────────┘
                                     │ Tauri IPC (invoke / emit)
┌────────────────────────────────────▼────────────────────────────────────┐
│ 後端核心 (Rust Core / desktop/src-tauri)                                │
│ - gilrs          : 實體手把原生事件監聽 (8BitDo Micro / Joy-Con / Pro)  │
│ - serial.rs      : 高速 USB 序列通訊、60Hz 心跳與 200ms 防暴走看門狗   │
│ - protocol.rs    : UARTSwitchCon 9-Byte CRC8 & Custom 10-Byte XOR 編碼器│
│ - gamepad.rs     : 三路並行輸入合併演算法 (Physical ∪ Virtual)          │
│ - lib.rs         : 系統對話框 (檔案匯入/匯出/儲存) 與 IPC API 橋接     │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ USB Serial (19200 baud / Flash: 460800)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 硬體端 (ESP32 Dev Module)                                               │
│ - 接收 PC 序列埠封包並校驗 CRC8 / XOR                                   │
│ - 模擬原廠 Nintendo Switch Pro Controller (Bluetooth Classic BR/EDR)   │
│ - 200ms 心跳逾時安全保護機制 (Fail-Safe Watchdog)                       │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ 藍牙 HID (Report ID 0x30)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 主機端 (Nintendo Switch)                                                │
│ - 於「更改拿法 / 順序」辨識為標準 1P 無線 Pro Controller                 │
└─────────────────────────────────────────────────────────────────────────┘
```

- **桌面核心框架**：Tauri v2 (macOS Universal binary, Apple Silicon + Intel)
- **後端語言**：Rust (`serialport`, `gilrs`, `tokio`, `serde`, `crc8`)
- **前端技術**：React 19, TypeScript, Tailwind CSS, Lucide React, i18next
- **測試工具**：Vitest, React Testing Library, Cargo Test (前後端共 109 項單元測試全數通過)

---

## 📋 二、核心實作模組與功能規格

### 1. 連接電腦的手把管理與三路並行橋接 (Gamepad Management & Tri-Input Bridge)

- [x] **1.1 手把自動掃描與熱插拔偵測 (Hotplug Detection)**：
  - 應用程式啟動時透過 `gilrs` 自動列出所有已連線的手把。
  - 即時捕捉斷線、插入與藍牙重連事件，更新手把選單。
- [x] **1.2 多廠牌手把支援與鍵位正規化**：
  - 支援 8BitDo Micro（D 模式 / S 模式）、Joy-Con（左/右/雙持）、Switch Pro 等手把。
  - 後端自動正規化按鈕代碼與軸向數值，消除作業系統與硬體廠牌差異。
- [x] **1.3 手把配對引導與系統捷徑**：
  - 內建 8BitDo Micro 與 Joy-Con 的配對按鈕切換圖解。
  - 提供一鍵開啟 macOS 系統藍牙偏好設定。
- [x] **1.4 三路輸入並行合併演算法 (Tri-Input Bridge)**：
  - **實體手把**：`gilrs` 低延遲輪詢（延遲 < 1ms）。
  - **電腦鍵盤**：預設 WASD 搖桿推動與鍵盤按鍵映射，D-Pad 8 向衝突消除演算法。
  - **螢幕觸控 / 滑鼠**：120Hz 直接 DOM Transform 硬體加速、Pointer Capture 與物理微彈跳（`useStickDrag`），最小脈衝 140ms 保護（`usePulsedButtonPress`）。
  - **狀態合併 (`gamepad.rs`)**：數位按鍵採 OR 邏輯；方向與類比軸脫離中立時優先採用虛擬輸入；支援一鍵靜音（Mute）模式防止誤觸。
- [x] **1.5 幽靈手把動態儀表板與迷你 HUD 模式**：
  - 可愛幽靈造型手把，搭配百變怪動態表情與雙搖桿角度即時渲染。
  - 智慧等比縮放（Auto Scale-to-Fit）；視窗縮小（< 720x460）自動切換為長方形極簡精簡版 HUD 浮動視窗。

---

### 2. 即時操作時序流 (Live Timeline Stream)

- [x] **2.1 反向太鼓 / DAW 5 軌音符五線譜畫布**：
  - 動作鍵 (ABXY)、十字鍵 (D-Pad)、搖桿 (Sticks & L3/R3)、肩鍵 (L/R/ZL/ZR)、系統鍵 (Minus/Plus/Home/Capture)。
- [x] **2.2 長按光帶即時拉伸與刻度標記**：
  - 長按按鍵時自動繪製動態流動光帶，放開時結算音符長度。
  - 支援 10s / 15s / 30s / 60s 速度調控與 5s / 1s 時間刻度網格。
- [x] **2.3 高性能渲染與動態統計**：
  - Canvas 針對 Retina 螢幕支援 `devicePixelRatio` 縮放，線條清晰銳利。
  - 畫布邊緣漸層淡出，即時統計畫面可見操作次數。

---

### 3. ESP32 序列埠與硬體序列管理 (Sequential Hardware Management)

- [x] **3.1 序列埠自動枚舉與晶片識別**：
  - 自動偵測系統序列埠，優先識別 CH340 / CP2102 / FTDI 等常見 ESP32 序列晶片。
  - 自動過濾 macOS 系統藍牙虛擬序列埠與無效 tty 重複埠。
- [x] **3.2 60Hz 心跳通訊與三段式握手狀態機**：
  - 建立 19200 鮑率連線，執行三段式握手：`0xFF` ➔ `0x33` ➔ `0xCC`，並驗證 `0x90` ACK 回應。
  - 背景獨立線程維持 60Hz 定時心跳封包，ESP32 內建 200ms 防暴走看門狗。
- [x] **3.3 Switch 配對與快速喚醒**：
  - 支援 Switch「更改拿法 / 順序」L+R 配對引導與連線記憶。
  - 支援後續開機一鍵 A 鍵 / Home 鍵喚醒回連。
  - 提供「重置藍牙配對記憶 (Clear Bonds)」指令以切換不同 Switch 主機。
  - 斷開連線時主動發送中立訊號（Safe Disconnect），防止角色暴走。
- [x] **3.4 一鍵韌體燒錄控制台 (Firmware Flasher)**：
  - 內建專案整合二進位檔 `firmware/PRO-UART0.bin`（起始位址 `0x0`）。
  - 支援使用者自訂選擇其他 `.bin` 檔案。
  - 整合 460800 高速燒錄、即時終端輸出日誌與進度百分比顯示，燒錄完畢自動重啟。

---

### 4. 巨集即時側錄工作坊 (Macro Studio - Delta Recorder)

- [x] **4.1 3-2-1 醒目倒數緩衝 (Countdown Overlay)**：
  - 點擊「側錄巨集」後觸發全螢幕 3-2-1 醒目倒數動畫，讓操作者握妥手把就位。
- [x] **4.2 毫秒級差分時序捕獲演算法 (`useMacroRecorder.ts`)**：
  - 數位鍵：按壓瞬間記錄起始時間，鬆開時精準結算持續時間 (`durationMs`) 與間隔延遲 (`delayAfterMs`)。
  - 類比搖桿：超出死區門檻 (`STICK_DEADZONE = 25`) 時開始計時並記錄推動向量，回彈時自動打包為步驟。
  - 十字鍵：脫離中立 (8) 時記錄推動方向與持續時間。
- [x] **4.3 動態側錄指示與即時統計**：
  - 錄製中顯示動態呼吸紅點計時器與當前已錄製動作計數。
- [x] **4.4 腳本儲存對話框 (`SaveMacroModal.tsx`)**：
  - 側錄結束自動彈窗，可自訂腳本名稱、備註說明與分類標籤（如 `#寶可夢`、`#動森`、`#連點`）。

---

### 5. 巨集時間軸編輯器與循環回放系統 (Macro Editor & Playback Engine)

- [x] **5.1 多軌五線譜時間軸與步驟清單 (`MacroScoreSheet.tsx`, `MacroStepList.tsx`)**：
  - 以 DAW 多軌卡片區塊展示腳本動作（ABXY、十字鍵、搖桿、肩鍵、系統鍵）。
  - 支援直接點擊微調持長 (`durationMs`) 與延遲 (`delayAfterMs`)。
  - 支援動作拖曳重新排序、上移/下移、複製單步、刪除步驟。
  - 一鍵修剪功能：清除開頭與結尾無效空檔。
- [x] **5.2 腳本庫管理與持久化儲存 (`macroStorage.ts`)**：
  - 預設精選腳本：寶可夢無限孵蛋 (Infinite Spin)、動森流星許願 (Auto A Spam)、薩爾達林克時間 (Bullet Time Aim)。
  - 本地快取自動儲存與載入，支援標籤篩選與搜尋。
- [x] **5.3 跨平台檔案匯入/匯出與全庫備份**：
  - 支援單一腳本匯出為 `.json` 檔案。
  - 支援全腳本庫打包一鍵備份 (`ghostpad_macros_backup_*.json`)。
  - 支援檔案拖曳上傳匯入，內建結構驗證與自動修復機制。
- [x] **5.4 循環回放與調速控制 (`useMacroPlayer.ts`)**：
  - 三次回放模式：單次播放、指定 N 次循環 (2~999 次)、∞ 無限循環。
  - 四段變速調整：0.5x、1.0x、1.5x、2.0x 動作調速。
  - 仿太鼓達人即時回放串流（Taiko Playback Stream），即時追蹤當前正在執行的動作卡片與循環計數。
- [x] **5.5 緊急安全中斷防護 (Emergency Fail-Safe)**：
  - 全域按下鍵盤 `Esc` 鍵或點擊 UI 「緊急中止」按鈕，立即清除所有 pending 定時器。
  - 後端立即調用 `reset_virtual_inputs` 送出中立狀態，杜絕手把卡鍵。

---

### 6. 多國語系原生支援 (Internationalization - i18n)

- [x] **6.1 三種語言完全覆蓋**：
  - 繁體中文 (`zh-TW`)、英文 (`en`)、日文 (`ja`)。
  - 涵蓋通用導航、儀表板、硬體連線、巨集工作坊、錯誤代碼與 Toast 通知。
- [x] **6.2 語言偵測與切換**：
  - 自動偵測系統語言，支援右上角下拉選單即時熱切換，設定自動持久化。

---

## 🧪 三、自動化測試與驗證成果

專案具備完整的前後端測試鏈路，保證核心邏輯的高穩定性與防回歸能力：

| 測試模組 | 工具 / 框架 | 測試項目數 | 驗證重點 | 結果 |
| :--- | :--- | :---: | :--- | :---: |
| **前端單元與元件測試** | Vitest + React Testing Library | **89 項** | 鍵盤映射、搖桿計算、五線譜渲染、巨集錄製/回放、硬體管理 UI、i18n 多語系 | ✅ 全部通過 |
| **後端核心通訊測試** | Cargo Test (Rust) | **20 項** | CRC8 校驗、9-Byte/10-Byte 封包編碼、輸入狀態合併、類比死區鉗制、序列通訊 | ✅ 全部通過 |
| **總計** | **全鏈路自動化測試** | **109 項** | **從底層封包到頂層 UI 互動完整覆蓋** | **100% 通過** |

---

## 🗺️ 四、實作里程碑交付紀錄

- **Phase 1 (已完成)**：Tauri v2 + React 19 專案架構、`gilrs` 實體手把輪詢、鍵盤映射與 120Hz 幽靈動態儀表板。
- **Phase 2 (已完成)**：ESP32 60Hz 心跳通訊協議、三段式握手、Switch 配對引導、一鍵韌體燒錄控制台。
- **Phase 3 (已完成)**：巨集工作坊 (Macro Studio)、3-2-1 差分時序側錄、DAW 多軌五線譜編輯器、循環回放引擎、全域 Esc 卡鍵保護、JSON 匯入匯出備份。
- **Phase 4 (已完成)**：五線譜即時操作時序流畫布 (InputTimelineStream)、長按光帶拉伸、迷你 HUD 模式自適應切換。
- **Phase 5 (已完成)**：完整多國語系 (繁中/英/日)、前後端 109 項自動化測試覆蓋、macOS Universal 二進位打包與 GitHub Actions CI/CD 發布。

