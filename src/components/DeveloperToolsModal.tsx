import React, { useState, useRef, useEffect } from 'react';
import { X, Lock, AlertTriangle, Settings } from 'lucide-react';

interface DeveloperToolsModalProps {
  showPasswordModal: boolean;
  showConfirmModal: boolean;
  onPasswordConfirm: (password: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeveloperToolsModal: React.FC<DeveloperToolsModalProps> = ({
  showPasswordModal,
  showConfirmModal,
  onPasswordConfirm,
  onConfirm,
  onCancel
}) => {
  const [password, setPassword] = useState('');
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Password modal açıldığında input'a focus
  useEffect(() => {
    if (showPasswordModal && passwordInputRef.current) {
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 100);
    }
  }, [showPasswordModal]);

  // Enter tuşu ile onay
  const handlePasswordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePasswordSubmit();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handlePasswordSubmit = () => {
    onPasswordConfirm(password);
    setPassword('');
  };

  // Şifre Modal
  if (showPasswordModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Lock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Geliştirici Araçları</h3>
                <p className="text-sm text-gray-600">Güvenlik doğrulaması gerekli</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🔑 Geliştirici Şifresi
              </label>
              <input
                ref={passwordInputRef}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handlePasswordKeyDown}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Şifreyi girin..."
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="text-sm text-blue-800">
                <div className="font-medium mb-1">ℹ️ Bilgi:</div>
                <div>Bu işlem tüm modül yayın durumlarını sıfırlayacaktır.</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors font-medium"
            >
              İptal
            </button>
            <button
              onClick={handlePasswordSubmit}
              disabled={!password.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Doğrula
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Onay Modal
  if (showConfirmModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="bg-orange-100 p-2 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Yayın Durumu Temizleme</h3>
                <p className="text-sm text-gray-600">Bu işlem geri alınamaz</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-orange-800">
                  <div className="font-medium mb-2">⚠️ Bu işlem şunları yapacaktır:</div>
                  <div className="space-y-1">
                    <div>• Tüm organizasyon modülleri yayından kaldırılacak</div>
                    <div>• Eğitim materyalleri modülü yayından kaldırılacak</div>
                    <div>• Süreç akışları modülü yayından kaldırılacak</div>
                    <div>• Prosedür ve talimatlar modülü yayından kaldırılacak</div>
                    <div>• SSS modülü yayından kaldırılacak</div>
                    <div>• Ana sayfa içerikleri yayından kaldırılacak</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Settings className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <div className="font-medium mb-2">🔄 Sistem Değişiklikleri:</div>
                  <div className="space-y-1">
                    <div>• Sayfa otomatik olarak yenilenecek</div>
                    <div>• Tüm modüller düzenleme modunda açılacak</div>
                    <div>• Yayın durumları sıfırlanacak</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors font-medium"
            >
              İptal
            </button>
            <button
              onClick={onConfirm}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              Onayla ve Temizle
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default DeveloperToolsModal;