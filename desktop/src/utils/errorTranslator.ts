import { t } from "i18next";

export interface SerializedAppError {
  code: string;
  params?: Record<string, any>;
}

export function parseAppError(rawError: any): { key: string; params: Record<string, any> } | null {
  if (!rawError) return null;
  if (typeof rawError === "object" && rawError.code) {
    return {
      key: `errors:${rawError.code}`,
      params: rawError.params || {},
    };
  }
  if (typeof rawError === "string") {
    try {
      const parsed = JSON.parse(rawError);
      if (parsed && typeof parsed === "object" && parsed.code) {
        return {
          key: `errors:${parsed.code}`,
          params: parsed.params || {},
        };
      }
    } catch {
      // Not a JSON error
    }
  }
  return null;
}

export function translateError(rawError: any): string {
  const parsed = parseAppError(rawError);
  if (parsed) {
    const translated = t(parsed.key, parsed.params) as unknown;
    if (typeof translated === "string" && !translated.startsWith("errors:")) {
      return translated;
    }
  }
  if (typeof rawError === "string") {
    return rawError;
  }
  if (rawError instanceof Error) {
    return rawError.message;
  }
  return String(rawError);
}
