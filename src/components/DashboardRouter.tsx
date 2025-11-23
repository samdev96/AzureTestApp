import React from 'react';
import { useAuth } from '../context/AuthContext';
import Home from './Home';
import AdminDashboard from './AdminDashboard';

const DashboardRouter: React.FC = () => {
  const { user } = useAuth();

  // If user is admin, show admin dashboard; otherwise show regular home
  if (user?.isAdmin) {
    return <AdminDashboard />;
  }

  return <Home />;
};

export default DashboardRouter;