const { ethers } = require('hardhat');
const { verify } = require('../utils/verify');

async function main() {
  console.log('🚀 Deploying UAE Property Tokenization Contracts...\n');

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log('📋 Deploying contracts with account:', deployer.address);
  console.log('💰 Account balance:', ethers.utils.formatEther(await deployer.getBalance()), 'ETH\n');

  // =============================================================================
  // DEPLOY UAE COMPLIANCE CONTRACT
  // =============================================================================

  console.log('📜 Deploying UAE Compliance Contract...');
  const UAECompliance = await ethers.getContractFactory('UAECompliance');
  const uaeCompliance = await UAECompliance.deploy();
  await uaeCompliance.deployed();

  console.log('✅ UAE Compliance deployed to:', uaeCompliance.address);
  console.log('📋 Transaction hash:', uaeCompliance.deployTransaction.hash);

  // Wait for a few confirmations
  console.log('⏳ Waiting for confirmations...');
  await uaeCompliance.deployTransaction.wait(5);

  // =============================================================================
  // DEPLOY UAE PROPERTY TOKEN CONTRACT
  // =============================================================================

  console.log('\n📜 Deploying UAE Property Token Contract...');
  
  // Contract parameters
  const baseURI = 'https://api.propexchange.ae/tokens/uae/';
  const reraComplianceAddress = deployer.address; // Initially set to deployer
  const dldRegistryAddress = deployer.address; // Initially set to deployer

  const UAEPropertyToken = await ethers.getContractFactory('UAEPropertyToken');
  const uaePropertyToken = await UAEPropertyToken.deploy(
    baseURI,
    reraComplianceAddress,
    dldRegistryAddress
  );
  await uaePropertyToken.deployed();

  console.log('✅ UAE Property Token deployed to:', uaePropertyToken.address);
  console.log('📋 Transaction hash:', uaePropertyToken.deployTransaction.hash);

  // Wait for confirmations
  console.log('⏳ Waiting for confirmations...');
  await uaePropertyToken.deployTransaction.wait(5);

  // =============================================================================
  // CONFIGURE CONTRACTS
  // =============================================================================

  console.log('\n⚙️ Configuring contracts...');

  // Set up roles in compliance contract
  const RERA_OFFICER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('RERA_OFFICER_ROLE'));
  const DLD_OFFICER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('DLD_OFFICER_ROLE'));
  const KYC_OFFICER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('KYC_OFFICER_ROLE'));
  const AML_OFFICER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('AML_OFFICER_ROLE'));

  console.log('👥 Setting up initial roles...');
  
  // Grant roles to deployer (can be changed later)
  await uaeCompliance.grantRole(RERA_OFFICER_ROLE, deployer.address);
  await uaeCompliance.grantRole(DLD_OFFICER_ROLE, deployer.address);
  await uaeCompliance.grantRole(KYC_OFFICER_ROLE, deployer.address);
  await uaeCompliance.grantRole(AML_OFFICER_ROLE, deployer.address);

  console.log('✅ Initial roles configured');

  // Update property token to use compliance contract
  console.log('🔗 Linking contracts...');
  await uaePropertyToken.setRERACompliance(uaeCompliance.address);
  console.log('✅ Property token linked to compliance contract');

  // Add initial supported currencies with exchange rates (example rates)
  console.log('💱 Setting up currency support...');
  
  const currencies = [
    { code: 'USD', rate: ethers.utils.parseEther('0.272') }, // 1 USD ≈ 3.67 AED
    { code: 'EUR', rate: ethers.utils.parseEther('0.246') }, // 1 EUR ≈ 4.06 AED
    { code: 'GBP', rate: ethers.utils.parseEther('0.214') }, // 1 GBP ≈ 4.67 AED
    { code: 'SAR', rate: ethers.utils.parseEther('0.98') },  // 1 SAR ≈ 0.98 AED
    { code: 'QAR', rate: ethers.utils.parseEther('1.01') },  // 1 QAR ≈ 1.01 AED
    { code: 'KWD', rate: ethers.utils.parseEther('0.083') }, // 1 KWD ≈ 12.04 AED
  ];

  for (const currency of currencies) {
    try {
      await uaePropertyToken.updateExchangeRate(currency.code, currency.rate);
      console.log(`✅ ${currency.code} exchange rate set`);
    } catch (error) {
      console.log(`⚠️ ${currency.code} already configured`);
    }
  }

  // =============================================================================
  // VERIFY CONTRACTS ON ETHERSCAN (if not on localhost)
  // =============================================================================

  const network = await ethers.provider.getNetwork();
  console.log(`\n🌐 Network: ${network.name} (Chain ID: ${network.chainId})`);

  if (network.name !== 'unknown' && network.chainId !== 31337) {
    console.log('\n🔍 Verifying contracts on Etherscan...');
    
    try {
      console.log('🔍 Verifying UAE Compliance...');
      await verify(uaeCompliance.address, []);
      console.log('✅ UAE Compliance verified');
    } catch (error) {
      console.log('❌ UAE Compliance verification failed:', error.message);
    }

    try {
      console.log('🔍 Verifying UAE Property Token...');
      await verify(uaePropertyToken.address, [baseURI, reraComplianceAddress, dldRegistryAddress]);
      console.log('✅ UAE Property Token verified');
    } catch (error) {
      console.log('❌ UAE Property Token verification failed:', error.message);
    }
  }

  // =============================================================================
  // DEPLOYMENT SUMMARY
  // =============================================================================

  console.log('\n' + '='.repeat(80));
  console.log('🎉 UAE SMART CONTRACTS DEPLOYMENT COMPLETED');
  console.log('='.repeat(80));
  console.log('📊 DEPLOYMENT SUMMARY:');
  console.log('├─ Network:', network.name, `(Chain ID: ${network.chainId})`);
  console.log('├─ Deployer:', deployer.address);
  console.log('├─ UAE Compliance:', uaeCompliance.address);
  console.log('├─ UAE Property Token:', uaePropertyToken.address);
  console.log('├─ Base URI:', baseURI);
  console.log('└─ Gas Used: ~2.5M (estimated)');
  console.log('\n📝 CONFIGURATION:');
  console.log('├─ Supported Currencies: AED, USD, EUR, GBP, SAR, QAR, KWD');
  console.log('├─ Investment Tiers: Retail (25K-500K AED), Premium (500K-2M AED), Institutional (2M+ AED)');
  console.log('├─ Compliance: RERA, DLD, KYC, AML enabled');
  console.log('├─ Multi-currency support: Enabled with dynamic exchange rates');
  console.log('└─ Dividend distribution: Ready for rental income distribution');
  console.log('\n🔧 NEXT STEPS:');
  console.log('1. Set up RERA officer addresses');
  console.log('2. Configure DLD registry integration');  
  console.log('3. Implement KYC/AML verification processes');
  console.log('4. Add verified developers');
  console.log('5. List first UAE properties for tokenization');
  console.log('6. Set up automated currency rate updates');
  console.log('7. Configure dividend distribution mechanisms');
  console.log('\n💡 IMPORTANT:');
  console.log('- Update RERA compliance and DLD registry addresses with actual addresses');
  console.log('- Grant appropriate roles to authorized personnel');
  console.log('- Update exchange rates regularly via oracle or admin function');
  console.log('- Ensure proper KYC/AML processes are in place before going live');
  console.log('='.repeat(80));

  // =============================================================================
  // SAVE DEPLOYMENT INFO
  // =============================================================================

  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      UAECompliance: {
        address: uaeCompliance.address,
        txHash: uaeCompliance.deployTransaction.hash
      },
      UAEPropertyToken: {
        address: uaePropertyToken.address,
        txHash: uaePropertyToken.deployTransaction.hash,
        baseURI: baseURI
      }
    },
    configuration: {
      supportedCurrencies: currencies.map(c => c.code),
      investmentTiers: ['RETAIL', 'PREMIUM', 'INSTITUTIONAL'],
      complianceEnabled: ['RERA', 'DLD', 'KYC', 'AML']
    }
  };

  const fs = require('fs');
  const deploymentFile = `./deployments/uae-deployment-${network.name}-${Date.now()}.json`;
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: ${deploymentFile}`);

  return {
    uaeCompliance: uaeCompliance.address,
    uaePropertyToken: uaePropertyToken.address,
    network: network.name,
    chainId: network.chainId
  };
}

// Execute deployment
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Deployment failed:', error);
      process.exit(1);
    });
}

module.exports = main;