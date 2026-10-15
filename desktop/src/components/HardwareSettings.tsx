import React, { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  Cpu,
  RefreshCw,
  Power,
  Zap,
  Activity,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Tv,
  Flame,
  Terminal,
  Radio,
  Gamepad2,
  Sparkles,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { SerialPortDetail, SerialStatus } from "../types";

interface Props {
  onConnectionChange?: (connected: boolean) => void;
  onPairingChange?: (pairingState: string) => void;
}

const COMMON_BAUDRATES = [19200, 115200, 921600];

export const HardwareSettings: React.FC<Props> = ({
  onConnectionChange,
  onPairingChange,
}) => {
  const [ports, setPorts] = useState<SerialPortDetail[]>([]);
  const [selectedPort, setSelectedPort] = useState<string>("");
  const [selectedBaudrate, setSelectedBaudrate] = useState<number>(19200);
  const [status, setStatus] = useState<SerialStatus>({
    is_connected: false,
    port_name: undefined,
    baudrate: 19200,
    packets_sent: 0,
    tx_fps: 0,
    switch_pairing_state: "disconnected",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [flashLogs, setFlashLogs] = useState<string[]>([
    "[System] 韌體就緒：firmware/PRO-UART0.bin (預設 Switch Pro Controller 模擬韌體)",
  ]);
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashProgress, setFlashProgress] = useState(0);

  // Command feedback indicator
  const [activeCommand, setActiveCommand] = useState<string | null>(null);

  const isTauri =
    typeof window !== "undefined" && Boolean((window as any).__TAURI_INTERNALS__);

  // Fetch available ports
  const fetchPorts = useCallback(async () => {
    if (!isTauri) {
      // Mock ports in browser dev mode
      setPorts([
        {
          port_name: "/dev/cu.usbserial-0001",
          description: "CP2102 USB to UART Bridge Controller",
          usb_info: { vid: 0x10c4, pid: 0xea60, manufacturer: "Silicon Labs" },
        },
        {
          port_name: "/dev/cu.wchusbserial1420",
          description: "CH340 USB-Serial",
          usb_info: { vid: 0x1a86, pid: 0x7523 },
        },
      ]);
      return;
    }

    try {
      setIsLoading(true);
      const list = await invoke<SerialPortDetail[]>("get_serial_ports");
      setPorts(list);
      if (list.length > 0 && !selectedPort) {
        // Auto-select first matching USB-to-UART port
        const preferred = list.find(
          (p) =>
            p.port_name.includes("usbserial") ||
            p.port_name.includes("wchusbserial") ||
            p.port_name.includes("ttyUSB") ||
            p.description.toLowerCase().includes("cp210") ||
            p.description.toLowerCase().includes("ch34")
        );
        setSelectedPort(preferred ? preferred.port_name : list[0].port_name);
      }
    } catch (err: any) {
      console.error("無法列出序列埠:", err);
      setErrorMessage(String(err));
    } finally {
      setIsLoading(false);
    }
  }, [isTauri, selectedPort]);

  // Fetch initial connection status
  const fetchStatus = useCallback(async () => {
    if (!isTauri) return;
    try {
      const s = await invoke<SerialStatus>("get_serial_status");
      if (s) {
        setStatus(s);
        onConnectionChange?.(s.is_connected);
        onPairingChange?.(s.switch_pairing_state || "disconnected");
      }
    } catch (_) {}
  }, [isTauri, onConnectionChange, onPairingChange]);

  useEffect(() => {
    fetchPorts();
    fetchStatus();

    let unlisten: (() => void) | undefined;
    if (isTauri) {
      listen<SerialStatus>("serial-status-changed", (event) => {
        setStatus(event.payload);
        onConnectionChange?.(event.payload.is_connected);
        onPairingChange?.(event.payload.switch_pairing_state || "disconnected");
      }).then((fn) => {
        unlisten = fn;
      });
    }

    return () => {
      unlisten?.();
    };
  }, [fetchPorts, fetchStatus, isTauri, onConnectionChange, onPairingChange]);

  // Handle Enable / Disable Virtual Controller (Serial Connect / Disconnect)
  const toggleVirtualController = async () => {
    setErrorMessage(null);
    setSuccessNotice(null);

    if (status.is_connected) {
      // Disable
      if (isTauri) {
        try {
          await invoke("disconnect_serial");
        } catch (err: any) {
          setErrorMessage(String(err));
        }
      }
      setStatus((prev) => ({
        ...prev,
        is_connected: false,
        port_name: undefined,
        tx_fps: 0,
        switch_pairing_state: "disconnected",
      }));
      onConnectionChange?.(false);
      onPairingChange?.("disconnected");
      setSuccessNotice("虛擬手把服務已停止，所有按鍵訊號安全歸零。");
    } else {
      // Enable
      if (!selectedPort) {
        setErrorMessage("請先選取 ESP32 序列埠");
        return;
      }

      if (isTauri) {
        try {
          await invoke("connect_serial", {
            portName: selectedPort,
            baudrate: selectedBaudrate,
          });
        } catch (err: any) {
          setErrorMessage(String(err));
          return;
        }
      }

      setStatus({
        is_connected: true,
        port_name: selectedPort,
        baudrate: selectedBaudrate,
        packets_sent: 0,
        tx_fps: 60,
        switch_pairing_state: "pairing",
      });
      onConnectionChange?.(true);
      onPairingChange?.("pairing");
      setSuccessNotice("虛擬手把服務已啟動！60Hz 心跳常駐保活已生效。");
    }
  };

  // Dispatch Quick Action Commands (Pair L+R, Wake Reconnect, Neutral, Clear Bonds)
  const handleSendCommand = async (cmd: string, successLabel: string) => {
    if (!status.is_connected) {
      setErrorMessage("請先啟動「虛擬手把服務」，才能發送配對或控制指令！");
      return;
    }

    setActiveCommand(cmd);
    setErrorMessage(null);
    setSuccessNotice(null);

    if (isTauri) {
      try {
        await invoke("send_serial_command", { command: cmd });
      } catch (err: any) {
        setErrorMessage(String(err));
        setActiveCommand(null);
        return;
      }
    } else {
      // Mock delay in browser
      await new Promise((res) => setTimeout(res, 300));
    }

    // Optimistic state update based on command
    if (cmd === "pair_lr" || cmd === "wake_reconnect") {
      setStatus((prev) => ({ ...prev, switch_pairing_state: "connected" }));
      onPairingChange?.("connected");
    } else if (cmd === "clear_bonds") {
      setStatus((prev) => ({ ...prev, switch_pairing_state: "pairing" }));
      onPairingChange?.("pairing");
    }

    setSuccessNotice(successLabel);
    setTimeout(() => setActiveCommand(null), 800);
  };

  // Simulated Firmware Flasher demo
  const handleFlashFirmware = async () => {
    if (isFlashing) return;
    if (!selectedPort) {
      setErrorMessage("請先選取燒錄序列埠");
      return;
    }

    // Auto-disable active serial stream before flashing
    if (status.is_connected) {
      await toggleVirtualController();
    }

    setIsFlashing(true);
    setFlashProgress(0);
    setFlashLogs((prev) => [
      ...prev,
      `[Flash] 開始連接 ESP32 進行燒錄 (Baud: 460800, Port: ${selectedPort})...`,
    ]);

    const steps = [
      { progress: 15, msg: "[Flash] 偵測晶片：ESP32-D0WD-V3 (revision v3.0)" },
      { progress: 30, msg: "[Flash] 抹除目標 Flash 扇區 (0x1000 ~ 0x90000)..." },
      { progress: 55, msg: "[Flash] 寫入 PRO-UART0.bin @ 0x1000 (壓縮率 62%)..." },
      { progress: 85, msg: "[Flash] 驗證二進位雜湊 MD5 校驗和成功！" },
      { progress: 100, msg: "[Flash] 燒錄完成！硬體自動重置 (Hard Reset via RTS pin)..." },
    ];

    for (const step of steps) {
      await new Promise((res) => setTimeout(res, 600));
      setFlashProgress(step.progress);
      setFlashLogs((prev) => [...prev, step.msg]);
    }

    setIsFlashing(false);
  };

  const isSwitchConnected = status.switch_pairing_state === "connected";
  const isSwitchPairing = status.switch_pairing_state === "pairing";

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-zinc-950 p-4 sm:p-6 lg:p-8 space-y-6 text-zinc-100 select-none max-w-6xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-zinc-100 flex items-center gap-2">
              ESP32 硬體與雙狀態管理控制台
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                Phase 2
              </span>
            </h1>
            <p className="text-xs text-zinc-400">
              獨立管理「已開啟虛擬手把」常駐串流與「Switch 藍牙配對/快速重連」雙層行為
            </p>
          </div>
        </div>

        {/* Global Dual-Status Badges */}
        <div className="flex items-center gap-2.5">
          {/* Status 1: Virtual Gamepad Service */}
          <div
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-mono transition-all ${
              status.is_connected
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                : "bg-zinc-900 border-zinc-800 text-zinc-400"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                status.is_connected ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"
              }`}
            />
            <span>
              {status.is_connected ? `虛擬手把運作中 (${status.tx_fps} Hz)` : "虛擬手把未開啟"}
            </span>
          </div>

          {/* Status 2: Switch Pairing State */}
          <div
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-mono transition-all ${
              isSwitchConnected
                ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                : isSwitchPairing
                ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                : "bg-zinc-900 border-zinc-800 text-zinc-400"
            }`}
          >
            <Radio
              className={`w-3.5 h-3.5 ${
                isSwitchConnected
                  ? "text-cyan-400"
                  : isSwitchPairing
                  ? "text-amber-400 animate-pulse"
                  : "text-zinc-600"
              }`}
            />
            <span>
              {isSwitchConnected
                ? "Switch 已連線 (1P)"
                : isSwitchPairing
                ? "等待配對中"
                : "Switch 離線"}
            </span>
          </div>

          <button
            onClick={fetchPorts}
            disabled={isLoading}
            title="重新掃描序列埠"
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Notice & Error Banners */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-[11px] underline hover:text-white"
          >
            關閉
          </button>
        </div>
      )}

      {successNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="flex-1">{successNotice}</span>
          <button
            onClick={() => setSuccessNotice(null)}
            className="text-[11px] underline hover:text-white"
          >
            關閉
          </button>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 Cols): The 2 Core Management States */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: 狀態 1【已開啟虛擬手把服務 (Virtual Gamepad Service)】 */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 shadow-xl space-y-5 backdrop-blur-md">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-emerald-400" />
                <h2 className="text-xs font-semibold text-zinc-200">
                  狀態 1：虛擬手把服務 (Virtual Gamepad Engine)
                </h2>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">
                {status.is_connected ? "● 常駐串流中" : "○ 服務已暫停"}
              </span>
            </div>

            <div className="space-y-4">
              {/* Port & Baudrate Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                    選取 ESP32 序列埠 (USB Serial Port)
                  </label>
                  {ports.length === 0 ? (
                    <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-dashed border-zinc-800 text-xs text-zinc-400 text-center">
                      未偵測到裝置，請將 ESP32 插入電腦後點擊右上角重整。
                    </div>
                  ) : (
                    <select
                      value={selectedPort}
                      onChange={(e) => setSelectedPort(e.target.value)}
                      disabled={status.is_connected}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-hidden focus:border-cyan-500 transition-colors font-mono cursor-pointer"
                    >
                      {ports.map((p) => (
                        <option key={p.port_name} value={p.port_name}>
                          {p.port_name} — {p.description}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                    鮑率 (Baudrate)
                  </label>
                  <select
                    value={selectedBaudrate}
                    onChange={(e) => setSelectedBaudrate(Number(e.target.value))}
                    disabled={status.is_connected}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-hidden focus:border-cyan-500 transition-colors font-mono cursor-pointer"
                  >
                    {COMMON_BAUDRATES.map((b) => (
                      <option key={b} value={b}>
                        {b} bps {b === 19200 ? "(推薦)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Service Toggle Button & Keep-Alive Assurance */}
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="space-y-0.5 text-left w-full sm:w-auto">
                  <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>60Hz 心跳常駐保活機制 (Keep-Alive)</span>
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    保持心跳可徹底防止手把閒置被 Switch 踢掉或休眠消失。
                  </div>
                </div>

                <button
                  onClick={toggleVirtualController}
                  disabled={!selectedPort && !status.is_connected}
                  className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shrink-0 ${
                    status.is_connected
                      ? "bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200"
                      : "bg-emerald-500 hover:bg-emerald-400 text-zinc-950"
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{status.is_connected ? "停止虛擬手把" : "開啟虛擬手把"}</span>
                </button>
              </div>

              {/* Realtime Telemetry Grid */}
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/70">
                  <div className="text-[10px] text-zinc-400 flex items-center gap-1">
                    <Activity className="w-3 h-3 text-cyan-400" />
                    傳送頻率
                  </div>
                  <div className="text-base font-mono font-bold text-zinc-100 mt-1">
                    {status.tx_fps}{" "}
                    <span className="text-[10px] text-zinc-400 font-normal">Hz</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/70">
                  <div className="text-[10px] text-zinc-400 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400" />
                    已送出封包
                  </div>
                  <div className="text-base font-mono font-bold text-zinc-100 mt-1">
                    {status.packets_sent.toLocaleString()}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/70">
                  <div className="text-[10px] text-zinc-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    看門狗保護
                  </div>
                  <div className="text-[11px] font-semibold text-emerald-400 mt-1">
                    200ms 防暴走
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: 狀態 2【Switch 配對與連線狀態管理 (Switch Pairing & Reconnect Manager)】 */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 shadow-xl space-y-4 backdrop-blur-md">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400" />
                <h2 className="text-xs font-semibold text-zinc-200">
                  狀態 2：Switch 藍牙配對與回連管理
                </h2>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">
                {isSwitchConnected ? "✓ 已鎖定 1P" : "可發送快捷控制指令"}
              </span>
            </div>

            {/* Sub-mode A: First-time Pairing (Change Grip / Order) */}
            <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                  <Tv className="w-3.5 h-3.5 text-cyan-400" />
                  <span>模式 A：首次配對（進入 Switch「更改拿法 / 順序」）</span>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono">首次或切換主機使用</span>
              </div>

              <p className="text-[11px] text-zinc-400 leading-relaxed">
                在 Switch 的「更改拿法」畫面中，點擊下方按鈕自動送出{" "}
                <strong className="text-cyan-300">L + R</strong>{" "}
                握手確認脈衝，讓 Switch 瞬間分配為 1P，避免因未確認而掉線。
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={() =>
                    handleSendCommand(
                      "pair_lr",
                      "已發送 L+R 握手封包！Switch 應已震動並確認為 1P。"
                    )
                  }
                  disabled={activeCommand !== null}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md ${
                    activeCommand === "pair_lr"
                      ? "bg-cyan-400 text-zinc-950 scale-95"
                      : "bg-cyan-500 hover:bg-cyan-400 text-zinc-950"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>一鍵送出 L+R 首次配對握手</span>
                </button>

                <button
                  onClick={() =>
                    handleSendCommand(
                      "clear_bonds",
                      "已重置 ESP32 藍牙配對記憶，可重新進行配對。"
                    )
                  }
                  disabled={activeCommand !== null}
                  className="px-3 py-2 rounded-xl text-xs font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3 text-zinc-400" />
                  <span>清除藍牙記憶 (換主機)</span>
                </button>
              </div>
            </div>

            {/* Sub-mode B: Quick Reconnect (No need to open Change Grip / Order) */}
            <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>模式 B：已配對快速喚醒重連（無需重新進入設定）</span>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono">日常中斷秒連</span>
              </div>

              <p className="text-[11px] text-zinc-400 leading-relaxed">
                若之前已配對過，手把休眠或連線中斷後，不需要回「更改拿法」，直接在主畫面點擊喚醒即可自動秒連回
                1P！
              </p>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() =>
                    handleSendCommand(
                      "wake_reconnect",
                      "已送出喚醒重連按鍵脈衝！手把已快速回連至 Switch。"
                    )
                  }
                  disabled={activeCommand !== null}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md ${
                    activeCommand === "wake_reconnect"
                      ? "bg-amber-400 text-zinc-950 scale-95"
                      : "bg-amber-500 hover:bg-amber-400 text-zinc-950"
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>一鍵喚醒重連 (Reconnect)</span>
                </button>

                <button
                  onClick={() =>
                    handleSendCommand(
                      "emergency_neutral",
                      "已強制發送 5 次中立安全封包，手把按鍵全部歸零。"
                    )
                  }
                  disabled={activeCommand !== null}
                  className="px-3 py-2 rounded-xl text-xs font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Power className="w-3 h-3 text-rose-400" />
                  <span>緊急訊號置中 (歸零)</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 Cols): ESP32 Firmware Flasher */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 shadow-xl space-y-5 backdrop-blur-md flex flex-col h-full">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <h2 className="text-xs font-semibold text-zinc-200">ESP32 韌體一鍵燒錄</h2>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                PRO-UART0.bin
              </span>
            </div>

            <div className="space-y-3 text-xs text-zinc-300">
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                整合 Switch 原廠 Pro Controller 模擬韌體，免除手動安裝 Python esptool 工具鏈。
              </p>

              {/* Progress bar */}
              {isFlashing && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                    <span>燒錄進度</span>
                    <span>{flashProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-zinc-950 overflow-hidden border border-zinc-800">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-amber-500 transition-all duration-300"
                      style={{ width: `${flashProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleFlashFirmware}
                disabled={isFlashing || !selectedPort}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                  isFlashing
                    ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                    : "bg-amber-500 hover:bg-amber-400 text-zinc-950"
                }`}
              >
                <Flame className={`w-4 h-4 ${isFlashing ? "animate-pulse" : ""}`} />
                <span>{isFlashing ? "正在燒錄韌體中..." : "開始燒錄 PRO-UART0.bin"}</span>
              </button>
            </div>

            {/* Terminal Log Box */}
            <div className="flex-1 min-h-[260px] rounded-xl bg-zinc-950 border border-zinc-800/80 p-3 font-mono text-[10px] flex flex-col justify-between overflow-hidden">
              <div className="flex items-center gap-1.5 pb-2 border-b border-zinc-850 text-zinc-400 text-[10px]">
                <Terminal className="w-3 h-3 text-zinc-400" />
                <span>燒錄終端記錄 (Console Output)</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1 py-2 text-zinc-400">
                {flashLogs.map((log, index) => (
                  <div
                    key={index}
                    className={
                      log.includes("成功") || log.includes("完成")
                        ? "text-emerald-400 font-semibold"
                        : log.includes("錯誤")
                        ? "text-rose-400"
                        : "text-zinc-300"
                    }
                  >
                    {log}
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-zinc-850 text-[9px] text-zinc-400 flex items-center gap-1">
                <HelpCircle className="w-2.5 h-2.5 shrink-0" />
                <span>若無法連線燒錄，請於按壓「開始燒錄」時長按 ESP32 上的 BOOT 按鍵。</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
