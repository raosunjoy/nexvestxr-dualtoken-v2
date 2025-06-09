// ============================================================================
// BRAND CONFIGURATION & DEPLOYMENT SCRIPT
// ============================================================================

// config/brandConfig.js
const brandConfig = {
  platform: {
    name: "XERA Real Estate India",
    symbol: "XERA",
    description: "Platform token for diversified real estate investment",
    totalSupply: "1,000,000,000",
    decimals: 18,
    colors: {
      primary: "#8b45ff",
      secondary: "#3b82f6", 
      accent: "#06d6a0",
      gradient: "linear-gradient(135deg, #8b45ff 0%, #3b82f6 50%, #06d6a0 100%)"
    },
    logo: {
      svg: "/assets/xera-logo.svg",
      png: "/assets/xera-logo.png",
      favicon: "/assets/xera-favicon.ico"
    }
  },

  premium: {
    prefix: "PROPX",
    description: "Premium property tokens for individual properties",
    namingConvention: "PROPX-[DEVELOPER]-[PROJECT][NUMBER]",
    examples: [
      "PROPX-GODREJ-BKC001",
      "PROPX-PRESTIGE-TECH002",
      "PROPX-BRIGADE-BANG003",
      "PROPX-SOBHA-CHEN004",
      "PROPX-DLF-NCR005"
    ],
    colors: {
      primary: "#1a1a2e",
      secondary: "#16213e",
      accent: "#0f3460",
      gradient: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)"
    },
    logo: {
      svg: "/assets/propx-logo.svg", 
      png: "/assets/propx-logo.png"
    }
  },

  developers: {
    tier1: [
      {
        name: "Godrej Properties Limited",
        brandCode: "GODREJ",
        tier: 1,
        primaryCities: ["MUM", "BANG", "NCR", "PUN"],
        specialization: ["LUXURY", "RESIDENTIAL", "COMMERCIAL"],
        logo: "/assets/developers/godrej-logo.png"
      },
      {
        name: "Prestige Estates Projects Limited", 
        brandCode: "PRESTIGE",
        tier: 1,
        primaryCities: ["BANG", "CHEN", "HYD", "KOC"],
        specialization: ["COMMERCIAL", "MIXED_USE", "LUXURY"],
        logo: "/assets/developers/prestige-logo.png"
      },
      {
        name: "Brigade Enterprises Limited",
        brandCode: "BRIGADE",
        tier: 1,
        primaryCities: ["BANG", "CHEN", "HYD", "MYS"],
        specialization: ["MIXED_USE", "COMMERCIAL", "RESIDENTIAL"],
        logo: "/assets/developers/brigade-logo.png"
      },
      {
        name: "Sobha Limited",
        brandCode: "SOBHA",
        tier: 1,
        primaryCities: ["BANG", "CHEN", "KOC", "PUN"],
        specialization: ["LUXURY", "RESIDENTIAL", "VILLAS"],
        logo: "/assets/developers/sobha-logo.png"
      },
      {
        name: "DLF Limited",
        brandCode: "DLF",
        tier: 1,
        primaryCities: ["NCR", "CHEN", "KOL", "PUN"],
        specialization: ["COMMERCIAL", "LUXURY", "MIXED_USE"],
        logo: "/assets/developers/dlf-logo.png"
      }
    ],
    tier2: [
      {
        name: "Kolte-Patil Developers",
        brandCode: "KOLTE",
        tier: 2,
        primaryCities: ["PUN", "MUM", "BANG"],
        specialization: ["RESIDENTIAL", "MIXED_USE"],
        logo: "/assets/developers/kolte-logo.png"
      },
      {
        name: "Puravankara Limited",
        brandCode: "PURAVA",
        tier: 2,
        primaryCities: ["BANG", "CHEN", "KOC", "HYD"],
        specialization: ["RESIDENTIAL", "COMMERCIAL"],
        logo: "/assets/developers/puravankara-logo.png"
      }
    ]
  },

  cities: {
    tier1A: [
      { code: "MUM", name: "Mumbai", multiplier: 1.3, pools: ["XERA-MUM", "PROPX-MUM"] },
      { code: "NCR", name: "Delhi NCR", multiplier: 1.3, pools: ["XERA-NCR", "PROPX-NCR"] }
    ],
    tier1B: [
      { code: "BANG", name: "Bangalore", multiplier: 1.2, pools: ["XERA-BANG", "PROPX-BANG"] },
      { code: "CHEN", name: "Chennai", multiplier: 1.2, pools: ["XERA-CHEN", "PROPX-CHEN"] },
      { code: "HYD", name: "Hyderabad", multiplier: 1.2, pools: ["XERA-HYD", "PROPX-HYD"] }
    ],
    tier1C: [
      { code: "PUN", name: "Pune", multiplier: 1.1, pools: ["XERA-PUN", "PROPX-PUN"] },
      { code: "AHM", name: "Ahmedabad", multiplier: 1.1, pools: ["XERA-AHM", "PROPX-AHM"] },
      { code: "KOL", name: "Kolkata", multiplier: 1.1, pools: ["XERA-KOL", "PROPX-KOL"] }
    ]
  },

  categories: {
    RESIDENTIAL: { name: "Residential", multiplier: 1.0, color: "#22c55e" },
    COMMERCIAL: { name: "Commercial", multiplier: 1.2, color: "#3b82f6" },
    MIXED_USE: { name: "Mixed Use", multiplier: 1.1, color: "#8b45ff" },
    LUXURY: { name: "Luxury", multiplier: 1.4, color: "#f59e0b" },
    INDUSTRIAL: { name: "Industrial", multiplier: 1.05, color: "#6b7280" },
    LAND: { name: "Land", multiplier: 1.0, color: "#84cc16" }
  }
};

