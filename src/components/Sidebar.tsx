import React, { useState } from 'react';
import './Sidebar.css';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  currentPage: 'home' | 'assignment-groups' | 'user-management';
  onPageChange: (page: 'home' | 'assignment-groups' | 'user-management') => void;
  isMobileOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle, currentPage, onPageChange, isMobileOpen }) => {
  const [adminOpen, setAdminOpen] = useState(false);
  const getSidebarClass = () => {
    let classes = 'sidebar';
    if (collapsed) classes += ' collapsed';
    if (isMobileOpen) classes += ' open';
    return classes;
  };

  return (
    <div className={getSidebarClass()}>
      <div className="sidebar-header">
        <button onClick={onToggle} className="sidebar-toggle">
          {collapsed ? '➡️' : '⬅️'}
        </button>
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
          <li className="nav-section">
            <button
              className="nav-section-toggle"
              onClick={() => setAdminOpen((open) => !open)}
              style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', padding: '8px 0', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
            >
              <span style={{ marginRight: 8 }}>Admin</span>
              <span>{adminOpen ? '▼' : '▶'}</span>
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
  const getSidebarClass = () => {
    let classes = 'sidebar';
    if (collapsed) classes += ' collapsed';
    if (isMobileOpen) classes += ' open';
    return classes;
  };

  return (
    <div className={getSidebarClass()}>
      <div className="sidebar-header">
        <button 
      <nav className="sidebar-nav">  
        <ul>
          <li 
            className={`nav-item ${currentPage === 'home' ? 'active' : ''}`}
            onClick={() => onPageChange('home')}
          >
            <span className="nav-icon">🏠</span>
            <span className="nav-text">Home</span>
          </li>
          <li className="nav-section">
            <button
              className="nav-section-toggle"
              onClick={() => setAdminOpen((open) => !open)}
              style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', padding: '8px 0', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
            >
              <span style={{ marginRight: 8 }}>Admin</span>
              <span>{adminOpen ? '▼' : '▶'}</span>
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
          <li 
            className={`nav-item ${currentPage === 'user-management' ? 'active' : ''}`}
            onClick={() => onPageChange('user-management')}
          >
            <span className="nav-icon">🔐</span>
            <span className="nav-text">User Management</span>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;