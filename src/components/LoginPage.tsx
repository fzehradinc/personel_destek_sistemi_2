import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, AlertCircle, Building2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading, currentUser } = useAuth();
  const navigate = useNavigate();

  console.log('🔍 [LOGIN] Component state:', { 
    username, 
    hasPassword: !!password, 
    isLoading, 
    currentUser: currentUser?.username,
    userRole: currentUser?.role 
  });

  // Kullanıcı zaten giriş yapmışsa yönlendir
  useEffect(() => {
    if (currentUser && !isLoading) {
      console.log('✅ [LOGIN] User already logged in, redirecting...', {
        username: currentUser.username,
        role: currentUser.role
      });
      
      const targetPath = currentUser.role === 'admin' ? '/admin' : '/dashboard';
      console.log('🔄 [LOGIN] Navigating to:', targetPath);
      
      // Küçük gecikme ile yönlendirme - state güncellemesinin tamamlanması için
      setTimeout(() => {
        navigate(targetPath, { replace: true });
      }, 100);
    }
  }, [currentUser, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      setError('Kullanıcı adı ve şifre gereklidir');
      return;
    }

    setError('');
    console.log('🔐 [LOGIN] Attempting login:', username);

    try {
      const result = await login(username, password);
      
      if (result.success) {
        console.log('✅ [LOGIN] Login successful, waiting for context update...');
        // Login başarılı - AuthContext otomatik yönlendirecek
      } else {
        console.log('❌ [LOGIN] Login failed:', result.message);
        setError(result.message);
      }
    } catch (error) {
      console.error('❌ [LOGIN] Login error:', error);
      setError('Giriş sırasında beklenmeyen bir hata oluştu');
    }
  };

  const fillDemoCredentials = (type: 'admin' | 'personel') => {
    if (type === 'admin') {
      setUsername('admin');
      setPassword('admin123');
    } else {
      setUsername('personel1');
      setPassword('personel123');
    }
    setError('');
  };

  // Eğer kullanıcı zaten giriş yapmışsa loading göster
  if (currentUser && !isLoading) {
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
          <form onSubmit={handleSubmit} className="space-y-6">
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
                  disabled={isLoading}
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
                  disabled={isLoading}
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
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Giriş yapılıyor...
                </>
              ) : (
                'Giriş Yap'
              )}
            </button>
          </form>

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
                  disabled={isLoading}
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
                  disabled={isLoading}
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