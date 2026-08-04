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
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
      <div className="px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {showBack && (
              <button
                onClick={onBackClick}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 transition-colors hover:bg-white/10"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back
              </button>
            )}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-300">Pothole Guard</p>
              <h1 className="text-xl font-bold text-white">{title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-200">
              {isAdmin ? 'Admin' : 'User'}
            </span>
            <button
              onClick={logout}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};