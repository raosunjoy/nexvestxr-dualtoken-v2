// ============================================================================
// ADVANCED ORDER ENGINE - Stop-Loss, OCO, Trailing Stops & Automated Execution
// ============================================================================

const EventEmitter = require('events');
const xrpl = require('xrpl');
const { ethers } = require('ethers');
const logger = require('../utils/logger');
const RealTimeMarketService = require('./RealTimeMarketService');
const PROPXTradingService = require('./PROPXTradingService');

class AdvancedOrderEngine extends EventEmitter {
    constructor() {
        super();
        this.orders = new Map();
        this.priceWatchers = new Map();
        this.executionQueue = [];
        this.isRunning = false;
        this.xrplClient = null;
        
        this.initializeEngine();
    }

    async initializeEngine() {
        try {
            // Initialize XRPL client
            this.xrplClient = new xrpl.Client(process.env.XRPL_SERVER || 'wss://s1.ripple.com');
            await this.xrplClient.connect();

            // Subscribe to price updates
            this.subscribeToMarketData();

            // Start order monitoring
            this.startOrderMonitoring();

            logger.info('Advanced Order Engine initialized');
        } catch (error) {
            logger.error('Failed to initialize Advanced Order Engine:', error);
            throw error;
        }
    }

    subscribeToMarketData() {
        // Subscribe to real-time price updates
        RealTimeMarketService.on('price_update', (data) => {
            this.handlePriceUpdate(data.pair, data.data);
        });

        // Subscribe to order book updates
        RealTimeMarketService.on('orderbook_update', (orderBook) => {
            this.handleOrderBookUpdate(orderBook);
        });
    }

    startOrderMonitoring() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        
        // Process execution queue every 1 second
        setInterval(() => {
            this.processExecutionQueue();
        }, 1000);

        // Monitor order conditions every 2 seconds
        setInterval(() => {
            this.monitorOrderConditions();
        }, 2000);

        // Cleanup expired orders every minute
        setInterval(() => {
            this.cleanupExpiredOrders();
        }, 60000);

