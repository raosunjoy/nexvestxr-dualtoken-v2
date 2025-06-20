# Blockchain & Smart Contracts Documentation

## Overview

NexVestXR V2 is a comprehensive dual-token real estate platform built on multiple blockchain networks, featuring advanced smart contracts for both Indian and UAE real estate markets. The platform utilizes a sophisticated architecture with XERA as the governance token and PROPX as the property-specific tokens.

## Architecture Overview

### Multi-Chain Deployment Strategy

The platform is deployed across multiple blockchain networks to ensure optimal performance, cost-effectiveness, and accessibility:

1. **Ethereum Mainnet** - Primary deployment for maximum security and liquidity
2. **Polygon** - Layer 2 solution for reduced gas costs and faster transactions
3. **Binance Smart Chain (BSC)** - Alternative network for broader accessibility
4. **XRPL (XRP Ledger)** - Integration for cross-border payments and compliance
5. **Flare Network** - Oracle integration and cross-chain functionality

### Token Architecture

#### Dual-Token System
- **XERA Token** - Primary governance and utility token for the entire ecosystem
- **PROPX Tokens** - Property-specific tokens created via factory pattern for individual real estate projects

#### Regional Specialization
- **Indian Market** - XERA token with city-based property pools
- **UAE Market** - Specialized UAE property tokens with RERA compliance

## Core Smart Contracts

### 1. XERAToken.sol - Main Governance Token

**Purpose**: Primary governance token for small developers and landowners in the Indian market.

**Key Features**:
- ERC20 with voting capabilities (ERC20Votes)
- Property-backed tokenomics
- Dividend distribution system
- Multi-city support (Mumbai, Delhi, Bangalore, Chennai, Hyderabad, Pune)
- Category-based property classification

#### Contract Details

**Inheritance**: ERC20, ERC20Votes, ReentrancyGuard, Pausable, AccessControl

**Key Functions**:

```solidity
// Property Management
function addProperty(
    address propertyOwner,
    string memory propertyAddress,
    uint256 valuationInWei,
    string memory ipfsDocumentHash,
    PropertyCategory category,
    string memory cityCode
) external onlyRole(PROPERTY_MANAGER_ROLE) returns (uint256)

function approveProperty(uint256 propertyId) external onlyRole(ADMIN_ROLE)

function calculateTokenAllocation(
    uint256 propertyValue,
    PropertyCategory category,
    string memory cityCode
) public view returns (uint256)

// Dividend System
function declareDividend(string memory source) external payable onlyRole(ADMIN_ROLE)
function claimAllAvailableDividends() external
```

**Events**:
```solidity
event PropertyAdded(uint256 indexed propertyId, address indexed owner, uint256 valuation, string cityCode, PropertyCategory category)
event PropertyRevalued(uint256 indexed propertyId, uint256 oldValuation, uint256 newValuation)
event DividendDeclared(uint256 indexed periodId, uint256 totalAmount)
event DividendClaimed(address indexed user, uint256 amount, uint256 periodId)
```

**Security Features**:
- Advanced reentrancy protection with multiple guard levels
- Role-based access control (ADMIN_ROLE, PROPERTY_MANAGER_ROLE, VALUER_ROLE)
- Emergency pause functionality
- Batch transfer with reentrancy protection
- Emergency lock mechanisms

**Gas Usage Optimization**:
- Efficient token allocation algorithms
- Batch operations for multiple property management
- Optimized storage layouts for property data
- Safe math operations with overflow protection

**Deployment Addresses**:
- Ethereum Mainnet: `0x...` (To be updated post-deployment)
- Polygon: `0x...` (To be updated post-deployment)
- BSC: `0x...` (To be updated post-deployment)

---

### 2. PROPXTokenFactory.sol - Property Token Factory

**Purpose**: Factory contract for creating PROPX tokens for premium developer properties.

**Key Features**:
- Developer tier management (Tier 1, Tier 2)
- Brand-based project codes
- Dynamic token creation
- Reputation scoring system

#### Contract Details

**Inheritance**: AccessControl, ReentrancyGuard

**Key Functions**:

```solidity
// Developer Management
function registerDeveloper(
    address developerAddress,
    string memory companyName,
    string memory brandCode,
    DeveloperTier tier,
    uint256 projectsDelivered,
    uint256 totalValueDelivered,
    string memory primaryCity,
    bytes32[] memory verificationDocuments
) external onlyRole(ADMIN_ROLE)

// Token Creation
function createPROPXToken(
    string memory propertyName,
    string memory propertyAddress,
    string memory projectCode,
    string memory cityCode,
    PropertyCategory category,
    uint256 totalTokens,
    uint256 pricePerToken,
    uint256 minimumRaise,
    uint256 fundingPeriodDays,
    string memory ipfsDocumentHash
) external onlyRole(DEVELOPER_ROLE) returns (address)
```

