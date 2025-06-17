// ============================================================================
// PROPX FLARE NETWORK TRADING SERVICE - DEX Integration & Cross-Chain Trading
// ============================================================================

const { ethers } = require('ethers');
const axios = require('axios');
const logger = require('../utils/logger');
const RealTimeMarketService = require('./RealTimeMarketService');

class PROPXTradingService {
    constructor() {
        this.flareProvider = null;
        this.wallet = null;
        this.dexContracts = new Map();
        this.liquidityPools = new Map();
        this.tradingPairs = new Map();
        
        this.initializeFlareConnections();
    }

    async initializeFlareConnections() {
        try {
            // Initialize Flare Network provider
            this.flareProvider = new ethers.JsonRpcProvider(
                process.env.FLARE_RPC_URL || 'https://flare-api.flare.network/ext/bc/C/rpc'
            );

            // Initialize wallet
            this.wallet = new ethers.Wallet(
                process.env.FLARE_PRIVATE_KEY || '0x' + '0'.repeat(64),
                this.flareProvider
            );

            // Initialize DEX contracts
            await this.initializeDEXContracts();

            // Load trading pairs
            await this.loadTradingPairs();

            logger.info('PROPX Flare Network trading service initialized');
        } catch (error) {
            logger.error('Failed to initialize PROPX trading service:', error);
            throw error;
        }
    }

    async initializeDEXContracts() {
        // BlazeDX (Flare's primary DEX)
        this.dexContracts.set('BlazeDX', {
            router: new ethers.Contract(
                process.env.BLAZEDX_ROUTER || '0x1234567890abcdef1234567890abcdef12345678',
                [
                    'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
                    'function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)',
                    'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
                    'function getAmountsIn(uint amountOut, address[] calldata path) external view returns (uint[] memory amounts)'
                ],
                this.wallet
            ),
            factory: new ethers.Contract(
                process.env.BLAZEDX_FACTORY || '0xabcdef1234567890abcdef1234567890abcdef12',
                [
                    'function getPair(address tokenA, address tokenB) external view returns (address pair)',
                    'function createPair(address tokenA, address tokenB) external returns (address pair)'
                ],
                this.wallet
            )
        });

        // SparkDEX (Secondary DEX)
        this.dexContracts.set('SparkDEX', {
            router: new ethers.Contract(
                process.env.SPARKDEX_ROUTER || '0xfedcba0987654321fedcba0987654321fedcba09',
                [
                    'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
                    'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)'
                ],
                this.wallet
            )
        });

        logger.info('DEX contracts initialized');
    }

    async loadTradingPairs() {
        // PROPX token contracts and their trading pairs
        const propxTokens = [
            {
                address: process.env.PROPX_GODREJ_BKC || '0x1111111111111111111111111111111111111111',
                symbol: 'PROPX-GODREJ-BKC001',
                name: 'Godrej BKC Residency Tower A',
                decimals: 18
            },
            {
                address: process.env.PROPX_PRESTIGE_TECH || '0x2222222222222222222222222222222222222222',
                symbol: 'PROPX-PRESTIGE-TECH002',
                name: 'Prestige Tech Park Phase II',
                decimals: 18
            },
            {
                address: process.env.PROPX_BRIGADE_METRO || '0x3333333333333333333333333333333333333333',
                symbol: 'PROPX-BRIGADE-METRO003',
                name: 'Brigade Metropolis Mall',
                decimals: 18
            }
        ];

        const flrAddress = '0x1D80c49BbBCd1C0911346656B529DF9E5c2F783d'; // FLR token address

        for (const token of propxTokens) {
            const pairId = `${token.symbol}/FLR`;
            this.tradingPairs.set(pairId, {
                tokenA: token.address,
                tokenB: flrAddress,
                symbolA: token.symbol,
                symbolB: 'FLR',
                decimalsA: token.decimals,
                decimalsB: 18,
                name: token.name
            });
        }

        logger.info(`Loaded ${this.tradingPairs.size} PROPX trading pairs`);
    }

    // ============================================================================
    // PROPX TRADING OPERATIONS
    // ============================================================================

