import React from 'react';
import { useAuth } from '../context/AuthContext';
import Home from './Home';
import AgentDashboard from './AgentDashboard';

interface DashboardRouterProps {
  forceUserPortal?: boolean;
}

const DashboardRouter: React.FC<DashboardRouterProps> = ({ forceUserPortal = false }) => {
  const { user, loading, effectiveIsAgent, isImpersonating, impersonatedUser } = useAuth();

  // Debug logging for dashboard routing
  console.log('🔀 DashboardRouter:', { 
    loading, 
    userExists: !!user, 
    userIsAgent: user?.isAgent, 
    userIsAdmin: user?.isAdmin,
    effectiveIsAgent,
    isImpersonating,
    impersonatedIsAgent: impersonatedUser?.isAgent,
    forceUserPortal 
  });

  // Wait for auth to complete before deciding which dashboard to show
  // Also wait for user object to have the isAgent property set (not just exist)
  const isRoleLoaded = user !== null && typeof user.isAgent === 'boolean';
  
  if (loading || !isRoleLoaded) {
    console.log('🔀 DashboardRouter: Still loading...', { loading, isRoleLoaded });
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #e2e8f0',
              borderTop: '4px solid #4299e1',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }}></div>
            <p style={{ color: '#718096', margin: 0 }}>Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // If forceUserPortal is true (e.g., /portal route), always show user portal
  if (forceUserPortal) {
    return <Home />;
  }

  // If user is agent/admin (or impersonating one), show agent dashboard; otherwise show regular home
  if (effectiveIsAgent) {
    return <AgentDashboard />;
  }

  return <Home />;
};

export default DashboardRouter;