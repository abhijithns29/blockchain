import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Eye, 
  Heart, 
  MessageCircle, 
  ShoppingCart,
  Camera,
  Star,
  User,
  Shield,
  Edit2,
  Trash2
} from 'lucide-react';
import { Land } from '../types';
import { useAuth } from '../hooks/useAuth';
import apiService from '../services/api';
import RealtimeChat from './RealtimeChat';
import EditLandListingForm from './EditLandListingForm';

interface LandDetailPageProps {
  landId: string;
  onBack?: (tab?: string, landId?: string, sellerId?: string) => void;
  onNavigateToChat?: (landId: string, sellerId: string, isFirstChat?: boolean) => void;
}

const LandDetailPage: React.FC<LandDetailPageProps> = ({ landId, onBack, onNavigateToChat }) => {
  const { auth } = useAuth();
  const [land, setLand] = useState<Land | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  useEffect(() => {
    loadLandDetails();
  }, [landId]);

  const loadLandDetails = async () => {
    try {
      setLoading(true);
      const response = await apiService.getLandDetails(landId);
      setLand(response.land);
    } catch (error: any) {
      setError(error.message || 'Failed to load land details');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!land || !land._id) return;
    
    try {
      await apiService.toggleLandLike(land._id);
      setIsLiked(!isLiked);
    } catch (error: any) {
      setError(error.message || 'Failed to update like status');
    }
  };

  const handleChat = () => {
    console.log('Chat button clicked');
    console.log('Land data:', land);
    console.log('Current owner:', land?.currentOwner);
    console.log('Owner ID:', land?.currentOwner?.id);
    console.log('Owner _id:', land?.currentOwner?._id);
    
    // Show chat modal instead of redirecting - use _id instead of id
    if (land && (land.currentOwner?.id || land.currentOwner?._id)) {
      console.log('Opening chat modal');
      setShowChatModal(true);
    } else {
      console.error('Cannot open chat - missing land or owner data');
    }
  };

  const handleBuyNow = () => {
    // Navigate to purchase flow
    console.log('Buy now clicked');
  };

  const handleEdit = () => {
    setShowEditForm(true);
  };

  const handleRemove = async () => {
    if (!land || !land._id) return;
    
    if (window.confirm('Are you sure you want to remove this listing?')) {
      try {
        await apiService.removeListing(land._id);
        // Navigate back to marketplace
        if (onBack) {
          onBack();
        }
      } catch (error: any) {
        setError(error.message || 'Failed to remove listing');
      }
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

  const getImageUrl = (imageHash: string) => {
    if (!imageHash) return '/placeholder-land.svg';
    return `http://localhost:5000/api/images/${imageHash}`;
  };

  const isOwner = auth.user?.id === land?.currentOwner?.id || auth.user?.id === land?.currentOwner?._id;
  
  // Debug logging
  console.log('Land detail page debug:', {
    authUserId: auth.user?.id,
    landOwnerId: land?.currentOwner?.id,
    landOwner_Id: land?.currentOwner?._id,
    isOwner,
    land: !!land,
    currentOwner: !!land?.currentOwner
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !land) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Land Not Found</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const images = land.marketInfo?.images || [];
  const currentImage = images[currentImageIndex];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Land Details</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Image Gallery */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            {/* Main Image */}
            <div className="relative h-96 bg-gray-200">
              {currentImage ? (
                <img
                  src={getImageUrl(currentImage)}
                  alt={`Land image ${currentImageIndex + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <Camera className="w-16 h-16 text-gray-400" />
                </div>
              )}

              {/* Image Navigation */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImageIndex(Math.max(0, currentImageIndex - 1))}
                    disabled={currentImageIndex === 0}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 disabled:opacity-30"
                  >
                    ←
                  </button>
                  <button
                    onClick={() => setCurrentImageIndex(Math.min(images.length - 1, currentImageIndex + 1))}
                    disabled={currentImageIndex === images.length - 1}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 disabled:opacity-30"
                  >
                    →
                  </button>
                </>
              )}

              {/* Image Counter */}
              {images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                  {currentImageIndex + 1} / {images.length}
                </div>
              )}
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="p-4">
                <div className="flex gap-2 overflow-x-auto">
                  {images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${
                        index === currentImageIndex ? 'border-blue-500' : 'border-gray-200'
                      }`}
                    >
                      <img
                        src={getImageUrl(image)}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Details Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <div className="bg-white rounded-lg shadow-sm border p-6">

            {isOwner ? (
              // Owner actions
              <div className="space-y-3">
                {land.status === "FOR_SALE" && (
                  <button
                    onClick={handleEdit}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <Edit2 className="w-5 h-5" />
                    Edit Listing
                  </button>
                )}
                {land.status === "FOR_SALE" && (
                  <button
                    onClick={handleRemove}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                    Remove Listing
                  </button>
                )}
              </div>
            ) : (
              // Buyer actions
              <div className="space-y-3">
                <button
                  onClick={handleChat}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  Chat with Seller
                </button>
                <button
                  onClick={handleBuyNow}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Buy Now
                </button>
                <button
                  onClick={handleLike}
                  className={`w-full flex items-center justify-center gap-2 py-3 px-4 border rounded-lg transition-colors ${
                    isLiked
                      ? 'border-red-600 text-red-600 bg-red-50'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                  {isLiked ? 'Liked' : 'Add to Favorites'}
                </button>
              </div>
            )}
          </div>

          {/* Owner Info */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Owner Information
            </h3>
            <div className="space-y-2">
              <p className="text-gray-900 font-medium">{land.currentOwner?.fullName}</p>
              <p className="text-gray-600 text-sm">{land.currentOwner?.email}</p>
              <div className="flex items-center gap-2 mt-3">
                <Shield className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600 font-medium">
                  {land.currentOwner?.verificationStatus === 'VERIFIED' ? 'Verified' : 'Unverified'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Survey Number</label>
                <p className="text-gray-900">{land.surveyNumber}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Land Type</label>
                <p className="text-gray-900">{land.landType}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Area</label>
                <p className="text-gray-900">{formatArea(land)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Asset ID</label>
                <p className="text-gray-900 font-mono text-sm">{land.assetId}</p>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Location
            </h3>
            <div className="space-y-2">
              <p className="text-gray-900">{land.village}</p>
              <p className="text-gray-900">{land.taluka}, {land.district}</p>
              <p className="text-gray-900">{land.state} - {land.pincode}</p>
            </div>
          </div>

          {/* Description */}
          {land.marketInfo?.description && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Description</h3>
              <p className="text-gray-700 leading-relaxed">{land.marketInfo.description}</p>
            </div>
          )}

          {/* Features */}
          {land.marketInfo?.features && land.marketInfo.features.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Star className="w-5 h-5" />
                Features
              </h3>
              <div className="flex flex-wrap gap-2">
                {land.marketInfo.features.map((feature, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Nearby Amenities */}
          {land.marketInfo?.nearbyAmenities && land.marketInfo.nearbyAmenities.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Nearby Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {land.marketInfo.nearbyAmenities.map((amenity, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Additional Info */}
        <div className="space-y-6">
          {/* Property Details */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Property Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Classification</span>
                <span className="text-gray-900">{land.classification || 'Not specified'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Sub Division</span>
                <span className="text-gray-900">{land.subDivision || 'Not specified'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status</span>
                <span className="text-gray-900">{land.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Verification</span>
                <span className="text-gray-900">{land.verificationStatus}</span>
              </div>
            </div>
          </div>

          {/* Listing Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Listing Information
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Listed Date</span>
                <span className="text-gray-900">
                  {land.marketInfo?.listedDate 
                    ? new Date(land.marketInfo.listedDate).toLocaleDateString()
                    : 'Not available'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Views</span>
                <span className="text-gray-900 flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {Math.floor(Math.random() * 100) + 10}
                </span>
              </div>
            </div>
          </div>

          {/* Virtual Tour */}
          {land.marketInfo?.virtualTourUrl && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Virtual Tour</h3>
              <a
                href={land.marketInfo?.virtualTourUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
              >
                <Eye className="w-4 h-4" />
                View Virtual Tour
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Chat Modal */}
      {console.log('Modal render check:', { showChatModal, land: !!land })}
      {showChatModal && land && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                Chat with {land.currentOwner?.fullName || 'Land Owner'}
              </h2>
              <button
                onClick={() => setShowChatModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <RealtimeChat
                landId={land._id || land.id}
                recipientId={land.currentOwner?.id || land.currentOwner?._id}
                recipientName={land.currentOwner?.fullName}
                onClose={() => setShowChatModal(false)}
                showHeader={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Listing Modal */}
      {showEditForm && land && (
        <EditLandListingForm
          land={land}
          onClose={() => setShowEditForm(false)}
          onSuccess={() => {
            setShowEditForm(false);
            // Refresh land details
            loadLandDetails();
          }}
        />
      )}
    </div>
  );
};

export default LandDetailPage;
