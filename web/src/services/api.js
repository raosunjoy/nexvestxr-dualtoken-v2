import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Organization Management
export const createOrganization = (data) => api.post('/api/organizations', data);
export const verifyOrganization = (orgId, documents) =>
  api.post(`/api/organizations/${orgId}/verify`, documents, { headers: { 'Content-Type': 'multipart/form-data' } });
export const setKYCStatus = (orgId, status) => api.post(`/api/organizations/${orgId}/kyc-status`, { status });
export const getKYCStatus = (orgId) => api.get(`/api/organizations/${orgId}/kyc-status`);

// Property Management
export const createProperty = (data) => api.post('/api/properties', data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const mintTokens = (propertyId, amount) => api.post(`/api/properties/${propertyId}/mint`, { amount });
export const getPropertyProgress = (propertyId) => api.get(`/api/properties/${propertyId}/progress`);
export const updatePropertyProgress = (propertyId, data) => api.put(`/api/properties/${propertyId}/progress`, data);
export const getProperties = () => api.get('/api/properties');

// ============================================================================
// ADMIN GOVERNANCE API ENDPOINTS
// ============================================================================

// Governance Stats and Overview
export const getGovernanceStats = () => api.get('/api/admin/governance/stats');
export const getGovernanceProposals = () => api.get('/api/admin/governance/proposals');
export const getDividendStats = () => api.get('/api/admin/governance/dividends');

// Proposal Management
export const createGovernanceProposal = (data) => api.post('/api/admin/governance/proposals', data);
export const executeProposal = (proposalId) => api.post(`/api/admin/governance/proposals/${proposalId}/execute`);
export const cancelProposal = (proposalId) => api.post(`/api/admin/governance/proposals/${proposalId}/cancel`);
export const getProposalDetails = (proposalId) => api.get(`/api/admin/governance/proposals/${proposalId}`);

// Dividend Distribution
export const distributeDividend = (data) => api.post('/api/admin/governance/dividends', data);
export const getDividendHistory = () => api.get('/api/admin/governance/dividends/history');
export const claimDividendAdmin = (roundId) => api.post(`/api/admin/governance/dividends/${roundId}/claim`);

// Voting Management
export const getVotingStats = () => api.get('/api/admin/governance/voting/stats');
export const getUserVotingPower = (address) => api.get(`/api/admin/governance/voting/power/${address}`);
export const getVoteHistory = (proposalId) => api.get(`/api/admin/governance/proposals/${proposalId}/votes`);

// ============================================================================
// ORGANIZATION & PROPX MANAGEMENT API ENDPOINTS
// ============================================================================

// Organization Administration
export const getOrganizations = () => api.get('/api/admin/organizations');
export const updateOrganizationStatus = (orgId, isActive) => api.post(`/api/admin/organizations/${orgId}/status`, { isActive });
export const getOrganizationDetails = (orgId) => api.get(`/api/admin/organizations/${orgId}`);

// Developer Registration & Management
export const registerDeveloper = (data) => api.post('/api/admin/developers/register', data);
export const getDevelopers = () => api.get('/api/admin/developers');
export const updateDeveloperTier = (developerId, tier) => api.post(`/api/admin/developers/${developerId}/tier`, { tier });
export const getDeveloperProfile = (developerId) => api.get(`/api/admin/developers/${developerId}`);
export const updateDeveloperProfile = (developerId, data) => api.put(`/api/admin/developers/${developerId}`, data);

// PROPX Access Management
export const updatePROPXAccess = (data) => api.post('/api/admin/propx-access/update', data);
export const getPROPXAccessSettings = (orgId) => api.get(`/api/admin/propx-access/${orgId}`);
export const revokePROPXAccess = (orgId) => api.post(`/api/admin/propx-access/${orgId}/revoke`);

// PROPX Token Management
export const getPROPXTokens = () => api.get('/api/admin/propx-tokens');
export const approvePROPXToken = (tokenId, approved) => api.post(`/api/admin/propx-tokens/${tokenId}/approve`, { approved });
export const getPROPXTokenDetails = (tokenId) => api.get(`/api/admin/propx-tokens/${tokenId}`);
export const suspendPROPXToken = (tokenId) => api.post(`/api/admin/propx-tokens/${tokenId}/suspend`);

// ============================================================================
// XERA TOKEN ADMINISTRATION
// ============================================================================

// XERA Pool Management
export const getXERAPoolStats = () => api.get('/api/admin/xera/pools');
export const addPropertyToXERAPool = (data) => api.post('/api/admin/xera/pools/add-property', data);
export const removePropertyFromXERAPool = (propertyId) => api.post(`/api/admin/xera/pools/remove-property/${propertyId}`);
export const updateCityPoolMultiplier = (cityCode, multiplier) => api.post(`/api/admin/xera/pools/city-multiplier`, { cityCode, multiplier });

// XERA Token Economics
export const updatePlatformFees = (data) => api.post('/api/admin/xera/platform-fees', data);
export const getTokenEconomics = () => api.get('/api/admin/xera/economics');
export const updateMinimumPropertyValue = (value) => api.post('/api/admin/xera/minimum-property-value', { value });

// ============================================================================
// ANALYTICS & MONITORING
// ============================================================================

// Platform Analytics
export const getPlatformAnalytics = () => api.get('/api/admin/analytics/platform');
export const getTokenHolderAnalytics = () => api.get('/api/admin/analytics/token-holders');
export const getPropertyAnalytics = () => api.get('/api/admin/analytics/properties');
export const getRevenueAnalytics = () => api.get('/api/admin/analytics/revenue');

// Governance Analytics
export const getGovernanceAnalytics = () => api.get('/api/admin/analytics/governance');
export const getVotingPatterns = () => api.get('/api/admin/analytics/voting-patterns');
export const getParticipationMetrics = () => api.get('/api/admin/analytics/participation');

// Risk Management
export const getRiskMetrics = () => api.get('/api/admin/risk/metrics');
export const getComplianceStatus = () => api.get('/api/admin/risk/compliance');
export const generateComplianceReport = (period) => api.post('/api/admin/risk/compliance-report', { period });

// ============================================================================
// SMART CONTRACT INTERACTION
// ============================================================================

// Contract Management
export const deployContract = (contractType, params) => api.post('/api/admin/contracts/deploy', { contractType, params });
export const upgradeContract = (contractAddress, newImplementation) => api.post('/api/admin/contracts/upgrade', { contractAddress, newImplementation });
export const pauseContract = (contractAddress) => api.post(`/api/admin/contracts/${contractAddress}/pause`);
export const unpauseContract = (contractAddress) => api.post(`/api/admin/contracts/${contractAddress}/unpause`);

// Emergency Functions
export const emergencyPause = () => api.post('/api/admin/emergency/pause');
export const emergencyWithdraw = (tokenAddress, amount) => api.post('/api/admin/emergency/withdraw', { tokenAddress, amount });
export const updateEmergencyAdmin = (newAdmin) => api.post('/api/admin/emergency/update-admin', { newAdmin });

// ============================================================================
// XUMM WALLET INTEGRATION
// ============================================================================

// XUMM Wallet Management
export const getXummCredentials = () => api.get('/api/xumm/credentials');
export const getAccountInfo = (account) => api.get(`/api/xumm/account/${account}`);
export const getWalletBalance = (account) => api.get(`/api/xumm/balance/${account}`);

// XUMM Transaction Support
export const validateXRPAddress = (address) => api.post('/api/xumm/validate-address', { address });
export const getTransactionStatus = (txHash) => api.get(`/api/xumm/transaction/${txHash}`);
export const getTransactionHistory = (account, limit = 50) => api.get(`/api/xumm/transactions/${account}?limit=${limit}`);

// ============================================================================
// LOGIN ENDPOINTS
// ============================================================================

export const login = (credentials) => api.post('/api/auth/login', credentials);

export default api;