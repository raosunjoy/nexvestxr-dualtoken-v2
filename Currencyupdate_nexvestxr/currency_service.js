// services/CurrencyService.js
// Complete currency service for NexVestXR platform

const axios = require('axios');
const { ExchangeRate, User } = require('../database/schemas/currencySchemas');

class CurrencyService {
  constructor() {
    this.supportedCurrencies = ['AED', 'USD', 'EUR', 'GBP', 'SGD', 'INR', 'SAR', 'QAR', 'KWD'];
    this.baseCurrency = 'AED'; // UAE Dirham as primary currency
    this.exchangeRateApi = 'https://api.exchangerate-api.com/v4/latest/AED';
    this.geoLocationApi = 'http://ip-api.com/json/';
    
    // Country to currency mapping - UAE focused
    this.countryToCurrency = {
      'AE': 'AED', 'UAE': 'AED', 'United Arab Emirates': 'AED',
      'SA': 'SAR', 'Saudi Arabia': 'SAR',
      'QA': 'QAR', 'Qatar': 'QAR',
      'KW': 'KWD', 'Kuwait': 'KWD',
      'OM': 'OMR', 'Oman': 'OMR',
      'BH': 'BHD', 'Bahrain': 'BHD',
      'US': 'USD', 'USA': 'USD', 'United States': 'USD',
      'GB': 'GBP', 'UK': 'GBP', 'United Kingdom': 'GBP',
      'DE': 'EUR', 'FR': 'EUR', 'ES': 'EUR', 'IT': 'EUR', 'NL': 'EUR',
      'SG': 'SGD', 'Singapore': 'SGD',
      'IN': 'INR', 'India': 'INR'
    };
    
    // Initialize exchange rates
    this.initializeExchangeRates();
    
    // Update rates every 15 minutes
    setInterval(() => {
      this.updateExchangeRates();
    }, 15 * 60 * 1000);
  }

  // Initialize exchange rates on startup
  async initializeExchangeRates() {
    try {
      await this.updateExchangeRates();
      console.log('✅ Exchange rates initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize exchange rates:', error);
      // Use fallback rates
      await this.setFallbackRates();
    }
  }

  // Update exchange rates from external API
  async updateExchangeRates() {
    try {
      const response = await axios.get(this.exchangeRateApi, {
        timeout: 10000
      });
      
      const rates = response.data.rates;
      
      const exchangeRateData = {
        baseCurrency: this.baseCurrency,
        rates: {
          AED: 1.0,              // Base currency
          USD: rates.USD || 0.272, // 1 AED = ~0.272 USD
          EUR: rates.EUR || 0.231, // 1 AED = ~0.231 EUR
          GBP: rates.GBP || 0.198, // 1 AED = ~0.198 GBP
          SGD: rates.SGD || 0.367, // 1 AED = ~0.367 SGD
          INR: rates.INR || 22.6,  // 1 AED = ~22.6 INR
          SAR: rates.SAR || 1.02,  // 1 AED = ~1.02 SAR
          QAR: rates.QAR || 0.991, // 1 AED = ~0.991 QAR
          KWD: rates.KWD || 0.082  // 1 AED = ~0.082 KWD
        },
        lastUpdated: new Date(),
        source: 'exchangerate-api.com'
      };

      // Update or create exchange rate record
      await ExchangeRate.findOneAndUpdate(
        { baseCurrency: this.baseCurrency },
        exchangeRateData,
        { upsert: true, new: true }
      );

      console.log('✅ Exchange rates updated:', exchangeRateData.rates);
      return exchangeRateData.rates;
      
    } catch (error) {
      console.error('❌ Failed to update exchange rates:', error);
      throw error;
    }
  }

  // Set fallback rates if API fails
  async setFallbackRates() {
    const fallbackRates = {
      baseCurrency: this.baseCurrency,
      rates: {
        AED: 1.0,
        USD: 0.272,
        EUR: 0.231,
        GBP: 0.198,
        SGD: 0.367,
        INR: 22.6,
        SAR: 1.02,
        QAR: 0.991,
        KWD: 0.082
      },
      lastUpdated: new Date(),
      source: 'fallback'
    };

    await ExchangeRate.findOneAndUpdate(
      { baseCurrency: this.baseCurrency },
      fallbackRates,
      { upsert: true, new: true }
    );

    console.log('⚠️ Using fallback exchange rates');
    return fallbackRates.rates;
  }

