// ============================================================================
// REAL-TIME MARKET DATA SERVICE - WebSocket & Multi-DEX Aggregation
// ============================================================================

const WebSocket = require('ws');
const EventEmitter = require('events');
const xrpl = require('xrpl');
const axios = require('axios');
const logger = require('../utils/logger');

class RealTimeMarketService extends EventEmitter {
    constructor() {
        super();
        this.xrplClient = null;
        this.flareWebSocket = null;
        this.marketData = new Map();
        this.orderBooks = new Map();
        this.priceFeeds = new Map();
        this.subscribers = new Map();
        this.updateIntervals = new Map();
        
        this.initializeConnections();
    }

    async initializeConnections() {
        try {
            // Initialize XRPL client for order book streaming
            this.xrplClient = new xrpl.Client(process.env.XRPL_SERVER || 'wss://s1.ripple.com');
            await this.xrplClient.connect();
            logger.info('XRPL WebSocket connected for real-time data');

            // Initialize Flare Network WebSocket
            this.initializeFlareWebSocket();

            // Start market data aggregation
            this.startMarketDataAggregation();

            logger.info('Real-time market service initialized');
        } catch (error) {
            logger.error('Failed to initialize real-time market service:', error);
            throw error;
        }
    }

    initializeFlareWebSocket() {
        // Connect to Flare Network WebSocket (using public RPC WebSocket)
        this.flareWebSocket = new WebSocket('wss://flare-api.flare.network/ext/bc/C/ws');
        
        this.flareWebSocket.on('open', () => {
            logger.info('Flare Network WebSocket connected');
            this.subscribeToFlareEvents();
        });

        this.flareWebSocket.on('message', (data) => {
            this.handleFlareMessage(JSON.parse(data));
        });

        this.flareWebSocket.on('error', (error) => {
            logger.error('Flare WebSocket error:', error);
            this.reconnectFlareWebSocket();
        });

        this.flareWebSocket.on('close', () => {
            logger.warn('Flare WebSocket disconnected, attempting reconnection...');
            setTimeout(() => this.reconnectFlareWebSocket(), 5000);
        });
    }

    reconnectFlareWebSocket() {
        try {
            this.flareWebSocket = null;
            this.initializeFlareWebSocket();
        } catch (error) {
            logger.error('Failed to reconnect Flare WebSocket:', error);
        }
    }

    subscribeToFlareEvents() {
        // Subscribe to PROPX token events and price updates
        const subscriptionMessage = {
            jsonrpc: '2.0',
            method: 'eth_subscribe',
            params: ['logs', {
                topics: [
                    '0x' + '0'.repeat(64), // Topic for PROPX events
                ]
            }],
            id: 1
        };

        if (this.flareWebSocket.readyState === WebSocket.OPEN) {
            this.flareWebSocket.send(JSON.stringify(subscriptionMessage));
        }
    }

    handleFlareMessage(message) {
        try {
            if (message.method === 'eth_subscription') {
                const log = message.params.result;
                this.processPROPXEvent(log);
            }
        } catch (error) {
            logger.error('Error handling Flare message:', error);
        }
    }

    processPROPXEvent(log) {
        // Process PROPX token events (trades, mints, burns)
        const eventData = {
            type: 'PROPX_EVENT',
            address: log.address,
            blockNumber: parseInt(log.blockNumber, 16),
            transactionHash: log.transactionHash,
            timestamp: Date.now()
        };

        this.emit('propx_event', eventData);
        this.broadcastToSubscribers('propx_events', eventData);
    }

    // ============================================================================
    // XRPL ORDER BOOK STREAMING
    // ============================================================================

    async subscribeToOrderBook(pairId) {
        try {
            const [tokenCode, baseCurrency] = pairId.split('/');
            const issuerAddress = process.env.XRPL_ISSUER_ADDRESS;

            // Subscribe to order book changes
            const request = {
                command: 'subscribe',
                books: [{
                    taker_pays: {
                        currency: tokenCode,
                        issuer: issuerAddress
                    },
                    taker_gets: {
                        currency: 'XRP'
                    },
                    snapshot: true,
                    both: true
                }]
            };

            await this.xrplClient.request(request);
            
            // Listen for order book updates
            this.xrplClient.on('bookOffers', (data) => {
                this.processOrderBookUpdate(pairId, data);
            });

            logger.info(`Subscribed to order book for ${pairId}`);
        } catch (error) {
            logger.error(`Failed to subscribe to order book for ${pairId}:`, error);
        }
    }

