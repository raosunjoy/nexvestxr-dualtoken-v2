// routes/advancedTradeRoutes.js - Complete advanced trading system
const express = require('express');
const router = express.Router();
const { auth, requireKYC, userRateLimit } = require('../middleware/auth');
const AdvancedTradeService = require('../services/AdvancedTradeService');
const CurrencyService = require('../services/CurrencyService');

// Apply rate limiting to trading endpoints
router.use(userRateLimit(120)); // 120 requests per minute for trading

// Get trading pairs
router.get('/pairs', async (req, res) => {
  try {
    const pairs = await AdvancedTradeService.getTradingPairs();
    
    res.json({
      success: true,
      data: pairs.map(pair => ({
        id: pair.id,
        baseAsset: pair.baseAsset,
        quoteAsset: pair.quoteAsset,
        minOrderSize: pair.minOrderSize,
        maxOrderSize: pair.maxOrderSize,
        tradingFee: pair.tradingFee,
        status: pair.status
      }))
    });
  } catch (error) {
    console.error('❌ Failed to get trading pairs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trading pairs'
    });
  }
});

// Get order book for a trading pair
router.get('/orderbook/:pairId', async (req, res) => {
  try {
    const { pairId } = req.params;
    const { depth = 20 } = req.query;
    
    const orderBook = await AdvancedTradeService.getOrderBook(pairId);
    
    if (!orderBook) {
      return res.status(404).json({
        success: false,
        error: 'Trading pair not found'
      });
    }

    // Limit depth
    const limitedOrderBook = {
      ...orderBook,
      bids: orderBook.bids.slice(0, parseInt(depth)),
      asks: orderBook.asks.slice(0, parseInt(depth))
    };

    res.json({
      success: true,
      data: limitedOrderBook
    });
  } catch (error) {
    console.error('❌ Failed to get order book:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order book'
    });
  }
});

// Get current price for a trading pair
router.get('/price/:pairId', async (req, res) => {
  try {
    const { pairId } = req.params;
    
    const currentPrice = await AdvancedTradeService.getCurrentPrice(pairId);
    const priceChange24h = await AdvancedTradeService.getPriceChange24h(pairId);
    
    res.json({
      success: true,
      data: {
        pairId,
        price: currentPrice,
        change24h: priceChange24h,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('❌ Failed to get price:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch price'
    });
  }
});

// Get trading metrics for a pair
router.get('/metrics/:pairId', async (req, res) => {
  try {
    const { pairId } = req.params;
    const { timeframe = '24h' } = req.query;
    
    // Mock metrics - in production, this would come from your analytics service
    const metrics = {
      volume: 156789.45,
      high: 0.001234,
      low: 0.001156,
      trades: 1247,
      volatility: 3.2,
      liquidity: 45678.90
    };
    
    res.json({
      success: true,
      data: {
        pairId,
        timeframe,
        metrics,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('❌ Failed to get metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics'
    });
  }
});

// Get recent trades for a pair
router.get('/trades/:pairId', async (req, res) => {
  try {
    const { pairId } = req.params;
    const { limit = 50 } = req.query;
    
    // Mock trade history - in production, this would come from your database
    const trades = Array.from({ length: Math.min(parseInt(limit), 100) }, (_, i) => ({
      id: `trade_${Date.now()}_${i}`,
      price: 0.001200 + (Math.random() - 0.5) * 0.0001,
      amount: Math.random() * 1000 + 100,
      side: Math.random() > 0.5 ? 'buy' : 'sell',
      timestamp: new Date(Date.now() - i * 60000) // 1 minute intervals
    }));
    
    res.json({
      success: true,
      data: trades
    });
  } catch (error) {
    console.error('❌ Failed to get trades:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trades'
    });
  }
});

// Create market buy order
router.post('/market/buy', auth, requireKYC, async (req, res) => {
  try {
    const { userAddress, pairId, quoteAmount, options = {} } = req.body;
    
    if (!userAddress || !pairId || !quoteAmount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userAddress, pairId, quoteAmount'
      });
    }

    const order = await AdvancedTradeService.createMarketBuyOrder(
      userAddress,
      pairId,
      parseFloat(quoteAmount),
      options
    );

    res.status(201).json({
      success: true,
      message: 'Market buy order created successfully',
      data: order
    });

  } catch (error) {
    console.error('❌ Market buy order failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create market buy order'
    });
  }
});

// Create market sell order
router.post('/market/sell', auth, requireKYC, async (req, res) => {
  try {
    const { userAddress, pairId, baseAmount, options = {} } = req.body;
    
    if (!userAddress || !pairId || !baseAmount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userAddress, pairId, baseAmount'
      });
    }

    const order = await AdvancedTradeService.createMarketSellOrder(
      userAddress,
      pairId,
      parseFloat(baseAmount),
      options
    );

    res.status(201).json({
      success: true,
      message: 'Market sell order created successfully',
      data: order
    });

  } catch (error) {
    console.error('❌ Market sell order failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create market sell order'
    });
  }
});

// Create limit order
router.post('/limit', auth, requireKYC, async (req, res) => {
  try {
    const { userAddress, pairId, side, amount, price, options = {} } = req.body;
    
    if (!userAddress || !pairId || !side || !amount || !price) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userAddress, pairId, side, amount, price'
      });
    }

    if (!['buy', 'sell'].includes(side)) {
      return res.status(400).json({
        success: false,
        error: 'Side must be either "buy" or "sell"'
      });
    }

    const order = await AdvancedTradeService.createLimitOrder(
      userAddress,
      pairId,
      side,
      parseFloat(amount),
      parseFloat(price),
      options
    );

    res.status(201).json({
      success: true,
      message: 'Limit order created successfully',
      data: order
    });

  } catch (error) {
    console.error('❌ Limit order failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create limit order'
    });
  }
});

// Create stop-loss order
router.post('/stop-loss', auth, requireKYC, async (req, res) => {
  try {
    const { userAddress, pairId, side, amount, stopPrice, limitPrice, options = {} } = req.body;
    
    if (!userAddress || !pairId || !side || !amount || !stopPrice) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userAddress, pairId, side, amount, stopPrice'
      });
    }

    const order = await AdvancedTradeService.createStopLossOrder(
      userAddress,
      pairId,
      side,
      parseFloat(amount),
      parseFloat(stopPrice),
      limitPrice ? parseFloat(limitPrice) : null,
      options
    );

    res.status(201).json({
      success: true,
      message: 'Stop-loss order created successfully',
      data: order
    });

  } catch (error) {
    console.error('❌ Stop-loss order failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create stop-loss order'
    });
  }
});

// Create OCO (One-Cancels-Other) order
router.post('/oco', auth, requireKYC, async (req, res) => {
  try {
    const { userAddress, pairId, side, amount, stopPrice, limitPrice, targetPrice, options = {} } = req.body;
    
    if (!userAddress || !pairId || !side || !amount || !stopPrice || !limitPrice || !targetPrice) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userAddress, pairId, side, amount, stopPrice, limitPrice, targetPrice'
      });
    }

    const order = await AdvancedTradeService.createOCOOrder(
      userAddress,
      pairId,
      side,
      parseFloat(amount),
      parseFloat(stopPrice),
      parseFloat(limitPrice),
      parseFloat(targetPrice),
      options
    );

    res.status(201).json({
      success: true,
      message: 'OCO order created successfully',
      data: order
    });

  } catch (error) {
    console.error('❌ OCO order failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create OCO order'
    });
  }
});

// Cancel order
router.delete('/orders/:orderId', auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { userAddress } = req.body;
    
    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'User address is required'
      });
    }

    const result = await AdvancedTradeService.cancelOrder(orderId, userAddress);

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: result
    });

  } catch (error) {
    console.error('❌ Order cancellation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to cancel order'
    });
  }
});

// Get user's open orders
router.get('/orders/open', auth, async (req, res) => {
  try {
    const { userAddress, pairId, limit = 50, offset = 0 } = req.query;
    
    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'User address is required'
      });
    }

    const orders = await AdvancedTradeService.getUserOpenOrders(userAddress, pairId);

    res.json({
      success: true,
      data: orders.slice(parseInt(offset), parseInt(offset) + parseInt(limit))
    });

  } catch (error) {
    console.error('❌ Failed to get open orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch open orders'
    });
  }
});

// Get user's order history
router.get('/orders/history', auth, async (req, res) => {
  try {
    const { userAddress, pairId, limit = 50, offset = 0 } = req.query;
    
    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'User address is required'
      });
    }

    const result = await AdvancedTradeService.getOrderHistory(
      userAddress, 
      pairId, 
      parseInt(limit), 
      parseInt(offset)
    );

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Failed to get order history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order history'
    });
  }
});

// Get user's portfolio
router.get('/portfolio/:userAddress', auth, async (req, res) => {
  try {
    const { userAddress } = req.params;
    const { currency } = req.query;

    const portfolio = await AdvancedTradeService.getUserPortfolio(userAddress);
    
    // Convert values to user's preferred currency if specified
    if (currency && currency !== 'XRP') {
      const convertedPortfolio = await convertPortfolioToCurrency(portfolio, currency);
      return res.json({
        success: true,
        data: convertedPortfolio
      });
    }

    res.json({
      success: true,
      data: portfolio
    });

  } catch (error) {
    console.error('❌ Failed to get portfolio:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch portfolio'
    });
  }
});

// Get trading statistics for a user
router.get('/stats/:userAddress', auth, async (req, res) => {
  try {
    const { userAddress } = req.params;
    const { timeframe = '30d' } = req.query;

    // Mock trading statistics - in production, calculate from actual data
    const stats = {
      totalTrades: 245,
      totalVolume: 15678.90,
      winRate: 68.5,
      profitLoss: 1234.56,
      avgTradeSize: 64.01,
      bestTrade: 156.78,
      worstTrade: -89.32,
      timeframe: timeframe
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Failed to get trading stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trading statistics'
    });
  }
});

// Get market depth for analysis
router.get('/depth/:pairId', async (req, res) => {
  try {
    const { pairId } = req.params;
    const { depth = 50 } = req.query;

    const orderBook = await AdvancedTradeService.getOrderBook(pairId);
    
    if (!orderBook) {
      return res.status(404).json({
        success: false,
        error: 'Trading pair not found'
      });
    }

    // Calculate cumulative depth
    const calculateCumulativeDepth = (orders, isBid = true) => {
      let cumulative = 0;
      return orders.slice(0, parseInt(depth)).map(order => {
        cumulative += order.amount;
        return {
          price: order.price,
          amount: order.amount,
          total: order.total,
          cumulative: cumulative
        };
      });
    };

    const depthData = {
      pairId,
      bids: calculateCumulativeDepth(orderBook.bids, true),
      asks: calculateCumulativeDepth(orderBook.asks, false),
      spread: orderBook.spread,
      lastUpdated: orderBook.lastUpdated
    };

    res.json({
      success: true,
      data: depthData
    });

  } catch (error) {
    console.error('❌ Failed to get market depth:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market depth'
    });
  }
});

// Get candlestick data for charts
router.get('/candles/:pairId', async (req, res) => {
  try {
    const { pairId } = req.params;
    const { interval = '1h', limit = 100 } = req.query;

    // Mock candlestick data - in production, this would come from your OHLCV data
    const candles = Array.from({ length: Math.min(parseInt(limit), 500) }, (_, i) => {
      const timestamp = Date.now() - i * getIntervalMs(interval);
      const basePrice = 0.001200;
      const volatility = 0.0001;
      
      const open = basePrice + (Math.random() - 0.5) * volatility;
      const close = open + (Math.random() - 0.5) * volatility * 0.5;
      const high = Math.max(open, close) + Math.random() * volatility * 0.3;
      const low = Math.min(open, close) - Math.random() * volatility * 0.3;
      const volume = Math.random() * 10000 + 1000;

      return {
        timestamp,
        open: parseFloat(open.toFixed(6)),
        high: parseFloat(high.toFixed(6)),
        low: parseFloat(low.toFixed(6)),
        close: parseFloat(close.toFixed(6)),
        volume: parseFloat(volume.toFixed(2))
      };
    }).reverse();

    res.json({
      success: true,
      data: {
        pairId,
        interval,
        candles
      }
    });

  } catch (error) {
    console.error('❌ Failed to get candle data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch candle data'
    });
  }
});

