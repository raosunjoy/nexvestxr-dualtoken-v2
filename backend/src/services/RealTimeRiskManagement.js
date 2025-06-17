// ============================================================================
// REAL-TIME RISK MANAGEMENT SYSTEM - Platform-wide Risk Control
// ============================================================================

const EventEmitter = require('events');
const logger = require('../utils/logger');
const RealTimeMarketService = require('./RealTimeMarketService');
const MarginTradingService = require('./MarginTradingService');
const AdvancedOrderEngine = require('./AdvancedOrderEngine');

class RealTimeRiskManagement extends EventEmitter {
    constructor() {
        super();
        this.riskLimits = {
            platform: {
                maxDailyVolume: 10000000, // $10M daily volume limit
                maxPositionSize: 1000000, // $1M max single position
                maxLeverage: 10,
                maxDrawdown: 0.20, // 20% maximum drawdown
                maxConcentration: 0.30 // 30% max concentration in single asset
            },
            user: {
                maxDailyTrades: 1000,
                maxPositionValue: 100000, // $100K max position per user
                maxLeverage: 5, // 5x for retail users
                riskScore: {
                    conservative: { maxRisk: 0.05, maxLeverage: 2 },
                    moderate: { maxRisk: 0.10, maxLeverage: 3 },
                    aggressive: { maxRisk: 0.20, maxLeverage: 5 }
                }
            }
        };
        
        this.riskMetrics = {
            platform: {
                totalExposure: 0,
                concentrationRisk: new Map(),
                volatilityIndex: 0,
                systemicRisk: 'low',
                liquidityRisk: 'low'
            },
            alerts: new Map(),
            breaches: []
        };

        this.userRiskProfiles = new Map();
        this.circuitBreakers = new Map();
        this.isMonitoring = false;

        this.initializeRiskManagement();
    }

    async initializeRiskManagement() {
        try {
            // Subscribe to market events
            this.subscribeToMarketEvents();

            // Start risk monitoring
            this.startRiskMonitoring();

            // Initialize circuit breakers
            this.initializeCircuitBreakers();

            logger.info('Real-time risk management system initialized');
        } catch (error) {
            logger.error('Failed to initialize risk management system:', error);
            throw error;
        }
    }

    subscribeToMarketEvents() {
        // Market volatility monitoring
        RealTimeMarketService.on('price_update', (data) => {
            this.monitorPriceVolatility(data.pair, data.data);
        });

        // Position monitoring
        MarginTradingService.on('position_opened', (data) => {
            this.assessPositionRisk(data);
        });

        MarginTradingService.on('position_closed', (data) => {
            this.updateRiskExposure(data);
        });

        // Order monitoring
        AdvancedOrderEngine.on('order_triggered', (data) => {
            this.monitorOrderRisk(data);
        });
    }

    startRiskMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;

        // Platform risk assessment every 30 seconds
        setInterval(() => {
            this.assessPlatformRisk();
        }, 30000);

        // User risk assessment every minute
        setInterval(() => {
            this.assessUserRisks();
        }, 60000);

        // Circuit breaker checks every 10 seconds
        setInterval(() => {
            this.checkCircuitBreakers();
        }, 10000);

        // Risk alert processing every 5 seconds
        setInterval(() => {
            this.processRiskAlerts();
        }, 5000);

