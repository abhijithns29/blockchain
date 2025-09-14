import React, { useState, useEffect } from 'react';
import { BarChart3, Activity, Users, Database, FileText, TrendingUp, Calendar, Download } from 'lucide-react';
import apiService from '../services/api';

const AuditorDashboard: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadAuditData();
  }, [dateRange]);

  const loadAuditData = async () => {
    try {
      setLoading(true);
      const [logsResponse, statsResponse] = await Promise.all([
        apiService.getAuditLogs(dateRange),
        apiService.getSystemStatistics(dateRange)
      ]);
      
      setAuditLogs(logsResponse.logs);
      setStatistics(statsResponse.statistics);
    } catch (error: any) {
      setError(error.message || 'Failed to load audit data');
    } finally {
      setLoading(false);
    }
  };

  const exportAuditReport = async () => {
    try {
      const response = await apiService.exportAuditReport(dateRange);
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-report-${dateRange.startDate}-${dateRange.endDate}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error: any) {
      setError(error.message || 'Failed to export audit report');
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'USER_LOGIN':
      case 'USER_LOGOUT':
        return <Users className="h-4 w-4" />;
      case 'LAND_ADD':
      case 'LAND_DIGITALIZE':
        return <Database className="h-4 w-4" />;
      case 'TRANSACTION_INITIATE':
      case 'TRANSACTION_APPROVE':
        return <FileText className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('APPROVE') || action.includes('VERIFY')) return 'text-green-600';
    if (action.includes('REJECT') || action.includes('CANCEL')) return 'text-red-600';
    if (action.includes('LOGIN') || action.includes('REGISTER')) return 'text-blue-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor system activities and generate compliance reports
          </p>
        </div>
        <button
          onClick={exportAuditReport}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Date Range Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          <Calendar className="h-5 w-5 text-gray-400" />
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">From:</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">To:</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.totalUsers || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Database className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Lands</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.totalLands || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.totalTransactions || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">
                ₹{((statistics.totalTransactionValue || 0) / 10000000).toFixed(1)}Cr
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent System Activity</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {auditLogs.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No audit logs found for the selected date range
            </div>
          ) : (
            auditLogs.slice(0, 20).map((log) => (
              <div key={log.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start space-x-3">
                  <div className={`mt-1 ${getActionColor(log.action)}`}>
                    {getActionIcon(log.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {log.performedBy?.fullName || 'System'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-sm text-gray-600">
                      {log.action.replace(/_/g, ' ').toLowerCase()}
                    </p>
                    {log.details && (
                      <p className="text-xs text-gray-500 mt-1">
                        {JSON.stringify(log.details).substring(0, 100)}...
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditorDashboard;