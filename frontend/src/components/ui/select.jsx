import React from 'react';

export const Select = ({ children, className = '', ...props }) => (
  <div className={`relative ${className}`}>
    <select
      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
      {...props}
    >
      {children}
    </select>
  </div>
);

export const SelectContent = ({ children }) => children;

export const SelectItem = ({ children, value, ...props }) => (
  <option value={value} {...props}>
    {children}
  </option>
);

export const SelectTrigger = ({ children, className = '' }) => (
  <div className={className}>
    {children}
  </div>
);

export const SelectValue = ({ placeholder }) => (
  <option value="" disabled>
    {placeholder}
  </option>
);