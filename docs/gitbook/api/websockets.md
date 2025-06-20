# WebSocket API Reference

## Overview

The NexVestXR WebSocket API provides real-time data streaming for trading, portfolio updates, and system notifications. The WebSocket server supports multiple concurrent connections with intelligent connection management and automatic reconnection.

## Connection Details

- **Production**: `wss://api.nexvestxr.com/ws`
- **Staging**: `wss://staging-api.nexvestxr.com/ws`
- **Development**: `ws://localhost:8080`

## Authentication

WebSocket connections require authentication after establishing the connection:

```javascript
const ws = new WebSocket('wss://api.nexvestxr.com/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'authenticate',
    token: 'your-jwt-token'
  }));
};
```

## Message Format

All WebSocket messages use JSON format:

```json
{
  "type": "message_type",
  "data": { ... },
  "timestamp": 1640995200000
}
```

## Supported Channels

### Public Channels (No Authentication Required)

| Channel | Description | Parameters |
|---------|-------------|------------|
| `orderbook` | Order book updates | `pair` (required) |
| `trades` | Recent trade data | `pair` (required) |
| `price` | Price updates | `symbol` (required) |
| `arbitrage` | Cross-chain arbitrage opportunities | None |
| `risk_alerts` | Platform risk alerts | None |

### Private Channels (Authentication Required)

| Channel | Description | Parameters |
|---------|-------------|------------|
| `portfolio` | Portfolio value updates | None |
| `orders` | User order updates | None |
| `positions` | Margin position updates | None |
| `margin_calls` | Margin call notifications | None |

## Subscription Management

### Subscribe to Channels

```json
{
  "type": "subscribe",
  "channels": [
    {
      "type": "orderbook",
      "pair": "LUXURY001/XRP"
    },
    {
      "type": "portfolio"
    }
  ]
}
```

### Unsubscribe from Channels

```json
{
  "type": "unsubscribe",
  "channels": [
    {
      "type": "orderbook",
      "pair": "LUXURY001/XRP"
    }
  ]
}
```

## Real-Time Data Streams

### Order Book Updates

```json
{
  "type": "orderbook_update",
  "channel": "orderbook_LUXURY001/XRP",
  "data": {
    "pair": "LUXURY001/XRP",
    "bids": [
      {"price": "1000.00", "amount": "500.00", "total": "500000.00"},
      {"price": "999.50", "amount": "300.00", "total": "299850.00"}
    ],
    "asks": [
      {"price": "1000.50", "amount": "200.00", "total": "200100.00"},
      {"price": "1001.00", "amount": "400.00", "total": "400400.00"}
    ],
    "sequence": 12345,
    "spread": "0.50"
  },
  "timestamp": 1640995200000
}
```

### Trade Execution

```json
{
  "type": "trade",
  "channel": "trades_LUXURY001/XRP",
  "data": {
    "pair": "LUXURY001/XRP",
    "tradeId": "trade_123456789",
    "price": "1000.25",
    "amount": "50.00",
    "side": "buy",
    "timestamp": 1640995200000,
    "sequence": 12346
  },
  "timestamp": 1640995200000
}
```

### Price Updates

```json
{
  "type": "price_update",
  "channel": "price_LUXURY001",
  "data": {
    "symbol": "LUXURY001",
    "price": "1000.25",
    "change24h": "+2.5%",
    "volume24h": "125000.00",
    "high24h": "1005.00",
    "low24h": "985.00",
    "marketCap": "50000000.00"
  },
  "timestamp": 1640995200000
}
```

### Portfolio Updates

```json
{
  "type": "portfolio_update",
  "channel": "portfolio",
  "data": {
    "totalValue": "1520000.00",
    "change": "+20000.00",
    "changePercent": "+1.33%",
    "positions": [
      {
        "symbol": "LUXURY001",
        "balance": "500.00",
        "value": "500125.00",
        "change": "+125.00"
      }
    ]
  },
  "timestamp": 1640995200000
}
```

### Order Updates

```json
{
  "type": "order_update",
  "channel": "orders",
  "data": {
    "orderId": "order_123456789",
    "status": "partially_filled",
    "side": "buy",
    "type": "limit",
    "pair": "LUXURY001/XRP",
    "amount": "100.00",
    "filled": "25.00",
    "remaining": "75.00",
    "averagePrice": "1000.50",
    "lastFillPrice": "1000.25",
    "lastFillAmount": "25.00"
  },
  "timestamp": 1640995200000
}
```

## Advanced Trading Features

### Margin Position Updates

