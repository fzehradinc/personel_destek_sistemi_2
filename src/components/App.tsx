import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './AuthContext';

// Mock components - replace with your actual components
const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Kullanıcı adı ve şifre gereklidir');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const result = await onLogin(username, password);
      if (!result.success) {
        setError(result.message);
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Giriş sırasında beklenmeyen bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = (type) => {
    if (type === 'admin') {
      setUsername('admin');
      setPassword('admin123');
    } else {
      setUsername('personel1');
      setPassword('personel123');
    }
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white text-2xl font-bold">PS</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Personel Destek Sistemi</h1>
          <p className="text-gray-600">Güvenli giriş yapın</p>
        </div>

        <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kullanıcı Adı
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Kullanıcı adınızı girin"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Şifre
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Şifrenizi girin"
                required
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                <span className="text-red-600">⚠️</span>
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Giriş yapılıyor...
                </>
              ) : (
                'Giriş Yap'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Demo Hesapları:</h3>
            <div className="space-y-3 text-xs">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="font-medium text-blue-900 mb-2">👨‍💼 Admin Hesabı</div>
                <div className="text-blue-700 mb-2">
                  Kullanıcı: <code className="bg-blue-100 px-1 rounded">admin</code> | 
                  Şifre: <code className="bg-blue-100 px-1 rounded">admin123</code>
                </div>
                <button
                  type="button"
                  onClick={() => fillDemoCredentials('admin')}
                  className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded transition-colors"
                  disabled={loading}
                >
                  Bu bilgileri kullan
                </button>
              </div>
              
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="font-medium text-green-900 mb-2">👤 Personel Hesabı</div>
                <div className="text-green-700 mb-2">
                  Kullanıcı: <code className="bg-green-100 px-1 rounded">personel1</code> | 
                  Şifre: <code className="bg-green-100 px-1 rounded">personel123</code>
                </div>
                <button
                  type="button"
                  onClick={() => fillDemoCredentials('personel')}
                  className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded transition-colors"
                  disabled={loading}
                >
                  Bu bilgileri kullan
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-8 text-sm text-gray-500">
          © 2024 Entegrasyon Ekibi - Personel Destek Sistemi
        </div>
      </div>
    </div>
  );
};

const Dashboard = ({ user, onLogout }) => {
  const [activeModule, setActiveModule] = useState('home');

  const modules = [
    { id: 'home', name: 'Ana Sayfa', icon: '🏠' },
    { id: 'org', name: 'Organizasyon Şeması', icon: '📊' },
    { id: 'training', name: 'Eğitim Materyalleri', icon: '📚' },
    { id: 'process', name: 'Süreç Akışları', icon: '🔄' },
    { id: 'procedures', name: 'Prosedürler', icon: '📋' },
    { id: 'faq', name: 'SSS', icon: '❓' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 w-10 h-10 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white text-lg font-bold">PS</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Personel Destek Sistemi</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Hoş geldiniz, <span className="font-medium">{user.name}</span>
              </div>
              <button
                onClick={onLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Çıkış Yap
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Module Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {modules.map((module) => (
            <button
              key={module.id}
              onClick={() => setActiveModule(module.id)}
              className={p-4 rounded-xl text-center transition-all ${
                activeModule === module.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white hover:bg-blue-50 text-gray-700 shadow-sm hover:shadow-md'
              }}
            >
              <div className="text-2xl mb-2">{module.icon}</div>
              <div className="text-sm font-medium">{module.name}</div>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {modules.find(m => m.id === activeModule)?.name}
          </h2>
          
          <div className="text-gray-600">
            {activeModule === 'home' && (
              <div className="space-y-4">
                <p>Personel Destek Sistemi'ne hoş geldiniz!</p>
                <p>Bu sistem, yeni çalışanlarımızın işe alışma sürecini desteklemek için tasarlanmıştır.</p>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">🎯 Sistem Özellikleri:</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Organizasyon şeması ve departman bilgileri</li>
                    <li>• Eğitim materyalleri ve dokümantasyon</li>
                    <li>• Süreç akışları ve iş prosedürleri</li>
                    <li>• Sıkça sorulan sorular ve yanıtları</li>
                  </ul>
                </div>
              </div>
            )}
            
            {activeModule !== 'home' && (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">
                  {modules.find(m => m.id === activeModule)?.icon}
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {modules.find(m => m.id === activeModule)?.name}
                </h3>
                <p className="text-gray-500">
                  Bu modül geliştirme aşamasındadır.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminPanel = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('users');
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="bg-gradient-to-br from-purple-600 to-pink-600 w-10 h-10 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white text-lg font-bold">A</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Admin Panel</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium mr-2">
                  Admin
                </span>
                {user.name}
              </div>
              <button
                onClick={onLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Çıkış Yap
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'users', name: 'Kullanıcı Yönetimi', icon: '👥' },
              { id: 'content', name: 'İçerik Yönetimi', icon: '📝' },
              { id: 'system', name: 'Sistem Ayarları', icon: '⚙️' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {activeTab === 'users' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Kullanıcı Yönetimi</h2>
              <div className="text-center py-16">
                <div className="text-6xl mb-4">👥</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Kullanıcı Yönetim Paneli
                </h3>
                <p className="text-gray-500">
                  Kullanıcı ekleme, düzenleme ve yetki yönetimi özellikleri yakında eklenecek.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'content' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">İçerik Yönetimi</h2>
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  İçerik Yönetim Paneli
                </h3>
                <p className="text-gray-500">
                  Modül içerikleri, eğitim materyalleri ve prosedür yönetimi özellikleri yakında eklenecek.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Sistem Ayarları</h2>
              <div className="text-center py-16">
                <div className="text-6xl mb-4">⚙️</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Sistem Ayarları Paneli
                </h3>
                <p className="text-gray-500">
                  Sistem konfigürasyonu ve ayarlar yönetimi özellikleri yakında eklenecek.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

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

// Loading spinner component
const LoadingSpinner = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <div className="text-gray-600">Yükleniyor...</div>
    </div>
  </div>
);

// Main App Routes component
const AppRoutes = () => {
  const { currentUser, isLoading, isInitialized, login, logout } = useAuth();
  const [currentRoute, setCurrentRoute] = useState('login');

  console.log('🔍 [APP_ROUTES] Status:', { 
    isInitialized, 
    isLoading, 
    hasUser: !!currentUser,
    userRole: currentUser?.role,
    currentRoute
  });

  // Handle route changes based on auth state
  useEffect(() => {
    if (isInitialized && !isLoading) {
      if (currentUser) {
        const newRoute = currentUser.role === 'admin' ? 'admin' : 'dashboard';
        if (currentRoute !== newRoute) {
          console.log('🔄 [APP_ROUTES] Auto-redirecting to:', newRoute);
          setCurrentRoute(newRoute);
        }
      } else {
        if (currentRoute !== 'login') {
          console.log('🔄 [APP_ROUTES] Auto-redirecting to login');