module.exports = brandConfig;

// ============================================================================
// UPDATED DEPLOYMENT SCRIPT WITH XERA/PROPX BRANDING
// ============================================================================

// scripts/deployXERAPROPX.js
const { ethers } = require("hardhat");
const fs = require('fs');
const brandConfig = require('../config/brandConfig');

async function main() {
    console.log("🚀 Deploying XERA & PROPX Token Ecosystem...");
    
    const [deployer] = await ethers.getSigners();
    console.log("📝 Deploying with account:", deployer.address);
    
    const deploymentData = {
        network: network.name,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        brandConfig: brandConfig,
        contracts: {}
    };

    try {
        // ============================================================================
        // 1. Deploy XERA Platform Token
        // ============================================================================
        console.log("\n📦 Deploying XERA Platform Token...");
        const XERAToken = await ethers.getContractFactory("XERAToken");
        const xeraToken = await XERAToken.deploy();
        await xeraToken.deployed();
        
        console.log("✅ XERA Token deployed to:", xeraToken.address);
        console.log("   Name:", await xeraToken.name());
        console.log("   Symbol:", await xeraToken.symbol());
        console.log("   Total Supply:", ethers.utils.formatEther(await xeraToken.totalSupply()));

        deploymentData.contracts.xeraToken = {
            address: xeraToken.address,
            name: await xeraToken.name(),
            symbol: await xeraToken.symbol(),
            deploymentHash: xeraToken.deployTransaction.hash
        };

        // ============================================================================
        // 2. Deploy PROPX Token Factory
        // ============================================================================
        console.log("\n📦 Deploying PROPX Token Factory...");
        const PROPXTokenFactory = await ethers.getContractFactory("PROPXTokenFactory");
        const propxFactory = await PROPXTokenFactory.deploy();
        await propxFactory.deployed();
        
        console.log("✅ PROPX Token Factory deployed to:", propxFactory.address);
        deploymentData.contracts.propxTokenFactory = {
            address: propxFactory.address,
            deploymentHash: propxFactory.deployTransaction.hash
        };

        // ============================================================================
        // 3. Register Premier Developers
        // ============================================================================
        console.log("\n👥 Registering premier developers...");
        
        const tier1Developers = brandConfig.developers.tier1;
        for (const dev of tier1Developers) {
            // For demo, using deployer address as developer address
            // In production, these would be actual developer wallet addresses
            const devAddress = deployer.address;
            
            await propxFactory.registerDeveloper(
                devAddress,
                dev.name,
                dev.brandCode,
                1, // TIER1
                25, // projects delivered
                ethers.utils.parseEther("100000000"), // ₹100 crore total value
                dev.primaryCities[0], // primary city
                [] // verification documents
            );
            
            console.log(`✅ Registered ${dev.name} (${dev.brandCode})`);
        }

        // ============================================================================
        // 4. Create Sample PROPX Tokens
        // ============================================================================
        console.log("\n🏢 Creating sample PROPX tokens...");
        
        const sampleProjects = [
            {
                developer: "GODREJ",
                propertyName: "Godrej BKC Residency Tower A",
                projectCode: "BKC001", 
                cityCode: "MUM",
                category: 0, // RESIDENTIAL
                totalTokens: ethers.utils.parseEther("1000000"), // 1M tokens
                pricePerToken: ethers.utils.parseEther("500"), // ₹500 per token
                minimumRaise: ethers.utils.parseEther("100000000") // ₹10 crore minimum
            },
            {
                developer: "PRESTIGE",
                propertyName: "Prestige Tech Park Phase II",
                projectCode: "TECH002",
                cityCode: "BANG", 
                category: 1, // COMMERCIAL
                totalTokens: ethers.utils.parseEther("2000000"), // 2M tokens
                pricePerToken: ethers.utils.parseEther("750"), // ₹750 per token
                minimumRaise: ethers.utils.parseEther("300000000") // ₹30 crore minimum
            }
        ];

        for (const project of sampleProjects) {
            const tx = await propxFactory.createPROPXToken(
                project.propertyName,
                `${project.cityCode} Premium Location`, // property address
                project.projectCode,
                project.cityCode,
                project.category,
                project.totalTokens,
                project.pricePerToken, 
                project.minimumRaise,
                90, // 90 days funding period
                `QmSample${project.projectCode}Hash` // IPFS document hash
            );
            
            const receipt = await tx.wait();
            const event = receipt.events?.find(e => e.event === 'PROPXTokenCreated');
            
            console.log(`✅ Created PROPX-${project.developer}-${project.projectCode}`);
            console.log(`   Token Contract: ${event?.args?.tokenContract}`);
        }

        // ============================================================================
        // 5. Setup XERA Pool with Sample Properties
        // ============================================================================
        console.log("\n💰 Setting up XERA pool with sample properties...");
        
        const sampleXERAProperties = [
            {
                owner: deployer.address,
                address: "Koramangala 5th Block, Bangalore",
                valuation: ethers.utils.parseEther("2000000"), // ₹20 lakh
                category: 0, // RESIDENTIAL
                cityCode: "BANG"
            },
            {
                owner: deployer.address,
                address: "Gachibowli Financial District, Hyderabad", 
                valuation: ethers.utils.parseEther("3500000"), // ₹35 lakh
                category: 1, // COMMERCIAL
                cityCode: "HYD"
            },
            {
                owner: deployer.address,
                address: "Anna Nagar West, Chennai",
                valuation: ethers.utils.parseEther("1800000"), // ₹18 lakh
                category: 0, // RESIDENTIAL
                cityCode: "CHEN"
            }
        ];

        for (const property of sampleXERAProperties) {
            await xeraToken.addProperty(
                property.owner,
                property.address,
                property.valuation,
                `QmXERA${property.cityCode}Hash`,
                property.category,
                property.cityCode
            );
            console.log(`✅ Added XERA property in ${property.cityCode}`);
        }

        // ============================================================================
        // 6. Configure Token Economics
        // ============================================================================
        console.log("\n⚙️ Configuring token economics...");
        
        // Set minimum property value for XERA (₹50 lakh)
        await xeraToken.updateMinimumPropertyValue(ethers.utils.parseEther("5000000"));
        
        // Update platform fees for different tiers
        // Already set in constructor: Tier 1 = 1.5%, Tier 2 = 2.5%
        
        console.log("✅ Token economics configured");

        // ============================================================================
        // 7. Generate Brand Assets and Configuration
        // ============================================================================
        console.log("\n🎨 Generating brand assets and configuration...");
        
        const frontendConfig = {
            tokens: {
                xera: {
                    address: xeraToken.address,
                    name: await xeraToken.name(),
                    symbol: await xeraToken.symbol(),
                    decimals: 18,
                    logo: brandConfig.platform.logo,
                    colors: brandConfig.platform.colors,
                    description: brandConfig.platform.description
                },
                propxFactory: {
                    address: propxFactory.address,
                    brandPrefix: brandConfig.premium.prefix,
                    namingConvention: brandConfig.premium.namingConvention,
                    colors: brandConfig.premium.colors
                }
            },
            developers: brandConfig.developers,
            cities: brandConfig.cities,
            categories: brandConfig.categories
        };

        // Save frontend configuration
        fs.writeFileSync(
            'frontend/src/config/tokenConfig.json', 
            JSON.stringify(frontendConfig, null, 2)
        );

        // ============================================================================
        // 8. Generate Environment Variables
        // ============================================================================
        const envVariables = `
# XERA & PROPX Token Configuration
REACT_APP_XERA_TOKEN_ADDRESS=${xeraToken.address}
REACT_APP_PROPX_FACTORY_ADDRESS=${propxFactory.address}

# Token Branding
REACT_APP_PLATFORM_TOKEN_NAME="${await xeraToken.name()}"
REACT_APP_PLATFORM_TOKEN_SYMBOL="${await xeraToken.symbol()}"
REACT_APP_PREMIUM_TOKEN_PREFIX="PROPX"

# Brand Colors
REACT_APP_PRIMARY_COLOR="#8b45ff"
REACT_APP_SECONDARY_COLOR="#3b82f6"
REACT_APP_ACCENT_COLOR="#06d6a0"

# API Configuration
REACT_APP_API_URL=https://api.nexvestxr.com
REACT_APP_XUMM_API_KEY=\${XUMM_API_KEY}
REACT_APP_FLARE_RPC_URL=https://coston2-api.flare.network/ext/bc/C/rpc

# Feature Flags
REACT_APP_ENABLE_XERA_TRADING=true
REACT_APP_ENABLE_PROPX_TRADING=true
REACT_APP_ENABLE_CITY_POOLS=true
REACT_APP_ENABLE_GOVERNANCE=true
`;

        fs.writeFileSync('.env.production', envVariables);

        // ============================================================================
        // 9. Save Complete Deployment Data
        // ============================================================================
        deploymentData.configuration = {
            minimumPropertyValue: "5000000", // ₹50 lakh
            platformFees: {
                tier1: "1.5%",
                tier2: "2.5%"
            },
            sampleProjects: sampleProjects.length,
            sampleXERAProperties: sampleXERAProperties.length,
            registeredDevelopers: tier1Developers.length
        };

        const deploymentFile = `deployments/${network.name}_xera_propx_deployment.json`;
        fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));

        // ============================================================================
        // 10. Display Deployment Summary
        // ============================================================================
        console.log("\n🎉 XERA & PROPX Deployment Completed Successfully!");
        console.log("=====================================");
        console.log("\n📊 Token Ecosystem Overview:");
        console.log(`XERA Platform Token: ${xeraToken.address}`);
        console.log(`PROPX Token Factory: ${propxFactory.address}`);
        console.log(`Total XERA Supply: ${ethers.utils.formatEther(await xeraToken.totalSupply())} XERA`);
        
        console.log("\n🏢 Registered Developers:");
        tier1Developers.forEach(dev => {
            console.log(`  • ${dev.name} (${dev.brandCode}) - Tier 1`);
        });

        console.log("\n🏙️ Supported Cities:");
        [...brandConfig.cities.tier1A, ...brandConfig.cities.tier1B, ...brandConfig.cities.tier1C]
            .forEach(city => {
                console.log(`  • ${city.name} (${city.code}) - Multiplier: ${city.multiplier}x`);
            });

        console.log("\n💼 Sample PROPX Tokens Created:");
        sampleProjects.forEach(project => {
            console.log(`  • PROPX-${project.developer}-${project.projectCode} (${project.cityCode})`);
        });

        console.log("\n📁 Generated Files:");
        console.log("  • frontend/src/config/tokenConfig.json");
        console.log("  • .env.production");
        console.log(`  • ${deploymentFile}`);

        console.log("\n🚀 Next Steps:");
        console.log("1. Update frontend components with new token addresses");
        console.log("2. Deploy to testnet/mainnet");
        console.log("3. Verify contracts on block explorer");
        console.log("4. Set up monitoring and analytics");
        console.log("5. Launch marketing campaign for XERA & PROPX brands");

        return deploymentData;

    } catch (error) {
        console.error("❌ Deployment failed:", error);
        throw error;
    }
}

// ============================================================================
// BRAND UTILITY FUNCTIONS
// ============================================================================

function generatePROPXTokenName(developerCode, projectCode) {
    return `PROPX-${developerCode}-${projectCode}`;
}

function generateXERACityPoolName(cityCode) {
    return `XERA-${cityCode}`;
}

function getCityMultiplier(cityCode) {
    const allCities = [...brandConfig.cities.tier1A, ...brandConfig.cities.tier1B, ...brandConfig.cities.tier1C];
    const city = allCities.find(c => c.code === cityCode);
    return city ? city.multiplier : 1.0;
}

function getCategoryInfo(categoryId) {
    const categories = Object.keys(brandConfig.categories);
    const categoryKey = categories[categoryId];
    return brandConfig.categories[categoryKey];
}

function validateDeveloperBrandCode(brandCode) {
    const allDevelopers = [...brandConfig.developers.tier1, ...brandConfig.developers.tier2];
    return allDevelopers.some(dev => dev.brandCode === brandCode);
}

function generateTokenSymbol(type, developer, project) {
    if (type === 'PROPX') {
        return `PROPX-${developer}-${project}`;
    } else if (type === 'XERA') {
        return `XERA-${project}`; // For city pools like XERA-MUM
    }
    return 'XERA'; // Default platform token
}

module.exports = {
    main,
    brandConfig,
    generatePROPXTokenName,
    generateXERACityPoolName,
    getCityMultiplier,
    getCategoryInfo,
    validateDeveloperBrandCode,
    generateTokenSymbol
};

// Run deployment if called directly
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}