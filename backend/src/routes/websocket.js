// ============================================================================
// WEBSOCKET API ROUTES - Real-time Trading & Market Data
// ============================================================================

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const RealTimeMarketService = require('../services/RealTimeMarketService');
const PROPXTradingService = require('../services/PROPXTradingService');
const AdvancedOrderEngine = require('../services/AdvancedOrderEngine');
const MarginTradingService = require('../services/MarginTradingService');
const CrossChainArbitrageService = require('../services/CrossChainArbitrageService');
const RealTimeRiskManagement = require('../services/RealTimeRiskManagement');

class WebSocketManager {
    constructor() {
        this.clients = new Map();
        this.subscriptions = new Map();
        this.wss = null;
        
        this.initializeWebSocketServer();
        this.setupEventListeners();
    }

    initializeWebSocketServer() {
        this.wss = new WebSocket.Server({
            port: process.env.WEBSOCKET_PORT || 8080,
            perMessageDeflate: {
                zlibDeflateOptions: {
                    level: 6,
                    chunkSize: 1024,
                },
                threshold: 1024,
                concurrencyLimit: 10,
                serverMaxWindowBits: 15,
                serverMaxNoContextTakeover: false,
                serverNoContextTakeover: false,
                clientMaxWindowBits: 15,
                clientMaxNoContextTakeover: false,
                zlibInflateOptions: {
                    chunkSize: 1024,
                },
            },
        });

        this.wss.on('connection', this.handleConnection.bind(this));
        
        logger.info(`WebSocket server started on port ${process.env.WEBSOCKET_PORT || 8080}`);
    }

    handleConnection(ws, req) {
        const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const client = {
            id: clientId,
            ws,
            authenticated: false,
            userId: null,
            userAddress: null,
            subscriptions: new Set(),
            lastPing: Date.now(),
            connectionTime: Date.now()
        };

        this.clients.set(clientId, client);
        
        logger.info(`WebSocket client connected: ${clientId}`);

        // Set up event handlers
        ws.on('message', (message) => this.handleMessage(clientId, message));
        ws.on('close', () => this.handleDisconnect(clientId));
        ws.on('error', (error) => this.handleError(clientId, error));
        ws.on('pong', () => this.handlePong(clientId));

        // Send welcome message
        this.sendToClient(clientId, {
            type: 'welcome',
            clientId,
            timestamp: Date.now(),
            serverInfo: {
                version: '2.0.0',
                supportedChannels: [
                    'orderbook', 'trades', 'price', 'portfolio', 'orders',
                    'positions', 'arbitrage', 'risk_alerts', 'margin_calls'
                ]
            }
        });

        // Start heartbeat
        this.startHeartbeat(clientId);
    }

    handleMessage(clientId, message) {
        try {
            const client = this.clients.get(clientId);
            if (!client) return;

            const data = JSON.parse(message.toString());
            
            logger.debug(`WebSocket message from ${clientId}:`, data);

            switch (data.type) {
                case 'authenticate':
                    this.handleAuthentication(clientId, data);
                    break;
                case 'subscribe':
                    this.handleSubscription(clientId, data);
                    break;
                case 'unsubscribe':
                    this.handleUnsubscription(clientId, data);
                    break;
                case 'place_order':
                    this.handlePlaceOrder(clientId, data);
                    break;
                case 'cancel_order':
                    this.handleCancelOrder(clientId, data);
                    break;
                case 'open_margin_position':
                    this.handleOpenMarginPosition(clientId, data);
                    break;
                case 'close_margin_position':
                    this.handleCloseMarginPosition(clientId, data);
                    break;
                case 'execute_arbitrage':
                    this.handleExecuteArbitrage(clientId, data);
                    break;
                case 'ping':
                    this.handlePing(clientId);
                    break;
                default:
                    this.sendError(clientId, 'UNKNOWN_MESSAGE_TYPE', `Unknown message type: ${data.type}`);
            }

        } catch (error) {
            logger.error(`Error handling WebSocket message from ${clientId}:`, error);
            this.sendError(clientId, 'INVALID_MESSAGE', 'Invalid JSON message');
        }
    }

    async handleAuthentication(clientId, data) {
        try {
            const { token } = data;
            
            if (!token) {
                this.sendError(clientId, 'MISSING_TOKEN', 'Authentication token required');
                return;
            }

            // Verify JWT token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const client = this.clients.get(clientId);
            
            if (client) {
                client.authenticated = true;
                client.userId = decoded.userId;
                client.userAddress = decoded.userAddress;
                client.authTime = Date.now();

                this.sendToClient(clientId, {
                    type: 'authenticated',
                    userId: decoded.userId,
                    timestamp: Date.now()
                });

                logger.info(`Client authenticated: ${clientId} - User: ${decoded.userId}`);
            }

        } catch (error) {
            logger.error(`Authentication failed for ${clientId}:`, error);
            this.sendError(clientId, 'AUTH_FAILED', 'Invalid authentication token');
        }
    }

