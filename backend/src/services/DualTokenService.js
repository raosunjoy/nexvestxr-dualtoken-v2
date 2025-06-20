// ============================================================================
// DUAL TOKEN SERVICE - XERA (XRPL) + PROPX (FLARE) INTEGRATION
// ============================================================================

const xrpl = require('xrpl');
const { ethers } = require('ethers');
const config = require('../config/blockchainConfig.json');
const logger = require('../utils/logger');

class DualTokenService {
    constructor() {
        this.xrplClient = null;
        this.flareProvider = null;
        this.xeraContract = null;
        this.propxFactoryContract = null;
        this.crossChainBridge = null;
        this.isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID;
        
        if (!this.isTestEnvironment) {
            this.initializeClients();
        } else {
            this.initializeMockClients();
        }
    }

    async initializeClients() {
        try {
            // Initialize XRPL client for XERA
            this.xrplClient = new xrpl.Client(config.blockchain.xrpl.network);
            await this.xrplClient.connect();
            logger.info('XRPL client connected for XERA operations');

            // Initialize Flare provider for PROPX
            this.flareProvider = new ethers.JsonRpcProvider(config.blockchain.flare.rpcUrl);
            
            // Setup wallet for Flare operations
            const flareWallet = new ethers.Wallet(process.env.FLARE_PRIVATE_KEY, this.flareProvider);
            
            // Initialize contract instances
            this.xeraContract = new ethers.Contract(
                config.blockchain.flare.contracts.xeraToken,
                require('../contracts/XERAToken.json').abi,
                flareWallet
            );

            this.propxFactoryContract = new ethers.Contract(
                config.blockchain.flare.contracts.propxFactory,
                require('../contracts/PROPXTokenFactory.json').abi,
                flareWallet
            );

            logger.info('Flare Network clients initialized for PROPX operations');

        } catch (error) {
            logger.error('Failed to initialize dual token clients:', error);
            throw error;
        }
    }

    initializeMockClients() {
        // Mock XRPL client for testing
        this.xrplClient = {
            connect: () => Promise.resolve(true),
            disconnect: () => Promise.resolve(true),
            submitAndWait: () => Promise.resolve({
                result: {
                    TransactionResult: 'tesSUCCESS',
                    hash: 'mock_transaction_hash_' + Date.now()
                }
            }),
            isConnected: () => true,
            request: () => Promise.resolve({
                result: {
                    lines: []
                }
            })
        };

        // Mock contracts for testing
        this.xeraContract = {
            balanceOf: () => Promise.resolve('1000000000000000000000'), // 1000 ETH in wei string
            transfer: () => Promise.resolve({ hash: 'mock_transfer_hash' }),
            getDeveloperTier: () => Promise.resolve(1),
            getUserBenefits: () => Promise.resolve({
                tier: 'Platinum',
                votingPower: '100000000000000000000', // 100 ETH in wei string
                rewardMultiplier: 120
            })
        };

        this.propxFactoryContract = {
            propxTokenCount: () => Promise.resolve(5),
            getPROPXTokenInfo: (tokenId) => Promise.resolve({
                tokenAddress: `0x${'mock'.repeat(10)}${tokenId}`,
                propertyValue: '5000000000000000000000000', // 5M ETH in wei string
                cityCode: 'DXB',
                category: 1,
                developer: 'EMAAR',
                status: 1,
                totalSupply: '1000000000000000000000000', // 1M ETH in wei string
                availableSupply: '500000000000000000000000' // 500K ETH in wei string
            }),
            developers: () => Promise.resolve({
                isActive: true,
                brandCode: 'EMAAR',
                companyName: 'EMAAR Properties',
                tier: 1
            }),
            createPROPXToken: () => Promise.resolve({
                hash: 'mock_create_propx_hash',
                wait: () => Promise.resolve({
                    events: [{
                        event: 'PROPXTokenCreated',
                        args: {
                            tokenAddress: '0x' + 'mock'.repeat(10),
                            propertyId: 'PROP_' + Date.now()
                        }
                    }]
                })
            })
        };

        logger.info('Mock blockchain clients initialized for testing');
    }

    // ============================================================================
    // PROPERTY CLASSIFICATION SYSTEM
    // ============================================================================

