import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RoleRoute({ children, allowedRoles }) {
  const auth = useAuth();

  if (!auth) {
    console.warn("useAuth() returned undefined in RoleRoute. This can happen during dev server hot-reloading.");
    return null;
  }

  const { user, role, loading } = auth;
  const location = useLocation();

  if (loading) return null;

  if (!user || !role) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Handle case where user's role isn't in the allowed array
  if (!allowedRoles.includes(role)) {
    // Bounce each role to its own home area instead of a blanket redirect
    const homeByRole = {
      admin: '/admin',
      officer: '/officer',
      head: '/officer',
      citizen: '/dashboard',
    };
    return <Navigate to={homeByRole[role] || '/login'} replace />;
  }

  return children;
}
