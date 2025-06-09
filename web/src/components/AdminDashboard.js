import React from 'react';
import { Outlet } from 'react-router-dom';
import PropertyForm from './PropertyForm';

const AdminDashboard = () => (
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
            <a href="#" className="nav-link active">
              <span className="nav-icon">🏛️</span>
              Admin Dashboard
            </a>
          </li>
          <li className="nav-item">
            <a href="#" className="nav-link">
              <span className="nav-icon">🏢</span>
              Properties
            </a>
          </li>
          <li className="nav-item">
            <a href="#" className="nav-link">
              <span className="nav-icon">🪙</span>
              Token Minting
            </a>
          </li>
          <li className="nav-item">
            <a href="#" className="nav-link">
              <span className="nav-icon">📊</span>
              Analytics
            </a>
          </li>
          <li className="nav-item">
            <a href="#" className="nav-link">
              <span className="nav-icon">⚙️</span>
              Settings
            </a>
          </li>
        </ul>
      </nav>
    </aside>

    {/* Header */}
    <header className="header">
      <div className="header-title">Organization Admin</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Coimbatore Properties</div>
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
        }}>AD</div>
      </div>
    </header>

    {/* Main Content */}
    <main className="main-content">
      <PropertyForm />
      <Outlet />
    </main>
  </div>
);

export default AdminDashboard;