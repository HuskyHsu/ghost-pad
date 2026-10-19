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
    <header className="h-14 px-6 bg-zinc-950/80 border-b border-zinc-800/80 flex items-center justify-between backdrop-blur-md select-none sticky top-0 z-50">
      {/* Brand Identity */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-200">
          <Gamepad2 className="w-4 h-4" />
        </div>
        <div>
          <span className="font-semibold text-sm tracking-tight text-zinc-100">{t("app_name")}</span>
          <span className="ml-2 text-xs text-zinc-400 hidden sm:inline">{t("app_subtitle")}</span>
        </div>
      </div>

      {/* Segmented Control Navigation */}
      <nav className="flex items-center p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
        <button
          onClick={() => onTabChange("dashboard")}
          className={`px-3.5 py-1 rounded-lg text-xs font-medium transition-all ${
            activeTab === "dashboard"
              ? "bg-zinc-800 text-zinc-100 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          {t("nav.dashboard")}
        </button>
        <button
          onClick={() => onTabChange("macro")}
          className={`px-3.5 py-1 rounded-lg text-xs font-medium transition-all ${
            activeTab === "macro"
              ? "bg-zinc-800 text-zinc-100 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          {t("nav.macro")}
        </button>
        <button
          onClick={() => onTabChange("hardware")}
          className={`px-3.5 py-1 rounded-lg text-xs font-medium transition-all ${
            activeTab === "hardware"
              ? "bg-zinc-800 text-zinc-100 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          {t("nav.hardware")}
        </button>
      </nav>

      {/* Hardware Status Chips & Language Switcher */}
      <div className="flex items-center gap-2">
        {/* Gamepad Status */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800/80 text-xs text-zinc-300">
          <span
            className={`w-2 h-2 rounded-full ${
              gamepadConnected ? "bg-emerald-500" : "bg-zinc-600"
            }`}
          />
          <span className="text-zinc-400">{t("status.gamepad")}</span>
          <span className="font-medium text-zinc-200">
            {gamepadConnected ? t("status.connected") : t("status.disconnected")}
          </span>
        </div>

        {/* ESP32 Status */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800/80 text-xs text-zinc-300">
          <span
            className={`w-2 h-2 rounded-full ${
              esp32Connected ? "bg-emerald-500" : "bg-zinc-600"
            }`}
          />
          <span className="text-zinc-400">{t("status.esp32")}</span>
          <span className="font-medium text-zinc-200">
            {esp32Connected ? t("status.connected") : t("status.disconnected")}
          </span>
        </div>

        {/* Language Switcher */}
        <LanguageSwitcher />
      </div>
    </header>
  );
};
