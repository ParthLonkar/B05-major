/**
 * Admin Home Page — gradient stat pills, quick action grid, live map, recent complaints
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ComplaintCard } from '../components/complaint/ComplaintCard';
import GoogleMapsHeatmap from '../components/complaint/GoogleMapsHeatmap';
import { dashboardApi, complaintApi } from '../services/api';
import { DashboardStats, Complaint } from '../types/index';
import { useComplaintSync } from '../hooks/useComplaintSync';
import { useAppContext } from '../context/AppContext';

/* ── Stat pill ── */
interface StatPillProps {
  label: string;
  value: number;
  icon: string;
  gradient: string;
  delay?: string;
}
const StatPill: React.FC<StatPillProps> = ({ label, value, icon, gradient, delay = '0s' }) => (
  <div
    className="glass-card rounded-2xl p-4 animate-fade-up"
    style={{ animationDelay: delay }}
  >
    <div className="flex items-start justify-between mb-3">
      <div
        className="flex h-9 w-9 items-center justify-center rounded-xl text-base"
        style={{ background: gradient, boxShadow: `0 4px 12px ${gradient.includes('233') ? 'rgba(14,165,233,0.3)' : 'rgba(244,63,94,0.3)'}` }}
      >
        {icon}
      </div>
    </div>
    <div className="text-2xl font-black text-white animate-number-count">{value}</div>
    <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
  </div>
);

/* ── Quick action tile ── */
interface ActionTileProps {
  title: string;
  subtitle: string;
  icon: string;
  onClick: () => void;
  primary?: boolean;
  delay?: string;
}
const ActionTile: React.FC<ActionTileProps> = ({ title, subtitle, icon, onClick, primary, delay = '0s' }) => (
  <button
    onClick={onClick}
    className="rounded-2xl p-4 text-left transition-all active:scale-[0.97] animate-fade-up glass-card-hover"
    style={{
      animationDelay: delay,
      background: primary
        ? 'linear-gradient(135deg, rgba(14,165,233,0.2), rgba(6,182,212,0.15))'
        : 'rgba(255,255,255,0.04)',
      border: primary
        ? '1px solid rgba(14,165,233,0.3)'
        : '1px solid rgba(255,255,255,0.07)',
      boxShadow: primary ? '0 4px 20px rgba(14,165,233,0.15)' : 'none',
    }}
  >
    <div className="text-xl mb-2">{icon}</div>
    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 truncate">{title}</div>
    <div className="mt-0.5 text-xs text-slate-500 truncate">{subtitle}</div>
  </button>
);

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const syncVersion = useComplaintSync();
  const { user, logout } = useAppContext();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [recentComplaints, setRecentComplaints] = useState<Complaint[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, complaintsRes] = await Promise.all([dashboardApi.getStats(), complaintApi.getAll()]);
      if (statsRes.success && statsRes.data) setStats(statsRes.data);
      if (complaintsRes.success && complaintsRes.data) {
        const sorted = [...complaintsRes.data].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setComplaints(sorted);
        setRecentComplaints(sorted.slice(0, 5));
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData, syncVersion]);

  const mapFilters = useMemo(() => ({ status: undefined, severity: undefined }), []);

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-[#080d1a]">
        <LoadingSpinner text="Loading dashboard..." />
      </div>
    );
  }

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-full bg-[#080d1a] text-white">
      {/* ── Header ── */}
      <div
        className="sticky top-0 z-20 px-4 py-4"
        style={{
          background: 'rgba(8,13,26,0.92)',
          backdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-400">{getGreeting()}, {user?.name?.split(' ')[0] || 'Admin'}</p>
            <h1 className="text-xl font-black text-white mt-0.5">Live Dashboard</h1>
          </div>
          <button
            onClick={logout}
            className="flex h-9 w-9 items-center justify-center rounded-full shrink-0 transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            title="Logout"
          >
            <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      <main className="px-4 py-5 pb-6 space-y-5">
        {/* Stat grid */}
        {stats && (
          <div className="grid grid-cols-2 gap-3">
            <StatPill label="Total Reports"  value={stats.total}                                              icon="📊" gradient="rgba(14,165,233,0.3)"  delay="0s" />
            <StatPill label="Open Cases"     value={stats.pending + stats.progressed + stats.underConstruction} icon="⏳" gradient="rgba(245,158,11,0.3)"  delay="0.05s" />
            <StatPill label="High Priority"  value={stats.severityCounts.critical + stats.severityCounts.high}  icon="🚨" gradient="rgba(244,63,94,0.3)"   delay="0.1s" />
            <StatPill label="Resolved"       value={stats.done}                                               icon="✅" gradient="rgba(16,185,129,0.3)"  delay="0.15s" />
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <ActionTile title="Manage"  subtitle={stats ? `${stats.pending} pending` : '—'} icon="⚙️" onClick={() => navigate('/admin')}   primary  delay="0.2s" />
          <ActionTile title="Heatmap" subtitle="Complaint clusters"                        icon="🗺️" onClick={() => navigate('/heatmap')}          delay="0.25s" />
          <ActionTile title="Track"   subtitle="Find any complaint"                        icon="🔍" onClick={() => navigate('/track')}             delay="0.3s" />
          <ActionTile title="Refresh" subtitle="Pull latest data"                          icon="🔄" onClick={() => void fetchData()}               delay="0.35s" />
        </div>

        {/* Live map */}
        <div className="animate-fade-up" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white">Live Map</h2>
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-bold"
              style={{ background: 'rgba(14,165,233,0.12)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.2)' }}
            >
              {complaints.length} markers
            </span>
          </div>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}
          >
            <div className="h-[220px]">
              <GoogleMapsHeatmap complaints={complaints} onMarkerClick={setSelectedComplaint} filters={mapFilters} />
            </div>
          </div>
        </div>

        {/* Selected complaint detail */}
        {selectedComplaint && (
          <div
            className="rounded-2xl p-4 animate-slide-up"
            style={{
              background: 'rgba(14,165,233,0.06)',
              border: '1px solid rgba(14,165,233,0.2)',
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Selected</p>
                <p className="font-bold text-white text-sm">{selectedComplaint.complaintId}</p>
              </div>
              <button onClick={() => setSelectedComplaint(null)} className="text-slate-500 hover:text-white p-1">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
              <div><p className="text-slate-500">Reporter</p><p className="font-semibold text-white truncate">{selectedComplaint.fullName}</p></div>
              <div><p className="text-slate-500">Status</p><p className="font-semibold text-white">{selectedComplaint.status}</p></div>
            </div>
            <p className="text-xs text-slate-400 mb-3 line-clamp-2">{selectedComplaint.description}</p>
            <Button fullWidth size="sm" onClick={() => navigate('/admin')}>Open in Admin Panel</Button>
          </div>
        )}

        {/* Recent complaints */}
        <div className="animate-fade-up" style={{ animationDelay: '0.45s' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white">Recent Complaints</h2>
            <button onClick={() => navigate('/admin')} className="text-xs text-blue-400 font-semibold hover:text-blue-300 transition-colors">
              View all →
            </button>
          </div>
          <div className="space-y-2.5">
            {recentComplaints.length > 0 ? (
              recentComplaints.map((c) => (
                <ComplaintCard key={c.id} complaint={c} onClick={() => setSelectedComplaint(c)} />
              ))
            ) : (
              <div className="rounded-2xl p-8 text-center" style={{ border: '1px dashed rgba(255,255,255,0.08)' }}>
                <p className="text-slate-500 text-sm">No complaints yet</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};