    processOrderBookUpdate(pairId, data) {
        const orderBook = {
            pairId,
            bids: [],
            asks: [],
            timestamp: Date.now(),
            spread: 0
        };

        // Process offers
        if (data.offers) {
            data.offers.forEach(offer => {
                const price = this.calculateOfferPrice(offer);
                const amount = parseFloat(offer.TakerGets.value || offer.TakerGets);
                
                if (offer.Flags & 0x00020000) { // Sell offer
                    orderBook.asks.push({ price, amount, total: price * amount });
                } else { // Buy offer
                    orderBook.bids.push({ price, amount, total: price * amount });
                }
            });
        }

        // Sort and calculate spread
        orderBook.bids.sort((a, b) => b.price - a.price);
        orderBook.asks.sort((a, b) => a.price - b.price);
        
        if (orderBook.bids.length > 0 && orderBook.asks.length > 0) {
            orderBook.spread = orderBook.asks[0].price - orderBook.bids[0].price;
        }

        this.orderBooks.set(pairId, orderBook);
        this.emit('orderbook_update', orderBook);
        this.broadcastToSubscribers(`orderbook_${pairId}`, orderBook);
    }

    calculateOfferPrice(offer) {
        const takerGets = offer.TakerGets;
        const takerPays = offer.TakerPays;

        if (typeof takerGets === 'string' && typeof takerPays === 'object') {
            // Buying token with XRP
            return parseFloat(takerGets) / parseFloat(takerPays.value);
        } else if (typeof takerGets === 'object' && typeof takerPays === 'string') {
            // Selling token for XRP
            return parseFloat(takerPays) / parseFloat(takerGets.value);
        }
        
        return 0;
    }

    // ============================================================================
    // MULTI-DEX PRICE AGGREGATION
    // ============================================================================

    startMarketDataAggregation() {
        // Start price feed updates every 5 seconds
        this.updateIntervals.set('price_feeds', setInterval(() => {
            this.aggregateMarketData();
        }, 5000));

        // Start trading metrics updates every 30 seconds
        this.updateIntervals.set('trading_metrics', setInterval(() => {
            this.updateTradingMetrics();
        }, 30000));
    }

    async aggregateMarketData() {
        try {
            const pairs = ['JVCOIMB789/XRP', 'PROPX/FLR', 'XERA/XRP'];
            
            for (const pair of pairs) {
                const marketData = await this.fetchMarketData(pair);
                if (marketData) {
                    this.marketData.set(pair, marketData);
                    this.emit('price_update', { pair, data: marketData });
                    this.broadcastToSubscribers(`price_${pair}`, marketData);
                }
            }
        } catch (error) {
            logger.error('Error aggregating market data:', error);
        }
    }

    async fetchMarketData(pair) {
        try {
            const [tokenCode, baseCurrency] = pair.split('/');
            
            if (baseCurrency === 'XRP') {
                return await this.fetchXRPLMarketData(tokenCode);
            } else if (baseCurrency === 'FLR') {
                return await this.fetchFlareMarketData(tokenCode);
            }
        } catch (error) {
            logger.error(`Error fetching market data for ${pair}:`, error);
            return null;
        }
    }

    async fetchXRPLMarketData(tokenCode) {
        try {
            // Get current price from XRPL
            const orderBookData = await this.xrplClient.request({
                command: 'book_offers',
                taker_pays: {
                    currency: tokenCode,
                    issuer: process.env.XRPL_ISSUER_ADDRESS
                },
                taker_gets: {
                    currency: 'XRP'
                },
                limit: 10
            });

            let currentPrice = 0;
            let volume24h = 0;
            let high24h = 0;
            let low24h = 0;
            let change24h = 0;

            if (orderBookData.result.offers && orderBookData.result.offers.length > 0) {
                const firstOffer = orderBookData.result.offers[0];
                currentPrice = this.calculateOfferPrice(firstOffer);
                
                // Mock 24h data (in production, calculate from historical data)
                volume24h = Math.random() * 10000;
                high24h = currentPrice * (1 + Math.random() * 0.1);
                low24h = currentPrice * (1 - Math.random() * 0.1);
                change24h = (Math.random() - 0.5) * 0.2; // ±10% max change
            }

            return {
                price: currentPrice,
                volume24h,
                high24h,
                low24h,
                change24h,
                timestamp: Date.now(),
                source: 'XRPL'
            };
        } catch (error) {
            logger.error(`Error fetching XRPL market data for ${tokenCode}:`, error);
            return null;
        }
    }

