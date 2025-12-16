import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import TicketEditModal from './TicketEditModal';
import SaveFilterModal from './SaveFilterModal';
import { SavedFilter } from '../services/api';
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

interface TicketsTableProps {
  appliedFilter?: SavedFilter | null;
  onFilterSaved?: () => void;
}

const TicketsTable: React.FC<TicketsTableProps> = ({ appliedFilter, onFilterSaved }) => {
  const { user, isImpersonating } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSaveFilterModal, setShowSaveFilterModal] = useState(false);
  const [filter, setFilter] = useState({
    type: 'all',
    status: 'Open', // Show all open tickets (smart filter for both incidents and requests)
    priority: 'all'
  });
  const [activeFilterName, setActiveFilterName] = useState<string>('');

  // Apply saved filter when appliedFilter prop changes
  useEffect(() => {
    if (appliedFilter) {
      setActiveFilterName(appliedFilter.name);
      
      // Apply filter criteria
      const newFilter = { ...filter };
      
      if (appliedFilter.filters.ticketType) {
        newFilter.type = appliedFilter.filters.ticketType === 'all' ? 'all' : appliedFilter.filters.ticketType;
      }
      
      if (appliedFilter.filters.status && appliedFilter.filters.status.length > 0) {
        newFilter.status = appliedFilter.filters.status[0];
      }
      
      if (appliedFilter.filters.priority && appliedFilter.filters.priority.length > 0) {
        newFilter.priority = appliedFilter.filters.priority[0];
      }
      
      setFilter(newFilter);
    } else {
      // Reset to default filter when no filter is applied
      setActiveFilterName('');
      setFilter({
        type: 'all',
        status: 'Open',
        priority: 'all'
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilter]);

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
              description: incident.Description,
              category: incident.Category,
              affected_user: incident.AffectedUser,
              contact_info: incident.ContactInfo,
              assigned_to: incident.AssignedTo,
              assignment_group: incident.AssignmentGroup
            })),
            ...requests.map((request: any) => ({
              id: request.RequestID,
              title: request.Title,
              type: 'Request' as const,
              status: request.Status,
              priority: request.Urgency, // Requests use Urgency field instead of Priority
              created_by: request.CreatedBy,
              created_at: request.CreatedDate,
              description: request.Description,
              request_type: request.RequestType,
              business_justification: request.BusinessJustification,
              requester_name: request.RequesterName,
              department: request.Department,
              approver_name: request.ApproverName,
              assigned_to: request.AssignedTo,
              assignment_group: request.AssignmentGroup
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
  }, [user, isImpersonating]);

  const filteredTickets = tickets.filter(ticket => {
    if (filter.type !== 'all' && ticket.type.toLowerCase() !== filter.type) return false;
    
    // Handle special "Open" filter that shows all active/open tickets regardless of type
    if (filter.status === 'Open') {
      if (ticket.type === 'Incident') {
        // For incidents, show Open and In Progress
        if (ticket.status !== 'Open' && ticket.status !== 'In Progress') return false;
      } else if (ticket.type === 'Request') {
        // For requests, show Pending Approval, Approved, and In Progress
        if (ticket.status !== 'Pending Approval' && ticket.status !== 'Approved' && ticket.status !== 'In Progress') return false;
      }
    } else if (filter.status !== 'all' && ticket.status !== filter.status) {
      return false;
    }
    
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

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedTicket(null);
  };

  const handleTicketSave = async (updatedTicket: Ticket) => {
    try {
      const endpoint = updatedTicket.type === 'Incident' ? '/api/incidents' : '/api/requests';
      const response = await fetch(`${endpoint}/${updatedTicket.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedTicket)
      });

      if (!response.ok) {
        throw new Error('Failed to update ticket');
      }

      // Refresh the tickets list
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
                description: incident.Description,
                category: incident.Category,
                affected_user: incident.AffectedUser,
                contact_info: incident.ContactInfo,
                assigned_to: incident.AssignedTo,
                assignment_group: incident.AssignmentGroup
              })),
              ...requests.map((request: any) => ({
                id: request.RequestID,
                title: request.Title,
                type: 'Request' as const,
                status: request.Status,
                priority: request.Urgency,
                created_by: request.CreatedBy,
                created_at: request.CreatedDate,
                description: request.Description,
                request_type: request.RequestType,
                business_justification: request.BusinessJustification,
                requester_name: request.RequesterName,
                department: request.Department,
                approver_name: request.ApproverName,
                assigned_to: request.AssignedTo,
                assignment_group: request.AssignmentGroup
              }))
            ];

            // Sort by creation date (newest first)
            allTickets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            
            setTickets(allTickets);
          }
        } catch (error) {
          console.error('Error refreshing tickets:', error);
        }
      };

      await fetchTickets();
    } catch (error) {
      console.error('Error saving ticket:', error);
      throw error;
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
        <h2>
          {activeFilterName ? (
            <>
              {activeFilterName} ({filteredTickets.length})
              <button 
                className="clear-filter-btn"
                onClick={() => {
                  setActiveFilterName('');
                  setFilter({ type: 'all', status: 'Open', priority: 'all' });
                }}
                title="Clear filter"
              >
                ✕
              </button>
            </>
          ) : (
            <>All Tickets ({filteredTickets.length})</>
          )}
        </h2>
        
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
            <option value="Open">Open (All Active)</option>
            <option value="In Progress">In Progress</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Approved">Approved</option>
            <option value="Resolved">Resolved</option>
            <option value="Completed">Completed</option>
            <option value="Closed">Closed</option>
            <option value="Rejected">Rejected</option>
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

          <button
            className="save-filter-btn"
            onClick={() => setShowSaveFilterModal(true)}
            title="Save current filter"
          >
            💾 Save Filter
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="tickets-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Title</th>
              <th>Assignment Group</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Created By</th>
              <th>Created Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.length === 0 ? (
              <tr>
                <td colSpan={8} className="no-tickets">
                  No tickets found matching the current filters.
                </td>
              </tr>
            ) : (
              filteredTickets.map(ticket => (
                <tr 
                  key={`${ticket.type}-${ticket.id}`} 
                  className="ticket-row clickable-row"
                  onClick={() => handleTicketClick(ticket)}
                >
                  <td className="ticket-id">#{ticket.id}</td>
                  <td className={`ticket-type type-${ticket.type.toLowerCase()}`}>
                    {ticket.type}
                  </td>
                  <td className="ticket-title" title={ticket.description}>
                    {ticket.title}
                  </td>
                  <td className="assignment-group">
                    {ticket.assignment_group || 'Not Assigned'}
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
      
      <TicketEditModal
        ticket={selectedTicket}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleTicketSave}
      />

      <SaveFilterModal
        isOpen={showSaveFilterModal}
        onClose={() => setShowSaveFilterModal(false)}
        onSave={() => {
          if (onFilterSaved) {
            onFilterSaved();
          }
        }}
        currentFilters={{
          ticketType: filter.type === 'all' ? 'All' : (filter.type === 'incident' ? 'Incident' : 'Request'),
          status: filter.status,
          searchText: '',
          priority: filter.priority
        }}
      />
    </div>
  );
};

export default TicketsTable;