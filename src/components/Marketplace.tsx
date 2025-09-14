import React, { useState, useEffect } from 'react';
import { Search, Filter, MapPin, Eye, ShoppingCart } from 'lucide-react';
import { Land } from '../types';
import LandDetailsModal from './LandDetailsModal';
import { useAuth } from '../hooks/useAuth';
import apiService from '../services/api';

const Marketplace: React.FC = () => {
  const { auth } = useAuth();
  const [lands, setLands] = useState<Land[]>([]);
  const [myLands, setMyLands] = useState<Land[]>([]);
  const [activeTab, setActiveTab] = useState<'marketplace' | 'my-lands'>('marketplace');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    district: '',
    state: '',
    landType: ''
  });

  // Form state for listing land for sale
  const [showListForm, setShowListForm] = useState(false);
  const [selectedLandForSale, setSelectedLandForSale] = useState<Land | null>(null);
  const [salePrice, setSalePrice] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [features, setFeatures] = useState<string[]>([]);
  const [nearbyAmenities, setNearbyAmenities] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState('');
  const [newAmenity, setNewAmenity] = useState('');
  const [selectedLandView, setSelectedLandView] = useState<Land | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    if (activeTab === 'marketplace') {
      loadMarketplaceLands();
    } else {
      loadMyLands();
    }
  }, [activeTab]);

  const loadMarketplaceLands = async () => {
    try {
      setLoading(true);
      const response = await apiService.getMarketplaceLands({ limit: 100 });
      setLands(response.lands);
    } catch (error: any) {
      setError(error.message || 'Failed to load marketplace lands');
    } finally {
      setLoading(false);
    }
  };

  const loadMyLands = async () => {
    try {
      setLoading(true);
      const response = await apiService.getMyLands();
      setMyLands(response.lands);
    } catch (error: any) {
      setError(error.message || 'Failed to load your lands');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const filteredLands = (activeTab === 'marketplace' ? lands : myLands).filter(land => {
    const matchesSearch = !searchTerm || 
      land.surveyNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      land.village.toLowerCase().includes(searchTerm.toLowerCase()) ||
      land.district.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMinPrice = !filters.minPrice || 
      (land.marketInfo?.askingPrice && land.marketInfo.askingPrice >= parseFloat(filters.minPrice));
    
    const matchesMaxPrice = !filters.maxPrice || 
      (land.marketInfo?.askingPrice && land.marketInfo.askingPrice <= parseFloat(filters.maxPrice));
    
    const matchesDistrict = !filters.district || 
      land.district.toLowerCase().includes(filters.district.toLowerCase());
    
    const matchesState = !filters.state || 
      land.state.toLowerCase().includes(filters.state.toLowerCase());
    
    const matchesLandType = !filters.landType || land.landType === filters.landType;

    return matchesSearch && matchesMinPrice && matchesMaxPrice && 
           matchesDistrict && matchesState && matchesLandType;
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatArea = (area: any) => {
    if (typeof area === 'object') {
      return `${area.acres || 0} Acres, ${area.guntas || 0} Guntas`;
    }
    return area || 'N/A';
  };

  const handleListForSale = (land: Land) => {
    setSelectedLandForSale(land);
    setSalePrice('');
    setDescription('');
    setImages([]);
    setFeatures([]);
    setNearbyAmenities([]);
    setNewFeature('');
    setNewAmenity('');
    setShowListForm(true);
  };

  const handleSubmitListForSale = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedLandForSale || !salePrice) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      await apiService.listLandForSale(selectedLandForSale._id || selectedLandForSale.id, {
        askingPrice: parseFloat(salePrice),
        description: description || "",
        features: features,
        nearbyAmenities: nearbyAmenities,
      }, images);
      
      setShowListForm(false);
      setSelectedLandForSale(null);
      
      // Reload my lands after listing
      if (activeTab === 'my-lands') {
        loadMyLands();
      }
      
      setError('');
    } catch (error: any) {
      setError(error.message || 'Failed to list land for sale');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileArray = Array.from(e.target.files);
      setImages(fileArray);
    }
  };

  const addFeature = () => {
    if (newFeature.trim() && !features.includes(newFeature.trim())) {
      setFeatures([...features, newFeature.trim()]);
      setNewFeature('');
    }
  };

  const removeFeature = (feature: string) => {
    setFeatures(features.filter(f => f !== feature));
  };

  const addAmenity = () => {
    if (newAmenity.trim() && !nearbyAmenities.includes(newAmenity.trim())) {
      setNearbyAmenities([...nearbyAmenities, newAmenity.trim()]);
      setNewAmenity('');
    }
  };

  const removeAmenity = (amenity: string) => {
    setNearbyAmenities(nearbyAmenities.filter(a => a !== amenity));
  };

  const handleViewDetails = (land: Land) => {
    console.log("Land Details:", land);
    console.log("Market Info:", land.marketInfo);
    console.log("Images:", land.marketInfo?.images);
    console.log("Features:", land.marketInfo?.features);
    console.log("Amenities:", land.marketInfo?.nearbyAmenities);
    setSelectedLandView(land);
    setShowDetailModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
          <p className="mt-1 text-sm text-gray-500">
            {activeTab === 'marketplace' 
              ? 'Browse and purchase lands from verified owners'
              : 'Manage your land properties and listings'
            }
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'marketplace'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Browse Marketplace
          </button>
          <button
            onClick={() => setActiveTab('my-lands')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'my-lands'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            My Lands
          </button>
        </nav>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by survey number, village, or district..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <input
              type="number"
              placeholder="Min Price (₹)"
              value={filters.minPrice}
              onChange={(e) => handleFilterChange('minPrice', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <input
              type="number"
              placeholder="Max Price (₹)"
              value={filters.maxPrice}
              onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <select
              value={filters.landType}
              onChange={(e) => handleFilterChange('landType', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="AGRICULTURAL">Agricultural</option>
              <option value="RESIDENTIAL">Residential</option>
              <option value="COMMERCIAL">Commercial</option>
              <option value="INDUSTRIAL">Industrial</option>
            </select>
            <input
              type="text"
              placeholder="District"
              value={filters.district}
              onChange={(e) => handleFilterChange('district', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <input
              type="text"
              placeholder="State"
              value={filters.state}
              onChange={(e) => handleFilterChange('state', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Showing {filteredLands.length} of {activeTab === 'marketplace' ? lands.length : myLands.length} lands
        </p>
      </div>

      {/* Lands Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="text-red-500 text-lg">{error}</div>
        </div>
      ) : filteredLands.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg">No lands found</div>
          <p className="text-gray-500 mt-2">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLands.map((land) => (
            <div
              key={land._id || land.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {land.surveyNumber}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {land.village}, {land.district}
                    </p>
                  </div>
                  {activeTab === 'marketplace' ? (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                      For Sale
                    </span>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        land.status === 'FOR_SALE' ? 'bg-blue-100 text-blue-800' :
                        land.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {land.status.replace('_', ' ')}
                      </span>
                      {land.marketInfo?.isForSale && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                          Listed
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Area:</span>
                    <span className="font-medium">{formatArea(land.area)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium">{land.landType}</span>
                  </div>
                  {activeTab === 'marketplace' && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Owner:</span>
                      <span className="font-medium">{land.currentOwner?.fullName || 'N/A'}</span>
                    </div>
                  )}
                  {activeTab === 'my-lands' && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Asset ID:</span>
                      <span className="font-medium">{land.assetId}</span>
                    </div>
                  )}
                  {land.marketInfo?.askingPrice && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Price:</span>
                      <span className="font-semibold text-green-600">
                        {formatPrice(land.marketInfo.askingPrice)}
                      </span>
                    </div>
                  )}
                </div>

                {land.marketInfo?.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {land.marketInfo.description}
                  </p>
                )}

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleViewDetails(land)}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Details
                  </button>
                  
                  {activeTab === 'marketplace' ? (
                    land.currentOwner && land.currentOwner.id !== auth.user?.id && (
                      <button
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                      >
                        <ShoppingCart className="h-4 w-4 mr-1" />
                        Purchase
                      </button>
                    )
                  ) : (
                    !land.marketInfo?.isForSale && auth.user?.role === "USER" && (
                      <button
                        onClick={() => handleListForSale(land)}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
                      >
                        <ShoppingCart className="h-4 w-4 mr-1" />
                        List for Sale
                      </button>
                    )
                  )}
                </div>

                {activeTab === 'my-lands' && land.digitalDocument?.isDigitalized && (
                  <div className="mt-3 flex items-center justify-center">
                    <button
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Download Digital Certificate
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enhanced List for Sale Form Modal */}
      {showListForm && selectedLandForSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                List Land for Sale
              </h2>
              <button
                onClick={() => setShowListForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <h3 className="font-medium text-gray-900">{selectedLandForSale.surveyNumber}</h3>
              <p className="text-sm text-gray-600">
                {selectedLandForSale.village}, {selectedLandForSale.district}
              </p>
              <p className="text-sm text-gray-600">
                Area: {formatArea(selectedLandForSale.area)}
              </p>
            </div>

            <form onSubmit={handleSubmitListForSale} className="space-y-4">
              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asking Price (₹) *
                </label>
                <input
                  type="number"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter asking price"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Describe the land, its features, and any additional information..."
                />
              </div>

              {/* Features */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Features
                </label>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add a feature (e.g., Road access, Electricity)"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                  />
                  <button
                    type="button"
                    onClick={addFeature}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
                {features.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {features.map((feature, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-md"
                      >
                        {feature}
                        <button
                          type="button"
                          onClick={() => removeFeature(feature)}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Nearby Amenities */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nearby Amenities
                </label>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={newAmenity}
                    onChange={(e) => setNewAmenity(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add an amenity (e.g., School, Hospital, Market)"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAmenity())}
                  />
                  <button
                    type="button"
                    onClick={addAmenity}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Add
                  </button>
                </div>
                {nearbyAmenities.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {nearbyAmenities.map((amenity, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-sm rounded-md"
                      >
                        {amenity}
                        <button
                          type="button"
                          onClick={() => removeAmenity(amenity)}
                          className="ml-1 text-green-600 hover:text-green-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Images (up to 5)
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {images.length > 0 && (
                  <p className="text-sm text-gray-600 mt-1">
                    {images.length} image(s) selected
                  </p>
                )}
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
                  {error}
                </div>
              )}

              {/* Form Actions */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
                >
                  List for Sale
                </button>
                <button
                  type="button"
                  onClick={() => setShowListForm(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showDetailModal && selectedLandView && (
        <LandDetailsModal
          land={selectedLandView}
          onClose={() => setShowDetailModal(false)}
        />
      )}
    </div>
  );
};

export default Marketplace;
