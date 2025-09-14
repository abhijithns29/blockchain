import React, { useState, useRef } from 'react';
import { Camera, X, CheckCircle, AlertCircle } from 'lucide-react';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startScanning = async () => {
    try {
      setScanning(true);
      setError('');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      setError('Camera access denied. Please allow camera access to scan QR codes.');
      setScanning(false);
    }
  };

  const stopScanning = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setScanning(false);
  };

  const handleManualInput = () => {
    const input = prompt('Enter Asset ID manually:');
    if (input && input.trim()) {
      setResult(input.trim());
      onScan(input.trim());
    }
  };

  const handleScanResult = (data: string) => {
    try {
      // Try to parse as JSON (QR code data)
      const parsed = JSON.parse(data);
      if (parsed.assetId) {
        setResult(parsed.assetId);
        onScan(parsed.assetId);
      } else {
        setResult(data);
        onScan(data);
      }
    } catch {
      // If not JSON, treat as plain text
      setResult(data);
      onScan(data);
    }
    stopScanning();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Scan QR Code</h2>
          <button
            onClick={() => {
              stopScanning();
              onClose();
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-md flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </div>
          )}

          {result && (
            <div className="bg-green-50 border border-green-200 text-green-600 px-3 py-2 rounded-md flex items-center">
              <CheckCircle className="h-4 w-4 mr-2" />
              Scanned: {result}
            </div>
          )}

          {!scanning ? (
            <div className="space-y-4">
              <div className="text-center">
                <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">
                  Scan the QR code on the land certificate to verify ownership
                </p>
                <button
                  onClick={startScanning}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Start Camera
                </button>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-2">Or</p>
                <button
                  onClick={handleManualInput}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Enter Asset ID manually
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <video
                  ref={videoRef}
                  className="w-full h-64 bg-black rounded-md"
                  autoPlay
                  playsInline
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />
                
                {/* Scanning overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-2 border-white w-48 h-48 rounded-lg opacity-75">
                    <div className="w-full h-full border-2 border-blue-500 rounded-lg animate-pulse"></div>
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Position the QR code within the frame
                </p>
                <button
                  onClick={stopScanning}
                  className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
                >
                  Stop Scanning
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRScanner;