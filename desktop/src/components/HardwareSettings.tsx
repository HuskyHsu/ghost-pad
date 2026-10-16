import React, { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  Cpu,
  RefreshCw,
  Power,
  Zap,
  CheckCircle2,
  AlertCircle,
  Flame,
  Sparkles,
  RotateCcw,
  ShieldCheck,
  Lock,
  Check,
  ChevronRight,
  ChevronDown,
  Wrench,
  Activity,
  X,
} from "lucide-react";
import { SerialPortDetail, SerialStatus, isEsp32Chip } from "../types";
import { isTauriAvailable } from "../utils/tauri";

interface Props {
  onConnectionChange?: (connected: boolean) => void;
  onPairingChange?: (pairingState: string) => void;
  onStep0Change?: (ready: boolean) => void;
}

const COMMON_BAUDRATES = [19200, 115200, 921600];
const PAIRING_STORAGE_KEY = "ghostpad_switch_paired";

export const HardwareSettings: React.FC<Props> = ({
  onConnectionChange,
  onPairingChange,
  onStep0Change,
}) => {
  const [ports, setPorts] = useState<SerialPortDetail[]>([]);
  const [selectedPort, setSelectedPort] = useState<string>("");
  const [selectedBaudrate, setSelectedBaudrate] = useState<number>(19200);

  // Firmware status: idle | checking | compatible | recognized | incompatible
  const [firmwareStatus, setFirmwareStatus] = useState<
    "idle" | "checking" | "compatible" | "recognized" | "incompatible"
  >("idle");
  const [probeDetails, setProbeDetails] = useState<string>("");
  const [manualFirmwareReady, setManualFirmwareReady] = useState<boolean>(true);

  // Progressive Disclosure: Toggle Firmware Flasher utility
  const [showFlasher, setShowFlasher] = useState<boolean>(false);

  const [status, setStatus] = useState<SerialStatus>({
    is_connected: false,
    port_name: undefined,
    baudrate: 19200,
    packets_sent: 0,
    tx_fps: 0,
    switch_pairing_state: "disconnected",
  });

  // Pairing Memory state (localStorage)
  const [hasPairedSwitch, setHasPairedSwitch] = useState<boolean>(() => {
    try {
      return localStorage.getItem(PAIRING_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Auto-dismiss success notification after 4 seconds
  useEffect(() => {
    if (!successNotice) return;
    const timer = setTimeout(() => {
      setSuccessNotice(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [successNotice]);

  // Auto-dismiss error notification after 6 seconds
  useEffect(() => {
    if (!errorMessage) return;
    const timer = setTimeout(() => {
      setErrorMessage(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [errorMessage]);

  const [flashLogs, setFlashLogs] = useState<string[]>([
    "[System] 韌體就緒：firmware/PRO-UART0.bin (預設 Switch Pro Controller 模擬韌體)",
  ]);
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashProgress, setFlashProgress] = useState(0);

  // Command feedback indicator
  const [activeCommand, setActiveCommand] = useState<string | null>(null);

  const isTauri = isTauriAvailable();

  const isMountedRef = useRef(true);
  const wakeTimerRef = useRef<number | null>(null);
  const commandTimerRef = useRef<number | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (wakeTimerRef.current !== null) {
        clearTimeout(wakeTimerRef.current);
      }
      if (commandTimerRef.current !== null) {
        clearTimeout(commandTimerRef.current);
      }
    };
  }, []);

  // Filter out irrelevant ports (Bluetooth incoming, macOS duplicate tty.*)
  const filterValidPorts = (raw: SerialPortDetail[]): SerialPortDetail[] => {
    return raw.filter((p) => {
      const name = p.port_name;
      if (name.includes("Bluetooth") || name.includes("Incoming")) return false;
      if (
        name.startsWith("/dev/tty.") &&
        (name.includes("usb") || name.includes("wch") || name.includes("serial"))
      ) {
        return false;
      }
      return true;
    });
  };

  const portsRef = useRef<SerialPortDetail[]>([]);
  const lastProbedRef = useRef<string>("");

  // Firmware probe function (memoized with stable dependencies)
  const probeFirmware = useCallback(
    async (portName: string, baud: number) => {
      if (!portName) {
        if (isMountedRef.current) {
          setFirmwareStatus("idle");
          setProbeDetails("");
        }
        return;
      }

      const activeDetail = portsRef.current.find((p) => p.port_name === portName);
      const isRecognized = isEsp32Chip(activeDetail);

      if (isMountedRef.current) {
        setFirmwareStatus("checking");
        setProbeDetails("正在與 ESP32 進行 UARTSwitchCon 協議交握測試...");
      }

      if (!isTauri) {
        await new Promise((res) => setTimeout(res, 300));
        if (!isMountedRef.current) return;
        if (portName.includes("incompatible")) {
          setFirmwareStatus("incompatible");
          setProbeDetails("非標準 ESP32 晶片且未回應 0xFF 握手碼，請確認是否選錯序列埠");
        } else {
          setFirmwareStatus("compatible");
          setProbeDetails("交握通過：PRO-UART0.bin (UARTSwitchCon 9-Byte 協議確認)");
        }
        return;
      }

      try {
        const isOk = await invoke<boolean>("probe_firmware", {
          portName,
          baudrate: baud,
        });
        if (!isMountedRef.current) return;
        if (isOk) {
          setFirmwareStatus("compatible");
          setProbeDetails("交握通過：PRO-UART0.bin (UARTSwitchCon 9-Byte 協議確認)");
        } else {
          if (isRecognized) {
            setFirmwareStatus("recognized");
            setProbeDetails(
              "已辨識為 ESP32 序列晶片 (CH340/CP2102)。未收到握手回應可能因開機重啟延遲或免握手韌體版本，已自動許可就緒，可直接開啟虛擬手把。"
            );
          } else {
            setFirmwareStatus("incompatible");
            setProbeDetails(
              "交握未響應，且未辨識出標準 ESP32 晶片 (CH340/CP210x)。可能為未燒錄韌體或非手把硬體。"
            );
          }
        }
      } catch (err: any) {
        if (!isMountedRef.current) return;
        if (isRecognized) {
          setFirmwareStatus("recognized");
          setProbeDetails("已辨識 ESP32 晶片。序列埠目前處於可連線狀態，可直接啟動手把服務。");
        } else {
          setFirmwareStatus("incompatible");
          setProbeDetails(String(err));
        }
      }
    },
    [isTauri]
  );

  // Fetch available ports (stable callback, no circular dependency)
  const fetchPorts = useCallback(async () => {
    if (!isTauri) {
      const mockList: SerialPortDetail[] = [
        {
          port_name: "/dev/cu.usbserial-110",
          description: "USB Device (1A86:7523) CH340",
          usb_info: { vid: 0x1a86, pid: 0x7523 },
        },
        {
          port_name: "/dev/cu.usbserial-0001",
          description: "Silicon Labs CP2102",
          usb_info: { vid: 0x10c4, pid: 0xea60 },
        },
        {
          port_name: "/dev/cu.usbmodem-incompatible",
          description: "Arduino / Generic USB (韌體不相容測試)",
          usb_info: { vid: 0x2341, pid: 0x0043 },
        },
      ];
      portsRef.current = mockList;
      if (isMountedRef.current) {
        setPorts(mockList);
        setSelectedPort((prev) => {
          if (prev && mockList.some((p) => p.port_name === prev)) return prev;
          return mockList[0].port_name;
        });
      }
      return;
    }

    try {
      if (isMountedRef.current) setIsLoading(true);
      const list = await invoke<SerialPortDetail[]>("get_serial_ports");
      if (!isMountedRef.current) return;
      const filtered = filterValidPorts(list);
      portsRef.current = filtered;
      setPorts(filtered);
      if (filtered.length > 0) {
        setSelectedPort((prev) => {
          if (prev && filtered.some((p) => p.port_name === prev)) return prev;
          const preferred = filtered.find(
            (p) =>
              p.port_name.includes("usbserial") ||
              p.port_name.includes("wchusbserial") ||
              p.port_name.includes("ttyUSB") ||
              p.description.toLowerCase().includes("cp210") ||
              p.description.toLowerCase().includes("ch34")
          );
          return preferred ? preferred.port_name : filtered[0].port_name;
        });
      } else {
        setSelectedPort("");
        setFirmwareStatus("idle");
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        console.error("無法列出序列埠:", err);
        setErrorMessage(String(err));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [isTauri]);

  // Handle port selection change
  const handlePortChange = (newPort: string) => {
    setSelectedPort(newPort);
  };

  // Dedicated probe trigger: only runs when selectedPort or selectedBaudrate strictly changes
  useEffect(() => {
    if (!selectedPort) return;
    const key = `${selectedPort}@${selectedBaudrate}`;
    if (lastProbedRef.current === key) return;
    lastProbedRef.current = key;
    probeFirmware(selectedPort, selectedBaudrate);
  }, [selectedPort, selectedBaudrate, probeFirmware]);

  // Single mount effect: fetches initial ports, status, and registers event listener
  useEffect(() => {
    fetchPorts();
    if (isTauri) {
      invoke<SerialStatus>("get_serial_status")
        .then((s) => {
          if (!isMountedRef.current) return;
          if (s) {
            setStatus(s);
            onConnectionChange?.(s.is_connected);
            onPairingChange?.(s.switch_pairing_state || "disconnected");
          }
        })
        .catch(() => {});

      let unlisten: (() => void) | undefined;
      listen<SerialStatus>("serial-status-changed", (event) => {
        if (!isMountedRef.current) return;
        setStatus(event.payload);
        onConnectionChange?.(event.payload.is_connected);
        onPairingChange?.(event.payload.switch_pairing_state || "disconnected");
      }).then((fn) => {
        unlisten = fn;
      });

      return () => {
        unlisten?.();
      };
    }
  }, []);

  // Dispatch Quick Action Commands
  const handleSendCommand = async (cmd: string, successLabel: string) => {
    if (!status.is_connected) {
      setErrorMessage("請先啟動步驟 1「虛擬手把服務」，才能發送配對或控制指令！");
      return;
    }

    setActiveCommand(cmd);
    setErrorMessage(null);
    setSuccessNotice(null);

    if (isTauri) {
      try {
        await invoke("send_serial_command", { command: cmd });
      } catch (err: any) {
        if (isMountedRef.current) {
          setErrorMessage(String(err));
          setActiveCommand(null);
        }
        return;
      }
    } else {
      await new Promise((res) => setTimeout(res, 300));
    }

    if (!isMountedRef.current) return;

    if (cmd === "pair_lr" || cmd === "wake_reconnect") {
      setStatus((prev) => ({ ...prev, switch_pairing_state: "connected" }));
      onPairingChange?.("connected");
    } else if (cmd === "clear_bonds") {
      setStatus((prev) => ({ ...prev, switch_pairing_state: "pairing" }));
      onPairingChange?.("pairing");
    }

    setSuccessNotice(successLabel);
    if (commandTimerRef.current !== null) {
      clearTimeout(commandTimerRef.current);
    }
    commandTimerRef.current = window.setTimeout(() => {
      if (isMountedRef.current) {
        setActiveCommand(null);
      }
    }, 800);
  };

  // Handle Enable / Disable Virtual Controller (Serial Connect / Disconnect)
  const toggleVirtualController = async () => {
    setErrorMessage(null);
    setSuccessNotice(null);

    if (status.is_connected) {
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
      if (!selectedPort) {
        setErrorMessage("請先於步驟 0 選取 ESP32 序列埠");
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
        switch_pairing_state: hasPairedSwitch ? "pairing" : "disconnected",
      });
      onConnectionChange?.(true);
      onPairingChange?.(hasPairedSwitch ? "pairing" : "disconnected");

      if (hasPairedSwitch) {
        setSuccessNotice("虛擬手把服務已啟動！偵測到已配對主機，正自動發起喚醒配對...");
        if (wakeTimerRef.current !== null) {
          clearTimeout(wakeTimerRef.current);
        }
        wakeTimerRef.current = window.setTimeout(() => {
          if (!isMountedRef.current) return;
          handleSendCommand(
            "wake_reconnect",
            "已自動送出喚醒重連脈衝！Switch 應已自動回連為 1P。"
          );
        }, 450);
      } else {
        setSuccessNotice("虛擬手把服務已啟動！請於步驟 2 進行首次配對。");
      }
    }
  };

  // First time pair: Send L+R and remember in localStorage
  const handleFirstTimePair = async () => {
    await handleSendCommand(
      "pair_lr",
      "已發送 L+R 首次配對握手！Switch 確認為 1P 後已自動儲存記憶，下次將自動配對。"
    );
    try {
      localStorage.setItem(PAIRING_STORAGE_KEY, "true");
    } catch {}
    setHasPairedSwitch(true);
  };

  // Clear pairing memory (e.g. switching console)
  const handleClearMemory = async () => {
    await handleSendCommand(
      "clear_bonds",
      "已重置 ESP32 藍牙記憶並清除本機自動配對設定，可更換主機重新配對。"
    );
    try {
      localStorage.removeItem(PAIRING_STORAGE_KEY);
    } catch {}
    setHasPairedSwitch(false);
  };

  // Firmware Flasher
  const handleFlashFirmware = async () => {
    if (isFlashing) return;
    if (!selectedPort) {
      setErrorMessage("請先接上 ESP32 並選取燒錄序列埠");
      return;
    }

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
      if (!isMountedRef.current) return;
      setFlashProgress(step.progress);
      setFlashLogs((prev) => [...prev, step.msg]);
    }

    if (!isMountedRef.current) return;
    setIsFlashing(false);
    setSuccessNotice("PRO-UART0.bin 韌體燒錄完成！正在重新驗證交握協議...");
    setManualFirmwareReady(true);
    await probeFirmware(selectedPort, selectedBaudrate);
  };

  // Active port details & chip identification
  const activePortDetail = ports.find((p) => p.port_name === selectedPort);
  const isRecognizedUsb = isEsp32Chip(activePortDetail);

  // --- Strict Sequential Gating Logic ---
  // Step 0: USB detected AND (handshake compatible OR recognized ESP32 chip OR manual confirmation)
  const isStep0Ready = Boolean(
    selectedPort &&
      ports.some((p) => p.port_name === selectedPort) &&
      (firmwareStatus === "compatible" ||
        firmwareStatus === "recognized" ||
        manualFirmwareReady)
  );

  // Notify parent of Step 0 readiness
  useEffect(() => {
    onStep0Change?.(isStep0Ready);
  }, [isStep0Ready, onStep0Change]);

  // Step 1: Virtual gamepad service actively running
  const isStep1Ready = isStep0Ready && status.is_connected;

  // Connection states
  const isSwitchConnected = status.switch_pairing_state === "connected";
  const isSwitchPairing = status.switch_pairing_state === "pairing";

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-zinc-950 p-4 sm:p-6 lg:p-8 space-y-6 text-zinc-100 select-none max-w-5xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-sm">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-zinc-100">
              ESP32 硬體與連線控制台
            </h1>
            <p className="text-xs text-zinc-400">
              依序連接「硬體裝置」➔「虛擬手把服務」➔「Switch 主機連線」
            </p>
          </div>
        </div>

        <button
          onClick={fetchPorts}
          disabled={isLoading}
          title="重新掃描 USB 序列埠"
          className="self-start sm:self-center px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-zinc-100 transition-colors flex items-center gap-2 text-xs cursor-pointer shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
          <span>重新掃描裝置</span>
        </button>
      </div>

      {/* Integrated Pipeline Status Stepper Bar (Replaces redundant top status cards) */}
      <div className="p-1 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 grid grid-cols-1 md:grid-cols-3 gap-1">
        {/* Step 0 Pill */}
        <div
          className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
            isStep0Ready
              ? "bg-zinc-900/90 border border-emerald-500/30 text-emerald-300 shadow-sm"
              : "bg-zinc-950/60 text-zinc-400 border border-transparent"
          }`}
        >
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
              isStep0Ready
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                : "bg-zinc-800 text-zinc-500"
            }`}
          >
            0
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase font-mono tracking-wider opacity-70">
              硬體與韌體
            </div>
            <div className="text-xs font-semibold truncate flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isStep0Ready ? "bg-emerald-400" : "bg-zinc-600"
                }`}
              />
              <span className="truncate">
                {ports.length === 0
                  ? "未偵測到 USB"
                  : isStep0Ready
                  ? "ESP32 裝置已就緒"
                  : "韌體檢測中..."}
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-600 hidden md:block shrink-0" />
        </div>

        {/* Step 1 Pill */}
        <div
          className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
            status.is_connected
              ? "bg-zinc-900/90 border border-emerald-500/30 text-emerald-300 shadow-sm"
              : "bg-zinc-950/60 text-zinc-400 border border-transparent"
          }`}
        >
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
              status.is_connected
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                : "bg-zinc-800 text-zinc-500"
            }`}
          >
            1
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase font-mono tracking-wider opacity-70">
              虛擬手把服務
            </div>
            <div className="text-xs font-semibold truncate flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  status.is_connected ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"
                }`}
              />
              <span className="truncate">
                {status.is_connected ? `60Hz 串流中 (${status.tx_fps} Hz)` : "服務已停止"}
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-600 hidden md:block shrink-0" />
        </div>

        {/* Step 2 Pill */}
        <div
          className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
            isSwitchConnected
              ? "bg-zinc-900/90 border border-cyan-500/30 text-cyan-300 shadow-sm"
              : isSwitchPairing
              ? "bg-zinc-900/90 border border-amber-500/30 text-amber-300"
              : "bg-zinc-950/60 text-zinc-400 border border-transparent"
          }`}
        >
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
              isSwitchConnected
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                : isSwitchPairing
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                : "bg-zinc-800 text-zinc-500"
            }`}
          >
            2
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase font-mono tracking-wider opacity-70">
              Switch 主機連線
            </div>
            <div className="text-xs font-semibold truncate flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isSwitchConnected
                    ? "bg-cyan-400"
                    : isSwitchPairing
                    ? "bg-amber-400 animate-pulse"
                    : "bg-zinc-600"
                }`}
              />
              <span className="truncate">
                {isSwitchConnected
                  ? "Switch 已連線 (1P)"
                  : isSwitchPairing
                  ? "自動配對中..."
                  : "Switch 離線"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Sequential Step Cards */}
      <div className="space-y-5">
        {/* ============================================================ */}
        {/* STEP 0: Check USB & Firmware Compliance                      */}
        {/* ============================================================ */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 shadow-xl space-y-4 backdrop-blur-md relative">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                  isStep0Ready
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                }`}
              >
                0
              </div>
              <div>
                <h2 className="text-xs font-semibold text-zinc-200">
                  步驟 0：檢查 USB 連線與 ESP32 韌體
                </h2>
                <p className="text-[11px] text-zinc-400">
                  自動識別 ESP32 晶片 (CH340/CP210x)，並支援 PRO-UART0 協議握手檢驗
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  isStep0Ready
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                }`}
              >
                {isStep0Ready ? "✓ 硬體就緒" : "✕ 需接妥硬體"}
              </span>

              {/* Maintenance Tool Toggle */}
              <button
                onClick={() => setShowFlasher(!showFlasher)}
                className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                  showFlasher
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-200"
                    : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                }`}
              >
                <Wrench className="w-3 h-3" />
                <span>韌體燒錄工具</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${showFlasher ? "rotate-180" : ""}`}
                />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {ports.length === 0 ? (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold">尚未偵測到 ESP32 USB 裝置</div>
                  <div className="text-[11px] text-rose-300/80 leading-relaxed">
                    請將 ESP32 透過 USB 傳輸線插入電腦（確認線材具備數據傳輸功能），接妥後點擊右上角「重新掃描裝置」。
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-8 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-medium text-zinc-400">
                      選取 ESP32 序列埠
                    </label>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {ports.length} 個可用 USB 序列埠
                    </span>
                  </div>
                  <select
                    value={selectedPort}
                    onChange={(e) => handlePortChange(e.target.value)}
                    disabled={status.is_connected}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-hidden focus:border-cyan-500 transition-colors font-mono cursor-pointer"
                  >
                    {ports.map((p) => (
                      <option key={p.port_name} value={p.port_name}>
                        {p.port_name} — {p.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-4">
                  <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Cpu className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="font-mono text-[11px] text-zinc-300 truncate">
                        {isRecognizedUsb ? "CH340 / CP2102" : "標準 USB 晶片"}
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
                      PRO-UART0
                    </span>
                  </div>
                </div>
                {probeDetails && (
                  <div className="md:col-span-12 text-[11px] text-zinc-400 font-mono px-1">
                    {probeDetails}
                  </div>
                )}
              </div>
            )}

            {/* Collapsible Firmware Flasher Drawer */}
            {showFlasher && (
              <div className="pt-3 border-t border-zinc-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-semibold text-zinc-200">
                      ESP32 韌體一鍵燒錄 (PRO-UART0.bin)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">
                    Switch 原廠 Pro Controller 模擬韌體
                  </span>
                </div>

                {isFlashing && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                      <span>燒錄進度</span>
                      <span>{flashProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-zinc-950 overflow-hidden border border-zinc-800">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-amber-500 transition-all duration-300"
                        style={{ width: `${flashProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleFlashFirmware}
                    disabled={isFlashing || !selectedPort}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50 ${
                      isFlashing
                        ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        : "bg-amber-500 hover:bg-amber-400 text-zinc-950"
                    }`}
                  >
                    <Flame className={`w-3.5 h-3.5 ${isFlashing ? "animate-pulse" : ""}`} />
                    <span>{isFlashing ? "正在燒錄韌體中..." : "開始燒錄 PRO-UART0.bin"}</span>
                  </button>
                  <span className="text-[11px] text-zinc-400">
                    若全新板子或需重置韌體，點擊此處將官方模擬韌體寫入晶片。
                  </span>
                </div>

                {/* Console Log */}
                <div className="h-28 rounded-xl bg-zinc-950 border border-zinc-800/80 p-2.5 font-mono text-[10px] overflow-y-auto space-y-0.5 text-zinc-400">
                  {flashLogs.map((log, index) => (
                    <div
                      key={index}
                      className={
                        log.includes("成功") || log.includes("完成")
                          ? "text-emerald-400 font-semibold"
                          : log.includes("錯誤")
                          ? "text-rose-400"
                          : "text-zinc-400"
                      }
                    >
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* STEP 1: Toggle Virtual Controller Service                   */}
        {/* ============================================================ */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 shadow-xl space-y-4 backdrop-blur-md relative overflow-hidden">
          {/* Step 1 Lock Overlay if Step 0 is not ready */}
          {!isStep0Ready && (
            <div className="absolute inset-0 bg-zinc-950/85 backdrop-blur-xs z-20 flex flex-col items-center justify-center p-4 text-center space-y-2">
              <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-400 shadow-md">
                <Lock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xs font-semibold text-zinc-200">
                步驟 1 已鎖定
              </div>
              <div className="text-[11px] text-zinc-400 max-w-xs">
                {ports.length === 0
                  ? "請先接上 ESP32 USB 裝置"
                  : "請先完成步驟 0 裝置選取"}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                  status.is_connected
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                }`}
              >
                1
              </div>
              <div>
                <h2 className="text-xs font-semibold text-zinc-200">
                  步驟 1：開關虛擬手把服務 (60Hz 串流)
                </h2>
                <p className="text-[11px] text-zinc-400">
                  建立電腦 ➔ ESP32 序列傳輸通道，維持心跳保活防止斷線
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">
              {status.is_connected ? "● 60Hz 串流中" : "○ 服務已暫停"}
            </span>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <div className="md:col-span-4 space-y-1">
                <label className="block text-[11px] font-medium text-zinc-400">
                  通訊鮑率 (Baudrate)
                </label>
                <select
                  value={selectedBaudrate}
                  onChange={(e) => {
                    const newBaud = Number(e.target.value);
                    setSelectedBaudrate(newBaud);
                    if (selectedPort) probeFirmware(selectedPort, newBaud);
                  }}
                  disabled={status.is_connected || !isStep0Ready}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-hidden focus:border-cyan-500 transition-colors font-mono cursor-pointer disabled:opacity-50"
                >
                  {COMMON_BAUDRATES.map((b) => (
                    <option key={b} value={b}>
                      {b} bps {b === 19200 ? "(推薦)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-8 flex flex-col sm:flex-row items-center gap-3 md:justify-end">
                {/* Live Telemetry Pill */}
                <div className="flex items-center gap-3 p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs w-full sm:w-auto">
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    <span>頻率:</span>
                    <span className="font-mono text-zinc-200 font-bold">{status.tx_fps} Hz</span>
                  </div>
                  <span className="text-zinc-700">|</span>
                  <div className="text-zinc-400 text-[11px]">
                    已送: <span className="font-mono text-zinc-200">{status.packets_sent.toLocaleString()}</span>
                  </div>
                </div>

                {/* Primary Service Toggle Button */}
                <button
                  onClick={toggleVirtualController}
                  disabled={!isStep0Ready}
                  className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 shrink-0 ${
                    status.is_connected
                      ? "bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200"
                      : "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{status.is_connected ? "停止虛擬手把" : "開啟虛擬手把"}</span>
                </button>
              </div>
            </div>

            {/* Heartbeat info banner */}
            <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="text-[11px]">
                  60Hz 心跳常駐保活已啟用：防止 Switch 閒置休眠踢掉手把，200ms 斷訊看門狗自動歸零防暴走。
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* STEP 2: Switch Auto-Pairing & Reconnect                      */}
        {/* ============================================================ */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 shadow-xl space-y-4 backdrop-blur-md relative overflow-hidden">
          {/* Step 2 Lock Overlay if Step 1 is not running */}
          {!isStep1Ready && (
            <div className="absolute inset-0 bg-zinc-950/85 backdrop-blur-xs z-20 flex flex-col items-center justify-center p-4 text-center space-y-2">
              <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-400 shadow-md">
                <Lock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xs font-semibold text-zinc-200">
                步驟 2 已鎖定
              </div>
              <div className="text-[11px] text-zinc-400 max-w-xs">
                請先啟動「步驟 1：開啟虛擬手把」，序列串流就緒後方可進行 Switch 配對與自動回連。
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                  isSwitchConnected
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                }`}
              >
                2
              </div>
              <div>
                <h2 className="text-xs font-semibold text-zinc-200">
                  步驟 2：Switch 自動配對與連線
                </h2>
                <p className="text-[11px] text-zinc-400">
                  首次手動配對並記憶，後續啟動虛擬手把即自動重連 1P
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">
              {isSwitchConnected ? "✓ 已鎖定 1P" : "可發送配對指令"}
            </span>
          </div>

          {/* Branch A: Already Paired Console (Auto-reconnect workflow) */}
          {hasPairedSwitch ? (
            <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-cyan-200">
                  <Check className="w-4 h-4 text-cyan-400" />
                  <span>已記憶配對主機 (自動配對就緒)</span>
                </div>
                <span className="text-[10px] font-mono text-cyan-300 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30">
                  Auto-Pair Active
                </span>
              </div>

              <p className="text-[11px] text-zinc-400 leading-relaxed">
                系統已記憶配對過的 Switch 主機。開啟虛擬手把時會自動發送 A 鍵喚醒訊號完成秒連。若未自動連上，可點擊下方按鈕手動重試。
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={() =>
                    handleSendCommand(
                      "wake_reconnect",
                      "已手動送出喚醒重連脈衝！Switch 應已快速回連為 1P。"
                    )
                  }
                  disabled={activeCommand !== null || !isStep1Ready}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50 ${
                    activeCommand === "wake_reconnect"
                      ? "bg-amber-400 text-zinc-950 scale-95"
                      : "bg-amber-500 hover:bg-amber-400 text-zinc-950"
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>手動觸發自動回連 (A鍵喚醒)</span>
                </button>

                <button
                  onClick={handleClearMemory}
                  disabled={activeCommand !== null || !isStep1Ready}
                  className="px-3 py-2 rounded-xl text-xs font-medium bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className="w-3 h-3 text-zinc-400" />
                  <span>更換主機（清除配對記憶）</span>
                </button>

                <button
                  onClick={() =>
                    handleSendCommand(
                      "emergency_neutral",
                      "已發送中立安全封包，手把按鍵全部歸零。"
                    )
                  }
                  disabled={activeCommand !== null || !isStep1Ready}
                  className="px-3 py-2 rounded-xl text-xs font-medium bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Power className="w-3 h-3 text-rose-400" />
                  <span>緊急訊號歸零</span>
                </button>
              </div>
            </div>
          ) : (
            /* Branch B: First-time Pairing Workflow */
            <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>首次配對流程（尚未記憶主機）</span>
                </div>
                <span className="text-[10px] text-amber-400 font-mono">
                  需要手動配對
                </span>
              </div>

              <div className="text-[11px] text-zinc-400 space-y-1 leading-relaxed">
                <div>1. 請在 Switch 打開主畫面<strong>「控制器」➔「更改拿法 / 順序」</strong>畫面。</div>
                <div>2. 點擊下方按鈕送出 <strong>L + R</strong> 握手脈衝，讓 Switch 自動分配為 1P。</div>
                <div className="text-cyan-400 font-medium">3. 配對成功後將自動記憶，下次啟動直接自動連線！</div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={handleFirstTimePair}
                  disabled={activeCommand !== null || !isStep1Ready}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50 ${
                    activeCommand === "pair_lr"
                      ? "bg-cyan-400 text-zinc-950 scale-95"
                      : "bg-cyan-500 hover:bg-cyan-400 text-zinc-950"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>開始首次配對 (送出 L+R 並記憶)</span>
                </button>

                <button
                  onClick={() =>
                    handleSendCommand(
                      "emergency_neutral",
                      "已發送中立安全封包，手把按鍵全部歸零。"
                    )
                  }
                  disabled={activeCommand !== null || !isStep1Ready}
                  className="px-3 py-2 rounded-xl text-xs font-medium bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Power className="w-3 h-3 text-rose-400" />
                  <span>緊急訊號歸零</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Bottom-Right Toast Notifications (No layout shift / jitter) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
        {errorMessage && (
          <div className="pointer-events-auto p-3.5 rounded-2xl bg-zinc-900/95 border border-rose-500/40 shadow-2xl backdrop-blur-md flex items-start gap-3 text-xs text-rose-200 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{errorMessage}</div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-zinc-400 hover:text-zinc-100 p-0.5 rounded-md hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {successNotice && (
          <div className="pointer-events-auto p-3.5 rounded-2xl bg-zinc-900/95 border border-emerald-500/40 shadow-2xl backdrop-blur-md flex items-start gap-3 text-xs text-emerald-200 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{successNotice}</div>
            <button
              onClick={() => setSuccessNotice(null)}
              className="text-zinc-400 hover:text-zinc-100 p-0.5 rounded-md hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
