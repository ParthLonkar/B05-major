import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { complaintApi } from '../services/api';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/ui/Toast';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Complaint } from '../types';
import { getImageUrl } from '../utils/imageUtils';
import { useComplaintSync } from '../hooks/useComplaintSync';

type StatusFilter = 'All reports' | Complaint['status'];
type Status = Complaint['status'];

const statusStyle: Record<Status, string> = {
  Pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  Progressed: 'bg-sky-50 text-sky-700 ring-sky-200',
  'Under Construction': 'bg-violet-50 text-violet-700 ring-violet-200',
  Done: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};
const severityStyle: Record<Complaint['severity'], string> = {
  Low: 'bg-slate-100 text-slate-600',
  Medium: 'bg-amber-50 text-amber-700',
  High: 'bg-orange-50 text-orange-700',
  Critical: 'bg-rose-50 text-rose-700',
};

export const AdminReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, addToast, removeToast } = useToast();
  const syncVersion = useComplaintSync();
  const [reports, setReports] = useState<Complaint[]>([]);
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('All reports');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'severity'>('newest');

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const response = await complaintApi.getAll();
      if (!response.success) throw new Error(response.error || 'Could not load reports.');
      const data = response.data ?? [];
      setReports(data);
      setSelected((current) => current ? data.find((item) => item.complaintId === current.complaintId) ?? null : null);
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Could not load reports.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { void loadReports(); }, [loadReports, syncVersion]);

  const visibleReports = useMemo(() => {
    const term = query.trim().toLowerCase();
    const rank: Record<Complaint['severity'], number> = { Low: 0, Medium: 1, High: 2, Critical: 3 };
    return reports.filter((report) => {
      const matchesStatus = filter === 'All reports' || report.status === filter;
      const searchable = [report.complaintId, report.fullName, report.category, report.address, report.description].join(' ').toLowerCase();
      return matchesStatus && (!term || searchable.includes(term));
    }).sort((a, b) => {
      if (sort === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sort === 'severity') return rank[b.severity] - rank[a.severity];
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [reports, filter, query, sort]);

  const updateStatus = async (report: Complaint, status: Status) => {
    setSavingStatus(true);
    try {
      const response = await complaintApi.updateStatus(report.complaintId, status);
      if (!response.success || !response.data) throw new Error(response.error || 'Could not update report status.');
      setReports((items) => items.map((item) => item.complaintId === report.complaintId ? response.data! : item));
      setSelected(response.data);
      addToast(`Report status changed to ${status}.`, 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Could not update report status.', 'error');
    } finally {
      setSavingStatus(false);
    }
  };

  if (loading && reports.length === 0) return <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb]"><LoadingSpinner text="Loading reports…"/></div>;

  return (
    <main className="h-screen overflow-y-auto overflow-x-hidden bg-[#f5f7fb] px-4 py-6 text-slate-900 sm:px-7 sm:py-8 xl:px-10">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">Operations</p><h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Road reports</h1><p className="mt-1 text-sm text-slate-500">Open a report to review its photo, location, and submitted details.</p></div>
          <button onClick={() => navigate('/')} className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">Back to dashboard</button>
        </header>

        <section className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_190px]">
          <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-400 shadow-sm"><svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ID, reporter, category, or location" className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"/></label>
          <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:border-cyan-500"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="severity">Highest severity</option></select>
        </section>

        <section className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {(['All reports', 'Pending', 'Progressed', 'Under Construction', 'Done'] as StatusFilter[]).map((item) => <button key={item} onClick={() => setFilter(item)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${filter === item ? 'bg-[#14243a] text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>{item}<span className={`ml-2 ${filter === item ? 'text-cyan-200' : 'text-slate-400'}`}>{item === 'All reports' ? reports.length : reports.filter((report) => report.status === item).length}</span></button>)}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-bold text-slate-800">Submitted reports</h2><p className="mt-1 text-xs text-slate-500">{visibleReports.length} matching report{visibleReports.length === 1 ? '' : 's'}</p></div><button onClick={() => void loadReports()} disabled={loading} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">{loading ? 'Refreshing…' : 'Refresh'}</button></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-left">
              <thead><tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400"><th className="px-5 py-3">Report</th><th className="px-4 py-3">Reporter</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Severity</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Submitted</th><th className="px-5 py-3 text-right">Details</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {visibleReports.map((report) => <tr key={report.id} onClick={() => setSelected(report)} className="cursor-pointer transition hover:bg-slate-50"><td className="px-5 py-3.5"><div className="flex items-center gap-3"><div className="h-11 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">{report.imagePreview ? <img src={getImageUrl(report.imagePreview)} alt="" className="h-full w-full object-cover"/> : <div className="flex h-full items-center justify-center text-[9px] text-slate-400">No photo</div>}</div><div><p className="text-xs font-bold text-slate-800">{report.complaintId}</p><p className="mt-1 text-[11px] text-slate-500">{report.category}</p></div></div></td><td className="px-4 py-3.5"><p className="text-xs font-semibold text-slate-700">{report.fullName}</p><p className="mt-1 text-[11px] text-slate-400">{report.mobileNumber}</p></td><td className="max-w-[190px] px-4 py-3.5"><p className="truncate text-xs text-slate-600">{report.address || 'Address unavailable'}</p><p className="mt-1 text-[10px] text-slate-400">{report.latitude}, {report.longitude}</p></td><td className="px-4 py-3.5"><span className={`rounded-lg px-2.5 py-1 text-[10px] font-bold ${severityStyle[report.severity]}`}>{report.severity}</span></td><td className="px-4 py-3.5"><span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset ${statusStyle[report.status]}`}>{report.status}</span></td><td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-500">{new Date(report.createdAt).toLocaleDateString()}</td><td className="px-5 py-3.5 text-right"><button onClick={(event) => { event.stopPropagation(); setSelected(report); }} className="rounded-lg px-3 py-2 text-xs font-bold text-cyan-700 hover:bg-cyan-50">Open details</button></td></tr>)}
                {visibleReports.length === 0 && <tr><td colSpan={7} className="px-5 py-16 text-center"><div className="text-sm font-semibold text-slate-700">No reports found</div><p className="mt-1 text-xs text-slate-400">New submissions will appear here.</p></td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {selected && <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/35 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
        <aside className="flex h-full w-full max-w-[560px] flex-col overflow-y-auto bg-white shadow-2xl">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-6 py-5 backdrop-blur"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-700">Full report</p><h2 className="mt-1 text-lg font-bold text-slate-900">{selected.complaintId}</h2></div><button onClick={() => setSelected(null)} aria-label="Close report details" className="rounded-xl p-2 text-xl text-slate-400 hover:bg-slate-100">×</button></header>
          <div className="space-y-5 p-6">
            {selected.imagePreview ? <a href={getImageUrl(selected.imagePreview)} target="_blank" rel="noreferrer"><img src={getImageUrl(selected.imagePreview)} alt="Citizen submitted road issue" className="max-h-[340px] w-full rounded-2xl bg-slate-100 object-contain"/></a> : <div className="flex h-44 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">No image attached</div>}
            <div className="flex flex-wrap gap-2"><span className={`rounded-lg px-2.5 py-1 text-[10px] font-bold ${severityStyle[selected.severity]}`}>{selected.severity} severity</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset ${statusStyle[selected.status]}`}>{selected.status}</span><span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">{selected.category}</span></div>
            <section><h3 className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Description</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{selected.description || 'No description provided.'}</p></section>
            <section className="grid grid-cols-2 gap-x-4 gap-y-5 rounded-2xl bg-slate-50 p-4"><Field label="Reporter" value={selected.fullName}/><Field label="Mobile" value={selected.mobileNumber}/><Field label="Email" value={selected.email || 'Not provided'}/><Field label="Category" value={selected.category}/><Field label="Submitted" value={new Date(selected.createdAt).toLocaleString()}/><Field label="Last updated" value={new Date(selected.updatedAt).toLocaleString()}/><Field label="Assigned team" value={selected.assignedTo || 'Not assigned'}/><Field label="Estimated completion" value={selected.estimatedCompletion ? new Date(selected.estimatedCompletion).toLocaleDateString() : 'Not set'}/></section>
            <a href={`https://www.google.com/maps?q=${selected.latitude},${selected.longitude}`} target="_blank" rel="noreferrer" className="block rounded-2xl border border-slate-200 p-4 hover:border-cyan-300"><p className="text-xs font-bold text-slate-800">Report location</p><p className="mt-1 text-xs text-slate-600">{selected.address || 'Address unavailable'}</p><p className="mt-1 text-[11px] text-slate-400">{selected.latitude}, {selected.longitude}</p></a>
            {selected.notes && <section><h3 className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Admin notes</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{selected.notes}</p></section>}
            <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4"><p className="text-xs font-bold text-slate-700">Model analysis</p><p className="mt-1 text-xs leading-5 text-slate-500">Segmentation and depth results are not currently saved with submitted reports.</p></section>
            <label className="block"><span className="mb-2 block text-xs font-bold text-slate-700">Update status</span><select value={selected.status} disabled={savingStatus} onChange={(event) => void updateStatus(selected, event.target.value as Status)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-cyan-500 disabled:opacity-50"><option>Pending</option><option>Progressed</option><option>Under Construction</option><option>Done</option></select></label>
          </div>
        </aside>
      </div>}
      <ToastContainer toasts={toasts} onRemove={removeToast}/>
    </main>
  );
};

const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => <div className="min-w-0"><p className="text-[10px] font-semibold uppercase text-slate-400">{label}</p><p className="mt-1 break-words text-xs font-medium text-slate-700">{value}</p></div>;
