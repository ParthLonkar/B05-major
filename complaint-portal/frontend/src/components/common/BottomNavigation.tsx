/**
 * Bottom Navigation Component (Mobile-style)
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext.js';

export const BottomNavigation: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated, isAdmin } = useAppContext();

  if (!isAuthenticated) return null;

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const navItems = [
    ...(isAdmin ? [{ label: 'Home', path: '/home', icon: '🏠' }] : [{ label: 'Dashboard', path: '/dashboard', icon: '📊' }]),
    { label: 'Report', path: '/report', icon: '📝' },
    { label: 'Track', path: '/track', icon: '🔍' },
    ...(isAdmin ? [{ label: 'Heatmap', path: '/heatmap', icon: '🗺️' }] : []),
    ...(isAdmin ? [{ label: 'Admin', path: '/admin', icon: '⚙️' }] : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-40">
      <div className="flex items-center justify-around">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`
              flex flex-col items-center justify-center py-3 px-4 flex-1
              transition-all duration-200 border-t-2
              ${isActive(item.path)
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
              }
            `}
          >
            <span className="text-xl mb-1">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};
