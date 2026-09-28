/**
 * Premium Button Component — gradient primary, glass outline, colored glow shadows
 */

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon,
  children,
  disabled,
  className = '',
  ...props
}) => {
  const baseStyles =
    'font-semibold rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] select-none';

  const variants = {
    primary:
      'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-[0_4px_15px_rgba(14,165,233,0.35)] hover:shadow-[0_8px_25px_rgba(14,165,233,0.5)] hover:-translate-y-0.5',
    secondary:
      'bg-white/8 text-slate-100 border border-white/12 hover:bg-white/12 hover:border-white/20 backdrop-blur-sm',
    outline:
      'border border-blue-500/50 text-blue-400 hover:bg-blue-500/10 hover:border-blue-400/70 focus-visible:ring-blue-500',
    danger:
      'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-[0_4px_15px_rgba(244,63,94,0.3)] hover:shadow-[0_8px_25px_rgba(244,63,94,0.45)] hover:-translate-y-0.5',
    success:
      'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_4px_15px_rgba(16,185,129,0.3)] hover:shadow-[0_8px_25px_rgba(16,185,129,0.45)] hover:-translate-y-0.5',
    ghost:
      'text-slate-300 hover:text-white hover:bg-white/8 border border-transparent',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm min-h-[40px]',
    md: 'px-5 py-2.5 text-[15px] min-h-[48px]',
    lg: 'px-6 py-3.5 text-base min-h-[56px] font-bold tracking-wide',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4 shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {icon && !loading && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};
