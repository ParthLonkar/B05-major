/**
 * Floating Action Button (FAB) Component
 */

import React from 'react';
import { Link } from 'react-router-dom';

interface FloatingActionButtonProps {
  icon?: string;
  label?: string;
  onClick?: () => void;
  to?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  icon = '➕',
  label = 'New',
  onClick,
  to,
}) => {
  const content = (
    <button
      onClick={onClick}
      className={`
        fixed bottom-24 right-6 w-14 h-14 rounded-full
        bg-blue-600 text-white shadow-lg
        flex items-center justify-center text-2xl
        hover:bg-blue-700 hover:shadow-xl
        transition-all duration-200 transform hover:scale-110
        active:scale-95
        z-30
        md:bottom-8
      `}
    >
      {icon}
    </button>
  );

  if (to) {
    return <Link to={to}>{content}</Link>;
  }

  return content;
};
