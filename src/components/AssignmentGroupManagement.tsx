import React, { useState, useEffect } from 'react';
import { assignmentGroupsAPI, AssignmentGroup, userManagementAPI, User } from '../services/api';
import './AssignmentGroupManagement.css';

const AssignmentGroupManagement: React.FC = () => {
  const [assignmentGroups, setAssignmentGroups] = useState<AssignmentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<AssignmentGroup | null>(null);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [assigningMember, setAssigningMember] = useState(false);
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    loadAssignmentGroups();
    loadAllUsers();
  }, []);

  useEffect(() => {
    // Filter users based on search input
    if (newMemberEmail.trim() === '') {
      setFilteredUsers([]);
      setShowDropdown(false);
    } else {
      const searchTerm = newMemberEmail.toLowerCase();
      const filtered = allUsers.filter(user => 
        user.userEmail.toLowerCase().includes(searchTerm) &&
        user.isAgent && // Only show agent users
        !selectedGroup?.Members?.some(member => member.UserEmail === user.userEmail) // Exclude already assigned users
      );
      setFilteredUsers(filtered);
      setShowDropdown(filtered.length > 0);
    }
  }, [newMemberEmail, allUsers, selectedGroup]);

  const loadAllUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await userManagementAPI.getAll();
      
      if (response.success && response.data) {
        setAllUsers(response.data);
      }
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadAssignmentGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await assignmentGroupsAPI.getAll(true);
      
      if (response.success && response.data) {
        setAssignmentGroups(response.data);
      } else {
        setError(response.error || 'Failed to load assignment groups');
      }
    } catch (err) {
      setError('Error loading assignment groups');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignUser = async () => {
    if (!selectedGroup || !newMemberEmail.trim()) return;

    if (!isValidEmail(newMemberEmail.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setAssigningMember(true);
      clearMessages();
      
      const response = await assignmentGroupsAPI.assignUser(selectedGroup.AssignmentGroupID, newMemberEmail.trim());
      
      if (response.success) {
        setNewMemberEmail('');
        setShowDropdown(false);
        setSuccessMessage(`Successfully added ${newMemberEmail.trim()} to ${selectedGroup.GroupName}`);
        await loadAssignmentGroups(); // Reload to get updated members
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(response.error || 'Failed to assign user to group');
      }
    } catch (err: any) {
      setError(err.message || 'Error assigning user to group');
    } finally {
      setAssigningMember(false);
    }
  };

  const handleSelectUser = (userEmail: string) => {
    setNewMemberEmail(userEmail);
    setShowDropdown(false);
  };

  const handleRemoveUser = async (userEmail: string) => {
    if (!selectedGroup) return;

    if (!window.confirm(`Are you sure you want to remove ${userEmail} from ${selectedGroup.GroupName}?`)) {
      return;
    }

    try {
      setRemovingMember(userEmail);
      clearMessages();
      
      const response = await assignmentGroupsAPI.removeUser(selectedGroup.AssignmentGroupID, userEmail);
      
      if (response.success) {
        setSuccessMessage(`Successfully removed ${userEmail} from ${selectedGroup.GroupName}`);
        await loadAssignmentGroups(); // Reload to get updated members
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(response.error || 'Failed to remove user from group');
      }
    } catch (err: any) {
      setError(err.message || 'Error removing user from group');
    } finally {
      setRemovingMember(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
  };

  if (loading) {
    return (
      <div className="assignment-group-management">
        <h2>Assignment Group Management</h2>
        <div className="loading">Loading assignment groups...</div>
      </div>
    );
  }

  return (
    <div className="assignment-group-management">
      <div className="management-header">
        <h2>Assignment Group Management</h2>
        <p>Manage which admin users belong to each assignment group</p>
      </div>

      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="success-banner">
          <span className="success-icon">✅</span>
          <span>{successMessage}</span>
        </div>
      )}

      <div className="management-layout">
        <div className="groups-sidebar">
          <h3>Assignment Groups ({assignmentGroups.length})</h3>
          <div className="groups-stats">
            <div className="stat-item">
              <span className="stat-label">Total Groups:</span>
              <span className="stat-value">{assignmentGroups.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Members:</span>
              <span className="stat-value">
                {assignmentGroups.reduce((sum, group) => sum + (group.Members?.length || 0), 0)}
              </span>
            </div>
          </div>
          <div className="groups-list">
            {assignmentGroups.map(group => (
              <div
                key={group.AssignmentGroupID}
                className={`group-item ${selectedGroup?.AssignmentGroupID === group.AssignmentGroupID ? 'selected' : ''}`}
                onClick={() => setSelectedGroup(group)}
              >
                <div className="group-name">{group.GroupName}</div>
                <div className="group-description">{group.Description}</div>
                <div className="member-count">
                  {group.Members?.length || 0} member{(group.Members?.length || 0) !== 1 ? 's' : ''}
                  {(group.Members?.length || 0) > 0 && (
                    <span className="member-indicator">👥</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="group-details">
          {selectedGroup ? (
            <>
              <div className="details-header">
                <h3>{selectedGroup.GroupName}</h3>
                <p>{selectedGroup.Description}</p>
              </div>

              <div className="add-member-section">
                <h4>Add Admin User</h4>
                <div className="add-member-form">
                  <div className="search-dropdown-container">
                    <input
                      type="email"
                      placeholder="Search for admin user by email..."
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      onFocus={() => newMemberEmail.trim() && filteredUsers.length > 0 && setShowDropdown(true)}
                      onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                      onKeyPress={(e) => e.key === 'Enter' && !assigningMember && newMemberEmail.trim() && handleAssignUser()}
                      className="member-email-input"
                      disabled={assigningMember || loadingUsers}
                    />
                    {showDropdown && filteredUsers.length > 0 && (
                      <div className="user-dropdown">
                        {filteredUsers.slice(0, 10).map(user => (
                          <div
                            key={user.userEmail}
                            className="user-dropdown-item"
                            onClick={() => handleSelectUser(user.userEmail)}
                          >
                            <div className="user-email">{user.userEmail}</div>
                            <div className="user-role-badge">Admin</div>
                          </div>
                        ))}
                        {filteredUsers.length > 10 && (
                          <div className="dropdown-footer">
                            Showing 10 of {filteredUsers.length} results. Keep typing to narrow down...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleAssignUser}
                    disabled={assigningMember || !newMemberEmail.trim() || loadingUsers}
                    className="btn btn-primary"
                  >
                    {assigningMember ? 'Adding...' : 'Add Member'}
                  </button>
                </div>
                <p className="add-member-note">
                  Note: Only users with Admin role can be added to assignment groups
                </p>
              </div>

              <div className="members-section">
                <h4>Current Members ({selectedGroup.Members?.length || 0})</h4>
                {selectedGroup.Members && selectedGroup.Members.length > 0 ? (
                  <div className="members-list">
                    {selectedGroup.Members.map(member => (
                      <div key={member.AssignmentGroupMemberID} className="member-item">
                        <div className="member-info">
                          <div className="member-email">{member.UserEmail}</div>
                          <div className="member-meta">
                            Added on {formatDate(member.AssignedDate)} by {member.AssignedBy}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveUser(member.UserEmail)}
                          disabled={removingMember === member.UserEmail}
                          className="btn btn-danger btn-sm"
                        >
                          {removingMember === member.UserEmail ? 'Removing...' : 'Remove'}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-members">
                    No members assigned to this group yet.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="no-selection">
              <h3>Select an Assignment Group</h3>
              <p>Choose a group from the sidebar to view and manage its members.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssignmentGroupManagement;