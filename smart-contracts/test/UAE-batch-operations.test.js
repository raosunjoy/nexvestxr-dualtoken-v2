const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("UAE Batch Operations", function () {
  let uaeCompliance, uaePropertyToken, uaeStaking, uaeOracle;
  let owner, reraOfficer, kycOfficer, investor1, investor2, developer;
  let propertyIds = [];

  beforeEach(async function () {
    [owner, reraOfficer, kycOfficer, investor1, investor2, developer] = await ethers.getSigners();

    // Deploy UAE Compliance
    const UAECompliance = await ethers.getContractFactory("UAECompliance");
    uaeCompliance = await UAECompliance.deploy();
    await uaeCompliance.deployed();

    // Deploy UAE Property Token
    const UAEPropertyToken = await ethers.getContractFactory("UAEPropertyToken");
    uaePropertyToken = await UAEPropertyToken.deploy(
      "https://api.propxchange.ae/metadata/uae/{id}.json",
      uaeCompliance.address,
      owner.address
    );
    await uaePropertyToken.deployed();

    // Deploy UAE Staking
    const UAEStaking = await ethers.getContractFactory("UAEStaking");
    uaeStaking = await UAEStaking.deploy(
      uaePropertyToken.address,
      owner.address, // reward token (simplified)
      86400, // 1 day
      1000   // 10% base rate
    );
    await uaeStaking.deployed();

    // Deploy UAE Price Oracle
    const UAEPriceOracle = await ethers.getContractFactory("UAEPriceOracle");
    uaeOracle = await UAEPriceOracle.deploy();
    await uaeOracle.deployed();

    // Setup roles
    const RERA_OFFICER_ROLE = await uaeCompliance.RERA_OFFICER_ROLE();
    const KYC_OFFICER_ROLE = await uaeCompliance.KYC_OFFICER_ROLE();
    
    await uaeCompliance.grantRole(RERA_OFFICER_ROLE, reraOfficer.address);
    await uaeCompliance.grantRole(KYC_OFFICER_ROLE, kycOfficer.address);

    // Verify developer
    await uaeCompliance.connect(reraOfficer).verifyDeveloper(developer.address, true);
  });

  describe("Batch Property Operations", function () {
    it("Should batch create multiple UAE properties", async function () {
      const properties = [
        {
          reraNumber: "RERA-DXB-001-2024",
          dldNumber: "DLD-DT-001-2024",
          address: "Downtown Dubai, Burj Khalifa District",
          zone: "Downtown Dubai",
          emirate: "Dubai",
          totalValue: ethers.utils.parseEther("2500000"), // 2.5M AED
          totalSupply: 1000,
          propertyType: 0, // APARTMENT
          fundingDays: 90
        },
        {
          reraNumber: "RERA-DXB-002-2024",
          dldNumber: "DLD-MR-002-2024", 
          address: "Dubai Marina, Marina Walk",
          zone: "Dubai Marina",
          emirate: "Dubai",
          totalValue: ethers.utils.parseEther("4200000"), // 4.2M AED
          totalSupply: 2000,
          propertyType: 3, // PENTHOUSE
          fundingDays: 120
        },
        {
          reraNumber: "RERA-DXB-003-2024",
          dldNumber: "DLD-BB-003-2024",
          address: "Business Bay, Executive Heights", 
          zone: "Business Bay",
          emirate: "Dubai",
          totalValue: ethers.utils.parseEther("1800000"), // 1.8M AED
          totalSupply: 900,
          propertyType: 4, // OFFICE
          fundingDays: 60
        }
      ];

      // Batch create properties
      for (let i = 0; i < properties.length; i++) {
        const prop = properties[i];
        const tx = await uaePropertyToken.listProperty(
          prop.reraNumber,
          prop.dldNumber,
          prop.address,
          prop.zone,
          prop.emirate,
          prop.totalValue,
          prop.totalSupply,
          prop.propertyType,
          developer.address,
          prop.fundingDays
        );
        
        const receipt = await tx.wait();
        const event = receipt.events.find(e => e.event === 'PropertyListed');
        propertyIds.push(event.args.tokenId);
      }

      expect(propertyIds.length).to.equal(3);
      console.log(`✅ Created ${propertyIds.length} properties: ${propertyIds.join(', ')}`);
    });

    it("Should batch approve RERA compliance", async function () {
      // First create properties - skip if already created
      if (propertyIds.length === 0) {
        const properties = [
          {
            reraNumber: "RERA-DXB-001-2024",
            dldNumber: "DLD-DT-001-2024",
            address: "Downtown Dubai, Burj Khalifa District",
            zone: "Downtown Dubai",
            emirate: "Dubai",
            totalValue: ethers.utils.parseEther("2500000"),
            totalSupply: 1000,
            propertyType: 0,
            fundingDays: 90
          },
          {
            reraNumber: "RERA-DXB-002-2024",
            dldNumber: "DLD-MR-002-2024", 
            address: "Dubai Marina, Marina Walk",
            zone: "Dubai Marina",
            emirate: "Dubai",
            totalValue: ethers.utils.parseEther("4200000"),
            totalSupply: 2000,
            propertyType: 3,
            fundingDays: 120
          },
          {
            reraNumber: "RERA-DXB-003-2024",
            dldNumber: "DLD-BB-003-2024",
            address: "Business Bay, Executive Heights", 
            zone: "Business Bay",
            emirate: "Dubai",
            totalValue: ethers.utils.parseEther("1800000"),
            totalSupply: 900,
            propertyType: 4,
            fundingDays: 60
          }
        ];

        for (let i = 0; i < properties.length; i++) {
          const prop = properties[i];
          const tx = await uaePropertyToken.listProperty(
            prop.reraNumber,
            prop.dldNumber,
            prop.address,
            prop.zone,
            prop.emirate,
            prop.totalValue,
            prop.totalSupply,
            prop.propertyType,
            developer.address,
            prop.fundingDays
          );
          
          const receipt = await tx.wait();
          const event = receipt.events.find(e => e.event === 'PropertyListed');
          propertyIds.push(event.args.tokenId);
        }
      }

      // Batch approve RERA compliance
      const approvals = [
        {
          tokenId: propertyIds[0],
          registrationNumber: "RERA-DXB-001-2024",
          expiryDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year
          isActive: true,
          projectType: "Residential",
          developer: developer.address
        },
        {
          tokenId: propertyIds[1],
          registrationNumber: "RERA-DXB-002-2024", 
          expiryDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
          isActive: true,
          projectType: "Residential",
          developer: developer.address
        },
        {
          tokenId: propertyIds[2],
          registrationNumber: "RERA-DXB-003-2024",
          expiryDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
          isActive: true,
          projectType: "Commercial",
          developer: developer.address
        }
      ];

      for (const approval of approvals) {
        await uaeCompliance.connect(reraOfficer).updateRERACompliance(
          approval.tokenId,
          approval.registrationNumber,
          approval.expiryDate,
          approval.isActive,
          approval.projectType,
          approval.developer
        );
      }

      // Verify all are RERA compliant
      for (const tokenId of propertyIds) {
        const isCompliant = await uaeCompliance.checkRERACompliance(tokenId);
        expect(isCompliant).to.be.true;
      }

      console.log(`✅ RERA approved ${propertyIds.length} properties`);
    });

    it("Should batch update DLD registration", async function () {
      // Use the same propertyIds from previous tests to avoid duplication
      // Only create new properties if none exist
      
      // Use existing propertyIds from previous tests
      if (propertyIds.length === 0) {
        // If no properties exist, create them
        const properties = [
          {
            name: "DLD Test Property 1",
            location: "Dubai Marina",
            propertyType: 0, // RESIDENTIAL
            totalValue: ethers.utils.parseEther("5000000"),
            tokenPrice: ethers.utils.parseEther("500"),
            minimumInvestment: ethers.utils.parseEther("100000"),
            duration: 365,
            ipfsHash: "QmDLDTest1"
          },
          {
            name: "DLD Test Property 2", 
            location: "DIFC",
            propertyType: 1, // COMMERCIAL
            totalValue: ethers.utils.parseEther("10000000"),
            tokenPrice: ethers.utils.parseEther("1000"),
            minimumInvestment: ethers.utils.parseEther("200000"),
            duration: 365,
            ipfsHash: "QmDLDTest2"
          },
          {
            name: "DLD Test Property 3",
            location: "Downtown Dubai", 
            propertyType: 2, // INDUSTRIAL
            totalValue: ethers.utils.parseEther("8000000"),
            tokenPrice: ethers.utils.parseEther("800"),
            minimumInvestment: ethers.utils.parseEther("150000"),
            duration: 365,
            ipfsHash: "QmDLDTest3"
          }
        ];

        for (const property of properties) {
          const tx = await propxFactory.connect(developer).createPROPXToken(
            property.name,
            `Description for ${property.name}`,
            `TOK${propertyIds.length + 1}`,
            property.location,
            property.propertyType,
            property.totalValue.div(property.tokenPrice),
            property.tokenPrice,
            property.minimumInvestment,
            property.duration,
            property.ipfsHash
          );
          
          const receipt = await tx.wait();
          const event = receipt.events.find(e => e.event === 'PropertyListed');
          propertyIds.push(event.args.tokenId);
        }
      }

      // Batch update DLD registration
      const dldRegistrations = [
        {
          tokenId: propertyIds[0],
          titleDeedNumber: "DLD-DT-001-2024",
          plotNumber: "Plot-001-DT",
          district: "Downtown Dubai",
          isRegistered: true
        },
        {
          tokenId: propertyIds[1],
          titleDeedNumber: "DLD-MR-002-2024",
          plotNumber: "Plot-002-MR", 
          district: "Dubai Marina",
          isRegistered: true
        },
        {
          tokenId: propertyIds[2],
          titleDeedNumber: "DLD-BB-003-2024",
          plotNumber: "Plot-003-BB",
          district: "Business Bay", 
          isRegistered: true
        }
      ];

      for (const registration of dldRegistrations) {
        await uaeCompliance.updateDLDCompliance(
          registration.tokenId,
          registration.titleDeedNumber,
          registration.plotNumber,
          registration.district,
          registration.isRegistered
        );
      }

      // Verify all are DLD registered
      for (const tokenId of propertyIds) {
        const isCompliant = await uaeCompliance.checkDLDCompliance(tokenId);
        expect(isCompliant).to.be.true;
      }

      console.log(`✅ DLD registered ${propertyIds.length} properties`);
    });
  });

  describe("Batch User Operations", function () {
    it("Should batch approve KYC for multiple users", async function () {
      const users = [investor1, investor2];
      const expiryDate = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60); // 1 year

      // Batch KYC approval
      for (let i = 0; i < users.length; i++) {
        await uaeCompliance.connect(kycOfficer).updateUserKYC(
          users[i].address,
          2, // STANDARD level
          expiryDate,
          "Dubai",
          true, // UAE resident
          true  // GCC resident
        );
      }

      // Verify all users are KYC approved
      for (const user of users) {
        const [isValid, level] = await uaeCompliance.checkUserKYC(user.address);
        expect(isValid).to.be.true;
        expect(level).to.equal(2); // STANDARD
      }

      console.log(`✅ KYC approved ${users.length} users`);
    });

    it("Should batch approve AML for multiple users", async function () {
      const users = [investor1, investor2];

      // Batch AML approval
      for (const user of users) {
        await uaeCompliance.updateUserAML(user.address, 0); // LOW risk
      }

      // Verify all users have acceptable AML risk
      for (const user of users) {
        const [isAcceptable, risk] = await uaeCompliance.checkUserAML(user.address);
        expect(isAcceptable).to.be.true;
        expect(risk).to.equal(0); // LOW
      }

      console.log(`✅ AML cleared ${users.length} users`);
    });
  });

  describe("Batch Oracle Operations", function () {
    it("Should batch update exchange rates", async function () {
      const currencies = ["USD", "EUR", "GBP", "SAR", "QAR"];
      const rates = [
        ethers.utils.parseUnits("0.272", 18), // USD
        ethers.utils.parseUnits("0.248", 18), // EUR  
        ethers.utils.parseUnits("0.214", 18), // GBP
        ethers.utils.parseUnits("1.020", 18), // SAR
        ethers.utils.parseUnits("0.990", 18)  // QAR
      ];

      // Batch update rates
      await uaeOracle.batchUpdateExchangeRates(currencies, rates);

      // Verify all rates are updated
      for (let i = 0; i < currencies.length; i++) {
        const [rate, lastUpdated, isActive] = await uaeOracle.getExchangeRate(currencies[i]);
        expect(rate).to.equal(rates[i]);
        expect(isActive).to.be.true;
      }

      console.log(`✅ Updated ${currencies.length} exchange rates`);
    });

    it("Should batch update property prices", async function () {
      // Create properties first if not already created
      if (propertyIds.length === 0) {
        const properties = [
          {
            reraNumber: "RERA-DXB-001-2024",
            dldNumber: "DLD-DT-001-2024",
            address: "Downtown Dubai, Burj Khalifa District",
            zone: "Downtown Dubai",
            emirate: "Dubai",
            totalValue: ethers.utils.parseEther("2500000"),
            totalSupply: 1000,
            propertyType: 0,
            fundingDays: 90
          },
          {
            reraNumber: "RERA-DXB-002-2024",
            dldNumber: "DLD-MR-002-2024", 
            address: "Dubai Marina, Marina Walk",
            zone: "Dubai Marina",
            emirate: "Dubai",
            totalValue: ethers.utils.parseEther("4200000"),
            totalSupply: 2000,
            propertyType: 3,
            fundingDays: 120
          },
          {
            reraNumber: "RERA-DXB-003-2024",
            dldNumber: "DLD-BB-003-2024",
            address: "Business Bay, Executive Heights", 
            zone: "Business Bay",
            emirate: "Dubai",
            totalValue: ethers.utils.parseEther("1800000"),
            totalSupply: 900,
            propertyType: 4,
            fundingDays: 60
          }
        ];

        for (let i = 0; i < properties.length; i++) {
          const prop = properties[i];
          const tx = await uaePropertyToken.listProperty(
            prop.reraNumber,
            prop.dldNumber,
            prop.address,
            prop.zone,
            prop.emirate,
            prop.totalValue,
            prop.totalSupply,
            prop.propertyType,
            developer.address,
            prop.fundingDays
          );
          
          const receipt = await tx.wait();
          const event = receipt.events.find(e => e.event === 'PropertyListed');
          propertyIds.push(event.args.tokenId);
        }
      }

      const priceUpdates = [
        {
          propertyId: propertyIds[0],
          pricePerSqFt: ethers.utils.parseEther("2500"), // 2500 AED per sq ft
          totalValue: ethers.utils.parseEther("2500000"),
          zone: "Downtown Dubai",
          emirate: "Dubai",
          isVerified: true
        },
        {
          propertyId: propertyIds[1], 
          pricePerSqFt: ethers.utils.parseEther("2100"), // 2100 AED per sq ft
          totalValue: ethers.utils.parseEther("4200000"),
          zone: "Dubai Marina",
          emirate: "Dubai",
          isVerified: true
        },
        {
          propertyId: propertyIds[2],
          pricePerSqFt: ethers.utils.parseEther("2000"), // 2000 AED per sq ft
          totalValue: ethers.utils.parseEther("1800000"),
          zone: "Business Bay", 
          emirate: "Dubai",
          isVerified: true
        }
      ];

      // Batch update property prices
      for (const update of priceUpdates) {
        await uaeOracle.updatePropertyPrice(
          update.propertyId,
          update.pricePerSqFt,
          update.totalValue,
          update.zone,
          update.emirate,
          update.isVerified
        );
      }

      // Verify all prices are updated
      for (const update of priceUpdates) {
        const [pricePerSqFt, totalValue, lastUpdated, zone, emirate, isVerified] = 
          await uaeOracle.getPropertyPrice(update.propertyId);
        
        expect(pricePerSqFt).to.equal(update.pricePerSqFt);
        expect(totalValue).to.equal(update.totalValue);
        expect(isVerified).to.be.true;
      }

      console.log(`✅ Updated prices for ${priceUpdates.length} properties`);
    });
  });

  describe("Batch Investment Operations", function () {
    it("Should validate batch investments", async function () {
      // Setup properties if not already created
      if (propertyIds.length === 0) {
        const properties = [
          {
            reraNumber: "RERA-DXB-001-2024",
            dldNumber: "DLD-DT-001-2024",
            address: "Downtown Dubai, Burj Khalifa District",
            zone: "Downtown Dubai",
            emirate: "Dubai",
            totalValue: ethers.utils.parseEther("2500000"),
            totalSupply: 1000,
            propertyType: 0,
            fundingDays: 90
          },
          {
            reraNumber: "RERA-DXB-002-2024",
            dldNumber: "DLD-MR-002-2024", 
            address: "Dubai Marina, Marina Walk",
            zone: "Dubai Marina",
            emirate: "Dubai",
            totalValue: ethers.utils.parseEther("4200000"),
            totalSupply: 2000,
            propertyType: 3,
            fundingDays: 120
          },
          {
            reraNumber: "RERA-DXB-003-2024",
            dldNumber: "DLD-BB-003-2024",
            address: "Business Bay, Executive Heights", 
            zone: "Business Bay",
            emirate: "Dubai",
            totalValue: ethers.utils.parseEther("1800000"),
            totalSupply: 900,
            propertyType: 4,
            fundingDays: 60
          }
        ];

        for (let i = 0; i < properties.length; i++) {
          const prop = properties[i];
          const tx = await uaePropertyToken.listProperty(
            prop.reraNumber,
            prop.dldNumber,
            prop.address,
            prop.zone,
            prop.emirate,
            prop.totalValue,
            prop.totalSupply,
            prop.propertyType,
            developer.address,
            prop.fundingDays
          );
          
          const receipt = await tx.wait();
          const event = receipt.events.find(e => e.event === 'PropertyListed');
          propertyIds.push(event.args.tokenId);
        }
      }

      // Setup compliance for properties
      for (let i = 0; i < propertyIds.length; i++) {
        await uaeCompliance.connect(reraOfficer).updateRERACompliance(
          propertyIds[i],
          `RERA-DXB-00${i+1}-2024`,
          Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
          true,
          "Test",
          developer.address
        );
        
        await uaeCompliance.updateDLDCompliance(
          propertyIds[i],
          `DLD-TEST-00${i+1}-2024`,
          `Plot-00${i+1}`,
          "Test District",
          true
        );
      }

      // Setup user compliance
      const expiryDate = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);
      await uaeCompliance.connect(kycOfficer).updateUserKYC(
        investor1.address,
        2, // STANDARD
        expiryDate,
        "Dubai",
        true,
        true
      );
      await uaeCompliance.updateUserAML(investor1.address, 0); // LOW risk

      // Approve KYC and AML for property token contract
      await uaePropertyToken.approveKYC(investor1.address, true);
      await uaePropertyToken.clearAML(investor1.address, true);
      await uaePropertyToken.setUserTier(investor1.address, 1); // PREMIUM

      // Batch validate investments
      const investments = [
        {
          user: investor1.address,
          propertyId: propertyIds[0], 
          amount: ethers.utils.parseEther("100000") // 100K AED
        },
        {
          user: investor1.address,
          propertyId: propertyIds[1],
          amount: ethers.utils.parseEther("200000") // 200K AED  
        },
        {
          user: investor1.address,
          propertyId: propertyIds[2],
          amount: ethers.utils.parseEther("150000") // 150K AED
        }
      ];

      // Validate each investment
      for (const investment of investments) {
        const [isValid, reason] = await uaeCompliance.validateInvestment(
          investment.user,
          investment.propertyId,
          investment.amount
        );
        
        expect(isValid).to.be.true;
        console.log(`✅ Investment validated: ${ethers.utils.formatEther(investment.amount)} AED in property ${investment.propertyId}`);
      }

      console.log(`✅ Validated ${investments.length} batch investments`);
    });
  });

  describe("Performance and Gas Optimization", function () {
    it("Should measure gas costs for batch operations", async function () {
      console.log("\n📊 Gas Cost Analysis:");

      // Measure property creation gas
      const propertyTx = await uaePropertyToken.listProperty(
        "RERA-TEST-001",
        "DLD-TEST-001", 
        "Test Property Address",
        "Test Zone",
        "Dubai",
        ethers.utils.parseEther("1000000"),
        1000,
        0,
        developer.address,
        90
      );
      const propertyReceipt = await propertyTx.wait();
      console.log(`Property Creation: ${propertyReceipt.gasUsed.toString()} gas`);

      // Measure RERA approval gas
      const reraTokenId = await uaePropertyToken._tokenIds ? 
        await uaePropertyToken._tokenIds() : 1;
      const reraTx = await uaeCompliance.connect(reraOfficer).updateRERACompliance(
        reraTokenId,
        "RERA-TEST-001",
        Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
        true,
        "Test",
        developer.address
      );
      const reraReceipt = await reraTx.wait();
      console.log(`RERA Approval: ${reraReceipt.gasUsed.toString()} gas`);

      // Measure KYC approval gas
      const kycTx = await uaeCompliance.connect(kycOfficer).updateUserKYC(
        investor1.address,
        2,
        Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
        "Dubai",
        true,
        true
      );
      const kycReceipt = await kycTx.wait();
      console.log(`KYC Approval: ${kycReceipt.gasUsed.toString()} gas`);

      // Measure batch exchange rate update gas
      const batchRatesTx = await uaeOracle.batchUpdateExchangeRates(
        ["USD", "EUR"],
        [ethers.utils.parseUnits("0.272", 18), ethers.utils.parseUnits("0.248", 18)]
      );
      const batchRatesReceipt = await batchRatesTx.wait();
      console.log(`Batch Exchange Rates (2): ${batchRatesReceipt.gasUsed.toString()} gas`);

      console.log("✅ Gas analysis completed");
    });

    it("Should test oracle health and staleness", async function () {
      // Update some rates
      await uaeOracle.batchUpdateExchangeRates(
        ["USD", "EUR", "GBP"],
        [
          ethers.utils.parseUnits("0.272", 18),
          ethers.utils.parseUnits("0.248", 18), 
          ethers.utils.parseUnits("0.214", 18)
        ]
      );

      // Check oracle health
      const [totalCurrencies, activeCurrencies, stalePrices] = await uaeOracle.getOracleHealth();
      
      console.log(`\n🔍 Oracle Health Check:`);
      console.log(`Total Currencies: ${totalCurrencies.toString()}`);
      console.log(`Active Currencies: ${activeCurrencies.toString()}`);
      console.log(`Stale Prices: ${stalePrices.toString()}`);

      expect(activeCurrencies.toNumber()).to.be.greaterThan(0);
      console.log("✅ Oracle health check passed");
    });
  });
});