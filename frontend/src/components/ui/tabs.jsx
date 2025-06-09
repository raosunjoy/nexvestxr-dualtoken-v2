import React, { useState } from 'react';

export const Tabs = ({ children, defaultValue, className = '' }) => {
  const [activeTab, setActiveTab] = useState(defaultValue);
  
  return (
    <div className={`w-full ${className}`}>
      {React.Children.map(children, child =>
        React.cloneElement(child, { activeTab, setActiveTab })
      )}
    </div>
  );
};

export const TabsList = ({ children, activeTab, setActiveTab, className = '' }) => (
  <div className={`flex space-x-1 rounded-lg bg-gray-100 p-1 ${className}`}>
    {React.Children.map(children, child =>
      React.cloneElement(child, { activeTab, setActiveTab })
    )}
  </div>
);

export const TabsTrigger = ({ children, value, activeTab, setActiveTab, className = '' }) => (
  <button
    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
      activeTab === value
        ? 'bg-white text-gray-900 shadow-sm'
        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
    } ${className}`}
    onClick={() => setActiveTab(value)}
  >
    {children}
  </button>
);

export const TabsContent = ({ children, value, activeTab, className = '' }) => {
  if (activeTab !== value) return null;
  
  return (
    <div className={`mt-4 ${className}`}>
      {children}
    </div>
  );
};