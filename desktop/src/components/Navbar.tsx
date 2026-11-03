import React from "react";
import { Gamepad2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher";

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
    <header className="h-14 px-6 bg-surface-card/90 border-b border-border-subtle flex items-center justify-between backdrop-blur-md select-none sticky top-0 z-50">
      {/* Brand Identity */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-surface-sidebar border border-border-subtle flex items-center justify-center text-text-secondary shadow-xs">
          <Gamepad2 className="w-4 h-4" />
        </div>
        <div>
          <span className="font-semibold text-sm tracking-tight text-text-primary">{t("app_name")}</span>
          <span className="ml-2 text-xs text-text-muted hidden sm:inline">{t("app_subtitle")}</span>
        </div>
      </div>

      {/* Segmented Control Navigation */}
      <nav className="flex items-center p-1 bg-surface-input border border-border-subtle rounded-xl">
        <button
          onClick={() => onTabChange("dashboard")}
          className={`px-3.5 py-1 rounded-lg text-xs font-medium transition-all ${
            activeTab === "dashboard"
              ? "bg-surface-card text-text-primary shadow-xs border border-border-element"
              : "text-text-muted hover:text-text-primary border border-transparent"
          }`}
        >
          {t("nav.dashboard")}
        </button>
        <button
          onClick={() => onTabChange("macro")}
          className={`px-3.5 py-1 rounded-lg text-xs font-medium transition-all ${
            activeTab === "macro"
              ? "bg-surface-card text-text-primary shadow-xs border border-border-element"
              : "text-text-muted hover:text-text-primary border border-transparent"
          }`}
        >
          {t("nav.macro")}
        </button>
        <button
          onClick={() => onTabChange("hardware")}
          className={`px-3.5 py-1 rounded-lg text-xs font-medium transition-all ${
            activeTab === "hardware"
              ? "bg-surface-card text-text-primary shadow-xs border border-border-element"
              : "text-text-muted hover:text-text-primary border border-transparent"
          }`}
        >
          {t("nav.hardware")}
        </button>
      </nav>

      {/* Hardware Status Chips & Language Switcher */}
      <div className="flex items-center gap-2">
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
