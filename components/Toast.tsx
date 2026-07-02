import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export interface ToastData {
  message: string;
  type?: 'error' | 'success';
}

interface ToastProps extends ToastData {
  onDismiss: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'error', onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const isError = type === 'error';

  return (
    <div className="fixed top-4 inset-x-0 z-[100] flex justify-center px-4 pointer-events-none animate-fade-in-up">
      <div
        role="alert"
        className={`pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl border max-w-md w-full md:w-auto ${
          isError
            ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
            : 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300'
        }`}
      >
        {isError ? <AlertCircle size={20} className="shrink-0" /> : <CheckCircle2 size={20} className="shrink-0" />}
        <p className="text-sm font-bold flex-1">{message}</p>
        <button onClick={onDismiss} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity" aria-label="بستن">
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default Toast;
