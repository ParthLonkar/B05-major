import React, { ReactNode, useEffect, useState } from 'react';

interface AndroidPhoneFrameProps {
  children: ReactNode;
}

const StatusBar: React.FC = () => {
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative z-20 flex items-center justify-between px-6 pt-3 pb-1.5">
      <span className="text-[12px] font-bold text-white/90 tabular-nums">{time}</span>
      {/* Dynamic island pill */}
      <div className="absolute left-1/2 top-2 -translate-x-1/2 h-[26px] w-[96px] rounded-full bg-black shadow-inner z-30" />
      <div className="flex items-center gap-1.5">
        {/* Signal bars */}
        <svg viewBox="0 0 17 12" width="17" height="12" fill="white" fillOpacity="0.9">
          <rect x="0" y="6" width="3" height="6" rx="1"/>
          <rect x="4.5" y="4" width="3" height="8" rx="1"/>
          <rect x="9" y="2" width="3" height="10" rx="1"/>
          <rect x="13.5" y="0" width="3" height="12" rx="1"/>
        </svg>
        {/* WiFi */}
        <svg viewBox="0 0 16 12" width="16" height="12" fill="white" fillOpacity="0.9">
          <path d="M8 9a1.5 1.5 0 110 3 1.5 1.5 0 010-3z"/>
          <path d="M8 5.5a5.5 5.5 0 014.243 2.007l1.414-1.414A7.5 7.5 0 008 3a7.5 7.5 0 00-5.657 3.093L3.757 7.507A5.5 5.5 0 018 5.5z"/>
          <path d="M8 2a9.5 9.5 0 016.857 2.943l1.414-1.414A11.5 11.5 0 008 0 11.5 11.5 0 00.729 3.529l1.414 1.414A9.5 9.5 0 018 2z"/>
        </svg>
        {/* Battery */}
        <div className="flex items-center gap-0.5">
          <div className="relative h-[11px] w-[22px] rounded-[3px] border border-white/70 p-[1.5px]">
            <div className="h-full w-[70%] rounded-[1.5px] bg-white/90" />
          </div>
          <div className="h-[5px] w-[2px] rounded-r-full bg-white/50" />
        </div>
      </div>
    </div>
  );
};

/**
 * Android Phone Frame Component
 * Desktop: centered realistic Android handset with animated wallpaper
 * Mobile:  full-screen layout
 */
export const AndroidPhoneFrame: React.FC<AndroidPhoneFrameProps> = ({ children }) => {
  return (
    <>
      {/* ── Desktop: Phone frame centered on animated wallpaper ── */}
      <div className="hidden sm:flex items-center justify-center min-h-screen relative overflow-hidden"
        style={{ background: '#030712' }}
      >
        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute w-[600px] h-[600px] rounded-full opacity-20 animate-orb1"
            style={{
              background: 'radial-gradient(circle, rgba(14,165,233,0.6) 0%, transparent 70%)',
              top: '-150px',
              right: '-100px',
              filter: 'blur(80px)',
            }}
          />
          <div
            className="absolute w-[500px] h-[500px] rounded-full opacity-15 animate-orb2"
            style={{
              background: 'radial-gradient(circle, rgba(124,58,237,0.7) 0%, transparent 70%)',
              bottom: '-100px',
              left: '-80px',
              filter: 'blur(80px)',
            }}
          />
          <div
            className="absolute w-[400px] h-[400px] rounded-full opacity-10 animate-orb3"
            style={{
              background: 'radial-gradient(circle, rgba(6,182,212,0.6) 0%, transparent 70%)',
              top: '40%',
              left: '50%',
              filter: 'blur(100px)',
            }}
          />
          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        {/* Phone chassis */}
        <div
          className="relative"
          style={{
            width: '393px',
            maxWidth: '92vw',
          }}
        >
          {/* Outer bezel with subtle gradient */}
          <div
            className="relative rounded-[52px] p-[2px]"
            style={{
              background: 'linear-gradient(145deg, #2a2a2a, #111, #1a1a1a)',
              boxShadow: '0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            {/* Inner bezel */}
            <div
              className="rounded-[50px] overflow-hidden"
              style={{
                background: '#09090b',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04)',
              }}
            >
              {/* Screen content */}
              <div
                className="relative flex flex-col overflow-hidden bg-[#080d1a]"
                style={{ height: 'calc(393px * 915/412)', maxHeight: '85vh' }}
              >
                <StatusBar />

                {/* Screen inner shadow for depth */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-20 z-10"
                  style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.15), transparent)' }}
                />

                <div className="relative flex-1 min-h-0 overflow-hidden">
                  <div className="absolute inset-0 overflow-hidden">
                    {children}
                  </div>
                </div>

                {/* Home indicator */}
                <div className="relative z-20 flex items-center justify-center py-2 bg-[#080d1a]">
                  <div
                    className="h-[5px] w-[134px] rounded-full"
                    style={{ background: 'rgba(255,255,255,0.35)' }}
                  />
                </div>
              </div>
            </div>

            {/* Reflection overlay */}
            <div
              className="pointer-events-none absolute inset-0 rounded-[50px]"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 40%)',
              }}
            />
          </div>

          {/* Side buttons */}
          <div className="pointer-events-none absolute left-[-3px] top-28 h-24 w-[3px] rounded-l-full bg-[#2a2a2a]" />
          <div className="pointer-events-none absolute left-[-3px] top-56 h-14 w-[3px] rounded-l-full bg-[#2a2a2a]" />
          <div className="pointer-events-none absolute right-[-3px] top-40 h-20 w-[3px] rounded-r-full bg-[#2a2a2a]" />
        </div>

        {/* Brand label below phone */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/20">Pothole Guard</p>
        </div>
      </div>

      {/* ── Mobile: Full screen ── */}
      <div className="sm:hidden h-dvh w-full overflow-hidden bg-[#080d1a] flex flex-col">
        {children}
      </div>
    </>
  );
};

export default AndroidPhoneFrame;