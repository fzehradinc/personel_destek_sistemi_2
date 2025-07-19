import React, { useEffect, useMemo, useCallback, Suspense, startTransition } from 'react';
import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { lazy } from 'react';
import ContentAssignmentModal from './components/ContentAssignmentModal';
import DeveloperToolsModal from './components/DeveloperToolsModal';
import ScrollToTop from './components/ScrollToTop';
import { Building2, Users, BookOpen, Workflow, FileText, HelpCircle, ChevronLeft, ChevronRight, Home, Download, Upload, Package, EyeOff, LogOut, UserCog, Settings } from 'lucide-react';
import { useTransferButtons } from './hooks/useTransferButtons';
import { useDeveloperTools } from './hooks/useDeveloperTools';

// Performance: Lazy loading ile code splitting - prefetch ile optimize
const LoginPage = lazy(() => import('./components/LoginPage'));
const Homepage = lazy(() => import('./components/Homepage'));
const OrgTree = lazy(() => import('./components/OrgTree'));
const TrainingMaterials = lazy(() => import('./components/TrainingMaterials'));
const ProcessFlow = lazy(() => import('./components/ProcessFlow'));
const ProceduresInstructions = lazy(() => import('./components/ProceduresInstructions'));
const FAQ = lazy(() => import('./components/FAQ'));
const UserManagement = lazy(() => import('./components/UserManagement'));
const PersonelDashboard = lazy(() => import('./components/PersonelDashboard'));

// Performance: Optimize edilmiş loading bileşeni - memoize
const LoadingSpinner = React.memo(() => (
  <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <div className="text-gray-600">Modül yükleniyor...</div>
    </div>
  </div>
));
LoadingSpinner.displayName = 'LoadingSpinner';

