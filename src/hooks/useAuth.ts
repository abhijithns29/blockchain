import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import apiService from '../services/api';

interface User {
  id: string;
  email: string;
  role: string;
  twoFactorEnabled: boolean;
  isVerified: boolean;
}

interface AuthContextType {
  auth: {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    loading: boolean;
  };
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>; // Ensure this is in interface
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      refreshUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiService.login(email, password);
      const { token: newToken, user: userData } = response;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      setLoading(true);
      const userData = await apiService.getProfile();
      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const value = {
    auth: {
      user,
      token,
      isAuthenticated: !!token && !!user,
      loading
    },
    login,
    logout,
    refreshUser // Make sure refreshUser is included in value
  };

  return React.createElement(AuthContext.Provider, { value }, children);
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Fix: Export AuthContext for use in other files
export { AuthContext };

// Fix: Export useAuthProvider for use in other files
export const useAuthProvider = () => {
  const [auth, setAuth] = useState<{
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    loading: boolean;
  }>({
    user: null,
    token: null,
    isAuthenticated: false,
    loading: true,
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      loadUser();
    } else {
      setAuth(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const loadUser = async () => {
    try {
      const response = await apiService.getProfile();
      setAuth({
        user: response,
        token: localStorage.getItem('token'),
        isAuthenticated: true,
        loading: false,
      });
    } catch (error) {
      localStorage.removeItem('token');
      setAuth({
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
      });
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await apiService.login(email, password);
      localStorage.setItem('token', response.token);
      setAuth({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        loading: false,
      });
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setAuth({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
    });
  };

  return {
    auth,
    login,
    logout,
    loadUser,
  };
};