// ============================================================================
// MARGIN TRADING SERVICE - Collateral Management & Risk Control
// ============================================================================

const EventEmitter = require('events');
const { ethers } = require('ethers');
const logger = require('../utils/logger');
const RealTimeMarketService = require('./RealTimeMarketService');
const AdvancedOrderEngine = require('./AdvancedOrderEngine');

class MarginTradingService extends EventEmitter {
    constructor() {
        super();
        this.positions = new Map();
        this.collateralAccounts = new Map();
        this.liquidationQueue = [];
        this.riskThresholds = {
            maintenanceMargin: 0.15, // 15% maintenance margin
            initialMargin: 0.25, // 25% initial margin
            liquidationThreshold: 0.10, // 10% liquidation threshold
            maxLeverage: 10 // Maximum 10x leverage
        };
        this.isMonitoring = false;
        
        this.initializeMarginTrading();
    }

    async initializeMarginTrading() {
        try {
            // Subscribe to price updates for position monitoring
            this.subscribeToPriceUpdates();

            // Start position monitoring
            this.startPositionMonitoring();

            // Start liquidation engine
            this.startLiquidationEngine();

            logger.info('Margin trading service initialized');
        } catch (error) {
            logger.error('Failed to initialize margin trading service:', error);
            throw error;
        }
    }

    subscribeToPriceUpdates() {
        RealTimeMarketService.on('price_update', (data) => {
            this.updatePositionMetrics(data.pair, data.data.price);
        });
    }

    startPositionMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;

        // Monitor positions every 10 seconds
        setInterval(() => {
            this.monitorAllPositions();
        }, 10000);

        // Check for liquidations every 5 seconds
        setInterval(() => {
            this.checkLiquidationRequirements();
        }, 5000);

        logger.info('Position monitoring started');
    }

    startLiquidationEngine() {
        // Process liquidation queue every 2 seconds
        setInterval(() => {
            this.processLiquidationQueue();
        }, 2000);
    }

    // ============================================================================
    // COLLATERAL MANAGEMENT
    // ============================================================================

    async createCollateralAccount(userAddress, initialCollateral) {
        try {
            const accountId = `MARGIN-${userAddress}-${Date.now()}`;
            
            const collateralAccount = {
                id: accountId,
                userAddress,
                collateral: {
                    deposited: parseFloat(initialCollateral),
                    available: parseFloat(initialCollateral),
                    locked: 0,
                    currency: 'XRP' // Primary collateral currency
                },
                borrowing: {
                    borrowed: 0,
                    interest: 0,
                    interestRate: 0.08 // 8% annual interest rate
                },
                positions: [],
                riskMetrics: {
                    totalEquity: parseFloat(initialCollateral),
                    usedMargin: 0,
                    freeMargin: parseFloat(initialCollateral),
                    marginLevel: Infinity,
                    riskLevel: 'low'
                },
                createdAt: Date.now(),
                lastUpdated: Date.now(),
                status: 'active'
            };

            this.collateralAccounts.set(accountId, collateralAccount);
            
            logger.info(`Margin account created: ${accountId} with ${initialCollateral} XRP collateral`);
            
            return {
                success: true,
                accountId,
                account: collateralAccount
            };

        } catch (error) {
            logger.error('Error creating collateral account:', error);
            throw error;
        }
    }

    async depositCollateral(accountId, amount, currency = 'XRP') {
        try {
            const account = this.collateralAccounts.get(accountId);
            if (!account) {
                throw new Error('Collateral account not found');
            }

            const depositAmount = parseFloat(amount);
            account.collateral.deposited += depositAmount;
            account.collateral.available += depositAmount;
            account.lastUpdated = Date.now();

            // Update risk metrics
            this.updateAccountRiskMetrics(account);

            logger.info(`Deposited ${amount} ${currency} to account ${accountId}`);

            this.emit('collateral_deposited', {
                accountId,
                amount: depositAmount,
                currency,
                newTotal: account.collateral.deposited
            });

            return {
                success: true,
                newBalance: account.collateral.deposited,
                availableBalance: account.collateral.available
            };

        } catch (error) {
            logger.error(`Error depositing collateral to ${accountId}:`, error);
            throw error;
        }
    }

    async withdrawCollateral(accountId, amount, currency = 'XRP') {
        try {
            const account = this.collateralAccounts.get(accountId);
            if (!account) {
                throw new Error('Collateral account not found');
            }

            const withdrawAmount = parseFloat(amount);
            
            // Check if withdrawal is allowed
            const availableForWithdrawal = this.calculateAvailableForWithdrawal(account);
            if (withdrawAmount > availableForWithdrawal) {
                throw new Error(`Insufficient collateral available for withdrawal. Available: ${availableForWithdrawal} ${currency}`);
            }

            account.collateral.deposited -= withdrawAmount;
            account.collateral.available -= withdrawAmount;
            account.lastUpdated = Date.now();

            // Update risk metrics
            this.updateAccountRiskMetrics(account);

            logger.info(`Withdrew ${amount} ${currency} from account ${accountId}`);

            this.emit('collateral_withdrawn', {
                accountId,
                amount: withdrawAmount,
                currency,
                newTotal: account.collateral.deposited
            });

            return {
                success: true,
                newBalance: account.collateral.deposited,
                availableBalance: account.collateral.available
            };

        } catch (error) {
            logger.error(`Error withdrawing collateral from ${accountId}:`, error);
            throw error;
        }
    }

    calculateAvailableForWithdrawal(account) {
        // Calculate maximum withdrawable amount while maintaining margin requirements
        const { totalEquity, usedMargin } = account.riskMetrics;
        const requiredMargin = usedMargin / (1 - this.riskThresholds.maintenanceMargin);
        
        return Math.max(0, totalEquity - requiredMargin);
    }

    // ============================================================================
    // MARGIN POSITION MANAGEMENT
    // ============================================================================

    async openMarginPosition(accountId, orderData) {
        try {
            const {
                pairId,
                side,
                amount,
                leverage,
                entryPrice,
                orderType = 'market'
            } = orderData;

            const account = this.collateralAccounts.get(accountId);
            if (!account) {
                throw new Error('Collateral account not found');
            }

            // Validate leverage
            if (leverage < 1 || leverage > this.riskThresholds.maxLeverage) {
                throw new Error(`Leverage must be between 1 and ${this.riskThresholds.maxLeverage}`);
            }

            // Calculate position size and margin requirement
            const positionValue = amount * entryPrice;
            const requiredMargin = positionValue / leverage;
            const initialMarginRequired = positionValue * this.riskThresholds.initialMargin;

            // Check available margin
            if (requiredMargin > account.collateral.available) {
                throw new Error('Insufficient collateral for margin position');
            }

            const positionId = `POS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            const position = {
                id: positionId,
                accountId,
                userAddress: account.userAddress,
                pairId,
                side,
                amount: parseFloat(amount),
                leverage: parseFloat(leverage),
                entryPrice: parseFloat(entryPrice),
                currentPrice: parseFloat(entryPrice),
                positionValue,
                margin: requiredMargin,
                unrealizedPnL: 0,
                realizedPnL: 0,
                funding: 0,
                borrowCost: 0,
                liquidationPrice: this.calculateLiquidationPrice(side, entryPrice, leverage),
                status: 'open',
                openedAt: Date.now(),
                lastUpdated: Date.now(),
                orders: [],
                riskLevel: 'normal'
            };

            // Lock collateral
            account.collateral.available -= requiredMargin;
            account.collateral.locked += requiredMargin;
            account.positions.push(positionId);

            // Store position
            this.positions.set(positionId, position);

            // Update account risk metrics
            this.updateAccountRiskMetrics(account);

            logger.info(`Margin position opened: ${positionId} - ${side} ${amount} ${pairId} with ${leverage}x leverage`);

            this.emit('position_opened', {
                positionId,
                accountId,
                position
            });

            return {
                success: true,
                positionId,
                position: {
                    ...position,
                    userAddress: undefined // Don't return sensitive data
                }
            };

        } catch (error) {
            logger.error('Error opening margin position:', error);
            throw error;
        }
    }

    async closeMarginPosition(positionId, closePrice = null, partial = false, closeAmount = null) {
        try {
            const position = this.positions.get(positionId);
            if (!position) {
                throw new Error('Position not found');
            }

            if (position.status !== 'open') {
                throw new Error(`Cannot close position with status: ${position.status}`);
            }

            const account = this.collateralAccounts.get(position.accountId);
            if (!account) {
                throw new Error('Collateral account not found');
            }

            const currentPrice = closePrice || RealTimeMarketService.getMarketData(position.pairId)?.price || position.currentPrice;
            
            let amountToClose = partial ? parseFloat(closeAmount) : position.amount;
            if (amountToClose > position.amount) {
                amountToClose = position.amount;
            }

            // Calculate PnL
            const pnl = this.calculatePositionPnL(position, currentPrice, amountToClose);
            
            // Calculate fees and costs
            const borrowCost = this.calculateBorrowCost(position);
            const tradingFee = (amountToClose * currentPrice) * 0.001; // 0.1% trading fee
            
            const netPnL = pnl - borrowCost - tradingFee;

            // Update position
            if (partial) {
                position.amount -= amountToClose;
                position.positionValue = position.amount * position.entryPrice;
                position.realizedPnL += netPnL;
                
                // Unlock proportional margin
                const marginToUnlock = (amountToClose / (position.amount + amountToClose)) * position.margin;
                account.collateral.locked -= marginToUnlock;
                account.collateral.available += marginToUnlock;
            } else {
                position.status = 'closed';
                position.closedAt = Date.now();
                position.closePrice = currentPrice;
                position.realizedPnL = netPnL;
                
                // Unlock all margin
                account.collateral.locked -= position.margin;
                account.collateral.available += position.margin;
                
                // Remove position from account
                account.positions = account.positions.filter(id => id !== positionId);
            }

            // Apply PnL to account
            account.collateral.deposited += netPnL;
            account.collateral.available += netPnL;

            // Update account risk metrics
            this.updateAccountRiskMetrics(account);

            logger.info(`Position ${partial ? 'partially ' : ''}closed: ${positionId} with PnL: ${netPnL.toFixed(6)} XRP`);

            this.emit('position_closed', {
                positionId,
                accountId: position.accountId,
                partial,
                amountClosed: amountToClose,
                closePrice: currentPrice,
                pnl: netPnL
            });

            return {
                success: true,
                positionId,
                closePrice: currentPrice,
                pnl: netPnL,
                remaining: partial ? position.amount : 0
            };

        } catch (error) {
            logger.error(`Error closing position ${positionId}:`, error);
            throw error;
        }
    }

    calculateLiquidationPrice(side, entryPrice, leverage) {
        // Calculate price at which position will be liquidated
        const liquidationMargin = this.riskThresholds.liquidationThreshold;
        
        if (side === 'long') {
            return entryPrice * (1 - (1 / leverage) + liquidationMargin);
        } else {
            return entryPrice * (1 + (1 / leverage) - liquidationMargin);
        }
    }

    calculatePositionPnL(position, currentPrice, amount = null) {
        const { side, entryPrice, amount: positionAmount } = position;
        const amountToCalculate = amount || positionAmount;
        
        if (side === 'long') {
            return (currentPrice - entryPrice) * amountToCalculate;
        } else {
            return (entryPrice - currentPrice) * amountToCalculate;
        }
    }

    calculateBorrowCost(position) {
        // Calculate borrowing cost based on position size and time held
        const timeHeld = Date.now() - position.openedAt;
        const hoursHeld = timeHeld / (1000 * 60 * 60);
        const annualRate = 0.08; // 8% annual rate
        const hourlyRate = annualRate / (365 * 24);
        
        return position.positionValue * (position.leverage - 1) * hourlyRate * hoursHeld;
    }

    // ============================================================================
    // RISK MONITORING & LIQUIDATION
    // ============================================================================

    updatePositionMetrics(pairId, currentPrice) {
        for (const [positionId, position] of this.positions.entries()) {
            if (position.pairId === pairId && position.status === 'open') {
                position.currentPrice = currentPrice;
                position.unrealizedPnL = this.calculatePositionPnL(position, currentPrice);
                position.lastUpdated = Date.now();

                // Update risk level
                this.updatePositionRiskLevel(position);

                // Update account metrics
                const account = this.collateralAccounts.get(position.accountId);
                if (account) {
                    this.updateAccountRiskMetrics(account);
                }
            }
        }
    }

    updatePositionRiskLevel(position) {
        const { currentPrice, liquidationPrice, side } = position;
        
        let distanceToLiquidation;
        if (side === 'long') {
            distanceToLiquidation = (currentPrice - liquidationPrice) / currentPrice;
        } else {
            distanceToLiquidation = (liquidationPrice - currentPrice) / currentPrice;
        }

        if (distanceToLiquidation < 0.05) { // Within 5% of liquidation
            position.riskLevel = 'critical';
        } else if (distanceToLiquidation < 0.15) { // Within 15% of liquidation
            position.riskLevel = 'high';
        } else if (distanceToLiquidation < 0.30) { // Within 30% of liquidation
            position.riskLevel = 'medium';
        } else {
            position.riskLevel = 'low';
        }
    }

    updateAccountRiskMetrics(account) {
        let totalEquity = account.collateral.deposited;
        let usedMargin = 0;
        let unrealizedPnL = 0;

        // Calculate metrics from all positions
        for (const positionId of account.positions) {
            const position = this.positions.get(positionId);
            if (position && position.status === 'open') {
                usedMargin += position.margin;
                unrealizedPnL += position.unrealizedPnL;
            }
        }

        totalEquity += unrealizedPnL;
        const freeMargin = totalEquity - usedMargin;
        const marginLevel = usedMargin > 0 ? (totalEquity / usedMargin) * 100 : Infinity;

        account.riskMetrics = {
            totalEquity,
            usedMargin,
            freeMargin,
            marginLevel,
            unrealizedPnL,
            riskLevel: this.calculateAccountRiskLevel(marginLevel)
        };

        account.lastUpdated = Date.now();
    }

    calculateAccountRiskLevel(marginLevel) {
        if (marginLevel <= 110) return 'critical';
        if (marginLevel <= 150) return 'high';
        if (marginLevel <= 300) return 'medium';
        return 'low';
    }

    monitorAllPositions() {
        for (const [positionId, position] of this.positions.entries()) {
            if (position.status === 'open') {
                this.monitorPosition(position);
            }
        }
    }

    monitorPosition(position) {
        // Check if position needs margin call or liquidation
        const account = this.collateralAccounts.get(position.accountId);
        if (!account) return;

        const { marginLevel } = account.riskMetrics;

        // Margin call at 150%
        if (marginLevel <= 150 && marginLevel > 110) {
            this.sendMarginCall(position, account);
        }

        // Liquidation at 110%
        if (marginLevel <= 110) {
            this.queueForLiquidation(position);
        }
    }

    sendMarginCall(position, account) {
        const marginCallData = {
            positionId: position.id,
            accountId: account.id,
            userAddress: account.userAddress,
            marginLevel: account.riskMetrics.marginLevel,
            requiredDeposit: this.calculateRequiredDeposit(account),
            deadline: Date.now() + (2 * 60 * 60 * 1000) // 2 hours to respond
        };

        logger.warn(`Margin call issued for position ${position.id}: margin level ${account.riskMetrics.marginLevel.toFixed(2)}%`);

        this.emit('margin_call', marginCallData);
    }

    calculateRequiredDeposit(account) {
        const targetMarginLevel = 200; // Target 200% margin level
        const { totalEquity, usedMargin } = account.riskMetrics;
        const requiredEquity = (usedMargin * targetMarginLevel) / 100;
        
        return Math.max(0, requiredEquity - totalEquity);
    }

    checkLiquidationRequirements() {
        for (const [positionId, position] of this.positions.entries()) {
            if (position.status === 'open' && position.riskLevel === 'critical') {
                const shouldLiquidate = this.shouldLiquidatePosition(position);
                if (shouldLiquidate && !this.liquidationQueue.find(liq => liq.positionId === positionId)) {
                    this.queueForLiquidation(position);
                }
            }
        }
    }

    shouldLiquidatePosition(position) {
        const { currentPrice, liquidationPrice, side } = position;
        
        if (side === 'long') {
            return currentPrice <= liquidationPrice;
        } else {
            return currentPrice >= liquidationPrice;
        }
    }

    queueForLiquidation(position) {
        const liquidationOrder = {
            positionId: position.id,
            accountId: position.accountId,
            userAddress: position.userAddress,
            priority: position.riskLevel === 'critical' ? 'high' : 'normal',
            queuedAt: Date.now(),
            attempts: 0
        };

        this.liquidationQueue.push(liquidationOrder);
        
        logger.warn(`Position queued for liquidation: ${position.id}`);
        
        this.emit('liquidation_queued', liquidationOrder);
    }

    async processLiquidationQueue() {
        if (this.liquidationQueue.length === 0) return;

        // Process highest priority liquidations first
        this.liquidationQueue.sort((a, b) => {
            if (a.priority === 'high' && b.priority !== 'high') return -1;
            if (b.priority === 'high' && a.priority !== 'high') return 1;
            return a.queuedAt - b.queuedAt;
        });

        const liquidationOrder = this.liquidationQueue.shift();
        
        try {
            await this.executeLiquidation(liquidationOrder);
        } catch (error) {
            logger.error(`Error executing liquidation for position ${liquidationOrder.positionId}:`, error);
            
            liquidationOrder.attempts++;
            if (liquidationOrder.attempts < 3) {
                liquidationOrder.lastError = error.message;
                this.liquidationQueue.push(liquidationOrder);
            }
        }
    }

    async executeLiquidation(liquidationOrder) {
        const position = this.positions.get(liquidationOrder.positionId);
        if (!position || position.status !== 'open') {
            return; // Position already closed
        }

        // Force close position at current market price
        const marketData = RealTimeMarketService.getMarketData(position.pairId);
        const liquidationPrice = marketData?.price || position.currentPrice;

        // Apply liquidation penalty (typically 0.5-1% of position value)
        const liquidationPenalty = position.positionValue * 0.005; // 0.5% penalty

        await this.closeMarginPosition(position.id, liquidationPrice);

        // Deduct liquidation penalty
        const account = this.collateralAccounts.get(position.accountId);
        if (account) {
            account.collateral.deposited -= liquidationPenalty;
            account.collateral.available -= liquidationPenalty;
            this.updateAccountRiskMetrics(account);
        }

        logger.warn(`Position liquidated: ${position.id} at price ${liquidationPrice} with penalty ${liquidationPenalty.toFixed(6)} XRP`);

        this.emit('position_liquidated', {
            positionId: position.id,
            accountId: position.accountId,
            liquidationPrice,
            penalty: liquidationPenalty
        });
    }

    // ============================================================================
    // PUBLIC API METHODS
    // ============================================================================

    getCollateralAccount(accountId) {
        return this.collateralAccounts.get(accountId);
    }

    getUserCollateralAccounts(userAddress) {
        const accounts = [];
        for (const [accountId, account] of this.collateralAccounts.entries()) {
            if (account.userAddress === userAddress) {
                accounts.push(account);
            }
        }
        return accounts;
    }

    getPosition(positionId) {
        return this.positions.get(positionId);
    }

    getUserPositions(userAddress) {
        const positions = [];
        for (const [positionId, position] of this.positions.entries()) {
            if (position.userAddress === userAddress) {
                positions.push({
                    ...position,
                    userAddress: undefined // Don't return sensitive data
                });
            }
        }
        return positions;
    }

    getAccountPositions(accountId) {
        const account = this.collateralAccounts.get(accountId);
        if (!account) return [];

        return account.positions.map(positionId => this.positions.get(positionId)).filter(Boolean);
    }

    // ============================================================================
    // CLEANUP
    // ============================================================================

    async disconnect() {
        try {
            this.isMonitoring = false;
            this.positions.clear();
            this.collateralAccounts.clear();
            this.liquidationQueue = [];

            logger.info('Margin trading service disconnected');
        } catch (error) {
            logger.error('Error disconnecting margin trading service:', error);
        }
    }
}

module.exports = new MarginTradingService();