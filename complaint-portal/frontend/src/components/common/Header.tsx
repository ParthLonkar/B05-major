/**
 * Header Navigation Component
 */

import React from 'react';
import { useAppContext } from '../../context/AppContext';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBackClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title = 'Pothole Complaint Portal', showBack, onBackClick }) => {
  const { isAdmin, logout } = useAppContext();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl safe-area-top">
      <div className="px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {showBack && (
              <button
                onClick={onBackClick}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 transition-all hover:bg-white/10 active:scale-95 touch-target shrink-0"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="hidden xs:inline">Back</span>
              </button>
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-300 truncate">Pothole Guard</p>
              <h1 className="text-lg sm:text-xl font-bold text-white truncate">{title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline-block rounded-full bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-200">
              {isAdmin ? 'Admin' : 'User'}
            </span>
            <button
              onClick={logout}
              className="rounded-full border border-white/10 bg-white/5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-200 transition-all hover:bg-white/10 active:scale-95 touch-target"
            >
              <span className="hidden xs:inline">Logout</span>
              <span className="xs:hidden">⏻</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};