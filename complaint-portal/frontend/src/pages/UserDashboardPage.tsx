import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/common/Header';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { GoogleMapsHeatmap } from '../components/complaint/GoogleMapsHeatmap';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../hooks/useToast';
import { complaintApi, dashboardApi } from '../services/api';
import { Complaint, DashboardStats } from '../types';

export const UserDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAppContext();
  const { addToast } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, complaintsRes] = await Promise.all([
        dashboardApi.getStats(),
        complaintApi.getAll(),
      ]);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }

      if (complaintsRes.success && complaintsRes.data) {
        setComplaints(complaintsRes.data);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      addToast('Unable to load pothole updates right now', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-slate-950 text-white">
        <LoadingSpinner text="Loading live pothole map..." />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-950 text-white">
      <Header title="Dashboard" />

      <main className="space-y-4 px-4 py-4 pb-28">
        <Card className="border border-white/10 bg-white/5 backdrop-blur-xl">
          <p className="text-sm text-slate-300">Welcome back, {user?.name || 'citizen'}.</p>
          <h1 className="mt-2 text-2xl font-black text-white">Live pothole updates near you</h1>
          <p className="mt-2 text-sm text-slate-400">
            Track active pothole reports and see the latest status updates on the map.
          </p>
        </Card>

        {stats && (
          <div className="grid grid-cols-2 gap-3">
            <Card className="border border-white/10 bg-white/5 text-center backdrop-blur-xl">
              <div className="text-2xl font-black text-blue-400">{stats.total}</div>
              <p className="text-sm text-slate-400">Reports</p>
            </Card>
            <Card className="border border-white/10 bg-white/5 text-center backdrop-blur-xl">
              <div className="text-2xl font-black text-emerald-400">{stats.completed}</div>
              <p className="text-sm text-slate-400">Resolved</p>
            </Card>
          </div>
        )}

        <Card className="border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Pothole map</h2>
              <p className="text-sm text-slate-400">Updated live from recent complaints</p>
            </div>
            <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-200">
              {complaints.length} active
            </span>
          </div>
          <div className="h-[320px] overflow-hidden rounded-[24px]">
            <GoogleMapsHeatmap complaints={complaints} />
          </div>
        </Card>

        <Card className="border border-white/10 bg-white/5 backdrop-blur-xl">
          <Button fullWidth variant="primary" onClick={() => navigate('/report')}>
            Report a new pothole
          </Button>
        </Card>
      </main>
    </div>
  );
};

export default UserDashboardPage;
