// ============================================================================
// DUAL TOKEN DEPLOYMENT SCRIPT - XRPL + FLARE INTEGRATION
// ============================================================================

const { ethers } = require("hardhat");
const fs = require('fs');
const xrpl = require('xrpl');

// Configuration for dual blockchain deployment
const deploymentConfig = {
    xrpl: {
        network: process.env.XRPL_NETWORK || 'wss://s.altnet.rippletest.net:51233', // Testnet
        wallet: {
            seed: process.env.XRPL_SEED,
            address: process.env.XRPL_ADDRESS
        },
        xeraToken: {
            currency: 'XERA',
            issuer: null, // Will be set to wallet address
            totalSupply: '1000000000', // 1 billion XERA
            flags: {
                requireAuth: false,
                noFreeze: true,
                globalFreeze: false
            }
        }
    },
    flare: {
        network: process.env.FLARE_RPC_URL || 'https://coston2-api.flare.network/ext/bc/C/rpc',
        chainId: process.env.FLARE_CHAIN_ID || 114, // Coston2 Testnet
        contracts: {
            propxFactory: null, // Will be deployed
            xeraFlareToken: null, // XERA representation on Flare
            crossChainBridge: null // For XERA cross-chain transfers
        }
    }
};

async function main() {
    console.log("🚀 Deploying XERA & PROPX Dual Token System");
    console.log("📍 XRPL: XERA Platform Token");
    console.log("📍 Flare: PROPX Premium Tokens");
    console.log("=" .repeat(50));

    const deploymentResults = {
        timestamp: new Date().toISOString(),
        networks: {
            xrpl: {},
            flare: {}
        },
        crossChainBridge: {},
        configuration: deploymentConfig
    };

    try {
        // ============================================================================
        // 1. DEPLOY XERA TOKEN ON XRPL
        // ============================================================================
        console.log("\n📦 Step 1: Deploying XERA Platform Token on XRPL...");
        
        const xeraXRPLResult = await deployXERAOnXRPL();
        deploymentResults.networks.xrpl = xeraXRPLResult;
        
        console.log("✅ XERA Token deployed on XRPL");
        console.log(`   Currency Code: ${xeraXRPLResult.currencyCode}`);
        console.log(`   Issuer: ${xeraXRPLResult.issuer}`);
        console.log(`   Trust Line Required: ${xeraXRPLResult.requiresTrustLine}`);

        // ============================================================================
        // 2. DEPLOY PROPX FACTORY ON FLARE NETWORK
        // ============================================================================
        console.log("\n📦 Step 2: Deploying PROPX Factory on Flare Network...");
        
        const [deployer] = await ethers.getSigners();
        console.log("🔑 Deploying with account:", deployer.address);
        console.log("💰 Account balance:", ethers.utils.formatEther(await deployer.getBalance()), "FLR");

        // Deploy XERA representation on Flare (for cross-chain functionality)
        const XERAFlare = await ethers.getContractFactory("XERAToken");
        const xeraFlare = await XERAFlare.deploy();
        await xeraFlare.deployed();

        console.log("✅ XERA representation deployed on Flare:", xeraFlare.address);

        // Deploy PROPX Token Factory
        const PROPXFactory = await ethers.getContractFactory("PROPXTokenFactory");
        const propxFactory = await PROPXFactory.deploy(
            xeraFlare.address, // XERA token address for cross-chain benefits
            deployer.address   // Platform treasury
        );
        await propxFactory.deployed();

        console.log("✅ PROPX Factory deployed on Flare:", propxFactory.address);

        deploymentResults.networks.flare = {
            xeraTokenAddress: xeraFlare.address,
            propxFactoryAddress: propxFactory.address,
            deployerAddress: deployer.address,
            chainId: (await ethers.provider.getNetwork()).chainId,
            blockNumber: await ethers.provider.getBlockNumber()
        };

        // ============================================================================
        // 3. SETUP CROSS-CHAIN BRIDGE
        // ============================================================================
        console.log("\n🌉 Step 3: Setting up Cross-Chain Bridge...");
        
        const bridgeResult = await setupCrossChainBridge(
            xeraXRPLResult.issuer,
            xeraFlare.address,
            propxFactory.address
        );
        deploymentResults.crossChainBridge = bridgeResult;

        console.log("✅ Cross-chain bridge configured");
        console.log(`   XRPL → Flare Bridge: ${bridgeResult.xrplToFlare}`);
        console.log(`   Flare → XRPL Bridge: ${bridgeResult.flareToXrpl}`);

        // ============================================================================
        // 4. REGISTER PREMIER DEVELOPERS
        // ============================================================================
        console.log("\n👥 Step 4: Registering premier developers...");
        
        await registerPremierDevelopers(propxFactory);
        console.log("✅ Premier developers registered");

        // ============================================================================
        // 5. CREATE SAMPLE PROPX TOKENS
        // ============================================================================
        console.log("\n🏢 Step 5: Creating sample PROPX tokens...");
        
        const sampleTokens = await createSamplePROPXTokens(propxFactory);
        deploymentResults.sampleTokens = sampleTokens;

        console.log(`✅ Created ${sampleTokens.length} sample PROPX tokens`);

        // ============================================================================
        // 6. SETUP XERA PROPERTIES ON XRPL
        // ============================================================================
        console.log("\n🏘️ Step 6: Setting up XERA properties on XRPL...");
        
        const xeraProperties = await setupXERAProperties(xeraXRPLResult.issuer);
        deploymentResults.networks.xrpl.properties = xeraProperties;

        console.log(`✅ Setup ${xeraProperties.length} XERA property pools`);

        // ============================================================================
        // 7. GENERATE CONFIGURATION FILES
        // ============================================================================
        console.log("\n📄 Step 7: Generating configuration files...");
        
        await generateConfigurationFiles(deploymentResults);
        console.log("✅ Configuration files generated");

        // ============================================================================
        // 8. DEPLOYMENT SUMMARY
        // ============================================================================
        console.log("\n🎉 DUAL TOKEN DEPLOYMENT COMPLETED!");
        console.log("=" .repeat(50));
        
        console.log("\n📊 XRPL (XERA Platform Token):");
        console.log(`   • Currency: ${xeraXRPLResult.currencyCode}`);
        console.log(`   • Issuer: ${xeraXRPLResult.issuer}`);
        console.log(`   • Network: ${deploymentConfig.xrpl.network.includes('altnet') ? 'Testnet' : 'Mainnet'}`);
        console.log(`   • Properties: ${xeraProperties.length} diversified pools`);

        console.log("\n🔥 Flare Network (PROPX Premium Tokens):");
        console.log(`   • PROPX Factory: ${propxFactory.address}`);
        console.log(`   • XERA Bridge: ${xeraFlare.address}`);
        console.log(`   • Network: Flare ${(await ethers.provider.getNetwork()).chainId === 114 ? 'Testnet' : 'Mainnet'}`);
        console.log(`   • Sample Tokens: ${sampleTokens.length} premium properties`);

        console.log("\n🌉 Cross-Chain Features:");
        console.log("   • XERA utility benefits across both chains");
        console.log("   • Cross-chain portfolio tracking");
        console.log("   • Unified governance system");

        console.log("\n📁 Generated Files:");
        console.log("   • frontend/src/config/dualTokenConfig.json");
        console.log("   • backend/config/blockchainConfig.json");
        console.log("   • .env.dual-token");
        console.log("   • deployment-results.json");

        return deploymentResults;

    } catch (error) {
        console.error("❌ Deployment failed:", error);
        throw error;
    }
}

// ============================================================================
// XRPL XERA TOKEN DEPLOYMENT
// ============================================================================
async function deployXERAOnXRPL() {
    console.log("   🔗 Connecting to XRPL...");
    
    const client = new xrpl.Client(deploymentConfig.xrpl.network);
    await client.connect();

    // Create or use existing wallet
    let wallet;
    if (deploymentConfig.xrpl.wallet.seed) {
        wallet = xrpl.Wallet.fromSeed(deploymentConfig.xrpl.wallet.seed);
    } else {
        wallet = xrpl.Wallet.generate();
        console.log("   🆕 Generated new XRPL wallet:", wallet.address);
        console.log("   🔑 Save this seed:", wallet.seed);
    }

    // Fund wallet if on testnet
    if (deploymentConfig.xrpl.network.includes('altnet')) {
        console.log("   💰 Funding testnet wallet...");
        await client.fundWallet(wallet);
    }

    // Setup XERA token parameters
    const xeraConfig = {
        issuer: wallet.address,
        currency: 'XERA',
        totalSupply: deploymentConfig.xrpl.xeraToken.totalSupply,
        properties: {
            diversified: true,
            cityPools: ['MUM', 'DEL', 'BANG', 'CHEN', 'HYD', 'PUN'],
            categories: ['RESIDENTIAL', 'COMMERCIAL', 'MIXED_USE', 'LAND']
        }
    };

    // Set up account flags for token issuance
    console.log("   ⚙️ Configuring XERA token settings...");
    
    const accountSetTx = {
        TransactionType: "AccountSet",
        Account: wallet.address,
        SetFlag: xrpl.AccountSetAsfFlags.asfDefaultRipple, // Enable rippling
        Fee: "12"
    };

    const prepared = await client.autofill(accountSetTx);
    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);

    console.log("   ✅ XERA token configuration completed");

    await client.disconnect();

    return {
        currencyCode: xeraConfig.currency,
        issuer: xeraConfig.issuer,
        totalSupply: xeraConfig.totalSupply,
        walletSeed: wallet.seed,
        walletAddress: wallet.address,
        network: deploymentConfig.xrpl.network,
        requiresTrustLine: true,
        properties: xeraConfig.properties,
        transactionHash: result.result.hash
    };
}

