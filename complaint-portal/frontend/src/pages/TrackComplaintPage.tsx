/**
 * Premium Track Complaint Page — hero search, animated timeline, rich detail card
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import GoogleMapsHeatmap from '../components/complaint/GoogleMapsHeatmap';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ComplaintCard } from '../components/complaint/ComplaintCard';
import { StatusTimeline } from '../components/complaint/StatusTimeline';
import { complaintApi } from '../services/api';
import { Complaint } from '../types/index';
import { useToast } from '../hooks/useToast';
import { useComplaintSync } from '../hooks/useComplaintSync';
import { getImageUrl } from '../utils/imageUtils';

const SearchIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

export const TrackComplaintPage: React.FC = () => {
  const { complaintId } = useParams();
  const { addToast } = useToast();
  const syncVersion = useComplaintSync();

  const [searchQuery, setSearchQuery] = useState(complaintId || '');
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [searchResults, setSearchResults] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = useCallback(async (query: string = searchQuery) => {
    const trimmed = query.trim();
    if (!trimmed) { addToast('Please enter a complaint ID or search term', 'warning'); return; }

    setLoading(true);
    setComplaint(null);
    setSearchResults([]);

    try {
      const byIdResponse = await complaintApi.getById(trimmed);
      if (byIdResponse.success && byIdResponse.data) {
        setComplaint(byIdResponse.data);
        setShowResults(false);
        return;
      }
      const searchResponse = await complaintApi.search(trimmed);
      if (searchResponse.success && searchResponse.data && searchResponse.data.length > 0) {
        setSearchResults(searchResponse.data);
        setShowResults(true);
      } else {
        addToast('No complaints found', 'info');
        setShowResults(false);
      }
    } catch {
      addToast('Error searching complaints', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, searchQuery]);

  useEffect(() => {
    if (complaintId) { setSearchQuery(complaintId); void handleSearch(complaintId); }
  }, [complaintId, handleSearch]);

  useEffect(() => {
    if ((complaint || showResults) && searchQuery.trim()) void handleSearch(searchQuery);
  }, [syncVersion]);

  const getSeverityVariant = (s: string): any =>
    ({ Low: 'low', Medium: 'medium', High: 'high', Critical: 'critical' }[s] || 'info');

  const getStatusVariant = (s: string): any =>
    ({ Pending: 'warning', Progressed: 'info', 'Under Construction': 'warning', Done: 'success' }[s] || 'info');

  return (
    <div className="relative min-h-full bg-[#080d1a] text-white">
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-4 py-4"
        style={{ background: 'rgba(8,13,26,0.92)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">Pothole Guard</p>
        <h1 className="text-xl font-black text-white mt-0.5">Track Complaint</h1>
      </div>

      <main className="px-4 py-5 pb-6 space-y-5">
        {/* Search bar */}
        <div className="animate-fade-up">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                fullWidth
                placeholder="Enter complaint ID or search term"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleSearch()}
                icon={<SearchIcon />}
              />
            </div>
            <Button onClick={() => void handleSearch()} loading={loading} variant="primary" className="shrink-0 px-5">
              Search
            </Button>
          </div>
          <p className="mt-2 text-[10px] text-slate-600 text-center">
            Enter a complaint ID (e.g. CMP-2024-001) or reporter's name
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <LoadingSpinner text="Searching…" />
          </div>
        )}

        {/* Single complaint detail */}
        {!loading && complaint && (
          <div className="space-y-4 animate-slide-up">
            {/* Map */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}
            >
              <div className="h-52">
                <GoogleMapsHeatmap complaints={[complaint]} />
              </div>
            </div>

            {/* Info card */}
            <div
              className="rounded-2xl p-4"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}
            >
              {/* ID header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Complaint</p>
                  <p className="text-base font-black text-white font-mono">{complaint.complaintId}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Badge label={complaint.status}   variant={getStatusVariant(complaint.status)} />
                  <Badge label={complaint.severity} variant={getSeverityVariant(complaint.severity)} />
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-[10px] text-slate-500 mb-0.5">Category</p>
                    <p className="font-semibold text-white text-xs truncate">{complaint.category}</p>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-[10px] text-slate-500 mb-0.5">Reported</p>
                    <p className="font-semibold text-white text-xs">{new Date(complaint.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-[10px] text-slate-500 mb-0.5">Reporter</p>
                  <p className="font-semibold text-white text-xs">{complaint.fullName}</p>
                  <p className="text-slate-500 text-[10px]">{complaint.mobileNumber}</p>
                </div>

                <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-[10px] text-slate-500 mb-0.5">Location</p>
                  <p className="font-semibold text-white text-xs truncate">{complaint.address}</p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {complaint.latitude.toFixed(5)}, {complaint.longitude.toFixed(5)}
                  </p>
                </div>

                <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-[10px] text-slate-500 mb-0.5">Description</p>
                  <p className="text-white text-xs leading-relaxed">{complaint.description}</p>
                </div>

                {complaint.imagePreview && (
                  <div className="rounded-xl overflow-hidden">
                    <img src={getImageUrl(complaint.imagePreview)} alt="Complaint" className="w-full h-40 object-cover" />
                  </div>
                )}

                {complaint.notes && (
                  <div className="rounded-xl p-3" style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.15)' }}>
                    <p className="text-[10px] text-blue-400 mb-0.5 font-bold">Admin Notes</p>
                    <p className="text-white text-xs">{complaint.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div
              className="rounded-2xl p-4"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <StatusTimeline
                currentStatus={complaint.status}
                createdAt={complaint.createdAt}
                estimatedCompletion={complaint.estimatedCompletion}
              />
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button fullWidth variant="secondary" onClick={() => setComplaint(null)}>
                ← Back to Search
              </Button>
              <Button fullWidth variant="primary" onClick={() => void handleSearch(complaint.complaintId)}>
                🔄 Refresh Status
              </Button>
            </div>
          </div>
        )}

        {/* Multiple results */}
        {!loading && showResults && searchResults.length > 0 && (
          <div className="space-y-3 animate-slide-up">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-sm">Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}</h3>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ background: 'rgba(14,165,233,0.12)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.2)' }}
              >
                tap to view
              </span>
            </div>
            {searchResults.map((result) => (
              <ComplaintCard key={result.id} complaint={result} onClick={() => setComplaint(result)} />
            ))}
          </div>
        )}

        {/* Empty state — no search */}
        {!loading && !complaint && !showResults && !searchQuery && (
          <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
            <div
              className="mb-4 flex h-20 w-20 items-center justify-center rounded-full"
              style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)' }}
            >
              <span className="text-3xl">🔍</span>
            </div>
            <h3 className="font-bold text-white text-base">Track Your Complaint</h3>
            <p className="mt-2 text-xs text-slate-500 max-w-[220px] leading-relaxed">
              Enter your complaint ID or search by name to check the current status
            </p>
          </div>
        )}

        {/* Empty state — no results */}
        {!loading && !complaint && !showResults && searchQuery && (
          <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
            <div
              className="mb-4 flex h-20 w-20 items-center justify-center rounded-full"
              style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)' }}
            >
              <span className="text-3xl">❌</span>
            </div>
            <h3 className="font-bold text-white text-base">No Results Found</h3>
            <p className="mt-2 text-xs text-slate-500">No complaints match "{searchQuery}"</p>
          </div>
        )}
      </main>
    </div>
  );
};