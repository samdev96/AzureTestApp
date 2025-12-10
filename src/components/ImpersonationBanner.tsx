import React from 'react';
import { useAuth } from '../context/AuthContext';
import './ImpersonationBanner.css';

const ImpersonationBanner: React.FC = () => {
  const { isImpersonating, impersonatedUser, stopImpersonation, user } = useAuth();

  if (!isImpersonating || !impersonatedUser) {
    return null;
  }

  const getRoleBadge = (role: string) => {
    const roleColors: Record<string, string> = {
      admin: '#9b59b6',
      agent: '#27ae60',
      user: '#3498db'
    };
    return (
      <span 
        className="impersonation-role-badge"
        style={{ backgroundColor: roleColors[role.toLowerCase()] || '#7f8c8d' }}
      >
        {role.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="impersonation-banner">
      <div className="impersonation-content">
        <span className="impersonation-icon">🎭</span>
        <span className="impersonation-text">
          <strong>Impersonation Mode:</strong> You are viewing as{' '}
          <span className="impersonated-user">
            {impersonatedUser.displayName || impersonatedUser.userEmail}
          </span>
          {getRoleBadge(impersonatedUser.role)}
        </span>
        <span className="impersonation-admin-info">
          (Logged in as: {user?.userDetails})
        </span>
      </div>
      <button 
        className="stop-impersonation-btn"
        onClick={stopImpersonation}
        title="Stop impersonating and return to your account"
      >
        ✕ Stop Impersonation
      </button>
    </div>
  );
};

export default ImpersonationBanner;
