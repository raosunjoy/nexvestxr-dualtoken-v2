import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Notification, { NotificationTypes, LoadingSpinner, ErrorBoundary } from './Notification';

const PropertyForm = () => {
  const [propertyData, setPropertyData] = useState({
    name: '',
    description: '',
    location: '',
    strengths: '',
    opportunities: '',
    yield: '',
    closureDate: '',
    images: null,
  });
  const [mintingStatus, setMintingStatus] = useState('');
  const [orgVerification, setOrgVerification] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isCheckingVerification, setIsCheckingVerification] = useState(true);

  const addNotification = (type, title, message) => {
    const id = Date.now();
    const notification = { id, type, title, message };
    setNotifications(prev => [...prev, notification]);
    return id;
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  useEffect(() => {
    const checkVerification = async () => {
      setIsCheckingVerification(true);
      try {
        const orgId = localStorage.getItem('orgId');
        if (!orgId) {
          addNotification(
            NotificationTypes.WARNING,
            'Organization Not Found',
            'No organization context found. Please contact Super Admin to set up your organization.'
          );
          setOrgVerification('missing');
          return;
        }

        const response = await api.getKYCStatus(orgId);
        const status = response.data;
        setOrgVerification(status);

        if (status !== 'approved') {
          addNotification(
            NotificationTypes.WARNING,
            'KYC Verification Required',
            `Organization KYC status is: ${status.toUpperCase()}. Properties can only be listed after KYC approval.`
          );
        }
      } catch (error) {
        console.error('Error checking verification:', error);
        addNotification(
          NotificationTypes.ERROR,
          'Verification Check Failed',
          'Unable to verify organization status. Please try refreshing the page.'
        );
        setOrgVerification('error');
      } finally {
        setIsCheckingVerification(false);
      }
    };
    checkVerification();
  }, []);

  const validateForm = () => {
    const errors = {};
    
    if (!propertyData.name.trim()) {
      errors.name = 'Property name is required';
    } else if (propertyData.name.length < 3) {
      errors.name = 'Property name must be at least 3 characters';
    }

    if (!propertyData.description.trim()) {
      errors.description = 'Property description is required';
    } else if (propertyData.description.length < 20) {
      errors.description = 'Description must be at least 20 characters';
    }

    if (!propertyData.location.trim()) {
      errors.location = 'Location is required';
    }

    if (propertyData.yield && (isNaN(propertyData.yield) || propertyData.yield < 0 || propertyData.yield > 100)) {
      errors.yield = 'Yield must be a number between 0 and 100';
    }

    if (propertyData.closureDate) {
      const closureDate = new Date(propertyData.closureDate);
      const today = new Date();
      if (closureDate <= today) {
        errors.closureDate = 'Closure date must be in the future';
      }
    }

    if (propertyData.images && propertyData.images.length > 0) {
      const invalidFiles = Array.from(propertyData.images).filter(file => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        return !allowedTypes.includes(file.type) || file.size > 5 * 1024 * 1024; // 5MB limit
      });
      
      if (invalidFiles.length > 0) {
        errors.images = 'Invalid file type or file too large (max 5MB). Only JPG, PNG allowed.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (orgVerification !== 'approved') {
      addNotification(
        NotificationTypes.ERROR,
        'Cannot List Property',
        'Organization verification is required before listing properties. Please contact Super Admin.'
      );
      return;
    }

    if (!validateForm()) {
      addNotification(
        NotificationTypes.ERROR,
        'Validation Error',
        'Please fix the errors below and try again.'
      );
      return;
    }

    setIsLoading(true);
    const loadingId = addNotification(
      NotificationTypes.LOADING,
      'Creating Property',
      'Uploading property details and processing...'
    );

    try {
      // Step 1: Create property
      const formData = new FormData();
      Object.entries(propertyData).forEach(([key, value]) => {
        if (key === 'images' && value) {
          Array.from(value).forEach((file) => formData.append('images', file));
        } else if (value) {
          formData.append(key, value);
        }
      });

      const response = await api.createProperty(formData);
      
      if (!response?.data?.id) {
        throw new Error('Invalid response from server: Missing property ID');
      }

      const propertyId = response.data.id;
      removeNotification(loadingId);

      addNotification(
        NotificationTypes.SUCCESS,
        'Property Created',
        `Property "${propertyData.name}" has been listed successfully!`
      );

      // Step 2: Token minting
      const tokenAmount = prompt('Enter number of tokens to mint (e.g., 1000):');
      if (tokenAmount && !isNaN(tokenAmount) && parseInt(tokenAmount) > 0) {
        const mintLoadingId = addNotification(
          NotificationTypes.LOADING,
          'Minting Tokens',
          'Creating property tokens on XRPL blockchain...'
        );

        setMintingStatus('Minting tokens on XRPL...');

        const mintResponse = await api.mintTokens(propertyId, parseInt(tokenAmount));
        
        if (!mintResponse?.data?.txHash) {
          throw new Error('Token minting failed: No transaction hash received');
        }

        const txHash = mintResponse.data.txHash;
        setMintingStatus(`Tokens minted! TX Hash: ${txHash}`);
        
        removeNotification(mintLoadingId);

        addNotification(
          NotificationTypes.SUCCESS,
          'Tokens Minted Successfully',
          `${tokenAmount} tokens created! Transaction Hash: ${txHash.substring(0, 10)}...`
        );

        // Reset form
        setPropertyData({
          name: '',
          description: '',
          location: '',
          strengths: '',
          opportunities: '',
          yield: '',
          closureDate: '',
          images: null,
        });
        setFieldErrors({});
      }

    } catch (error) {
      removeNotification(loadingId);
      
      let errorMessage = 'An unexpected error occurred. Please try again.';
      let errorTitle = 'Operation Failed';

      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 400) {
          errorMessage = data?.message || 'Invalid property data. Please check your inputs.';
          errorTitle = 'Validation Error';
        } else if (status === 403) {
          errorMessage = 'You do not have permission to perform this action.';
          errorTitle = 'Permission Denied';
        } else if (status === 413) {
          errorMessage = 'Files are too large. Please reduce file sizes and try again.';
          errorTitle = 'File Size Error';
        } else if (status >= 500) {
          errorMessage = 'Server error occurred. Please try again later or contact support.';
          errorTitle = 'Server Error';
        } else {
          errorMessage = data?.message || `Error ${status}: ${error.response.statusText}`;
        }
      } else if (error.request) {
        errorMessage = 'Network connection failed. Please check your internet connection.';
        errorTitle = 'Connection Error';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setMintingStatus('Operation failed. Please try again.');
      addNotification(NotificationTypes.ERROR, errorTitle, errorMessage);
      console.error('Property/minting error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Notifications */}
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000, maxWidth: '400px' }}>
        {notifications.map(notification => (
          <Notification
            key={notification.id}
            type={notification.type}
            title={notification.title}
            message={notification.message}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>

      <ErrorBoundary>
        <div className="glass-card fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ 
            fontSize: '28px', 
            fontWeight: '700', 
            marginBottom: '30px',
            background: 'var(--primary-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            🏢 List New Property
          </h2>
          
          {isCheckingVerification ? (
            <div style={{
              marginBottom: '30px',
              padding: '20px',
              borderRadius: '12px',
              background: 'rgba(139, 69, 255, 0.1)',
              border: '1px solid var(--accent-purple)',
              display: 'flex',
              alignItems: 'center',
              gap: '15px'
            }}>
              <LoadingSpinner size="medium" />
              <span style={{ color: 'var(--accent-purple)', fontWeight: '500' }}>
                Checking organization verification status...
              </span>
            </div>
          ) : orgVerification && (
            <div style={{
              marginBottom: '30px',
              padding: '15px',
              borderRadius: '12px',
              background: orgVerification === 'approved' 
                ? 'rgba(6, 214, 160, 0.1)' 
                : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${orgVerification === 'approved' ? 'var(--accent-green)' : 'var(--accent-red)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '20px' }}>
                {orgVerification === 'approved' ? '✅' : '❌'}
              </span>
              <span style={{ 
                fontWeight: '600',
                color: orgVerification === 'approved' ? 'var(--accent-green)' : 'var(--accent-red)'
              }}>
                Organization Status: {orgVerification.charAt(0).toUpperCase() + orgVerification.slice(1)}
              </span>
            </div>
          )}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '25px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontSize: '14px', 
              color: 'var(--text-secondary)',
              fontWeight: '500'
            }}>
              Property Name
            </label>
            <input
              type="text"
              value={propertyData.name}
              onChange={(e) => {
                setPropertyData({ ...propertyData, name: e.target.value });
                if (fieldErrors.name) {
                  setFieldErrors(prev => ({ ...prev, name: null }));
                }
              }}
              placeholder="e.g., Downtown Condo"
              className={fieldErrors.name ? 'form-field-error' : ''}
              disabled={isLoading || orgVerification !== 'approved'}
              required
            />
            {fieldErrors.name && (
              <div className="validation-message validation-error">
                <span>❌</span>
                {fieldErrors.name}
              </div>
            )}
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontSize: '14px', 
              color: 'var(--text-secondary)',
              fontWeight: '500'
            }}>
              Location
            </label>
            <input
              type="text"
              value={propertyData.location}
              onChange={(e) => setPropertyData({ ...propertyData, location: e.target.value })}
              placeholder="City, State, Country"
              required
            />
          </div>
        </div>

        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontSize: '14px', 
            color: 'var(--text-secondary)',
            fontWeight: '500'
          }}>
            Description
          </label>
          <textarea
            value={propertyData.description}
            onChange={(e) => setPropertyData({ ...propertyData, description: e.target.value })}
            placeholder="Detailed description of the property..."
            rows="4"
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontSize: '14px', 
              color: 'var(--text-secondary)',
              fontWeight: '500'
            }}>
              Strengths
            </label>
            <textarea
              value={propertyData.strengths}
              onChange={(e) => setPropertyData({ ...propertyData, strengths: e.target.value })}
              placeholder="Key strengths and advantages..."
              rows="3"
            />
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontSize: '14px', 
              color: 'var(--text-secondary)',
              fontWeight: '500'
            }}>
              Opportunities
            </label>
            <textarea
              value={propertyData.opportunities}
              onChange={(e) => setPropertyData({ ...propertyData, opportunities: e.target.value })}
              placeholder="Growth opportunities..."
              rows="3"
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontSize: '14px', 
              color: 'var(--text-secondary)',
              fontWeight: '500'
            }}>
              Expected Yield (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={propertyData.yield}
              onChange={(e) => setPropertyData({ ...propertyData, yield: e.target.value })}
              placeholder="8.5"
            />
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontSize: '14px', 
              color: 'var(--text-secondary)',
              fontWeight: '500'
            }}>
              Closure Date
            </label>
            <input
              type="date"
              value={propertyData.closureDate}
              onChange={(e) => setPropertyData({ ...propertyData, closureDate: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontSize: '14px', 
            color: 'var(--text-secondary)',
            fontWeight: '500'
          }}>
            Property Images
          </label>
          <input
            type="file"
            multiple
            onChange={(e) => setPropertyData({ ...propertyData, images: e.target.files })}
            accept="image/*"
            style={{
              padding: '12px',
              border: '2px dashed var(--glass-border)',
              borderRadius: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.02)'
            }}
          />
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '5px' }}>
            Upload property photos, floor plans, etc.
          </div>
        </div>

        <button
          type="submit"
          style={{
            padding: '18px',
            fontSize: '16px',
            fontWeight: '700',
            marginTop: '20px',
            background: 'linear-gradient(135deg, var(--accent-green) 0%, var(--accent-blue) 100%)',
            borderRadius: '12px',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          🚀 Submit Property & Mint Tokens
        </button>

        {mintingStatus && (
          <div style={{
            marginTop: '20px',
            padding: '20px',
            borderRadius: '12px',
            background: mintingStatus.includes('failed') 
              ? 'rgba(239, 68, 68, 0.1)' 
              : 'rgba(6, 214, 160, 0.1)',
            border: `1px solid ${mintingStatus.includes('failed') ? 'var(--accent-red)' : 'var(--accent-green)'}`,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '20px', marginBottom: '8px' }}>
              {mintingStatus.includes('failed') ? '❌' : '⚡'}
            </div>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: '600',
              color: mintingStatus.includes('failed') ? 'var(--accent-red)' : 'var(--accent-green)'
            }}>
              {mintingStatus}
            </div>
          </div>
        )}
      </form>
        </div>
      </ErrorBoundary>
    </>
  );
};

export default PropertyForm;