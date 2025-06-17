require("dotenv").config({ path: "../.env" });
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("@nomiclabs/hardhat-etherscan");

// UAE-specific deployment task
task('deploy-uae', 'Deploy UAE property tokenization contracts')
  .addOptionalParam('targetNetwork', 'The network to deploy to', 'hardhat')
  .setAction(async (taskArgs, hre) => {
    console.log(`🚀 Deploying UAE contracts to ${hre.network.name}...`);
    const deployScript = require('./scripts/deploy-uae-enhanced.js');
    await deployScript();
  });

// Task to setup demo UAE property
task('setup-demo-property', 'Setup a demo UAE property for testing')
  .addParam('contract', 'The deployed contract address')
  .setAction(async (taskArgs, hre) => {
    const UAEPropertyToken = await hre.ethers.getContractFactory('UAEPropertyToken');
    const contract = UAEPropertyToken.attach(taskArgs.contract);
    
    console.log('🏢 Setting up demo property...');
    
    // Add demo property
    const tx = await contract.listProperty(
      'RERA-DXB-2024-001',
      'DLD-001-2024-DOWNTOWN',
      'Burj Khalifa District, Downtown Dubai',
      'Downtown Dubai',
      'Dubai',
      ethers.utils.parseEther('10000000'), // 10M AED
      10000, // 10,000 tokens
      0, // APARTMENT
      '0x' + '0'.repeat(40), // Demo developer
      90 // 90 days funding period
    );
    
    await tx.wait();
    console.log('✅ Demo property listed');
  });

module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
    // Flare Mainnet
    flare: {
      url: process.env.FLARE_RPC_URL || "https://flare-api.flare.network/ext/bc/C/rpc",
      accounts: process.env.FLARE_PRIVATE_KEY ? [process.env.FLARE_PRIVATE_KEY] : [],
      chainId: 14,
      gasPrice: 25000000000, // 25 gwei
    },
    // Flare Testnet (Coston2)
    flareTestnet: {
      url: process.env.FLARE_TESTNET_RPC_URL || "https://coston2-api.flare.network/ext/bc/C/rpc",
      accounts: process.env.FLARE_TESTNET_PRIVATE_KEY ? [process.env.FLARE_TESTNET_PRIVATE_KEY] : [],
      chainId: 114,
      gasPrice: 25000000000,
    },
    // XRPL EVM Sidechain
    xrpl: {
      url: process.env.XRPL_RPC_URL || "https://rpc-evm-sidechain.xrpl.org",
      accounts: process.env.XRPL_PRIVATE_KEY ? [process.env.XRPL_PRIVATE_KEY] : [],
      chainId: 1440002,
      gasPrice: 10000000000, // 10 gwei
    },
    // XRPL Testnet
    xrplTestnet: {
      url: process.env.XRPL_TESTNET_RPC_URL || "https://rpc-evm-sidechain.devnet.ripple.com",
      accounts: process.env.XRPL_TESTNET_PRIVATE_KEY ? [process.env.XRPL_TESTNET_PRIVATE_KEY] : [],
      chainId: 1440001,
      gasPrice: 10000000000,
    },
    // Polygon Mumbai for UAE testing
    mumbai: {
      url: process.env.MUMBAI_RPC_URL || "https://rpc-mumbai.maticvigil.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 80001,
      gasPrice: 35000000000, // 35 gwei
    },
    // Polygon Mainnet for UAE production
    polygon: {
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 137,
      gasPrice: 35000000000, // 35 gwei
    },
  },
  defaultNetwork: "hardhat",
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: {
      flare: process.env.FLARE_API_KEY || "placeholder",
      flareTestnet: process.env.FLARE_API_KEY || "placeholder",
    },
    customChains: [
      {
        network: "flare",
        chainId: 14,
        urls: {
          apiURL: "https://flare-explorer.flare.network/api",
          browserURL: "https://flare-explorer.flare.network"
        }
      },
      {
        network: "flareTestnet",
        chainId: 114,
        urls: {
          apiURL: "https://coston2-explorer.flare.network/api",
          browserURL: "https://coston2-explorer.flare.network"
        }
      }
    ]
  },
  mocha: {
    timeout: 40000,
  },
};

