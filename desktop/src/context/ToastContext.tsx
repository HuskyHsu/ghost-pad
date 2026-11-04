import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastOptions {
  type?: ToastType;
  title?: string;
  message: string;
  durationMs?: number;
}

export interface ToastItem extends ToastOptions {
  id: string;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const showToast = useCallback(
    ({ type = "info", title, message, durationMs = 4000 }: ToastOptions) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newToast: ToastItem = { id, type, title, message, durationMs };

      setToasts((prev) => {
        // Keep at most 3 simultaneous toasts to prevent UI flooding
        const next = [...prev, newToast];
        return next.slice(-3);
      });

      if (durationMs > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, durationMs);
      }
    },
    [dismissToast]
  );

  const value = useMemo(
    () => ({ showToast, dismissToast, clearToasts }),
    [showToast, dismissToast, clearToasts]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Unified Global Floating Toast Notification Container (Top-Right, matching macOS aesthetic) */}
      <div className="fixed top-16 right-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
        {toasts.map((toast) => {
          const isSuccess = toast.type === "success";
          const isError = toast.type === "error";

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto p-3.5 rounded-xl border shadow-xl backdrop-blur-md flex items-start gap-3 text-xs transition-all animate-in fade-in slide-in-from-top-2 duration-200 ${
                isSuccess
                  ? "bg-surface-card/95 border-emerald-500/25 text-text-primary"
                  : isError
                  ? "bg-surface-card/95 border-rose-500/25 text-text-primary"
                  : "bg-surface-card/95 border-border-subtle text-text-primary"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  isSuccess
                    ? "bg-emerald-500/15 text-emerald-600"
                    : isError
                    ? "bg-rose-500/15 text-rose-600"
                    : "bg-blue-500/15 text-blue-600"
                }`}
              >
                {isSuccess ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : isError ? (
                  <AlertCircle className="w-3.5 h-3.5" />
                ) : (
                  <Info className="w-3.5 h-3.5" />
                )}
              </div>

              <div className="min-w-0 flex-1 leading-relaxed">
                {toast.title && (
                  <p
                    className={`font-semibold text-xs mb-0.5 truncate ${
                      isSuccess ? "text-emerald-700" : isError ? "text-rose-700" : "text-text-primary"
                    }`}
                  >
                    {toast.title}
                  </p>
                )}
                <p className="text-[11px] text-text-secondary leading-relaxed break-all font-mono">
                  {toast.message}
                </p>
              </div>

              {/* Manual Close Button */}
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="text-text-muted hover:text-text-primary p-0.5 rounded-md hover:bg-surface-input transition-colors cursor-pointer shrink-0 -mr-1 -mt-1"
                aria-label="Close notification"
                title="關閉通知"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Graceful fallback if called outside provider (e.g. standalone test mocks)
    return {
      showToast: ({ title, message }: ToastOptions) => {
        if (title) console.log(`[Toast] ${title}: ${message}`);
        else console.log(`[Toast] ${message}`);
      },
      dismissToast: () => {},
      clearToasts: () => {},
    };
  }
  return context;
};
