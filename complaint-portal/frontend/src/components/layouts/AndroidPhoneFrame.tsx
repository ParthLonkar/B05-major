import React, { ReactNode } from 'react';

interface AndroidPhoneFrameProps {
  children: ReactNode;
}

/**
 * Android Phone Frame Component
 * Desktop shows a centered Android handset; mobile renders full screen.
 */
export const AndroidPhoneFrame: React.FC<AndroidPhoneFrameProps> = ({ children }) => {
  return (
    <>
      <div className="hidden sm:flex items-center justify-center min-h-screen bg-[radial-gradient(circle_at_top,rgba(30,64,175,0.35),transparent_30%),linear-gradient(135deg,#020617_0%,#0f172a_45%,#000_100%)] p-6">
        <div className="relative w-[412px] max-w-[92vw] aspect-[412/915] rounded-[3rem] bg-[#09090b] shadow-[0_30px_80px_rgba(0,0,0,0.55)] border-[10px] border-black overflow-hidden">
          <div className="absolute inset-[2px] rounded-[2.55rem] bg-slate-950 overflow-hidden flex flex-col">
            <div className="relative z-20 flex items-center justify-between px-6 pt-3 pb-2 text-[11px] font-semibold text-white/90 safe-area-top">
              <span>9:41</span>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex h-2 w-2 rounded-full bg-white/90" />
                <span className="inline-flex h-2 w-2 rounded-full bg-white/70" />
                <span className="inline-flex h-2 w-4 rounded-full bg-white/90" />
              </div>
            </div>

            <div className="pointer-events-none absolute top-2 left-1/2 z-30 h-6 w-28 -translate-x-1/2 rounded-full bg-black shadow-inner" />

            <div className="relative flex-1 min-h-0 overflow-hidden rounded-[2.55rem] bg-slate-950">
              <div className="absolute inset-0 overflow-hidden">
                {children}
              </div>
            </div>

            <div className="relative z-20 flex items-center justify-center pb-2 pt-1 safe-area-bottom">
              <div className="h-1.5 w-28 rounded-full bg-white/70" />
            </div>
          </div>

          <div className="pointer-events-none absolute left-[-4px] top-28 h-28 w-1 rounded-l-full bg-white/10" />
          <div className="pointer-events-none absolute left-[-4px] top-44 h-16 w-1 rounded-l-full bg-white/10" />
          <div className="pointer-events-none absolute right-[-4px] top-36 h-20 w-1 rounded-r-full bg-white/10" />
        </div>
      </div>

      <div className="sm:hidden h-dvh w-full overflow-hidden bg-slate-950 flex flex-col">
        {children}
      </div>
    </>
  );
};

export default AndroidPhoneFrame;