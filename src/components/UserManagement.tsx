import React, { useState, useEffect } from 'react';
import { userManagementAPI, assignmentGroupsAPI, User, AssignmentGroup } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './UserManagement.css';

interface NewUserForm {
  email: string;
  displayName: string;
  role: 'user' | 'agent' | 'admin';
  assignmentGroups: number[];
}

interface EditUserForm {
  // Core Identity
  email: string;
  username: string;
  displayName: string;
  firstName: string;
  lastName: string;
  preferredName: string;
  
  // Organizational Hierarchy
  managerEmail: string;
  department: string;
  costCenter: string;
  division: string;
  location: string;
  country: string;
  
  // Job Information
  jobTitle: string;
  employeeId: string;
  employeeType: string;
  companyName: string;
  
  // Contact Information
  businessPhone: string;
  mobilePhone: string;
  officeLocation: string;
  
  // Application Fields
  role: 'user' | 'agent' | 'admin';
  timeZone: string;
  locale: string;
  assignmentGroups: number[];
}

const UserManagement: React.FC = () => {
  const { user: currentUser, startImpersonation } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [impersonatingUser, setImpersonatingUser] = useState<string | null>(null);
  
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
    username: '',
    displayName: '',
    firstName: '',
    lastName: '',
    preferredName: '',
    managerEmail: '',
    department: '',
    costCenter: '',
    division: '',
    location: '',
    country: '',
    jobTitle: '',
    employeeId: '',
    employeeType: '',
    companyName: '',
    businessPhone: '',
    mobilePhone: '',
    officeLocation: '',
    role: 'user',
    timeZone: '',
    locale: '',
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
      username: user.username || '',
      displayName: user.displayName || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      preferredName: user.preferredName || '',
      managerEmail: user.managerEmail || '',
      department: user.department || '',
      costCenter: user.costCenter || '',
      division: user.division || '',
      location: user.location || '',
      country: user.country || '',
      jobTitle: user.jobTitle || '',
      employeeId: user.employeeId || '',
      employeeType: user.employeeType || '',
      companyName: user.companyName || '',
      businessPhone: user.businessPhone || '',
      mobilePhone: user.mobilePhone || '',
      officeLocation: user.officeLocation || '',
      role: user.role,
      timeZone: user.timeZone || '',
      locale: user.locale || '',
      assignmentGroups: []  // TODO: Load user's current assignment groups
    });
    setEditFormErrors({});
    setShowEditUserModal(true);
  };

  const closeEditUserModal = () => {
    setShowEditUserModal(false);
    setEditUserForm({
      email: '',
      username: '',
      displayName: '',
      firstName: '',
      lastName: '',
      preferredName: '',
      managerEmail: '',
      department: '',
      costCenter: '',
      division: '',
      location: '',
      country: '',
      jobTitle: '',
      employeeId: '',
      employeeType: '',
      companyName: '',
      businessPhone: '',
      mobilePhone: '',
      officeLocation: '',
      role: 'user',
      timeZone: '',
      locale: '',
      assignmentGroups: []
    });
    setEditFormErrors({});
  };

  const validateEditForm = (): boolean => {
    const errors: { [key: string]: string } = {};
    
    if (!editUserForm.firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    if (!editUserForm.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }
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
        firstName: editUserForm.firstName,
        lastName: editUserForm.lastName,
        preferredName: editUserForm.preferredName || undefined,
        username: editUserForm.username,
        managerEmail: editUserForm.managerEmail || undefined,
        department: editUserForm.department || undefined,
        costCenter: editUserForm.costCenter || undefined,
        division: editUserForm.division || undefined,
        location: editUserForm.location || undefined,
        country: editUserForm.country || undefined,
        jobTitle: editUserForm.jobTitle || undefined,
        employeeId: editUserForm.employeeId || undefined,
        employeeType: editUserForm.employeeType || undefined,
        companyName: editUserForm.companyName || undefined,
        businessPhone: editUserForm.businessPhone || undefined,
        mobilePhone: editUserForm.mobilePhone || undefined,
        officeLocation: editUserForm.officeLocation || undefined,
        timeZone: editUserForm.timeZone || undefined,
        locale: editUserForm.locale || undefined,
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
                        {/* Role change dropdown - don't show for yourself */}
                        {user.userEmail.toLowerCase() !== (currentUser?.userDetails?.toLowerCase() || '') && (
                          <select
                            className="role-dropdown"
                            value={user.role}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation();
                              const newRole = e.target.value as 'user' | 'agent' | 'admin';
                              if (newRole !== user.role) {
                                updateUserRole(user.userEmail, newRole);
                              }
                            }}
                            disabled={updatingUser === user.userEmail}
                          >
                            <option value="user">User</option>
                            <option value="agent">Agent</option>
                            <option value="admin">Admin</option>
                          </select>
                        )}
                        {/* Impersonate button - only for admins, only for non-admin users, and not yourself */}
                        {currentUser?.isAdmin && user.role !== 'admin' && user.userEmail.toLowerCase() !== (currentUser?.userDetails?.toLowerCase() || '') && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              setImpersonatingUser(user.userEmail);
                              const success = await startImpersonation(user.userEmail);
                              setImpersonatingUser(null);
                              if (success) {
                                setSuccessMessage(`Now impersonating ${user.userEmail}`);
                              } else {
                                setError('Failed to start impersonation');
                              }
                            }}
                            disabled={impersonatingUser === user.userEmail}
                            className="btn btn-impersonate"
                            title={`View app as ${user.userEmail}`}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                            </svg>
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
          <div className="modal-content edit-user-modal expanded-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit User</h2>
              <button className="close-button" onClick={closeEditUserModal}>×</button>
            </div>
            
            <form onSubmit={handleSaveUser} className="edit-user-form">
              {/* Core Identity Section */}
              <div className="form-section">
                <h3>🪪 User Identity</h3>
                
                <div className="form-row">
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
                    <label htmlFor="edit-username">Username</label>
                    <input
                      type="text"
                      id="edit-username"
                      value={editUserForm.username}
                      onChange={(e) => handleEditFormChange('username', e.target.value)}
                      placeholder="jdoe"
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="edit-firstName">First Name *</label>
                    <input
                      type="text"
                      id="edit-firstName"
                      value={editUserForm.firstName}
                      onChange={(e) => handleEditFormChange('firstName', e.target.value)}
                      placeholder="John"
                      className={editFormErrors.firstName ? 'error' : ''}
                    />
                    {editFormErrors.firstName && <span className="error-text">{editFormErrors.firstName}</span>}
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="edit-lastName">Last Name *</label>
                    <input
                      type="text"
                      id="edit-lastName"
                      value={editUserForm.lastName}
                      onChange={(e) => handleEditFormChange('lastName', e.target.value)}
                      placeholder="Doe"
                      className={editFormErrors.lastName ? 'error' : ''}
                    />
                    {editFormErrors.lastName && <span className="error-text">{editFormErrors.lastName}</span>}
                  </div>
                </div>
                
                <div className="form-row">
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
                  
                  <div className="form-group">
                    <label htmlFor="edit-preferredName">Preferred Name</label>
                    <input
                      type="text"
                      id="edit-preferredName"
                      value={editUserForm.preferredName}
                      onChange={(e) => handleEditFormChange('preferredName', e.target.value)}
                      placeholder="Johnny"
                    />
                  </div>
                </div>
              </div>
              
              {/* Organizational Hierarchy Section */}
              <div className="form-section">
                <h3>🏢 Organization</h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="edit-department">Department</label>
                    <input
                      type="text"
                      id="edit-department"
                      value={editUserForm.department}
                      onChange={(e) => handleEditFormChange('department', e.target.value)}
                      placeholder="IT Services"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="edit-division">Division</label>
                    <input
                      type="text"
                      id="edit-division"
                      value={editUserForm.division}
                      onChange={(e) => handleEditFormChange('division', e.target.value)}
                      placeholder="Technology"
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="edit-costCenter">Cost Center</label>
                    <input
                      type="text"
                      id="edit-costCenter"
                      value={editUserForm.costCenter}
                      onChange={(e) => handleEditFormChange('costCenter', e.target.value)}
                      placeholder="CC-1234"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="edit-managerEmail">Manager Email</label>
                    <input
                      type="email"
                      id="edit-managerEmail"
                      value={editUserForm.managerEmail}
                      onChange={(e) => handleEditFormChange('managerEmail', e.target.value)}
                      placeholder="manager@company.com"
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="edit-location">Location</label>
                    <input
                      type="text"
                      id="edit-location"
                      value={editUserForm.location}
                      onChange={(e) => handleEditFormChange('location', e.target.value)}
                      placeholder="New York"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="edit-country">Country</label>
                    <input
                      type="text"
                      id="edit-country"
                      value={editUserForm.country}
                      onChange={(e) => handleEditFormChange('country', e.target.value)}
                      placeholder="United States"
                    />
                  </div>
                </div>
              </div>
              
              {/* Job Information Section */}
              <div className="form-section">
                <h3>💼 Job Information</h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="edit-jobTitle">Job Title</label>
                    <input
                      type="text"
                      id="edit-jobTitle"
                      value={editUserForm.jobTitle}
                      onChange={(e) => handleEditFormChange('jobTitle', e.target.value)}
                      placeholder="Software Engineer"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="edit-employeeId">Employee ID</label>
                    <input
                      type="text"
                      id="edit-employeeId"
                      value={editUserForm.employeeId}
                      onChange={(e) => handleEditFormChange('employeeId', e.target.value)}
                      placeholder="EMP-12345"
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="edit-employeeType">Employee Type</label>
                    <select
                      id="edit-employeeType"
                      value={editUserForm.employeeType}
                      onChange={(e) => handleEditFormChange('employeeType', e.target.value)}
                    >
                      <option value="">Select Type</option>
                      <option value="Employee">Employee</option>
                      <option value="Contractor">Contractor</option>
                      <option value="Vendor">Vendor</option>
                      <option value="Intern">Intern</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="edit-companyName">Company Name</label>
                    <input
                      type="text"
                      id="edit-companyName"
                      value={editUserForm.companyName}
                      onChange={(e) => handleEditFormChange('companyName', e.target.value)}
                      placeholder="Company Inc."
                    />
                  </div>
                </div>
              </div>
              
              {/* Contact Information Section */}
              <div className="form-section">
                <h3>📞 Contact Information</h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="edit-businessPhone">Business Phone</label>
                    <input
                      type="tel"
                      id="edit-businessPhone"
                      value={editUserForm.businessPhone}
                      onChange={(e) => handleEditFormChange('businessPhone', e.target.value)}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="edit-mobilePhone">Mobile Phone</label>
                    <input
                      type="tel"
                      id="edit-mobilePhone"
                      value={editUserForm.mobilePhone}
                      onChange={(e) => handleEditFormChange('mobilePhone', e.target.value)}
                      placeholder="+1 (555) 987-6543"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="edit-officeLocation">Office Location</label>
                  <input
                    type="text"
                    id="edit-officeLocation"
                    value={editUserForm.officeLocation}
                    onChange={(e) => handleEditFormChange('officeLocation', e.target.value)}
                    placeholder="Building A, Floor 3, Desk 42"
                  />
                </div>
              </div>
              
              {/* Preferences Section */}
              <div className="form-section">
                <h3>⚙️ Preferences</h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="edit-timeZone">Time Zone</label>
                    <select
                      id="edit-timeZone"
                      value={editUserForm.timeZone}
                      onChange={(e) => handleEditFormChange('timeZone', e.target.value)}
                    >
                      <option value="">Select Time Zone</option>
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="Europe/London">London (GMT)</option>
                      <option value="Europe/Paris">Paris (CET)</option>
                      <option value="Asia/Tokyo">Tokyo (JST)</option>
                      <option value="Asia/Shanghai">Shanghai (CST)</option>
                      <option value="Australia/Sydney">Sydney (AEST)</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="edit-locale">Locale</label>
                    <select
                      id="edit-locale"
                      value={editUserForm.locale}
                      onChange={(e) => handleEditFormChange('locale', e.target.value)}
                    >
                      <option value="">Select Locale</option>
                      <option value="en-US">English (US)</option>
                      <option value="en-GB">English (UK)</option>
                      <option value="es-ES">Spanish (Spain)</option>
                      <option value="fr-FR">French (France)</option>
                      <option value="de-DE">German (Germany)</option>
                      <option value="ja-JP">Japanese (Japan)</option>
                      <option value="zh-CN">Chinese (Simplified)</option>
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Role Assignment Section */}
              <div className="form-section">
                <h3>🔐 Role Assignment</h3>
                
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
                  <h3>👥 Assignment Groups</h3>
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