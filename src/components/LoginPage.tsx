import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, AlertCircle, Building2 } from 'lucide-react';

// Mock useAuth hook for demonstration
const useAuth = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(true);

  const login = async (username, password) => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (username === 'admin' && password === 'admin123') {
      const user = { id: '1', username: 'admin', role: 'admin', name: 'Sistem Yöneticisi' };
      setCurrentUser(user);
      setIsLoading(false);
      return { success: true, message: 'Giriş başarılı' };
    } else if (username === 'personel1' && password === 'personel123') {
      const user = { id: '2', username: 'personel1', role: 'personel', name: 'Ahmet Yılmaz' };
      setCurrentUser(user);
      setIsLoading(false);
      return { success: true, message: 'Giriş başarılı' };
    } else {
      setIsLoading(false);
      return { success: false, message: 'Kullanıcı adı veya şifre hatalı' };
    }
  };

  return { login, isLoading, isInitialized, currentUser };
};

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, isLoading: authLoading, isInitialized, currentUser } = useAuth();
  const navigate = useNavigate();

  // Handle successful login navigation
  useEffect(() => {
    if (currentUser && !authLoading) {
      console.log('✅ [LOGIN] User logged in, redirecting...', currentUser);
      
      // Small delay to ensure state is properly set
      const timer = setTimeout(() => {
        if (currentUser.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [currentUser, authLoading, navigate]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      setError('Kullanıcı adı ve şifre gereklidir');
      return;
    }

    setLoading(true);
    setError('');
    
    console.log('🔐 [LOGIN] Attempting login:', username);

    try {
      const result = await login(username, password);
      
      if (!result.success) {
        console.log('❌ [LOGIN] Login failed:', result.message);
        setError(result.message);
      } else {
        console.log('✅ [LOGIN] Login successful');
        // Navigation will be handled by useEffect
      }
    } catch (error) {
      console.error('❌ [LOGIN] Login error:', error);
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
    setError(''); // Clear any existing errors
  };

  // Show loading screen while auth is initializing
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600 text-sm">Sistem başlatılıyor...</div>
        </div>
      </div>
    );
  }

  // If user is already logged in, show a different message
  if (currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-pulse text-green-600 text-lg mb-4">
            ✅ Giriş başarılı! Yönlendiriliyor...
          </div>
          <div className="text-gray-600 text-sm">
            Hoş geldiniz, {currentUser.name}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo ve Başlık */}
        <div className="text-center mb-8">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Personel Destek Sistemi</h1>
          <p className="text-gray-600">Güvenli giriş yapın</p>
        </div>

        {/* Giriş Formu */}
        <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-8">
          <div className="space-y-6">
            {/* Kullanıcı Adı */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kullanıcı Adı
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Kullanıcı adınızı girin"
                  required
                  disabled={loading || authLoading}
                />
              </div>
            </div>

            {/* Şifre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Şifre
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Şifrenizi girin"
                  required
                  disabled={loading || authLoading}
                />
              </div>
            </div>

            {/* Hata Mesajı */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}

            {/* Giriş Butonu */}
            <button
              onClick={handleSubmit}
              disabled={loading || authLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
            >
              {loading || authLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Giriş yapılıyor...
                </>
              ) : (
                'Giriş Yap'
              )}
            </button>
          </div>

          {/* Demo Hesapları */}
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
                  disabled={loading || authLoading}
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
                  disabled={loading || authLoading}
                >
                  Bu bilgileri kullan
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          © 2024 Entegrasyon Ekibi - Personel Destek Sistemi
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
