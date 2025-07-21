import React, { useState } from 'react';
import { X, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId?: string; // Admin başka kullanıcının şifresini değiştirirken
  targetUserName?: string;
}

const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({
  isOpen,
  onClose,
  targetUserId,
  targetUserName
}) => {
  const { currentUser, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isAdminChangingOtherUser = targetUserId && targetUserId !== currentUser?.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Form validasyonu
    if (!isAdminChangingOtherUser && !formData.currentPassword.trim()) {
      setError('Mevcut şifrenizi girmeniz gerekiyor');
      return;
    }

    if (!formData.newPassword.trim()) {
      setError('Yeni şifre boş olamaz');
      return;
    }

    if (formData.newPassword.length < 3) {
      setError('Yeni şifre en az 3 karakter olmalıdır');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Yeni şifreler eşleşmiyor');
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      setError('Yeni şifre mevcut şifreden farklı olmalıdır');
      return;
    }

    setLoading(true);

    try {
      // Admin başka kullanıcının şifresini değiştiriyorsa
      if (isAdminChangingOtherUser) {
        console.log('🔐 [PASSWORD-CHANGE] Admin şifre değiştirme:', {
          adminId: currentUser?.id,
          targetUserId,
          targetUserName
        });

        const result = await updateUser(targetUserId, {
          password: formData.newPassword
        });

        if (result.success) {
          alert(`✅ ${targetUserName} kullanıcısının şifresi başarıyla değiştirildi!`);
          onClose();
          resetForm();
        } else {
          setError(result.message);
        }
      } else {
        // Kullanıcı kendi şifresini değiştiriyorsa
        console.log('🔐 [PASSWORD-CHANGE] Kullanıcı kendi şifresini değiştiriyor');

        // Önce mevcut şifreyi doğrula
        if (currentUser?.password !== formData.currentPassword) {
          setError('Mevcut şifreniz yanlış');
          return;
        }

        const result = await updateUser(currentUser.id, {
          password: formData.newPassword
        });

        if (result.success) {
          alert('✅ Şifreniz başarıyla değiştirildi!\n\n🔄 Güvenlik için tekrar giriş yapmanız önerilir.');
          onClose();
          resetForm();
        } else {
          setError(result.message);
        }
      }
    } catch (error) {
      console.error('❌ [PASSWORD-CHANGE] Şifre değiştirme hatası:', error);
      setError('Şifre değiştirme sırasında hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setError('');
    setShowPasswords({
      current: false,
      new: false,
      confirm: false
    });
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Lock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {isAdminChangingOtherUser ? 'Kullanıcı Şifresi Değiştir' : 'Şifremi Değiştir'}
                </h3>
                <p className="text-sm text-gray-600">
                  {isAdminChangingOtherUser 
                    ? `${targetUserName} kullanıcısının şifresini değiştirin`
                    : 'Güvenliğiniz için güçlü bir şifre seçin'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                resetForm();
              }}
              className="text-gray-400 hover:text-gray-600 p-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Mevcut Şifre - Sadece kullanıcı kendi şifresini değiştirirken */}
          {!isAdminChangingOtherUser && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mevcut Şifre <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={formData.currentPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Mevcut şifrenizi girin"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('current')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Yeni Şifre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Yeni Şifre <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Yeni şifrenizi girin"
                required
                minLength={3}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('new')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Yeni Şifre Tekrar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Yeni Şifre (Tekrar) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Yeni şifrenizi tekrar girin"
                required
                minLength={3}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirm')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Şifre Eşleşme Kontrolü */}
          {formData.newPassword && formData.confirmPassword && (
            <div className={`flex items-center gap-2 text-sm ${
              formData.newPassword === formData.confirmPassword 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {formData.newPassword === formData.confirmPassword ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Şifreler eşleşiyor</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" />
                  <span>Şifreler eşleşmiyor</span>
                </>
              )}
            </div>
          )}

          {/* Hata Mesajı */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

          {/* Güvenlik Bilgisi */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-sm text-blue-800">
              <div className="font-medium mb-1">🔒 Güvenlik Önerileri:</div>
              <ul className="space-y-1 text-xs">
                <li>• En az 8 karakter kullanın</li>
                <li>• Büyük-küçük harf, rakam ve özel karakter ekleyin</li>
                <li>• Kolay tahmin edilebilir şifreler kullanmayın</li>
                <li>• Şifrenizi kimseyle paylaşmayın</li>
              </ul>
            </div>
          </div>

          {/* Butonlar */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                onClose();
                resetForm();
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              disabled={loading}
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading || !formData.newPassword || !formData.confirmPassword || 
                       (!isAdminChangingOtherUser && !formData.currentPassword) ||
                       formData.newPassword !== formData.confirmPassword}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Değiştiriliyor...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Şifreyi Değiştir
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordChangeModal;