const CurrencyService = require('../../../backend/src/services/CurrencyService');
const { describe, it, expect, beforeEach, afterEach, jest } = require('@jest/globals');

describe('CurrencyService - UAE Multi-Currency Support', () => {
  let currencyService;
  
  beforeEach(() => {
    // Reset mocks and create fresh service instance
    jest.clearAllMocks();
    currencyService = new CurrencyService();
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with AED as base currency', () => {
      expect(currencyService.baseCurrency).toBe('AED');
    });

    it('should support all required UAE and international currencies', () => {
      const expectedCurrencies = ['AED', 'USD', 'EUR', 'GBP', 'SAR', 'QAR', 'KWD', 'SGD', 'INR'];
      
      expectedCurrencies.forEach(currency => {
        expect(currencyService.supportedCurrencies).toContain(currency);
      });
    });

    it('should have default exchange rates for all supported currencies', () => {
      const supportedCurrencies = currencyService.supportedCurrencies;
      
      supportedCurrencies.forEach(currency => {
        expect(currencyService.exchangeRates[currency]).toBeDefined();
        expect(typeof currencyService.exchangeRates[currency]).toBe('number');
        expect(currencyService.exchangeRates[currency]).toBeGreaterThan(0);
      });
    });
  });

  describe('Currency Conversion', () => {
    it('should convert USD to AED correctly', async () => {
      const usdAmount = 1000;
      const expectedAed = usdAmount * currencyService.exchangeRates.USD;
      
      const result = await currencyService.convertCurrency(usdAmount, 'USD', 'AED');
      
      expect(result).toBeCloseTo(expectedAed, 2);
    });

    it('should convert AED to USD correctly', async () => {
      const aedAmount = 3670;
      const expectedUsd = aedAmount / currencyService.exchangeRates.USD;
      
      const result = await currencyService.convertCurrency(aedAmount, 'AED', 'USD');
      
      expect(result).toBeCloseTo(expectedUsd, 2);
    });

    it('should handle GCC currencies correctly', async () => {
      const testCases = [
        { from: 'AED', to: 'SAR', amount: 1000 },
        { from: 'SAR', to: 'AED', amount: 1000 },
        { from: 'QAR', to: 'AED', amount: 1000 },
        { from: 'KWD', to: 'AED', amount: 100 }
      ];

      for (const testCase of testCases) {
        const result = await currencyService.convertCurrency(
          testCase.amount, 
          testCase.from, 
          testCase.to
        );
        
        expect(result).toBeGreaterThan(0);
        expect(typeof result).toBe('number');
      }
    });

    it('should return same amount for same currency conversion', async () => {
      const amount = 5000;
      const result = await currencyService.convertCurrency(amount, 'AED', 'AED');
      
      expect(result).toBe(amount);
    });

    it('should throw error for unsupported currency', async () => {
      await expect(
        currencyService.convertCurrency(1000, 'XYZ', 'AED')
      ).rejects.toThrow('Unsupported currency: XYZ');
    });

    it('should handle zero amount conversion', async () => {
      const result = await currencyService.convertCurrency(0, 'USD', 'AED');
      expect(result).toBe(0);
    });

    it('should handle negative amounts', async () => {
      const negativeAmount = -1000;
      const result = await currencyService.convertCurrency(negativeAmount, 'USD', 'AED');
      
      expect(result).toBeLessThan(0);
      expect(Math.abs(result)).toBeCloseTo(
        Math.abs(negativeAmount) * currencyService.exchangeRates.USD, 
        2
      );
    });
  });

  describe('Exchange Rate Management', () => {
    it('should update exchange rates', () => {
      const newRate = 3.75;
      currencyService.updateExchangeRate('USD', newRate);
      
      expect(currencyService.exchangeRates.USD).toBe(newRate);
    });

    it('should not update rates for unsupported currencies', () => {
      expect(() => {
        currencyService.updateExchangeRate('XYZ', 1.5);
      }).toThrow('Unsupported currency: XYZ');
    });

    it('should validate exchange rate values', () => {
      expect(() => {
        currencyService.updateExchangeRate('USD', 0);
      }).toThrow('Exchange rate must be positive');

      expect(() => {
        currencyService.updateExchangeRate('USD', -1);
      }).toThrow('Exchange rate must be positive');
    });

    it('should get current rates for all currencies', () => {
      const rates = currencyService.getCurrentRates();
      
      expect(rates).toHaveProperty('AED', 1);
      expect(rates).toHaveProperty('USD');
      expect(rates).toHaveProperty('EUR');
      expect(rates).toHaveProperty('SAR');
      expect(Object.keys(rates)).toHaveLength(currencyService.supportedCurrencies.length);
    });
  });

  describe('Currency Formatting', () => {
    it('should format AED currency correctly', () => {
      const amount = 1234.56;
      const formatted = currencyService.formatCurrency(amount, 'AED');
      
      expect(formatted).toMatch(/AED|د\.إ/);
      expect(formatted).toContain('1,234.56');
    });

    it('should format USD currency correctly', () => {
      const amount = 1234.56;
      const formatted = currencyService.formatCurrency(amount, 'USD');
      
      expect(formatted).toMatch(/\$|USD/);
      expect(formatted).toContain('1,234.56');
    });

    it('should format EUR currency correctly', () => {
      const amount = 1234.56;
      const formatted = currencyService.formatCurrency(amount, 'EUR');
      
      expect(formatted).toMatch(/€|EUR/);
      expect(formatted).toContain('1,234.56');
    });

    it('should handle different locales for formatting', () => {
      const amount = 1234.56;
      
      const enFormatted = currencyService.formatCurrency(amount, 'AED', 'en-US');
      const arFormatted = currencyService.formatCurrency(amount, 'AED', 'ar-AE');
      
      expect(enFormatted).toBeDefined();
      expect(arFormatted).toBeDefined();
      expect(enFormatted).not.toBe(arFormatted);
    });
  });

  describe('Portfolio Value Calculation', () => {
    it('should calculate portfolio value in different currencies', async () => {
      const mockPortfolio = [
        { currency: 'AED', amount: 10000 },
        { currency: 'USD', amount: 5000 },
        { currency: 'EUR', amount: 3000 }
      ];

      const totalAed = await currencyService.calculatePortfolioValue(mockPortfolio, 'AED');
      
      expect(totalAed).toBeGreaterThan(10000); // Should be more than just AED amount
      expect(typeof totalAed).toBe('number');
    });

    it('should handle empty portfolio', async () => {
      const emptyPortfolio = [];
      const total = await currencyService.calculatePortfolioValue(emptyPortfolio, 'AED');
      
      expect(total).toBe(0);
    });
  });

  describe('Regional Currency Mapping', () => {
    it('should map UAE to AED', () => {
      expect(currencyService.getRegionalCurrency('AE')).toBe('AED');
    });

    it('should map GCC countries to their currencies', () => {
      expect(currencyService.getRegionalCurrency('SA')).toBe('SAR');
      expect(currencyService.getRegionalCurrency('QA')).toBe('QAR');
      expect(currencyService.getRegionalCurrency('KW')).toBe('KWD');
    });

    it('should default to USD for unmapped countries', () => {
      expect(currencyService.getRegionalCurrency('XX')).toBe('USD');
    });
  });

  describe('Rate Validation', () => {
    it('should validate reasonable exchange rates', () => {
      // Test that rates are within reasonable bounds
      expect(currencyService.exchangeRates.USD).toBeGreaterThan(3);
      expect(currencyService.exchangeRates.USD).toBeLessThan(5);
      
      expect(currencyService.exchangeRates.SAR).toBeGreaterThan(0.9);
      expect(currencyService.exchangeRates.SAR).toBeLessThan(1.1);
      
      expect(currencyService.exchangeRates.KWD).toBeGreaterThan(0.08);
      expect(currencyService.exchangeRates.KWD).toBeLessThan(0.12);
    });
  });

  describe('Precision Handling', () => {
    it('should handle high precision conversions', async () => {
      const preciseAmount = 123.456789;
      const result = await currencyService.convertCurrency(preciseAmount, 'USD', 'AED');
      
      // Should maintain reasonable precision
      expect(result.toString()).toMatch(/^\d+\.\d{1,8}$/);
    });

    it('should round to appropriate decimal places for display', () => {
      const amount = 1234.56789;
      const formatted = currencyService.formatCurrency(amount, 'AED');
      
      // Should not show more than 2 decimal places for currency
      expect(formatted).not.toMatch(/\.\d{3,}/);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid amount types', async () => {
      await expect(
        currencyService.convertCurrency('invalid', 'USD', 'AED')
      ).rejects.toThrow();
      
      await expect(
        currencyService.convertCurrency(null, 'USD', 'AED')
      ).rejects.toThrow();
    });

    it('should handle malformed currency codes', async () => {
      await expect(
        currencyService.convertCurrency(1000, 'usd', 'AED')
      ).rejects.toThrow(); // Should be case sensitive
      
      await expect(
        currencyService.convertCurrency(1000, '', 'AED')
      ).rejects.toThrow();
    });
  });

  describe('Performance', () => {
    it('should perform conversions quickly', async () => {
      const startTime = Date.now();
      
      // Perform 100 conversions
      const promises = Array.from({ length: 100 }, () =>
        currencyService.convertCurrency(1000, 'USD', 'AED')
      );
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete 100 conversions in under 1 second
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Multi-threading Safety', () => {
    it('should handle concurrent rate updates safely', async () => {
      const initialRate = currencyService.exchangeRates.USD;
      
      // Simulate concurrent updates
      const updatePromises = Array.from({ length: 10 }, (_, i) =>
        Promise.resolve().then(() => {
          currencyService.updateExchangeRate('USD', 3.67 + (i * 0.01));
        })
      );
      
      await Promise.all(updatePromises);
      
      // Final rate should be valid
      expect(currencyService.exchangeRates.USD).toBeGreaterThan(3);
      expect(currencyService.exchangeRates.USD).toBeLessThan(5);
    });
  });
});