// ============================================================================
// DUAL TOKEN API ROUTES - XERA (XRPL) + PROPX (FLARE)
// ============================================================================

const express = require('express');
const router = express.Router();
const DualTokenService = require('../services/DualTokenService');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

// Initialize dual token service
const dualTokenService = new DualTokenService();

// ============================================================================
// PROPERTY CLASSIFICATION
// ============================================================================

// Classify property for XERA or PROPX
router.post('/classify-property', authenticateToken, async (req, res) => {
    try {
        const {
            totalValue,
            location,
            category,
            developer,
            compliance,
            documents
        } = req.body;

        const propertyData = {
            totalValue: parseFloat(totalValue),
            location,
            category,
            developer,
            compliance: {
                score: parseFloat(compliance?.score || 0),
                documents: compliance?.documents || []
            }
        };

        const classification = await dualTokenService.classifyProperty(propertyData);

        res.json({
            success: true,
            data: {
                classification,
                timestamp: new Date().toISOString(),
                recommendations: classification.recommendations
            }
        });

    } catch (error) {
        logger.error('Property classification error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to classify property',
            details: error.message
        });
    }
});

// Get property classification criteria
router.get('/classification-criteria', async (req, res) => {
    try {
        const criteria = {
            propx: {
                minValue: 50000000, // ₹5 Crore
                premiumCities: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad'],
                requiredCompliance: 80,
                developerTiers: ['TIER1', 'TIER2'],
                categories: ['RESIDENTIAL', 'COMMERCIAL', 'LUXURY', 'MIXED_USE']
            },
            xera: {
                minValue: 5000000, // ₹50 Lakh
                allCities: true,
                requiredCompliance: 60,
                categories: ['RESIDENTIAL', 'COMMERCIAL', 'MIXED_USE', 'LAND', 'INDUSTRIAL']
            }
        };

        res.json({
            success: true,
            data: criteria
        });

    } catch (error) {
        logger.error('Error getting classification criteria:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get classification criteria'
        });
    }
});

// ============================================================================
// XERA TOKEN OPERATIONS (XRPL)
// ============================================================================

// Create XERA property on XRPL
router.post('/xera/create-property', authenticateToken, async (req, res) => {
    try {
        const {
            name,
            location,
            valuation,
            category,
            documents,
            cityCode
        } = req.body;

        const propertyData = {
            name,
            location,
            valuation: parseFloat(valuation),
            category,
            documents,
            cityCode
        };

        const result = await dualTokenService.createXERAProperty(propertyData, req.user.xrplAddress);

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        logger.error('XERA property creation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create XERA property',
            details: error.message
        });
    }
});

// Get XERA portfolio
router.get('/xera/portfolio/:address', authenticateToken, async (req, res) => {
    try {
        const { address } = req.params;
        
        // Verify user owns this address or is admin
        if (address !== req.user.xrplAddress && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        const portfolio = await dualTokenService.getXERAPortfolio(address);

        res.json({
            success: true,
            data: portfolio
        });

    } catch (error) {
        logger.error('XERA portfolio error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get XERA portfolio',
            details: error.message
        });
    }
});

// Get XERA benefits for user
router.get('/xera/benefits/:address', authenticateToken, async (req, res) => {
    try {
        const { address } = req.params;
        const portfolio = await dualTokenService.getXERAPortfolio(address);
        const benefits = await dualTokenService.getXERABenefits(portfolio.balance);

        res.json({
            success: true,
            data: {
                address,
                xeraBalance: portfolio.balance,
                benefits,
                lastUpdated: new Date().toISOString()
            }
        });

    } catch (error) {
        logger.error('XERA benefits error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get XERA benefits'
        });
    }
});

// Get XERA city pools
router.get('/xera/city-pools', async (req, res) => {
    try {
        const { city } = req.query;
        
        // Mock city pool data - in production, this would query XRPL
        const cityPools = {
            'MUM': {
                name: 'Mumbai Diversified Pool',
                totalValue: '₹125 Cr',
                properties: 45,
                averageYield: '9.2%',
                categories: ['RESIDENTIAL', 'COMMERCIAL', 'LUXURY']
            },
            'BANG': {
                name: 'Bangalore Tech Hub Pool',
                totalValue: '₹98 Cr',
                properties: 38,
                averageYield: '10.1%',
                categories: ['COMMERCIAL', 'MIXED_USE', 'RESIDENTIAL']
            },
            'DEL': {
                name: 'Delhi NCR Premium Pool',
                totalValue: '₹156 Cr',
                properties: 42,
                averageYield: '8.8%',
                categories: ['LUXURY', 'COMMERCIAL', 'RESIDENTIAL']
            }
        };

        const result = city ? { [city]: cityPools[city] } : cityPools;

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        logger.error('XERA city pools error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get XERA city pools'
        });
    }
});

// ============================================================================
// PROPX TOKEN OPERATIONS (FLARE)
// ============================================================================

// Create PROPX property on Flare
router.post('/propx/create-property', authenticateToken, async (req, res) => {
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
        } = req.body;

        const propertyData = {
            name,
            address,
            projectCode,
            cityCode,
            category: parseInt(category),
            totalTokens: parseFloat(totalTokens),
            pricePerToken: parseFloat(pricePerToken),
            minimumRaise: parseFloat(minimumRaise),
            fundingPeriodDays: parseInt(fundingPeriodDays),
            documents,
            expectedROI: parseInt(expectedROI),
            completionMonths: parseInt(completionMonths)
        };

        const result = await dualTokenService.createPROPXProperty(propertyData, req.user.flareAddress);

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        logger.error('PROPX property creation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create PROPX property',
            details: error.message
        });
    }
});

