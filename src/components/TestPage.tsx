import React from 'react';

const TestPage: React.FC = () => {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>🎯 VibeNow ITSM - Test Page</h1>
      <p>If you can see this page, the React app is working correctly!</p>
      <p>The issue might be with the authentication system.</p>
      <div style={{ marginTop: '20px' }}>
        <a href="/api/authTest" style={{ 
          display: 'inline-block',
          padding: '10px 20px',
          background: '#007bff',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '5px'
        }}>
          Test API Authentication
        </a>
      </div>
    </div>
  );
};

export default TestPage;