**Events**:
```solidity
event DeveloperRegistered(address indexed developer, string brandCode, DeveloperTier tier)
event PROPXTokenCreated(uint256 indexed tokenId, address indexed developer, address tokenContract, string projectCode)
event PROPXTokenFunded(uint256 indexed tokenId, uint256 totalRaised)
```

**Security Features**:
- Developer verification system
- Project code uniqueness validation
- Tier-based fee structure
- Funding deadline enforcement

---

### 3. UAE Smart Contracts Suite

#### 3.1 UAEPropertyToken.sol - UAE Real Estate Tokenization

**Purpose**: ERC1155 token contract for UAE real estate tokenization compliant with RERA requirements.

**Key Features**:
- Multi-currency investment support (AED, USD, EUR, GBP, SAR, QAR, KWD)
- RERA and DLD compliance integration
- Tier-based investment limits
- Dividend distribution system

#### Contract Details

**Inheritance**: ERC1155, Ownable, Pausable, ReentrancyGuard

**Key Functions**:

```solidity
// Property Management
function listProperty(
    string memory reraNumber,
    string memory dldNumber,
    string memory propertyAddress,
    string memory zone,
    string memory emirate,
    uint256 totalValue,
    uint256 totalSupply,
    PropertyType propertyType,
    address developer,
    uint256 fundingDurationDays
) external onlyOwner returns (uint256)

// Investment Functions
function invest(
    uint256 tokenId,
    uint256 tokenAmount,
    string memory currency,
    uint256 currencyAmount
) external onlyKYCApproved onlyAMLCleared validProperty(tokenId) onlyPropertyFunding(tokenId)

// Dividend Functions
function distributeDividends(uint256 tokenId, uint256 totalDividend) external validProperty(tokenId) onlyOwner
function claimDividends(uint256 tokenId) external validProperty(tokenId)
```

**Investment Tiers**:
- **RETAIL**: 25,000 - 500,000 AED
- **PREMIUM**: 500,000 - 2,000,000 AED
- **INSTITUTIONAL**: 2,000,000+ AED

**Supported Currencies** (with exchange rates):
- AED (Primary): 1.0
- USD: ~3.67 AED
- EUR: ~4.06 AED
- GBP: ~4.67 AED
- SAR: ~0.98 AED
- QAR: ~1.01 AED
- KWD: ~12.04 AED

#### 3.2 UAECompliance.sol - Regulatory Compliance

**Purpose**: Comprehensive compliance management for UAE regulations.

**Key Features**:
- RERA registration and compliance tracking
- DLD (Dubai Land Department) integration
- KYC/AML management with multiple levels
- Investment validation and limits

**KYC Levels**:
- **BASIC**: Up to 50K AED investment
- **STANDARD**: Up to 500K AED investment
- **ENHANCED**: Up to 2M AED investment
- **COMPREHENSIVE**: No investment limit

**AML Risk Levels**:
- **LOW**: Allowed for investment
- **MEDIUM**: Allowed with monitoring
- **HIGH**: Not allowed
- **PROHIBITED**: Completely blocked

#### 3.3 UAEStaking.sol - Property Token Staking

**Purpose**: Multi-tier staking system for UAE property tokens with volume-based rewards.

**Staking Tiers**:
- **BRONZE**: 0-100K AED (1x base rate)
- **SILVER**: 100K-500K AED (1.2x base rate)
- **GOLD**: 500K-2M AED (1.5x base rate)
- **PLATINUM**: 2M-5M AED (2x base rate)
- **DIAMOND**: 5M+ AED (3x base rate)

**Key Functions**:

```solidity
function stake(uint256[] memory tokenIds, uint256[] memory amounts) external
function unstake(uint256[] memory tokenIds, uint256[] memory amounts) external
function claimRewards() external
function calculatePendingRewards(address user) public view returns (uint256)
```

**Reward Features**:
- Base APY with tier multipliers
- Volume-based bonuses
- UAE resident bonuses (+0.5% APY)
- Time-weighted reward calculations

---

### 4. Security Infrastructure

#### 4.1 ReentrancyGuard.sol - Advanced Reentrancy Protection

**Purpose**: Enhanced reentrancy protection with multiple security layers.

**Features**:
- Global reentrancy protection
- Function-specific guards
- Advanced protection for cross-function reentrancy
- Emergency lock capabilities
- Nested call detection

**Modifiers**:
```solidity
modifier nonReentrant() // Basic protection
modifier nonReentrantFunction() // Function-specific protection
modifier nonReentrantAdvanced() // Advanced cross-function protection
modifier readOnlyReentrantGuard() // Read-only protection
```

#### 4.2 MultiOracleManager.sol - Price Oracle Management

**Purpose**: Multi-oracle price feed manager with security features and TWAP calculation.

