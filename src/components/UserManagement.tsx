import React, { useState, useEffect } from 'react';
import { userManagementAPI, assignmentGroupsAPI, User, AssignmentGroup } from '../services/api';
import './UserManagement.css';

interface NewUserForm {
  email: string;
  displayName: string;
  role: 'user' | 'agent' | 'admin';
  assignmentGroups: number[];
}

interface EditUserForm {
  email: string;
  displayName: string;
  role: 'user' | 'agent' | 'admin';
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

  // Edit User Modal State
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editUserForm, setEditUserForm] = useState<EditUserForm>({
    email: '',
    displayName: '',
    role: 'user',
    assignmentGroups: []
  });
  const [editFormErrors, setEditFormErrors] = useState<{ [key: string]: string }>({});
  const [savingUser, setSavingUser] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  // Load assignment groups when modal opens
  useEffect(() => {
    if (showAddUserModal || showEditUserModal) {
      loadAssignmentGroups();
    }
  }, [showAddUserModal, showEditUserModal]);

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

  const updateUserRole = async (userEmail: string, newRole: 'user' | 'agent' | 'admin') => {
    const roleLabels = { user: 'User', agent: 'Agent', admin: 'Admin' };
    const confirmMessage = `Are you sure you want to change ${userEmail} to ${roleLabels[newRole]}?`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setUpdatingUser(userEmail);
      setError('');
      setSuccessMessage('');

      const response = await userManagementAPI.updateRole(userEmail, newRole);

      if (response.success) {
        const roleLabels = { user: 'User', agent: 'Agent', admin: 'Admin' };
        setSuccessMessage(`User role updated successfully to ${roleLabels[newRole]}`);
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

  const [addingUser, setAddingUser] = useState(false);

  // Edit User Modal Functions
  const openEditUserModal = (user: User) => {
    setEditUserForm({
      email: user.userEmail,
      displayName: user.displayName || '',
      role: user.role,
      assignmentGroups: []  // TODO: Load user's current assignment groups
    });
    setEditFormErrors({});
    setShowEditUserModal(true);
  };

  const closeEditUserModal = () => {
    setShowEditUserModal(false);
    setEditUserForm({
      email: '',
      displayName: '',
      role: 'user',
      assignmentGroups: []
    });
    setEditFormErrors({});
  };

  const validateEditForm = (): boolean => {
    const errors: { [key: string]: string } = {};
    
    if (!editUserForm.displayName.trim()) {
      errors.displayName = 'Display name is required';
    }
    
    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditFormChange = (field: keyof EditUserForm, value: string | number[]) => {
    setEditUserForm(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (editFormErrors[field]) {
      setEditFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleEditAssignmentGroupToggle = (groupId: number) => {
    setEditUserForm(prev => {
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

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEditForm()) {
      return;
    }
    
    try {
      setSavingUser(true);
      setError('');
      
      const response = await userManagementAPI.update({
        targetUserEmail: editUserForm.email,
        displayName: editUserForm.displayName,
        newRole: editUserForm.role
      });
      
      if (response.success) {
        setSuccessMessage(`User ${editUserForm.email} updated successfully`);
        closeEditUserModal();
        await loadUsers(); // Refresh the users list
      } else {
        throw new Error(response.error || 'Failed to update user');
      }
    } catch (err) {
      console.error('Error updating user:', err);
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setSavingUser(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setAddingUser(true);
      setError('');
      
      const response = await userManagementAPI.create({
        email: newUserForm.email,
        displayName: newUserForm.displayName,
        role: newUserForm.role,
        assignmentGroups: newUserForm.assignmentGroups
      });
      
      if (response.success) {
        setSuccessMessage(`User ${newUserForm.email} created successfully`);
        closeAddUserModal();
        await loadUsers(); // Refresh the users list
      } else {
        throw new Error(response.error || 'Failed to create user');
      }
    } catch (err) {
      console.error('Error creating user:', err);
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setAddingUser(false);
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
        <p className="page-subtitle">Manage user roles and permissions</p>
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
          <h3>Admins</h3>
          <div className="stat-number admin">
            <div className="stat-badge">
              {users.filter(user => user.role === 'admin').length}
            </div>
          </div>
        </div>
        <div className="stat-card">
          <h3>Agents</h3>
          <div className="stat-number agent">
            <div className="stat-badge">
              {users.filter(user => user.role === 'agent').length}
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
          <div className="table-actions">
            <button onClick={openAddUserModal} className="btn btn-add-user">
              + Add User
            </button>
            <button onClick={loadUsers} className="refresh-button" disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
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
                  <tr 
                    key={user.userEmail} 
                    className="clickable-row"
                    onClick={() => openEditUserModal(user)}
                  >
                    <td className="user-info">
                      <div className="user-details">
                        <span className="email">{user.userEmail.split('&')[0]}</span>
                        {user.displayName && (
                          <span className="display-name">{user.displayName}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={getRoleBadgeClass(user.role)}>
                        {user.role === 'admin' ? 'Admin' : user.role === 'agent' ? 'Agent' : 'User'}
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
                        {user.role === 'user' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateUserRole(user.userEmail, 'agent');
                            }}
                            disabled={updatingUser === user.userEmail}
                            className="btn btn-promote"
                          >
                            {updatingUser === user.userEmail ? 'Updating...' : 'Make Agent'}
                          </button>
                        )}
                        {user.role === 'agent' && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateUserRole(user.userEmail, 'admin');
                              }}
                              disabled={updatingUser === user.userEmail}
                              className="btn btn-promote-admin"
                            >
                              {updatingUser === user.userEmail ? 'Updating...' : 'Make Admin'}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateUserRole(user.userEmail, 'user');
                              }}
                              disabled={updatingUser === user.userEmail}
                              className="btn btn-demote"
                            >
                              {updatingUser === user.userEmail ? 'Updating...' : 'Make User'}
                            </button>
                          </>
                        )}
                        {user.role === 'admin' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateUserRole(user.userEmail, 'agent');
                            }}
                            disabled={updatingUser === user.userEmail}
                            className="btn btn-demote"
                          >
                            {updatingUser === user.userEmail ? 'Updating...' : 'Make Agent'}
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
                      className={`role-option ${newUserForm.role === 'agent' ? 'selected' : ''}`}
                      onClick={() => handleFormChange('role', 'agent')}
                    >
                      <span className="role-icon">🛡️</span>
                      <span className="role-name">Agent</span>
                      <span className="role-desc">Full access including user management</span>
                    </button>
                  </div>
                </div>
              </div>
              
              {newUserForm.role === 'agent' && (
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
                <button type="button" className="btn btn-cancel" onClick={closeAddUserModal} disabled={addingUser}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-submit" disabled={addingUser}>
                  {addingUser ? 'Adding...' : 'Add User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && (
        <div className="modal-overlay" onClick={closeEditUserModal}>
          <div className="modal-content edit-user-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit User</h2>
              <button className="close-button" onClick={closeEditUserModal}>×</button>
            </div>
            
            <form onSubmit={handleSaveUser} className="edit-user-form">
              <div className="form-section">
                <h3>User Information</h3>
                
                <div className="form-group">
                  <label htmlFor="edit-email">Email Address</label>
                  <input
                    type="email"
                    id="edit-email"
                    value={editUserForm.email}
                    disabled
                    className="disabled-input"
                  />
                  <span className="helper-text">Email cannot be changed</span>
                </div>
                
                <div className="form-group">
                  <label htmlFor="edit-displayName">Display Name *</label>
                  <input
                    type="text"
                    id="edit-displayName"
                    value={editUserForm.displayName}
                    onChange={(e) => handleEditFormChange('displayName', e.target.value)}
                    placeholder="John Doe"
                    className={editFormErrors.displayName ? 'error' : ''}
                  />
                  {editFormErrors.displayName && <span className="error-text">{editFormErrors.displayName}</span>}
                </div>
              </div>
              
              <div className="form-section">
                <h3>Role Assignment</h3>
                
                <div className="form-group">
                  <label>User Role</label>
                  <div className="role-selector">
                    <button
                      type="button"
                      className={`role-option ${editUserForm.role === 'user' ? 'selected' : ''}`}
                      onClick={() => handleEditFormChange('role', 'user')}
                    >
                      <span className="role-icon">👤</span>
                      <span className="role-name">User</span>
                      <span className="role-desc">Standard access to create and view tickets</span>
                    </button>
                    <button
                      type="button"
                      className={`role-option ${editUserForm.role === 'agent' ? 'selected' : ''}`}
                      onClick={() => handleEditFormChange('role', 'agent')}
                    >
                      <span className="role-icon">🛡️</span>
                      <span className="role-name">Agent</span>
                      <span className="role-desc">Full access including user management</span>
                    </button>
                  </div>
                </div>
              </div>
              
              {editUserForm.role === 'agent' && (
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
                            checked={editUserForm.assignmentGroups.includes(group.AssignmentGroupID)}
                            onChange={() => handleEditAssignmentGroupToggle(group.AssignmentGroupID)}
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
                <button type="button" className="btn btn-cancel" onClick={closeEditUserModal} disabled={savingUser}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-submit" disabled={savingUser}>
                  {savingUser ? 'Saving...' : 'Save Changes'}
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