import React, { useEffect, useState } from "react";
import { Search, Filter, MapPin, Eye, Plus, CheckCircle } from 'lucide-react';

const Marketplace = () => {
  const [lands, setLands] = useState([]);
  const [selectedLandView, setSelectedLandView] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    isForSale: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(""); // <-- Add error state

  useEffect(() => {
    setLoading(true);
    // ✅ Use full backend URL for fetch, or configure Vite proxy
    fetch("http://localhost:5000/api/lands/marketplace")
      .then(async (r) => {
        const contentType = r.headers.get("content-type");
        if (!r.ok) {
          throw new Error("Network response was not ok");
        }
        if (!contentType || !contentType.includes("application/json")) {
          const text = await r.text();
          throw new Error("Server did not return JSON. Response: " + text.slice(0, 100));
        }
        return r.json();
      })
      .then((data) => {
        setLands(data.lands ? data.lands : data);
        setLoading(false);
        setError("");
      })
      .catch((e) => {
        console.error("marketplace fetch error", e);
        setError("Failed to load marketplace data. " + e.message);
        setLoading(false);
      });
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const filteredLands = lands.filter(land => {
    const matchesSearch = !searchTerm || 
      land.surveyNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      land.village.toLowerCase().includes(searchTerm.toLowerCase()) ||
      land.district.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !filters.status || land.status === filters.status;
    const matchesForSale = !filters.isForSale || 
      (filters.isForSale === 'true' ? land.marketInfo?.isForSale : !land.marketInfo?.isForSale);

    return matchesSearch && matchesStatus && matchesForSale;
  });

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatArea = (area) => {
    if (typeof area === 'object') {
      return `${area.acres || 0} Acres, ${area.guntas || 0} Guntas`;
    }
    return area || 'N/A';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "AVAILABLE":
        return "bg-green-100 text-green-800";
      case "FOR_SALE":
        return "bg-blue-100 text-blue-800";
      case "UNDER_TRANSACTION":
        return "bg-yellow-100 text-yellow-800";
      case "SOLD":
        return "bg-gray-100 text-gray-800";
      case "DISPUTED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getVerificationColor = (status) => {
    switch (status) {
      case "VERIFIED":
        return "bg-green-100 text-green-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
          <p className="mt-1 text-sm text-gray-500">
            Explore lands available for sale
          </p>
        </div>
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
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="AVAILABLE">Available</option>
              <option value="FOR_SALE">For Sale</option>
              <option value="UNDER_TRANSACTION">Under Transaction</option>
              <option value="SOLD">Sold</option>
              <option value="DISPUTED">Disputed</option>
            </select>
            <select
              value={filters.isForSale}
              onChange={(e) => handleFilterChange('isForSale', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Listings</option>
              <option value="true">Listed for Sale</option>
              <option value="false">Not Listed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Showing {filteredLands.length} of {lands.length} lands
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
            You don't own any lands yet. Claim ownership from the Land Database.
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
                  <div className="flex flex-col gap-1">
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(land.status)}`}>
                      {land.status.replace('_', ' ')}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${getVerificationColor(land.verificationStatus)}`}>
                      {land.verificationStatus}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Area:</span>
                    <span className="font-medium">
                      {/* Fix: Render area object properties as a readable string */}
                      {land.size
                        ? `${land.size.acres || 0} acres, ${land.size.guntas || 0} guntas, ${land.size.sqft || 0} sqft`
                        : formatArea(land.area)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium">{land.landType}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Asset ID:</span>
                    <span className="font-medium">{land.assetId}</span>
                  </div>
                  {land.marketInfo?.askingPrice && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Asking Price:</span>
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
                    onClick={() => {
                      console.log("Land Details:", land);
                      console.log("Market Info:", land.marketInfo);
                      console.log("Images:", land.marketInfo?.images);
                      console.log("Features:", land.marketInfo?.features);
                      console.log("Amenities:", land.marketInfo?.nearbyAmenities);
                      setSelectedLandView(land);
                    }}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Details
                  </button>
                  
                  {!land.marketInfo?.isForSale && auth.user?.role === "USER" && (
                    <button
                      onClick={() => handleListForSale(land)}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      List for Sale
                    </button>
                  )}
                </div>

                {land.digitalDocument?.isDigitalized && (
                  <div className="mt-3 flex items-center justify-center">
                    <a
                      href={`http://localhost:5000/api/lands/${land._id || land.id}/certificate`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Download Digital Certificate
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Details Modal */}
      {selectedLandView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Land Details
              </h2>
              <button
                onClick={() => setSelectedLandView(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p><strong>Survey Number:</strong> {selectedLandView.surveyNumber}</p>
            <p><strong>Village:</strong> {selectedLandView.village}</p>
            <p><strong>District:</strong> {selectedLandView.district}</p>
            <p><strong>Area:</strong> {selectedLandView.size
                ? `${selectedLandView.size.acres || 0} acres, ${selectedLandView.size.guntas || 0} guntas, ${selectedLandView.size.sqft || 0} sqft`
                : formatArea(selectedLandView.area)}</p>
            <p><strong>Type:</strong> {selectedLandView.landType}</p>
            <p><strong>Status:</strong> {selectedLandView.status}</p>
            {selectedLandView.marketInfo && (
              <div className="mt-3">
                <p><strong>Asking Price:</strong> {selectedLandView.marketInfo.askingPrice ?? "N/A"}</p>
                <p><strong>Description:</strong> {selectedLandView.marketInfo.description ?? "No description"}</p>
                <div>
                  <strong>Features:</strong>
                  {selectedLandView.marketInfo.features?.length > 0 ? (
                    <ul className="list-disc ml-5">
                      {selectedLandView.marketInfo.features.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  ) : (
                    <span className="ml-2 text-gray-500">None</span>
                  )}
                </div>
                <div>
                  <strong>Nearby Amenities:</strong>
                  {selectedLandView.marketInfo.nearbyAmenities?.length > 0 ? (
                    <ul className="list-disc ml-5">
                      {selectedLandView.marketInfo.nearbyAmenities.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                  ) : (
                    <span className="ml-2 text-gray-500">None</span>
                  )}
                </div>
                <div className="mt-3">
                  <strong>Images:</strong>
                  {selectedLandView.marketInfo.images?.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {selectedLandView.marketInfo.images.map((img, i) => (
                        <img
                          key={i}
                          src={img}
                          alt={`Land ${i}`}
                          className="w-full h-32 object-cover rounded-md"
                        />
                      ))}
                    </div>
                  ) : (
                    <span className="ml-2 text-gray-500">None</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Marketplace;