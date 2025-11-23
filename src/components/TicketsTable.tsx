import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './TicketsTable.css';

interface Ticket {
  id: number;
  title: string;
  type: 'Incident' | 'Request';
  status: string;
  priority: string;
  created_by: string;
  created_at: string;
  description?: string;
}

const TicketsTable: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    type: 'all',
    status: 'Open',
    priority: 'all'
  });

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const [incidentsResponse, requestsResponse] = await Promise.all([
          fetch('/api/incidents'),
          fetch('/api/requests')
        ]);

        if (incidentsResponse.ok && requestsResponse.ok) {
          const incidentsData = await incidentsResponse.json();
          const requestsData = await requestsResponse.json();

          const incidents = incidentsData.success ? incidentsData.data : [];
          const requests = requestsData.success ? requestsData.data : [];

          // Combine and format tickets
          const allTickets: Ticket[] = [
            ...incidents.map((incident: any) => ({
              id: incident.IncidentID,
              title: incident.Title,
              type: 'Incident' as const,
              status: incident.Status,
              priority: incident.Priority,
              created_by: incident.CreatedBy,
              created_at: incident.CreatedDate,
              description: incident.Description
            })),
            ...requests.map((request: any) => ({
              id: request.RequestID,
              title: request.Title,
              type: 'Request' as const,
              status: request.Status,
              priority: request.Priority,
              created_by: request.CreatedBy,
              created_at: request.CreatedDate,
              description: request.Description
            }))
          ];

          // Sort by creation date (newest first)
          allTickets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          
          setTickets(allTickets);
        } else {
          console.error('Failed to fetch tickets');
        }
      } catch (error) {
        console.error('Error fetching tickets:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [user]);

  const filteredTickets = tickets.filter(ticket => {
    if (filter.type !== 'all' && ticket.type.toLowerCase() !== filter.type) return false;
    if (filter.status !== 'all' && ticket.status !== filter.status) return false;
    if (filter.priority !== 'all' && ticket.priority !== filter.priority) return false;
    return true;
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
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      case 'low': return 'priority-low';
      default: return '';
    }
  };

  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open': return 'status-open';
      case 'in progress': return 'status-progress';
      case 'resolved': return 'status-resolved';
      case 'closed': return 'status-closed';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="tickets-table-container">
        <h2>All Tickets</h2>
        <div className="loading">Loading tickets...</div>
      </div>
    );
  }

  return (
    <div className="tickets-table-container">
      <div className="table-header">
        <h2>All Tickets ({filteredTickets.length})</h2>
        
        <div className="filters">
          <select 
            value={filter.type} 
            onChange={(e) => setFilter({...filter, type: e.target.value})}
            className="filter-select"
          >
            <option value="all">All Types</option>
            <option value="incident">Incidents</option>
            <option value="request">Requests</option>
          </select>

          <select 
            value={filter.status} 
            onChange={(e) => setFilter({...filter, status: e.target.value})}
            className="filter-select"
          >
            <option value="all">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>

          <select 
            value={filter.priority} 
            onChange={(e) => setFilter({...filter, priority: e.target.value})}
            className="filter-select"
          >
            <option value="all">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="tickets-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Title</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Created By</th>
              <th>Created Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.length === 0 ? (
              <tr>
                <td colSpan={7} className="no-tickets">
                  No tickets found matching the current filters.
                </td>
              </tr>
            ) : (
              filteredTickets.map(ticket => (
                <tr key={`${ticket.type}-${ticket.id}`} className="ticket-row">
                  <td className="ticket-id">#{ticket.id}</td>
                  <td className={`ticket-type type-${ticket.type.toLowerCase()}`}>
                    {ticket.type}
                  </td>
                  <td className="ticket-title" title={ticket.description}>
                    {ticket.title}
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusClass(ticket.status)}`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td>
                    <span className={`priority-badge ${getPriorityClass(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="created-by">{ticket.created_by}</td>
                  <td className="created-date">{formatDate(ticket.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TicketsTable;