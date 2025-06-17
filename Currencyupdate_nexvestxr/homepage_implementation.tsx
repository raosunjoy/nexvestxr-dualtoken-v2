import React, { useState, useEffect } from 'react';
import { 
  useCurrency, 
  CurrencySelector, 
  InvestmentAmountSelector, 
  PropertyPriceDisplay, 
  CurrencyAwareCTA 
} from './hooks/useCurrency';
import { 
  Smartphone, 
  Globe, 
  Zap, 
  Shield, 
  TrendingUp, 
  Users, 
  Building, 
  Clock,
  CheckCircle,
  ArrowRight,
  Play
} from 'lucide-react';

// Main Homepage Component
const NexVestXRHomepage = () => {
  const { 
    currency, 
    formatCurrency, 
    getCurrencyMessage, 
    getInvestmentAmounts,
    convertAmount,
    loading 
  } = useCurrency();

  const [selectedAmount, setSelectedAmount] = useState(null);
  const [showInvestmentModal, setShowInvestmentModal] = useState(false);
  const [userType, setUserType] = useState('consumer'); // consumer, property_owner, developer

  // Set default investment amount based on currency
  useEffect(() => {
    if (!loading && !selectedAmount) {
      const amounts = getInvestmentAmounts();
      setSelectedAmount(amounts[1]); // Second option as default
    }
  }, [currency, loading]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <HeroSection 
        currency={currency}
        selectedAmount={selectedAmount}
        onAmountSelect={setSelectedAmount}
        onInvestClick={() => setShowInvestmentModal(true)}
      />

      {/* User Type Selection */}
      <UserTypeSection userType={userType} setUserType={setUserType} />

      {/* Features Section */}
      <FeaturesSection currency={currency} />

      {/* Token Comparison */}
      <TokenComparisonSection currency={currency} userType={userType} />

      {/* Statistics */}
      <StatisticsSection currency={currency} />

      {/* How It Works */}
      <HowItWorksSection currency={currency} userType={userType} />

      {/* Success Stories */}
      <SuccessStoriesSection currency={currency} />

      {/* CTA Section */}
      <CTASection currency={currency} selectedAmount={selectedAmount} />

      {/* Footer */}
      <Footer />

      {/* Investment Modal */}
      {showInvestmentModal && (
        <InvestmentModal 
          onClose={() => setShowInvestmentModal(false)}
          selectedAmount={selectedAmount}
          currency={currency}
        />
      )}
    </div>
  );
};

// Header Component
const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                NexVestXR
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            <a href="#features" className="text-gray-700 hover:text-blue-600 transition-colors">Features</a>
            <a href="#tokens" className="text-gray-700 hover:text-blue-600 transition-colors">Tokens</a>
            <a href="#how-it-works" className="text-gray-700 hover:text-blue-600 transition-colors">How It Works</a>
            <a href="#about" className="text-gray-700 hover:text-blue-600 transition-colors">About</a>
          </nav>

          {/* Currency Selector & CTA */}
          <div className="flex items-center space-x-4">
            <CurrencySelector className="hidden sm:block" />
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Start Investing
            </button>
          </div>

          {/* Mobile menu button */}
          <button 
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col space-y-4">
              <CurrencySelector />
              <nav className="flex flex-col space-y-2">
                <a href="#features" className="text-gray-700 hover:text-blue-600 py-2">Features</a>
                <a href="#tokens" className="text-gray-700 hover:text-blue-600 py-2">Tokens</a>
                <a href="#how-it-works" className="text-gray-700 hover:text-blue-600 py-2">How It Works</a>
                <a href="#about" className="text-gray-700 hover:text-blue-600 py-2">About</a>
              </nav>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

