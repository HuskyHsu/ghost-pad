import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { HardwareSettings } from "../components/HardwareSettings";
import { invoke } from "@tauri-apps/api/core";

describe("HardwareSettings Component (Phase 2 Two-State Management)", () => {
  beforeEach(() => {
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
      return Promise.resolve(undefined);
    });
  });

  it("renders header and the two management state sections", async () => {
    render(<HardwareSettings />);

    expect(screen.getByText(/ESP32 硬體與雙狀態管理控制台/i)).toBeInTheDocument();
    expect(screen.getByText(/狀態 1：虛擬手把服務/i)).toBeInTheDocument();
    expect(screen.getByText(/狀態 2：Switch 藍牙配對與回連管理/i)).toBeInTheDocument();
    expect(screen.getByText("ESP32 韌體一鍵燒錄")).toBeInTheDocument();
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
      expect(screen.getByText("開啟虛擬手把")).toBeInTheDocument();
    });

    const toggleBtn = screen.getByText("開啟虛擬手把");
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("connect_serial", {
        portName: "/dev/cu.usbserial-0001",
        baudrate: 19200,
      });
      expect(onConn).toHaveBeenCalledWith(true);
      expect(onPairing).toHaveBeenCalledWith("pairing");
    });
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
        screen.getByText("一鍵送出 L+R 首次配對握手")
      ).toBeInTheDocument();
    });

    const lrBtn = screen.getByText("一鍵送出 L+R 首次配對握手");
    fireEvent.click(lrBtn);

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("send_serial_command", {
        command: "pair_lr",
      });
      expect(onPairing).toHaveBeenCalledWith("connected");
    });
  });

  it("sends wake reconnect command when connected", async () => {
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
        screen.getByText("一鍵喚醒重連 (Reconnect)")
      ).toBeInTheDocument();
    });

    const wakeBtn = screen.getByText("一鍵喚醒重連 (Reconnect)");
    fireEvent.click(wakeBtn);

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("send_serial_command", {
        command: "wake_reconnect",
      });
    });
  });

  it("handles simulated firmware flashing process", async () => {
    render(<HardwareSettings />);

    await waitFor(() => {
      expect(screen.getByText("開始燒錄 PRO-UART0.bin")).toBeInTheDocument();
    });

    const flashBtn = screen.getByText("開始燒錄 PRO-UART0.bin");
    fireEvent.click(flashBtn);

    expect(screen.getByText("正在燒錄韌體中...")).toBeInTheDocument();
  });
});
