const xrpl = require('xrpl');
const winston = require('winston');
const SubscriptionService = require('./SubscriptionService');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

class AdvancedTradeService {
  constructor() {
    this.client = new xrpl.Client(process.env.XRPL_SERVER || 'wss://s.altnet.rippletest.net:51233');
    this.initialize();
  }

  async initialize() {
    try {
      await this.client.connect();
      logger.info('XRPL client connected for advanced trading');
    } catch (error) {
      logger.error('XRPL client initialization failed', { error: error.message });
      throw error;
    }
  }

  async createLimitOrder(userId, userAddress, pairId, side, amount, price, options = {}) {
    try {
      // Check subscription for advanced features
      const subscription = await SubscriptionService.getUserSubscription(userId, 'investor');
      if (subscription.plan === 'free' && (options.postOnly || options.reduceOnly)) {
        throw new Error('Advanced order options require Premium or Institutional plan');
      }

      const [tokenCode, baseCurrency] = pairId.split('/');
      const issuerAddress = process.env.XRPL_ISSUER_ADDRESS || 'rIssuerAddress123';

      const order = {
        TransactionType: 'OfferCreate',
        Account: userAddress,
        Flags: options.postOnly ? xrpl.OfferCreateFlags.tfPassive : 0,
      };

      if (side === 'buy') {
        order.TakerGets = {
          currency: tokenCode,
          issuer: issuerAddress,
          value: amount.toString(),
        };
        order.TakerPays = xrpl.dropsToXrp(amount * price);
      } else {
        order.TakerGets = xrpl.dropsToXrp(amount * price);
        order.TakerPays = {
          currency: tokenCode,
          issuer: issuerAddress,
          value: amount.toString(),
        };
      }

      return order;
    } catch (error) {
      logger.error('Limit order creation failed', { userId, pairId, error: error.message });
      throw error;
    }
  }

  async createStopLossOrder(userId, userAddress, pairId, side, amount, stopPrice, limitPrice) {
    try {
      // Validate stop-loss parameters
      if (side === 'buy' && stopPrice <= (limitPrice || stopPrice)) {
        throw new Error('Stop price must be greater than limit price for buy orders');
      }
      if (side === 'sell' && stopPrice >= (limitPrice || stopPrice)) {
        throw new Error('Stop price must be less than limit price for sell orders');
      }

      // Mock stop-loss order (in production, use off-chain monitoring or Hooks)
      logger.info('Stop-loss order prepared (mocked)', { userId, pairId, side, amount, stopPrice });
      return { success: true, order: { type: 'stop-loss', side, amount, stopPrice, limitPrice } };
    } catch (error) {
      logger.error('Stop-loss order creation failed', { userId, pairId, error: error.message });
      throw error;
    }
  }

  async createOCOOrder(userId, userAddress, pairId, side, amount, stopPrice, limitPrice, targetPrice) {
    try {
      // Validate OCO parameters
      if (side === 'buy' && (stopPrice <= limitPrice || targetPrice <= limitPrice)) {
        throw new Error('Stop price and target price must be greater than limit price for buy orders');
      }
      if (side === 'sell' && (stopPrice >= limitPrice || targetPrice >= limitPrice)) {
        throw new Error('Stop price and target price must be less than limit price for sell orders');
      }

      // Mock OCO order (in production, use off-chain monitoring or Hooks)
      logger.info('OCO order prepared (mocked)', { userId, pairId, side, amount, stopPrice, targetPrice });
      return { success: true, order: { type: 'oco', side, amount, stopPrice, limitPrice, targetPrice } };
    } catch (error) {
      logger.error('OCO order creation failed', { userId, pairId, error: error.message });
      throw error;
    }
  }

  async addLiquidity(userId, userAddress, pairId, tokenAmount, xrpAmount) {
    try {
      // Check subscription for liquidity pool access
      const subscription = await SubscriptionService.getUserSubscription(userId, 'investor');
      if (subscription.plan === 'free') {
        throw new Error('Liquidity pool access requires Premium or Institutional plan');
      }

      const [tokenCode, baseCurrency] = pairId.split('/');
      const issuerAddress = process.env.XRPL_ISSUER_ADDRESS || 'rIssuerAddress123';

      const liquidityTx = {
        TransactionType: 'OfferCreate',
        Account: userAddress,
        TakerGets: {
          currency: tokenCode,
          issuer: issuerAddress,
          value: tokenAmount.toString(),
        },
        TakerPays: xrpl.dropsToXrp(xrpAmount),
        Flags: xrpl.OfferCreateFlags.tfPassive,
      };

      logger.info('Liquidity added successfully', { userId, pairId, tokenAmount, xrpAmount });
      return { success: true, transaction: liquidityTx };
    } catch (error) {
      logger.error('Liquidity addition failed', { userId, pairId, error: error.message });
      throw error;
    }
  }

  async createMarginOrder(userId, userAddress, pairId, side, amount, price, leverage) {
    try {
      // Check subscription for margin trading
      const subscription = await SubscriptionService.getUserSubscription(userId, 'investor');
      if (subscription.plan !== 'premium' && subscription.plan !== 'institutional') {
        throw new Error('Margin trading requires Premium or Institutional plan');
      }

      // Mock margin order (in production, manage collateral and risk off-chain)
      logger.info('Margin order prepared (mocked)', { userId, pairId, side, amount, leverage });
      return { success: true, order: { type: 'margin', side, amount, price, leverage } };
    } catch (error) {
      logger.error('Margin order creation failed', { userId, pairId, error: error.message });
      throw error;
    }
  }

  async disconnect() {
    if (this.client && this.client.isConnected()) {
      await this.client.disconnect();
      logger.info('XRPL client disconnected');
    }
  }
}

module.exports = new AdvancedTradeService();