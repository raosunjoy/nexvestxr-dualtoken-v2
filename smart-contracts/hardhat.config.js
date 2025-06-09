require("dotenv").config({ path: "../.env" });
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("@nomiclabs/hardhat-etherscan");

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

