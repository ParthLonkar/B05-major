/**
 * Premium Glass-Morphism Card Component
 */

import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  clickable?: boolean;
  elevated?: boolean;
  /** Wrap with a 1px gradient border */
  gradient?: boolean;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  className = '',
  clickable = false,
  elevated = false,
  gradient = false,
  noPadding = false,
  ...props
}) => {
  const inner = (
    <div
      className={`
        glass-card rounded-2xl
        ${noPadding ? '' : 'p-5'}
        ${elevated ? 'shadow-[0_8px_40px_rgba(0,0,0,0.5)]' : ''}
        ${clickable ? 'glass-card-hover cursor-pointer' : ''}
        ${className}
      `}
      {...props}
    >
      {title && (
        <div className="mb-4">
          <h3 className="text-base font-bold text-white">{title}</h3>
          {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );

  if (gradient) {
    return (
      <div
        className="rounded-2xl p-px"
        style={{
          background: 'linear-gradient(135deg, rgba(14,165,233,0.4), rgba(124,58,237,0.3), rgba(6,182,212,0.25))',
        }}
      >
        {inner}
      </div>
    );
  }

  return inner;
};
