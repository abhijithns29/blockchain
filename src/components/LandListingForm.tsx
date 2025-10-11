import React, { useState, useEffect } from 'react';
import { X, Upload, Camera, Plus, Trash2, MapPin, DollarSign, FileText } from 'lucide-react';
import { Land } from '../types';
import { useAuth } from '../hooks/useAuth';
import apiService from '../services/api';

interface LandListingFormProps {
  land: Land;
  onClose: () => void;
  onSuccess: () => void;
}

interface ListingFormData {
  askingPrice: string;
  description: string;
  features: string[];
  nearbyAmenities: string[];
  virtualTourUrl: string;
}

const LandListingForm: React.FC<LandListingFormProps> = ({ land, onClose, onSuccess }) => {
  const { auth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [formData, setFormData] = useState<ListingFormData>({
    askingPrice: '',
    description: '',
    features: [],
    nearbyAmenities: [],
    virtualTourUrl: ''
  });
  const [newFeature, setNewFeature] = useState('');
  const [newAmenity, setNewAmenity] = useState('');

  const handleInputChange = (field: keyof ListingFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file count
    if (images.length + files.length > 7) {
      setError('Maximum 7 images allowed');
      return;
    }

    // Validate file types and sizes
    const validFiles: File[] = [];
    const validPreviews: string[] = [];

    files.forEach(file => {
      if (!file.type.startsWith('image/')) {
        setError(`${file.name} is not a valid image file`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError(`${file.name} is too large. Maximum size is 10MB`);
        return;
      }
      validFiles.push(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          validPreviews.push(e.target.result as string);
          setImagePreviews(prev => [...prev, e.target?.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    setImages(prev => [...prev, ...validFiles]);
    setError('');
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const addFeature = () => {
    if (newFeature.trim() && !formData.features.includes(newFeature.trim())) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, newFeature.trim()]
      }));
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const addAmenity = () => {
    if (newAmenity.trim() && !formData.nearbyAmenities.includes(newAmenity.trim())) {
      setFormData(prev => ({
        ...prev,
        nearbyAmenities: [...prev.nearbyAmenities, newAmenity.trim()]
      }));
      setNewAmenity('');
    }
  };

  const removeAmenity = (index: number) => {
    setFormData(prev => ({
      ...prev,
      nearbyAmenities: prev.nearbyAmenities.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate form
      if (!formData.askingPrice || parseFloat(formData.askingPrice) <= 0) {
        throw new Error('Please enter a valid asking price');
      }

      if (!formData.description.trim()) {
        throw new Error('Please provide a description for your land');
      }

      if (images.length === 0) {
        throw new Error('Please upload at least one image');
      }

      // Create FormData for multipart upload
      const submitData = new FormData();
      submitData.append('askingPrice', formData.askingPrice);
      submitData.append('description', formData.description);
      submitData.append('features', JSON.stringify(formData.features));
      submitData.append('nearbyAmenities', JSON.stringify(formData.nearbyAmenities));
      
      if (formData.virtualTourUrl) {
        submitData.append('virtualTourUrl', formData.virtualTourUrl);
      }

      // Add images
      images.forEach((image, index) => {
        submitData.append('images', image);
      });

      // Submit to API
      await apiService.listLandForSale(land._id, submitData);
      
      onSuccess();
    } catch (error: any) {
      setError(error.message || 'Failed to list land for sale');
    } finally {
      setLoading(false);
    }
  };

  const formatArea = (land: Land) => {
    const { acres, guntas, sqft } = land.area || {};
    let areaStr = '';
    if (acres && acres > 0) areaStr += `${acres} acres`;
    if (guntas && guntas > 0) areaStr += ` ${guntas} guntas`;
    if (sqft && sqft > 0) areaStr += ` ${sqft} sqft`;
    return areaStr || 'Area not specified';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">List Land for Sale</h2>
            <p className="text-gray-600 mt-1">
              {land.village}, {land.district}, {land.state} - Survey No. {land.surveyNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Land Info Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Land Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Area:</span>
                <span className="ml-2 font-medium">{formatArea(land)}</span>
              </div>
              <div>
                <span className="text-gray-600">Land Type:</span>
                <span className="ml-2 font-medium">{land.landType}</span>
              </div>
              <div>
                <span className="text-gray-600">Asset ID:</span>
                <span className="ml-2 font-medium">{land.assetId}</span>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <span className="ml-2 font-medium text-green-600">Verified & Digitalized</span>
              </div>
            </div>
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="inline w-4 h-4 mr-1" />
              Asking Price (₹)
            </label>
            <input
              type="number"
              value={formData.askingPrice}
              onChange={(e) => handleInputChange('askingPrice', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your asking price"
              min="0"
              step="1000"
              required
            />
            {formData.askingPrice && (
              <p className="text-sm text-gray-600 mt-1">
                ₹{parseInt(formData.askingPrice).toLocaleString('en-IN')}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="inline w-4 h-4 mr-1" />
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe your land, its features, and why it's a great investment..."
              rows={4}
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              {formData.description.length}/2000 characters
            </p>
          </div>

          {/* Images Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Camera className="inline w-4 h-4 mr-1" />
              Upload Photos (1-7 images)
            </label>
            
            {/* Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-gray-600">Click to upload images</p>
                <p className="text-sm text-gray-500">PNG, JPG up to 10MB each</p>
              </label>
            </div>

            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Uploaded Images ({imagePreviews.length}/7)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Features */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Land Features
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Fertile soil, Water connection"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
              />
              <button
                type="button"
                onClick={addFeature}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {formData.features.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.features.map((feature, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {feature}
                    <button
                      type="button"
                      onClick={() => removeFeature(index)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Nearby Amenities */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nearby Amenities
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newAmenity}
                onChange={(e) => setNewAmenity(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., School, Hospital, Market"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAmenity())}
              />
              <button
                type="button"
                onClick={addAmenity}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {formData.nearbyAmenities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.nearbyAmenities.map((amenity, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                  >
                    {amenity}
                    <button
                      type="button"
                      onClick={() => removeAmenity(index)}
                      className="text-green-600 hover:text-green-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Virtual Tour */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Virtual Tour URL (Optional)
            </label>
            <input
              type="url"
              value={formData.virtualTourUrl}
              onChange={(e) => handleInputChange('virtualTourUrl', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://..."
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Listing...' : 'List for Sale'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LandListingForm;
