import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { getUserByUsername, updateUser } from '../lib/db';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateCurrentUserPassword: (newPassword: string) => Promise<boolean>;
  showChangePasswordModal: boolean;
  setShowChangePasswordModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'renewcall_auth_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState<boolean>(false);

  useEffect(() => {
    // Restore session from localStorage
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    if (saved) {
      try {
        const parsed: User = JSON.parse(saved);
        setUser(parsed);
        if (parsed.first_login && parsed.role === 'admin') {
          setShowChangePasswordModal(true);
        }
      } catch (e) {
        console.error('Failed to parse saved session:', e);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const found = await getUserByUsername(username.trim());
      if (!found) {
        setIsLoading(false);
        return { success: false, error: 'User does not exist.' };
      }

      if (!found.is_active) {
        setIsLoading(false);
        return { success: false, error: 'Account is deactivated. Contact Admin.' };
      }

      if (found.password !== password) {
        setIsLoading(false);
        return { success: false, error: 'Incorrect password.' };
      }

      setUser(found);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(found));

      // Trigger first login password change modal if admin
      if (found.first_login && found.role === 'admin') {
        setShowChangePasswordModal(true);
      }

      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'An error occurred during login.' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const updateCurrentUserPassword = async (newPassword: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const updated = await updateUser(user.id, { 
        password: newPassword, 
        first_login: false 
      });
      setUser(updated);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
      setShowChangePasswordModal(false);
      return true;
    } catch (err) {
      console.error('Failed to update password:', err);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        updateCurrentUserPassword,
        showChangePasswordModal,
        setShowChangePasswordModal
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
