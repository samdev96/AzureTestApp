import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserMenu from './UserMenu';
import Settings from './Settings';
import './MyApprovals.css';

interface ApprovalTicket {
  id: string;
  type: 'incident' | 'request';
  ticketNumber: string;
  title: string;
  requester: string;
  submittedDate: string;
  priority: string;
  status: string;
}

const MyApprovals: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [approvals, setApprovals] = useState<ApprovalTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleBack = () => {
    // Navigate back to user portal home
    navigate('/portal');
  };

  useEffect(() => {
    const fetchApprovals = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // TODO: Once backend approval functionality is implemented, fetch approvals here
        // For now, we'll show an empty state
        // const response = await fetch('/api/approvals?pendingFor=' + user.userDetails);
        // const data = await response.json();
        // if (data.success) {
        //   setApprovals(data.data || []);
        // }

        // Mock empty data for now
        setApprovals([]);
      } catch (error) {
        console.error('Error fetching approvals:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchApprovals();
  }, [user]);

  const handleApprove = async (ticketId: string) => {
    // TODO: Implement approval logic when backend is ready
    console.log('Approving ticket:', ticketId);
  };

  const handleReject = async (ticketId: string) => {
    // TODO: Implement rejection logic when backend is ready
    console.log('Rejecting ticket:', ticketId);
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

            {approvals.map((approval) => (
              <div key={approval.id} className="approval-card">
                <div className="approval-header">
                  <div className="approval-type-badge" data-type={approval.type}>
                    {approval.type === 'incident' ? '🚨' : '📝'} {approval.type.toUpperCase()}
                  </div>
                  <div className="approval-number">{approval.ticketNumber}</div>
                </div>

                <div className="approval-body">
                  <h3>{approval.title}</h3>
                  <div className="approval-details">
                    <div className="detail-item">
                      <span className="detail-label">Requester:</span>
                      <span className="detail-value">{approval.requester}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Submitted:</span>
                      <span className="detail-value">{new Date(approval.submittedDate).toLocaleDateString()}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Priority:</span>
                      <span className={`priority-badge priority-${approval.priority.toLowerCase()}`}>
                        {approval.priority}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="approval-actions">
                  <button 
                    className="action-button reject-button"
                    onClick={() => handleReject(approval.id)}
                  >
                    Reject
                  </button>
                  <button 
                    className="action-button approve-button"
                    onClick={() => handleApprove(approval.id)}
                  >
                    Approve
                  </button>
                </div>
              </div>
            ))}
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
