import React, { useState } from "react";
import { GamepadInfo } from "../types";
import {
  Gamepad2,
  Cpu,
  FileCode2,
  Activity,
  RefreshCw,
  HelpCircle,
  Check,
  ChevronRight,
  Bluetooth,
  Laptop,
  Tv,
} from "lucide-react";

interface Props {
  activeTab: "dashboard" | "macro" | "hardware";
  onTabChange: (tab: "dashboard" | "macro" | "hardware") => void;
  gamepads: GamepadInfo[];
  isMuted: boolean;
  onRefreshGamepads: () => void;
  onSelectGamepad: (id: number | null) => void;
  onToggleMute: () => void;
  esp32Connected: boolean;
  switchPairingState?: string;
}

export const Sidebar: React.FC<Props> = ({
  activeTab,
  onTabChange,
  gamepads,
  isMuted,
  onRefreshGamepads,
  onSelectGamepad,
  onToggleMute,
  esp32Connected,
  switchPairingState = "disconnected",
}) => {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <aside className="w-64 xl:w-72 bg-zinc-950 border-r border-zinc-800/80 flex flex-col h-full select-none shrink-0">
      {/* Top App Header */}
      <div className="h-14 px-5 border-b border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-700/80 flex items-center justify-center text-zinc-100 shadow-sm">
            <Gamepad2 className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-xs tracking-tight text-zinc-100">Ghost-Pad</div>
            <div className="text-[10px] text-zinc-400">Switch Controller Bridge</div>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="p-3 space-y-1">
        <div className="px-2 py-1 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">
          導航
        </div>
        <button
          onClick={() => onTabChange("dashboard")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === "dashboard"
              ? "bg-zinc-800 text-zinc-100 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Activity className="w-3.5 h-3.5" />
            <span>即時儀表板</span>
          </div>
          {activeTab === "dashboard" && <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />}
        </button>

        <button
          onClick={() => onTabChange("macro")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === "macro"
              ? "bg-zinc-800 text-zinc-100 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <FileCode2 className="w-3.5 h-3.5" />
            <span>巨集腳本庫</span>
          </div>
          {activeTab === "macro" && <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />}
        </button>

        <button
          onClick={() => onTabChange("hardware")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === "hardware"
              ? "bg-zinc-800 text-zinc-100 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Cpu className="w-3.5 h-3.5" />
            <span>ESP32 與韌體</span>
          </div>
          {activeTab === "hardware" && <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />}
        </button>
      </div>

      {/* Controllers Section */}
      <div className="p-3 border-t border-zinc-900 flex-1 overflow-y-auto space-y-2">
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">
            輸入手把 ({gamepads.length})
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={onRefreshGamepads}
              title="重新掃描設備"
              className="w-5 h-5 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
            <button
              onClick={() => setShowGuide(!showGuide)}
              title="8BitDo Micro 配對說明"
              className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                showGuide ? "text-zinc-200 bg-zinc-800" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              <HelpCircle className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Global Input Mute / Pause Toggle */}
        <div className="px-2.5 py-2 rounded-lg bg-zinc-900/60 border border-zinc-800/60 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-zinc-300">手把訊號監聽</div>
            <div className="text-[9px] text-zinc-400">控制是否即時轉送動作</div>
          </div>
          <button
            onClick={onToggleMute}
            className={`px-2 py-1 rounded-md text-[10px] font-medium border transition-colors flex items-center gap-1.5 ${
              isMuted
                ? "bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isMuted ? "bg-amber-400" : "bg-emerald-400"
              }`}
            />
            <span>{isMuted ? "已暫停" : "輸入啟用"}</span>
          </button>
        </div>

        {/* Device List */}
        <div className="space-y-1 mt-2">
          {gamepads.length === 0 ? (
            <div className="py-6 px-3 text-center rounded-lg bg-zinc-900/40 border border-zinc-800/40 text-zinc-400 text-xs">
              <Gamepad2 className="w-4 h-4 mx-auto mb-1 text-zinc-400" />
              <div className="text-[11px] text-zinc-400">未連線手把</div>
              <div className="text-[10px] text-zinc-400 mt-0.5">請於藍牙完成配對</div>
            </div>
          ) : (
            gamepads.map((g) => (
              <div
                key={g.id}
                onClick={() => onSelectGamepad(g.id)}
                className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                  g.is_active
                    ? "bg-zinc-800/60 border-zinc-700 text-zinc-100"
                    : "bg-zinc-900/30 border-zinc-800/40 text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      g.is_connected ? "bg-emerald-500" : "bg-zinc-600"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate text-zinc-200">{g.name}</div>
                    <div className="text-[9px] text-zinc-400 font-mono">ID #{g.id}</div>
                  </div>
                </div>

                {g.is_active && (
                  <span className="px-1.5 py-0.5 rounded bg-zinc-700/60 border border-zinc-600/80 text-[9px] font-medium text-zinc-200 flex items-center gap-1 shrink-0">
                    <Check className="w-2.5 h-2.5" />
                    主控
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Pairing Instructions Drawer */}
        {showGuide && (
          <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 space-y-1.5 mt-2">
            <div className="text-[11px] font-semibold text-zinc-200 flex items-center gap-1.5">
              <Bluetooth className="w-3.5 h-3.5 text-zinc-400" />
              8BitDo Micro 配對說明
            </div>
            <ol className="list-decimal list-inside space-y-1 text-zinc-400 text-[10px] leading-relaxed">
              <li>撥至 <strong>S 模式</strong>（Switch）。</li>
              <li>長按配對鍵 3 秒至流動閃爍。</li>
              <li>開啟 Mac 藍牙點擊配對。</li>
            </ol>
          </div>
        )}
      </div>

      {/* Pipeline Status (Bottom Section) */}
      <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/60 space-y-2">
        <div className="text-[10px] font-semibold tracking-wider text-zinc-400 uppercase px-1">
          硬體橋接鏈路
        </div>
        <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60 space-y-2 text-[11px]">
          {/* Step 1: Pad -> Mac */}
          <div className="flex items-center justify-between text-zinc-300">
            <div className="flex items-center gap-2">
              <Bluetooth className="w-3.5 h-3.5 text-zinc-400" />
              <span>手把 ➔ 電腦</span>
            </div>
            <span
              className={`font-mono text-[10px] font-medium ${
                gamepads.some((g) => g.is_connected) ? "text-emerald-400" : "text-zinc-400"
              }`}
            >
              {gamepads.some((g) => g.is_connected) ? "已連線" : "待命中"}
            </span>
          </div>

          {/* Step 2: Mac -> ESP32 */}
          <div className="flex items-center justify-between text-zinc-300">
            <div className="flex items-center gap-2">
              <Laptop className="w-3.5 h-3.5 text-zinc-400" />
              <span>電腦 ➔ ESP32</span>
            </div>
            <span
              className={`font-mono text-[10px] font-medium ${
                esp32Connected ? "text-emerald-400" : "text-zinc-400"
              }`}
            >
              {esp32Connected ? "已連線" : "未連線"}
            </span>
          </div>

          {/* Step 3: ESP32 -> Switch */}
          <div className="flex items-center justify-between text-zinc-300">
            <div className="flex items-center gap-2">
              <Tv className="w-3.5 h-3.5 text-zinc-400" />
              <span>ESP32 ➔ Switch</span>
            </div>
            <span
              className={`font-mono text-[10px] font-medium ${
                switchPairingState === "connected"
                  ? "text-cyan-400 font-bold"
                  : switchPairingState === "pairing"
                  ? "text-amber-400 animate-pulse"
                  : "text-zinc-400"
              }`}
            >
              {switchPairingState === "connected"
                ? "1P 連線中"
                : switchPairingState === "pairing"
                ? "配對中"
                : "待命"}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
