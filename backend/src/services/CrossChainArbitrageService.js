// ============================================================================
// CROSS-CHAIN ARBITRAGE SERVICE - XRPL ↔ Flare Network Opportunities
// ============================================================================

const EventEmitter = require('events');
const logger = require('../utils/logger');
const RealTimeMarketService = require('./RealTimeMarketService');
const PROPXTradingService = require('./PROPXTradingService');
const DualTokenService = require('./DualTokenService');

class CrossChainArbitrageService extends EventEmitter {
    constructor() {
        super();
        this.arbitrageOpportunities = new Map();
        this.priceFeeds = new Map();
        this.bridgeRates = new Map();
        this.executionThreshold = 0.02; // 2% minimum profit threshold
        this.maxSlippage = 0.01; // 1% maximum slippage
        this.isMonitoring = false;
        
        this.initializeArbitrageMonitoring();
    }

    async initializeArbitrageMonitoring() {
        try {
            // Subscribe to price updates from both networks
            this.subscribeToPriceFeeds();

            // Initialize bridge rate monitoring
            await this.initializeBridgeRates();

            // Start arbitrage detection
            this.startArbitrageDetection();

            logger.info('Cross-chain arbitrage service initialized');
        } catch (error) {
            logger.error('Failed to initialize cross-chain arbitrage service:', error);
            throw error;
        }
    }

    subscribeToPriceFeeds() {
        // Subscribe to XRPL price updates
        RealTimeMarketService.on('price_update', (data) => {
            if (data.pair.includes('XRP')) {
                this.updatePriceFeed('XRPL', data.pair, data.data);
            }
        });

        // Subscribe to Flare price updates
        RealTimeMarketService.on('price_update', (data) => {
            if (data.pair.includes('FLR') || data.pair.includes('PROPX')) {
                this.updatePriceFeed('Flare', data.pair, data.data);
            }
        });
    }

    async initializeBridgeRates() {
        // Initialize cross-chain bridge exchange rates
        this.bridgeRates.set('XRP/FLR', {
            rate: 0.45, // Mock rate: 1 XRP = 0.45 FLR
            lastUpdated: Date.now(),
            source: 'FlareXRPOracle',
            fee: 0.001 // 0.1% bridge fee
        });

        this.bridgeRates.set('FLR/XRP', {
            rate: 2.22, // Mock rate: 1 FLR = 2.22 XRP
            lastUpdated: Date.now(),
            source: 'FlareXRPOracle',
            fee: 0.001
        });

        // Start bridge rate updates
        setInterval(() => {
            this.updateBridgeRates();
        }, 30000); // Update every 30 seconds
    }

    updatePriceFeed(network, pair, priceData) {
        const feedKey = `${network}:${pair}`;
        this.priceFeeds.set(feedKey, {
            ...priceData,
            network,
            pair,
            receivedAt: Date.now()
        });

        // Trigger arbitrage detection when price updates
        this.detectArbitrageOpportunities();
    }

    async updateBridgeRates() {
        try {
            // In production, fetch from Flare oracles or bridge contracts
            // Mock update with slight variation
            const xrpFlrRate = this.bridgeRates.get('XRP/FLR');
            const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
            
            this.bridgeRates.set('XRP/FLR', {
                ...xrpFlrRate,
                rate: xrpFlrRate.rate * (1 + variation),
                lastUpdated: Date.now()
            });

            this.bridgeRates.set('FLR/XRP', {
                rate: 1 / (xrpFlrRate.rate * (1 + variation)),
                lastUpdated: Date.now(),
                source: 'FlareXRPOracle',
                fee: 0.001
            });

        } catch (error) {
            logger.error('Error updating bridge rates:', error);
        }
    }

    startArbitrageDetection() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;

        // Run arbitrage detection every 5 seconds
        setInterval(() => {
            this.detectArbitrageOpportunities();
        }, 5000);

        // Clean up expired opportunities every minute
        setInterval(() => {
            this.cleanupExpiredOpportunities();
        }, 60000);

