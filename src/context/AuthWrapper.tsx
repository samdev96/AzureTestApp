import React from 'react';
import { AuthProvider } from './AuthContext';
import { MockAuthProvider } from './MockAuthContext';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  // Use mock auth in development, real auth in production
  const useMockAuth = process.env.NODE_ENV === 'development' && !process.env.REACT_APP_USE_REAL_AUTH;
  
  if (useMockAuth) {
    console.log('🧪 Using mock authentication for local development');
    return <MockAuthProvider>{children}</MockAuthProvider>;
  }
  
  console.log('🔐 Using Azure Static Web Apps authentication');
  return <AuthProvider>{children}</AuthProvider>;
};