import React, { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import LandDetailPage from './components/LandDetailPage';

function AppContent() {
  const { auth } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [landId, setLandId] = useState('');
  const [chatNavigation, setChatNavigation] = useState<{landId: string, sellerId: string, isFirstChat?: boolean} | null>(null);

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

  const navigateToDashboard = (tab?: string, landId?: string, sellerId?: string) => {
    setCurrentPage('dashboard');
    // If coming from land details with specific chat info
    if (tab && landId && sellerId) {
      setChatNavigation({ landId, sellerId, activeTab: tab });
    } else if (tab) {
      setChatNavigation({ landId: '', sellerId: '', activeTab: tab });
    }
  };

  const navigateToChat = (landId: string, sellerId: string, isFirstChat?: boolean) => {
    setChatNavigation({ landId, sellerId, isFirstChat });
    setCurrentPage('dashboard');
  };

  // Clear chat navigation after it's been used
  const clearChatNavigation = () => {
    setChatNavigation(null);
  };

  // Show different pages based on current page state
  if (currentPage === 'land-details') {
    return <LandDetailPage 
      landId={landId} 
      onBack={navigateToDashboard} 
      onNavigateToChat={navigateToChat}
    />;
  }

  // Show dashboard with navigation capability
  return <Dashboard 
    onNavigateToLand={navigateToLandDetails}
    initialTab={chatNavigation ? "chats" : undefined}
    chatNavigation={chatNavigation || undefined}
    onClearChatNavigation={clearChatNavigation}
  />;
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