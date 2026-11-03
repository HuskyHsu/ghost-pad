import { describe, it, expect, beforeEach } from "vitest";
import { mapLocaleToSupported, detectInitialLanguage, LANGUAGE_STORAGE_KEY } from "../i18n/detector";
import { resources } from "../i18n";
import { parseAppError, translateError } from "../utils/errorTranslator";
import i18n from "../i18n";

describe("i18n Language Detection Rules", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("maps Taiwan locales to zh-TW", () => {
    expect(mapLocaleToSupported("zh-TW")).toBe("zh-TW");
    expect(mapLocaleToSupported("zh-tw")).toBe("zh-TW");
    expect(mapLocaleToSupported("zh-Hant-TW")).toBe("zh-TW");
  });

  it("maps Japanese locales to ja", () => {
    expect(mapLocaleToSupported("ja")).toBe("ja");
    expect(mapLocaleToSupported("ja-JP")).toBe("ja");
    expect(mapLocaleToSupported("ja_JP")).toBe("ja");
  });

  it("maps other Chinese locales (zh-CN, zh-HK, zh-MO, zh-SG) to en (English)", () => {
    expect(mapLocaleToSupported("zh-CN")).toBe("en");
    expect(mapLocaleToSupported("zh-cn")).toBe("en");
    expect(mapLocaleToSupported("zh-HK")).toBe("en");
    expect(mapLocaleToSupported("zh-MO")).toBe("en");
    expect(mapLocaleToSupported("zh-SG")).toBe("en");
    expect(mapLocaleToSupported("zh-Hans")).toBe("en");
  });

  it("maps other non-supported languages to en (English)", () => {
    expect(mapLocaleToSupported("en-US")).toBe("en");
    expect(mapLocaleToSupported("en-GB")).toBe("en");
    expect(mapLocaleToSupported("fr-FR")).toBe("en");
    expect(mapLocaleToSupported("de-DE")).toBe("en");
    expect(mapLocaleToSupported("ko-KR")).toBe("en");
    expect(mapLocaleToSupported("")).toBe("en");
  });

  it("respects saved language in localStorage", () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "ja");
    expect(detectInitialLanguage()).toBe("ja");

    localStorage.setItem(LANGUAGE_STORAGE_KEY, "zh-TW");
    expect(detectInitialLanguage()).toBe("zh-TW");

    localStorage.setItem(LANGUAGE_STORAGE_KEY, "en");
    expect(detectInitialLanguage()).toBe("en");
  });
});

describe("i18n Key Completeness", () => {
  const namespaces = ["common", "dashboard", "hardware", "macro", "errors"] as const;

  function getKeys(obj: any, prefix = ""): string[] {
    return Object.keys(obj).flatMap((key) => {
      const val = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (typeof val === "object" && val !== null && !Array.isArray(val)) {
        return getKeys(val, newKey);
      }
      return [newKey];
    });
  }

  namespaces.forEach((ns) => {
    it(`namespace "${ns}" has matching keys across en, ja, and zh-TW`, () => {
      const enKeys = getKeys(resources.en[ns]).sort();
      const jaKeys = getKeys(resources.ja[ns]).sort();
      const zhTwKeys = getKeys(resources["zh-TW"][ns]).sort();

      expect(jaKeys).toEqual(enKeys);
      expect(zhTwKeys).toEqual(enKeys);
    });
  });
});

describe("Error Translator", () => {
  beforeEach(() => {
    i18n.changeLanguage("zh-TW");
  });

  it("parses and translates structured JSON AppError", () => {
    const errorJson = JSON.stringify({
      code: "SERIAL_OPEN_FAILED",
      params: { port: "COM3", reason: "拒絕存取" },
    });

    const parsed = parseAppError(errorJson);
    expect(parsed?.key).toBe("errors:SERIAL_OPEN_FAILED");
    expect(parsed?.params.port).toBe("COM3");

    const translatedZh = translateError(errorJson);
    expect(translatedZh).toContain("無法開啟序列埠 COM3");

    i18n.changeLanguage("en");
    const translatedEn = translateError(errorJson);
    expect(translatedEn).toContain("Failed to open serial port COM3");

    i18n.changeLanguage("ja");
    const translatedJa = translateError(errorJson);
    expect(translatedJa).toContain("シリアルポート COM3 を開けませんでした");
  });

  it("falls back gracefully for raw plain strings", () => {
    expect(translateError("Plain raw error message")).toBe("Plain raw error message");
  });
});

describe("Page Translations across zh-TW, en, ja", () => {
  it("translates macro and hardware strings dynamically when language changes", () => {
    i18n.changeLanguage("zh-TW");
    expect(i18n.t("macro:library_title")).toBe("巨集腳本庫");
    expect(i18n.t("hardware:title")).toBe("ESP32 硬體與連線控制台");

    i18n.changeLanguage("en");
    expect(i18n.t("macro:library_title")).toBe("Macro Library");
    expect(i18n.t("hardware:title")).toBe("ESP32 Hardware & Serial Console");

    i18n.changeLanguage("ja");
    expect(i18n.t("macro:library_title")).toBe("マクロライブラリ");
    expect(i18n.t("hardware:title")).toBe("ESP32 ハードウェア＆通信コンソール");

    // Reset back to zh-TW for any other tests
    i18n.changeLanguage("zh-TW");
  });
});

