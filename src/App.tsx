import { useState } from 'react';
import OrgTree from './components/OrgTree';
import FAQ from './components/FAQ';
import TrainingMaterials from './components/TrainingMaterials';
import ProcessFlow from './components/ProcessFlow';
import ProceduresInstructions from './components/ProceduresInstructions';
import Homepage from './components/Homepage';
import DeveloperToolsModal from './components/DeveloperToolsModal';
import ScrollToTop from './components/ScrollToTop';
import { Building2, Users, BookOpen, Workflow, FileText, HelpCircle, ChevronLeft, ChevronRight, Home, Download, Upload, Package, EyeOff } from 'lucide-react';
import { useTransferButtons } from './hooks/useTransferButtons';
import { useDeveloperTools } from './hooks/useDeveloperTools';

function App() {
  const [activeTab, setActiveTab] = useState('homepage');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  const tabs = [
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
  ];

  const activeTabData = tabs.find(tab => tab.id === activeTab);

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
                  <p className="text-xs text-purple-200">Personel Destek Sistemi</p>
                </div>
              </div>
            )}
            
            {sidebarCollapsed && (
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mx-auto">
                <Building2 className="w-5 h-5" />
              </div>
            )}
            
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
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
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
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
              })}
            </div>
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-purple-500 border-opacity-30">
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
            {showTransferButtons && (
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
            {sidebarCollapsed && showTransferButtons && (
              <div className="mt-2 flex justify-center">
                <div className="w-6 h-6 bg-white bg-opacity-10 rounded-full flex items-center justify-center">
                  <Package className="w-3 h-3" />
                </div>
              </div>
            )}

            {/* Geliştirici Araçları Bilgisi - Sadece collapsed değilse göster */}
            {!sidebarCollapsed && (
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
                        <Users className="w-4 h-4" />
                        <span>Entegrasyon Ekibi</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="hidden md:flex items-center gap-2">
                        <span className="text-blue-100">Son Güncelleme:</span>
                        <span className="font-medium">{new Date().toLocaleDateString('tr-TR')}</span>
                      </div>
                      <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4" />
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
            {activeTab === 'homepage' && <Homepage />}
            {activeTab === 'orgchart' && <OrgTree />}
            {activeTab === 'training' && <TrainingMaterials />}
            {activeTab === 'process' && <ProcessFlow />}
            {activeTab === 'procedures' && <ProceduresInstructions />}
            {activeTab === 'faq' && <FAQ />}
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
                      <div className="text-sm text-gray-500">Entegrasyon Yönetim Platformu</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Sistem Durumu: Aktif</span>
                    </div>
                    <div>© 2024 Entegrasyon Ekibi</div>
                  </div>
                </div>
              </div>
            </footer>
          )}
        </div>

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