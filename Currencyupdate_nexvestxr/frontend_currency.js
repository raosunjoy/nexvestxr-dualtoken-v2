// hooks/useCurrency.js
// React hook for currency management

import { useState, useEffect, useContext, createContext } from 'react';
import axios from 'axios';

// Currency Context
const CurrencyContext = createContext();

// Currency Provider Component
export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrency] = useState('AED');
  const [detectedCurrency, setDetectedCurrency] = useState('AED');
  const [exchangeRates, setExchangeRates] = useState({});
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  // Detect user location and currency on mount
  useEffect(() => {
    detectUserCurrency();
  }, []);

  const detectUserCurrency = async () => {
    try {
      setLoading(true);
      
      // Get user's IP and location
      const response = await axios.get('/api/currency/detect-location');
      const { country, countryCode, detectedCurrency, timezone } = response.data;

      setUserLocation({ country, countryCode, timezone });
      setDetectedCurrency(detectedCurrency);
      
      // Check if user has saved preference
      const savedCurrency = localStorage.getItem('nexvestxr_currency');
      const finalCurrency = savedCurrency || detectedCurrency;
      
      setCurrency(finalCurrency);
      
      // Get current exchange rates
      await fetchExchangeRates();
      
    } catch (error) {
      console.error('Failed to detect currency:', error);
      // Fallback to AED
      setCurrency('AED');
      setDetectedCurrency('AED');
    } finally {
      setLoading(false);
    }
  };

  const fetchExchangeRates = async () => {
    try {
      const response = await axios.get('/api/currency/rates');
      setExchangeRates(response.data.rates);
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error);
    }
  };

  const changeCurrency = (newCurrency) => {
    setCurrency(newCurrency);
    localStorage.setItem('nexvestxr_currency', newCurrency);
    
    // Update user preference if logged in
    if (localStorage.getItem('nexvestxr_token')) {
      updateUserCurrencyPreference(newCurrency);
    }
  };

  const updateUserCurrencyPreference = async (newCurrency) => {
    try {
      await axios.put('/api/user/currency-preference', {
        currency: newCurrency
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('nexvestxr_token')}`
        }
      });
    } catch (error) {
      console.error('Failed to update user currency preference:', error);
    }
  };

  const convertAmount = (amount, fromCurrency, toCurrency = currency) => {
    if (!exchangeRates || fromCurrency === toCurrency) {
      return amount;
    }

    // Convert to AED first (base currency)
    let aedAmount = amount;
    if (fromCurrency !== 'AED') {
      aedAmount = amount / (exchangeRates[fromCurrency] || 1);
    }

    // Convert from AED to target currency
    if (toCurrency !== 'AED') {
      return aedAmount * (exchangeRates[toCurrency] || 1);
    }

    return aedAmount;
  };

  const formatCurrency = (amount, targetCurrency = currency) => {
    const formatMap = {
      'AED': { locale: 'ar-AE', symbol: 'د.إ' },
      'USD': { locale: 'en-US', symbol: '$' },
      'EUR': { locale: 'de-DE', symbol: '€' },
      'GBP': { locale: 'en-GB', symbol: '£' },
      'SGD': { locale: 'en-SG', symbol: 'S$' },
      'INR': { locale: 'en-IN', symbol: '₹' },
      'SAR': { locale: 'ar-SA', symbol: '﷼' },
      'QAR': { locale: 'ar-QA', symbol: 'ر.ق' },
      'KWD': { locale: 'ar-KW', symbol: 'د.ك' }
    };

    const config = formatMap[targetCurrency] || formatMap['AED'];
    
    try {
      return new Intl.NumberFormat(config.locale, {
        style: 'currency',
        currency: targetCurrency,
        minimumFractionDigits: targetCurrency === 'INR' ? 0 : 2,
        maximumFractionDigits: targetCurrency === 'INR' ? 0 : 2
      }).format(amount);
    } catch (error) {
      // Fallback formatting
      const formattedAmount = targetCurrency === 'INR' ? 
        Math.round(amount).toLocaleString('en-IN') : 
        amount.toFixed(2);
      return `${config.symbol}${formattedAmount}`;
    }
  };

  const getInvestmentAmounts = (targetCurrency = currency) => {
    const amounts = {
      'AED': [100, 500, 1000, 5000, 10000, 25000],
      'USD': [25, 100, 250, 1000, 2500, 7500],
      'EUR': [25, 100, 200, 1000, 2000, 6000],
      'GBP': [20, 80, 200, 800, 2000, 5000],
      'SGD': [35, 150, 350, 1500, 3500, 10000],
      'INR': [2000, 8000, 20000, 80000, 200000, 600000],
      'SAR': [100, 400, 1000, 4000, 10000, 25000],
      'QAR': [100, 400, 1000, 4000, 10000, 25000],
      'KWD': [25, 100, 250, 1000, 2500, 7500]
    };
    return amounts[targetCurrency] || amounts['AED'];
  };

  const getCurrencyMessage = (messageType, amount = null) => {
    const messages = {
      'AED': {
        minInvestment: 'Start with AED 100 real estate investment',
        averageInvestment: 'Average investment: AED 2,500 per user',
        returns: 'Portfolio returns: 12-15% annually',
        cta: amount ? `Invest AED ${amount} today` : 'Start with AED 500',
        success: 'Own Dubai real estate for AED 100',
        platform: 'UAE-first real estate investment platform'
      },
      'USD': {
        minInvestment: 'Start with $25 real estate investment',
        averageInvestment: 'Average investment: $750 per user',
        returns: 'Portfolio returns: 12-15% annually',
        cta: amount ? `Invest ${amount} today` : 'Start with $100',
        success: 'Own Dubai real estate for $25',
        platform: 'Mobile-first cross-border investment'
      },
      'EUR': {
        minInvestment: 'Start with €10 real estate investment',
        averageInvestment: 'Average investment: €270 per user',
        returns: 'Portfolio returns: 12-15% annually',
        cta: amount ? `Invest €${amount} today` : 'Start with €22',
        success: 'Own Indian real estate for €10',
        platform: 'Mobile-first European investment'
      },
      'GBP': {
        minInvestment: 'Start with £8 real estate investment',
        averageInvestment: 'Average investment: £240 per user',
        returns: 'Portfolio returns: 12-15% annually',
        cta: amount ? `Invest £${amount} today` : 'Start with £20',
        success: 'Own Mumbai property for £8',
        platform: 'From London to Mumbai in 31 seconds'
      },
      'SGD': {
        minInvestment: 'Start with S$16 real estate investment',
        averageInvestment: 'Average investment: S$405 per user',
        returns: 'Portfolio returns: 12-15% annually',
        cta: amount ? `Invest S${amount} today` : 'Start with S$35',
        success: 'Own Indian real estate for S$16',
        platform: 'Singapore to Mumbai real estate bridge'
      },
      'INR': {
        minInvestment: 'Start with ₹1,000 real estate investment',
        averageInvestment: 'Average investment: ₹25,000 per user',
        returns: 'Portfolio returns: 12-15% annually',
        cta: amount ? `Invest ₹${amount} today` : 'Start with ₹2,500',
        success: 'Own premium Mumbai property for ₹1,000',
        platform: 'India\'s mobile-first real estate platform'
      }
    };

    return messages[currency]?.[messageType] || messages['USD'][messageType];
  };

  const value = {
    currency,
    detectedCurrency,
    exchangeRates,
    userLocation,
    loading,
    changeCurrency,
    convertAmount,
    formatCurrency,
    getInvestmentAmounts,
    getCurrencyMessage,
    fetchExchangeRates
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

// Hook to use currency context
export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

// Currency Selector Component
export const CurrencySelector = ({ className = '' }) => {
  const { currency, changeCurrency, loading } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);

  const currencies = [
    { code: 'AED', name: 'UAE Dirham', flag: '🇦🇪' },
    { code: 'SAR', name: 'Saudi Riyal', flag: '🇸🇦' },
    { code: 'QAR', name: 'Qatari Riyal', flag: '🇶🇦' },
    { code: 'KWD', name: 'Kuwaiti Dinar', flag: '🇰🇼' },
    { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
    { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
    { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
    { code: 'SGD', name: 'Singapore Dollar', flag: '🇸🇬' },
    { code: 'INR', name: 'Indian Rupee', flag: '🇮🇳' }
  ];

  const currentCurrency = currencies.find(c => c.code === currency);

  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-200 rounded-lg h-10 w-20 ${className}`} />
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className="text-lg">{currentCurrency?.flag}</span>
        <span className="font-medium">{currency}</span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
          {currencies.map((curr) => (
            <button
              key={curr.code}
              onClick={() => {
                changeCurrency(curr.code);
                setIsOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                curr.code === currency ? 'bg-blue-50 text-blue-600' : ''
              }`}
            >
              <span className="text-lg">{curr.flag}</span>
              <div>
                <div className="font-medium">{curr.code}</div>
                <div className="text-sm text-gray-500">{curr.name}</div>
              </div>
              {curr.code === currency && (
                <svg className="w-4 h-4 ml-auto text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Investment Amount Selector Component
export const InvestmentAmountSelector = ({ onAmountSelect, selectedAmount }) => {
  const { currency, getInvestmentAmounts, formatCurrency } = useCurrency();
  const [customAmount, setCustomAmount] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const amounts = getInvestmentAmounts();

  const handleCustomAmountSubmit = () => {
    const amount = parseFloat(customAmount);
    if (amount > 0) {
      onAmountSelect(amount);
      setShowCustom(false);
      setCustomAmount('');
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Choose Investment Amount</h3>
      
      {/* Preset amounts */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {amounts.map((amount) => (
          <button
            key={amount}
            onClick={() => onAmountSelect(amount)}
            className={`p-4 border-2 rounded-lg text-center font-medium transition-all ${
              selectedAmount === amount
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            {formatCurrency(amount)}
          </button>
        ))}
      </div>

      {/* Custom amount */}
      <div className="border-t pt-4">
        {!showCustom ? (
          <button
            onClick={() => setShowCustom(true)}
            className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
          >
            Custom Amount
          </button>
        ) : (
          <div className="flex space-x-2">
            <input
              type="number"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder={`Enter amount in ${currency}`}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleCustomAmountSubmit}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Set
            </button>
            <button
              onClick={() => {
                setShowCustom(false);
                setCustomAmount('');
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Property Price Display Component
export const PropertyPriceDisplay = ({ property, showB2BPricing = false }) => {
  const { currency, convertAmount, formatCurrency } = useCurrency();

  // B2B always shows INR
  if (showB2BPricing) {
    return (
      <div className="space-y-2">
        <div className="text-2xl font-bold text-gray-900">
          {formatCurrency(property.valuation.inr, 'INR')}
        </div>
        <div className="text-sm text-gray-600">
          Property Value • INR
        </div>
        <div className="text-lg font-semibold text-blue-600">
          Tokenize from {formatCurrency(property.tokenization.tokenPrice.minInvestment.inr, 'INR')}
        </div>
      </div>
    );
  }

  // Consumer pricing converts to user's currency
  const convertedValue = convertAmount(property.valuation.inr, 'INR', currency);
  const convertedMinInvestment = convertAmount(
    property.tokenization.tokenPrice.minInvestment.inr, 
    'INR', 
    currency
  );

  return (
    <div className="space-y-2">
      <div className="text-2xl font-bold text-gray-900">
        {formatCurrency(convertedValue, currency)}
      </div>
      <div className="text-sm text-gray-600">
        Total Property Value • {currency}
      </div>
      <div className="text-lg font-semibold text-blue-600">
        Own from {formatCurrency(convertedMinInvestment, currency)}
      </div>
    </div>
  );
};

// Currency-Aware Call-to-Action Component
export const CurrencyAwareCTA = ({ amount, type = 'invest', className = '' }) => {
  const { currency, formatCurrency, getCurrencyMessage } = useCurrency();

  const getButtonText = () => {
    switch (type) {
      case 'invest':
        return amount 
          ? `Invest ${formatCurrency(amount, currency)}` 
          : getCurrencyMessage('cta');
      case 'start':
        return getCurrencyMessage('cta');
      case 'tokenize':
        return amount 
          ? `Tokenize ${formatCurrency(amount, 'INR')}` 
          : 'Tokenize Your Property';
      default:
        return 'Get Started';
    }
  };

  return (
    <button className={`bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors ${className}`}>
      {getButtonText()}
    </button>
  );
};

export default { useCurrency, CurrencyProvider, CurrencySelector, InvestmentAmountSelector, PropertyPriceDisplay, CurrencyAwareCTA };