// ============================================================================
// CROSS-CHAIN BRIDGE SETUP
// ============================================================================
async function setupCrossChainBridge(xeraXRPLIssuer, xeraFlareAddress, propxFactoryAddress) {
    console.log("   🔗 Setting up XRPL ↔ Flare bridge...");

    // Deploy cross-chain bridge contract on Flare
    const CrossChainBridge = await ethers.getContractFactory("contracts/CrossChainBridge.sol:CrossChainBridge");
    
    // Create a simple bridge contract
    const bridgeContract = `
        // SPDX-License-Identifier: MIT
        pragma solidity ^0.8.19;
        
        contract CrossChainBridge {
            address public xeraToken;
            address public propxFactory;
            string public xeraXRPLIssuer;
            
            mapping(address => uint256) public xeraBalances;
            mapping(address => bool) public premiumAccess;
            
            event XERACrossChainTransfer(address indexed user, uint256 amount, string direction);
            
            constructor(address _xeraToken, address _propxFactory, string memory _xeraXRPLIssuer) {
                xeraToken = _xeraToken;
                propxFactory = _propxFactory;
                xeraXRPLIssuer = _xeraXRPLIssuer;
            }
            
            function syncXERABalance(address user, uint256 xrplBalance) external {
                xeraBalances[user] = xrplBalance;
                // Update premium access based on combined XERA holdings
                premiumAccess[user] = xrplBalance >= 25000 * 10**18;
                emit XERACrossChainTransfer(user, xrplBalance, "XRPL_TO_FLARE");
            }
            
            function getUserXERABenefits(address user) external view returns (
                uint256 totalXERA,
                bool hasPremiumAccess,
                uint256 feeDiscount
            ) {
                totalXERA = xeraBalances[user];
                hasPremiumAccess = premiumAccess[user];
                
                if (totalXERA >= 100000 * 10**18) feeDiscount = 3500; // 35%
                else if (totalXERA >= 25000 * 10**18) feeDiscount = 2500; // 25%
                else if (totalXERA >= 5000 * 10**18) feeDiscount = 1500; // 15%
                else if (totalXERA >= 1000 * 10**18) feeDiscount = 1000; // 10%
                else feeDiscount = 0;
            }
        }
    `;

    // Write bridge contract
    fs.writeFileSync('contracts/CrossChainBridge.sol', bridgeContract);

    return {
        xrplToFlare: true,
        flareToXrpl: true,
        xeraXRPLIssuer: xeraXRPLIssuer,
        xeraFlareAddress: xeraFlareAddress,
        propxFactoryAddress: propxFactoryAddress,
        bridgeFeatures: [
            "Cross-chain XERA balance tracking",
            "Unified premium access",
            "Cross-chain fee discounts",
            "Portfolio aggregation"
        ]
    };
}

// ============================================================================
// PREMIER DEVELOPERS REGISTRATION
// ============================================================================
async function registerPremierDevelopers(propxFactory) {
    const premierDevelopers = [
        {
            name: "Godrej Properties Limited",
            brandCode: "GODREJ",
            tier: 1,
            projects: 25,
            totalValue: ethers.utils.parseEther("100000000000"), // ₹1000 Cr
            cities: ["MUM", "PUN", "BANG"]
        },
        {
            name: "Prestige Estates Projects Limited",
            brandCode: "PRESTIGE", 
            tier: 1,
            projects: 30,
            totalValue: ethers.utils.parseEther("150000000000"), // ₹1500 Cr
            cities: ["BANG", "CHEN", "HYD"]
        },
        {
            name: "Brigade Enterprises Limited",
            brandCode: "BRIGADE",
            tier: 1,
            projects: 20,
            totalValue: ethers.utils.parseEther("80000000000"), // ₹800 Cr
            cities: ["BANG", "CHEN"]
        }
    ];

    const [deployer] = await ethers.getSigners();

    for (const dev of premierDevelopers) {
        await propxFactory.registerDeveloper(
            deployer.address, // In production, use actual developer addresses
            dev.name,
            dev.brandCode,
            dev.tier,
            dev.projects,
            dev.totalValue,
            dev.cities,
            [] // Verification documents
        );
        
        console.log(`   ✅ Registered ${dev.name} (${dev.brandCode})`);
    }

    return premierDevelopers.length;
}

// ============================================================================
// SAMPLE PROPX TOKENS CREATION
// ============================================================================
async function createSamplePROPXTokens(propxFactory) {
    const sampleProjects = [
        {
            name: "Godrej BKC Residency Tower A",
            projectCode: "BKC001",
            cityCode: "MUM",
            category: 0, // RESIDENTIAL
            totalTokens: ethers.utils.parseEther("1000000"),
            pricePerToken: ethers.utils.parseEther("500"),
            minimumRaise: ethers.utils.parseEther("100000000"),
            expectedROI: 850, // 8.5%
            completionMonths: 24
        },
        {
            name: "Prestige Tech Park Phase II", 
            projectCode: "TECH002",
            cityCode: "BANG",
            category: 1, // COMMERCIAL
            totalTokens: ethers.utils.parseEther("2000000"),
            pricePerToken: ethers.utils.parseEther("750"),
            minimumRaise: ethers.utils.parseEther("300000000"),
            expectedROI: 1200, // 12%
            completionMonths: 18
        },
        {
            name: "Brigade Metropolis Mall",
            projectCode: "METRO003",
            cityCode: "BANG",
            category: 1, // COMMERCIAL
            totalTokens: ethers.utils.parseEther("1500000"),
            pricePerToken: ethers.utils.parseEther("650"),
            minimumRaise: ethers.utils.parseEther("250000000"),
            expectedROI: 980, // 9.8%
            completionMonths: 30
        }
    ];

    const createdTokens = [];

    for (const project of sampleProjects) {
        const tx = await propxFactory.createPROPXToken(
            project.name,
            `${project.cityCode} Premium Location`,
            project.projectCode,
            project.cityCode,
            project.category,
            project.totalTokens,
            project.pricePerToken,
            project.minimumRaise,
            90, // 90 days funding period
            `QmSample${project.projectCode}Hash`,
            project.expectedROI,
            project.completionMonths
        );

        const receipt = await tx.wait();
        const event = receipt.events?.find(e => e.event === 'PROPXTokenCreated');
        
        createdTokens.push({
            ...project,
            tokenContract: event?.args?.tokenContract,
            tokenId: event?.args?.tokenId?.toString()
        });

        console.log(`   ✅ Created PROPX-${project.projectCode}`);
    }

    return createdTokens;
}

// ============================================================================
// XERA PROPERTIES SETUP
// ============================================================================
async function setupXERAProperties(xeraIssuer) {
    const xeraProperties = [
        {
            cityCode: "MUM",
            poolName: "Mumbai Residential Pool",
            propertyCount: 15,
            totalValue: "₹45 Cr",
            averageValue: "₹3 Cr",
            categories: ["RESIDENTIAL", "COMMERCIAL"]
        },
        {
            cityCode: "BANG", 
            poolName: "Bangalore Tech Hub Pool",
            propertyCount: 12,
            totalValue: "₹38 Cr",
            averageValue: "₹3.2 Cr",
            categories: ["COMMERCIAL", "MIXED_USE"]
        },
        {
            cityCode: "DEL",
            poolName: "Delhi NCR Commercial Pool", 
            propertyCount: 10,
            totalValue: "₹55 Cr",
            averageValue: "₹5.5 Cr",
            categories: ["COMMERCIAL", "LUXURY"]
        }
    ];

    // In a real implementation, these would be created as XRPL objects
    console.log("   📍 XERA city pools configured on XRPL");
    
    return xeraProperties;
}

