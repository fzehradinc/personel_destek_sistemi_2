
import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';

// Lazy load components for better performance
const LoginPage = lazy(() => import('./LoginPage'));
const Dashboard = lazy(() => import('./Dashboard'));
const AdminPanel = lazy(() => import('./AdminPanel'));

// Loading component for suspense
const LoadingSpinner = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <div className="text-gray-600">Yükleniyor...</div>
    </div>
  </div>
);

// System initialization loading screen
const SystemLoader = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
    <div className="text-center max-w-md">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
      <h2 className="text-xl font-semibold text-gray-800 mb-2">Sistem Başlatılıyor</h2>
      <p className="text-gray-600 text-sm">Personel Destek Sistemi hazırlanıyor...</p>
      
      {/* Web Storage Info */}
      <div className="mt-8 p-4 bg-white rounded-lg shadow-sm border border-gray-200 text-left">
        <div className="text-sm font-medium text-gray-700 mb-2">
          🌐 Web Uygulaması - Tarayıcı Depolama
        </div>
        <div className="text-xs text-gray-600 space-y-1">
          <div>• <strong>Tarayıcı Depolama:</strong> Veriler localStorage'da saklanır</div>
          <div>• <strong>Kalıcılık:</strong> Tarayıcı verileri temizlenene kadar korunur</div>
          <div>• <strong>İçe/Dışa Aktarım:</strong> JSON formatında yedekleme desteklenir</div>
          <div>• <strong>Dosya Boyutu:</strong> Maksimum 5MB dosya yükleme desteği</div>
        </div>
      </div>
    </div>
  </div>
);

// Protected Route component
const ProtectedRoute = ({ children, requiredRole }: { children: React.ReactNode; requiredRole?: 'admin' | 'personel' }) => {
  const { currentUser, isLoading, isInitialized } = useAuth();

  // Show system loader while initializing
  if (!isInitialized) {
    return <SystemLoader />;
  }

  // Show loading spinner during auth operations
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access
  if (requiredRole && currentUser.role !== requiredRole) {
    // Redirect non-admin users trying to access admin routes
    if (requiredRole === 'admin' && currentUser.role === 'personel') {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Public Route component (for login page)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, isLoading, isInitialized } = useAuth();

  console.log('🔍 [PUBLIC_ROUTE] Status:', { 
    isInitialized, 
    isLoading, 
    hasUser: !!currentUser,
    userRole: currentUser?.role 
  });

  // Show system loader while initializing
  if (!isInitialized) {
    return <SystemLoader />;
  }

  // Show loading spinner during auth operations
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Redirect authenticated users to appropriate dashboard
  if (currentUser) {
    const redirectPath = currentUser.role === 'admin' ? '/admin' : '/dashboard';
    console.log('🔄 [PUBLIC_ROUTE] Redirecting authenticated user to:', redirectPath);
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

// Main App Routes component
const AppRoutes = () => {
  const { isInitialized } = useAuth();

  // Don't render routes until auth is initialized
  if (!isInitialized) {
    return <SystemLoader />;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <LoginPage />
            </Suspense>
          </PublicRoute>
        } 
      />
      
      {/* Protected Routes - Personnel */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <Dashboard />
            </Suspense>
          </ProtectedRoute>
        } 
      />
      
      {/* Protected Routes - Admin Only */}
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute requiredRole="admin">
            <Suspense fallback={<LoadingSpinner />}>
              <AdminPanel />
            </Suspense>
          </ProtectedRoute>
        } 
      />
      
      {/* Default redirect based on auth status */}
      <Route 
        path="/" 
        element={<Navigate to="/login" replace />} 
      />
      
      {/* Catch all route */}
      <Route 
        path="*" 
        element={<Navigate to="/login" replace />} 
      />
    </Routes>
  );
};

// Error Boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 [ERROR_BOUNDARY] App crashed:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-red-800 mb-4">Sistem Hatası</h1>
            <p className="text-red-700 mb-6">
              Bir hata oluştu. Lütfen sayfayı yenileyerek tekrar deneyin.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Sayfayı Yenile
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-8 p-4 bg-red-100 rounded-lg text-left">
                <details>
                  <summary className="font-medium cursor-pointer">Hata Detayları</summary>
                  <pre className="mt-2 text-xs overflow-auto">
                    {this.state.error.stack}
                  </pre>
                </details>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Main App component
const App = () => {
  console.log('🚀 [APP] Application starting...');
  
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <div className="App">
            <AppRoutes />