const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

// UAE Network Setup Script
async function setupUAENetworks() {
  console.log("🇦🇪 Setting up UAE-specific network configurations...");
  console.log("================================================");

  // Load network configuration
  const configPath = path.join(__dirname, '../config/uae-networks.json');
  const networkConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  const [deployer] = await ethers.getSigners();
  console.log("Setup account:", deployer.address);
  console.log("Account balance:", ethers.utils.formatEther(await deployer.getBalance()), "ETH");

  // Current network info
  const currentNetwork = hre.network.name;
  const chainId = hre.network.config.chainId;
  
  console.log(`\n🌐 Current Network: ${currentNetwork} (Chain ID: ${chainId})`);

  // Network-specific setup based on current network
  if (currentNetwork === 'polygon' || currentNetwork === 'mumbai') {
    await setupPolygonNetwork(networkConfig, currentNetwork);
  } else if (currentNetwork === 'flare' || currentNetwork === 'flareTestnet') {
    await setupFlareNetwork(networkConfig, currentNetwork);
  } else if (currentNetwork === 'xrpl' || currentNetwork === 'xrplTestnet') {
    await setupXRPLNetwork(networkConfig, currentNetwork);
  } else {
    await setupLocalNetwork(networkConfig);
  }

  // Generate deployment summary
  await generateDeploymentSummary(networkConfig, currentNetwork);
  
  console.log("\n🎉 UAE network configuration completed!");
  console.log("The platform is ready for multi-chain UAE real estate tokenization.");
}

async function setupPolygonNetwork(config, network) {
  console.log("\n🔺 Setting up Polygon Network for UAE Properties...");
  
  const isMainnet = network === 'polygon';
  const networkConfig = isMainnet ? 
    config.networks.mainnet.polygon : 
    config.networks.testnet.polygonMumbai;

  // Deploy core UAE contracts if not already deployed
  if (!fs.existsSync(`./deployments/${network}-uae-deployment.json`)) {
    console.log("📋 Deploying UAE core contracts to Polygon...");
    
    // Deploy in optimal order for gas efficiency
    const contracts = await deployUAEContracts();
    
    // Update network config with deployed addresses
    networkConfig.contracts = {
      UAEPropertyToken: contracts.uaePropertyToken,
      UAECompliance: contracts.uaeCompliance,
      UAEStaking: contracts.uaeStaking,
      UAEOracle: contracts.uaeOracle
    };

    console.log("✅ UAE contracts deployed to Polygon");
  }

  // Setup investment tiers based on network
  await setupInvestmentTiers(config.investment_tiers);
  
  // Configure gas optimization for Polygon
  await configureGasOptimization(config.gas_optimization.polygon);
  
  console.log("✅ Polygon network setup completed");
}

async function setupFlareNetwork(config, network) {
  console.log("\n🔥 Setting up Flare Network for Price Oracles...");
  
  const isMainnet = network === 'flare';
  const networkConfig = isMainnet ? 
    config.networks.mainnet.flare : 
    config.networks.testnet.flareCoston2;

  // Deploy oracle contracts
  console.log("🔮 Setting up FTSO price feeds...");
  
  // Setup AED price feeds
  const aedFeeds = config.oracles.primary.feeds;
  console.log("📊 Configuring AED price feeds:");
  
  for (const [pair, feedConfig] of Object.entries(aedFeeds)) {
    console.log(`  - ${pair}: Heartbeat ${feedConfig.heartbeat}s, Deviation ${feedConfig.deviation}`);
  }

  // Configure custom UAE property indices
  const customFeeds = config.oracles.custom.feeds;
  console.log("🏢 Setting up UAE property indices:");
  
  for (const [index, feedConfig] of Object.entries(customFeeds)) {
    console.log(`  - ${index}: Daily updates, ${feedConfig.deviation} deviation`);
  }

  // Setup cross-chain bridge configurations
  await setupCrossChainBridges(config.bridges);
  
  console.log("✅ Flare network setup completed");
}