    async fetchFlareMarketData(tokenCode) {
        try {
            // Mock Flare DEX data (integrate with actual Flare DEXs in production)
            const basePrice = 0.45 + Math.random() * 0.1; // Mock PROPX price in FLR
            
            return {
                price: basePrice,
                volume24h: Math.random() * 50000,
                high24h: basePrice * 1.05,
                low24h: basePrice * 0.95,
                change24h: (Math.random() - 0.5) * 0.15,
                timestamp: Date.now(),
                source: 'FLARE_DEX'
            };
        } catch (error) {
            logger.error(`Error fetching Flare market data for ${tokenCode}:`, error);
            return null;
        }
    }

    async updateTradingMetrics() {
        try {
            for (const [pair, data] of this.marketData.entries()) {
                const metrics = {
                    pair,
                    volume: data.volume24h,
                    high: data.high24h,
                    low: data.low24h,
                    change: data.change24h,
                    timestamp: Date.now(),
                    liquidity: await this.calculateLiquidity(pair),
                    volatility: this.calculateVolatility(pair)
                };

                this.emit('metrics_update', metrics);
                this.broadcastToSubscribers(`metrics_${pair}`, metrics);
            }
        } catch (error) {
            logger.error('Error updating trading metrics:', error);
        }
    }

    async calculateLiquidity(pair) {
        const orderBook = this.orderBooks.get(pair);
        if (!orderBook) return 0;

        const bidLiquidity = orderBook.bids.reduce((sum, bid) => sum + bid.total, 0);
        const askLiquidity = orderBook.asks.reduce((sum, ask) => sum + ask.total, 0);
        
        return bidLiquidity + askLiquidity;
    }

    calculateVolatility(pair) {
        // Calculate volatility from recent price movements
        // Mock calculation (implement proper volatility calculation in production)
        return Math.random() * 0.3; // 0-30% volatility
    }

    // ============================================================================
    // SUBSCRIPTION MANAGEMENT
    // ============================================================================

    subscribe(clientId, channels) {
        if (!this.subscribers.has(clientId)) {
            this.subscribers.set(clientId, new Set());
        }

        const clientChannels = this.subscribers.get(clientId);
        channels.forEach(channel => clientChannels.add(channel));

        logger.info(`Client ${clientId} subscribed to channels: ${channels.join(', ')}`);
    }

    unsubscribe(clientId, channels = null) {
        if (!this.subscribers.has(clientId)) return;

        if (channels) {
            const clientChannels = this.subscribers.get(clientId);
            channels.forEach(channel => clientChannels.delete(channel));
        } else {
            this.subscribers.delete(clientId);
        }

        logger.info(`Client ${clientId} unsubscribed from channels`);
    }

    broadcastToSubscribers(channel, data) {
        for (const [clientId, channels] of this.subscribers.entries()) {
            if (channels.has(channel)) {
                this.emit('client_message', {
                    clientId,
                    channel,
                    data: {
                        type: channel,
                        payload: data,
                        timestamp: Date.now()
                    }
                });
            }
        }
    }

    // ============================================================================
    // PUBLIC API METHODS
    // ============================================================================

    getOrderBook(pairId) {
        return this.orderBooks.get(pairId) || {
            pairId,
            bids: [],
            asks: [],
            timestamp: Date.now(),
            spread: 0
        };
    }

    getMarketData(pairId) {
        return this.marketData.get(pairId) || null;
    }

    getAllMarketData() {
        const result = {};
        for (const [pair, data] of this.marketData.entries()) {
            result[pair] = data;
        }
        return result;
    }

    // ============================================================================
    // CLEANUP
    // ============================================================================

    async disconnect() {
        try {
            // Clear intervals
            for (const [name, interval] of this.updateIntervals.entries()) {
                clearInterval(interval);
            }

            // Disconnect clients
            if (this.xrplClient && this.xrplClient.isConnected()) {
                await this.xrplClient.disconnect();
            }

            if (this.flareWebSocket) {
                this.flareWebSocket.close();
            }

            this.subscribers.clear();
            this.marketData.clear();
            this.orderBooks.clear();

            logger.info('Real-time market service disconnected');
        } catch (error) {
            logger.error('Error disconnecting real-time market service:', error);
        }
    }
}

module.exports = new RealTimeMarketService();