# ESP32 韌體 (Firmware)

本專案直接提供預先編譯好的標準韌體，不需另行配置編譯環境或建置韌體。

## 檔案說明

- **`PRO-UART0.bin`**：
  - Switch Pro Controller 藍牙模擬韌體（已包含 Bootloader、分區表及主應用程式的 0x0 合併二進位鏡像）。
  - 通訊協議：UARTSwitchCon 9-Byte + CRC8。
  - 燒錄起始位址：`0x0`。

## 手動燒錄方式 (esptool)

```bash
python -m esptool --port <YOUR_PORT> --baud 460800 write-flash 0x0 firmware/PRO-UART0.bin
```
或直接透過 Ghost-Pad 桌面應用程式中的「硬體設定」面板進行一鍵自動燒錄。

