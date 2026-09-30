import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AdminRoute } from './components/auth/AdminRoute';
import { TelecallerRoute } from './components/auth/TelecallerRoute';
import { AdminLayout } from './components/layout/AdminLayout';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { Toaster } from 'sonner';

// Lazy-loaded pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));

// Admin Pages
const DashboardOverview = lazy(() => import('./pages/admin/DashboardOverview').then(m => ({ default: m.DashboardOverview })));
const UploadExcel = lazy(() => import('./pages/admin/UploadExcel').then(m => ({ default: m.UploadExcel })));
const LeadsList = lazy(() => import('./pages/admin/LeadsList').then(m => ({ default: m.LeadsList })));
const LeadViewPage = lazy(() => import('./pages/admin/LeadViewPage').then(m => ({ default: m.LeadViewPage })));
const CustomDashboards = lazy(() => import('./pages/admin/CustomDashboards').then(m => ({ default: m.CustomDashboards })));
const RoleManagement = lazy(() => import('./pages/admin/RoleManagement').then(m => ({ default: m.RoleManagement })));
const Reports = lazy(() => import('./pages/admin/Reports').then(m => ({ default: m.Reports })));
const RevertedLeads = lazy(() => import('./pages/admin/RevertedLeads').then(m => ({ default: m.RevertedLeads })));
const LeadStatusCount = lazy(() => import('./pages/admin/LeadStatusCount').then(m => ({ default: m.LeadStatusCount })));

// Telecaller Pages
const TelecallerRoster = lazy(() => import('./pages/telecaller/TelecallerRoster').then(m => ({ default: m.TelecallerRoster })));
const TelecallerLeadPage = lazy(() => import('./pages/telecaller/TelecallerLeadPage').then(m => ({ default: m.TelecallerLeadPage })));

// Root redirector based on authenticated user role
const RootRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner message="Starting workstation..." />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/telecaller/roster" replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Toaster position="top-right" theme="dark" richColors />
      <BrowserRouter>
        <Suspense fallback={<LoadingSpinner message="Loading application..." />}>
          <Routes>
            {/* Public Login Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Root redirection */}
            <Route path="/" element={<RootRedirect />} />

            {/* Protected Admin Routes */}
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardOverview />} />
                <Route path="upload" element={<UploadExcel />} />
                <Route path="leads" element={<LeadsList />} />
                <Route path="leads/:leadId" element={<LeadViewPage />} />
                <Route path="custom-dashboards" element={<CustomDashboards />} />
                <Route path="custom-dashboards/:dashboardId" element={<CustomDashboards />} />
                <Route path="roles" element={<RoleManagement />} />
                <Route path="reports" element={<Reports />} />
                <Route path="reports/telecaller/:telecallerId" element={<Reports />} />
                <Route path="reverted" element={<RevertedLeads />} />
                <Route path="status-count" element={<LeadStatusCount />} />
              </Route>
            </Route>

            {/* Protected Telecaller Routes */}
            <Route element={<TelecallerRoute />}>
              <Route path="/telecaller/roster" element={<TelecallerRoster />} />
              <Route path="/telecaller/lead/:leadId" element={<TelecallerLeadPage />} />
              <Route path="/telecaller" element={<Navigate to="/telecaller/roster" replace />} />
            </Route>

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
