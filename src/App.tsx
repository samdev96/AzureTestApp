import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthWrapper } from './context/AuthWrapper';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './components/Home';
import CreateIncident from './components/CreateIncident';
import CreateRequest from './components/CreateRequest';
import ViewTickets from './components/ViewTickets';
import TestPage from './components/TestPage';
import './App.css';

function App() {
  return (
    <AuthWrapper>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/test" element={<TestPage />} />
            <Route path="/*" element={
              <ProtectedRoute>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/create-incident" element={<CreateIncident />} />
                  <Route path="/create-request" element={<CreateRequest />} />
                  <Route path="/view-tickets" element={<ViewTickets />} />
                </Routes>
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </Router>
    </AuthWrapper>
  );
}

export default App;
