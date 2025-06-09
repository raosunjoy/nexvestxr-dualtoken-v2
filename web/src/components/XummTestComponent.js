import React, { useState } from 'react';
import { useXumm } from '../context/XummContext';
import Notification, { NotificationTypes, LoadingSpinner } from './Notification';

const XummTestComponent = () => {
  const [testTransaction, setTestTransaction] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('1');
  const [paymentDestination, setPaymentDestination] = useState('');
  const [notifications, setNotifications] = useState([]);

  const {
    isInitialized,
    isConnected,
    isConnecting,
    isTransacting,
    account,
    balance,
    accountInfo,
    connectWallet,
    disconnectWallet,
    sendXRPPayment,
    getWalletBalance,
    refreshAccountData,
    formatXRPAmount,
    isValidXRPAddress,
    xrpToDrops,
    dropsToXrp
  } = useXumm();

  const addNotification = (type, title, message) => {
    const id = Date.now();
    const notification = { id, type, title, message };
    setNotifications(prev => [...prev, notification]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const handleTestPayment = async () => {
    if (!paymentDestination || !paymentAmount) {
      addNotification(NotificationTypes.ERROR, 'Invalid Input', 'Please enter both destination and amount');
      return;
    }

    if (!isValidXRPAddress(paymentDestination)) {
      addNotification(NotificationTypes.ERROR, 'Invalid Address', 'Please enter a valid XRP address');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      addNotification(NotificationTypes.ERROR, 'Invalid Amount', 'Please enter a valid amount');
      return;
    }

    addNotification(NotificationTypes.INFO, 'Test Payment', 'Initiating test XRP payment...');

    try {
      const result = await sendXRPPayment(
        paymentDestination, 
        amount, 
        null, 
        'NexVestXR Web Test Payment'
      );

      if (result.success) {
        setTestTransaction(result);
        addNotification(NotificationTypes.SUCCESS, 'Payment Successful', 
          `Transaction ID: ${result.txid?.substring(0, 20)}...`);
        
        // Refresh balance after payment
        setTimeout(() => refreshAccountData(), 2000);
      } else {
        addNotification(NotificationTypes.ERROR, 'Payment Failed', result.message);
      }
    } catch (error) {
      addNotification(NotificationTypes.ERROR, 'Payment Error', error.message);
    }
  };

  const handleRefreshBalance = async () => {
    addNotification(NotificationTypes.INFO, 'Refreshing', 'Updating account data...');
    await refreshAccountData();
    addNotification(NotificationTypes.SUCCESS, 'Updated', 'Account data refreshed successfully');
  };

  return (
    <div style={{
      maxWidth: '800px',
      margin: '40px auto',
      padding: '30px',
      background: 'var(--glass-bg)',
      border: '1px solid var(--glass-border)',
      borderRadius: '20px',
      backdropFilter: 'blur(20px)'
    }}>
      {/* Notifications */}
      <div style={{ position: 'fixed', top: '20px', left: '20px', zIndex: 1000, maxWidth: '400px' }}>
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

      <h2 style={{
        fontSize: '2rem',
        fontWeight: '700',
        marginBottom: '30px',
        background: 'var(--primary-gradient)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        textAlign: 'center'
      }}>
        🧪 XUMM Integration Test
      </h2>

      {/* Initialization Status */}
      <div style={{
        padding: '20px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        marginBottom: '30px'
      }}>
        <h3 style={{ marginBottom: '15px', color: 'var(--text-primary)' }}>Service Status</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div>
            <strong>Initialized:</strong>{' '}
            <span style={{ color: isInitialized ? 'var(--accent-green)' : 'var(--accent-red)' }}>
              {isInitialized ? '✅ Yes' : '❌ No'}
            </span>
          </div>
          <div>
            <strong>Connected:</strong>{' '}
            <span style={{ color: isConnected ? 'var(--accent-green)' : 'var(--accent-red)' }}>
              {isConnected ? '✅ Yes' : '❌ No'}
            </span>
          </div>
          <div>
            <strong>Connecting:</strong>{' '}
            <span style={{ color: isConnecting ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
              {isConnecting ? '🔄 Yes' : '⏸️ No'}
            </span>
          </div>
          <div>
            <strong>Transacting:</strong>{' '}
            <span style={{ color: isTransacting ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
              {isTransacting ? '🔄 Yes' : '⏸️ No'}
            </span>
          </div>
        </div>
      </div>

      {/* Wallet Connection */}
      <div style={{
        padding: '20px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        marginBottom: '30px'
      }}>
        <h3 style={{ marginBottom: '15px', color: 'var(--text-primary)' }}>Wallet Connection</h3>
        
        {!isConnected ? (
          <button
            onClick={connectWallet}
            disabled={isConnecting}
            style={{
              background: 'var(--primary-gradient)',
              border: 'none',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '10px',
              cursor: isConnecting ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              opacity: isConnecting ? 0.7 : 1,
              width: '100%',
              justifyContent: 'center'
            }}
          >
            {isConnecting ? (
              <>
                <LoadingSpinner size="small" color="white" />
                Connecting to XUMM...
              </>
            ) : (
              '🔗 Connect XUMM Wallet'
            )}
          </button>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '20px' }}>
              <div>
                <strong>Account:</strong>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                  {account}
                </div>
              </div>
              {balance && (
                <div>
                  <strong>XRP Balance:</strong>
                  <div style={{ fontSize: '14px', color: 'var(--accent-green)' }}>
                    {formatXRPAmount(balance.xrp || 0)}
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={handleRefreshBalance}
                style={{
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-primary)',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                🔄 Refresh Balance
              </button>
              <button
                onClick={disconnectWallet}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: 'var(--accent-red)',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                🔓 Disconnect
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Test Payment */}
      {isConnected && (
        <div style={{
          padding: '20px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          marginBottom: '30px'
        }}>
          <h3 style={{ marginBottom: '15px', color: 'var(--text-primary)' }}>Test XRP Payment</h3>
          
          <div style={{ display: 'grid', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
                Destination Address:
              </label>
              <input
                type="text"
                value={paymentDestination}
                onChange={(e) => setPaymentDestination(e.target.value)}
                placeholder="Enter XRP address (e.g., rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH)"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '8px',
                  background: 'var(--glass-bg)',
                  color: 'var(--text-primary)',
                  fontSize: '14px'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
                Amount (XRP):
              </label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                min="0.000001"
                step="0.000001"
                placeholder="Enter amount in XRP"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '8px',
                  background: 'var(--glass-bg)',
                  color: 'var(--text-primary)',
                  fontSize: '14px'
                }}
              />
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '5px' }}>
                Amount in drops: {paymentAmount ? xrpToDrops(parseFloat(paymentAmount) || 0).toLocaleString() : '0'}
              </div>
            </div>

            <button
              onClick={handleTestPayment}
              disabled={isTransacting || !paymentDestination || !paymentAmount}
              style={{
                background: isTransacting ? '#666' : 'var(--primary-gradient)',
                border: 'none',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: (isTransacting || !paymentDestination || !paymentAmount) ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                justifyContent: 'center',
                opacity: (isTransacting || !paymentDestination || !paymentAmount) ? 0.6 : 1
              }}
            >
              {isTransacting ? (
                <>
                  <LoadingSpinner size="small" color="white" />
                  Processing Payment...
                </>
              ) : (
                '💸 Send Test Payment'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Last Transaction */}
      {testTransaction && (
        <div style={{
          padding: '20px',
          background: 'rgba(6, 214, 160, 0.1)',
          border: '1px solid rgba(6, 214, 160, 0.3)',
          borderRadius: '12px'
        }}>
          <h3 style={{ marginBottom: '15px', color: 'var(--accent-green)' }}>✅ Last Transaction</h3>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            <div><strong>Status:</strong> {testTransaction.success ? 'Success' : 'Failed'}</div>
            {testTransaction.txid && (
              <div style={{ marginTop: '5px' }}>
                <strong>Transaction ID:</strong>
                <div style={{ fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all' }}>
                  {testTransaction.txid}
                </div>
              </div>
            )}
            {testTransaction.dispatched && (
              <div style={{ marginTop: '5px' }}>
                <strong>Dispatched:</strong> {testTransaction.dispatched.toString()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Account Info Debug */}
      {accountInfo && (
        <details style={{ marginTop: '30px' }}>
          <summary style={{ cursor: 'pointer', fontWeight: '600', marginBottom: '10px' }}>
            🔍 Debug Account Info
          </summary>
          <pre style={{
            background: 'rgba(0, 0, 0, 0.3)',
            padding: '15px',
            borderRadius: '8px',
            fontSize: '12px',
            overflow: 'auto',
            maxHeight: '300px'
          }}>
            {JSON.stringify(accountInfo, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

export default XummTestComponent;