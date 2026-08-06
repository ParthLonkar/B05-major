/**
 * Modal Component
 */

import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  zIndex?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  className = '',
  zIndex = 'z-50',
}) => {
  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 ${zIndex} flex items-end sm:items-center justify-center bg-black/55 p-4 backdrop-blur-sm`}>
      <div
        className={`w-full max-w-md rounded-[28px] bg-white shadow-2xl animate-in fade-in zoom-in duration-200 dark:bg-slate-900 ${className}`}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-700">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        )}

        <div className="max-h-[70dvh] overflow-y-auto px-6 py-5 text-slate-700 dark:text-slate-200">{children}</div>

        {footer && <div className="border-t border-slate-200 px-6 py-5 dark:border-slate-700">{footer}</div>}
      </div>
    </div>
  );
};