// AldarPropertyCard.jsx
// Aldar Properties themed property card component
import React from 'react';
import { Building2, MapPin, TrendingUp, Star } from 'lucide-react';
import '../styles/aldar-theme.css';

const AldarPropertyCard = ({ 
  property,
  onClick,
  className = '',
  showBadge = true,
  badgeType = 'tier1'
}) => {
  const {
    id,
    name,
    location,
    price,
    priceAED,
    imageUrl,
    developer = 'Aldar Properties',
    tier = 'TIER 1',
    returnRate,
    propertyType,
    availability = 'Available',
    investmentMin,
    totalUnits,
    soldUnits
  } = property;

  const getBadgeStyle = (type) => {
    switch (type) {
      case 'tier1':
        return 'bg-aldar-blue text-aldar-white';
      case 'hot':
        return 'bg-aldar-orange text-aldar-white';
      case 'premium':
        return 'bg-aldar-purple text-aldar-white';
      case 'available':
        return 'bg-aldar-green text-aldar-white';
      default:
        return 'bg-aldar-gray-600 text-aldar-white';
    }
  };

  const formatPrice = (price) => {
    if (price >= 1000000) {
      return `AED ${(price / 1000000).toFixed(1)}M`;
    }
    return `AED ${price.toLocaleString()}`;
  };

  const completionPercentage = totalUnits ? Math.round((soldUnits / totalUnits) * 100) : 0;

  return (
    <div 
      className={`aldar-property-card cursor-pointer transition-all duration-300 hover:shadow-xl ${className}`}
      onClick={() => onClick && onClick(property)}
    >
      {/* Property Image */}
      <div className="relative h-48 bg-gradient-to-br from-aldar-gray-100 to-aldar-gray-200 rounded-t-lg overflow-hidden">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 size={48} className="text-aldar-gray-400" />
          </div>
        )}
        
        {/* Aldar Badge */}
        {showBadge && (
          <div className={`absolute top-3 right-3 px-3 py-1 rounded-lg text-xs font-medium ${getBadgeStyle(badgeType)}`}>
            {tier}
          </div>
        )}

        {/* Completion Progress */}
        {totalUnits && (
          <div className="absolute bottom-3 left-3 right-3">
            <div className="bg-black bg-opacity-60 backdrop-blur-sm rounded-lg p-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-white text-xs font-medium">Funding Progress</span>
                <span className="text-white text-xs">{completionPercentage}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-1.5">
                <div 
                  className="bg-aldar-green h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${completionPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Property Details */}
      <div className="p-6">
        {/* Developer & Property Type */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-aldar-blue uppercase tracking-wide">
            {developer}
          </span>
          <span className="text-xs text-aldar-gray-500 capitalize">
            {propertyType}
          </span>
        </div>

        {/* Property Name */}
        <h3 className="aldar-heading-sm mb-2 line-clamp-2">
          {name}
        </h3>

        {/* Location */}
        <div className="flex items-center mb-4 text-aldar-gray-600">
          <MapPin size={14} className="mr-2 flex-shrink-0" />
          <span className="aldar-body-sm truncate">{location}</span>
        </div>

        {/* Price & Returns */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="aldar-property-price">
              {formatPrice(priceAED || price)}
            </div>
            {investmentMin && (
              <div className="text-xs text-aldar-gray-500">
                Min: {formatPrice(investmentMin)}
              </div>
            )}
          </div>
          {returnRate && (
            <div className="text-right">
              <div className="flex items-center text-aldar-green">
                <TrendingUp size={14} className="mr-1" />
                <span className="font-semibold">{returnRate}%</span>
              </div>
              <div className="text-xs text-aldar-gray-500">Annual Return</div>
            </div>
          )}
        </div>

        {/* Availability Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`w-2 h-2 rounded-full mr-2 ${
              availability === 'Available' ? 'bg-aldar-green' :
              availability === 'Limited' ? 'bg-aldar-orange' :
              'bg-aldar-gray-400'
            }`}></div>
            <span className="text-sm text-aldar-gray-600">{availability}</span>
          </div>
          
          {/* Star Rating */}
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star 
                key={star} 
                size={14} 
                className={`${star <= 4 ? 'text-aldar-orange fill-current' : 'text-aldar-gray-300'}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="px-6 pb-6">
        <button className="btn-aldar-primary w-full">
          View Details
        </button>
      </div>
    </div>
  );
};

// Sample Aldar Properties Data
export const sampleAldarProperties = [
  {
    id: 1,
    name: "Saadiyat Island Villa Collection",
    location: "Saadiyat Island, Abu Dhabi",
    price: 2400000,
    priceAED: 2400000,
    developer: "Aldar Properties",
    tier: "TIER 1",
    returnRate: 12.5,
    propertyType: "villa",
    availability: "Available",
    investmentMin: 100000,
    totalUnits: 200,
    soldUnits: 156,
    imageUrl: null
  },
  {
    id: 2,
    name: "Al Reem Island Tower",
    location: "Al Reem Island, Abu Dhabi",
    price: 890000,
    priceAED: 890000,
    developer: "Aldar Properties",
    tier: "TIER 1",
    returnRate: 10.8,
    propertyType: "apartment",
    availability: "Available",
    investmentMin: 50000,
    totalUnits: 300,
    soldUnits: 234,
    imageUrl: null
  },
  {
    id: 3,
    name: "Yas Island Resort Residences",
    location: "Yas Island, Abu Dhabi",
    price: 1800000,
    priceAED: 1800000,
    developer: "Aldar Properties",
    tier: "HOT",
    returnRate: 15.2,
    propertyType: "resort",
    availability: "Limited",
    investmentMin: 75000,
    totalUnits: 150,
    soldUnits: 142,
    imageUrl: null
  },
  {
    id: 4,
    name: "Corniche Waterfront Apartments",
    location: "Corniche, Abu Dhabi",
    price: 3200000,
    priceAED: 3200000,
    developer: "Aldar Properties",
    tier: "PREMIUM",
    returnRate: 14.7,
    propertyType: "luxury apartment",
    availability: "Available",
    investmentMin: 150000,
    totalUnits: 100,
    soldUnits: 67,
    imageUrl: null
  },
  {
    id: 5,
    name: "Al Maryah Island Commercial Tower",
    location: "Al Maryah Island, Abu Dhabi",
    price: 5600000,
    priceAED: 5600000,
    developer: "Aldar Properties",
    tier: "TIER 1",
    returnRate: 16.3,
    propertyType: "commercial",
    availability: "Available",
    investmentMin: 250000,
    totalUnits: 80,
    soldUnits: 45,
    imageUrl: null
  }
];

export default AldarPropertyCard;