# NexVestXR V2 Frontend Development Guide

## Overview

The NexVestXR V2 frontend is a sophisticated React application built for real estate tokenization and cross-chain trading. This comprehensive guide provides developers with everything needed to understand, develop, and maintain the frontend codebase.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Component Documentation](#component-documentation)
- [State Management](#state-management)
- [Internationalization & RTL Support](#internationalization--rtl-support)
- [Responsive Design](#responsive-design)
- [Performance Optimization](#performance-optimization)
- [Testing Strategies](#testing-strategies)
- [Development Guidelines](#development-guidelines)

## Architecture Overview

### Technology Stack

```javascript
// Core Dependencies
React 18.2.0           // UI Framework
React Router 5.3.0     // Client-side routing
React i18next 13.5.0   // Internationalization
Tailwind CSS 3.3.1    // Utility-first CSS framework
Framer Motion 10.10.0  // Animations
Axios 1.3.4           // HTTP client
Socket.io 4.6.1       // Real-time communication
Recharts 2.5.0        // Data visualization
Lucide React 0.263.0  // Icon library
XUMM SDK 1.11.2       // XRPL wallet integration
```

### Project Structure

```
frontend/src/
├── components/          # React components organized by feature
│   ├── Aldar/          # Aldar Properties themed components
│   ├── Auth/           # Authentication & onboarding
│   ├── Common/         # Shared UI components
│   ├── Dashboard/      # Dashboard components
│   ├── DualToken/      # XERA & PROPX token management
│   ├── Exchange/       # Trading interface
│   ├── Payment/        # Payment processing
│   ├── Properties/     # Property listings & details
│   ├── Subscription/   # Subscription management
│   ├── Support/        # Customer support
│   └── ui/            # Base UI components (Button, Card, etc.)
├── context/            # React Context providers
├── hooks/             # Custom React hooks
├── i18n/              # Internationalization setup
├── locales/           # Translation files
├── services/          # API service functions
├── styles/            # Global styles and themes
├── utils/             # Utility functions
└── config/            # Configuration files
```

## Component Documentation

### Authentication Components

#### OnboardingWizard Component

**File:** `/src/components/Auth/OnboardingWizard.jsx`

**Purpose:** Multi-step user onboarding process including KYC, wallet connection, payment tutorial, and first trade guidance.

**Props Interface:**
```typescript
interface OnboardingWizardProps {
  // No props - uses context for user state
}
```

**State Management:**
```javascript
const [step, setStep] = useState(1);           // Current onboarding step
const [kycData, setKycData] = useState({       // KYC form data
  name: '',
  nationality: ''
});
```

**Key Features:**
- 4-step onboarding flow
- XUMM wallet integration with QR code
- Mock KYC submission (production: DigiLocker/MyInfo)
- First-trade discount incentive
- Progress indicator with visual feedback

**Usage Example:**
```jsx
import OnboardingWizard from './components/Auth/OnboardingWizard';

function App() {
  return (
    <Route path="/onboarding" component={OnboardingWizard} />
  );
}
```

#### DeveloperOnboardingWizard Component

**File:** `/src/components/Auth/DeveloperOnboardingWizard.jsx`

**Purpose:** Specialized onboarding flow for real estate developers and property managers.

**Key Features:**
- Developer-specific KYC requirements
- Property portfolio integration
- Advanced trading features access
- Institutional-grade compliance

### Dashboard Components

#### Dashboard Component

**File:** `/src/components/Dashboard/Dashboard.jsx`

**Purpose:** Main investor dashboard with UAE market localization and multi-currency support.

**Props Interface:**
```typescript
interface DashboardProps {
  // Uses global context for user data
}
```

**Key Features:**
- UAE-themed design with cultural elements
- Multi-currency support (AED, USD, EUR, SAR, QAR)
- Real-time exchange rates
- Property portfolio overview
- Investment tier visualization
- Arabic RTL support

**State Management:**
```javascript
const [tokens, setTokens] = useState([]);           // User's token holdings
const [properties, setProperties] = useState([]);   // Available properties
const [currency, setCurrency] = useState('AED');    // Selected currency
const [rates, setRates] = useState({});            // Exchange rates
const [user, setUser] = useState({                 // User profile
  id: 'uae-user-001',
  preferredCurrency: 'AED',
  location: { emirate: 'Dubai', zone: 'Downtown Dubai' }
});
```

**Integration Points:**
- PaymentIntegration component
- SubscriptionPlans component
- TransactionHistory component
- IntercomChat support widget
- AnalyticsDashboard component

**Usage Example:**
```jsx
import Dashboard from './components/Dashboard/Dashboard';
import { useTranslation } from 'react-i18next';
import { useRTL } from '../hooks/useRTL';

function MainApp() {
  const { t } = useTranslation(['common', 'uae']);
  const { isRTL, direction } = useRTL();
  
  return (
    <div className={direction}>
      <Dashboard />
    </div>
  );
}
```

#### DualTokenDashboard Component

**File:** `/src/components/DualToken/DualTokenDashboard.jsx`

**Purpose:** Unified interface for managing XERA platform tokens and PROPX property tokens across XRPL and Flare networks.

**Props Interface:**
```typescript
interface DualTokenDashboardProps {
  userAddress: string;  // Wallet address for portfolio fetching
}
```

**Key Features:**
- Cross-chain portfolio visualization
- XERA token staking and rewards
- PROPX property marketplace
- Benefits tier system
- Real-time analytics
- Margin trading positions

**State Management:**
```javascript
const [portfolio, setPortfolio] = useState(null);              // Combined portfolio
const [analytics, setAnalytics] = useState(null);            // Platform analytics
const [benefits, setBenefits] = useState(null);              // User benefits & tier
const [marginPositions, setMarginPositions] = useState([]);   // Margin positions
const [arbitrageOpportunities, setArbitrageOpportunities] = useState([]); // Arbitrage data
```

**Tab Structure:**
1. **Portfolio** - Asset distribution and performance
2. **XERA Dashboard** - Platform token management
3. **PROPX Marketplace** - Property token trading
4. **Benefits & Tiers** - Loyalty program features
5. **Analytics** - Platform statistics and insights

### Trading Components

#### AdvancedTradingInterface Component

**File:** `/src/components/Exchange/AdvancedTradingInterface.jsx`

**Purpose:** Comprehensive trading interface supporting multiple order types, margin trading, and real-time market data.

**Props Interface:**
```typescript
interface AdvancedTradingInterfaceProps {
  selectedPair?: string; // Default: 'JVCOIMB789/XRP'
}
```

**Order Types Supported:**
- Market orders
- Limit orders
- Stop-loss orders
- OCO (One-Cancels-Other)
- Trailing stop orders
- Margin orders
- PROPX market/limit orders

**WebSocket Integration:**
```javascript
const { ws, isConnected: wsConnected, sendMessage } = useWebSocket();

// Real-time subscriptions
const subscriptions = [
  { type: 'orderbook', pair: selectedPair },
  { type: 'trades', pair: selectedPair },
  { type: 'price', pair: selectedPair },
  { type: 'portfolio' },
  { type: 'orders' },
  { type: 'positions' },
  { type: 'arbitrage' },
  { type: 'risk_alerts' }
];
```

**Key Features:**
- Real-time order book and trade history
- Advanced charting with Recharts
- Liquidity pool management
- Margin trading with leverage (1x-10x)
- Risk management alerts
- XUMM wallet integration
- Multi-currency support

### Payment Components

#### PaymentIntegration Component

**File:** `/src/components/Payment/PaymentIntegration.jsx`

**Purpose:** Multi-provider payment processing supporting Stripe, MoonPay, and Ramp integrations.

**Props Interface:**
```typescript
interface PaymentIntegrationProps {
  userId: string;
}
```

**Supported Payment Methods:**
- Stripe (Credit/Debit cards)
- MoonPay (Crypto on-ramp)
- Ramp (Fiat-to-crypto)

**Key Features:**
- Dynamic payment method detection
- Multi-currency support (USD, INR, AED, GBP, SGD)
- Secure payment flow with redirect handling
- Transaction status tracking
- Error handling and user feedback

### UI Components

#### Button Component

**File:** `/src/components/ui/button.jsx`

**Purpose:** Reusable button component with multiple variants and glass morphism effects.

**Props Interface:**
```typescript
interface ButtonProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'glass' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}
```

**Variants:**
- **Primary**: Gradient background with hover effects
- **Secondary**: Solid color with hover transitions
- **Glass**: Glass morphism effect with transparency
- **Outline**: Border-only design
- **Ghost**: Minimal styling with hover states

**Usage Example:**
```jsx
import { Button } from '../ui/button';

function MyComponent() {
  return (
    <div className="space-x-4">
      <Button variant="primary" size="lg">
        Primary Action
      </Button>
      <Button variant="glass" onClick={handleClick}>
        Glass Effect
      </Button>
    </div>
  );
}
```

## State Management

### Context API Architecture

The application uses React Context API for global state management with specialized contexts for different concerns:

#### AuthContext
```javascript
// /src/context/AuthContext.js
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setUser({ 
        id: 'mock-user-id', 
        email: 'mock-user@example.com', 
        role: 'investor' 
      });
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
```

#### XummContext
**Purpose:** XRPL wallet integration and transaction signing

**Key Features:**
- Wallet connection management
- Transaction payload creation
- Account balance tracking
- Payment request handling

#### RTLProvider
**Purpose:** Right-to-left language support and internationalization

**Features:**
- Automatic language detection
- CSS custom property management
- Direction-aware styling helpers
- Number and currency formatting

### Custom Hooks

#### useRTL Hook

**File:** `/src/hooks/useRTL.js`

**Purpose:** Comprehensive RTL support with layout helpers and formatting utilities.

**Key Features:**
```javascript
const {
  isRTL,              // Boolean: Is current language RTL
  direction,          // String: 'rtl' | 'ltr'
  textAlign,          // String: 'right' | 'left'
  getMargin,          // Function: RTL-aware margin
  getPadding,         // Function: RTL-aware padding
  getBorder,          // Function: RTL-aware border
  getPosition,        // Function: RTL-aware positioning
  formatCurrency,     // Function: Locale-aware currency
  formatNumber,       // Function: Locale-aware numbers
  formatDate          // Function: Locale-aware dates
} = useRTL();
```

**Usage Example:**
```jsx
import { useRTL } from '../hooks/useRTL';

function ProductCard({ price, title }) {
  const { isRTL, formatCurrency, getMargin } = useRTL();
  
  return (
    <div className={`card ${isRTL ? 'rtl' : 'ltr'}`}>
      <h3 style={getMargin('start', '1rem')}>{title}</h3>
      <p className="price">{formatCurrency(price, 'AED')}</p>
    </div>
  );
}
```

#### useWebSocket Hook

**File:** `/src/hooks/useWebSocket.js`

**Purpose:** Real-time communication with trading and market data services.

**Features:**
- Connection management
- Subscription handling
- Message routing
- Automatic reconnection
- Error handling

## Internationalization & RTL Support

### Language Configuration

**File:** `/src/i18n/index.js`

**Supported Languages:**
- English (en) - Default
- Arabic (ar) - RTL support

**Key Features:**
- Automatic language detection
- UAE-specific locale handling
- Currency and number formatting
- Date/time localization
- Pluralization rules

### Translation Structure

```
locales/
├── en/
│   ├── common.json     # Common UI elements
│   └── uae.json        # UAE market-specific terms
└── ar/
    ├── common.json     # Arabic translations
    └── uae.json        # Arabic UAE terms
```

**Example Translation Usage:**
```jsx
import { useTranslation } from 'react-i18next';

function WelcomeComponent() {
  const { t, i18n } = useTranslation(['common', 'uae']);
  
  return (
    <div>
      <h1>{t('uae:platform.welcome')}</h1>
      <p>{t('uae:platform.tagline')}</p>
      <p>{t('common.loading')}</p>
    </div>
  );
}
```

### RTL Styling Approach

**CSS Custom Properties:**
```css
:root {
  --text-direction: ltr;
  --start: left;
  --end: right;
}

[dir="rtl"] {
  --text-direction: rtl;
  --start: right;
  --end: left;
}

.component {
  direction: var(--text-direction);
  text-align: var(--start);
  padding-inline-start: 1rem;
}
```

**Tailwind RTL Classes:**
```jsx
// Conditional RTL classes
const cardClasses = `
  card 
  ${isRTL ? 'rtl:text-right rtl:flex-row-reverse' : 'ltr:text-left'}
  ${isRTL ? 'rtl:mr-4' : 'ltr:ml-4'}
`;
```

## Responsive Design

### Breakpoint Strategy

```javascript
// Tailwind CSS Breakpoints
const breakpoints = {
  sm: '640px',    // Mobile landscape
  md: '768px',    // Tablet
  lg: '1024px',   // Desktop small
  xl: '1280px',   // Desktop large
  '2xl': '1536px' // Desktop extra large
};
```

### Component Responsive Patterns

#### Grid Layouts
```jsx
// Responsive grid with Tailwind
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  {items.map(item => (
    <ItemCard key={item.id} {...item} />
  ))}
</div>
```

#### Mobile-First Approach
```jsx
// Mobile-first responsive classes
<div className="
  w-full                    // Mobile: full width
  sm:w-auto                 // Small: auto width
  md:max-w-md              // Medium: max width
  lg:max-w-lg              // Large: larger max width
  xl:max-w-xl              // Extra large: largest
">
```

### Mobile Considerations

- Touch-friendly button sizes (min 44px)
- Swipe gestures for carousels
- Pull-to-refresh functionality
- Optimized image loading
- Reduced animations on mobile

## Performance Optimization

### Code Splitting

```javascript
// Lazy loading components
const DashboardComponent = React.lazy(() => import('./components/Dashboard/Dashboard'));
const TradingInterface = React.lazy(() => import('./components/Exchange/AdvancedTradingInterface'));

// Route-based splitting
function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/dashboard" element={<DashboardComponent />} />
        <Route path="/trading" element={<TradingInterface />} />
      </Routes>
    </Suspense>
  );
}
```

### Bundle Analysis

```bash
# Analyze bundle size
npm run build:analyze

# Check bundle size limits
npm run size-check

# Production optimization
npm run build:prod
```

### Performance Strategies

1. **Memoization:**
```jsx
import { memo, useMemo, useCallback } from 'react';

const PropertyCard = memo(({ property }) => {
  const formattedPrice = useMemo(() => 
    formatCurrency(property.price), [property.price]
  );
  
  const handleClick = useCallback(() => {
    onPropertySelect(property.id);
  }, [property.id, onPropertySelect]);
  
  return (
    <div onClick={handleClick}>
      <h3>{property.title}</h3>
      <p>{formattedPrice}</p>
    </div>
  );
});
```

2. **Image Optimization:**
```jsx
// Lazy loading images
<img 
  src={property.image} 
  alt={property.title}
  loading="lazy"
  className="aspect-video object-cover"
/>
```

3. **Virtual Scrolling:**
```jsx
// For large lists
import { FixedSizeList as List } from 'react-window';

function PropertyList({ properties }) {
  return (
    <List
      height={600}
      itemCount={properties.length}
      itemSize={200}
    >
      {({ index, style }) => (
        <div style={style}>
          <PropertyCard property={properties[index]} />
        </div>
      )}
    </List>
  );
}
```

## Testing Strategies

### Component Testing

```javascript
// Example: Button component test
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../ui/button';

describe('Button Component', () => {
  test('renders with correct variant class', () => {
    render(<Button variant="primary">Click me</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-gradient-to-r');
  });

  test('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('disables when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### Integration Testing

```javascript
// Example: Dashboard integration test
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../Dashboard/Dashboard';
import { AuthProvider } from '../../context/AuthContext';

const DashboardWithProviders = () => (
  <BrowserRouter>
    <AuthProvider>
      <Dashboard />
    </AuthProvider>
  </BrowserRouter>
);

describe('Dashboard Integration', () => {
  test('loads and displays user portfolio', async () => {
    render(<DashboardWithProviders />);
    
    await waitFor(() => {
      expect(screen.getByText(/portfolio/i)).toBeInTheDocument();
    });
    
    expect(screen.getByText(/investment/i)).toBeInTheDocument();
  });
});
```

### RTL Testing

```javascript
// Testing RTL layout
import { render } from '@testing-library/react';
import { RTLProvider } from '../hooks/useRTL';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';

function renderWithRTL(component, { language = 'ar' } = {}) {
  i18n.changeLanguage(language);
  
  return render(
    <I18nextProvider i18n={i18n}>
      <RTLProvider>
        {component}
      </RTLProvider>
    </I18nextProvider>
  );
}

test('component displays correctly in RTL', () => {
  const { container } = renderWithRTL(<MyComponent />);
  expect(container.firstChild).toHaveAttribute('dir', 'rtl');
});
```

## Development Guidelines

### Component Development Standards

1. **Component Structure:**
```jsx
// StandardComponent.jsx
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * Component description
 * @param {Object} props - Component props
 * @param {string} props.title - Component title
 * @param {Function} props.onAction - Action handler
 */
const StandardComponent = ({ title, onAction }) => {
  const [state, setState] = useState(initialState);
  
  // Effect hooks
  useEffect(() => {
    // Side effects
  }, []);
  
  // Event handlers
  const handleClick = () => {
    // Handle click
  };
  
  // Render
  return (
    <div className="component-container">
      <h2>{title}</h2>
      <button onClick={handleClick}>Action</button>
    </div>
  );
};

StandardComponent.propTypes = {
  title: PropTypes.string.isRequired,
  onAction: PropTypes.func
};

StandardComponent.defaultProps = {
  onAction: () => {}
};

export default StandardComponent;
```

2. **Styling Guidelines:**
- Use Tailwind CSS utility classes
- Follow mobile-first responsive design
- Implement RTL-aware layouts
- Use CSS custom properties for dynamic theming
- Maintain consistent spacing scale

3. **State Management:**
- Use Context API for global state
- Keep component state local when possible
- Implement proper cleanup in useEffect
- Use custom hooks for reusable logic

4. **Performance Best Practices:**
- Memoize expensive calculations
- Use React.memo for pure components
- Implement proper key props for lists
- Optimize images and assets
- Use code splitting for large components

### File Organization

```
components/
├── FeatureName/
│   ├── index.js              # Export barrel
│   ├── FeatureName.jsx       # Main component
│   ├── FeatureName.test.js   # Component tests
│   ├── FeatureName.stories.js # Storybook stories
│   ├── hooks/                # Feature-specific hooks
│   ├── utils/                # Feature utilities
│   └── components/           # Sub-components
│       ├── SubComponent.jsx
│       └── SubComponent.test.js
```

### API Integration

```javascript
// Service layer example
// /src/services/propertyService.js
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL;

export const propertyService = {
  async getProperties(filters = {}) {
    try {
      const response = await axios.get(`${API_BASE}/properties`, {
        params: filters,
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch properties');
    }
  },

  async getPropertyDetails(id) {
    try {
      const response = await axios.get(`${API_BASE}/properties/${id}`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch property details');
    }
  }
};
```

### Error Handling

```jsx
// Error boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong.</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Security Considerations

1. **Input Validation:**
```jsx
// Sanitize user input
import DOMPurify from 'dompurify';

const SafeHTML = ({ content }) => {
  const sanitized = DOMPurify.sanitize(content);
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
};
```

2. **Authentication:**
```jsx
// Protected route component
const ProtectedRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  
  if (!user) {
    return <Redirect to="/login" />;
  }
  
  return children;
};
```

3. **Environment Variables:**
```javascript
// Secure API configuration
const config = {
  apiUrl: process.env.REACT_APP_API_URL,
  xummApiKey: process.env.REACT_APP_XUMM_API_KEY,
  // Never expose secret keys in frontend
};
```

## Deployment & Build Process

### Build Scripts

```json
{
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "build:analyze": "npm run build && npx webpack-bundle-analyzer build/static/js/*.js",
    "build:prod": "GENERATE_SOURCEMAP=false npm run build",
    "test": "react-scripts test --passWithNoTests",
    "test:coverage": "react-scripts test --coverage --watchAll=false",
    "lint": "eslint src/ --ext .js,.jsx,.ts,.tsx",
    "lint:fix": "eslint src/ --ext .js,.jsx,.ts,.tsx --fix"
  }
}
```

### Environment Configuration

```bash
# .env.production
REACT_APP_API_URL=https://api.nexvestxr.com
REACT_APP_XUMM_API_KEY=your-production-key
REACT_APP_INTERCOM_APP_ID=your-intercom-id
GENERATE_SOURCEMAP=false
```

### Performance Monitoring

```javascript
// Performance monitoring setup
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  // Send to your analytics service
  console.log(metric);
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

## Conclusion

This documentation provides a comprehensive guide for developing and maintaining the NexVestXR V2 frontend. The architecture emphasizes modularity, performance, and international accessibility while supporting complex financial trading interfaces and real estate tokenization workflows.

Key architectural decisions include:

- **React Context API** for predictable state management
- **Comprehensive RTL support** for Arabic markets
- **Component-based architecture** for maintainability
- **Performance optimization** through memoization and code splitting
- **Robust testing strategies** for reliability
- **Modern development practices** for scalability

For specific implementation questions or feature requests, refer to the individual component documentation or contact the development team.