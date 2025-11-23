import React, { createContext, useContext, useEffect, useState } from 'react';

// Azure Static Web Apps user interface
export interface StaticWebAppsUser {
  userId: string;
  userDetails: string;
  userRoles: string[];
  identityProvider: string;
  claims: Array<{
    typ: string;
    val: string;
  }>;
  isAdmin?: boolean; // Computed property for admin access
}

interface AuthContextType {
  user: StaticWebAppsUser | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<StaticWebAppsUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch user information from Azure Static Web Apps
    const fetchUser = async () => {
      try {
        console.log('🔍 Fetching authentication info from /.auth/me');
        const response = await fetch('/.auth/me');
        if (response.ok) {
          const authPayload = await response.json();
          console.log('📋 Auth payload:', authPayload);
          const clientPrincipal = authPayload.clientPrincipal;
          if (clientPrincipal) {
            console.log('✅ User authenticated:', clientPrincipal);
            
            // Define admin user IDs as fallback until role mapping works
            const adminUserIds = [
              '396bdeb2b00d4b619f15c3369c3fb051', // duffydev96@gmail.com
            ];
            
            // Check if user is admin (either from role or user ID)
            const isAdmin = (clientPrincipal.userRoles || []).includes('admin') ||
                           adminUserIds.includes(clientPrincipal.userId);
            
            setUser({
              userId: clientPrincipal.userId,
              userDetails: clientPrincipal.userDetails,
              userRoles: clientPrincipal.userRoles || ['authenticated'],
              identityProvider: clientPrincipal.identityProvider,
              claims: clientPrincipal.claims || [],
              isAdmin: isAdmin
            });
          } else {
            console.log('❌ No client principal found');
            setUser(null);
          }
        } else {
          console.log('❌ Auth response not ok:', response.status);
          setUser(null);
        }
      } catch (error) {
        console.error('❌ Error fetching user:', error);
        setUser(null);
      } finally {
        console.log('✅ Auth loading complete');
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const login = () => {
    window.location.href = '/.auth/login/aad';
  };

  const logout = () => {
    window.location.href = '/.auth/logout';
  };

  const isAuthenticated = user !== null;

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      isAuthenticated
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;