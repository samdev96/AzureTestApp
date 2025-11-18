import React from 'react';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login: React.FC = () => {
  const { login, loading } = useAuth();

  if (loading) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>VibeNow</h1>
          <p>IT Service Management System</p>
        </div>
        
        <div className="login-content">
          <div className="login-icon">
            🔐
          </div>
          <h2>Welcome Back</h2>
          <p className="login-description">
            Please sign in with your organizational account to access the ITSM system.
          </p>
          
          <button 
            className="login-button"
            onClick={login}
          >
            <span className="login-button-icon">🏢</span>
            Sign in with Azure AD
          </button>
          
          <div className="login-info">
            <p><strong>✅ Secure Authentication</strong></p>
            <p>• Single Sign-On (SSO) enabled</p>
            <p>• Multi-factor authentication supported</p>
            <p>• Enterprise security standards</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;