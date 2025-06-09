import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import SuperAdminPanel from './components/SuperAdminPanel';
import AdminDashboard from './components/AdminDashboard';
import PropertyOwnerDashboard from './components/PropertyOwnerDashboard';
import { XummProvider } from './context/XummContext';
import './styles.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userType, setUserType] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('accessToken');
    const savedUserType = localStorage.getItem('userType');
    
    if (token && savedUserType) {
      setIsAuthenticated(true);
      setUserType(savedUserType);
    }
  }, []);

  const handleLogin = (type) => {
    setIsAuthenticated(true);
    setUserType(type);
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userType');
    localStorage.removeItem('userData');
    setIsAuthenticated(false);
    setUserType(null);
  };

  return (
    <XummProvider>
      {!isAuthenticated ? (
        <div className="App">
          <LandingPage onLogin={handleLogin} />
        </div>
      ) : (
        <Router>
          <div className="App">
            <Routes>
              <Route 
                path="/" 
                element={
                  userType === 'superadmin' ? <Navigate to="/super-admin" replace /> :
                  userType === 'admin' ? <Navigate to="/admin" replace /> :
                  userType === 'property-owner' ? <Navigate to="/property-owner" replace /> :
                  <Navigate to="/login" replace />
                } 
              />
              <Route 
                path="/super-admin" 
                element={
                  userType === 'superadmin' ? 
                    <SuperAdminPanel onLogout={handleLogout} /> : 
                    <Navigate to="/" replace />
                } 
              />
              <Route 
                path="/admin" 
                element={
                  userType === 'admin' ? 
                    <AdminDashboard onLogout={handleLogout} /> : 
                    <Navigate to="/" replace />
                } 
              />
              <Route 
                path="/property-owner" 
                element={
                  userType === 'property-owner' ? 
                    <PropertyOwnerDashboard onLogout={handleLogout} /> : 
                    <Navigate to="/" replace />
                } 
              />
              <Route path="/login" element={<LandingPage onLogin={handleLogin} />} />
              <Route path="/wallet-callback" element={<div>Processing wallet connection...</div>} />
              <Route path="/transaction-callback" element={<div>Processing transaction...</div>} />
            </Routes>
          </div>
        </Router>
      )}
    </XummProvider>
  );
}

export default App;