async function setupXRPLNetwork(config, network) {
  console.log("\n💧 Setting up XRPL EVM Sidechain for XERA Integration...");
  
  const isMainnet = network === 'xrpl';
  const networkConfig = isMainnet ? 
    config.networks.mainnet.xrpl : 
    config.networks.testnet.xrplTestnet;

  // Setup XERA token bridge
  console.log("🌉 Configuring XERA token bridge...");
  
  const bridgeConfig = {
    xeraToken: "XERA_TOKEN_ADDRESS", // Would be actual XERA token address
    bridgeFee: ethers.utils.parseEther("0.1"), // 0.1 XRP bridge fee
    minBridgeAmount: ethers.utils.parseEther("100"), // Minimum 100 AED equivalent
    maxBridgeAmount: ethers.utils.parseEther("1000000") // Maximum 1M AED equivalent
  };

  console.log("💱 Bridge Configuration:");
  console.log(`  - Fee: ${ethers.utils.formatEther(bridgeConfig.bridgeFee)} XRP`);
  console.log(`  - Min Amount: ${ethers.utils.formatEther(bridgeConfig.minBridgeAmount)} AED`);
  console.log(`  - Max Amount: ${ethers.utils.formatEther(bridgeConfig.maxBridgeAmount)} AED`);

  // Setup AMM pools for liquidity
  await setupAMMPools(config.currencies.supported);
  
  console.log("✅ XRPL network setup completed");
}

async function setupLocalNetwork(config) {
  console.log("\n🏠 Setting up Local Development Network...");
  
  // Deploy all contracts for testing
  const contracts = await deployUAEContracts();
  
  // Setup test data
  await setupTestData(contracts);
  
  // Configure all supported currencies
  await setupTestCurrencies(config.currencies.supported);
  
  console.log("✅ Local network setup completed");
}

async function deployUAEContracts() {
  console.log("📋 Deploying UAE smart contracts...");
  
  // Deploy UAE Compliance
  const UAECompliance = await ethers.getContractFactory("UAECompliance");
  const uaeCompliance = await UAECompliance.deploy();
  await uaeCompliance.deployed();
  console.log(`  ✅ UAE Compliance: ${uaeCompliance.address}`);

  // Deploy UAE Property Token
  const UAEPropertyToken = await ethers.getContractFactory("UAEPropertyToken");
  const uaePropertyToken = await UAEPropertyToken.deploy(
    "https://api.propxchange.ae/metadata/uae/{id}.json",
    uaeCompliance.address,
    uaeCompliance.address // Use compliance as DLD registry for simplicity
  );
  await uaePropertyToken.deployed();
  console.log(`  ✅ UAE Property Token: ${uaePropertyToken.address}`);

  // Deploy UAE Staking
  const UAEStaking = await ethers.getContractFactory("UAEStaking");
  const uaeStaking = await UAEStaking.deploy(
    uaePropertyToken.address,
    uaePropertyToken.address, // Use property token as reward token
    86400, // 1 day
    1000   // 10% base rate
  );
  await uaeStaking.deployed();
  console.log(`  ✅ UAE Staking: ${uaeStaking.address}`);

  // Deploy UAE Oracle
  const UAEPriceOracle = await ethers.getContractFactory("UAEPriceOracle");
  const uaeOracle = await UAEPriceOracle.deploy();
  await uaeOracle.deployed();
  console.log(`  ✅ UAE Oracle: ${uaeOracle.address}`);

  return {
    uaeCompliance: uaeCompliance.address,
    uaePropertyToken: uaePropertyToken.address,
    uaeStaking: uaeStaking.address,
    uaeOracle: uaeOracle.address
  };
}

async function setupInvestmentTiers(tierConfig) {
  console.log("\n💰 Setting up UAE Investment Tiers...");
  
  for (const [tierName, config] of Object.entries(tierConfig)) {
    const minAED = ethers.utils.formatEther(config.min_investment);
    const maxAED = config.max_investment === "unlimited" ? 
      "Unlimited" : 
      ethers.utils.formatEther(config.max_investment);
    
    console.log(`  📊 ${config.name}:`);
    console.log(`     Range: ${minAED} - ${maxAED} AED`);
    console.log(`     KYC Level: ${config.kyc_level}`);
    console.log(`     Target: ${config.target_market.join(', ')}`);
    console.log(`     Features: ${config.features.length} features enabled`);
  }
}

