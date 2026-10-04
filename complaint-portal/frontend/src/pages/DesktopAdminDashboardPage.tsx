import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { complaintApi, dashboardApi } from '../services/api';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/ui/Toast';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Complaint, DashboardStats } from '../types';
import { getImageUrl } from '../utils/imageUtils';

type StatusFilter = 'All reports' | 'Needs review' | 'In progress' | 'Resolved';
type Status = Complaint['status'];
const PAGE_SIZE = 10;

const Icon: React.FC<{ name: 'grid' | 'reports' | 'map' | 'search' | 'refresh' | 'logout' | 'chevron' | 'close' | 'external' | 'alert' | 'calendar' | 'pin' | 'image' }> = ({ name }) => {
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    reports: <><path d="M7 3h8l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M15 3v5h5M9 12h6M9 16h6"/></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15m6-12v15"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9A7 7 0 0 1 18 6l2 2M4 16l2 2a7 7 0 0 0 12.5-3"/></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    close: <><path d="m18 6-12 12M6 6l12 12"/></>,
    external: <><path d="M14 3h7v7M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></>,
    alert: <><path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
};

const statusStyles: Record<Status, string> = {
  Pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  Progressed: 'bg-sky-50 text-sky-700 ring-sky-200',
  'Under Construction': 'bg-violet-50 text-violet-700 ring-violet-200',
  Done: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};
const severityStyles: Record<Complaint['severity'], string> = {
  Low: 'bg-slate-100 text-slate-600',
  Medium: 'bg-amber-50 text-amber-700',
  High: 'bg-orange-50 text-orange-700',
  Critical: 'bg-rose-50 text-rose-700',
};
const statusDot: Record<Status, string> = {
  Pending: 'bg-amber-500', Progressed: 'bg-sky-500', 'Under Construction': 'bg-violet-500', Done: 'bg-emerald-500',
};
const formatDate = (value: string) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

const StatCard: React.FC<{ label: string; value: number; note: string; tone: string; icon: 'reports' | 'alert' | 'refresh' | 'grid' }> = ({ label, value, note, tone, icon }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
    <div className="flex items-start justify-between">
      <div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value.toLocaleString()}</p></div>
      <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}><Icon name={icon}/></span>
    </div>
    <p className="mt-4 text-xs text-slate-500">{note}</p>
  </section>
);