        logger.info('Risk monitoring started');
    }

    initializeCircuitBreakers() {
        // Platform-level circuit breakers
        this.circuitBreakers.set('PRICE_VOLATILITY', {
            threshold: 0.15, // 15% price movement in 5 minutes
            timeWindow: 5 * 60 * 1000, // 5 minutes
            triggered: false,
            lastReset: Date.now()
        });

        this.circuitBreakers.set('VOLUME_SPIKE', {
            threshold: 5.0, // 5x normal volume
            timeWindow: 10 * 60 * 1000, // 10 minutes
            triggered: false,
            lastReset: Date.now()
        });

        this.circuitBreakers.set('LIQUIDATION_CASCADE', {
            threshold: 10, // 10 liquidations in 5 minutes
            timeWindow: 5 * 60 * 1000,
            triggered: false,
            lastReset: Date.now(),
            counter: 0
        });

        this.circuitBreakers.set('SYSTEM_OVERLOAD', {
            threshold: 0.90, // 90% system capacity
            triggered: false,
            gracePeriod: 2 * 60 * 1000 // 2 minutes grace period
        });
    }

    // ============================================================================
    // PLATFORM RISK ASSESSMENT
    // ============================================================================

    assessPlatformRisk() {
        try {
            // Calculate total platform exposure
            this.calculatePlatformExposure();

            // Assess concentration risk
            this.assessConcentrationRisk();

            // Calculate volatility index
            this.calculateVolatilityIndex();

            // Determine systemic risk level
            this.assessSystemicRisk();

            // Check platform limits
            this.checkPlatformLimits();

            // Update risk metrics
            this.updatePlatformRiskMetrics();

        } catch (error) {
            logger.error('Error assessing platform risk:', error);
        }
    }

    calculatePlatformExposure() {
        let totalExposure = 0;
        const assetExposure = new Map();

        // Get all active positions from margin trading
        const allPositions = Array.from(MarginTradingService.positions.values())
            .filter(pos => pos.status === 'open');

        for (const position of allPositions) {
            const exposureValue = position.positionValue * position.leverage;
            totalExposure += exposureValue;

            // Track per-asset exposure
            const asset = position.pairId.split('/')[0];
            assetExposure.set(asset, (assetExposure.get(asset) || 0) + exposureValue);
        }

        this.riskMetrics.platform.totalExposure = totalExposure;
        this.riskMetrics.platform.assetExposure = assetExposure;

        return totalExposure;
    }

    assessConcentrationRisk() {
        const { totalExposure, assetExposure } = this.riskMetrics.platform;
        const concentrationRisk = new Map();

        if (totalExposure > 0) {
            for (const [asset, exposure] of assetExposure.entries()) {
                const concentration = exposure / totalExposure;
                concentrationRisk.set(asset, concentration);

                // Check concentration limits
                if (concentration > this.riskLimits.platform.maxConcentration) {
                    this.createRiskAlert('CONCENTRATION_BREACH', {
                        asset,
                        concentration,
                        limit: this.riskLimits.platform.maxConcentration,
                        severity: 'high'
                    });
                }
            }
        }

        this.riskMetrics.platform.concentrationRisk = concentrationRisk;
    }

    calculateVolatilityIndex() {
        // Calculate platform-wide volatility index based on all tracked pairs
        const marketData = RealTimeMarketService.getAllMarketData();
        let totalVolatility = 0;
        let assetCount = 0;

        for (const [pair, data] of Object.entries(marketData)) {
            if (data.change24h !== undefined) {
                totalVolatility += Math.abs(data.change24h);
                assetCount++;
            }
        }

        const avgVolatility = assetCount > 0 ? totalVolatility / assetCount : 0;
        this.riskMetrics.platform.volatilityIndex = avgVolatility;

        // Trigger volatility alerts
        if (avgVolatility > 0.20) { // 20% average volatility
            this.createRiskAlert('HIGH_VOLATILITY', {
                volatilityIndex: avgVolatility,
                severity: 'medium'
            });
        }

        return avgVolatility;
    }

    assessSystemicRisk() {
        const { totalExposure, volatilityIndex, concentrationRisk } = this.riskMetrics.platform;
        
        let riskScore = 0;

        // Exposure risk (0-40 points)
        const exposureRatio = totalExposure / this.riskLimits.platform.maxDailyVolume;
        riskScore += Math.min(40, exposureRatio * 40);

        // Volatility risk (0-30 points)
        riskScore += Math.min(30, volatilityIndex * 150);

        // Concentration risk (0-30 points)
        const maxConcentration = Math.max(...Array.from(concentrationRisk.values()));
        riskScore += Math.min(30, (maxConcentration / this.riskLimits.platform.maxConcentration) * 30);

        // Determine risk level
        let systemicRisk = 'low';
        if (riskScore > 70) systemicRisk = 'critical';
        else if (riskScore > 50) systemicRisk = 'high';
        else if (riskScore > 30) systemicRisk = 'medium';

        this.riskMetrics.platform.systemicRisk = systemicRisk;
        this.riskMetrics.platform.riskScore = riskScore;

        if (systemicRisk === 'critical') {
            this.createRiskAlert('SYSTEMIC_RISK_CRITICAL', {
                riskScore,
                severity: 'critical'
            });
        }
    }

    checkPlatformLimits() {
        const { totalExposure } = this.riskMetrics.platform;
        const { maxDailyVolume } = this.riskLimits.platform;

        // Check daily volume limit
        if (totalExposure > maxDailyVolume) {
            this.createRiskAlert('DAILY_VOLUME_EXCEEDED', {
                currentExposure: totalExposure,
                limit: maxDailyVolume,
                severity: 'high'
            });

            // Trigger circuit breaker
            this.triggerCircuitBreaker('VOLUME_SPIKE', 'Daily volume limit exceeded');
        }
    }

    updatePlatformRiskMetrics() {
        this.riskMetrics.platform.lastUpdated = Date.now();
        
        this.emit('platform_risk_updated', {
            metrics: this.riskMetrics.platform,
            timestamp: Date.now()
        });
    }

    // ============================================================================
    // USER RISK ASSESSMENT
    // ============================================================================

    async assessUserRisk(userAddress, riskProfile = 'moderate') {
        try {
            const userMetrics = await this.calculateUserRiskMetrics(userAddress);
            const riskLimits = this.riskLimits.user.riskScore[riskProfile];

            const assessment = {
                userAddress,
                riskProfile,
                metrics: userMetrics,
                limits: riskLimits,
                breaches: [],
                riskScore: this.calculateUserRiskScore(userMetrics),
                recommendation: 'normal',
                lastAssessed: Date.now()
            };

            // Check for limit breaches
            if (userMetrics.totalPositionValue > this.riskLimits.user.maxPositionValue) {
                assessment.breaches.push('MAX_POSITION_VALUE');
            }

            if (userMetrics.maxLeverage > riskLimits.maxLeverage) {
                assessment.breaches.push('MAX_LEVERAGE');
            }

            if (assessment.riskScore > riskLimits.maxRisk) {
                assessment.breaches.push('RISK_SCORE');
            }

            // Determine recommendation
            if (assessment.breaches.length > 0) {
                assessment.recommendation = 'reduce_exposure';
            } else if (assessment.riskScore > riskLimits.maxRisk * 0.8) {
                assessment.recommendation = 'caution';
            }

            this.userRiskProfiles.set(userAddress, assessment);

            // Create alerts for high-risk users
            if (assessment.recommendation === 'reduce_exposure') {
                this.createRiskAlert('USER_HIGH_RISK', {
                    userAddress,
                    riskScore: assessment.riskScore,
                    breaches: assessment.breaches,
                    severity: 'medium'
                });
            }

            return assessment;

        } catch (error) {
            logger.error(`Error assessing user risk for ${userAddress}:`, error);
            throw error;
        }
    }

    async calculateUserRiskMetrics(userAddress) {
        const positions = MarginTradingService.getUserPositions(userAddress);
        const accounts = MarginTradingService.getUserCollateralAccounts(userAddress);

        let totalPositionValue = 0;
        let totalUnrealizedPnL = 0;
        let maxLeverage = 1;
        let activePositions = 0;

        for (const position of positions) {
            if (position.status === 'open') {
                totalPositionValue += position.positionValue;
                totalUnrealizedPnL += position.unrealizedPnL || 0;
                maxLeverage = Math.max(maxLeverage, position.leverage);
                activePositions++;
            }
        }

        let totalCollateral = 0;
        let totalMarginUsed = 0;

        for (const account of accounts) {
            totalCollateral += account.collateral.deposited;
            totalMarginUsed += account.riskMetrics.usedMargin;
        }

        const marginUtilization = totalCollateral > 0 ? totalMarginUsed / totalCollateral : 0;
        const portfolioConcentration = this.calculatePortfolioConcentration(positions);

        return {
            totalPositionValue,
            totalUnrealizedPnL,
            totalCollateral,
            totalMarginUsed,
            marginUtilization,
            maxLeverage,
            activePositions,
            portfolioConcentration
        };
    }

    calculateUserRiskScore(metrics) {
        let riskScore = 0;

        // Position size risk (0-30 points)
        const positionRatio = metrics.totalPositionValue / this.riskLimits.user.maxPositionValue;
        riskScore += Math.min(30, positionRatio * 30);

        // Leverage risk (0-25 points)
        const leverageRatio = metrics.maxLeverage / this.riskLimits.user.maxLeverage;
        riskScore += Math.min(25, leverageRatio * 25);

        // Margin utilization risk (0-25 points)
        riskScore += Math.min(25, metrics.marginUtilization * 25);

        // Concentration risk (0-20 points)
        riskScore += Math.min(20, metrics.portfolioConcentration * 20);

        return riskScore / 100; // Normalize to 0-1 scale
    }

    calculatePortfolioConcentration(positions) {
        const assetExposure = new Map();
        let totalExposure = 0;

        for (const position of positions) {
            if (position.status === 'open') {
                const asset = position.pairId.split('/')[0];
                const exposure = position.positionValue;
                
                assetExposure.set(asset, (assetExposure.get(asset) || 0) + exposure);
                totalExposure += exposure;
            }
        }

        if (totalExposure === 0) return 0;

        // Calculate Herfindahl-Hirschman Index for concentration
        let hhi = 0;
        for (const exposure of assetExposure.values()) {
            const share = exposure / totalExposure;
            hhi += share * share;
        }

        return hhi;
    }

    assessUserRisks() {
        // Assess all users with active positions
        const userAddresses = new Set();
        
        for (const [accountId, account] of MarginTradingService.collateralAccounts.entries()) {
            if (account.positions.length > 0) {
                userAddresses.add(account.userAddress);
            }
        }

        for (const userAddress of userAddresses) {
            this.assessUserRisk(userAddress);
        }
    }

    // ============================================================================
    // CIRCUIT BREAKERS & EMERGENCY CONTROLS
    // ============================================================================

    monitorPriceVolatility(pair, priceData) {
        // Check for extreme price movements
        const volatilityBreaker = this.circuitBreakers.get('PRICE_VOLATILITY');
        
        if (Math.abs(priceData.change24h) > volatilityBreaker.threshold) {
            this.triggerCircuitBreaker('PRICE_VOLATILITY', `Extreme volatility in ${pair}: ${(priceData.change24h * 100).toFixed(2)}%`);
        }
    }

    checkCircuitBreakers() {
        const now = Date.now();

        for (const [name, breaker] of this.circuitBreakers.entries()) {
            // Reset breakers after time window
            if (breaker.triggered && (now - breaker.lastReset) > (breaker.timeWindow || 300000)) {
                breaker.triggered = false;
                breaker.lastReset = now;
                if (breaker.counter !== undefined) breaker.counter = 0;
                
                logger.info(`Circuit breaker reset: ${name}`);
                this.emit('circuit_breaker_reset', { name, timestamp: now });
            }
        }
    }

    triggerCircuitBreaker(name, reason) {
        const breaker = this.circuitBreakers.get(name);
        if (!breaker || breaker.triggered) return;

        breaker.triggered = true;
        breaker.triggeredAt = Date.now();
        breaker.reason = reason;

        logger.warn(`Circuit breaker triggered: ${name} - ${reason}`);

        this.createRiskAlert('CIRCUIT_BREAKER_TRIGGERED', {
            breaker: name,
            reason,
            severity: 'critical'
        });

        this.emit('circuit_breaker_triggered', {
            name,
            reason,
            timestamp: Date.now()
        });

        // Execute emergency procedures
        this.executeEmergencyProcedures(name);
    }

    executeEmergencyProcedures(breakerName) {
        switch (breakerName) {
            case 'PRICE_VOLATILITY':
                this.suspendNewPositions(5 * 60 * 1000); // 5 minutes
                break;
            case 'VOLUME_SPIKE':
                this.reduceLeverageLimits(0.5); // Reduce leverage by 50%
                break;
            case 'LIQUIDATION_CASCADE':
                this.pauseAutomaticLiquidations(10 * 60 * 1000); // 10 minutes
                break;
            case 'SYSTEM_OVERLOAD':
                this.enableEmergencyMode();
                break;
        }
    }

    suspendNewPositions(duration) {
        logger.warn(`Suspending new position creation for ${duration / 1000} seconds`);
        
        this.emit('trading_suspended', {
            type: 'new_positions',
            duration,
            timestamp: Date.now()
        });
    }

    reduceLeverageLimits(factor) {
        const originalLimits = { ...this.riskLimits };
        this.riskLimits.platform.maxLeverage *= factor;
        this.riskLimits.user.maxLeverage *= factor;

        logger.warn(`Leverage limits reduced by ${(1 - factor) * 100}%`);

        // Restore after 30 minutes
        setTimeout(() => {
            this.riskLimits = originalLimits;
            logger.info('Leverage limits restored');
        }, 30 * 60 * 1000);
    }

    pauseAutomaticLiquidations(duration) {
        logger.warn(`Pausing automatic liquidations for ${duration / 1000} seconds`);
        
        this.emit('liquidations_paused', {
            duration,
            timestamp: Date.now()
        });
    }

    enableEmergencyMode() {
        logger.error('Emergency mode activated - all trading suspended');
        
        this.emit('emergency_mode', {
            activated: true,
            timestamp: Date.now()
        });
    }

    // ============================================================================
    // RISK ALERTS & NOTIFICATIONS
    // ============================================================================

    createRiskAlert(type, data) {
        const alertId = `ALERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const alert = {
            id: alertId,
            type,
            severity: data.severity || 'medium',
            data,
            status: 'active',
            createdAt: Date.now(),
            acknowledged: false
        };

        this.riskMetrics.alerts.set(alertId, alert);

        logger.warn(`Risk alert created: ${type} - ${alert.severity}`, data);

        this.emit('risk_alert', alert);

        return alertId;
    }

    acknowledgeAlert(alertId, acknowledgedBy) {
        const alert = this.riskMetrics.alerts.get(alertId);
        if (alert) {
            alert.acknowledged = true;
            alert.acknowledgedBy = acknowledgedBy;
            alert.acknowledgedAt = Date.now();
            
            this.emit('alert_acknowledged', { alertId, acknowledgedBy });
        }
    }

    processRiskAlerts() {
        // Clean up old acknowledged alerts
        const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
        
        for (const [alertId, alert] of this.riskMetrics.alerts.entries()) {
            if (alert.acknowledged && alert.acknowledgedAt < cutoffTime) {
                this.riskMetrics.alerts.delete(alertId);
            }
        }
    }

    // ============================================================================
    // RISK ASSESSMENT METHODS
    // ============================================================================

    assessPositionRisk(positionData) {
        const { position } = positionData;
        
        // Check position size limits
        if (position.positionValue > this.riskLimits.platform.maxPositionSize) {
            this.createRiskAlert('LARGE_POSITION', {
                positionId: position.id,
                positionValue: position.positionValue,
                limit: this.riskLimits.platform.maxPositionSize,
                severity: 'medium'
            });
        }

        // Check leverage limits
        if (position.leverage > this.riskLimits.platform.maxLeverage) {
            this.createRiskAlert('HIGH_LEVERAGE', {
                positionId: position.id,
                leverage: position.leverage,
                limit: this.riskLimits.platform.maxLeverage,
                severity: 'high'
            });
        }
    }

    updateRiskExposure(positionData) {
        // Update platform exposure after position closure
        this.calculatePlatformExposure();
    }

    monitorOrderRisk(orderData) {
        // Monitor high-risk order executions
        const { originalOrderId, executionResult } = orderData;
        
        if (executionResult.executedAmount * executionResult.executionPrice > this.riskLimits.platform.maxPositionSize) {
            this.createRiskAlert('LARGE_ORDER_EXECUTION', {
                orderId: originalOrderId,
                executionValue: executionResult.executedAmount * executionResult.executionPrice,
                severity: 'medium'
            });
        }
    }

    // ============================================================================
    // PUBLIC API METHODS
    // ============================================================================

    getPlatformRiskMetrics() {
        return {
            ...this.riskMetrics.platform,
            circuitBreakers: Array.from(this.circuitBreakers.entries()).map(([name, breaker]) => ({
                name,
                triggered: breaker.triggered,
                threshold: breaker.threshold,
                lastReset: breaker.lastReset
            }))
        };
    }

    getUserRiskProfile(userAddress) {
        return this.userRiskProfiles.get(userAddress);
    }

    getActiveAlerts(severity = null) {
        let alerts = Array.from(this.riskMetrics.alerts.values())
            .filter(alert => !alert.acknowledged);

        if (severity) {
            alerts = alerts.filter(alert => alert.severity === severity);
        }

        return alerts.sort((a, b) => b.createdAt - a.createdAt);
    }

    getRiskBreaches(timeWindow = 24 * 60 * 60 * 1000) {
        const cutoff = Date.now() - timeWindow;
        return this.riskMetrics.breaches.filter(breach => breach.timestamp > cutoff);
    }

    // ============================================================================
    // CLEANUP
    // ============================================================================

    async disconnect() {
        try {
            this.isMonitoring = false;
            this.riskMetrics.alerts.clear();
            this.userRiskProfiles.clear();
            this.circuitBreakers.clear();

            logger.info('Real-time risk management system disconnected');
        } catch (error) {
            logger.error('Error disconnecting risk management system:', error);
        }
    }
}

module.exports = new RealTimeRiskManagement();