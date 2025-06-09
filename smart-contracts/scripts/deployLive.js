// Simple Live Testnet Deployment Script
const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("🚀 Deploying NexVestXR V2 Dual Token System to Live Testnet");
    console.log("=" .repeat(60));
    
    const [deployer] = await ethers.getSigners();
    console.log("🔑 Deploying with account:", deployer.address);
    
    const balance = await deployer.getBalance();
    console.log("💰 Account balance:", ethers.utils.formatEther(balance), "FLR");
    
    if (balance.lt(ethers.utils.parseEther("0.1"))) {
        console.log("⚠️  Low balance warning: You may need more test FLR tokens");
        console.log("🚰 Get test tokens from: https://coston2-faucet.towolabs.com/");
    }
    
    const deploymentResults = {
        timestamp: new Date().toISOString(),
        network: "Flare Coston2 Testnet",
        deployer: deployer.address,
        contracts: {}
    };

    try {
        // 1. Deploy XERA Token (Flare representation)
        console.log("\n📦 Step 1: Deploying XERA Token...");
        const XERAToken = await ethers.getContractFactory("XERAToken");
        const xeraToken = await XERAToken.deploy();
        await xeraToken.deployed();
        
        deploymentResults.contracts.xeraToken = {
            name: "XERA Real Estate India",
            address: xeraToken.address,
            symbol: "XERA",
            network: "Flare",
            type: "Platform Token"
        };
        
        console.log("✅ XERA Token deployed to:", xeraToken.address);
        console.log("   Name:", await xeraToken.name());
        console.log("   Symbol:", await xeraToken.symbol());
        console.log("   Total Supply:", ethers.utils.formatEther(await xeraToken.totalSupply()));

        // 2. Deploy PROPX Token Factory
        console.log("\n📦 Step 2: Deploying PROPX Token Factory...");
        const PROPXTokenFactory = await ethers.getContractFactory("PROPXTokenFactory");
        const propxFactory = await PROPXTokenFactory.deploy();
        await propxFactory.deployed();
        
        deploymentResults.contracts.propxFactory = {
            name: "PROPX Token Factory",
            address: propxFactory.address,
            network: "Flare",
            type: "Factory Contract"
        };
        
        console.log("✅ PROPX Factory deployed to:", propxFactory.address);

        // 3. Core contracts deployed successfully
        console.log("\n✅ Step 3: Core contracts deployed successfully");
        console.log("   Developer registration and token creation can be done via frontend");

        // 4. Save deployment results
        const configPath = '../frontend/src/config/deployedContracts.json';
        fs.writeFileSync(configPath, JSON.stringify(deploymentResults, null, 2));
        
        const backendConfigPath = '../backend/src/config/deployedContracts.json';
        fs.writeFileSync(backendConfigPath, JSON.stringify(deploymentResults, null, 2));
        
        console.log("\n🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!");
        console.log("=" .repeat(60));
        
        console.log("\n📊 Deployed Contracts Summary:");
        console.log("🔷 XERA Token:", deploymentResults.contracts.xeraToken.address);
        console.log("🏭 PROPX Factory:", deploymentResults.contracts.propxFactory.address);
        
        console.log("\n🔗 Network Information:");
        console.log("   Network: Flare Coston2 Testnet");
        console.log("   Chain ID: 114");
        console.log("   Explorer: https://coston2-explorer.flare.network/");
        
        console.log("\n📁 Configuration files updated:");
        console.log("   Frontend:", configPath);
        console.log("   Backend:", backendConfigPath);
        
        console.log("\n🚰 Faucet for test tokens:");
        console.log("   https://coston2-faucet.towolabs.com/");
        
        return deploymentResults;
        
    } catch (error) {
        console.error("❌ Deployment failed:", error.message);
        throw error;
    }
}

// Execute deployment
if (require.main === module) {
    main()
        .then((results) => {
            console.log("\n✅ Deployment script completed successfully!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Deployment script failed:", error);
            process.exit(1);
        });
}

module.exports = { main };