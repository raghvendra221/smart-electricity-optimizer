// components/ProtectedRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { LoadingScreen } from './ui/index.jsx';

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingScreen message="Authenticating..." />;
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
