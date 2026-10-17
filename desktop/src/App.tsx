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
import { MacroScript, MacroAction } from "./types/macro";
import { loadMacros, saveMacros } from "./utils/macroStorage";
import { Sidebar } from "./components/Sidebar";
import { GamepadVisualizer } from "./components/GamepadVisualizer";
import { CompactWidget } from "./components/CompactWidget";
import { HardwareSettings } from "./components/HardwareSettings";
import { CountdownOverlay } from "./components/MacroStudio/CountdownOverlay";
import { SaveMacroModal } from "./components/MacroStudio/SaveMacroModal";
import { MacroStudio } from "./components/MacroStudio/MacroStudio";
import { useVirtualGamepad } from "./hooks/useVirtualGamepad";
import { useMacroRecorder } from "./hooks/useMacroRecorder";
import { useMacroPlayer } from "./hooks/useMacroPlayer";
import { isTauriAvailable } from "./utils/tauri";

const PAIRING_STORAGE_KEY = "ghostpad_switch_paired";

export function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "macro" | "hardware">("dashboard");
  const [controllerState, setControllerState] = useState<ControllerState>(DEFAULT_CONTROLLER_STATE);
  const [gamepads, setGamepads] = useState<GamepadInfo[]>([]);
  const [isMuted, setIsMuted] = useState(false);
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
      setIsMuted(false);
      if (isTauri) {
        invoke("set_gamepad_muted", { muted: false }).catch(() => {});
      }
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
  const { sendButton, sendStick, sendDpad, resetInputs } = useVirtualGamepad(isMuted, setControllerState);

  // Phase 3: Macro Scripts, Recorder & Player
  const [macros, setMacros] = useState<MacroScript[]>(loadMacros);
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(() => {
    const list = loadMacros();
    return list.length > 0 ? list[0].id : null;
  });
  const [pendingSaveRecording, setPendingSaveRecording] = useState<{
    actions: MacroAction[];
    durationMs: number;
  } | null>(null);

  const recorder = useMacroRecorder({
    onRecordingComplete: (actions, durationMs) => {
      if (actions.length > 0) {
        setPendingSaveRecording({ actions, durationMs });
      }
    },
  });

  // Continuously feed live controllerState into recorder during recording
  useEffect(() => {
    if (recorder.phase === "recording") {
      recorder.feedControllerState(controllerState);
    }
  }, [controllerState, recorder]);

  const player = useMacroPlayer({
    onTriggerButton: sendButton,
    onTriggerStick: sendStick,
    onTriggerDpad: sendDpad,
    onResetInputs: resetInputs,
  });

  // Script library management handlers
  const handleSaveScript = (updated: MacroScript) => {
    const next = macros.map((m) => (m.id === updated.id ? updated : m));
    setMacros(next);
    saveMacros(next);
  };

  const handleDuplicateScript = (script: MacroScript) => {
    const dup: MacroScript = {
      ...script,
      id: `macro-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `${script.name} (副本)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isPreset: false,
    };
    const next = [dup, ...macros];
    setMacros(next);
    saveMacros(next);
    setSelectedScriptId(dup.id);
  };

  const handleDeleteScript = (id: string) => {
    const next = macros.filter((m) => m.id !== id);
    setMacros(next);
    saveMacros(next);
    if (selectedScriptId === id) {
      setSelectedScriptId(next.length > 0 ? next[0].id : null);
    }
  };

  const handleImportScripts = (imported: MacroScript[]) => {
    const next = [...imported, ...macros];
    setMacros(next);
    saveMacros(next);
    if (imported.length > 0) {
      setSelectedScriptId(imported[0].id);
    }
  };

  const handleSaveRecordedScript = (script: MacroScript, openEditor: boolean) => {
    const next = [script, ...macros];
    setMacros(next);
    saveMacros(next);
    setSelectedScriptId(script.id);
    setPendingSaveRecording(null);
    if (openEditor) {
      setActiveTab("macro");
    }
  };

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
            switchPairingState={switchPairingState}
            fps={fps}
            onTriggerButton={sendButton}
            onTriggerStick={sendStick}
            onToggleMute={handleToggleMute}
            onToggleEsp32={handleToggleVirtualController}
            recordingPhase={recorder.phase}
            recordingElapsedMs={recorder.recordingElapsedMs}
            recordedActionsCount={recorder.recordedActions.length}
            onStartRecord={recorder.startCountdown}
            onStopRecord={recorder.stopRecording}
          />
        )}

        {activeTab === "macro" && (
          <MacroStudio
            macros={macros}
            selectedScriptId={selectedScriptId}
            onSelectScript={setSelectedScriptId}
            onSaveScript={handleSaveScript}
            onDuplicateScript={handleDuplicateScript}
            onDeleteScript={handleDeleteScript}
            onImportScripts={handleImportScripts}
            playerStatus={player.status}
            playerConfig={player.config}
            onChangePlayerConfig={(cfg) => player.setConfig({ ...player.config, ...cfg })}
            onPlay={player.play}
            onPause={player.pause}
            onResume={player.resume}
            onStop={player.stop}
          />
        )}

        {activeTab === "hardware" && (
          <HardwareSettings
            onConnectionChange={(connected) => {
              setEsp32Connected(connected);
              if (connected) {
                setIsMuted(false);
                if (isTauriAvailable()) {
                  invoke("set_gamepad_muted", { muted: false }).catch(() => {});
                }
              }
            }}
            onPairingChange={setSwitchPairingState}
            onStep0Change={setIsStep0Ready}
          />
        )}
      </main>

      {/* 3-2-1 Countdown Overlay */}
      {recorder.phase === "countdown" && (
        <CountdownOverlay
          countdown={recorder.countdown}
          onCancel={recorder.cancelCountdown}
        />
      )}

      {/* Save Recording Modal */}
      {pendingSaveRecording && (
        <SaveMacroModal
          actions={pendingSaveRecording.actions}
          durationMs={pendingSaveRecording.durationMs}
          onSave={handleSaveRecordedScript}
          onDiscard={() => setPendingSaveRecording(null)}
        />
      )}
    </div>
  );
}

export default App;
