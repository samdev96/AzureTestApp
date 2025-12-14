import React, { useState, useEffect } from 'react';
import { userSettingsAPI, UserSetting, SavedFilter } from '../services/api';
import './Sidebar.css';

export type PageType = 'home' | 'my-tickets' | 'assignment-groups' | 'user-management' | 'services' | 'config-items' | 'cmdb-graph' | 'integrations' | 'external-systems' | 'changes';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
  isMobileOpen: boolean;
  isAdmin?: boolean; // Only show admin features (User Management, Assignment Groups) if true
  onFilterSelect?: (filter: SavedFilter) => void; // Callback when a saved filter is clicked
  refreshFilters?: number; // Increment to trigger refresh of saved filters
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle, currentPage, onPageChange, isMobileOpen, isAdmin, onFilterSelect, refreshFilters }) => {
  const [adminOpen, setAdminOpen] = useState(false);
  const [cmdbOpen, setCmdbOpen] = useState(false);
  const [integrationsOpen, setIntegrationsOpen] = useState(false);
  const [changesOpen, setChangesOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [savedFilters, setSavedFilters] = useState<UserSetting[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);

  // Fetch saved filters on mount and when refreshFilters changes
  useEffect(() => {
    const fetchFilters = async () => {
      setLoadingFilters(true);
      try {
        const result = await userSettingsAPI.getSavedFilters();
        if (result.success && result.data) {
          // Only show filters marked to show in sidebar
          const sidebarFilters = result.data.filter(
            (setting) => (setting.settingValue as SavedFilter).showInSidebar
          );
          setSavedFilters(sidebarFilters);
        }
      } catch (error) {
        console.error('Failed to fetch saved filters:', error);
      } finally {
        setLoadingFilters(false);
      }
    };
    fetchFilters();
  }, [refreshFilters]);

  const getSidebarClass = () => {
    let classes = 'sidebar';
    if (collapsed) classes += ' collapsed';
    if (isMobileOpen) classes += ' open';
    return classes;
  };

  return (
    <div className={getSidebarClass()}>
      <button onClick={onToggle} className="sidebar-toggle" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
        <span className="toggle-icon">{collapsed ? '›' : '‹'}</span>
      </button>
      <div className="sidebar-header">
        <span className="sidebar-logo">🚀</span>
        <span className="sidebar-title">VibeNow</span>
      </div>
      <nav className="sidebar-nav">
        <ul>
          <li
            className={`nav-item ${currentPage === 'home' ? 'active' : ''}`}
            onClick={() => onPageChange('home')}
          >
            <span className="nav-icon">🏠</span>
            <span className="nav-text">Home</span>
          </li>
          <li
            className={`nav-item ${currentPage === 'my-tickets' ? 'active' : ''}`}
            onClick={() => onPageChange('my-tickets')}
          >
            <span className="nav-icon">🎫</span>
            <span className="nav-text">My Tickets</span>
          </li>
          {/* My Filters Section */}
          {savedFilters.length > 0 && (
            <li className="nav-section">
              <button
                className="nav-section-toggle"
                onClick={() => setFiltersOpen((open) => !open)}
                aria-expanded={filtersOpen}
              >
                <span className="nav-icon" role="img" aria-label="My Filters">
                  💾
                </span>
                <span className="nav-text">My Filters</span>
                <span className="nav-arrow">
                  {filtersOpen ? '▲' : '▼'}
                </span>
              </button>
              {filtersOpen && (
                <ul className="nav-sublist">
                  {loadingFilters ? (
                    <li className="nav-item loading">
                      <span className="nav-text">Loading...</span>
                    </li>
                  ) : (
                    savedFilters.map((setting) => {
                      const filter = setting.settingValue as SavedFilter;
                      return (
                        <li
                          key={setting.id}
                          className="nav-item saved-filter-item"
                          onClick={() => {
                            if (onFilterSelect) {
                              onFilterSelect(filter);
                            }
                            // Close mobile sidebar after selection
                            if (window.innerWidth <= 768) {
                              // The onFilterSelect will handle navigation
                            }
                          }}
                        >
                          <span className="nav-icon">{filter.icon || '📋'}</span>
                          <span className="nav-text">{filter.name}</span>
                        </li>
                      );
                    })
                  )}
                </ul>
              )}
            </li>
          )}
          <li className="nav-section">
            <button
              className={`nav-section-toggle ${(currentPage === 'services' || currentPage === 'config-items' || currentPage === 'cmdb-graph') ? 'active' : ''}`}
              onClick={() => setCmdbOpen((open) => !open)}
              aria-expanded={cmdbOpen}
            >
              <span className="nav-icon" role="img" aria-label="CMDB">
                🗄️
              </span>
              <span className="nav-text">CMDB</span>
              <span className="nav-arrow">
                {cmdbOpen ? '▲' : '▼'}
              </span>
            </button>
            {cmdbOpen && (
              <ul className="nav-sublist">
                <li 
                  className={`nav-item ${currentPage === 'services' ? 'active' : ''}`}
                  onClick={() => onPageChange('services')}
                >
                  <span className="nav-icon">🏢</span>
                  <span className="nav-text">Services</span>
                </li>
                <li 
                  className={`nav-item ${currentPage === 'config-items' ? 'active' : ''}`}
                  onClick={() => onPageChange('config-items')}
                >
                  <span className="nav-icon">🖥️</span>
                  <span className="nav-text">Configuration Items</span>
                </li>
                <li 
                  className={`nav-item ${currentPage === 'cmdb-graph' ? 'active' : ''}`}
                  onClick={() => onPageChange('cmdb-graph')}
                >
                  <span className="nav-icon">🔗</span>
                  <span className="nav-text">Graph View</span>
                </li>
              </ul>
            )}
          </li>
          <li className="nav-section">
            <button
              className={`nav-section-toggle ${(currentPage === 'integrations' || currentPage === 'external-systems') ? 'active' : ''}`}
              onClick={() => setIntegrationsOpen((open) => !open)}
              aria-expanded={integrationsOpen}
            >
              <span className="nav-icon" role="img" aria-label="Integrations">
                🔌
              </span>
              <span className="nav-text">Integrations</span>
              <span className="nav-arrow">
                {integrationsOpen ? '▲' : '▼'}
              </span>
            </button>
            {integrationsOpen && (
              <ul className="nav-sublist">
                <li 
                  className={`nav-item ${currentPage === 'integrations' ? 'active' : ''}`}
                  onClick={() => onPageChange('integrations')}
                >
                  <span className="nav-icon">📋</span>
                  <span className="nav-text">Catalog</span>
                </li>
                <li 
                  className={`nav-item ${currentPage === 'external-systems' ? 'active' : ''}`}
                  onClick={() => onPageChange('external-systems')}
                >
                  <span className="nav-icon">🏢</span>
                  <span className="nav-text">External Systems</span>
                </li>
              </ul>
            )}
          </li>
          <li className="nav-section">
            <button
              className={`nav-section-toggle ${currentPage === 'changes' ? 'active' : ''}`}
              onClick={() => {
                setChangesOpen((open) => !open);
                onPageChange('changes');
              }}
              aria-expanded={changesOpen}
            >
              <span className="nav-icon" role="img" aria-label="Changes">
                📝
              </span>
              <span className="nav-text">Change Management</span>
            </button>
          </li>
          {isAdmin && (
            <li className="nav-section">
              <button
                className={`nav-section-toggle ${(currentPage === 'assignment-groups' || currentPage === 'user-management') ? 'active' : ''}`}
                onClick={() => setAdminOpen((open) => !open)}
                aria-expanded={adminOpen}
              >
                <span className="nav-icon" role="img" aria-label="Agent">
                  🛡️
                </span>
                <span className="nav-text">Admin</span>
                <span className="nav-arrow">
                  {adminOpen ? '▲' : '▼'}
                </span>
              </button>
              {adminOpen && (
                <ul className="nav-sublist">
                  <li 
                    className={`nav-item ${currentPage === 'assignment-groups' ? 'active' : ''}`}
                    onClick={() => onPageChange('assignment-groups')}
                  >
                    <span className="nav-icon">👥</span>
                    <span className="nav-text">Assignment Groups</span>
                  </li>
                  <li 
                    className={`nav-item ${currentPage === 'user-management' ? 'active' : ''}`}
                    onClick={() => onPageChange('user-management')}
                  >
                    <span className="nav-icon">🔐</span>
                    <span className="nav-text">User Management</span>
                  </li>
                </ul>
              )}
            </li>
          )}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;