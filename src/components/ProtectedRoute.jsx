import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth.js';
import { AppBootSplash } from '@/components/system/AppBootSplash.jsx';

export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, loading, currentUser } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AppBootSplash label="Vérification de votre session…" />;
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