import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ticketsAPI, Incident, ServiceRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './ViewTickets.css';

// Combined ticket interface for display
interface DisplayTicket {
  id: string;
  number: string;
  type: 'Incident' | 'Request';
  title: string;
  status: string;
  priority?: string;
  urgency?: string;
  createdDate: string;
  assignee?: string;
  requester: string;
  rawData: Incident | ServiceRequest;
}

const ViewTickets: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [tickets, setTickets] = useState<DisplayTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filterType, setFilterType] = useState<'All' | 'Incident' | 'Request'>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Check if user is agent using the computed property from AuthContext
  const isAgent = user?.isAgent || false;
  
  // Check if user came from the portal (user portal for agents)
  const cameFromPortal = location.state?.from === 'portal';
  
  // In user portal mode, only show user's own tickets (even for agents)
  const showOnlyMyTickets = cameFromPortal || !isAgent;

  // Fetch tickets from API
  useEffect(() => {
    fetchTickets();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showOnlyMyTickets]);

  const fetchTickets = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Pass myTicketsOnly flag - true for user portal mode, false for admin view
      const response = await ticketsAPI.getAll({ myTicketsOnly: showOnlyMyTickets });
      
      if (response.success) {
        // Convert API data to display format
        const displayTickets: DisplayTicket[] = [
          // Convert incidents
          ...response.incidents.map((incident): DisplayTicket => ({
            id: incident.IncidentNumber,
            number: incident.IncidentNumber,
            type: 'Incident' as const,
            title: incident.Title,
            status: incident.Status,
            priority: incident.Priority,
            createdDate: incident.CreatedDate,
            assignee: incident.AssignedTo,
            requester: incident.AffectedUser,
            rawData: incident
          })),
          // Convert requests
          ...response.requests.map((request): DisplayTicket => ({
            id: request.RequestNumber,
            number: request.RequestNumber,
            type: 'Request' as const,
            title: request.Title,
            status: request.Status,
            urgency: request.Urgency,
            createdDate: request.CreatedDate,
            assignee: request.AssignedTo,
            requester: request.RequesterName,
            rawData: request
          }))
        ];
        
        // Sort by creation date (newest first)
        displayTickets.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
        
        setTickets(displayTickets);
      } else {
        setError(response.error || 'Failed to fetch tickets');
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError('An unexpected error occurred while fetching tickets');
    } finally {
      setLoading(false);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesType = filterType === 'All' || ticket.type === filterType;
    const matchesStatus = filterStatus === 'All' || ticket.status === filterStatus;
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.requester.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesType && matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'status-open';
      case 'In Progress': return 'status-progress';
      case 'Resolved': return 'status-resolved';
      case 'Closed': return 'status-closed';
      case 'Pending Approval': return 'status-pending';
      case 'Approved': return 'status-approved';
      default: return 'status-default';
    }
  };

  const getPriorityColor = (ticket: DisplayTicket) => {
    const priority = ticket.priority || ticket.urgency || 'Medium';
    switch (priority) {
      case 'Critical': return 'priority-critical';
      case 'High': return 'priority-high';
      case 'Medium': return 'priority-medium';
      case 'Low': return 'priority-low';
      default: return 'priority-default';
    }
  };
  
  const getPriorityLabel = (ticket: DisplayTicket) => {
    return ticket.priority || ticket.urgency || 'Medium';
  };

  const getTypeIcon = (type: string) => {
    return type === 'Incident' ? '🚨' : '📝';
  };

  return (
    <div className="tickets-container">
      <div className="tickets-header">
        <Link to={cameFromPortal ? "/portal" : "/"} className="back-link">← Back to Home</Link>
        <h1>📊 View Tickets</h1>
        <p>Manage and track your incidents and service requests</p>
        {user && (
          <div className="user-info">
            <small>
              {showOnlyMyTickets ? (
                <span className="user-badge">👤 Showing your tickets only</span>
              ) : (
                <span className="admin-badge">👑 Admin View - Showing all tickets</span>
              )}
            </small>
          </div>
        )}
      </div>

      <div className="tickets-content">
        <div className="tickets-controls">
          <div className="filters-section">
            <div className="filter-group">
              <label htmlFor="search">Search Tickets</label>
              <input
                type="text"
                id="search"
                placeholder="Search by ID, title, or requester..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="filter-group">
              <label htmlFor="type-filter">Filter by Type</label>
              <select
                id="type-filter"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
              >
                <option value="All">All Types</option>
                <option value="Incident">Incidents</option>
                <option value="Request">Requests</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="status-filter">Filter by Status</label>
              <select
                id="status-filter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
              >
                <option value="All">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Pending Approval">Pending Approval</option>
                <option value="Approved">Approved</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>

          <div className="tickets-summary">
            <div className="summary-item">
              <span className="summary-number">{tickets.length}</span>
              <span className="summary-label">Total Tickets</span>
            </div>
            <div className="summary-item">
              <span className="summary-number">
                {tickets.filter(t => t.status === 'Open' || t.status === 'In Progress').length}
              </span>
              <span className="summary-label">Active</span>
            </div>
            <div className="summary-item">
              <span className="summary-number">
                {tickets.filter(t => t.status === 'Pending Approval').length}
              </span>
              <span className="summary-label">Pending</span>
            </div>
          </div>
        </div>

        <div className="tickets-list">
          {loading ? (
            <div className="loading-state">
              <div className="loading-icon">⏳</div>
              <h3>Loading tickets...</h3>
              <p>Please wait while we fetch your tickets.</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <div className="error-icon">❌</div>
              <h3>Error loading tickets</h3>
              <p>{error}</p>
              <button className="btn btn-primary" onClick={fetchTickets}>
                Try Again
              </button>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="no-tickets">
              <div className="no-tickets-icon">🔍</div>
              <h3>No tickets found</h3>
              <p>{tickets.length === 0 ? 'No tickets have been created yet.' : 'No tickets match your current filters. Try adjusting your search criteria.'}</p>
            </div>
          ) : (
            filteredTickets.map(ticket => (
              <div key={ticket.id} className="ticket-card">
                <div className="ticket-header">
                  <div className="ticket-id">
                    <span className="ticket-icon">{getTypeIcon(ticket.type)}</span>
                    <span className="ticket-number">{ticket.number}</span>
                    <span className="ticket-type">{ticket.type}</span>
                  </div>
                  <div className="ticket-badges">
                    <span className={`priority-badge ${getPriorityColor(ticket)}`}>
                      {getPriorityLabel(ticket)}
                    </span>
                    <span className={`status-badge ${getStatusColor(ticket.status)}`}>
                      {ticket.status}
                    </span>
                  </div>
                </div>

                <div className="ticket-body">
                  <h3 className="ticket-title">{ticket.title}</h3>
                  <div className="ticket-meta">
                    <div className="meta-item">
                      <span className="meta-label">Requester:</span>
                      <span className="meta-value">{ticket.requester}</span>
                    </div>
                    {ticket.assignee && (
                      <div className="meta-item">
                        <span className="meta-label">Assignee:</span>
                        <span className="meta-value">{ticket.assignee}</span>
                      </div>
                    )}
                    <div className="meta-item">
                      <span className="meta-label">Created:</span>
                      <span className="meta-value">{new Date(ticket.createdDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="ticket-actions">
                  <button className="btn btn-outline">View Details</button>
                  <button className="btn btn-outline">Update Status</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="quick-actions">
          <h3>Quick Actions</h3>
          <div className="action-buttons">
            <Link to="/create-incident" className="btn btn-primary">
              🚨 Create Incident
            </Link>
            <Link to="/create-request" className="btn btn-secondary">
              📝 Create Request
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewTickets;