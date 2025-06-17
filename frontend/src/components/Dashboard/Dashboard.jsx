import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRTL } from '../../hooks/useRTL';
import axios from 'axios';
import PaymentIntegration from '../Payment/PaymentIntegration.jsx';
import SubscriptionPlans from '../Subscription/SubscriptionPlans';
import TransactionHistory from '../Payment/TransactionHistory.jsx';
import IntercomChat from '../Support/IntercomChat';
import AnalyticsDashboard from './AnalyticsDashboard';
import { Building2, TrendingUp, MapPin, Star, Shield, Zap } from 'lucide-react';
import uaeConfig from '../../config/uaeConfig.json';

const Dashboard = () => {
  const { t, i18n } = useTranslation(['common', 'uae']);
  const { isRTL, direction } = useRTL();
  
  const [tokens, setTokens] = useState([]);
  const [properties, setProperties] = useState([]);
  const [currency, setCurrency] = useState('AED'); // Default to AED for UAE market
  const [rates, setRates] = useState({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({ 
    id: 'uae-user-001', 
    email: 'investor@example.ae', 
    name: 'Ahmed Al Mansouri', 
    role: 'investor',
    preferredCurrency: 'AED',
    location: { emirate: 'Dubai', zone: 'Downtown Dubai' }
  });

  useEffect(() => {
    // Initialize with UAE properties data
    const uaeProperties = [
      {
        id: 'downtown_dubai_001',
        title: { en: 'Luxury Apartment Downtown Dubai', ar: 'شقة فاخرة وسط مدينة دبي' },
        location: { city: 'Dubai', zone: 'Downtown Dubai', zoneCode: 'DXB_DT' },
        value: { aed: 2500000, usd: 680000, eur: 625000 },
        tokenCode: 'DTDXB001',
        developer: 'EMAAR',
        propertyType: 'apartment',
        roi: 8.5,
        status: 'active'
      },
      {
        id: 'dubai_marina_002', 
        title: { en: 'Marina View Penthouse', ar: 'بنتهاوس بإطلالة على المرينا' },
        location: { city: 'Dubai', zone: 'Dubai Marina', zoneCode: 'DXB_MR' },
        value: { aed: 4200000, usd: 1140000, eur: 1050000 },
        tokenCode: 'MRDXB002',
        developer: 'MERAAS',
        propertyType: 'penthouse',
        roi: 7.2,
        status: 'active'
      },
      {
        id: 'business_bay_003',
        title: { en: 'Commercial Office Business Bay', ar: 'مكتب تجاري في الخليج التجاري' },
        location: { city: 'Dubai', zone: 'Business Bay', zoneCode: 'DXB_BB' },
        value: { aed: 1800000, usd: 490000, eur: 450000 },
        tokenCode: 'BBDXB003',
        developer: 'DAMAC',
        propertyType: 'office',
        roi: 9.1,
        status: 'active'
      }
    ];

    setProperties(uaeProperties);
    setTokens([
      { id: '1', code: 'DTDXB001', amount: 25, value: { aed: 62500, usd: 17000 } },
      { id: '2', code: 'MRDXB002', amount: 12, value: { aed: 50400, usd: 13680 } }
    ]);

    // Fetch AED-based exchange rates
    axios.get('https://api.exchangerate-api.com/v4/latest/AED')
      .then(response => {
        setRates(response.data.rates);
        setLoading(false);
      })
      .catch(error => {
        console.error('Exchange rate fetch error:', error);
        // Fallback rates
        setRates({ USD: 0.27, EUR: 0.25, GBP: 0.22, SAR: 1.02, QAR: 0.99 });
        setLoading(false);
      });
  }, []);

  const handleCurrencyChange = (newCurrency) => {
    setCurrency(newCurrency);
  };

  const formatCurrency = (amount, currencyCode = currency) => {
    if (!amount) return '0';
    
    const value = currencyCode === 'AED' ? amount : amount * (rates[currencyCode] || 1);
    const formatter = new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-AE' : 'en-AE', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    
    return formatter.format(value);
  };

  const totalPortfolioValue = tokens.reduce((sum, token) => sum + (token.value?.aed || 0), 0);
  const totalROI = properties.length > 0 ? properties.reduce((sum, prop) => sum + prop.roi, 0) / properties.length : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="uae-shimmer w-16 h-16 border-4 border-uae-gold rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-arabic">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 ${direction}`}>
      {/* UAE Hero Section */}
      <div className="uae-hero bg-uae-gradient text-white py-16 px-4">
        <div className="container mx-auto text-center">
          <div className="mb-6">
            <span className="text-4xl uae-flag-wave inline-block">🇦🇪</span>
          </div>
          <h1 className={`text-4xl md:text-6xl font-bold mb-4 font-luxury ${isRTL ? 'font-arabic' : ''}`}>
            {t('uae:platform.welcome')}
          </h1>
          <p className={`text-xl md:text-2xl mb-8 opacity-90 ${isRTL ? 'font-arabic' : ''}`}>
            {t('uae:platform.tagline')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="glass-card text-center">
              <Building2 className="w-12 h-12 mx-auto mb-4 text-uae-gold" />
              <h3 className="font-bold text-lg mb-2">{t('uae:investment.features.blockchain_security')}</h3>
              <p className="text-sm opacity-80">{t('uae:investment.benefits.transparency')}</p>
            </div>
            <div className="glass-card text-center">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 text-uae-gold" />
              <h3 className="font-bold text-lg mb-2">{t('uae:investment.features.real_time_trading')}</h3>
              <p className="text-sm opacity-80">{t('uae:investment.benefits.liquidity')}</p>
            </div>
            <div className="glass-card text-center">
              <Shield className="w-12 h-12 mx-auto mb-4 text-uae-gold" />
              <h3 className="font-bold text-lg mb-2">{t('uae:investment.features.regulatory_compliance')}</h3>
              <p className="text-sm opacity-80">{t('uae:investment.benefits.regulatory_protection')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Currency Selector & User Welcome */}
        <div className="uae-card mb-8">
          <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div>
              <h2 className={`text-2xl font-bold text-emirates-blue ${isRTL ? 'font-arabic text-right' : ''}`}>
                {t('common.navigation.dashboard')} - {user.name}
              </h2>
              <p className={`text-gray-600 flex items-center mt-2 ${isRTL ? 'flex-row-reverse font-arabic' : ''}`}>
                <MapPin className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {user.location.zone}, {user.location.emirate}
              </p>
            </div>
            
            {/* Currency Selector */}
            <div className="flex items-center space-x-4">
              <label className={`text-sm font-medium text-gray-700 ${isRTL ? 'font-arabic' : ''}`}>
                {t('currency.currency')}:
              </label>
              <div className="flex space-x-2">
                {['AED', 'USD', 'EUR', 'SAR', 'QAR'].map((curr) => (
                  <button
                    key={curr}
                    onClick={() => handleCurrencyChange(curr)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                      currency === curr 
                        ? 'btn-uae-gold text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {curr}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Portfolio Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <h3 className={`text-sm text-gray-600 mb-2 ${isRTL ? 'font-arabic' : ''}`}>
                {t('investment.totalInvestment')}
              </h3>
              <p className="text-2xl font-bold text-emirates-blue">
                {formatCurrency(totalPortfolioValue)}
              </p>
            </div>
            <div className="text-center">
              <h3 className={`text-sm text-gray-600 mb-2 ${isRTL ? 'font-arabic' : ''}`}>
                {t('common.properties')}
              </h3>
              <p className="text-2xl font-bold text-uae-gold">
                {tokens.length}
              </p>
            </div>
            <div className="text-center">
              <h3 className={`text-sm text-gray-600 mb-2 ${isRTL ? 'font-arabic' : ''}`}>
                {t('investment.roi')}
              </h3>
              <p className="text-2xl font-bold text-palm-green">
                {totalROI.toFixed(1)}%
              </p>
            </div>
            <div className="text-center">
              <h3 className={`text-sm text-gray-600 mb-2 ${isRTL ? 'font-arabic' : ''}`}>
                {t('common.status')}
              </h3>
              <div className="flex items-center justify-center">
                <Star className="w-5 h-5 text-uae-gold mr-1" />
                <span className="text-lg font-bold text-emirates-blue">Premium</span>
              </div>
            </div>
          </div>
        </div>

        {/* Token Holdings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="uae-card">
            <h2 className={`text-xl font-bold mb-6 text-emirates-blue ${isRTL ? 'font-arabic text-right' : ''}`}>
              {t('navigation.portfolio')}
            </h2>
            <div className="space-y-4">
              {tokens.map((token) => {
                const property = properties.find(p => p.tokenCode === token.code);
                return (
                  <div key={token.id} className="property-card-uae">
                    <div className={`flex justify-between items-start ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className={isRTL ? 'text-right' : ''}>
                        <h3 className={`font-bold text-lg ${isRTL ? 'font-arabic' : ''}`}>
                          {property?.title?.[i18n.language] || token.code}
                        </h3>
                        <p className={`text-gray-600 property-location-uae ${isRTL ? 'flex-row-reverse font-arabic' : ''}`}>
                          <MapPin className={`w-4 h-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                          {property?.location?.zone}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {token.amount} {t('trading.tokens')} • {property?.developer}
                        </p>
                      </div>
                      <div className={`text-right ${isRTL ? 'text-left' : ''}`}>
                        <p className="property-price-uae">
                          {formatCurrency(token.value?.aed)}
                        </p>
                        <p className="text-sm text-palm-green flex items-center">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          +{property?.roi}%
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* UAE Property Marketplace Preview */}
          <div className="uae-card">
            <h2 className={`text-xl font-bold mb-6 text-emirates-blue ${isRTL ? 'font-arabic text-right' : ''}`}>
              {t('uae:marketing.headlines.invest_uae')}
            </h2>
            <div className="space-y-4">
              {properties.slice(0, 3).map((property) => (
                <div key={property.id} className="border-l-4 border-uae-gold pl-4 py-2">
                  <h3 className={`font-semibold ${isRTL ? 'font-arabic text-right' : ''}`}>
                    {property.title[i18n.language]}
                  </h3>
                  <div className={`flex items-center justify-between mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-sm text-gray-600">
                      {property.location.zone} • {property.developer}
                    </span>
                    <span className="font-bold text-emirates-blue">
                      {formatCurrency(property.value.aed)}
                    </span>
                  </div>
                  <div className={`flex items-center mt-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-xs bg-palm-green text-white px-2 py-1 rounded">
                      {property.roi}% {t('investment.roi')}
                    </span>
                  </div>
                </div>
              ))}
              <button className="btn-uae-primary w-full mt-4">
                {t('uae:marketing.call_to_action.explore_properties')}
              </button>
            </div>
          </div>
        </div>

        {/* Investment Tiers for UAE Market */}
        <div className="uae-card mb-8">
          <h2 className={`text-xl font-bold mb-6 text-emirates-blue ${isRTL ? 'font-arabic text-right' : ''}`}>
            {t('uae:investment.tiers.retail.name')} • {t('uae:investment.tiers.premium.name')} • {t('uae:investment.tiers.institutional.name')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(uaeConfig.investment.tiers).map(([tierKey, tier]) => (
              <div key={tierKey} className="trading-panel-uae text-center">
                <h3 className={`font-bold text-lg mb-2 ${isRTL ? 'font-arabic' : ''}`}>
                  {t(`uae:investment.tiers.${tierKey}.name`)}
                </h3>
                <p className="text-2xl font-bold text-uae-gold mb-2">
                  {formatCurrency(tier.minAmount)}
                </p>
                <p className={`text-sm text-gray-600 mb-4 ${isRTL ? 'font-arabic' : ''}`}>
                  {t(`uae:investment.tiers.${tierKey}.description`)}
                </p>
                <button className="btn-uae-primary w-full">
                  {t('investment.invest')}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Include Other Components */}
        <div className="space-y-8">
          <AnalyticsDashboard userId={user.id} />
          <PaymentIntegration userId={user.id} />
          <SubscriptionPlans role="investor" userId={user.id} />
          <TransactionHistory userId={user.id} />
          <IntercomChat user={user} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