// Calculate trade simulation
router.post('/simulate', async (req, res) => {
  try {
    const { pairId, side, amount, orderType, price } = req.body;

    if (!pairId || !side || !amount || !orderType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: pairId, side, amount, orderType'
      });
    }

    const orderBook = await AdvancedTradeService.getOrderBook(pairId);
    const currentPrice = await AdvancedTradeService.getCurrentPrice(pairId);

    let simulation;

    if (orderType === 'market') {
      const orders = side === 'buy' ? orderBook.asks : orderBook.bids;
      simulation = simulateMarketOrder(orders, parseFloat(amount), side);
    } else if (orderType === 'limit' && price) {
      simulation = simulateLimitOrder(currentPrice, parseFloat(price), parseFloat(amount), side);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid order parameters'
      });
    }

    res.json({
      success: true,
      data: {
        ...simulation,
        currentPrice,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Trade simulation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to simulate trade'
    });
  }
});

// Helper functions
function getIntervalMs(interval) {
  const intervals = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000
  };
  return intervals[interval] || intervals['1h'];
}

function simulateMarketOrder(orders, amount, side) {
  let remainingAmount = amount;
  let totalCost = 0;
  let avgPrice = 0;
  const executions = [];

  for (const order of orders) {
    if (remainingAmount <= 0) break;

    const executeAmount = Math.min(remainingAmount, order.amount);
    const executionCost = executeAmount * order.price;
    
    executions.push({
      price: order.price,
      amount: executeAmount,
      cost: executionCost
    });

    totalCost += executionCost;
    remainingAmount -= executeAmount;
  }

  const filledAmount = amount - remainingAmount;
  avgPrice = filledAmount > 0 ? totalCost / filledAmount : 0;

  return {
    orderType: 'market',
    side,
    requestedAmount: amount,
    filledAmount,
    avgPrice,
    totalCost,
    executions,
    canFillCompletely: remainingAmount === 0,
    slippage: executions.length > 0 ? 
      Math.abs((executions[executions.length - 1].price - executions[0].price) / executions[0].price) * 100 : 0
  };
}

function simulateLimitOrder(currentPrice, limitPrice, amount, side) {
  const willExecuteImmediately = (side === 'buy' && limitPrice >= currentPrice) || 
                                 (side === 'sell' && limitPrice <= currentPrice);

  return {
    orderType: 'limit',
    side,
    amount,
    limitPrice,
    currentPrice,
    willExecuteImmediately,
    estimatedCost: amount * limitPrice,
    priceImprovement: side === 'buy' ? 
      Math.max(0, currentPrice - limitPrice) : 
      Math.max(0, limitPrice - currentPrice)
  };
}

async function convertPortfolioToCurrency(portfolio, targetCurrency) {
  try {
    const converted = { ...portfolio };
    
    // Convert XRP balance to target currency
    if (portfolio.xrpBalance) {
      const xrpInUsd = parseFloat(portfolio.xrpBalance) * 0.5; // Mock XRP price
      const convertedBalance = await CurrencyService.convertCurrency(xrpInUsd, 'USD', targetCurrency);
      converted.xrpBalance = {
        original: portfolio.xrpBalance,
        converted: convertedBalance,
        currency: targetCurrency,
        formatted: CurrencyService.formatCurrency(convertedBalance, targetCurrency)
      };
    }

    return converted;
  } catch (error) {
    console.error('❌ Portfolio conversion failed:', error);
    return portfolio;
  }
}

module.exports = router;