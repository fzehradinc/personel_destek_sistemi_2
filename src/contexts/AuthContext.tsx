import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { User, UserSession } from '../types/user';
import { useWebStorage } from '../hooks/useWebStorage';

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  addUser: (userData: Omit<User, 'id' | 'createdAt'>) => Promise<{ success: boolean; message: string }>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<{ success: boolean; message: string }>;
  getAllUsers: () => Promise<User[]>;
  isAdmin: boolean;
  isPersonel: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const storage = useWebStorage();
  
  // Refs to prevent multiple initialization and double effects
  const initRef = useRef(false);
  const sessionCheckRef = useRef(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Varsayılan kullanıcıları oluştur - Memoized
  const createDefaultUsers = useCallback(async (): Promise<User[]> => {
    console.time('⏱️ [AUTH] Varsayılan kullanıcılar');
    
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

    try {
      await storage.writeJsonFile('users.json', defaultUsers);
      console.timeEnd('⏱️ [AUTH] Varsayılan kullanıcılar');
      console.log('✅ [AUTH] Varsayılan kullanıcılar oluşturuldu');
      return defaultUsers;
    } catch (error) {
      console.error('❌ [AUTH] Varsayılan kullanıcılar oluşturulamadı:', error);
      console.timeEnd('⏱️ [AUTH] Varsayılan kullanıcılar');
      return defaultUsers; // En azından memory'de dön
    }
  }, [storage]);

  // Kullanıcıları yükle - Cache optimize edilmiş
  const loadUsers = useCallback(async (): Promise<User[]> => {
    if (!storage.isReady) {
      console.warn('⚠️ [AUTH] Storage henüz hazır değil');
      return [];
    }

    console.time('⏱️ [AUTH] Kullanıcılar yükleme');
    
    try {
      let users = await storage.readJsonFile('users.json');
      
      if (!users || !Array.isArray(users) || users.length === 0) {
        console.log('📝 [AUTH] Kullanıcı bulunamadı, varsayılanlar oluşturuluyor');
        users = await createDefaultUsers();
      }
      
      console.timeEnd('⏱️ [AUTH] Kullanıcılar yükleme');
      return users;
    } catch (error) {
      console.error('❌ [AUTH] Kullanıcılar yüklenirken hata:', error);
      console.timeEnd('⏱️ [AUTH] Kullanıcılar yükleme');
      return await createDefaultUsers();
    }
  }, [storage.isReady, createDefaultUsers]);

  // Oturum kontrolü - Tek sefer çalışacak şekilde optimize edildi
  const checkSession = useCallback(async () => {
    if (sessionCheckRef.current || !storage.isReady) {
      return;
    }
    
    sessionCheckRef.current = true;
    console.time('⏱️ [WEB-AUTH] checkSession süresi');
    
    try {
      const session = await storage.readJsonFile('user_session.json') as UserSession | null;
      
      if (session && session.user && new Date(session.expiresAt) > new Date()) {
        // Oturum geçerli
        setCurrentUser(session.user);
        console.log('✅ [AUTH] Geçerli oturum bulundu:', session.user.username);
      } else {
        // Oturum süresi dolmuş veya yok
        if (session) {
          await storage.writeJsonFile('user_session.json', null);
          console.log('🗑️ [AUTH] Süresi dolmuş oturum temizlendi');
        }
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('❌ [AUTH] Oturum kontrolü hatası:', error);
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
      console.timeEnd('⏱️ [WEB-AUTH] checkSession süresi');
    }
  }, [storage.isReady, storage]);

  // Giriş yapma - Optimize edilmiş
  const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; message: string }> => {
    if (!storage.isReady) {
      return { success: false, message: 'Sistem henüz hazır değil' };
    }

    console.time('⏱️ [AUTH] Giriş işlemi');
    
    try {
      const users = await loadUsers();
      const user = users.find(u => u.username === username && u.password === password && u.isActive);

      if (!user) {
        console.timeEnd('⏱️ [AUTH] Giriş işlemi');
        return { success: false, message: 'Kullanıcı adı veya şifre hatalı' };
      }

      // Oturum oluştur (24 saat geçerli)
      const session: UserSession = {
        user: {
          ...user,
          lastLogin: new Date().toISOString()
        },
        loginTime: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      // Paralel işlemler
      const [sessionResult, usersResult] = await Promise.allSettled([
        storage.writeJsonFile('user_session.json', session),
        (async () => {
          const updatedUsers = users.map(u => 
            u.id === user.id ? { ...u, lastLogin: session.loginTime } : u
          );
          return storage.writeJsonFile('users.json', updatedUsers);
        })()
      ]);

      if (sessionResult.status === 'rejected') {
        throw new Error('Oturum kaydedilemedi');
      }

      setCurrentUser(session.user);
      console.log('✅ [AUTH] Giriş başarılı:', user.username);
      console.timeEnd('⏱️ [AUTH] Giriş işlemi');
      
      return { success: true, message: 'Giriş başarılı' };
    } catch (error) {
      console.error('❌ [AUTH] Giriş hatası:', error);
      console.timeEnd('⏱️ [AUTH] Giriş işlemi');
      return { success: false, message: 'Giriş sırasında hata oluştu' };
    }
  }, [storage.isReady, storage, loadUsers]);

  // Çıkış yapma
  const logout = useCallback(async () => {
    console.time('⏱️ [AUTH] Çıkış işlemi');
    
    try {
      await storage.writeJsonFile('user_session.json', null);
      setCurrentUser(null);
      sessionCheckRef.current = false; // Reset session check
      console.log('✅ [AUTH] Çıkış yapıldı');
    } catch (error) {
      console.error('❌ [AUTH] Çıkış hatası:', error);
      // Hata olsa bile state'i temizle
      setCurrentUser(null);
    } finally {
      console.timeEnd('⏱️ [AUTH] Çıkış işlemi');
    }
  }, [storage]);

  // Kullanıcı ekleme - Authorize edilmiş
  const addUser = useCallback(async (userData: Omit<User, 'id' | 'createdAt'>): Promise<{ success: boolean; message: string }> => {
    if (currentUser?.role !== 'admin') {
      return { success: false, message: 'Yetkiniz yok' };
    }

    console.time('⏱️ [AUTH] Kullanıcı ekleme');

    try {
      const users = await loadUsers();
      
      if (users.some(u => u.username === userData.username)) {
        console.timeEnd('⏱️ [AUTH] Kullanıcı ekleme');
        return { success: false, message: 'Bu kullanıcı adı zaten kullanılıyor' };
      }

      const newUser: User = {
        ...userData,
        id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString()
      };

      const updatedUsers = [...users, newUser];
      await storage.writeJsonFile('users.json', updatedUsers);
      
      console.timeEnd('⏱️ [AUTH] Kullanıcı ekleme');
      return { success: true, message: 'Kullanıcı başarıyla eklendi' };
    } catch (error) {
      console.error('❌ [AUTH] Kullanıcı ekleme hatası:', error);
      console.timeEnd('⏱️ [AUTH] Kullanıcı ekleme');
      return { success: false, message: 'Kullanıcı eklenirken hata oluştu' };
    }
  }, [currentUser?.role, loadUsers, storage]);

  // Kullanıcı güncelleme
  const updateUser = useCallback(async (userId: string, updates: Partial<User>): Promise<{ success: boolean; message: string }> => {
    if (currentUser?.role !== 'admin') {
      return { success: false, message: 'Yetkiniz yok' };
    }

    console.time('⏱️ [AUTH] Kullanıcı güncelleme');

    try {
      const users = await loadUsers();
      const userIndex = users.findIndex(u => u.id === userId);
      
      if (userIndex === -1) {
        console.timeEnd('⏱️ [AUTH] Kullanıcı güncelleme');
        return { success: false, message: 'Kullanıcı bulunamadı' };
      }

      users[userIndex] = { ...users[userIndex], ...updates };
      await storage.writeJsonFile('users.json', users);
      
      console.timeEnd('⏱️ [AUTH] Kullanıcı güncelleme');
      return { success: true, message: 'Kullanıcı başarıyla güncellendi' };
    } catch (error) {
      }, 5000); // 5 saniyeye düşürüldü
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [isLoading]);

  // Computed values
  const isAdmin = currentUser?.role === 'admin';
  const isPersonel = currentUser?.role === 'personel';

  const value: AuthContextType = {
    currentUser,
    isLoading,
    login,
    logout,
    addUser,
    updateUser,
    getAllUsers,
    isAdmin,
    isPersonel
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
        }
      }, 10000);
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [isLoading]);

  // Computed values
  const isAdmin = currentUser?.role === 'admin';
  const isPersonel = currentUser?.role === 'personel';

  const value: AuthContextType = {
    currentUser,
    isLoading,
    login,
    logout,
    addUser,
    updateUser,
    getAllUsers,
    isAdmin,
    isPersonel
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};