/**
 * Reusable TextArea Component
 */

import React from 'react';

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
  value = '',
  ...props
}) => {
  const charCount = typeof value === 'string' ? value.length : 0;

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <textarea
        className={`
          w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600
          bg-white dark:bg-gray-700 text-gray-900 dark:text-white
          placeholder-gray-400 dark:placeholder-gray-500
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          transition-all duration-200 resize-none
          ${error ? 'border-red-500 focus:ring-red-500' : ''}
          ${className}
        `}
        value={value}
        {...props}
      />

      <div className="flex justify-between items-start mt-1">
        <div>
          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
          {hint && !error && <p className="text-sm text-gray-500 dark:text-gray-400">{hint}</p>}
        </div>
        {charLimit && (
          <p className={`text-xs font-medium ${charCount > charLimit ? 'text-red-500' : 'text-gray-400'}`}>
            {charCount}/{charLimit}
          </p>
        )}
      </div>
    </div>
  );
};
