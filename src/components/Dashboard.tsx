import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Shield, Map, QrCode, BarChart3 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Land } from '../types';
import Navbar from './Navbar';
import TransactionHistory from './TransactionHistory';
import AdminPanel from './AdminPanel';
import UserProfile from './UserProfile';
import UserVerification from './UserVerification';
import LandDatabase from './LandDatabase';
import Marketplace from './Marketplace';
import ChatSystem from './ChatSystem';
import QRScanner from './QRScanner';
import TwoFactorAuth from './TwoFactorAuth';
import AuditorDashboard from './AuditorDashboard';
import apiService from '../services/api';

const Dashboard: React.FC = () => {
  const { auth } = useAuth();
  const [activeTab, setActiveTab] = useState('land-database');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleQRScan = async (assetId: string) => {
    try {
      setShowQRScanner(false);
      const response = await apiService.verifyLandByAssetId(assetId);
      setVerificationResult(response.verification);
    } catch (error: any) {
      setError(error.message || 'Failed to verify land');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'land-database':
        return <LandDatabase />;
      case 'marketplace':
        return <Marketplace />;
      case 'chats':
        return <ChatSystem />;
      case 'transactions':
        return <TransactionHistory />;
      case 'profile':
        return <UserProfile />;
      case 'admin':
        return auth.user?.role === 'ADMIN' ? <AdminPanel /> : null;
      case 'auditor':
        return auth.user?.role === 'AUDITOR' ? <AuditorDashboard /> : null;
      case 'verification':
        return <UserVerification />;
      case 'two-factor':
        return <TwoFactorAuth />;
      case 'qr-verify':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">QR Code Verification</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Scan QR codes to verify land ownership and authenticity
                </p>
              </div>
              <button
                onClick={() => setShowQRScanner(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                <QrCode className="h-4 w-4 mr-2" />
                Scan QR Code
              </button>
            </div>
            
            {verificationResult && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Verification Result</h2>
                {verificationResult.isValid ? (
                  <div className="space-y-3">
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="h-5 w-5 mr-2" />
                      <span className="font-medium">Valid Land Certificate</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><strong>Asset ID:</strong> {verificationResult.assetId}</div>
                      <div><strong>Owner:</strong> {verificationResult.currentOwner?.fullName}</div>
                      <div><strong>Location:</strong> {verificationResult.landDetails.village}, {verificationResult.landDetails.district}</div>
                      <div><strong>Area:</strong> {verificationResult.landDetails.area.acres} Acres</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center text-red-600">
                    <X className="h-5 w-5 mr-2" />
                    <span className="font-medium">Invalid or Unverified Certificate</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {renderContent()}
      </main>

      {showQRScanner && (
        <QRScanner
          onScan={handleQRScan}
          onClose={() => setShowQRScanner(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;