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
  Power,
  Send,
  X,
} from "lucide-react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useTranslation } from "react-i18next";
import { GhostPadLogo } from "./GhostPadLogo";

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
  const { t } = useTranslation("common");

  return (
    <aside className="w-80 bg-surface-sidebar border-r border-border-subtle flex flex-col h-full select-none shrink-0">
      {/* Top App Header */}
      <div className="h-14 px-4 border-b border-border-subtle flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div
            className={`w-9 h-9 flex items-center justify-center shrink-0 transition-all duration-300 ${
              esp32Connected
                ? "drop-shadow-[0_0_8px_rgba(56,189,248,0.55)] drop-shadow-[0_2px_4px_rgba(3,49,87,0.14)]"
                : "drop-shadow-[0_2px_5px_rgba(3,49,87,0.14)]"
            }`}
          >
            <GhostPadLogo active={esp32Connected} />
          </div>
          <div
            className="font-brand font-extrabold text-[18px] tracking-[-0.025em] leading-none truncate translate-y-[0.5px] select-none"
            aria-label="Ghost-Pad"
          >
            <span className="text-[#033157]">Ghost</span>
            <span className="text-[#38BDF8] mx-[0.5px]">-</span>
            <span className="text-[#0B4F82]">Pad</span>
          </div>
        </div>

        {/* Language Switcher */}
        <LanguageSwitcher />
      </div>

      {/* Main Navigation */}
      <div className="p-3 space-y-1">
        <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-text-muted font-medium">
          {t("nav.section")}
        </div>
        <button
          onClick={() => onTabChange("dashboard")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all cursor-pointer ${
            activeTab === "dashboard"
              ? "bg-surface-card text-text-primary border border-border-element shadow-xs font-semibold"
              : "text-text-secondary hover:text-text-primary hover:bg-interactive-hover border border-transparent"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Activity className="w-3.5 h-3.5 text-text-muted shrink-0" />
            <span className="truncate">{t("sidebar_nav.dashboard")}</span>
          </div>
          {activeTab === "dashboard" && <ChevronRight className="w-3.5 h-3.5 text-text-muted shrink-0 ml-1" />}
        </button>

        <button
          onClick={() => onTabChange("macro")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all cursor-pointer ${
            activeTab === "macro"
              ? "bg-surface-card text-text-primary border border-border-element shadow-xs font-semibold"
              : "text-text-secondary hover:text-text-primary hover:bg-interactive-hover border border-transparent"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <FileCode2 className="w-3.5 h-3.5 text-text-muted shrink-0" />
            <span className="truncate">{t("sidebar_nav.macro")}</span>
          </div>
          {activeTab === "macro" && <ChevronRight className="w-3.5 h-3.5 text-text-muted shrink-0 ml-1" />}
        </button>

        <button
          onClick={() => onTabChange("hardware")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all cursor-pointer ${
            activeTab === "hardware"
              ? "bg-surface-card text-text-primary border border-border-element shadow-xs font-semibold"
              : "text-text-secondary hover:text-text-primary hover:bg-interactive-hover border border-transparent"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Cpu className="w-3.5 h-3.5 text-text-muted shrink-0" />
            <span className="truncate">{t("sidebar_nav.hardware")}</span>
          </div>
          {activeTab === "hardware" && <ChevronRight className="w-3.5 h-3.5 text-text-muted shrink-0 ml-1" />}
        </button>
      </div>

      {/* Controllers Section */}
      <div className="p-3 border-t border-border-subtle flex-1 overflow-y-auto space-y-2 scrollbar-none [&::-webkit-scrollbar]:hidden">
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted font-medium">
            {t("sidebar.input_gamepads", { count: gamepads.length })}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={onRefreshGamepads}
              title={t("sidebar.rescan_devices")}
              className="w-5 h-5 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-interactive-hover border border-transparent hover:border-border-subtle transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
            <button
              onClick={() => setShowGuide(!showGuide)}
              title={t("sidebar.pairing_guide_title")}
              className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors cursor-pointer border ${
                showGuide
                  ? "text-text-primary bg-surface-card border-border-element shadow-xs"
                  : "text-text-muted hover:text-text-primary hover:bg-interactive-hover border-transparent hover:border-border-subtle"
              }`}
            >
              <HelpCircle className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Device List */}
        <div className="space-y-1">
          {gamepads.length === 0 ? (
            <div className="py-4 px-3 text-center rounded-lg bg-surface-card border border-border-subtle text-text-secondary text-xs shadow-xs">
              <Gamepad2 className="w-4 h-4 mx-auto mb-1 text-text-muted" />
              <div className="text-[11px] font-medium text-text-primary">{t("sidebar.no_gamepad_title")}</div>
              <div className="text-[10px] text-text-muted mt-1 leading-relaxed">
                {t("sidebar.no_gamepad_desc1")}<br />
                <span className="text-text-muted">{t("sidebar.no_gamepad_desc2")}</span>
              </div>
            </div>
          ) : (
            gamepads.map((g) => (
              <div
                key={g.id}
                onClick={() => onSelectGamepad(g.id)}
                className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                  g.is_active
                    ? "bg-surface-card border-border-element text-text-primary shadow-xs"
                    : "bg-surface-card/60 border-border-subtle text-text-secondary hover:bg-surface-card hover:text-text-primary hover:border-border-element"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      g.is_connected ? "bg-emerald-500" : "bg-text-disabled"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate text-text-primary">{g.name}</div>
                    <div className="text-[9px] text-text-muted font-mono">ID #{g.id}</div>
                  </div>
                </div>

                {g.is_active && (
                  <span className="px-1.5 py-0.5 rounded-md bg-surface-input border border-border-subtle text-[9px] font-medium text-text-secondary flex items-center gap-1 shrink-0 font-mono">
                    <Check className="w-2.5 h-2.5 text-text-secondary" />
                    {t("sidebar.gamepad_master")}
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Unified Ghost-Pad Virtual Controller Card */}
        <div className="mt-3 p-3 rounded-lg bg-surface-card border border-border-element shadow-xs space-y-2.5 text-xs">
          {/* Header: Title & live overall status (no duplicate logo) */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-text-primary leading-tight truncate">
                {t("sidebar.bridge_title")}
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono min-w-0">
                {esp32Connected ? (
                  <>
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        switchPairingState === "connected"
                          ? "bg-emerald-500"
                          : switchPairingState === "pairing"
                          ? "bg-amber-500 animate-pulse"
                          : "bg-text-disabled"
                      }`}
                    />
                    <span
                      className={`truncate ${
                        switchPairingState === "connected"
                          ? "text-emerald-600 font-medium"
                          : switchPairingState === "pairing"
                          ? "text-amber-600"
                          : "text-text-muted"
                      }`}
                    >
                      {switchPairingState === "connected"
                        ? t("sidebar.switch_connected_1p")
                        : switchPairingState === "pairing"
                        ? t("sidebar.switch_pairing")
                        : t("sidebar.switch_standby")}
                    </span>
                    <span className="text-text-disabled shrink-0">•</span>
                    <span className="text-text-muted shrink-0">
                      {serialStatus?.tx_fps || 60}Hz
                    </span>
                  </>
                ) : (
                  <span className="text-text-muted truncate">
                    {isStep0Ready
                      ? t("sidebar.bridge_desc_ready")
                      : t("sidebar.bridge_desc_not_ready")}
                  </span>
                )}
              </div>
            </div>

            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-mono shrink-0 border whitespace-nowrap ${
                esp32Connected
                  ? isMuted
                    ? "bg-feedback-warning-bg text-feedback-warning-text border-feedback-warning-border"
                    : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  : isStep0Ready
                  ? "bg-surface-input text-text-muted border-border-subtle"
                  : "bg-surface-input text-text-disabled border-border-subtle"
              }`}
            >
              {esp32Connected
                ? isMuted
                  ? t("sidebar.bridge_status_paused")
                  : t("sidebar.bridge_status_streaming")
                : isStep0Ready
                ? t("sidebar.bridge_status_ready")
                : t("sidebar.bridge_status_not_ready")}
            </span>
          </div>

          {/* Linked Dual Toggle Panel: Switch 2 visually branches from Switch 1 */}
          <div className="rounded-lg bg-surface-input/60 border border-border-subtle p-2.5 space-y-0">
            {/* Switch 1 (Primary): ESP32 Connection */}
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-start gap-2 min-w-0 flex-1">
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 border transition-colors ${
                    esp32Connected
                      ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-600"
                      : "bg-surface-card border-border-subtle text-text-muted"
                  }`}
                >
                  <Power className="w-3 h-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-medium text-text-primary leading-tight truncate">
                    {t("sidebar.control_esp32_link")}
                  </div>
                  <div className="text-[10px] text-text-muted leading-snug mt-0.5 truncate">
                    {esp32Connected
                      ? t("sidebar.control_esp32_link_on")
                      : isStep0Ready
                      ? t("sidebar.control_esp32_link_off")
                      : t("sidebar.control_esp32_link_not_ready")}
                  </div>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-label={t("sidebar.control_esp32_link")}
                aria-checked={esp32Connected}
                disabled={!isStep0Ready && !esp32Connected}
                onClick={onToggleVirtualController}
                title={
                  esp32Connected
                    ? t("sidebar.toggle_stop_bridge")
                    : isStep0Ready
                    ? t("sidebar.toggle_start_bridge")
                    : t("sidebar.toggle_not_ready")
                }
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out border ${
                  !isStep0Ready && !esp32Connected
                    ? "bg-surface-input border-border-subtle opacity-40 cursor-not-allowed"
                    : esp32Connected
                    ? "bg-emerald-500 border-emerald-600 cursor-pointer"
                    : "bg-surface-card border-border-element hover:bg-interactive-hover cursor-pointer"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                    esp32Connected ? "translate-x-4.5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Dependency Branch + Switch 2 (Dependent): Input Forwarding */}
            <div className="flex items-stretch gap-2 pt-1.5">
              {/* L-shaped tree connector from Switch 1's icon column */}
              <div className="w-5 shrink-0 flex justify-center">
                <div
                  className={`w-2.5 h-5 translate-x-1 -mt-1.5 border-l-2 border-b-2 rounded-bl-md transition-colors ${
                    !esp32Connected
                      ? "border-border-element/70"
                      : isMuted
                      ? "border-amber-400/80"
                      : "border-emerald-400/80"
                  }`}
                />
              </div>

              <div
                className={`flex-1 min-w-0 flex items-center justify-between gap-2.5 pt-1 border-t border-border-subtle/70 transition-opacity ${
                  !esp32Connected ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-start gap-1.5 min-w-0 flex-1">
                  <Send
                    className={`w-3 h-3 mt-0.5 shrink-0 ${
                      !esp32Connected
                        ? "text-text-disabled"
                        : isMuted
                        ? "text-amber-500"
                        : "text-emerald-600"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-medium text-text-primary leading-tight truncate">
                      {t("sidebar.control_signal_send")}
                    </div>
                    <div
                      className={`text-[10px] leading-snug mt-0.5 truncate ${
                        esp32Connected && isMuted ? "text-amber-600" : "text-text-muted"
                      }`}
                    >
                      {!esp32Connected
                        ? t("sidebar.control_signal_send_disabled")
                        : isMuted
                        ? t("sidebar.control_signal_send_paused")
                        : t("sidebar.control_signal_send_on")}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-label={t("sidebar.control_signal_send")}
                  aria-checked={esp32Connected && !isMuted}
                  disabled={!esp32Connected}
                  onClick={onToggleMute}
                  title={
                    !esp32Connected
                      ? t("sidebar.control_signal_send_disabled")
                      : isMuted
                      ? t("sidebar.unmute_tooltip")
                      : t("sidebar.mute_tooltip")
                  }
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out border ${
                    !esp32Connected
                      ? "bg-surface-input border-border-subtle opacity-40 cursor-not-allowed"
                      : !isMuted
                      ? "bg-emerald-500 border-emerald-600 cursor-pointer"
                      : "bg-amber-100 border-amber-300 hover:bg-amber-200/70 cursor-pointer"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                      esp32Connected && !isMuted ? "translate-x-4.5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Pairing / Reconnect Action when ESP32 is connected */}
          {esp32Connected && (
            <div>
              {hasPairedSwitch ? (
                <button
                  onClick={() => onSendSerialCommand?.("wake_reconnect")}
                  className="w-full py-1.5 px-2 rounded-md bg-surface-input hover:bg-interactive-hover border border-border-element text-amber-600 text-[10px] font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Zap className="w-3 h-3 text-amber-500 shrink-0" />
                  <span className="truncate">{t("sidebar.wake_reconnect_btn")}</span>
                </button>
              ) : (
                <button
                  onClick={() => onSendSerialCommand?.("pair_lr")}
                  className="w-full py-1.5 px-2 rounded-md bg-surface-input hover:bg-interactive-hover border border-border-element text-text-primary text-[10px] font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Radio className="w-3 h-3 text-text-muted shrink-0" />
                  <span className="truncate">{t("sidebar.pair_lr_btn")}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pipeline Status (Bottom Section) */}
      <div className="p-3 border-t border-border-subtle bg-surface-sidebar space-y-2">
        <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted font-medium px-1">
          {t("sidebar.hardware_bridge_pipeline")}
        </div>
        <div className="p-2.5 rounded-lg bg-surface-card border border-border-subtle space-y-2 text-[11px] shadow-xs">
          {/* Step 1: Pad -> Mac */}
          <div className="flex items-center justify-between text-text-secondary gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <Bluetooth className="w-3.5 h-3.5 text-text-muted shrink-0" />
              <span className="text-xs text-text-primary truncate">{t("sidebar.pipeline_step1")}</span>
            </div>
            <span
              className={`font-mono text-[10px] whitespace-nowrap shrink-0 ${
                gamepads.some((g) => g.is_connected) ? "text-emerald-600 font-medium" : "text-text-muted"
              }`}
            >
              {gamepads.some((g) => g.is_connected)
                ? t("sidebar.pipeline_step1_bt")
                : t("sidebar.pipeline_step1_local")}
            </span>
          </div>

          {/* Step 2: Mac -> ESP32 */}
          <div className="flex items-center justify-between text-text-secondary gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <Laptop className="w-3.5 h-3.5 text-text-muted shrink-0" />
              <span className="text-xs text-text-primary truncate">{t("sidebar.pipeline_step2")}</span>
            </div>
            <span
              className={`font-mono text-[10px] whitespace-nowrap shrink-0 ${
                esp32Connected ? "text-emerald-600 font-medium" : "text-text-muted"
              }`}
            >
              {esp32Connected
                ? t("sidebar.pipeline_step2_active")
                : isStep0Ready
                ? t("sidebar.pipeline_step2_ready")
                : t("sidebar.pipeline_step2_disconnected")}
            </span>
          </div>

          {/* Step 3: ESP32 -> Switch */}
          <div className="flex items-center justify-between text-text-secondary gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Tv className="w-3.5 h-3.5 text-text-muted shrink-0" />
              <span className="text-xs text-text-primary truncate">{t("sidebar.pipeline_step3")}</span>
            </div>
            <span
              className={`font-mono text-[10px] whitespace-nowrap shrink-0 ${
                switchPairingState === "connected"
                  ? "text-emerald-600 font-medium"
                  : switchPairingState === "pairing"
                  ? "text-amber-600"
                  : "text-text-muted"
              }`}
            >
              {switchPairingState === "connected"
                ? t("sidebar.pipeline_step3_connected")
                : switchPairingState === "pairing"
                ? t("sidebar.pipeline_step3_pairing")
                : t("sidebar.pipeline_step3_disconnected")}
            </span>
          </div>
        </div>
      </div>

      {/* Official Gamepad Pairing Modal Overlay */}
      {showGuide && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="bg-surface-modal border border-border-element rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-border-subtle flex items-center justify-between">
              <div className="flex items-center gap-2 text-text-primary font-semibold text-xs tracking-tight">
                <Bluetooth className="w-4 h-4 text-text-muted" />
                <span>{t("sidebar.guide_title")}</span>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="p-1 rounded-md hover:bg-interactive-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                title={t("actions.close")}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3 text-xs">
              {/* Switch Pro Controller */}
              <div className="p-3 rounded-lg bg-surface-input border border-border-subtle space-y-1.5">
                <div className="font-medium text-text-primary text-xs flex items-center gap-2">
                  <span>{t("sidebar.guide_switch_pro_title")}</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-text-secondary text-xs leading-relaxed">
                  <li>{t("sidebar.guide_pro_step1")}</li>
                  <li>{t("sidebar.guide_pro_step2")}</li>
                </ol>
              </div>

              {/* Joy-Con */}
              <div className="p-3 rounded-lg bg-surface-input border border-border-subtle space-y-1.5">
                <div className="font-medium text-text-primary text-xs flex items-center gap-2">
                  <span>{t("sidebar.guide_joycon_title")}</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-text-secondary text-xs leading-relaxed">
                  <li>{t("sidebar.guide_joycon_step1")}</li>
                  <li>{t("sidebar.guide_joycon_step2")}</li>
                </ol>
              </div>

              {/* Note */}
              <div className="p-3 rounded-lg bg-surface-card border border-border-subtle text-text-secondary text-[11px] leading-relaxed shadow-xs">
                <span className="font-medium text-text-primary">{t("sidebar.guide_note_title")}</span>：{t("sidebar.guide_note_desc")}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3.5 border-t border-border-subtle flex justify-end bg-surface-input/50">
              <button
                onClick={() => setShowGuide(false)}
                className="px-3.5 py-1.5 rounded-md bg-accent text-accent-foreground hover:bg-accent-hover text-xs font-medium transition-colors cursor-pointer shadow-xs"
              >
                {t("sidebar.guide_got_it")}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
