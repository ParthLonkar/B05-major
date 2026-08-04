import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';

const HomeIcon = () => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </svg>
);

const AddIcon = () => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z" />
  </svg>
);

const MapIcon = () => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M15 5l-6-2-6 2v14l6-2 6 2 6-2V3l-6 2zm0 11l-6-2-6 2V6l6-2 6 2v10z" />
  </svg>
);

const TrackIcon = () => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 10a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" />
  </svg>
);

const AdminIcon = () => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-4.4 0-8 2.2-8 5v3h16v-3c0-2.8-3.6-5-8-5z" />
  </svg>
);

/**
 * Material Design bottom navigation.
 * Kept for compatibility, but the shell now hides it for regular users.
 */
export const MaterialBottomNavigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAppContext();

  const navigationItems = [
    { label: 'Home', path: '/home', icon: <HomeIcon /> },
    { label: 'Report', path: '/report', icon: <AddIcon />, primary: true },
    { label: 'Heatmap', path: '/heatmap', icon: <MapIcon /> },
    { label: 'Track', path: '/track', icon: <TrackIcon /> },
    ...(isAdmin ? [{ label: 'Admin', path: '/admin', icon: <AdminIcon /> }] : []),
  ];

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <nav className="absolute inset-x-0 bottom-0 z-40 border-t border-white/10 bg-slate-950/95 backdrop-blur-xl safe-area-bottom shadow-[0_-12px_40px_rgba(0,0,0,0.35)]">
      <div
        className="grid items-end gap-1 px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+6px)]"
        style={{ gridTemplateColumns: `repeat(${navigationItems.length}, minmax(0, 1fr))` }}
      >
        {navigationItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`relative flex min-h-[64px] flex-col items-center justify-center rounded-2xl transition-all duration-200 active:scale-95 ${item.primary ? 'translate-y-[-10px]' : ''} ${active ? 'text-white' : 'text-slate-400 hover:text-white'}`}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              <span className={`absolute inset-0 rounded-2xl transition-opacity duration-200 ${active ? 'bg-blue-500/20 opacity-100' : 'bg-white/5 opacity-0'}`} />
              <span className={`relative z-10 flex items-center justify-center ${item.primary ? 'h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30' : 'h-11 w-11 rounded-2xl bg-transparent'}`}>
                {item.icon}
              </span>
              <span className={`relative z-10 mt-1 text-[11px] font-medium ${item.primary ? 'text-white' : ''}`}>
                {item.label}
              </span>
              {active && !item.primary && <span className="absolute bottom-1 h-1 w-6 rounded-full bg-blue-400" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MaterialBottomNavigation;