        logger.info('Order monitoring started');
    }

    // ============================================================================
    // ORDER CREATION METHODS
    // ============================================================================

    async createStopLossOrder(orderData) {
        try {
            const {
                userId,
                userAddress,
                pairId,
                side,
                amount,
                stopPrice,
                limitPrice,
                network = 'XRPL',
                expiry = 24 * 60 * 60 * 1000 // 24 hours default
            } = orderData;

            const orderId = `SL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            const order = {
                id: orderId,
                type: 'stop-loss',
                userId,
                userAddress,
                pairId,
                side,
                amount: parseFloat(amount),
                stopPrice: parseFloat(stopPrice),
                limitPrice: limitPrice ? parseFloat(limitPrice) : null,
                network,
                status: 'active',
                createdAt: Date.now(),
                expiresAt: Date.now() + expiry,
                triggered: false,
                executions: []
            };

            // Validate stop-loss logic
            this.validateStopLossOrder(order);

            this.orders.set(orderId, order);
            this.addPriceWatcher(pairId, stopPrice);

            logger.info(`Stop-loss order created: ${orderId} for ${side} ${amount} ${pairId} at ${stopPrice}`);

            return {
                success: true,
                orderId,
                order: {
                    ...order,
                    userAddress: undefined // Don't return sensitive data
                }
            };

        } catch (error) {
            logger.error('Error creating stop-loss order:', error);
            throw error;
        }
    }

    async createOCOOrder(orderData) {
        try {
            const {
                userId,
                userAddress,
                pairId,
                side,
                amount,
                stopPrice,
                limitPrice,
                targetPrice,
                network = 'XRPL',
                expiry = 24 * 60 * 60 * 1000
            } = orderData;

            const orderId = `OCO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            const order = {
                id: orderId,
                type: 'oco',
                userId,
                userAddress,
                pairId,
                side,
                amount: parseFloat(amount),
                stopPrice: parseFloat(stopPrice),
                limitPrice: parseFloat(limitPrice),
                targetPrice: parseFloat(targetPrice),
                network,
                status: 'active',
                createdAt: Date.now(),
                expiresAt: Date.now() + expiry,
                triggered: false,
                activeOrder: null, // Which order is currently active
                executions: []
            };

            // Validate OCO logic
            this.validateOCOOrder(order);

            this.orders.set(orderId, order);
            
            // Add price watchers for both stop and target prices
            this.addPriceWatcher(pairId, stopPrice);
            this.addPriceWatcher(pairId, targetPrice);

            logger.info(`OCO order created: ${orderId} for ${side} ${amount} ${pairId} stop:${stopPrice} target:${targetPrice}`);

            return {
                success: true,
                orderId,
                order: {
                    ...order,
                    userAddress: undefined
                }
            };

        } catch (error) {
            logger.error('Error creating OCO order:', error);
            throw error;
        }
    }

    async createTrailingStopOrder(orderData) {
        try {
            const {
                userId,
                userAddress,
                pairId,
                side,
                amount,
                trailAmount,
                trailPercent,
                network = 'XRPL',
                expiry = 24 * 60 * 60 * 1000
            } = orderData;

            const orderId = `TS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            // Get current market price
            const marketData = RealTimeMarketService.getMarketData(pairId);
            if (!marketData) {
                throw new Error(`No market data available for ${pairId}`);
            }

            const currentPrice = marketData.price;
            let initialStopPrice;

            if (side === 'sell') {
                // Trailing stop for sell order (stop below current price)
                initialStopPrice = trailAmount ? 
                    currentPrice - trailAmount : 
                    currentPrice * (1 - trailPercent / 100);
            } else {
                // Trailing stop for buy order (stop above current price)
                initialStopPrice = trailAmount ? 
                    currentPrice + trailAmount : 
                    currentPrice * (1 + trailPercent / 100);
            }

            const order = {
                id: orderId,
                type: 'trailing-stop',
                userId,
                userAddress,
                pairId,
                side,
                amount: parseFloat(amount),
                trailAmount: trailAmount ? parseFloat(trailAmount) : null,
                trailPercent: trailPercent ? parseFloat(trailPercent) : null,
                currentStopPrice: initialStopPrice,
                highWaterMark: currentPrice,
                network,
                status: 'active',
                createdAt: Date.now(),
                expiresAt: Date.now() + expiry,
                triggered: false,
                priceHistory: [{ price: currentPrice, timestamp: Date.now() }],
                executions: []
            };

            this.orders.set(orderId, order);
            this.addPriceWatcher(pairId, initialStopPrice);

            logger.info(`Trailing stop order created: ${orderId} for ${side} ${amount} ${pairId} trail:${trailAmount || trailPercent + '%'}`);

            return {
                success: true,
                orderId,
                order: {
                    ...order,
                    userAddress: undefined
                }
            };

        } catch (error) {
            logger.error('Error creating trailing stop order:', error);
            throw error;
        }
    }

    // ============================================================================
    // ORDER VALIDATION
    // ============================================================================

    validateStopLossOrder(order) {
        const { side, stopPrice, limitPrice } = order;

        if (side === 'sell' && limitPrice && limitPrice > stopPrice) {
            throw new Error('Limit price must be less than or equal to stop price for sell stop-loss orders');
        }

        if (side === 'buy' && limitPrice && limitPrice < stopPrice) {
            throw new Error('Limit price must be greater than or equal to stop price for buy stop-loss orders');
        }

        if (stopPrice <= 0) {
            throw new Error('Stop price must be greater than 0');
        }
    }

    validateOCOOrder(order) {
        const { side, stopPrice, limitPrice, targetPrice } = order;

        if (side === 'sell') {
            if (stopPrice >= limitPrice) {
                throw new Error('Stop price must be less than limit price for sell OCO orders');
            }
            if (targetPrice <= limitPrice) {
                throw new Error('Target price must be greater than limit price for sell OCO orders');
            }
        } else {
            if (stopPrice <= limitPrice) {
                throw new Error('Stop price must be greater than limit price for buy OCO orders');
            }
            if (targetPrice >= limitPrice) {
                throw new Error('Target price must be less than limit price for buy OCO orders');
            }
        }
    }

    // ============================================================================
    // PRICE MONITORING & ORDER EXECUTION
    // ============================================================================

    addPriceWatcher(pairId, price) {
        if (!this.priceWatchers.has(pairId)) {
            this.priceWatchers.set(pairId, new Set());
        }
        this.priceWatchers.get(pairId).add(price);
    }

    removePriceWatcher(pairId, price) {
        if (this.priceWatchers.has(pairId)) {
            this.priceWatchers.get(pairId).delete(price);
        }
    }

    handlePriceUpdate(pairId, marketData) {
        const currentPrice = marketData.price;
        
        // Check all orders for this pair
        for (const [orderId, order] of this.orders.entries()) {
            if (order.pairId === pairId && order.status === 'active') {
                this.checkOrderCondition(order, currentPrice);
            }
        }
    }

    handleOrderBookUpdate(orderBook) {
        // Use order book data for more precise execution
        const { pairId, bids, asks } = orderBook;
        
        for (const [orderId, order] of this.orders.entries()) {
            if (order.pairId === pairId && order.status === 'active') {
                // Use best bid/ask for more accurate triggering
                const bestBid = bids.length > 0 ? bids[0].price : 0;
                const bestAsk = asks.length > 0 ? asks[0].price : Number.MAX_VALUE;
                
                this.checkOrderConditionWithOrderBook(order, bestBid, bestAsk);
            }
        }
    }

    checkOrderCondition(order, currentPrice) {
        try {
            switch (order.type) {
                case 'stop-loss':
                    this.checkStopLossCondition(order, currentPrice);
                    break;
                case 'oco':
                    this.checkOCOCondition(order, currentPrice);
                    break;
                case 'trailing-stop':
                    this.checkTrailingStopCondition(order, currentPrice);
                    break;
            }
        } catch (error) {
            logger.error(`Error checking order condition for ${order.id}:`, error);
        }
    }

    checkStopLossCondition(order, currentPrice) {
        const { side, stopPrice } = order;
        let shouldTrigger = false;

        if (side === 'sell' && currentPrice <= stopPrice) {
            shouldTrigger = true;
        } else if (side === 'buy' && currentPrice >= stopPrice) {
            shouldTrigger = true;
        }

        if (shouldTrigger && !order.triggered) {
            this.triggerStopLoss(order, currentPrice);
        }
    }

    checkOCOCondition(order, currentPrice) {
        const { side, stopPrice, targetPrice } = order;
        let triggerType = null;

        if (side === 'sell') {
            if (currentPrice <= stopPrice) {
                triggerType = 'stop';
            } else if (currentPrice >= targetPrice) {
                triggerType = 'target';
            }
        } else {
            if (currentPrice >= stopPrice) {
                triggerType = 'stop';
            } else if (currentPrice <= targetPrice) {
                triggerType = 'target';
            }
        }

        if (triggerType && !order.triggered) {
            this.triggerOCO(order, currentPrice, triggerType);
        }
    }

    checkTrailingStopCondition(order, currentPrice) {
        const { side, trailAmount, trailPercent, highWaterMark } = order;
        
        // Update price history
        order.priceHistory.push({ price: currentPrice, timestamp: Date.now() });
        
        // Keep only last 100 prices
        if (order.priceHistory.length > 100) {
            order.priceHistory = order.priceHistory.slice(-100);
        }

        let newHighWaterMark = highWaterMark;
        let newStopPrice = order.currentStopPrice;

        if (side === 'sell') {
            // For sell orders, track the highest price
            if (currentPrice > highWaterMark) {
                newHighWaterMark = currentPrice;
                newStopPrice = trailAmount ? 
                    currentPrice - trailAmount : 
                    currentPrice * (1 - trailPercent / 100);
            }
            
            // Check if stop should trigger
            if (currentPrice <= order.currentStopPrice && !order.triggered) {
                this.triggerTrailingStop(order, currentPrice);
                return;
            }
        } else {
            // For buy orders, track the lowest price
            if (currentPrice < highWaterMark) {
                newHighWaterMark = currentPrice;
                newStopPrice = trailAmount ? 
                    currentPrice + trailAmount : 
                    currentPrice * (1 + trailPercent / 100);
            }
            
            // Check if stop should trigger
            if (currentPrice >= order.currentStopPrice && !order.triggered) {
                this.triggerTrailingStop(order, currentPrice);
                return;
            }
        }

        // Update order if stop price changed
        if (newStopPrice !== order.currentStopPrice) {
            this.removePriceWatcher(order.pairId, order.currentStopPrice);
            order.highWaterMark = newHighWaterMark;
            order.currentStopPrice = newStopPrice;
            this.addPriceWatcher(order.pairId, newStopPrice);
            
            logger.info(`Trailing stop updated: ${order.id} new stop: ${newStopPrice}`);
        }
    }

    checkOrderConditionWithOrderBook(order, bestBid, bestAsk) {
        // More precise triggering using order book
        const triggerPrice = order.side === 'buy' ? bestAsk : bestBid;
        this.checkOrderCondition(order, triggerPrice);
    }

    // ============================================================================
    // ORDER TRIGGERING & EXECUTION
    // ============================================================================

    async triggerStopLoss(order, triggerPrice) {
        try {
            order.triggered = true;
            order.triggerPrice = triggerPrice;
            order.triggerTime = Date.now();

            logger.info(`Stop-loss order triggered: ${order.id} at price ${triggerPrice}`);

            // Create market or limit order for execution
            const executionOrder = {
                type: order.limitPrice ? 'limit' : 'market',
                side: order.side,
                amount: order.amount,
                price: order.limitPrice || triggerPrice,
                originalOrderId: order.id,
                userAddress: order.userAddress,
                pairId: order.pairId,
                network: order.network
            };

            this.queueForExecution(executionOrder);
            
            order.status = 'triggered';
            this.emit('order_triggered', {
                orderId: order.id,
                type: 'stop-loss',
                triggerPrice,
                executionOrder
            });

        } catch (error) {
            logger.error(`Error triggering stop-loss order ${order.id}:`, error);
            order.status = 'error';
            order.error = error.message;
        }
    }

    async triggerOCO(order, triggerPrice, triggerType) {
        try {
            order.triggered = true;
            order.triggerPrice = triggerPrice;
            order.triggerTime = Date.now();
            order.triggerType = triggerType;

            logger.info(`OCO order triggered: ${order.id} at price ${triggerPrice} (${triggerType})`);

            // Determine execution price based on trigger type
            let executionPrice;
            if (triggerType === 'stop') {
                executionPrice = order.limitPrice || triggerPrice;
            } else {
                executionPrice = triggerPrice; // Market order for target
            }

            const executionOrder = {
                type: triggerType === 'stop' && order.limitPrice ? 'limit' : 'market',
                side: order.side,
                amount: order.amount,
                price: executionPrice,
                originalOrderId: order.id,
                userAddress: order.userAddress,
                pairId: order.pairId,
                network: order.network
            };

            this.queueForExecution(executionOrder);
            
            order.status = 'triggered';
            order.activeOrder = triggerType;
            
            this.emit('order_triggered', {
                orderId: order.id,
                type: 'oco',
                triggerType,
                triggerPrice,
                executionOrder
            });

        } catch (error) {
            logger.error(`Error triggering OCO order ${order.id}:`, error);
            order.status = 'error';
            order.error = error.message;
        }
    }

    async triggerTrailingStop(order, triggerPrice) {
        try {
            order.triggered = true;
            order.triggerPrice = triggerPrice;
            order.triggerTime = Date.now();

            logger.info(`Trailing stop order triggered: ${order.id} at price ${triggerPrice}`);

            const executionOrder = {
                type: 'market',
                side: order.side,
                amount: order.amount,
                price: triggerPrice,
                originalOrderId: order.id,
                userAddress: order.userAddress,
                pairId: order.pairId,
                network: order.network
            };

            this.queueForExecution(executionOrder);
            
            order.status = 'triggered';
            this.emit('order_triggered', {
                orderId: order.id,
                type: 'trailing-stop',
                triggerPrice,
                trailData: {
                    highWaterMark: order.highWaterMark,
                    trailAmount: order.trailAmount,
                    trailPercent: order.trailPercent
                },
                executionOrder
            });

        } catch (error) {
            logger.error(`Error triggering trailing stop order ${order.id}:`, error);
            order.status = 'error';
            order.error = error.message;
        }
    }

    queueForExecution(executionOrder) {
        this.executionQueue.push({
            ...executionOrder,
            queuedAt: Date.now(),
            attempts: 0
        });
    }

    // ============================================================================
    // EXECUTION QUEUE PROCESSING
    // ============================================================================

    async processExecutionQueue() {
        if (this.executionQueue.length === 0) return;

        const order = this.executionQueue.shift();
        
        try {
            await this.executeOrder(order);
        } catch (error) {
            logger.error(`Error executing order from queue:`, error);
            
            // Retry logic
            order.attempts++;
            if (order.attempts < 3) {
                order.lastError = error.message;
                this.executionQueue.push(order);
            } else {
                logger.error(`Failed to execute order after 3 attempts: ${order.originalOrderId}`);
                this.handleExecutionFailure(order, error);
            }
        }
    }

    async executeOrder(executionOrder) {
        const { network, pairId, type, side, amount, price, userAddress, originalOrderId } = executionOrder;

        let result;

        if (network === 'XRPL') {
            result = await this.executeXRPLOrder(executionOrder);
        } else if (network === 'Flare') {
            result = await this.executeFlarePROPXOrder(executionOrder);
        } else {
            throw new Error(`Unsupported network: ${network}`);
        }

        // Update original order with execution result
        const originalOrder = this.orders.get(originalOrderId);
        if (originalOrder) {
            originalOrder.executions.push({
                timestamp: Date.now(),
                executionPrice: result.executionPrice,
                executedAmount: result.executedAmount,
                transactionHash: result.transactionHash,
                network: result.network,
                gas: result.gas
            });
            
            originalOrder.status = 'executed';
            originalOrder.completedAt = Date.now();
        }

        logger.info(`Order executed successfully: ${originalOrderId} on ${network}`);
        
        this.emit('order_executed', {
            originalOrderId,
            executionResult: result,
            network
        });

        return result;
    }

    async executeXRPLOrder(executionOrder) {
        // Execute on XRPL using existing AdvancedTradeService
        const { pairId, side, amount, price, userAddress } = executionOrder;
        const [tokenCode] = pairId.split('/');
        
        // Create XRPL transaction
        const tx = {
            TransactionType: 'OfferCreate',
            Account: userAddress,
            TakerGets: side === 'buy' ? {
                currency: tokenCode,
                issuer: process.env.XRPL_ISSUER_ADDRESS,
                value: amount.toString()
            } : xrpl.dropsToXrp(amount * price),
            TakerPays: side === 'buy' ? 
                xrpl.dropsToXrp(amount * price) : {
                currency: tokenCode,
                issuer: process.env.XRPL_ISSUER_ADDRESS,
                value: amount.toString()
            },
            Flags: executionOrder.type === 'market' ? 0 : xrpl.OfferCreateFlags.tfPassive
        };

        // Note: In production, this would be signed by the user's wallet
        // For automated execution, implement proper custody solution
        
        return {
            success: true,
            transactionHash: `mock-xrpl-${Date.now()}`,
            executionPrice: price,
            executedAmount: amount,
            network: 'XRPL',
            gas: '12'
        };
    }

    async executeFlarePROPXOrder(executionOrder) {
        // Execute on Flare using PROPXTradingService
        const { pairId, side, amount, price, userAddress } = executionOrder;
        
        let result;
        if (executionOrder.type === 'market') {
            result = await PROPXTradingService.createPROPXMarketOrder(userAddress, pairId, side, amount);
        } else {
            result = await PROPXTradingService.createPROPXLimitOrder(userAddress, pairId, side, amount, price);
        }

        return {
            success: true,
            transactionHash: `mock-flare-${Date.now()}`,
            executionPrice: price,
            executedAmount: amount,
            network: 'Flare',
            gas: '150000'
        };
    }

    handleExecutionFailure(order, error) {
        const originalOrder = this.orders.get(order.originalOrderId);
        if (originalOrder) {
            originalOrder.status = 'failed';
            originalOrder.error = error.message;
            originalOrder.failedAt = Date.now();
        }

        this.emit('order_failed', {
            originalOrderId: order.originalOrderId,
            error: error.message,
            attempts: order.attempts
        });
    }

    // ============================================================================
    // ORDER MANAGEMENT
    // ============================================================================

    monitorOrderConditions() {
        // Additional monitoring logic for edge cases
        for (const [orderId, order] of this.orders.entries()) {
            if (order.status === 'active') {
                // Check for stale orders
                if (Date.now() - order.createdAt > 60000 && !order.lastPriceCheck) {
                    const marketData = RealTimeMarketService.getMarketData(order.pairId);
                    if (marketData) {
                        this.checkOrderCondition(order, marketData.price);
                        order.lastPriceCheck = Date.now();
                    }
                }
            }
        }
    }

    cleanupExpiredOrders() {
        const now = Date.now();
        const expiredOrders = [];

        for (const [orderId, order] of this.orders.entries()) {
            if (order.expiresAt && now > order.expiresAt && order.status === 'active') {
                expiredOrders.push(orderId);
            }
        }

        for (const orderId of expiredOrders) {
            const order = this.orders.get(orderId);
            order.status = 'expired';
            order.expiredAt = now;
            
            // Remove price watchers
            this.removePriceWatcher(order.pairId, order.stopPrice);
            if (order.targetPrice) {
                this.removePriceWatcher(order.pairId, order.targetPrice);
            }

            logger.info(`Order expired: ${orderId}`);
            this.emit('order_expired', { orderId, order });
        }
    }

    async cancelOrder(orderId, userId) {
        const order = this.orders.get(orderId);
        
        if (!order) {
            throw new Error('Order not found');
        }

        if (order.userId !== userId) {
            throw new Error('Unauthorized to cancel this order');
        }

        if (order.status !== 'active') {
            throw new Error(`Cannot cancel order with status: ${order.status}`);
        }

        order.status = 'cancelled';
        order.cancelledAt = Date.now();

        // Remove price watchers
        this.removePriceWatcher(order.pairId, order.stopPrice);
        if (order.targetPrice) {
            this.removePriceWatcher(order.pairId, order.targetPrice);
        }
        if (order.currentStopPrice) {
            this.removePriceWatcher(order.pairId, order.currentStopPrice);
        }

        logger.info(`Order cancelled: ${orderId}`);
        this.emit('order_cancelled', { orderId, order });

        return { success: true, orderId };
    }

    getOrder(orderId) {
        return this.orders.get(orderId);
    }

    getUserOrders(userId) {
        const userOrders = [];
        for (const [orderId, order] of this.orders.entries()) {
            if (order.userId === userId) {
                userOrders.push({
                    ...order,
                    userAddress: undefined // Don't return sensitive data
                });
            }
        }
        return userOrders;
    }

    // ============================================================================
    // CLEANUP
    // ============================================================================

    async disconnect() {
        try {
            this.isRunning = false;
            
            if (this.xrplClient && this.xrplClient.isConnected()) {
                await this.xrplClient.disconnect();
            }

            this.orders.clear();
            this.priceWatchers.clear();
            this.executionQueue = [];

            logger.info('Advanced Order Engine disconnected');
        } catch (error) {
            logger.error('Error disconnecting Advanced Order Engine:', error);
        }
    }
}

module.exports = new AdvancedOrderEngine();