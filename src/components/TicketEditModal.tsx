import React, { useState, useEffect, useMemo } from 'react';
import { assignmentGroupsAPI, AssignmentGroup } from '../services/api';
import './TicketEditModal.css';

interface Ticket {
  id: number;
  title: string;
  type: 'Incident' | 'Request';
  status: string;
  priority: string;
  created_by: string;
  created_at: string;
  description?: string;
  assignment_group?: string;
  // Incident specific fields
  category?: string;
  affected_user?: string;
  contact_info?: string;
  assigned_to?: string;
  resolution_notes?: string;
  // Request specific fields
  request_type?: string;
  business_justification?: string;
  requester_name?: string;
  department?: string;
  approver_name?: string;
  completion_notes?: string;
  rejection_notes?: string;
}

interface TicketEditModalProps {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (ticket: Ticket) => Promise<void>;
}

const TicketEditModal: React.FC<TicketEditModalProps> = ({ ticket, isOpen, onClose, onSave }) => {
  const [editedTicket, setEditedTicket] = useState<Ticket | null>(null);
  const [loading, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [assignmentGroups, setAssignmentGroups] = useState<AssignmentGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [availableUsers, setAvailableUsers] = useState<string[]>([]);

  useEffect(() => {
    if (ticket) {
      setEditedTicket({ ...ticket });
      // Reset notes when opening a new ticket
      setResolutionNotes('');
      setCompletionNotes('');
      setRejectionNotes('');
    }
  }, [ticket]);

  // Fallback assignment groups in case API fails
  const fallbackGroups: AssignmentGroup[] = useMemo(() => [
    { AssignmentGroupID: 1, GroupName: 'Development', Description: 'Software development and application support team', IsActive: true, CreatedDate: '', CreatedBy: 'system' },
    { AssignmentGroupID: 2, GroupName: 'Infrastructure', Description: 'IT infrastructure, servers, and network support team', IsActive: true, CreatedDate: '', CreatedBy: 'system' },
    { AssignmentGroupID: 3, GroupName: 'Service Desk', Description: 'First-line support and general IT assistance team', IsActive: true, CreatedDate: '', CreatedBy: 'system' },
    { AssignmentGroupID: 4, GroupName: 'Security', Description: 'Information security and compliance team', IsActive: true, CreatedDate: '', CreatedBy: 'system' }
  ], []);

  // Load assignment groups when modal opens
  useEffect(() => {
    if (isOpen) {
      const loadAssignmentGroups = async () => {
        try {
          // Load groups with members so we can populate the assignee dropdown
          const response = await assignmentGroupsAPI.getAll(true);
          if (response.success && response.data && response.data.length > 0) {
            setAssignmentGroups(response.data);
          } else {
            console.warn('API response unsuccessful, using fallback groups:', response.error);
            setAssignmentGroups(fallbackGroups);
          }
        } catch (error) {
          console.error('Error loading assignment groups, using fallback:', error);
          setAssignmentGroups(fallbackGroups);
        } finally {
          setLoadingGroups(false);
        }
      };
      
      loadAssignmentGroups();
    }
  }, [isOpen, fallbackGroups]);

  // Update available users when assignment group changes
  useEffect(() => {
    if (editedTicket?.assignment_group) {
      const selectedGroup = assignmentGroups.find(
        group => group.GroupName === editedTicket.assignment_group
      );
      
      if (selectedGroup && selectedGroup.Members) {
        const userEmails = selectedGroup.Members
          .filter(member => member.IsActive)
          .map(member => member.UserEmail);
        setAvailableUsers(userEmails);
        
        // If current assigned_to is not in the new list, clear it
        if (editedTicket.assigned_to && !userEmails.includes(editedTicket.assigned_to)) {
          setEditedTicket(prev => prev ? { ...prev, assigned_to: '' } : null);
        }
      } else {
        setAvailableUsers([]);
        // Clear assigned_to if no users available
        if (editedTicket.assigned_to) {
          setEditedTicket(prev => prev ? { ...prev, assigned_to: '' } : null);
        }
      }
    } else {
      setAvailableUsers([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editedTicket?.assignment_group, assignmentGroups]);

  const handleSave = async () => {
    if (!editedTicket) return;

    // Validate required notes for specific status changes
    if (editedTicket.type === 'Incident' && editedTicket.status === 'Resolved' && !resolutionNotes.trim()) {
      setError('Resolution Notes are required when marking an incident as Resolved');
      return;
    }
    if (editedTicket.type === 'Request' && editedTicket.status === 'Completed' && !completionNotes.trim()) {
      setError('Completion Notes are required when marking a request as Completed');
      return;
    }
    if (editedTicket.type === 'Request' && editedTicket.status === 'Rejected' && !rejectionNotes.trim()) {
      setError('Rejection Notes are required when marking a request as Rejected');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      // Add the appropriate notes to the ticket before saving
      const ticketToSave = { ...editedTicket };
      if (editedTicket.type === 'Incident' && editedTicket.status === 'Resolved') {
        ticketToSave.resolution_notes = resolutionNotes;
      }
      if (editedTicket.type === 'Request' && editedTicket.status === 'Completed') {
        ticketToSave.completion_notes = completionNotes;
      }
      if (editedTicket.type === 'Request' && editedTicket.status === 'Rejected') {
        ticketToSave.rejection_notes = rejectionNotes;
      }
      
      await onSave(ticketToSave);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (field: keyof Ticket, value: string) => {
    if (editedTicket) {
      setEditedTicket({
        ...editedTicket,
        [field]: value
      });
    }
  };

  if (!isOpen || !ticket || !editedTicket) return null;

  const ticketNumber = ticket.type === 'Incident' ? `INC-${String(ticket.id).padStart(6, '0')}` : `REQ-${String(ticket.id).padStart(6, '0')}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit {ticket.type} - {ticketNumber}</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}
          
          <form className="ticket-form">
            {/* Common fields */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="title">Title *</label>
                <input
                  id="title"
                  type="text"
                  value={editedTicket.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  value={editedTicket.status}
                  onChange={(e) => handleFieldChange('status', e.target.value)}
                  className="form-select"
                >
                  {ticket.type === 'Incident' ? (
                    <>
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </>
                  ) : (
                    <>
                      <option value="Pending Approval">Pending Approval</option>
                      <option value="Approved">Approved</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Rejected">Rejected</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="priority">
                  {ticket.type === 'Incident' ? 'Priority' : 'Urgency'}
                </label>
                <select
                  id="priority"
                  value={editedTicket.priority}
                  onChange={(e) => handleFieldChange('priority', e.target.value)}
                  className="form-select"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  {ticket.type === 'Incident' && <option value="Critical">Critical</option>}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="assignment_group">Assignment Group</label>
                <select
                  id="assignment_group"
                  value={editedTicket.assignment_group || ''}
                  onChange={(e) => handleFieldChange('assignment_group', e.target.value)}
                  className="form-select"
                  disabled={loadingGroups}
                >
                  <option value="">Select Assignment Group</option>
                  {assignmentGroups.map(group => (
                    <option key={group.AssignmentGroupID} value={group.GroupName}>
                      {group.GroupName} - {group.Description}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="assigned_to">Assigned To</label>
                <select
                  id="assigned_to"
                  value={editedTicket.assigned_to || ''}
                  onChange={(e) => handleFieldChange('assigned_to', e.target.value)}
                  className="form-select"
                  disabled={!editedTicket.assignment_group || availableUsers.length === 0}
                >
                  <option value="">
                    {!editedTicket.assignment_group 
                      ? 'Select Assignment Group first'
                      : availableUsers.length === 0
                      ? 'No users in selected group'
                      : 'Select user'
                    }
                  </option>
                  {availableUsers.map(userEmail => (
                    <option key={userEmail} value={userEmail}>
                      {userEmail}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                {/* Empty space to maintain layout */}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description *</label>
              <textarea
                id="description"
                value={editedTicket.description || ''}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                className="form-textarea"
                rows={4}
                required
              />
            </div>

            {/* Incident-specific fields */}
            {ticket.type === 'Incident' && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="category">Category</label>
                    <select
                      id="category"
                      value={editedTicket.category || ''}
                      onChange={(e) => handleFieldChange('category', e.target.value)}
                      className="form-select"
                    >
                      <option value="Hardware">Hardware</option>
                      <option value="Software">Software</option>
                      <option value="Network">Network</option>
                      <option value="Security">Security</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="affected_user">Affected User</label>
                    <input
                      id="affected_user"
                      type="text"
                      value={editedTicket.affected_user || ''}
                      onChange={(e) => handleFieldChange('affected_user', e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="contact_info">Contact Information</label>
                  <input
                    id="contact_info"
                    type="text"
                    value={editedTicket.contact_info || ''}
                    onChange={(e) => handleFieldChange('contact_info', e.target.value)}
                    className="form-input"
                    placeholder="Email or phone number"
                  />
                </div>
                
                {/* Resolution Notes - Required when status is Resolved */}
                {editedTicket.status === 'Resolved' && (
                  <div className="form-group required-field">
                    <label htmlFor="resolution_notes">Resolution Notes *</label>
                    <textarea
                      id="resolution_notes"
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      className="form-textarea"
                      rows={4}
                      placeholder="Please describe how this incident was resolved..."
                      required
                    />
                  </div>
                )}
              </>
            )}

            {/* Request-specific fields */}
            {ticket.type === 'Request' && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="request_type">Request Type</label>
                    <select
                      id="request_type"
                      value={editedTicket.request_type || ''}
                      onChange={(e) => handleFieldChange('request_type', e.target.value)}
                      className="form-select"
                    >
                      <option value="Hardware">Hardware</option>
                      <option value="Software">Software</option>
                      <option value="Access">Access</option>
                      <option value="Service">Service</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="department">Department</label>
                    <input
                      id="department"
                      type="text"
                      value={editedTicket.department || ''}
                      onChange={(e) => handleFieldChange('department', e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="requester_name">Requester Name</label>
                    <input
                      id="requester_name"
                      type="text"
                      value={editedTicket.requester_name || ''}
                      onChange={(e) => handleFieldChange('requester_name', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="approver_name">Approver Name</label>
                    <input
                      id="approver_name"
                      type="text"
                      value={editedTicket.approver_name || ''}
                      onChange={(e) => handleFieldChange('approver_name', e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="business_justification">Business Justification</label>
                  <textarea
                    id="business_justification"
                    value={editedTicket.business_justification || ''}
                    onChange={(e) => handleFieldChange('business_justification', e.target.value)}
                    className="form-textarea"
                    rows={3}
                  />
                </div>
                
                {/* Completion Notes - Required when status is Completed */}
                {editedTicket.status === 'Completed' && (
                  <div className="form-group required-field">
                    <label htmlFor="completion_notes">Completion Notes *</label>
                    <textarea
                      id="completion_notes"
                      value={completionNotes}
                      onChange={(e) => setCompletionNotes(e.target.value)}
                      className="form-textarea"
                      rows={4}
                      placeholder="Please describe how this request was completed..."
                      required
                    />
                  </div>
                )}
                
                {/* Rejection Notes - Required when status is Rejected */}
                {editedTicket.status === 'Rejected' && (
                  <div className="form-group required-field">
                    <label htmlFor="rejection_notes">Rejection Notes *</label>
                    <textarea
                      id="rejection_notes"
                      value={rejectionNotes}
                      onChange={(e) => setRejectionNotes(e.target.value)}
                      className="form-textarea"
                      rows={4}
                      placeholder="Please explain why this request was rejected..."
                      required
                    />
                  </div>
                )}
              </>
            )}
          </form>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicketEditModal;