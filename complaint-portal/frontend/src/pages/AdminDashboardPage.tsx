import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/common/Header';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ToastContainer } from '../components/ui/Toast';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../hooks/useToast';
import { complaintApi, dashboardApi } from '../services/api';
import { Complaint, DashboardStats } from '../types';
import { useComplaintSync } from '../hooks/useComplaintSync';
import { Input } from '../components/ui/Input';

const PAGE_SIZE = 6;

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAppContext();
  const { toasts, addToast, removeToast } = useToast();
  const syncVersion = useComplaintSync();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'assigned' | 'progress' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'severity' | 'status'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);

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
        const sorted = [...complaintsRes.data].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setComplaints(sorted);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      addToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void fetchData();
  }, [fetchData, syncVersion]);

  const getStatusVariant = (status: string) => {
    const map: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
      Pending: 'danger',
      Assigned: 'info',
      'In Progress': 'warning',
      Completed: 'success',
    };
    return map[status] || 'info';
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

  const handleStatusChange = async (complaint: Complaint, newStatus: 'Pending' | 'Assigned' | 'In Progress' | 'Completed') => {
    try {
      const response = await complaintApi.updateStatus(complaint.complaintId, newStatus);
      if (response.success && response.data) {
        await fetchData();
        setSelectedComplaint(response.data);
        addToast(`Status updated to ${newStatus}`, 'success');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      addToast('Failed to update status', 'error');
    }
  };

  const handleDeleteComplaint = async (complaintId: string) => {
    try {
      await complaintApi.delete(complaintId);
      setComplaints((prev) => prev.filter((c) => c.complaintId !== complaintId));
      setSelectedComplaint(null);
      addToast('Complaint deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting complaint:', error);
      addToast('Failed to delete complaint', 'error');
    }
  };

  const filteredComplaints = useMemo(() => {
    let list = complaints;

    if (filter === 'pending') list = list.filter((c) => c.status === 'Pending');
    if (filter === 'assigned') list = list.filter((c) => c.status === 'Assigned');
    if (filter === 'progress') list = list.filter((c) => c.status === 'In Progress');
    if (filter === 'completed') list = list.filter((c) => c.status === 'Completed');

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter((c) =>
        c.complaintId.toLowerCase().includes(q) ||
        c.fullName.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
      );
    }

    const severityOrder = ['Low', 'Medium', 'High', 'Critical'];
    const sorted = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'severity':
          return severityOrder.indexOf(b.severity) - severityOrder.indexOf(a.severity);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return sorted;
  }, [complaints, filter, searchTerm, sortBy]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchTerm, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredComplaints.length / PAGE_SIZE));
  const paginatedComplaints = filteredComplaints.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-slate-950 text-white">
        <LoadingSpinner text="Loading admin dashboard..." />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-full items-center justify-center bg-slate-950 px-4 text-white">
        <Card className="max-w-sm border border-rose-500/20 bg-white/5 text-center backdrop-blur-xl">
          <h1 className="mb-3 text-2xl font-bold text-white">Access denied</h1>
          <p className="mb-6 text-slate-300">Only admins can access this page.</p>
          <Button onClick={() => navigate('/home')}>Go Home</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative min-h-full bg-slate-950 pb-32 text-white">
      <Header title="Admin Dashboard" />

      <main className="space-y-6 px-4 py-6">
        {stats && (
          <div>
            <h2 className="mb-4 text-lg font-bold text-white">Overview</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Card className="border border-white/10 bg-white/5 text-center backdrop-blur-xl">
                <div className="text-3xl font-black text-blue-400">{stats.total}</div>
                <p className="text-sm text-slate-400">Total</p>
              </Card>
              <Card className="border border-white/10 bg-white/5 text-center backdrop-blur-xl">
                <div className="text-3xl font-black text-rose-400">{stats.pending}</div>
                <p className="text-sm text-slate-400">Pending</p>
              </Card>
              <Card className="border border-white/10 bg-white/5 text-center backdrop-blur-xl">
                <div className="text-3xl font-black text-amber-400">{stats.inProgress}</div>
                <p className="text-sm text-slate-400">In Progress</p>
              </Card>
              <Card className="border border-white/10 bg-white/5 text-center backdrop-blur-xl">
                <div className="text-3xl font-black text-emerald-400">{stats.completed}</div>
                <p className="text-sm text-slate-400">Completed</p>
              </Card>
            </div>
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card title="By Severity" className="border border-white/10 bg-white/5 backdrop-blur-xl">
              <div className="space-y-2">
                <div className="flex justify-between"><span>Critical</span><span className="font-bold">{stats.severityCounts.critical}</span></div>
                <div className="flex justify-between"><span>High</span><span className="font-bold">{stats.severityCounts.high}</span></div>
                <div className="flex justify-between"><span>Medium</span><span className="font-bold">{stats.severityCounts.medium}</span></div>
                <div className="flex justify-between"><span>Low</span><span className="font-bold">{stats.severityCounts.low}</span></div>
              </div>
            </Card>

            <Card title="By Status" className="border border-white/10 bg-white/5 backdrop-blur-xl">
              <div className="space-y-2">
                <div className="flex justify-between"><span>Pending</span><span className="font-bold">{stats.statusCounts.pending}</span></div>
                <div className="flex justify-between"><span>Assigned</span><span className="font-bold">{stats.statusCounts.assigned}</span></div>
                <div className="flex justify-between"><span>In Progress</span><span className="font-bold">{stats.statusCounts.inProgress}</span></div>
                <div className="flex justify-between"><span>Completed</span><span className="font-bold">{stats.statusCounts.completed}</span></div>
              </div>
            </Card>
          </div>
        )}

        <Card className="border border-white/10 bg-white/5 backdrop-blur-xl">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <Input
              fullWidth
              label="Search"
              placeholder="Search by ID, name, category, location, or description"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">Sort</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-10 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-white"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="severity">Severity</option>
                <option value="status">Status</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">Filter</label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'pending', label: 'Pending' },
                  { id: 'assigned', label: 'Assigned' },
                  { id: 'progress', label: 'In Progress' },
                  { id: 'completed', label: 'Completed' },
                ].map((btn) => (
                  <Button key={btn.id} variant={filter === btn.id ? 'primary' : 'outline'} size="sm" onClick={() => setFilter(btn.id as any)}>
                    {btn.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Complaints</h2>
            <span className="text-sm text-slate-400">{filteredComplaints.length} results</span>
          </div>

          {paginatedComplaints.length > 0 ? (
            <div className="space-y-3">
              {paginatedComplaints.map((complaint) => (
                <Card
                  key={complaint.id}
                  className="cursor-pointer border border-white/10 bg-white/5 backdrop-blur-xl"
                  onClick={() => setSelectedComplaint(complaint)}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-white">{complaint.complaintId}</h3>
                        <p className="text-sm text-slate-400">{complaint.category}</p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Badge label={complaint.severity} variant={getSeverityVariant(complaint.severity)} size="sm" />
                        <Badge label={complaint.status} variant={getStatusVariant(complaint.status)} size="sm" />
                      </div>
                    </div>
                    <p className="line-clamp-1 text-sm text-slate-300">{complaint.description}</p>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>{complaint.fullName}</span>
                      <span>{new Date(complaint.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border border-white/10 bg-white/5 backdrop-blur-xl">
              <div className="py-8 text-center text-slate-400">No complaints found</div>
            </Card>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>
              Previous
            </Button>
            <span className="text-sm text-slate-300">
              Page {currentPage} of {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>
              Next
            </Button>
          </div>
        )}
      </main>

      <Modal isOpen={statusModalOpen && selectedComplaint !== null} onClose={() => setStatusModalOpen(false)} title={`Update Status - ${selectedComplaint?.complaintId}`}>
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-3 text-sm text-slate-300">
            Choose the next update for this complaint.
          </div>
          {['Pending', 'Assigned', 'In Progress', 'Completed'].map((status) => (
            <Button
              key={status}
              fullWidth
              variant={selectedComplaint?.status === status ? 'primary' : 'outline'}
              onClick={() => {
                if (selectedComplaint) {
                  void handleStatusChange(selectedComplaint, status as any);
                }
                setStatusModalOpen(false);
              }}
            >
              {status === 'In Progress' ? 'Ongoing work' : status === 'Completed' ? 'Finished' : status}
            </Button>
          ))}
        </div>
      </Modal>

      {selectedComplaint && (
        <Modal
          isOpen={selectedComplaint !== null}
          onClose={() => setSelectedComplaint(null)}
          title={selectedComplaint.complaintId}
          footer={
            <div className="flex gap-2">
              <Button fullWidth onClick={() => setStatusModalOpen(true)} variant="primary">
                Change Status
              </Button>
              <Button fullWidth variant="danger" onClick={() => void handleDeleteComplaint(selectedComplaint.complaintId)}>
                Delete
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-slate-400">Reporter</p>
                <p className="font-semibold text-white">{selectedComplaint.fullName}</p>
              </div>
              <div>
                <p className="text-slate-400">Mobile</p>
                <p className="font-mono text-white">{selectedComplaint.mobileNumber}</p>
              </div>
            </div>

            <div>
              <p className="text-slate-400">Category</p>
              <p className="font-semibold text-white">{selectedComplaint.category}</p>
            </div>

            <div>
              <p className="mb-1 text-slate-400">Severity & Status</p>
              <div className="flex gap-2">
                <Badge label={selectedComplaint.severity} variant={getSeverityVariant(selectedComplaint.severity)} />
                <Badge label={selectedComplaint.status} variant={getStatusVariant(selectedComplaint.status)} />
              </div>
            </div>

            <div>
              <p className="text-slate-400">Description</p>
              <p className="text-white">{selectedComplaint.description}</p>
            </div>

            {selectedComplaint.imagePreview && (
              <img src={selectedComplaint.imagePreview} alt="Complaint" className="h-36 w-full rounded-2xl object-cover" />
            )}

            <div className="text-xs text-slate-400">
              Created: {new Date(selectedComplaint.createdAt).toLocaleString()}
            </div>
          </div>
        </Modal>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};