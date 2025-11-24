import React, { useState, useEffect } from 'react';
import { userManagementAPI, User } from '../services/api';
import './UserManagement.css';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await userManagementAPI.getAll();
      
      if (response.success && response.data) {
        setUsers(response.data);
      } else {
        throw new Error(response.error || 'Failed to load users');
      }
    } catch (err) {
      console.error('Error loading users:', err);
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userEmail: string, newRole: 'user' | 'admin') => {
    const confirmMessage = newRole === 'admin' 
      ? `Are you sure you want to promote ${userEmail} to Admin?`
      : `Are you sure you want to demote ${userEmail} to User?`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setUpdatingUser(userEmail);
      setError('');
      setSuccessMessage('');

      const response = await userManagementAPI.updateRole(userEmail, newRole);

      if (response.success) {
        setSuccessMessage(`User role updated successfully to ${newRole === 'admin' ? 'Admin' : 'User'}`);
        await loadUsers(); // Reload the users list
      } else {
        throw new Error(response.error || 'Failed to update user role');
      }
    } catch (err) {
      console.error('Error updating user role:', err);
      setError(err instanceof Error ? err.message : 'Failed to update user role');
    } finally {
      setUpdatingUser(null);
    }
  };

  const getRoleBadgeClass = (role: string) => {
    return `role-badge ${role.toLowerCase()}`;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  };

  const clearMessages = () => {
    setError('');
    setSuccessMessage('');
  };

  if (loading) {
    return (
      <div className="user-management">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management">
      <div className="page-header">
        <h2>User Management</h2>
        <p>Manage user roles and permissions</p>
      </div>

      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button onClick={clearMessages} className="close-button">×</button>
        </div>
      )}

      {successMessage && (
        <div className="success-message">
          <span>{successMessage}</span>
          <button onClick={clearMessages} className="close-button">×</button>
        </div>
      )}

      <div className="user-stats">
        <div className="stat-card">
          <h3>Total Users</h3>
          <div className="stat-number">{users.length}</div>
        </div>
        <div className="stat-card">
          <h3>Administrators</h3>
          <div className="stat-number admin">
            <div className="stat-badge">
              {users.filter(user => user.role === 'admin').length}
            </div>
          </div>
        </div>
        <div className="stat-card">
          <h3>Regular Users</h3>
          <div className="stat-number user">
            <div className="stat-badge">
              {users.filter(user => user.role === 'user').length}
            </div>
          </div>
        </div>
      </div>

      <div className="users-table-container">
        <div className="table-header">
          <h3>User List</h3>
          <button onClick={loadUsers} className="refresh-button" disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {users.length === 0 ? (
          <div className="empty-state">
            <p>No users found</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Assigned Date</th>
                  <th>Assigned By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.userEmail}>
                    <td className="user-info">
                      <div className="user-details">
                        <span className="email">{user.userEmail}</span>
                        <span className="object-id">{user.userObjectId}</span>
                      </div>
                    </td>
                    <td>
                      <span className={getRoleBadgeClass(user.role)}>
                        {user.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="date-cell">
                      {formatDate(user.assignedDate)}
                    </td>
                    <td>
                      {user.assignedBy}
                    </td>
                    <td className="actions-cell">
                      <div className="action-buttons">
                        {user.role === 'user' ? (
                          <button
                            onClick={() => updateUserRole(user.userEmail, 'admin')}
                            disabled={updatingUser === user.userEmail}
                            className="action-button promote"
                          >
                            {updatingUser === user.userEmail ? 'Promoting...' : 'Make Admin'}
                          </button>
                        ) : (
                          <button
                            onClick={() => updateUserRole(user.userEmail, 'user')}
                            disabled={updatingUser === user.userEmail}
                            className="action-button demote"
                          >
                            {updatingUser === user.userEmail ? 'Demoting...' : 'Make User'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;