// Get PROPX marketplace
router.get('/propx/marketplace', async (req, res) => {
    try {
        const {
            city,
            category,
            developer,
            status,
            sortBy,
            limit,
            offset
        } = req.query;

        const filters = {
            city,
            category: category ? parseInt(category) : undefined,
            developer,
            status: status ? parseInt(status) : undefined,
            sortBy,
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : 0
        };

        const marketplace = await dualTokenService.getPROPXMarketplace(filters);

        res.json({
            success: true,
            data: marketplace
        });

    } catch (error) {
        logger.error('PROPX marketplace error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get PROPX marketplace',
            details: error.message
        });
    }
});

// Invest in PROPX token
router.post('/propx/invest', authenticateToken, async (req, res) => {
    try {
        const {
            tokenAddress,
            tokenAmount,
            isInstitutional = false
        } = req.body;

        const result = await dualTokenService.investInPROPX(
            tokenAddress,
            req.user.flareAddress,
            ethers.utils.parseEther(tokenAmount.toString()),
            isInstitutional
        );

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        logger.error('PROPX investment error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to invest in PROPX',
            details: error.message
        });
    }
});

// ============================================================================
// CROSS-CHAIN PORTFOLIO
// ============================================================================

// Get combined user portfolio
router.get('/portfolio/:address', authenticateToken, async (req, res) => {
    try {
        const { address } = req.params;
        
        // For demo, we'll use the same address for both chains
        // In production, users would link their XRPL and Flare addresses
        const portfolio = await dualTokenService.getUserPortfolio(address);

        res.json({
            success: true,
            data: portfolio
        });

    } catch (error) {
        logger.error('Portfolio error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user portfolio',
            details: error.message
        });
    }
});

// Get cross-chain benefits
router.get('/cross-chain-benefits/:address', authenticateToken, async (req, res) => {
    try {
        const { address } = req.params;
        
        // Get XERA balance for cross-chain benefits
        const xeraPortfolio = await dualTokenService.getXERAPortfolio(address);
        const benefits = await dualTokenService.getCrossChainBenefits(address, xeraPortfolio.balance);

        res.json({
            success: true,
            data: {
                address,
                benefits,
                xeraBalance: xeraPortfolio.balance,
                lastUpdated: new Date().toISOString()
            }
        });

    } catch (error) {
        logger.error('Cross-chain benefits error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get cross-chain benefits'
        });
    }
});

// ============================================================================
// ANALYTICS AND REPORTING
// ============================================================================

// Get dual token platform analytics
router.get('/analytics/platform', async (req, res) => {
    try {
        // Mock platform analytics - in production, this would aggregate real data
        const analytics = {
            xera: {
                totalSupply: '15,000,000',
                circulatingSupply: '12,500,000',
                totalValueLocked: '₹1,250 Cr',
                activeProperties: 485,
                cityPools: 12,
                averageYield: '8.7%',
                stakingParticipation: '35%'
            },
            propx: {
                totalTokens: 8,
                activeTokens: 5,
                fundedTokens: 3,
                totalValueLocked: '₹456 Cr',
                averageFunding: '₹152 Cr',
                successRate: '87%',
                averageYield: '11.2%'
            },
            crossChain: {
                totalUsers: 2847,
                crossChainUsers: 1523,
                totalPortfolioValue: '₹1,706 Cr',
                averagePortfolioSize: '₹12.3 L',
                diversificationScore: 78
            }
        };

        res.json({
            success: true,
            data: analytics,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Platform analytics error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get platform analytics'
        });
    }
});

// Get market data
router.get('/analytics/market', async (req, res) => {
    try {
        const marketData = {
            xeraPrice: {
                current: '₹1,247',
                change24h: '+2.3%',
                volume24h: '₹45.6 L',
                marketCap: '₹156 Cr'
            },
            propxMarket: {
                averageTokenPrice: '₹625',
                totalMarketCap: '₹456 Cr',
                activeTrading: 5,
                avgDailyVolume: '₹12.3 L'
            },
            trends: {
                topPerformingCity: 'Bangalore (+15.2%)',
                topPerformingCategory: 'Commercial (+8.7%)',
                mostActiveProperty: 'PROPX-PRESTIGE-TECH002',
                userGrowth: '+23.4% (30 days)'
            }
        };

        res.json({
            success: true,
            data: marketData,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Market data error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get market data'
        });
    }
});

// ============================================================================
// DEVELOPER TOOLS
// ============================================================================

// Register as developer
router.post('/developer/register', authenticateToken, async (req, res) => {
    try {
        const {
            companyName,
            brandCode,
            primaryCities,
            projectsDelivered,
            totalValueDelivered,
            verificationDocuments
        } = req.body;

        // This would integrate with the PROPX factory contract
        // For now, return success with pending status
        res.json({
            success: true,
            data: {
                status: 'pending',
                message: 'Developer registration submitted for approval',
                estimatedApprovalTime: '3-5 business days',
                nextSteps: [
                    'KYC verification',
                    'Document validation',
                    'Admin approval',
                    'Tier assignment'
                ]
            }
        });

    } catch (error) {
        logger.error('Developer registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to register developer'
        });
    }
});

// Get developer dashboard
router.get('/developer/dashboard/:address', authenticateToken, async (req, res) => {
    try {
        const { address } = req.params;
        
        const portfolio = await dualTokenService.propxFactoryContract.getDeveloperPortfolio(address);
        
        res.json({
            success: true,
            data: {
                developer: address,
                portfolio,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        logger.error('Developer dashboard error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get developer dashboard'
        });
    }
});

module.exports = router;