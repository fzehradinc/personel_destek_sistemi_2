import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Eye, EyeOff, UserPlus, Shield, Calendar } from 'lucide-react';
import { User } from '../types/user';
import { useAuth } from '../hooks/useAuth';

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { getAllUsers, addUser, updateUser } = useAuth();

  // Kullanıcıları yükle
  const loadUsers = async () => {
    setLoading(true);
    try {
      const userList = await getAllUsers();
      setUsers(userList);
    } catch (error) {
      console.error('❌ Kullanıcılar yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

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
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              Yeni Kullanıcı
            </button>
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
                      Departman
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
            if (editingUser) {
              await updateUser(editingUser.id, userData);
            } else {
              await addUser(userData);
            }
            setShowAddModal(false);
            setEditingUser(null);
            loadUsers();
          }}
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
  onSave 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  user: User | null; 
  onSave: (userData: Omit<User, 'id' | 'createdAt'>) => void; 
}) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    department: '',
    role: 'personel' as 'admin' | 'personel',
    isActive: true
  });

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        password: '', // Şifre güvenlik için boş bırakılır
        name: user.name,
        email: user.email || '',
        department: user.department || '',
        role: user.role,
        isActive: user.isActive
      });
    } else {
      setFormData({
        username: '',
        password: '',
        name: '',
        email: '',
        department: '',
        role: 'personel',
        isActive: true
      });
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
              E-posta
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Departman
            </label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              {user ? 'Güncelle' : 'Ekle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserManagement;