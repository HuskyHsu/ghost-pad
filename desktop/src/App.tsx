import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { ControllerState, DEFAULT_CONTROLLER_STATE, GamepadInfo } from "./types";
import { Sidebar } from "./components/Sidebar";
import { GamepadVisualizer } from "./components/GamepadVisualizer";
import { CompactWidget } from "./components/CompactWidget";
import { HardwareSettings } from "./components/HardwareSettings";
import { useVirtualGamepad } from "./hooks/useVirtualGamepad";
import { FileCode2 } from "lucide-react";

export function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "macro" | "hardware">("dashboard");
  const [controllerState, setControllerState] = useState<ControllerState>(DEFAULT_CONTROLLER_STATE);
  const [gamepads, setGamepads] = useState<GamepadInfo[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [fps, setFps] = useState(0);
  const [esp32Connected, setEsp32Connected] = useState(false);
  const [switchPairingState, setSwitchPairingState] = useState("disconnected");

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
  const refreshGamepads = async () => {
    const isTauri = typeof window !== "undefined" && Boolean((window as any).__TAURI_INTERNALS__);
    if (!isTauri) return;
    try {
      const list = await invoke<GamepadInfo[]>("get_gamepads");
      setGamepads(list);
    } catch (err) {
      console.error("Failed to get gamepads:", err);
    }
  };

  // Toggle active gamepad
  const handleSelectGamepad = async (id: number | null) => {
    const isTauri = typeof window !== "undefined" && Boolean((window as any).__TAURI_INTERNALS__);
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
    const isTauri = typeof window !== "undefined" && Boolean((window as any).__TAURI_INTERNALS__);
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
    const isTauri = typeof window !== "undefined" && Boolean((window as any).__TAURI_INTERNALS__);

    let packetCount = 0;
    const fpsTimer = setInterval(() => {
      setFps(packetCount);
      packetCount = 0;
    }, 1000);

    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let unlistenStatePromise: Promise<() => void> | null = null;
    let unlistenConnPromise: Promise<() => void> | null = null;

    if (isTauri) {
      refreshGamepads();
      pollTimer = setInterval(refreshGamepads, 1500);

      // Listen to real-time gamepad input state from Rust
      unlistenStatePromise = listen<ControllerState>("gamepad-state", (event) => {
        setControllerState(event.payload);
        packetCount++;
      });

      // Listen to gamepad hotplug / connect events
      unlistenConnPromise = listen<GamepadInfo[]>("gamepad-connection-changed", (event) => {
        if (Array.isArray(event.payload)) {
          setGamepads(event.payload);
        } else {
          refreshGamepads();
        }
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
        onRefreshGamepads={refreshGamepads}
        onSelectGamepad={handleSelectGamepad}
        onToggleMute={handleToggleMute}
        esp32Connected={esp32Connected}
        switchPairingState={switchPairingState}
      />

      {/* Right Detail Content Stage */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950">
        {activeTab === "dashboard" && (
          <GamepadVisualizer
            state={controllerState}
            gamepadName={activeGamepad?.name}
            isMuted={isMuted}
            fps={fps}
            onTriggerButton={sendButton}
            onTriggerStick={sendStick}
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
          />
        )}
      </main>
    </div>
  );
}

export default App;
