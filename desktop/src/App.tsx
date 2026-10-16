import { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  ControllerState,
  DEFAULT_CONTROLLER_STATE,
  GamepadInfo,
  SerialPortDetail,
  SerialStatus,
  isEsp32Chip,
} from "./types";
import { Sidebar } from "./components/Sidebar";
import { GamepadVisualizer } from "./components/GamepadVisualizer";
import { CompactWidget } from "./components/CompactWidget";
import { HardwareSettings } from "./components/HardwareSettings";
import { useVirtualGamepad } from "./hooks/useVirtualGamepad";
import { isTauriAvailable } from "./utils/tauri";
import { FileCode2 } from "lucide-react";

const PAIRING_STORAGE_KEY = "ghostpad_switch_paired";

export function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "macro" | "hardware">("dashboard");
  const [controllerState, setControllerState] = useState<ControllerState>(DEFAULT_CONTROLLER_STATE);
  const [gamepads, setGamepads] = useState<GamepadInfo[]>([]);
  const [isMuted, setIsMuted] = useState(true);
  const [fps, setFps] = useState(0);
  const [esp32Connected, setEsp32Connected] = useState(false);
  const [switchPairingState, setSwitchPairingState] = useState("disconnected");

  // Step 0 Hardware readiness & Serial status
  const [isStep0Ready, setIsStep0Ready] = useState(false);
  const [serialStatus, setSerialStatus] = useState<SerialStatus>({
    is_connected: false,
    port_name: undefined,
    baudrate: 19200,
    packets_sent: 0,
    tx_fps: 0,
    switch_pairing_state: "disconnected",
  });
  const [hasPairedSwitch, setHasPairedSwitch] = useState<boolean>(() => {
    try {
      return localStorage.getItem(PAIRING_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  // Global toggle virtual controller (used by both Sidebar and HardwareSettings)
  const handleToggleVirtualController = async () => {
    const isTauri = isTauriAvailable();
    if (esp32Connected) {
      if (isTauri) {
        try {
          await invoke("disconnect_serial");
        } catch (err) {
          console.error("Failed to disconnect serial:", err);
        }
      }
      setEsp32Connected(false);
      setSwitchPairingState("disconnected");
      setSerialStatus((prev) => ({
        ...prev,
        is_connected: false,
        tx_fps: 0,
        switch_pairing_state: "disconnected",
      }));
    } else {
      // Find candidate port or connect
      let targetPort = serialStatus.port_name;
      if (!targetPort && isTauri) {
        try {
          const list = await invoke<SerialPortDetail[]>("get_serial_ports");
          const candidate = list.find((p) =>
            p.port_name.includes("usbserial") ||
            p.port_name.includes("wch") ||
            p.port_name.includes("ttyUSB")
          ) || list[0];
          if (candidate) targetPort = candidate.port_name;
        } catch (err) {
          console.error("Failed to query ports:", err);
        }
      }

      if (!targetPort) {
        setActiveTab("hardware");
        return;
      }

      if (isTauri) {
        try {
          await invoke("connect_serial", {
            portName: targetPort,
            baudrate: serialStatus.baudrate || 19200,
          });
        } catch (err) {
          console.error("Failed to connect serial:", err);
          return;
        }
      }

      const nextPairState = hasPairedSwitch ? "pairing" : "disconnected";
      setEsp32Connected(true);
      setSwitchPairingState(nextPairState);
      setSerialStatus((prev) => ({
        ...prev,
        is_connected: true,
        port_name: targetPort,
        tx_fps: 60,
        switch_pairing_state: nextPairState,
      }));

      if (hasPairedSwitch && isTauri) {
        setTimeout(async () => {
          try {
            await invoke("send_serial_command", { command: "wake_reconnect" });
            setSwitchPairingState("connected");
          } catch (e) {
            console.error(e);
          }
        }, 450);
      }
    }
  };

  // Global send serial command (wake_reconnect, pair_lr, emergency_neutral)
  const handleSendSerialCommand = async (cmd: string) => {
    const isTauri = isTauriAvailable();
    if (isTauri) {
      try {
        await invoke("send_serial_command", { command: cmd });
      } catch (err) {
        console.error("Failed to send serial command:", err);
        return;
      }
    }
    if (cmd === "pair_lr") {
      try {
        localStorage.setItem(PAIRING_STORAGE_KEY, "true");
      } catch {}
      setHasPairedSwitch(true);
      setSwitchPairingState("connected");
    } else if (cmd === "wake_reconnect") {
      setSwitchPairingState("connected");
    } else if (cmd === "clear_bonds") {
      try {
        localStorage.removeItem(PAIRING_STORAGE_KEY);
      } catch {}
      setHasPairedSwitch(false);
      setSwitchPairingState("pairing");
    }
  };

  // Hook up Virtual Gamepad for Keyboard & On-Screen click/drag inputs with optimistic state updates
  const { sendButton, sendStick } = useVirtualGamepad(isMuted, setControllerState);

  // Dynamic window size tracking for responsive compact HUD mode
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Breakpoint: if user resizes window down below 720px width or 460px height
  const isCompact = windowSize.width < 720 || windowSize.height < 460;

  // Fetch connected gamepads
  const prevGamepadCountRef = useRef<number>(0);

  // Helper: process gamepad list updates and handle auto-mute / auto-enable transitions
  const handleGamepadListUpdate = (list: GamepadInfo[]) => {
    setGamepads(list);
    const connectedCount = list.filter((g) => g.is_connected).length;
    const prevCount = prevGamepadCountRef.current;
    prevGamepadCountRef.current = connectedCount;

    // Transition 0 -> 1+: Auto-enable input transfer for newly connected physical gamepad
    if (prevCount === 0 && connectedCount > 0) {
      setIsMuted(false);
      const isTauri = isTauriAvailable();
      if (isTauri) {
        invoke("set_gamepad_muted", { muted: false }).catch(() => {});
      }
    }
  };

  // Fetch connected gamepads
  const refreshGamepads = async () => {
    const isTauri = isTauriAvailable();
    if (!isTauri) return;
    try {
      const list = await invoke<GamepadInfo[]>("get_gamepads");
      handleGamepadListUpdate(list);
    } catch (err) {
      console.error("Failed to get gamepads:", err);
    }
  };

  // Helper: auto-detect serial ports in background
  const refreshSerialPorts = async () => {
    const isTauri = isTauriAvailable();
    if (!isTauri) {
      // In web dev environment: simulate ready ESP32 mock port so UI is fully testable
      setIsStep0Ready(true);
      setSerialStatus((prev) => ({
        ...prev,
        port_name: prev.port_name || "/dev/cu.usbserial-110",
      }));
      return;
    }
    try {
      const list = await invoke<SerialPortDetail[]>("get_serial_ports");
      if (!Array.isArray(list)) return;
      const espPort =
        list.find((p) => isEsp32Chip(p)) ||
        (list.length > 0 && !list[0].port_name.includes("Bluetooth") ? list[0] : null);

      if (espPort) {
        setIsStep0Ready(true);
        setSerialStatus((prev) => ({
          ...prev,
          port_name: prev.port_name || espPort.port_name,
        }));
      } else if (!esp32Connected) {
        setIsStep0Ready(false);
      }
    } catch (err) {
      console.error("Failed to query serial ports:", err);
    }
  };

  // Combined refresh for both gamepads and serial ports
  const refreshAllDevices = async () => {
    await Promise.all([refreshGamepads(), refreshSerialPorts()]);
  };

  // Toggle active gamepad
  const handleSelectGamepad = async (id: number | null) => {
    const isTauri = isTauriAvailable();
    if (!isTauri) return;
    try {
      await invoke("set_active_gamepad", { id });
      await refreshGamepads();
    } catch (err) {
      console.error("Failed to set active gamepad:", err);
    }
  };

  // Toggle mute
  const handleToggleMute = async () => {
    const next = !isMuted;
    setIsMuted(next);
    if (next) {
      setControllerState(DEFAULT_CONTROLLER_STATE);
    }
    const isTauri = isTauriAvailable();
    if (isTauri) {
      try {
        await invoke("set_gamepad_muted", { muted: next });
      } catch (err) {
        console.error("Failed to toggle mute:", err);
      }
    }
  };

  // Tauri Event Listeners & FPS counter
  useEffect(() => {
    const isTauri = isTauriAvailable();

    let packetCount = 0;
    const fpsTimer = setInterval(() => {
      setFps(packetCount);
      packetCount = 0;
    }, 1000);

    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let unlistenStatePromise: Promise<() => void> | null = null;
    let unlistenConnPromise: Promise<() => void> | null = null;

    refreshAllDevices();
    pollTimer = setInterval(refreshAllDevices, 1500);

    if (isTauri) {

      // Listen to real-time gamepad input state from Rust
      unlistenStatePromise = listen<ControllerState>("gamepad-state", (event) => {
        setControllerState(event.payload);
        packetCount++;
      });

      // Listen to gamepad hotplug / connect events
      unlistenConnPromise = listen<GamepadInfo[]>("gamepad-connection-changed", (event) => {
        if (Array.isArray(event.payload)) {
          handleGamepadListUpdate(event.payload);
        } else {
          refreshGamepads();
        }
      });

      // Listen to serial status events
      invoke<SerialStatus>("get_serial_status")
        .then((s) => {
          if (s) {
            setSerialStatus(s);
            setEsp32Connected(s.is_connected);
            setSwitchPairingState(s.switch_pairing_state || "disconnected");
          }
        })
        .catch(() => {});

      listen<SerialStatus>("serial-status-changed", (event) => {
        setSerialStatus(event.payload);
        setEsp32Connected(event.payload.is_connected);
        setSwitchPairingState(event.payload.switch_pairing_state || "disconnected");
      });
    }

    return () => {
      if (pollTimer) clearInterval(pollTimer);
      clearInterval(fpsTimer);
      unlistenStatePromise?.then((fn) => fn());
      unlistenConnPromise?.then((fn) => fn());
    };
  }, []);

  const activeGamepad = gamepads.find((g) => g.is_active);

  // Responsive: If resized small, automatically switch to Compact HUD Floater mode!
  if (isCompact) {
    return (
      <CompactWidget
        state={controllerState}
        gamepads={gamepads}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onTriggerButton={sendButton}
        onTriggerStick={sendStick}
        fps={fps}
      />
    );
  }

  // Full-size macOS Master-Detail layout
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans select-none">
      {/* Left Master Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        gamepads={gamepads}
        isMuted={isMuted}
        onRefreshGamepads={refreshAllDevices}
        onSelectGamepad={handleSelectGamepad}
        onToggleMute={handleToggleMute}
        esp32Connected={esp32Connected}
        switchPairingState={switchPairingState}
        isStep0Ready={isStep0Ready}
        serialStatus={serialStatus}
        hasPairedSwitch={hasPairedSwitch}
        onToggleVirtualController={handleToggleVirtualController}
        onSendSerialCommand={handleSendSerialCommand}
      />

      {/* Right Detail Content Stage */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950">
        {activeTab === "dashboard" && (
          <GamepadVisualizer
            state={controllerState}
            gamepadName={activeGamepad?.name}
            isMuted={isMuted}
            esp32Connected={esp32Connected}
            fps={fps}
            onTriggerButton={sendButton}
            onTriggerStick={sendStick}
            onToggleMute={handleToggleMute}
            onToggleEsp32={handleToggleVirtualController}
          />
        )}

        {activeTab === "macro" && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
              <FileCode2 className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-zinc-200">巨集錄製與時間軸編輯器 (Phase 3)</h3>
              <p className="text-xs text-zinc-400 max-w-sm">
                手持 8BitDo Micro 操作遊戲邊玩邊錄，視覺化時間軸調整與循環回放。
              </p>
            </div>
          </div>
        )}

        {activeTab === "hardware" && (
          <HardwareSettings
            onConnectionChange={setEsp32Connected}
            onPairingChange={setSwitchPairingState}
            onStep0Change={setIsStep0Ready}
          />
        )}
      </main>
    </div>
  );
}

export default App;
