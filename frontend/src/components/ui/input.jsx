import React from 'react';

export const Input = ({ 
  className = '', 
  type = 'text',
  placeholder = '',
  value,
  onChange,
  disabled = false,
  variant = 'glass',
  error = false,
  success = false,
  ...props 
}) => {
  const baseClasses = 'w-full px-4 py-3 rounded-lg transition-all duration-300 focus:outline-none font-inherit';
  
  const variants = {
    glass: 'bg-glass border border-glass-border text-primary placeholder-text-muted focus:border-accent-purple focus:bg-purple-100 focus:shadow-lg focus:shadow-purple-200',
    solid: 'bg-secondary border border-border text-primary placeholder-text-muted focus:border-accent',
    minimal: 'bg-transparent border-b-2 border-border text-primary focus:border-accent rounded-none'
  };
  
  const stateClasses = error 
    ? 'form-field-error' 
    : success 
    ? 'form-field-success' 
    : '';
  
  const disabledClasses = disabled ? 'opacity-70 cursor-not-allowed' : '';
  
  return (
    <input
      type={type}
      className={`${baseClasses} ${variants[variant]} ${stateClasses} ${disabledClasses} ${className}`}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      {...props}
    />
  );
};

export const Label = ({ children, className = '', htmlFor }) => (
  <label htmlFor={htmlFor} className={`input-label ${className}`}>
    {children}
  </label>
);