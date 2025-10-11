import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Eye, Users, Database, FileText, ShoppingCart } from 'lucide-react';
import { User, Land, Transaction } from '../types';
import apiService from '../services/api';

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'users' | 'lands' | 'land-transactions'>('users');
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [allLands, setAllLands] = useState<Land[]>([]);
  const [landTransactions, setLandTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      switch (activeTab) {
        case 'transactions':
          const transResponse = await apiService.getPendingTransactions();
          setPendingTransactions(transResponse.transactions);
          break;
        case 'users':
          const usersResponse = await apiService.getPendingVerifications();
          setPendingUsers(usersResponse.users);
          break;
        case 'lands':
          const landsResponse = await apiService.getLands({ limit: 100 });
          setAllLands(landsResponse.lands);
          break;
        case 'land-transactions':
          const landTransResponse = await apiService.getPendingLandTransactions();
          setLandTransactions(landTransResponse.transactions);
          break;
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveTransaction = async (transactionId: string) => {
    try {
      setError('');
      setProcessingId(transactionId);
      await apiService.approveTransaction(transactionId);
      await loadData();
    } catch (error: any) {
      setError(error.message || 'Failed to approve transaction');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectTransaction = async (transactionId: string, reason: string) => {
    try {
      setError('');
      setProcessingId(transactionId);
      await apiService.rejectTransaction(transactionId, reason);
      await loadData();
    } catch (error: any) {
      setError(error.message || 'Failed to reject transaction');
    } finally {
      setProcessingId(null);
    }
  };

  const handleVerifyUser = async (userId: string, status: 'VERIFIED' | 'REJECTED', rejectionReason?: string) => {
    try {
      setError('');
      setProcessingId(userId);
      await apiService.verifyUser(userId, {
        status,
        rejectionReason,
        verifiedDocuments: {
          panCard: true,
          aadhaarCard: true,
          drivingLicense: true,
          passport: true
        }
      });
      await loadData();
    } catch (error: any) {
      setError(error.message || 'Failed to verify user');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReviewLandTransaction = async (transactionId: string, action: 'approve' | 'reject', rejectionReason?: string) => {
    try {
      setError('');
      setProcessingId(transactionId);
      await apiService.reviewLandTransaction(transactionId, {
        action,
        rejectionReason,
        comments: action === 'approve' ? 'Transaction approved by admin' : 'Transaction rejected'
      });
      await loadData();
    } catch (error: any) {
      setError(error.message || 'Failed to review transaction');
    } finally {
      setProcessingId(null);
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(1)} Cr`;
    } else if (price >= 100000) {
      return `₹${(price / 100000).toFixed(1)} L`;
    } else {
      return `₹${price.toLocaleString()}`;
    }
  };

  const renderUsers = () => (
    <div className="space-y-4">
      {pendingUsers.length === 0 ? (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <div className="text-gray-400 text-lg mt-4">No pending user verifications</div>
          <p className="text-gray-500 mt-2">All users have been processed.</p>
        </div>
      ) : (
        pendingUsers.map((user) => (
          <div key={user._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-4">
                  <Users className="h-5 w-5 text-blue-500" />
                  <h3 className="text-lg font-semibold text-gray-900">{user.fullName}</h3>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    PENDING VERIFICATION
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                  <div>
                    <span className="font-medium">Email:</span> {user.email}
                  </div>
                  <div>
                    <span className="font-medium">Wallet:</span> {user.walletAddress?.substring(0, 10)}...
                  </div>
                </div>

                <div className="bg-gray-50 rounded-md p-4 mb-4">
                  <h4 className="font-medium text-gray-700 mb-3">Submitted Verification Documents:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {user.verificationDocuments?.panCard && (
                      <div className="bg-white rounded p-3 border">
                        <div className="flex items-center mb-2">
                          <FileText className="h-4 w-4 text-green-600 mr-2" />
                          <span className="font-medium text-gray-700">PAN Card</span>
                        </div>
                        <div className="text-gray-600">Number: {user.verificationDocuments.panCard.number}</div>
                        {user.verificationDocuments.panCard.documentUrl && (
                          <div className="mt-2">
                            <a 
                              href={user.verificationDocuments.panCard.documentUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-xs flex items-center"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View Document
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                    {user.verificationDocuments?.aadhaarCard && (
                      <div className="bg-white rounded p-3 border">
                        <div className="flex items-center mb-2">
                          <FileText className="h-4 w-4 text-green-600 mr-2" />
                          <span className="font-medium text-gray-700">Aadhaar Card</span>
                        </div>
                        <div className="text-gray-600">Number: {user.verificationDocuments.aadhaarCard.number}</div>
                        {user.verificationDocuments.aadhaarCard.documentUrl && (
                          <div className="mt-2">
                            <a 
                              href={user.verificationDocuments.aadhaarCard.documentUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-xs flex items-center"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View Document
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                    {user.verificationDocuments?.drivingLicense && (
                      <div className="bg-white rounded p-3 border">
                        <div className="flex items-center mb-2">
                          <FileText className="h-4 w-4 text-green-600 mr-2" />
                          <span className="font-medium text-gray-700">Driving License</span>
                        </div>
                        <div className="text-gray-600">Number: {user.verificationDocuments.drivingLicense.number}</div>
                        {user.verificationDocuments.drivingLicense.documentUrl && (
                          <div className="mt-2">
                            <a 
                              href={user.verificationDocuments.drivingLicense.documentUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-xs flex items-center"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View Document
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                    {user.verificationDocuments?.passport && (
                      <div className="bg-white rounded p-3 border">
                        <div className="flex items-center mb-2">
                          <FileText className="h-4 w-4 text-green-600 mr-2" />
                          <span className="font-medium text-gray-700">Passport</span>
                        </div>
                        <div className="text-gray-600">Number: {user.verificationDocuments.passport.number}</div>
                        {user.verificationDocuments.passport.documentUrl && (
                          <div className="mt-2">
                            <a 
                              href={user.verificationDocuments.passport.documentUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-xs flex items-center"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View Document
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col space-y-2 ml-4">
                <button
                  onClick={() => handleVerifyUser(user._id, 'VERIFIED')}
                  disabled={processingId === user._id}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {processingId === user._id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Verify
                </button>
                <button
                  onClick={() => {
                    const reason = prompt('Please provide a reason for rejection:');
                    if (reason) {
                      handleVerifyUser(user._id, 'REJECTED', reason);
                    }
                  }}
                  disabled={processingId === user._id}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderLands = () => (
    <div className="space-y-4">
      {allLands.length === 0 ? (
        <div className="text-center py-12">
          <Database className="mx-auto h-12 w-12 text-gray-400" />
          <div className="text-gray-400 text-lg mt-4">No lands registered</div>
          <p className="text-gray-500 mt-2">No lands have been added to the database yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allLands.map((land) => (
            <div key={land._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Asset ID: {land.assetId}
                  </h3>
                  <p className="text-sm text-gray-600">Survey: {land.surveyNumber}</p>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    land.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                    land.status === 'FOR_SALE' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {land.status.replace('_', ' ')}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    land.verificationStatus === 'VERIFIED' ? 'bg-green-100 text-green-800' :
                    land.verificationStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {land.verificationStatus}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600">
                <div>Location: {land.village}, {land.district}</div>
                <div>Type: {land.landType}</div>
                <div>Area: {land.area.acres || 0} Acres</div>
                {land.currentOwner && (
                  <div>Owner: {land.currentOwner.fullName}</div>
                )}
                <div>Digitalized: {land.digitalDocument.isDigitalized ? 'Yes' : 'No'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderLandTransactions = () => (
    <div className="space-y-4">
      {landTransactions.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
          <div className="text-gray-400 text-lg mt-4">No pending land transactions</div>
          <p className="text-gray-500 mt-2">All land transactions have been processed.</p>
        </div>
      ) : (
        landTransactions.map((transaction) => (
          <div key={transaction._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-4">
                  <ShoppingCart className="h-5 w-5 text-blue-500" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Land Sale Transaction
                  </h3>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    {transaction.status.replace('_', ' ')}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                  <div>
                    <span className="font-medium">Asset ID:</span> {transaction.landId.assetId}
                  </div>
                  <div>
                    <span className="font-medium">Location:</span> {transaction.landId.village}, {transaction.landId.district}
                  </div>
                  <div>
                    <span className="font-medium">Seller:</span> {transaction.seller.fullName}
                  </div>
                  <div>
                    <span className="font-medium">Buyer:</span> {transaction.buyer.fullName}
                  </div>
                  <div>
                    <span className="font-medium">Agreed Price:</span> {formatPrice(transaction.agreedPrice)}
                  </div>
                  <div>
                    <span className="font-medium">Date:</span> {new Date(transaction.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="flex flex-col space-y-2 ml-4">
                <button
                  onClick={() => handleReviewLandTransaction(transaction._id, 'approve')}
                  disabled={processingId === transaction._id}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {processingId === transaction._id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Approve
                </button>

                <button
                  onClick={() => {
                    const reason = prompt('Please provide a reason for rejection:');
                    if (reason) {
                      handleReviewLandTransaction(transaction._id, 'reject', reason);
                    }
                  }}
                  disabled={processingId === transaction._id}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage users, transactions, and land registry
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="inline h-4 w-4 mr-2" />
            User Verifications
          </button>
          <button
            onClick={() => setActiveTab('land-transactions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'land-transactions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ShoppingCart className="inline h-4 w-4 mr-2" />
            Land Transactions
          </button>
          <button
            onClick={() => setActiveTab('lands')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'lands'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Database className="inline h-4 w-4 mr-2" />
            All Lands
          </button>
        </nav>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {activeTab === 'users' && renderUsers()}
          {activeTab === 'lands' && renderLands()}
          {activeTab === 'land-transactions' && renderLandTransactions()}
        </>
      )}
    </div>
  );
};

export default AdminPanel;