import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

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
  isAgent?: boolean; // Computed property for agent/admin access (can access agent dashboard)
  isAdmin?: boolean; // Computed property for admin-only features (user management, assignment groups)
}

// Impersonated user data
export interface ImpersonatedUser {
  userEmail: string;
  userObjectId: string;
  displayName: string;
  roles: string[];
  isAgent: boolean;
  isAdmin: boolean;
  role: string;
}

interface AuthContextType {
  user: StaticWebAppsUser | null;
  loading: boolean;
  rolesLoaded: boolean; // Explicitly track when roles have been fetched
  login: () => void;
  logout: () => void;
  isAuthenticated: boolean;
  // Impersonation
  impersonatedUser: ImpersonatedUser | null;
  isImpersonating: boolean;
  startImpersonation: (email: string) => Promise<boolean>;
  stopImpersonation: () => void;
  // Effective user info (impersonated or real)
  effectiveIsAgent: boolean;
  effectiveIsAdmin: boolean;
  effectiveUserEmail: string;
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
  const [rolesLoaded, setRolesLoaded] = useState(false); // Track when roles are fetched
  const [impersonatedUser, setImpersonatedUser] = useState<ImpersonatedUser | null>(null);

  // Check for stored impersonation on mount
  useEffect(() => {
    const storedImpersonation = sessionStorage.getItem('impersonatedUser');
    if (storedImpersonation) {
      try {
        setImpersonatedUser(JSON.parse(storedImpersonation));
      } catch (e) {
        sessionStorage.removeItem('impersonatedUser');
      }
    }
  }, []);

  useEffect(() => {
    // Fetch user information from Azure Static Web Apps and check database roles
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
            
            // Check database for user roles - MUST complete before setting user
            let isAgent = false;
            let isAdmin = false;
            let dbRoles: string[] = [];
            
            try {
              console.log('🔍 Checking database roles for user');
              const rolesResponse = await fetch('/api/user-roles');
              if (rolesResponse.ok) {
                const rolesData = await rolesResponse.json();
                console.log('📋 Database roles:', rolesData);
                if (rolesData.success) {
                  dbRoles = rolesData.roles || [];
                  isAgent = rolesData.isAgent || false;
                  isAdmin = rolesData.isAdmin || false;
                  console.log('✅ Database roles loaded:', { dbRoles, isAgent, isAdmin });
                } else {
                  console.log('⚠️ Database roles check failed:', rolesData.error);
                }
              } else {
                console.log('⚠️ Database roles request failed:', rolesResponse.status);
              }
            } catch (roleError) {
              console.error('❌ Error fetching database roles:', roleError);
            }
            
            // Combine Static Web Apps roles with database roles
            const combinedRoles = [...(clientPrincipal.userRoles || ['authenticated']), ...dbRoles];
            const uniqueRoles = Array.from(new Set(combinedRoles));
            
            // Set user AFTER roles are determined - set rolesLoaded first to avoid race condition
            console.log('✅ Setting rolesLoaded = true, then setting user');
            setRolesLoaded(true);
            setUser({
              userId: clientPrincipal.userId,
              userDetails: clientPrincipal.userDetails,
              userRoles: uniqueRoles,
              identityProvider: clientPrincipal.identityProvider,
              claims: clientPrincipal.claims || [],
              isAgent: isAgent,
              isAdmin: isAdmin
            });
            console.log('✅ User state set with isAgent:', isAgent, 'isAdmin:', isAdmin);
          } else {
            console.log('❌ No client principal found');
            setRolesLoaded(true); // Still mark as loaded even if no user
            setUser(null);
          }
        } else {
          console.log('❌ Auth response not ok:', response.status);
          setRolesLoaded(true); // Still mark as loaded even if auth fails
          setUser(null);
        }
      } catch (error) {
        console.error('❌ Error fetching user:', error);
        setRolesLoaded(true); // Still mark as loaded even on error
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
    // Clear impersonation on logout
    sessionStorage.removeItem('impersonatedUser');
    setImpersonatedUser(null);
    window.location.href = '/.auth/logout';
  };

  const startImpersonation = useCallback(async (email: string): Promise<boolean> => {
    try {
      console.log('🎭 Starting impersonation for:', email);
      const response = await fetch(`/api/user-roles/impersonate/${encodeURIComponent(email)}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.impersonatedUser) {
          setImpersonatedUser(data.impersonatedUser);
          sessionStorage.setItem('impersonatedUser', JSON.stringify(data.impersonatedUser));
          console.log('✅ Impersonation started:', data.impersonatedUser);
          return true;
        }
      }
      
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ Impersonation failed:', errorData.error);
      return false;
    } catch (error) {
      console.error('❌ Error starting impersonation:', error);
      return false;
    }
  }, []);

  const stopImpersonation = useCallback(() => {
    console.log('🎭 Stopping impersonation');
    setImpersonatedUser(null);
    sessionStorage.removeItem('impersonatedUser');
  }, []);

  const isAuthenticated = user !== null;
  const isImpersonating = impersonatedUser !== null;
  
  // Effective values - use impersonated user's permissions when impersonating
  // Important: Only use user values once roles are fully loaded to avoid race conditions
  const effectiveIsAgent = isImpersonating 
    ? impersonatedUser.isAgent 
    : (rolesLoaded ? (user?.isAgent || false) : false);
  const effectiveIsAdmin = isImpersonating 
    ? impersonatedUser.isAdmin 
    : (rolesLoaded ? (user?.isAdmin || false) : false);
  const effectiveUserEmail = isImpersonating ? impersonatedUser.userEmail : (user?.userDetails || '');

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      rolesLoaded,
      login,
      logout,
      isAuthenticated,
      impersonatedUser,
      isImpersonating,
      startImpersonation,
      stopImpersonation,
      effectiveIsAgent,
      effectiveIsAdmin,
      effectiveUserEmail
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;