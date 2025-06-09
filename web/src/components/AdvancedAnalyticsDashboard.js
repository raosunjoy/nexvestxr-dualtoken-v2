import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Notification, { NotificationTypes, LoadingSpinner } from './Notification';

const AdvancedAnalyticsDashboard = () => {
  const [activeTab, setActiveTab] = useState('platform');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState('30');

  // Analytics Data
  const [platformAnalytics, setPlatformAnalytics] = useState(null);
  const [tokenHolderAnalytics, setTokenHolderAnalytics] = useState(null);
  const [propertyAnalytics, setPropertyAnalytics] = useState(null);
  const [revenueAnalytics, setRevenueAnalytics] = useState(null);
  const [governanceAnalytics, setGovernanceAnalytics] = useState(null);
  const [riskMetrics, setRiskMetrics] = useState(null);

  const addNotification = (type, title, message) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const [platform, tokenHolders, properties, revenue, governance, risk] = await Promise.all([
        api.get('/api/admin/analytics/platform'),
        api.get('/api/admin/analytics/token-holders'),
        api.get('/api/admin/analytics/properties'),
        api.get('/api/admin/analytics/revenue'),
        api.get('/api/admin/analytics/governance'),
        api.get('/api/admin/risk/metrics')
      ]);
      
      setPlatformAnalytics(platform.data);
      setTokenHolderAnalytics(tokenHolders.data);
      setPropertyAnalytics(properties.data);
      setRevenueAnalytics(revenue.data);
      setGovernanceAnalytics(governance.data);
      setRiskMetrics(risk.data);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      addNotification(NotificationTypes.ERROR, 'Error', 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (reportType) => {
    setLoading(true);
    try {
      const response = await api.post('/api/admin/risk/compliance-report', { 
        period: dateRange,
        type: reportType 
      });
      
      // Create download link for report
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportType}_report_${new Date().toISOString().slice(0, 10)}.pdf`;
      link.click();
      
      addNotification(NotificationTypes.SUCCESS, 'Success', 'Report generated and downloaded');
    } catch (error) {
      addNotification(NotificationTypes.ERROR, 'Error', 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    return `₹${amount.toLocaleString()}`;
  };

  const formatPercentage = (value) => `${value.toFixed(1)}%`;

  const renderPlatformTab = () => (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 text-center">
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {platformAnalytics?.totalUsers?.toLocaleString() || 0}
          </div>
          <div className="text-sm text-gray-600">Total Users</div>
          <div className="text-xs text-green-600 mt-1">
            +{platformAnalytics?.userGrowth || 0}% this month
          </div>
        </div>
        
        <div className="glass-card p-6 text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">
            {formatCurrency(platformAnalytics?.totalValueLocked || 0)}
          </div>
          <div className="text-sm text-gray-600">Total Value Locked</div>
          <div className="text-xs text-green-600 mt-1">
            +{platformAnalytics?.tvlGrowth || 0}% this month
          </div>
        </div>
        
        <div className="glass-card p-6 text-center">
          <div className="text-3xl font-bold text-purple-600 mb-2">
            {platformAnalytics?.totalTransactions?.toLocaleString() || 0}
          </div>
          <div className="text-sm text-gray-600">Total Transactions</div>
          <div className="text-xs text-blue-600 mt-1">
            {platformAnalytics?.avgDailyTransactions || 0}/day avg
          </div>
        </div>
        
        <div className="glass-card p-6 text-center">
          <div className="text-3xl font-bold text-orange-600 mb-2">
            {formatCurrency(platformAnalytics?.totalRevenue || 0)}
          </div>
          <div className="text-sm text-gray-600">Platform Revenue</div>
          <div className="text-xs text-green-600 mt-1">
            +{platformAnalytics?.revenueGrowth || 0}% this month
          </div>
        </div>
      </div>

      {/* Platform Health Indicators */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          💊 Platform Health Indicators
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>System Uptime</span>
              <span className="font-semibold text-green-600">99.8%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: '99.8%' }}></div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>API Response Time</span>
              <span className="font-semibold text-blue-600">{platformAnalytics?.avgResponseTime || 0}ms</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '85%' }}></div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Error Rate</span>
              <span className="font-semibold text-red-600">{platformAnalytics?.errorRate || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-red-600 h-2 rounded-full" style={{ width: '5%' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* User Activity Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">👥 User Activity</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <div>
                <div className="font-medium">Active Users (24h)</div>
                <div className="text-sm text-gray-600">Online and trading</div>
              </div>
              <div className="text-xl font-bold text-blue-600">
                {platformAnalytics?.activeUsers24h?.toLocaleString() || 0}
              </div>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <div>
                <div className="font-medium">New Registrations</div>
                <div className="text-sm text-gray-600">This week</div>
              </div>
              <div className="text-xl font-bold text-green-600">
                {platformAnalytics?.newUsers7d?.toLocaleString() || 0}
              </div>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <div>
                <div className="font-medium">KYC Completions</div>
                <div className="text-sm text-gray-600">Verified users</div>
              </div>
              <div className="text-xl font-bold text-purple-600">
                {formatPercentage(platformAnalytics?.kycCompletionRate || 0)}
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">🌍 Geographic Distribution</h3>
          <div className="space-y-3">
            {platformAnalytics?.topCities?.map((city, index) => (
              <div key={index} className="flex justify-between items-center">
                <span>{city.name}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${city.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">{city.percentage}%</span>
                </div>
              </div>
            )) || []}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTokenHoldersTab = () => (
    <div className="space-y-6">
      {/* Token Distribution Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 text-center">
          <div className="text-3xl font-bold text-purple-600 mb-2">
            {tokenHolderAnalytics?.xeraHolders?.toLocaleString() || 0}
          </div>
          <div className="text-sm text-gray-600">XERA Holders</div>
          <div className="text-xs text-green-600 mt-1">
            +{tokenHolderAnalytics?.xeraHolderGrowth || 0}% growth
          </div>
        </div>
        
        <div className="glass-card p-6 text-center">
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {tokenHolderAnalytics?.propxHolders?.toLocaleString() || 0}
          </div>
          <div className="text-sm text-gray-600">PROPX Holders</div>
          <div className="text-xs text-green-600 mt-1">
            +{tokenHolderAnalytics?.propxHolderGrowth || 0}% growth
          </div>
        </div>
        
        <div className="glass-card p-6 text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">
            {formatCurrency(tokenHolderAnalytics?.avgXeraHolding || 0)}
          </div>
          <div className="text-sm text-gray-600">Avg XERA Holding</div>
          <div className="text-xs text-blue-600 mt-1">
            Median: {formatCurrency(tokenHolderAnalytics?.medianXeraHolding || 0)}
          </div>
        </div>
        
        <div className="glass-card p-6 text-center">
          <div className="text-3xl font-bold text-orange-600 mb-2">
            {formatPercentage(tokenHolderAnalytics?.stakingParticipation || 0)}
          </div>
          <div className="text-sm text-gray-600">Staking Participation</div>
          <div className="text-xs text-green-600 mt-1">
            {formatCurrency(tokenHolderAnalytics?.totalStaked || 0)} staked
          </div>
        </div>
      </div>

      {/* Holder Distribution Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">📊 XERA Holder Distribution</h3>
          <div className="space-y-4">
            {tokenHolderAnalytics?.xeraDistribution?.map((segment, index) => (
              <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <div className="font-medium">{segment.range}</div>
                  <div className="text-sm text-gray-600">{segment.holders} holders</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatPercentage(segment.percentage)}</div>
                  <div className="text-sm text-gray-600">{formatCurrency(segment.totalValue)}</div>
                </div>
              </div>
            )) || []}
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">🏢 PROPX Holder Analysis</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-lg font-bold text-blue-600">
                  {tokenHolderAnalytics?.activePropxTokens || 0}
                </div>
                <div className="text-sm text-gray-600">Active PROPX Tokens</div>
              </div>
              
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-lg font-bold text-green-600">
                  {formatPercentage(tokenHolderAnalytics?.propxDiversification || 0)}
                </div>
                <div className="text-sm text-gray-600">Avg Diversification</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Top PROPX Holdings by Category:</h4>
              {tokenHolderAnalytics?.topPropxCategories?.map((category, index) => (
                <div key={index} className="flex justify-between">
                  <span>{category.name}</span>
                  <span className="font-medium">{formatPercentage(category.percentage)}</span>
                </div>
              )) || []}
            </div>
          </div>
        </div>
      </div>

      {/* Voting Power Analysis */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4">🗳️ Voting Power Distribution</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <h4 className="font-medium">Top 10 Holders</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Voting Power</span>
                <span className="font-semibold">{formatPercentage(tokenHolderAnalytics?.top10VotingPower || 0)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-red-500 h-2 rounded-full" 
                  style={{ width: `${tokenHolderAnalytics?.top10VotingPower || 0}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium">Top 100 Holders</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Voting Power</span>
                <span className="font-semibold">{formatPercentage(tokenHolderAnalytics?.top100VotingPower || 0)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-yellow-500 h-2 rounded-full" 
                  style={{ width: `${tokenHolderAnalytics?.top100VotingPower || 0}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium">Decentralization Score</h4>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {tokenHolderAnalytics?.decentralizationScore || 0}/100
              </div>
              <div className="text-sm text-gray-600">Healthy Distribution</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPropertyTab = () => (
    <div className="space-y-6">
      {/* Property Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 text-center">
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {propertyAnalytics?.totalProperties?.toLocaleString() || 0}
          </div>
          <div className="text-sm text-gray-600">Total Properties</div>
          <div className="text-xs text-green-600 mt-1">
            +{propertyAnalytics?.newProperties30d || 0} this month
          </div>
        </div>
        
        <div className="glass-card p-6 text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">
            {formatCurrency(propertyAnalytics?.totalPortfolioValue || 0)}
          </div>
          <div className="text-sm text-gray-600">Portfolio Value</div>
          <div className="text-xs text-green-600 mt-1">
            +{formatPercentage(propertyAnalytics?.portfolioGrowth || 0)} YoY
          </div>
        </div>
        
        <div className="glass-card p-6 text-center">
          <div className="text-3xl font-bold text-purple-600 mb-2">
            {formatPercentage(propertyAnalytics?.averageOccupancy || 0)}
          </div>
          <div className="text-sm text-gray-600">Avg Occupancy</div>
          <div className="text-xs text-blue-600 mt-1">
            Target: 90%
          </div>
        </div>
        
        <div className="glass-card p-6 text-center">
          <div className="text-3xl font-bold text-orange-600 mb-2">
            {formatPercentage(propertyAnalytics?.averageYield || 0)}
          </div>
          <div className="text-sm text-gray-600">Avg Annual Yield</div>
          <div className="text-xs text-green-600 mt-1">
            vs {formatPercentage(propertyAnalytics?.marketBenchmark || 0)} market
          </div>
        </div>
      </div>

      {/* City-wise Portfolio Distribution */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4">🏙️ City-wise Portfolio Distribution</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {propertyAnalytics?.cityDistribution?.map((city, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold">{city.name}</h4>
                <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {city.multiplier}x
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Properties:</span>
                  <span className="font-medium">{city.propertyCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Portfolio %:</span>
                  <span className="font-medium">{formatPercentage(city.portfolioPercentage)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Avg Value:</span>
                  <span className="font-medium">{formatCurrency(city.avgPropertyValue)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Occupancy:</span>
                  <span className="font-medium">{formatPercentage(city.avgOccupancy)}</span>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${city.portfolioPercentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )) || []}
        </div>
      </div>

      {/* Property Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">📈 Performance Metrics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <div>
                <div className="font-medium">Top Performing Property</div>
                <div className="text-sm text-gray-600">{propertyAnalytics?.topProperty?.name || 'N/A'}</div>
              </div>
              <div className="text-xl font-bold text-green-600">
                {formatPercentage(propertyAnalytics?.topProperty?.yield || 0)}
              </div>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <div>
                <div className="font-medium">Monthly Rental Income</div>
                <div className="text-sm text-gray-600">Total platform income</div>
              </div>
              <div className="text-xl font-bold text-blue-600">
                {formatCurrency(propertyAnalytics?.monthlyRentalIncome || 0)}
              </div>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <div>
                <div className="font-medium">Capital Appreciation</div>
                <div className="text-sm text-gray-600">Year over year</div>
              </div>
              <div className="text-xl font-bold text-purple-600">
                {formatPercentage(propertyAnalytics?.capitalAppreciation || 0)}
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">🏢 Category Performance</h3>
          <div className="space-y-3">
            {propertyAnalytics?.categoryPerformance?.map((category, index) => (
              <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <div className="font-medium">{category.name}</div>
                  <div className="text-sm text-gray-600">
                    {category.propertyCount} properties • Avg: {formatCurrency(category.avgValue)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-green-600">
                    {formatPercentage(category.yield)}
                  </div>
                  <div className="text-sm text-gray-600">yield</div>
                </div>
              </div>
            )) || []}
          </div>
        </div>
      </div>
    </div>
  );

  const renderGovernanceTab = () => (
    <div className="space-y-6">
      {/* Governance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 text-center">
          <div className="text-3xl font-bold text-purple-600 mb-2">
            {governanceAnalytics?.totalProposals || 0}
          </div>
          <div className="text-sm text-gray-600">Total Proposals</div>
          <div className="text-xs text-green-600 mt-1">
            {governanceAnalytics?.activeProposals || 0} active
          </div>
        </div>
        
        <div className="glass-card p-6 text-center">
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {formatPercentage(governanceAnalytics?.participationRate || 0)}
          </div>
          <div className="text-sm text-gray-600">Participation Rate</div>
          <div className="text-xs text-green-600 mt-1">
            Target: 15%
          </div>
        </div>
        
        <div className="glass-card p-6 text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">
            {formatPercentage(governanceAnalytics?.passRate || 0)}
          </div>
          <div className="text-sm text-gray-600">Proposal Pass Rate</div>
          <div className="text-xs text-blue-600 mt-1">
            {governanceAnalytics?.executedProposals || 0} executed
          </div>
        </div>
        
        <div className="glass-card p-6 text-center">
          <div className="text-3xl font-bold text-orange-600 mb-2">
            {governanceAnalytics?.avgVotingTime || 0}h
          </div>
          <div className="text-sm text-gray-600">Avg Voting Time</div>
          <div className="text-xs text-gray-600 mt-1">
            Time to reach quorum
          </div>
        </div>
      </div>

      {/* Proposal Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">📊 Proposal Types Distribution</h3>
          <div className="space-y-3">
            {governanceAnalytics?.proposalTypes?.map((type, index) => (
              <div key={index} className="flex justify-between items-center">
                <span>{type.name}</span>
                <div className="flex items-center space-x-3">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${type.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium w-12">{type.count}</span>
                </div>
              </div>
            )) || []}
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">🗳️ Voting Patterns</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-lg font-bold text-green-600">
                  {formatPercentage(governanceAnalytics?.forVoteRate || 0)}
                </div>
                <div className="text-sm text-gray-600">For Votes</div>
              </div>
              
              <div className="p-3 bg-red-50 rounded-lg">
                <div className="text-lg font-bold text-red-600">
                  {formatPercentage(governanceAnalytics?.againstVoteRate || 0)}
                </div>
                <div className="text-sm text-gray-600">Against Votes</div>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-bold text-gray-600">
                  {formatPercentage(governanceAnalytics?.abstainVoteRate || 0)}
                </div>
                <div className="text-sm text-gray-600">Abstain Votes</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Voter Engagement:</h4>
              <div className="flex justify-between text-sm">
                <span>Repeat Voters:</span>
                <span className="font-medium">{formatPercentage(governanceAnalytics?.repeatVoterRate || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>First-time Voters:</span>
                <span className="font-medium">{formatPercentage(governanceAnalytics?.firstTimeVoterRate || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Governance Activity */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4">📋 Recent Governance Activity</h3>
        <div className="space-y-3">
          {governanceAnalytics?.recentActivity?.map((activity, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="text-lg">
                  {activity.type === 'proposal' ? '📝' : 
                   activity.type === 'vote' ? '🗳️' : 
                   activity.type === 'execution' ? '✅' : '📊'}
                </span>
                <div>
                  <div className="font-medium">{activity.action}</div>
                  <div className="text-sm text-gray-600">{activity.details}</div>
                </div>
              </div>
              <div className="text-sm text-gray-500">{activity.time}</div>
            </div>
          )) || [
            <div key="no-activity" className="text-center text-gray-500 py-4">
              No recent governance activity
            </div>
          ]}
        </div>
      </div>
    </div>
  );

  const renderRiskTab = () => (
    <div className="space-y-6">
      {/* Risk Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">
            {riskMetrics?.overallRiskScore || 0}/100
          </div>
          <div className="text-sm text-gray-600">Overall Risk Score</div>
          <div className="text-xs text-green-600 mt-1">Low Risk</div>
        </div>
        
        <div className="glass-card p-6 text-center">
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {formatPercentage(riskMetrics?.concentrationRisk || 0)}
          </div>
          <div className="text-sm text-gray-600">Concentration Risk</div>
          <div className="text-xs text-blue-600 mt-1">Acceptable</div>
        </div>
        
        <div className="glass-card p-6 text-center">
          <div className="text-3xl font-bold text-orange-600 mb-2">
            {formatPercentage(riskMetrics?.liquidityRisk || 0)}
          </div>
          <div className="text-sm text-gray-600">Liquidity Risk</div>
          <div className="text-xs text-orange-600 mt-1">Moderate</div>
        </div>
        
        <div className="glass-card p-6 text-center">
          <div className="text-3xl font-bold text-red-600 mb-2">
            {riskMetrics?.criticalAlerts || 0}
          </div>
          <div className="text-sm text-gray-600">Critical Alerts</div>
          <div className="text-xs text-gray-600 mt-1">Active issues</div>
        </div>
      </div>

      {/* Risk Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">⚠️ Risk Categories</h3>
          <div className="space-y-4">
            {riskMetrics?.categories?.map((category, index) => {
              const getRiskColor = (level) => {
                if (level <= 30) return 'text-green-600 bg-green-50';
                if (level <= 60) return 'text-yellow-600 bg-yellow-50';
                return 'text-red-600 bg-red-50';
              };
              
              return (
                <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{category.name}</div>
                    <div className="text-sm text-gray-600">{category.description}</div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(category.score)}`}>
                    {category.score}/100
                  </div>
                </div>
              );
            }) || []}
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">🛡️ Compliance Status</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-lg font-bold text-green-600">
                  {formatPercentage(riskMetrics?.kycCompliance || 0)}
                </div>
                <div className="text-sm text-gray-600">KYC Compliance</div>
              </div>
              
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-lg font-bold text-blue-600">
                  {formatPercentage(riskMetrics?.amlCompliance || 0)}
                </div>
                <div className="text-sm text-gray-600">AML Compliance</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Regulatory Requirements:</h4>
              {riskMetrics?.compliance?.map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm">{item.requirement}</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    item.status === 'compliant' ? 'bg-green-100 text-green-800' :
                    item.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {item.status}
                  </span>
                </div>
              )) || []}
            </div>
          </div>
        </div>
      </div>

      {/* Action Items */}
      <div className="glass-card p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">📋 Risk Management Action Items</h3>
          <div className="space-x-2">
            <button
              onClick={() => generateReport('risk')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Generate Risk Report
            </button>
            <button
              onClick={() => generateReport('compliance')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Compliance Report
            </button>
          </div>
        </div>
        
        <div className="space-y-3">
          {riskMetrics?.actionItems?.map((item, index) => (
            <div key={index} className={`p-3 rounded-lg border-l-4 ${
              item.priority === 'high' ? 'border-red-500 bg-red-50' :
              item.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
              'border-blue-500 bg-blue-50'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{item.title}</div>
                  <div className="text-sm text-gray-600">{item.description}</div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  item.priority === 'high' ? 'bg-red-100 text-red-800' :
                  item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {item.priority}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-2">Due: {item.dueDate}</div>
            </div>
          )) || []}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map(notification => (
          <Notification
            key={notification.id}
            type={notification.type}
            title={notification.title}
            message={notification.message}
            onClose={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
          />
        ))}
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              📊 Advanced Analytics Dashboard
            </h1>
            <p className="text-gray-600">
              Comprehensive platform analytics and risk monitoring
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="365">Last Year</option>
            </select>
            
            <button
              onClick={fetchAnalyticsData}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              {loading ? <LoadingSpinner size="small" color="white" /> : <span>🔄</span>}
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border p-1 mb-6 inline-flex">
        {[
          { id: 'platform', label: 'Platform', icon: '🚀' },
          { id: 'tokenholders', label: 'Token Holders', icon: '👥' },
          { id: 'properties', label: 'Properties', icon: '🏢' },
          { id: 'governance', label: 'Governance', icon: '🏛️' },
          { id: 'risk', label: 'Risk & Compliance', icon: '⚠️' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2 ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="transition-all duration-300">
        {activeTab === 'platform' && renderPlatformTab()}
        {activeTab === 'tokenholders' && renderTokenHoldersTab()}
        {activeTab === 'properties' && renderPropertyTab()}
        {activeTab === 'governance' && renderGovernanceTab()}
        {activeTab === 'risk' && renderRiskTab()}
      </div>
    </div>
  );
};

export default AdvancedAnalyticsDashboard;