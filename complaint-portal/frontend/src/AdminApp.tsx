import React, { FormEvent, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useAppContext } from './context/AppContext';
import { authApi } from './services/auth';
import { complaintApi } from './services/api';
import { Complaint } from './types';
import { DesktopAdminDashboardPage } from './pages/DesktopAdminDashboardPage';
import { AdminReportsPage } from './pages/AdminReportsPage';
import GoogleMapsHeatmap from './components/complaint/GoogleMapsHeatmap';

const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const response = await authApi.login(email.trim().toLowerCase(), password);
      if (!response.success || !response.data) throw new Error(response.error || 'Sign in failed. Check your credentials.');
      if (response.data.user.role !== 'admin') throw new Error('This sign-in is for administrator accounts only.');
      setUser(response.data.user, response.data.token);
      navigate('/', { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-[#f5f7fb] lg:grid-cols-[minmax(0,1.2fr)_minmax(420px,0.8fr)]">
      <section className="relative hidden overflow-hidden bg-[#111a2c] px-12 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-20 xl:py-16">
        <div className="absolute -right-28 -top-28 h-[520px] w-[520px] rounded-full bg-cyan-400/10 blur-3xl"/>
        <div className="absolute -bottom-36 -left-24 h-[480px] w-[480px] rounded-full bg-blue-500/10 blur-3xl"/>
        <div className="relative flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400 text-[#102033]"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 3h8l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M15 3v5h5M9 12h6M9 16h6"/></svg></div><div><p className="text-sm font-bold">Pothole Guard</p><p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Operations console</p></div></div>
        <div className="relative max-w-2xl py-16"><span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-200"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300"/>Road issue management</span><h1 className="mt-7 text-5xl font-bold leading-[1.12] tracking-tight xl:text-6xl">Better roads start with a clear view.</h1><p className="mt-6 max-w-lg text-base leading-7 text-slate-300">Review citizen reports, prioritize road repairs, and keep every response moving from one operations workspace.</p>
          <div className="mt-12 grid max-w-xl grid-cols-3 gap-3"><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="mb-5 h-2 w-2 rounded-full bg-amber-400"/><p className="text-lg font-bold">Review</p><p className="mt-1 text-xs text-slate-400">Incoming reports</p></div><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="mb-5 h-2 w-2 rounded-full bg-violet-400"/><p className="text-lg font-bold">Coordinate</p><p className="mt-1 text-xs text-slate-400">Repair activity</p></div><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="mb-5 h-2 w-2 rounded-full bg-emerald-400"/><p className="text-lg font-bold">Resolve</p><p className="mt-1 text-xs text-slate-400">Close the loop</p></div></div>
        </div>
        <p className="relative text-xs text-slate-500">Authorized staff access only</p>
      </section>
      <section className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-[420px]"><div className="mb-10 lg:hidden"><p className="text-lg font-bold text-slate-900">Pothole Guard <span className="ml-2 text-xs font-semibold uppercase tracking-widest text-cyan-700">Admin</span></p></div><div className="mb-8"><p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-700">Administrator access</p><h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">Welcome back</h2><p className="mt-2 text-sm text-slate-500">Sign in to open the operations dashboard.</p></div>
          <form onSubmit={(event) => void submit(event)} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-8"><label className="block"><span className="mb-2 block text-xs font-semibold text-slate-700">Email address</span><input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10" placeholder="admin@organization.gov"/></label><label className="block"><span className="mb-2 block text-xs font-semibold text-slate-700">Password</span><input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10" placeholder="Enter your password"/></label>{error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs leading-5 text-rose-700">{error}</p>}<button disabled={submitting} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-700 text-sm font-bold text-white shadow-lg shadow-cyan-900/15 transition hover:bg-cyan-800 disabled:cursor-wait disabled:opacity-60">{submitting ? 'Signing in…' : 'Sign in to admin'}</button><p className="text-center text-[11px] leading-5 text-slate-400">This portal is restricted to authorized administrator accounts.</p></form>
        </div>
      </section>
    </main>
  );
};

const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin } = useAppContext();
  return isAdmin ? <>{children}</> : <Navigate to="/login" replace/>;
};

const AdminMapPage: React.FC = () => {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    complaintApi.getAll().then((response) => setComplaints(response.data ?? [])).catch((error) => console.error('Could not load report locations:', error)).finally(() => setLoading(false));
  }, []);
  return (
    <main className="min-h-screen bg-[#f5f7fb] p-4 sm:p-7">
      <header className="mx-auto mb-5 flex max-w-[1500px] items-center justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-widest text-cyan-700">Operations</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Incident map</h1><p className="mt-1 text-sm text-slate-500">Explore submitted road reports by location.</p></div>
        <button onClick={() => navigate('/')} className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">Back to dashboard</button>
      </header>
      <div className="mx-auto max-w-[1500px] space-y-5">
        <section className="flex flex-wrap items-center gap-x-7 gap-y-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Status legend</p>
          {[
            ['Pending', 'bg-rose-500'], ['Progressed', 'bg-sky-500'], ['Under Construction', 'bg-amber-500'], ['Done', 'bg-emerald-500'],
          ].map(([label, color]) => <div key={label} className="flex items-center gap-2.5 text-sm text-slate-600"><span className={`h-2.5 w-2.5 rounded-full ${color}`}/>{label}</div>)}
        </section>
        <section className="aspect-[16/9] max-h-[620px] min-h-[320px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 p-2 shadow-sm">
          {loading ? <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading report locations…</div> : <GoogleMapsHeatmap complaints={complaints}/>}
        </section>
      </div>
    </main>
  );
};

export const AdminApp: React.FC = () => (
  <Routes>
    <Route path="/login" element={<AdminLoginPage/>}/>
    <Route path="/" element={<AdminGuard><DesktopAdminDashboardPage/></AdminGuard>}/>
    <Route path="/reports" element={<AdminGuard><AdminReportsPage/></AdminGuard>}/>
    <Route path="/heatmap" element={<AdminGuard><AdminMapPage/></AdminGuard>}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes>
);
