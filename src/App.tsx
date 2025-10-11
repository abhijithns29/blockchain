import React, { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import LandDetailPage from './components/LandDetailPage';

function AppContent() {
  const { auth } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [landId, setLandId] = useState('');

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

  // Handle navigation
  const navigateToLandDetails = (id: string) => {
    setLandId(id);
    setCurrentPage('land-details');
  };

  const navigateToDashboard = () => {
    setCurrentPage('dashboard');
  };

  // Show different pages based on current page state
  if (currentPage === 'land-details') {
    return <LandDetailPage landId={landId} onBack={navigateToDashboard} />;
  }

  // Show dashboard with navigation capability
  return <Dashboard onNavigateToLand={navigateToLandDetails} />;
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