# 🛠️ PC-to-Switch Controller Bridge: 技術架構與通訊協定規範

本文件記載系統底層架構、通訊協定、ESP32 韌體實作原理與開發者指南。

---

## 1. 系統架構圖

```text
  ┌─────────────────────────────────────────────────────────┐
  │                 PC 端 (Python 3.10+)                    │
  │  - 鍵盤監聽引擎 (pynput, 實體 WASD/技能即時映射)         │
  │  - 宣告式腳本執行器 (JSON / YAML, 毫秒級高精度時間序)    │
  │  - 巨集錄製器 (實時捕獲時序差並導出為標準 JSON)           │
  │  - 50~60Hz 心跳發送循環 & 一鍵 Fail-safe 緊急中斷機制    │
  └───────────────────────────┬─────────────────────────────┘
                              │ USB 序列埠 (Baud: 19200)
                              │ 低延遲二進位封包 (Binary Protocol)
                              ▼
  ┌─────────────────────────────────────────────────────────┐
  │              ESP32 開發板 (Bluetooth Classic)           │
  │  - 高速 Serial 接收與校驗和檢查 (CRC8 / XOR)            │
  │  - 200ms 心跳逾時防暴走看門狗 (Heartbeat Watchdog)      │
  │  - 模擬原廠 Pro Controller (VID: 0x057E, PID: 0x2009)   │
  └───────────────────────────┬─────────────────────────────┘
                              │ 無線藍牙 HID (Report ID 0x30)
                              ▼
  ┌─────────────────────────────────────────────────────────┐
  │                  Nintendo Switch 主機                   │
  │       (在「更改拿法 / 順序」配對完成，視為標準無線手把)    │
  └─────────────────────────────────────────────────────────┘
```

---

## 2. 通訊協定規範 (Protocol Specification)

### 2.1 UARTSwitchCon 9-Byte 串列通訊協定 (當前使用)
搭配燒錄的 `PRO-UART0.bin` 韌體，通訊採用 19200 鮑率，封包結構如下：

| 位元組 (Byte) | 欄位名稱 | 說明 |
| :--- | :--- | :--- |
| **Byte 0** | Button High (`btn_hi`)| 功能鍵遮罩：`[SR, SL, Capture, Home, R3, L3, Plus, Minus]` |
| **Byte 1** | Button Low (`btn_lo`) | 動作鍵遮罩：`[ZR, ZL, R, L, X, A, B, Y]` |
| **Byte 2** | D-Pad 方向 | `0x08=居中, 0x00=上, 0x01=右上, 0x02=右, 0x03=右下, 0x04=下, 0x05=左下, 0x06=左, 0x07=左上` |
| **Byte 3** | Left Stick X | 左搖桿 X (`0~255`，`128` 為中心) |
| **Byte 4** | Left Stick Y | 左搖桿 Y (`0~255`，`0` 最頂，`255` 最底，`128` 居中) |
| **Byte 5** | Right Stick X | 右搖桿 X (`0~255`，`128` 為中心) |
| **Byte 6** | Right Stick Y | 右搖桿 Y (`0~255`，`128` 居中) |
| **Byte 7** | Reserved | 固定 `0x00` |
| **Byte 8** | CRC8 Checksum | 前 8 位元組之 CRC8 校驗碼 (多項式 `0x07`) |

- **握手程序 (Handshake)**：
  1. PC 傳送 `0xFF`，ESP32 回應 `0xFF`（若已連線則回應 `0x90`）。
  2. PC 傳送 `0x33`，ESP32 回應 `0xCC`。
  3. PC 傳送 `0xCC`，ESP32 回應 `0x33`。
  4. 隨後每次接收到合法的 9-byte 封包，ESP32 均會回傳 `0x90` ACK。

---

## 3. ESP32 韌體架構與燒錄指引

### 3.1 為什麼需要藍牙 Classic？
Nintendo Switch 手把使用藍牙 Classic (BR/EDR) HID，而非 BLE。
包含：
- Vendor ID: `0x057E` (Nintendo Co., Ltd.)
- Product ID: `0x2009` (Switch Pro Controller)
- L2CAP 專屬通訊通道 (PSM 0x11, 0x13)
- 0x30 Full Input Report 映射機制（48 bytes，包含 3 bytes 按鍵、12-bit 搖桿與 6 軸 IMU 數據）。

### 3.2 快速燒錄預編譯韌體
使用 `esptool` 直接寫入已包含 Bootloader 與分割表的二進位檔：
```bash
python -m esptool --port /dev/cu.usbserial-1140 --baud 460800 write-flash 0x0 firmware/PRO-UART0.bin
```

### 3.3 Arduino IDE 自行編譯設定
若需自行修改或編譯 [`firmware/esp32_switch_bridge/esp32_switch_bridge.ino`](file:///Users/shihchi/Developer/ghost-pad/firmware/esp32_switch_bridge/esp32_switch_bridge.ino)：
1. 開發板：選擇 **ESP32 Dev Module**
2. 分割表（Partition Scheme）：必須選擇 **`Huge APP (3MB No OTA / 1MB SPIFFS)`**（因藍牙協定棧體積約 1.3MB，預設分區會編譯失敗）。
