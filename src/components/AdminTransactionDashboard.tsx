import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  Download, 
  User, 
  MapPin, 
  DollarSign,
  Calendar,
  FileText
} from 'lucide-react';
import apiService from '../services/api';

interface Transaction {
  _id: string;
  landId: {
    _id: string;
    assetId: string;
    surveyNumber: string;
    village: string;
    district: string;
    state: string;
    area: {
      acres?: number;
      guntas?: number;
      sqft?: number;
    };
    landType: string;
    marketInfo: {
      askingPrice?: number;
    };
    originalDocument?: {
      filename: string;
      url: string;
    };
    digitalDocument?: {
      url: string;
    };
  };
  seller: {
    _id: string;
    fullName: string;
    email: string;
    verificationStatus: string;
    verificationDocuments?: any;
  };
  buyer: {
    _id: string;
    fullName: string;
    email: string;
    verificationStatus: string;
    verificationDocuments?: any;
  };
  agreedPrice: number;
  status: string;
  createdAt: string;
  timeline: Array<{
    event: string;
    timestamp: string;
    performedBy: any;
    description: string;
  }>;
}

interface AdminTransactionDashboardProps {
  onClose?: () => void;
}

const AdminTransactionDashboard: React.FC<AdminTransactionDashboardProps> = ({ onClose }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [approvalComments, setApprovalComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadPendingTransactions();
  }, []);

  const loadPendingTransactions = async () => {
    try {
      setLoading(true);
      const response = await apiService.getPendingTransactions();
      setTransactions(response.transactions || []);
    } catch (error: any) {
      setError(error.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (transactionId: string) => {
    try {
      const response = await apiService.getTransactionDetails(transactionId);
      setSelectedTransaction(response.transaction);
      setShowDetails(true);
    } catch (error: any) {
      setError(error.message || 'Failed to load transaction details');
    }
  };

  const handleApprove = async (transactionId: string) => {
    try {
      await apiService.approveTransaction(transactionId);
      setShowDetails(false);
      setSelectedTransaction(null);
      setApprovalComments('');
      await loadPendingTransactions();
      alert('Transaction approved successfully');
    } catch (error: any) {
      setError(error.message || 'Failed to approve transaction');
    }
  };

  const handleReject = async (transactionId: string) => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    try {
      await apiService.rejectTransaction(transactionId, rejectionReason);
      setShowDetails(false);
      setSelectedTransaction(null);
      setRejectionReason('');
      await loadPendingTransactions();
      alert('Transaction rejected');
    } catch (error: any) {
      setError(error.message || 'Failed to reject transaction');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          onClick={loadPendingTransactions}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Pending Transactions</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle className="w-6 h-6" />
          </button>
        )}
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No pending transactions</p>
        </div>
      ) : (
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <div key={transaction._id} className="bg-white rounded-lg shadow-md p-6 border">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Transaction #{transaction._id.slice(-8)}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {formatDate(transaction.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewDetails(transaction._id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Land Details */}
                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Land Details
                  </h4>
                  <p className="text-sm text-gray-600">Asset ID: {transaction.landId.assetId}</p>
                  <p className="text-sm text-gray-600">Survey: {transaction.landId.surveyNumber}</p>
                  <p className="text-sm text-gray-600">
                    {transaction.landId.village}, {transaction.landId.district}
                  </p>
                  <p className="text-sm text-gray-600">Type: {transaction.landId.landType}</p>
                </div>

                {/* Seller Details */}
                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Seller
                  </h4>
                  <p className="text-sm text-gray-900 font-medium">{transaction.seller.fullName}</p>
                  <p className="text-sm text-gray-600">{transaction.seller.email}</p>
                  <p className="text-sm text-gray-600">
                    Status: <span className={`px-2 py-1 rounded text-xs ${
                      transaction.seller.verificationStatus === 'VERIFIED' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {transaction.seller.verificationStatus}
                    </span>
                  </p>
                </div>

                {/* Buyer Details */}
                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Buyer
                  </h4>
                  <p className="text-sm text-gray-900 font-medium">{transaction.buyer.fullName}</p>
                  <p className="text-sm text-gray-600">{transaction.buyer.email}</p>
                  <p className="text-sm text-gray-600">
                    Status: <span className={`px-2 py-1 rounded text-xs ${
                      transaction.buyer.verificationStatus === 'VERIFIED' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {transaction.buyer.verificationStatus}
                    </span>
                  </p>
                </div>
              </div>

              <div className="mt-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span className="text-lg font-bold text-green-600">
                    {formatPrice(transaction.agreedPrice)}
                  </span>
                </div>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                  Pending Approval
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transaction Details Modal */}
      {showDetails && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  Transaction Details
                </h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {/* Detailed transaction information */}
              <div className="space-y-6">
                {/* Land Information */}
                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Land Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Asset ID:</p>
                      <p className="font-medium">{selectedTransaction.landId.assetId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Survey Number:</p>
                      <p className="font-medium">{selectedTransaction.landId.surveyNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Location:</p>
                      <p className="font-medium">
                        {selectedTransaction.landId.village}, {selectedTransaction.landId.district}, {selectedTransaction.landId.state}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Land Type:</p>
                      <p className="font-medium">{selectedTransaction.landId.landType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Area:</p>
                      <p className="font-medium">
                        {selectedTransaction.landId.area.acres && `${selectedTransaction.landId.area.acres} acres`}
                        {selectedTransaction.landId.area.guntas && ` ${selectedTransaction.landId.area.guntas} guntas`}
                        {selectedTransaction.landId.area.sqft && ` ${selectedTransaction.landId.area.sqft} sqft`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Documents */}
                {(selectedTransaction.landId.originalDocument || selectedTransaction.landId.digitalDocument) && (
                  <div className="bg-gray-50 p-4 rounded">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Documents
                    </h4>
                    <div className="flex gap-4">
                      {selectedTransaction.landId.originalDocument && (
                        <a
                          href={selectedTransaction.landId.originalDocument.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          <Download className="w-4 h-4" />
                          Original Document
                        </a>
                      )}
                      {selectedTransaction.landId.digitalDocument && (
                        <a
                          href={selectedTransaction.landId.digitalDocument.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          <Download className="w-4 h-4" />
                          Digital Document
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Transaction Actions */}
                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="font-semibold text-gray-900 mb-3">Admin Actions</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Approval Comments (Optional)
                      </label>
                      <textarea
                        value={approvalComments}
                        onChange={(e) => setApprovalComments(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        placeholder="Add any comments for approval..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rejection Reason (If rejecting)
                      </label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        rows={3}
                        placeholder="Provide reason for rejection..."
                      />
                    </div>

                    <div className="flex gap-4">
                      <button
                        onClick={() => handleApprove(selectedTransaction._id)}
                        className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve Transaction
                      </button>
                      <button
                        onClick={() => handleReject(selectedTransaction._id)}
                        className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject Transaction
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTransactionDashboard;
