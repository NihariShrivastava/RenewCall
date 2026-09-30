import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../common/LoadingSpinner';

export const TelecallerRoute: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner message="Verifying telecaller session..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'telecaller') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Outlet />;
};
