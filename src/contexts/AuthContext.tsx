import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { User, UserSession } from '../types/user';
import { useWebStorage } from '../hooks/useWebStorage';

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  isInitialized: boolean; // Add this to track initialization
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
  const [isInitialized, setIsInitialized] = useState(false);
  const storage = useWebStorage();
  
  // Single initialization ref
  const initRef = useRef(false);

  // Create default users - Memoized
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
      return defaultUsers;
    }
  }, [storage]);

  // Load users - Cache optimized
  const loadUsers = useCallback(async (): Promise<User[]> => {
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
  }, [createDefaultUsers, storage]);

  // Session check - Simplified
  const checkSession = useCallback(async () => {
    console.time('⏱️ [AUTH] Session check duration');
    console.log('🔍 [AUTH] Starting session check...');
    
    try {
      const session = await storage.readJsonFile('user_session.json') as UserSession | null;
      console.log('📄 [AUTH] Session file read:', session ? 'Found' : 'Not found');
      
      if (session && session.user && new Date(session.expiresAt) > new Date()) {
        // Valid session
        console.log('✅ [AUTH] Valid session found:', session.user.username);
        setCurrentUser(session.user);
        return session.user;
      } else {
        // Invalid or expired session
        if (session) {
          await storage.writeJsonFile('user_session.json', null);
          console.log('🗑️ [AUTH] Expired session cleaned');
        }
        console.log('ℹ️ [AUTH] No valid session - login required');
        setCurrentUser(null);
        return null;
      }
    } catch (error) {
      console.error('❌ [AUTH] Session check error:', error);
      setCurrentUser(null);
      return null;
    } finally {
      console.timeEnd('⏱️ [AUTH] Session check duration');
    }
  }, [storage]);

  // Login function - Simplified and more reliable
  const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; message: string }> => {
    console.time('⏱️ [AUTH] Login process');
    console.log('🔐 [AUTH] Starting login for:', username);
    
    // Don't set loading here - let the component handle it
    try {
      const users = await loadUsers();
      const user = users.find(u => u.username === username && u.password === password && u.isActive);

      if (!user) {
        console.log('❌ [AUTH] Invalid credentials for:', username);
        console.timeEnd('⏱️ [AUTH] Login process');
        return { success: false, message: 'Kullanıcı adı veya şifre hatalı' };
      }

      const loginTime = new Date().toISOString();
      
      // Update user info
      const updatedUser = {
        ...user,
        lastLogin: loginTime
      };
      
      // Create session (24 hours valid)
      const session: UserSession = {
        user: updatedUser,
        loginTime,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      console.log('💾 [AUTH] Saving session and updating user data...');
      
      // Save to storage first, then update state
      try {
        await storage.writeJsonFile('user_session.json', session);
        console.log('💾 [AUTH] Session saved to storage');
        
        // Update users list
        const updatedUsers = users.map(u => 
          u.id === user.id ? updatedUser : u
        );
        await storage.writeJsonFile('users.json', updatedUsers);
        console.log('💾 [AUTH] User list updated');
      } catch (storageError) {
        console.warn('⚠️ [AUTH] Storage save failed, but login continues:', storageError);
      }
      
      // Set current user - this should trigger re-render and redirect
      setCurrentUser(updatedUser);
      console.log('✅ [AUTH] CurrentUser set:', updatedUser.username, 'Role:', updatedUser.role);

      console.log('✅ [AUTH] Login successful:', user.username);
      console.timeEnd('⏱️ [AUTH] Login process');
      
      return { success: true, message: 'Giriş başarılı' };
    } catch (error) {
      console.error('❌ [AUTH] Login error:', error);
      console.timeEnd('⏱️ [AUTH] Login process');
      return { success: false, message: 'Giriş sırasında hata oluştu' };
    }
  }, [loadUsers, storage]);

  // Logout function
  const logout = useCallback(async () => {
    console.time('⏱️ [AUTH] Logout process');
    
    try {
      await storage.writeJsonFile('user_session.json', null);
      setCurrentUser(null);
      console.log('✅ [AUTH] Logout successful');
    } catch (error) {
      console.error('❌ [AUTH] Logout error:', error);
      setCurrentUser(null);
    } finally {
      console.timeEnd('⏱️ [AUTH] Logout process');
    }
  }, [storage]);

  // Add user function
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

  // Update user function
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
      console.error('❌ [AUTH] Kullanıcı güncelleme hatası:', error);
      console.timeEnd('⏱️ [AUTH] Kullanıcı güncelleme');
      return { success: false, message: 'Kullanıcı güncellenirken hata oluştu' };
    }
  }, [currentUser?.role, loadUsers, storage]);

  // Get all users function
  const getAllUsers = useCallback(async (): Promise<User[]> => {
    if (currentUser?.role !== 'admin') {
      return [];
    }
    return await loadUsers();
  }, [currentUser?.role, loadUsers]);

  // Initial authentication check
  useEffect(() => {
    const initAuth = async () => {
      if (initRef.current) {
        console.log('⏭️ [AUTH] Already initialized');
        return;
      }
      
      initRef.current = true;
      console.log('🚀 [AUTH] Starting authentication initialization...');
      
      // Wait for storage to be ready with a reasonable timeout
      let attempts = 0;
      const maxAttempts = 20; // 10 seconds max
      
      while (!storage.isReady && attempts < maxAttempts) {
        console.log(`⏳ [AUTH] Waiting for storage... attempt ${attempts + 1}/${maxAttempts}`);
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
      
      if (storage.isReady) {
        console.log('✅ [AUTH] Storage ready, checking session');
        await checkSession();
      } else {
        console.warn('⚠️ [AUTH] Storage not ready after timeout, starting without session');
        setCurrentUser(null);
      }
      
      setIsLoading(false);
      setIsInitialized(true);
      console.log('✅ [AUTH] Authentication initialization completed');
    };
    
    initAuth();
  }, []); // Run only once

  // Computed values
  const isAdmin = currentUser?.role === 'admin';
  const isPersonel = currentUser?.role === 'personel';

  const value: AuthContextType = {
    currentUser,
    isLoading,
    isInitialized,
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