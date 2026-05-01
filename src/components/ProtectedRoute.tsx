import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-slate-900/10 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user && location.pathname !== '/profile') {
    return <Navigate to="/profile" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