**Key Features**:
- Multiple oracle aggregation
- Deviation checks and circuit breakers
- Time-weighted average pricing (TWAP)
- Heart beat monitoring
- Weighted price calculations

**Functions**:
```solidity
function addOracle(string memory symbol, address oracleAddress, uint256 maxDeviation, uint256 heartbeat, uint256 weight, string memory description) external
function getPrice(string memory symbol) external view returns (uint256 price, uint256 timestamp)
function getTWAPPrice(string memory symbol) external view returns (uint256 price, uint256 timestamp)
function updatePrice(string memory symbol) external
```

**Security Features**:
- Circuit breaker protection (10% threshold)
- Minimum oracle count requirements (3)
- Maximum deviation checks (20%)
- Stale price detection
- Emergency pause functionality

---

## Contract Interaction Examples

### 1. Adding a Property to XERA Token

```javascript
// Add property to XERA token
const tx = await xeraToken.addProperty(
    "0x123...", // property owner
    "123 MG Road, Bangalore", // property address
    ethers.utils.parseEther("5000000"), // 50 lakh valuation
    "QmHash123...", // IPFS document hash
    1, // PropertyCategory.COMMERCIAL
    "BANG" // city code
);
```

### 2. Investing in UAE Property

```javascript
// Invest in UAE property token
const tx = await uaePropertyToken.invest(
    1, // tokenId
    100, // token amount
    "USD", // currency
    ethers.utils.parseEther("10000") // amount in USD
);
```

### 3. Staking UAE Property Tokens

```javascript
// Stake property tokens
const tx = await uaeStaking.stake(
    [1, 2], // token IDs
    [50, 75] // amounts
);
```

### 4. Creating PROPX Token

```javascript
// Create new PROPX token via factory
const tx = await propxFactory.createPROPXToken(
    "Prestige Lakeside",
    "Whitefield, Bangalore",
    "BLR001",
    "BANG",
    0, // PropertyCategory.RESIDENTIAL
    10000, // total tokens
    ethers.utils.parseEther("50000"), // price per token
    ethers.utils.parseEther("5000000"), // minimum raise
    90, // funding period days
    "QmDocHash..." // IPFS hash
);
```

---

## Security Audit Results

### Audit Scope
- Smart contract code review
- Gas optimization analysis
- Security vulnerability assessment
- Access control verification
- Reentrancy attack protection

### Key Findings

#### High Priority (Resolved)
1. **Reentrancy Vulnerabilities**: Implemented advanced reentrancy guard with multiple protection levels
2. **Access Control**: Enhanced role-based access control with proper role management
3. **Integer Overflow**: Implemented SafeMath operations throughout

#### Medium Priority (Resolved)
1. **Gas Optimization**: Optimized storage layouts and batch operations
2. **Event Emission**: Added comprehensive event logging for transparency
3. **Error Handling**: Implemented proper error messages and validation

#### Low Priority (Resolved)
1. **Code Documentation**: Added detailed NatSpec documentation
2. **Modifier Consistency**: Standardized modifier usage across contracts
3. **Naming Conventions**: Aligned with Solidity style guide

### Recommendations Implemented
- Multi-signature wallet for admin functions
- Time-locked upgrade mechanisms
- Emergency pause functionality
- Circuit breaker patterns for price oracles
- Comprehensive testing suite

---

## Upgrade Mechanisms

### 1. Proxy Pattern Implementation
All major contracts implement the OpenZeppelin upgradeable proxy pattern:

```solidity
// Example upgrade function
function upgrade(address newImplementation) external onlyRole(ADMIN_ROLE) {
    require(newImplementation != address(0), "Invalid implementation");
    _upgradeToAndCall(newImplementation, "", false);
}
```

### 2. Time-Locked Upgrades
Critical upgrades require a 48-hour time lock:

```solidity
function proposeUpgrade(address newImplementation) external onlyRole(ADMIN_ROLE) {
    upgradeProposals[newImplementation] = block.timestamp + 48 hours;
}
```

### 3. Multi-Signature Approval
Major changes require multi-signature approval from the admin council:

- Minimum 3 out of 5 signatures required
- Separate signatures for different operation types
- Emergency override capabilities for critical security fixes

---

## Emergency Procedures

### 1. Emergency Pause
All contracts implement pausable functionality:

```solidity
function emergencyPause() external onlyRole(ADMIN_ROLE) {
    _pause();
    _emergencyLock();
}
```

### 2. Circuit Breakers
Price oracle system includes automatic circuit breakers:

- Triggered when price deviation exceeds 10%
- Manual reset required by admin
- Fallback to last known good price

### 3. Fund Recovery
Emergency fund recovery mechanisms:

```solidity
function emergencyWithdraw(address token, uint256 amount) external onlyRole(EMERGENCY_ROLE) {
    require(paused(), "Contract must be paused");
    IERC20(token).transfer(treasury, amount);
}
```