    handleSubscription(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client) return;

        const { channels } = data;
        
        if (!Array.isArray(channels)) {
            this.sendError(clientId, 'INVALID_CHANNELS', 'Channels must be an array');
            return;
        }

        const validChannels = [
            'orderbook', 'trades', 'price', 'portfolio', 'orders',
            'positions', 'arbitrage', 'risk_alerts', 'margin_calls'
        ];

        const subscribedChannels = [];

        for (const channel of channels) {
            if (validChannels.includes(channel.type)) {
                // Check authentication for private channels
                if (['portfolio', 'orders', 'positions', 'margin_calls'].includes(channel.type) && !client.authenticated) {
                    this.sendError(clientId, 'AUTH_REQUIRED', `Authentication required for ${channel.type} channel`);
                    continue;
                }

                const channelKey = this.getChannelKey(channel);
                client.subscriptions.add(channelKey);
                subscribedChannels.push(channel);

                // Subscribe to real-time service
                RealTimeMarketService.subscribe(clientId, [channelKey]);

                logger.info(`Client ${clientId} subscribed to channel: ${channelKey}`);
            } else {
                this.sendError(clientId, 'INVALID_CHANNEL', `Invalid channel type: ${channel.type}`);
            }
        }

        this.sendToClient(clientId, {
            type: 'subscribed',
            channels: subscribedChannels,
            timestamp: Date.now()
        });
    }

    handleUnsubscription(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client) return;

        const { channels } = data;
        const unsubscribedChannels = [];

        for (const channel of channels) {
            const channelKey = this.getChannelKey(channel);
            if (client.subscriptions.has(channelKey)) {
                client.subscriptions.delete(channelKey);
                RealTimeMarketService.unsubscribe(clientId, [channelKey]);
                unsubscribedChannels.push(channel);
                
                logger.info(`Client ${clientId} unsubscribed from channel: ${channelKey}`);
            }
        }

        this.sendToClient(clientId, {
            type: 'unsubscribed',
            channels: unsubscribedChannels,
            timestamp: Date.now()
        });
    }

    async handlePlaceOrder(clientId, data) {
        try {
            const client = this.clients.get(clientId);
            if (!client || !client.authenticated) {
                this.sendError(clientId, 'AUTH_REQUIRED', 'Authentication required for trading');
                return;
            }

            const { orderType, orderData } = data;
            let result;

            switch (orderType) {
                case 'stop_loss':
                    result = await AdvancedOrderEngine.createStopLossOrder({
                        userId: client.userId,
                        userAddress: client.userAddress,
                        ...orderData
                    });
                    break;
                case 'oco':
                    result = await AdvancedOrderEngine.createOCOOrder({
                        userId: client.userId,
                        userAddress: client.userAddress,
                        ...orderData
                    });
                    break;
                case 'trailing_stop':
                    result = await AdvancedOrderEngine.createTrailingStopOrder({
                        userId: client.userId,
                        userAddress: client.userAddress,
                        ...orderData
                    });
                    break;
                case 'propx_market':
                    result = await PROPXTradingService.createPROPXMarketOrder(
                        client.userAddress,
                        orderData.pairId,
                        orderData.side,
                        orderData.amount
                    );
                    break;
                case 'propx_limit':
                    result = await PROPXTradingService.createPROPXLimitOrder(
                        client.userAddress,
                        orderData.pairId,
                        orderData.side,
                        orderData.amount,
                        orderData.price
                    );
                    break;
                default:
                    this.sendError(clientId, 'INVALID_ORDER_TYPE', `Unknown order type: ${orderType}`);
                    return;
            }

            this.sendToClient(clientId, {
                type: 'order_placed',
                orderType,
                result,
                timestamp: Date.now()
            });

        } catch (error) {
            logger.error(`Error placing order for ${clientId}:`, error);
            this.sendError(clientId, 'ORDER_FAILED', error.message);
        }
    }

    async handleCancelOrder(clientId, data) {
        try {
            const client = this.clients.get(clientId);
            if (!client || !client.authenticated) {
                this.sendError(clientId, 'AUTH_REQUIRED', 'Authentication required for trading');
                return;
            }

            const { orderId } = data;
            const result = await AdvancedOrderEngine.cancelOrder(orderId, client.userId);

            this.sendToClient(clientId, {
                type: 'order_cancelled',
                orderId,
                result,
                timestamp: Date.now()
            });

        } catch (error) {
            logger.error(`Error cancelling order for ${clientId}:`, error);
            this.sendError(clientId, 'CANCEL_FAILED', error.message);
        }
    }

    async handleOpenMarginPosition(clientId, data) {
        try {
            const client = this.clients.get(clientId);
            if (!client || !client.authenticated) {
                this.sendError(clientId, 'AUTH_REQUIRED', 'Authentication required for margin trading');
                return;
            }

            const { accountId, positionData } = data;
            const result = await MarginTradingService.openMarginPosition(accountId, positionData);

            this.sendToClient(clientId, {
                type: 'margin_position_opened',
                result,
                timestamp: Date.now()
            });

        } catch (error) {
            logger.error(`Error opening margin position for ${clientId}:`, error);
            this.sendError(clientId, 'MARGIN_POSITION_FAILED', error.message);
        }
    }

    async handleCloseMarginPosition(clientId, data) {
        try {
            const client = this.clients.get(clientId);
            if (!client || !client.authenticated) {
                this.sendError(clientId, 'AUTH_REQUIRED', 'Authentication required for margin trading');
                return;
            }

            const { positionId, closePrice, partial, closeAmount } = data;
            const result = await MarginTradingService.closeMarginPosition(
                positionId, 
                closePrice, 
                partial, 
                closeAmount
            );

            this.sendToClient(clientId, {
                type: 'margin_position_closed',
                result,
                timestamp: Date.now()
            });

        } catch (error) {
            logger.error(`Error closing margin position for ${clientId}:`, error);
            this.sendError(clientId, 'MARGIN_CLOSE_FAILED', error.message);
        }
    }

    async handleExecuteArbitrage(clientId, data) {
        try {
            const client = this.clients.get(clientId);
            if (!client || !client.authenticated) {
                this.sendError(clientId, 'AUTH_REQUIRED', 'Authentication required for arbitrage trading');
                return;
            }

            const { opportunityId, amount } = data;
            const result = await CrossChainArbitrageService.executeArbitrage(
                opportunityId,
                client.userAddress,
                amount
            );

            this.sendToClient(clientId, {
                type: 'arbitrage_executed',
                result,
                timestamp: Date.now()
            });

        } catch (error) {
            logger.error(`Error executing arbitrage for ${clientId}:`, error);
            this.sendError(clientId, 'ARBITRAGE_FAILED', error.message);
        }
    }

    handlePing(clientId) {
        const client = this.clients.get(clientId);
        if (client) {
            client.lastPing = Date.now();
            this.sendToClient(clientId, {
                type: 'pong',
                timestamp: Date.now()
            });
        }
    }

    handlePong(clientId) {
        const client = this.clients.get(clientId);
        if (client) {
            client.lastPing = Date.now();
        }
    }

    handleDisconnect(clientId) {
        const client = this.clients.get(clientId);
        if (client) {
            // Unsubscribe from all channels
            RealTimeMarketService.unsubscribe(clientId);
            
            // Clear client data
            this.clients.delete(clientId);
            
            logger.info(`WebSocket client disconnected: ${clientId}`);
        }
    }

    handleError(clientId, error) {
        logger.error(`WebSocket error for client ${clientId}:`, error);
    }

    startHeartbeat(clientId) {
        const client = this.clients.get(clientId);
        if (!client) return;

        const heartbeatInterval = setInterval(() => {
            if (!this.clients.has(clientId)) {
                clearInterval(heartbeatInterval);
                return;
            }

            const now = Date.now();
            const lastPing = client.lastPing;

            // Check if client is still alive (30 seconds timeout)
            if (now - lastPing > 30000) {
                logger.warn(`Client ${clientId} heartbeat timeout, closing connection`);
                client.ws.close();
                clearInterval(heartbeatInterval);
                return;
            }

            // Send ping every 15 seconds
            if (now - lastPing > 15000) {
                client.ws.ping();
            }
        }, 15000);
    }

    setupEventListeners() {
        // Real-time market data events
        RealTimeMarketService.on('client_message', (data) => {
            this.broadcastToSubscribers(data.channel, data.data);
        });

        // Order events
        AdvancedOrderEngine.on('order_triggered', (data) => {
            this.broadcastOrderEvent('order_triggered', data);
        });

        AdvancedOrderEngine.on('order_executed', (data) => {
            this.broadcastOrderEvent('order_executed', data);
        });

        AdvancedOrderEngine.on('order_failed', (data) => {
            this.broadcastOrderEvent('order_failed', data);
        });

        // Margin trading events
        MarginTradingService.on('position_opened', (data) => {
            this.broadcastUserEvent(data.position.userAddress, 'position_opened', data);
        });

        MarginTradingService.on('position_closed', (data) => {
            const position = MarginTradingService.getPosition(data.positionId);
            if (position) {
                this.broadcastUserEvent(position.userAddress, 'position_closed', data);
            }
        });

        MarginTradingService.on('margin_call', (data) => {
            this.broadcastUserEvent(data.userAddress, 'margin_call', data);
        });

        MarginTradingService.on('position_liquidated', (data) => {
            const position = MarginTradingService.getPosition(data.positionId);
            if (position) {
                this.broadcastUserEvent(position.userAddress, 'position_liquidated', data);
            }
        });

        // Arbitrage events
        CrossChainArbitrageService.on('arbitrage_opportunity', (data) => {
            this.broadcastToChannel('arbitrage', {
                type: 'arbitrage_opportunity',
                data,
                timestamp: Date.now()
            });
        });

        CrossChainArbitrageService.on('arbitrage_executed', (data) => {
            this.broadcastUserEvent(data.userAddress, 'arbitrage_executed', data);
        });

        // Risk management events
        RealTimeRiskManagement.on('risk_alert', (data) => {
            this.broadcastToChannel('risk_alerts', {
                type: 'risk_alert',
                data,
                timestamp: Date.now()
            });
        });

        RealTimeRiskManagement.on('circuit_breaker_triggered', (data) => {
            this.broadcastToChannel('risk_alerts', {
                type: 'circuit_breaker_triggered',
                data,
                timestamp: Date.now()
            });
        });
    }

    getChannelKey(channel) {
        if (typeof channel === 'string') {
            return channel;
        }
        
        const { type, pair, symbol } = channel;
        if (pair) return `${type}_${pair}`;
        if (symbol) return `${type}_${symbol}`;
        return type;
    }

    sendToClient(clientId, message) {
        const client = this.clients.get(clientId);
        if (client && client.ws.readyState === WebSocket.OPEN) {
            try {
                client.ws.send(JSON.stringify(message));
            } catch (error) {
                logger.error(`Error sending message to client ${clientId}:`, error);
            }
        }
    }

    sendError(clientId, code, message) {
        this.sendToClient(clientId, {
            type: 'error',
            error: {
                code,
                message
            },
            timestamp: Date.now()
        });
    }

    broadcastToSubscribers(channel, data) {
        for (const [clientId, client] of this.clients.entries()) {
            if (client.subscriptions.has(channel)) {
                this.sendToClient(clientId, data);
            }
        }
    }

    broadcastToChannel(channelType, message) {
        for (const [clientId, client] of this.clients.entries()) {
            if (client.subscriptions.has(channelType)) {
                this.sendToClient(clientId, message);
            }
        }
    }

    broadcastOrderEvent(eventType, data) {
        // Broadcast to users with order subscriptions
        for (const [clientId, client] of this.clients.entries()) {
            if (client.subscriptions.has('orders') && client.authenticated) {
                // Only send to order owner
                const order = AdvancedOrderEngine.getOrder(data.originalOrderId);
                if (order && order.userId === client.userId) {
                    this.sendToClient(clientId, {
                        type: eventType,
                        data,
                        timestamp: Date.now()
                    });
                }
            }
        }
    }

    broadcastUserEvent(userAddress, eventType, data) {
        for (const [clientId, client] of this.clients.entries()) {
            if (client.authenticated && client.userAddress === userAddress) {
                this.sendToClient(clientId, {
                    type: eventType,
                    data,
                    timestamp: Date.now()
                });
            }
        }
    }

    // Public API methods
    getConnectedClients() {
        return Array.from(this.clients.values()).map(client => ({
            id: client.id,
            authenticated: client.authenticated,
            userId: client.userId,
            subscriptions: Array.from(client.subscriptions),
            connectionTime: client.connectionTime,
            lastPing: client.lastPing
        }));
    }

    getClientStats() {
        const totalClients = this.clients.size;
        const authenticatedClients = Array.from(this.clients.values())
            .filter(client => client.authenticated).length;
        
        const subscriptionStats = new Map();
        for (const client of this.clients.values()) {
            for (const subscription of client.subscriptions) {
                subscriptionStats.set(subscription, (subscriptionStats.get(subscription) || 0) + 1);
            }
        }

        return {
            totalClients,
            authenticatedClients,
            subscriptionStats: Object.fromEntries(subscriptionStats),
            serverUptime: Date.now() - this.serverStartTime
        };
    }

    async shutdown() {
        logger.info('Shutting down WebSocket server...');
        
        // Close all client connections
        for (const [clientId, client] of this.clients.entries()) {
            client.ws.close();
        }

        // Close WebSocket server
        this.wss.close();
        
        logger.info('WebSocket server shut down');
    }
}

// Initialize WebSocket manager
const wsManager = new WebSocketManager();
wsManager.serverStartTime = Date.now();

module.exports = wsManager;