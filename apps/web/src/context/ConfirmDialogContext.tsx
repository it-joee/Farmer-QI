import React, { createContext, useContext, useState, useCallback, useRef } from "react";

export interface ConfirmOptions {
  title?: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "primary";
  isAlert?: boolean;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
  alert: (message: React.ReactNode, title?: string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [dialogState, setDialogState] = useState<(ConfirmOptions & { isOpen: boolean }) | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      if (typeof options === "string") {
        setDialogState({
          message: options,
          isOpen: true,
        });
      } else {
        setDialogState({
          ...options,
          isOpen: true,
        });
      }
    });
  }, []);

  const alert = useCallback(
    (message: React.ReactNode, title?: string): Promise<boolean> => {
      return confirm({
        title,
        message,
        confirmText: "OK",
        isAlert: true,
      });
    },
    [confirm]
  );

  const handleClose = (value: boolean) => {
    setDialogState(null);
    if (resolveRef.current) {
      resolveRef.current(value);
      resolveRef.current = null;
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm, alert }}>
      {children}
      {dialogState?.isOpen && (
        <div className="confirm-modal-overlay" onClick={() => handleClose(false)}>
          <div
            className="confirm-modal-card"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`confirm-modal-icon confirm-modal-icon--${dialogState.variant ?? "primary"}`}>
              {dialogState.variant === "danger" ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              ) : dialogState.variant === "warning" ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" y1="9" x2="12" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              )}
            </div>

            <div className="confirm-modal-content">
              {dialogState.title && <h3 className="confirm-modal-title">{dialogState.title}</h3>}
              <div className="confirm-modal-message">{dialogState.message}</div>
            </div>

            <div className="confirm-modal-actions">
              {!dialogState.isAlert && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleClose(false)}
                >
                  {dialogState.cancelText ?? "Cancel"}
                </button>
              )}
              <button
                type="button"
                className={`btn ${
                  dialogState.variant === "danger"
                    ? "btn-danger"
                    : dialogState.variant === "warning"
                    ? "btn-warning"
                    : "btn-primary"
                }`}
                onClick={() => handleClose(true)}
                autoFocus
              >
                {dialogState.confirmText ?? (dialogState.variant === "danger" ? "Delete" : "Confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirmDialog() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirmDialog must be used within a ConfirmDialogProvider");
  }
  return context;
}
