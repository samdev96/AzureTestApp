import React, { useState, useEffect } from 'react';
import { userManagementAPI, assignmentGroupsAPI, User, AssignmentGroup } from '../services/api';
import './UserManagement.css';

interface NewUserForm {
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  assignmentGroups: number[];
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  
  // Add User Modal State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [assignmentGroups, setAssignmentGroups] = useState<AssignmentGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [newUserForm, setNewUserForm] = useState<NewUserForm>({
    email: '',
    displayName: '',
    role: 'user',
    assignmentGroups: []
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    loadUsers();
  }, []);

  // Load assignment groups when modal opens
  useEffect(() => {
    if (showAddUserModal) {
      loadAssignmentGroups();
    }
  }, [showAddUserModal]);

  const loadAssignmentGroups = async () => {
    try {
      setLoadingGroups(true);
      const response = await assignmentGroupsAPI.getAll();
      if (response.success && response.data) {
        setAssignmentGroups(response.data);
      }
    } catch (err) {
      console.error('Error loading assignment groups:', err);
    } finally {
      setLoadingGroups(false);
    }
  };

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

  // Add User Modal Functions
  const openAddUserModal = () => {
    setNewUserForm({
      email: '',
      displayName: '',
      role: 'user',
      assignmentGroups: []
    });
    setFormErrors({});
    setShowAddUserModal(true);
  };

  const closeAddUserModal = () => {
    setShowAddUserModal(false);
    setNewUserForm({
      email: '',
      displayName: '',
      role: 'user',
      assignmentGroups: []
    });
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};
    
    if (!newUserForm.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUserForm.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!newUserForm.displayName.trim()) {
      errors.displayName = 'Display name is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormChange = (field: keyof NewUserForm, value: string | number[]) => {
    setNewUserForm(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleAssignmentGroupToggle = (groupId: number) => {
    setNewUserForm(prev => {
      const currentGroups = prev.assignmentGroups;
      if (currentGroups.includes(groupId)) {
        return {
          ...prev,
          assignmentGroups: currentGroups.filter(id => id !== groupId)
        };
      } else {
        return {
          ...prev,
          assignmentGroups: [...currentGroups, groupId]
        };
      }
    });
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // TODO: Implement backend API call
    console.log('New user data:', newUserForm);
    setSuccessMessage(`User ${newUserForm.email} would be created (backend not implemented yet)`);
    closeAddUserModal();
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
        <div className="header-content">
          <h2>User Management</h2>
          <p>Manage user roles and permissions</p>
        </div>
        <button onClick={openAddUserModal} className="btn btn-add-user">
          + Add User
        </button>
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
                        <span className="email">{user.userEmail.split('&')[0]}</span>
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
                            className="btn btn-promote"
                          >
                            {updatingUser === user.userEmail ? 'Promoting...' : 'Make Admin'}
                          </button>
                        ) : (
                          <button
                            onClick={() => updateUserRole(user.userEmail, 'user')}
                            disabled={updatingUser === user.userEmail}
                            className="btn btn-demote"
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

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="modal-overlay" onClick={closeAddUserModal}>
          <div className="modal-content add-user-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New User</h2>
              <button className="close-button" onClick={closeAddUserModal}>×</button>
            </div>
            
            <form onSubmit={handleAddUser} className="add-user-form">
              <div className="form-section">
                <h3>User Information</h3>
                
                <div className="form-group">
                  <label htmlFor="email">Email Address *</label>
                  <input
                    type="email"
                    id="email"
                    value={newUserForm.email}
                    onChange={(e) => handleFormChange('email', e.target.value)}
                    placeholder="user@example.com"
                    className={formErrors.email ? 'error' : ''}
                  />
                  {formErrors.email && <span className="error-text">{formErrors.email}</span>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="displayName">Display Name *</label>
                  <input
                    type="text"
                    id="displayName"
                    value={newUserForm.displayName}
                    onChange={(e) => handleFormChange('displayName', e.target.value)}
                    placeholder="John Doe"
                    className={formErrors.displayName ? 'error' : ''}
                  />
                  {formErrors.displayName && <span className="error-text">{formErrors.displayName}</span>}
                </div>
              </div>
              
              <div className="form-section">
                <h3>Role Assignment</h3>
                
                <div className="form-group">
                  <label>User Role</label>
                  <div className="role-selector">
                    <button
                      type="button"
                      className={`role-option ${newUserForm.role === 'user' ? 'selected' : ''}`}
                      onClick={() => handleFormChange('role', 'user')}
                    >
                      <span className="role-icon">👤</span>
                      <span className="role-name">User</span>
                      <span className="role-desc">Standard access to create and view tickets</span>
                    </button>
                    <button
                      type="button"
                      className={`role-option ${newUserForm.role === 'admin' ? 'selected' : ''}`}
                      onClick={() => handleFormChange('role', 'admin')}
                    >
                      <span className="role-icon">🛡️</span>
                      <span className="role-name">Administrator</span>
                      <span className="role-desc">Full access including user management</span>
                    </button>
                  </div>
                </div>
              </div>
              
              {newUserForm.role === 'admin' && (
                <div className="form-section">
                  <h3>Assignment Groups</h3>
                  <p className="section-desc">Select the groups this user should be a member of</p>
                  
                  {loadingGroups ? (
                    <div className="loading-groups">Loading assignment groups...</div>
                  ) : assignmentGroups.length === 0 ? (
                    <div className="no-groups">No assignment groups available</div>
                  ) : (
                    <div className="assignment-groups-list">
                      {assignmentGroups.map((group) => (
                        <label key={group.AssignmentGroupID} className="group-checkbox">
                          <input
                            type="checkbox"
                            checked={newUserForm.assignmentGroups.includes(group.AssignmentGroupID)}
                            onChange={() => handleAssignmentGroupToggle(group.AssignmentGroupID)}
                          />
                          <span className="checkbox-custom"></span>
                          <div className="group-info">
                            <span className="group-name">{group.GroupName}</span>
                            {group.Description && (
                              <span className="group-desc">{group.Description}</span>
                            )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              )}
              
              <div className="modal-footer">
                <button type="button" className="btn btn-cancel" onClick={closeAddUserModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-submit">
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;