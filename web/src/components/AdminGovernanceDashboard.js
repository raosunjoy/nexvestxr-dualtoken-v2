import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Notification, { NotificationTypes, LoadingSpinner } from './Notification';

const AdminGovernanceDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // State for different sections
  const [governanceStats, setGovernanceStats] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [dividendStats, setDividendStats] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [selectedProposal, setSelectedProposal] = useState(null);

  // Form states
  const [newProposal, setNewProposal] = useState({
    title: '',
    description: '',
    type: 'CITY_POOL_EXPANSION',
    executionData: '',
    votingPeriod: 7
  });
  
  const [dividendDistribution, setDividendDistribution] = useState({
    amount: '',
    source: 'PLATFORM_FEES',
    description: ''
  });

  const addNotification = (type, title, message) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  useEffect(() => {
    fetchGovernanceData();
  }, []);

  const fetchGovernanceData = async () => {
    setLoading(true);
    try {
      const [statsRes, proposalsRes, dividendRes, orgsRes] = await Promise.all([
        api.get('/api/admin/governance/stats'),
        api.get('/api/admin/governance/proposals'),
        api.get('/api/admin/governance/dividends'),
        api.get('/api/admin/organizations')
      ]);
      
      setGovernanceStats(statsRes.data);
      setProposals(proposalsRes.data || []);
      setDividendStats(dividendRes.data);
      setOrganizations(orgsRes.data || []);
    } catch (error) {
      console.error('Error fetching governance data:', error);
      addNotification(NotificationTypes.ERROR, 'Error', 'Failed to load governance data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProposal = async (e) => {
    e.preventDefault();
    if (!newProposal.title || !newProposal.description) {
      addNotification(NotificationTypes.ERROR, 'Validation Error', 'Title and description are required');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/admin/governance/proposals', newProposal);
      addNotification(NotificationTypes.SUCCESS, 'Success', 'Proposal created successfully');
      setNewProposal({
        title: '',
        description: '',
        type: 'CITY_POOL_EXPANSION',
        executionData: '',
        votingPeriod: 7
      });
      fetchGovernanceData();
    } catch (error) {
      addNotification(NotificationTypes.ERROR, 'Error', 'Failed to create proposal');
    } finally {
      setLoading(false);
    }
  };

  const handleDistributeDividend = async (e) => {
    e.preventDefault();
    if (!dividendDistribution.amount || !dividendDistribution.description) {
      addNotification(NotificationTypes.ERROR, 'Validation Error', 'Amount and description are required');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/admin/governance/dividends', dividendDistribution);
      addNotification(NotificationTypes.SUCCESS, 'Success', 'Dividend distribution initiated');
      setDividendDistribution({
        amount: '',
        source: 'PLATFORM_FEES',
        description: ''
      });
      fetchGovernanceData();
    } catch (error) {
      addNotification(NotificationTypes.ERROR, 'Error', 'Failed to distribute dividend');
    } finally {
      setLoading(false);
    }
  };

  const handleProposalAction = async (proposalId, action) => {
    setLoading(true);
    try {
      await api.post(`/api/admin/governance/proposals/${proposalId}/${action}`);
      addNotification(NotificationTypes.SUCCESS, 'Success', `Proposal ${action}d successfully`);
      fetchGovernanceData();
    } catch (error) {
      addNotification(NotificationTypes.ERROR, 'Error', `Failed to ${action} proposal`);
    } finally {
      setLoading(false);
    }
  };

  const getProposalTypeIcon = (type) => {
    const icons = {
      'CITY_POOL_EXPANSION': '🏙️',
      'PLATFORM_FEE_CHANGE': '💰',
      'STAKING_REWARD_ADJUSTMENT': '📈',
      'PROPERTY_ADDITION': '🏢',
      'TREASURY_ALLOCATION': '🏦',
      'DEVELOPER_TIER_UPDATE': '⭐',
      'GOVERNANCE_PARAMETER': '⚙️'
    };
    return icons[type] || '📋';
  };

  const getStatusColor = (status) => {
    const colors = {
      'ACTIVE': '#10B981',
      'PENDING': '#F59E0B',
      'SUCCEEDED': '#059669',
      'DEFEATED': '#EF4444',
      'EXECUTED': '#8B5CF6'
    };
    return colors[status] || '#6B7280';
  };

  const formatTimeRemaining = (deadline) => {
    const now = new Date();
    const end = new Date(deadline);
    const diff = end - now;
    
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Governance Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 text-center">
          <div className="text-3xl font-bold text-purple-600 mb-2">
            {governanceStats?.totalProposals || 0}
          </div>
          <div className="text-sm text-gray-600">Total Proposals</div>
        </div>
        
        <div className="glass-card p-6 text-center">
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {governanceStats?.activeProposals || 0}
          </div>
          <div className="text-sm text-gray-600">Active Votes</div>
        </div>
        
        <div className="glass-card p-6 text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">
            {governanceStats?.participationRate || 0}%
          </div>
          <div className="text-sm text-gray-600">Participation Rate</div>
        </div>
        
        <div className="glass-card p-6 text-center">
          <div className="text-3xl font-bold text-orange-600 mb-2">
            ₹{(governanceStats?.totalDividendsPaid / 1000000 || 0).toFixed(1)}M
          </div>
          <div className="text-sm text-gray-600">Dividends Distributed</div>
        </div>
      </div>

      {/* Token Holders Distribution */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          👥 Token Holder Distribution
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="font-semibold text-purple-800">XERA Holders</div>
            <div className="text-2xl font-bold text-purple-600">
              {governanceStats?.xeraHolders || 0}
            </div>
            <div className="text-sm text-purple-600">
              Avg: {(governanceStats?.avgXeraHolding || 0).toLocaleString()} XERA
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="font-semibold text-blue-800">PROPX Holders</div>
            <div className="text-2xl font-bold text-blue-600">
              {governanceStats?.propxHolders || 0}
            </div>
            <div className="text-sm text-blue-600">
              Active Properties: {governanceStats?.activePropxTokens || 0}
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="font-semibold text-green-800">Voting Power</div>
            <div className="text-2xl font-bold text-green-600">
              {(governanceStats?.totalVotingPower / 1000000 || 0).toFixed(1)}M
            </div>
            <div className="text-sm text-green-600">
              Quorum: {governanceStats?.quorumRequired || 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          📊 Recent Governance Activity
        </h3>
        <div className="space-y-3">
          {governanceStats?.recentActivity?.map((activity, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="text-lg">{getProposalTypeIcon(activity.type)}</span>
                <div>
                  <div className="font-medium">{activity.action}</div>
                  <div className="text-sm text-gray-600">{activity.description}</div>
                </div>
              </div>
              <div className="text-sm text-gray-500">{activity.time}</div>
            </div>
          )) || [
            <div key="placeholder" className="text-center text-gray-500 py-4">
              No recent activity
            </div>
          ]}
        </div>
      </div>
    </div>
  );

  const renderProposalsTab = () => (
    <div className="space-y-6">
      {/* Create New Proposal */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          ➕ Create New Proposal
        </h3>
        
        <form onSubmit={handleCreateProposal} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Proposal Title</label>
              <input
                type="text"
                value={newProposal.title}
                onChange={(e) => setNewProposal({...newProposal, title: e.target.value})}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Add Mumbai Property Pool"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Proposal Type</label>
              <select
                value={newProposal.type}
                onChange={(e) => setNewProposal({...newProposal, type: e.target.value})}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="CITY_POOL_EXPANSION">City Pool Expansion</option>
                <option value="PLATFORM_FEE_CHANGE">Platform Fee Change</option>
                <option value="STAKING_REWARD_ADJUSTMENT">Staking Reward Adjustment</option>
                <option value="PROPERTY_ADDITION">Property Addition</option>
                <option value="TREASURY_ALLOCATION">Treasury Allocation</option>
                <option value="DEVELOPER_TIER_UPDATE">Developer Tier Update</option>
                <option value="GOVERNANCE_PARAMETER">Governance Parameter</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={newProposal.description}
              onChange={(e) => setNewProposal({...newProposal, description: e.target.value})}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 h-32"
              placeholder="Detailed description of the proposal..."
              required
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Voting Period (days)</label>
              <input
                type="number"
                value={newProposal.votingPeriod}
                onChange={(e) => setNewProposal({...newProposal, votingPeriod: parseInt(e.target.value)})}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                min="1"
                max="30"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Execution Data (Optional)</label>
              <input
                type="text"
                value={newProposal.executionData}
                onChange={(e) => setNewProposal({...newProposal, executionData: e.target.value})}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Smart contract call data"
              />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 flex items-center space-x-2"
          >
            {loading ? <LoadingSpinner size="small" color="white" /> : <span>📝</span>}
            <span>Create Proposal</span>
          </button>
        </form>
      </div>

      {/* Active Proposals */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          🗳️ All Proposals
        </h3>
        
        <div className="space-y-4">
          {proposals.map((proposal) => (
            <div key={proposal.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{getProposalTypeIcon(proposal.type)}</span>
                  <div>
                    <h4 className="font-semibold text-lg">{proposal.title}</h4>
                    <p className="text-gray-600 text-sm">{proposal.type.replace(/_/g, ' ')}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <span 
                    className="px-3 py-1 rounded-full text-sm font-medium text-white"
                    style={{ backgroundColor: getStatusColor(proposal.status) }}
                  >
                    {proposal.status}
                  </span>
                  <div className="text-sm text-gray-500 mt-1">
                    {formatTimeRemaining(proposal.deadline)}
                  </div>
                </div>
              </div>
              
              <p className="text-gray-700 mb-4">{proposal.description}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-lg font-bold text-green-600">{proposal.forVotes || 0}</div>
                  <div className="text-sm text-green-600">For</div>
                </div>
                
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-lg font-bold text-red-600">{proposal.againstVotes || 0}</div>
                  <div className="text-sm text-red-600">Against</div>
                </div>
                
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-bold text-gray-600">{proposal.abstainVotes || 0}</div>
                  <div className="text-sm text-gray-600">Abstain</div>
                </div>
              </div>
              
              {proposal.status === 'SUCCEEDED' && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleProposalAction(proposal.id, 'execute')}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
                  >
                    <span>✅</span>
                    <span>Execute</span>
                  </button>
                </div>
              )}
              
              {proposal.status === 'ACTIVE' && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleProposalAction(proposal.id, 'cancel')}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2"
                  >
                    <span>❌</span>
                    <span>Cancel</span>
                  </button>
                </div>
              )}
            </div>
          ))}
          
          {proposals.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No proposals found. Create the first proposal above.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderDividendsTab = () => (
    <div className="space-y-6">
      {/* Dividend Distribution Form */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          💰 Distribute Dividends
        </h3>
        
        <form onSubmit={handleDistributeDividend} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Amount (₹)</label>
              <input
                type="number"
                value={dividendDistribution.amount}
                onChange={(e) => setDividendDistribution({...dividendDistribution, amount: e.target.value})}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="1000000"
                min="0"
                step="0.01"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Source</label>
              <select
                value={dividendDistribution.source}
                onChange={(e) => setDividendDistribution({...dividendDistribution, source: e.target.value})}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="PLATFORM_FEES">Platform Fees</option>
                <option value="PROPERTY_RENTAL">Property Rental Income</option>
                <option value="CAPITAL_APPRECIATION">Capital Appreciation</option>
                <option value="STAKING_REWARDS">Staking Rewards</option>
                <option value="EXTERNAL_REVENUE">External Revenue</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={dividendDistribution.description}
              onChange={(e) => setDividendDistribution({...dividendDistribution, description: e.target.value})}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 h-24"
              placeholder="Monthly dividend distribution from platform fees..."
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-green-600 to-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:from-green-700 hover:to-blue-700 disabled:opacity-50 flex items-center space-x-2"
          >
            {loading ? <LoadingSpinner size="small" color="white" /> : <span>💸</span>}
            <span>Distribute Dividend</span>
          </button>
        </form>
      </div>

      {/* Dividend History */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          📊 Dividend Distribution History
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Amount</th>
                <th className="text-left p-3">Source</th>
                <th className="text-left p-3">Recipients</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {dividendStats?.history?.map((dividend, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="p-3">{new Date(dividend.date).toLocaleDateString()}</td>
                  <td className="p-3 font-semibold">₹{dividend.amount.toLocaleString()}</td>
                  <td className="p-3">{dividend.source}</td>
                  <td className="p-3">{dividend.recipients}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      dividend.status === 'DISTRIBUTED' ? 'bg-green-100 text-green-800' :
                      dividend.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {dividend.status}
                    </span>
                  </td>
                </tr>
              )) || [
                <tr key="no-data">
                  <td colSpan="5" className="text-center text-gray-500 py-8">
                    No dividend distributions yet
                  </td>
                </tr>
              ]}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dividend Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 text-center">
          <div className="text-2xl font-bold text-green-600 mb-2">
            ₹{(dividendStats?.totalDistributed / 1000000 || 0).toFixed(1)}M
          </div>
          <div className="text-sm text-gray-600">Total Distributed</div>
        </div>
        
        <div className="glass-card p-6 text-center">
          <div className="text-2xl font-bold text-blue-600 mb-2">
            {dividendStats?.totalRecipients || 0}
          </div>
          <div className="text-sm text-gray-600">Total Recipients</div>
        </div>
        
        <div className="glass-card p-6 text-center">
          <div className="text-2xl font-bold text-purple-600 mb-2">
            ₹{(dividendStats?.averagePerHolder || 0).toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Avg Per Holder</div>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🏛️ Governance Administration
        </h1>
        <p className="text-gray-600">
          Manage governance proposals, voting, and dividend distributions
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border p-1 mb-6 inline-flex">
        {[
          { id: 'overview', label: 'Overview', icon: '📊' },
          { id: 'proposals', label: 'Proposals', icon: '📋' },
          { id: 'dividends', label: 'Dividends', icon: '💰' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center space-x-2 ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md'
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
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'proposals' && renderProposalsTab()}
        {activeTab === 'dividends' && renderDividendsTab()}
      </div>
    </div>
  );
};

export default AdminGovernanceDashboard;