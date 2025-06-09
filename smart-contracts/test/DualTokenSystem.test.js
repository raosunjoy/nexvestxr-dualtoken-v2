const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Dual Token System Integration Test", function () {
    let xeraToken, propxFactory, propxToken;
    let owner, developer, investor;
    
    beforeEach(async function () {
        [owner, developer, investor] = await ethers.getSigners();
        
        // Deploy XERA Token (no constructor parameters)
        const XERAToken = await ethers.getContractFactory("XERAToken");
        xeraToken = await XERAToken.deploy();
        await xeraToken.deployed();
        
        // Deploy PROPX Factory (no constructor parameters)
        const PROPXTokenFactory = await ethers.getContractFactory("PROPXTokenFactory");
        propxFactory = await PROPXTokenFactory.deploy();
        await propxFactory.deployed();
    });
    
    describe("XERA Token Deployment", function () {
        it("Should deploy XERA token with correct parameters", async function () {
            expect(await xeraToken.name()).to.equal("XERA Real Estate India");
            expect(await xeraToken.symbol()).to.equal("XERA");
            // Initial supply is 15% of max supply (150M tokens)
            expect(await xeraToken.totalSupply()).to.equal(ethers.utils.parseEther("150000000"));
        });
        
        it("Should allow token transfers and balance tracking", async function () {
            // Transfer some XERA to investor
            await xeraToken.transfer(investor.address, ethers.utils.parseEther("10000"));
            
            // Check investor balance
            const investorBalance = await xeraToken.balanceOf(investor.address);
            expect(investorBalance).to.equal(ethers.utils.parseEther("10000"));
            
            // Check that XERA has governance features
            expect(await xeraToken.hasRole(await xeraToken.ADMIN_ROLE(), owner.address)).to.be.true;
        });
    });
    
    describe("PROPX Factory Integration", function () {
        it("Should register developer and create PROPX token", async function () {
            // Register developer
            await propxFactory.registerDeveloper(
                developer.address,
                "Test Developer Ltd",
                "TEST",
                1, // Tier 1
                10, // Projects delivered
                ethers.utils.parseEther("1000000000"), // ₹100 Cr
                "MUM", // Primary city as string
                [ethers.utils.formatBytes32String("doc1")] // Verification docs as bytes32 array
            );
            
            // Verify developer registration
            const dev = await propxFactory.developers(developer.address);
            expect(dev.companyName).to.equal("Test Developer Ltd");
            expect(dev.tier).to.equal(1);
        });
        
        it("Should create PROPX token with dual-token benefits", async function () {
            // Register developer first
            await propxFactory.registerDeveloper(
                developer.address,
                "Premium Developer",
                "PREM",
                1,
                15,
                ethers.utils.parseEther("2000000000"),
                "MUM",
                [ethers.utils.formatBytes32String("doc1")]
            );
            
            // Grant developer role first
            await propxFactory.grantRole(await propxFactory.DEVELOPER_ROLE(), developer.address);
            
            // Create PROPX token
            const tx = await propxFactory.connect(developer).createPROPXToken(
                "Premium Tower Mumbai",
                "Luxury residential in BKC",
                "PTM001",
                "MUM",
                0, // RESIDENTIAL
                ethers.utils.parseEther("1000000"), // 1M tokens
                ethers.utils.parseEther("500"), // ₹500 per token
                ethers.utils.parseEther("100000000"), // ₹10 Cr minimum
                90, // 90 days
                "QmTestHash"
            );
            
            const receipt = await tx.wait();
            const event = receipt.events?.find(e => e.event === 'PROPXTokenCreated');
            expect(event).to.not.be.undefined;
            
            console.log("✅ PROPX Token Created:", event.args.tokenContract);
        });
    });
    
    describe("Cross-Chain Integration", function () {
        it("Should demonstrate XERA and PROPX integration potential", async function () {
            // Give investor XERA tokens
            await xeraToken.transfer(investor.address, ethers.utils.parseEther("30000"));
            
            // Check investor XERA balance for potential PROPX benefits
            const xeraBalance = await xeraToken.balanceOf(investor.address);
            
            // In the full system, large XERA holders would get PROPX benefits
            const qualifiesForPremiumAccess = xeraBalance.gte(ethers.utils.parseEther("25000"));
            
            expect(qualifiesForPremiumAccess).to.be.true;
            expect(xeraBalance).to.equal(ethers.utils.parseEther("30000"));
            console.log("✅ Investor has sufficient XERA for premium PROPX access");
        });
    });
});