import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import PropertyForm from './PropertyForm';
import '../styles/aldar-admin-theme.css';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="aldar-admin-container">
      {/* Aldar Sidebar */}
      <aside className="aldar-sidebar">
        <div className="aldar-logo-section">
          <div className="aldar-logo-container">
            <div className="aldar-logo-icon">
              {/* Aldar logo would go here */}
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="4" fill="#000000"/>
                <path d="M8 24V8h4l6 12 6-12h4v16h-4V12l-6 12-6-12v12H8z" fill="white"/>
              </svg>
            </div>
            <div className="aldar-logo-text">Aldar Admin</div>
          </div>
          <div className="aldar-brand-subtitle">Property Management Portal</div>
        </div>
        
        <nav className="aldar-nav">
          <ul className="aldar-nav-menu">
            <li className="aldar-nav-item">
              <button 
                className={`aldar-nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                <span className="aldar-nav-icon">
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                  </svg>
                </span>
                Dashboard Overview
              </button>
            </li>
            <li className="aldar-nav-item">
              <button 
                className={`aldar-nav-link ${activeTab === 'properties' ? 'active' : ''}`}
                onClick={() => setActiveTab('properties')}
              >
                <span className="aldar-nav-icon">
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                  </svg>
                </span>
                Properties
              </button>
            </li>
            <li className="aldar-nav-item">
              <button 
                className={`aldar-nav-link ${activeTab === 'tokenization' ? 'active' : ''}`}
                onClick={() => setActiveTab('tokenization')}
              >
                <span className="aldar-nav-icon">
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zM14 9a1 1 0 100-2 1 1 0 000 2zM7.5 13a.5.5 0 01.5-.5h4a.5.5 0 010 1H8a.5.5 0 01-.5-.5z" clipRule="evenodd"/>
                  </svg>
                </span>
                PROPX Tokens
              </button>
            </li>
            <li className="aldar-nav-item">
              <button 
                className={`aldar-nav-link ${activeTab === 'analytics' ? 'active' : ''}`}
                onClick={() => setActiveTab('analytics')}
              >
                <span className="aldar-nav-icon">
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
                  </svg>
                </span>
                Analytics
              </button>
            </li>
            <li className="aldar-nav-item">
              <button 
                className={`aldar-nav-link ${activeTab === 'investors' ? 'active' : ''}`}
                onClick={() => setActiveTab('investors')}
              >
                <span className="aldar-nav-icon">
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                  </svg>
                </span>
                Investors
              </button>
            </li>
            <li className="aldar-nav-item">
              <button 
                className={`aldar-nav-link ${activeTab === 'compliance' ? 'active' : ''}`}
                onClick={() => setActiveTab('compliance')}
              >
                <span className="aldar-nav-icon">
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                </span>
                Compliance
              </button>
            </li>
            <li className="aldar-nav-item">
              <button 
                className={`aldar-nav-link ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                <span className="aldar-nav-icon">
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
                  </svg>
                </span>
                Settings
              </button>
            </li>
          </ul>
        </nav>

        <div className="aldar-sidebar-footer">
          <div className="aldar-tier-badge">
            <span className="aldar-tier-icon">⭐</span>
            <span className="aldar-tier-text">TIER 1 Developer</span>
          </div>
        </div>
      </aside>

      {/* Aldar Header */}
      <header className="aldar-header">
        <div className="aldar-header-content">
          <div className="aldar-header-title">
            <h1 className="aldar-page-title">Aldar Properties Management</h1>
            <p className="aldar-page-subtitle">Abu Dhabi's Premier Real Estate Platform</p>
          </div>
          <div className="aldar-header-actions">
            <div className="aldar-stats-summary">
              <div className="aldar-stat-item">
                <span className="aldar-stat-value">127</span>
                <span className="aldar-stat-label">Active Properties</span>
              </div>
              <div className="aldar-stat-item">
                <span className="aldar-stat-value">AED 2.4B</span>
                <span className="aldar-stat-label">Total Value</span>
              </div>
              <div className="aldar-stat-item">
                <span className="aldar-stat-value">15,420</span>
                <span className="aldar-stat-label">Investors</span>
              </div>
            </div>
            <div className="aldar-user-profile">
              <div className="aldar-user-info">
                <div className="aldar-user-name">Aldar Admin</div>
                <div className="aldar-user-role">Property Manager</div>
              </div>
              <div className="aldar-user-avatar">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="16" fill="#0066CC"/>
                  <path d="M16 14c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="white"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Aldar Main Content */}
      <main className="aldar-main-content">
        <div className="aldar-content-wrapper">
          {activeTab === 'properties' && <PropertyForm />}
          {activeTab === 'dashboard' && (
            <div className="aldar-dashboard-overview">
              <div className="aldar-metrics-grid">
                <div className="aldar-metric-card">
                  <div className="aldar-metric-header">
                    <h3>Portfolio Performance</h3>
                    <span className="aldar-metric-trend positive">+12.5%</span>
                  </div>
                  <div className="aldar-metric-value">AED 2.4B</div>
                  <div className="aldar-metric-subtitle">Total Portfolio Value</div>
                </div>
                <div className="aldar-metric-card">
                  <div className="aldar-metric-header">
                    <h3>PROPX Tokens</h3>
                    <span className="aldar-metric-trend positive">+8 this month</span>
                  </div>
                  <div className="aldar-metric-value">127</div>
                  <div className="aldar-metric-subtitle">Active Properties</div>
                </div>
                <div className="aldar-metric-card">
                  <div className="aldar-metric-header">
                    <h3>Investor Growth</h3>
                    <span className="aldar-metric-trend positive">+23%</span>
                  </div>
                  <div className="aldar-metric-value">15,420</div>
                  <div className="aldar-metric-subtitle">Total Investors</div>
                </div>
                <div className="aldar-metric-card">
                  <div className="aldar-metric-header">
                    <h3>Revenue</h3>
                    <span className="aldar-metric-trend positive">+15.8%</span>
                  </div>
                  <div className="aldar-metric-value">AED 36.2M</div>
                  <div className="aldar-metric-subtitle">Monthly Revenue</div>
                </div>
              </div>
            </div>
          )}
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;