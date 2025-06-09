import React, { useState } from 'react';
import Notification, { NotificationTypes, LoadingSpinner } from './Notification';
import { useXumm } from '../context/XummContext';
import api from '../services/api';

const LandingPage = ({ onLogin }) => {
  const [showLogin, setShowLogin] = useState(false);
  const [userType, setUserType] = useState('');
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
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

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!credentials.email || !credentials.password) {
      addNotification(NotificationTypes.ERROR, 'Validation Error', 'Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    const loadingId = addNotification(NotificationTypes.LOADING, 'Signing In', 'Authenticating your credentials...');

    try {
      // Hardcoded super admin login
      if (userType === 'superadmin' && credentials.email === 'admin@nexvestxr.com' && credentials.password === 'admin@123') {
        const mockUser = {
          id: 'super-admin-1',
          email: 'admin@nexvestxr.com',
          name: 'Super Administrator',
          role: 'superadmin'
        };
        
        localStorage.setItem('accessToken', 'mock-super-admin-token');
        localStorage.setItem('userType', 'superadmin');
        localStorage.setItem('userData', JSON.stringify(mockUser));
        
        removeNotification(loadingId);
        addNotification(NotificationTypes.SUCCESS, 'Login Successful', `Welcome back, ${mockUser.name}!`);
        
        setTimeout(() => {
          onLogin('superadmin');
        }, 1000);
        return;
      }

      const response = await api.login({ ...credentials, userType });
      
      if (response.data.success) {
        localStorage.setItem('accessToken', response.data.token);
        localStorage.setItem('userType', userType);
        localStorage.setItem('userData', JSON.stringify(response.data.user));
        
        removeNotification(loadingId);
        addNotification(NotificationTypes.SUCCESS, 'Login Successful', `Welcome back, ${response.data.user.name}!`);
        
        setTimeout(() => {
          onLogin(userType);
        }, 1000);
      }
    } catch (error) {
      removeNotification(loadingId);
      
      let errorMessage = 'Invalid credentials. Please try again.';
      if (error.response?.status === 403) {
        errorMessage = 'Account access denied. Please contact support.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      addNotification(NotificationTypes.ERROR, 'Login Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
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

  // Wallet component
  const WalletWidget = () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px 15px',
      background: 'var(--glass-bg)',
      border: '1px solid var(--glass-border)',
      borderRadius: '12px',
      backdropFilter: 'blur(10px)',
      transition: 'all 0.3s ease'
    }}>
      {isConnected ? (
        <>
          <div style={{
            width: '8px',
            height: '8px',
            background: 'var(--accent-green)',
            borderRadius: '50%',
            animation: 'pulse 2s ease-in-out infinite'
          }} />
          <div style={{ fontSize: '14px' }}>
            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
              {account?.substring(0, 8)}...{account?.substring(-4)}
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
              fontSize: '16px',
              padding: '4px'
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
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: isConnecting ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: isConnecting ? 0.7 : 1
          }}
        >
          {isConnecting ? (
            <>
              <LoadingSpinner size="small" color="white" />
              Connecting...
            </>
          ) : (
            <>
              🔗 Connect XUMM
            </>
          )}
        </button>
      )}
    </div>
  );

  const LoginModal = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(10px)'
    }}>
      <div className="glass-card" style={{ width: '400px', margin: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, background: 'var(--primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {userType === 'superadmin' ? 'Super Admin Login' : 'Organization Login'}
          </h3>
          <button
            onClick={() => {setShowLogin(false); setUserType(''); setCredentials({ email: '', password: '' });}}
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '24px', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleLogin} style={{ display: 'grid', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>
              Email Address
            </label>
            <input
              type="email"
              value={credentials.email}
              onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Enter your email"
              disabled={isLoading}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid var(--glass-border)',
                borderRadius: '10px',
                background: 'var(--glass-bg)',
                color: 'var(--text-primary)',
                fontSize: '16px',
                outline: 'none',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(10px)'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-purple)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>
              Password
            </label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Enter your password"
              disabled={isLoading}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid var(--glass-border)',
                borderRadius: '10px',
                background: 'var(--glass-bg)',
                color: 'var(--text-primary)',
                fontSize: '16px',
                outline: 'none',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(10px)'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-purple)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: '15px',
              background: isLoading ? '#666' : 'var(--primary-gradient)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              fontSize: '16px',
              fontWeight: '600'
            }}
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="small" color="white" />
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', color: 'var(--text-primary)' }}>
      {/* Notifications */}
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1100, maxWidth: '400px' }}>
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

      {/* Header */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 50px',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-color)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '50px',
            height: '50px',
            background: 'linear-gradient(135deg, #8b45ff 0%, #3b82f6 30%, #06d6a0 100%)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(139, 69, 255, 0.3)',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'scale(1.05)';
            e.target.style.boxShadow = '0 12px 40px rgba(139, 69, 255, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = '0 8px 32px rgba(139, 69, 255, 0.3)';
          }}
          >
            {/* Building Stack */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '1px',
              marginBottom: '4px'
            }}>
              <div style={{
                width: '4px',
                height: '10px',
                background: 'rgba(255, 255, 255, 0.9)',
                borderRadius: '1px'
              }}></div>
              <div style={{
                width: '6px',
                height: '14px',
                background: 'rgba(255, 255, 255, 1)',
                borderRadius: '1px'
              }}></div>
              <div style={{
                width: '5px',
                height: '12px',
                background: 'rgba(255, 255, 255, 0.9)',
                borderRadius: '1px'
              }}></div>
              <div style={{
                width: '3px',
                height: '8px',
                background: 'rgba(255, 255, 255, 0.85)',
                borderRadius: '1px'
              }}></div>
            </div>
            {/* NX Monogram */}
            <div style={{
              fontSize: '10px',
              fontWeight: '900',
              color: 'white',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
              letterSpacing: '-1px',
              fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
            }}>
              NX
            </div>
            {/* Blockchain dots */}
            <div style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              display: 'flex',
              gap: '1px'
            }}>
              <div style={{
                width: '2px',
                height: '2px',
                background: 'rgba(255, 255, 255, 0.6)',
                borderRadius: '50%',
                animation: 'pulse 2s ease-in-out infinite'
              }}></div>
              <div style={{
                width: '2px',
                height: '2px',
                background: 'rgba(255, 255, 255, 0.6)',
                borderRadius: '50%',
                animation: 'pulse 2s ease-in-out infinite 0.5s'
              }}></div>
              <div style={{
                width: '2px',
                height: '2px',
                background: 'rgba(255, 255, 255, 0.6)',
                borderRadius: '50%',
                animation: 'pulse 2s ease-in-out infinite 1s'
              }}></div>
            </div>
            {/* Shimmer effect */}
            <div style={{
              position: 'absolute',
              top: '-50%',
              left: '-50%',
              width: '200%',
              height: '200%',
              background: 'linear-gradient(45deg, transparent 48%, rgba(255, 255, 255, 0.1) 50%, transparent 52%)',
              animation: 'shimmer 3s ease-in-out infinite',
              pointerEvents: 'none'
            }}></div>
          </div>
          <div style={{
            fontSize: '24px',
            fontWeight: '800',
            background: 'var(--primary-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            NexVestXR
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <WalletWidget />
          <button
            onClick={() => { setUserType('superadmin'); setShowLogin(true); }}
            style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-primary)',
              padding: '12px 24px',
              borderRadius: '12px',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(139, 69, 255, 0.2)';
              e.target.style.borderColor = 'rgba(139, 69, 255, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'var(--glass-bg)';
              e.target.style.borderColor = 'var(--glass-border)';
            }}
          >
            👑 Super Admin
          </button>
          <button
            onClick={() => { setUserType('admin'); setShowLogin(true); }}
            style={{
              background: 'var(--primary-gradient)',
              border: 'none',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
          >
            🏢 Organization Login
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        padding: '120px 50px',
        textAlign: 'center',
        background: 'radial-gradient(circle at 20% 50%, rgba(139, 69, 255, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(6, 214, 160, 0.1) 0%, transparent 50%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Animated Background */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: 'radial-gradient(circle, rgba(139, 69, 255, 0.05) 0%, transparent 70%)',
          animation: 'rotate 20s linear infinite',
          zIndex: 0
        }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <div style={{
            width: '120px',
            height: '120px',
            background: 'var(--primary-gradient)',
            borderRadius: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '48px',
            margin: '0 auto 30px',
            boxShadow: '0 20px 40px rgba(139, 69, 255, 0.3)',
            animation: 'pulse 2s ease-in-out infinite'
          }}>
            🏢
          </div>

          <h1 style={{
            fontSize: '4.5rem',
            fontWeight: '900',
            marginBottom: '20px',
            background: 'var(--primary-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            lineHeight: '1.1',
            letterSpacing: '-2px'
          }}>
            NexVestXR
          </h1>
          <h2 style={{
            fontSize: '2.2rem',
            fontWeight: '600',
            marginBottom: '15px',
            color: 'var(--text-secondary)'
          }}>
            Revolutionizing Global Real Estate Investment
          </h2>
          <p style={{
            fontSize: '1.2rem',
            fontStyle: 'italic',
            marginBottom: '50px',
            color: 'var(--text-muted)'
          }}>
            The World's First Cross-Border Real Estate Tokenization & Trading Platform on XRP Ledger
          </p>
          
          {/* Hero Stats */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '30px', 
            marginTop: '60px',
            maxWidth: '1000px',
            margin: '60px auto 0'
          }}>
            <div className="glass-card" style={{ 
              padding: '30px', 
              textAlign: 'center', 
              transition: 'all 0.3s ease',
              border: '1px solid var(--glass-border)',
              backdropFilter: 'blur(20px)'
            }}>
              <div style={{ 
                fontSize: '2.5rem', 
                fontWeight: '800', 
                background: 'var(--primary-gradient)', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent',
                marginBottom: '10px' 
              }}>
                $3.7T
              </div>
              <div style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>
                Global Real Estate Market
              </div>
            </div>
            
            <div className="glass-card" style={{ 
              padding: '30px', 
              textAlign: 'center', 
              transition: 'all 0.3s ease',
              border: '1px solid var(--glass-border)',
              backdropFilter: 'blur(20px)'
            }}>
              <div style={{ 
                fontSize: '2.5rem', 
                fontWeight: '800', 
                background: 'var(--primary-gradient)', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent',
                marginBottom: '10px' 
              }}>
                40%
              </div>
              <div style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>
                Annual Tokenization Growth
              </div>
            </div>
            
            <div className="glass-card" style={{ 
              padding: '30px', 
              textAlign: 'center', 
              transition: 'all 0.3s ease',
              border: '1px solid var(--glass-border)',
              backdropFilter: 'blur(20px)'
            }}>
              <div style={{ 
                fontSize: '2.5rem', 
                fontWeight: '800', 
                background: 'var(--primary-gradient)', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent',
                marginBottom: '10px' 
              }}>
                $100
              </div>
              <div style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>
                Minimum Investment
              </div>
            </div>
            
            <div className="glass-card" style={{ 
              padding: '30px', 
              textAlign: 'center', 
              transition: 'all 0.3s ease',
              border: '1px solid var(--glass-border)',
              backdropFilter: 'blur(20px)'
            }}>
              <div style={{ 
                fontSize: '2.5rem', 
                fontWeight: '800', 
                background: 'var(--primary-gradient)', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent',
                marginBottom: '10px' 
              }}>
                24/7
              </div>
              <div style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>
                Global Trading
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div style={{ 
            display: 'flex', 
            gap: '20px', 
            justifyContent: 'center', 
            flexWrap: 'wrap',
            marginTop: '50px' 
          }}>
            <button
              onClick={() => addNotification(NotificationTypes.INFO, 'Coming Soon', 'Platform launching Q1 2025. Register to be notified!')}
              style={{
                padding: '15px 30px',
                background: 'var(--primary-gradient)',
                color: 'white',
                border: 'none',
                borderRadius: '15px',
                fontSize: '1.1rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-3px)';
                e.target.style.boxShadow = '0 15px 30px rgba(139, 69, 255, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              🚀 Start Investing
            </button>
            <button
              onClick={() => addNotification(NotificationTypes.INFO, 'Download Available', 'Investor deck will be sent to your email. Contact us for access.')}
              style={{
                padding: '15px 30px',
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)',
                borderRadius: '15px',
                fontSize: '1.1rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(10px)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-3px)';
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.background = 'var(--glass-bg)';
              }}
            >
              📊 Download Investor Deck
            </button>
          </div>
        </div>
      </section>

      {/* Mobile App Section */}
      <section style={{
        padding: '80px 50px',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border-color)',
        textAlign: 'center'
      }}>
        <h2 style={{
          fontSize: '2.5rem',
          fontWeight: '700',
          marginBottom: '20px',
          background: 'var(--primary-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          📱 Get the NexVestXR Mobile App
        </h2>
        <p style={{
          fontSize: '1.1rem',
          color: 'var(--text-secondary)',
          marginBottom: '40px',
          maxWidth: '600px',
          margin: '0 auto 40px'
        }}>
          Manage your real estate investments on the go. Trade property tokens, track portfolio performance, 
          and receive real-time updates directly on your mobile device with integrated XUMM wallet support.
          {isConnected && (
            <span style={{ color: 'var(--accent-green)', fontWeight: '600' }}>
              {' '}Your XUMM wallet is already connected! 🔗
            </span>
          )}
        </p>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              addNotification(NotificationTypes.INFO, 'Coming Soon', 'iOS app will be available on the App Store with Q1 2025 platform launch!');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              padding: '15px 25px',
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              borderRadius: '15px',
              color: 'var(--text-primary)',
              textDecoration: 'none',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              e.target.style.transform = 'translateY(-5px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'var(--glass-bg)';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              color: 'var(--text-primary)'
            }}>
              🍎
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Download on the</div>
              <div style={{ fontSize: '18px', fontWeight: '600' }}>App Store</div>
            </div>
          </a>
          
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              addNotification(NotificationTypes.INFO, 'Coming Soon', 'Android app will be available on Google Play with Q1 2025 platform launch!');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              padding: '15px 25px',
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              borderRadius: '15px',
              color: 'var(--text-primary)',
              textDecoration: 'none',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              e.target.style.transform = 'translateY(-5px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'var(--glass-bg)';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              color: 'var(--text-primary)'
            }}>
              🤖
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Get it on</div>
              <div style={{ fontSize: '18px', fontWeight: '600' }}>Google Play</div>
            </div>
          </a>
        </div>
        
        <div style={{ marginTop: '30px', fontSize: '14px', color: 'var(--text-muted)' }}>
          Available for iOS 14+ and Android 8+ • XUMM Wallet integration available now for web and mobile
          {isConnected && (
            <div style={{ marginTop: '10px', color: 'var(--accent-green)', fontWeight: '500' }}>
              ✅ Connected: {account?.substring(0, 12)}...{account?.substring(-6)} 
              {balance && ` • Balance: ${formatXRPAmount(balance.xrp || 0)}`}
            </div>
          )}
        </div>
      </section>

      {/* Unique Value Proposition Section */}
      <section style={{
        padding: '100px 50px',
        background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)',
        borderTop: '1px solid var(--border-color)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '3rem',
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: '30px',
            background: 'var(--primary-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            First-Mover Advantages in a $3.7T Market
          </h2>
          <p style={{
            fontSize: '1.3rem',
            textAlign: 'center',
            color: 'var(--text-secondary)',
            marginBottom: '60px',
            maxWidth: '800px',
            margin: '0 auto 60px'
          }}>
            Leveraging cutting-edge blockchain technology to solve real estate's biggest challenges.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: '40px'
          }}>
            <div className="glass-card" style={{ padding: '40px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                background: 'var(--primary-gradient)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                marginBottom: '20px'
              }}>🚀</div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '600', marginBottom: '15px' }}>
                First XRPL Real Estate Platform
              </h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Leveraging XRPL's 3-second settlement times and $0.0002 transaction costs for unmatched efficiency.
              </p>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-green)' }}>3s</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Settlement</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-green)' }}>$0.0002</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Tx Cost</div>
                </div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '40px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                background: 'var(--primary-gradient)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                marginBottom: '20px'
              }}>📱</div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '600', marginBottom: '15px' }}>
                Mobile-First Design
              </h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                XUMM wallet integration with biometric security targeting the next generation of crypto-savvy investors.
              </p>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-green)' }}>70%</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Mobile Users</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-green)' }}>Gen Z</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Target Market</div>
                </div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '40px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                background: 'var(--primary-gradient)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                marginBottom: '20px'
              }}>🔗</div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '600', marginBottom: '15px' }}>
                Dual Blockchain Architecture
              </h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                XRPL for trading efficiency + Flare Network for smart contracts and oracle data integration.
              </p>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-green)' }}>2</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Blockchains</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-green)' }}>Enterprise</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Grade</div>
                </div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '40px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                background: 'var(--primary-gradient)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                marginBottom: '20px'
              }}>🌍</div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '600', marginBottom: '15px' }}>
                Global Compliance Framework
              </h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Built-in regulatory compliance for international expansion with automated reporting and tax optimization.
              </p>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-green)' }}>Ready</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Day 1</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-green)' }}>All</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Jurisdictions</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Statement Section */}
      <section style={{
        padding: '100px 50px',
        background: 'var(--bg-primary)',
        borderTop: '1px solid var(--border-color)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '3rem',
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: '30px',
            background: 'var(--primary-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            The Problem with Traditional Real Estate
          </h2>
          <p style={{
            fontSize: '1.3rem',
            textAlign: 'center',
            color: 'var(--text-secondary)',
            marginBottom: '60px',
            maxWidth: '800px',
            margin: '0 auto 60px'
          }}>
            Real estate investment is broken. High barriers, illiquid assets, and geographic limitations exclude 90% of potential investors.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '30px'
          }}>
            <div className="glass-card" style={{ padding: '30px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <div style={{
                width: '60px',
                height: '60px',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                marginBottom: '20px'
              }}>🚧</div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '600', marginBottom: '15px', color: '#ef4444' }}>
                High Barriers to Entry
              </h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Traditional real estate requires $500K+ minimum investments, excluding 90% of potential investors from premium properties.
              </p>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ef4444' }}>$500K+</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Min Investment</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ef4444' }}>90%</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Excluded</div>
                </div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '30px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <div style={{
                width: '60px',
                height: '60px',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                marginBottom: '20px'
              }}>🔒</div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '600', marginBottom: '15px', color: '#ef4444' }}>
                Illiquid Assets
              </h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Real estate investments are locked for years with no exit strategy, creating massive liquidity constraints.
              </p>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ef4444' }}>6-12</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Months to Sell</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ef4444' }}>15-20%</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Transaction Costs</div>
                </div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '30px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <div style={{
                width: '60px',
                height: '60px',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                marginBottom: '20px'
              }}>🌍</div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '600', marginBottom: '15px', color: '#ef4444' }}>
                Geographic Limitations
              </h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Cross-border investment involves complex regulations, currency risks, and limited market access.
              </p>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ef4444' }}>200+</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Jurisdictions</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ef4444' }}>30-45</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Days Process</div>
                </div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '30px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <div style={{
                width: '60px',
                height: '60px',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                marginBottom: '20px'
              }}>📊</div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '600', marginBottom: '15px', color: '#ef4444' }}>
                Lack of Transparency
              </h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Hidden fees, limited market data, and complex legal structures make real estate investing opaque and risky.
              </p>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ef4444' }}>5-8%</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Hidden Fees</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ef4444' }}>Limited</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Market Data</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section style={{ padding: '100px 50px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '3rem',
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: '30px',
            background: 'var(--primary-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Our Solution: The Future of Real Estate Investment
          </h2>
          <p style={{
            fontSize: '1.3rem',
            textAlign: 'center',
            color: 'var(--text-secondary)',
            marginBottom: '60px',
            maxWidth: '800px',
            margin: '0 auto 60px'
          }}>
            NexVestXR democratizes global real estate investment through blockchain tokenization and instant liquidity.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '30px'
          }}>
            <div className="glass-card" style={{ padding: '40px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                background: 'var(--primary-gradient)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                marginBottom: '20px'
              }}>💎</div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '600', marginBottom: '15px' }}>
                Fractional Ownership
              </h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Invest in premium global properties starting from just $100 through blockchain tokenization.
              </p>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-green)' }}>$100</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Min Investment</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-green)' }}>Global</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Properties</div>
                </div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '40px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                background: 'var(--primary-gradient)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                marginBottom: '20px'
              }}>⚡</div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '600', marginBottom: '15px' }}>
                Instant Liquidity
              </h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Trade property tokens 24/7 on our advanced exchange with market, limit, and stop-loss orders.
              </p>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-green)' }}>24/7</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Trading</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-green)' }}>0.2%</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Trading Fee</div>
                </div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '40px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                background: 'var(--primary-gradient)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                marginBottom: '20px'
              }}>🌐</div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '600', marginBottom: '15px' }}>
                Cross-Border Access
              </h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Seamlessly invest across 50+ countries with automated compliance and multi-currency support.
              </p>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-green)' }}>50+</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Countries</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-green)' }}>7</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Currencies</div>
                </div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '40px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                background: 'var(--primary-gradient)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                marginBottom: '20px'
              }}>🤖</div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '600', marginBottom: '15px' }}>
                AI-Powered Security
              </h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Advanced fraud detection, property valuation algorithms, and automated KYC/AML compliance.
              </p>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-green)' }}>99.9%</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Fraud Detection</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-green)' }}>Instant</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>KYC Verification</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Stack Section */}
      <section style={{
        padding: '100px 50px',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border-color)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '3rem',
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: '30px',
            background: 'var(--primary-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Enterprise-Grade Technology Stack
          </h2>
          <p style={{
            fontSize: '1.3rem',
            textAlign: 'center',
            color: 'var(--text-secondary)',
            marginBottom: '60px',
            maxWidth: '800px',
            margin: '0 auto 60px'
          }}>
            Built for scale with cutting-edge blockchain technology and enterprise security.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '25px',
            marginBottom: '60px'
          }}>
            <div className="glass-card" style={{ padding: '25px', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '15px' }}>⚡</div>
              <div style={{ fontWeight: '600', marginBottom: '8px' }}>XRPL Blockchain</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>3-second settlements, $0.0002 tx costs</div>
            </div>
            <div className="glass-card" style={{ padding: '25px', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '15px' }}>🔥</div>
              <div style={{ fontWeight: '600', marginBottom: '8px' }}>Flare Network</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Smart contracts & oracle integration</div>
            </div>
            <div className="glass-card" style={{ padding: '25px', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '15px' }}>📱</div>
              <div style={{ fontWeight: '600', marginBottom: '8px' }}>XUMM Wallet</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Mobile-first, biometric security</div>
            </div>
            <div className="glass-card" style={{ padding: '25px', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '15px' }}>🤖</div>
              <div style={{ fontWeight: '600', marginBottom: '8px' }}>AI/ML Engine</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Fraud detection & valuation</div>
            </div>
            <div className="glass-card" style={{ padding: '25px', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '15px' }}>⚛️</div>
              <div style={{ fontWeight: '600', marginBottom: '8px' }}>React/Node.js</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Modern web & mobile apps</div>
            </div>
            <div className="glass-card" style={{ padding: '25px', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '15px' }}>🐳</div>
              <div style={{ fontWeight: '600', marginBottom: '8px' }}>Docker/K8s</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Scalable infrastructure</div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: 'var(--primary-gradient)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              margin: '0 auto 20px'
            }}>🏗️</div>
            <h3 style={{ fontSize: '1.8rem', fontWeight: '600', marginBottom: '15px' }}>
              Platform Capabilities
            </h3>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '30px', maxWidth: '600px', margin: '0 auto 30px' }}>
              Complete ecosystem supporting property tokenization, advanced trading, portfolio management, and cross-border compliance.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--accent-green)' }}>99.9%</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Uptime SLA</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--accent-green)' }}>10K+</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>TPS Capacity</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--accent-green)' }}>Global</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>CDN</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Market Opportunity Section */}
      <section style={{ padding: '100px 50px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '3rem',
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: '30px',
            background: 'var(--primary-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Massive Market Opportunity
          </h2>
          <p style={{
            fontSize: '1.3rem',
            textAlign: 'center',
            color: 'var(--text-secondary)',
            marginBottom: '60px',
            maxWidth: '800px',
            margin: '0 auto 60px'
          }}>
            Tokenization market growing at 40% annually in a $3.7 trillion global real estate market.
          </p>

          <div className="glass-card" style={{ padding: '40px', textAlign: 'center', marginBottom: '40px' }}>
            <h3 style={{ fontSize: '2rem', fontWeight: '600', marginBottom: '20px' }}>Global Real Estate Market Size</h3>
            <div style={{ fontSize: '4rem', fontWeight: '800', color: 'var(--accent-green)', marginBottom: '20px' }}>$3.7 Trillion</div>
            <div style={{
              width: '100%',
              height: '6px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '3px',
              overflow: 'hidden',
              margin: '20px 0'
            }}>
              <div style={{
                height: '100%',
                background: 'var(--primary-gradient)',
                borderRadius: '3px',
                animation: 'loading 3s ease-in-out infinite',
                width: '100%'
              }}></div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '30px'
          }}>
            <div className="glass-card" style={{ padding: '30px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                background: 'var(--primary-gradient)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                marginBottom: '20px'
              }}>📈</div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '600', marginBottom: '15px' }}>
                Tokenization Growth
              </h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Real estate tokenization market growing at 40% annually, reaching $3.7B by 2025.
              </p>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-green)' }}>40%</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Annual Growth</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-green)' }}>$3.7B</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>2025 Market</div>
                </div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '30px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                background: 'var(--primary-gradient)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                marginBottom: '20px'
              }}>👥</div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '600', marginBottom: '15px' }}>
                Millennial Demand
              </h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                70% of millennials interested in fractional real estate investment but lack access to quality platforms.
              </p>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-green)' }}>70%</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Interested</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-green)' }}>75M</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Millennials</div>
                </div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '30px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                background: 'var(--primary-gradient)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                marginBottom: '20px'
              }}>🌐</div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '600', marginBottom: '15px' }}>
                Cross-Border Investment
              </h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                International real estate investment expected to grow 25% annually as barriers to entry reduce.
              </p>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-green)' }}>25%</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Annual Growth</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-green)' }}>$500B</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Market Size</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section style={{
        padding: '100px 50px',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border-color)',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '3rem',
            fontWeight: '800',
            background: 'var(--primary-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '20px'
          }}>
            Join the Real Estate Revolution
          </h2>
          <p style={{
            fontSize: '1.3rem',
            color: 'var(--text-secondary)',
            marginBottom: '40px',
            lineHeight: '1.6'
          }}>
            Partner with NexVestXR to transform a $3.7 trillion industry and capture the massive opportunity 
            in cross-border real estate tokenization. Together, we'll democratize property investment for the next generation.
          </p>
          
          <div style={{ 
            display: 'flex', 
            gap: '20px', 
            justifyContent: 'center', 
            flexWrap: 'wrap',
            marginBottom: '50px' 
          }}>
            <button
              onClick={() => addNotification(NotificationTypes.SUCCESS, 'Interest Noted', '🚀 Thank you for your interest! Our team will contact you within 24 hours to discuss investment opportunities.')}
              style={{
                padding: '18px 35px',
                background: 'var(--primary-gradient)',
                color: 'white',
                border: 'none',
                borderRadius: '15px',
                fontSize: '1.2rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-3px)';
                e.target.style.boxShadow = '0 15px 30px rgba(139, 69, 255, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              💰 Invest in NexVestXR
            </button>
            <button
              onClick={() => addNotification(NotificationTypes.INFO, 'Deck Download', '📊 Detailed investor deck will be sent to your email. Please provide your contact information.')}
              style={{
                padding: '18px 35px',
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)',
                borderRadius: '15px',
                fontSize: '1.2rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(10px)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-3px)';
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.background = 'var(--glass-bg)';
              }}
            >
              📊 Download Detailed Deck
            </button>
            <button
              onClick={() => addNotification(NotificationTypes.SUCCESS, 'Demo Scheduled', '📅 Demo scheduled! You\'ll receive a calendar invite with platform access details.')}
              style={{
                padding: '18px 35px',
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)',
                borderRadius: '15px',
                fontSize: '1.2rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(10px)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-3px)';
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.background = 'var(--glass-bg)';
              }}
            >
              📅 Schedule Demo
            </button>
          </div>

          {/* Investment Stats */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
            gap: '20px' 
          }}>
            <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--accent-green)', marginBottom: '5px' }}>$15M</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Series A Round</div>
            </div>
            <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--accent-blue)', marginBottom: '5px' }}>Q1 2025</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Platform Launch</div>
            </div>
            <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--accent-purple)', marginBottom: '5px' }}>10x+</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Return Potential</div>
            </div>
            <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--accent-green)', marginBottom: '5px' }}>First</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Market Position</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '40px 50px',
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-color)',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'var(--primary-gradient)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: '900'
          }}>
            NX
          </div>
          <div style={{
            fontSize: '20px',
            fontWeight: '800',
            background: 'var(--primary-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            NexVestXR
          </div>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '10px' }}>
          © 2024 NexVestXR. Democratizing global real estate investment through blockchain technology.
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
          Platform launching Q1 2025 | Series A funding round open to qualified investors
        </p>
      </footer>

      {/* Login Modal */}
      {showLogin && <LoginModal />}
    </div>
  );
};

export default LandingPage;