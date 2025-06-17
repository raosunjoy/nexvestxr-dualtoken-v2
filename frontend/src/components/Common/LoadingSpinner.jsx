import React from 'react';
import { useTranslation } from 'react-i18next';

const LoadingSpinner = ({ size = 'medium', text, className = '' }) => {
  const { t } = useTranslation();

  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
    xlarge: 'w-16 h-16'
  };

  const spinnerSize = sizeClasses[size] || sizeClasses.medium;

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* Spinner */}
      <div className="relative">
        <div className={`${spinnerSize} border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin`} />
        
        {/* UAE Colors Accent */}
        <div className={`absolute inset-0 ${spinnerSize} border-4 border-transparent border-r-red-600 rounded-full animate-pulse`} />
      </div>
      
      {/* Loading Text */}
      {text && (
        <p className="mt-4 text-sm text-gray-600 animate-pulse">
          {text}
        </p>
      )}
      
      {/* Default Loading Text */}
      {!text && (
        <p className="mt-4 text-sm text-gray-600 animate-pulse">
          {t('common.loading')}
        </p>
      )}
      
      {/* UAE Platform Branding */}
      <div className="mt-2 text-xs text-gray-400 flex items-center space-x-1">
        <span className="animate-pulse">🇦🇪</span>
        <span>PropXchange UAE</span>
      </div>
    </div>
  );
};

export default LoadingSpinner;