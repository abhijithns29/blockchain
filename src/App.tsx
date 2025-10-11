import React from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function AppContent() {
  const { auth } = useAuth();

  // Show loading spinner while authentication is being checked
  if (auth.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show login page if user is not authenticated
  if (!auth.isAuthenticated || !auth.user) {
    return <Login />;
  }

  // Show dashboard if user is authenticated
  return <Dashboard />;
}

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <AppContent />
      </div>
    </AuthProvider>
  );
}

export default App;