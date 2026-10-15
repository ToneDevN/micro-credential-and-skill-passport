import React from 'react';
import { Navigate, Outlet, Link, useNavigate } from 'react-router-dom';
import { Spinner, Card, CardHeader, CardContent, CardFooter, Button } from '@heroui/react';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles, children }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" color="primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4">
        <Card className="border border-rose-200 bg-rose-50/60 shadow-md">
          <CardHeader className="flex gap-3 px-6 pt-6">
            <span className="material-symbols-outlined text-rose-600 text-3xl">gpp_bad</span>
            <div className="flex flex-col text-left">
              <h2 className="text-lg font-bold text-rose-900 font-heading m-0">403 - Access Denied</h2>
              <p className="text-xs text-rose-600 m-0">Permission restricted area</p>
            </div>
          </CardHeader>
          <CardContent className="px-6 py-3 text-sm text-rose-800">
            Your account role (<strong className="font-semibold text-rose-950">{user?.role}</strong>) does not have permission to access this area.
          </CardContent>
          <CardFooter className="px-6 pb-6 pt-2">
            <Button
              color="danger"
              variant="flat"
              size="sm"
              onPress={() => navigate(user?.role === 'instructor' ? '/instructor/courses' : '/student/passport')}
            >
              Go to your Portal
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;
