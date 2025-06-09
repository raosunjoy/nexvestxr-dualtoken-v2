import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, PieChart as PieChartIcon } from 'lucide-react';

const AnalyticsDashboard = ({ userId }) => {
  const [portfolioData, setPortfolioData] = useState(null);
  const [roiData, setRoiData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalyticsData();
  }, [userId]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      // Mock API calls for beta
      const portfolioResponse = await axios.get(`/api/portfolio/${userId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      // Mock ROI data (in production, fetch historical performance)
      const mockRoiData = [
        { month: 'Jan', roi: 5.2 },
        { month: 'Feb', roi: 4.8 },
        { month: 'Mar', roi: 6.1 },
        { month: 'Apr', roi: 5.5 },
        { month: 'May', roi: 7.0 },
        { month: 'Jun', roi: 6.3 },
      ];

      setPortfolioData(portfolioResponse.data.data);
      setRoiData(mockRoiData);
    } catch (err) {
      setError('Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center text-gray-600">Loading analytics...</div>;
  }

  if (error) {
    return <div className="text-center text-red-600">{error}</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <PieChartIcon className="h-5 w-5 mr-2" />
        Portfolio Analytics
      </h2>
      {portfolioData && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Total Value</span>
                <DollarSign className="h-5 w-5 text-gray-500" />
              </div>
              <p className="text-lg font-bold mt-2">{portfolioData.totalValue?.toFixed(2) || '0.00'} XRP</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Average ROI</span>
                <TrendingUp className="h-5 w-5 text-gray-500" />
              </div>
              <p className="text-lg font-bold mt-2">{roiData.length > 0 ? (roiData.reduce((sum, d) => sum + d.roi, 0) / roiData.length).toFixed(2) : '0.00'}%</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Asset Count</span>
                <PieChartIcon className="h-5 w-5 text-gray-500" />
              </div>
              <p className="text-lg font-bold mt-2">{portfolioData.tokenBalances?.length || 0}</p>
            </div>
          </div>

          {/* ROI Trend Chart */}
          <div>
            <h3 className="text-sm font-medium mb-2">Monthly ROI Trend (%)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roiData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="roi" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;