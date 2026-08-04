/**
 * Toast Notification Component
 */

import React from 'react';
import { Toast as ToastType } from '../../hooks/useToast.js';

interface ToastContainerProps {
  toasts: ToastType[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="absolute bottom-24 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none sm:left-auto sm:right-4 sm:w-80">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className={`pointer-events-auto rounded-2xl px-4 py-3 shadow-xl text-white font-medium backdrop-blur-md border border-white/10 animate-in slide-in-from-bottom duration-300 ${
            toast.type === 'success'
              ? 'bg-emerald-600/95'
              : toast.type === 'error'
                ? 'bg-rose-600/95'
                : toast.type === 'warning'
                  ? 'bg-amber-500/95 text-slate-950'
                  : 'bg-blue-600/95'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <span className="text-sm leading-5">{toast.message}</span>
            <button
              onClick={() => onRemove(toast.id)}
              className="text-current/80 hover:text-current transition-colors"
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};