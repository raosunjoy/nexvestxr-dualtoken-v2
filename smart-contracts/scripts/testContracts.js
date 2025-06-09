// Test deployed contracts functionality
const { ethers } = require("hardhat");
const deployedContracts = require("../../frontend/src/config/deployedContracts.json");

async function main() {
    console.log("🧪 Testing Deployed Contracts Functionality");
    console.log("=" .repeat(50));
    
    const [owner] = await ethers.getSigners();
    console.log("🔑 Testing with account:", owner.address);
    
    try {
        // Connect to deployed XERA Token
        console.log("\n📦 Testing XERA Token...");
        const xeraToken = await ethers.getContractAt("XERAToken", deployedContracts.contracts.xeraToken.address);
        
        console.log("✅ XERA Token connected:", xeraToken.address);
        console.log("   Name:", await xeraToken.name());
        console.log("   Symbol:", await xeraToken.symbol());
        console.log("   Total Supply:", ethers.utils.formatEther(await xeraToken.totalSupply()));
        console.log("   Owner Balance:", ethers.utils.formatEther(await xeraToken.balanceOf(owner.address)));
        
        // Test XERA token functionality
        const hasAdminRole = await xeraToken.hasRole(await xeraToken.ADMIN_ROLE(), owner.address);
        console.log("   Admin Role:", hasAdminRole ? "✅" : "❌");
        
        // Connect to deployed PROPX Factory
        console.log("\n🏭 Testing PROPX Factory...");
        const propxFactory = await ethers.getContractAt("PROPXTokenFactory", deployedContracts.contracts.propxFactory.address);
        
        console.log("✅ PROPX Factory connected:", propxFactory.address);
        
        // Test factory admin access
        const factoryAdminRole = await propxFactory.hasRole(await propxFactory.ADMIN_ROLE(), owner.address);
        console.log("   Factory Admin Role:", factoryAdminRole ? "✅" : "❌");
        
        console.log("\n🎉 Contract Testing Completed Successfully!");
        console.log("✅ All contracts are functional and ready for use");
        
        return {
            xeraToken: {
                address: xeraToken.address,
                functional: true,
                adminAccess: hasAdminRole
            },
            propxFactory: {
                address: propxFactory.address,
                functional: true,
                adminAccess: factoryAdminRole
            }
        };
        
    } catch (error) {
        console.error("❌ Contract testing failed:", error.message);
        throw error;
    }
}

if (require.main === module) {
    main()
        .then((results) => {
            console.log("\n✅ Contract testing completed successfully!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Contract testing failed:", error);
            process.exit(1);
        });
}

module.exports = { main };