// Performance: Initial loading - farklı spinner
const InitialLoadingSpinner = React.memo(() => (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <div className="text-gray-600 text-sm">Sistem başlatılıyor...</div>
      <div className="text-xs text-gray-500 mt-2">
        Web tabanlı hızlı giriş sistemi
      </div>
    </div>
  </div>
));
InitialLoadingSpinner.displayName = 'InitialLoadingSpinner';

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }: { children: React.ReactNode; requiredRole?: 'admin' | 'personel' }) => {
  const { currentUser, isLoading, isInitialized } = useAuth();
  
  console.log('🛡️ [PROTECTED-ROUTE] Access check:', {
    currentUser: currentUser?.username,
    role: currentUser?.role,
    requiredRole,
    isLoading,
    isInitialized,
    shouldRedirect: !currentUser && isInitialized && !isLoading
  });

  // Show loading only if truly not initialized AND loading
  if (!isInitialized && isLoading) {
    console.log('⏳ [PROTECTED-ROUTE] Still initializing...');
    return <InitialLoadingSpinner />;
  }
  
  // If initialized but no user, redirect to login
  if (isInitialized && !currentUser) {
    console.log('🔒 [PROTECTED-ROUTE] No user found, redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  // If user exists but wrong role, redirect to appropriate dashboard
  if (currentUser && requiredRole && currentUser.role !== requiredRole) {
    console.log('🚫 [PROTECTED-ROUTE] Wrong role, redirecting to appropriate dashboard');
    const redirectPath = currentUser.role === 'admin' ? '/admin' : '/dashboard';
    console.log('🔄 [PROTECTED-ROUTE] Redirecting to:', redirectPath);
    return <Navigate to={redirectPath} replace />;
  }

  // If we have a user but no role requirement, allow access
  if (currentUser && !requiredRole) {
    console.log('✅ [PROTECTED-ROUTE] User exists, no role requirement, access granted');
    return <>{children}</>;
  }

  console.log('✅ [PROTECTED-ROUTE] Access granted');
  return <>{children}</>;
};

// Public Route Component (only for login page)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, isLoading, isInitialized } = useAuth();
  
  console.log('🌐 [PUBLIC-ROUTE] Login status check:', {
    currentUser: currentUser?.username,
    role: currentUser?.role,
    isLoading,
    isInitialized,
    shouldRedirect: !!currentUser && isInitialized
  });

  // Show loading only if truly not initialized AND loading
  if (!isInitialized && isLoading) {
    console.log('⏳ [PUBLIC-ROUTE] Still initializing...');
    return <InitialLoadingSpinner />;
  }

  // If initialized and user exists, redirect to appropriate dashboard
  if (currentUser) {
    console.log('👤 [PUBLIC-ROUTE] User already logged in, redirecting...');
    const redirectPath = currentUser.role === 'admin' ? '/admin' : '/dashboard';
    console.log('🔄 [PUBLIC-ROUTE] Target path:', redirectPath);
    return <Navigate to={redirectPath} replace />;
  }

  console.log('🔓 [PUBLIC-ROUTE] No user found, showing login page');
  return <>{children}</>;
};

// Admin Dashboard Component
const AdminDashboard = React.memo(() => {
  const renderStartTime = performance.now();
  console.log('🚀 [ADMIN-DASHBOARD] Component render başlatıldı');
  
  const { currentUser, logout, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('homepage');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState<{
    isOpen: boolean;
    contentId: string;
    contentType: 'training' | 'process' | 'procedure' | 'faq';
    contentTitle: string;
  }>({
    isOpen: false,
    contentId: '',
    contentType: 'training',
    contentTitle: ''
  });

  // Performance: Transfer buttons hook - deps optimize
  const { 
    showTransferButtons, 
    loading, 
    handleExport, 
    handleImport, 
    hideTransferButtons 
  } = useTransferButtons();

  // Performance: Developer tools hook - deps optimize
  const {
    showPasswordModal,
    showConfirmModal,
    handlePasswordConfirm,
    handleConfirm,
    handleCancel
  } = useDeveloperTools();

  // Performance: Tab değiştirme - startTransition ile optimize
  const handleTabChange = useCallback((tabId: string) => {
    if (tabId !== activeTab) {
      console.log(`🔄 [APP] Tab değişimi: ${activeTab} → ${tabId}`);
      setActiveTab(tabId);
    }
  }, [activeTab]);

  // Performance: Sidebar toggle - basit callback
  const handleSidebarToggle = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  // Performance: Assignment modal - optimize
  const openAssignmentModal = useCallback((contentId: string, contentType: 'training' | 'process' | 'procedure' | 'faq', contentTitle: string) => {
    setShowAssignmentModal({
      isOpen: true,
      contentId,
      contentType,
      contentTitle
    });
  }, []);

  const closeAssignmentModal = useCallback(() => {
    setShowAssignmentModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Performance: Static tabs - değişmeyecek veri
  const baseTabs = useMemo(() => [
    { 
      id: 'homepage', 
      label: 'Ana Sayfa', 
      icon: Home,
      color: 'from-indigo-500 to-indigo-600',
      description: 'Yönetici mesajları ve güncel gelişmeler'
    },
    { 
      id: 'orgchart', 
      label: 'Organizasyon Şeması', 
      icon: Building2,
      color: 'from-blue-500 to-blue-600',
      description: 'Şirket hiyerarşisi ve ekip yapısı'
    },
    { 
      id: 'training', 
      label: 'Eğitim Materyalleri', 
      icon: BookOpen,
      color: 'from-green-500 to-green-600',
      description: 'PDF dökümanlar ve eğitim videoları'
    },
    { 
      id: 'process', 
      label: 'Süreç Akışları', 
      icon: Workflow,
      color: 'from-purple-500 to-purple-600',
      description: 'İş süreçleri ve görev sorumlulukları'
    },
    { 
      id: 'procedures', 
      label: 'Prosedür ve Talimatlar', 
      icon: FileText,
      color: 'from-orange-500 to-orange-600',
      description: 'Operasyonel prosedürler ve talimatlar'
    },
    { 
      id: 'faq', 
      label: 'Sıkça Sorulan Sorular', 
      icon: HelpCircle,
      color: 'from-red-500 to-red-600',
      description: 'Soru ve cevaplar'
    }
  ], []);

  // Performance: Admin tabs - sadece admin durumu değişirse recalculate
  const availableTabs = useMemo(() => {
    if (!isAdmin) return baseTabs;
    
    return [
      ...baseTabs,
      {
        id: 'users',
        label: 'Kullanıcı Yönetimi',
        icon: UserCog,
        color: 'from-gray-500 to-gray-600',
        description: 'Kullanıcı hesapları ve yetkilendirme'
      }
    ];
  }, [isAdmin, baseTabs]);

  // Performance: Active tab - memoize
  const activeTabData = useMemo(() => {
    return availableTabs.find(tab => tab.id === activeTab);
  }, [availableTabs, activeTab]);

  // Performance: Tab content rendering - Switch yerine object mapping
  const tabComponents = useMemo(() => ({
    homepage: <Homepage />,
    orgchart: <OrgTree />,
    training: <TrainingMaterials onAssignContent={openAssignmentModal} />,
    process: <ProcessFlow onAssignContent={openAssignmentModal} />,
    procedures: <ProceduresInstructions onAssignContent={openAssignmentModal} />,
    faq: <FAQ onAssignContent={openAssignmentModal} />,
    users: isAdmin ? <UserManagement /> : <Homepage />
  }), [isAdmin, openAssignmentModal]);

  // Performance: Render tab content - Suspense içinde
  const renderTabContent = useMemo(() => {
    const componentStartTime = performance.now();
    console.log(`🔄 [APP] ${activeTab} component render başladı`);
    
    return (
      <Suspense fallback={<LoadingSpinner />}>
        {tabComponents[activeTab as keyof typeof tabComponents] || tabComponents.homepage}
      </Suspense>
    );
  }, [activeTab, tabComponents]);

  // Performance: Navigation items - complex rendering'i memoize et
  const navigationItems = useMemo(() => {
    console.log(`🔄 [APP] Navigation items render edildi (${availableTabs.length} tab)`);
    
    return availableTabs.map((tab) => {
      const IconComponent = tab.icon;
      const isActive = activeTab === tab.id;
      
      return (
        <button
          key={tab.id}
          onClick={() => handleTabChange(tab.id)}
          className={`
            group relative w-full flex items-center gap-3 px-3 py-3 rounded-xl font-medium transition-all duration-200
            ${isActive
              ? 'bg-white bg-opacity-20 text-white shadow-lg transform scale-105'
              : 'text-purple-100 hover:text-white hover:bg-white hover:bg-opacity-10'
            }
            ${sidebarCollapsed ? 'justify-center' : 'justify-start'}
          `}
          title={sidebarCollapsed ? tab.label : ''}
        >
          <IconComponent className={`
            w-5 h-5 transition-transform duration-200 flex-shrink-0
            ${isActive ? 'scale-110' : 'group-hover:scale-110'}
          `} />
          
          {!sidebarCollapsed && (
            <span className="text-sm font-medium truncate">{tab.label}</span>
          )}
          
          {isActive && (
            <div className="absolute right-2 w-2 h-2 bg-white rounded-full shadow-sm"></div>
          )}
          
          {sidebarCollapsed && (
            <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
              {tab.label}
              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45"></div>
            </div>
          )}
        </button>
      );
    });
  }, [availableTabs, activeTab, sidebarCollapsed, handleTabChange]);

  // Admin kontrolü
  if (!isAdmin) {
    console.log('🚫 [ADMIN-DASHBOARD] Not admin, redirecting');
    return <Navigate to="/dashboard" replace />;
  }
  
  // Performance: Render tamamlandı
  const renderEndTime = performance.now();
  console.log(`✅ [ADMIN-DASHBOARD] Component render tamamlandı (${(renderEndTime - renderStartTime).toFixed(2)}ms)`);

  return (
    <ScrollToTop activeTab={activeTab}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex">
        {/* Sol Sidebar */}
        <div className={`
          fixed left-0 top-0 h-full bg-gradient-to-b from-purple-600 via-indigo-600 to-purple-700 text-white shadow-2xl z-50 transition-all duration-300 ease-in-out
          ${sidebarCollapsed ? 'w-16' : 'w-64'}
        `}>
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-purple-500 border-opacity-30">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">PDS</h1>
                  <p className="text-xs text-purple-200">
                    {isAdmin ? 'Admin Panel' : 'Personel Destek Sistemi'}
                  </p>
                </div>
              </div>
            )}
            
            {sidebarCollapsed && (
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mx-auto">
                <Building2 className="w-5 h-5" />
              </div>
            )}
            
            <button
              onClick={handleSidebarToggle}
              className="p-2 rounded-lg bg-white bg-opacity-10 hover:bg-opacity-20 transition-all duration-200 ml-auto"
              title={sidebarCollapsed ? 'Menüyü Genişlet' : 'Menüyü Daralt'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 py-6">
            <div className="space-y-2 px-3">
              {navigationItems}
            </div>
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-purple-500 border-opacity-30">
            {/* Kullanıcı Bilgisi */}
            {!sidebarCollapsed && (
              <div className="mb-4 p-3 bg-white bg-opacity-10 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">
                      {currentUser.name}
                    </div>
                    <div className="text-purple-200 text-xs truncate">
                      {isAdmin ? '👨‍💼 Yönetici' : '👤 Personel'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/*
            {showTransferButtons && (
              <div className="flex gap-2">
                <button
                  onClick={handleExport}
                  disabled={loading}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                  title="Verileri Dışa Aktar"
                >
                  <Download className="w-4 h-4" />
                  {!sidebarCollapsed && <span className="text-xs">Dışa Aktar</span>}
                </button>
                
                <button
                  onClick={handleImport}
                  disabled={loading}
                  className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
                  title="Verileri İçe Aktar"
                >
                  <Upload className="w-4 h-4" />
                  {!sidebarCollapsed && <span className="text-xs">İçe Aktar</span>}
                </button>
                
                <button
                  onClick={hideTransferButtons}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  title="Gizle"
                >
                  <EyeOff className="w-4 h-4" />
                  {!sidebarCollapsed && <span className="text-xs">Gizle</span>}
                </button>
              </div>
            )}

            {/* Çıkış Butonu */}
            <button
              onClick={logout}
              className="flex items-center gap-3 w-full px-3 py-3 text-purple-100 hover:text-white hover:bg-white hover:bg-opacity-10 rounded-xl transition-all duration-200"
              title="Çıkış Yap"
            >
              <LogOut className="w-5 h-5" />
              {!sidebarCollapsed && <span className="text-sm">Çıkış Yap</span>}
            </button>
          </div>
        </div>

        {/* Ana İçerik Alanı */}
        <div className={`
          flex-1 transition-all duration-300 ease-in-out
          ${sidebarCollapsed ? 'ml-16' : 'ml-64'}
        `}>
          {/* Üst Header */}
          <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                ✅ Admin Dashboard Yüklendi
              </div>
              <div className="flex items-center gap-4">
                {activeTabData && (
                  <>
                    <div className={`
                      w-10 h-10 rounded-xl bg-gradient-to-r ${activeTabData.color} 
                      flex items-center justify-center text-white shadow-lg
                    `}>
                      <activeTabData.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-gray-900">
                        {activeTabData.label}
                      </h1>
                      <p className="text-sm text-gray-600">
                        {activeTabData.description}
                      </p>
                    </div>
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {currentUser.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {isAdmin ? 'Yönetici' : 'Personel'}
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center text-white text-sm font-medium">
                  {currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          {/* Tab İçeriği */}
          <div className="p-6">
            {renderTabContent}
          </div>
        </div>

        {/* Content Assignment Modal */}
        <ContentAssignmentModal
          isOpen={showAssignmentModal.isOpen}
          onClose={closeAssignmentModal}
          contentId={showAssignmentModal.contentId}
          contentType={showAssignmentModal.contentType}
          contentTitle={showAssignmentModal.contentTitle}
        />

        {/* Developer Tools Modal */}
        <DeveloperToolsModal
          showPasswordModal={showPasswordModal}
          showConfirmModal={showConfirmModal}
          onPasswordConfirm={handlePasswordConfirm}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      </div>
    </ScrollToTop>
  );
});
AdminDashboard.displayName = 'AdminDashboard';

// App Routes Component
const AppRoutes = React.memo(() => {
  console.log('🛣️ [APP-ROUTES] Rendering routes');
  
  return (
    <Routes>
      {/* Public Route - Login */}
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <Suspense fallback={<InitialLoadingSpinner />}>
              <LoginPage />
            </Suspense>
          </PublicRoute>
        } 
      />
      
      {/* Protected Route - Admin Dashboard */}
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute requiredRole="admin">
            <Suspense fallback={<LoadingSpinner />}>
              <AdminDashboard />
            </Suspense>
          </ProtectedRoute>
        } 
      />
      
      {/* Protected Route - Personel Dashboard */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute requiredRole="personel">
            <Suspense fallback={<LoadingSpinner />}>
              <PersonelDashboard />
            </Suspense>
          </ProtectedRoute>
        } 
      />
      
      {/* Default Route - Redirect to appropriate dashboard */}
      <Route 
        path="/" 
        element={<Navigate to="/login" replace />} 
      />
      
      {/* Catch all - Redirect to login */}
      <Route 
        path="*" 
        element={<Navigate to="/login" replace />} 
      />
    </Routes>
  );
});
AppRoutes.displayName = 'AppRoutes';

// Performance: Ana App bileşeni - Router wrapper
const App: React.FC = () => {
  console.log('🚀 [APP] Main App component rendering');
  
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
};

export default App;