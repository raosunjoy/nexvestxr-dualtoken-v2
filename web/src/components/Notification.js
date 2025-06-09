import React from 'react';

export const NotificationTypes = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  LOADING: 'loading'
};

const Notification = ({ type, title, message, onClose, autoClose = true }) => {
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    if (autoClose && type !== NotificationTypes.LOADING) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [autoClose, type, onClose]);

  if (!isVisible) return null;

  const getNotificationStyle = () => {
    const baseStyle = {
      padding: '20px',
      borderRadius: '12px',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '15px',
      border: '1px solid',
      backdropFilter: 'blur(10px)',
      transition: 'all 0.3s ease',
      position: 'relative',
      overflow: 'hidden'
    };

    switch (type) {
      case NotificationTypes.SUCCESS:
        return {
          ...baseStyle,
          background: 'rgba(6, 214, 160, 0.1)',
          borderColor: 'var(--accent-green)',
          color: 'var(--accent-green)'
        };
      case NotificationTypes.ERROR:
        return {
          ...baseStyle,
          background: 'rgba(239, 68, 68, 0.1)',
          borderColor: 'var(--accent-red)',
          color: 'var(--accent-red)'
        };
      case NotificationTypes.WARNING:
        return {
          ...baseStyle,
          background: 'rgba(251, 191, 36, 0.1)',
          borderColor: '#fbbf24',
          color: '#fbbf24'
        };
      case NotificationTypes.INFO:
        return {
          ...baseStyle,
          background: 'rgba(59, 130, 246, 0.1)',
          borderColor: 'var(--accent-blue)',
          color: 'var(--accent-blue)'
        };
      case NotificationTypes.LOADING:
        return {
          ...baseStyle,
          background: 'rgba(139, 69, 255, 0.1)',
          borderColor: 'var(--accent-purple)',
          color: 'var(--accent-purple)'
        };
      default:
        return baseStyle;
    }
  };

  const getIcon = () => {
    switch (type) {
      case NotificationTypes.SUCCESS:
        return '✅';
      case NotificationTypes.ERROR:
        return '❌';
      case NotificationTypes.WARNING:
        return '⚠️';
      case NotificationTypes.INFO:
        return 'ℹ️';
      case NotificationTypes.LOADING:
        return '⏳';
      default:
        return '📢';
    }
  };

  return (
    <div style={getNotificationStyle()}>
      {type === NotificationTypes.LOADING && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'var(--primary-gradient)',
          animation: 'loading-bar 2s ease-in-out infinite'
        }} />
      )}
      
      <div style={{ fontSize: '24px', minWidth: '24px' }}>
        {type === NotificationTypes.LOADING ? (
          <div style={{
            width: '20px',
            height: '20px',
            border: '2px solid rgba(139, 69, 255, 0.3)',
            borderTop: '2px solid var(--accent-purple)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        ) : (
          getIcon()
        )}
      </div>
      
      <div style={{ flex: 1 }}>
        {title && (
          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '5px',
            color: 'inherit'
          }}>
            {title}
          </div>
        )}
        <div style={{
          fontSize: '14px',
          color: 'var(--text-secondary)',
          lineHeight: '1.5'
        }}>
          {message}
        </div>
      </div>
      
      {onClose && type !== NotificationTypes.LOADING && (
        <button
          onClick={() => {
            setIsVisible(false);
            onClose();
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            fontSize: '18px',
            padding: '0',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.7,
            transition: 'opacity 0.2s ease'
          }}
          onMouseEnter={(e) => e.target.style.opacity = 1}
          onMouseLeave={(e) => e.target.style.opacity = 0.7}
        >
          ×
        </button>
      )}
    </div>
  );
};

export const LoadingSpinner = ({ size = 'medium', color = 'var(--accent-purple)' }) => {
  const sizes = {
    small: '16px',
    medium: '24px',
    large: '32px'
  };

  return (
    <div style={{
      width: sizes[size],
      height: sizes[size],
      border: `2px solid rgba(139, 69, 255, 0.3)`,
      borderTop: `2px solid ${color}`,
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      display: 'inline-block'
    }} />
  );
};

export const ErrorBoundary = ({ children, fallback }) => {
  const [hasError, setHasError] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const handleError = (error) => {
      setHasError(true);
      setError(error);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', (event) => {
      handleError(event.reason);
    });

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, []);

  if (hasError) {
    return fallback || (
      <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>😞</div>
        <h2 style={{ marginBottom: '10px', color: 'var(--accent-red)' }}>
          Something went wrong
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
          {error?.message || 'An unexpected error occurred'}
        </p>
        <button
          onClick={() => {
            setHasError(false);
            setError(null);
            window.location.reload();
          }}
          style={{
            background: 'var(--primary-gradient)',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Reload Page
        </button>
      </div>
    );
  }

  return children;
};

// CSS animations to add to styles.css
export const cssAnimations = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes loading-bar {
  0% { transform: translateX(-100%); }
  50% { transform: translateX(0%); }
  100% { transform: translateX(100%); }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  animation: fadeInUp 0.3s ease-out;
}
`;

export default Notification;