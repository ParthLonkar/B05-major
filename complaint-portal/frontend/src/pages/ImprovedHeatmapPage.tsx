import React, { useState, useEffect, useCallback } from 'react';
import GoogleMapsHeatmap from '../components/complaint/GoogleMapsHeatmap';
import { Complaint } from '../types';
import { complaintApi } from '../services/api';
import { useComplaintSync } from '../hooks/useComplaintSync';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

/**
 * Improved Heatmap Page with Google Maps
 * Shows all complaints on an interactive heatmap
 */
export const ImprovedHeatmapPage: React.FC = () => {
  const syncVersion = useComplaintSync();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: [] as string[],
    severity: [] as string[],
  });
  const [loading, setLoading] = useState(false);

  const fetchComplaints = useCallback(async () => {
    try {
      setLoading(true);
      const response = await complaintApi.getAll();
      if (response.success && Array.isArray(response.data)) {
        setComplaints(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch complaints:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchComplaints();
  }, [fetchComplaints, syncVersion]);

  const toggleStatusFilter = useCallback((status: string) => {
    setFilters((prev) => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter((s) => s !== status)
        : [...prev.status, status],
    }));
  }, []);

  const toggleSeverityFilter = useCallback((severity: string) => {
    setFilters((prev) => ({
      ...prev,
      severity: prev.severity.includes(severity)
        ? prev.severity.filter((s) => s !== severity)
        : [...prev.severity, severity],
    }));
  }, []);

  const showAllComplaints = useCallback(() => {
    setFilters({ status: [], severity: [] });
  }, []);

  const filteredComplaints = complaints.filter((c) => {
    if (filters.status.length > 0 && !filters.status.includes(c.status)) {
      return false;
    }
    if (filters.severity.length > 0 && !filters.severity.includes(c.severity)) {
      return false;
    }
    return true;
  });

  return (
    <div className="relative flex min-h-full flex-col bg-slate-950 text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/90 p-3 sm:p-4 backdrop-blur-xl safe-area-top">
        <div className="mb-3 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] sm:tracking-[0.24em] text-blue-300 truncate">Live heatmap</p>
            <h1 className="text-xl sm:text-2xl font-bold text-white truncate">Complaint Map</h1>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="rounded-2xl bg-white/10 p-2 sm:p-3 text-blue-300 transition-colors hover:bg-white/15 active:scale-95 touch-target shrink-0"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v2h2a1 1 0 0 1 0 2h-2v2a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-2H1a1 1 0 0 1 0-2h2V6z" />
            </svg>
          </button>
        </div>

        {showFilters && (
          <div className="space-y-4 border-t border-white/10 pt-3">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-200">Status</h3>
              <button
                onClick={showAllComplaints}
                className="mb-2 w-full rounded-xl bg-white/8 px-3 py-2.5 text-sm text-slate-200 transition-all hover:bg-white/12 active:scale-95 touch-target"
              >
                Show All
              </button>
              <div className="grid grid-cols-2 gap-2">
                {['Pending', 'Progressed', 'Under Construction', 'Done'].map((status) => (
                  <button
                    key={status}
                    onClick={() => toggleStatusFilter(status)}
                    className={`rounded-xl px-3 py-2.5 text-sm transition-all active:scale-95 touch-target ${
                      filters.status.includes(status)
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-white/8 text-slate-200 hover:bg-white/12'
                    }`}
                  >
                    {status === 'Under Construction' ? 'Construction' : status}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-200">Severity</h3>
              <div className="grid grid-cols-2 gap-2">
                {['Critical', 'High', 'Medium', 'Low'].map((severity) => (
                  <button
                    key={severity}
                    onClick={() => toggleSeverityFilter(severity)}
                    className={`rounded-xl px-3 py-2.5 text-sm transition-all active:scale-95 touch-target ${
                      filters.severity.includes(severity)
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-white/8 text-slate-200 hover:bg-white/12'
                    }`}
                  >
                    {severity}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs sm:text-sm text-slate-400">
              Showing {filteredComplaints.length} of {complaints.length} complaints
            </div>
          </div>
        )}
      </header>

      <div className="relative flex-1 min-h-[340px] overflow-hidden">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <LoadingSpinner text="Loading map..." />
          </div>
        ) : (
          <GoogleMapsHeatmap
            complaints={complaints}
            onMarkerClick={setSelectedComplaint}
            filters={{
              status: filters.status.length > 0 ? filters.status : undefined,
              severity: filters.severity.length > 0 ? filters.severity : undefined,
            }}
          />
        )}
      </div>

      {selectedComplaint && (
        <div className="absolute inset-x-0 bottom-16 z-30 max-h-[60vh] overflow-y-auto rounded-t-[24px] sm:rounded-t-[28px] border-t border-white/10 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-xl safe-area-bottom">
          <div className="mb-3 flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-bold text-white truncate">{selectedComplaint.complaintId}</h3>
              <p className="mt-1 text-xs text-slate-400">{new Date(selectedComplaint.createdAt).toLocaleDateString()}</p>
            </div>
            <button
              onClick={() => setSelectedComplaint(null)}
              className="rounded-full p-2 text-slate-400 transition-all hover:bg-white/10 hover:text-white active:scale-95 touch-target shrink-0"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${selectedComplaint.status === 'Done' ? 'bg-emerald-500/15 text-emerald-300' : selectedComplaint.status === 'Under Construction' ? 'bg-yellow-500/15 text-yellow-300' : selectedComplaint.status === 'Progressed' ? 'bg-blue-500/15 text-blue-300' : 'bg-rose-500/15 text-rose-300'}`}>
                {selectedComplaint.status}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${selectedComplaint.severity === 'Critical' ? 'bg-rose-500/15 text-rose-300' : selectedComplaint.severity === 'High' ? 'bg-orange-500/15 text-orange-300' : selectedComplaint.severity === 'Medium' ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
                {selectedComplaint.severity}
              </span>
            </div>

            <div>
              <p className="text-xs text-slate-400">Category</p>
              <p className="text-sm font-medium text-white">{selectedComplaint.category}</p>
            </div>

            <div>
              <p className="text-xs text-slate-400">Location</p>
              <p className="text-sm font-medium text-white truncate">{selectedComplaint.address}</p>
              <p className="mt-1 text-xs text-slate-400">
                {selectedComplaint.latitude.toFixed(4)}, {selectedComplaint.longitude.toFixed(4)}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400">Description</p>
              <p className="text-sm text-slate-300">{selectedComplaint.description}</p>
            </div>

            {selectedComplaint.assignedTo && (
              <div>
                <p className="text-xs text-slate-400">Assigned To</p>
                <p className="text-sm font-medium text-white">{selectedComplaint.assignedTo}</p>
              </div>
            )}

            {selectedComplaint.notes && (
              <div>
                <p className="text-xs text-slate-400">Notes</p>
                <p className="text-sm text-slate-300">{selectedComplaint.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImprovedHeatmapPage;