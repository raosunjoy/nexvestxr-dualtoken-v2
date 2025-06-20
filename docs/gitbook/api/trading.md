# Trading API Reference

## Overview

The NexVestXR Trading API provides comprehensive trading functionality for property tokens across XRPL and Flare networks. This includes basic spot trading, advanced order types, margin trading, and cross-chain arbitrage opportunities.

## Base Endpoints

- **Basic Trading**: `/trade/*`
- **Advanced Trading**: `/advanced-trade/*`
- **Dual Token Trading**: `/dual-token/*`
- **Order Management**: `/orders/*`

## Authentication

All trading endpoints require authentication:

```bash
Authorization: Bearer <jwt-token>
# OR
X-API-Key: <api-key>  # Institutional users
```

## Rate Limits

| User Tier | Trading Orders | Market Data | Order Updates |
|-----------|----------------|-------------|---------------|
| Basic | 50/minute | 100/minute | 200/minute |
| Premium | 200/minute | 500/minute | 1000/minute |
| Institutional | 1000/minute | 2000/minute | 5000/minute |

## Basic Trading Operations

### Buy Tokens

Execute a market buy order for property tokens.

**Endpoint:** `POST /trade/buy`

**Request:**
```json
{
  "tokenCode": "LUXURY001",
  "issuerAddress": "rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH",
  "amount": 100,
  "paymentAmount": 100000,
  "slippageTolerance": 0.05,
  "timeInForce": "IOC"
}
```

**Response:**
```json
{
  "success": true,
  "transaction": {
    "transactionId": "txn_buy_1640995200_abc123",
    "type": "market_buy",
    "tokenCode": "LUXURY001",
    "amount": 100,
    "averagePrice": 1000,
    "totalCost": 100000,
    "fees": {
      "tradingFee": 250,
      "networkFee": 12,
      "totalFees": 262
    },
    "status": "completed",
    "executedAt": "2023-12-01T10:30:00.000Z",
    "blockchainTxHash": "A1B2C3D4E5F6789ABC123DEF456789..."
  }
}
```

**Parameters:**
- `tokenCode`: Property token symbol
- `issuerAddress`: Token issuer's XRPL address
- `amount`: Number of tokens to buy
- `paymentAmount`: Maximum amount to spend (in drops for XRP pairs)
- `slippageTolerance`: Maximum price slippage (0.01 = 1%)
- `timeInForce`: Order time in force (IOC, FOK, GTC)

---

### Sell Tokens

Execute a market sell order for property tokens.

**Endpoint:** `POST /trade/sell`

**Request:**
```json
{
  "tokenCode": "LUXURY001", 
  "issuerAddress": "rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH",
  "amount": 50,
  "receiveAmount": 52000,
  "slippageTolerance": 0.05,
  "timeInForce": "IOC"
}
```

**Response:**
```json
{
  "success": true,
  "transaction": {
    "transactionId": "txn_sell_1640995200_def456",
    "type": "market_sell",
    "tokenCode": "LUXURY001",
    "amount": 50,
    "averagePrice": 1040,
    "totalReceived": 52000,
    "fees": {
      "tradingFee": 130,
      "networkFee": 12,
      "totalFees": 142
    },
    "status": "completed",
    "executedAt": "2023-12-01T10:30:00.000Z",
    "blockchainTxHash": "B2C3D4E5F6789ABC123DEF456789ABC..."
  }
}
```

---

### Limit Orders

Create a limit order to buy or sell at a specific price.

**Endpoint:** `POST /trade/limit-order`

**Request:**
```json
{
  "tokenCode": "LUXURY001",
  "issuerAddress": "rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH",
  "amount": 200,
  "pricePerToken": 950,
  "type": "buy",
  "timeInForce": "GTC",
  "expiresAt": "2023-12-08T10:30:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "transaction": {
    "orderId": "order_limit_1640995200_ghi789",
    "type": "limit",
    "side": "buy",
    "tokenCode": "LUXURY001",
    "amount": 200,
    "price": 950,
    "filled": 0,
    "remaining": 200,
    "status": "pending",
    "timeInForce": "GTC",
    "createdAt": "2023-12-01T10:30:00.000Z",
    "expiresAt": "2023-12-08T10:30:00.000Z"
  }
}
```

---

### Get Order Book

Retrieve current order book for a token pair.

**Endpoint:** `GET /trade/order-book/:tokenCode/:issuerAddress`

**Query Parameters:**
- `depth`: Number of price levels (default: 20, max: 100)
- `precision`: Price precision (default: auto)

**Response:**
```json
{
  "success": true,
  "orderBook": {
    "tokenCode": "LUXURY001",
    "issuerAddress": "rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH",
    "lastUpdate": "2023-12-01T10:30:00.000Z",
    "bids": [
      {
        "price": "1000.00",
        "amount": "500.00",
        "total": "500000.00",
        "orders": 3
      },
      {
        "price": "999.50", 
        "amount": "300.00",
        "total": "299850.00",
        "orders": 2
      }
    ],
    "asks": [
      {
        "price": "1005.00",
        "amount": "200.00", 
        "total": "201000.00",
        "orders": 1
      },
      {
        "price": "1010.00",
        "amount": "400.00",
        "total": "404000.00", 
        "orders": 4
      }
    ],
    "spread": {
      "absolute": "5.00",
      "percentage": "0.50%"
    },
    "statistics": {
      "lastPrice": "1002.50",
      "volume24h": "125000.00",
      "change24h": "+2.50%",
      "high24h": "1015.00",
      "low24h": "985.00"
    }
  }
}
```

---

### Trading History

Get historical trading data for a token pair.

**Endpoint:** `GET /trade/history`

**Query Parameters:**
- `tokenCode`: Token symbol (optional)
- `issuerAddress`: Issuer address (optional)
- `limit`: Number of trades (default: 50, max: 500)
- `startTime`: Start timestamp
- `endTime`: End timestamp

**Response:**
```json
{
  "success": true,
  "history": [
    {
      "tradeId": "trade_1640995200_abc123",
      "tokenCode": "LUXURY001",
      "price": "1002.50",
      "amount": "25.00",
      "side": "buy",
      "timestamp": "2023-12-01T10:30:00.000Z",
      "buyer": "rBuyerAddress...",
      "seller": "rSellerAddress...",
      "fees": "62.66"
    }
  ],
  "pagination": {
    "total": 1250,
    "page": 1,
    "limit": 50,
    "hasNext": true
  }
}
```

## Advanced Trading Features

### Stop-Loss Orders

Create stop-loss orders to limit losses.

**Endpoint:** `POST /advanced-trade/stop-loss`

**Request:**
```json
{
  "pairId": "LUXURY001/XRP",
  "side": "sell",
  "amount": 100,
  "stopPrice": 900,
  "limitPrice": 890,
  "timeInForce": "GTC"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "stop_loss_1640995200_jkl012",
    "type": "stop_loss",
    "status": "active",
    "triggerPrice": 900,
    "executionPrice": 890,
    "amount": 100,
    "side": "sell",
    "createdAt": "2023-12-01T10:30:00.000Z"
  }
}
```

---

### OCO (One-Cancels-Other) Orders

Create OCO orders combining profit-taking and stop-loss.

**Endpoint:** `POST /advanced-trade/oco`

**Request:**
```json
{
  "pairId": "LUXURY001/XRP",
  "side": "sell",
  "amount": 100,
  "stopPrice": 900,
  "limitPrice": 890,
  "targetPrice": 1100
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "ocoOrderId": "oco_1640995200_mno345",
    "stopLossOrder": {
      "orderId": "stop_123",
      "triggerPrice": 900,
      "executionPrice": 890
    },
    "takeProfitOrder": {
      "orderId": "limit_456", 
      "executionPrice": 1100
    },
    "status": "active",
    "amount": 100,
    "side": "sell",
    "createdAt": "2023-12-01T10:30:00.000Z"
  }
}
```

---

### Trailing Stop Orders

Create trailing stop orders that adjust with price movements.

**Endpoint:** `POST /advanced-trade/trailing-stop`

**Request:**
```json
{
  "pairId": "LUXURY001/XRP",
  "side": "sell",
  "amount": 100,
  "trailAmount": 50,
  "trailPercent": 5.0,
  "activationPrice": 1050
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "trailing_1640995200_pqr678",
    "type": "trailing_stop",
    "status": "active",
    "amount": 100,
    "side": "sell",
    "trailAmount": 50,
    "trailPercent": 5.0,
    "activationPrice": 1050,
    "currentStopPrice": null,
    "createdAt": "2023-12-01T10:30:00.000Z"
  }
}
```

---

### Margin Trading

Open leveraged positions on property tokens.

**Endpoint:** `POST /advanced-trade/margin`

**Request:**
```json
{
  "pairId": "LUXURY001/XRP",
  "side": "long",
  "amount": 1000,
  "price": 1000,
  "leverage": 2.0,
  "marginType": "isolated",
  "stopLoss": 900,
  "takeProfit": 1200
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "positionId": "pos_1640995200_stu901",
    "pairId": "LUXURY001/XRP",
    "side": "long",
    "size": 1000,
    "entryPrice": 1000,
    "leverage": 2.0,
    "margin": 500000,
    "marginType": "isolated",
    "stopLoss": 900,
    "takeProfit": 1200,
    "liquidationPrice": 750,
    "status": "open",
    "openedAt": "2023-12-01T10:30:00.000Z"
  }
}
```

---

### Add Liquidity

Add liquidity to automated market maker (AMM) pools.

**Endpoint:** `POST /advanced-trade/liquidity/add`

**Request:**
```json
{
  "pairId": "LUXURY001/XRP",
  "tokenAmount": 1000,
  "xrpAmount": 1000000,
  "slippageTolerance": 0.01,
  "deadline": "2023-12-01T11:00:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionId": "liquidity_add_1640995200_vwx234",
    "pairId": "LUXURY001/XRP",
    "tokenAmount": 1000,
    "xrpAmount": 1000000,
    "lpTokens": 1000,
    "share": "0.1%",
    "fees": {
      "networkFee": 12,
      "protocolFee": 0
    },
    "status": "completed",
    "executedAt": "2023-12-01T10:30:00.000Z"
  }
}
```

## Dual Token Trading

### XERA Trading (XRPL)

Trade XERA tokens and access city-based pools.

**Endpoint:** `POST /dual-token/xera/trade`

**Request:**
```json
{
  "cityCode": "MUM",
  "action": "buy",
  "amount": 1000,
  "maxPrice": 1250,
  "poolType": "diversified"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionHash": "C3D4E5F6789ABC123DEF456789ABC123",
    "xeraAmount": 1000,
    "averagePrice": 1247,
    "cityPool": "Mumbai Diversified Pool",
    "stakingRewards": {
      "apy": "8.7%",
      "monthlyReward": 87
    },
    "benefits": {
      "governanceVoting": true,
      "premiumAccess": true,
      "crossChainBenefits": true
    }
  }
}
```

---

### PROPX Trading (Flare)

Invest in specific PROPX property tokens.

**Endpoint:** `POST /dual-token/propx/invest`

**Request:**
```json
{
  "tokenAddress": "0xabcdef1234567890abcdef1234567890abcdef12",
  "tokenAmount": 5000,
  "isInstitutional": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionHash": "0x123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    "projectCode": "PRESTIGE-TECH-002",
    "tokenAmount": 5000,
    "investmentValue": 500000,
    "benefits": {
      "xeraDiscounts": "2.5%",
      "priorityAccess": true,
      "crossChainRewards": true
    },
    "projectDetails": {
      "fundingProgress": "68%",
      "expectedCompletion": "36 months",
      "projectedROI": "15%"
    }
  }
}
```

## Order Management

### Get User Orders

Retrieve user's order history and status.

**Endpoint:** `GET /orders/user`

**Query Parameters:**
- `status`: Order status filter (pending, filled, cancelled, expired)
- `type`: Order type filter (market, limit, stop_loss, oco)
- `pairId`: Trading pair filter
- `page`: Page number
- `limit`: Results per page

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "orderId": "order_1640995200_abc123",
        "type": "limit",
        "side": "buy",
        "pairId": "LUXURY001/XRP",
        "amount": 100,
        "price": 950,
        "filled": 25,
        "remaining": 75,
        "status": "partially_filled",
        "averagePrice": 951,
        "fees": 59.44,
        "createdAt": "2023-12-01T10:30:00.000Z",
        "updatedAt": "2023-12-01T10:35:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 156,
      "pages": 8
    }
  }
}
```

---

### Cancel Order

Cancel an existing order.

**Endpoint:** `DELETE /orders/:orderId`

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "order_1640995200_abc123",
    "status": "cancelled",
    "cancelledAt": "2023-12-01T10:45:00.000Z",
    "refund": {
      "amount": 71250,
      "currency": "XRP",
      "transactionHash": "D4E5F6789ABC123DEF456789ABC123DEF"
    }
  }
}
```

---

### Modify Order

Update price or quantity of an existing order.

**Endpoint:** `PUT /orders/:orderId`

**Request:**
```json
{
  "price": 960,
  "amount": 150
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "order_1640995200_abc123",
    "originalPrice": 950,
    "newPrice": 960,
    "originalAmount": 100,
    "newAmount": 150,
    "status": "updated",
    "updatedAt": "2023-12-01T10:50:00.000Z"
  }
}
```

## Portfolio Integration

### Get Trading Portfolio

Get detailed trading portfolio with P&L analysis.

