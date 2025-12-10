import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const AuthDebug: React.FC = () => {
  const { user } = useAuth();
  const [authData, setAuthData] = useState<any>(null);
  const [apiAuthData, setApiAuthData] = useState<any>(null);
  const [dbRolesData, setDbRolesData] = useState<any>(null);

  useEffect(() => {
    // Fetch auth data from /.auth/me
    fetch('/.auth/me')
      .then(response => response.json())
      .then(data => setAuthData(data))
      .catch(error => console.error('Error fetching auth data:', error));

    // Fetch auth data from API
    fetch('/api/authTest')
      .then(response => response.json())
      .then(data => setApiAuthData(data))
      .catch(error => console.error('Error fetching API auth data:', error));

    // Fetch database roles
    fetch('/api/user-roles')
      .then(response => response.json())
      .then(data => setDbRolesData(data))
      .catch(error => console.error('Error fetching database roles:', error));
  }, []);

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'monospace', 
      backgroundColor: '#f5f5f5', 
      margin: '20px',
      borderRadius: '8px',
      overflow: 'auto'
    }}>
      <h2>🔍 Authentication Debug Information</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>React Auth Context (useAuth hook):</h3>
        <pre style={{ backgroundColor: 'white', padding: '10px', borderRadius: '4px' }}>
          {JSON.stringify(user, null, 2)}
        </pre>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Direct /.auth/me call:</h3>
        <pre style={{ backgroundColor: 'white', padding: '10px', borderRadius: '4px' }}>
          {JSON.stringify(authData, null, 2)}
        </pre>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>API Authentication Test (/api/authTest):</h3>
        <pre style={{ backgroundColor: 'white', padding: '10px', borderRadius: '4px' }}>
          {JSON.stringify(apiAuthData, null, 2)}
        </pre>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Database Roles Check (/api/user-roles):</h3>
        <pre style={{ backgroundColor: 'white', padding: '10px', borderRadius: '4px' }}>
          {JSON.stringify(dbRolesData, null, 2)}
        </pre>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Analysis:</h3>
        <ul style={{ backgroundColor: 'white', padding: '10px', borderRadius: '4px' }}>
          <li><strong>Is Agent (React Context):</strong> {user?.isAgent ? '✅ YES' : '❌ NO'}</li>
          <li><strong>Has Agent Role in userRoles:</strong> {user?.userRoles?.some(r => r.toLowerCase() === 'agent') ? '✅ YES' : '❌ NO'}</li>
          <li><strong>Database Agent Status:</strong> {dbRolesData?.isAgent ? '✅ YES' : '❌ NO'}</li>
          <li><strong>Database Roles:</strong> {dbRolesData?.roles?.join(', ') || 'None'}</li>
          <li><strong>User Roles (React Context):</strong> {user?.userRoles?.join(', ') || 'None'}</li>
          <li><strong>User ID:</strong> {user?.userId || 'Not available'}</li>
          <li><strong>Identity Provider:</strong> {user?.identityProvider || 'Not available'}</li>
        </ul>
      </div>
    </div>
  );
};

export default AuthDebug;