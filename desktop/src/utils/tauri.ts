/**
 * Utility function to check whether Tauri desktop environment is available.
 * Returns true if running within the Tauri desktop application webview,
 * and false if running in a standard web browser development server.
 */
export const isTauriAvailable = (): boolean =>
  typeof window !== "undefined" && Boolean((window as any).__TAURI_INTERNALS__);