    async classifyProperty(propertyData) {
        const {
            totalValue,
            location,
            category,
            developer,
            compliance
        } = propertyData;

        const classification = {
            eligibleForPROPX: false,
            tokenType: 'XERA',
            reasons: [],
            recommendations: [],
            tier: null
        };

        // Check property value threshold (₹5 Crore for PROPX)
        const propxValueThreshold = 50000000; // ₹5 Cr in INR
        const valueQualified = totalValue >= propxValueThreshold;

        // Check developer tier
        let developerTier = null;
        if (developer) {
            developerTier = await this.getDeveloperTier(developer);
        }

        // Check location tier
        const premiumCities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad'];
        const locationQualified = premiumCities.includes(location);

        // Check compliance score
        const complianceQualified = compliance && compliance.score >= 80;

        // Determine eligibility
        if (valueQualified && locationQualified && complianceQualified && 
            (developerTier === 'TIER1' || developerTier === 'TIER2')) {
            
            classification.eligibleForPROPX = true;
            classification.tokenType = 'PROPX';
            classification.tier = developerTier;
            classification.reasons.push('High-value property in premium location');
            classification.reasons.push(`Developer tier: ${developerTier}`);
            classification.reasons.push('Strong compliance rating');
        } else {
            classification.tokenType = 'XERA';
            
            if (!valueQualified) {
                classification.reasons.push(`Property value below ₹${propxValueThreshold/10000000} Cr threshold`);
                classification.recommendations.push('Consider pooling with other properties for XERA inclusion');
            }
            
            if (!locationQualified) {
                classification.reasons.push('Location not in premium tier');
                classification.recommendations.push('XERA provides broader geographic diversification');
            }
            
            if (!complianceQualified) {
                classification.reasons.push('Compliance score needs improvement');
                classification.recommendations.push('Complete additional documentation for PROPX eligibility');
            }
        }

        return classification;
    }

    async getDeveloperTier(developerAddress) {
        try {
            if (!this.propxFactoryContract) {
                return null;
            }

            const developerInfo = await this.propxFactoryContract.developers(developerAddress);
            return ['NONE', 'TIER2', 'TIER1'][developerInfo.tier] || 'NONE';
        } catch (error) {
            logger.error('Error getting developer tier:', error);
            return null;
        }
    }

    // ============================================================================
    // XERA TOKEN OPERATIONS (XRPL)
    // ============================================================================

