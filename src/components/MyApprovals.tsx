import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserMenu from './UserMenu';
import Settings from './Settings';
import './MyApprovals.css';

interface Approval {
  ApprovalID: number;
  ApprovalType: 'Request' | 'Incident';
  RequestID?: number;
  IncidentID?: number;
  ApproverEmail: string;
  ApproverName?: string;
  Status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  RequestedDate: string;
  ResponseDate?: string;
  Comments?: string;
  RespondedBy?: string;
  RequestNumber?: string;
  RequestTitle?: string;
  RequestDescription?: string;
  RequestType?: string;
  RequestUrgency?: string;
  RequestRequester?: string;
  RequestDepartment?: string;
  RequestCreatedBy?: string;
  RequestCreatedDate?: string;
  IncidentNumber?: string;
  IncidentTitle?: string;
  IncidentDescription?: string;
  IncidentCategory?: string;
  IncidentPriority?: string;
  IncidentAffectedUser?: string;
  IncidentCreatedBy?: string;
  IncidentCreatedDate?: string;
  HoursPending?: number;
}

const API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:7071/api'
  : '/api';

const MyApprovals: React.FC = () => {
  const navigate = useNavigate();
  const { effectiveUserEmail, impersonatedUser } = useAuth();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [actioningApprovalId, setActioningApprovalId] = useState<number | null>(null);

  const handleBack = () => {
    navigate('/portal');
  };

  useEffect(() => {
    const fetchApprovals = async () => {
      if (!effectiveUserEmail) return;

      try {
        setLoading(true);
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        
        if (impersonatedUser) {
          headers['X-Impersonated-User'] = impersonatedUser.userEmail;
        }

        const response = await fetch(`${API_BASE_URL}/approvals?status=Pending`, {
          headers
        });
        
        const result = await response.json();
        
        if (result.success) {
          setApprovals(result.data || []);
        } else {
          console.error('Error fetching approvals:', result.error);
        }
      } catch (error) {
        console.error('Error fetching approvals:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchApprovals();
  }, [effectiveUserEmail, impersonatedUser]);

  const handleApprove = async (approvalId: number) => {
    try {
      setActioningApprovalId(approvalId);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (impersonatedUser) {
        headers['X-Impersonated-User'] = impersonatedUser.userEmail;
      }

      const response = await fetch(`${API_BASE_URL}/approvals`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          approvalId,
          action: 'approve'
        })
      });

      const result = await response.json();

      if (result.success) {
        // Remove the approved item from the list
        setApprovals(approvals.filter(a => a.ApprovalID !== approvalId));
        alert('Request approved successfully!');
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Failed to approve request. Please try again.');
    } finally {
      setActioningApprovalId(null);
    }
  };

  const handleReject = async (approvalId: number) => {
    const comments = prompt('Please provide a reason for rejection (optional):');
    
    // Allow empty comments, but if user clicks Cancel, don't proceed
    if (comments === null) return;

    try {
      setActioningApprovalId(approvalId);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (impersonatedUser) {
        headers['X-Impersonated-User'] = impersonatedUser.userEmail;
      }

      const response = await fetch(`${API_BASE_URL}/approvals`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          approvalId,
          action: 'reject',
          comments
        })
      });

      const result = await response.json();

      if (result.success) {
        // Remove the rejected item from the list
        setApprovals(approvals.filter(a => a.ApprovalID !== approvalId));
        alert('Request rejected successfully!');
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject request. Please try again.');
    } finally {
      setActioningApprovalId(null);
    }
  };

  return (
    <div className="my-approvals-container">
      <header className="approvals-header">
        <div className="header-content">
          <div className="header-text">
            <button className="back-button" onClick={handleBack}>
              ← Back to Home
            </button>
            <h1>My Approvals</h1>
            <p>Review and approve pending tickets that require your attention.</p>
          </div>
          <UserMenu onSettingsClick={() => setIsSettingsOpen(true)} />
        </div>
      </header>

      <main className="approvals-main">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading approvals...</p>
          </div>
        ) : approvals.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <h2>No Pending Approvals</h2>
            <p>You don't have any tickets waiting for your approval at the moment.</p>
            <button className="back-home-button" onClick={handleBack}>
              Back to Home
            </button>
          </div>
        ) : (
          <div className="approvals-list">
            <div className="approvals-count">
              <span className="count-number">{approvals.length}</span>
              <span className="count-label">Pending Approval{approvals.length !== 1 ? 's' : ''}</span>
            </div>

            {approvals.map((approval) => {
              const isRequest = approval.ApprovalType === 'Request';
              const ticketNumber = isRequest ? approval.RequestNumber : approval.IncidentNumber;
              const title = isRequest ? approval.RequestTitle : approval.IncidentTitle;
              const requester = isRequest ? approval.RequestRequester : approval.IncidentAffectedUser;
              const createdDate = isRequest ? approval.RequestCreatedDate : approval.IncidentCreatedDate;
              const priority = isRequest ? approval.RequestUrgency : approval.IncidentPriority;
              const description = isRequest ? approval.RequestDescription : approval.IncidentDescription;
              
              return (
                <div key={approval.ApprovalID} className="approval-card">
                  <div className="approval-header">
                    <div className="approval-type-badge" data-type={approval.ApprovalType.toLowerCase()}>
                      {isRequest ? '📝' : '🚨'} {approval.ApprovalType.toUpperCase()}
                    </div>
                    <div className="approval-number">{ticketNumber}</div>
                  </div>

                  <div className="approval-body">
                    <h3>{title}</h3>
                    {description && (
                      <p className="approval-description">{description}</p>
                    )}
                    <div className="approval-details">
                      <div className="detail-item">
                        <span className="detail-label">Requester:</span>
                        <span className="detail-value">{requester}</span>
                      </div>
                      {isRequest && approval.RequestDepartment && (
                        <div className="detail-item">
                          <span className="detail-label">Department:</span>
                          <span className="detail-value">{approval.RequestDepartment}</span>
                        </div>
                      )}
                      <div className="detail-item">
                        <span className="detail-label">Submitted:</span>
                        <span className="detail-value">
                          {createdDate ? new Date(createdDate).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      {priority && (
                        <div className="detail-item">
                          <span className="detail-label">{isRequest ? 'Urgency:' : 'Priority:'}</span>
                          <span className={`priority-badge priority-${priority.toLowerCase()}`}>
                            {priority}
                          </span>
                        </div>
                      )}
                      {approval.HoursPending !== undefined && (
                        <div className="detail-item">
                          <span className="detail-label">Pending:</span>
                          <span className="detail-value">
                            {approval.HoursPending < 24 
                              ? `${Math.round(approval.HoursPending)} hours`
                              : `${Math.round(approval.HoursPending / 24)} days`
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="approval-actions">
                    <button 
                      className="action-button reject-button"
                      onClick={() => handleReject(approval.ApprovalID)}
                      disabled={actioningApprovalId === approval.ApprovalID}
                    >
                      {actioningApprovalId === approval.ApprovalID ? 'Processing...' : 'Reject'}
                    </button>
                    <button 
                      className="action-button approve-button"
                      onClick={() => handleApprove(approval.ApprovalID)}
                      disabled={actioningApprovalId === approval.ApprovalID}
                    >
                      {actioningApprovalId === approval.ApprovalID ? 'Processing...' : 'Approve'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Settings 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
};

export default MyApprovals;
