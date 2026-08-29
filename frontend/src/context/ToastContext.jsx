import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info', title = null) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { id, message, type, title };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none">
        {toasts.map((toast) => {
          const isError = toast.type === 'error';
          const isSuccess = toast.type === 'success';
          const borderColor = isError ? 'border-rose-500/50' : isSuccess ? 'border-emerald-500/50' : 'border-sky-500/50';
          const iconColor = isError ? 'text-rose-400' : isSuccess ? 'text-emerald-400' : 'text-sky-400';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto p-4 rounded-xl bg-[#0f172a]/95 border ${borderColor} text-slate-100 shadow-2xl backdrop-blur-md flex items-start gap-3 animate-in fade-in slide-in-from-right-5 duration-200`}
            >
              {isError ? (
                <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${iconColor} mt-0.5`} />
              ) : isSuccess ? (
                <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${iconColor} mt-0.5`} />
              ) : (
                <Info className={`w-5 h-5 flex-shrink-0 ${iconColor} mt-0.5`} />
              )}
              <div className="flex-1 min-w-0">
                {toast.title && <div className="font-semibold text-sm text-slate-200 mb-0.5">{toast.title}</div>}
                <div className="text-xs text-slate-300 break-words leading-relaxed">{toast.message}</div>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-200 transition"
              >
                <X className="w-4 h-4" />
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
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
