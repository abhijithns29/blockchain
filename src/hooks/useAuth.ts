import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import apiService from '../services/api';
import { User } from '../types';

interface AuthContextType {
  auth: {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    loading: boolean;
  };
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (userData: any) => Promise<void>;
  connectWallet: () => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
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

  const login = async (credentials: { email: string; password: string }) => {
    try {
      const response = await apiService.login(credentials);
      const { token: newToken, user: userData } = response;
      console.log('Login response:', response);
      console.log('User data from login:', userData);
      console.log('User role from login:', userData?.role);
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData: any) => {
    try {
      const response = await apiService.register(userData);
      const { token: newToken, user: userInfo } = response;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userInfo);
    } catch (error) {
      throw error;
    }
  };

  const connectWallet = async () => {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const walletAddress = accounts[0];
        
        // Try to verify wallet with backend
        const response = await apiService.verifyWallet({ walletAddress });
        const { token: newToken, user: userData } = response;
        localStorage.setItem('token', newToken);
        setToken(newToken);
        setUser(userData);
      } else {
        throw new Error('MetaMask is not installed');
      }
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
      const userData = await apiService.getCurrentUser();
      console.log('User data received:', userData);
      console.log('User role:', userData?.role);
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
    register,
    connectWallet,
    logout,
    refreshUser
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

// Export AuthContext for use in other files
export { AuthContext };