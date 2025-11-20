import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Home from './components/Home';
import CreateIncident from './components/CreateIncident';
import CreateRequest from './components/CreateRequest';
import ViewTickets from './components/ViewTickets';
import Login from './components/Login';
import TestPage from './components/TestPage';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/test" element={<TestPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
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
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
