import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserMenu from './UserMenu';
import Settings from './Settings';
import './Home.css';

interface TicketStats {
  openIncidents: number;
  pendingRequests: number;
  totalTickets: number;
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [stats, setStats] = useState<TicketStats>({
    openIncidents: 0,
    pendingRequests: 0,
    totalTickets: 0
  });
  const [loading, setLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Check if we're on the /portal route (user portal for admins)
  const isPortalRoute = location.pathname === '/portal';

  const handleCreateIncident = () => {
    navigate('/create-incident', { state: { fromPortal: isPortalRoute } });
  };

  const handleCreateRequest = () => {
    navigate('/create-request', { state: { fromPortal: isPortalRoute } });
  };

  const handleViewTickets = () => {
    navigate('/view-tickets', { state: { from: isPortalRoute ? 'portal' : 'home', fromPortal: isPortalRoute } });
  };

  const handleMyApprovals = () => {
    navigate('/my-approvals');
  };

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Fetch incidents and requests data - always use myTicketsOnly for user portal
        // This ensures users (and admins in user portal mode) only see their own stats
        const [incidentsResponse, requestsResponse] = await Promise.all([
          fetch('/api/incidents?myTicketsOnly=true'),
          fetch('/api/requests?myTicketsOnly=true')
        ]);

        const incidentsData = await incidentsResponse.json();
        const requestsData = await requestsResponse.json();

        if (incidentsData.success && requestsData.success) {
          const incidents = incidentsData.data || [];
          const requests = requestsData.data || [];

          // Calculate stats based on the fetched data
          const openIncidents = incidents.filter((incident: any) => 
            incident.Status === 'Open' || incident.Status === 'In Progress'
          ).length;

          const pendingRequests = requests.filter((request: any) => 
            request.Status === 'Pending Approval' || request.Status === 'Approved'
          ).length;

          const totalTickets = incidents.length + requests.length;

          setStats({
            openIncidents,
            pendingRequests,
            totalTickets
          });
        }
      } catch (error) {
        console.error('Error fetching ticket stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="header-content">
          <div className="header-text">
            <h1>VibeNow</h1>
            <p>Welcome to VibeNow. Create and manage incidents and service requests.</p>
          </div>
          <div className="header-actions">
            <button className="my-approvals-button" onClick={handleMyApprovals}>
              <span className="approval-icon">✓</span>
              My Approvals
            </button>
            <UserMenu onSettingsClick={() => setIsSettingsOpen(true)} />
          </div>
        </div>
      </header>

      <main className="home-main">
        <div className="action-cards">
          <div className="action-card incident-card" onClick={handleCreateIncident}>
            <div className="card-icon">🚨</div>
            <h2>Create Incident</h2>
            <p>Report a system issue, outage, or technical problem that needs immediate attention.</p>
            <button className="card-button primary">Create Incident</button>
          </div>

          <div className="action-card request-card" onClick={handleCreateRequest}>
            <div className="card-icon">📝</div>
            <h2>Create Request</h2>
            <p>Submit a service request for new equipment, access, or other IT services.</p>
            <button className="card-button secondary">Create Request</button>
          </div>

          <div className="action-card view-card" onClick={handleViewTickets}>
            <div className="card-icon">📊</div>
            <h2>View Tickets</h2>
            <p>View and manage your existing incidents and service requests.</p>
            <button className="card-button tertiary">View All Tickets</button>
          </div>
        </div>

        <div className="quick-stats">
          <h3>Quick Overview</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-number">{loading ? '...' : stats.openIncidents}</span>
              <span className="stat-label">Open Incidents</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{loading ? '...' : stats.pendingRequests}</span>
              <span className="stat-label">Pending Requests</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{loading ? '...' : stats.totalTickets}</span>
              <span className="stat-label">Total Tickets</span>
            </div>
          </div>
        </div>
      </main>
      
      <Settings 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
};

export default Home;