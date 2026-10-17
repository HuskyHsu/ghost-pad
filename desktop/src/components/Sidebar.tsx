import React, { useState } from "react";
import { GamepadInfo, SerialStatus } from "../types";
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
  Zap,
  Radio,
  X,
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
  isStep0Ready?: boolean;
  serialStatus?: SerialStatus;
  hasPairedSwitch?: boolean;
  onToggleVirtualController?: () => void;
  onSendSerialCommand?: (cmd: string) => void;
}

export const Sidebar: React.FC<Props> = ({
  activeTab,
  onTabChange,
  gamepads,
  isMuted = false,
  onRefreshGamepads,
  onSelectGamepad,
  onToggleMute,
  esp32Connected,
  switchPairingState = "disconnected",
  isStep0Ready = false,
  serialStatus,
  hasPairedSwitch = false,
  onToggleVirtualController,
  onSendSerialCommand,
}) => {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <aside className="w-64 xl:w-72 bg-zinc-950 border-r border-white/[0.06] flex flex-col h-full select-none shrink-0">
      {/* Top App Header */}
      <div className="h-14 px-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] flex items-center justify-center text-zinc-100">
            <Gamepad2 className="w-4 h-4 text-zinc-200" />
          </div>
          <div>
            <div className="font-semibold text-xs tracking-tight text-zinc-100">Ghost-Pad</div>
            <div className="text-[10px] text-zinc-500 font-mono">Switch Bridge Pro</div>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="p-3 space-y-1">
        <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-medium">
          導航
        </div>
        <button
          onClick={() => onTabChange("dashboard")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all ${
            activeTab === "dashboard"
              ? "bg-zinc-850 text-zinc-100 border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border border-transparent"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Activity className="w-3.5 h-3.5 text-zinc-400" />
            <span>即時儀表板</span>
          </div>
          {activeTab === "dashboard" && <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />}
        </button>

        <button
          onClick={() => onTabChange("macro")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all ${
            activeTab === "macro"
              ? "bg-zinc-850 text-zinc-100 border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border border-transparent"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <FileCode2 className="w-3.5 h-3.5 text-zinc-400" />
            <span>巨集腳本庫</span>
          </div>
          {activeTab === "macro" && <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />}
        </button>

        <button
          onClick={() => onTabChange("hardware")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all ${
            activeTab === "hardware"
              ? "bg-zinc-850 text-zinc-100 border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border border-transparent"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Cpu className="w-3.5 h-3.5 text-zinc-400" />
            <span>ESP32 與韌體</span>
          </div>
          {activeTab === "hardware" && <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />}
        </button>
      </div>

      {/* Controllers Section */}
      <div className="p-3 border-t border-white/[0.06] flex-1 overflow-y-auto space-y-2 scrollbar-none [&::-webkit-scrollbar]:hidden">
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-medium">
            輸入手把 ({gamepads.length})
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={onRefreshGamepads}
              title="重新掃描設備"
              className="w-5 h-5 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent hover:border-white/[0.06] transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
            <button
              onClick={() => setShowGuide(!showGuide)}
              title="官方手把配對說明 (Pro / Joy-Con)"
              className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors cursor-pointer border ${
                showGuide
                  ? "text-zinc-200 bg-zinc-800 border-white/[0.1]"
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 border-transparent hover:border-white/[0.06]"
              }`}
            >
              <HelpCircle className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Device List */}
        <div className="space-y-1">
          {gamepads.length === 0 ? (
            <div className="py-4 px-3 text-center rounded-lg bg-zinc-900/40 border border-white/[0.06] text-zinc-400 text-xs">
              <Gamepad2 className="w-4 h-4 mx-auto mb-1 text-zinc-600" />
              <div className="text-[11px] font-medium text-zinc-300">未連線外接手把 (選用)</div>
              <div className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                可隨時連線藍牙實體手把<br />
                <span className="text-zinc-500">電腦鍵盤與畫面按鈕亦可直接操作</span>
              </div>
            </div>
          ) : (
            gamepads.map((g) => (
              <div
                key={g.id}
                onClick={() => onSelectGamepad(g.id)}
                className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                  g.is_active
                    ? "bg-zinc-850/80 border-white/[0.12] text-zinc-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                    : "bg-zinc-900/30 border-white/[0.04] text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200 hover:border-white/[0.08]"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      g.is_connected ? "bg-emerald-400" : "bg-zinc-600"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate text-zinc-200">{g.name}</div>
                    <div className="text-[9px] text-zinc-500 font-mono">ID #{g.id}</div>
                  </div>
                </div>

                {g.is_active && (
                  <span className="px-1.5 py-0.5 rounded-md bg-zinc-800 border border-white/[0.08] text-[9px] font-medium text-zinc-300 flex items-center gap-1 shrink-0 font-mono">
                    <Check className="w-2.5 h-2.5 text-zinc-300" />
                    主控
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Unified Ghost-Pad Virtual Controller Card */}
        <div className="mt-3 p-3 rounded-lg bg-zinc-900/60 border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] space-y-2.5 text-xs">
          {/* Header: Name & Status indicator & Switch Toggle */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div
                className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 border transition-colors ${
                  esp32Connected
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : isStep0Ready
                    ? "bg-zinc-800 text-zinc-400 border-white/[0.06]"
                    : "bg-zinc-900 text-zinc-600 border-white/[0.04]"
                }`}
              >
                <Gamepad2 className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-zinc-200 truncate">
                    Ghost-Pad 轉發
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-mono shrink-0 border ${
                      esp32Connected
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : isStep0Ready
                        ? "bg-zinc-800/80 text-zinc-500 border-white/[0.04]"
                        : "bg-zinc-900 text-zinc-600 border-white/[0.03]"
                    }`}
                  >
                    {esp32Connected ? "轉發中" : isStep0Ready ? "待命中" : "未就緒"}
                  </span>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono mt-0.5 truncate">
                  {esp32Connected
                    ? `60Hz • ${serialStatus?.tx_fps || 60} FPS`
                    : isStep0Ready
                    ? "ESP32 就緒，可啟動轉發"
                    : "尚未連接或驗證 ESP32"}
                </div>
              </div>
            </div>

            {/* iOS-Style Tactile Toggle Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={esp32Connected}
              disabled={!isStep0Ready && !esp32Connected}
              onClick={onToggleVirtualController}
              title={
                esp32Connected
                  ? "點擊停止虛擬手把服務"
                  : isStep0Ready
                  ? "點擊開啟虛擬手把服務"
                  : "ESP32 尚未就緒，請至「ESP32 與韌體」分頁完成連線"
              }
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out border ${
                !isStep0Ready && !esp32Connected
                  ? "bg-zinc-900 border-white/[0.04] opacity-40 cursor-not-allowed"
                  : esp32Connected
                  ? "bg-emerald-500 border-emerald-400/40 cursor-pointer"
                  : "bg-zinc-800 border-white/[0.08] hover:bg-zinc-750 cursor-pointer"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                  esp32Connected ? "translate-x-4.5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {/* Controls when Virtual Controller is active */}
          {esp32Connected && (
            <div className="pt-2 border-t border-white/[0.06] space-y-2">
              {/* Signal Transmission Toggle */}
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-zinc-400">訊號即時傳輸</span>
                <button
                  type="button"
                  onClick={onToggleMute}
                  title={isMuted ? "點擊解除暫停，開始傳送操作" : "點擊暫停訊號傳送 (看門狗安全中立)"}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium border transition-colors cursor-pointer ${
                    isMuted
                      ? "bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/20"
                      : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isMuted ? "bg-amber-400" : "bg-emerald-400"}`} />
                  {isMuted ? "已暫停 (點擊啟用)" : "已啟用"}
                </button>
              </div>

              <div className="flex items-center justify-between text-[10px]">
                <span className="text-zinc-400">Switch 狀態</span>
                <span
                  className={`font-mono font-medium ${
                    switchPairingState === "connected"
                      ? "text-emerald-400"
                      : switchPairingState === "pairing"
                      ? "text-amber-400"
                      : "text-zinc-500"
                  }`}
                >
                  {switchPairingState === "connected"
                    ? "1P 已連線"
                    : switchPairingState === "pairing"
                    ? "配對中..."
                    : "待配對"}
                </span>
              </div>

              {hasPairedSwitch ? (
                <button
                  onClick={() => onSendSerialCommand?.("wake_reconnect")}
                  className="w-full py-1.5 px-2 rounded-md bg-zinc-800 hover:bg-zinc-750 border border-white/[0.08] text-amber-300 text-[10px] font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>手動喚醒重連 (A鍵)</span>
                </button>
              ) : (
                <button
                  onClick={() => onSendSerialCommand?.("pair_lr")}
                  className="w-full py-1.5 px-2 rounded-md bg-zinc-800 hover:bg-zinc-750 border border-white/[0.08] text-zinc-200 text-[10px] font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Radio className="w-3 h-3 text-zinc-400" />
                  <span>首次配對 (送出 L+R)</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pipeline Status (Bottom Section) */}
      <div className="p-3 border-t border-white/[0.06] bg-zinc-950/80 space-y-2">
        <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-medium px-1">
          硬體橋接鏈路
        </div>
        <div className="p-2.5 rounded-lg bg-zinc-900/40 border border-white/[0.06] space-y-2 text-[11px]">
          {/* Step 1: Pad -> Mac */}
          <div className="flex items-center justify-between text-zinc-300">
            <div className="flex items-center gap-2">
              <Bluetooth className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-xs">手把 ➔ 電腦</span>
            </div>
            <span
              className={`font-mono text-[10px] ${
                gamepads.some((g) => g.is_connected) ? "text-emerald-400" : "text-zinc-500"
              }`}
            >
              {gamepads.some((g) => g.is_connected) ? "藍牙已連線" : "鍵盤/畫面 (手把選用)"}
            </span>
          </div>

          {/* Step 2: Mac -> ESP32 */}
          <div className="flex items-center justify-between text-zinc-300">
            <div className="flex items-center gap-2">
              <Laptop className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-xs">電腦 ➔ ESP32</span>
            </div>
            <span
              className={`font-mono text-[10px] ${
                esp32Connected ? "text-emerald-400" : "text-zinc-500"
              }`}
            >
              {esp32Connected ? "60Hz 串流中" : isStep0Ready ? "USB 已就緒" : "未接 USB"}
            </span>
          </div>

          {/* Step 3: ESP32 -> Switch */}
          <div className="flex items-center justify-between text-zinc-300">
            <div className="flex items-center gap-2">
              <Tv className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-xs">ESP32 ➔ Switch</span>
            </div>
            <span
              className={`font-mono text-[10px] ${
                switchPairingState === "connected"
                  ? "text-emerald-400 font-medium"
                  : switchPairingState === "pairing"
                  ? "text-amber-400"
                  : "text-zinc-500"
              }`}
            >
              {switchPairingState === "connected"
                ? "1P 已連線"
                : switchPairingState === "pairing"
                ? "配對握手中"
                : "尚未連線"}
            </span>
          </div>
        </div>
      </div>

      {/* Official Gamepad Pairing Modal Overlay */}
      {showGuide && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="bg-zinc-900 border border-white/[0.1] rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-100 font-semibold text-xs tracking-tight">
                <Bluetooth className="w-4 h-4 text-zinc-400" />
                <span>官方手把藍牙配對指引</span>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="p-1 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="關閉"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3 text-xs">
              {/* Switch Pro Controller */}
              <div className="p-3 rounded-lg bg-zinc-950/70 border border-white/[0.06] space-y-1.5">
                <div className="font-medium text-zinc-200 text-xs flex items-center gap-2">
                  <span>Switch Pro 控制器</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-zinc-400 text-xs leading-relaxed">
                  <li>按住頂部 USB-C 接口旁的「圓形同步鍵 (Sync)」3 秒至指示燈流動。</li>
                  <li>於電腦「系統設定 ➔ 藍牙」搜尋並點選配對。</li>
                </ol>
              </div>

              {/* Joy-Con */}
              <div className="p-3 rounded-lg bg-zinc-950/70 border border-white/[0.06] space-y-1.5">
                <div className="font-medium text-zinc-200 text-xs flex items-center gap-2">
                  <span>Joy-Con (L / R)</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-zinc-400 text-xs leading-relaxed">
                  <li>按住滑軌側邊的「圓形同步鍵 (Sync)」3 秒至指示燈流動。</li>
                  <li>於電腦「系統設定 ➔ 藍牙」搜尋並點選配對。</li>
                </ol>
              </div>

              {/* Note */}
              <div className="p-3 rounded-lg bg-zinc-800/40 border border-white/[0.06] text-zinc-300 text-[11px] leading-relaxed">
                <span className="font-medium text-zinc-200">外接手把非必須</span>：Ghost-Pad 支援純電腦操作！敲擊鍵盤或用滑鼠點擊畫面按鈕，皆可完整控制 Switch。
              </div>
            </div>

            {/* Footer */}
            <div className="p-3.5 border-t border-white/[0.06] flex justify-end bg-zinc-950/40">
              <button
                onClick={() => setShowGuide(false)}
                className="px-3.5 py-1.5 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium transition-colors cursor-pointer shadow-xs"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