    async createXERAProperty(propertyData, ownerAddress) {
        try {
            const {
                name,
                location,
                valuation,
                category,
                documents,
                cityCode
            } = propertyData;

            // Create property metadata object
            const propertyMetadata = {
                type: 'XERAProperty',
                name: name,
                location: location,
                valuation: valuation.toString(),
                category: category,
                cityCode: cityCode,
                owner: ownerAddress,
                createdAt: new Date().toISOString(),
                ipfsHash: documents.ipfsHash || ''
            };

            // Calculate XERA token allocation based on property value
            const tokenAllocation = await this.calculateXERAAllocation(valuation, category, cityCode);

            let transactionHash;

            if (this.isTestEnvironment) {
                // Mock transaction for testing
                transactionHash = `mock_xera_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            } else {
                // Create XRPL wallet from seed
                const issuerWallet = xrpl.Wallet.fromSeed(config.blockchain.xrpl.walletSeed);

                // Create XRPL memo with property data
                const memo = {
                    Memo: {
                        MemoType: Buffer.from('XERAProperty', 'utf8').toString('hex').toUpperCase(),
                        MemoData: Buffer.from(JSON.stringify(propertyMetadata), 'utf8').toString('hex').toUpperCase()
                    }
                };

                // Create trust line for property owner (if needed)
                const trustLineTx = {
                    TransactionType: 'TrustSet',
                    Account: ownerAddress,
                    LimitAmount: {
                        currency: 'XERA',
                        issuer: config.blockchain.xrpl.xeraIssuer,
                        value: tokenAllocation.toString()
                    },
                    Memos: [memo]
                };

                // Issue XERA tokens to property owner
                const paymentTx = {
                    TransactionType: 'Payment',
                    Account: config.blockchain.xrpl.xeraIssuer,
                    Destination: ownerAddress,
                    Amount: {
                        currency: 'XERA',
                        issuer: config.blockchain.xrpl.xeraIssuer,
                        value: tokenAllocation.toString()
                    },
                    Memos: [memo]
                };

                // Submit transactions
                const paymentResult = await this.submitXRPLTransaction(paymentTx, issuerWallet);
                transactionHash = paymentResult.result.hash;
            }

            return {
                success: true,
                tokenType: 'XERA',
                allocation: tokenAllocation,
                transactionHash: transactionHash,
                propertyId: `XERA-${cityCode}-${Date.now()}`,
                network: 'XRPL',
                metadata: propertyMetadata
            };

        } catch (error) {
            logger.error('Error creating XERA property:', error);
            throw error;
        }
    }

    async calculateXERAAllocation(propertyValue, category, cityCode) {
        // Base allocation formula
        let baseAllocation = propertyValue / 1000; // 1 XERA per ₹1000 property value

        // Category multipliers
        const categoryMultipliers = {
            'RESIDENTIAL': 1.0,
            'COMMERCIAL': 1.2,
            'MIXED_USE': 1.1,
            'LAND': 1.0,
            'INDUSTRIAL': 1.05
        };

        // City multipliers
        const cityMultipliers = {
            'MUM': 1.3, 'DEL': 1.3,  // Tier 1A
            'BANG': 1.2, 'CHEN': 1.2, 'HYD': 1.2,  // Tier 1B
            'PUN': 1.1, 'AHM': 1.1, 'KOL': 1.1     // Tier 1C
        };

        const categoryMultiplier = categoryMultipliers[category] || 1.0;
        const cityMultiplier = cityMultipliers[cityCode] || 1.0;

        return Math.floor(baseAllocation * categoryMultiplier * cityMultiplier);
    }

    async getXERAPortfolio(userAddress) {
        try {
            let xeraBalance, properties, metrics;

            if (this.isTestEnvironment) {
                // Mock data for testing
                xeraBalance = 1000;
                properties = [
                    {
                        id: 'PROP_001',
                        name: 'Dubai Marina Tower',
                        city: 'Dubai',
                        allocation: 500,
                        value: 50000
                    },
                    {
                        id: 'PROP_002', 
                        name: 'Abu Dhabi Plaza',
                        city: 'Abu Dhabi',
                        allocation: 300,
                        value: 30000
                    }
                ];
                metrics = {
                    totalValue: 80000,
                    yield: 8.5,
                    diversificationScore: 85
                };
            } else {
                // Get XERA balance from XRPL
                const response = await this.xrplClient.request({
                    command: 'account_lines',
                    account: userAddress,
                    ledger_index: 'validated'
                });

                const xeraLine = response.result.lines.find(line => 
                    line.currency === 'XERA' && 
                    line.account === config.blockchain.xrpl.xeraIssuer
                );

                xeraBalance = xeraLine ? parseFloat(xeraLine.balance) : 0;

                // Get property portfolio data
                properties = await this.getXERAProperties(userAddress);

                // Calculate portfolio metrics
                metrics = await this.calculateXERAMetrics(xeraBalance, properties);
            }

            return {
                tokenType: 'XERA',
                balance: xeraBalance,
                network: 'XRPL',
                properties: properties,
                metrics: metrics,
                benefits: await this.getXERABenefits(xeraBalance)
            };

        } catch (error) {
            logger.error('Error getting XERA portfolio:', error);
            throw error;
        }
    }

    async getXERABenefits(xeraBalance) {
        // Calculate tier-based benefits
        let tier = 'Bronze';
        let feeDiscount = 0;
        let stakingAPY = 6;
        let premiumAccess = false;

        if (xeraBalance >= 100000) {
            tier = 'Platinum';
            feeDiscount = 35;
            stakingAPY = 15;
            premiumAccess = true;
        } else if (xeraBalance >= 25000) {
            tier = 'Gold';
            feeDiscount = 25;
            stakingAPY = 12;
            premiumAccess = true;
        } else if (xeraBalance >= 5000) {
            tier = 'Silver';
            feeDiscount = 15;
            stakingAPY = 8;
        } else if (xeraBalance >= 1000) {
            tier = 'Bronze';
            feeDiscount = 10;
            stakingAPY = 6;
        }

        return {
            tier,
            feeDiscount,
            stakingAPY,
            premiumAccess,
            votingPower: Math.floor(xeraBalance / 100),
            features: [
                `${feeDiscount}% platform fee discount`,
                `${stakingAPY}% staking rewards`,
                premiumAccess ? 'Premium PROPX access' : 'Standard access',
                'Governance voting rights',
                'Cross-chain benefits'
            ]
        };
    }

    // ============================================================================
    // PROPX TOKEN OPERATIONS (FLARE NETWORK)
    // ============================================================================

    async createPROPXProperty(propertyData, developerAddress) {
        try {
            const {
                name,
                address,
                projectCode,
                cityCode,
                category,
                totalTokens,
                pricePerToken,
                minimumRaise,
                fundingPeriodDays,
                documents,
                expectedROI,
                completionMonths
            } = propertyData;

            let developerInfo, transactionHash, tokenContract, tokenId;

            if (this.isTestEnvironment) {
                // Mock developer info and transaction for testing
                developerInfo = {
                    isActive: true,
                    brandCode: 'EMAAR',
                    companyName: 'EMAAR Properties'
                };
                transactionHash = `mock_propx_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                tokenContract = '0x' + 'mock'.repeat(10) + Math.floor(Math.random() * 1000);
                tokenId = Math.floor(Math.random() * 1000).toString();
            } else {
                // Verify developer is registered and active
                developerInfo = await this.propxFactoryContract.developers(developerAddress);
                if (!developerInfo.isActive) {
                    throw new Error('Developer not active or registered');
                }

                // Create PROPX token
                const tx = await this.propxFactoryContract.createPROPXToken(
                    name,
                    address,
                    projectCode,
                    cityCode,
                    category,
                    ethers.utils.parseEther(totalTokens.toString()),
                    ethers.utils.parseEther(pricePerToken.toString()),
                    ethers.utils.parseEther(minimumRaise.toString()),
                    fundingPeriodDays,
                    documents.ipfsHash || '',
                    expectedROI,
                    completionMonths
                );

                const receipt = await tx.wait();
                const event = receipt.events?.find(e => e.event === 'PROPXTokenCreated');

                transactionHash = receipt.transactionHash;
                tokenContract = event?.args?.tokenContract;
                tokenId = event?.args?.tokenId?.toString();
            }

            return {
                success: true,
                tokenType: 'PROPX',
                tokenContract: tokenContract,
                tokenId: tokenId,
                projectCode: projectCode,
                transactionHash: transactionHash,
                network: 'Flare',
                symbol: `PROPX-${developerInfo.brandCode}-${projectCode}`
            };

        } catch (error) {
            logger.error('Error creating PROPX property:', error);
            throw error;
        }
    }