```json
{
  "type": "position_update",
  "channel": "positions",
  "data": {
    "positionId": "pos_123456789",
    "pair": "LUXURY001/XRP",
    "side": "long",
    "size": "1000.00",
    "entryPrice": "1000.00",
    "markPrice": "1005.00",
    "pnl": "+5000.00",
    "pnlPercent": "+0.50%",
    "margin": "100000.00",
    "marginRatio": "0.10",
    "liquidationPrice": "900.00"
  },
  "timestamp": 1640995200000
}
```

### Margin Call Alerts

```json
{
  "type": "margin_call",
  "channel": "margin_calls",
  "data": {
    "positionId": "pos_123456789",
    "severity": "warning",
    "currentMarginRatio": "0.05",
    "requiredMarginRatio": "0.10",
    "requiredDeposit": "50000.00",
    "liquidationPrice": "950.00",
    "timeToLiquidation": "3600",
    "message": "Margin call: Please deposit additional funds or reduce position size"
  },
  "timestamp": 1640995200000
}
```

### Arbitrage Opportunities

```json
{
  "type": "arbitrage_opportunity",
  "channel": "arbitrage",
  "data": {
    "opportunityId": "arb_123456789",
    "tokenPair": "LUXURY001",
    "xrplPrice": "1000.00",
    "flarePrice": "1015.00",
    "spreadPercent": "1.50%",
    "estimatedProfit": "15.00",
    "minAmount": "100.00",
    "maxAmount": "10000.00",
    "expiresAt": 1640995800000,
    "confidence": "high"
  },
  "timestamp": 1640995200000
}
```

## Trading Commands

### Place Order via WebSocket

```json
{
  "type": "place_order",
  "orderType": "limit",
  "orderData": {
    "pair": "LUXURY001/XRP",
    "side": "buy",
    "amount": "100.00",
    "price": "995.00",
    "timeInForce": "GTC"
  }
}
```

**Response:**
```json
{
  "type": "order_placed",
  "orderType": "limit",
  "result": {
    "orderId": "order_123456789",
    "status": "pending",
    "message": "Order placed successfully"
  },
  "timestamp": 1640995200000
}
```

### Cancel Order

```json
{
  "type": "cancel_order",
  "orderId": "order_123456789"
}
```

**Response:**
```json
{
  "type": "order_cancelled",
  "orderId": "order_123456789",
  "result": {
    "status": "cancelled",
    "message": "Order cancelled successfully"
  },
  "timestamp": 1640995200000
}
```

### Advanced Order Types

#### Stop-Loss Order

```json
{
  "type": "place_order",
  "orderType": "stop_loss",
  "orderData": {
    "pair": "LUXURY001/XRP",
    "side": "sell",
    "amount": "100.00",
    "stopPrice": "950.00",
    "limitPrice": "945.00"
  }
}
```

#### OCO (One-Cancels-Other) Order

```json
{
  "type": "place_order",
  "orderType": "oco",
  "orderData": {
    "pair": "LUXURY001/XRP",
    "side": "sell",
    "amount": "100.00",
    "stopPrice": "950.00",
    "limitPrice": "945.00",
    "targetPrice": "1050.00"
  }
}
```

## Connection Management

### Heartbeat/Ping-Pong

The server automatically sends ping frames every 15 seconds. Clients should respond with pong frames or send their own ping messages:

```json
{
  "type": "ping"
}
```

**Server Response:**
```json
{
  "type": "pong",
  "timestamp": 1640995200000
}
```

### Connection Statistics

```json
{
  "type": "connection_stats",
  "data": {
    "connectedAt": 1640995000000,
    "messagesReceived": 1250,
    "messagesSent": 850,
    "subscriptions": 5,
    "latency": 45
  },
  "timestamp": 1640995200000
}
```

## Error Handling

### Error Message Format

```json
{
  "type": "error",
  "error": {
    "code": "INVALID_SUBSCRIPTION",
    "message": "Channel 'invalid_channel' is not supported",
    "details": "Supported channels: orderbook, trades, price, portfolio"
  },
  "timestamp": 1640995200000
}
```

### Common Error Codes

| Code | Description | Action Required |
|------|-------------|-----------------|
| `AUTH_REQUIRED` | Authentication needed | Send authenticate message |
| `AUTH_FAILED` | Invalid token | Refresh JWT token |
| `INVALID_SUBSCRIPTION` | Unsupported channel | Check channel name |
| `RATE_LIMIT_EXCEEDED` | Too many messages | Reduce message frequency |
| `ORDER_FAILED` | Order placement failed | Check order parameters |
| `INSUFFICIENT_BALANCE` | Not enough funds | Add funds to account |

## Implementation Examples

### React Hook for WebSocket

```javascript
import { useState, useEffect, useRef } from 'react';

export const useNexVestXRWebSocket = (token) => {
  const [isConnected, setIsConnected] = useState(false);
  const [data, setData] = useState({});
  const ws = useRef(null);

  useEffect(() => {
    if (!token) return;

    ws.current = new WebSocket('wss://api.nexvestxr.com/ws');

    ws.current.onopen = () => {
      setIsConnected(true);
      // Authenticate
      ws.current.send(JSON.stringify({
        type: 'authenticate',
        token: token
      }));
    };

    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setData(prevData => ({
        ...prevData,
        [message.type]: message.data
      }));
    };

    ws.current.onclose = () => {
      setIsConnected(false);
      // Implement reconnection logic
      setTimeout(() => {
        // Reconnect
      }, 5000);
    };

    return () => {
      ws.current?.close();
    };
  }, [token]);

  const subscribe = (channels) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'subscribe',
        channels
      }));
    }
  };

  const placeOrder = (orderType, orderData) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'place_order',
        orderType,
        orderData
      }));
    }
  };

  return {
    isConnected,
    data,
    subscribe,
    placeOrder
  };
};
```

### Vue.js Composition API

```javascript
import { ref, onMounted, onUnmounted } from 'vue';

export function useWebSocket(token) {
  const isConnected = ref(false);
  const data = ref({});
  let ws = null;

  const connect = () => {
    ws = new WebSocket('wss://api.nexvestxr.com/ws');

    ws.onopen = () => {
      isConnected.value = true;
      ws.send(JSON.stringify({
        type: 'authenticate',
        token: token.value
      }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      data.value[message.type] = message.data;
    };

    ws.onclose = () => {
      isConnected.value = false;
    };
  };

  const subscribe = (channels) => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'subscribe',
        channels
      }));
    }
  };

  onMounted(() => {
    if (token.value) {
      connect();
    }
  });

  onUnmounted(() => {
    ws?.close();
  });

  return {
    isConnected,
    data,
    subscribe
  };
}
```

### Python WebSocket Client

```python
import asyncio
import websockets
import json

class NexVestXRWebSocket:
    def __init__(self, token):
        self.token = token
        self.uri = "wss://api.nexvestxr.com/ws"
        self.websocket = None
        self.subscriptions = []

    async def connect(self):
        self.websocket = await websockets.connect(self.uri)
        
        # Authenticate
        await self.websocket.send(json.dumps({
            'type': 'authenticate',
            'token': self.token
        }))

    async def subscribe(self, channels):
        if self.websocket:
            await self.websocket.send(json.dumps({
                'type': 'subscribe',
                'channels': channels
            }))
            self.subscriptions.extend(channels)

    async def listen(self, callback):
        async for message in self.websocket:
            data = json.loads(message)
            await callback(data)

    async def place_order(self, order_type, order_data):
        if self.websocket:
            await self.websocket.send(json.dumps({
                'type': 'place_order',
                'orderType': order_type,
                'orderData': order_data
            }))

# Usage
async def message_handler(data):
    print(f"Received: {data}")

async def main():
    ws = NexVestXRWebSocket('your-token')
    await ws.connect()
    
    await ws.subscribe([
        {'type': 'orderbook', 'pair': 'LUXURY001/XRP'},
        {'type': 'portfolio'}
    ])
    
    await ws.listen(message_handler)

asyncio.run(main())
```

## Performance Considerations

### Message Frequency

- Order book updates: Up to 10/second per pair
- Trade updates: Real-time as they occur
- Price updates: Every 1-5 seconds
- Portfolio updates: Every 10 seconds or on change

### Bandwidth Usage

- Order book snapshot: ~2KB
- Order book update: ~500B
- Trade message: ~200B
- Portfolio update: ~1KB

### Best Practices

1. **Subscribe only to needed channels** to reduce bandwidth
2. **Implement exponential backoff** for reconnection
3. **Buffer rapid updates** in the UI to prevent performance issues
4. **Use compression** when available (enabled by default)
5. **Monitor connection health** with ping/pong messages

## Rate Limiting

WebSocket connections have the following limits:

- **Maximum concurrent connections per user**: 5
- **Messages per second**: 50
- **Subscriptions per connection**: 20
- **Order commands per minute**: 100

## Security

### Connection Security

- All connections use WSS (WebSocket Secure)
- JWT tokens expire and require refresh
- Invalid tokens result in immediate disconnection
- IP-based rate limiting prevents abuse

### Data Privacy

- Private channels require authentication
- User data is only sent to authenticated connections
- Order information is filtered by user ownership
- Portfolio data is user-specific

---

*For more information on WebSocket implementation, see the [API Overview](README.md) and [Authentication](authentication.md) documentation.*