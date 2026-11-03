import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { detectInitialLanguage, LANGUAGE_STORAGE_KEY } from "./detector";

import commonEn from "./locales/en/common.json";
import dashboardEn from "./locales/en/dashboard.json";
import hardwareEn from "./locales/en/hardware.json";
import macroEn from "./locales/en/macro.json";
import errorsEn from "./locales/en/errors.json";

import commonJa from "./locales/ja/common.json";
import dashboardJa from "./locales/ja/dashboard.json";
import hardwareJa from "./locales/ja/hardware.json";
import macroJa from "./locales/ja/macro.json";
import errorsJa from "./locales/ja/errors.json";

import commonZhTw from "./locales/zh-TW/common.json";
import dashboardZhTw from "./locales/zh-TW/dashboard.json";
import hardwareZhTw from "./locales/zh-TW/hardware.json";
import macroZhTw from "./locales/zh-TW/macro.json";
import errorsZhTw from "./locales/zh-TW/errors.json";

export const resources = {
  en: {
    common: commonEn,
    dashboard: dashboardEn,
    hardware: hardwareEn,
    macro: macroEn,
    errors: errorsEn,
  },
  ja: {
    common: commonJa,
    dashboard: dashboardJa,
    hardware: hardwareJa,
    macro: macroJa,
    errors: errorsJa,
  },
  "zh-TW": {
    common: commonZhTw,
    dashboard: dashboardZhTw,
    hardware: hardwareZhTw,
    macro: macroZhTw,
    errors: errorsZhTw,
  },
} as const;

export const defaultNS = "common";

const initialLanguage = detectInitialLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage,
    fallbackLng: "en",
    defaultNS: "common",
    interpolation: {
      escapeValue: false,
    },
  });

i18n.on("languageChanged", (lng) => {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
    if (typeof document !== "undefined") {
      document.documentElement.lang = lng;
    }
  } catch (e) {
    console.warn("Failed to persist language:", e);
  }
});

if (typeof document !== "undefined") {
  document.documentElement.lang = initialLanguage;
}

export default i18n;
