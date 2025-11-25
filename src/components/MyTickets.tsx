import React, { useState, useEffect, useCallback } from 'react';
import { ticketsAPI, Incident, ServiceRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './TicketsTable.css';

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

const MyTickets: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<DisplayTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filterType, setFilterType] = useState<'All' | 'Incident' | 'Request'>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');

  // Fetch tickets from API
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await ticketsAPI.getAll();
      
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
        
        // Filter tickets assigned to current user
        const userEmail = user?.userDetails;
        const myTickets = displayTickets.filter(ticket => 
          ticket.assignee && userEmail && ticket.assignee.toLowerCase() === userEmail.toLowerCase()
        );
        
        // Sort by creation date (newest first)
        myTickets.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
        
        setTickets(myTickets);
      } else {
        setError(response.error || 'Failed to fetch tickets');
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError('An unexpected error occurred while fetching tickets');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const filteredTickets = tickets.filter(ticket => {
    const matchesType = filterType === 'All' || ticket.type === filterType;
    const matchesStatus = filterStatus === 'All' || ticket.status === filterStatus;
    
    return matchesType && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriorityClass = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical':
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      case 'low': return 'priority-low';
      default: return 'priority-medium';
    }
  };

  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open': return 'status-open';
      case 'in progress': return 'status-progress';
      case 'resolved': return 'status-resolved';
      case 'closed': return 'status-closed';
      case 'pending approval': return 'status-open';
      case 'approved': return 'status-progress';
      default: return '';
    }
  };
  
  const getPriorityLabel = (ticket: DisplayTicket) => {
    return ticket.priority || ticket.urgency || 'Medium';
  };

  return (
    <div className="tickets-table-container">
      <div className="table-header">
        <h2>My Tickets ({filteredTickets.length})</h2>
        
        <div className="filters">
          <select
            id="type-filter"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="filter-select"
          >
            <option value="All">All Types</option>
            <option value="Incident">Incidents</option>
            <option value="Request">Requests</option>
          </select>

          <select
            id="status-filter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="filter-select"
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

      <div className="table-wrapper">
        {loading ? (
          <div className="loading">Loading your tickets...</div>
        ) : error ? (
          <div className="error-state" style={{ padding: '40px', textAlign: 'center' }}>
            <div className="error-icon">❌</div>
            <h3>Error loading tickets</h3>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={fetchTickets}>
              Try Again
            </button>
          </div>
        ) : (
          <table className="tickets-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Title</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Requester</th>
                <th>Created Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="no-tickets">
                    {tickets.length === 0 
                      ? 'No tickets are currently assigned to you.' 
                      : 'No tickets match your current filters.'}
                  </td>
                </tr>
              ) : (
                filteredTickets.map(ticket => (
                  <tr key={ticket.id} className="ticket-row">
                    <td className="ticket-id">{ticket.number}</td>
                    <td className={`ticket-type type-${ticket.type.toLowerCase()}`}>
                      {ticket.type}
                    </td>
                    <td className="ticket-title" title={ticket.title}>
                      {ticket.title}
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusClass(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td>
                      <span className={`priority-badge ${getPriorityClass(getPriorityLabel(ticket))}`}>
                        {getPriorityLabel(ticket)}
                      </span>
                    </td>
                    <td className="created-by">{ticket.requester}</td>
                    <td className="created-date">{formatDate(ticket.createdDate)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default MyTickets;
