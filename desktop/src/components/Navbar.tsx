import React from "react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { GhostPadLogo } from "./GhostPadLogo";

interface Props {
  activeTab: "dashboard" | "macro" | "hardware";
  onTabChange: (tab: "dashboard" | "macro" | "hardware") => void;
  gamepadConnected: boolean;
  esp32Connected: boolean;
}

export const Navbar: React.FC<Props> = ({
  activeTab,
  onTabChange,
  gamepadConnected,
  esp32Connected,
}) => {
  const { t } = useTranslation("common");

  return (
    <header className="h-14 px-6 bg-surface-card/90 border-b border-border-subtle flex items-center justify-between backdrop-blur-md select-none sticky top-0 z-50 gap-4">
      {/* Brand Identity */}
      <div className="flex items-center gap-2 shrink-0">
        <div
          className={`w-9 h-9 flex items-center justify-center shrink-0 transition-all duration-300 ${
            esp32Connected
              ? "drop-shadow-[0_0_8px_rgba(56,189,248,0.55)] drop-shadow-[0_2px_4px_rgba(3,49,87,0.14)]"
              : "drop-shadow-[0_2px_5px_rgba(3,49,87,0.14)]"
          }`}
        >
          <GhostPadLogo active={esp32Connected} />
        </div>
        <div className="flex items-baseline gap-2 whitespace-nowrap">
          <span className="font-brand font-extrabold text-[18px] tracking-[-0.025em] leading-none text-[#033157]">
            {t("app_name")}
          </span>
          <span className="text-xs text-text-muted hidden sm:inline">{t("app_subtitle")}</span>
        </div>
      </div>

      {/* Segmented Control Navigation */}
      <nav className="flex items-center p-1 bg-surface-input border border-border-subtle rounded-xl shrink-0">
        <button
          onClick={() => onTabChange("dashboard")}
          className={`px-3.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
            activeTab === "dashboard"
              ? "bg-surface-card text-text-primary shadow-xs border border-border-element"
              : "text-text-muted hover:text-text-primary border border-transparent"
          }`}
        >
          {t("nav.dashboard")}
        </button>
        <button
          onClick={() => onTabChange("macro")}
          className={`px-3.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
            activeTab === "macro"
              ? "bg-surface-card text-text-primary shadow-xs border border-border-element"
              : "text-text-muted hover:text-text-primary border border-transparent"
          }`}
        >
          {t("nav.macro")}
        </button>
        <button
          onClick={() => onTabChange("hardware")}
          className={`px-3.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
            activeTab === "hardware"
              ? "bg-surface-card text-text-primary shadow-xs border border-border-element"
              : "text-text-muted hover:text-text-primary border border-transparent"
          }`}
        >
          {t("nav.hardware")}
        </button>
      </nav>

      {/* Hardware Status Chips & Language Switcher */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Gamepad Status */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-surface-input border border-border-subtle text-xs text-text-secondary">
          <span
            className={`w-2 h-2 rounded-full ${
              gamepadConnected ? "bg-emerald-500" : "bg-border-element"
            }`}
          />
          <span className="text-text-muted">{t("status.gamepad")}</span>
          <span className="font-medium text-text-primary">
            {gamepadConnected ? t("status.connected") : t("status.disconnected")}
          </span>
        </div>

        {/* ESP32 Status */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-surface-input border border-border-subtle text-xs text-text-secondary">
          <span
            className={`w-2 h-2 rounded-full ${
              esp32Connected ? "bg-emerald-500" : "bg-border-element"
            }`}
          />
          <span className="text-text-muted">{t("status.esp32")}</span>
          <span className="font-medium text-text-primary">
            {esp32Connected ? t("status.connected") : t("status.disconnected")}
          </span>
        </div>

        {/* Language Switcher */}
        <LanguageSwitcher />
      </div>
    </header>
  );
};
