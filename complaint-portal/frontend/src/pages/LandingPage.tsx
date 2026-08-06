/**
 * Landing Page
 * Public view showing heatmap and login options
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import GoogleMapsHeatmap from '../components/complaint/GoogleMapsHeatmap';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Complaint } from '../types';
import { complaintApi, dashboardApi } from '../services/api';

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

      if (complaintsRes.success && Array.isArray(complaintsRes.data)) {
        setComplaints(complaintsRes.data);
      }

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Hero Section */}
      <header className="relative border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
        <div className="px-4 sm:px-6 py-6 sm:py-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center space-y-4 sm:space-y-6">
              <div>
                <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] sm:tracking-[0.28em] text-blue-300">
                  Public Infrastructure Monitoring
                </p>
                <h1 className="mt-2 sm:mt-3 text-4xl sm:text-5xl lg:text-6xl font-black text-white">
                  Pothole Guard
                </h1>
                <p className="mt-3 sm:mt-4 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto">
                  Real-time tracking of road maintenance complaints. View accountability, report issues, and monitor progress in your area.
                </p>
              </div>

              {/* Stats Overview */}
              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 max-w-4xl mx-auto">
                  <Card className="border border-white/10 bg-white/5 text-center backdrop-blur-xl p-3 sm:p-4">
                    <div className="text-2xl sm:text-3xl font-black text-blue-400">{stats.total}</div>
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-1">Total</p>
                  </Card>
                  <Card className="border border-white/10 bg-white/5 text-center backdrop-blur-xl p-3 sm:p-4">
                    <div className="text-2xl sm:text-3xl font-black text-rose-400">{stats.pending}</div>
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-1">Pending</p>
                  </Card>
                  <Card className="border border-white/10 bg-white/5 text-center backdrop-blur-xl p-3 sm:p-4">
                    <div className="text-2xl sm:text-3xl font-black text-blue-400">{stats.progressed || 0}</div>
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-1">Progressed</p>
                  </Card>
                  <Card className="border border-white/10 bg-white/5 text-center backdrop-blur-xl p-3 sm:p-4">
                    <div className="text-2xl sm:text-3xl font-black text-yellow-400">{stats.underConstruction || 0}</div>
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-1">Building</p>
                  </Card>
                  <Card className="border border-white/10 bg-white/5 text-center backdrop-blur-xl p-3 sm:p-4">
                    <div className="text-2xl sm:text-3xl font-black text-green-400">{stats.done}</div>
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-1">Done</p>
                  </Card>
                </div>
              )}

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center max-w-lg mx-auto">
                <Button fullWidth variant="primary" size="lg" onClick={() => navigate('/login')}>
                  Report a Problem
                </Button>
                <Button fullWidth variant="outline" size="lg" onClick={() => navigate('/login')}>
                  Admin Login
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Heatmap Section */}
      <main className="px-4 sm:px-6 py-6 sm:py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Live Complaint Map</h2>
            <p className="text-sm sm:text-base text-slate-400">
              View all reported issues in real-time and track accountability
            </p>
          </div>

          <Card className="border border-white/10 bg-white/5 p-0 backdrop-blur-xl overflow-hidden">
            <div className="h-[400px] sm:h-[500px] lg:h-[600px]">
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <LoadingSpinner text="Loading map..." />
                </div>
              ) : (
                <GoogleMapsHeatmap complaints={complaints} />
              )}
            </div>
          </Card>

          {/* Legend */}
          <Card className="border border-white/10 bg-white/5 backdrop-blur-xl">
            <h3 className="text-lg font-bold text-white mb-4">Status Legend</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[#f87171] border-2 border-[#f87171]"></div>
                <span className="text-sm text-slate-300">Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[#60a5fa] border-2 border-[#60a5fa]"></div>
                <span className="text-sm text-slate-300">Progressed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[#fbbf24] border-2 border-[#fbbf24]"></div>
                <span className="text-sm text-slate-300">Construction</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#00ff00] border-4 border-[#00cc00] shadow-lg shadow-green-500/50"></div>
                <span className="text-sm font-semibold text-green-400">Done ✓</span>
              </div>
            </div>
          </Card>

          {/* Info Cards */}
          <div className="grid sm:grid-cols-3 gap-4">
            <Card className="border border-white/10 bg-white/5 backdrop-blur-xl text-center">
              <div className="text-4xl mb-3">📍</div>
              <h3 className="text-lg font-bold text-white mb-2">Report Issues</h3>
              <p className="text-sm text-slate-400">
                Citizens can report road problems with GPS location and photos
              </p>
            </Card>
            <Card className="border border-white/10 bg-white/5 backdrop-blur-xl text-center">
              <div className="text-4xl mb-3">🗺️</div>
              <h3 className="text-lg font-bold text-white mb-2">Track Progress</h3>
              <p className="text-sm text-slate-400">
                Monitor complaint status and see real-time updates on the map
              </p>
            </Card>
            <Card className="border border-white/10 bg-white/5 backdrop-blur-xl text-center">
              <div className="text-4xl mb-3">✅</div>
              <h3 className="text-lg font-bold text-white mb-2">Ensure Accountability</h3>
              <p className="text-sm text-slate-400">
                Public transparency ensures timely resolution of infrastructure issues
              </p>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-950/90 backdrop-blur-xl mt-12 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center text-sm text-slate-400">
          <p>© {new Date().getFullYear()} Pothole Guard. Making roads safer through community reporting.</p>
        </div>
      </footer>
    </div>
  );
};
