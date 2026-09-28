import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';

/* ─── Icons ─── */
const HomeIcon = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12L12 3l9 9" />
    <path d="M9 21V12h6v9" />
    <rect x="3" y="12" width="18" height="9" rx="1" className={active ? '' : 'hidden'} />
    {!active && <path d="M3 12v9h6v-6h6v6h6V12" />}
  </svg>
);

const ReportIcon = () => (
  <svg viewBox="0 0 24 24" className="h-[26px] w-[26px]" fill="currentColor">
    <path d="M12 2a10 10 0 110 20A10 10 0 0112 2zm1 5h-2v5H6v2h5v5h2v-5h5v-2h-5V7z" />
  </svg>
);

const MapIcon = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
  </svg>
);

const TrackIcon = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const AdminIcon = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L3 7l9 5 9-5-9-5z" />
    <path d="M3 17l9 5 9-5" />
    <path d="M3 12l9 5 9-5" />
  </svg>
);

const DashboardIcon = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

interface NavItem {
  label: string;
  path: string;
  icon: (active: boolean) => React.ReactNode;
  primary?: boolean;
}

/**
 * Premium Material Design 3 Bottom Navigation
 * Glass-morphism bar with glowing active pill and smooth spring transitions
 */
export const MaterialBottomNavigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, isAuthenticated } = useAppContext();

  if (!isAuthenticated) return null;

  const navigationItems: NavItem[] = isAdmin
    ? [
        { label: 'Home',    path: '/home',    icon: (a) => <HomeIcon active={a} /> },
        { label: 'Report',  path: '/report',  icon: () => <ReportIcon />, primary: true },
        { label: 'Heatmap', path: '/heatmap', icon: (a) => <MapIcon active={a} /> },
        { label: 'Track',   path: '/track',   icon: (a) => <TrackIcon active={a} /> },
        { label: 'Admin',   path: '/admin',   icon: (a) => <AdminIcon active={a} /> },
      ]
    : [
        { label: 'Home',    path: '/dashboard', icon: (a) => <DashboardIcon active={a} /> },
        { label: 'Report',  path: '/report',    icon: () => <ReportIcon />, primary: true },
        { label: 'Track',   path: '/track',     icon: (a) => <TrackIcon active={a} /> },
      ];

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <nav
      className="absolute inset-x-0 bottom-0 z-40 safe-area-bottom"
      style={{
        background: 'rgba(8, 13, 26, 0.92)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 -12px 40px rgba(0,0,0,0.5)',
      }}
    >
      <div
        className="grid items-end px-1 pt-1 pb-[calc(env(safe-area-inset-bottom)+4px)]"
        style={{ gridTemplateColumns: `repeat(${navigationItems.length}, minmax(0, 1fr))` }}
      >
        {navigationItems.map((item) => {
          const active = isActive(item.path);

          if (item.primary) {
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="relative flex flex-col items-center justify-center min-h-[60px] gap-0.5 active:scale-95 transition-transform duration-150"
                aria-label={item.label}
              >
                {/* Floating FAB */}
                <div
                  className="relative flex h-[52px] w-[52px] items-center justify-center rounded-full text-white -translate-y-3 shadow-[0_8px_24px_rgba(14,165,233,0.45)]"
                  style={{
                    background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
                  }}
                >
                  {item.icon(active)}
                  {/* Pulse ring */}
                  <div className="absolute inset-0 rounded-full animate-pulse-glow" />
                </div>
                <span className="text-[10px] font-semibold text-blue-400 -mt-2">{item.label}</span>
              </button>
            );
          }

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="relative flex flex-col items-center justify-end min-h-[60px] pb-1 gap-0.5 transition-all duration-200 active:scale-95"
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              {/* Active pill background */}
              {active && (
                <div
                  className="absolute top-1.5 left-1/2 -translate-x-1/2 h-10 w-[52px] rounded-2xl animate-scale-in"
                  style={{ background: 'rgba(14,165,233,0.15)' }}
                />
              )}

              {/* Icon */}
              <div
                className={`relative z-10 flex h-8 w-8 items-center justify-center transition-all duration-200 ${
                  active ? 'text-blue-400 scale-110' : 'text-slate-500'
                }`}
              >
                {item.icon(active)}
              </div>

              {/* Label */}
              <span
                className={`relative z-10 text-[10px] font-semibold transition-all duration-200 ${
                  active ? 'text-blue-400' : 'text-slate-600'
                }`}
              >
                {item.label}
              </span>

              {/* Active indicator dot */}
              {active && (
                <div className="absolute bottom-0.5 h-1 w-1 rounded-full bg-blue-400 animate-nav-pop" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MaterialBottomNavigation;