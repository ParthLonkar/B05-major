/**
 * Reusable Card Component
 */

import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  clickable?: boolean;
  elevated?: boolean;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  className = '',
  clickable = false,
  elevated = false,
  ...props
}) => {
  return (
    <div
      className={`
        bg-white dark:bg-gray-800 rounded-2xl p-5 transition-all duration-200
        ${elevated ? 'shadow-xl' : 'shadow-md'}
        ${clickable ? 'hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] cursor-pointer' : ''}
        border border-gray-100 dark:border-gray-700
        ${className}
      `}
      {...props}
    >
      {title && (
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
          {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
};
