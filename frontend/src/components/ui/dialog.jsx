import React from 'react';

export const Dialog = ({ children, open, onOpenChange }) => {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => onOpenChange(false)} />
      <div className="relative bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
        {children}
      </div>
    </div>
  );
};

export const DialogContent = ({ children, className = '' }) => (
  <div className={`p-6 ${className}`}>
    {children}
  </div>
);

export const DialogHeader = ({ children, className = '' }) => (
  <div className={`border-b pb-4 mb-4 ${className}`}>
    {children}
  </div>
);

export const DialogTitle = ({ children, className = '' }) => (
  <h2 className={`text-lg font-semibold text-gray-900 ${className}`}>
    {children}
  </h2>
);

export const DialogDescription = ({ children, className = '' }) => (
  <p className={`text-sm text-gray-600 mt-2 ${className}`}>
    {children}
  </p>
);

export const DialogFooter = ({ children, className = '' }) => (
  <div className={`border-t pt-4 mt-4 flex justify-end space-x-2 ${className}`}>
    {children}
  </div>
);

export const DialogTrigger = ({ children, onClick }) => (
  <div onClick={onClick}>
    {children}
  </div>
);