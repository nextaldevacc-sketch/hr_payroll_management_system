'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(({ message, type = 'info', duration = 4000 }) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast = { id, message, type };
    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, [removeToast]);

  const showSuccess = useCallback((message, duration = 4000) => {
    return showToast({ message, type: 'success', duration });
  }, [showToast]);

  const showError = useCallback((message, duration = 5000) => {
    return showToast({ message, type: 'error', duration });
  }, [showToast]);

  const showInfo = useCallback((message, duration = 4000) => {
    return showToast({ message, type: 'info', duration });
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo, removeToast }}>
      {children}
      {/* Toast Notification Container */}
      <div
        id="toast-notifications-container"
        className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none max-w-sm w-full"
        role="region"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            data-testid={`toast-${toast.type}`}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl shadow-lg border backdrop-blur-md transition-all animate-slideUp ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
                : toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
                : 'bg-slate-900/90 border-slate-700/50 text-slate-200'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-xs font-medium leading-relaxed" data-i18n-skip>
              {typeof toast.message === 'string' ? toast.message : JSON.stringify(toast.message)}
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-text-muted hover:text-text p-0.5 rounded transition-colors"
              aria-label="Close notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback if rendered outside provider
    return {
      showToast: ({ message }) => console.log('[Toast]', message),
      showSuccess: (m) => console.log('[Toast:success]', m),
      showError: (m) => console.error('[Toast:error]', m),
      showInfo: (m) => console.info('[Toast:info]', m),
      removeToast: () => {},
    };
  }
  return ctx;
}
