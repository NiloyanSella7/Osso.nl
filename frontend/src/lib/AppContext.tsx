import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User } from '../types';
import * as api from './api';

interface AppContextType {
  user: User | null;
  setUser: (user: User) => void;
  isLoggedIn: boolean;
  isOnboarded: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  walletConnected: boolean;
  walletAddress: string | null;
  connectWallet: () => void;
  disconnectWallet: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

const MOCK_WALLET = '0xa1b2c3d4e5f6789012345678901234567890abcd';

function isOnboardedUser(user: User): boolean {
  return user.status === 'active' || user.role === 'makelaar' || user.role === 'admin';
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const applyUser = (u: User) => {
    setUserState(u);
    if (u.wallet_address) {
      setWalletConnected(true);
      setWalletAddress(u.wallet_address);
    }
  };

  const refreshUser = useCallback(async () => {
    if (!api.isLoggedIn()) return;
    try {
      const u = await api.getMe();
      applyUser(u);
    } catch {
      api.logout();
      setUserState(null);
    }
  }, []);

  // Herstel sessie bij pageload
  useEffect(() => {
    if (api.isLoggedIn()) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    await api.login(email, password);
    const u = await api.getMe();
    applyUser(u);
    // Koppel mock-wallet alleen voor bieders die nog geen wallet hebben (PoC)
    if (!u.wallet_address && u.role === 'bidder') {
      try {
        const updated = await api.updateMe({ wallet_address: MOCK_WALLET });
        applyUser(updated);
      } catch {
        // non-blocking: wallet is niet verplicht bij login
      }
    }
  };

  const logout = () => {
    api.logout();
    setUserState(null);
    setWalletConnected(false);
    setWalletAddress(null);
  };

  const setUser = (u: User) => applyUser(u);

  const connectWallet = () => {
    setWalletConnected(true);
    setWalletAddress(MOCK_WALLET);
    if (user) setUserState({ ...user, wallet_address: MOCK_WALLET });
  };

  const disconnectWallet = () => {
    setWalletConnected(false);
    setWalletAddress(null);
  };

  const isLoggedIn = !!user;
  const isOnboarded = !!user && isOnboardedUser(user);

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        isLoggedIn,
        isOnboarded,
        loading,
        login,
        logout,
        refreshUser,
        walletConnected,
        walletAddress,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