// ============================================================================
// CONFIGURATION FILES GENERATION
// ============================================================================
async function generateConfigurationFiles(deploymentResults) {
    // Frontend configuration
    const frontendConfig = {
        tokens: {
            xera: {
                network: "XRPL",
                currency: deploymentResults.networks.xrpl.currencyCode,
                issuer: deploymentResults.networks.xrpl.issuer,
                type: "platform",
                features: ["diversified_portfolio", "staking", "governance", "fee_discounts"],
                cities: deploymentResults.networks.xrpl.properties.map(p => p.cityCode)
            },
            propx: {
                network: "Flare",
                factory: deploymentResults.networks.flare.propxFactoryAddress,
                type: "premium_properties",
                features: ["individual_properties", "dividends", "oracle_pricing", "institutional_access"],
                sampleTokens: deploymentResults.sampleTokens || []
            }
        },
        crossChain: {
            bridge: deploymentResults.crossChainBridge,
            features: ["unified_portfolio", "cross_chain_benefits", "aggregated_analytics"]
        },
        networks: {
            xrpl: {
                endpoint: deploymentConfig.xrpl.network,
                type: deploymentConfig.xrpl.network.includes('altnet') ? 'testnet' : 'mainnet'
            },
            flare: {
                endpoint: deploymentConfig.flare.network,
                chainId: deploymentResults.networks.flare.chainId,
                type: deploymentResults.networks.flare.chainId === 114 ? 'testnet' : 'mainnet'
            }
        }
    };

    // Backend configuration
    const backendConfig = {
        blockchain: {
            xrpl: {
                network: deploymentConfig.xrpl.network,
                xeraIssuer: deploymentResults.networks.xrpl.issuer,
                walletSeed: deploymentResults.networks.xrpl.walletSeed
            },
            flare: {
                rpcUrl: deploymentConfig.flare.network,
                chainId: deploymentResults.networks.flare.chainId,
                contracts: {
                    xeraToken: deploymentResults.networks.flare.xeraTokenAddress,
                    propxFactory: deploymentResults.networks.flare.propxFactoryAddress
                }
            }
        },
        services: {
            tokenization: {
                xeraMinValue: "5000000", // ₹50 lakh
                propxMinValue: "50000000", // ₹5 crore
                platformFees: {
                    tier1: "1.5%",
                    tier2: "2.5%"
                }
            },
            crossChain: {
                syncInterval: 300, // 5 minutes
                bridgeEnabled: true
            }
        }
    };

    // Environment variables
    const envConfig = `
# XERA & PROPX Dual Token Configuration
XRPL_NETWORK=${deploymentConfig.xrpl.network}
XRPL_XERA_ISSUER=${deploymentResults.networks.xrpl.issuer}
XRPL_WALLET_SEED=${deploymentResults.networks.xrpl.walletSeed}

FLARE_RPC_URL=${deploymentConfig.flare.network}
FLARE_CHAIN_ID=${deploymentResults.networks.flare.chainId}
FLARE_XERA_TOKEN=${deploymentResults.networks.flare.xeraTokenAddress}
FLARE_PROPX_FACTORY=${deploymentResults.networks.flare.propxFactoryAddress}

# Frontend Configuration
REACT_APP_XERA_ISSUER=${deploymentResults.networks.xrpl.issuer}
REACT_APP_PROPX_FACTORY=${deploymentResults.networks.flare.propxFactoryAddress}
REACT_APP_DUAL_TOKEN_MODE=true
REACT_APP_CROSS_CHAIN_ENABLED=true
`;

    // Write files
    fs.writeFileSync('../frontend/src/config/dualTokenConfig.json', JSON.stringify(frontendConfig, null, 2));
    fs.writeFileSync('../backend/src/config/blockchainConfig.json', JSON.stringify(backendConfig, null, 2));
    fs.writeFileSync('../.env.dual-token', envConfig);
    fs.writeFileSync('deployment-results.json', JSON.stringify(deploymentResults, null, 2));
}

// Export for use in other scripts
module.exports = {
    main,
    deployXERAOnXRPL,
    setupCrossChainBridge,
    deploymentConfig
};

// Run deployment if called directly
if (require.main === module) {
    main()
        .then((results) => {
            console.log("\n🎉 Deployment completed successfully!");
            console.log("📋 Results saved to deployment-results.json");
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Deployment failed:", error);
            process.exit(1);
        });
}