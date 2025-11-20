import React from 'react';

const Login: React.FC = () => {
  const handleLogin = () => {
    window.location.href = '/.auth/login/aad';
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
        padding: '40px',
        maxWidth: '450px',
        width: '100%',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          color: '#2d3748',
          margin: '0 0 8px 0'
        }}>
          VibeNow
        </h1>
        <p style={{
          color: '#718096',
          fontSize: '16px',
          margin: '0 0 40px 0'
        }}>
          IT Service Management System
        </p>
        
        <div style={{ fontSize: '48px', margin: '0 0 24px 0' }}>🔐</div>
        
        <h2 style={{
          fontSize: '24px',
          fontWeight: '600',
          color: '#2d3748',
          margin: '0 0 16px 0'
        }}>
          Welcome Back
        </h2>
        
        <p style={{
          color: '#718096',
          fontSize: '16px',
          lineHeight: '1.5',
          margin: '0 0 32px 0'
        }}>
          Please sign in with your organizational account to access the ITSM system.
        </p>
        
        <button 
          onClick={handleLogin}
          style={{
            background: 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '16px 32px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px'
          }}
        >
          <span style={{ fontSize: '18px' }}>🏢</span>
          Sign in with Azure AD
        </button>
      </div>
    </div>
  );
};

export default Login;