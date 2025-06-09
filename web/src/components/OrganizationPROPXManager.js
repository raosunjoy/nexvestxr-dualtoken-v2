import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Notification, { NotificationTypes, LoadingSpinner } from './Notification';

const OrganizationPROPXManager = () => {
  const [organizations, setOrganizations] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [propxTokens, setPropxTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [activeTab, setActiveTab] = useState('organizations');

  // Form states
  const [developerRegistration, setDeveloperRegistration] = useState({
    organizationId: '',
    companyName: '',
    brandCode: '',
    tier: 'TIER2',
    primaryCity: '',
    specialization: [],
    projectsDelivered: '',
    totalValueDelivered: '',
    verificationDocuments: []
  });

  const [propxAccess, setPropxAccess] = useState({
    organizationId: '',
    accessLevel: 'LIMITED',
    allowedTokenTypes: [],
    maxTokensPerProject: 1000000,
    requiresApproval: true
  });

  const addNotification = (type, title, message) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [orgsRes, devsRes, tokensRes] = await Promise.all([
        api.get('/api/admin/organizations'),
        api.get('/api/admin/developers'),
        api.get('/api/admin/propx-tokens')
      ]);
      
      setOrganizations(orgsRes.data || []);
      setDevelopers(devsRes.data || []);
      setPropxTokens(tokensRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      addNotification(NotificationTypes.ERROR, 'Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterDeveloper = async (e) => {
    e.preventDefault();
    if (!developerRegistration.organizationId || !developerRegistration.companyName || !developerRegistration.brandCode) {
      addNotification(NotificationTypes.ERROR, 'Validation Error', 'Organization, company name, and brand code are required');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/admin/developers/register', developerRegistration);
      addNotification(NotificationTypes.SUCCESS, 'Success', 'Developer registered successfully');
      setDeveloperRegistration({
        organizationId: '',
        companyName: '',
        brandCode: '',
        tier: 'TIER2',
        primaryCity: '',
        specialization: [],
        projectsDelivered: '',
        totalValueDelivered: '',
        verificationDocuments: []
      });
      fetchData();
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to register developer';
      addNotification(NotificationTypes.ERROR, 'Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePROPXAccess = async (e) => {
    e.preventDefault();
    if (!propxAccess.organizationId) {
      addNotification(NotificationTypes.ERROR, 'Validation Error', 'Organization is required');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/admin/propx-access/update', propxAccess);
      addNotification(NotificationTypes.SUCCESS, 'Success', 'PROPX access updated successfully');
      setPropxAccess({
        organizationId: '',
        accessLevel: 'LIMITED',
        allowedTokenTypes: [],
        maxTokensPerProject: 1000000,
        requiresApproval: true
      });
      fetchData();
    } catch (error) {
      addNotification(NotificationTypes.ERROR, 'Error', 'Failed to update PROPX access');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDeveloperTier = async (developerId, newTier) => {
    setLoading(true);
    try {
      await api.post(`/api/admin/developers/${developerId}/tier`, { tier: newTier });
      addNotification(NotificationTypes.SUCCESS, 'Success', 'Developer tier updated successfully');
      fetchData();
    } catch (error) {
      addNotification(NotificationTypes.ERROR, 'Error', 'Failed to update developer tier');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOrganizationStatus = async (orgId, isActive) => {
    setLoading(true);
    try {
      await api.post(`/api/admin/organizations/${orgId}/status`, { isActive });
      addNotification(NotificationTypes.SUCCESS, 'Success', `Organization ${isActive ? 'activated' : 'deactivated'} successfully`);
      fetchData();
    } catch (error) {
      addNotification(NotificationTypes.ERROR, 'Error', 'Failed to update organization status');
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePROPXToken = async (tokenId, approved) => {
    setLoading(true);
    try {
      await api.post(`/api/admin/propx-tokens/${tokenId}/approve`, { approved });
      addNotification(NotificationTypes.SUCCESS, 'Success', `PROPX token ${approved ? 'approved' : 'rejected'} successfully`);
      fetchData();
    } catch (error) {
      addNotification(NotificationTypes.ERROR, 'Error', 'Failed to update token status');
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier) => {
    return tier === 'TIER1' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800';
  };

  const getAccessLevelColor = (level) => {
    const colors = {
      'FULL': 'bg-green-100 text-green-800',
      'LIMITED': 'bg-yellow-100 text-yellow-800',
      'RESTRICTED': 'bg-red-100 text-red-800'
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status) => {
    const colors = {
      'ACTIVE': 'bg-green-100 text-green-800',
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'SUSPENDED': 'bg-red-100 text-red-800',
      'APPROVED': 'bg-green-100 text-green-800',
      'REJECTED': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const renderOrganizationsTab = () => (
    <div className="space-y-6">
      {/* Organization List */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          🏢 Organizations & PROPX Access
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3">Organization</th>
                <th className="text-left p-3">KYC Status</th>
                <th className="text-left p-3">PROPX Access</th>
                <th className="text-left p-3">Developer Tier</th>
                <th className="text-left p-3">Active Tokens</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org) => {
                const developer = developers.find(d => d.organizationId === org.id);
                const tokenCount = propxTokens.filter(t => t.organizationId === org.id).length;
                
                return (
                  <tr key={org.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div>
                        <div className="font-semibold">{org.name}</div>
                        <div className="text-sm text-gray-600">{org.adminEmail}</div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(org.kycStatus)}`}>
                        {org.kycStatus || 'PENDING'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${getAccessLevelColor(org.propxAccess?.level || 'LIMITED')}`}>
                        {org.propxAccess?.level || 'LIMITED'}
                      </span>
                    </td>
                    <td className="p-3">
                      {developer ? (
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${getTierColor(developer.tier)}`}>
                            {developer.tier}
                          </span>
                          <select
                            onChange={(e) => handleUpdateDeveloperTier(developer.id, e.target.value)}
                            value={developer.tier}
                            className="text-xs border rounded px-2 py-1"
                          >
                            <option value="TIER1">TIER1</option>
                            <option value="TIER2">TIER2</option>
                          </select>
                        </div>
                      ) : (
                        <span className="text-gray-400">Not Registered</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="font-semibold">{tokenCount}</span>
                    </td>
                    <td className="p-3">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleToggleOrganizationStatus(org.id, !org.isActive)}
                          className={`px-3 py-1 rounded text-xs font-medium ${
                            org.isActive 
                              ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                              : 'bg-green-100 text-green-800 hover:bg-green-200'
                          }`}
                        >
                          {org.isActive ? 'Suspend' : 'Activate'}
                        </button>
                        <button
                          onClick={() => setSelectedOrg(org)}
                          className="px-3 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200"
                        >
                          Manage
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* PROPX Access Configuration */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          🔐 Configure PROPX Access
        </h3>
        
        <form onSubmit={handleUpdatePROPXAccess} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Organization</label>
              <select
                value={propxAccess.organizationId}
                onChange={(e) => setPropxAccess({...propxAccess, organizationId: e.target.value})}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Organization</option>
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Access Level</label>
              <select
                value={propxAccess.accessLevel}
                onChange={(e) => setPropxAccess({...propxAccess, accessLevel: e.target.value})}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="FULL">Full Access</option>
                <option value="LIMITED">Limited Access</option>
                <option value="RESTRICTED">Restricted Access</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Max Tokens Per Project</label>
              <input
                type="number"
                value={propxAccess.maxTokensPerProject}
                onChange={(e) => setPropxAccess({...propxAccess, maxTokensPerProject: parseInt(e.target.value)})}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                min="1000"
                max="10000000"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Approval Required</label>
              <div className="flex items-center space-x-4 mt-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={propxAccess.requiresApproval === true}
                    onChange={() => setPropxAccess({...propxAccess, requiresApproval: true})}
                    className="mr-2"
                  />
                  Yes
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={propxAccess.requiresApproval === false}
                    onChange={() => setPropxAccess({...propxAccess, requiresApproval: false})}
                    className="mr-2"
                  />
                  No
                </label>
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Allowed Token Types</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {['RESIDENTIAL', 'COMMERCIAL', 'MIXED_USE', 'LUXURY', 'INDUSTRIAL', 'LAND'].map(type => (
                <label key={type} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={propxAccess.allowedTokenTypes.includes(type)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setPropxAccess({
                          ...propxAccess, 
                          allowedTokenTypes: [...propxAccess.allowedTokenTypes, type]
                        });
                      } else {
                        setPropxAccess({
                          ...propxAccess, 
                          allowedTokenTypes: propxAccess.allowedTokenTypes.filter(t => t !== type)
                        });
                      }
                    }}
                    className="mr-2"
                  />
                  {type.replace('_', ' ')}
                </label>
              ))}
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 flex items-center space-x-2"
          >
            {loading ? <LoadingSpinner size="small" color="white" /> : <span>🔐</span>}
            <span>Update PROPX Access</span>
          </button>
        </form>
      </div>
    </div>
  );

  const renderDeveloperRegistrationTab = () => (
    <div className="space-y-6">
      {/* Developer Registration Form */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          ⭐ Register Organization as Developer
        </h3>
        
        <form onSubmit={handleRegisterDeveloper} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Organization</label>
              <select
                value={developerRegistration.organizationId}
                onChange={(e) => setDeveloperRegistration({...developerRegistration, organizationId: e.target.value})}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Organization</option>
                {organizations.filter(org => !developers.some(dev => dev.organizationId === org.id)).map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Brand Code</label>
              <input
                type="text"
                value={developerRegistration.brandCode}
                onChange={(e) => setDeveloperRegistration({...developerRegistration, brandCode: e.target.value.toUpperCase()})}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="GODREJ, PRESTIGE, etc."
                maxLength={10}
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Developer Tier</label>
              <select
                value={developerRegistration.tier}
                onChange={(e) => setDeveloperRegistration({...developerRegistration, tier: e.target.value})}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="TIER1">Tier 1 (Premium)</option>
                <option value="TIER2">Tier 2 (Standard)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Primary City</label>
              <select
                value={developerRegistration.primaryCity}
                onChange={(e) => setDeveloperRegistration({...developerRegistration, primaryCity: e.target.value})}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Primary City</option>
                <option value="MUM">Mumbai</option>
                <option value="DEL">Delhi NCR</option>
                <option value="BANG">Bangalore</option>
                <option value="CHEN">Chennai</option>
                <option value="HYD">Hyderabad</option>
                <option value="PUN">Pune</option>
                <option value="AHM">Ahmedabad</option>
                <option value="KOL">Kolkata</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Projects Delivered</label>
              <input
                type="number"
                value={developerRegistration.projectsDelivered}
                onChange={(e) => setDeveloperRegistration({...developerRegistration, projectsDelivered: e.target.value})}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                min="0"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Total Value Delivered (₹ Crores)</label>
              <input
                type="number"
                value={developerRegistration.totalValueDelivered}
                onChange={(e) => setDeveloperRegistration({...developerRegistration, totalValueDelivered: e.target.value})}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Specialization</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {['RESIDENTIAL', 'COMMERCIAL', 'MIXED_USE', 'LUXURY', 'INDUSTRIAL', 'VILLAS'].map(spec => (
                <label key={spec} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={developerRegistration.specialization.includes(spec)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setDeveloperRegistration({
                          ...developerRegistration, 
                          specialization: [...developerRegistration.specialization, spec]
                        });
                      } else {
                        setDeveloperRegistration({
                          ...developerRegistration, 
                          specialization: developerRegistration.specialization.filter(s => s !== spec)
                        });
                      }
                    }}
                    className="mr-2"
                  />
                  {spec.replace('_', ' ')}
                </label>
              ))}
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white px-6 py-3 rounded-lg font-medium hover:from-yellow-700 hover:to-orange-700 disabled:opacity-50 flex items-center space-x-2"
          >
            {loading ? <LoadingSpinner size="small" color="white" /> : <span>⭐</span>}
            <span>Register as Developer</span>
          </button>
        </form>
      </div>

      {/* Registered Developers List */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          👥 Registered Developers
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {developers.map(developer => (
            <div key={developer.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">{developer.brandCode}</h4>
                <span className={`px-2 py-1 rounded-full text-xs ${getTierColor(developer.tier)}`}>
                  {developer.tier}
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div><strong>City:</strong> {developer.primaryCity}</div>
                <div><strong>Projects:</strong> {developer.projectsDelivered}</div>
                <div><strong>Value:</strong> ₹{developer.totalValueDelivered} Cr</div>
                <div><strong>Score:</strong> {developer.reputationScore}/100</div>
              </div>
              
              <div className="mt-3 pt-3 border-t">
                <div className="text-xs text-gray-600">Specialization:</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {developer.specialization?.map(spec => (
                    <span key={spec} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
          
          {developers.length === 0 && (
            <div className="col-span-full text-center text-gray-500 py-8">
              No developers registered yet
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderTokenManagementTab = () => (
    <div className="space-y-6">
      {/* PROPX Tokens Pending Approval */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          🔍 PROPX Tokens Pending Approval
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3">Token Symbol</th>
                <th className="text-left p-3">Organization</th>
                <th className="text-left p-3">Property</th>
                <th className="text-left p-3">Total Supply</th>
                <th className="text-left p-3">Price</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {propxTokens.filter(token => token.status === 'PENDING').map(token => (
                <tr key={token.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <div className="font-semibold">{token.symbol}</div>
                    <div className="text-sm text-gray-600">{token.projectCode}</div>
                  </td>
                  <td className="p-3">
                    {organizations.find(org => org.id === token.organizationId)?.name || 'Unknown'}
                  </td>
                  <td className="p-3">
                    <div>{token.propertyName}</div>
                    <div className="text-sm text-gray-600">{token.cityCode}</div>
                  </td>
                  <td className="p-3">{token.totalSupply?.toLocaleString()}</td>
                  <td className="p-3">₹{token.pricePerToken}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(token.status)}`}>
                      {token.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleApprovePROPXToken(token.id, true)}
                        className="px-3 py-1 rounded text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleApprovePROPXToken(token.id, false)}
                        className="px-3 py-1 rounded text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {propxTokens.filter(token => token.status === 'PENDING').length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No tokens pending approval
            </div>
          )}
        </div>
      </div>

      {/* All PROPX Tokens */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          🏢 All PROPX Tokens
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {propxTokens.map(token => (
            <div key={token.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm">{token.symbol}</h4>
                <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(token.status)}`}>
                  {token.status}
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div><strong>Property:</strong> {token.propertyName}</div>
                <div><strong>City:</strong> {token.cityCode}</div>
                <div><strong>Supply:</strong> {token.totalSupply?.toLocaleString()}</div>
                <div><strong>Price:</strong> ₹{token.pricePerToken}</div>
                <div><strong>Raised:</strong> ₹{(token.raisedAmount / 1000000 || 0).toFixed(1)}M</div>
              </div>
              
              <div className="mt-3 pt-3 border-t">
                <div className="text-xs text-gray-600">
                  Organization: {organizations.find(org => org.id === token.organizationId)?.name || 'Unknown'}
                </div>
              </div>
            </div>
          ))}
          
          {propxTokens.length === 0 && (
            <div className="col-span-full text-center text-gray-500 py-8">
              No PROPX tokens created yet
            </div>
          )}
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
          🏢 Organization & PROPX Management
        </h1>
        <p className="text-gray-600">
          Manage organization access to PROPX token creation and developer registration
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border p-1 mb-6 inline-flex">
        {[
          { id: 'organizations', label: 'Organizations', icon: '🏢' },
          { id: 'developers', label: 'Developers', icon: '⭐' },
          { id: 'tokens', label: 'PROPX Tokens', icon: '🏗️' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center space-x-2 ${
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
        {activeTab === 'organizations' && renderOrganizationsTab()}
        {activeTab === 'developers' && renderDeveloperRegistrationTab()}
        {activeTab === 'tokens' && renderTokenManagementTab()}
      </div>
    </div>
  );
};

export default OrganizationPROPXManager;