**Endpoint:** `GET /trade/portfolio`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalValue": 1520000,
    "totalInvested": 1400000,
    "totalPnL": 120000,
    "totalPnLPercent": 8.57,
    "dayPnL": 15000,
    "dayPnLPercent": 1.0,
    "positions": [
      {
        "tokenCode": "LUXURY001",
        "amount": 500,
        "averagePrice": 1000,
        "currentPrice": 1025,
        "value": 512500,
        "pnl": 12500,
        "pnlPercent": 2.5,
        "allocation": 33.7
      }
    ],
    "openOrders": [
      {
        "orderId": "order_abc123",
        "type": "limit",
        "side": "buy",
        "amount": 100,
        "price": 980,
        "value": 98000
      }
    ]
  }
}
```

## Risk Management

### Position Sizing Calculator

Calculate optimal position size based on risk parameters.

**Endpoint:** `POST /trade/position-calculator`

**Request:**
```json
{
  "accountValue": 1000000,
  "riskPercent": 2.0,
  "entryPrice": 1000,
  "stopLoss": 950,
  "tokenCode": "LUXURY001"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "maxRiskAmount": 20000,
    "priceRisk": 50,
    "recommendedSize": 400,
    "recommendedValue": 400000,
    "riskReward": {
      "riskAmount": 20000,
      "potentialLoss": 50,
      "riskPercent": 5.0
    },
    "warnings": [
      "Position exceeds 40% of portfolio value",
      "Consider reducing size for better diversification"
    ]
  }
}
```

## Trading Fees

### Fee Structure

| User Tier | Maker Fee | Taker Fee | Advanced Orders | Margin Fee |
|-----------|-----------|-----------|-----------------|------------|
| Basic | 0.25% | 0.30% | 0.35% | 0.50% |
| Premium | 0.20% | 0.25% | 0.30% | 0.40% |
| Institutional | 0.15% | 0.20% | 0.25% | 0.30% |

### Fee Calculation

```javascript
function calculateTradingFees(amount, price, userTier, orderType) {
  const feeRates = {
    basic: { maker: 0.0025, taker: 0.003, advanced: 0.0035 },
    premium: { maker: 0.002, taker: 0.0025, advanced: 0.003 },
    institutional: { maker: 0.0015, taker: 0.002, advanced: 0.0025 }
  };

  const rate = feeRates[userTier][orderType];
  const tradeValue = amount * price;
  const fee = tradeValue * rate;
  
  return {
    tradeValue,
    feeRate: rate,
    feeAmount: fee,
    netAmount: orderType === 'buy' ? tradeValue + fee : tradeValue - fee
  };
}
```

## WebSocket Trading

### Real-Time Order Updates

Subscribe to order updates via WebSocket:

```javascript
const ws = new WebSocket('wss://api.nexvestxr.com/ws');

// Subscribe to order updates
ws.send(JSON.stringify({
  type: 'subscribe',
  channels: [{ type: 'orders' }]
}));

// Handle order updates
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'order_update') {
    const order = data.data;
    console.log(`Order ${order.orderId} status: ${order.status}`);
    
    if (order.status === 'filled') {
      console.log(`Order filled at average price: ${order.averagePrice}`);
    }
  }
};
```

### Live Trading Commands

Execute trades via WebSocket for ultra-low latency:

```javascript
// Place order via WebSocket
ws.send(JSON.stringify({
  type: 'place_order',
  orderType: 'limit',
  orderData: {
    pair: 'LUXURY001/XRP',
    side: 'buy',
    amount: 100,
    price: 995,
    timeInForce: 'IOC'
  }
}));

// Cancel order via WebSocket
ws.send(JSON.stringify({
  type: 'cancel_order',
  orderId: 'order_1640995200_abc123'
}));
```

## Error Handling

### Common Trading Errors

| Error Code | Description | Recovery Action |
|------------|-------------|-----------------|
| `INSUFFICIENT_BALANCE` | Not enough funds | Add funds or reduce order size |
| `INVALID_PRICE` | Price outside allowed range | Adjust price within limits |
| `ORDER_NOT_FOUND` | Order doesn't exist | Verify order ID |
| `MARKET_CLOSED` | Trading suspended | Wait for market to reopen |
| `PAIR_NOT_FOUND` | Trading pair unavailable | Check pair symbol |
| `MIN_ORDER_SIZE` | Order below minimum | Increase order size |
| `MAX_ORDER_SIZE` | Order above maximum | Reduce order size |

### Example Error Response

```json
{
  "success": false,
  "error": "INSUFFICIENT_BALANCE",
  "message": "Insufficient balance to place order",
  "details": {
    "required": 100000,
    "available": 75000,
    "currency": "XRP",
    "shortfall": 25000
  },
  "statusCode": 400,
  "recovery": {
    "action": "add_funds",
    "minimumAmount": 25000,
    "endpoint": "/payment/deposit"
  }
}
```

---

*For more information on WebSocket trading and real-time updates, see the [WebSocket API](websockets.md) documentation.*