import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import GoogleMapsHeatmap from '../components/complaint/GoogleMapsHeatmap';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { ComplaintCard } from '../components/complaint/ComplaintCard';
import { StatusTimeline } from '../components/complaint/StatusTimeline';
import { complaintApi } from '../services/api';
import { Complaint } from '../types/index';
import { useToast } from '../hooks/useToast';
import { useComplaintSync } from '../hooks/useComplaintSync';
import { getImageUrl } from '../utils/imageUtils';

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

    if (!trimmed) {
      addToast('Please enter a complaint ID or search term', 'warning');
      return;
    }

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
    } catch (error) {
      console.error('Error searching complaints:', error);
      addToast('Error searching complaints', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, searchQuery]);

  useEffect(() => {
    if (complaintId) {
      setSearchQuery(complaintId);
      void handleSearch(complaintId);
    }
  }, [complaintId, handleSearch]);

  useEffect(() => {
    if ((complaint || showResults) && searchQuery.trim()) {
      void handleSearch(searchQuery);
    }
  }, [syncVersion]);

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      void handleSearch();
    }
  };

  const getSeverityVariant = (severity: string) => {
    const map: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      Low: 'low',
      Medium: 'medium',
      High: 'high',
      Critical: 'critical',
    };
    return map[severity] || 'info';
  };

  const getStatusVariant = (status: string) => {
    const map: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
      Pending: 'warning',
      Progressed: 'info',
      'Under Construction': 'warning',
      Done: 'success',
    };
    return map[status] || 'info';
  };

  return (
    <div className="relative min-h-full bg-slate-950 text-white">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/90 px-3 sm:px-4 py-4 backdrop-blur-xl safe-area-top">
        <h1 className="text-xl sm:text-2xl font-bold">Track Complaint</h1>
      </header>

      <main className="px-3 sm:px-4 py-5 sm:py-6 pb-24 sm:pb-32 safe-area-bottom">
        <Card className="mb-5 sm:mb-6 border border-white/10 bg-white/5 backdrop-blur-xl" title="Search Complaint">
          <div className="flex gap-2">
            <Input
              fullWidth
              placeholder="Enter Complaint ID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyPress}
            />
            <Button onClick={() => void handleSearch()} loading={loading} variant="primary" className="shrink-0">
              Search
            </Button>
          </div>
        </Card>

        {loading && (
          <div className="flex justify-center py-12">
            <LoadingSpinner text="Searching..." />
          </div>
        )}

        {!loading && complaint && (
          <div className="space-y-5 sm:space-y-6">
            <Card title="Location preview" className="border border-white/10 bg-white/5 backdrop-blur-xl p-0 overflow-hidden">
              <div className="h-60 sm:h-72">
                <GoogleMapsHeatmap complaints={[complaint]} />
              </div>
            </Card>
            <Card title={complaint.complaintId} className="border border-white/10 bg-white/5 backdrop-blur-xl">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs sm:text-sm text-slate-400">Category</p>
                    <p className="font-semibold text-white truncate">{complaint.category}</p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-slate-400">Date</p>
                    <p className="font-semibold text-white truncate">{new Date(complaint.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs sm:text-sm text-slate-400">Severity</p>
                    <Badge label={complaint.severity} variant={getSeverityVariant(complaint.severity)} />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-slate-400">Status</p>
                    <Badge label={complaint.status} variant={getStatusVariant(complaint.status)} />
                  </div>
                </div>

                <div>
                  <p className="text-xs sm:text-sm text-slate-400">Reporter</p>
                  <p className="font-semibold text-white truncate">{complaint.fullName}</p>
                  <p className="text-sm text-slate-400">{complaint.mobileNumber}</p>
                </div>

                <div>
                  <p className="text-xs sm:text-sm text-slate-400">Location</p>
                  <p className="font-semibold text-white truncate">{complaint.address}</p>
                  <p className="text-xs text-slate-400">
                    {complaint.latitude.toFixed(4)}, {complaint.longitude.toFixed(4)}
                  </p>
                </div>

                <div>
                  <p className="text-xs sm:text-sm text-slate-400">Description</p>
                  <p className="text-white text-sm sm:text-base">{complaint.description}</p>
                </div>

                {complaint.imagePreview && (
                  <div>
                    <p className="mb-2 text-xs sm:text-sm text-slate-400">Image</p>
                    <img src={getImageUrl(complaint.imagePreview)} alt="Complaint" className="h-36 sm:h-44 w-full rounded-2xl object-cover" />
                  </div>
                )}

                {complaint.notes && (
                  <div>
                    <p className="text-xs sm:text-sm text-slate-400">Notes</p>
                    <p className="text-white text-sm sm:text-base">{complaint.notes}</p>
                  </div>
                )}
              </div>
            </Card>

            <Card className="border border-white/10 bg-white/5 backdrop-blur-xl">
              <StatusTimeline
                currentStatus={complaint.status}
                createdAt={complaint.createdAt}
                estimatedCompletion={complaint.estimatedCompletion}
              />
            </Card>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button fullWidth onClick={() => setComplaint(null)} variant="outline">
                Back to Search
              </Button>
              <Button fullWidth variant="primary" onClick={() => void handleSearch(complaint.complaintId)}>
                Refresh status
              </Button>
            </div>
          </div>
        )}

        {!loading && showResults && searchResults.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-bold text-white">Found {searchResults.length} result(s)</h3>
            {searchResults.map((result) => (
              <ComplaintCard key={result.id} complaint={result} onClick={() => setComplaint(result)} />
            ))}
          </div>
        )}

        {!loading && !complaint && !showResults && !searchQuery && (
          <EmptyState icon="Search" title="Search for Complaints" description="Enter a complaint ID to track its status" />
        )}

        {!loading && !complaint && !showResults && searchQuery && (
          <EmptyState icon="No" title="No Results Found" description="No complaints match your search query" />
        )}
      </main>
    </div>
  );
};