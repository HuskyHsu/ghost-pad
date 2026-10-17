import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { HardwareSettings } from "../components/HardwareSettings";
import { invoke } from "@tauri-apps/api/core";

describe("HardwareSettings Component (Sequential Two-Step Management)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    (invoke as any).mockImplementation((cmd: string) => {
      if (cmd === "get_serial_ports") {
        return Promise.resolve([
          {
            port_name: "/dev/cu.usbserial-0001",
            description: "Silicon Labs CP2102",
            usb_info: { vid: 0x10c4, pid: 0xea60 },
          },
          {
            port_name: "/dev/cu.wchusbserial1410",
            description: "WCH CH340",
            usb_info: { vid: 0x1a86, pid: 0x7523 },
          },
        ]);
      }
      if (cmd === "get_serial_status") {
        return Promise.resolve({
          is_connected: false,
          port_name: undefined,
          baudrate: 19200,
          packets_sent: 0,
          tx_fps: 0,
          switch_pairing_state: "disconnected",
        });
      }
      if (cmd === "probe_firmware") {
        return Promise.resolve(true);
      }
      return Promise.resolve(undefined);
    });
  });

  it("renders header and the three management step sections and status cards", async () => {
    render(<HardwareSettings />);

    expect(screen.getByText(/ESP32 硬體與連線控制台/i)).toBeInTheDocument();
    expect(screen.getByText(/硬體與韌體/i)).toBeInTheDocument();
    expect(screen.getAllByText(/虛擬手把服務/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Switch 主機連線/i)[0]).toBeInTheDocument();

    expect(screen.getByText(/步驟 0：檢查 USB 連線與 ESP32 韌體/i)).toBeInTheDocument();
    expect(screen.getByText(/步驟 1：開關虛擬手把服務/i)).toBeInTheDocument();
    expect(screen.getByText(/步驟 2：Switch 自動配對與連線/i)).toBeInTheDocument();
  });

  it("lists detected serial ports and allows selecting port", async () => {
    render(<HardwareSettings />);

    await waitFor(() => {
      const selects = screen.getAllByRole("combobox");
      expect(selects.length).toBeGreaterThanOrEqual(1);
      expect(selects[0]).toBeInTheDocument();
    });
  });

  it("toggles virtual controller service (connect/disconnect serial)", async () => {
    const onConn = vi.fn();
    const onPairing = vi.fn();
    render(
      <HardwareSettings
        onConnectionChange={onConn}
        onPairingChange={onPairing}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("開啟虛擬手把").closest("button")).not.toBeDisabled();
    });

    const toggleBtn = screen.getByText("開啟虛擬手把");
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("connect_serial", {
        portName: "/dev/cu.usbserial-0001",
        baudrate: 19200,
      });
      expect(onConn).toHaveBeenCalledWith(true);
      expect(onPairing).toHaveBeenCalledWith("disconnected");
    });
  });

  it("keeps virtual controller locked when firmware handshake fails (even on a recognized ESP32 chip)", async () => {
    (invoke as any).mockImplementation((cmd: string) => {
      if (cmd === "get_serial_ports") {
        return Promise.resolve([
          {
            port_name: "/dev/cu.usbserial-0001",
            description: "Silicon Labs CP2102",
            usb_info: { vid: 0x10c4, pid: 0xea60 },
          },
        ]);
      }
      if (cmd === "probe_firmware") return Promise.resolve(false);
      if (cmd === "get_serial_status") {
        return Promise.resolve({
          is_connected: false,
          baudrate: 19200,
          packets_sent: 0,
          tx_fps: 0,
          switch_pairing_state: "disconnected",
        });
      }
      return Promise.resolve(undefined);
    });

    const onStep0 = vi.fn();
    render(<HardwareSettings onStep0Change={onStep0} />);

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("probe_firmware", {
        portName: "/dev/cu.usbserial-0001",
        baudrate: 19200,
      });
      expect(screen.getByText(/未通過 PRO-UART0 韌體交握/)).toBeInTheDocument();
    });

    const toggleBtn = screen.getByText("開啟虛擬手把").closest("button")!;
    expect(toggleBtn).toBeDisabled();
    fireEvent.click(toggleBtn);
    expect(invoke).not.toHaveBeenCalledWith("connect_serial", expect.anything());
    expect(onStep0).not.toHaveBeenCalledWith(true);
  });

  it("does not report connected when backend rejects connection", async () => {
    (invoke as any).mockImplementation((cmd: string) => {
      if (cmd === "get_serial_ports") {
        return Promise.resolve([
          { port_name: "/dev/cu.usbserial-0001", description: "CP2102" },
        ]);
      }
      if (cmd === "probe_firmware") return Promise.resolve(true);
      if (cmd === "connect_serial") {
        return Promise.reject("ESP32 韌體驗證失敗：交握超時");
      }
      if (cmd === "get_serial_status") {
        return Promise.resolve({
          is_connected: false,
          baudrate: 19200,
          packets_sent: 0,
          tx_fps: 0,
          switch_pairing_state: "disconnected",
        });
      }
      return Promise.resolve(undefined);
    });

    const onConn = vi.fn();
    render(<HardwareSettings onConnectionChange={onConn} />);

    await waitFor(() => {
      expect(screen.getByText("開啟虛擬手把").closest("button")).not.toBeDisabled();
    });
    fireEvent.click(screen.getByText("開啟虛擬手把"));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("connect_serial", expect.anything());
      expect(screen.getByText("開啟虛擬手把").closest("button")).toBeDisabled();
    });
    expect(onConn).not.toHaveBeenCalledWith(true);
  });

  it("sends L+R handshake command when connected", async () => {
    (invoke as any).mockImplementation((cmd: string) => {
      if (cmd === "get_serial_ports") {
        return Promise.resolve([
          { port_name: "/dev/cu.usbserial-0001", description: "CP2102" },
        ]);
      }
      if (cmd === "get_serial_status") {
        return Promise.resolve({
          is_connected: true,
          port_name: "/dev/cu.usbserial-0001",
          baudrate: 19200,
          packets_sent: 100,
          tx_fps: 60,
          switch_pairing_state: "pairing",
        });
      }
      if (cmd === "send_serial_command") {
        return Promise.resolve(undefined);
      }
      return Promise.resolve(undefined);
    });

    const onPairing = vi.fn();
    render(<HardwareSettings onPairingChange={onPairing} />);

    await waitFor(() => {
      expect(
        screen.getByText("開始首次配對 (送出 L+R 並記憶)")
      ).toBeInTheDocument();
    });

    const lrBtn = screen.getByText("開始首次配對 (送出 L+R 並記憶)");
    fireEvent.click(lrBtn);

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("send_serial_command", {
        command: "pair_lr",
      });
      expect(onPairing).toHaveBeenCalledWith("connected");
    });
  });

  it("sends wake reconnect command when connected", async () => {
    localStorage.setItem("ghostpad_switch_paired", "true");
    (invoke as any).mockImplementation((cmd: string) => {
      if (cmd === "get_serial_ports") {
        return Promise.resolve([
          { port_name: "/dev/cu.usbserial-0001", description: "CP2102" },
        ]);
      }
      if (cmd === "get_serial_status") {
        return Promise.resolve({
          is_connected: true,
          port_name: "/dev/cu.usbserial-0001",
          baudrate: 19200,
          packets_sent: 100,
          tx_fps: 60,
          switch_pairing_state: "connected",
        });
      }
      if (cmd === "send_serial_command") {
        return Promise.resolve(undefined);
      }
      return Promise.resolve(undefined);
    });

    render(<HardwareSettings />);

    await waitFor(() => {
      expect(
        screen.getByText("手動觸發自動回連 (A鍵喚醒)")
      ).toBeInTheDocument();
    });

    const wakeBtn = screen.getByText("手動觸發自動回連 (A鍵喚醒)");
    fireEvent.click(wakeBtn);

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("send_serial_command", {
        command: "wake_reconnect",
      });
    });
  });

  it("handles simulated firmware flashing process", async () => {
    render(<HardwareSettings />);

    // Open flasher drawer
    const flasherToggle = screen.getByText("韌體燒錄工具");
    fireEvent.click(flasherToggle);

    await waitFor(() => {
      expect(screen.getByText("開始燒錄 PRO-UART0.bin")).toBeInTheDocument();
    });

    const flashBtn = screen.getByText("開始燒錄 PRO-UART0.bin");
    fireEvent.click(flashBtn);

    expect(screen.getByText("正在燒錄韌體中...")).toBeInTheDocument();
  });
});
