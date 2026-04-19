import { createContext, useContext, useState, type ReactNode } from 'react';
import type { User } from '../types';

interface AppContextType {
  user: User | null;
  setUser: (user: User) => void;
  isLoggedIn: boolean;
  isOnboarded: boolean;
  login: (email: string, role?: 'bidder' | 'makelaar', assignedPropertyId?: number) => void;
  logout: () => void;
  completeOnboarding: (fullName: string) => void;
  walletConnected: boolean;
  walletAddress: string | null;
  connectWallet: () => void;
  disconnectWallet: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const login = (email: string, role: 'bidder' | 'makelaar' = 'bidder', assignedPropertyId = 1) => {
    const isMakelaar = role === 'makelaar';
    setUser({
      id: isMakelaar ? 99 : 1,
      email,
      full_name: isMakelaar ? 'Demo Makelaar' : '',
      wallet_address: null,
      role,
      status: 'active',
      idin_verified: true,
      assigned_property_id: isMakelaar ? undefined : assignedPropertyId,
      created_at: new Date().toISOString(),
    });
    setIsLoggedIn(true);
    if (isMakelaar) setIsOnboarded(true);
  };

  const logout = () => {
    setUser(null);
    setIsLoggedIn(false);
    setIsOnboarded(false);
    setWalletConnected(false);
    setWalletAddress(null);
  };

  const completeOnboarding = (fullName: string) => {
    if (user) {
      setUser({
        ...user,
        full_name: fullName,
        idin_verified: true,
        status: 'active',
        verified_at: new Date().toISOString(),
      });
    }
    setIsOnboarded(true);
  };

  const connectWallet = () => {
    const mockAddress = '0xA1B2C3D4E5F6789012345678901234567890ABCD';
    setWalletConnected(true);
    setWalletAddress(mockAddress);
    if (user) {
      setUser({ ...user, wallet_address: mockAddress });
    }
  };

  const disconnectWallet = () => {
    setWalletConnected(false);
    setWalletAddress(null);
  };

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        isLoggedIn,
        isOnboarded,
        login,
        logout,
        completeOnboarding,
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
