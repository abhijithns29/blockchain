import React, { useState, useEffect } from 'react';
import { Shield, Key, Copy, Check, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import apiService from '../services/api';

const TwoFactorAuth: React.FC = () => {
  const { auth, refreshUser } = useAuth(); // Destructure refreshUser from useAuth
  const [step, setStep] = useState<'setup' | 'verify' | 'complete'>('setup');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (auth.user?.twoFactorEnabled) {
      setStep('complete');
    }
  }, [auth.user]);

  const setupTwoFactor = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Starting 2FA setup...');
      const response = await apiService.setupTwoFactor();
      if (response.success) {
        setQrCode(response.qrCode);
        setSecret(response.secret);
        setStep('verify');
        console.log('2FA setup successful, moving to verify step');
      } else {
        setError(response.message || 'Failed to setup 2FA');
      }
    } catch (error: any) {
      console.error('2FA setup error:', error);
      setError(error.message || 'Failed to setup two-factor authentication');
    } finally {
      setLoading(false);
    }
  };

  const verifyTwoFactor = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!verificationCode || verificationCode.length !== 6) {
        setError('Please enter a valid 6-digit code');
        return;
      }

      // Only send token
      const response = await apiService.verifyTwoFactor({
        token: verificationCode
      });

      if (response.success) {
        setBackupCodes(response.backupCodes);
        setStep('complete');
        
        try {
          await refreshUser();
        } catch (refreshError) {
          console.error('Failed to refresh user data:', refreshError);
          // Continue even if refresh fails
        }
      } else {
        setError(response.message || 'Invalid verification code');
      }
    } catch (error: any) {
      console.error('2FA verification error:', error);
      setError(error.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const disableTwoFactor = async () => {
    try {
      setLoading(true);
      setError('');
      const confirmCode = prompt('Enter your current 6-digit 2FA code to disable:');
      if (!confirmCode) {
        setLoading(false);
        return;
      }
      if (!/^\d{6}$/.test(confirmCode)) {
        setError('Please enter a valid 6-digit code');
        setLoading(false);
        return;
      }
      const response = await apiService.disableTwoFactor({ token: confirmCode });
      if (response.success) {
        setStep('setup');
        setQrCode('');
        setSecret('');
        setBackupCodes([]);
        setVerificationCode('');
        await refreshUser();
      } else {
        setError(response.message || 'Failed to disable 2FA');
      }
    } catch (error: any) {
      console.error('2FA disable error:', error);
      setError(error.message || 'Failed to disable two-factor authentication');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderSetupStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Shield className="h-16 w-16 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Enable Two-Factor Authentication
        </h2>
        <p className="text-gray-600">
          Add an extra layer of security to your account for sensitive operations
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-blue-500 mr-2" />
          <span className="text-blue-800 font-medium">Why enable 2FA?</span>
        </div>
        <ul className="text-blue-700 mt-2 text-sm space-y-1">
          <li>• Required for approving land transactions (Admin)</li>
          <li>• Protects against unauthorized access</li>
          <li>• Secures sensitive operations</li>
          <li>• Industry standard security practice</li>
        </ul>
      </div>

      <button
        onClick={setupTwoFactor}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Setting up...
          </div>
        ) : (
          'Setup Two-Factor Authentication'
        )}
      </button>
    </div>
  );

  const renderVerifyStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Scan QR Code
        </h2>
        <p className="text-gray-600">
          Use your authenticator app to scan this QR code
        </p>
      </div>

      {qrCode && (
        <div className="text-center">
          <img src={qrCode} alt="2FA QR Code" className="mx-auto mb-4 border rounded-lg" />
          
          <div className="bg-gray-50 rounded-md p-3 mb-4">
            <p className="text-sm text-gray-600 mb-2">Manual entry key:</p>
            <div className="flex items-center justify-center space-x-2">
              <code className="bg-white px-2 py-1 rounded text-sm font-mono">
                {secret}
              </code>
              <button
                onClick={() => copyToClipboard(secret)}
                className="text-blue-600 hover:text-blue-800"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Enter verification code from your authenticator app
        </label>
        <input
          type="text"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg font-mono"
          placeholder="123456"
          maxLength={6}
        />
      </div>

      <button
        onClick={verifyTwoFactor}
        disabled={loading || verificationCode.length !== 6}
        className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Verifying...
          </div>
        ) : (
          'Verify and Enable'
        )}
      </button>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Two-Factor Authentication Enabled
        </h2>
        <p className="text-gray-600">
          Your account is now protected with two-factor authentication
        </p>
      </div>

      {backupCodes.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex items-center mb-2">
            <Key className="h-5 w-5 text-yellow-500 mr-2" />
            <span className="text-yellow-800 font-medium">Backup Codes</span>
          </div>
          <p className="text-yellow-700 text-sm mb-3">
            Save these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.
          </p>
          <div className="grid grid-cols-2 gap-2 font-mono text-sm">
            {backupCodes.map((code, index) => (
              <div key={index} className="bg-white p-2 rounded border">
                {code}
              </div>
            ))}
          </div>
          <button
            onClick={() => copyToClipboard(backupCodes.join('\n'))}
            className="mt-3 text-yellow-700 hover:text-yellow-900 text-sm font-medium"
          >
            Copy all codes
          </button>
        </div>
      )}

      <div className="bg-green-50 border border-green-200 rounded-md p-4">
        <h3 className="font-medium text-green-800 mb-2">What's protected:</h3>
        <ul className="text-green-700 text-sm space-y-1">
          <li>• Land transaction approvals</li>
          <li>• User verification actions</li>
          <li>• Administrative functions</li>
          <li>• Account settings changes</li>
        </ul>
      </div>

      <button
        onClick={disableTwoFactor}
        disabled={loading}
        className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Disabling...' : 'Disable Two-Factor Authentication'}
      </button>
    </div>
  );

  return (
    <div className="max-w-md mx-auto">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-6">
          <div className="flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2" />
            {error}
          </div>
        </div>
      )}

      {step === 'setup' && renderSetupStep()}
      {step === 'verify' && renderVerifyStep()}
      {step === 'complete' && renderCompleteStep()}
    </div>
  );
};

export default TwoFactorAuth;