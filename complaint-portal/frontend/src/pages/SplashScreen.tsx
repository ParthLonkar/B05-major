/**
 * Premium Splash Screen — animated orbs, staggered text, progress bar
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
    }, 2400);
    return () => window.clearTimeout(timer);
  }, [isAuthenticated, isAdmin, navigate]);

  return (
    <div className="relative min-h-full overflow-hidden flex items-center justify-center px-6"
      style={{ background: 'linear-gradient(160deg, #080d1a 0%, #0a0f1e 50%, #06091a 100%)' }}
    >
      {/* Animated background orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute w-80 h-80 rounded-full opacity-25 animate-orb1"
          style={{
            background: 'radial-gradient(circle, rgba(14,165,233,0.7) 0%, transparent 70%)',
            top: '-60px', right: '-40px', filter: 'blur(60px)',
          }}
        />
        <div
          className="absolute w-72 h-72 rounded-full opacity-20 animate-orb2"
          style={{
            background: 'radial-gradient(circle, rgba(124,58,237,0.8) 0%, transparent 70%)',
            bottom: '20px', left: '-50px', filter: 'blur(60px)',
          }}
        />
        <div
          className="absolute w-56 h-56 rounded-full opacity-15 animate-orb3"
          style={{
            background: 'radial-gradient(circle, rgba(6,182,212,0.6) 0%, transparent 70%)',
            top: '45%', left: '50%', filter: 'blur(80px)',
          }}
        />
      </div>

      <div className="relative z-10 text-center w-full max-w-xs">
        {/* App icon */}
        <div className="animate-fade-up mx-auto mb-8">
          <div
            className="mx-auto h-24 w-24 rounded-3xl flex items-center justify-center animate-float"
            style={{
              background: 'linear-gradient(135deg, rgba(14,165,233,0.2), rgba(124,58,237,0.15))',
              border: '1px solid rgba(14,165,233,0.3)',
              boxShadow: '0 0 40px rgba(14,165,233,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            {/* Road / warning icon */}
            <svg className="h-12 w-12 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 19.5h20L12 2z" />
              <path d="M12 9v5" />
              <circle cx="12" cy="17" r="0.5" fill="currentColor" />
            </svg>
          </div>
        </div>

        {/* Badge */}
        <div className="animate-fade-up-delay1">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{
              background: 'rgba(14,165,233,0.12)',
              border: '1px solid rgba(14,165,233,0.25)',
              color: '#38bdf8',
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            Pothole Guard
          </span>
        </div>

        {/* Headline */}
        <h1 className="animate-fade-up-delay2 mt-4 text-4xl font-black tracking-tight text-white">
          Complaint{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Portal
          </span>
        </h1>

        {/* Subtitle */}
        <p className="animate-fade-up-delay3 mt-3 text-sm leading-relaxed text-slate-400 max-w-[260px] mx-auto">
          Fast reporting for citizens. Live operations & mapping for admins.
        </p>

        {/* Progress bar */}
        <div className="mt-10 animate-fade-up-delay3">
          <div
            className="mx-auto h-1 w-48 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <div
              className="h-full rounded-full animate-progress"
              style={{
                background: 'linear-gradient(90deg, #0ea5e9, #06b6d4, #7c3aed)',
              }}
            />
          </div>
        </div>

        {/* Version hint */}
        <p className="mt-6 text-[10px] text-slate-600 animate-fade-in">v1.0 · Community Infrastructure</p>
      </div>
    </div>
  );
};

export default SplashScreen;
