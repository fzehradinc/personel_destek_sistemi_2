import { useState, useMemo, useCallback } from 'react';
import { useAuth } from './hooks/useAuth';
import { Suspense, lazy } from 'react';
import LoginPage from './components/LoginPage';
import ContentAssignmentModal from './components/ContentAssignmentModal';
import DeveloperToolsModal from './components/DeveloperToolsModal';
import ScrollToTop from './components/ScrollToTop';
import { Building2, Users, BookOpen, Workflow, FileText, HelpCircle, ChevronLeft, ChevronRight, Home, Download, Upload, Package, EyeOff, LogOut, UserCog, Settings } from 'lucide-react';
import { useTransferButtons } from './hooks/useTransferButtons';
import { useDeveloperTools } from './hooks/useDeveloperTools';

// Lazy loading ile bileşenleri yükle
const Homepage = lazy(() => import('./components/Homepage'));
const OrgTree = lazy(() => import('./components/OrgTree'));
const TrainingMaterials = lazy(() => import('./components/TrainingMaterials'));
const ProcessFlow = lazy(() => import('./components/ProcessFlow'));
const ProceduresInstructions = lazy(() => import('./components/ProceduresInstructions'));
const FAQ = lazy(() => import('./components/FAQ'));
const UserManagement = lazy(() => import('./components/UserManagement'));
const PersonelDashboard = lazy(() => import('./components/PersonelDashboard'));

// Loading bileşeni
const LoadingSpinner = () => (
  <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <div className="text-gray-600">Modül yükleniyor...</div>
    </div>
  </div>
);

