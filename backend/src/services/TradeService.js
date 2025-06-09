const xrpl = require('xrpl');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

class TradeService {
  constructor() {
    this.client = new xrpl.Client(process.env.XRPL_SERVER || 'wss://s.altnet.rippletest.net:51233');
    this.initialize();
  }

  async initialize() {
    try {
      await this.client.connect();
      logger.info('XRPL client connected for trading');
    } catch (error) {
      logger.error('XRPL client initialization failed', { error: error.message });
      throw error;
    }
  }

  async buyTokens(userAddress, tokenCode, issuerAddress, amount, paymentAmount) {
    try {
      const payment = {
        TransactionType: 'Payment',
        Account: userAddress,
        Amount: {
          currency: tokenCode,
          value: amount.toString(),
          issuer: issuerAddress,
        },
        Destination: issuerAddress,
        SendMax: xrpl.dropsToXrp(paymentAmount),
      };

      logger.info('Buy transaction prepared', { userAddress, tokenCode, amount });
      return payment;
    } catch (error) {
      logger.error('Buy transaction failed', { userAddress, tokenCode, error: error.message });
      throw error;
    }
  }

  async sellTokens(userAddress, tokenCode, issuerAddress, amount, receiveAmount) {
    try {
      const payment = {
        TransactionType: 'Payment',
        Account: userAddress,
        Amount: {
          currency: tokenCode,
          value: amount.toString(),
          issuer: issuerAddress,
        },
        Destination: issuerAddress,
        SendMax: {
          currency: tokenCode,
          value: amount.toString(),
          issuer: issuerAddress,
        },
        DestinationTag: 0,
        Amount: xrpl.dropsToXrp(receiveAmount),
      };

      logger.info('Sell transaction prepared', { userAddress, tokenCode, amount });
      return payment;
    } catch (error) {
      logger.error('Sell transaction failed', { userAddress, tokenCode, error: error.message });
      throw error;
    }
  }

  async createLimitOrder(userAddress, tokenCode, issuerAddress, amount, pricePerToken, type) {
    try {
      const offer = {
        TransactionType: 'OfferCreate',
        Account: userAddress,
        TakerGets: type === 'buy' ? xrpl.dropsToXrp(amount * pricePerToken) : {
          currency: tokenCode,
          value: amount.toString(),
          issuer: issuerAddress,
        },
        TakerPays: type === 'buy' ? {
          currency: tokenCode,
          value: amount.toString(),
          issuer: issuerAddress,
        } : xrpl.dropsToXrp(amount * pricePerToken),
      };

      logger.info('Limit order prepared', { userAddress, tokenCode, type, amount });
      return offer;
    } catch (error) {
      logger.error('Limit order creation failed', { userAddress, tokenCode, error: error.message });
      throw error;
    }
  }

  async getOrderBook(tokenCode, issuerAddress) {
    try {
      // Mock order book (in production, fetch from XRPL ledger)
      const orderBook = {
        bids: [
          { price: 950, amount: 100 },
          { price: 940, amount: 200 },
        ],
        asks: [
          { price: 1050, amount: 150 },
          { price: 1060, amount: 300 },
        ],
      };

      logger.info('Order book fetched', { tokenCode, issuerAddress });
      return orderBook;
    } catch (error) {
      logger.error('Order book fetch failed', { tokenCode, issuerAddress, error: error.message });
      throw error;
    }
  }

  async getTradingHistory(tokenCode, issuerAddress) {
    try {
      // Mock trading history (in production, fetch from XRPL ledger)
      const history = [
        { id: 'trade1', type: 'buy', amount: 100, price: 1000, timestamp: new Date().toISOString() },
        { id: 'trade2', type: 'sell', amount: 50, price: 1050, timestamp: new Date().toISOString() },
      ];

      logger.info('Trading history fetched', { tokenCode, issuerAddress });
      return history;
    } catch (error) {
      logger.error('Trading history fetch failed', { tokenCode, issuerAddress, error: error.message });
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

module.exports = new TradeService();