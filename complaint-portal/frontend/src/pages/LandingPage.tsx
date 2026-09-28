/**
 * Premium Landing Page — gradient hero, animated stats, glass info cards
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import GoogleMapsHeatmap from '../components/complaint/GoogleMapsHeatmap';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Complaint } from '../types';
import { complaintApi, dashboardApi } from '../services/api';

const StatCard: React.FC<{ value: number | string; label: string; color: string; delay?: string }> = ({
  value, label, color, delay = '0s'
}) => (
  <div
    className="glass-card rounded-2xl p-4 text-center animate-fade-up"
    style={{ animationDelay: delay }}
  >
    <div className="text-2xl font-black" style={{ color }}>{value}</div>
    <p className="text-[10px] text-slate-500 mt-1 font-semibold uppercase tracking-wider">{label}</p>
  </div>
);

const InfoCard: React.FC<{ emoji: string; title: string; desc: string; delay?: string }> = ({
  emoji, title, desc, delay = '0s'
}) => (
  <div
    className="glass-card glass-card-hover rounded-2xl p-5 text-center animate-fade-up"
    style={{ animationDelay: delay }}
  >
    <div
      className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
      style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)' }}
    >
      {emoji}
    </div>
    <h3 className="text-sm font-bold text-white mb-1.5">{title}</h3>
    <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
  </div>
);

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [complaintsRes, statsRes] = await Promise.all([
        complaintApi.getAll(),
        dashboardApi.getStats(),
      ]);
      if (complaintsRes.success && Array.isArray(complaintsRes.data)) setComplaints(complaintsRes.data);
      if (statsRes.success && statsRes.data) setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  return (
    <div
      className="min-h-screen text-white"
      style={{ background: 'linear-gradient(160deg, #080d1a 0%, #0a0f1e 60%, #06091a 100%)' }}
    >
      {/* ── Hero ── */}
      <div className="relative overflow-hidden">
        {/* Background orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute w-72 h-72 rounded-full opacity-20 animate-orb1"
            style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.6) 0%, transparent 70%)', top: '-80px', right: '-40px', filter: 'blur(70px)' }} />
          <div className="absolute w-60 h-60 rounded-full opacity-15 animate-orb2"
            style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.7) 0%, transparent 70%)', bottom: '-40px', left: '-30px', filter: 'blur(60px)' }} />
        </div>

        <div className="relative px-5 pt-8 pb-6">
          {/* Badge */}
          <div className="flex justify-center animate-fade-up">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em]"
              style={{ background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.25)', color: '#38bdf8' }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
              Public Infrastructure Monitoring
            </span>
          </div>

          {/* Headline */}
          <h1 className="animate-fade-up-delay1 mt-5 text-center text-4xl font-black leading-tight tracking-tight">
            Pothole{' '}
            <span style={{ background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Guard
            </span>
          </h1>
          <p className="animate-fade-up-delay2 mt-3 text-center text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">
            Real-time road complaint tracking. Report issues, monitor progress, ensure accountability.
          </p>

          {/* Stats grid */}
          {stats && (
            <div className="mt-6 grid grid-cols-5 gap-2">
              <StatCard value={stats.total}                                           label="Total"    color="#38bdf8" delay="0.1s" />
              <StatCard value={stats.pending}                                         label="Pending"  color="#fb7185" delay="0.15s" />
              <StatCard value={stats.progressed || 0}                                label="Active"   color="#60a5fa" delay="0.2s" />
              <StatCard value={stats.underConstruction || 0}                         label="Building" color="#fbbf24" delay="0.25s" />
              <StatCard value={stats.done}                                            label="Done"     color="#34d399" delay="0.3s" />
            </div>
          )}

          {/* CTA buttons */}
          <div className="mt-6 flex flex-col gap-3 animate-fade-up-delay3">
            <Button fullWidth variant="primary" size="lg" onClick={() => navigate('/login')}>
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 19.5h20L12 2z"/><path d="M12 10v4"/></svg>
              Report a Problem
            </Button>
            <Button fullWidth variant="secondary" size="md" onClick={() => navigate('/login')}>
              Admin Portal →
            </Button>
          </div>
        </div>
      </div>

      {/* ── Live Map ── */}
      <div className="px-4 pb-6 space-y-4">
        <div className="animate-fade-up" style={{ animationDelay: '0.35s' }}>
          <h2 className="text-lg font-bold text-white mb-0.5">Live Complaint Map</h2>
          <p className="text-xs text-slate-500">Real-time issues across your city</p>
        </div>

        <div
          className="rounded-2xl overflow-hidden animate-fade-up"
          style={{
            animationDelay: '0.4s',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
          }}
        >
          <div className="h-[300px]">
            {loading ? (
              <div className="flex h-full items-center justify-center bg-[#0a1020]">
                <LoadingSpinner text="Loading map..." />
              </div>
            ) : (
              <GoogleMapsHeatmap complaints={complaints} />
            )}
          </div>
          {/* Legend */}
          <div className="px-4 py-3" style={{ background: 'rgba(8,13,26,0.9)' }}>
            <div className="flex flex-wrap gap-3">
              {[
                { color: '#fb7185', label: 'Pending' },
                { color: '#60a5fa', label: 'In Progress' },
                { color: '#fbbf24', label: 'Construction' },
                { color: '#34d399', label: 'Resolved ✓' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
                  <span className="text-[10px] text-slate-400 font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-3 gap-3">
          <InfoCard emoji="📍" title="Report" desc="GPS + photo complaint submission" delay="0.45s" />
          <InfoCard emoji="🗺️" title="Track" desc="Real-time status updates on map" delay="0.5s" />
          <InfoCard emoji="✅" title="Resolve" desc="Public accountability & transparency" delay="0.55s" />
        </div>
      </div>

      {/* Footer */}
      <footer className="px-4 py-5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <p className="text-center text-[10px] text-slate-600">
          © {new Date().getFullYear()} Pothole Guard · Making roads safer through community reporting
        </p>
      </footer>
    </div>
  );
};
