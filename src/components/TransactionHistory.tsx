import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, Download, ExternalLink } from 'lucide-react';
import { Transaction } from '../types';
import apiService from '../services/api';

const TransactionHistory: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const response = await apiService.getUserTransactions();
      setTransactions(response.transactions);
    } catch (error: any) {
      setError(error.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'APPROVED':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'REJECTED':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTransactionType = (type: string) => {
    switch (type) {
      case 'REGISTRATION':
        return 'Property Registration';
      case 'SALE':
        return 'Property Sale';
      case 'RENT':
        return 'Property Rental';
      case 'TRANSFER':
        return 'Property Transfer';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transaction History</h1>
        <p className="mt-1 text-sm text-gray-500">
          View all your property transactions and their current status
        </p>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg">No transactions found</div>
          <p className="text-gray-500 mt-2">
            You haven't made any property transactions yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {getStatusIcon(transaction.status)}
                    <h3 className="text-lg font-semibold text-gray-900">
                      {formatTransactionType(transaction.transactionType)}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                      {transaction.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Amount:</span> ${transaction.amount.toLocaleString()}
                    </div>
                    <div>
                      <span className="font-medium">Date:</span> {new Date(transaction.createdAt).toLocaleDateString()}
                    </div>
                    {transaction.from && (
                      <div>
                        <span className="font-medium">From:</span> {transaction.from.fullName}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">To:</span> {transaction.to.fullName}
                    </div>
                  </div>

                  {transaction.metadata.description && (
                    <p className="mt-3 text-sm text-gray-600">
                      {transaction.metadata.description}
                    </p>
                  )}

                  {transaction.status === 'REJECTED' && transaction.metadata.rejectionReason && (
                    <div className="mt-3 bg-red-50 border border-red-200 rounded-md p-3">
                      <p className="text-sm text-red-700">
                        <span className="font-medium">Rejection Reason:</span> {transaction.metadata.rejectionReason}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col space-y-2 ml-4">
                  {transaction.certificateUrl && (
                    <a
                      href={transaction.certificateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Certificate
                    </a>
                  )}
                  {transaction.blockchainTxHash && (
                    <a
                      href={`https://sepolia.etherscan.io/tx/${transaction.blockchainTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Blockchain
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;