    async getPROPXMarketplace(filters = {}) {
        try {
            const {
                city,
                category,
                developer,
                status,
                sortBy,
                limit
            } = filters;

            let tokens = [];

            if (this.isTestEnvironment) {
                // Mock marketplace data for testing
                const mockTokens = [
                    {
                        id: 1,
                        tokenAddress: '0x' + 'mock'.repeat(10) + '1',
                        propertyValue: '5000000000000000000000000', // 5M ETH in wei string
                        cityCode: 'DXB',
                        category: 1,
                        developer: 'EMAAR',
                        status: 1,
                        totalSupply: '1000000000000000000000000', // 1M ETH in wei string
                        availableSupply: '500000000000000000000000', // 500K ETH in wei string
                        projectCode: 'BH001',
                        propertyName: 'Burj Heights Tower',
                        developerInfo: {
                            name: 'EMAAR Properties',
                            brandCode: 'EMAAR',
                            tier: 'TIER1'
                        },
                        fundingStatus: {
                            totalRaised: '2500000000000000000000000', // 2.5M ETH in wei string
                            targetAmount: '5000000000000000000000000', // 5M ETH in wei string
                            isActive: true
                        },
                        metrics: {
                            expectedYield: 850, // 8.5%
                            occupancyRate: 95,
                            pricePerToken: '5000000000000000000' // 5 ETH in wei string
                        },
                        symbol: 'PROPX-EMAAR-BH001'
                    },
                    {
                        id: 2,
                        tokenAddress: '0x' + 'mock'.repeat(10) + '2',
                        propertyValue: '8000000000000000000000000', // 8M ETH in wei string
                        cityCode: 'AUH',
                        category: 2,
                        developer: 'ALDAR',
                        status: 1,
                        totalSupply: '1600000000000000000000000', // 1.6M ETH in wei string
                        availableSupply: '800000000000000000000000', // 800K ETH in wei string
                        projectCode: 'SP002',
                        propertyName: 'Saadiyat Plaza',
                        developerInfo: {
                            name: 'ALDAR Properties',
                            brandCode: 'ALDAR',
                            tier: 'TIER1'
                        },
                        fundingStatus: {
                            totalRaised: '4000000000000000000000000', // 4M ETH in wei string
                            targetAmount: '8000000000000000000000000', // 8M ETH in wei string
                            isActive: true
                        },
                        metrics: {
                            expectedYield: 720, // 7.2%
                            occupancyRate: 92,
                            pricePerToken: '5000000000000000000' // 5 ETH in wei string
                        },
                        symbol: 'PROPX-ALDAR-SP002'
                    }
                ];

                // Apply filters to mock data
                tokens = mockTokens.filter(token => {
                    if (city && city !== 'ALL' && token.cityCode !== city) return false;
                    if (category && category !== 'ALL' && token.category !== category) return false;
                    if (developer && developer !== 'ALL' && token.developer !== developer) return false;
                    if (status && status !== 'ALL' && token.status !== status) return false;
                    return true;
                });
            } else {
                // Get total token count
                const tokenCount = await this.propxFactoryContract.propxTokenCount();

                for (let i = 1; i <= Number(tokenCount); i++) {
                    const tokenInfo = await this.propxFactoryContract.getPROPXTokenInfo(i);
                    
                    // Apply filters
                    if (city && city !== 'ALL' && tokenInfo.cityCode !== city) continue;
                    if (category && category !== 'ALL' && tokenInfo.category !== category) continue;
                    if (developer && developer !== 'ALL' && tokenInfo.developer !== developer) continue;
                    if (status && status !== 'ALL' && tokenInfo.status !== status) continue;

                    // Get additional token data
                    const tokenContract = new ethers.Contract(
                        tokenInfo.tokenContract,
                        require('../contracts/PROPXToken.json').abi,
                        this.flareProvider
                    );

                    const [fundingStatus, metrics] = await Promise.all([
                        tokenContract.getFundingStatus(),
                        tokenContract.getInvestmentMetrics()
                    ]);

                    const developerInfo = await this.propxFactoryContract.developers(tokenInfo.developer);

                    tokens.push({
                        id: i,
                        ...tokenInfo,
                        developerInfo: {
                            name: developerInfo.companyName,
                            brandCode: developerInfo.brandCode,
                            tier: ['NONE', 'TIER2', 'TIER1'][developerInfo.tier]
                        },
                        fundingStatus,
                        metrics,
                        symbol: `PROPX-${developerInfo.brandCode}-${tokenInfo.projectCode}`
                    });
                }
            }

            // Sort tokens
            if (sortBy === 'funding') {
                tokens.sort((a, b) => b.fundingStatus.raised - a.fundingStatus.raised);
            } else if (sortBy === 'yield') {
                tokens.sort((a, b) => b.metrics.currentYield - a.metrics.currentYield);
            } else if (sortBy === 'recent') {
                tokens.sort((a, b) => b.createdAt - a.createdAt);
            }

            return {
                tokens: limit ? tokens.slice(0, limit) : tokens,
                totalCount: tokens.length,
                filters: filters
            };

        } catch (error) {
            logger.error('Error getting PROPX marketplace:', error);
            throw error;
        }
    }

