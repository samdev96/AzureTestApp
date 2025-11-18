import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './UserMenu.css';

const UserMenu: React.FC = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  const getDisplayName = () => {
    const emailClaim = user.claims.find(claim => 
      claim.typ === 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress' ||
      claim.typ === 'preferred_username' ||
      claim.typ === 'email'
    );
    
    return emailClaim?.val || user.userDetails || 'User';
  };

  const getUserInitials = () => {
    const name = getDisplayName();
    const parts = name.split(/[@\s]/);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="user-menu">
      <button 
        className="user-menu-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="user-avatar">
          {getUserInitials()}
        </div>
        <span className="user-name">{getDisplayName()}</span>
        <span className={`user-menu-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>
      
      {isOpen && (
        <div className="user-menu-dropdown">
          <div className="user-menu-header">
            <div className="user-avatar large">
              {getUserInitials()}
            </div>
            <div className="user-details">
              <div className="user-display-name">{getDisplayName()}</div>
              <div className="user-provider">via {user.identityProvider}</div>
            </div>
          </div>
          
          <div className="user-menu-divider"></div>
          
          <div className="user-menu-items">
            <button className="user-menu-item">
              <span className="menu-icon">👤</span>
              Profile Settings
            </button>
            <button className="user-menu-item">
              <span className="menu-icon">🎛️</span>
              Preferences
            </button>
            <button className="user-menu-item">
              <span className="menu-icon">❓</span>
              Help & Support
            </button>
          </div>
          
          <div className="user-menu-divider"></div>
          
          <button 
            className="user-menu-item logout"
            onClick={logout}
          >
            <span className="menu-icon">🚪</span>
            Sign Out
          </button>
        </div>
      )}
      
      {isOpen && (
        <div 
          className="user-menu-overlay"
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default UserMenu;