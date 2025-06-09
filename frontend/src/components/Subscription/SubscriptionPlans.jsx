import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CheckCircle, Star, Briefcase } from 'lucide-react';

const SubscriptionPlans = ({ role, userId }) => {
  const [plans, setPlans] = useState({});
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPlans();
    fetchCurrentPlan();
  }, [role, userId]);

  const fetchPlans = async () => {
    try {
      const response = await axios.get(`/api/subscription/plans/${role}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPlans(response.data.plans);
    } catch (err) {
      setError('Failed to fetch subscription plans');
    }
  };

  const fetchCurrentPlan = async () => {
    try {
      const response = await axios.get(`/api/subscription/my-subscription/${role}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setCurrentPlan(response.data.subscription);
    } catch (err) {
      console.error('Failed to fetch current plan:', err);
    }
  };

  const handleSubscribe = async (plan) => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.post('/api/subscription/subscribe', { role, plan }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.success) {
        fetchCurrentPlan();
      }
    } catch (err) {
      setError('Subscription failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return <div className="text-center text-red-600">{error}</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Subscription Plans ({role === 'developer' ? 'Developer' : 'Investor'})</h2>
      {currentPlan && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            Current Plan: <span className="font-medium">{currentPlan.planDetails.name}</span> ({currentPlan.status})
            {currentPlan.trialEndDate && (
              <span> - Trial ends on {new Date(currentPlan.trialEndDate).toLocaleDateString()}</span>
            )}
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(plans).map(([planKey, plan]) => (
          <div key={planKey} className="border rounded-lg p-4 flex flex-col">
            <div className="flex items-center mb-2">
              {planKey === 'free' || planKey === 'basic' ? (
                <CheckCircle className="h-5 w-5 text-gray-500 mr-2" />
              ) : planKey === 'premium' || planKey === 'pro' ? (
                <Star className="h-5 w-5 text-yellow-500 mr-2" />
              ) : (
                <Briefcase className="h-5 w-5 text-blue-500 mr-2" />
              )}
              <h3 className="text-lg font-medium">{plan.name}</h3>
            </div>
            <p className="text-2xl font-bold mb-2">{plan.price === 0 ? 'Free' : `₹${plan.price.toLocaleString()}/month`}</p>
            <ul className="flex-1 space-y-1 mb-4">
              {plan.features.map((feature, index) => (
                <li key={index} className="text-sm text-gray-600 flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  {feature}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleSubscribe(planKey)}
              disabled={loading || (currentPlan && currentPlan.plan === planKey && currentPlan.status === 'active')}
              className="py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Subscribing...' : currentPlan && currentPlan.plan === planKey && currentPlan.status === 'active' ? 'Current Plan' : 'Subscribe'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubscriptionPlans;