import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';

// Types
interface User {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'personel';
  name: string;
  email: string;
  department: string;
  createdAt: string;
  isActive: boolean;
  lastLogin?: string;
}

interface UserSession {
  user: User;
  loginTime: string;
  expiresAt: string;
}

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  isInitialized: boolean;
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

// In-memory storage fallback for web environments
class WebStorage {
  private storage = new Map<string, any>();
  public isReady = true; // Always ready for in-memory storage

  async readJsonFile(filename: string): Promise<any> {
    console.log(`📖 [STORAGE] Reading: ${filename}`);
    const data = this.storage.get(filename);
    return data || null;
  }

  async writeJsonFile(filename: string, data: any): Promise<void> {
    console.log(`💾 [STORAGE] Writing: ${filename}`, data ? 'with data' : 'null');
    if (data === null) {
      this.storage.delete(filename);
    } else {
      this.storage.set(filename, data);
    }
  }
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const storage = useRef(new WebStorage()).current;
  
  // Prevent double initialization
  const initRef = useRef(false);

  // Default users - moved to constant for better performance
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

  // Initialize default users if needed
  const initializeUsers = useCallback(async (): Promise<User[]> => {
    try {
      let users = await storage.readJsonFile('users.json');
      
      if (!users || !Array.isArray(users) || users.length === 0) {
        console.log('📝 [AUTH] No users found, creating defaults');
        await storage.writeJsonFile('users.json', defaultUsers);
        users = defaultUsers;
      }
      
      console.log('✅ [AUTH] Users initialized:', users.length);
      return users;
    } catch (error) {
      console.error('❌ [AUTH] User initialization failed:', error);
      return defaultUsers;
    }
  }, [storage, defaultUsers]);

  // Check for existing session
  const checkSession = useCallback(async (): Promise<User | null> => {
    try {
      const session = await storage.readJsonFile('user_session.json') as UserSession | null;
      
      if (session && session.user && new Date(session.expiresAt) > new Date()) {
        console.log('✅ [AUTH] Valid session found:', session.user.username);
        return session.user;
      } else {
        if (session) {
          await storage.writeJsonFile('user_session.json', null);
          console.log('🗑️ [AUTH] Expired session cleaned');
        }
        console.log('ℹ️ [AUTH] No valid session');
        return null;
      }
    } catch (error) {
      console.error('❌ [AUTH] Session check error:', error);
      return null;
    }
  }, [storage]);

  // Login function - simplified and more reliable
  const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; message: string }> => {
    console.log('🔐 [AUTH] Login attempt:', username);
    setIsLoading(true);
    
    try {
      // Get current users
      const users = await storage.readJsonFile('users.json') || defaultUsers;
      const user = users.find((u: User) => u.username === username && u.password === password && u.isActive);

      if (!user) {
        console.log('❌ [AUTH] Invalid credentials');
        return { success: false, message: 'Kullanıcı adı veya şifre hatalı' };
      }

      const loginTime = new Date().toISOString();
      const updatedUser = { ...user, lastLogin: loginTime };
      
      // Create session (24 hours)
      const session: UserSession = {
        user: updatedUser,
        loginTime,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      // Save session and update user
      await storage.writeJsonFile('user_session.json', session);
      
      // Update users list
      const updatedUsers = users.map((u: User) => 
        u.id === user.id ? updatedUser : u
      );
      await storage.writeJsonFile('users.json', updatedUsers);
      
      // CRITICAL: Set current user to trigger re-render
      setCurrentUser(updatedUser);
      
      console.log('✅ [AUTH] Login successful for:', user.username, 'Role:', user.role);
      console.log('🔄 [AUTH] currentUser updated, should trigger route change');
      return { success: true, message: 'Giriş başarılı' };
    } catch (error) {
      console.error('❌ [AUTH] Login error:', error);
      return { success: false, message: 'Giriş sırasında hata oluştu' };
    } finally {
      setIsLoading(false);
    }

  // Logout function
  const logout = useCallback(async () => {
    try {
      await storage.writeJsonFile('user_session.json', null);
      setCurrentUser(null);
      console.log('✅ [AUTH] Logout successful');
    } catch (error) {
      console.error('❌ [AUTH] Logout error:', error);
      setCurrentUser(null); // Always clear user state
    }
  }, [storage]);

  // Add user function
  const addUser = useCallback(async (userData: Omit<User, 'id' | 'createdAt'>): Promise<{ success: boolean; message: string }> => {
    if (currentUser?.role !== 'admin') {
      return { success: false, message: 'Yetkiniz yok' };
    }

    try {
      const users = await storage.readJsonFile('users.json') || defaultUsers;
      
      if (users.some((u: User) => u.username === userData.username)) {
        return { success: false, message: 'Bu kullanıcı adı zaten kullanılıyor' };
      }

      const newUser: User = {
        ...userData,
        id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString()
      };

      const updatedUsers = [...users, newUser];
      await storage.writeJsonFile('users.json', updatedUsers);
      
      return { success: true, message: 'Kullanıcı başarıyla eklendi' };
    } catch (error) {
      console.error('❌ [AUTH] Add user error:', error);
      return { success: false, message: 'Kullanıcı eklenirken hata oluştu' };
    }
  }, [currentUser?.role, storage, defaultUsers]);

  // Update user function
  const updateUser = useCallback(async (userId: string, updates: Partial<User>): Promise<{ success: boolean; message: string }> => {
    if (currentUser?.role !== 'admin') {
      return { success: false, message: 'Yetkiniz yok' };
    }

    try {
      const users = await storage.readJsonFile('users.json') || defaultUsers;
      const userIndex = users.findIndex((u: User) => u.id === userId);
      
      if (userIndex === -1) {
        return { success: false, message: 'Kullanıcı bulunamadı' };
      }

      users[userIndex] = { ...users[userIndex], ...updates };
      await storage.writeJsonFile('users.json', users);
      
      return { success: true, message: 'Kullanıcı başarıyla güncellendi' };
    } catch (error) {
      console.error('❌ [AUTH] Update user error:', error);
      return { success: false, message: 'Kullanıcı güncellenirken hata oluştu' };
    }
  }, [currentUser?.role, storage, defaultUsers]);

  // Get all users function
  const getAllUsers = useCallback(async (): Promise<User[]> => {
    if (currentUser?.role !== 'admin') {
      return [];
    }
    
    try {
      return await storage.readJsonFile('users.json') || defaultUsers;
    } catch (error) {
      console.error('❌ [AUTH] Get users error:', error);
      return [];
    }
  }, [currentUser?.role, storage, defaultUsers]);

  // Initialize authentication
  useEffect(() => {
    const initAuth = async () => {
      if (initRef.current) {
        console.log('⏭️ [AUTH] Already initialized');
        return;
      }
      
      initRef.current = true;
      console.log('🚀 [AUTH] Starting initialization');
      
      try {
        // Initialize users first
        await initializeUsers();
        
        // Check for existing session
        const sessionUser = await checkSession();
        if (sessionUser) {
          setCurrentUser(sessionUser);
          console.log('✅ [AUTH] Session restored for:', sessionUser.username);
        } else {
          console.log('ℹ️ [AUTH] No session found, user needs to login');
        }
      } catch (error) {
        console.error('❌ [AUTH] Initialization error:', error);
      } finally {
        // ALWAYS complete initialization
        setIsLoading(false);
        setIsInitialized(true);
        console.log('✅ [AUTH] Initialization completed');
      }
    };
    
    // Start initialization immediately
    initAuth();
  }, []); // Empty dependency array - run only once

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
