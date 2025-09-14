import { useState, useEffect, createContext, useContext } from 'react';
import { User, AuthState } from '../types';
import apiService from '../services/api';

const AuthContext = createContext<{
  auth: AuthState;
  login: (credentials: any) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  connectWallet: () => Promise<void>;
} | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const useAuthProvider = () => {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      loadUser();
    } else {
      setAuth(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const loadUser = async () => {
    try {
      const response = await apiService.getCurrentUser();
      setAuth({
        user: response.user,
        token: localStorage.getItem('token'),
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load user:', error);
      localStorage.removeItem('token');
      setAuth({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  };

  const login = async (credentials: any) => {
    try {
      const response = await apiService.login(credentials);
      localStorage.setItem('token', response.token);
      setAuth({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (userData: any) => {
    try {
      const response = await apiService.register(userData);
      localStorage.setItem('token', response.token);
      setAuth({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const connectWallet = async () => {
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
      }
      
      const blockchainService = await import('../services/blockchain');
      const walletInfo = await blockchainService.default.connectWallet();
      
      // Sign a message for verification
      const message = `Verify wallet ownership: ${Date.now()}`;
      const signature = await blockchainService.default.signMessage(message);

      const response = await apiService.verifyWallet({
        walletAddress: walletInfo.address,
        signature,
        message,
      });

      localStorage.setItem('token', response.token);
      setAuth({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('Wallet connection failed:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setAuth({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  return {
    auth,
    login,
    register,
    logout,
    connectWallet,
  };
};

export { AuthContext };