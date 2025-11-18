import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import CreateIncident from './components/CreateIncident';
import CreateRequest from './components/CreateRequest';
import ViewTickets from './components/ViewTickets';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create-incident" element={<CreateIncident />} />
          <Route path="/create-request" element={<CreateRequest />} />
          <Route path="/view-tickets" element={<ViewTickets />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
