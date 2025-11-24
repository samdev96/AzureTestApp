import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import DashboardRouter from './components/DashboardRouter';
import CreateIncident from './components/CreateIncident';
import CreateRequest from './components/CreateRequest';
import ViewTickets from './components/ViewTickets';
import Login from './components/Login';
import TestPage from './components/TestPage';
import AuthDebug from './components/AuthDebug';
import ProtectedRoute from './components/ProtectedRoute';
import Settings from './components/Settings';
import './App.css';

function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/test" element={<TestPage />} />
            <Route path="/debug" element={<AuthDebug />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardRouter />
                </ProtectedRoute>
              }
            />
            <Route
              path="/create-incident"
              element={
                <ProtectedRoute>
                  <CreateIncident />
                </ProtectedRoute>
              }
            />
            <Route
              path="/create-request"
              element={
                <ProtectedRoute>
                  <CreateRequest />
                </ProtectedRoute>
              }
            />
            <Route
              path="/view-tickets"
              element={
                <ProtectedRoute>
                  <ViewTickets />
                </ProtectedRoute>
              }
            />
          </Routes>
          
          {/* Settings button */}
          <button 
            className="settings-button" 
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Open settings"
          >
            ⚙️
          </button>

          {/* Settings panel */}
          <Settings 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)} 
          />
          
          {/* Version display */}
          <div className="version-display">
            v0.3
          </div>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
