import { useState, useEffect, useCallback } from 'react';
import { User, UserSession } from '../types/user';
import { useElectronStorage } from './useElectronStorage';

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const storage = useElectronStorage();

  // Varsayılan kullanıcıları oluştur
  const createDefaultUsers = useCallback(async () => {
    const defaultUsers: User[] = [
      {
        id: 'admin-001',
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        name: 'Sistem Yöneticisi',
        email: 'admin@company.com',
        department: 'IT',
        createdAt: new Date().toISOString(),
        isActive: true
      },
      {
        id: 'user-001',
        username: 'personel1',
        password: 'personel123',
        role: 'personel',
        name: 'Ahmet Yılmaz',
        email: 'ahmet.yilmaz@company.com',
        department: 'Entegrasyon',
        createdAt: new Date().toISOString(),
        isActive: true
      },
      {
        id: 'user-002',
        username: 'personel2',
        password: 'personel123',
        role: 'personel',
        name: 'Ayşe Demir',
        email: 'ayse.demir@company.com',
        department: 'Kalite Kontrol',
        createdAt: new Date().toISOString(),
        isActive: true
      }
    ];

    await storage.writeJsonFile('users.json', defaultUsers);
    console.log('✅ Varsayılan kullanıcılar oluşturuldu');
    return defaultUsers;
  }, [storage]);

  // Kullanıcıları yükle
  const loadUsers = useCallback(async (): Promise<User[]> => {
    try {
      let users = await storage.readJsonFile('users.json');
      if (!users || !Array.isArray(users) || users.length === 0) {
        users = await createDefaultUsers();
      }
      return users;
    } catch (error) {
      console.error('❌ Kullanıcılar yüklenirken hata:', error);
      return await createDefaultUsers();
    }
  }, [storage, createDefaultUsers]);

  // Oturum kontrolü
  const checkSession = useCallback(async () => {
    try {
      const session = await storage.readJsonFile('user_session.json') as UserSession | null;
      
      if (session && new Date(session.expiresAt) > new Date()) {
        // Oturum geçerli
        setCurrentUser(session.user);
        console.log('✅ Geçerli oturum bulundu:', session.user.username);
      } else {
        // Oturum süresi dolmuş veya yok
        if (session) {
          await storage.writeJsonFile('user_session.json', null);
        }
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('❌ Oturum kontrolü hatası:', error);
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [storage]);

  // Giriş yapma
  const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      const users = await loadUsers();
      const user = users.find(u => u.username === username && u.password === password && u.isActive);

      if (!user) {
        return { success: false, message: 'Kullanıcı adı veya şifre hatalı' };
      }

      // Oturum oluştur (24 saat geçerli)
      const session: UserSession = {
        user: {
          ...user,
          lastLogin: new Date().toISOString()
        },
        loginTime: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 saat
      };

      await storage.writeJsonFile('user_session.json', session);
      
      // Son giriş tarihini güncelle
      const updatedUsers = users.map(u => 
        u.id === user.id ? { ...u, lastLogin: session.loginTime } : u
      );
      await storage.writeJsonFile('users.json', updatedUsers);

      setCurrentUser(session.user);
      console.log('✅ Giriş başarılı:', user.username);
      
      return { success: true, message: 'Giriş başarılı' };
    } catch (error) {
      console.error('❌ Giriş hatası:', error);
      return { success: false, message: 'Giriş sırasında hata oluştu' };
    }
  }, [loadUsers, storage]);

  // Çıkış yapma
  const logout = useCallback(async () => {
    try {
      await storage.writeJsonFile('user_session.json', null);
      setCurrentUser(null);
      console.log('✅ Çıkış yapıldı');
    } catch (error) {
      console.error('❌ Çıkış hatası:', error);
    }
  }, [storage]);

  // Kullanıcı ekleme (sadece admin)
  const addUser = useCallback(async (userData: Omit<User, 'id' | 'createdAt'>): Promise<{ success: boolean; message: string }> => {
    if (currentUser?.role !== 'admin') {
      return { success: false, message: 'Yetkiniz yok' };
    }

    try {
      const users = await loadUsers();
      
      // Kullanıcı adı kontrolü
      if (users.some(u => u.username === userData.username)) {
        return { success: false, message: 'Bu kullanıcı adı zaten kullanılıyor' };
      }

      const newUser: User = {
        ...userData,
        id: `user-${Date.now()}`,
        createdAt: new Date().toISOString()
      };

      const updatedUsers = [...users, newUser];
      await storage.writeJsonFile('users.json', updatedUsers);
      
      return { success: true, message: 'Kullanıcı başarıyla eklendi' };
    } catch (error) {
      console.error('❌ Kullanıcı ekleme hatası:', error);
      return { success: false, message: 'Kullanıcı eklenirken hata oluştu' };
    }
  }, [currentUser, loadUsers, storage]);

  // Kullanıcı güncelleme (sadece admin)
  const updateUser = useCallback(async (userId: string, updates: Partial<User>): Promise<{ success: boolean; message: string }> => {
    if (currentUser?.role !== 'admin') {
      return { success: false, message: 'Yetkiniz yok' };
    }

    try {
      const users = await loadUsers();
      const userIndex = users.findIndex(u => u.id === userId);
      
      if (userIndex === -1) {
        return { success: false, message: 'Kullanıcı bulunamadı' };
      }

      users[userIndex] = { ...users[userIndex], ...updates };
      await storage.writeJsonFile('users.json', users);
      
      return { success: true, message: 'Kullanıcı başarıyla güncellendi' };
    } catch (error) {
      console.error('❌ Kullanıcı güncelleme hatası:', error);
      return { success: false, message: 'Kullanıcı güncellenirken hata oluştu' };
    }
  }, [currentUser, loadUsers, storage]);

  // Tüm kullanıcıları getir (sadece admin)
  const getAllUsers = useCallback(async (): Promise<User[]> => {
    if (currentUser?.role !== 'admin') {
      return [];
    }
    return await loadUsers();
  }, [currentUser, loadUsers]);

  // İlk yükleme
  useEffect(() => {
    if (storage.isReady && !currentUser && !isLoading) {
      checkSession();
    }
  }, [storage.isReady, currentUser, isLoading, checkSession]);

  return {
    currentUser,
    isLoading,
    login,
    logout,
    addUser,
    updateUser,
    getAllUsers,
    isAdmin: currentUser?.role === 'admin',
    isPersonel: currentUser?.role === 'personel'
  };
};