export const DesktopAdminDashboardPage: React.FC<{ initialView?: 'overview' | 'reports' }> = ({ initialView = 'overview' }) => {
  const navigate = useNavigate();
  const dashboardScrollerRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAppContext();
  const { toasts, addToast, removeToast } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>('All reports');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'severity'>('newest');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);

  const fetchData = useCallback(async (showRefresh = false) => {
    showRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const [statsResponse, complaintsResponse] = await Promise.all([dashboardApi.getStats(), complaintApi.getAll()]);
      if (!statsResponse.success || !complaintsResponse.success) throw new Error('The server could not load dashboard data.');
      setStats(statsResponse.data ?? null);
      setComplaints(complaintsResponse.data ?? []);
    } catch (error) {
      console.error('Failed to load admin dashboard:', error);
      addToast(error instanceof Error ? error.message : 'Could not load dashboard data.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addToast]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const visibleComplaints = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const severityRank: Record<Complaint['severity'], number> = { Low: 0, Medium: 1, High: 2, Critical: 3 };
    return complaints.filter((complaint) => {
      const matchesFilter = filter === 'All reports'
        || (filter === 'Needs review' && complaint.status === 'Pending')
        || (filter === 'In progress' && ['Progressed', 'Under Construction'].includes(complaint.status))
        || (filter === 'Resolved' && complaint.status === 'Done');
      const haystack = [complaint.complaintId, complaint.fullName, complaint.category, complaint.address, complaint.description].join(' ').toLowerCase();
      return matchesFilter && (!normalized || haystack.includes(normalized));
    }).sort((a, b) => {
      if (sort === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sort === 'severity') return severityRank[b.severity] - severityRank[a.severity];
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [complaints, filter, query, sort]);

  useEffect(() => { setPage(1); }, [filter, query, sort]);
  const pageCount = Math.max(1, Math.ceil(visibleComplaints.length / PAGE_SIZE));
  const pageRows = visibleComplaints.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const changeStatus = async (complaint: Complaint, status: Status) => {
    setSavingStatus(true);
    try {
      const response = await complaintApi.updateStatus(complaint.complaintId, status);
      if (!response.success || !response.data) throw new Error(response.error || 'Status update failed.');
      setComplaints((items) => items.map((item) => item.complaintId === complaint.complaintId ? response.data! : item));
      setSelected(response.data);
      addToast(`Report updated to ${status}.`, 'success');
      void fetchData(true);
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Status update failed.', 'error');
    } finally {
      setSavingStatus(false);
    }
  };

  const deleteComplaint = async (complaint: Complaint) => {
    if (!window.confirm(`Delete report ${complaint.complaintId}? This cannot be undone.`)) return;
    try {
      await complaintApi.delete(complaint.complaintId);
      setComplaints((items) => items.filter((item) => item.complaintId !== complaint.complaintId));
      setSelected(null);
      addToast('Report deleted.', 'success');
      void fetchData(true);
    } catch {
      addToast('Could not delete this report.', 'error');
    }
  };

  const signOut = () => { logout(); navigate('/login', { replace: true }); };
  const inProgress = (stats?.progressed ?? 0) + (stats?.underConstruction ?? 0);
  const scrollToReports = useCallback(() => {
    const scroller = dashboardScrollerRef.current;
    const target = document.getElementById('admin-reports');
    if (!scroller || !target) return;
    const top = scroller.scrollTop + target.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 84;
    scroller.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }, []);
  const goToReports = () => {
    if (initialView === 'reports') scrollToReports();
    else navigate('/reports');
  };

  useEffect(() => {
    if (initialView !== 'reports' || loading) return;
    const frame = window.requestAnimationFrame(scrollToReports);
    return () => window.cancelAnimationFrame(frame);
  }, [initialView, loading, scrollToReports]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb]"><LoadingSpinner text="Loading admin workspace…"/></div>;

  return (
    <div ref={dashboardScrollerRef} className="h-screen overflow-y-auto overflow-x-hidden bg-[#f5f7fb] text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[248px] flex-col border-r border-slate-800 bg-[#111a2c] text-white lg:flex">
        <div className="flex h-[78px] items-center gap-3 border-b border-white/8 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400 text-[#102033]"><Icon name="reports"/></div>
          <div><div className="text-sm font-bold tracking-wide">Pothole Guard</div><div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Admin workspace</div></div>
        </div>
        <div className="px-4 pt-7 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Workspace</div>
        <nav className="space-y-1 px-3 pt-3">
          <button onClick={() => initialView === 'reports' ? navigate('/') : dashboardScrollerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${initialView === 'overview' ? 'bg-cyan-400/12 text-cyan-300' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><Icon name="grid"/>Overview</button>
          <button onClick={goToReports} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${initialView === 'reports' ? 'bg-cyan-400/12 text-cyan-300' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><Icon name="reports"/>Reports <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-300">{stats?.pending ?? 0}</span></button>
          <button onClick={() => navigate('/heatmap')} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"><Icon name="map"/>Incident map</button>
        </nav>
        <div className="mt-auto border-t border-white/8 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-400/15 text-xs font-bold text-cyan-300">{(user?.name || 'A').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div>
            <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{user?.name || 'Administrator'}</p><p className="truncate text-[10px] text-slate-400">{user?.email}</p></div>
          </div>
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"><Icon name="logout"/>Sign out</button>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-[248px]">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
          <div className="mx-auto flex h-[72px] max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-7 xl:px-10">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 lg:hidden"><Icon name="reports"/></div>
              <div><p className="text-xs font-medium text-slate-400">Pothole Guard <span className="px-1 text-slate-300">/</span> Operations</p><h1 className="text-sm font-bold text-slate-800">Admin dashboard</h1></div>
            </div>
            <div className="flex items-center gap-3 sm:gap-5">
              <label className="hidden h-10 w-64 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-400 md:flex"><Icon name="search"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reports…" className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"/><kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px]">⌘ K</kbd></label>
              <div className="hidden text-right sm:block"><p className="text-xs font-semibold text-slate-700">{user?.name || 'Administrator'}</p><p className="text-[10px] text-slate-400">System administrator</p></div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#16243a] text-xs font-bold text-cyan-300">{(user?.name || 'A').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] space-y-7 px-4 py-7 sm:px-7 xl:px-10">
          <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">Field operations</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-[30px]">Good day, {user?.name?.split(' ')[0] || 'Admin'}</h2><p className="mt-1 text-sm text-slate-500">Review incoming road reports and coordinate the response.</p></div>
            <div className="flex items-center gap-2 text-xs text-slate-500"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm"><Icon name="calendar"/></span>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}<button onClick={() => void fetchData(true)} disabled={refreshing} className="ml-2 inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"><span className={refreshing ? 'animate-spin' : ''}><Icon name="refresh"/></span><span className="hidden sm:inline">Refresh</span></button></div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            <StatCard label="Total reports" value={stats?.total ?? complaints.length} note="All reports received" tone="bg-blue-50 text-blue-600" icon="reports"/>
            <StatCard label="Needs review" value={stats?.pending ?? 0} note="Awaiting an admin decision" tone="bg-amber-50 text-amber-600" icon="alert"/>
            <StatCard label="In progress" value={inProgress} note="Being handled by the road team" tone="bg-violet-50 text-violet-600" icon="refresh"/>
            <StatCard label="Resolved" value={stats?.done ?? 0} note="Marked as completed" tone="bg-emerald-50 text-emerald-600" icon="grid"/>
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div id="admin-reports" className="min-w-0 scroll-mt-24 rounded-2xl border border-slate-200 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
              <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:px-6">
                <div><h3 className="text-base font-bold text-slate-900">Road reports</h3><p className="mt-1 text-xs text-slate-500">Review and manage citizen submissions</p></div>
                <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-400 md:hidden"><Icon name="search"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reports…" className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none"/></label>
                <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 outline-none focus:border-cyan-500"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="severity">Highest severity</option></select>
              </div>
              <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-5 pt-3 sm:px-6">
                {(['All reports', 'Needs review', 'In progress', 'Resolved'] as StatusFilter[]).map((item) => <button key={item} onClick={() => setFilter(item)} className={`relative shrink-0 px-3 py-3 text-xs font-semibold transition ${filter === item ? 'text-cyan-700' : 'text-slate-400 hover:text-slate-700'}`}>{item}{filter === item && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-cyan-600"/>}</button>)}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left">
                  <thead><tr className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400"><th className="px-6 py-3">Report</th><th className="px-4 py-3">Reported by</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Severity</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Date</th><th className="px-6 py-3 text-right">View</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {pageRows.map((complaint) => <tr key={complaint.id} onClick={() => setSelected(complaint)} className="cursor-pointer transition hover:bg-slate-50/80">
                      <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-400">{complaint.imagePreview ? <img src={getImageUrl(complaint.imagePreview)} alt="" className="h-full w-full object-cover"/> : <Icon name="image"/>}</div><div><p className="text-xs font-bold text-slate-800">{complaint.complaintId}</p><p className="mt-1 max-w-[180px] truncate text-[11px] text-slate-400">{complaint.category}</p></div></div></td>
                      <td className="px-4 py-4"><p className="max-w-[130px] truncate text-xs font-semibold text-slate-700">{complaint.fullName}</p><p className="mt-1 text-[11px] text-slate-400">{complaint.mobileNumber}</p></td>
                      <td className="px-4 py-4"><div className="flex max-w-[170px] items-center gap-1.5 text-xs text-slate-500"><span className="text-slate-400"><Icon name="pin"/></span><span className="truncate">{complaint.address || `${complaint.latitude}, ${complaint.longitude}`}</span></div></td>
                      <td className="px-4 py-4"><span className={`rounded-lg px-2.5 py-1 text-[10px] font-bold ${severityStyles[complaint.severity]}`}>{complaint.severity}</span></td>
                      <td className="px-4 py-4"><span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset ${statusStyles[complaint.status]}`}><span className={`h-1.5 w-1.5 rounded-full ${statusDot[complaint.status]}`}/>{complaint.status}</span></td>
                      <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">{formatDate(complaint.createdAt)}</td>
                      <td className="px-6 py-4 text-right"><button onClick={(event) => { event.stopPropagation(); setSelected(complaint); }} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-cyan-700 hover:bg-cyan-50">Details <span className="ml-1">›</span></button></td>
                    </tr>)}
                    {pageRows.length === 0 && <tr><td colSpan={7} className="px-6 py-16 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Icon name="reports"/></div><p className="mt-3 text-sm font-semibold text-slate-700">No reports found</p><p className="mt-1 text-xs text-slate-400">Try another filter or search term.</p></td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:px-6"><p className="text-xs text-slate-500">Showing <span className="font-semibold text-slate-700">{visibleComplaints.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, visibleComplaints.length)}</span> of <span className="font-semibold text-slate-700">{visibleComplaints.length}</span> reports</p><div className="flex items-center gap-2"><button onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1} className="h-8 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Previous</button><span className="px-2 text-xs text-slate-500">{page} / {pageCount}</span><button onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={page >= pageCount} className="h-8 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Next</button></div></div>
            </div>

            <aside className="space-y-5">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.03)]"><div className="flex items-start justify-between"><div><h3 className="text-sm font-bold text-slate-800">Severity overview</h3><p className="mt-1 text-xs text-slate-400">Reports by assessed severity</p></div><span className="rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-500">All time</span></div><div className="mt-6 space-y-4">{([
                ['Critical', stats?.severityCounts.critical ?? 0, 'bg-rose-500'], ['High', stats?.severityCounts.high ?? 0, 'bg-orange-500'], ['Medium', stats?.severityCounts.medium ?? 0, 'bg-amber-400'], ['Low', stats?.severityCounts.low ?? 0, 'bg-sky-500'],
              ] as [string, number, string][]).map(([label, count, color]) => { const max = Math.max(stats?.total ?? 0, 1); return <div key={label}><div className="mb-2 flex justify-between text-xs"><span className="font-medium text-slate-600">{label}</span><span className="font-bold text-slate-800">{count}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, count / max * 100)}%` }}/></div></div>; })}</div></section>
              <section className="rounded-2xl bg-[#14243a] p-5 text-white shadow-[0_10px_28px_rgba(15,23,42,0.12)]"><div className="flex items-center gap-2 text-cyan-300"><Icon name="alert"/><span className="text-xs font-bold uppercase tracking-[0.12em]">Admin note</span></div><h3 className="mt-4 text-base font-bold">Review reports with care</h3><p className="mt-2 text-xs leading-5 text-slate-300">Severity and location details are citizen-submitted. Confirm the evidence before assigning a response.</p><button onClick={goToReports} className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-cyan-300 hover:text-cyan-200">Go to reports <Icon name="chevron"/></button></section>
            </aside>
          </section>
        </main>
      </div>

      {selected && <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/35 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
        <aside className="flex h-full w-full max-w-[520px] flex-col overflow-y-auto bg-white shadow-2xl animate-in slide-in-from-right duration-200">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-6 py-5 backdrop-blur"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-700">Report details</p><h2 className="mt-1 text-lg font-bold text-slate-900">{selected.complaintId}</h2></div><button onClick={() => setSelected(null)} aria-label="Close details" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Icon name="close"/></button></div>
          <div className="space-y-6 p-6">
            {selected.imagePreview ? <img src={getImageUrl(selected.imagePreview)} alt="Submitted road issue" className="max-h-64 w-full rounded-2xl bg-slate-100 object-cover"/> : <div className="flex h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-slate-400"><Icon name="image"/><p className="mt-2 text-xs">No photo attached</p></div>}
            <div className="flex flex-wrap gap-2"><span className={`rounded-lg px-2.5 py-1 text-[10px] font-bold ${severityStyles[selected.severity]}`}>{selected.severity} severity</span><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset ${statusStyles[selected.status]}`}><span className={`h-1.5 w-1.5 rounded-full ${statusDot[selected.status]}`}/>{selected.status}</span><span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">{selected.category}</span></div>
            <div><h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Description</h3><p className="mt-2 text-sm leading-6 text-slate-700">{selected.description || 'No description provided.'}</p></div>
            <div className="grid grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-4"><div><p className="text-[10px] font-semibold uppercase text-slate-400">Reporter</p><p className="mt-1 text-sm font-semibold text-slate-800">{selected.fullName}</p></div><div><p className="text-[10px] font-semibold uppercase text-slate-400">Phone</p><p className="mt-1 text-sm font-semibold text-slate-800">{selected.mobileNumber}</p></div><div><p className="text-[10px] font-semibold uppercase text-slate-400">Submitted</p><p className="mt-1 text-xs text-slate-700">{new Date(selected.createdAt).toLocaleString()}</p></div><div><p className="text-[10px] font-semibold uppercase text-slate-400">Address</p><p className="mt-1 text-xs text-slate-700">{selected.address || 'Not available'}</p></div></div>
            <a href={`https://www.google.com/maps?q=${selected.latitude},${selected.longitude}`} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-2xl border border-slate-200 p-4 transition hover:border-cyan-300 hover:bg-cyan-50/50"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700"><Icon name="pin"/></span><div><p className="text-xs font-bold text-slate-800">Open report location</p><p className="mt-1 text-[11px] text-slate-500">{selected.latitude}, {selected.longitude}</p></div></div><Icon name="external"/></a>
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4"><p className="text-xs font-bold text-slate-700">Model analysis</p><p className="mt-1 text-xs leading-5 text-slate-500">No segmentation or depth analysis is attached to this report yet.</p></div>
            <div><label htmlFor="report-status" className="mb-2 block text-xs font-bold text-slate-700">Update status</label><select id="report-status" value={selected.status} disabled={savingStatus} onChange={(event) => void changeStatus(selected, event.target.value as Status)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-cyan-500 disabled:opacity-50"><option>Pending</option><option>Progressed</option><option>Under Construction</option><option>Done</option></select></div>
            <button onClick={() => void deleteComplaint(selected)} className="w-full rounded-xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50">Delete report</button>
          </div>
        </aside>
      </div>}
      <ToastContainer toasts={toasts} onRemove={removeToast}/>
    </div>
  );
};
