import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar, { PageType } from './Sidebar';
import TicketsTable from './TicketsTable';
import MyTickets from './MyTickets';
import AssignmentGroupManagement from './AssignmentGroupManagement';
import UserManagement from './UserManagement';
import Services from './Services';
import ConfigurationItems from './ConfigurationItems';
import CMDBGraph from './CMDBGraph';
import IntegrationCatalog from './IntegrationCatalog';
import ExternalSystems from './ExternalSystems';
import ChangeManagement from './ChangeManagement';
import UserMenu from './UserMenu';
import Settings from './Settings';
import ImpersonationBanner from './ImpersonationBanner';
import { SavedFilter } from '../services/api';
import './AgentDashboard.css';

interface TicketStats {
  totalIncidents: number;
  totalRequests: number;
  openIncidents: number;
  openRequests: number;
  loading?: boolean;
}

const AgentDashboard: React.FC = () => {
  const { user, isImpersonating, effectiveIsAdmin, effectiveUserEmail, impersonatedUser } = useAuth();
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
  const [appliedFilter, setAppliedFilter] = useState<SavedFilter | null>(null);
  const [refreshFilters, setRefreshFilters] = useState(0);

  const handlePageChange = (page: PageType) => {
    setCurrentPage(page);
    if (window.innerWidth <= 768) {
      setMobileSidebarOpen(false); // Close mobile sidebar on navigation
    }
  };

  const handleFilterSelect = (filter: SavedFilter) => {
    console.log('AgentDashboard: handleFilterSelect called with filter:', filter);
    // Apply the filter to the TicketsTable and switch to home page
    setAppliedFilter(filter);
    setCurrentPage('home');
    if (window.innerWidth <= 768) {
      setMobileSidebarOpen(false);
    }
  };

  const handleFilterSaved = () => {
    // Trigger sidebar to refresh its saved filters
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
  }, [user, isImpersonating]);

  const pageTitles: Record<PageType, string> = {
    home: 'Dashboard',
    'my-tickets': 'My Tickets',
    'assignment-groups': 'Assignment Groups',
    'user-management': 'User Management',
    'services': 'Services',
    'config-items': 'Configuration Items',
    'cmdb-graph': 'CMDB Graph View',
    'integrations': 'Integration Catalog',
    'external-systems': 'External Systems',
    'changes': 'Change Management'
  };

  return (
    <div className={`agent-dashboard ${isImpersonating ? 'impersonation-active' : ''}`}>
      <ImpersonationBanner />
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        isMobileOpen={isMobileSidebarOpen}
        isAdmin={effectiveIsAdmin}
        onFilterSelect={handleFilterSelect}
        refreshFilters={refreshFilters}
      />
      
      <div className={`agent-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="mobile-header">
          <button className="hamburger-menu" onClick={() => setMobileSidebarOpen(true)}>
            &#9776;
          </button>
          <h1 className="mobile-header-title">{pageTitles[currentPage]}</h1>
        </div>

        {currentPage === 'home' ? (
          <>
            <div className="agent-header">
              <div className="agent-header-content">
                <h1>VibeNow ITSM Dashboard</h1>
                <p className="welcome-text">
                  Welcome back, {isImpersonating 
                    ? (impersonatedUser?.displayName || effectiveUserEmail.split('@')[0])
                    : user?.userDetails?.split('@')[0]}
                </p>
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
                appliedFilter={appliedFilter}
                onFilterSaved={handleFilterSaved}
              />
            </div>
          </>
        ) : currentPage === 'my-tickets' ? (
          <MyTickets />
        ) : currentPage === 'assignment-groups' ? (
          <AssignmentGroupManagement />
        ) : currentPage === 'services' ? (
          <Services />
        ) : currentPage === 'config-items' ? (
          <ConfigurationItems />
        ) : currentPage === 'cmdb-graph' ? (
          <CMDBGraph />
        ) : currentPage === 'integrations' ? (
          <IntegrationCatalog />
        ) : currentPage === 'external-systems' ? (
          <ExternalSystems />
        ) : currentPage === 'changes' ? (
          <ChangeManagement />
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

export default AgentDashboard;