    async investInPROPX(tokenAddress, investorAddress, tokenAmount, isInstitutional = false) {
        try {
            const tokenContract = new ethers.Contract(
                tokenAddress,
                require('../contracts/PROPXToken.json').abi,
                this.flareProvider
            );

            // Get token price
            const pricePerToken = await tokenContract.pricePerToken();
            const totalCost = BigInt(pricePerToken) * BigInt(tokenAmount);

            // Create transaction
            const tx = isInstitutional ? 
                await tokenContract.buyTokensInstitutional(tokenAmount, [], { value: totalCost }) :
                await tokenContract.buyTokens(tokenAmount, { value: totalCost });

            const receipt = await tx.wait();

            return {
                success: true,
                transactionHash: receipt.transactionHash,
                tokenAmount: tokenAmount.toString(),
                totalCost: ethers.utils.formatEther(totalCost),
                network: 'Flare'
            };

        } catch (error) {
            logger.error('Error investing in PROPX:', error);
            throw error;
        }
    }

    // ============================================================================
    // CROSS-CHAIN PORTFOLIO MANAGEMENT
    // ============================================================================

    async getUserPortfolio(userAddress) {
        try {
            // Get XERA portfolio from XRPL
            const xeraPortfolio = await this.getXERAPortfolio(userAddress);

            // Get PROPX portfolio from Flare
            const propxPortfolio = await this.getPROPXPortfolio(userAddress);

            // Calculate combined metrics
            const combinedMetrics = this.calculateCombinedMetrics(xeraPortfolio, propxPortfolio);

            // Get cross-chain benefits
            const crossChainBenefits = await this.getCrossChainBenefits(userAddress, xeraPortfolio.balance);

            return {
                user: userAddress,
                timestamp: new Date().toISOString(),
                xera: xeraPortfolio,
                propx: propxPortfolio,
                combined: combinedMetrics,
                crossChainBenefits: crossChainBenefits,
                totalValue: combinedMetrics.totalValue,
                diversificationScore: combinedMetrics.diversificationScore
            };

        } catch (error) {
            logger.error('Error getting user portfolio:', error);
            throw error;
        }
    }

