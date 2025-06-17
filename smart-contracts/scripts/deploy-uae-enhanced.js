const hre = require("hardhat");
const { ethers } = require("hardhat");

// UAE Enhanced Deployment Script
async function main() {
  console.log("🇦🇪 Deploying Enhanced UAE Smart Contracts...");
  console.log("=====================================");

  // Get the contract deployer
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy UAE Compliance Contract first
  console.log("\n📋 Deploying UAE Compliance Contract...");
  const UAECompliance = await ethers.getContractFactory("UAECompliance");
  const uaeCompliance = await UAECompliance.deploy();
  await uaeCompliance.deployed();
  console.log("✅ UAE Compliance deployed to:", uaeCompliance.address);

  // Deploy Enhanced UAE Property Token
  console.log("\n🏢 Deploying Enhanced UAE Property Token...");
  const UAEPropertyToken = await ethers.getContractFactory("UAEPropertyToken");
  
  // Constructor parameters
  const metadataURI = "https://api.propxchange.ae/metadata/uae/{id}.json";
  const reraComplianceAddress = uaeCompliance.address; // Use deployed compliance contract
  const dldRegistryAddress = deployer.address; // For now, use deployer as DLD registry
  
  const uaePropertyToken = await UAEPropertyToken.deploy(
    metadataURI,
    reraComplianceAddress,
    dldRegistryAddress
  );
  await uaePropertyToken.deployed();
  console.log("✅ UAE Property Token deployed to:", uaePropertyToken.address);

  // Deploy UAE Staking Contract
  console.log("\n💰 Deploying UAE Staking Contract...");
  const UAEStaking = await ethers.getContractFactory("UAEStaking");
  const uaeStaking = await UAEStaking.deploy(
    uaePropertyToken.address, // Property token contract
    deployer.address,         // Reward token (can be same or different)
    86400,                    // 1 day reward duration
    1000                      // Base reward rate (10% APY)
  );
  await uaeStaking.deployed();
  console.log("✅ UAE Staking deployed to:", uaeStaking.address);

  // Deploy UAE Oracle for AED/USD pricing
  console.log("\n🔮 Deploying UAE Price Oracle...");
  const UAEOracle = await ethers.getContractFactory("UAEPriceOracle");
  const uaeOracle = await UAEOracle.deploy();
  await uaeOracle.deployed();
  console.log("✅ UAE Oracle deployed to:", uaeOracle.address);

  // Configure contracts
  console.log("\n⚙️  Configuring contracts...");
  
  // Set up RERA compliance roles
  await uaeCompliance.grantRole(await uaeCompliance.RERA_OFFICER_ROLE(), deployer.address);
  await uaeCompliance.grantRole(await uaeCompliance.DLD_OFFICER_ROLE(), deployer.address);
  console.log("✅ RERA and DLD officer roles granted");

  // Add some UAE developers to the verified list
  const uaeDevelopers = [
    "0x1234567890123456789012345678901234567890", // EMAAR placeholder
    "0x2345678901234567890123456789012345678901", // MERAAS placeholder
    "0x3456789012345678901234567890123456789012", // NAKHEEL placeholder
    "0x4567890123456789012345678901234567890123", // DAMAC placeholder
  ];

  for (let i = 0; i < uaeDevelopers.length; i++) {
    try {
      // This would normally verify real developer addresses
      console.log(`📝 Would verify developer ${i + 1}: ${uaeDevelopers[i]}`);
    } catch (error) {
      console.log(`⚠️  Note: Using placeholder developer addresses`);
    }
  }

  // Set up initial AED exchange rates in oracle
  const aedRates = {
    "USD": ethers.utils.parseUnits("0.272", 18), // 1 AED = 0.272 USD
    "EUR": ethers.utils.parseUnits("0.248", 18), // 1 AED = 0.248 EUR
    "GBP": ethers.utils.parseUnits("0.214", 18), // 1 AED = 0.214 GBP
    "SAR": ethers.utils.parseUnits("1.020", 18), // 1 AED = 1.020 SAR
    "QAR": ethers.utils.parseUnits("0.990", 18), // 1 AED = 0.990 QAR
    "KWD": ethers.utils.parseUnits("0.083", 18), // 1 AED = 0.083 KWD
  };

  for (const [currency, rate] of Object.entries(aedRates)) {
    await uaeOracle.updateExchangeRate(currency, rate);
    console.log(`💱 Set ${currency}/AED rate: ${ethers.utils.formatUnits(rate, 18)}`);
  }

  // Initialize sample UAE properties
  console.log("\n🏗️  Creating sample UAE properties...");
  
  const sampleProperties = [
    {
      reraNumber: "RERA-DXB-001-2024",
      dldNumber: "DLD-DT-001-2024",
      address: "Downtown Dubai, Burj Khalifa District",
      zone: "Downtown Dubai",
      emirate: "Dubai",
      totalValue: ethers.utils.parseUnits("2500000", 18), // 2.5M AED
      totalSupply: 1000, // 1000 tokens
      propertyType: 0, // APARTMENT
      fundingDays: 90
    },
    {
      reraNumber: "RERA-DXB-002-2024", 
      dldNumber: "DLD-MR-002-2024",
      address: "Dubai Marina, Marina Walk",
      zone: "Dubai Marina",
      emirate: "Dubai", 
      totalValue: ethers.utils.parseUnits("4200000", 18), // 4.2M AED
      totalSupply: 2000, // 2000 tokens
      propertyType: 3, // PENTHOUSE
      fundingDays: 120
    },
    {
      reraNumber: "RERA-DXB-003-2024",
      dldNumber: "DLD-BB-003-2024", 
      address: "Business Bay, Executive Heights",
      zone: "Business Bay",
      emirate: "Dubai",
      totalValue: ethers.utils.parseUnits("1800000", 18), // 1.8M AED
      totalSupply: 900, // 900 tokens
      propertyType: 4, // OFFICE
      fundingDays: 60
    }
  ];

  // Note: In a real deployment, these would be created by verified developers
  for (let i = 0; i < sampleProperties.length; i++) {
    const prop = sampleProperties[i];
    console.log(`📝 Sample property ${i + 1}: ${prop.zone} - ${ethers.utils.formatUnits(prop.totalValue, 18)} AED`);
  }

  // Display deployment summary
  console.log("\n📊 DEPLOYMENT SUMMARY");
  console.log("===================");
  console.log("Network:", hre.network.name);
  console.log("Deployer:", deployer.address);
  console.log("Gas Price:", await ethers.provider.getGasPrice());
  console.log("\n📋 Contract Addresses:");
  console.log("- UAE Compliance:", uaeCompliance.address);
  console.log("- UAE Property Token:", uaePropertyToken.address);
  console.log("- UAE Staking:", uaeStaking.address);
  console.log("- UAE Oracle:", uaeOracle.address);

  // Verification commands
  console.log("\n🔍 Verification Commands:");
  console.log(`npx hardhat verify --network ${hre.network.name} ${uaeCompliance.address}`);
  console.log(`npx hardhat verify --network ${hre.network.name} ${uaePropertyToken.address} "${metadataURI}" ${reraComplianceAddress} ${dldRegistryAddress}`);
  console.log(`npx hardhat verify --network ${hre.network.name} ${uaeStaking.address} ${uaePropertyToken.address} ${deployer.address} 86400 1000`);
  console.log(`npx hardhat verify --network ${hre.network.name} ${uaeOracle.address}`);

  // Configuration for frontend
  const deploymentConfig = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    contracts: {
      UAECompliance: {
        address: uaeCompliance.address,
        abi: "artifacts/contracts/UAE/UAECompliance.sol/UAECompliance.json"
      },
      UAEPropertyToken: {
        address: uaePropertyToken.address,
        abi: "artifacts/contracts/UAE/UAEPropertyToken.sol/UAEPropertyToken.json"
      },
      UAEStaking: {
        address: uaeStaking.address,
        abi: "artifacts/contracts/UAE/UAEStaking.sol/UAEStaking.json"
      },
      UAEOracle: {
        address: uaeOracle.address,
        abi: "artifacts/contracts/UAE/UAEPriceOracle.sol/UAEPriceOracle.json"
      }
    },
    features: {
      multiCurrency: true,
      reraCompliance: true,
      dldIntegration: true,
      stakingRewards: true,
      oraclePricing: true
    },
    currencies: Object.keys(aedRates).concat(["AED"]),
    investmentTiers: {
      retail: { min: "25000", max: "500000", currency: "AED" },
      premium: { min: "500000", max: "2000000", currency: "AED" },
      institutional: { min: "2000000", currency: "AED" }
    }
  };

  // Save deployment config
  const fs = require('fs');
  const deploymentPath = `./deployments/${hre.network.name}-uae-deployment.json`;
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentConfig, null, 2));
  console.log(`\n💾 Deployment config saved to: ${deploymentPath}`);

  console.log("\n🎉 UAE Enhanced Smart Contracts Deployment Complete!");
  console.log("The platform is now ready for UAE real estate tokenization.");
  
  return {
    uaeCompliance: uaeCompliance.address,
    uaePropertyToken: uaePropertyToken.address,
    uaeStaking: uaeStaking.address,
    uaeOracle: uaeOracle.address,
    config: deploymentConfig
  };
}

// Execute deployment
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Deployment failed:", error);
      process.exit(1);
    });
}

module.exports = main;