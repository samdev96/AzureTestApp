import React, { useState, useEffect } from 'react';
import { assignmentGroupsAPI, AssignmentGroup } from '../services/api';
import './AssignmentGroupManagement.css';

interface User {
  email: string;
  objectId: string;
  roleName: string;
}

const AssignmentGroupManagement: React.FC = () => {
  const [assignmentGroups, setAssignmentGroups] = useState<AssignmentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<AssignmentGroup | null>(null);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [assigningMember, setAssigningMember] = useState(false);
  const [removingMember, setRemovingMember] = useState<string | null>(null);

  useEffect(() => {
    loadAssignmentGroups();
  }, []);

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

    try {
      setAssigningMember(true);
      setError(null);
      
      const response = await assignmentGroupsAPI.assignUser(selectedGroup.AssignmentGroupID, newMemberEmail);
      
      if (response.success) {
        setNewMemberEmail('');
        await loadAssignmentGroups(); // Reload to get updated members
      } else {
        setError(response.error || 'Failed to assign user to group');
      }
    } catch (err: any) {
      setError(err.message || 'Error assigning user to group');
    } finally {
      setAssigningMember(false);
    }
  };

  const handleRemoveUser = async (userEmail: string) => {
    if (!selectedGroup) return;

    try {
      setRemovingMember(userEmail);
      setError(null);
      
      const response = await assignmentGroupsAPI.removeUser(selectedGroup.AssignmentGroupID, userEmail);
      
      if (response.success) {
        await loadAssignmentGroups(); // Reload to get updated members
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

      <div className="management-layout">
        <div className="groups-sidebar">
          <h3>Assignment Groups</h3>
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
                  <input
                    type="email"
                    placeholder="Enter admin user email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    className="member-email-input"
                  />
                  <button
                    onClick={handleAssignUser}
                    disabled={assigningMember || !newMemberEmail.trim()}
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