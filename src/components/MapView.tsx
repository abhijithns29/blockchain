import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { MapPin, Navigation } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapViewProps {
  lands: any[];
  center?: [number, number];
  zoom?: number;
  onLocationSelect?: (lat: number, lng: number) => void;
  showLocationPicker?: boolean;
  selectedLocation?: { latitude: number; longitude: number } | null;
}

const LocationPicker: React.FC<{ onLocationSelect: (lat: number, lng: number) => void }> = ({ onLocationSelect }) => {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const MapView: React.FC<MapViewProps> = ({ 
  lands, 
  center = [12.9716, 77.5946], // Bangalore coordinates as default
  zoom = 10,
  onLocationSelect,
  showLocationPicker = false,
  selectedLocation
}) => {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Get user's current location
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
          setLoading(false);
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLoading(false);
        },
        { timeout: 10000 }
      );
    }
  }, []);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUserLocation([lat, lng]);
          if (onLocationSelect) {
            onLocationSelect(lat, lng);
          }
          setLoading(false);
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLoading(false);
        }
      );
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(1)} Cr`;
    } else if (price >= 100000) {
      return `₹${(price / 100000).toFixed(1)} L`;
    } else {
      return `₹${price.toLocaleString()}`;
    }
  };

  const getMarkerIcon = (land: any) => {
    const color = land.marketInfo?.isForSale ? '#10B981' : '#6B7280';
    return new L.DivIcon({
      html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [20, 20],
      className: 'custom-marker'
    });
  };

  const mapCenter = userLocation || center;

  return (
    <div className="relative">
      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-[1000] space-y-2">
        <button
          onClick={getCurrentLocation}
          disabled={loading}
          className="bg-white shadow-lg rounded-lg p-2 hover:bg-gray-50 transition-colors disabled:opacity-50"
          title="Get current location"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          ) : (
            <Navigation className="h-5 w-5 text-gray-600" />
          )}
        </button>
      </div>

      {/* Map Container */}
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        style={{ height: '500px', width: '100%' }}
        className="rounded-lg shadow-sm border border-gray-200"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {showLocationPicker && onLocationSelect && (
          <LocationPicker onLocationSelect={onLocationSelect} />
        )}
        
        {/* User's current location */}
        {userLocation && (
          <Marker position={userLocation}>
            <Popup>
              <div className="text-center">
                <MapPin className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                <p className="font-medium">Your Location</p>
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Selected location for land addition */}
        {selectedLocation && (
          <Marker position={[selectedLocation.latitude, selectedLocation.longitude]}>
            <Popup>
              <div className="text-center">
                <MapPin className="h-4 w-4 text-green-600 mx-auto mb-1" />
                <p className="font-medium">Selected Location</p>
                <p className="text-sm text-gray-600">
                  {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Land markers */}
        {lands.filter(land => land.coordinates).map((land) => (
          <Marker
            key={land._id}
            position={[land.coordinates.latitude, land.coordinates.longitude]}
            icon={getMarkerIcon(land)}
          >
            <Popup maxWidth={300}>
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-gray-900">{land.village}, {land.district}</h3>
                  {land.marketInfo?.isForSale && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                      For Sale
                    </span>
                  )}
                </div>
                
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Asset ID:</strong> {land.assetId}</p>
                  <p><strong>Survey No:</strong> {land.surveyNumber}</p>
                  <p><strong>Area:</strong> {land.area.acres || 0} Acres</p>
                  <p><strong>Type:</strong> {land.landType}</p>
                  
                  {land.currentOwner && (
                    <p><strong>Owner:</strong> {land.currentOwner.fullName}</p>
                  )}
                  
                  {land.marketInfo?.askingPrice && (
                    <p className="text-green-600 font-semibold">
                      <strong>Price:</strong> {formatPrice(land.marketInfo.askingPrice)}
                    </p>
                  )}
                </div>
                
                {land.marketInfo?.description && (
                  <p className="text-sm text-gray-600 border-t pt-2">
                    {land.marketInfo.description.substring(0, 100)}
                    {land.marketInfo.description.length > 100 && '...'}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white shadow-lg rounded-lg p-3">
        <h4 className="font-medium text-gray-900 mb-2">Legend</h4>
        <div className="space-y-1 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span>For Sale</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gray-500 rounded-full mr-2"></div>
            <span>Not for Sale</span>
          </div>
          {userLocation && (
            <div className="flex items-center">
              <MapPin className="h-3 w-3 text-blue-600 mr-2" />
              <span>Your Location</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapView;