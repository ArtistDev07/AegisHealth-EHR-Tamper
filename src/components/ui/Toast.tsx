import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  addToast: (type: ToastType, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  const success = useCallback((title: string, message?: string) => addToast('success', title, message), [addToast]);
  const error = useCallback((title: string, message?: string) => addToast('error', title, message), [addToast]);
  const warning = useCallback((title: string, message?: string) => addToast('warning', title, message), [addToast]);
  const info = useCallback((title: string, message?: string) => addToast('info', title, message), [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, success, error, warning, info }}>
      {children}
      <div
        className="fixed bottom-5 right-5 z-60 flex flex-col gap-2 max-w-md w-full pointer-events-none"
        aria-live="polite"
      >
        {toasts.map(toast => {
          const iconMap = {
            success: <CheckCircle2 className="w-5 h-5 text-[#15803D] shrink-0" />,
            error: <AlertCircle className="w-5 h-5 text-[#B91C1C] shrink-0" />,
            warning: <AlertTriangle className="w-5 h-5 text-[#B45309] shrink-0" />,
            info: <Info className="w-5 h-5 text-[#1D4ED8] shrink-0" />,
          };

          const borderColors = {
            success: 'border-[#BBF7D0] bg-white',
            error: 'border-[#FECACA] bg-white',
            warning: 'border-[#FDE68A] bg-white',
            info: 'border-[#BFDBFE] bg-white',
          };

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border ${borderColors[toast.type]} transition-all animate-in slide-in-from-bottom-3 duration-200`}
              role="alert"
            >
              {iconMap[toast.type]}
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#172033]">{toast.title}</p>
                {toast.message && <p className="text-xs text-[#596579] mt-0.5">{toast.message}</p>}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-[#94A3B8] hover:text-[#172033] p-1 rounded transition-colors cursor-pointer"
                aria-label="Dismiss toast"
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
