const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("UAE Cross-Chain Operations", function () {
  let uaePropertyToken, uaeOracle, uaeStaking;
  let owner, investor1, investor2, bridge;
  let propertyId;

  beforeEach(async function () {
    [owner, investor1, investor2, bridge] = await ethers.getSigners();

    // Deploy UAE Oracle
    const UAEPriceOracle = await ethers.getContractFactory("UAEPriceOracle");
    uaeOracle = await UAEPriceOracle.deploy();
    await uaeOracle.deployed();

    // Deploy UAE Property Token
    const UAEPropertyToken = await ethers.getContractFactory("UAEPropertyToken");
    uaePropertyToken = await UAEPropertyToken.deploy(
      "https://api.propxchange.ae/metadata/uae/{id}.json",
      owner.address, // compliance (simplified)
      owner.address  // dld registry
    );
    await uaePropertyToken.deployed();

    // Deploy UAE Staking
    const UAEStaking = await ethers.getContractFactory("UAEStaking");
    uaeStaking = await UAEStaking.deploy(
      uaePropertyToken.address,
      owner.address, // reward token
      86400, // 1 day
      1000   // 10% base rate
    );
    await uaeStaking.deployed();

    // Setup basic property
    const tx = await uaePropertyToken.listProperty(
      "RERA-CROSS-001",
      "DLD-CROSS-001",
      "Cross-Chain Test Property",
      "Dubai Marina",
      "Dubai",
      ethers.utils.parseEther("1000000"), // 1M AED
      1000, // 1000 tokens
      0, // APARTMENT
      owner.address,
      90 // 90 days
    );
    
    const receipt = await tx.wait();
    const event = receipt.events.find(e => e.event === 'PropertyListed');
    propertyId = event.args.tokenId;

    // Add XERA as supported currency first
    await uaeOracle.addSupportedCurrency("XERA", ethers.utils.parseUnits("1.500", 18));

    // Setup exchange rates
    await uaeOracle.batchUpdateExchangeRates(
      ["USD", "EUR", "GBP", "XERA"],
      [
        ethers.utils.parseUnits("0.272", 18), // USD
        ethers.utils.parseUnits("0.248", 18), // EUR
        ethers.utils.parseUnits("0.214", 18), // GBP
        ethers.utils.parseUnits("1.500", 18)  // XERA (custom rate)
      ]
    );
  });

  describe("Multi-Currency Settlement Simulation", function () {
    it("Should simulate AED to USD cross-chain settlement", async function () {
      const aedAmount = ethers.utils.parseEther("100000"); // 100K AED
      
      // Convert AED to USD
      const usdAmount = await uaeOracle.convertFromAED(aedAmount, "USD");
      
      console.log(`\n💱 Cross-Chain Settlement Simulation:`);
      console.log(`Source: ${ethers.utils.formatEther(aedAmount)} AED`);
      console.log(`Target: ${ethers.utils.formatEther(usdAmount)} USD`);
      
      expect(usdAmount).to.be.gt(0);
      
      // Simulate cross-chain message
      const crossChainData = {
        sourceChain: "flare", // or polygon
        targetChain: "ethereum",
        sourceAmount: aedAmount,
        targetAmount: usdAmount,
        targetCurrency: "USD",
        propertyId: propertyId,
        investor: investor1.address,
        timestamp: Math.floor(Date.now() / 1000)
      };
      
      console.log(`📨 Cross-chain message:`, {
        sourceChain: crossChainData.sourceChain,
        targetChain: crossChainData.targetChain,
        conversion: `${ethers.utils.formatEther(aedAmount)} AED → ${ethers.utils.formatEther(usdAmount)} USD`
      });
      
      expect(crossChainData.targetAmount).to.equal(usdAmount);
      console.log(`✅ Cross-chain settlement data validated`);
    });

    it("Should simulate AED to XERA token bridge", async function () {
      const aedAmount = ethers.utils.parseEther("50000"); // 50K AED
      
      // Convert AED to XERA tokens
      const xeraAmount = await uaeOracle.convertFromAED(aedAmount, "XERA");
      
      console.log(`\n🌉 Token Bridge Simulation:`);
      console.log(`Source: ${ethers.utils.formatEther(aedAmount)} AED`);
      console.log(`Target: ${ethers.utils.formatEther(xeraAmount)} XERA`);
      
      // Simulate bridge operation
      const bridgeData = {
        operation: "BRIDGE_TO_XRPL",
        sourceToken: "UAE_PROPERTY_TOKEN", 
        targetToken: "XERA",
        sourceAmount: aedAmount,
        targetAmount: xeraAmount,
        destinationAddress: investor1.address,
        propertyTokenId: propertyId,
        bridgeFee: ethers.utils.parseEther("100"), // 100 AED bridge fee
        estimatedTime: 300 // 5 minutes
      };
      
      console.log(`🔗 Bridge operation:`, {
        operation: bridgeData.operation,
        conversion: `${ethers.utils.formatEther(aedAmount)} AED → ${ethers.utils.formatEther(xeraAmount)} XERA`,
        fee: `${ethers.utils.formatEther(bridgeData.bridgeFee)} AED`,
        time: `${bridgeData.estimatedTime}s`
      });
      
      expect(xeraAmount).to.be.gt(0);
      console.log(`✅ XERA bridge simulation validated`);
    });

    it("Should test multi-hop currency conversion", async function () {
      const aedAmount = ethers.utils.parseEther("25000"); // 25K AED
      
      // Multi-hop: AED → USD → EUR
      const usdAmount = await uaeOracle.convertFromAED(aedAmount, "USD");
      const eurFromUsd = await uaeOracle.convertToAED(usdAmount, "USD");
      const eurAmount = await uaeOracle.convertFromAED(eurFromUsd, "EUR");
      
      console.log(`\n🔄 Multi-Hop Conversion:`);
      console.log(`Step 1: ${ethers.utils.formatEther(aedAmount)} AED → ${ethers.utils.formatEther(usdAmount)} USD`);
      console.log(`Step 2: ${ethers.utils.formatEther(usdAmount)} USD → ${ethers.utils.formatEther(eurAmount)} EUR`);
      
      // Test conversion accuracy (should be close due to rounding)
      const directEurAmount = await uaeOracle.convertFromAED(aedAmount, "EUR");
      const conversionDiff = Math.abs(
        parseFloat(ethers.utils.formatEther(eurAmount)) - 
        parseFloat(ethers.utils.formatEther(directEurAmount))
      );
      
      console.log(`Direct AED→EUR: ${ethers.utils.formatEther(directEurAmount)} EUR`);
      console.log(`Multi-hop diff: ${conversionDiff.toFixed(6)} EUR`);
      
      expect(conversionDiff).to.be.lt(0.01); // Less than 1 cent difference
      console.log(`✅ Multi-hop conversion validated`);
    });
  });

  describe("Cross-Chain Investment Flow", function () {
    it("Should simulate cross-chain property investment", async function () {
      // Simulate user on Ethereum wanting to invest in UAE property on Flare
      const investmentFlow = {
        step1: {
          chain: "ethereum",
          action: "USER_INITIATES_INVESTMENT",
          currency: "USD",
          amount: ethers.utils.parseEther("27200"), // $27,200
          targetProperty: propertyId
        },
        step2: {
          chain: "bridge",
          action: "CROSS_CHAIN_MESSAGE",
          conversion: "USD_TO_AED",
          sourceAmount: ethers.utils.parseEther("27200"),
          targetAmount: null // calculated below
        },
        step3: {
          chain: "flare", // or polygon where UAE contracts are deployed
          action: "EXECUTE_INVESTMENT",
          currency: "AED",
          amount: null // calculated below
        }
      };

      // Calculate USD to AED conversion
      const aedAmount = await uaeOracle.convertToAED(
        investmentFlow.step1.amount, 
        "USD"
      );
      
      investmentFlow.step2.targetAmount = aedAmount;
      investmentFlow.step3.amount = aedAmount;

      console.log(`\n🌍 Cross-Chain Investment Flow:`);
      console.log(`Step 1 (Ethereum): User initiates ${ethers.utils.formatEther(investmentFlow.step1.amount)} USD investment`);
      console.log(`Step 2 (Bridge): Convert to ${ethers.utils.formatEther(aedAmount)} AED`);
      console.log(`Step 3 (Flare): Execute property investment`);

      // Simulate investment execution
      const tokens = aedAmount.div(ethers.utils.parseEther("1000")); // 1000 AED per token
      
      console.log(`📊 Investment Details:`);
      console.log(`Property ID: ${propertyId}`);
      console.log(`Investment: ${ethers.utils.formatEther(aedAmount)} AED`);
      console.log(`Tokens: ${tokens.toString()}`);
      
      expect(aedAmount).to.be.gt(0);
      expect(tokens).to.be.gt(0);
      console.log(`✅ Cross-chain investment flow validated`);
    });

    it("Should simulate cross-chain dividend distribution", async function () {
      // Setup: simulate property generating dividends
      const totalDividendAED = ethers.utils.parseEther("50000"); // 50K AED dividends
      const tokensOwned = 100; // User owns 100 tokens
      const totalTokens = 1000; // Total property tokens
      
      const userDividendShare = totalDividendAED.mul(tokensOwned).div(totalTokens);
      
      console.log(`\n💰 Cross-Chain Dividend Distribution:`);
      console.log(`Total Property Dividend: ${ethers.utils.formatEther(totalDividendAED)} AED`);
      console.log(`User Tokens: ${tokensOwned}/${totalTokens}`);
      console.log(`User Dividend Share: ${ethers.utils.formatEther(userDividendShare)} AED`);

      // Simulate distribution to different currencies across chains
      const distributions = {
        ethereum_usd: await uaeOracle.convertFromAED(userDividendShare, "USD"),
        polygon_eur: await uaeOracle.convertFromAED(userDividendShare, "EUR"),
        bsc_native: userDividendShare, // Keep as AED equivalent
        xrpl_xera: await uaeOracle.convertFromAED(userDividendShare, "XERA")
      };

      console.log(`📤 Multi-Chain Distribution:`);
      console.log(`Ethereum (USD): ${ethers.utils.formatEther(distributions.ethereum_usd)} USD`);
      console.log(`Polygon (EUR): ${ethers.utils.formatEther(distributions.polygon_eur)} EUR`);
      console.log(`BSC (AED): ${ethers.utils.formatEther(distributions.bsc_native)} AED`);
      console.log(`XRPL (XERA): ${ethers.utils.formatEther(distributions.xrpl_xera)} XERA`);

      // Validate all distributions sum correctly (in AED terms)
      const usdBackToAed = await uaeOracle.convertToAED(distributions.ethereum_usd, "USD");
      const eurBackToAed = await uaeOracle.convertToAED(distributions.polygon_eur, "EUR");
      const xeraBackToAed = await uaeOracle.convertToAED(distributions.xrpl_xera, "XERA");

      expect(usdBackToAed).to.be.closeTo(userDividendShare, ethers.utils.parseEther("1"));
      expect(eurBackToAed).to.be.closeTo(userDividendShare, ethers.utils.parseEther("1"));
      expect(xeraBackToAed).to.be.closeTo(userDividendShare, ethers.utils.parseEther("1"));

      console.log(`✅ Cross-chain dividend distribution validated`);
    });
  });

  describe("Oracle Price Feed Integration", function () {
    it("Should test oracle price freshness for cross-chain operations", async function () {
      const currencies = ["USD", "EUR", "GBP", "XERA"];
      
      console.log(`\n🔍 Oracle Price Freshness Check:`);
      
      for (const currency of currencies) {
        const isFresh = await uaeOracle.isPriceFresh(currency);
        const [rate, lastUpdated, isActive] = await uaeOracle.getExchangeRate(currency);
        
        console.log(`${currency}: Fresh=${isFresh}, Rate=${ethers.utils.formatEther(rate)}, Active=${isActive}`);
        expect(isFresh).to.be.true;
        expect(isActive).to.be.true;
      }

      // Test oracle health
      const [totalCurrencies, activeCurrencies, stalePrices] = await uaeOracle.getOracleHealth();
      console.log(`Oracle Health: ${activeCurrencies}/${totalCurrencies} active, ${stalePrices} stale`);
      
      expect(stalePrices).to.equal(0);
      console.log(`✅ Oracle price feeds are fresh and healthy`);
    });

    it("Should simulate cross-chain arbitrage detection", async function () {
      // Simulate different exchange rates on different chains
      const aedAmount = ethers.utils.parseEther("10000"); // 10K AED
      
      const chainRates = {
        flare_usd: await uaeOracle.convertFromAED(aedAmount, "USD"),
        ethereum_usd: await uaeOracle.convertFromAED(aedAmount, "USD"),
        polygon_eur: await uaeOracle.convertFromAED(aedAmount, "EUR"),
        bsc_usdt: await uaeOracle.convertFromAED(aedAmount, "USD") // Assume USDT ≈ USD
      };

      console.log(`\n⚖️  Cross-Chain Arbitrage Analysis:`);
      console.log(`Base Amount: ${ethers.utils.formatEther(aedAmount)} AED`);
      
      for (const [chain, amount] of Object.entries(chainRates)) {
        const [chainName, currency] = chain.split('_');
        console.log(`${chainName.toUpperCase()}: ${ethers.utils.formatEther(amount)} ${currency.toUpperCase()}`);
      }

      // Check for arbitrage opportunities (simplified - assume 1% difference threshold)
      const usdRates = [chainRates.flare_usd, chainRates.ethereum_usd, chainRates.bsc_usdt];
      const maxUsd = Math.max(...usdRates.map(r => parseFloat(ethers.utils.formatEther(r))));
      const minUsd = Math.min(...usdRates.map(r => parseFloat(ethers.utils.formatEther(r))));
      const spread = ((maxUsd - minUsd) / minUsd) * 100;

      console.log(`USD Spread across chains: ${spread.toFixed(4)}%`);
      
      if (spread > 1.0) {
        console.log(`🚨 Arbitrage opportunity detected: ${spread.toFixed(2)}% spread`);
      } else {
        console.log(`✅ No significant arbitrage opportunities (${spread.toFixed(2)}% spread)`);
      }

      expect(spread).to.be.lt(5.0); // Reasonable spread threshold
      console.log(`✅ Cross-chain rate analysis completed`);
    });
  });

  describe("Gas Optimization for Cross-Chain", function () {
    it("Should measure gas costs for cross-chain operations", async function () {
      console.log(`\n⛽ Cross-Chain Gas Cost Analysis:`);

      // Measure oracle update costs
      const oracleUpdateTx = await uaeOracle.updateExchangeRate("USD", ethers.utils.parseUnits("0.273", 18));
      const oracleUpdateReceipt = await oracleUpdateTx.wait();
      console.log(`Oracle Update: ${oracleUpdateReceipt.gasUsed.toString()} gas`);

      // Measure batch oracle updates
      const batchUpdateTx = await uaeOracle.batchUpdateExchangeRates(
        ["USD", "EUR", "GBP"],
        [
          ethers.utils.parseUnits("0.272", 18),
          ethers.utils.parseUnits("0.248", 18),
          ethers.utils.parseUnits("0.214", 18)
        ]
      );
      const batchUpdateReceipt = await batchUpdateTx.wait();
      console.log(`Batch Update (3 currencies): ${batchUpdateReceipt.gasUsed.toString()} gas`);

      // Calculate gas per currency for batch
      const gasPerCurrency = batchUpdateReceipt.gasUsed.div(3);
      console.log(`Gas per currency (batch): ${gasPerCurrency.toString()} gas`);

      // Efficiency comparison
      const singleGas = oracleUpdateReceipt.gasUsed;
      const batchGasPerItem = gasPerCurrency;
      const efficiency = ((singleGas.sub(batchGasPerItem)).mul(100)).div(singleGas);
      
      console.log(`Batch efficiency: ${efficiency.toString()}% gas savings per item`);
      expect(efficiency).to.be.gt(0); // Batch should be more efficient

      console.log(`✅ Gas optimization analysis completed`);
    });
  });
});