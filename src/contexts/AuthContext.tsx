import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserSession } from '../types/user';
import { useElectronStorage } from '../hooks/useElectronStorage';

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
  const storage = useElectronStorage();

  // Performance: Varsayılan kullanıcıları oluştur - sadece bir kez
  const createDefaultUsers = async (): Promise<User[]> => {
    console.time('⏱️ [AUTH] Varsayılan kullanıcılar oluşturma');
    
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
    console.timeEnd('⏱️ [AUTH] Varsayılan kullanıcılar oluşturma');
    console.log('✅ [AUTH] Varsayılan kullanıcılar oluşturuldu');
    return defaultUsers;
  };

  // Performance: Kullanıcıları yükle - cache ile optimize edilmiş
  const loadUsers = async (): Promise<User[]> => {
    console.time('⏱️ [AUTH] Kullanıcılar yükleme');
    
    try {
      let users = await storage.readJsonFile('users.json');
      if (!users || !Array.isArray(users) || users.length === 0) {
        users = await createDefaultUsers();
      }
      
      console.timeEnd('⏱️ [AUTH] Kullanıcılar yükleme');
      return users;
    } catch (error) {
      console.error('❌ [AUTH] Kullanıcılar yüklenirken hata:', error);
      console.timeEnd('⏱️ [AUTH] Kullanıcılar yükleme');
      return await createDefaultUsers();
    }
  };

  // Performance: Oturum kontrolü - optimize edilmiş
  const checkSession = async () => {
    console.time('⏱️ [AUTH] Oturum kontrolü');
    
    try {
      const session = await storage.readJsonFile('user_session.json') as UserSession | null;
      
      if (session && new Date(session.expiresAt) > new Date()) {
        // Oturum geçerli
        setCurrentUser(session.user);
        console.log('✅ [AUTH] Geçerli oturum bulundu:', session.user.username);
      } else {
        // Oturum süresi dolmuş veya yok
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
      console.timeEnd('⏱️ [AUTH] Oturum kontrolü');
    }
  };

  // Performance: Giriş yapma - optimize edilmiş
  const login = async (username: string, password: string): Promise<{ success: boolean; message: string }> => {
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
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 saat
      };

      await storage.writeJsonFile('user_session.json', session);
      
      // Son giriş tarihini güncelle
      const updatedUsers = users.map(u => 
        u.id === user.id ? { ...u, lastLogin: session.loginTime } : u
      );
      await storage.writeJsonFile('users.json', updatedUsers);

      setCurrentUser(session.user);
      console.log('✅ [AUTH] Giriş başarılı:', user.username);
      console.timeEnd('⏱️ [AUTH] Giriş işlemi');
      
      return { success: true, message: 'Giriş başarılı' };
    } catch (error) {
      console.error('❌ [AUTH] Giriş hatası:', error);
      console.timeEnd('⏱️ [AUTH] Giriş işlemi');
      return { success: false, message: 'Giriş sırasında hata oluştu' };
    }
  };

  // Performance: Çıkış yapma - optimize edilmiş
  const logout = async () => {
    console.time('⏱️ [AUTH] Çıkış işlemi');
    
    try {
      await storage.writeJsonFile('user_session.json', null);
      setCurrentUser(null);
      console.log('✅ [AUTH] Çıkış yapıldı');
    } catch (error) {
      console.error('❌ [AUTH] Çıkış hatası:', error);
    } finally {
      console.timeEnd('⏱️ [AUTH] Çıkış işlemi');
    }
  };

  // Performance: Kullanıcı ekleme - optimize edilmiş
  const addUser = async (userData: Omit<User, 'id' | 'createdAt'>): Promise<{ success: boolean; message: string }> => {
    if (currentUser?.role !== 'admin') {
      return { success: false, message: 'Yetkiniz yok' };
    }

    console.time('⏱️ [AUTH] Kullanıcı ekleme');

    try {
      const users = await loadUsers();
      
      // Kullanıcı adı kontrolü
      if (users.some(u => u.username === userData.username)) {
        console.timeEnd('⏱️ [AUTH] Kullanıcı ekleme');
        return { success: false, message: 'Bu kullanıcı adı zaten kullanılıyor' };
      }

      const newUser: User = {
        ...userData,
        id: `user-${Date.now()}`,
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
  };

  // Performance: Kullanıcı güncelleme - optimize edilmiş
  const updateUser = async (userId: string, updates: Partial<User>): Promise<{ success: boolean; message: string }> => {
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
      console.error('❌ [AUTH] Kullanıcı güncelleme hatası:', error);
      console.timeEnd('⏱️ [AUTH] Kullanıcı güncelleme');
      return { success: false, message: 'Kullanıcı güncellenirken hata oluştu' };
    }
  };

  // Performance: Tüm kullanıcıları getir - optimize edilmiş
  const getAllUsers = async (): Promise<User[]> => {
    if (currentUser?.role !== 'admin') {
      return [];
    }
    return await loadUsers();
  };

  // Performance: İlk yükleme - sadece bir kez çalışır
  useEffect(() => {
    if (storage.isReady) {
      checkSession();
    }
  }, [storage.isReady]);

  const value: AuthContextType = {
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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};