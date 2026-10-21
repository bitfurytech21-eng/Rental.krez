import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'processing' | 'info' | 'warning' | 'error';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
  warning: (msg: string) => void;
  processing: (msg: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: ToastType = 'success') => {
    const id = 'toast-' + Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const success = (msg: string) => showToast(msg, 'success');
  const error = (msg: string) => showToast(msg, 'error');
  const info = (msg: string) => showToast(msg, 'info');
  const warning = (msg: string) => showToast(msg, 'warning');
  const processing = (msg: string) => showToast(msg, 'processing');

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning, processing }}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map(toast => {
          let bg = 'bg-white border-[#E3E8E3] text-[#18211F]';
          let icon = <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
          if (toast.type === 'error') {
            bg = 'bg-red-50 border-red-200 text-red-950';
            icon = <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />;
          } else if (toast.type === 'warning') {
            bg = 'bg-amber-50 border-amber-200 text-amber-950';
            icon = <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />;
          } else if (toast.type === 'processing') {
            bg = 'bg-[#182D2A] border-[#24423C] text-white';
            icon = <div className="w-3.5 h-3.5 rounded-full border-2 border-[#B7E36A] border-t-transparent animate-spin shrink-0" />;
          } else if (toast.type === 'info') {
            bg = 'bg-blue-50 border-blue-200 text-blue-950';
            icon = <Info className="w-4 h-4 text-blue-600 shrink-0" />;
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto p-3.5 rounded-xl border shadow-lg flex items-center justify-between gap-3 animate-in slide-in-from-top-3 fade-in duration-200 ${bg}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {icon}
                <p className="text-xs font-bold leading-snug truncate">{toast.message}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="opacity-70 hover:opacity-100 transition-opacity p-1 cursor-pointer shrink-0"
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
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};
