import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import { useToast } from './hooks/useToast';
import { ToastContainer } from './components/ui/Toast';
import { AndroidPhoneFrame } from './components/layouts/AndroidPhoneFrame';

import { SplashScreen } from './pages/SplashScreen';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { ReportComplaintPage } from './pages/ReportComplaintPage';
import { TrackComplaintPage } from './pages/TrackComplaintPage';
import { ImprovedHeatmapPage } from './pages/ImprovedHeatmapPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { UserDashboardPage } from './pages/UserDashboardPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAppContext();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { isAuthenticated, isAdmin } = useAppContext();
  const { toasts, removeToast } = useToast();
  const landingPath = isAdmin ? '/home' : '/report';

  return (
    <AndroidPhoneFrame>
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-slate-950 text-slate-100">
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden page-enter">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/splash" element={<SplashScreen />} />
            <Route path="/login" element={isAuthenticated ? <Navigate to={landingPath} replace /> : <LoginPage />} />

            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  {isAdmin ? <HomePage /> : <Navigate to="/report" replace />}
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  {isAdmin ? <AdminDashboardPage /> : <Navigate to="/report" replace />}
                </ProtectedRoute>
              }
            />
            <Route
              path="/report"
              element={
                <ProtectedRoute>
                  {isAdmin ? <Navigate to="/home" replace /> : <ReportComplaintPage />}
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  {isAdmin ? <Navigate to="/home" replace /> : <UserDashboardPage />}
                </ProtectedRoute>
              }
            />
            <Route
              path="/track"
              element={
                <ProtectedRoute>
                  <TrackComplaintPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/complaint/:complaintId"
              element={
                <ProtectedRoute>
                  <TrackComplaintPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/heatmap"
              element={
                <ProtectedRoute>
                  {isAdmin ? <ImprovedHeatmapPage /> : <Navigate to="/report" replace />}
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to={isAuthenticated ? landingPath : '/login'} replace />} />
          </Routes>
        </div>

        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </AndroidPhoneFrame>
  );
};

export const App: React.FC = () => {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </Router>
  );
};

export default App;
