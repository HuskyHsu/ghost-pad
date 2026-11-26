import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { zhTWContent, type SiteContent } from "../content/zh-TW";
import { enContent } from "../content/en";
import { jaContent } from "../content/ja";

export type SupportedLocale = "zh-TW" | "en" | "ja";

export interface LocaleOption {
  code: SupportedLocale;
  label: string;
  shortLabel: string;
}

export const LOCALE_OPTIONS: readonly LocaleOption[] = [
  { code: "zh-TW", label: "繁體中文", shortLabel: "繁中" },
  { code: "en", label: "English", shortLabel: "EN" },
  { code: "ja", label: "日本語", shortLabel: "日本語" },
] as const;

const dictionaries: Record<SupportedLocale, SiteContent> = {
  "zh-TW": zhTWContent,
  en: enContent,
  ja: jaContent,
};

function parseLangParam(raw: string | null): SupportedLocale {
  if (!raw) return "en";
  const value = raw.trim().toLowerCase();
  if (value === "zh-tw" || value === "zh" || value === "zh-hant") return "zh-TW";
  if (value === "ja") return "ja";
  return "en";
}

/** The URL is the single source of truth: `?lang=` or default "en". */
function readLocaleFromUrl(): SupportedLocale {
  try {
    if (typeof window !== "undefined" && window.location) {
      return parseLangParam(new URLSearchParams(window.location.search).get("lang"));
    }
  } catch {
    // Ignore malformed URLs
  }
  return "en";
}

function writeLocaleToUrl(next: SupportedLocale) {
  try {
    if (typeof window === "undefined" || !window.history || !window.location) return;
    const url = new URL(window.location.href);
    if (next === "en") {
      url.searchParams.delete("lang");
    } else {
      url.searchParams.set("lang", next);
    }
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  } catch {
    // Ignore history errors in sandboxed environments
  }
}

interface LocaleContextValue {
  locale: SupportedLocale;
  setLocale: (next: SupportedLocale) => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "en",
  setLocale: () => {},
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(readLocaleFromUrl);

  const setLocale = useCallback((next: SupportedLocale) => {
    setLocaleState(next);
    writeLocaleToUrl(next);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
      document.title = dictionaries[locale].meta.pageTitle;
    }
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  return createElement(LocaleContext.Provider, { value }, children);
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}

/**
 * Centralized content hook reading the active locale from LocaleProvider
 * (falling back cleanly to "en" when rendered outside a provider).
 */
export function useContent(overrideLocale?: SupportedLocale): SiteContent {
  const { locale } = useContext(LocaleContext);
  const activeLocale = overrideLocale ?? locale;
  return dictionaries[activeLocale] ?? enContent;
}
