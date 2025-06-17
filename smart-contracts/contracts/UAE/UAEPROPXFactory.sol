// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./UAEDualTokenClassifier.sol";

/**
 * @title UAEPROPXFactory
 * @dev Factory for creating individual PROPX tokens for premium UAE properties
 * @dev Integrates with UAEDualTokenClassifier for automatic routing
 */
contract UAEPROPXFactory is AccessControl, ReentrancyGuard {
    using SafeMath for uint256;

    // =============================================================================
    // ROLES & CONSTANTS
    // =============================================================================

    bytes32 public constant PROPERTY_MANAGER_ROLE = keccak256("PROPERTY_MANAGER_ROLE");
    bytes32 public constant DEVELOPER_ROLE = keccak256("DEVELOPER_ROLE");

    // =============================================================================
    // STRUCTS & ENUMS
    // =============================================================================

    enum FundingStage { PENDING, ACTIVE, FUNDED, GENERATING_INCOME, COMPLETED }
    enum PropertyType { RESIDENTIAL, COMMERCIAL, MIXED_USE, LUXURY, HOSPITALITY, INDUSTRIAL }

    struct UAEPROPXToken {
        address tokenAddress;
        string name;
        string symbol;
        uint256 totalSupply;
        uint256 propertyValue;      // In AED wei
        uint256 minimumInvestment;  // In AED wei
        uint256 targetFunding;      // In AED wei
        uint256 currentFunding;     // In AED wei
        uint256 dividendRate;       // Annual dividend rate in basis points
        FundingStage stage;
        PropertyType propertyType;
        UAEDualTokenClassifier.UAEEmirate emirate;
        string zone;                // Specific location (Downtown Dubai, etc.)
        address developer;
        string developerName;
        UAEDualTokenClassifier.DeveloperTier developerTier;
        uint256 creationTime;
        uint256 fundingDeadline;
        bool isActive;
        string metadataURI;
        uint256 expectedCompletion;
        string reraLicense;
    }

    struct DeveloperProfile {
        string name;
        UAEDualTokenClassifier.DeveloperTier tier;
        uint256 platformFeePercent;     // Fee in basis points
        uint256 totalProjects;
        uint256 totalValueTokenized;   // Total AED value tokenized
        uint256[] projectIds;
        bool isActive;
        string reraLicense;
        string website;
        UAEDualTokenClassifier.UAEEmirate[] operatingEmirates;
    }

    struct InvestmentMetrics {
        uint256 totalInvestors;
        uint256 averageInvestment;
        uint256 institutionalInvestment;  // Minimum 500K AED investments
        uint256 retailInvestment;         // Under 500K AED investments
        mapping(address => uint256) investorBalances;
        mapping(address => uint256) investmentTimestamps;
    }

    // =============================================================================
    // STATE VARIABLES
    // =============================================================================

    UAEDualTokenClassifier public immutable classifier;
    
    // Token tracking
    mapping(uint256 => UAEPROPXToken) public propxTokens;
    mapping(address => uint256) public tokenToId;
    mapping(address => DeveloperProfile) public developers;
    mapping(uint256 => InvestmentMetrics) public projectMetrics;
    
    uint256 public nextTokenId = 1;
    uint256 public totalProjectsCreated;
    uint256 public totalValueTokenized;
    
    // Premium UAE developers (integrated with classifier)
    address[] public premiumDevelopers;
    
    // Platform configuration
    uint256 public platformFeeCollected;
    address public feeRecipient;
    
    // Events
    event PROPXTokenCreated(
        uint256 indexed tokenId,
        address indexed tokenAddress,
        string name,
        uint256 propertyValue,
        address developer
    );
    
    event FundingReceived(
        uint256 indexed tokenId,
        address indexed investor,
        uint256 amount,
        uint256 tokensAllocated
    );
    
    event FundingStageChanged(
        uint256 indexed tokenId,
        FundingStage oldStage,
        FundingStage newStage
    );
    
    event DeveloperRegistered(
        address indexed developer,
        string name,
        UAEDualTokenClassifier.DeveloperTier tier
    );

    // =============================================================================
    // CONSTRUCTOR
    // =============================================================================

    constructor(address _classifier, address _feeRecipient) {
        require(_classifier != address(0), "Invalid classifier address");
        require(_feeRecipient != address(0), "Invalid fee recipient");
        
        classifier = UAEDualTokenClassifier(_classifier);
        feeRecipient = _feeRecipient;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PROPERTY_MANAGER_ROLE, msg.sender);
        
        // Register premium UAE developers
        _registerPremiumDevelopers();
    }

    // =============================================================================
    // MAIN FUNCTIONS
    // =============================================================================

    /**
     * @dev Create new PROPX token for premium UAE property
     */
    function createPROPXToken(
        string memory name,
        string memory symbol,
        uint256 propertyValueAED,
        uint256 targetFundingAED,
        PropertyType propertyType,
        UAEDualTokenClassifier.UAEEmirate emirate,
        string memory zone,
        uint256 dividendRate,
        uint256 fundingDurationDays,
        uint256 expectedCompletionTimestamp,
        string memory metadataURI,
        string memory reraLicense
    ) external onlyRole(DEVELOPER_ROLE) returns (uint256 tokenId) {
        
        require(propertyValueAED >= 5000000 * 1e18, "Property value too low for PROPX"); // 5M AED minimum
        require(targetFundingAED <= propertyValueAED, "Target funding exceeds property value");
        require(dividendRate <= 2000, "Dividend rate too high"); // Max 20% annually
        require(bytes(name).length > 0, "Name required");
        require(bytes(symbol).length > 0, "Symbol required");
        
        // Verify developer is registered and active
        DeveloperProfile storage developer = developers[msg.sender];
        require(developer.isActive, "Developer not registered or inactive");
        
        // Create property data for classification verification
        UAEDualTokenClassifier.PropertyData memory propertyData = UAEDualTokenClassifier.PropertyData({
            valueInAED: propertyValueAED,
            emirate: emirate,
            zone: zone,
            category: _convertPropertyType(propertyType),
            developer: msg.sender,
            complianceScore: 90, // Assume high compliance for premium developers
            isOffPlan: expectedCompletionTimestamp > block.timestamp,
            completionDate: expectedCompletionTimestamp,
            isVerified: true
        });
        
        // Verify this property should be PROPX (not XERA)
        UAEDualTokenClassifier.ClassificationResult memory result = classifier.classifyProperty(propertyData);
        require(result.tokenType == UAEDualTokenClassifier.TokenType.PROPX, "Property should be classified as XERA, not PROPX");
        
        tokenId = nextTokenId++;
        
        // Deploy new PROPX token contract
        address tokenAddress = _deployPROPXContract(name, symbol, targetFundingAED);
        
        // Create PROPX token record
        propxTokens[tokenId] = UAEPROPXToken({
            tokenAddress: tokenAddress,
            name: name,
            symbol: symbol,
            totalSupply: targetFundingAED, // 1 token = 1 AED investment
            propertyValue: propertyValueAED,
            minimumInvestment: result.minimumInvestment,
            targetFunding: targetFundingAED,
            currentFunding: 0,
            dividendRate: dividendRate,
            stage: FundingStage.PENDING,
            propertyType: propertyType,
            emirate: emirate,
            zone: zone,
            developer: msg.sender,
            developerName: developer.name,
            developerTier: developer.tier,
            creationTime: block.timestamp,
            fundingDeadline: block.timestamp + (fundingDurationDays * 1 days),
            isActive: true,
            metadataURI: metadataURI,
            expectedCompletion: expectedCompletionTimestamp,
            reraLicense: reraLicense
        });
        
        tokenToId[tokenAddress] = tokenId;
        
        // Update developer profile
        developer.totalProjects = developer.totalProjects.add(1);
        developer.projectIds.push(tokenId);
        
        // Update global metrics
        totalProjectsCreated = totalProjectsCreated.add(1);
        
        emit PROPXTokenCreated(tokenId, tokenAddress, name, propertyValueAED, msg.sender);
        
        return tokenId;
    }

    /**
     * @dev Invest in PROPX token
     */
    function investInPROPX(uint256 tokenId, uint256 aedAmount) external payable nonReentrant {
        UAEPROPXToken storage token = propxTokens[tokenId];
        require(token.isActive, "Token not active");
        require(token.stage == FundingStage.PENDING || token.stage == FundingStage.ACTIVE, "Funding closed");
        require(block.timestamp <= token.fundingDeadline, "Funding deadline passed");
        require(aedAmount >= token.minimumInvestment, "Below minimum investment");
        require(aedAmount <= token.targetFunding.sub(token.currentFunding), "Exceeds funding target");
        
        // Calculate platform fee
        DeveloperProfile storage developer = developers[token.developer];
        uint256 platformFee = aedAmount.mul(developer.platformFeePercent).div(10000);
        uint256 netInvestment = aedAmount.sub(platformFee);
        
        // Update funding
        token.currentFunding = token.currentFunding.add(aedAmount);
        
        // Update metrics
        InvestmentMetrics storage metrics = projectMetrics[tokenId];
        if (metrics.investorBalances[msg.sender] == 0) {
            metrics.totalInvestors = metrics.totalInvestors.add(1);
        }
        metrics.investorBalances[msg.sender] = metrics.investorBalances[msg.sender].add(aedAmount);
        metrics.investmentTimestamps[msg.sender] = block.timestamp;
        
        // Classify investment size
        if (aedAmount >= 500000 * 1e18) { // 500K AED = institutional
            metrics.institutionalInvestment = metrics.institutionalInvestment.add(aedAmount);
        } else {
            metrics.retailInvestment = metrics.retailInvestment.add(aedAmount);
        }
        
        // Calculate average investment
        uint256 totalInvestment = metrics.institutionalInvestment.add(metrics.retailInvestment);
        metrics.averageInvestment = totalInvestment.div(metrics.totalInvestors);
        
        // Mint PROPX tokens to investor (1 token per 1 AED invested)
        IUAEPROPX(token.tokenAddress).mint(msg.sender, aedAmount);
        
        // Collect platform fee
        platformFeeCollected = platformFeeCollected.add(platformFee);
        
        // Check if funding target reached
        if (token.currentFunding >= token.targetFunding) {
            FundingStage oldStage = token.stage;
            token.stage = FundingStage.FUNDED;
            emit FundingStageChanged(tokenId, oldStage, FundingStage.FUNDED);
        } else if (token.stage == FundingStage.PENDING) {
            token.stage = FundingStage.ACTIVE;
            emit FundingStageChanged(tokenId, FundingStage.PENDING, FundingStage.ACTIVE);
        }
        
        emit FundingReceived(tokenId, msg.sender, aedAmount, aedAmount);
    }

    // =============================================================================
    // DEVELOPER MANAGEMENT
    // =============================================================================

    /**
     * @dev Register new developer (admin only)
     */
    function registerDeveloper(
        address developerAddress,
        string memory name,
        UAEDualTokenClassifier.DeveloperTier tier,
        string memory reraLicense,
        string memory website,
        UAEDualTokenClassifier.UAEEmirate[] memory operatingEmirates
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(developerAddress != address(0), "Invalid developer address");
        require(!developers[developerAddress].isActive, "Developer already registered");
        
        // Calculate platform fee based on tier
        uint256 feePercent;
        if (tier == UAEDualTokenClassifier.DeveloperTier.TIER1) {
            feePercent = 150; // 1.5%
        } else if (tier == UAEDualTokenClassifier.DeveloperTier.TIER2) {
            feePercent = 250; // 2.5%
        } else {
            feePercent = 350; // 3.5%
        }
        
        developers[developerAddress] = DeveloperProfile({
            name: name,
            tier: tier,
            platformFeePercent: feePercent,
            totalProjects: 0,
            totalValueTokenized: 0,
            projectIds: new uint256[](0),
            isActive: true,
            reraLicense: reraLicense,
            website: website,
            operatingEmirates: operatingEmirates
        });
        
        // Grant developer role
        _grantRole(DEVELOPER_ROLE, developerAddress);
        
        if (tier == UAEDualTokenClassifier.DeveloperTier.TIER1) {
            premiumDevelopers.push(developerAddress);
        }
        
        emit DeveloperRegistered(developerAddress, name, tier);
    }

    // =============================================================================
    // PREMIUM DEVELOPER INITIALIZATION
    // =============================================================================

    /**
     * @dev Register premium UAE developers
     */
    function _registerPremiumDevelopers() internal {
        // EMAAR Properties
        _registerPremiumDeveloper(
            0x1111111111111111111111111111111111111111,
            "EMAAR Properties",
            UAEDualTokenClassifier.DeveloperTier.TIER1,
            "RERA-EMAAR-001"
        );
        
        // MERAAS Holding
        _registerPremiumDeveloper(
            0x2222222222222222222222222222222222222222,
            "MERAAS Holding",
            UAEDualTokenClassifier.DeveloperTier.TIER1,
            "RERA-MERAAS-001"
        );
        
        // NAKHEEL
        _registerPremiumDeveloper(
            0x3333333333333333333333333333333333333333,
            "NAKHEEL",
            UAEDualTokenClassifier.DeveloperTier.TIER1,
            "RERA-NAKHEEL-001"
        );
        
        // ALDAR Properties
        _registerPremiumDeveloper(
            0x5555555555555555555555555555555555555555,
            "ALDAR Properties",
            UAEDualTokenClassifier.DeveloperTier.TIER1,
            "ADRA-ALDAR-001"
        );
        
        // DAMAC Properties
        _registerPremiumDeveloper(
            0x4444444444444444444444444444444444444444,
            "DAMAC Properties",
            UAEDualTokenClassifier.DeveloperTier.TIER2,
            "RERA-DAMAC-001"
        );
    }

    function _registerPremiumDeveloper(
        address developerAddress,
        string memory name,
        UAEDualTokenClassifier.DeveloperTier tier,
        string memory reraLicense
    ) internal {
        uint256 feePercent = tier == UAEDualTokenClassifier.DeveloperTier.TIER1 ? 150 : 250;
        
        UAEDualTokenClassifier.UAEEmirate[] memory emirates = new UAEDualTokenClassifier.UAEEmirate[](2);
        emirates[0] = UAEDualTokenClassifier.UAEEmirate.DUBAI;
        emirates[1] = UAEDualTokenClassifier.UAEEmirate.ABU_DHABI;
        
        developers[developerAddress] = DeveloperProfile({
            name: name,
            tier: tier,
            platformFeePercent: feePercent,
            totalProjects: 0,
            totalValueTokenized: 0,
            projectIds: new uint256[](0),
            isActive: true,
            reraLicense: reraLicense,
            website: "",
            operatingEmirates: emirates
        });
        
        _grantRole(DEVELOPER_ROLE, developerAddress);
        
        if (tier == UAEDualTokenClassifier.DeveloperTier.TIER1) {
            premiumDevelopers.push(developerAddress);
        }
    }

    // =============================================================================
    // HELPER FUNCTIONS
    // =============================================================================

    /**
     * @dev Deploy new PROPX token contract
     */
    function _deployPROPXContract(
        string memory name,
        string memory symbol,
        uint256 maxSupply
    ) internal returns (address) {
        // In a real implementation, this would deploy a new ERC20 contract
        // For now, we'll return a placeholder address
        return address(uint160(uint256(keccak256(abi.encodePacked(name, symbol, block.timestamp)))));
    }

    /**
     * @dev Convert PropertyType to classifier category
     */
    function _convertPropertyType(PropertyType pType) internal pure returns (UAEDualTokenClassifier.PropertyCategory) {
        if (pType == PropertyType.RESIDENTIAL) return UAEDualTokenClassifier.PropertyCategory.RESIDENTIAL;
        if (pType == PropertyType.COMMERCIAL) return UAEDualTokenClassifier.PropertyCategory.COMMERCIAL;
        if (pType == PropertyType.MIXED_USE) return UAEDualTokenClassifier.PropertyCategory.MIXED_USE;
        if (pType == PropertyType.HOSPITALITY) return UAEDualTokenClassifier.PropertyCategory.HOSPITALITY;
        if (pType == PropertyType.INDUSTRIAL) return UAEDualTokenClassifier.PropertyCategory.INDUSTRIAL;
        return UAEDualTokenClassifier.PropertyCategory.RESIDENTIAL; // Default
    }

    // =============================================================================
    // VIEW FUNCTIONS
    // =============================================================================

    function getPROPXToken(uint256 tokenId) external view returns (UAEPROPXToken memory) {
        return propxTokens[tokenId];
    }

    function getDeveloperProfile(address developer) external view returns (DeveloperProfile memory) {
        return developers[developer];
    }

    function getProjectMetrics(uint256 tokenId) external view returns (
        uint256 totalInvestors,
        uint256 averageInvestment,
        uint256 institutionalInvestment,
        uint256 retailInvestment
    ) {
        InvestmentMetrics storage metrics = projectMetrics[tokenId];
        return (
            metrics.totalInvestors,
            metrics.averageInvestment,
            metrics.institutionalInvestment,
            metrics.retailInvestment
        );
    }

    function getDeveloperProjects(address developer) external view returns (uint256[] memory) {
        return developers[developer].projectIds;
    }

    function getPremiumDevelopers() external view returns (address[] memory) {
        return premiumDevelopers;
    }

    function getInvestorBalance(uint256 tokenId, address investor) external view returns (uint256) {
        return projectMetrics[tokenId].investorBalances[investor];
    }
}

// Interface for PROPX token contract
interface IUAEPROPX {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}