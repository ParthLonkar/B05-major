/**
 * Premium Badge Component — colored dot + glowing dark-theme variants
 */

import React from 'react';

interface BadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'low' | 'medium' | 'high' | 'critical';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'info',
  size = 'md',
  className = '',
  dot = true,
}) => {
  const variantStyles: Record<string, { bg: string; text: string; border: string; dotColor: string }> = {
    success:  { bg: 'rgba(16,185,129,0.12)',  text: '#34d399', border: 'rgba(16,185,129,0.25)',  dotColor: '#10b981' },
    warning:  { bg: 'rgba(245,158,11,0.12)',  text: '#fbbf24', border: 'rgba(245,158,11,0.25)',  dotColor: '#f59e0b' },
    danger:   { bg: 'rgba(244,63,94,0.12)',   text: '#fb7185', border: 'rgba(244,63,94,0.25)',   dotColor: '#f43f5e' },
    info:     { bg: 'rgba(14,165,233,0.12)',  text: '#38bdf8', border: 'rgba(14,165,233,0.25)',  dotColor: '#0ea5e9' },
    low:      { bg: 'rgba(14,165,233,0.12)',  text: '#38bdf8', border: 'rgba(14,165,233,0.25)',  dotColor: '#0ea5e9' },
    medium:   { bg: 'rgba(245,158,11,0.12)',  text: '#fbbf24', border: 'rgba(245,158,11,0.25)',  dotColor: '#f59e0b' },
    high:     { bg: 'rgba(251,146,60,0.12)',  text: '#fb923c', border: 'rgba(251,146,60,0.25)',  dotColor: '#f97316' },
    critical: { bg: 'rgba(244,63,94,0.12)',   text: '#fb7185', border: 'rgba(244,63,94,0.25)',   dotColor: '#f43f5e' },
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px] font-semibold',
    md: 'px-2.5 py-1 text-xs font-semibold',
    lg: 'px-3 py-1.5 text-sm font-semibold',
  };

  const { bg, text, border, dotColor } = variantStyles[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ${sizes[size]} ${className}`}
      style={{ background: bg, color: text, border: `1px solid ${border}` }}
    >
      {dot && (
        <span
          className="inline-block rounded-full shrink-0"
          style={{
            width: size === 'sm' ? '5px' : '6px',
            height: size === 'sm' ? '5px' : '6px',
            background: dotColor,
            boxShadow: `0 0 6px ${dotColor}`,
          }}
        />
      )}
      {label}
    </span>
  );
};
