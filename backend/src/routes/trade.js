const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

const router = express.Router();

// Get available trading markets
router.get('/markets', async (req, res) => {
  try {
    const markets = [
      {
        symbol: 'XERA/AED',
        baseAsset: 'XERA',
        quoteAsset: 'AED',
        price: 1247,
        change24h: 2.3,
        volume24h: 4560000,
        high24h: 1285,
        low24h: 1198,
        status: 'active'
      },
      {
        symbol: 'PROPX-TOKEN001/AED',
        baseAsset: 'PROPX-TOKEN001',
        quoteAsset: 'AED',
        price: 625,
        change24h: 1.8,
        volume24h: 1230000,
        high24h: 642,
        low24h: 608,
        status: 'active'
      },
      {
        symbol: 'PROPX-TOKEN002/AED',
        baseAsset: 'PROPX-TOKEN002',
        quoteAsset: 'AED',
        price: 875,
        change24h: -0.5,
        volume24h: 890000,
        high24h: 891,
        low24h: 865,
        status: 'active'
      }
    ];

    res.json({
      success: true,
      data: markets
    });

  } catch (error) {
    logger.error('Markets fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch markets'
    });
  }
});

// Create trading order
router.post('/order', authenticateToken, async (req, res) => {
  try {
    const { symbol, side, amount, type, price } = req.body;

    if (!symbol || !side || !amount || !type) {
      return res.status(400).json({
        success: false,
        error: 'Symbol, side, amount, and type are required'
      });
    }

    if (type === 'limit' && !price) {
      return res.status(400).json({
        success: false,
        error: 'Price is required for limit orders'
      });
    }

    const order = {
      orderId: `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol,
      side, // 'buy' or 'sell'
      amount: parseFloat(amount),
      type, // 'market' or 'limit'
      price: price ? parseFloat(price) : null,
      status: type === 'market' ? 'filled' : 'open',
      userId: req.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // For market orders, simulate immediate execution
    if (type === 'market') {
      const marketPrice = getMarketPrice(symbol);
      order.executedPrice = marketPrice;
      order.executedAmount = order.amount;
      order.executedAt = new Date().toISOString();
    }

    res.json({
      success: true,
      data: order
    });

  } catch (error) {
    logger.error('Order creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create order'
    });
  }
});

// Get user orders
router.get('/orders', authenticateToken, async (req, res) => {
  try {
    const { status, symbol, limit = 50 } = req.query;

    // Mock orders data
    let orders = [
      {
        orderId: 'ORD_001',
        symbol: 'XERA/AED',
        side: 'buy',
        amount: 100,
        type: 'limit',
        price: 1200,
        status: 'filled',
        executedPrice: 1200,
        executedAmount: 100,
        createdAt: '2024-06-19T10:30:00Z',
        executedAt: '2024-06-19T10:31:00Z'
      },
      {
        orderId: 'ORD_002',
        symbol: 'PROPX-TOKEN001/AED',
        side: 'buy',
        amount: 50,
        type: 'market',
        status: 'filled',
        executedPrice: 625,
        executedAmount: 50,
        createdAt: '2024-06-18T14:15:00Z',
        executedAt: '2024-06-18T14:15:01Z'
      },
      {
        orderId: 'ORD_003',
        symbol: 'XERA/AED',
        side: 'sell',
        amount: 25,
        type: 'limit',
        price: 1300,
        status: 'open',
        createdAt: '2024-06-20T09:00:00Z'
      }
    ];

    // Apply filters
    if (status) {
      orders = orders.filter(order => order.status === status);
    }
    if (symbol) {
      orders = orders.filter(order => order.symbol === symbol);
    }

    // Apply limit
    orders = orders.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: orders
    });

  } catch (error) {
    logger.error('Orders fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders'
    });
  }
});

// Cancel order
router.delete('/orders/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;

    // Mock order cancellation
    const cancelledOrder = {
      orderId,
      status: 'cancelled',
      cancelledAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: cancelledOrder
    });

  } catch (error) {
    logger.error('Order cancellation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel order'
    });
  }
});

// Get order book for a trading pair
router.get('/orderbook/:pair', async (req, res) => {
  try {
    const { pair } = req.params;
    const { depth = 10 } = req.query;

    const orderbook = generateOrderbook(pair, parseInt(depth));

    res.json({
      success: true,
      data: {
        symbol: pair,
        bids: orderbook.bids, // Buy orders
        asks: orderbook.asks, // Sell orders
        lastUpdate: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Orderbook fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orderbook'
    });
  }
});

// Get trading history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { symbol, limit = 50 } = req.query;

    let history = [
      {
        id: 'TXN_001',
        symbol: 'XERA/AED',
        side: 'buy',
        amount: 100,
        price: 1200,
        total: 120000,
        fee: 240, // 0.2% fee
        timestamp: '2024-06-19T10:31:00Z'
      },
      {
        id: 'TXN_002',
        symbol: 'PROPX-TOKEN001/AED',
        side: 'buy',
        amount: 50,
        price: 625,
        total: 31250,
        fee: 62.5,
        timestamp: '2024-06-18T14:15:01Z'
      }
    ];

    if (symbol) {
      history = history.filter(trade => trade.symbol === symbol);
    }

    history = history.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: history
    });

  } catch (error) {
    logger.error('Trading history fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trading history'
    });
  }
});

function getMarketPrice(symbol) {
  const prices = {
    'XERA/AED': 1247,
    'PROPX-TOKEN001/AED': 625,
    'PROPX-TOKEN002/AED': 875
  };
  return prices[symbol] || 1000;
}

function generateOrderbook(pair, depth) {
  const basePrice = getMarketPrice(pair);
  const bids = [];
  const asks = [];

  // Generate bid orders (buy orders, price descending)
  for (let i = 0; i < depth; i++) {
    const price = basePrice - (i + 1) * 5; // 5 AED steps down
    const amount = Math.floor(Math.random() * 100) + 10;
    bids.push([price, amount]);
  }

  // Generate ask orders (sell orders, price ascending)
  for (let i = 0; i < depth; i++) {
    const price = basePrice + (i + 1) * 5; // 5 AED steps up
    const amount = Math.floor(Math.random() * 100) + 10;
    asks.push([price, amount]);
  }

  return { bids, asks };
}

module.exports = router;