    async getPROPXPortfolio(userAddress) {
        try {
            // This would require indexing PROPX token holdings
            // For now, return mock data structure
            return {
                tokenType: 'PROPX',
                network: 'Flare',
                holdings: [],
                totalValue: 0,
                monthlyDividends: 0,
                averageYield: 0
            };
        } catch (error) {
            logger.error('Error getting PROPX portfolio:', error);
            throw error;
        }
    }

    calculateCombinedMetrics(xeraPortfolio, propxPortfolio) {
        const totalValue = xeraPortfolio.metrics.totalValue + propxPortfolio.totalValue;
        const xeraWeight = xeraPortfolio.metrics.totalValue / totalValue;
        const propxWeight = propxPortfolio.totalValue / totalValue;

        return {
            totalValue,
            distribution: {
                xera: xeraWeight,
                propx: propxWeight
            },
            averageYield: (xeraPortfolio.metrics.yield * xeraWeight) + (propxPortfolio.averageYield * propxWeight),
            diversificationScore: Math.min(100, (xeraPortfolio.metrics.diversificationScore + 50) * (propxWeight > 0 ? 1.2 : 1.0)),
            riskScore: this.calculateRiskScore(xeraWeight, propxWeight)
        };
    }

    calculateRiskScore(xeraWeight, propxWeight) {
        // XERA is lower risk (diversified), PROPX is higher risk (concentrated)
        const xeraRisk = 30; // Low risk due to diversification
        const propxRisk = 70; // Higher risk due to individual properties
        
        return (xeraRisk * xeraWeight) + (propxRisk * propxWeight);
    }

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================

    async submitXRPLTransaction(transaction, wallet) {
        try {
            const prepared = await this.xrplClient.autofill(transaction);
            const signed = wallet.sign(prepared);
            const result = await this.xrplClient.submitAndWait(signed.tx_blob);
            
            if (result.result.meta.TransactionResult !== 'tesSUCCESS') {
                throw new Error(`XRPL transaction failed: ${result.result.meta.TransactionResult}`);
            }
            
            return result;
        } catch (error) {
            logger.error('XRPL transaction failed:', error);
            throw error;
        }
    }

    async getXERAProperties(userAddress) {
        // This would query XRPL for properties associated with the user
        // For now, return mock data
        return [];
    }

    async calculateXERAMetrics(balance, properties) {
        return {
            totalValue: balance * 1000, // Assuming 1 XERA = ₹1000
            yield: 8.5,
            diversificationScore: Math.min(100, properties.length * 10),
            riskScore: Math.max(10, 50 - properties.length * 5)
        };
    }

    async getCrossChainBenefits(userAddress, xeraBalance) {
        const benefits = await this.getXERABenefits(xeraBalance);
        
        return {
            ...benefits,
            crossChainFeatures: [
                'Unified portfolio tracking',
                'Cross-chain fee discounts',
                'Aggregated governance voting',
                'Combined analytics dashboard'
            ],
            eligibleForPROPX: benefits.premiumAccess
        };
    }

    // Cleanup
    async disconnect() {
        try {
            if (this.xrplClient && this.xrplClient.isConnected()) {
                await this.xrplClient.disconnect();
            }
        } catch (error) {
            logger.error('Error disconnecting clients:', error);
        }
    }
}

module.exports = DualTokenService;