    async createPROPXMarketOrder(userAddress, pairId, side, amount) {
        try {
            const pair = this.tradingPairs.get(pairId);
            if (!pair) {
                throw new Error(`Trading pair ${pairId} not found`);
            }

            const dexName = await this.findBestDEX(pairId, amount, side);
            const dex = this.dexContracts.get(dexName);

            let path, amountIn, amountOutMin;

            if (side === 'buy') {
                // Buy PROPX with FLR
                path = [pair.tokenB, pair.tokenA];
                amountIn = ethers.utils.parseEther(amount.toString());
                
                const amountsOut = await dex.router.getAmountsOut(amountIn, path);
                amountOutMin = amountsOut[1].mul(98).div(100); // 2% slippage tolerance
            } else {
                // Sell PROPX for FLR
                path = [pair.tokenA, pair.tokenB];
                amountIn = ethers.utils.parseUnits(amount.toString(), pair.decimalsA);
                
                const amountsOut = await dex.router.getAmountsOut(amountIn, path);
                amountOutMin = amountsOut[1].mul(98).div(100); // 2% slippage tolerance
            }

            const deadline = Math.floor(Date.now() / 1000) + 1200; // 20 minutes

            const transaction = await dex.router.populateTransaction.swapExactTokensForTokens(
                amountIn,
                amountOutMin,
                path,
                userAddress,
                deadline
            );

            return {
                success: true,
                transaction,
                dex: dexName,
                path,
                amountIn: ethers.utils.formatUnits(amountIn, side === 'buy' ? 18 : pair.decimalsA),
                estimatedAmountOut: ethers.utils.formatUnits(amountOutMin, side === 'buy' ? pair.decimalsA : 18),
                slippage: '2%'
            };

        } catch (error) {
            logger.error(`Error creating PROPX market order for ${pairId}:`, error);
            throw error;
        }
    }

    async createPROPXLimitOrder(userAddress, pairId, side, amount, price) {
        try {
            // For limit orders, we'll use a simplified approach
            // In production, integrate with limit order protocols like 0x or custom limit order book
            
            const pair = this.tradingPairs.get(pairId);
            if (!pair) {
                throw new Error(`Trading pair ${pairId} not found`);
            }

            // Calculate total value
            const totalValue = amount * price;
            
            // Create conditional transaction structure
            const limitOrder = {
                pairId,
                side,
                amount,
                price,
                userAddress,
                status: 'pending',
                createdAt: Date.now(),
                expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
                type: 'limit'
            };

            // In production, store this in a database and monitor price movements
            logger.info(`PROPX limit order created: ${side} ${amount} ${pair.symbolA} at ${price} FLR`);

            return {
                success: true,
                orderId: `PROPX-LIMIT-${Date.now()}`,
                order: limitOrder,
                estimatedGas: '250000',
                network: 'Flare'
            };

        } catch (error) {
            logger.error(`Error creating PROPX limit order for ${pairId}:`, error);
            throw error;
        }
    }

    async addPROPXLiquidity(userAddress, pairId, tokenAmount, flrAmount) {
        try {
            const pair = this.tradingPairs.get(pairId);
            if (!pair) {
                throw new Error(`Trading pair ${pairId} not found`);
            }

            const dex = this.dexContracts.get('BlazeDX');
            const deadline = Math.floor(Date.now() / 1000) + 1200; // 20 minutes

            const tokenAmountParsed = ethers.utils.parseUnits(tokenAmount.toString(), pair.decimalsA);
            const flrAmountParsed = ethers.utils.parseEther(flrAmount.toString());

            // Allow 5% slippage for liquidity provision
            const tokenAmountMin = tokenAmountParsed.mul(95).div(100);
            const flrAmountMin = flrAmountParsed.mul(95).div(100);

            const transaction = await dex.router.populateTransaction.addLiquidity(
                pair.tokenA,
                pair.tokenB,
                tokenAmountParsed,
                flrAmountParsed,
                tokenAmountMin,
                flrAmountMin,
                userAddress,
                deadline
            );

            return {
                success: true,
                transaction,
                tokenAmount,
                flrAmount,
                slippage: '5%',
                dex: 'BlazeDX'
            };

        } catch (error) {
            logger.error(`Error adding PROPX liquidity for ${pairId}:`, error);
            throw error;
        }
    }

    // ============================================================================
    // DEX OPTIMIZATION & ROUTING
    // ============================================================================

