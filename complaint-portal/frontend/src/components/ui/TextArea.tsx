/**
 * Premium Dark-Glass TextArea Component
 */

import React, { useState } from 'react';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  charLimit?: number;
  fullWidth?: boolean;
}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  error,
  hint,
  charLimit,
  fullWidth = true,
  className = '',
  value,
  onChange,
  ...props
}) => {
  const [focused, setFocused] = useState(false);
  const currentLength = typeof value === 'string' ? value.length : 0;
  const nearLimit = charLimit && currentLength >= charLimit * 0.85;

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-semibold text-slate-300">
            {label}
            {props.required && <span className="text-rose-400 ml-1">*</span>}
          </label>
          {charLimit && (
            <span
              className={`text-xs font-medium transition-colors ${
                currentLength >= charLimit
                  ? 'text-rose-400'
                  : nearLimit
                  ? 'text-amber-400'
                  : 'text-slate-500'
              }`}
            >
              {currentLength}/{charLimit}
            </span>
          )}
        </div>
      )}

      <textarea
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        maxLength={charLimit}
        className={`
          w-full rounded-xl px-4 py-3 text-sm text-slate-100 resize-none
          bg-white/5 border transition-all duration-200
          placeholder:text-slate-600
          ${focused
            ? 'border-blue-500/60 bg-white/7 shadow-[0_0_0_3px_rgba(14,165,233,0.15)] outline-none'
            : error
            ? 'border-rose-500/50'
            : 'border-white/10 hover:border-white/18'
          }
          ${className}
        `}
        {...props}
      />

      {error && <p className="mt-1.5 text-xs text-rose-400">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
};
