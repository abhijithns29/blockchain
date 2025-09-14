import React from 'react';
import { MapPin, Home, DollarSign, Calendar, CheckCircle, Clock } from 'lucide-react';
import { Property } from '../types';

interface PropertyCardProps {
  property: Property;
  onClick?: () => void;
  showOwner?: boolean;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ 
  property, 
  onClick, 
  showOwner = true 
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-green-100 text-green-800';
      case 'FOR_SALE':
        return 'bg-blue-100 text-blue-800';
      case 'FOR_RENT':
        return 'bg-yellow-100 text-yellow-800';
      case 'SOLD':
        return 'bg-gray-100 text-gray-800';
      case 'RENTED':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace('_', ' ');
  };

  return (
    <div
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 border border-gray-200 overflow-hidden cursor-pointer"
      onClick={onClick}
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {property.title}
            </h3>
            <div className="flex items-center text-gray-600 mb-2">
              <MapPin className="h-4 w-4 mr-1" />
              <span className="text-sm">
                {property.location.address}, {property.location.city}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {property.isVerified && (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(property.status)}`}>
              {formatStatus(property.status)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center text-gray-600">
            <Home className="h-4 w-4 mr-2" />
            <span className="text-sm">{property.size.toLocaleString()} sq ft</span>
          </div>
          <div className="flex items-center text-gray-600">
            <DollarSign className="h-4 w-4 mr-2" />
            <span className="text-sm">${property.valuation.toLocaleString()}</span>
          </div>
        </div>

        {showOwner && (
          <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
            <span>Owner: {property.owner.fullName}</span>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              {new Date(property.registrationDate).toLocaleDateString()}
            </div>
          </div>
        )}

        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {property.description}
        </p>

        {property.metadata.propertyType && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {property.metadata.propertyType}
            </span>
            <span className="text-sm text-gray-500">
              ID: #{property.blockchainId}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyCard;