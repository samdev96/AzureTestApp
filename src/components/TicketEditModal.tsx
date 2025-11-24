import React, { useState, useEffect } from 'react';
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
  // Incident specific fields
  category?: string;
  affected_user?: string;
  contact_info?: string;
  assigned_to?: string;
  // Request specific fields
  request_type?: string;
  business_justification?: string;
  requester_name?: string;
  department?: string;
  approver_name?: string;
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

  useEffect(() => {
    if (ticket) {
      setEditedTicket({ ...ticket });
    }
  }, [ticket]);

  const handleSave = async () => {
    if (!editedTicket) return;

    try {
      setSaving(true);
      setError(null);
      await onSave(editedTicket);
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
                <label htmlFor="assigned_to">Assigned To</label>
                <input
                  id="assigned_to"
                  type="text"
                  value={editedTicket.assigned_to || ''}
                  onChange={(e) => handleFieldChange('assigned_to', e.target.value)}
                  className="form-input"
                  placeholder="Enter assignee email"
                />
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