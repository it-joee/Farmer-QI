import React, { createContext, useContext, useState, useCallback } from "react";

export interface ToastOptions {
  title: string;
  message?: string;
  type?: "success" | "info" | "error";
  duration?: number;
}

export interface ToastItem extends ToastOptions {
  id: string;
}

interface ToastContextType {
  toast: (options: ToastOptions | string) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (options: ToastOptions | string) => {
      const id = crypto.randomUUID();
      const item: ToastItem =
        typeof options === "string"
          ? { id, title: options, type: "success" }
          : { id, type: "success", duration: 3500, ...options };

      setToasts((prev) => [...prev, item]);

      const timer = setTimeout(() => {
        removeToast(id);
      }, item.duration ?? 3500);

      return () => clearTimeout(timer);
    },
    [removeToast]
  );

  const showSuccess = useCallback(
    (title: string, message?: string) => {
      toast({ title, message, type: "success" });
    },
    [toast]
  );

  const showError = useCallback(
    (title: string, message?: string) => {
      toast({ title, message, type: "error" });
    },
    [toast]
  );

  return (
    <ToastContext.Provider value={{ toast, showSuccess, showError }}>
      {children}
      <div className="toast-container" aria-live="polite" aria-atomic="true">
        {toasts.map((item) => (
          <div key={item.id} className={`toast-card toast-card--${item.type ?? "success"}`}>
            <div className="toast-icon">
              {item.type === "error" ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              ) : item.type === "info" ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              )}
            </div>
            <div className="toast-body">
              <div className="toast-title">{item.title}</div>
              {item.message && <div className="toast-message">{item.message}</div>}
            </div>
            <button
              type="button"
              className="toast-close"
              onClick={() => removeToast(item.id)}
              aria-label="Close notification"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