function App() {
  const { currentUser, isLoading, logout, isAdmin, isPersonel } = useAuth();
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

  // Transfer buttons hook
  const { 
    showTransferButtons, 
    loading, 
    handleExport, 
    handleImport, 
    hideTransferButtons 
  } = useTransferButtons();

  // Developer tools hook
  const {
    showPasswordModal,
    showConfirmModal,
    handlePasswordConfirm,
    handleConfirm,
    handleCancel
  } = useDeveloperTools();

  // Tab değiştirme fonksiyonunu optimize et
  const handleTabChange = useCallback((tabId: string) => {
    if (tabId !== activeTab) {
      setActiveTab(tabId);
    }
  }, [activeTab]);

  // Sidebar toggle fonksiyonunu optimize et
  const handleSidebarToggle = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  // Assignment modal açma fonksiyonunu optimize et
  const openAssignmentModal = useCallback((contentId: string, contentType: 'training' | 'process' | 'procedure' | 'faq', contentTitle: string) => {
    setShowAssignmentModal({
      isOpen: true,
      contentId,
      contentType,
      contentTitle
    });
  }, []);

  // Assignment modal kapatma fonksiyonunu optimize et
  const closeAssignmentModal = useCallback(() => {
    setShowAssignmentModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Tabs listesini memoize et - tüm hooks'ları conditional return'lerden önce tanımla
  const tabs = useMemo(() => [
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

  // Admin için ek sekmeler
  const adminTabs = useMemo(() => {
    if (!isAdmin) return tabs;
    
    return [
      ...tabs,
      {
        id: 'users',
        label: 'Kullanıcı Yönetimi',
        icon: UserCog,
        color: 'from-gray-500 to-gray-600',
        description: 'Kullanıcı hesapları ve yetkilendirme'
      }
    ];
  }, [isAdmin, tabs]);

  const activeTabData = useMemo(() => {
    return adminTabs.find(tab => tab.id === activeTab);
  }, [adminTabs, activeTab]);

  // Render edilen tab içeriğini memoize et
  const renderTabContent = useMemo(() => {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        {(() => {
          switch (activeTab) {
            case 'homepage':
              return <Homepage />;
            case 'orgchart':
              return <OrgTree />;
            case 'training':
              return <TrainingMaterials onAssignContent={openAssignmentModal} />;
            case 'process':
              return <ProcessFlow onAssignContent={openAssignmentModal} />;
            case 'procedures':
              return <ProceduresInstructions onAssignContent={openAssignmentModal} />;
            case 'faq':
              return <FAQ onAssignContent={openAssignmentModal} />;
            case 'users':
              return isAdmin ? <UserManagement /> : null;
            default:
              return <Homepage />;
          }
        })()}
      </Suspense>
    );
  }, [activeTab, isAdmin, openAssignmentModal]);

  // Navigation items'ı memoize et
  const navigationItems = useMemo(() => {
    return adminTabs.map((tab) => {
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
          
          {/* Active indicator */}
          {isActive && (
            <div className="absolute right-2 w-2 h-2 bg-white rounded-full shadow-sm"></div>
          )}
          
          {/* Tooltip for collapsed state */}
          {sidebarCollapsed && (
            <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
              {tab.label}
              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45"></div>
            </div>
          )}
        </button>
      );
    });
  }, [adminTabs, activeTab, sidebarCollapsed, handleTabChange]);

  // Giriş kontrolü
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600">Sistem yükleniyor...</div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  // Personel için özel dashboard
  if (isPersonel) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <PersonelDashboard />
      </Suspense>
    );
  }

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

            {/* Çıkış Butonu */}
            <button
              onClick={logout}
              className={`
                w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-medium transition-all duration-200 
                flex items-center gap-2 text-xs shadow-sm hover:shadow-md mb-4
                ${sidebarCollapsed ? 'justify-center' : 'justify-start'}
              `}
              title={sidebarCollapsed ? 'Çıkış Yap' : 'Güvenli çıkış yap'}
            >
              <LogOut className="w-3 h-3" />
              {!sidebarCollapsed && <span>Çıkış Yap</span>}
            </button>

            {/* Sistem Durumu */}
            <div className="flex items-center gap-2 text-purple-200 text-xs mb-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              {!sidebarCollapsed && <span>Sistem Aktif</span>}
            </div>
            
            {/* Versiyon */}
            {!sidebarCollapsed && (
              <div className="text-xs text-purple-300 mb-4">
                Versiyon: 1.0.0
              </div>
            )}

            {/* Veri Yönetimi Butonları */}
            {showTransferButtons && isAdmin && (
              <div className="space-y-2">
                {!sidebarCollapsed && (
                  <div className="text-xs text-purple-200 mb-2 flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    <span>Veri Yönetimi</span>
                  </div>
                )}
                
                {/* Dışa Aktar */}
                <button
                  onClick={handleExport}
                  disabled={loading}
                  className={`
                    w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed 
                    text-white px-3 py-2 rounded-lg font-medium transition-all duration-200 
                    flex items-center gap-2 text-xs shadow-sm hover:shadow-md
                    ${sidebarCollapsed ? 'justify-center' : 'justify-start'}
                  `}
                  title={sidebarCollapsed ? 'Dışa Aktar' : 'Tüm verileri .zip dosyası olarak masaüstüne dışa aktar'}
                >
                  {loading ? (
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Download className="w-3 h-3" />
                  )}
                  {!sidebarCollapsed && <span>Dışa Aktar</span>}
                </button>

                {/* İçe Aktar */}
                <button
                  onClick={handleImport}
                  disabled={loading}
                  className={`
                    w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed 
                    text-white px-3 py-2 rounded-lg font-medium transition-all duration-200 
                    flex items-center gap-2 text-xs shadow-sm hover:shadow-md
                    ${sidebarCollapsed ? 'justify-center' : 'justify-start'}
                  `}
                  title={sidebarCollapsed ? 'İçe Aktar' : 'Yedek .zip dosyasından verileri geri yükle'}
                >
                  {loading ? (
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Upload className="w-3 h-3" />
                  )}
                  {!sidebarCollapsed && <span>İçe Aktar</span>}
                </button>

                {/* Butonları Gizle */}
                <button
                  onClick={hideTransferButtons}
                  disabled={loading}
                  className={`
                    w-full bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 disabled:cursor-not-allowed 
                    text-white px-3 py-2 rounded-lg font-medium transition-all duration-200 
                    flex items-center gap-2 text-xs shadow-sm hover:shadow-md
                    ${sidebarCollapsed ? 'justify-center' : 'justify-start'}
                  `}
                  title={sidebarCollapsed ? 'Gizle' : 'Bu butonları kalıcı olarak gizle (canlı sistem modu)'}
                >
                  <EyeOff className="w-3 h-3" />
                  {!sidebarCollapsed && <span>Gizle</span>}
                </button>

                {/* Loading durumu bilgisi */}
                {loading && !sidebarCollapsed && (
                  <div className="text-center pt-1">
                    <div className="text-xs text-purple-200 animate-pulse">
                      İşlem devam ediyor...
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Collapsed state için tooltip */}
            {sidebarCollapsed && showTransferButtons && isAdmin && (
              <div className="mt-2 flex justify-center">
                <div className="w-6 h-6 bg-white bg-opacity-10 rounded-full flex items-center justify-center">
                  <Package className="w-3 h-3" />
                </div>
              </div>
            )}

            {/* Geliştirici Araçları Bilgisi - Sadece collapsed değilse göster */}
            {!sidebarCollapsed && isAdmin && (
              <div className="mt-4 pt-3 border-t border-purple-500 border-opacity-30">
                <div className="text-xs text-purple-300 text-center">
                  🔧 Geliştirici: Ctrl + Shift + L
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Ana İçerik Alanı */}
        <div className={`
          flex-1 transition-all duration-300 ease-in-out
          ${sidebarCollapsed ? 'ml-16' : 'ml-64'}
        `}>
          {/* Üst Header - Sadece Ana Sayfa değilse göster */}
          {activeTab !== 'homepage' && (
            <div className="bg-white shadow-lg border-b border-gray-100">
              {/* Top Bar */}
              <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
                <div className="px-6 lg:px-8">
                  <div className="flex items-center justify-between h-12">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="font-medium">Sistem Aktif</span>
                      </div>
                      <div className="hidden sm:block text-blue-100">•</div>
                      <div className="hidden sm:flex items-center gap-1">
                        <span>{isAdmin ? '👨‍💼 Admin Panel' : '👤 Personel Panel'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="hidden md:flex items-center gap-2">
                        <span className="text-blue-100">Son Güncelleme:</span>
                        <span className="font-medium">{new Date().toLocaleDateString('tr-TR')}</span>
                      </div>
                      <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-xs font-medium">
                        {currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Tab Info Bar */}
              {activeTabData && (
                <div className={`bg-gradient-to-r ${activeTabData.color} text-white`}>
                  <div className="px-6 lg:px-8">
                    <div className="flex items-center justify-between h-14">
                      <div className="flex items-center gap-3">
                        <activeTabData.icon className="w-5 h-5" />
                        <div>
                          <h2 className="font-semibold">{activeTabData.label}</h2>
                          <p className="text-xs text-white text-opacity-80">{activeTabData.description}</p>
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-2 text-sm text-white text-opacity-80">
                        <span>Modül Aktif</span>
                        <div className="w-2 h-2 bg-white bg-opacity-60 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab Content */}
          <div className="transition-all duration-500 ease-in-out">
            {renderTabContent}
          </div>

          {/* Footer - Sadece Ana Sayfa değilse göster */}
          {activeTab !== 'homepage' && (
            <footer className="bg-white border-t border-gray-200 mt-12">
              <div className="px-6 lg:px-8 py-8">
                <div className="flex flex-col md:flex-row items-center justify-between">
                  <div className="flex items-center gap-3 mb-4 md:mb-0">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Personel Destek Sistemi</div>
                      <div className="text-sm text-gray-500">
                        {isAdmin ? 'Yönetim Platformu' : 'Personel Platformu'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Sistem Durumu: Aktif</span>
                    </div>
                    <div>© 2024 {currentUser.department || 'Entegrasyon Ekibi'}</div>
                  </div>
                </div>
              </div>
            </footer>
          )}
        </div>

        {/* İçerik Atama Modal */}
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
}

export default App;