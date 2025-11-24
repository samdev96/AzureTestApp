import React from 'react';
import './Sidebar.css';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  currentPage: 'home' | 'assignment-groups';
  onPageChange: (page: 'home' | 'assignment-groups') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle, currentPage, onPageChange }) => {
  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <button 
          className="sidebar-toggle" 
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '☰' : '✕'}
        </button>
        {!collapsed && <span className="sidebar-title">Admin Panel</span>}
      </div>
      
      <nav className="sidebar-nav">
        <ul>
          <li 
            className={`nav-item ${currentPage === 'home' ? 'active' : ''}`}
            onClick={() => onPageChange('home')}
          >
            <span className="nav-icon">🏠</span>
            {!collapsed && <span className="nav-text">Home</span>}
          </li>
          <li 
            className={`nav-item ${currentPage === 'assignment-groups' ? 'active' : ''}`}
            onClick={() => onPageChange('assignment-groups')}
          >
            <span className="nav-icon">👥</span>
            {!collapsed && <span className="nav-text">Assignment Groups</span>}
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;