    async findBestDEX(pairId, amount, side) {
        try {
            const pair = this.tradingPairs.get(pairId);
            const path = side === 'buy' ? [pair.tokenB, pair.tokenA] : [pair.tokenA, pair.tokenB];
            const amountIn = side === 'buy' ? 
                ethers.utils.parseEther(amount.toString()) :
                ethers.utils.parseUnits(amount.toString(), pair.decimalsA);

            let bestDEX = 'BlazeDX';
            let bestOutput = ethers.BigNumber.from(0);

            // Check all available DEXs for best price
            for (const [dexName, dex] of this.dexContracts.entries()) {
                try {
                    const amountsOut = await dex.router.getAmountsOut(amountIn, path);
                    const output = amountsOut[1];

                    if (output.gt(bestOutput)) {
                        bestOutput = output;
                        bestDEX = dexName;
                    }
                } catch (error) {
                    logger.warn(`Failed to get quote from ${dexName}:`, error.message);
                }
            }

            logger.info(`Best DEX for ${pairId} ${side}: ${bestDEX} with output ${ethers.utils.formatEther(bestOutput)}`);
            return bestDEX;

        } catch (error) {
            logger.error(`Error finding best DEX for ${pairId}:`, error);
            return 'BlazeDX'; // Default fallback
        }
    }

    async getPROPXPrice(pairId) {
        try {
            const pair = this.tradingPairs.get(pairId);
            if (!pair) {
                throw new Error(`Trading pair ${pairId} not found`);
            }

            // Get price from primary DEX
            const dex = this.dexContracts.get('BlazeDX');
            const amountIn = ethers.utils.parseEther('1'); // 1 FLR
            const path = [pair.tokenB, pair.tokenA];

            const amountsOut = await dex.router.getAmountsOut(amountIn, path);
            const pricePerToken = parseFloat(ethers.utils.formatUnits(amountsOut[1], pair.decimalsA));

            return {
                pairId,
                price: 1 / pricePerToken, // FLR per PROPX token
                pricePerToken,
                source: 'BlazeDX',
                timestamp: Date.now()
            };

        } catch (error) {
            logger.error(`Error getting PROPX price for ${pairId}:`, error);
            return {
                pairId,
                price: 0,
                pricePerToken: 0,
                source: 'ERROR',
                timestamp: Date.now()
            };
        }
    }

    // ============================================================================
    // PORTFOLIO & BALANCE MANAGEMENT
    // ============================================================================

    async getPROPXPortfolio(userAddress) {
        try {
            const portfolio = {
                userAddress,
                holdings: [],
                totalValue: 0,
                networks: ['Flare'],
                lastUpdated: Date.now()
            };

            for (const [pairId, pair] of this.tradingPairs.entries()) {
                try {
                    const tokenContract = new ethers.Contract(
                        pair.tokenA,
                        ['function balanceOf(address owner) view returns (uint256)'],
                        this.flareProvider
                    );

                    const balance = await tokenContract.balanceOf(userAddress);
                    const balanceFormatted = parseFloat(ethers.utils.formatUnits(balance, pair.decimalsA));

                    if (balanceFormatted > 0) {
                        const priceData = await this.getPROPXPrice(pairId);
                        const value = balanceFormatted * priceData.price;

                        portfolio.holdings.push({
                            pairId,
                            symbol: pair.symbolA,
                            name: pair.name,
                            balance: balanceFormatted,
                            price: priceData.price,
                            value,
                            network: 'Flare'
                        });

                        portfolio.totalValue += value;
                    }
                } catch (error) {
                    logger.warn(`Error getting balance for ${pairId}:`, error.message);
                }
            }

            return portfolio;

        } catch (error) {
            logger.error(`Error getting PROPX portfolio for ${userAddress}:`, error);
            throw error;
        }
    }

    async getPROPXBalance(userAddress, tokenAddress) {
        try {
            const tokenContract = new ethers.Contract(
                tokenAddress,
                ['function balanceOf(address owner) view returns (uint256)', 'function decimals() view returns (uint8)'],
                this.flareProvider
            );

            const [balance, decimals] = await Promise.all([
                tokenContract.balanceOf(userAddress),
                tokenContract.decimals()
            ]);

            return {
                balance: ethers.utils.formatUnits(balance, decimals),
                balanceRaw: balance.toString(),
                decimals,
                tokenAddress
            };

        } catch (error) {
            logger.error(`Error getting PROPX balance for ${tokenAddress}:`, error);
            throw error;
        }
    }

    // ============================================================================
    // MARKET DATA & ANALYTICS
    // ============================================================================

    async getPROPXMarketData() {
        try {
            const marketData = {};

            for (const [pairId, pair] of this.tradingPairs.entries()) {
                const priceData = await this.getPROPXPrice(pairId);
                const liquidity = await this.calculatePairLiquidity(pairId);
                
                marketData[pairId] = {
                    ...priceData,
                    liquidity,
                    volume24h: Math.random() * 100000, // Mock volume (integrate with subgraph in production)
                    change24h: (Math.random() - 0.5) * 0.2, // Mock change
                    high24h: priceData.price * (1 + Math.random() * 0.1),
                    low24h: priceData.price * (1 - Math.random() * 0.1)
                };
            }

            return marketData;

        } catch (error) {
            logger.error('Error getting PROPX market data:', error);
            throw error;
        }
    }

    async calculatePairLiquidity(pairId) {
        try {
            const pair = this.tradingPairs.get(pairId);
            const dex = this.dexContracts.get('BlazeDX');

            // Get pair address from factory
            const pairAddress = await dex.factory.getPair(pair.tokenA, pair.tokenB);
            
            if (pairAddress === ethers.constants.AddressZero) {
                return 0; // Pair doesn't exist
            }

            // Get reserves from pair contract
            const pairContract = new ethers.Contract(
                pairAddress,
                ['function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)'],
                this.flareProvider
            );

            const reserves = await pairContract.getReserves();
            const flrReserve = parseFloat(ethers.utils.formatEther(reserves[1]));
            
            // Return FLR liquidity (multiply by 2 for total USD value)
            return flrReserve * 2;

        } catch (error) {
            logger.warn(`Error calculating liquidity for ${pairId}:`, error.message);
            return 0;
        }
    }

    // ============================================================================
    // INTEGRATION WITH REAL-TIME SERVICE
    // ============================================================================

    startPROPXDataFeeds() {
        // Subscribe to real-time updates
        RealTimeMarketService.on('propx_event', (event) => {
            this.handlePROPXEvent(event);
        });

        // Start periodic price updates
        setInterval(async () => {
            try {
                const marketData = await this.getPROPXMarketData();
                for (const [pairId, data] of Object.entries(marketData)) {
                    RealTimeMarketService.emit('price_update', { pair: pairId, data });
                }
            } catch (error) {
                logger.error('Error updating PROPX price feeds:', error);
            }
        }, 10000); // Update every 10 seconds
    }

    handlePROPXEvent(event) {
        logger.info('PROPX event received:', event);
        
        // Process different types of PROPX events
        switch (event.type) {
            case 'TRADE':
                this.processPROPXTrade(event);
                break;
            case 'LIQUIDITY_ADD':
                this.processPROPXLiquidityChange(event);
                break;
            case 'TOKEN_MINT':
                this.processPROPXMint(event);
                break;
            default:
                logger.info('Unknown PROPX event type:', event.type);
        }
    }

    processPROPXTrade(event) {
        // Update trade history and price data
        const tradeData = {
            pairId: event.pairId,
            price: event.price,
            amount: event.amount,
            side: event.side,
            timestamp: event.timestamp,
            txHash: event.transactionHash
        };

        RealTimeMarketService.emit('trade_update', tradeData);
    }

    processPROPXLiquidityChange(event) {
        // Update liquidity metrics
        const liquidityData = {
            pairId: event.pairId,
            change: event.liquidityChange,
            newTotal: event.newLiquidity,
            timestamp: event.timestamp
        };

        RealTimeMarketService.emit('liquidity_update', liquidityData);
    }

    processPROPXMint(event) {
        // Handle new PROPX token creation
        logger.info('New PROPX token minted:', event);
        // Update trading pairs and market data
    }

    // ============================================================================
    // CLEANUP
    // ============================================================================

    async disconnect() {
        try {
            // Clear any intervals and clean up resources
            this.dexContracts.clear();
            this.liquidityPools.clear();
            this.tradingPairs.clear();
            
            logger.info('PROPX trading service disconnected');
        } catch (error) {
            logger.error('Error disconnecting PROPX trading service:', error);
        }
    }
}

module.exports = new PROPXTradingService();