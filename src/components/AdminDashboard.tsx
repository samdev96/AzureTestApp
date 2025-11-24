import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import TicketsTable from './TicketsTable';
import './AdminDashboard.css';

interface TicketStats {
  totalIncidents: number;
  totalRequests: number;
  openIncidents: number;
  openRequests: number;
  loading?: boolean;
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<TicketStats>({
    totalIncidents: 0,
    totalRequests: 0,
    openIncidents: 0,
    openRequests: 0,
    loading: true
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
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

          setStats({
            totalIncidents: incidents.length,
            totalRequests: requests.length,
            openIncidents: incidents.filter((i: any) => i.Status === 'Open' || i.Status === 'In Progress').length,
            openRequests: requests.filter((r: any) => r.Status === 'Pending Approval' || r.Status === 'Approved' || r.Status === 'In Progress').length,
            loading: false
          });
        } else {
          console.error('Failed to fetch stats');
          setStats(prev => ({ ...prev, loading: false }));
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    fetchStats();
  }, [user]);

  return (
    <div className="admin-dashboard">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      
      <div className={`admin-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="admin-header">
          <h1>VibeNow ITSM Dashboard</h1>
          <p className="welcome-text">Welcome back, {user?.userDetails?.split('@')[0]}</p>
        </div>

        <div className="quick-overview-section">
          <h2>Quick Overview</h2>
          <div className="stats-grid">
            <div className="stat-card incidents">
              <h3>Total Incidents</h3>
              <div className="stat-number">
                {stats.loading ? '...' : stats.totalIncidents}
              </div>
            </div>
            <div className="stat-card requests">
              <h3>Total Requests</h3>
              <div className="stat-number">
                {stats.loading ? '...' : stats.totalRequests}
              </div>
            </div>
            <div className="stat-card open-incidents">
              <h3>Open Incidents</h3>
              <div className="stat-number">
                {stats.loading ? '...' : stats.openIncidents}
              </div>
            </div>
            <div className="stat-card open-requests">
              <h3>Open Requests</h3>
              <div className="stat-number">
                {stats.loading ? '...' : stats.openRequests}
              </div>
            </div>
          </div>
        </div>

        <div className="tickets-section">
          <TicketsTable />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;