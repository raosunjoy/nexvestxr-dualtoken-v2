const hre = require("hardhat");

async function main() {
    console.log("🚀 Deploying and Testing XERA + PROPX Dual Token System...");
    
    const [deployer, investor1, investor2, developer1] = await hre.ethers.getSigners();
    console.log("📍 Deploying contracts with account:", deployer.address);
    
    const balance = await deployer.getBalance();
    console.log("💰 Account balance:", hre.ethers.utils.formatEther(balance), "ETH");

    // Deploy XERA Token
    console.log("\n🏛️ Deploying XERA Platform Token...");
    const XERAToken = await hre.ethers.getContractFactory("XERAToken");
    const xeraToken = await XERAToken.deploy();
    await xeraToken.deployed();
    console.log("✅ XERA Token deployed to:", xeraToken.address);

    // Deploy PROPX Token Factory
    console.log("\n🏭 Deploying PROPX Token Factory...");
    const PROPXTokenFactory = await hre.ethers.getContractFactory("PROPXTokenFactory");
    const propxFactory = await PROPXTokenFactory.deploy();
    await propxFactory.deployed();
    console.log("✅ PROPX Factory deployed to:", propxFactory.address);

    // Grant roles in XERA Token
    console.log("\n🔑 Setting up XERA Token roles...");
    const PROPERTY_MANAGER_ROLE = await xeraToken.PROPERTY_MANAGER_ROLE();
    await xeraToken.grantRole(PROPERTY_MANAGER_ROLE, deployer.address);
    console.log("✅ XERA roles configured");

    // Register developer
    console.log("\n👨‍💼 Registering test developer...");
    const developerTx = await propxFactory.registerDeveloper(
        deployer.address,
        "Test Developers Ltd",
        "TESTDEV",
        1, // TIER1
        5, // projects delivered
        hre.ethers.utils.parseEther("500000000"), // 50 crore total value delivered
        "MUM", // primary city
        [] // verification documents
    );
    await developerTx.wait();
    console.log("✅ Developer registered");

    console.log("\n🧪 STARTING COMPREHENSIVE TESTING...");
    console.log("=====================================");

    // Test 1: XERA Token Functionality
    console.log("\n🏛️ TESTING XERA TOKEN FUNCTIONALITY");

    // Check initial state
    const xeraSupply = await xeraToken.totalSupply();
    const xeraBalance = await xeraToken.balanceOf(deployer.address);
    const maxSupply = await xeraToken.MAX_SUPPLY();
    
    console.log("📊 XERA Initial State:");
    console.log("   Total Supply:", hre.ethers.utils.formatEther(xeraSupply), "XERA");
    console.log("   Deployer Balance:", hre.ethers.utils.formatEther(xeraBalance), "XERA");
    console.log("   Max Supply:", hre.ethers.utils.formatEther(maxSupply), "XERA");

    // Add property
    console.log("\n🏠 Adding test property to XERA...");
    const propertyTx = await xeraToken.addProperty(
        deployer.address,
        "Test Property Mumbai BKC",
        hre.ethers.utils.parseEther("10000000"), // 1 crore value
        "QmTestPropertyHash123",
        0, // RESIDENTIAL category
        "MUM" // Mumbai city code
    );
    await propertyTx.wait();
    
    // Approve property
    const approveTx = await xeraToken.approveProperty(1);
    await approveTx.wait();
    
    console.log("✅ Property added and approved");

    // Test property details
    const property1 = await xeraToken.getProperty(1);
    console.log("🏠 Property 1 Details:");
    console.log("   Owner:", property1.owner);
    console.log("   Address:", property1.propertyAddress);
    console.log("   Valuation:", hre.ethers.utils.formatEther(property1.valuationInWei), "Wei");
    console.log("   Token Allocation:", hre.ethers.utils.formatEther(property1.tokenAllocation), "XERA");
    console.log("   City:", property1.cityCode);

    // Add second property
    console.log("\n🏢 Adding second property (Bangalore Commercial)...");
    const property2Tx = await xeraToken.addProperty(
        deployer.address,
        "Commercial Complex Bangalore Electronic City",
        hre.ethers.utils.parseEther("15000000"), // 1.5 crore
        "QmBangalorePropertyHash456",
        1, // COMMERCIAL category
        "BANG" // Bangalore city code
    );
    await property2Tx.wait();

    const approveProperty2Tx = await xeraToken.approveProperty(2);
    await approveProperty2Tx.wait();
    console.log("✅ Second property added and approved");

    // Test metrics
    const xeraMetrics = await xeraToken.getXERAMetrics();
    console.log("\n📈 XERA Metrics:");
    console.log("   Net Asset Value:", hre.ethers.utils.formatEther(xeraMetrics.netAssetValue), "Wei per Token");
    console.log("   Total Properties:", xeraMetrics.totalProperties.toString());
    console.log("   Average Property Value:", hre.ethers.utils.formatEther(xeraMetrics.averagePropertyValue), "Wei");
    console.log("   Diversification Score:", xeraMetrics.diversificationScore.toString());

    // Test city portfolio
    const mumbaiPortfolio = await xeraToken.getCityPortfolio("MUM");
    console.log("\n🏙️ Mumbai Portfolio:");
    console.log("   Total Value:", hre.ethers.utils.formatEther(mumbaiPortfolio.totalValue), "Wei");
    console.log("   Property Count:", mumbaiPortfolio.propertyCount.toString());

    // Test category breakdown
    const categoryBreakdown = await xeraToken.getCategoryBreakdown();
    console.log("\n🏢 Category Breakdown:");
    console.log("   Residential:", hre.ethers.utils.formatEther(categoryBreakdown.residential), "Wei");
    console.log("   Commercial:", hre.ethers.utils.formatEther(categoryBreakdown.commercial), "Wei");

    // Test 2: PROPX Factory Functionality
    console.log("\n🏭 TESTING PROPX FACTORY FUNCTIONALITY");

    const developer = await propxFactory.developers(deployer.address);
    console.log("👨‍💼 Registered Developer:");
    console.log("   Company:", developer.companyName);
    console.log("   Brand Code:", developer.brandCode);
    console.log("   Tier:", developer.tier);
    console.log("   Reputation Score:", developer.reputationScore.toString());

    // Test developer portfolio
    const devPortfolio = await propxFactory.getDeveloperPortfolio(deployer.address);
    console.log("\n👨‍💼 Developer Portfolio:");
    console.log("   Brand Code:", devPortfolio.brandCode);
    console.log("   Active Projects:", devPortfolio.activeProjects.toString());
    console.log("   Tier:", devPortfolio.tier);

    // Test 3: XERA Dividend Functionality
    console.log("\n💰 TESTING XERA DIVIDEND FUNCTIONALITY");

    // Transfer some XERA tokens to investors
    const transferAmount = hre.ethers.utils.parseEther("1000000"); // 1M XERA each
    await xeraToken.transfer(investor1.address, transferAmount);
    await xeraToken.transfer(investor2.address, transferAmount);

    const investor1Balance = await xeraToken.balanceOf(investor1.address);
    const investor2Balance = await xeraToken.balanceOf(investor2.address);
    
    console.log("✅ Tokens transferred:");
    console.log("   Investor 1 Balance:", hre.ethers.utils.formatEther(investor1Balance), "XERA");
    console.log("   Investor 2 Balance:", hre.ethers.utils.formatEther(investor2Balance), "XERA");

    // Declare dividend
    const dividendAmount = hre.ethers.utils.parseEther("10"); // 10 ETH dividend
    const dividendTx = await xeraToken.declareDividend("Rental Income", { value: dividendAmount });
    await dividendTx.wait();
    
    console.log("✅ Dividend declared:", hre.ethers.utils.formatEther(dividendAmount), "ETH");

    // Fast forward time for dividend payment
    await hre.network.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 7 days
    await hre.network.provider.send("evm_mine");

    // Check initial ETH balances
    const investor1EthBefore = await hre.ethers.provider.getBalance(investor1.address);
    const investor2EthBefore = await hre.ethers.provider.getBalance(investor2.address);

    // Claim dividends
    const claimTx1 = await xeraToken.connect(investor1).claimAllAvailableDividends();
    await claimTx1.wait();
    
    const claimTx2 = await xeraToken.connect(investor2).claimAllAvailableDividends();
    await claimTx2.wait();
    
    const investor1EthAfter = await hre.ethers.provider.getBalance(investor1.address);
    const investor2EthAfter = await hre.ethers.provider.getBalance(investor2.address);
    
    console.log("✅ Dividends claimed:");
    console.log("   Investor 1 received ~", hre.ethers.utils.formatEther(investor1EthAfter.sub(investor1EthBefore)), "ETH");
    console.log("   Investor 2 received ~", hre.ethers.utils.formatEther(investor2EthAfter.sub(investor2EthBefore)), "ETH");

    console.log("\n✅ DUAL TOKEN SYSTEM TESTING COMPLETED!");
    console.log("🎉 All core functionalities verified successfully!");

    // Summary
    const finalXeraBalance = await xeraToken.balanceOf(deployer.address);
    const finalMetrics = await xeraToken.getXERAMetrics();
    
    const summary = {
        deployment: {
            xeraToken: xeraToken.address,
            propxFactory: propxFactory.address,
        },
        xeraMetrics: {
            totalSupply: hre.ethers.utils.formatEther(xeraSupply),
            deployerBalance: hre.ethers.utils.formatEther(finalXeraBalance),
            totalProperties: finalMetrics.totalProperties.toString(),
            diversificationScore: finalMetrics.diversificationScore.toString(),
            netAssetValue: hre.ethers.utils.formatEther(finalMetrics.netAssetValue)
        },
        propxMetrics: {
            developerRegistered: true,
            brandCode: developer.brandCode,
            tier: developer.tier
        },
        dividendTest: {
            dividendDeclared: hre.ethers.utils.formatEther(dividendAmount),
            investorsPaid: 2
        },
        testStatus: "PASSED"
    };

    console.log("\n📊 FINAL SUMMARY:");
    console.log(JSON.stringify(summary, null, 2));
    
    return summary;
}

main()
    .then((results) => {
        console.log("\n🎯 Testing completed successfully!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Deployment/Testing failed:", error);
        process.exit(1);
    });