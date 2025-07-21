import { useState, useEffect, useCallback } from 'react';
import { userService, DatabaseUser, isSupabaseAvailable } from '../lib/supabase';
import { User } from '../types/user';
import { useAuth as useLocalAuth } from './useAuth';

// Convert DatabaseUser to User type
const convertDatabaseUser = (dbUser: DatabaseUser): User => ({
  id: dbUser.id,
  username: dbUser.username,
  password: dbUser.password,
  role: dbUser.role,
  name: dbUser.name,
  email: dbUser.email,
  department: dbUser.department,
  createdAt: dbUser.created_at,
  lastLogin: dbUser.last_login,
  isActive: dbUser.is_active
});

export const useSupabaseAuth = () => {
  // Fallback to local auth if Supabase is not available
  const localAuth = useLocalAuth();
  
  // If Supabase is not available, return local auth
  if (!isSupabaseAvailable) {
    console.log('⚠️ [SUPABASE-AUTH] Supabase not available, using local authentication');
    return {
      ...localAuth,
      isInitialized: !localAuth.isLoading
    };
  }

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize auth
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check for existing session in localStorage
        const sessionData = localStorage.getItem('user_session');
        if (sessionData) {
          const session = JSON.parse(sessionData);
          if (new Date(session.expiresAt) > new Date()) {
            setCurrentUser(session.user);
            console.log('✅ [SUPABASE-AUTH] Session restored:', session.user.username);
          } else {
            localStorage.removeItem('user_session');
            console.log('⚠️ [SUPABASE-AUTH] Session expired, removed');
          }
        }
      } catch (error) {
        console.error('❌ [SUPABASE-AUTH] Session check error:', error);
        localStorage.removeItem('user_session');
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    initAuth();
  }, []);

  // Login function
  const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    
    try {
      console.log('🔐 [SUPABASE-AUTH] Login attempt:', username);
      
      // Get user from database
      const dbUser = await userService.getUserByUsername(username);
      
      if (!dbUser) {
        return { success: false, message: 'Kullanıcı adı veya şifre hatalı' };
      }

      // Verify password (for now, simple comparison - in production use bcrypt)
      const isPasswordValid = password === dbUser.password; // TODO: Use bcrypt.compare in production
      
      if (!isPasswordValid) {
        return { success: false, message: 'Kullanıcı adı veya şifre hatalı' };
      }

      // Update last login
      await userService.updateLastLogin(dbUser.id);

      // Create session
      const user = convertDatabaseUser(dbUser);
      const session = {
        user: { ...user, lastLogin: new Date().toISOString() },
        loginTime: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      // Save session
      localStorage.setItem('user_session', JSON.stringify(session));
      setCurrentUser(session.user);

      console.log('✅ [SUPABASE-AUTH] Login successful:', user.username);
      return { success: true, message: 'Giriş başarılı' };
    } catch (error) {
      console.error('❌ [SUPABASE-AUTH] Login error:', error);
      return { success: false, message: 'Giriş sırasında hata oluştu' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      localStorage.removeItem('user_session');
      setCurrentUser(null);
      console.log('✅ [SUPABASE-AUTH] Logout successful');
    } catch (error) {
      console.error('❌ [SUPABASE-AUTH] Logout error:', error);
      setCurrentUser(null);
    }
  }, []);

  // Add user function
  const addUser = useCallback(async (userData: Omit<User, 'id' | 'createdAt'>): Promise<{ success: boolean; message: string }> => {
    if (currentUser?.role !== 'admin') {
      return { success: false, message: 'Yetkiniz yok' };
    }

    try {
      const dbUserData = {
        username: userData.username,
        password: userData.password, // TODO: Hash with bcrypt in production
        name: userData.name,
        email: userData.email,
        department: userData.department,
        role: userData.role,
        is_active: userData.isActive,
        import_source: 'manuel' as const
      };

      await userService.addUser(dbUserData);
      return { success: true, message: 'Kullanıcı başarıyla eklendi' };
    } catch (error: any) {
      console.error('❌ [SUPABASE-AUTH] Add user error:', error);
      
      if (error.code === '23505') { // Unique constraint violation
        return { success: false, message: 'Bu kullanıcı adı zaten kullanılıyor' };
      }
      
      return { success: false, message: 'Kullanıcı eklenirken hata oluştu' };
    }
  }, [currentUser?.role]);

  // Update user function
  const updateUser = useCallback(async (userId: string, updates: Partial<User>): Promise<{ success: boolean; message: string }> => {
    if (currentUser?.role !== 'admin') {
      return { success: false, message: 'Yetkiniz yok' };
    }

    try {
      const dbUpdates = {
        ...(updates.username && { username: updates.username }),
        ...(updates.password && { password: updates.password }), // TODO: Hash with bcrypt
        ...(updates.name && { name: updates.name }),
        ...(updates.email !== undefined && { email: updates.email }),
        ...(updates.department !== undefined && { department: updates.department }),
        ...(updates.role && { role: updates.role }),
        ...(updates.isActive !== undefined && { is_active: updates.isActive })
      };

      await userService.updateUser(userId, dbUpdates);
      return { success: true, message: 'Kullanıcı başarıyla güncellendi' };
    } catch (error: any) {
      console.error('❌ [SUPABASE-AUTH] Update user error:', error);
      
      if (error.code === '23505') {
        return { success: false, message: 'Bu kullanıcı adı zaten kullanılıyor' };
      }
      
      return { success: false, message: 'Kullanıcı güncellenirken hata oluştu' };
    }
  }, [currentUser?.role]);

  // Get all users function
  const getAllUsers = useCallback(async (): Promise<User[]> => {
    if (currentUser?.role !== 'admin') {
      return [];
    }
    
    try {
      const dbUsers = await userService.getAllUsers();
      return dbUsers.map(convertDatabaseUser);
    } catch (error) {
      console.error('❌ [SUPABASE-AUTH] Get users error:', error);
      return [];
    }
  }, [currentUser?.role]);

  // Add multiple users from Excel
  const addUsersFromExcel = useCallback(async (users: Omit<User, 'id' | 'createdAt'>[]): Promise<{ success: boolean; message: string; addedCount: number }> => {
    if (currentUser?.role !== 'admin') {
      return { success: false, message: 'Yetkiniz yok', addedCount: 0 };
    }

    try {
      const batchId = `excel_import_${Date.now()}`;
      
      const dbUsers = users.map(user => ({
        username: user.username,
        password: user.password, // TODO: Hash with bcrypt
        name: user.name,
        email: user.email,
        department: user.department,
        role: user.role,
        is_active: user.isActive,
        import_source: 'excel' as const,
        import_batch_id: batchId
      }));

      const addedUsers = await userService.addMultipleUsers(dbUsers);
      
      return { 
        success: true, 
        message: `${addedUsers.length} kullanıcı başarıyla eklendi`, 
        addedCount: addedUsers.length 
      };
    } catch (error: any) {
      console.error('❌ [SUPABASE-AUTH] Excel import error:', error);
      
      if (error.code === '23505') {
        return { success: false, message: 'Bazı kullanıcı adları zaten kullanılıyor', addedCount: 0 };
      }
      
      return { success: false, message: 'Excel import sırasında hata oluştu', addedCount: 0 };
    }
  }, [currentUser?.role]);

  return {
    currentUser,
    isLoading,
    isInitialized,
    login,
    logout,
    addUser,
    updateUser,
    getAllUsers,
    addUsersFromExcel,
    isAdmin: currentUser?.role === 'admin',
    isPersonel: currentUser?.role === 'personel'
  };
};