import React from 'react';
import './Sidebar.css';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
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
          <li className="nav-item active">
            <span className="nav-icon">🏠</span>
            {!collapsed && <span className="nav-text">Home</span>}
          </li>
          <li className="nav-item">
            <span className="nav-icon">👥</span>
            {!collapsed && <span className="nav-text">Assignment Groups</span>}
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;