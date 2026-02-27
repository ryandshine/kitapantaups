import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DashboardLayout } from './components/layout';
import {
  LoginPage,
  RegisterPage,
  DashboardPage,
  AduanDetailPage,
  AduanListPage,
  NewAduanPage,
  LaporanPage,
  PengaturanPage,
  UserManagementPage
} from './pages';
import './index.css';

// Protected Route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  // Wait for auth to load before redirecting
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};



function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected routes */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/pengaduan" element={<AduanListPage />} />
        <Route path="/pengaduan/baru" element={<NewAduanPage />} />
        <Route path="/pengaduan/:nomorTiket" element={<AduanDetailPage />} />

        <Route path="/laporan" element={<LaporanPage />} />

        <Route path="/pengaturan" element={<PengaturanPage />} />
        <Route path="/users" element={<UserManagementPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
