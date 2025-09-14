import React from 'react';
import { LogOut, User, Home, FileText, Settings, Shield, Database, ShoppingCart, MessageCircle, AlertCircle, QrCode, Map, BarChart3, Key } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { auth, logout } = useAuth();

  const menuItems = [
    { id: 'marketplace', label: 'Marketplace', icon: ShoppingCart },
    { id: 'chats', label: 'Chats', icon: MessageCircle },
    { id: 'transactions', label: 'Transactions', icon: FileText },
    { id: 'qr-verify', label: 'QR Verify', icon: QrCode },
    { id: 'verification', label: 'Verification', icon: Shield },
    { id: 'two-factor', label: '2FA', icon: Key },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  if (auth.user?.role === 'ADMIN') {
    menuItems.unshift({ id: 'land-database', label: 'Land Database', icon: Database });
    menuItems.push({ id: 'admin', label: 'Admin Panel', icon: Settings });
  }
  
  if (auth.user?.role === 'AUDITOR') {
    menuItems.push({ id: 'auditor', label: 'Audit Dashboard', icon: BarChart3 });
  }

  const handleTabClick = (tabId: string) => {
    try {
      setActiveTab(tabId);
    } catch (error) {
      console.error('Error switching tab:', error);
    }
  };

  const handleLogout = () => {
    try {
      logout();
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Home className="h-6 w-6 text-white" />
              </div>
              <span className="ml-3 text-xl font-bold text-gray-900">
                Land Registry
              </span>
              {auth.user?.role === 'ADMIN' && (
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                  ADMIN
                </span>
              )}
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`h-4 w-4 mr-2 ${isActive ? 'text-blue-600' : ''}`} />
                  {item.label}
                  {item.id === 'verification' && auth.user?.verificationStatus === 'PENDING' && (
                    <AlertCircle className="h-3 w-3 ml-1 text-yellow-500" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-900">
                {auth.user?.fullName}
              </p>
              <div className="flex items-center justify-end space-x-2">
                <p className="text-xs text-gray-500">
                  {auth.user?.role === 'ADMIN' ? 'Administrator' : 'User'}
                </p>
                {auth.user?.verificationStatus === 'VERIFIED' && (
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                )}
                {auth.user?.verificationStatus === 'PENDING' && (
                  <div className="h-2 w-2 bg-yellow-500 rounded-full"></div>
                )}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
        
        {/* Mobile menu */}
        <div className="md:hidden border-t border-gray-200 pt-2 pb-3">
          <div className="flex flex-wrap gap-2">
            {menuItems.slice(0, 4).map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`flex items-center px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-3 w-3 mr-1" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;