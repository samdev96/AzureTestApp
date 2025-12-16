import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { SavedFilter } from '../services/api';
import Sidebar, { PageType } from './Sidebar';
import TicketsTable from './TicketsTable';
import MyTickets from './MyTickets';
import AssignmentGroupManagement from './AssignmentGroupManagement';
import UserManagement from './UserManagement';
import UserMenu from './UserMenu';
import Settings from './Settings';
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
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [refreshFilters, setRefreshFilters] = useState(0);
  const [appliedFilter, setAppliedFilter] = useState<SavedFilter | null>(null);
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);

  const handlePageChange = (page: PageType) => {
    setCurrentPage(page);
    // Clear filter when navigating away from saved-filter page
    if (page !== 'saved-filter') {
      setAppliedFilter(null);
      setActiveFilterId(null);
    }
    if (window.innerWidth <= 768) {
      setMobileSidebarOpen(false); // Close mobile sidebar on navigation
    }
  };

  const handleFilterSelect = (filter: SavedFilter, filterId: string) => {
    // Apply the filter and switch to saved-filter page
    setAppliedFilter(filter);
    setActiveFilterId(filterId);
    setCurrentPage('saved-filter');
    if (window.innerWidth <= 768) {
      setMobileSidebarOpen(false);
    }
  };

  const handleFilterSaved = () => {
    // Trigger sidebar to refresh its saved filters
    setRefreshFilters(prev => prev + 1);
  };

  const handleFilterDeleted = () => {
    // Clear filter and navigate to home
    setAppliedFilter(null);
    setActiveFilterId(null);
    setCurrentPage('home');
    // Refresh sidebar filters
    setRefreshFilters(prev => prev + 1);
  };

  const handleFilterDeleted = () => {
    // Clear filter and navigate to home
    setAppliedFilter(null);
    setActiveFilterId(null);
    setCurrentPage('home');
    // Refresh sidebar filters
    setRefreshFilters(prev => prev + 1);
  };

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

  const pageTitles: Record<PageType, string> = {
    home: 'Dashboard',
    'my-tickets': 'My Tickets',
    'assignment-groups': 'Assignment Groups',
    'user-management': 'User Management',
    'services': 'Services',
    'config-items': 'Configuration Items',
    'cmdb-graph': 'CMDB Graph',
    'integrations': 'Integrations',
    'external-systems': 'External Systems',
    'changes': 'Change Management',
    'saved-filter': appliedFilter?.name || 'Saved Filter'
  };

  return (
    <div className="admin-dashboard">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        isMobileOpen={isMobileSidebarOpen}
        isAdmin={true}
        onFilterSelect={handleFilterSelect}
        activeFilterId={activeFilterId}
        refreshFilters={refreshFilters}
      />
      
      <div className={`admin-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="mobile-header">
          <button className="hamburger-menu" onClick={() => setMobileSidebarOpen(true)}>
            &#9776;
          </button>
          <h1 className="mobile-header-title">{pageTitles[currentPage]}</h1>
        </div>

        {currentPage === 'home' ? (
          <>
            <div className="admin-header">
              <div className="admin-header-content">
                <h1>VibeNow ITSM Dashboard</h1>
                <p className="welcome-text">Welcome back, {user?.userDetails?.split('@')[0]}</p>
              </div>
              <UserMenu onSettingsClick={() => setIsSettingsOpen(true)} />
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
              <TicketsTable 
                onFilterSaved={handleFilterSaved}
              />
            </div>
          </>
        ) : currentPage === 'saved-filter' ? (
          <>
            <div className="admin-header">
              <div className="admin-header-content">
                <h1>VibeNow ITSM Dashboard</h1>
                <p className="welcome-text">Welcome back, {user?.userDetails?.split('@')[0]}</p>
              </div>
              <UserMenu onSettingsClick={() => setIsSettingsOpen(true)} />
            </div>

            <div className="tickets-section">
              <TicketsTable 
                appliedFilter={appliedFilter}
                activeFilterId={activeFilterId}
                onFilterSaved={handleFilterSaved}
                onFilterDeleted={handleFilterDeleted}
              />
            </div>
          </>
        ) : currentPage === 'my-tickets' ? (
          <MyTickets />
        ) : currentPage === 'assignment-groups' ? (
          <AssignmentGroupManagement />
        ) : (
          <UserManagement />
        )}
      </div>
      
      <Settings 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
};

export default AdminDashboard;