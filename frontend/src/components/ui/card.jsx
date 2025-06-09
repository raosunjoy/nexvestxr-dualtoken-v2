import React from 'react';

export const Card = ({ children, className = '', variant = 'glass' }) => {
  const variants = {
    glass: 'glass-card',
    solid: 'card',
    premium: 'glass-card premium-card'
  };
  
  return (
    <div className={`${variants[variant]} ${className}`}>
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = '' }) => (
  <div className={`border-b border-glass-border pb-4 mb-4 ${className}`}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = '' }) => (
  <h3 className={`text-lg font-semibold text-primary ${className}`}>
    {children}
  </h3>
);

export const CardContent = ({ children, className = '' }) => (
  <div className={className}>
    {children}
  </div>
);

export const CardFooter = ({ children, className = '' }) => (
  <div className={`border-t border-glass-border pt-4 mt-4 ${className}`}>
    {children}
  </div>
);