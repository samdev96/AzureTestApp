import React from 'react';
import { useAuth } from '../context/AuthContext';
import Home from './Home';
import AdminDashboard from './AdminDashboard';

interface DashboardRouterProps {
  forceUserPortal?: boolean;
}

const DashboardRouter: React.FC<DashboardRouterProps> = ({ forceUserPortal = false }) => {
  const { user } = useAuth();

  // If forceUserPortal is true (e.g., /portal route), always show user portal
  if (forceUserPortal) {
    return <Home />;
  }

  // If user is admin, show admin dashboard; otherwise show regular home
  if (user?.isAdmin) {
    return <AdminDashboard />;
  }

  return <Home />;
};

export default DashboardRouter;