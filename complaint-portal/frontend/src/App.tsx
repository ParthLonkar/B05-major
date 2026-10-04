import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import { useToast } from './hooks/useToast';
import { ToastContainer } from './components/ui/Toast';
import { AndroidPhoneFrame } from './components/layouts/AndroidPhoneFrame';
import { MaterialBottomNavigation } from './components/common/MaterialBottomNavigation';

import { SplashScreen } from './pages/SplashScreen';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { ReportComplaintPage } from './pages/ReportComplaintPage';
import { TrackComplaintPage } from './pages/TrackComplaintPage';
import { ImprovedHeatmapPage } from './pages/ImprovedHeatmapPage';
import { UserDashboardPage } from './pages/UserDashboardPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAppContext();
  if (!isAuthenticated) return <Navigate to="/landing" replace />;
  return <>{children}</>;
};

const AdminWebsiteRedirect: React.FC = () => {
  React.useEffect(() => {
    window.location.replace('/admin.html#/');
  }, []);
  return <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb] text-sm font-medium text-slate-500">Opening the admin website…</div>;
};

const AppContent: React.FC = () => {
  const { isAuthenticated, isAdmin } = useAppContext();
  const location = useLocation();
  const { toasts, removeToast } = useToast();
  const landingPath = isAdmin ? '/home' : '/report';

  // Keep admin operations in their own HTML entry instead of the citizen app shell.
  if (location.pathname === '/admin') {
    return <AdminWebsiteRedirect />;
  }

  return (
    <AndroidPhoneFrame>
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#080d1a] text-slate-100">
        {/* Scrollable page area — leaves room for bottom nav when authenticated */}
        <div className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden page-enter ${isAuthenticated ? 'pb-[72px]' : ''}`}>
          <Routes>
            <Route path="/" element={<Navigate to="/landing" replace />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/splash" element={<SplashScreen />} />
            <Route path="/login" element={<LoginPage />} />

            <Route path="/home" element={
              <ProtectedRoute>
                {isAdmin ? <HomePage /> : <Navigate to="/report" replace />}
              </ProtectedRoute>
            } />
            <Route path="/report" element={
              <ProtectedRoute>
                {isAdmin ? <Navigate to="/home" replace /> : <ReportComplaintPage />}
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                {isAdmin ? <Navigate to="/home" replace /> : <UserDashboardPage />}
              </ProtectedRoute>
            } />
            <Route path="/track" element={
              <ProtectedRoute>
                <TrackComplaintPage />
              </ProtectedRoute>
            } />
            <Route path="/complaint/:complaintId" element={
              <ProtectedRoute>
                <TrackComplaintPage />
              </ProtectedRoute>
            } />
            <Route path="/heatmap" element={
              <ProtectedRoute>
                {isAdmin ? <ImprovedHeatmapPage /> : <Navigate to="/report" replace />}
              </ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to={isAuthenticated ? landingPath : '/landing'} replace />} />
          </Routes>
        </div>

        {/* Premium bottom navigation (only when logged in) */}
        <MaterialBottomNavigation />

        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </AndroidPhoneFrame>
  );
};

export const App: React.FC = () => (
  <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <AppProvider>
      <AppContent />
    </AppProvider>
  </Router>
);

export default App;