async function setupCrossChainBridges(bridgeConfig) {
  console.log("\n🌉 Setting up Cross-Chain Bridges...");
  
  for (const [bridgeName, config] of Object.entries(bridgeConfig)) {
    console.log(`  🔗 ${config.name}:`);
    console.log(`     Type: ${config.type}`);
    console.log(`     Direction: ${config.direction}`);
    console.log(`     Fee: ${config.fee}`);
    console.log(`     Time: ${config.time}`);
    console.log(`     Tokens: ${config.supported_tokens.join(', ')}`);
  }
}

async function setupAMMPools(currencies) {
  console.log("\n🏊 Setting up AMM Liquidity Pools...");
  
  const aedCurrency = currencies.find(c => c.code === 'AED');
  const otherCurrencies = currencies.filter(c => c.code !== 'AED');
  
  for (const currency of otherCurrencies) {
    if (currency.network === 'xrpl_bridge' || currency.network === 'cross_chain') {
      console.log(`  💧 AED/${currency.code} Pool:`);
      console.log(`     Base: ${aedCurrency.name} (${aedCurrency.symbol})`);
      console.log(`     Quote: ${currency.name} (${currency.symbol})`);
      console.log(`     Network: ${currency.network}`);
    }
  }
}

async function setupTestData(contracts) {
  console.log("\n🧪 Setting up test data...");
  
  // Create sample properties
  const sampleProperties = [
    {
      name: "Downtown Dubai Luxury Apartment",
      value: ethers.utils.parseEther("2500000"),
      zone: "Downtown Dubai"
    },
    {
      name: "Dubai Marina Penthouse", 
      value: ethers.utils.parseEther("4200000"),
      zone: "Dubai Marina"
    },
    {
      name: "Business Bay Office Tower",
      value: ethers.utils.parseEther("1800000"),
      zone: "Business Bay"
    }
  ];

  console.log(`  🏢 Creating ${sampleProperties.length} sample properties...`);
  for (const prop of sampleProperties) {
    console.log(`     - ${prop.name}: ${ethers.utils.formatEther(prop.value)} AED`);
  }
}

async function setupTestCurrencies(currencies) {
  console.log("\n💱 Setting up test currencies...");
  
  for (const currency of currencies) {
    console.log(`  💰 ${currency.code} (${currency.name}):`);
    console.log(`     Symbol: ${currency.symbol}`);
    console.log(`     Decimals: ${currency.decimals}`);
    console.log(`     Network: ${currency.network}`);
  }
}

async function configureGasOptimization(gasConfig) {
  console.log("\n⛽ Configuring gas optimization...");
  console.log(`  Target Gas Price: ${gasConfig.target_gas_price}`);
  console.log(`  Max Gas Limit: ${gasConfig.max_gas_limit.toLocaleString()}`);
  console.log(`  Batch Size: ${gasConfig.batch_size}`);
  console.log(`  Optimization Level: ${gasConfig.optimization_level}`);
}

async function generateDeploymentSummary(config, network) {
  console.log("\n📊 DEPLOYMENT SUMMARY");
  console.log("====================");
  console.log(`Network: ${network}`);
  console.log(`Chain ID: ${hre.network.config.chainId}`);
  console.log(`Primary Currency: ${config.currencies.primary}`);
  console.log(`Supported Currencies: ${config.currencies.supported.length}`);
  console.log(`Investment Tiers: ${Object.keys(config.investment_tiers).length}`);
  console.log(`Cross-Chain Bridges: ${Object.keys(config.bridges).length}`);
  console.log(`Oracle Feeds: ${Object.keys(config.oracles.primary.feeds).length + Object.keys(config.oracles.custom.feeds).length}`);
  
  const timestamp = new Date().toISOString();
  const summary = {
    network,
    chainId: hre.network.config.chainId,
    timestamp,
    config: config,
    status: "CONFIGURED"
  };

  // Save network setup summary
  const summaryPath = `./deployments/${network}-network-setup.json`;
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`\n💾 Network setup summary saved to: ${summaryPath}`);
}

// Execute network setup
if (require.main === module) {
  setupUAENetworks()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Network setup failed:", error);
      process.exit(1);
    });
}

module.exports = setupUAENetworks;