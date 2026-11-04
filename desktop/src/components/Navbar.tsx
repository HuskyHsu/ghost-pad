import React from "react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher";
import ghostPadIcon from "../assets/Ghost-Pad-icon.svg";

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
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-[#033157] border border-border-subtle flex items-center justify-center shadow-xs p-1 overflow-hidden shrink-0">
          <img src={ghostPadIcon} alt="Ghost-Pad" className="w-full h-full object-contain" />
        </div>
        <div className="whitespace-nowrap">
          <span className="font-semibold text-sm tracking-tight text-text-primary">{t("app_name")}</span>
          <span className="ml-2 text-xs text-text-muted hidden sm:inline">{t("app_subtitle")}</span>
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
