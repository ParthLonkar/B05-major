/**
 * Premium Dark-Glass Input Component
 */

import React, { useState } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  icon,
  rightIcon,
  fullWidth = true,
  className = '',
  ...props
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label className="block text-sm font-semibold text-slate-300 mb-1.5">
          {label}
          {props.required && <span className="text-rose-400 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {icon && (
          <div
            className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
              focused ? 'text-blue-400' : 'text-slate-500'
            }`}
          >
            {icon}
          </div>
        )}
        <input
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`
            w-full rounded-xl px-4 py-3 text-sm text-slate-100
            bg-white/5 border transition-all duration-200
            placeholder:text-slate-600
            ${focused
              ? 'border-blue-500/60 bg-white/7 shadow-[0_0_0_3px_rgba(14,165,233,0.15)] outline-none'
              : error
              ? 'border-rose-500/50 bg-rose-500/5'
              : 'border-white/10 hover:border-white/18'
            }
            ${icon ? 'pl-10' : ''}
            ${rightIcon ? 'pr-10' : ''}
            ${className}
          `}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            {rightIcon}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1">
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
};
