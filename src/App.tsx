import React from 'react';
import { AuthContext, useAuthProvider } from './hooks/useAuth';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function App() {
  const authProvider = useAuthProvider();

  if (authProvider.auth.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={authProvider}>
      <div className="min-h-screen bg-gray-50">
        {authProvider.auth.isAuthenticated ? <Dashboard /> : <Login />}
      </div>
    </AuthContext.Provider>
  );
}

export default App;