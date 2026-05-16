import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth.js';

export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, loading, currentUser } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-pulse text-primary font-medium">Chargement...</div></div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0) {
    const userRole = String(currentUser?.role || '').toUpperCase();
    if (!allowedRoles.map((role) => String(role).toUpperCase()).includes(userRole)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};