  // Get current exchange rates
  async getCurrentRates() {
    try {
      const exchangeRate = await ExchangeRate.findOne({
        baseCurrency: this.baseCurrency
      }).sort({ lastUpdated: -1 });

      if (!exchangeRate) {
        throw new Error('No exchange rates found');
      }

      // Check if rates are older than 1 hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (exchangeRate.lastUpdated < oneHourAgo) {
        console.log('⚠️ Exchange rates are stale, updating...');
        return await this.updateExchangeRates();
      }

      return exchangeRate.rates;
    } catch (error) {
      console.error('❌ Failed to get current rates:', error);
      return await this.setFallbackRates();
    }
  }

  // Convert amount between currencies
  async convertCurrency(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    const rates = await this.getCurrentRates();
    
    // Convert to AED first (base currency)
    let aedAmount = amount;
    if (fromCurrency !== 'AED') {
      aedAmount = amount / rates[fromCurrency];
    }
    
    // Convert from AED to target currency
    let convertedAmount = aedAmount;
    if (toCurrency !== 'AED') {
      convertedAmount = aedAmount * rates[toCurrency];
    }
    
    return Math.round(convertedAmount * 100) / 100; // Round to 2 decimal places
  }

  // Detect user's country and currency from IP
  async detectUserLocationAndCurrency(ipAddress) {
    try {
      const response = await axios.get(`${this.geoLocationApi}${ipAddress}`, {
        timeout: 5000
      });
      
      const { country, countryCode } = response.data;
      const detectedCurrency = this.countryToCurrency[countryCode] || 
                              this.countryToCurrency[country] || 
                              'USD';

      return {
        country: country,
        countryCode: countryCode,
        detectedCurrency: detectedCurrency,
        timezone: response.data.timezone
      };
    } catch (error) {
      console.error('❌ Failed to detect location:', error);
      return {
        country: 'Unknown',
        countryCode: 'XX',
        detectedCurrency: 'USD',
        timezone: 'UTC'
      };
    }
  }

  // Format currency for display
  formatCurrency(amount, currency, locale = null) {
    const localeMap = {
      'USD': 'en-US',
      'EUR': 'de-DE',
      'GBP': 'en-GB',
      'SGD': 'en-SG',
      'INR': 'en-IN'
    };

    const formatLocale = locale || localeMap[currency] || 'en-US';
    
    try {
      return new Intl.NumberFormat(formatLocale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: currency === 'INR' ? 0 : 2,
        maximumFractionDigits: currency === 'INR' ? 0 : 2
      }).format(amount);
    } catch (error) {
      // Fallback formatting
      const symbols = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'SGD': 'S$',
        'INR': '₹'
      };
      
      const symbol = symbols[currency] || currency;
      const formattedAmount = currency === 'INR' ? 
        Math.round(amount).toLocaleString('en-IN') : 
        amount.toFixed(2);
      
      return `${symbol}${formattedAmount}`;
    }
  }

  // Get currency-specific investment amounts
  getCurrencySpecificAmounts(currency) {
    const investmentAmounts = {
      'AED': [100, 500, 1000, 5000, 10000, 25000],     // AED amounts
      'USD': [25, 100, 250, 1000, 2500, 7500],         // USD amounts
      'EUR': [25, 100, 200, 1000, 2000, 6000],         // EUR amounts
      'GBP': [20, 80, 200, 800, 2000, 5000],           // GBP amounts
      'SGD': [35, 150, 350, 1500, 3500, 10000],        // SGD amounts
      'INR': [2000, 8000, 20000, 80000, 200000, 600000], // INR amounts
      'SAR': [100, 400, 1000, 4000, 10000, 25000],     // SAR amounts
      'QAR': [100, 400, 1000, 4000, 10000, 25000],     // QAR amounts
      'KWD': [25, 100, 250, 1000, 2500, 7500]          // KWD amounts
    };

    return investmentAmounts[currency] || investmentAmounts['AED'];
  }

  // Get currency-specific messaging
  getCurrencySpecificMessaging(currency, messageType, amount = null) {
    const messages = {
      'USD': {
        minInvestment: 'Start with $12 real estate investment',
        averageInvestment: 'Average investment: $300 per user',
        returns: 'Portfolio returns: 12-15% annually',
        cta: amount ? `Invest $${amount} today` : 'Start with $25',
        success: 'Own Mumbai real estate for $12'
      },
      'EUR': {
        minInvestment: 'Start with €10 real estate investment',
        averageInvestment: 'Average investment: €270 per user',
        returns: 'Portfolio returns: 12-15% annually',
        cta: amount ? `Invest €${amount} today` : 'Start with €22',
        success: 'Own Indian real estate for €10'
      },
      'GBP': {
        minInvestment: 'Start with £8 real estate investment',
        averageInvestment: 'Average investment: £240 per user',
        returns: 'Portfolio returns: 12-15% annually',
        cta: amount ? `Invest £${amount} today` : 'Start with £20',
        success: 'Own Mumbai property for £8'
      },
      'SGD': {
        minInvestment: 'Start with S$16 real estate investment',
        averageInvestment: 'Average investment: S$405 per user',
        returns: 'Portfolio returns: 12-15% annually',
        cta: amount ? `Invest S$${amount} today` : 'Start with S$35',
        success: 'Own Indian real estate for S$16'
      },
      'INR': {
        minInvestment: 'Start with ₹1,000 real estate investment',
        averageInvestment: 'Average investment: ₹25,000 per user',
        returns: 'Portfolio returns: 12-15% annually',
        cta: amount ? `Invest ₹${amount} today` : 'Start with ₹2,500',
        success: 'Own premium Mumbai property for ₹1,000'
      }
    };

    return messages[currency]?.[messageType] || messages['USD'][messageType];
  }

  // Convert property pricing for display
  async convertPropertyPricing(propertyData, targetCurrency) {
    if (targetCurrency === 'INR') {
      // For INR, return original INR values
      return {
        totalValue: propertyData.valuation.inr,
        minInvestment: propertyData.tokenization.tokenPrice.minInvestment.inr,
        tokenPrice: propertyData.tokenization.tokenPrice.inr,
        formattedTotalValue: this.formatCurrency(propertyData.valuation.inr, 'INR'),
        formattedMinInvestment: this.formatCurrency(propertyData.tokenization.tokenPrice.minInvestment.inr, 'INR')
      };
    }

    // Convert from INR to target currency
    const rates = await this.getCurrentRates();
    const usdValue = propertyData.valuation.inr / rates.INR;
    const convertedValue = targetCurrency === 'USD' ? usdValue : usdValue * rates[targetCurrency];
    
    const minInvestmentInr = propertyData.tokenization.tokenPrice.minInvestment.inr;
    const usdMinInvestment = minInvestmentInr / rates.INR;
    const convertedMinInvestment = targetCurrency === 'USD' ? usdMinInvestment : usdMinInvestment * rates[targetCurrency];

    return {
      totalValue: Math.round(convertedValue),
      minInvestment: Math.round(convertedMinInvestment * 100) / 100,
      formattedTotalValue: this.formatCurrency(convertedValue, targetCurrency),
      formattedMinInvestment: this.formatCurrency(convertedMinInvestment, targetCurrency)
    };
  }

  // B2B messaging (always INR)
  getB2BMessaging(messageType, amount = null) {
    const b2bMessages = {
      developer: {
        fundraising: 'Raise ₹10-50 Cr in 48 hours vs 6 months traditional',
        investorPool: 'Access ₹500+ Cr global retail investor pool',
        fees: 'Platform fee: 1.5-2.5% vs 8-12% traditional brokerage',
        projectSize: 'Average project size: ₹15 Cr per PROPX token',
        cta: amount ? `Raise ₹${amount} Cr in 48 hours` : 'Launch your ₹15 Cr PROPX token'
      },
      propertyOwner: {
        liquidity: 'Turn ₹1.5 Cr apartment into liquid global investment',
        ownership: 'Sell 30% for ₹45 Lakh, keep 70% ownership',
        fees: 'Platform fee: 2.5% vs 8-12% traditional brokerage',
        investors: 'Access investors with ₹25,000 average investment',
        cta: amount ? `Tokenize your ₹${amount} Cr property` : 'Raise ₹30 Lakh in 48 hours'
      }
    };

    return b2bMessages[messageType] || {};
  }

  // Update user's currency preference
  async updateUserCurrencyPreference(userId, currency) {
    try {
      if (!this.supportedCurrencies.includes(currency)) {
        throw new Error(`Unsupported currency: ${currency}`);
      }

      await User.findByIdAndUpdate(userId, {
        preferredCurrency: currency,
        updatedAt: new Date()
      });

      console.log(`✅ Updated user ${userId} currency preference to ${currency}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to update user currency preference:', error);
      throw error;
    }
  }

  // Calculate investment portfolio value in user's currency
  async calculatePortfolioValue(userId, targetCurrency = null) {
    try {
      const user = await User.findById(userId).populate('investments');
      if (!user) {
        throw new Error('User not found');
      }

      const currency = targetCurrency || user.preferredCurrency || 'USD';
      let totalValue = 0;

      // Get current exchange rates
      const rates = await this.getCurrentRates();

      // Calculate total portfolio value
      for (const investment of user.investments || []) {
        // Convert investment value to target currency
        const usdValue = investment.investment.baseAmount.usd;
        const convertedValue = currency === 'USD' ? 
          usdValue : 
          usdValue * rates[currency];
        
        totalValue += convertedValue;
      }

      return {
        totalValue: Math.round(totalValue * 100) / 100,
        currency: currency,
        formattedValue: this.formatCurrency(totalValue, currency),
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('❌ Failed to calculate portfolio value:', error);
      throw error;
    }
  }
}

module.exports = new CurrencyService();