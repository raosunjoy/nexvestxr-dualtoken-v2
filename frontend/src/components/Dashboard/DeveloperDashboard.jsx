import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SubscriptionPlans from '../Subscription/SubscriptionPlans';

const DeveloperDashboard = () => {
  const [properties, setProperties] = useState([]);
  const [userId, setUserId] = useState('mock-developer-id'); // Replace with actual user ID from auth context

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await axios.get('/api/property', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setProperties(response.data.properties || []);
    } catch (err) {
      console.error('Failed to fetch properties:', err);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Developer Dashboard</h1>
      <div className="mb-6">
        <h2 className="text-xl font-medium mb-2">Your Properties</h2>
        {properties.length === 0 ? (
          <p className="text-gray-500">No properties listed yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {properties.map((property) => (
              <div key={property.id} className="bg-white rounded-lg shadow-md p-4">
                <h3 className="text-lg font-semibold">{property.name}</h3>
                <p className="text-gray-600">Location: {property.location}</p>
                <p className="text-gray-600">Value: ₹{property.totalValue.toLocaleString()}</p>
                <p className="text-gray-600">Status: {property.status}</p>
                {property.fraudAnalysis && (
                  <p className={`text-sm ${property.fraudAnalysis.isAnomaly ? 'text-red-600' : 'text-green-600'}`}>
                    Fraud Analysis: {property.fraudAnalysis.isAnomaly ? 'Potential Fraud Detected' : 'No Issues Found'}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <SubscriptionPlans role="developer" userId={userId} />
    </div>
  );
};

export default DeveloperDashboard;