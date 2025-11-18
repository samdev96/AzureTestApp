import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import UserMenu from './UserMenu';
import './Home.css';

const Home: React.FC = () => {
  const navigate = useNavigate();

  const handleCreateIncident = () => {
    navigate('/create-incident');
  };

  const handleCreateRequest = () => {
    navigate('/create-request');
  };

  const handleViewTickets = () => {
    navigate('/view-tickets');
  };

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="header-content">
          <div className="header-text">
            <h1>VibeNow</h1>
            <p>Welcome to VibeNow. Create and manage incidents and service requests.</p>
          </div>
          <UserMenu />
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
              <span className="stat-number">0</span>
              <span className="stat-label">Open Incidents</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">0</span>
              <span className="stat-label">Pending Requests</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">0</span>
              <span className="stat-label">Total Tickets</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;