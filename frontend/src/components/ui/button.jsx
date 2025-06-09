import React from 'react';

export const Button = ({ 
  children, 
  className = '', 
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  type = 'button',
  ...props 
}) => {
  const baseClasses = 'font-weight-700 border-radius-12 transition-all duration-300 focus:outline-none relative overflow-hidden';
  
  const variants = {
    primary: 'bg-gradient-to-r from-purple-500 via-blue-500 to-accent text-white hover:transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-purple-400',
    secondary: 'secondary-button hover:bg-accent hover:text-white',
    glass: 'bg-glass border border-glass-border text-white hover:bg-opacity-20 hover:transform hover:-translate-y-0.5 hover:shadow-lg',
    outline: 'border border-accent bg-transparent text-accent hover:bg-accent hover:text-white',
    ghost: 'text-secondary hover:bg-glass hover:text-primary'
  };
  
  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-6 py-4 text-lg'
  };
  
  const disabledClasses = disabled ? 'opacity-70 cursor-not-allowed transform-none shadow-none' : '';
  
  return (
    <button
      type={type}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${disabledClasses} ${className}`}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};