        logger.info('Arbitrage detection started');
    }

    // ============================================================================
    // ARBITRAGE OPPORTUNITY DETECTION
    // ============================================================================

    detectArbitrageOpportunities() {
        try {
            // Detect XERA arbitrage opportunities
            this.detectXERAArbitrage();

            // Detect PROPX cross-listing arbitrage
            this.detectPROPXArbitrage();

            // Detect bridge arbitrage
            this.detectBridgeArbitrage();

        } catch (error) {
            logger.error('Error detecting arbitrage opportunities:', error);
        }
    }

    detectXERAArbitrage() {
        // XERA is primarily on XRPL but may have wrapped versions on other chains
        const xrplXERA = this.priceFeeds.get('XRPL:XERA/XRP');
        const flareXERA = this.priceFeeds.get('Flare:XERA/FLR');

        if (!xrplXERA || !flareXERA) return;

        const bridgeRate = this.bridgeRates.get('XRP/FLR');
        if (!bridgeRate) return;

        // Convert XRPL XERA price to FLR terms
        const xrplXERAInFLR = xrplXERA.price * bridgeRate.rate;
        const priceDifference = flareXERA.price - xrplXERAInFLR;
        const profitPercent = priceDifference / xrplXERAInFLR;

        if (Math.abs(profitPercent) > this.executionThreshold) {
            const opportunity = this.createArbitrageOpportunity({
                type: 'XERA_CROSS_CHAIN',
                tokenSymbol: 'XERA',
                buyNetwork: profitPercent > 0 ? 'XRPL' : 'Flare',
                sellNetwork: profitPercent > 0 ? 'Flare' : 'XRPL',
                buyPrice: profitPercent > 0 ? xrplXERA.price : flareXERA.price,
                sellPrice: profitPercent > 0 ? flareXERA.price : xrplXERA.price,
                profitPercent: Math.abs(profitPercent),
                bridgeRequired: true,
                bridgeFee: bridgeRate.fee,
                estimatedProfit: Math.abs(profitPercent) - bridgeRate.fee - this.maxSlippage
            });

            this.addArbitrageOpportunity(opportunity);
        }
    }

    detectPROPXArbitrage() {
        // Detect arbitrage between different PROPX tokens or DEXs
        const propxPairs = Array.from(this.priceFeeds.keys()).filter(key => 
            key.includes('PROPX') && key.includes('Flare')
        );

        for (let i = 0; i < propxPairs.length; i++) {
            for (let j = i + 1; j < propxPairs.length; j++) {
                const pair1 = this.priceFeeds.get(propxPairs[i]);
                const pair2 = this.priceFeeds.get(propxPairs[j]);

                if (pair1 && pair2 && this.isSimilarAsset(pair1.pair, pair2.pair)) {
                    const priceDifference = pair2.price - pair1.price;
                    const profitPercent = Math.abs(priceDifference) / Math.min(pair1.price, pair2.price);

                    if (profitPercent > this.executionThreshold) {
                        const opportunity = this.createArbitrageOpportunity({
                            type: 'PROPX_DEX_ARBITRAGE',
                            tokenSymbol: this.extractTokenSymbol(pair1.pair),
                            buyNetwork: 'Flare',
                            sellNetwork: 'Flare',
                            buyDEX: this.extractDEX(pair1.pair),
                            sellDEX: this.extractDEX(pair2.pair),
                            buyPrice: Math.min(pair1.price, pair2.price),
                            sellPrice: Math.max(pair1.price, pair2.price),
                            profitPercent,
                            bridgeRequired: false,
                            estimatedProfit: profitPercent - this.maxSlippage * 2 // Double slippage for two trades
                        });

                        this.addArbitrageOpportunity(opportunity);
                    }
                }
            }
        }
    }

    detectBridgeArbitrage() {
        // Detect pure bridge arbitrage (XRP ↔ FLR rate inefficiencies)
        const xrpPrice = this.getLatestPrice('XRP');
        const flrPrice = this.getLatestPrice('FLR');
        const bridgeRate = this.bridgeRates.get('XRP/FLR');

        if (!xrpPrice || !flrPrice || !bridgeRate) return;

        const impliedFLRPrice = xrpPrice * bridgeRate.rate;
        const priceDifference = flrPrice.price - impliedFLRPrice;
        const profitPercent = Math.abs(priceDifference) / impliedFLRPrice;

        if (profitPercent > this.executionThreshold) {
            const opportunity = this.createArbitrageOpportunity({
                type: 'BRIDGE_ARBITRAGE',
                tokenSymbol: 'XRP/FLR',
                buyAsset: priceDifference > 0 ? 'XRP' : 'FLR',
                sellAsset: priceDifference > 0 ? 'FLR' : 'XRP',
                buyPrice: priceDifference > 0 ? xrpPrice.price : flrPrice.price,
                sellPrice: priceDifference > 0 ? flrPrice.price : xrpPrice.price,
                profitPercent,
                bridgeRequired: true,
                bridgeFee: bridgeRate.fee,
                estimatedProfit: profitPercent - bridgeRate.fee - this.maxSlippage
            });

            this.addArbitrageOpportunity(opportunity);
        }
    }

    // ============================================================================
    // ARBITRAGE EXECUTION
    // ============================================================================

    async executeArbitrage(opportunityId, userAddress, amount) {
        try {
            const opportunity = this.arbitrageOpportunities.get(opportunityId);
            if (!opportunity) {
                throw new Error('Arbitrage opportunity not found');
            }

            if (opportunity.status !== 'active') {
                throw new Error('Arbitrage opportunity is no longer active');
            }

            // Mark as executing
            opportunity.status = 'executing';
            opportunity.executionStarted = Date.now();

            logger.info(`Executing arbitrage: ${opportunityId} for ${amount} with user ${userAddress}`);

            let executionResult;

            switch (opportunity.type) {
                case 'XERA_CROSS_CHAIN':
                    executionResult = await this.executeXERACrossChainArbitrage(opportunity, userAddress, amount);
                    break;
                case 'PROPX_DEX_ARBITRAGE':
                    executionResult = await this.executePROPXDEXArbitrage(opportunity, userAddress, amount);
                    break;
                case 'BRIDGE_ARBITRAGE':
                    executionResult = await this.executeBridgeArbitrage(opportunity, userAddress, amount);
                    break;
                default:
                    throw new Error(`Unknown arbitrage type: ${opportunity.type}`);
            }

            opportunity.status = 'completed';
            opportunity.executionCompleted = Date.now();
            opportunity.executionResult = executionResult;

            this.emit('arbitrage_executed', {
                opportunityId,
                userAddress,
                amount,
                result: executionResult
            });

            return executionResult;

        } catch (error) {
            logger.error(`Error executing arbitrage ${opportunityId}:`, error);
            
            const opportunity = this.arbitrageOpportunities.get(opportunityId);
            if (opportunity) {
                opportunity.status = 'failed';
                opportunity.error = error.message;
            }

            throw error;
        }
    }

    async executeXERACrossChainArbitrage(opportunity, userAddress, amount) {
        const { buyNetwork, sellNetwork, buyPrice, sellPrice } = opportunity;

        // Step 1: Buy XERA on cheaper network
        let buyResult;
        if (buyNetwork === 'XRPL') {
            buyResult = await this.buyXERAOnXRPL(userAddress, amount, buyPrice);
        } else {
            buyResult = await this.buyXERAOnFlare(userAddress, amount, buyPrice);
        }

        // Step 2: Bridge XERA to sell network (if different)
        let bridgeResult = null;
        if (buyNetwork !== sellNetwork) {
            bridgeResult = await this.bridgeXERA(userAddress, amount, buyNetwork, sellNetwork);
        }

        // Step 3: Sell XERA on expensive network
        let sellResult;
        if (sellNetwork === 'XRPL') {
            sellResult = await this.sellXERAOnXRPL(userAddress, amount, sellPrice);
        } else {
            sellResult = await this.sellXERAOnFlare(userAddress, amount, sellPrice);
        }

        const totalCost = amount * buyPrice;
        const totalRevenue = amount * sellPrice;
        const bridgeFee = bridgeResult ? bridgeResult.fee : 0;
        const netProfit = totalRevenue - totalCost - bridgeFee;

        return {
            success: true,
            buyTransaction: buyResult.transactionHash,
            sellTransaction: sellResult.transactionHash,
            bridgeTransaction: bridgeResult?.transactionHash,
            totalCost,
            totalRevenue,
            bridgeFee,
            netProfit,
            profitPercent: netProfit / totalCost,
            executionTime: Date.now() - opportunity.executionStarted
        };
    }

    async executePROPXDEXArbitrage(opportunity, userAddress, amount) {
        const { buyDEX, sellDEX, buyPrice, sellPrice, tokenSymbol } = opportunity;

        // Step 1: Buy PROPX token on cheaper DEX
        const buyResult = await PROPXTradingService.createPROPXMarketOrder(
            userAddress, 
            `${tokenSymbol}/FLR`, 
            'buy', 
            amount
        );

        // Step 2: Sell PROPX token on expensive DEX
        const sellResult = await PROPXTradingService.createPROPXMarketOrder(
            userAddress, 
            `${tokenSymbol}/FLR`, 
            'sell', 
            amount
        );

        const totalCost = amount * buyPrice;
        const totalRevenue = amount * sellPrice;
        const netProfit = totalRevenue - totalCost;

        return {
            success: true,
            buyTransaction: buyResult.transaction,
            sellTransaction: sellResult.transaction,
            buyDEX,
            sellDEX,
            totalCost,
            totalRevenue,
            netProfit,
            profitPercent: netProfit / totalCost,
            executionTime: Date.now() - opportunity.executionStarted
        };
    }

    async executeBridgeArbitrage(opportunity, userAddress, amount) {
        const { buyAsset, sellAsset, buyPrice, sellPrice } = opportunity;

        // Step 1: Buy cheaper asset
        const buyResult = await this.executeAssetPurchase(userAddress, buyAsset, amount, buyPrice);

        // Step 2: Bridge to other network
        const bridgeResult = await this.bridgeAsset(userAddress, buyAsset, amount);

        // Step 3: Sell on target network
        const sellResult = await this.executeAssetSale(userAddress, sellAsset, amount, sellPrice);

        const totalCost = amount * buyPrice;
        const totalRevenue = amount * sellPrice;
        const bridgeFee = bridgeResult.fee;
        const netProfit = totalRevenue - totalCost - bridgeFee;

        return {
            success: true,
            buyTransaction: buyResult.transactionHash,
            bridgeTransaction: bridgeResult.transactionHash,
            sellTransaction: sellResult.transactionHash,
            totalCost,
            totalRevenue,
            bridgeFee,
            netProfit,
            profitPercent: netProfit / totalCost,
            executionTime: Date.now() - opportunity.executionStarted
        };
    }

    // ============================================================================
    // HELPER METHODS
    // ============================================================================

    createArbitrageOpportunity(data) {
        const id = `ARB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        return {
            id,
            ...data,
            status: 'active',
            detectedAt: Date.now(),
            expiresAt: Date.now() + (5 * 60 * 1000), // 5 minutes expiry
            confidence: this.calculateConfidence(data),
            riskLevel: this.calculateRiskLevel(data)
        };
    }

    calculateConfidence(opportunity) {
        // Calculate confidence based on liquidity, price stability, etc.
        let confidence = 0.5; // Base confidence

        // Higher profit = higher confidence (to a point)
        if (opportunity.profitPercent > 0.05) confidence += 0.3;
        else if (opportunity.profitPercent > 0.03) confidence += 0.2;
        else if (opportunity.profitPercent > 0.02) confidence += 0.1;

        // Bridge requirement reduces confidence
        if (opportunity.bridgeRequired) confidence -= 0.2;

        // DEX arbitrage is generally more reliable
        if (opportunity.type === 'PROPX_DEX_ARBITRAGE') confidence += 0.1;

        return Math.max(0.1, Math.min(0.95, confidence));
    }

    calculateRiskLevel(opportunity) {
        let risk = 'medium';

        if (opportunity.profitPercent < 0.025) risk = 'high';
        else if (opportunity.profitPercent > 0.05) risk = 'low';

        if (opportunity.bridgeRequired) {
            risk = risk === 'low' ? 'medium' : 'high';
        }

        return risk;
    }

    addArbitrageOpportunity(opportunity) {
        this.arbitrageOpportunities.set(opportunity.id, opportunity);
        
        logger.info(`New arbitrage opportunity: ${opportunity.id} - ${opportunity.type} - ${(opportunity.profitPercent * 100).toFixed(2)}% profit`);
        
        this.emit('arbitrage_opportunity', opportunity);
    }

    cleanupExpiredOpportunities() {
        const now = Date.now();
        const expiredIds = [];

        for (const [id, opportunity] of this.arbitrageOpportunities.entries()) {
            if (opportunity.expiresAt < now || opportunity.status === 'completed' || opportunity.status === 'failed') {
                expiredIds.push(id);
            }
        }

        for (const id of expiredIds) {
            this.arbitrageOpportunities.delete(id);
        }

        if (expiredIds.length > 0) {
            logger.info(`Cleaned up ${expiredIds.length} expired arbitrage opportunities`);
        }
    }

    getLatestPrice(symbol) {
        // Find the most recent price for a symbol across all feeds
        let latestPrice = null;
        let latestTimestamp = 0;

        for (const [key, feed] of this.priceFeeds.entries()) {
            if (key.includes(symbol) && feed.timestamp > latestTimestamp) {
                latestPrice = feed;
                latestTimestamp = feed.timestamp;
            }
        }

        return latestPrice;
    }

    isSimilarAsset(pair1, pair2) {
        // Check if two pairs represent the same underlying asset
        const token1 = this.extractTokenSymbol(pair1);
        const token2 = this.extractTokenSymbol(pair2);
        
        return token1 === token2;
    }

    extractTokenSymbol(pair) {
        return pair.split('/')[0].replace('PROPX-', '').split('-')[0];
    }

    extractDEX(pair) {
        // Extract DEX name from pair or feed key
        if (pair.includes('BlazeDX')) return 'BlazeDX';
        if (pair.includes('SparkDEX')) return 'SparkDEX';
        return 'Unknown';
    }

    // Mock execution methods (implement with actual trading logic)
    async buyXERAOnXRPL(userAddress, amount, price) {
        return { success: true, transactionHash: `xrpl-buy-${Date.now()}` };
    }

    async sellXERAOnXRPL(userAddress, amount, price) {
        return { success: true, transactionHash: `xrpl-sell-${Date.now()}` };
    }

    async buyXERAOnFlare(userAddress, amount, price) {
        return { success: true, transactionHash: `flare-buy-${Date.now()}` };
    }

    async sellXERAOnFlare(userAddress, amount, price) {
        return { success: true, transactionHash: `flare-sell-${Date.now()}` };
    }

    async bridgeXERA(userAddress, amount, fromNetwork, toNetwork) {
        return { 
            success: true, 
            transactionHash: `bridge-${Date.now()}`,
            fee: amount * 0.001 // 0.1% bridge fee
        };
    }

    async executeAssetPurchase(userAddress, asset, amount, price) {
        return { success: true, transactionHash: `buy-${asset}-${Date.now()}` };
    }

    async executeAssetSale(userAddress, asset, amount, price) {
        return { success: true, transactionHash: `sell-${asset}-${Date.now()}` };
    }

    async bridgeAsset(userAddress, asset, amount) {
        return { 
            success: true, 
            transactionHash: `bridge-${asset}-${Date.now()}`,
            fee: amount * 0.001
        };
    }

    // ============================================================================
    // PUBLIC API METHODS
    // ============================================================================

    getActiveOpportunities(filterOptions = {}) {
        const opportunities = Array.from(this.arbitrageOpportunities.values())
            .filter(opp => opp.status === 'active');

        // Apply filters
        if (filterOptions.minProfit) {
            opportunities = opportunities.filter(opp => opp.profitPercent >= filterOptions.minProfit);
        }
        
        if (filterOptions.maxRisk) {
            const riskLevels = { low: 1, medium: 2, high: 3 };
            opportunities = opportunities.filter(opp => 
                riskLevels[opp.riskLevel] <= riskLevels[filterOptions.maxRisk]
            );
        }

        if (filterOptions.type) {
            opportunities = opportunities.filter(opp => opp.type === filterOptions.type);
        }

        // Sort by profit potential
        return opportunities.sort((a, b) => b.estimatedProfit - a.estimatedProfit);
    }

    getOpportunityById(opportunityId) {
        return this.arbitrageOpportunities.get(opportunityId);
    }

    getArbitrageHistory(limit = 50) {
        return Array.from(this.arbitrageOpportunities.values())
            .filter(opp => opp.status === 'completed' || opp.status === 'failed')
            .sort((a, b) => b.detectedAt - a.detectedAt)
            .slice(0, limit);
    }

    // ============================================================================
    // CLEANUP
    // ============================================================================

    async disconnect() {
        try {
            this.isMonitoring = false;
            this.arbitrageOpportunities.clear();
            this.priceFeeds.clear();
            this.bridgeRates.clear();

            logger.info('Cross-chain arbitrage service disconnected');
        } catch (error) {
            logger.error('Error disconnecting cross-chain arbitrage service:', error);
        }
    }
}

module.exports = new CrossChainArbitrageService();