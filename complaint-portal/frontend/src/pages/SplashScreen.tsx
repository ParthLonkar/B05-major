/**
 * Splash Screen - Welcome/Intro Screen
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export const SplashScreen: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin } = useAppContext();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      navigate(isAuthenticated ? (isAdmin ? '/home' : '/report') : '/login', { replace: true });
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [isAuthenticated, isAdmin, navigate]);

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.35),transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_55%,#020617_100%)] flex items-center justify-center px-6">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[32px] border border-white/10 bg-white/10 shadow-2xl backdrop-blur-xl">
          <svg className="h-12 w-12 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
            <path d="M12 2l9 16H3L12 2z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 9v5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 18h.01" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-blue-300">Pothole Guard</p>
        <h1 className="text-4xl font-black tracking-tight text-white mb-3">Complaint Portal</h1>
        <p className="mx-auto max-w-xs text-sm leading-6 text-slate-300">
          Fast reporting for users. Live complaint operations and mapping for admins.
        </p>

        <div className="mt-8 flex items-center justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2.5 w-2.5 rounded-full bg-blue-300 animate-pulse"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
