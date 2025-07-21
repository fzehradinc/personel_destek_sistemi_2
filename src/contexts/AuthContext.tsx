import React, { createContext, useContext, ReactNode } from 'react';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';

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

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  addUser: (userData: Omit<User, 'id' | 'createdAt'>) => Promise<{ success: boolean; message: string }>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<{ success: boolean; message: string }>;
  getAllUsers: () => Promise<User[]>;
  changePasswordByUsername: (username: string, currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
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
  const authData = useSupabaseAuth();

  const value: AuthContextType = {
    currentUser: authData.currentUser,
    isLoading: authData.isLoading,
    isInitialized: authData.isInitialized,
    login: authData.login,
    logout: authData.logout,
    addUser: authData.addUser,
    updateUser: authData.updateUser,
    deleteUser: authData.deleteUser,
    getAllUsers: authData.getAllUsers,
    changePasswordByUsername: authData.changePasswordByUsername,
    isAdmin: authData.isAdmin,
    isPersonel: authData.isPersonel
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};