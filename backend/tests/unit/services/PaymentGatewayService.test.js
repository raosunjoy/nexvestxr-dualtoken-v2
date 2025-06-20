// Mock winston logger first
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

jest.mock('winston', () => ({
  createLogger: jest.fn(() => mockLogger),
  format: {
    json: jest.fn()
  },
  transports: {
    Console: jest.fn()
  }
}));

// Mock dependencies
jest.mock('axios');
jest.mock('razorpay');
jest.mock('crypto');

const PaymentGatewayService = require('../../../src/services/PaymentGatewayService');
const axios = require('axios');
const Razorpay = require('razorpay');
const crypto = require('crypto');

describe('PaymentGatewayService', () => {
  let paymentService;
  let mockRazorpay;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Razorpay instance
    mockRazorpay = {
      orders: {
        create: jest.fn()
      }
    };
    Razorpay.mockReturnValue(mockRazorpay);

    // Set up environment variables
    process.env.STRIPE_API_KEY = 'sk_test_stripe_key';
    process.env.MOONPAY_API_KEY = 'moonpay_api_key';
    process.env.MOONPAY_SECRET = 'moonpay_secret';
    process.env.RAMP_API_KEY = 'ramp_api_key';
    process.env.RAZORPAY_KEY_ID = 'razorpay_key_id';
    process.env.RAZORPAY_KEY_SECRET = 'razorpay_key_secret';
    process.env.RAZORPAY_WEBHOOK_SECRET = 'razorpay_webhook_secret';

    // Create fresh instance
    paymentService = require('../../../src/services/PaymentGatewayService');
  });

  afterEach(() => {
    jest.resetModules();
    delete process.env.STRIPE_API_KEY;
    delete process.env.MOONPAY_API_KEY;
    delete process.env.MOONPAY_SECRET;
    delete process.env.RAMP_API_KEY;
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
  });

  describe('Initialization', () => {
    it('should initialize Razorpay when valid credentials provided', () => {
      expect(Razorpay).toHaveBeenCalledWith({
        key_id: 'razorpay_key_id',
        key_secret: 'razorpay_key_secret'
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Razorpay initialized successfully');
    });

    it('should skip Razorpay initialization when credentials not provided', () => {
      delete process.env.RAZORPAY_KEY_ID;
      delete process.env.RAZORPAY_KEY_SECRET;

      // Recreate service
      jest.resetModules();
      const PaymentGatewayServiceClass = require('../../../src/services/PaymentGatewayService').constructor;
      new PaymentGatewayServiceClass();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Razorpay credentials not provided, skipping initialization'
      );
    });

    it('should skip Razorpay initialization when placeholder credentials provided', () => {
      process.env.RAZORPAY_KEY_ID = 'your_razorpay_key_id';
      process.env.RAZORPAY_KEY_SECRET = 'your_razorpay_secret';

      jest.resetModules();
      const PaymentGatewayServiceClass = require('../../../src/services/PaymentGatewayService').constructor;
      new PaymentGatewayServiceClass();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Razorpay credentials not provided, skipping initialization'
      );
    });

    it('should handle Razorpay initialization errors', () => {
      Razorpay.mockImplementation(() => {
        throw new Error('Invalid credentials');
      });

      jest.resetModules();
      const PaymentGatewayServiceClass = require('../../../src/services/PaymentGatewayService').constructor;
      const service = new PaymentGatewayServiceClass();

      expect(service.razorpay).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to initialize Razorpay:',
        'Invalid credentials'
      );
    });
  });

  describe('Stripe On-Ramp', () => {
    describe('createStripeOnRampSession', () => {
      it('should create Stripe on-ramp session successfully', async () => {
        const mockResponse = {
          data: {
            id: 'cos_stripe_session_123',
            url: 'https://crypto.stripe.com/session/123',
            status: 'created'
          }
        };
        axios.post.mockResolvedValue(mockResponse);

        const result = await paymentService.createStripeOnRampSession('user123', 1000, 'USD');

        expect(result.success).toBe(true);
        expect(result.session).toEqual(mockResponse.data);
        expect(axios.post).toHaveBeenCalledWith(
          'https://api.stripe.com/v1/crypto/onramp/sessions',
          expect.any(URLSearchParams),
          expect.objectContaining({
            headers: {
              'Authorization': 'Bearer sk_test_stripe_key',
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          })
        );
        expect(mockLogger.info).toHaveBeenCalledWith(
          'Stripe on-ramp session created',
          { userId: 'user123', sessionId: 'cos_stripe_session_123' }
        );
      });

      it('should handle Stripe API errors', async () => {
        const mockError = new Error('Stripe API error');
        axios.post.mockRejectedValue(mockError);

        await expect(
          paymentService.createStripeOnRampSession('user123', 1000, 'USD')
        ).rejects.toThrow('Stripe on-ramp failed: Stripe API error');

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Stripe on-ramp session creation failed',
          { userId: 'user123', error: 'Stripe API error' }
        );
      });

      it('should use default currency when not specified', async () => {
        const mockResponse = { data: { id: 'session_123' } };
        axios.post.mockResolvedValue(mockResponse);

        await paymentService.createStripeOnRampSession('user123', 1000);

        const calledParams = axios.post.mock.calls[0][1];
        expect(calledParams.get('currency')).toBe('usd');
      });
    });
  });

  describe('MoonPay On-Ramp', () => {
    describe('createMoonPayOnRampTransaction', () => {
      it('should create MoonPay on-ramp transaction URL', async () => {
        const mockHmac = {
          update: jest.fn().mockReturnThis(),
          digest: jest.fn().mockReturnValue('mock_signature')
        };
        crypto.createHmac.mockReturnValue(mockHmac);

        const result = await paymentService.createMoonPayOnRampTransaction('user123', 1000, 'USD');

        expect(result.success).toBe(true);
        expect(result.transactionUrl).toContain('https://buy.moonpay.com');
        expect(result.transactionUrl).toContain('apiKey=moonpay_api_key');
        expect(result.transactionUrl).toContain('currencyCode=XRP');
        expect(result.transactionUrl).toContain('baseCurrencyCode=USD');
        expect(result.transactionUrl).toContain('baseCurrencyAmount=1000');
        expect(result.transactionUrl).toContain('signature=');

        expect(crypto.createHmac).toHaveBeenCalledWith('sha256', 'moonpay_secret');
        expect(mockLogger.info).toHaveBeenCalledWith(
          'MoonPay on-ramp transaction URL generated',
          { userId: 'user123', url: expect.stringContaining('https://buy.moonpay.com') }
        );
      });

      it('should handle MoonPay URL generation errors', async () => {
        crypto.createHmac.mockImplementation(() => {
          throw new Error('Crypto error');
        });

        await expect(
          paymentService.createMoonPayOnRampTransaction('user123', 1000, 'USD')
        ).rejects.toThrow('MoonPay on-ramp failed: Crypto error');

        expect(mockLogger.error).toHaveBeenCalledWith(
          'MoonPay on-ramp transaction failed',
          { userId: 'user123', error: 'Crypto error' }
        );
      });
    });

    describe('createMoonPayOffRampTransaction', () => {
      it('should create MoonPay off-ramp transaction URL', async () => {
        const mockHmac = {
          update: jest.fn().mockReturnThis(),
          digest: jest.fn().mockReturnValue('mock_signature')
        };
        crypto.createHmac.mockReturnValue(mockHmac);

        const result = await paymentService.createMoonPayOffRampTransaction('user123', 1000, 'USD');

        expect(result.success).toBe(true);
        expect(result.transactionUrl).toContain('https://sell.moonpay.com');
        expect(result.transactionUrl).toContain('baseCurrencyCode=XRP');
        expect(result.transactionUrl).toContain('quoteCurrencyCode=USD');
        expect(result.transactionUrl).toContain('baseCurrencyAmount=1000');

        expect(mockLogger.info).toHaveBeenCalledWith(
          'MoonPay off-ramp transaction URL generated',
          { userId: 'user123', url: expect.stringContaining('https://sell.moonpay.com') }
        );
      });
    });
  });

  describe('Ramp Network', () => {
    describe('createRampOnRampTransaction', () => {
      it('should create Ramp on-ramp transaction URL', async () => {
        const result = await paymentService.createRampOnRampTransaction('user123', 1000, 'USD');

        expect(result.success).toBe(true);
        expect(result.transactionUrl).toContain('https://app.ramp.network');
        expect(result.transactionUrl).toContain('apiKey=ramp_api_key');
        expect(result.transactionUrl).toContain('swapAsset=XRP');
        expect(result.transactionUrl).toContain('fiatCurrency=USD');
        expect(result.transactionUrl).toContain('fiatValue=1000');
        expect(result.transactionUrl).toContain('userEmail=user-user123@nexvestxr.com');

        expect(mockLogger.info).toHaveBeenCalledWith(
          'Ramp on-ramp transaction URL generated',
          { userId: 'user123', url: expect.stringContaining('https://app.ramp.network') }
        );
      });

      it('should handle Ramp URL generation errors', async () => {
        // Mock URL construction error by overriding URLSearchParams
        global.URLSearchParams = jest.fn().mockImplementation(() => {
          throw new Error('URL error');
        });

        await expect(
          paymentService.createRampOnRampTransaction('user123', 1000, 'USD')
        ).rejects.toThrow('Ramp on-ramp failed: URL error');

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Ramp on-ramp transaction failed',
          { userId: 'user123', error: 'URL error' }
        );
      });
    });
  });

  describe('Razorpay', () => {
    describe('createRazorpayOrder', () => {
      it('should create Razorpay order successfully', async () => {
        const mockOrder = {
          id: 'order_razorpay_123',
          amount: 100000,
          currency: 'INR',
          status: 'created'
        };
        mockRazorpay.orders.create.mockResolvedValue(mockOrder);

        const result = await paymentService.createRazorpayOrder('user123', 1000, 'INR');

        expect(result.success).toBe(true);
        expect(result.order).toEqual(mockOrder);
        expect(mockRazorpay.orders.create).toHaveBeenCalledWith({
          amount: 100000, // 1000 * 100 paise
          currency: 'INR',
          receipt: expect.stringMatching(/receipt_user123_\d+/),
          payment_capture: 1
        });
        expect(mockLogger.info).toHaveBeenCalledWith(
          'Razorpay order created',
          { userId: 'user123', orderId: 'order_razorpay_123' }
        );
      });

      it('should throw error when Razorpay not available', async () => {
        // Create service without Razorpay
        jest.resetModules();
        delete process.env.RAZORPAY_KEY_ID;
        const PaymentGatewayServiceClass = require('../../../src/services/PaymentGatewayService').constructor;
        const serviceWithoutRazorpay = new PaymentGatewayServiceClass();

        await expect(
          serviceWithoutRazorpay.createRazorpayOrder('user123', 1000, 'INR')
        ).rejects.toThrow('Razorpay service is not available. Please configure Razorpay credentials.');
      });

      it('should handle Razorpay order creation errors', async () => {
        mockRazorpay.orders.create.mockRejectedValue(new Error('Order creation failed'));

        await expect(
          paymentService.createRazorpayOrder('user123', 1000, 'INR')
        ).rejects.toThrow('Razorpay order creation failed: Order creation failed');

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Razorpay order creation failed',
          { userId: 'user123', error: 'Order creation failed' }
        );
      });

      it('should use default currency when not specified', async () => {
        const mockOrder = { id: 'order_123' };
        mockRazorpay.orders.create.mockResolvedValue(mockOrder);

        await paymentService.createRazorpayOrder('user123', 1000);

        expect(mockRazorpay.orders.create).toHaveBeenCalledWith(
          expect.objectContaining({ currency: 'INR' })
        );
      });
    });
  });

  describe('Webhook Handling', () => {
    describe('handleStripeWebhook', () => {
      it('should handle payment_intent.succeeded event', async () => {
        const event = {
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: 'pi_stripe_123',
              amount: 100000,
              status: 'succeeded'
            }
          }
        };

        const result = await paymentService.handleStripeWebhook(event);

        expect(result.success).toBe(true);
        expect(result.message).toBe('Payment processed');
        expect(mockLogger.info).toHaveBeenCalledWith(
          'Stripe payment succeeded',
          { paymentIntentId: 'pi_stripe_123' }
        );
      });

      it('should handle unhandled event types', async () => {
        const event = {
          type: 'customer.created',
          data: { object: { id: 'cus_123' } }
        };

        const result = await paymentService.handleStripeWebhook(event);

        expect(result.success).toBe(false);
        expect(result.message).toBe('Event type not handled');
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Unhandled Stripe event type',
          { eventType: 'customer.created' }
        );
      });

      it('should handle webhook processing errors', async () => {
        const event = {
          type: 'payment_intent.succeeded',
          data: null // Invalid data
        };

        await expect(paymentService.handleStripeWebhook(event)).rejects.toThrow();
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Stripe webhook handling failed',
          expect.objectContaining({ error: expect.any(String) })
        );
      });
    });

    describe('handleRazorpayWebhook', () => {
      it('should handle payment.captured event with valid signature', async () => {
        const payload = {
          event: 'payment.captured',
          payload: {
            payment: {
              entity: {
                id: 'pay_razorpay_123',
                amount: 100000,
                status: 'captured'
              }
            }
          }
        };
        const signature = 'valid_signature';

        const mockHmac = {
          update: jest.fn().mockReturnThis(),
          digest: jest.fn().mockReturnValue('valid_signature')
        };
        crypto.createHmac.mockReturnValue(mockHmac);

        const result = await paymentService.handleRazorpayWebhook(payload, signature);

        expect(result.success).toBe(true);
        expect(result.message).toBe('Payment processed');
        expect(crypto.createHmac).toHaveBeenCalledWith('sha256', 'razorpay_webhook_secret');
        expect(mockLogger.info).toHaveBeenCalledWith(
          'Razorpay payment captured',
          { paymentId: 'pay_razorpay_123' }
        );
      });

      it('should handle payment.failed event', async () => {
        const payload = {
          event: 'payment.failed',
          payload: {
            payment: {
              entity: {
                id: 'pay_failed_123',
                status: 'failed'
              }
            }
          }
        };
        const signature = 'valid_signature';

        const mockHmac = {
          update: jest.fn().mockReturnThis(),
          digest: jest.fn().mockReturnValue('valid_signature')
        };
        crypto.createHmac.mockReturnValue(mockHmac);

        const result = await paymentService.handleRazorpayWebhook(payload, signature);

        expect(result.success).toBe(false);
        expect(result.message).toBe('Payment failed');
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Razorpay payment failed',
          { paymentId: 'pay_failed_123' }
        );
      });

      it('should reject invalid signatures', async () => {
        const payload = { event: 'payment.captured' };
        const signature = 'invalid_signature';

        const mockHmac = {
          update: jest.fn().mockReturnThis(),
          digest: jest.fn().mockReturnValue('valid_signature')
        };
        crypto.createHmac.mockReturnValue(mockHmac);

        await expect(
          paymentService.handleRazorpayWebhook(payload, signature)
        ).rejects.toThrow('Invalid webhook signature');
      });

      it('should handle unhandled Razorpay events', async () => {
        const payload = { event: 'order.paid' };
        const signature = 'valid_signature';

        const mockHmac = {
          update: jest.fn().mockReturnThis(),
          digest: jest.fn().mockReturnValue('valid_signature')
        };
        crypto.createHmac.mockReturnValue(mockHmac);

        const result = await paymentService.handleRazorpayWebhook(payload, signature);

        expect(result.success).toBe(false);
        expect(result.message).toBe('Event not handled');
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Unhandled Razorpay event',
          { event: 'order.paid' }
        );
      });

      it('should throw error when Razorpay not available', async () => {
        // Create service without Razorpay
        jest.resetModules();
        delete process.env.RAZORPAY_KEY_ID;
        const PaymentGatewayServiceClass = require('../../../src/services/PaymentGatewayService').constructor;
        const serviceWithoutRazorpay = new PaymentGatewayServiceClass();

        await expect(
          serviceWithoutRazorpay.handleRazorpayWebhook({}, 'signature')
        ).rejects.toThrow('Razorpay service is not available. Please configure Razorpay credentials.');
      });

      it('should handle webhook processing errors', async () => {
        const mockHmac = {
          update: jest.fn().mockReturnThis(),
          digest: jest.fn().mockReturnValue('valid_signature')
        };
        crypto.createHmac.mockReturnValue(mockHmac);

        // Mock JSON.stringify to throw error
        const originalStringify = JSON.stringify;
        JSON.stringify = jest.fn().mockImplementation(() => {
          throw new Error('Stringify error');
        });

        await expect(
          paymentService.handleRazorpayWebhook({}, 'valid_signature')
        ).rejects.toThrow();

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Razorpay webhook handling failed',
          expect.objectContaining({ error: expect.any(String) })
        );

        // Restore original function
        JSON.stringify = originalStringify;
      });
    });
  });

  describe('Service Configuration', () => {
    it('should set correct base currency', () => {
      expect(paymentService.baseCurrency).toBe('XRP');
    });

    it('should store API keys correctly', () => {
      expect(paymentService.stripeApiKey).toBe('sk_test_stripe_key');
      expect(paymentService.moonpayApiKey).toBe('moonpay_api_key');
      expect(paymentService.moonpaySecret).toBe('moonpay_secret');
      expect(paymentService.rampApiKey).toBe('ramp_api_key');
    });
  });
});