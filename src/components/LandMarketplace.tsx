import React, { useState, useEffect } from 'react';
import { Search, Filter, MapPin, MessageCircle, Eye, Heart, ShoppingCart, Camera, Star, X, Edit2, Trash2 } from 'lucide-react';
import { Land } from '../types';
import apiService from '../services/api';
import RealtimeChat from './RealtimeChat';
import EditLandListingForm from './EditLandListingForm';
import { useAuth } from '../hooks/useAuth';

interface MarketplaceFilters {
  minPrice: string;
  maxPrice: string;
  district: string;
  state: string;
  landType: string;
  minArea: string;
  maxArea: string;
}

interface LandMarketplaceProps {
  onNavigateToLand?: (landId: string) => void;
}

const LandMarketplace: React.FC<LandMarketplaceProps> = ({ onNavigateToLand }) => {
  const [lands, setLands] = useState<Land[]>([]);
  const [myListings, setMyListings] = useState<Land[]>([]);
  const [likedLands, setLikedLands] = useState<Land[]>([]);
  const [filteredLands, setFilteredLands] = useState<Land[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLand, setSelectedLand] = useState<Land | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedLandForEdit, setSelectedLandForEdit] = useState<Land | null>(null);
  const [activeTab, setActiveTab] = useState<'browse' | 'my-ads' | 'liked'>('browse');
  const [filters, setFilters] = useState<MarketplaceFilters>({
    minPrice: '',
    maxPrice: '',
    district: '',
    state: '',
    landType: '',
    minArea: '',
    maxArea: ''
  });

  useEffect(() => {
    if (activeTab === 'browse') {
      loadMarketplaceLands();
    } else if (activeTab === 'my-ads') {
      loadMyListings();
    } else if (activeTab === 'liked') {
      loadLikedLands();
    }
  }, [activeTab]);

  useEffect(() => {
    filterLands();
  }, [lands, myListings, likedLands, searchTerm, filters, activeTab]);

  const loadMarketplaceLands = async () => {
    try {
      setLoading(true);
      const response = await apiService.getMarketplaceLands({ limit: 100 });
      setLands(response.lands || []);
    } catch (error: any) {
      setError(error.message || 'Failed to load marketplace lands');
    } finally {
      setLoading(false);
    }
  };

  const loadMyListings = async () => {
    try {
      setLoading(true);
      const response = await apiService.getMyListings({ limit: 100 });
      setMyListings(response.lands || []);
    } catch (error: any) {
      setError(error.message || 'Failed to load your listings');
    } finally {
      setLoading(false);
    }
  };

  const loadLikedLands = async () => {
    try {
      setLoading(true);
      const response = await apiService.getLikedLands({ limit: 100 });
      setLikedLands(response.lands || []);
    } catch (error: any) {
      setError(error.message || 'Failed to load liked lands');
    } finally {
      setLoading(false);
    }
  };

  const filterLands = () => {
    const sourceLands = activeTab === 'browse' ? lands : 
                       activeTab === 'my-ads' ? myListings : 
                       likedLands;
    
    let filtered = sourceLands.filter(land => {
      // Search term filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          land.village?.toLowerCase().includes(searchLower) ||
          land.district?.toLowerCase().includes(searchLower) ||
          land.state?.toLowerCase().includes(searchLower) ||
          land.surveyNumber?.toLowerCase().includes(searchLower) ||
          land.marketInfo?.description?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Price filters
      if (filters.minPrice && land.marketInfo?.askingPrice) {
        if (land.marketInfo.askingPrice < parseFloat(filters.minPrice)) return false;
      }
      if (filters.maxPrice && land.marketInfo?.askingPrice) {
        if (land.marketInfo.askingPrice > parseFloat(filters.maxPrice)) return false;
      }

      // Location filters
      if (filters.district && land.district) {
        if (!land.district.toLowerCase().includes(filters.district.toLowerCase())) return false;
      }
      if (filters.state && land.state) {
        if (!land.state.toLowerCase().includes(filters.state.toLowerCase())) return false;
      }

      // Land type filter
      if (filters.landType && land.landType !== filters.landType) return false;

      // Area filters
      if (filters.minArea && land.area?.acres) {
        if (land.area.acres < parseFloat(filters.minArea)) return false;
      }
      if (filters.maxArea && land.area?.acres) {
        if (land.area.acres > parseFloat(filters.maxArea)) return false;
      }

      return true;
    });

    setFilteredLands(filtered);
  };

  const handleFilterChange = (key: keyof MarketplaceFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      minPrice: '',
      maxPrice: '',
      district: '',
      state: '',
      landType: '',
      minArea: '',
      maxArea: ''
    });
    setSearchTerm('');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  const formatArea = (land: Land) => {
    const { acres, guntas, sqft } = land.area || {};
    let areaStr = '';
    if (acres && acres > 0) areaStr += `${acres} acres`;
    if (guntas && guntas > 0) areaStr += ` ${guntas} guntas`;
    if (sqft && sqft > 0) areaStr += ` ${sqft} sqft`;
    return areaStr || 'Area not specified';
  };

  const getImageUrl = (imageHash: string) => {
    if (!imageHash) return '/placeholder-land.svg';
    return `http://localhost:5000/api/images/${imageHash}`;
  };

  const handleChatWithSeller = (land: Land) => {
    setSelectedLand(land);
    setShowChat(true);
  };

  const handleBuyNow = (land: Land) => {
    // Implement buy now functionality
    console.log('Buy now clicked for land:', land.assetId);
    // You can redirect to a purchase flow or show a modal
  };

  const handleLikeLand = async (land: Land) => {
    try {
      if (land._id) {
        await apiService.toggleLandLike(land._id);
        // Refresh the current tab data
        if (activeTab === 'browse') {
          loadMarketplaceLands();
        } else if (activeTab === 'liked') {
          loadLikedLands();
        }
      }
    } catch (error: any) {
      setError(error.message || 'Failed to update like status');
    }
  };

  const handleEditListing = (land: Land) => {
    setSelectedLandForEdit(land);
    setShowEditForm(true);
  };

  const handleRemoveListing = async (land: Land) => {
    if (window.confirm('Are you sure you want to remove this listing?')) {
      try {
        if (land._id) {
          await apiService.removeListing(land._id);
          loadMyListings(); // Refresh the list
        }
      } catch (error: any) {
        setError(error.message || 'Failed to remove listing');
      }
    }
  };

  const handleViewDetails = (land: Land) => {
    // Navigate to detailed view page
    if (land._id && onNavigateToLand) {
      onNavigateToLand(land._id);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          onClick={loadMarketplaceLands}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Land Marketplace</h1>
        <p className="text-gray-600">Discover verified lands for sale across India</p>
        
        {/* Tab Navigation */}
        <div className="mt-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('browse')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'browse'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Browse All
            </button>
            <button
              onClick={() => setActiveTab('my-ads')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'my-ads'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Ads
            </button>
            <button
              onClick={() => setActiveTab('liked')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'liked'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Liked Ads
            </button>
          </nav>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by location, survey number, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Filter className="w-5 h-5" />
            Filters
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Price (₹)</label>
                <input
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Price (₹)</label>
                <input
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="No limit"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                <input
                  type="text"
                  value={filters.district}
                  onChange={(e) => handleFilterChange('district', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Any district"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  value={filters.state}
                  onChange={(e) => handleFilterChange('state', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Any state"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Land Type</label>
                <select
                  value={filters.landType}
                  onChange={(e) => handleFilterChange('landType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="AGRICULTURAL">Agricultural</option>
                  <option value="RESIDENTIAL">Residential</option>
                  <option value="COMMERCIAL">Commercial</option>
                  <option value="INDUSTRIAL">Industrial</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Area (acres)</label>
                <input
                  type="number"
                  value={filters.minArea}
                  onChange={(e) => handleFilterChange('minArea', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Area (acres)</label>
                <input
                  type="number"
                  value={filters.maxArea}
                  onChange={(e) => handleFilterChange('maxArea', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="No limit"
                  step="0.1"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="mb-4">
        <p className="text-gray-600">
          Showing {filteredLands.length} of {
            activeTab === 'browse' ? lands.length :
            activeTab === 'my-ads' ? myListings.length :
            likedLands.length
          } {
            activeTab === 'browse' ? 'lands for sale' :
            activeTab === 'my-ads' ? 'your listings' :
            'liked lands'
          }
        </p>
      </div>

      {/* Land Cards Grid */}
      {filteredLands.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <MapPin className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No lands found</h3>
          <p className="text-gray-600">Try adjusting your search criteria or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLands.map((land) => (
            <LandCard
              key={land._id}
              land={land}
              activeTab={activeTab}
              onChat={() => handleChatWithSeller(land)}
              onBuy={() => handleBuyNow(land)}
              onLike={handleLikeLand}
              onEdit={() => handleEditListing(land)}
              onRemove={() => handleRemoveListing(land)}
              onViewDetails={() => handleViewDetails(land)}
              getImageUrl={getImageUrl}
              formatPrice={formatPrice}
              formatArea={formatArea}
            />
          ))}
        </div>
      )}

      {/* Chat Modal */}
      {showChat && selectedLand && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">
                Chat with {selectedLand.currentOwner?.fullName || 'Seller'}
              </h3>
              <button
                onClick={() => setShowChat(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <RealtimeChat 
                landId={selectedLand._id}
                recipientId={selectedLand.currentOwner?.id}
                recipientName={selectedLand.currentOwner?.fullName}
                onClose={() => setShowChat(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Listing Modal */}
      {showEditForm && selectedLandForEdit && (
        <EditLandListingForm
          land={selectedLandForEdit}
          onClose={() => {
            setShowEditForm(false);
            setSelectedLandForEdit(null);
          }}
          onSuccess={() => {
            setShowEditForm(false);
            setSelectedLandForEdit(null);
            // Refresh the listings
            if (activeTab === 'my-ads') {
              loadMyListings();
            } else {
              loadMarketplaceLands();
            }
          }}
        />
      )}
    </div>
  );
};

// Land Card Component
interface LandCardProps {
  land: Land;
  activeTab: 'browse' | 'my-ads' | 'liked';
  onChat: () => void;
  onBuy: () => void;
  onLike: (land: Land) => void;
  onEdit: (land: Land) => void;
  onRemove: (land: Land) => void;
  onViewDetails: (land: Land) => void;
  getImageUrl: (hash: string) => string;
  formatPrice: (price: number) => string;
  formatArea: (land: Land) => string;
}

const LandCard: React.FC<LandCardProps> = ({ 
  land, 
  activeTab,
  onChat, 
  onBuy, 
  onLike,
  onEdit,
  onRemove,
  onViewDetails,
  getImageUrl, 
  formatPrice, 
  formatArea 
}) => {
  const { auth } = useAuth();
  const [imageError, setImageError] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  const primaryImage = land.marketInfo?.images?.[0];
  const imageUrl = primaryImage ? getImageUrl(primaryImage) : '/placeholder-land.svg';

  const features = land.marketInfo?.features || [];
  const amenities = land.marketInfo?.nearbyAmenities || [];
  
  // Check if current user is the owner
  const isOwner = auth.user?.id === land?.currentOwner?.id || auth.user?.id === land?.currentOwner?._id;

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow duration-200 overflow-hidden cursor-pointer"
      onClick={() => onViewDetails(land)}
    >
      {/* Image */}
      <div className="relative h-48 bg-gray-200">
        {!imageError && primaryImage ? (
          <img
            src={imageUrl}
            alt={`${land.village}, ${land.district}`}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <Camera className="w-12 h-12 text-gray-400" />
          </div>
        )}
        
        {/* Favorite Button - only show in browse tab */}
        {activeTab === 'browse' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLike(land);
              setIsFavorited(!isFavorited);
            }}
            className="absolute top-3 right-3 p-2 bg-white bg-opacity-80 rounded-full hover:bg-opacity-100 transition-all"
          >
            <Heart 
              className={`w-5 h-5 ${isFavorited ? 'text-red-500 fill-red-500' : 'text-gray-600'}`} 
            />
          </button>
        )}

        {/* Price Badge */}
        {land.marketInfo?.askingPrice && (
          <div className="absolute bottom-3 left-3 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
            {formatPrice(land.marketInfo.askingPrice)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Location */}
        <div className="flex items-center gap-1 text-gray-600 mb-2">
          <MapPin className="w-4 h-4" />
          <span className="text-sm">
            {land.village}, {land.district}, {land.state}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
          {land.landType} Land - Survey No. {land.surveyNumber}
        </h3>

        {/* Area */}
        <p className="text-gray-600 text-sm mb-3">
          {formatArea(land)}
        </p>

        {/* Description */}
        {land.marketInfo?.description && (
          <p className="text-gray-700 text-sm mb-3 line-clamp-2">
            {land.marketInfo.description}
          </p>
        )}

        {/* Features */}
        {features.length > 0 && (
          <div className="mb-3">
            <ul className="text-xs text-gray-600 space-y-1">
              {features.slice(0, 3).map((feature, index) => (
                <li key={index} className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-500" />
                  {feature}
                </li>
              ))}
              {features.length > 3 && (
                <li className="text-gray-500">+{features.length - 3} more features</li>
              )}
            </ul>
          </div>
        )}

        {/* Amenities */}
        {amenities.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {amenities.slice(0, 3).map((amenity, index) => (
                <span 
                  key={index}
                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                >
                  {amenity}
                </span>
              ))}
              {amenities.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                  +{amenities.length - 3}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          {activeTab === 'my-ads' || isOwner ? (
            // Owner actions
            <>
              {land.status === "FOR_SALE" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(land);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-4 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
              )}
              {land.status === "FOR_SALE" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(land);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-4 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove
                </button>
              )}
            </>
          ) : (
            // Buyer actions - only show if user is not the owner
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onChat();
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Chat
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onBuy();
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                Buy Now
              </button>
            </>
          )}
        </div>

        {/* Additional Info */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>Listed {new Date(land.marketInfo?.listedDate || land.createdAt).toLocaleDateString()}</span>
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            Verified
          </span>
        </div>
      </div>
    </div>
  );
};

export default LandMarketplace;