/**
 * Admin Landing Page
 * Beautiful dashboard with map and live complaint overview.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ComplaintCard } from '../components/complaint/ComplaintCard';
import GoogleMapsHeatmap from '../components/complaint/GoogleMapsHeatmap';
import { dashboardApi, complaintApi } from '../services/api';
import { DashboardStats, Complaint } from '../types/index';
import { useComplaintSync } from '../hooks/useComplaintSync';

const StatPill: React.FC<{ label: string; value: number; tone: string }> = ({ label, value, tone }) => (
  <div className={`rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl ${tone}`}>
    <div className="text-3xl font-black">{value}</div>
    <div className="mt-1 text-sm text-slate-300">{label}</div>
  </div>
);

const QuickAction: React.FC<{ title: string; subtitle: string; onClick: () => void; primary?: boolean }> = ({
  title,
  subtitle,
  onClick,
  primary,
}) => (
  <button
    onClick={onClick}
    className={`rounded-[28px] border p-4 text-left transition-all active:scale-[0.98] ${
      primary
        ? 'border-blue-400/30 bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/20'
        : 'border-white/10 bg-white/5 text-white hover:bg-white/8'
    }`}
  >
    <div className="text-sm font-semibold uppercase tracking-[0.2em] opacity-80">{title}</div>
    <div className="mt-2 text-sm opacity-90">{subtitle}</div>
  </button>
);

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const syncVersion = useComplaintSync();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [recentComplaints, setRecentComplaints] = useState<Complaint[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, complaintsRes] = await Promise.all([dashboardApi.getStats(), complaintApi.getAll()]);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }

      if (complaintsRes.success && complaintsRes.data) {
        const sorted = [...complaintsRes.data].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setComplaints(sorted);
        setRecentComplaints(sorted.slice(0, 5));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData, syncVersion]);

  const mapFilters = useMemo(
    () => ({
      status: undefined,
      severity: undefined,
    }),
    []
  );

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-slate-950 px-4 py-20 text-white">
        <LoadingSpinner text="Loading dashboard..." />
      </div>
    );
  }

  const pendingLabel = stats ? `${stats.pending} open` : '0 open';

  return (
    <div className="min-h-full bg-slate-950 text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/90 px-4 py-4 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-300">Complaint control</p>
            <h1 className="text-3xl font-black leading-tight text-white">Live dashboard</h1>
            <p className="mt-1 text-sm text-slate-300">Monitor complaints, open the map, and move issues through the workflow.</p>
          </div>
          <Button onClick={() => navigate('/admin')} variant="primary" size="sm" className="shrink-0 rounded-full px-4">
            Open Admin
          </Button>
        </div>
      </header>

      <main className="space-y-6 px-4 py-6 pb-32">
        {stats && (
          <div className="grid grid-cols-2 gap-4">
            <StatPill label="Total complaints" value={stats.total} tone="text-blue-300" />
            <StatPill label="Open complaints" value={stats.pending + stats.assigned + stats.inProgress} tone="text-amber-300" />
            <StatPill label="High priority" value={stats.severityCounts.critical + stats.severityCounts.high} tone="text-rose-300" />
            <StatPill label="Resolved" value={stats.completed} tone="text-emerald-300" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickAction title="Manage" subtitle={pendingLabel} onClick={() => navigate('/admin')} primary />
          <QuickAction title="Map" subtitle="View complaint markers" onClick={() => navigate('/heatmap')} />
          <QuickAction title="Track" subtitle="Search any complaint" onClick={() => navigate('/track')} />
          <QuickAction title="Refresh" subtitle="Pull latest data" onClick={() => void fetchData()} />
        </div>

        <Card title="Live complaint map" className="overflow-hidden border border-white/10 bg-white/5 p-0 backdrop-blur-xl">
          <div className="h-[340px] overflow-hidden">
            <GoogleMapsHeatmap complaints={complaints} onMarkerClick={setSelectedComplaint} filters={mapFilters} />
          </div>
        </Card>

        <Card title="Recent complaints" className="border border-white/10 bg-white/5 backdrop-blur-xl">
          <div className="space-y-3">
            {recentComplaints.length > 0 ? (
              recentComplaints.map((complaint) => (
                <ComplaintCard
                  key={complaint.id}
                  complaint={complaint}
                  onClick={() => setSelectedComplaint(complaint)}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-slate-300">
                No complaints available.
              </div>
            )}
          </div>
        </Card>

        {selectedComplaint && (
          <Card title={selectedComplaint.complaintId} className="border border-white/10 bg-white/5 backdrop-blur-xl">
            <div className="space-y-3 text-sm text-slate-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-400">Reporter</p>
                  <p className="font-semibold text-white">{selectedComplaint.fullName}</p>
                </div>
                <div>
                  <p className="text-slate-400">Status</p>
                  <p className="font-semibold text-white">{selectedComplaint.status}</p>
                </div>
              </div>
              <div>
                <p className="text-slate-400">Description</p>
                <p>{selectedComplaint.description}</p>
              </div>
              <div className="flex gap-2">
                <Button fullWidth onClick={() => navigate('/admin')}>
                  Open actions
                </Button>
                <Button fullWidth variant="outline" onClick={() => setSelectedComplaint(null)}>
                  Close
                </Button>
              </div>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
};