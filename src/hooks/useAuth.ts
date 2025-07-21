import { useState, useEffect, useCallback, useRef } from 'react';
import { User, UserSession } from '../types/user';
import { useWebStorage } from './useWebStorage';

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const storage = useWebStorage();
  
  // Performans: İlk yükleme kontrolü için ref kullan
  const hasInitialized = useRef(false);
  const isCheckingSession = useRef(false);
  
  // Performans: Varsayılan kullanıcıları memoize et
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

  // Performans: Varsayılan kullanıcıları oluştur - deps olmadan
  const createDefaultUsers = useCallback(async () => {
    console.log('🔄 [AUTH] Varsayılan kullanıcılar oluşturuluyor...');
    try {
      await storage.writeJsonFile('users.json', defaultUsers);
      console.log('✅ [AUTH] Varsayılan kullanıcılar oluşturuldu');
      return defaultUsers;
    } catch (error) {
      console.error('❌ [AUTH] Varsayılan kullanıcı oluşturma hatası:', error);
      throw error;
    }
  }, []); // Deps yok - sadece ilk oluşturulduğunda

  // Performans: Kullanıcıları yükle - optimize edilmiş
  const loadUsers = useCallback(async (): Promise<User[]> => {
    console.log('🔄 [AUTH] Kullanıcılar yükleniyor...');
    try {
      const users = await storage.readJsonFile('users.json');
      
      if (!users || !Array.isArray(users) || users.length === 0) {
        console.log('⚠️ [AUTH] Kullanıcı verisi bulunamadı, varsayılanlar oluşturuluyor');
        return await createDefaultUsers();
      }
      
      console.log('✅ [AUTH] Kullanıcılar başarıyla yüklendi:', users.length);
      return users;
    } catch (error) {
      console.error('❌ [AUTH] Kullanıcı yükleme hatası:', error);
      console.log('🔄 [AUTH] Varsayılan kullanıcılar oluşturuluyor...');
      return await createDefaultUsers();
    }
  }, [createDefaultUsers]);

  // Performans: Oturum kontrolü - tekrar etmeyi önle
  const checkSession = useCallback(async () => {
    if (isCheckingSession.current) {
      console.log('⏭️ [AUTH] Oturum kontrolü zaten devam ediyor, atlaniyor');
      return;
    }

    isCheckingSession.current = true;
    console.log('🔄 [AUTH] Oturum kontrol ediliyor...');
    
    try {
      const session = await storage.readJsonFile('user_session.json') as UserSession | null;
      
      if (session && new Date(session.expiresAt) > new Date()) {
        console.log('✅ [AUTH] Geçerli oturum bulundu:', session.user.username);
        setCurrentUser(session.user);
      } else {
        console.log('⚠️ [AUTH] Oturum bulunamadı veya süresi dolmuş');
        if (session) {
          await storage.writeJsonFile('user_session.json', null);
        }
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('❌ [AUTH] Oturum kontrolü hatası:', error);
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
      isCheckingSession.current = false;
      hasInitialized.current = true;
      console.log('✅ [AUTH] Oturum kontrolü tamamlandı');
    }
  }, []); // Deps yok - sadece storage işlemi

  // Performans: Giriş yapma - optimize edilmiş
  const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; message: string }> => {
    console.log('🔄 [AUTH] Giriş işlemi başlatılıyor:', username);
    setIsLoading(true);
    
    try {
      const users = await loadUsers();
      const user = users.find(u => u.username === username && u.password === password && u.isActive);

      if (!user) {
        console.log('❌ [AUTH] Giriş başarısız: Geçersiz kimlik bilgileri');
        return { success: false, message: 'Kullanıcı adı veya şifre hatalı' };
      }

      const loginTime = new Date().toISOString();
      const session: UserSession = {
        user: {
          ...user,
          lastLogin: loginTime
        },
        loginTime,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      await storage.writeJsonFile('user_session.json', session);
      
      // Son giriş tarihini güncelle
      const updatedUsers = users.map(u => 
        u.id === user.id ? { ...u, lastLogin: loginTime } : u
      );
      await storage.writeJsonFile('users.json', updatedUsers);

      setCurrentUser(session.user);
      console.log('✅ [AUTH] Giriş başarılı:', user.username);
      
      return { success: true, message: 'Giriş başarılı' };
    } catch (error) {
      console.error('❌ [AUTH] Giriş hatası:', error);
      return { success: false, message: 'Giriş sırasında hata oluştu' };
    } finally {
      setIsLoading(false);
    }
  }, [loadUsers]);

  // Performans: Çıkış yapma - basitleştirilmiş
  const logout = useCallback(async () => {
    console.log('🔄 [AUTH] Çıkış işlemi başlatılıyor...');
    try {
      await storage.writeJsonFile('user_session.json', null);
      setCurrentUser(null);
      console.log('✅ [AUTH] Çıkış başarılı');
    } catch (error) {
      console.error('❌ [AUTH] Çıkış hatası:', error);
    }
  }, []);

  // Performans: Kullanıcı ekleme - optimize edilmiş
  const addUser = useCallback(async (userData: Omit<User, 'id' | 'createdAt'>): Promise<{ success: boolean; message: string }> => {
    if (currentUser?.role !== 'admin') {
      return { success: false, message: 'Yetkiniz yok' };
    }

    console.log('🔄 [AUTH] Yeni kullanıcı ekleniyor:', {
      username: userData.username,
      name: userData.name,
      role: userData.role
    });
    
    try {
      const users = await loadUsers();
      
      if (users.some(u => u.username === userData.username)) {
        console.log('❌ [AUTH] Kullanıcı adı zaten mevcut:', userData.username);
        return { success: false, message: 'Bu kullanıcı adı zaten kullanılıyor' };
      }

      const newUser: User = {
        ...userData,
        id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString()
      };

      const updatedUsers = [...users, newUser];
      await storage.writeJsonFile('users.json', updatedUsers);
      
      console.log('✅ [AUTH] Kullanıcı başarıyla eklendi:', {
        id: newUser.id,
        username: newUser.username,
        name: newUser.name,
        role: newUser.role
      });
      return { success: true, message: 'Kullanıcı başarıyla eklendi' };
    } catch (error) {
      console.error('❌ [AUTH] Kullanıcı ekleme hatası:', error);
      return { success: false, message: 'Kullanıcı eklenirken hata oluştu' };
    }
  }, [currentUser?.role, loadUsers]);

  // Performans: Kullanıcı güncelleme - optimize edilmiş
  const updateUser = useCallback(async (userId: string, updates: Partial<User>): Promise<{ success: boolean; message: string }> => {
    if (currentUser?.role !== 'admin') {
      return { success: false, message: 'Yetkiniz yok' };
    }

    console.log('🔄 [AUTH] Kullanıcı güncelleniyor:', {
      userId,
      updates: Object.keys(updates)
    });
    
    try {
      const users = await loadUsers();
      const userIndex = users.findIndex(u => u.id === userId);
      
      if (userIndex === -1) {
        console.log('❌ [AUTH] Kullanıcı bulunamadı:', userId);
        return { success: false, message: 'Kullanıcı bulunamadı' };
      }

      // Şifre boşsa mevcut şifreyi koru
      const updateData = { ...updates };
      if (updateData.password === '') {
        delete updateData.password;
      }
      
      users[userIndex] = { ...users[userIndex], ...updateData };
      await storage.writeJsonFile('users.json', users);
      
      console.log('✅ [AUTH] Kullanıcı başarıyla güncellendi:', {
        userId,
        username: users[userIndex].username
      });
      return { success: true, message: 'Kullanıcı başarıyla güncellendi' };
    } catch (error) {
      console.error('❌ [AUTH] Kullanıcı güncelleme hatası:', error);
      return { success: false, message: 'Kullanıcı güncellenirken hata oluştu' };
    }
  }, [currentUser?.role, loadUsers]);

  // Performans: Tüm kullanıcıları getir - basitleştirilmiş
  const getAllUsers = useCallback(async (): Promise<User[]> => {
    if (currentUser?.role !== 'admin') {
      console.log('⚠️ [AUTH] Admin yetkisi gerekli');
      return [];
    }
    return await loadUsers();
  }, [currentUser?.role, loadUsers]);

  // Şifre değiştirme fonksiyonu
  const changePasswordByUsername = useCallback(async (username: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    console.log('🔄 [AUTH] Şifre değiştirme işlemi başlatılıyor:', username);
    
    try {
      const users = await loadUsers();
      const user = users.find(u => u.username === username && u.isActive);

      if (!user) {
        console.log('❌ [AUTH] Kullanıcı bulunamadı:', username);
        return { success: false, message: 'Kullanıcı bulunamadı' };
      }

      if (user.password !== currentPassword) {
        console.log('❌ [AUTH] Mevcut şifre hatalı');
        return { success: false, message: 'Mevcut şifre hatalı' };
      }

      // Şifreyi güncelle
      const updatedUsers = users.map(u => 
        u.id === user.id ? { ...u, password: newPassword } : u
      );
      await storage.writeJsonFile('users.json', updatedUsers);

      // Eğer giriş yapmış kullanıcının şifresi değiştiriliyorsa session'ı güncelle
      if (currentUser && currentUser.username === username) {
        const updatedUser = { ...currentUser, password: newPassword };
        const session: UserSession = {
          user: updatedUser,
          loginTime: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };
        await storage.writeJsonFile('user_session.json', session);
        setCurrentUser(updatedUser);
      }
      
      console.log('✅ [AUTH] Şifre başarıyla değiştirildi:', username);
      return { success: true, message: 'Şifre başarıyla değiştirildi' };
    } catch (error) {
      console.error('❌ [AUTH] Şifre değiştirme hatası:', error);
      return { success: false, message: 'Şifre değiştirilirken hata oluştu' };
    }
  }, [loadUsers, currentUser]);

  // Kullanıcı silme fonksiyonu
  const deleteUser = useCallback(async (userId: string): Promise<{ success: boolean; message: string }> => {
    if (currentUser?.role !== 'admin') {
      return { success: false, message: 'Yetkiniz yok' };
    }

    console.log('🗑️ [AUTH] Kullanıcı siliniyor:', userId);
    
    try {
      const users = await loadUsers();
      const userToDelete = users.find(u => u.id === userId);
      
      if (!userToDelete) {
        return { success: false, message: 'Kullanıcı bulunamadı' };
      }

      // Admin'in kendini silmesini engelle
      if (userToDelete.username === 'admin' && userToDelete.role === 'admin') {
        return { success: false, message: 'Sistem yöneticisi hesabı silinemez' };
      }

      const updatedUsers = users.filter(u => u.id !== userId);
      await storage.writeJsonFile('users.json', updatedUsers);
      
      console.log('✅ [AUTH] Kullanıcı başarıyla silindi:', {
        userId,
        username: userToDelete.username
      });
      return { success: true, message: 'Kullanıcı başarıyla silindi' };
    } catch (error) {
      console.error('❌ [AUTH] Kullanıcı silme hatası:', error);
      return { success: false, message: 'Kullanıcı silinirken hata oluştu' };
    }
  }, [currentUser?.role, loadUsers]);
  // Performans: İlk yükleme - sadece bir kez çalışacak şekilde optimize
  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      if (hasInitialized.current || !storage.isReady || isCheckingSession.current) {
        return;
      }

      console.log('🚀 [AUTH] Auth sistemi başlatılıyor...');
      
      if (isMounted) {
        await checkSession();
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, [storage.isReady]); // Sadece storage.isReady'yi dinle

  return {
    currentUser,
    isLoading,
    login,
    logout,
    addUser,
    updateUser,
    deleteUser,
    getAllUsers,
    changePasswordByUsername,
    changePasswordByUsername,
    isAdmin: currentUser?.role === 'admin',
    isPersonel: currentUser?.role === 'personel'
  };
};