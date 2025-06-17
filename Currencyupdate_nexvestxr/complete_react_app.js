// frontend/src/App.js - Complete React application
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';

// Context Providers
import { CurrencyProvider } from './hooks/useCurrency';
import { AuthProvider, useAuth } from './context/AuthContext';
import { XummProvider } from './context/XummContext';
import { TradingProvider } from './context/TradingContext';

// Pages
import Homepage from './pages/Homepage';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import TradingPage from './pages/TradingPage';
import PropertiesPage from './pages/PropertiesPage';
import PropertyDetailsPage from './pages/PropertyDetailsPage';
import PaymentPage from './pages/PaymentPage';
import ProfilePage from './pages/ProfilePage';
import TokenizePage from './pages/TokenizePage';
import DeveloperPage from './pages/DeveloperPage';

// Components
import Navbar from './components/Layout/Navbar';
import Footer from './components/Layout/Footer';
import LoadingSpinner from './components/UI/LoadingSpinner';
import ErrorBoundary from './components/UI/ErrorBoundary';

// Styles
import './styles/tailwind.css';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

// Protected Route Component
const ProtectedRoute = ({ children, requireKYC = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (requireKYC && user.kycStatus !== 'approved') {
    return <Navigate to="/profile?tab=kyc" replace />;
  }

  return children;
};

// Public Route Component (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Main App Component
const AppContent = () => {
  const { user, loading: authLoading } = useAuth();
  const [appLoading, setAppLoading] = useState(true);

  useEffect(() => {
    // Simulate app initialization
    const initializeApp = async () => {
      try {
        // Any app-level initialization logic here
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('App initialization failed:', error);
      } finally {
        setAppLoading(false);
      }
    };

    if (!authLoading) {
      initializeApp();
    }
  }, [authLoading]);

  if (authLoading || appLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        <Routes>
          {/* Public Routes */}
          <Route 
            path="/" 
            element={
              <PublicRoute>
                <Homepage />
              </PublicRoute>
            } 
          />
          <Route 
            path="/auth" 
            element={
              <PublicRoute>
                <AuthPage />
              </PublicRoute>
            } 
          />
          
          {/* Protected Routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/properties" 
            element={
              <ProtectedRoute>
                <PropertiesPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/properties/:propertyId" 
            element={
              <ProtectedRoute>
                <PropertyDetailsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/trading" 
            element={
              <ProtectedRoute requireKYC>
                <TradingPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/payment" 
            element={
              <ProtectedRoute requireKYC>
                <PaymentPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } 
          />
          
          {/* B2B Routes */}
          <Route 
            path="/tokenize" 
            element={
              <ProtectedRoute>
                <TokenizePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/developer" 
            element={
              <ProtectedRoute>
                <DeveloperPage />
              </ProtectedRoute>
            } 
          />
          
          {/* 404 Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />
      
      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            style: {
              background: '#10B981',
            },
          },
          error: {
            duration: 5000,
            style: {
              background: '#EF4444',
            },
          },
        }}
      />
    </div>
  );
};

// Root App Component with Providers
const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <CurrencyProvider>
            <AuthProvider>
              <XummProvider>
                <TradingProvider>
                  <AppContent />
                </TradingProvider>
              </XummProvider>
            </AuthProvider>
          </CurrencyProvider>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;