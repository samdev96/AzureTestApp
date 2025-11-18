import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './components/Home';
import CreateIncident from './components/CreateIncident';
import CreateRequest from './components/CreateRequest';
import ViewTickets from './components/ViewTickets';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <ProtectedRoute>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/create-incident" element={<CreateIncident />} />
              <Route path="/create-request" element={<CreateRequest />} />
              <Route path="/view-tickets" element={<ViewTickets />} />
            </Routes>
          </ProtectedRoute>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
