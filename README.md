# 🎮 PC-to-Switch Controller Bridge (PC 虛擬手把代理系統)

使用電腦作為虛擬控制器與自動化大腦，透過 ESP32 藍牙無線操控 Nintendo Switch！  
支援**電腦鍵盤直控**、**邊玩邊錄製巨集**，以及**高精度自動化循環腳本執行**。

---

## 🚀 快速上手 (Quick Start)

### 1. 啟用環境
開啟終端機進入專案目錄並啟用虛擬環境：
```bash
cd /Users/shihchi/Developer/ghost-pad
source .venv/bin/activate
```

> **查詢序列埠**：若不確定 ESP32 連接埠，執行 `python -m pc_bridge.main --ports` 查看（macOS 通常為 `/dev/cu.usbserial-1140`）。

### 2. Switch 藍牙初次配對
1. ESP32 接上電腦 USB 供電（開機會自動廣播名為 **Pro Controller** 的藍牙）。
2. 在 Switch 主畫面進入 **「控制器」** ➔ **「更改拿法 / 順序」** 搜尋畫面。
3. 等待 3 ~ 8 秒，主機震動並亮起 **1P 綠燈** 即代表配對成功！

---

## 🕹️ 三大核心功能操作說明

### 功能 1：電腦鍵盤即時直控 (Keyboard Direct Control)
直接使用電腦鍵盤操控 Switch 遊戲：

```bash
python -m pc_bridge.main --port /dev/cu.usbserial-1140 keyboard
```

#### ⌨️ 預設按鍵對應表
| 功能分類 | 電腦按鍵 | 對應 Switch 手把按鍵 |
| :--- | :--- | :--- |
| **左搖桿 (移動)** | `W` / `A` / `S` / `D` | 左類比搖桿 (上 / 左 / 下 / 右，支援斜向) |
| **右搖桿 (視角)** | 方向鍵 `↑` / `←` / `↓` / `→` | 右類比搖桿 (視角轉動) |
| **動作按鍵** | `K` | **A 鍵** (確定 / 互動) |
| | `J` | **B 鍵** (取消 / 跑步) |
| | `I` | **X 鍵** (主選單) |
| | `U` | **Y 鍵** (動作技能) |
| **肩鍵與板機** | `Q` / `E` | **L** / **R** 肩鍵 |
| | `Z` / `C` | **ZL** / **ZR** 板機鍵 |
| **十字方向鍵** | `T` / `F` / `G` / `H` | **D-Pad** (上 / 左 / 下 / 右) |
| **系統功能鍵** | `Enter` | **Plus (+)** 暫停選單 |
| | `Backspace` | **Minus (-)** 道具或地圖 |
| | `H` | **Home 鍵** 返回主畫面 |
| | `P` | **截圖 (Capture)** |
| **搖桿下壓** | `Shift` / `Space` | **L3** / **R3** (左/右搖桿下壓) |
| **🚨 緊急退出** | **`ESC`** | **立即停止發送並釋放所有按鍵回歸中立** |

---

### 功能 2：即時巨集錄製器 (Macro Recorder)
一邊看著遊戲畫面即時遊玩，系統自動記錄您的動作時序並匯出為 JSON 腳本：

```bash
python -m pc_bridge.main --port /dev/cu.usbserial-1140 record scripts/my_custom_macro.json
```

1. **實時同步**：鍵盤操作會同步送給 Switch，讓您精確掌握遊戲內的對話與技能時機。
2. **自動計算**：系統自動記錄各按鍵的維持時間（`duration`）與間隔等待（`wait`）。
3. **完成儲存**：操作完畢後按下 **`ESC`**，自動停止並最佳化輸出成 JSON 腳本。

---

### 功能 3：自動化腳本回放 (Script Runner)
讀取預先撰寫或錄製好的 JSON 腳本，全自動執行連點、行走路徑或刷怪循環：

```bash
# 執行 1 次
python -m pc_bridge.main --port /dev/cu.usbserial-1140 script scripts/my_custom_macro.json

# 自動循環執行 100 次
python -m pc_bridge.main --port /dev/cu.usbserial-1140 script scripts/my_custom_macro.json --loop 100

# 無限循環執行 (按 Ctrl+C 或中斷即可安全停止)
python -m pc_bridge.main --port /dev/cu.usbserial-1140 script scripts/my_custom_macro.json --loop 0
```

專案已內建實用範例：
* [`scripts/sample_macro.json`](file:///Users/shihchi/Developer/ghost-pad/scripts/sample_macro.json)：基礎多鍵與搖桿組合技
* [`scripts/shiny_starter_reset.json`](file:///Users/shihchi/Developer/ghost-pad/scripts/shiny_starter_reset.json)：寶可夢 Home 軟重開刷閃腳本
* [`scripts/afk_circle_walk.json`](file:///Users/shihchi/Developer/ghost-pad/scripts/afk_circle_walk.json)：原地繞圈走位孵蛋腳本

---

## ❓ 常見問題與排查 (FAQ)

### Q1. 為什麼玩 GBA（火紅葉綠）時，Switch 主機上的按鈕沒有反應？
* **原因**：GBA 為單人遊戲，**只接受 Player 1 (1P) 控制器的輸入**。當 ESP32 連接後，主機會將 ESP32 指派為 **1P**，而掌機本體上的 Joy-Con 會順延為 2P，因此主機按鈕在遊戲內被忽略（但由電腦操作完全正常）。
* **切換回掌機實體手把自己玩**：到 Switch 首頁 ➔「控制器」➔「更改拿法 / 順序」，用實體手把按 `L+R` 搶回 1P 順位即可；拔掉 ESP32 時也會自動恢復。

### Q2. 鍵盤直控模式啟動了，但按鍵沒有反應？
* **macOS 權限問題**：macOS 監聽全域鍵盤需要輔助使用授權。請開啟 Mac **「系統設定」➔「隱私權與安全性」➔「輔助使用 (Accessibility)」**，確認目前使用的終端機軟體（如 **Terminal**、**iTerm** 或 **Cursor / VS Code**）已被**勾選允許**。

### Q3. 如何燒錄韌體到 ESP32？
若有新的開發板需燒錄，直接執行：
```bash
python -m esptool --port /dev/cu.usbserial-1140 --baud 460800 write-flash 0x0 firmware/PRO-UART0.bin
```

---

## 📖 進階技術與開發者文件

關於系統底層二進位通訊協定、XOR/CRC8 校驗機制、心跳看門狗保護，以及 ESP32 Arduino C++ 韌體架構，請參閱：
👉 **[`docs/technical_spec.md`](file:///Users/shihchi/Developer/ghost-pad/docs/technical_spec.md)**
