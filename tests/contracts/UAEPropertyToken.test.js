const { expect } = require('chai');
const { ethers } = require('hardhat');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');

describe('UAE Property Token Contract', function () {
  // Test fixtures
  async function deployUAEPropertyTokenFixture() {
    const [owner, reraCompliance, dldRegistry, developer, investor1, investor2, amlOfficer] = await ethers.getSigners();

    // Deploy UAE Compliance contract first
    const UAECompliance = await ethers.getContractFactory('UAECompliance');
    const uaeCompliance = await UAECompliance.deploy();

    // Deploy UAE Property Token contract
    const UAEPropertyToken = await ethers.getContractFactory('UAEPropertyToken');
    const baseURI = 'https://api.propexchange.ae/tokens/uae/';
    
    const uaePropertyToken = await UAEPropertyToken.deploy(
      baseURI,
      reraCompliance.address,
      dldRegistry.address
    );

    // Setup initial roles in compliance contract
    const RERA_OFFICER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('RERA_OFFICER_ROLE'));
    const DLD_OFFICER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('DLD_OFFICER_ROLE'));
    const KYC_OFFICER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('KYC_OFFICER_ROLE'));
    const AML_OFFICER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('AML_OFFICER_ROLE'));

    await uaeCompliance.grantRole(RERA_OFFICER_ROLE, reraCompliance.address);
    await uaeCompliance.grantRole(DLD_OFFICER_ROLE, dldRegistry.address);
    await uaeCompliance.grantRole(KYC_OFFICER_ROLE, owner.address);
    await uaeCompliance.grantRole(AML_OFFICER_ROLE, amlOfficer.address);

    // Verify developer
    await uaeCompliance.connect(reraCompliance).verifyDeveloper(developer.address, 'DEV-001');

    // Setup KYC/AML for investors
    await uaePropertyToken.approveKYC(investor1.address, true);
    await uaePropertyToken.clearAML(investor1.address, true);
    await uaePropertyToken.setUserTier(investor1.address, 1); // Premium tier

    await uaePropertyToken.approveKYC(investor2.address, true);
    await uaePropertyToken.clearAML(investor2.address, true);
    await uaePropertyToken.setUserTier(investor2.address, 0); // Retail tier

    return {
      uaePropertyToken,
      uaeCompliance,
      owner,
      reraCompliance,
      dldRegistry,
      developer,
      investor1,
      investor2,
      amlOfficer,
      baseURI
    };
  }

  describe('Deployment and Initialization', function () {
    it('Should deploy with correct initial parameters', async function () {
      const { uaePropertyToken, reraCompliance, dldRegistry, baseURI } = await loadFixture(deployUAEPropertyTokenFixture);

      expect(await uaePropertyToken.JURISDICTION()).to.equal('UAE');
      expect(await uaePropertyToken.REGULATORY_AUTHORITY()).to.equal('RERA');
      expect(await uaePropertyToken.reraCompliance()).to.equal(reraCompliance.address);
      expect(await uaePropertyToken.dldRegistry()).to.equal(dldRegistry.address);
    });

    it('Should have correct supported currencies', async function () {
      const { uaePropertyToken } = await loadFixture(deployUAEPropertyTokenFixture);

      expect(await uaePropertyToken.supportedCurrencies('AED')).to.be.true;
      expect(await uaePropertyToken.supportedCurrencies('USD')).to.be.true;
      expect(await uaePropertyToken.supportedCurrencies('EUR')).to.be.true;
      expect(await uaePropertyToken.supportedCurrencies('SAR')).to.be.true;
      expect(await uaePropertyToken.supportedCurrencies('QAR')).to.be.true;
      expect(await uaePropertyToken.supportedCurrencies('KWD')).to.be.true;
      expect(await uaePropertyToken.supportedCurrencies('INVALID')).to.be.false;
    });

    it('Should have correct initial exchange rates', async function () {
      const { uaePropertyToken } = await loadFixture(deployUAEPropertyTokenFixture);

      const aedRate = await uaePropertyToken.exchangeRates('AED');
      const usdRate = await uaePropertyToken.exchangeRates('USD');
      const eurRate = await uaePropertyToken.exchangeRates('EUR');

      expect(aedRate).to.equal(ethers.utils.parseEther('1')); // 1 AED = 1 AED
      expect(usdRate).to.be.gt(0);
      expect(eurRate).to.be.gt(0);
    });
  });

  describe('Property Listing', function () {
    it('Should allow owner to list a property', async function () {
      const { uaePropertyToken, developer } = await loadFixture(deployUAEPropertyTokenFixture);

      const propertyData = {
        reraNumber: 'RERA-DXB-2024-001',
        dldNumber: 'DLD-001-2024-DOWNTOWN',
        propertyAddress: 'Burj Khalifa District, Downtown Dubai',
        zone: 'Downtown Dubai',
        emirate: 'Dubai',
        totalValue: ethers.utils.parseEther('10000000'), // 10M AED
        totalSupply: 10000,
        propertyType: 0, // APARTMENT
        fundingDurationDays: 90
      };

      const tx = await uaePropertyToken.listProperty(
        propertyData.reraNumber,
        propertyData.dldNumber,
        propertyData.propertyAddress,
        propertyData.zone,
        propertyData.emirate,
        propertyData.totalValue,
        propertyData.totalSupply,
        propertyData.propertyType,
        developer.address,
        propertyData.fundingDurationDays
      );

      const receipt = await tx.wait();
      const event = receipt.events?.find(e => e.event === 'PropertyListed');
      
      expect(event).to.not.be.undefined;
      expect(event.args.reraNumber).to.equal(propertyData.reraNumber);
      expect(event.args.developer).to.equal(developer.address);
      expect(event.args.totalValue).to.equal(propertyData.totalValue);

      // Verify property details
      const tokenId = event.args.tokenId;
      const propertyDetails = await uaePropertyToken.getPropertyDetails(tokenId);
      
      expect(propertyDetails.reraNumber).to.equal(propertyData.reraNumber);
      expect(propertyDetails.zone).to.equal(propertyData.zone);
      expect(propertyDetails.totalValue).to.equal(propertyData.totalValue);
    });

    it('Should require verified developer to list property', async function () {
      const { uaePropertyToken } = await loadFixture(deployUAEPropertyTokenFixture);
      const [, , , , , , unverifiedDeveloper] = await ethers.getSigners();

      await expect(
        uaePropertyToken.listProperty(
          'RERA-DXB-2024-002',
          'DLD-002-2024-MARINA',
          'Dubai Marina',
          'Dubai Marina',
          'Dubai',
          ethers.utils.parseEther('5000000'),
          5000,
          0,
          unverifiedDeveloper.address,
          90
        )
      ).to.be.revertedWith('Developer not RERA verified');
    });

    it('Should not allow duplicate RERA numbers', async function () {
      const { uaePropertyToken, developer } = await loadFixture(deployUAEPropertyTokenFixture);

      // List first property
      await uaePropertyToken.listProperty(
        'RERA-DXB-2024-001',
        'DLD-001-2024-DOWNTOWN',
        'Property 1',
        'Downtown Dubai',
        'Dubai',
        ethers.utils.parseEther('10000000'),
        10000,
        0,
        developer.address,
        90
      );

      // Attempt to list with same RERA number
      await expect(
        uaePropertyToken.listProperty(
          'RERA-DXB-2024-001', // Same RERA number
          'DLD-002-2024-MARINA',
          'Property 2',
          'Dubai Marina',
          'Dubai',
          ethers.utils.parseEther('5000000'),
          5000,
          0,
          developer.address,
          90
        )
      ).to.be.reverted;
    });
  });

  describe('RERA and DLD Compliance', function () {
    let tokenId;

    beforeEach(async function () {
      const { uaePropertyToken, developer } = await loadFixture(deployUAEPropertyTokenFixture);
      
      const tx = await uaePropertyToken.listProperty(
        'RERA-DXB-2024-001',
        'DLD-001-2024-DOWNTOWN',
        'Test Property',
        'Downtown Dubai',
        'Dubai',
        ethers.utils.parseEther('10000000'),
        10000,
        0,
        developer.address,
        90
      );

      const receipt = await tx.wait();
      tokenId = receipt.events?.find(e => e.event === 'PropertyListed')?.args.tokenId;
    });

    it('Should allow RERA compliance officer to approve property', async function () {
      const { uaePropertyToken, reraCompliance } = await loadFixture(deployUAEPropertyTokenFixture);
      
      await expect(
        uaePropertyToken.connect(reraCompliance).approvePropertyRERA(tokenId, true)
      ).to.emit(uaePropertyToken, 'RERAApprovalUpdated')
        .withArgs(tokenId, true, 'RERA-DXB-2024-001');
    });

    it('Should allow DLD registry to register property', async function () {
      const { uaePropertyToken, dldRegistry } = await loadFixture(deployUAEPropertyTokenFixture);
      
      await expect(
        uaePropertyToken.connect(dldRegistry).registerPropertyDLD(tokenId, true)
      ).to.emit(uaePropertyToken, 'DLDRegistrationUpdated')
        .withArgs(tokenId, true, 'DLD-001-2024-DOWNTOWN');
    });

    it('Should require both RERA and DLD approval for fundraising', async function () {
      const { uaePropertyToken, reraCompliance, dldRegistry } = await loadFixture(deployUAEPropertyTokenFixture);
      
      // Property should be in PENDING_APPROVAL initially
      let details = await uaePropertyToken.getPropertyDetails(tokenId);
      expect(details.status).to.equal(0); // PENDING_APPROVAL

      // Approve only RERA
      await uaePropertyToken.connect(reraCompliance).approvePropertyRERA(tokenId, true);
      details = await uaePropertyToken.getPropertyDetails(tokenId);
      expect(details.status).to.equal(0); // Still PENDING_APPROVAL

      // Register with DLD
      await uaePropertyToken.connect(dldRegistry).registerPropertyDLD(tokenId, true);
      details = await uaePropertyToken.getPropertyDetails(tokenId);
      expect(details.status).to.equal(1); // FUNDRAISING
    });
  });

  describe('Investment Flow', function () {
    let tokenId;

    beforeEach(async function () {
      const { uaePropertyToken, developer, reraCompliance, dldRegistry } = await loadFixture(deployUAEPropertyTokenFixture);
      
      // List property
      const tx = await uaePropertyToken.listProperty(
        'RERA-DXB-2024-001',
        'DLD-001-2024-DOWNTOWN',
        'Test Property',
        'Downtown Dubai',
        'Dubai',
        ethers.utils.parseEther('10000000'), // 10M AED
        10000, // 10K tokens
        0,
        developer.address,
        90
      );

      const receipt = await tx.wait();
      tokenId = receipt.events?.find(e => e.event === 'PropertyListed')?.args.tokenId;

      // Approve property for fundraising
      await uaePropertyToken.connect(reraCompliance).approvePropertyRERA(tokenId, true);
      await uaePropertyToken.connect(dldRegistry).registerPropertyDLD(tokenId, true);
    });

    it('Should allow KYC-approved users to invest', async function () {
      const { uaePropertyToken, investor1 } = await loadFixture(deployUAEPropertyTokenFixture);
      
      const investmentAmount = ethers.utils.parseEther('100000'); // 100K AED
      const tokenAmount = 100; // 100 tokens

      await expect(
        uaePropertyToken.connect(investor1).invest(
          tokenId,
          tokenAmount,
          'AED',
          investmentAmount
        )
      ).to.emit(uaePropertyToken, 'PropertyInvestment')
        .withArgs(tokenId, investor1.address, investmentAmount, tokenAmount, 'AED');

      // Check token balance
      const balance = await uaePropertyToken.balanceOf(investor1.address, tokenId);
      expect(balance).to.equal(tokenAmount);
    });

    it('Should handle multi-currency investments', async function () {
      const { uaePropertyToken, investor1 } = await loadFixture(deployUAEPropertyTokenFixture);
      
      const usdAmount = ethers.utils.parseEther('27200'); // ~100K AED
      const tokenAmount = 100;

      await expect(
        uaePropertyToken.connect(investor1).invest(
          tokenId,
          tokenAmount,
          'USD',
          usdAmount
        )
      ).to.emit(uaePropertyToken, 'PropertyInvestment');

      const balance = await uaePropertyToken.balanceOf(investor1.address, tokenId);
      expect(balance).to.equal(tokenAmount);
    });

    it('Should reject investment from non-KYC users', async function () {
      const { uaePropertyToken } = await loadFixture(deployUAEPropertyTokenFixture);
      const [, , , , , , , nonKycUser] = await ethers.getSigners();
      
      const investmentAmount = ethers.utils.parseEther('100000');
      const tokenAmount = 100;

      await expect(
        uaePropertyToken.connect(nonKycUser).invest(
          tokenId,
          tokenAmount,
          'AED',
          investmentAmount
        )
      ).to.be.revertedWith('KYC approval required');
    });

    it('Should enforce investment tier limits', async function () {
      const { uaePropertyToken, investor2 } = await loadFixture(deployUAEPropertyTokenFixture);
      
      // investor2 is retail tier, try to invest above retail limit
      const excessiveAmount = ethers.utils.parseEther('600000'); // 600K AED (above retail limit)
      const tokenAmount = 600;

      await expect(
        uaePropertyToken.connect(investor2).invest(
          tokenId,
          tokenAmount,
          'AED',
          excessiveAmount
        )
      ).to.be.revertedWith('Above maximum retail investment');
    });

    it('Should check token availability', async function () {
      const { uaePropertyToken, investor1 } = await loadFixture(deployUAEPropertyTokenFixture);
      
      const excessiveTokens = 15000; // More than total supply (10K)
      const investmentAmount = ethers.utils.parseEther('15000000');

      await expect(
        uaePropertyToken.connect(investor1).invest(
          tokenId,
          excessiveTokens,
          'AED',
          investmentAmount
        )
      ).to.be.revertedWith('Insufficient tokens available');
    });

    it('Should emit PropertyFunded event when fully funded', async function () {
      const { uaePropertyToken, investor1 } = await loadFixture(deployUAEPropertyTokenFixture);
      
      const allTokens = 10000; // All available tokens
      const totalInvestment = ethers.utils.parseEther('10000000'); // Full property value

      await expect(
        uaePropertyToken.connect(investor1).invest(
          tokenId,
          allTokens,
          'AED',
          totalInvestment
        )
      ).to.emit(uaePropertyToken, 'PropertyFunded')
        .withArgs(tokenId, totalInvestment, 1); // 1 investor

      const details = await uaePropertyToken.getPropertyDetails(tokenId);
      expect(details.status).to.equal(2); // FUNDED
    });
  });

  describe('Dividend Distribution', function () {
    let tokenId;

    beforeEach(async function () {
      const { uaePropertyToken, developer, reraCompliance, dldRegistry, investor1, investor2 } = await loadFixture(deployUAEPropertyTokenFixture);
      
      // Setup property and get it funded
      const tx = await uaePropertyToken.listProperty(
        'RERA-DXB-2024-001',
        'DLD-001-2024-DOWNTOWN',
        'Test Property',
        'Downtown Dubai',
        'Dubai',
        ethers.utils.parseEther('10000000'),
        10000,
        0,
        developer.address,
        90
      );

      const receipt = await tx.wait();
      tokenId = receipt.events?.find(e => e.event === 'PropertyListed')?.args.tokenId;

      await uaePropertyToken.connect(reraCompliance).approvePropertyRERA(tokenId, true);
      await uaePropertyToken.connect(dldRegistry).registerPropertyDLD(tokenId, true);

      // Make investments
      await uaePropertyToken.connect(investor1).invest(tokenId, 6000, 'AED', ethers.utils.parseEther('6000000'));
      await uaePropertyToken.connect(investor2).invest(tokenId, 4000, 'AED', ethers.utils.parseEther('4000000'));

      // Update property status to generating income
      await uaePropertyToken.updatePropertyStatus(tokenId, 4); // GENERATING_INCOME
    });

    it('Should distribute dividends proportionally', async function () {
      const { uaePropertyToken } = await loadFixture(deployUAEPropertyTokenFixture);
      
      const totalDividend = ethers.utils.parseEther('500000'); // 500K AED dividend

      await expect(
        uaePropertyToken.distributeDividends(tokenId, totalDividend)
      ).to.emit(uaePropertyToken, 'DividendDistributed')
        .withArgs(tokenId, totalDividend, ethers.utils.parseEther('50')); // 50 AED per token
    });

    it('Should allow investors to claim dividends', async function () {
      const { uaePropertyToken, investor1 } = await loadFixture(deployUAEPropertyTokenFixture);
      
      const totalDividend = ethers.utils.parseEther('500000');
      await uaePropertyToken.distributeDividends(tokenId, totalDividend);

      await expect(
        uaePropertyToken.connect(investor1).claimDividends(tokenId)
      ).to.emit(uaePropertyToken, 'DividendClaimed')
        .withArgs(tokenId, investor1.address, ethers.utils.parseEther('300000')); // 6000 tokens * 50 AED
    });

    it('Should track claimed dividends correctly', async function () {
      const { uaePropertyToken, investor1 } = await loadFixture(deployUAEPropertyTokenFixture);
      
      const totalDividend = ethers.utils.parseEther('500000');
      await uaePropertyToken.distributeDividends(tokenId, totalDividend);
      await uaePropertyToken.connect(investor1).claimDividends(tokenId);

      // Try to claim again - should revert
      await expect(
        uaePropertyToken.connect(investor1).claimDividends(tokenId)
      ).to.be.revertedWith('No dividends to claim');
    });
  });

  describe('Currency Management', function () {
    it('Should allow owner to update exchange rates', async function () {
      const { uaePropertyToken } = await loadFixture(deployUAEPropertyTokenFixture);
      
      const newUsdRate = ethers.utils.parseEther('0.270'); // New USD rate
      
      await uaePropertyToken.updateExchangeRate('USD', newUsdRate);
      
      const updatedRate = await uaePropertyToken.exchangeRates('USD');
      expect(updatedRate).to.equal(newUsdRate);
    });

    it('Should allow owner to add new supported currencies', async function () {
      const { uaePropertyToken } = await loadFixture(deployUAEPropertyTokenFixture);
      
      const jpyRate = ethers.utils.parseEther('0.025'); // JPY rate
      
      await uaePropertyToken.addSupportedCurrency('JPY', jpyRate);
      
      expect(await uaePropertyToken.supportedCurrencies('JPY')).to.be.true;
      expect(await uaePropertyToken.exchangeRates('JPY')).to.equal(jpyRate);
    });

    it('Should convert currency amounts correctly', async function () {
      const { uaePropertyToken } = await loadFixture(deployUAEPropertyTokenFixture);
      
      const usdAmount = ethers.utils.parseEther('1000');
      const expectedAed = await uaePropertyToken.convertToAED('USD', usdAmount);
      
      expect(expectedAed).to.be.gt(usdAmount); // Should be more AED than USD
    });

    it('Should reject updates for unsupported currencies', async function () {
      const { uaePropertyToken } = await loadFixture(deployUAEPropertyTokenFixture);
      
      await expect(
        uaePropertyToken.updateExchangeRate('INVALID', ethers.utils.parseEther('1'))
      ).to.be.revertedWith('Currency not supported');
    });
  });

  describe('Security and Access Control', function () {
    it('Should restrict property listing to owner only', async function () {
      const { uaePropertyToken, developer, investor1 } = await loadFixture(deployUAEPropertyTokenFixture);
      
      await expect(
        uaePropertyToken.connect(investor1).listProperty(
          'RERA-DXB-2024-002',
          'DLD-002-2024-MARINA',
          'Unauthorized Property',
          'Dubai Marina',
          'Dubai',
          ethers.utils.parseEther('5000000'),
          5000,
          0,
          developer.address,
          90
        )
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('Should restrict RERA approval to compliance officer', async function () {
      const { uaePropertyToken, investor1 } = await loadFixture(deployUAEPropertyTokenFixture);
      
      await expect(
        uaePropertyToken.connect(investor1).approvePropertyRERA(1, true)
      ).to.be.revertedWith('Only RERA compliance officer');
    });

    it('Should restrict dividend distribution to owner', async function () {
      const { uaePropertyToken, investor1 } = await loadFixture(deployUAEPropertyTokenFixture);
      
      await expect(
        uaePropertyToken.connect(investor1).distributeDividends(1, ethers.utils.parseEther('100000'))
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('Should pause and unpause contract', async function () {
      const { uaePropertyToken, investor1 } = await loadFixture(deployUAEPropertyTokenFixture);
      
      // Pause contract
      await uaePropertyToken.pause();
      
      // Try to invest while paused
      await expect(
        uaePropertyToken.connect(investor1).invest(1, 100, 'AED', ethers.utils.parseEther('100000'))
      ).to.be.revertedWith('Pausable: paused');
      
      // Unpause
      await uaePropertyToken.unpause();
      
      // Should work after unpause (though will fail for other reasons in this test)
      await expect(
        uaePropertyToken.connect(investor1).invest(1, 100, 'AED', ethers.utils.parseEther('100000'))
      ).to.not.be.revertedWith('Pausable: paused');
    });
  });

  describe('Token Transfer Compliance', function () {
    let tokenId;

    beforeEach(async function () {
      const { uaePropertyToken, developer, reraCompliance, dldRegistry, investor1 } = await loadFixture(deployUAEPropertyTokenFixture);
      
      // Setup funded property
      const tx = await uaePropertyToken.listProperty(
        'RERA-DXB-2024-001',
        'DLD-001-2024-DOWNTOWN',
        'Test Property',
        'Downtown Dubai',
        'Dubai',
        ethers.utils.parseEther('10000000'),
        10000,
        0,
        developer.address,
        90
      );

      const receipt = await tx.wait();
      tokenId = receipt.events?.find(e => e.event === 'PropertyListed')?.args.tokenId;

      await uaePropertyToken.connect(reraCompliance).approvePropertyRERA(tokenId, true);
      await uaePropertyToken.connect(dldRegistry).registerPropertyDLD(tokenId, true);
      
      await uaePropertyToken.connect(investor1).invest(tokenId, 1000, 'AED', ethers.utils.parseEther('1000000'));
    });

    it('Should require KYC approval for token recipients', async function () {
      const { uaePropertyToken, investor1 } = await loadFixture(deployUAEPropertyTokenFixture);
      const [, , , , , , , , , nonKycUser] = await ethers.getSigners();
      
      await expect(
        uaePropertyToken.connect(investor1).safeTransferFrom(
          investor1.address,
          nonKycUser.address,
          tokenId,
          100,
          '0x'
        )
      ).to.be.revertedWith('Recipient must be KYC approved');
    });

    it('Should allow transfers between KYC-approved users', async function () {
      const { uaePropertyToken, investor1, investor2 } = await loadFixture(deployUAEPropertyTokenFixture);
      
      await expect(
        uaePropertyToken.connect(investor1).safeTransferFrom(
          investor1.address,
          investor2.address,
          tokenId,
          100,
          '0x'
        )
      ).to.not.be.reverted;
      
      const investor2Balance = await uaePropertyToken.balanceOf(investor2.address, tokenId);
      expect(investor2Balance).to.equal(100);
    });
  });

  describe('Gas Optimization', function () {
    it('Should have reasonable gas costs for property listing', async function () {
      const { uaePropertyToken, developer } = await loadFixture(deployUAEPropertyTokenFixture);
      
      const tx = await uaePropertyToken.listProperty(
        'RERA-DXB-2024-GAS',
        'DLD-GAS-2024-TEST',
        'Gas Test Property',
        'Test Zone',
        'Dubai',
        ethers.utils.parseEther('1000000'),
        1000,
        0,
        developer.address,
        90
      );

      const receipt = await tx.wait();
      
      // Gas should be under 500k for property listing
      expect(receipt.gasUsed).to.be.lt(500000);
    });

    it('Should have reasonable gas costs for investment', async function () {
      const { uaePropertyToken, developer, reraCompliance, dldRegistry, investor1 } = await loadFixture(deployUAEPropertyTokenFixture);
      
      // Setup property
      const listTx = await uaePropertyToken.listProperty(
        'RERA-DXB-2024-GAS',
        'DLD-GAS-2024-TEST',
        'Gas Test Property',
        'Test Zone',
        'Dubai',
        ethers.utils.parseEther('1000000'),
        1000,
        0,
        developer.address,
        90
      );

      const listReceipt = await listTx.wait();
      const tokenId = listReceipt.events?.find(e => e.event === 'PropertyListed')?.args.tokenId;

      await uaePropertyToken.connect(reraCompliance).approvePropertyRERA(tokenId, true);
      await uaePropertyToken.connect(dldRegistry).registerPropertyDLD(tokenId, true);

      const investTx = await uaePropertyToken.connect(investor1).invest(
        tokenId,
        100,
        'AED',
        ethers.utils.parseEther('100000')
      );

      const investReceipt = await investTx.wait();
      
      // Investment gas should be under 300k
      expect(investReceipt.gasUsed).to.be.lt(300000);
    });
  });
});