---

## Gas Usage Optimization

### 1. Storage Optimization
- Packed structs to minimize storage slots
- Using appropriate data types (uint8 vs uint256)
- Efficient mapping structures

### 2. Function Optimization
- Batch operations to reduce transaction costs
- View functions for read-only operations
- Event emission for off-chain data retrieval

### 3. Loop Optimization
- Limited loop iterations
- Early exit conditions
- Gas-efficient sorting algorithms

### Example Gas Costs (Ethereum Mainnet)
- Deploy XERA Token: ~2,500,000 gas
- Add Property: ~150,000 gas
- Transfer Tokens: ~65,000 gas
- Claim Dividends: ~120,000 gas
- UAE Property Investment: ~180,000 gas
- Stake Tokens: ~200,000 gas

---

## Deployment Strategy

### 1. Testnet Deployment
1. **Goerli Testnet** - Initial testing and validation
2. **Mumbai (Polygon Testnet)** - Layer 2 functionality testing
3. **BSC Testnet** - Cross-chain compatibility testing

### 2. Mainnet Deployment Sequence
1. Deploy security contracts (ReentrancyGuard, MultiOracleManager)
2. Deploy token contracts (XERA, PROPXTokenFactory)
3. Deploy UAE-specific contracts
4. Initialize oracle feeds and compliance systems
5. Configure access controls and emergency procedures

### 3. Verification and Monitoring
- Contract verification on Etherscan/BSCScan/PolygonScan
- Real-time monitoring via The Graph protocol
- Alert systems for critical functions
- Regular security audits and updates

---

## Integration Guidelines

### 1. Frontend Integration
```javascript
// Web3 provider setup
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const xeraContract = new ethers.Contract(XERA_ADDRESS, XERA_ABI, provider);

// Event listening
xeraContract.on("PropertyAdded", (propertyId, owner, valuation) => {
    console.log(`New property added: ${propertyId}`);
});
```

### 2. Backend Integration
```javascript
// API endpoint for property data
app.get('/api/properties/:id', async (req, res) => {
    const property = await xeraContract.getProperty(req.params.id);
    res.json(property);
});
```

### 3. Mobile Integration
- React Native web3 integration
- MetaMask mobile wallet support
- WalletConnect protocol implementation

---

## Compliance and Legal

### 1. Regulatory Compliance
- **India**: Securities and Exchange Board of India (SEBI) guidelines
- **UAE**: Real Estate Regulatory Agency (RERA) compliance
- **International**: Anti-Money Laundering (AML) and Know Your Customer (KYC)

### 2. Data Protection
- GDPR compliance for EU users
- Personal data encryption
- Right to data deletion

### 3. Tax Implications
- Token transfer tax calculations
- Dividend distribution reporting
- Cross-border transaction compliance

---

## Monitoring and Analytics

### 1. On-Chain Analytics
- Total Value Locked (TVL) tracking
- Transaction volume monitoring
- User activity analysis
- Property performance metrics

### 2. Security Monitoring
- Unusual transaction pattern detection
- Large withdrawal alerts
- Failed transaction analysis
- Contract upgrade notifications

### 3. Performance Metrics
- Gas usage optimization tracking
- Network congestion impact
- Cross-chain bridge performance
- Oracle feed reliability

---

## Future Roadmap

### 1. Layer 2 Expansion
- Arbitrum integration
- Optimism deployment
- zkSync Era compatibility

### 2. Cross-Chain Bridges
- Ethereum <-> Polygon bridge
- BSC cross-chain functionality
- XRPL integration completion

### 3. Advanced Features
- Automated market makers (AMM)
- Liquidity mining programs
- Governance token voting mechanisms
- Real estate derivatives trading

---

## Support and Resources

### 1. Developer Resources
- Smart contract ABIs and addresses
- SDK and library documentation
- Code examples and tutorials
- Testing frameworks and tools

### 2. Community Support
- Discord developer community
- GitHub repository and issues
- Stack Overflow tag: `nexvestxr`
- Developer newsletter and updates

### 3. Enterprise Support
- Dedicated integration assistance
- Custom contract development
- Compliance consulting
- Technical training programs

---

## Conclusion

The NexVestXR V2 smart contract suite represents a comprehensive, secure, and scalable solution for real estate tokenization across multiple markets. With advanced security features, regulatory compliance, and optimization for gas efficiency, the platform is designed to support the growing demand for fractional real estate investment while maintaining the highest standards of security and regulatory compliance.

The dual-token architecture, combined with sophisticated compliance mechanisms and multi-chain deployment strategy, positions NexVestXR as a leading platform in the blockchain-based real estate investment space.

For technical support, integration assistance, or detailed implementation guidance, please refer to our developer resources or contact the development team through the official channels.