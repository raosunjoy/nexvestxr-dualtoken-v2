import React, { useState } from 'react';
import api from '../services/api';
import { useXumm } from '../context/XummContext';
import Notification, { NotificationTypes, LoadingSpinner, ErrorBoundary } from './Notification';
import AdminGovernanceDashboard from './AdminGovernanceDashboard';
import OrganizationPROPXManager from './OrganizationPROPXManager';
import AdvancedAnalyticsDashboard from './AdvancedAnalyticsDashboard';

const SuperAdminPanel = ({ onLogout }) => {
  const [activeSection, setActiveSection] = useState('overview');
  const [orgData, setOrgData] = useState({ name: '', adminEmail: '' });
  const [documents, setDocuments] = useState([]);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});

  // XUMM wallet integration
  const {
    isConnected,
    isConnecting,
    account,
    balance,
    connectWallet,
    disconnectWallet,
    notifications: xummNotifications,
    removeNotification: removeXummNotification,
    formatXRPAmount
  } = useXumm();

  const addNotification = (type, title, message) => {
    const id = Date.now();
    const notification = { id, type, title, message };
    setNotifications(prev => [...prev, notification]);
    return id;
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // XUMM wallet handlers
  const handleConnectWallet = async () => {
    try {
      await connectWallet();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      addNotification(NotificationTypes.ERROR, 'Wallet Connection Failed', error.message);
    }
  };

  const handleDisconnectWallet = async () => {
    try {
      await disconnectWallet();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      addNotification(NotificationTypes.ERROR, 'Wallet Disconnect Failed', error.message);
    }
  };

  // Admin Wallet Widget
  const AdminWalletWidget = () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      background: 'var(--glass-bg)',
      border: '1px solid var(--glass-border)',
      borderRadius: '8px',
      backdropFilter: 'blur(10px)',
      fontSize: '14px'
    }}>
      {isConnected ? (
        <>
          <div style={{
            width: '6px',
            height: '6px',
            background: 'var(--accent-green)',
            borderRadius: '50%',
            animation: 'pulse 2s ease-in-out infinite'
          }} />
          <div>
            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
              {account?.substring(0, 6)}...{account?.substring(-4)}
            </div>
            {balance && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {formatXRPAmount(balance.xrp || 0)}
              </div>
            )}
          </div>
          <button
            onClick={handleDisconnectWallet}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '12px',
              padding: '2px'
            }}
            title="Disconnect Wallet"
          >
            🔓
          </button>
        </>
      ) : (
        <button
          onClick={handleConnectWallet}
          disabled={isConnecting}
          style={{
            background: 'var(--primary-gradient)',
            border: 'none',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '6px',
            cursor: isConnecting ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            opacity: isConnecting ? 0.7 : 1
          }}
        >
          {isConnecting ? (
            <>
              <LoadingSpinner size="small" color="white" />
              Connecting...
            </>
          ) : (
            'Connect XUMM'
          )}
        </button>
      )}
    </div>
  );

  const validateForm = () => {
    const errors = {};
    
    if (!orgData.name.trim()) {
      errors.name = 'Organization name is required';
    } else if (orgData.name.length < 3) {
      errors.name = 'Organization name must be at least 3 characters';
    }

    if (!orgData.adminEmail.trim()) {
      errors.adminEmail = 'Admin email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(orgData.adminEmail)) {
      errors.adminEmail = 'Please enter a valid email address';
    }

    if (documents.length === 0) {
      errors.documents = 'At least one verification document is required';
    } else {
      const invalidFiles = documents.filter(file => {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        return !allowedTypes.includes(file.type) || file.size > 10 * 1024 * 1024; // 10MB limit
      });
      
      if (invalidFiles.length > 0) {
        errors.documents = 'Invalid file type or file too large (max 10MB). Allowed: PDF, JPG, PNG, DOC, DOCX';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    
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
      'Creating Organization',
      'Setting up your organization and processing documents...'
    );

    try {
      // Step 1: Create organization
      const orgResponse = await api.createOrganization(orgData);
      
      if (!orgResponse?.data?.id) {
        throw new Error('Invalid response from server: Missing organization ID');
      }

      const orgId = orgResponse.data.id;
      removeNotification(loadingId);

      // Step 2: Upload and verify documents
      if (documents.length > 0) {
        const verifyLoadingId = addNotification(
          NotificationTypes.LOADING,
          'Processing Documents',
          'Verifying uploaded documents and updating KYC status...'
        );

        const verifyResponse = await api.verifyOrganization(orgId, documents);
        
        if (!verifyResponse?.data?.status) {
          throw new Error('Document verification failed: Invalid response');
        }

        const status = verifyResponse.data.status;
        await api.setKYCStatus(orgId, status === 'approved');
        
        setVerificationStatus(status);
        localStorage.setItem('orgId', orgId);
        
        removeNotification(verifyLoadingId);

        addNotification(
          status === 'approved' ? NotificationTypes.SUCCESS : NotificationTypes.WARNING,
          'Organization Created',
          `Organization "${orgData.name}" has been created and KYC status is: ${status.toUpperCase()}`
        );
      } else {
        addNotification(
          NotificationTypes.SUCCESS,
          'Organization Created',
          `Organization "${orgData.name}" has been created successfully! Please upload documents for KYC verification.`
        );
      }

      // Reset form
      setOrgData({ name: '', adminEmail: '' });
      setDocuments([]);
      setFieldErrors({});

    } catch (error) {
      removeNotification(loadingId);
      
      let errorMessage = 'An unexpected error occurred. Please try again.';
      let errorTitle = 'Creation Failed';

      if (error.response) {
        // Server responded with error
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 400) {
          errorMessage = data?.message || 'Invalid data provided. Please check your inputs.';
          errorTitle = 'Validation Error';
        } else if (status === 409) {
          errorMessage = 'An organization with this name or email already exists.';
          errorTitle = 'Duplicate Organization';
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
        // Network error
        errorMessage = 'Network connection failed. Please check your internet connection.';
        errorTitle = 'Connection Error';
      } else if (error.message) {
        // Custom error message
        errorMessage = error.message;
      }

      addNotification(NotificationTypes.ERROR, errorTitle, errorMessage);
      console.error('Organization creation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-icon">NX</div>
          <div className="logo-text">NexVestXR</div>
        </div>
        
        <nav>
          <ul className="nav-menu">
            <li className="nav-item">
              <button 
                onClick={() => setActiveSection('overview')}
                className={`nav-link ${activeSection === 'overview' ? 'active' : ''}`}
              >
                <span className="nav-icon">👑</span>
                Super Admin
              </button>
            </li>
            <li className="nav-item">
              <button 
                onClick={() => setActiveSection('organizations')}
                className={`nav-link ${activeSection === 'organizations' ? 'active' : ''}`}
              >
                <span className="nav-icon">🏢</span>
                Organizations
              </button>
            </li>
            <li className="nav-item">
              <button 
                onClick={() => setActiveSection('governance')}
                className={`nav-link ${activeSection === 'governance' ? 'active' : ''}`}
              >
                <span className="nav-icon">🏛️</span>
                Governance
              </button>
            </li>
            <li className="nav-item">
              <button 
                onClick={() => setActiveSection('propx')}
                className={`nav-link ${activeSection === 'propx' ? 'active' : ''}`}
              >
                <span className="nav-icon">🏗️</span>
                PROPX Management
              </button>
            </li>
            <li className="nav-item">
              <button 
                onClick={() => setActiveSection('analytics')}
                className={`nav-link ${activeSection === 'analytics' ? 'active' : ''}`}
              >
                <span className="nav-icon">📊</span>
                Analytics
              </button>
            </li>
            <li className="nav-item">
              <button 
                onClick={() => setActiveSection('kyc')}
                className={`nav-link ${activeSection === 'kyc' ? 'active' : ''}`}
              >
                <span className="nav-icon">✅</span>
                KYC Verification
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Header */}
      <header className="header">
        <div className="header-title">
          {activeSection === 'overview' && 'Super Admin Dashboard'}
          {activeSection === 'organizations' && 'Organization Management'}
          {activeSection === 'governance' && 'Governance Administration'}
          {activeSection === 'propx' && 'PROPX Token Management'}
          {activeSection === 'analytics' && 'Advanced Analytics'}
          {activeSection === 'kyc' && 'KYC Verification'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <AdminWalletWidget />
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Welcome, Super Admin</div>
          <button
            onClick={onLogout}
            style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-primary)',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(239, 68, 68, 0.2)';
              e.target.style.borderColor = 'rgba(239, 68, 68, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'var(--glass-bg)';
              e.target.style.borderColor = 'var(--glass-border)';
            }}
          >
            🚪 Logout
          </button>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'var(--primary-gradient)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '700',
            fontSize: '14px'
          }}>SA</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
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
          {xummNotifications.map(notification => (
            <Notification
              key={`xumm-${notification.id}`}
              type={notification.type}
              title={notification.title}
              message={notification.message}
              onClose={() => removeXummNotification(notification.id)}
            />
          ))}
        </div>

        <ErrorBoundary>
          {/* Render different components based on active section */}
          {activeSection === 'overview' && (
            <>
              <div className="glass-card fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <h2 style={{ 
                  fontSize: '28px', 
                  fontWeight: '700', 
                  marginBottom: '30px',
                  background: 'var(--primary-gradient)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  🏢 Create & Verify Organization
                </h2>
                
                <form onSubmit={handleCreateOrg} style={{ display: 'grid', gap: '20px' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontSize: '14px', 
                      color: 'var(--text-secondary)',
                      fontWeight: '500'
                    }}>
                      Organization Name *
                    </label>
                    <input
                      type="text"
                      value={orgData.name}
                      onChange={(e) => {
                        setOrgData({ ...orgData, name: e.target.value });
                        if (fieldErrors.name) {
                          setFieldErrors(prev => ({ ...prev, name: null }));
                        }
                      }}
                      placeholder="e.g., Coimbatore Properties"
                      className={fieldErrors.name ? 'form-field-error' : ''}
                      disabled={isLoading}
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
                      Admin Email *
                    </label>
                    <input
                      type="email"
                      value={orgData.adminEmail}
                      onChange={(e) => {
                        setOrgData({ ...orgData, adminEmail: e.target.value });
                        if (fieldErrors.adminEmail) {
                          setFieldErrors(prev => ({ ...prev, adminEmail: null }));
                        }
                      }}
                      placeholder="admin@organization.com"
                      className={fieldErrors.adminEmail ? 'form-field-error' : ''}
                      disabled={isLoading}
                      required
                    />
                    {fieldErrors.adminEmail && (
                      <div className="validation-message validation-error">
                        <span>❌</span>
                        {fieldErrors.adminEmail}
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
                      Verification Documents *
                    </label>
                    <input
                      type="file"
                      multiple
                      onChange={(e) => {
                        setDocuments(Array.from(e.target.files));
                        if (fieldErrors.documents) {
                          setFieldErrors(prev => ({ ...prev, documents: null }));
                        }
                      }}
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      className={fieldErrors.documents ? 'form-field-error' : ''}
                      disabled={isLoading}
                      style={{
                        padding: '12px',
                        border: `2px dashed ${fieldErrors.documents ? 'var(--accent-red)' : 'var(--glass-border)'}`,
                        borderRadius: '12px',
                        backgroundColor: fieldErrors.documents ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.02)'
                      }}
                    />
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '5px' }}>
                      Upload business license, registration documents, etc. (Max 10MB each)
                    </div>
                    {fieldErrors.documents && (
                      <div className="validation-message validation-error">
                        <span>❌</span>
                        {fieldErrors.documents}
                      </div>
                    )}
                    {documents.length > 0 && !fieldErrors.documents && (
                      <div className="validation-message validation-success">
                        <span>✅</span>
                        {documents.length} file{documents.length > 1 ? 's' : ''} selected
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      padding: '18px',
                      fontSize: '16px',
                      fontWeight: '700',
                      marginTop: '20px',
                      background: isLoading 
                        ? '#666' 
                        : 'linear-gradient(135deg, var(--accent-green) 0%, var(--accent-blue) 100%)',
                      borderRadius: '12px',
                      border: 'none',
                      color: 'white',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      opacity: isLoading ? 0.7 : 1
                    }}
                  >
                    {isLoading ? (
                      <>
                        <LoadingSpinner size="small" color="white" />
                        Processing...
                      </>
                    ) : (
                      '🚀 Create and Verify Organization'
                    )}
                  </button>
                </form>
              </div>
              {verificationStatus && (
                <div style={{
                  marginTop: '30px',
                  padding: '20px',
                  borderRadius: '12px',
                  background: verificationStatus === 'approved' 
                    ? 'rgba(6, 214, 160, 0.1)' 
                    : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${verificationStatus === 'approved' ? 'var(--accent-green)' : 'var(--accent-red)'}`,
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '10px' }}>
                    {verificationStatus === 'approved' ? '✅' : '❌'}
                  </div>
                  <div style={{ 
                    fontSize: '18px', 
                    fontWeight: '600',
                    color: verificationStatus === 'approved' ? 'var(--accent-green)' : 'var(--accent-red)'
                  }}>
                    Status: {verificationStatus.charAt(0).toUpperCase() + verificationStatus.slice(1)}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '5px' }}>
                    Organization has been {verificationStatus} for KYC verification
                  </div>
                </div>
              )}

              {/* Stats Cards */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '20px', 
                marginTop: '40px' 
              }}>
                <div className="glass-card" style={{ textAlign: 'center', padding: '25px' }}>
                  <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--accent-green)', marginBottom: '8px' }}>
                    47
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    Total Organizations
                  </div>
                </div>
                
                <div className="glass-card" style={{ textAlign: 'center', padding: '25px' }}>
                  <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--accent-blue)', marginBottom: '8px' }}>
                    89%
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    KYC Approval Rate
                  </div>
                </div>
                
                <div className="glass-card" style={{ textAlign: 'center', padding: '25px' }}>
                  <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--accent-purple)', marginBottom: '8px' }}>
                    1,247
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    Properties Listed
                  </div>
                </div>
                
                <div className="glass-card" style={{ textAlign: 'center', padding: '25px' }}>
                  <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--accent-green)', marginBottom: '8px' }}>
                    ₹47.2Cr
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    Total Value Locked
                  </div>
                </div>
              </div>
            </>
          )}

          {activeSection === 'governance' && <AdminGovernanceDashboard />}
          {activeSection === 'propx' && <OrganizationPROPXManager />}
          {activeSection === 'analytics' && <AdvancedAnalyticsDashboard />}
          {activeSection === 'organizations' && (
            <div style={{ padding: '20px' }}>
              <h2 style={{ marginBottom: '20px' }}>Organization Management</h2>
              <p>Organization management interface will be implemented here.</p>
            </div>
          )}
          {activeSection === 'kyc' && (
            <div style={{ padding: '20px' }}>
              <h2 style={{ marginBottom: '20px' }}>KYC Verification</h2>
              <p>KYC verification interface will be implemented here.</p>
            </div>
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
};

export default SuperAdminPanel;