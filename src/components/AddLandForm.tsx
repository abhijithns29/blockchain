import React, { useState } from 'react';
import { Upload, X, MapPin, Home, Navigation } from 'lucide-react';
import apiService from '../services/api';
import MapView from './MapView';

interface AddLandFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

const AddLandForm: React.FC<AddLandFormProps> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    surveyNumber: '',
    subDivision: '',
    village: '',
    taluka: '',
    district: '',
    state: '',
    pincode: '',
    area: {
      acres: '',
      guntas: '',
      sqft: ''
    },
    boundaries: {
      north: '',
      south: '',
      east: '',
      west: ''
    },
    landType: '',
    classification: '',
    ownerId: '',
    coordinates: null as { latitude: number; longitude: number } | null,
    soilType: '',
    waterSource: '',
    roadAccess: false,
    electricityConnection: false
  });

  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showMap, setShowMap] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
   const { name, value, type, checked } = e.target;  
    
   // Clear success message when user starts typing
   if (success) {
     setSuccess('');
   }
    
    if (type === 'checkbox') {
      if (name.includes('.')) {
        const [parent, child] = name.split('.');
        setFormData(prev => ({
          ...prev,
          [parent]: {
            ...(prev as any)[parent],
            [child]: checked,
          },
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          [name]: checked,
        }));
      }
      return;
    }
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev as any)[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      coordinates: { latitude: lat, longitude: lng }
    }));
    setShowMap(false);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Clear previous errors
      setError('');
      
      // Validate file type and size
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      if (!allowedTypes.includes(file.type)) {
        setError(`Invalid file type: ${file.name}. Only PDF, JPG, and PNG files are allowed.`);
        return;
      }
      
      if (file.size > maxSize) {
        setError(`File too large: ${file.name}. Maximum size is 10MB.`);
        return;
      }
      
      setDocumentFile(file);
      setError('');
      
      // Clear the input value to allow re-uploading the same file
      e.target.value = '';
    }
  };

  const removeFile = () => {
    setDocumentFile(null);
  };

  const validateForm = () => {
    const required = ['surveyNumber', 'village', 'taluka', 'district', 'state', 'pincode', 'landType', 'ownerId'];
    const missing = required.filter(field => !formData[field as keyof typeof formData]);
    
    if (missing.length > 0) {
      setError(`Please fill in all required fields: ${missing.join(', ')}`);
      return false;
    }
    
    if (!/^\d{6}$/.test(formData.pincode)) {
      setError('Please enter a valid 6-digit PIN code');
      return false;
    }

    // Validate MongoDB ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(formData.ownerId)) {
      setError('Please enter a valid MongoDB ObjectId for Owner ID');
      return false;
    }
    
    return true;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const formDataToSend = new FormData();
      
      // Add form data
      Object.entries(formData).forEach(([key, value]) => {
        if (typeof value === 'object') {
          formDataToSend.append(key, JSON.stringify(value));
        } else {
          formDataToSend.append(key, value);
        }
      });

      // Add document file
      if (documentFile) {
        formDataToSend.append('document', documentFile);
      }

      const response = await apiService.addLand(formDataToSend);
      
      if (response.success) {
        // Reset form
        setFormData({
          surveyNumber: '',
          subDivision: '',
          village: '',
          taluka: '',
          district: '',
          state: '',
          pincode: '',
          area: {
            acres: '',
            guntas: '',
            sqft: ''
          },
          boundaries: {
            north: '',
            south: '',
            east: '',
            west: ''
          },
          landType: '',
          classification: '',
          ownerId: '',
          coordinates: null,
          soilType: '',
          waterSource: '',
          roadAccess: false,
          electricityConnection: false
        });
        setDocumentFile(null);
        setError('');
        setSuccess('Land added successfully!');
        setTimeout(() => {
          onSuccess();
        }, 1000);
      } else {
        setError(response.message || 'Failed to add land');
      }
    } catch (error: any) {
      console.error('Add land error:', error);
      
      // Provide more specific error messages based on the error
      let errorMessage = 'Failed to add land';
      
      if (error.message.includes('IPFS')) {
        errorMessage = 'Failed to upload document to IPFS. Please check your internet connection and try again.';
      } else if (error.message.includes('watermark')) {
        errorMessage = 'Failed to process document watermark. Please ensure the file is a valid PDF or image.';
      } else if (error.message.includes('file format')) {
        errorMessage = 'Unsupported file format. Please upload a PDF, JPEG, or PNG file.';
      } else if (error.message.includes('Missing required fields')) {
        errorMessage = 'Please fill in all required fields before submitting.';
      } else if (error.message.includes('Invalid ownerId')) {
        errorMessage = 'Invalid owner selected. Please select a valid user as the owner.';
      } else if (error.message.includes('Failed to upload document')) {
        errorMessage = 'Document upload failed. Please try again with a different file or check your connection.';
      } else {
        errorMessage = error.message || 'An unexpected error occurred. Please try again.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Add Land to Database</h2>
          <button
            onClick={() => {
              setSuccess('');
              setError('');
              setDocumentFile(null);
              onClose();
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Survey Number *
                </label>
                <input
                  type="text"
                  name="surveyNumber"
                  required
                  value={formData.surveyNumber}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="123/1A"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sub Division
                </label>
                <input
                  type="text"
                  name="subDivision"
                  value={formData.subDivision}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="1A1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Owner ID (MongoDB User ObjectId) *
                </label>
                <input
                  type="text"
                  name="ownerId"
                  required
                  value={formData.ownerId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="MongoDB User ObjectId"
                />
              </div>
            </div>
          </div>

          {/* Location Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Location Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Village *
                </label>
                <input
                  type="text"
                  name="village"
                  required
                  value={formData.village}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Village name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Taluka *
                </label>
                <input
                  type="text"
                  name="taluka"
                  required
                  value={formData.taluka}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Taluka name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  District *
                </label>
                <input
                  type="text"
                  name="district"
                  required
                  value={formData.district}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="District name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State *
                </label>
                <select
                  name="state"
                  required
                  value={formData.state}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select State</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Tamil Nadu">Tamil Nadu</option>
                  <option value="Gujarat">Gujarat</option>
                  <option value="Rajasthan">Rajasthan</option>
                  <option value="Uttar Pradesh">Uttar Pradesh</option>
                  <option value="West Bengal">West Bengal</option>
                  <option value="Andhra Pradesh">Andhra Pradesh</option>
                  <option value="Telangana">Telangana</option>
                  <option value="Kerala">Kerala</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pincode *
                </label>
                <input
                  type="text"
                  name="pincode"
                  required
                  value={formData.pincode}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="560001"
                  pattern="[0-9]{6}"
                  maxLength={6}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Geographic Location
                </label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowMap(true)}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    {formData.coordinates ? 'Update Location' : 'Set Location'}
                  </button>
                  {formData.coordinates && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, coordinates: null }))}
                      className="px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {formData.coordinates && (
                  <p className="text-xs text-gray-500 mt-1">
                    Lat: {formData.coordinates.latitude.toFixed(6)}, 
                    Lng: {formData.coordinates.longitude.toFixed(6)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Land Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Home className="h-5 w-5 mr-2" />
              Land Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Land Type *
                </label>
                <select
                  name="landType"
                  required
                  value={formData.landType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Type</option>
                  <option value="AGRICULTURAL">Agricultural</option>
                  <option value="RESIDENTIAL">Residential</option>
                  <option value="COMMERCIAL">Commercial</option>
                  <option value="INDUSTRIAL">Industrial</option>
                  <option value="GOVERNMENT">Government</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Classification
                </label>
                <select
                  name="classification"
                  value={formData.classification}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Classification</option>
                  <option value="DRY">Dry</option>
                  <option value="WET">Wet</option>
                  <option value="GARDEN">Garden</option>
                  <option value="INAM">Inam</option>
                  <option value="SARKAR">Sarkar</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Area (Acres)
                </label>
                <input
                  type="number"
                  name="area.acres"
                  step="0.01"
                  min="0"
                  value={formData.area.acres}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="2.5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Area (Guntas)
                </label>
                <input
                  type="number"
                  name="area.guntas"
                  min="0"
                  value={formData.area.guntas}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="20"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Area (Sq Ft)
                </label>
                <input
                  type="number"
                  name="area.sqft"
                  min="0"
                  value={formData.area.sqft}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="1000"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Soil Type
                </label>
                <input
                  type="text"
                  name="soilType"
                  value={formData.soilType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Black soil, Red soil, etc."
                />
              </div>
            </div>
            
            {/* Additional Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Water Source
                </label>
                <input
                  type="text"
                  name="waterSource"
                  value={formData.waterSource}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Borewell, Canal, River, etc."
                />
              </div>
              
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Infrastructure
                </label>
                <div className="flex space-x-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="roadAccess"
                      checked={formData.roadAccess}
                      onChange={handleInputChange}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Road Access</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="electricityConnection"
                      checked={formData.electricityConnection}
                      onChange={handleInputChange}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Electricity</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Boundaries */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Boundaries</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  North
                </label>
                <input
                  type="text"
                  name="boundaries.north"
                  value={formData.boundaries.north}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Road / Survey No. / Owner name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  South
                </label>
                <input
                  type="text"
                  name="boundaries.south"
                  value={formData.boundaries.south}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Road / Survey No. / Owner name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  East
                </label>
                <input
                  type="text"
                  name="boundaries.east"
                  value={formData.boundaries.east}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Road / Survey No. / Owner name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  West
                </label>
                <input
                  type="text"
                  name="boundaries.west"
                  value={formData.boundaries.west}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Road / Survey No. / Owner name"
                />
              </div>
            </div>
          </div>

          {/* Document Upload */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Upload className="h-5 w-5 mr-2" />
              Original Documents
            </h3>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden"
                id="document"
              />
              <label
                htmlFor="document"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-sm text-gray-600 text-center">
                  Click to upload original land document
                  <br />
                  <span className="text-xs text-gray-500">
                    PDF, JPG, PNG files accepted (Max 10MB)
                  </span>
                </p>
              </label>
            </div>

            {documentFile && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-700">Uploaded File:</h4>
                <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-700">{documentFile.name}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({(documentFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">
              {success}
            </div>
          )}

          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Adding...
                </div>
              ) : (
                'Add Land'
              )}
            </button>
          </div>
        </form>
        
        {/* Map Modal */}
        {showMap && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Select Land Location</h3>
                <button
                  onClick={() => setShowMap(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-600 mb-4">
                  Click on the map to set the geographic location of the land
                </p>
                <MapView
                  lands={[]}
                  onLocationSelect={handleLocationSelect}
                  showLocationPicker={true}
                  selectedLocation={formData.coordinates}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddLandForm;