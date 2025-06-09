import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Notification, { NotificationTypes, LoadingSpinner, ErrorBoundary } from './Notification';

const PropertyOwnerDashboard = () => {
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [progressData, setProgressData] = useState({ status: '', updates: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(true);

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
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    setIsLoadingProperties(true);
    try {
      const response = await api.get('/api/properties');
      const userId = localStorage.getItem('userId');
      const userProperties = response.data.filter(p => p.ownerId === userId);
      setProperties(userProperties);
      
      if (userProperties.length === 0) {
        addNotification(
          NotificationTypes.INFO,
          'No Properties Found',
          'You don\'t have any properties listed yet. Contact your admin to list properties.'
        );
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
      addNotification(
        NotificationTypes.ERROR,
        'Failed to Load Properties',
        'Unable to fetch your properties. Please try refreshing the page.'
      );
    } finally {
      setIsLoadingProperties(false);
    }
  };

  const fetchProgress = async (propertyId) => {
    if (!propertyId) return;
    
    setIsLoading(true);
    try {
      const response = await api.getPropertyProgress(propertyId);
      const blockchainProgress = await api.get(`/api/properties/${propertyId}/progress`);
      setSelectedProperty({ ...response.data, ...blockchainProgress.data });
    } catch (error) {
      console.error('Error fetching progress:', error);
      addNotification(
        NotificationTypes.ERROR,
        'Failed to Load Progress',
        'Unable to fetch property progress. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProgress = async (e) => {
    e.preventDefault();
    
    if (!progressData.status.trim() || !progressData.updates.trim()) {
      addNotification(
        NotificationTypes.ERROR,
        'Validation Error',
        'Both status and updates are required.'
      );
      return;
    }

    setIsLoading(true);
    const loadingId = addNotification(
      NotificationTypes.LOADING,
      'Updating Progress',
      'Saving progress to database and blockchain...'
    );

    try {
      await api.updatePropertyProgress(selectedProperty.id, progressData);
      await api.post(`/api/properties/${selectedProperty.id}/progress-update`, progressData);
      
      removeNotification(loadingId);
      addNotification(
        NotificationTypes.SUCCESS,
        'Progress Updated',
        'Property progress has been updated successfully and synced to blockchain.'
      );
      
      fetchProgress(selectedProperty.id);
      setProgressData({ status: '', updates: '' });
    } catch (error) {
      removeNotification(loadingId);
      console.error('Error updating progress:', error);
      
      let errorMessage = 'Failed to update progress. Please try again.';
      if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to update this property.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      addNotification(
        NotificationTypes.ERROR,
        'Update Failed',
        errorMessage
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#0a0a1a', color: '#FFFFFF', padding: '20px' }}>
      <h2>Property Owner Dashboard</h2>
      <select
        onChange={(e) => fetchProgress(e.target.value)}
        style={{ backgroundColor: '#1a1a2e', color: '#FFFFFF', margin: '10px', padding: '10px', borderRadius: '12px' }}
      >
        <option value="">Select Property</option>
        {properties.map((prop) => (
          <option key={prop.id} value={prop.id}>{prop.name}</option>
        ))}
      </select>
      {selectedProperty && (
        <div>
          <h3>{selectedProperty.name} Progress</h3>
          <p>Status: {selectedProperty.status}</p>
          <p>Updates: {selectedProperty.updates}</p>
          <p>Token Status: {selectedProperty.tokenSupply || 'N/A'} tokens</p>
          <form onSubmit={handleUpdateProgress}>
            <input
              type="text"
              value={progressData.status}
              onChange={(e) => setProgressData({ ...progressData, status: e.target.value })}
              placeholder="Status"
              style={{ backgroundColor: '#1a1a2e', color: '#FFFFFF', margin: '10px', padding: '10px', borderRadius: '12px' }}
            />
            <textarea
              value={progressData.updates}
              onChange={(e) => setProgressData({ ...progressData, updates: e.target.value })}
              placeholder="Updates"
              style={{ backgroundColor: '#1a1a2e', color: '#FFFFFF', margin: '10px', padding: '10px', borderRadius: '12px' }}
            />
            <button
              type="submit"
              style={{ backgroundColor: '#06d6a0', color: '#FFFFFF', padding: '10px 20px', border: 'none', borderRadius: '12px', cursor: 'pointer' }}
            >
              Update Progress
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default PropertyOwnerDashboard;