// Hero Section
const HeroSection = ({ currency, selectedAmount, onAmountSelect, onInvestClick }) => {
  const { formatCurrency, getCurrencyMessage } = useCurrency();

  const getHeroHeadline = () => {
    const headlines = {
      'USD': 'Mobile-First Cross-Border Real Estate Investment',
      'EUR': 'European Gateway to Indian Real Estate',
      'GBP': 'From London to Mumbai in 31 Seconds',
      'SGD': 'Singapore to India Real Estate Bridge',
      'INR': 'India\'s Mobile-First Real Estate Platform'
    };
    return headlines[currency] || headlines['USD'];
  };

  return (
    <section className="bg-gradient-to-br from-blue-50 via-white to-purple-50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight">
                {getHeroHeadline()}
                <span className="block text-blue-600">with AI-Verified Services on XRPL</span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                Fast, Efficient, No Hassles. Invest in real estate from your mobile in just 31 seconds. 
                30s AI verification + 3s XRPL settlement.
              </p>
            </div>

            {/* Key Benefits */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-gray-700">{getCurrencyMessage('minInvestment')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-gray-700">31-second investment</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-gray-700">70+ countries access</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-gray-700">AI-verified security</span>
              </div>
            </div>

            {/* Investment Amount Selector */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
              <InvestmentAmountSelector 
                onAmountSelect={onAmountSelect}
                selectedAmount={selectedAmount}
              />
              <div className="mt-4 flex space-x-3">
                <CurrencyAwareCTA 
                  amount={selectedAmount}
                  type="invest"
                  className="flex-1"
                />
                <button className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                  Watch Demo
                </button>
              </div>
            </div>

            {/* Success Metric */}
            <div className="text-center lg:text-left">
              <p className="text-gray-600">
                <span className="font-semibold text-blue-600">{formatCurrency(50000000, currency)}</span> already invested by 
                <span className="font-semibold"> 25,000+ global investors</span>
              </p>
            </div>
          </div>

          {/* Right Column - Visual */}
          <div className="relative">
            <div className="relative z-10">
              <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-200">
                <div className="text-center space-y-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <Smartphone className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Mobile-First Platform</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">1. AI Document Verification</span>
                      <span className="text-green-600 font-semibold">30 seconds</span>
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">2. XRPL Settlement</span>
                      <span className="text-green-600 font-semibold">3 seconds</span>
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 bg-blue-50 rounded-lg border border-blue-200">
                      <span className="text-blue-700 font-semibold">Total Investment Time</span>
                      <span className="text-blue-600 font-bold">31 seconds</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-2xl transform rotate-3 scale-105 opacity-10"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

// User Type Selection Section
const UserTypeSection = ({ userType, setUserType }) => {
  const userTypes = [
    {
      id: 'consumer',
      title: 'I Want to Invest',
      subtitle: 'Start with small amounts, build wealth',
      icon: TrendingUp,
      color: 'blue'
    },
    {
      id: 'property_owner',
      title: 'I Own Property',
      subtitle: 'Tokenize and access global investors',
      icon: Building,
      color: 'green'
    },
    {
      id: 'developer',
      title: 'I\'m a Developer',
      subtitle: 'Fund projects with premium tokens',
      icon: Users,
      color: 'purple'
    }
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Path</h2>
          <p className="text-xl text-gray-600">Select your role to see personalized features and pricing</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {userTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = userType === type.id;
            
            return (
              <button
                key={type.id}
                onClick={() => setUserType(type.id)}
                className={`p-8 rounded-xl border-2 transition-all text-left ${
                  isSelected 
                    ? `border-${type.color}-500 bg-${type.color}-50 shadow-lg transform scale-105` 
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                }`}
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                  isSelected ? `bg-${type.color}-100` : 'bg-gray-100'
                }`}>
                  <Icon className={`h-6 w-6 ${
                    isSelected ? `text-${type.color}-600` : 'text-gray-600'
                  }`} />
                </div>
                <h3 className={`text-xl font-semibold mb-2 ${
                  isSelected ? `text-${type.color}-900` : 'text-gray-900'
                }`}>
                  {type.title}
                </h3>
                <p className="text-gray-600">{type.subtitle}</p>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// Features Section
const FeaturesSection = ({ currency }) => {
  const { formatCurrency } = useCurrency();

  const features = [
    {
      icon: Smartphone,
      title: '31-Second Investment',
      description: '30s AI verification + 3s XRPL settlement. Fastest real estate investment globally.',
      highlight: '10x faster than traditional'
    },
    {
      icon: Globe,
      title: '70+ Countries Access',
      description: 'Invest from anywhere in the world. No forex hassles, direct mobile payments.',
      highlight: 'Global reach'
    },
    {
      icon: Shield,
      title: 'AI-Verified Security',
      description: 'Machine learning document verification and blockchain security combined.',
      highlight: 'Bank-grade security'
    },
    {
      icon: Zap,
      title: 'XRPL Powered',
      description: '3-second settlements, minimal fees, 24/7 trading on the world\'s fastest blockchain.',
      highlight: 'Lightning fast'
    }
  ];

  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Revolutionary Technology</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            World's first mobile-first cross-border real estate platform with AI-verified services on XRPL
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={index} className="text-center group">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-200 transition-colors">
                  <Icon className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 mb-3">{feature.description}</p>
                <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                  {feature.highlight}
                </span>
              </div>
            );
          })}
        </div>

        {/* Live Demo Section */}
        <div className="mt-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-4">See It In Action</h3>
          <p className="text-xl mb-6 opacity-90">
            Watch how {formatCurrency(1000, currency)} becomes Mumbai real estate in 31 seconds
          </p>
          <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center space-x-2">
            <Play className="h-5 w-5" />
            <span>Watch Live Demo</span>
          </button>
        </div>
      </div>
    </section>
  );
};

// Token Comparison Section
const TokenComparisonSection = ({ currency, userType }) => {
  const { formatCurrency, convertAmount } = useCurrency();

  const getTokenData = () => {
    if (userType === 'developer') {
      return {
        title: 'PROPX Premium Tokens',
        subtitle: 'Institutional-grade projects for premium developers',
        tokens: [
          {
            name: 'PROPX Premium',
            type: 'Premium Developer Token',
            minInvestment: convertAmount(1000000, 'INR', currency), // ₹10 Lakh min
            features: [
              'Tier-1 developer partnerships',
              'Institutional investor access',
              'Branded token structure',
              'Enhanced due diligence',
              '48-hour funding cycles',
              'Global distribution network'
            ],
            highlight: 'For Developers',
            bgColor: 'bg-purple-50',
            borderColor: 'border-purple-200',
            textColor: 'text-purple-600'
          }
        ]
      };
    }

    return {
      title: 'Choose Your Token Type',
      subtitle: 'XERA for everyone, PROPX for premium investments',
      tokens: [
        {
          name: 'XERA Token',
          type: 'Consumer & Property Owner',
          minInvestment: convertAmount(1000, 'INR', currency),
          features: [
            userType === 'property_owner' ? 'Tokenize any property' : 'Start with small amounts',
            'Diversified portfolios',
            'Mobile-first platform',
            '24/7 global trading',
            'AI-verified properties',
            'Quarterly rental income'
          ],
          highlight: userType === 'property_owner' ? 'Tokenize Properties' : 'For Everyone',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-600'
        },
        {
          name: 'PROPX Token',
          type: 'Premium Properties',
          minInvestment: convertAmount(500000, 'INR', currency), // ₹5 Lakh min
          features: [
            'Premium tier-1 projects',
            'Higher return potential',
            'Institutional partnerships',
            'Exclusive property access',
            'Priority allocation',
            'Developer direct communication'
          ],
          highlight: 'Premium Only',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          textColor: 'text-purple-600'
        }
      ]
    };
  };

  const tokenData = getTokenData();

  return (
    <section id="tokens" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">{tokenData.title}</h2>
          <p className="text-xl text-gray-600">{tokenData.subtitle}</p>
        </div>

        <div className={`grid grid-cols-1 ${tokenData.tokens.length > 1 ? 'md:grid-cols-2' : ''} gap-8 max-w-5xl mx-auto`}>
          {tokenData.tokens.map((token, index) => (
            <div key={index} className={`${token.bgColor} ${token.borderColor} border-2 rounded-2xl p-8 relative overflow-hidden`}>
              {/* Highlight Badge */}
              <div className={`absolute top-4 right-4 ${token.bgColor.replace('50', '100')} ${token.textColor} px-3 py-1 rounded-full text-sm font-semibold`}>
                {token.highlight}
              </div>

              {/* Token Info */}
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{token.name}</h3>
                <p className="text-gray-600 mb-4">{token.type}</p>
                <div className="text-3xl font-bold text-gray-900">
                  {userType === 'developer' || userType === 'property_owner' ? 
                    formatCurrency(token.minInvestment, 'INR') : 
                    formatCurrency(token.minInvestment, currency)
                  }
                </div>
                <p className="text-gray-600">Minimum investment</p>
              </div>

              {/* Features */}
              <div className="space-y-3 mb-8">
                {token.features.map((feature, featureIndex) => (
                  <div key={featureIndex} className="flex items-center space-x-3">
                    <CheckCircle className={`h-5 w-5 ${token.textColor}`} />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                token.name === 'XERA Token' 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}>
                {userType === 'developer' ? 'Launch PROPX Token' :
                 userType === 'property_owner' ? 'Tokenize Property' :
                 token.name === 'XERA Token' ? 'Start with XERA' : 'Invest in PROPX'}
              </button>
            </div>
          ))}
        </div>

        {/* B2B Messaging for Property Owners and Developers */}
        {(userType === 'property_owner' || userType === 'developer') && (
          <div className="mt-16 bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {userType === 'developer' ? 'Transform Your Business' : 'Unlock Your Property Value'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {userType === 'developer' ? '₹50 Cr+' : '₹30 Lakh+'}
                  </div>
                  <p className="text-gray-600">
                    {userType === 'developer' ? 'Raised in 48 hours' : 'Instant liquidity'}
                  </p>
                </div>
                <div>
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {userType === 'developer' ? '15+ countries' : '70+ countries'}
                  </div>
                  <p className="text-gray-600">Global investor reach</p>
                </div>
                <div>
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {userType === 'developer' ? '2.5%' : '2.5%'}
                  </div>
                  <p className="text-gray-600">Platform fee vs 8-12% traditional</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

// Statistics Section
const StatisticsSection = ({ currency }) => {
  const { formatCurrency } = useCurrency();

  const stats = [
    {
      value: formatCurrency(50000000, currency),
      label: 'Total Investment',
      growth: '+150% this quarter'
    },
    {
      value: '25,000+',
      label: 'Global Investors',
      growth: '70+ countries'
    },
    {
      value: '500+',
      label: 'Properties Tokenized',
      growth: '6 major cities'
    },
    {
      value: '31 seconds',
      label: 'Average Investment Time',
      growth: '10x faster than traditional'
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Platform Performance</h2>
          <p className="text-xl opacity-90">Real-time statistics from our global platform</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-4xl md:text-5xl font-bold mb-2">{stat.value}</div>
              <div className="text-xl mb-2 opacity-90">{stat.label}</div>
              <div className="text-sm opacity-75">{stat.growth}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// How It Works Section
const HowItWorksSection = ({ currency, userType }) => {
  const { formatCurrency } = useCurrency();

  const getSteps = () => {
    if (userType === 'property_owner') {
      return [
        {
          step: '1',
          title: 'Submit Property Details',
          description: 'Upload property documents and details on our mobile platform',
          time: '5 minutes',
          icon: Building
        },
        {
          step: '2',
          title: 'AI Verification',
          description: 'Our AI verifies documents and creates property valuation',
          time: '30 seconds',
          icon: Shield
        },
        {
          step: '3',
          title: 'Global Launch',
          description: 'Your XERA tokens go live to 70+ countries of investors',
          time: 'Instant',
          icon: Globe
        },
        {
          step: '4',
          title: 'Receive Funding',
          description: 'Get immediate liquidity while retaining ownership control',
          time: '24-48 hours',
          icon: TrendingUp
        }
      ];
    }

    if (userType === 'developer') {
      return [
        {
          step: '1',
          title: 'Project Assessment',
          description: 'Submit premium project for PROPX token eligibility',
          time: '1 day',
          icon: Building
        },
        {
          step: '2',
          title: 'Due Diligence',
          description: 'Enhanced verification for institutional-grade projects',
          time: '3-5 days',
          icon: Shield
        },
        {
          step: '3',
          title: 'PROPX Token Launch',
          description: 'Launch branded tokens to global premium investors',
          time: '24 hours',
          icon: Zap
        },
        {
          step: '4',
          title: 'Rapid Funding',
          description: 'Access ₹10-50 Cr from international retail investors',
          time: '48 hours',
          icon: TrendingUp
        }
      ];
    }

    return [
      {
        step: '1',
        title: 'Download XUMM Wallet',
        description: 'Get the mobile-first wallet for instant XRPL transactions',
        time: '2 minutes',
        icon: Smartphone
      },
      {
        step: '2',
        title: 'Choose Investment',
        description: `Select properties and investment amount starting from ${formatCurrency(12, currency)}`,
        time: '1 minute',
        icon: Building
      },
      {
        step: '3',
        title: 'AI Verification',
        description: 'Quick KYC and property verification using AI technology',
        time: '30 seconds',
        icon: Shield
      },
      {
        step: '4',
        title: 'Own Real Estate',
        description: 'XRPL settlement completes and you own real estate tokens',
        time: '3 seconds',
        icon: CheckCircle
      }
    ];
  };

  const steps = getSteps();

  return (
    <section id="how-it-works" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
          <p className="text-xl text-gray-600">
            {userType === 'property_owner' ? 'Turn your property into a global investment opportunity' :
             userType === 'developer' ? 'Access global capital for your premium projects' :
             'Start investing in real estate from your mobile in minutes'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="text-center relative">
                {/* Connection Line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-1/2 w-full h-0.5 bg-gradient-to-r from-blue-200 to-purple-200 transform translate-x-1/2 z-0"></div>
                )}

                {/* Step Circle */}
                <div className="relative z-10 w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center">
                    <Icon className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-sm font-bold px-2 py-1 rounded">
                    {step.step}
                  </div>
                </div>

                {/* Step Content */}
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-600 mb-3">{step.description}</p>
                <div className="inline-block px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                  {step.time}
                </div>
              </div>
            );
          })}
        </div>

        {/* Total Time */}
        <div className="mt-16 text-center">
          <div className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl">
            <div className="text-2xl font-bold">
              {userType === 'developer' ? 'Total Time: 5-7 days vs 6 months traditional' :
               userType === 'property_owner' ? 'Total Time: 48 hours vs 6 months traditional' :
               'Total Time: 31 seconds vs 30-90 days traditional'}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// Success Stories Section
const SuccessStoriesSection = ({ currency }) => {
  const { formatCurrency } = useCurrency();

  const stories = [
    {
      name: 'Rajesh Kumar',
      location: 'Silicon Valley → Mumbai',
      story: `Invested ${formatCurrency(5000, currency)} from my iPhone during commute. Now earning 15% annual returns from Mumbai real estate.`,
      investment: formatCurrency(5000, currency),
      returns: '15% annually',
      flag: currency === 'USD' ? '🇺🇸' : '🌍'
    },
    {
      name: 'Priya Sharma',
      location: 'London → Bangalore',
      story: `Tokenized my Pune apartment for ₹30 Lakh liquidity while keeping 70% ownership. Global investors love it!`,
      investment: '₹1.5 Cr property',
      returns: '₹30L liquidity',
      flag: '🇬🇧'
    },
    {
      name: 'Singapore Family',
      location: 'Singapore → Delhi',
      story: `Building our India real estate portfolio with ${formatCurrency(500, currency)} monthly investments. Already own 5 properties!`,
      investment: `${formatCurrency(500, currency)}/month`,
      returns: '5 properties',
      flag: '🇸🇬'
    }
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Success Stories</h2>
          <p className="text-xl text-gray-600">Real investors, real returns, real success</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {stories.map((story, index) => (
            <div key={index} className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
              <div className="text-4xl mb-4">{story.flag}</div>
              <blockquote className="text-gray-700 mb-6 italic">"{story.story}"</blockquote>
              <div className="border-t pt-4">
                <div className="font-semibold text-gray-900">{story.name}</div>
                <div className="text-sm text-gray-600 mb-3">{story.location}</div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-600 font-medium">Investment: {story.investment}</span>
                  <span className="text-green-600 font-medium">Returns: {story.returns}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Social Proof */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 text-lg">
            Join <span className="font-semibold text-blue-600">25,000+ investors</span> from 
            <span className="font-semibold"> 70+ countries</span> building wealth through real estate
          </p>
        </div>
      </div>
    </section>
  );
};

// CTA Section
const CTASection = ({ currency, selectedAmount }) => {
  const { formatCurrency, getCurrencyMessage } = useCurrency();

  return (
    <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-6">
          Ready to Start Building Wealth?
        </h2>
        <p className="text-xl mb-8 opacity-90">
          {getCurrencyMessage('success')} in just 31 seconds. Join the mobile real estate revolution.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <CurrencyAwareCTA 
            amount={selectedAmount}
            type="start"
            className="text-lg px-8 py-4 bg-white text-blue-600 hover:bg-gray-100"
          />
          <button className="text-lg px-8 py-4 border-2 border-white text-white hover:bg-white hover:text-blue-600 rounded-lg transition-colors">
            Watch Demo First
          </button>
        </div>

        <div className="mt-8 text-sm opacity-75">
          <p>✓ SEC compliant • ✓ Bank-grade security • ✓ 70+ countries • ✓ 24/7 trading</p>
        </div>
      </div>
    </section>
  );
};

// Footer
const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
              NexVestXR
            </div>
            <p className="text-gray-400 mb-6 max-w-md">
              World's first mobile-first cross-border real estate investment platform with AI-verified services on XRPL. 
              Fast, efficient, no hassles.
            </p>
            <div className="space-y-2 text-sm text-gray-400">
              <p>✓ 31-second investment process</p>
              <p>✓ 70+ countries global access</p>
              <p>✓ AI-verified security</p>
              <p>✓ XRPL-powered settlements</p>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Platform</h3>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">XERA Tokens</a></li>
              <li><a href="#" className="hover:text-white transition-colors">PROPX Tokens</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Tokenize Property</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Developer Portal</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Mobile App</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            © 2025 NexVestXR. All rights reserved. Built on XRPL.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="text-gray-400 hover:text-white transition-colors">Twitter</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">LinkedIn</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">Telegram</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">Discord</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

// Loading Screen
const LoadingScreen = () => {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
        <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          NexVestXR
        </div>
        <p className="text-gray-600 mt-2">Loading your personalized experience...</p>
      </div>
    </div>
  );
};

// Investment Modal
const InvestmentModal = ({ onClose, selectedAmount, currency }) => {
  const { formatCurrency } = useCurrency();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Start Your Investment</h3>
          <p className="text-gray-600 mb-6">
            You're about to invest {formatCurrency(selectedAmount, currency)} in tokenized real estate
          </p>

          <div className="space-y-4 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Next Steps:</h4>
              <ol className="text-left text-blue-800 space-y-1">
                <li>1. Download XUMM wallet</li>
                <li>2. Complete quick KYC (30 seconds)</li>
                <li>3. Select properties to invest in</li>
                <li>4. Complete investment (3 seconds)</li>
              </ol>
            </div>
          </div>

          <div className="space-y-3">
            <button className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              Download XUMM & Start
            </button>
            <button 
              onClick={onClose}
              className="w-full text-gray-600 hover:text-gray-800 transition-colors"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NexVestXRHomepage;