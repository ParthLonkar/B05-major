/**
 * Premium Dark-Glass Select Component
 */

import React, { useState } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  fullWidth?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  hint,
  options,
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
        <select
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`
            w-full rounded-xl px-4 py-3 text-sm text-slate-100 appearance-none
            bg-white/5 border transition-all duration-200
            ${focused
              ? 'border-blue-500/60 bg-white/7 shadow-[0_0_0_3px_rgba(14,165,233,0.15)] outline-none'
              : error
              ? 'border-rose-500/50'
              : 'border-white/10 hover:border-white/18'
            }
            ${className}
          `}
          style={{ colorScheme: 'dark' }}
          {...props}
        >
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              style={{ background: '#0f172a', color: '#f1f5f9' }}
            >
              {opt.label}
            </option>
          ))}
        </select>

        {/* Chevron */}
        <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2">
          <svg
            className={`w-4 h-4 transition-colors ${focused ? 'text-blue-400' : 'text-slate-500'}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </div>

      {error && <p className="mt-1.5 text-xs text-rose-400">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
};
