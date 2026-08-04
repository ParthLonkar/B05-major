/**
 * Global Application Context
 * Manages user authentication, theme, and global state
 */

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
}

interface AppContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isDarkMode: boolean;
  setUser: (user: User | null, token?: string) => void;
  logout: () => void;
  toggleDarkMode: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const safeParse = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => safeParse<User | null>(localStorage.getItem('user'), null));
  const [isDarkMode, setIsDarkMode] = useState(() => safeParse<boolean>(localStorage.getItem('darkMode'), true));

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const isAuthenticated = user !== null;
  const isAdmin = user?.role === 'admin';

  const handleSetUser = useCallback((newUser: User | null, token?: string) => {
    setUser(newUser);
    if (newUser) {
      localStorage.setItem('user', JSON.stringify(newUser));
      if (token) {
        localStorage.setItem('authToken', token);
      } else {
        localStorage.setItem('authToken', `token_${newUser.id}`);
      }
    } else {
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
    }
  }, []);

  const logout = useCallback(() => {
    handleSetUser(null);
  }, [handleSetUser]);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev: boolean) => !prev);
  }, []);

  const value = useMemo<AppContextType>(() => ({
    user,
    isAuthenticated,
    isAdmin,
    isDarkMode,
    setUser: handleSetUser,
    logout,
    toggleDarkMode,
  }), [user, isAuthenticated, isAdmin, isDarkMode, handleSetUser, logout, toggleDarkMode]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};