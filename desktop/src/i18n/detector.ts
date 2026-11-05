export const LANGUAGE_STORAGE_KEY = "ghostpad_lang";
export const SUPPORTED_LANGUAGES = ["en", "ja", "zh-TW"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function mapLocaleToSupported(locale: string): SupportedLanguage {
  if (!locale) return "en";
  const clean = locale.trim().toLowerCase();

  // Explicit Taiwan check
  if (clean === "zh-tw" || clean.startsWith("zh-tw") || clean.includes("hant-tw")) {
    return "zh-TW";
  }

  // Japanese
  if (clean === "ja" || clean.startsWith("ja-") || clean.startsWith("ja_")) {
    return "ja";
  }

  // All other locales (including zh-CN, zh-HK, zh-MO, zh-SG, zh, etc.) default to English
  return "en";
}

export function detectInitialLanguage(): SupportedLanguage {
  if (typeof window !== "undefined") {
    try {
      const urlLang = new URLSearchParams(window.location.search).get("lang");
      if (urlLang) {
        return mapLocaleToSupported(urlLang);
      }
    } catch {}
  }

  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved && (SUPPORTED_LANGUAGES as readonly string[]).includes(saved)) {
      return saved as SupportedLanguage;
    }
  } catch (e) {
    console.warn("Unable to access localStorage for language detection:", e);
  }

  // Fallback to browser/system language
  if (typeof navigator !== "undefined") {
    const candidates = navigator.languages || [navigator.language];
    for (const cand of candidates) {
      if (!cand) continue;
      const mapped = mapLocaleToSupported(cand);
      if (mapped === "zh-TW" || mapped === "ja") {
        return mapped;
      }
    }
  }

  return "en";
}
