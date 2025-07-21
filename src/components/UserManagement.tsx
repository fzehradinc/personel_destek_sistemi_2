import React, { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Edit, Trash2, Eye, EyeOff, UserPlus, Shield, Calendar, Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { User } from '../types/user';
import { useAuth } from '../contexts/AuthContext';

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [excelImportLoading, setExcelImportLoading] = useState(false);
  const [importResults, setImportResults] = useState<{
    success: boolean;
    message: string;
    addedCount: number;
    errors: string[];
  } | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { getAllUsers, addUser, updateUser } = useAuth();

  // Kullanıcıları yükle
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const userList = await getAllUsers();
      setUsers(userList);
      console.log('✅ [USER-MANAGEMENT] Kullanıcı listesi yüklendi:', userList.length);
    } catch (error) {
      console.error('❌ Kullanıcılar yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  }, [getAllUsers]);

  // Kullanıcı listesini yenile
  const refreshUserList = useCallback(() => {
    console.log('🔄 [USER-MANAGEMENT] Kullanıcı listesi yenileniyor...');
    setRefreshTrigger(prev => prev + 1);
  }, []);
  useEffect(() => {
    loadUsers();
  }, [loadUsers, refreshTrigger]);

  // Excel dosyası yükleme fonksiyonu
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelImportLoading(true);
    setImportResults(null);

    try {
      console.log('📊 [USER-MANAGEMENT] Excel dosyası işleniyor:', file.name);
      
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet) as any[];

      console.log('📋 [USER-MANAGEMENT] Excel verisi:', jsonData);

      // Excel verilerini User formatına çevir
      const users: Omit<User, 'id' | 'createdAt'>[] = [];
      const errors: string[] = [];

      jsonData.forEach((row, index) => {
        try {
          // Zorunlu alanları kontrol et
          if (!row['Kullanıcı Adı'] || !row['Şifre'] || !row['Ad Soyad']) {
            errors.push(`Satır ${index + 2}: Kullanıcı Adı, Şifre ve Ad Soyad zorunludur`);
            return;
          }

          // Rol kontrolü
          const role = row['Rol']?.toString().toLowerCase();
          if (role !== 'admin' && role !== 'personel') {
            errors.push(`Satır ${index + 2}: Rol 'admin' veya 'personel' olmalıdır`);
            return;
          }

          // Aktiflik durumu kontrolü
          let isActive = true;
          if (row['Aktiflik Durumu'] !== undefined) {
            const activeValue = row['Aktiflik Durumu']?.toString().toLowerCase();
            isActive = activeValue === 'true' || activeValue === '1' || activeValue === 'aktif';
          }

          const user: Omit<User, 'id' | 'createdAt'> = {
            username: row['Kullanıcı Adı'].toString().trim(),
            password: row['Şifre'].toString().trim(),
            name: row['Ad Soyad'].toString().trim(),
            email: row['E-posta']?.toString().trim() || '',
            department: row['Departman']?.toString().trim() || '',
            role: role as 'admin' | 'personel',
            isActive
          };

          users.push(user);
        } catch (error) {
          errors.push(`Satır ${index + 2}: Veri işleme hatası - ${(error as Error).message}`);
        }
      });

      console.log('👥 [USER-MANAGEMENT] İşlenen kullanıcılar:', users.length);
      console.log('❌ [USER-MANAGEMENT] Hatalar:', errors.length);

      if (users.length === 0) {
        setImportResults({
          success: false,
          message: 'Excel dosyasında geçerli kullanıcı verisi bulunamadı',
          addedCount: 0,
          errors
        });
        return;
      }

      // Kullanıcıları toplu olarak ekle
      let addedCount = 0;
      const addErrors: string[] = [...errors];

      for (const user of users) {
        try {
          const result = await addUser(user);
          if (result.success) {
            addedCount++;
          } else {
            addErrors.push(`${user.username}: ${result.message}`);
          }
        } catch (error) {
          addErrors.push(`${user.username}: ${(error as Error).message}`);
        }
      }

      setImportResults({
        success: addedCount > 0,
        message: addedCount > 0 
          ? `${addedCount} kullanıcı başarıyla eklendi${addErrors.length > 0 ? `, ${addErrors.length} hata oluştu` : ''}`
          : 'Hiçbir kullanıcı eklenemedi',
        addedCount,
        errors: addErrors
      });

      // Liste güncelle
      if (addedCount > 0) {
        refreshUserList();
      }

    } catch (error) {
      console.error('❌ [USER-MANAGEMENT] Excel işleme hatası:', error);
      setImportResults({
        success: false,
        message: 'Excel dosyası işlenirken hata oluştu',
        addedCount: 0,
        errors: [(error as Error).message]
      });
    } finally {
      setExcelImportLoading(false);
      // Input'u temizle
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  // Excel template indirme
  const downloadExcelTemplate = () => {
    const templateData = [
      {
        'Kullanıcı Adı': 'ornek_kullanici',
        'Şifre': 'sifre123',
        'Ad Soyad': 'Örnek Kullanıcı',
        'E-posta': 'ornek@company.com',
        'Departman': 'IT',
        'Rol': 'personel',
        'Aktiflik Durumu': 'true'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kullanıcılar');
    
    // Sütun genişliklerini ayarla
    ws['!cols'] = [
      { wch: 15 }, // Kullanıcı Adı
      { wch: 12 }, // Şifre
      { wch: 20 }, // Ad Soyad
      { wch: 25 }, // E-posta
      { wch: 15 }, // Departman
      { wch: 10 }, // Rol
      { wch: 15 }  // Aktiflik Durumu
    ];

    XLSX.writeFile(wb, 'kullanici_sablonu.xlsx');
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Kullanıcı Yönetimi</h1>
                <p className="text-gray-600">Sistem kullanıcılarını yönetin ve yetkilendirin</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowExcelImport(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <FileSpreadsheet className="w-5 h-5" />
                Excel İmport
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <UserPlus className="w-5 h-5" />
                Yeni Kullanıcı
              </button>
            </div>
          </div>

          {/* İstatistikler */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Toplam Kullanıcı</span>
              </div>
              <div className="text-2xl font-bold text-blue-600 mt-1">
                {users.length}
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Admin</span>
              </div>
              <div className="text-2xl font-bold text-purple-600 mt-1">
                {users.filter(u => u.role === 'admin').length}
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Personel</span>
              </div>
              <div className="text-2xl font-bold text-green-600 mt-1">
                {users.filter(u => u.role === 'personel').length}
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-900">Aktif</span>
              </div>
              <div className="text-2xl font-bold text-orange-600 mt-1">
                {users.filter(u => u.isActive).length}
              </div>
            </div>
          </div>
        </div>

        {/* Excel Import Sonuçları */}
        {importResults && (
          <div className={`rounded-lg shadow-sm border p-6 mb-6 ${
            importResults.success 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start gap-3">
              {importResults.success ? (
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h3 className={`font-medium mb-2 ${
                  importResults.success ? 'text-green-900' : 'text-red-900'
                }`}>
                  Excel Import Sonucu
                </h3>
                <p className={`mb-3 ${
                  importResults.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {importResults.message}
                </p>
                
                {importResults.addedCount > 0 && (
                  <div className="bg-white rounded-lg p-3 mb-3">
                    <div className="text-sm font-medium text-gray-900 mb-1">
                      ✅ Başarıyla Eklenen: {importResults.addedCount} kullanıcı
                    </div>
                  </div>
                )}

                {importResults.errors.length > 0 && (
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-sm font-medium text-gray-900 mb-2">
                      ❌ Hatalar ({importResults.errors.length}):
                    </div>
                    <div className="text-xs text-gray-700 space-y-1 max-h-32 overflow-y-auto">
                      {importResults.errors.map((error, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <span className="text-red-500 flex-shrink-0">•</span>
                          <span>{error}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setImportResults(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Kullanıcı Listesi */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Kullanıcı Listesi</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <div className="text-gray-600">Kullanıcılar yükleniyor...</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kullanıcı
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Son Giriş
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                              <span className="text-white font-medium text-sm">
                                {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">@{user.username}</div>
                            {user.email && (
                              <div className="text-xs text-gray-400">{user.email}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {user.role === 'admin' ? (
                            <>
                              <Shield className="w-3 h-3 mr-1" />
                              Admin
                            </>
                          ) : (
                            <>
                              <Users className="w-3 h-3 mr-1" />
                              Personel
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.department || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.lastLogin ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(user.lastLogin).toLocaleDateString('tr-TR')}
                          </div>
                        ) : (
                          'Hiç giriş yapmamış'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.isActive ? (
                            <>
                              <Eye className="w-3 h-3 mr-1" />
                              Aktif
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3 mr-1" />
                              Pasif
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingUser(user)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded"
                            title="Düzenle"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`${user.name} kullanıcısını ${user.isActive ? 'pasif' : 'aktif'} yapmak istediğinizden emin misiniz?`)) {
                                updateUser(user.id, { isActive: !user.isActive }).then(() => {
                                  loadUsers();
                                });
                              }
                            }}
                            className={`p-1 rounded ${
                              user.isActive 
                                ? 'text-red-600 hover:text-red-900' 
                                : 'text-green-600 hover:text-green-900'
                            }`}
                            title={user.isActive ? 'Pasif Yap' : 'Aktif Yap'}
                          >
                            {user.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Kullanıcı Ekleme/Düzenleme Modal */}
        <UserModal
          isOpen={showAddModal || !!editingUser}
          onClose={() => {
            setShowAddModal(false);
            setEditingUser(null);
          }}
          user={editingUser}
          onSave={async (userData) => {
            setLoading(true);
            try {
              let result;
            if (editingUser) {
                result = await updateUser(editingUser.id, userData);
            } else {
                result = await addUser(userData);
            }
              
              if (result.success) {
                console.log('✅ [USER-MANAGEMENT] Kullanıcı işlemi başarılı:', result.message);
                
                // Modal'ı kapat
            setShowAddModal(false);
            setEditingUser(null);
                
                // Listeyi yenile
                refreshUserList();
                
                // Başarı bildirimi
                alert(`✅ ${editingUser ? 'Kullanıcı güncellendi' : 'Kullanıcı eklendi'}: ${result.message}`);
              } else {
                console.error('❌ [USER-MANAGEMENT] Kullanıcı işlemi başarısız:', result.message);
                alert(`❌ Hata: ${result.message}`);
              }
            } catch (error) {
              console.error('❌ [USER-MANAGEMENT] Kullanıcı işlemi hatası:', error);
              alert('❌ İşlem sırasında beklenmeyen bir hata oluştu.');
            } finally {
              setLoading(false);
            }
          }}
          loading={loading}
        />

        {/* Excel Import Modal */}
        <ExcelImportModal
          isOpen={showExcelImport}
          onClose={() => setShowExcelImport(false)}
          onFileUpload={handleExcelUpload}
          loading={excelImportLoading}
          onDownloadTemplate={downloadExcelTemplate}
        />
      </div>
    </div>
  );
};

// Kullanıcı Modal Bileşeni
const UserModal = ({ 
  isOpen, 
  onClose, 
  user, 
  onSave,
  loading
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  user: User | null; 
  onSave: (userData: Omit<User, 'id' | 'createdAt'>) => void;
  loading?: boolean;
}) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    role: 'personel' as 'admin' | 'personel',
    isActive: true
  });

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        password: '', // Şifre güvenlik için boş bırakılır
        name: user.name,
        role: user.role,
        isActive: user.isActive
      });
    } else {
      setFormData({
        username: '',
        password: '',
        name: '',
        role: 'personel',
        isActive: true
      });
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Form validasyonu
    if (!formData.username.trim() || !formData.name.trim()) {
      alert('❌ Kullanıcı adı ve ad soyad zorunludur.');
      return;
    }
    
    if (!user && !formData.password.trim()) {
      alert('❌ Yeni kullanıcı için şifre zorunludur.');
      return;
    }
    
    console.log('📝 [USER-MODAL] Form gönderiliyor:', {
      username: formData.username,
      name: formData.name,
      role: formData.role,
      isEdit: !!user
    });
    
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {user ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Ekle'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kullanıcı Adı
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {!user && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Şifre
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ad Soyad
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rol
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as 'admin' | 'personel' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="personel">Personel</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
              Aktif kullanıcı
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {user ? 'Güncelleniyor...' : 'Ekleniyor...'}
                </>
              ) : (
                user ? 'Güncelle' : 'Ekle'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Excel Import Modal Bileşeni
const ExcelImportModal = ({ 
  isOpen, 
  onClose, 
  onFileUpload,
  loading,
  onDownloadTemplate
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  loading: boolean;
  onDownloadTemplate: () => void;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <FileSpreadsheet className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Excel'den Kullanıcı İmport</h3>
                <p className="text-sm text-gray-600">Toplu kullanıcı ekleme işlemi</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2"
              disabled={loading}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Excel Format Bilgisi */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              📋 Excel Dosyası Format Gereksinimleri
            </h4>
            <div className="text-sm text-blue-800 space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="font-medium mb-1">Zorunlu Sütunlar:</div>
                  <ul className="space-y-1 text-xs">
                    <li>• <strong>Kullanıcı Adı</strong> (benzersiz olmalı)</li>
                    <li>• <strong>Şifre</strong> (minimum 3 karakter)</li>
                    <li>• <strong>Ad Soyad</strong> (tam ad)</li>
                  </ul>
                </div>
                <div>
                  <div className="font-medium mb-1">Opsiyonel Sütunlar:</div>
                  <ul className="space-y-1 text-xs">
                    <li>• <strong>E-posta</strong> (geçerli format)</li>
                    <li>• <strong>Departman</strong> (metin)</li>
                    <li>• <strong>Rol</strong> (admin/personel)</li>
                    <li>• <strong>Aktiflik Durumu</strong> (true/false)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Template İndirme */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 mb-1">📄 Excel Şablonu</h4>
                <p className="text-sm text-gray-600">
                  Doğru format için örnek Excel dosyasını indirin
                </p>
              </div>
              <button
                onClick={onDownloadTemplate}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                disabled={loading}
              >
                <Download className="w-4 h-4" />
                Şablon İndir
              </button>
            </div>
          </div>

          {/* Dosya Yükleme */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <div className="mb-4">
              <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                Excel Dosyası Seçin
              </h4>
              <p className="text-gray-600 text-sm">
                .xlsx veya .xls formatında dosya yükleyebilirsiniz
              </p>
            </div>

            <label className="inline-block">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={onFileUpload}
                className="hidden"
                disabled={loading}
              />
              <div className={`
                px-6 py-3 rounded-lg font-medium transition-colors cursor-pointer inline-flex items-center gap-2
                ${loading 
                  ? 'bg-gray-400 text-white cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
                }
              `}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    İşleniyor...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Dosya Seç ve Yükle
                  </>
                )}
              </div>
            </label>
          </div>

          {/* Uyarılar */}
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <div className="font-medium mb-1">⚠️ Önemli Notlar:</div>
                <ul className="space-y-1 text-xs">
                  <li>• Aynı kullanıcı adına sahip kayıtlar atlanacaktır</li>
                  <li>• Hatalı formatdaki satırlar işlenmeyecektir</li>
                  <li>• İşlem sonrası detaylı rapor gösterilecektir</li>
                  <li>• Büyük dosyalar için işlem biraz zaman alabilir</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors font-medium"
            disabled={loading}
          >
            {loading ? 'İşlem devam ediyor...' : 'Kapat'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;