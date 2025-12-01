import React, { useState } from 'react';
import './Sidebar.css';

export type PageType = 'home' | 'my-tickets' | 'assignment-groups' | 'user-management' | 'services' | 'config-items';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
  isMobileOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle, currentPage, onPageChange, isMobileOpen }) => {
  const [adminOpen, setAdminOpen] = useState(false);
  const [cmdbOpen, setCmdbOpen] = useState(false);
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
          <li className="nav-section">
            <button
              className={`nav-section-toggle ${(currentPage === 'services' || currentPage === 'config-items') ? 'active' : ''}`}
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
              </ul>
            )}
          </li>
          <li className="nav-section">
            <button
              className={`nav-section-toggle ${(currentPage === 'assignment-groups' || currentPage === 'user-management') ? 'active' : ''}`}
              onClick={() => setAdminOpen((open) => !open)}
              aria-expanded={adminOpen}
            >
              <span className="nav-icon" role="img" aria-label="Admin">
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
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;