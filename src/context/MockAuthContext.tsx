import React, { createContext, useContext, useState } from 'react';
import { StaticWebAppsUser } from './AuthContext';

// Mock user for local development
const mockUser: StaticWebAppsUser = {
  userId: 'local-user-123',
  userDetails: 'duffydev96@gmail.com',
  userRoles: ['agent', 'authenticated'], // You have agent role locally
  identityProvider: 'aad',
  claims: [
    {
      typ: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
      val: 'duffydev96@gmail.com'
    },
    {
      typ: 'preferred_username', 
      val: 'duffydev96@gmail.com'
    }
  ]
};

interface MockAuthContextType {
  user: StaticWebAppsUser | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const MockAuthContext = createContext<MockAuthContextType | null>(null);

export const useMockAuth = () => {
  const context = useContext(MockAuthContext);
  if (!context) {
    throw new Error('useMockAuth must be used within a MockAuthProvider');
  }
  return context;
};

export const MockAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<StaticWebAppsUser | null>(mockUser);
  const [loading] = useState(false);

  const login = () => {
    setUser(mockUser);
  };

  const logout = () => {
    setUser(null);
  };

  const isAuthenticated = user !== null;

  return (
    <MockAuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      isAuthenticated
    }}>
      {children}
    </MockAuthContext.Provider>
  );
};