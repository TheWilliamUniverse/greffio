import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isOpsStepUpValid } from '@/lib/auth/opsStepUp.js';

export const OpsStepUpRoute = ({ children }) => {
  const location = useLocation();

  if (!isOpsStepUpValid()) {
    const from = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/gateway?stepUp=required&from=${from}`} replace />;
  }

  return children;
};
