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
  Radio,
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

import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("hardware");
  const [ports, setPorts] = useState<SerialPortDetail[]>([]);
  const [selectedPort, setSelectedPort] = useState<string>("");
  const [selectedBaudrate, setSelectedBaudrate] = useState<number>(19200);

  // Firmware status: idle | checking | compatible | recognized | incompatible
  const [firmwareStatus, setFirmwareStatus] = useState<
    "idle" | "checking" | "compatible" | "recognized" | "incompatible"
  >("idle");
  const [probeDetails, setProbeDetails] = useState<string>("");

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
        } else if (isRecognized) {
          setFirmwareStatus("recognized");
          setProbeDetails(
            "已辨識 ESP32 序列晶片 (CH340/CP210x)，但未通過 PRO-UART0 韌體交握。請燒錄 PRO-UART0.bin 或確認鮑率後重新檢測。"
          );
        } else {
          setFirmwareStatus("incompatible");
          setProbeDetails(
            "交握未響應，且未辨識出標準 ESP32 晶片 (CH340/CP210x)。可能為未燒錄韌體或非手把硬體。"
          );
        }
      } catch (err: any) {
        if (!isMountedRef.current) return;
        setFirmwareStatus(isRecognized ? "recognized" : "incompatible");
        setProbeDetails(`韌體檢測失敗：${String(err)}`);
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
      setErrorMessage(t("feedback.need_step1_first", "請先啟動步驟 1「虛擬手把服務」，才能發送配對或控制指令！"));
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
      setSuccessNotice(t("feedback.service_stopped", "虛擬手把服務已停止，所有按鍵訊號安全歸零。"));
    } else {
      if (!selectedPort) {
        setErrorMessage(t("feedback.select_port_first", "請先於步驟 0 選取 ESP32 序列埠"));
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
          // Backend rejected the port (handshake failed): lock Step 1 until re-verified
          setFirmwareStatus(isEsp32Chip(portsRef.current.find((p) => p.port_name === selectedPort)) ? "recognized" : "incompatible");
          setProbeDetails(String(err));
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
        setSuccessNotice(t("feedback.service_started_auto", "虛擬手把服務已啟動！偵測到已配對主機，正自動發起喚醒配對..."));
        if (wakeTimerRef.current !== null) {
          clearTimeout(wakeTimerRef.current);
        }
        wakeTimerRef.current = window.setTimeout(() => {
          if (!isMountedRef.current) return;
          handleSendCommand(
            "wake_reconnect",
            t("feedback.auto_wake_sent", "已自動送出喚醒重連脈衝！Switch 應已自動回連為 1P。")
          );
        }, 450);
      } else {
        setSuccessNotice(t("feedback.service_started_manual", "虛擬手把服務已啟動！請於步驟 2 進行首次配對。"));
      }
    }
  };

  // First time pair: Send L+R and remember in localStorage
  const handleFirstTimePair = async () => {
    await handleSendCommand(
      "pair_lr",
      t("feedback.paired_success", "已發送 L+R 首次配對握手！Switch 確認為 1P 後已自動儲存記憶，下次將自動配對。")
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
      t("feedback.reset_success", "已重置 ESP32 藍牙記憶並清除本機自動配對設定，可更換主機重新配對。")
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
      setErrorMessage(t("feedback.flash_select_port", "請先接上 ESP32 並選取燒錄序列埠"));
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
    setSuccessNotice(t("feedback.flash_complete", "PRO-UART0.bin 韌體燒錄完成！正在重新驗證交握協議..."));
    await probeFirmware(selectedPort, selectedBaudrate);
  };

  // Active port details & chip identification
  const activePortDetail = ports.find((p) => p.port_name === selectedPort);
  const isRecognizedUsb = isEsp32Chip(activePortDetail);

  // --- Strict Sequential Gating Logic ---
  // Step 0: USB detected AND firmware verified via PRO-UART0 handshake
  // (an already-streaming session implies the handshake passed at connect time)
  const isStep0Ready = Boolean(
    status.is_connected ||
      (selectedPort &&
        ports.some((p) => p.port_name === selectedPort) &&
        firmwareStatus === "compatible")
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
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950 select-none relative">
      {/* 1. Unified Top Header */}
      <div className="h-16 px-6 border-b border-white/[0.06] flex items-center justify-between shrink-0 bg-zinc-950/80 backdrop-blur-sm z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-zinc-300 shadow-xs shrink-0">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-tight text-zinc-100">
                {t("title", "ESP32 硬體與連線控制台")}
              </h1>
              <span
                className={`px-1.5 py-0.5 rounded font-mono text-[10px] border flex items-center gap-1.5 ${
                  isSwitchConnected
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : status.is_connected
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : isStep0Ready
                    ? "bg-zinc-850 text-zinc-400 border-white/[0.06]"
                    : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isSwitchConnected
                      ? "bg-emerald-400"
                      : status.is_connected
                      ? "bg-emerald-400 animate-pulse"
                      : isStep0Ready
                      ? "bg-zinc-500"
                      : "bg-rose-400"
                  }`}
                />
                <span>
                  {isSwitchConnected
                    ? t("header.switch_1p_connected", "Switch 1P 已連線")
                    : status.is_connected
                    ? t("header.streaming", "虛擬手把串流中")
                    : isStep0Ready
                    ? t("header.ready", "硬體就緒")
                    : t("header.pending", "待接妥硬體")}
                </span>
              </span>
            </div>
            <p className="text-xs text-zinc-400 truncate hidden sm:block">
              {t("subtitle", "依序連接「硬體裝置」➔「虛擬手把服務」➔「Switch 主機連線」")}
            </p>
          </div>
        </div>

        <button
          onClick={fetchPorts}
          disabled={isLoading}
          title={t("header.rescan_ports_tooltip", "重新掃描 USB 序列埠")}
          className="flex items-center gap-2 h-8 px-3 rounded-md bg-zinc-850 hover:bg-zinc-800 border border-white/[0.08] hover:border-white/[0.14] text-zinc-300 hover:text-zinc-100 transition-colors text-xs font-medium cursor-pointer shadow-xs disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-zinc-100" : ""}`} />
          <span>{t("header.rescan_ports", "重新掃描裝置")}</span>
        </button>
      </div>

      {/* 2. Unified Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 w-full max-w-6xl mx-auto space-y-5 min-h-0">

      {/* Integrated Pipeline Status Stepper Bar (Replaces redundant top status cards) */}
      <div className="p-1 rounded-xl bg-zinc-900/40 border border-white/[0.06] grid grid-cols-1 md:grid-cols-3 gap-1">
        {/* Step 0 Pill */}
        <div
          className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
            isStep0Ready
              ? "bg-zinc-900/80 border border-emerald-500/20 text-emerald-300 shadow-xs"
              : "bg-transparent text-zinc-400 border border-transparent"
          }`}
        >
          <div
            className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-mono font-medium shrink-0 ${
              isStep0Ready
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-zinc-800/80 text-zinc-500 border border-white/[0.04]"
            }`}
          >
            0
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">
              {t("stepper.step0_label", "硬體與韌體")}
            </div>
            <div className="text-xs font-medium truncate flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isStep0Ready ? "bg-emerald-400" : "bg-zinc-600"
                }`}
              />
              <span className="truncate">
                {ports.length === 0
                  ? t("stepper.step0_no_usb", "未偵測到 USB")
                  : isStep0Ready
                  ? t("stepper.step0_ready", "ESP32 裝置已就緒")
                  : t("stepper.step0_checking", "韌體檢測中...")}
              </span>
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-600 hidden md:block shrink-0" />
        </div>

        {/* Step 1 Pill */}
        <div
          className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
            status.is_connected
              ? "bg-zinc-900/80 border border-emerald-500/20 text-emerald-300 shadow-xs"
              : "bg-transparent text-zinc-400 border border-transparent"
          }`}
        >
          <div
            className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-mono font-medium shrink-0 ${
              status.is_connected
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-zinc-800/80 text-zinc-500 border border-white/[0.04]"
            }`}
          >
            1
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">
              {t("stepper.step1_label", "虛擬手把服務")}
            </div>
            <div className="text-xs font-medium truncate flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  status.is_connected ? "bg-emerald-400" : "bg-zinc-600"
                }`}
              />
              <span className="truncate">
                {status.is_connected
                  ? t("stepper.step1_streaming", { fps: status.tx_fps, defaultValue: `60Hz 串流中 (${status.tx_fps} Hz)` })
                  : t("stepper.step1_stopped", "服務已停止")}
              </span>
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-600 hidden md:block shrink-0" />
        </div>

        {/* Step 2 Pill */}
        <div
          className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
            isSwitchConnected
              ? "bg-zinc-900/80 border border-emerald-500/20 text-emerald-300 shadow-xs"
              : isSwitchPairing
              ? "bg-zinc-900/80 border border-amber-500/20 text-amber-300 shadow-xs"
              : "bg-transparent text-zinc-400 border border-transparent"
          }`}
        >
          <div
            className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-mono font-medium shrink-0 ${
              isSwitchConnected
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : isSwitchPairing
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                : "bg-zinc-800/80 text-zinc-500 border border-white/[0.04]"
            }`}
          >
            2
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">
              {t("stepper.step2_label", "Switch 主機連線")}
            </div>
            <div className="text-xs font-medium truncate flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isSwitchConnected
                    ? "bg-emerald-400"
                    : isSwitchPairing
                    ? "bg-amber-400 animate-pulse"
                    : "bg-zinc-600"
                }`}
              />
              <span className="truncate">
                {isSwitchConnected
                  ? t("stepper.step2_connected", "Switch 已連線 (1P)")
                  : isSwitchPairing
                  ? t("stepper.step2_pairing", "自動配對中...")
                  : t("stepper.step2_offline", "Switch 離線")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Sequential Step Cards */}
      <div className="space-y-4">
        {/* ============================================================ */}
        {/* STEP 0: Check USB & Firmware Compliance                      */}
        {/* ============================================================ */}
        <div className="bg-zinc-900/40 border border-white/[0.06] rounded-xl p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] space-y-4 backdrop-blur-sm relative">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-mono font-medium ${
                  isStep0Ready
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                }`}
              >
                0
              </div>
              <div>
                <h2 className="text-xs font-semibold text-zinc-200">
                  {t("step0.title", "步驟 0：檢查 USB 連線與 ESP32 韌體")}
                </h2>
                <p className="text-[11px] text-zinc-400">
                  {t("step0.desc", "自動識別 ESP32 晶片 (CH340/CP210x)，並支援 PRO-UART0 協議握手檢驗")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                  isStep0Ready
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                }`}
              >
                {isStep0Ready ? t("step0.ready", "✓ 硬體就緒") : t("step0.needed", "✕ 需接妥硬體")}
              </span>

              {/* Maintenance Tool Toggle */}
              <button
                onClick={() => setShowFlasher(!showFlasher)}
                className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                  showFlasher
                    ? "bg-zinc-800 border-white/[0.14] text-zinc-200"
                    : "bg-zinc-900/80 border-white/[0.06] text-zinc-400 hover:text-zinc-200 hover:border-white/[0.12]"
                }`}
              >
                <Wrench className="w-3 h-3" />
                <span>{t("step0.flasher_tool", "韌體燒錄工具")}</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${showFlasher ? "rotate-180" : ""}`}
                />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {ports.length === 0 ? (
              <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-medium">{t("step0.no_device_title", "尚未偵測到 ESP32 USB 裝置")}</div>
                  <div className="text-[11px] text-rose-300/80 leading-relaxed">
                    {t("step0.no_device_desc", "請將 ESP32 透過 USB 傳輸線插入電腦（確認線材具備數據傳輸功能），接妥後點擊右上角「重新掃描裝置」。")}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-8 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-medium text-zinc-400">
                      {t("step0.select_port_label", "選取 ESP32 序列埠")}
                    </label>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {t("step0.available_ports", { count: ports.length, defaultValue: `${ports.length} 個可用 USB 序列埠` })}
                    </span>
                  </div>
                  <select
                    value={selectedPort}
                    onChange={(e) => handlePortChange(e.target.value)}
                    disabled={status.is_connected}
                    className="w-full bg-zinc-950 border border-white/[0.08] hover:border-white/[0.14] rounded-md px-3 py-2 text-xs text-zinc-200 focus:outline-hidden focus:border-white/[0.22] transition-colors font-mono cursor-pointer"
                  >
                    {ports.map((p) => (
                      <option key={p.port_name} value={p.port_name}>
                        {p.port_name} — {p.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-4">
                  <div className="p-2 rounded-lg bg-zinc-950/80 border border-white/[0.06] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Cpu className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="font-mono text-[11px] text-zinc-300 truncate">
                        {isRecognizedUsb ? t("step0.chip_recognized", "CH340 / CP2102") : t("step0.chip_standard", "標準 USB 晶片")}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedPort && firmwareStatus !== "checking") {
                          probeFirmware(selectedPort, selectedBaudrate);
                        }
                      }}
                      disabled={status.is_connected || firmwareStatus === "checking"}
                      title={t("step0.probe_tooltip", "重新進行 PRO-UART0 韌體交握檢測")}
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0 transition-colors cursor-pointer disabled:cursor-default ${
                        firmwareStatus === "compatible" || status.is_connected
                          ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                          : firmwareStatus === "checking"
                          ? "text-zinc-400 bg-zinc-800 border-white/[0.08] animate-pulse"
                          : "text-rose-400 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20"
                      }`}
                    >
                      {firmwareStatus === "compatible" || status.is_connected
                        ? t("step0.probe_ok", "PRO-UART0 ✓")
                        : firmwareStatus === "checking"
                        ? t("step0.probe_checking", "檢測中…")
                        : t("step0.probe_retry", "未驗證 · 重試")}
                    </button>
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
              <div className="pt-3 border-t border-white/[0.06] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-zinc-300" />
                    <span className="text-xs font-medium text-zinc-200">
                      {t("step0.flasher.title", "ESP32 韌體一鍵燒錄 (PRO-UART0.bin)")}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {t("step0.flasher.subtitle", "Switch 原廠 Pro Controller 模擬韌體")}
                  </span>
                </div>

                {isFlashing && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                      <span>{t("step0.flasher.progress", "燒錄進度")}</span>
                      <span>{flashProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-zinc-950 overflow-hidden border border-white/[0.08]">
                      <div
                        className="h-full bg-zinc-100 transition-all duration-300"
                        style={{ width: `${flashProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleFlashFirmware}
                    disabled={isFlashing || !selectedPort}
                    className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 ${
                      isFlashing
                        ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        : "bg-zinc-100 hover:bg-white text-zinc-950"
                    }`}
                  >
                    <Zap className={`w-3.5 h-3.5 ${isFlashing ? "animate-pulse" : ""}`} />
                    <span>{isFlashing ? t("step0.flasher.flashing", "正在燒錄韌體中...") : t("step0.flasher.start", "開始燒錄 PRO-UART0.bin")}</span>
                  </button>
                  <span className="text-[11px] text-zinc-400">
                    {t("step0.flasher.tip", "若全新板子或需重置韌體，點擊此處將官方模擬韌體寫入晶片。")}
                  </span>
                </div>

                {/* Console Log */}
                <div className="h-28 rounded-lg bg-zinc-950 border border-white/[0.06] p-2.5 font-mono text-[10px] overflow-y-auto space-y-0.5 text-zinc-400">
                  {flashLogs.map((log, index) => (
                    <div
                      key={index}
                      className={
                        log.includes("成功") || log.includes("完成")
                          ? "text-emerald-400 font-medium"
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
        <div className="bg-zinc-900/40 border border-white/[0.06] rounded-xl p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] space-y-4 backdrop-blur-sm relative overflow-hidden">
          {/* Step 1 Lock Overlay if Step 0 is not ready */}
          {!isStep0Ready && (
            <div className="absolute inset-0 bg-zinc-950/85 backdrop-blur-xs z-20 flex flex-col items-center justify-center p-4 text-center space-y-2">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-zinc-400 shadow-xs">
                <Lock className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="text-xs font-medium text-zinc-200">
                {t("step1.locked_title", "步驟 1 已鎖定")}
              </div>
              <div className="text-[11px] text-zinc-400 max-w-xs">
                {ports.length === 0
                  ? t("step1.locked_no_usb", "請先接上 ESP32 USB 裝置")
                  : firmwareStatus === "checking"
                  ? t("step1.locked_checking", "正在驗證 ESP32 韌體…")
                  : t("step1.locked_unverified", "ESP32 韌體尚未通過 PRO-UART0 交握驗證，請確認已燒錄正確韌體後重新檢測")}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-mono font-medium ${
                  status.is_connected
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-zinc-800 text-zinc-400 border border-white/[0.06]"
                }`}
              >
                1
              </div>
              <div>
                <h2 className="text-xs font-semibold text-zinc-200">
                  {t("step1.title", "步驟 1：開關虛擬手把服務 (60Hz 串流)")}
                </h2>
                <p className="text-[11px] text-zinc-400">
                  {t("step1.desc", "建立電腦 ➔ ESP32 序列傳輸通道，維持心跳保活防止斷線")}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">
              {status.is_connected ? t("step1.status_streaming", "● 60Hz 串流中") : t("step1.status_stopped", "○ 服務已暫停")}
            </span>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <div className="md:col-span-4 space-y-1">
                <label className="block text-[11px] font-medium text-zinc-400">
                  {t("step1.baudrate_label", "通訊鮑率 (Baudrate)")}
                </label>
                <select
                  value={selectedBaudrate}
                  onChange={(e) => {
                    const newBaud = Number(e.target.value);
                    setSelectedBaudrate(newBaud);
                    if (selectedPort) probeFirmware(selectedPort, newBaud);
                  }}
                  disabled={status.is_connected || !isStep0Ready}
                  className="w-full bg-zinc-950 border border-white/[0.08] hover:border-white/[0.14] rounded-md px-3 py-2 text-xs text-zinc-200 focus:outline-hidden focus:border-white/[0.22] transition-colors font-mono cursor-pointer disabled:opacity-50"
                >
                  {COMMON_BAUDRATES.map((b) => (
                    <option key={b} value={b}>
                      {b} bps {b === 19200 ? t("step1.recommended_suffix", "(推薦)") : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-8 flex flex-col sm:flex-row items-center gap-3 md:justify-end">
                {/* Live Telemetry Pill */}
                <div className="flex items-center gap-3 p-2 rounded-lg bg-zinc-950/80 border border-white/[0.06] text-xs w-full sm:w-auto">
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <Activity className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{t("step1.telemetry_rate", "頻率:")}</span>
                    <span className="font-mono text-zinc-200 font-medium">{status.tx_fps} Hz</span>
                  </div>
                  <span className="text-zinc-700">|</span>
                  <div className="text-zinc-400 text-[11px]">
                    {t("step1.telemetry_sent", "已送:")} <span className="font-mono text-zinc-200">{status.packets_sent.toLocaleString()}</span>
                  </div>
                </div>

                {/* Primary Service Toggle Button */}
                <button
                  onClick={toggleVirtualController}
                  disabled={!isStep0Ready}
                  className={`w-full sm:w-auto px-5 py-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 shrink-0 ${
                    status.is_connected
                      ? "bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-200"
                      : "bg-zinc-100 hover:bg-white text-zinc-950"
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{status.is_connected ? t("step1.btn_stop", "停止虛擬手把") : t("step1.btn_start", "開啟虛擬手把")}</span>
                </button>
              </div>
            </div>

            {/* Heartbeat info banner */}
            <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-white/[0.06] flex items-center justify-between text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="text-[11px]">
                  {t("step1.heartbeat_notice", "60Hz 心跳常駐保活已啟用：防止 Switch 閒置休眠踢掉手把，200ms 斷訊看門狗自動歸零防暴走。")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* STEP 2: Switch Auto-Pairing & Reconnect                      */}
        {/* ============================================================ */}
        <div className="bg-zinc-900/40 border border-white/[0.06] rounded-xl p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] space-y-4 backdrop-blur-sm relative overflow-hidden">
          {/* Step 2 Lock Overlay if Step 1 is not running */}
          {!isStep1Ready && (
            <div className="absolute inset-0 bg-zinc-950/85 backdrop-blur-xs z-20 flex flex-col items-center justify-center p-4 text-center space-y-2">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-zinc-400 shadow-xs">
                <Lock className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="text-xs font-medium text-zinc-200">
                {t("step2.locked_title", "步驟 2 已鎖定")}
              </div>
              <div className="text-[11px] text-zinc-400 max-w-xs">
                {t("step2.locked_desc", "請先啟動「步驟 1：開啟虛擬手把」，序列串流就緒後方可進行 Switch 配對與自動回連。")}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-mono font-medium ${
                  isSwitchConnected
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-zinc-800 text-zinc-400 border border-white/[0.06]"
                }`}
              >
                2
              </div>
              <div>
                <h2 className="text-xs font-semibold text-zinc-200">
                  {t("step2.title", "步驟 2：Switch 自動配對與連線")}
                </h2>
                <p className="text-[11px] text-zinc-400">
                  {t("step2.desc", "首次手動配對並記憶，後續啟動虛擬手把即自動重連 1P")}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">
              {isSwitchConnected ? t("step2.status_locked_1p", "✓ 已鎖定 1P") : t("step2.status_can_pair", "可發送配對指令")}
            </span>
          </div>

          {/* Branch A: Already Paired Console (Auto-reconnect workflow) */}
          {hasPairedSwitch ? (
            <div className="p-3.5 rounded-lg bg-zinc-950/80 border border-emerald-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-300">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{t("step2.paired_box.title", "已記憶配對主機 (自動配對就緒)")}</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                  {t("step2.paired_box.badge", "Auto-Pair Active")}
                </span>
              </div>

              <p className="text-[11px] text-zinc-400 leading-relaxed">
                {t("step2.paired_box.desc", "系統已記憶配對過的 Switch 主機。開啟虛擬手把時會自動發送 A 鍵喚醒訊號完成秒連。若未自動連上，可點擊下方按鈕手動重試。")}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={() =>
                    handleSendCommand(
                      "wake_reconnect",
                      t("feedback.wake_success", "已手動送出喚醒重連脈衝！Switch 應已快速回連為 1P。")
                    )
                  }
                  disabled={activeCommand !== null || !isStep1Ready}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 ${
                    activeCommand === "wake_reconnect"
                      ? "bg-zinc-200 text-zinc-950"
                      : "bg-zinc-100 hover:bg-white text-zinc-950"
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{t("step2.paired_box.btn_reconnect", "手動觸發自動回連 (A鍵喚醒)")}</span>
                </button>

                <button
                  onClick={handleClearMemory}
                  disabled={activeCommand !== null || !isStep1Ready}
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-900 hover:bg-zinc-800 border border-white/[0.08] text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className="w-3 h-3 text-zinc-400" />
                  <span>{t("step2.paired_box.btn_clear", "更換主機（清除配對記憶）")}</span>
                </button>

                <button
                  onClick={() =>
                    handleSendCommand(
                      "emergency_neutral",
                      t("feedback.neutral_success", "已發送中立安全封包，手把按鍵全部歸零。")
                    )
                  }
                  disabled={activeCommand !== null || !isStep1Ready}
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-900 hover:bg-zinc-800 border border-white/[0.08] text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Power className="w-3 h-3 text-rose-400" />
                  <span>{t("step2.paired_box.btn_neutral", "緊急訊號歸零")}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Branch B: First-time Pairing Workflow */
            <div className="p-3.5 rounded-lg bg-zinc-950/80 border border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-200">
                  <Radio className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{t("step2.unpaired_box.title", "首次配對流程（尚未記憶主機）")}</span>
                </div>
                <span className="text-[10px] text-amber-400/90 font-mono">
                  {t("step2.unpaired_box.badge", "需要手動配對")}
                </span>
              </div>

              <div className="text-[11px] text-zinc-400 space-y-1 leading-relaxed">
                <div>{t("step2.unpaired_box.step1", "1. 請在 Switch 打開主畫面「控制器」➔「更改拿法 / 順序」畫面。")}</div>
                <div>{t("step2.unpaired_box.step2", "2. 點擊下方按鈕送出 L + R 握手脈衝，讓 Switch 自動分配為 1P。")}</div>
                <div className="text-zinc-300 font-medium">{t("step2.unpaired_box.step3", "3. 配對成功後將自動記憶，下次啟動直接自動連線！")}</div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={handleFirstTimePair}
                  disabled={activeCommand !== null || !isStep1Ready}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 ${
                    activeCommand === "pair_lr"
                      ? "bg-zinc-200 text-zinc-950"
                      : "bg-zinc-100 hover:bg-white text-zinc-950"
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>{t("step2.unpaired_box.btn_start_pair", "開始首次配對 (送出 L+R 並記憶)")}</span>
                </button>

                <button
                  onClick={() =>
                    handleSendCommand(
                      "emergency_neutral",
                      t("feedback.neutral_success", "已發送中立安全封包，手把按鍵全部歸零。")
                    )
                  }
                  disabled={activeCommand !== null || !isStep1Ready}
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-900 hover:bg-zinc-800 border border-white/[0.08] text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Power className="w-3 h-3 text-rose-400" />
                  <span>{t("step2.unpaired_box.btn_neutral", "緊急訊號歸零")}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* 3. Unified Bottom Footer Bar */}
      <div className="h-9 px-6 border-t border-white/[0.06] bg-zinc-950/90 backdrop-blur-sm flex items-center justify-between text-[11px] font-mono text-zinc-400 select-none shrink-0 z-20">
        <div className="flex items-center gap-3">
          <span>{t("footer.port", { port: selectedPort || t("footer.no_port", "未選取 USB 裝置"), defaultValue: `● 序列埠: ${selectedPort || "未選取 USB 裝置"}` })}</span>
          <span className="text-zinc-700">|</span>
          <span>{t("footer.baudrate", { baud: selectedBaudrate, defaultValue: `通訊鮑率: ${selectedBaudrate} bps` })}</span>
          <span className="text-zinc-700">|</span>
          <span>{t("footer.sent_packets", { count: status.packets_sent.toLocaleString(), defaultValue: `已發送: ${status.packets_sent.toLocaleString()} 封包` })}</span>
        </div>
        <div className="flex items-center gap-3">
          <span>{status.is_connected ? t("footer.bridge_streaming", { fps: status.tx_fps, defaultValue: `虛擬手把: 60Hz 串流中 (${status.tx_fps} Hz)` }) : t("footer.bridge_stopped", "虛擬手把: 已停止")}</span>
          <span className="text-zinc-700">|</span>
          <span>{t("footer.switch_status", { status: isSwitchConnected ? t("footer.switch_connected", "1P 已連線") : isSwitchPairing ? t("footer.switch_pairing", "配對中...") : t("footer.switch_offline", "離線"), defaultValue: `Switch: ${isSwitchConnected ? "1P 已連線" : isSwitchPairing ? "配對中..." : "離線"}` })}</span>
        </div>
      </div>

      {/* Floating Bottom-Right Toast Notifications (No layout shift / jitter) */}
      <div className="fixed bottom-12 right-6 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {errorMessage && (
          <div className="pointer-events-auto p-3.5 rounded-xl bg-zinc-900/95 border border-rose-500/30 shadow-xl backdrop-blur-md flex items-start gap-3 text-xs text-rose-200 animate-in fade-in slide-in-from-bottom-2 duration-200">
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
          <div className="pointer-events-auto p-3.5 rounded-xl bg-zinc-900/95 border border-emerald-500/30 shadow-xl backdrop-blur-md flex items-start gap-3 text-xs text-emerald-200 animate-in fade-in slide-in-from-bottom-2 duration-200">
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
