// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title UAEDualTokenClassifier
 * @dev Classifies UAE properties for XERA (platform token) vs PROPX (premium properties)
 * @dev Implements AED-based thresholds and UAE-specific developer tiers
 */
contract UAEDualTokenClassifier is Ownable, Pausable {
    using SafeMath for uint256;

    // =============================================================================
    // ENUMS & STRUCTS
    // =============================================================================

    enum TokenType { XERA, PROPX }
    enum DeveloperTier { NONE, TIER1, TIER2, TIER3 }
    enum PropertyCategory { RESIDENTIAL, COMMERCIAL, MIXED_USE, LUXURY, HOSPITALITY, INDUSTRIAL }
    enum UAEEmirate { DUBAI, ABU_DHABI, SHARJAH, AJMAN, UMM_AL_QUWAIN, RAS_AL_KHAIMAH, FUJAIRAH }

    struct PropertyData {
        uint256 valueInAED;          // Property value in AED wei
        UAEEmirate emirate;          // UAE emirate location
        string zone;                 // Specific zone (Downtown Dubai, Marina, etc.)
        PropertyCategory category;   // Property type
        address developer;           // Developer address
        uint256 complianceScore;     // RERA/DLD compliance score (0-100)
        bool isOffPlan;             // Whether property is off-plan
        uint256 completionDate;      // Expected completion timestamp
        bool isVerified;            // RERA/DLD verification status
    }

    struct DeveloperInfo {
        string name;
        DeveloperTier tier;
        UAEEmirate[] operatingEmirates;
        bool isActive;
        uint256 registrationDate;
        string reraLicense;
        uint256 completedProjects;
    }

    struct ClassificationResult {
        TokenType tokenType;
        uint256 platformFeePercent; // Fee in basis points (100 = 1%)
        uint256 minimumInvestment;  // Minimum investment in AED wei
        string[] applicableFeatures;
        string reason;
    }

    // =============================================================================
    // STATE VARIABLES
    // =============================================================================

    // Classification thresholds (in AED wei)
    uint256 public constant PROPX_MINIMUM_VALUE = 5000000 * 1e18;     // 5 Million AED
    uint256 public constant XERA_MINIMUM_VALUE = 100000 * 1e18;       // 100,000 AED
    uint256 public constant LUXURY_THRESHOLD = 10000000 * 1e18;       // 10 Million AED
    uint256 public constant MINIMUM_COMPLIANCE_SCORE = 75;             // 75% compliance required

    // Developer registry
    mapping(address => DeveloperInfo) public developers;
    mapping(string => address) public developerByName;
    
    // Zone classifications
    mapping(string => bool) public premiumZones;
    mapping(UAEEmirate => string[]) public emirateZones;
    
    // Platform fees (in basis points)
    mapping(DeveloperTier => uint256) public tierFees;
    
    // Property category multipliers (in basis points, 10000 = 1.0x)
    mapping(PropertyCategory => uint256) public categoryMultipliers;
    
    // Events
    event PropertyClassified(
        uint256 indexed propertyId,
        TokenType tokenType,
        uint256 valueInAED,
        address developer,
        string zone
    );
    
    event DeveloperRegistered(
        address indexed developer,
        string name,
        DeveloperTier tier,
        string reraLicense
    );
    
    event ZoneClassificationUpdated(string zone, bool isPremium);

    // =============================================================================
    // CONSTRUCTOR
    // =============================================================================

    constructor() {
        // Initialize tier fees (basis points)
        tierFees[DeveloperTier.TIER1] = 150;  // 1.5% for premium developers
        tierFees[DeveloperTier.TIER2] = 250;  // 2.5% for standard developers
        tierFees[DeveloperTier.TIER3] = 350;  // 3.5% for new developers
        
        // Initialize category multipliers
        categoryMultipliers[PropertyCategory.RESIDENTIAL] = 10000;   // 1.0x
        categoryMultipliers[PropertyCategory.COMMERCIAL] = 12000;    // 1.2x
        categoryMultipliers[PropertyCategory.MIXED_USE] = 11000;     // 1.1x
        categoryMultipliers[PropertyCategory.LUXURY] = 13000;        // 1.3x
        categoryMultipliers[PropertyCategory.HOSPITALITY] = 11500;   // 1.15x
        categoryMultipliers[PropertyCategory.INDUSTRIAL] = 10500;    // 1.05x
        
        // Initialize premium zones
        _initializePremiumZones();
        
        // Register premium UAE developers
        _registerPremiumDevelopers();
    }

    // =============================================================================
    // MAIN CLASSIFICATION FUNCTION
    // =============================================================================

    /**
     * @dev Classify property for XERA or PROPX tokenization
     * @param propertyData Property information for classification
     * @return result Classification result with token type and parameters
     */
    function classifyProperty(PropertyData memory propertyData) 
        external 
        view 
        returns (ClassificationResult memory result) 
    {
        // Validate basic requirements
        require(propertyData.valueInAED >= XERA_MINIMUM_VALUE, "Property value below minimum");
        require(propertyData.complianceScore >= MINIMUM_COMPLIANCE_SCORE, "Insufficient compliance score");
        require(propertyData.isVerified, "Property must be RERA/DLD verified");
        
        // Get developer info
        DeveloperInfo memory developer = developers[propertyData.developer];
        require(developer.isActive, "Developer not registered or inactive");
        
        // Classification logic
        if (_shouldClassifyAsPROPX(propertyData, developer)) {
            result = _createPROPXResult(propertyData, developer);
        } else {
            result = _createXERAResult(propertyData, developer);
        }
        
        return result;
    }

    /**
     * @dev Check if property should be classified as PROPX
     */
    function _shouldClassifyAsPROPX(
        PropertyData memory propertyData, 
        DeveloperInfo memory developer
    ) internal view returns (bool) {
        
        // Must meet minimum value threshold
        if (propertyData.valueInAED < PROPX_MINIMUM_VALUE) {
            return false;
        }
        
        // Must be from TIER1 or TIER2 developer
        if (developer.tier == DeveloperTier.TIER3 || developer.tier == DeveloperTier.NONE) {
            return false;
        }
        
        // Must be in premium zone
        if (!premiumZones[propertyData.zone]) {
            return false;
        }
        
        // Must have high compliance score for PROPX
        if (propertyData.complianceScore < 85) {
            return false;
        }
        
        // Commercial/Luxury properties are preferred for PROPX
        if (propertyData.category == PropertyCategory.COMMERCIAL || 
            propertyData.category == PropertyCategory.LUXURY ||
            propertyData.category == PropertyCategory.HOSPITALITY) {
            return true;
        }
        
        // High-value residential in premium zones
        if (propertyData.category == PropertyCategory.RESIDENTIAL && 
            propertyData.valueInAED >= LUXURY_THRESHOLD) {
            return true;
        }
        
        return true; // Default to PROPX if all conditions met
    }

    /**
     * @dev Create PROPX classification result
     */
    function _createPROPXResult(
        PropertyData memory propertyData,
        DeveloperInfo memory developer
    ) internal view returns (ClassificationResult memory) {
        
        string[] memory features = new string[](6);
        features[0] = "INDIVIDUAL_TOKENIZATION";
        features[1] = "PREMIUM_DEVELOPER_ACCESS";
        features[2] = "INSTITUTIONAL_INVESTMENT";
        features[3] = "ADVANCED_ANALYTICS";
        features[4] = "PRIORITY_LIQUIDITY";
        features[5] = "DIVIDEND_DISTRIBUTION";
        
        return ClassificationResult({
            tokenType: TokenType.PROPX,
            platformFeePercent: tierFees[developer.tier],
            minimumInvestment: _calculateMinimumInvestment(propertyData, TokenType.PROPX),
            applicableFeatures: features,
            reason: _generatePROPXReason(propertyData, developer)
        });
    }

    /**
     * @dev Create XERA classification result
     */
    function _createXERAResult(
        PropertyData memory propertyData,
        DeveloperInfo memory developer
    ) internal view returns (ClassificationResult memory) {
        
        string[] memory features = new string[](5);
        features[0] = "CITY_POOL_DIVERSIFICATION";
        features[1] = "STAKING_REWARDS";
        features[2] = "GOVERNANCE_VOTING";
        features[3] = "TIER_BASED_BENEFITS";
        features[4] = "CROSS_CHAIN_PORTFOLIO";
        
        return ClassificationResult({
            tokenType: TokenType.XERA,
            platformFeePercent: tierFees[developer.tier].add(50), // Slightly higher for XERA
            minimumInvestment: _calculateMinimumInvestment(propertyData, TokenType.XERA),
            applicableFeatures: features,
            reason: _generateXERAReason(propertyData, developer)
        });
    }

    // =============================================================================
    // HELPER FUNCTIONS
    // =============================================================================

    /**
     * @dev Calculate minimum investment based on property and token type
     */
    function _calculateMinimumInvestment(
        PropertyData memory propertyData,
        TokenType tokenType
    ) internal pure returns (uint256) {
        
        if (tokenType == TokenType.PROPX) {
            // PROPX minimum: 0.1% of property value or 10,000 AED, whichever is higher
            uint256 percentBased = propertyData.valueInAED.div(1000); // 0.1%
            uint256 absoluteMin = 10000 * 1e18; // 10,000 AED
            return percentBased > absoluteMin ? percentBased : absoluteMin;
        } else {
            // XERA minimum: 1,000 AED
            return 1000 * 1e18;
        }
    }

    /**
     * @dev Generate reason for PROPX classification
     */
    function _generatePROPXReason(
        PropertyData memory propertyData,
        DeveloperInfo memory developer
    ) internal view returns (string memory) {
        return string(abi.encodePacked(
            "Premium property: ",
            _formatAED(propertyData.valueInAED),
            " AED, ",
            developer.name,
            " (TIER",
            _tierToString(developer.tier),
            "), ",
            propertyData.zone
        ));
    }

    /**
     * @dev Generate reason for XERA classification
     */
    function _generateXERAReason(
        PropertyData memory propertyData,
        DeveloperInfo memory developer
    ) internal view returns (string memory) {
        return string(abi.encodePacked(
            "Platform property: ",
            _formatAED(propertyData.valueInAED),
            " AED, diversified pool allocation"
        ));
    }

    // =============================================================================
    // ADMIN FUNCTIONS
    // =============================================================================

    /**
     * @dev Register new developer
     */
    function registerDeveloper(
        address developerAddress,
        string memory name,
        DeveloperTier tier,
        UAEEmirate[] memory operatingEmirates,
        string memory reraLicense
    ) external onlyOwner {
        require(developerAddress != address(0), "Invalid developer address");
        require(bytes(name).length > 0, "Developer name required");
        require(bytes(reraLicense).length > 0, "RERA license required");
        
        developers[developerAddress] = DeveloperInfo({
            name: name,
            tier: tier,
            operatingEmirates: operatingEmirates,
            isActive: true,
            registrationDate: block.timestamp,
            reraLicense: reraLicense,
            completedProjects: 0
        });
        
        developerByName[name] = developerAddress;
        
        emit DeveloperRegistered(developerAddress, name, tier, reraLicense);
    }

    /**
     * @dev Update developer tier
     */
    function updateDeveloperTier(address developer, DeveloperTier newTier) external onlyOwner {
        require(developers[developer].isActive, "Developer not found");
        developers[developer].tier = newTier;
    }

    /**
     * @dev Add premium zone
     */
    function addPremiumZone(string memory zone, UAEEmirate emirate) external onlyOwner {
        premiumZones[zone] = true;
        emirateZones[emirate].push(zone);
        emit ZoneClassificationUpdated(zone, true);
    }

    /**
     * @dev Remove premium zone
     */
    function removePremiumZone(string memory zone) external onlyOwner {
        premiumZones[zone] = false;
        emit ZoneClassificationUpdated(zone, false);
    }

    // =============================================================================
    // INITIALIZATION FUNCTIONS
    // =============================================================================

    /**
     * @dev Initialize premium zones in UAE
     */
    function _initializePremiumZones() internal {
        // Dubai premium zones
        premiumZones["Downtown Dubai"] = true;
        premiumZones["Dubai Marina"] = true;
        premiumZones["Business Bay"] = true;
        premiumZones["DIFC"] = true;
        premiumZones["Palm Jumeirah"] = true;
        premiumZones["Jumeirah Beach Residence"] = true;
        premiumZones["Emirates Hills"] = true;
        premiumZones["Dubai Hills Estate"] = true;
        premiumZones["City Walk"] = true;
        premiumZones["Dubai Creek Harbour"] = true;
        
        // Abu Dhabi premium zones
        premiumZones["Corniche"] = true;
        premiumZones["Al Reem Island"] = true;
        premiumZones["Yas Island"] = true;
        premiumZones["Saadiyat Island"] = true;
        premiumZones["Al Maryah Island"] = true;
        
        // Sharjah premium zones
        premiumZones["Al Majaz"] = true;
        premiumZones["Al Khan"] = true;
    }

    /**
     * @dev Register premium UAE developers
     */
    function _registerPremiumDevelopers() internal {
        // EMAAR Properties - TIER1
        UAEEmirate[] memory emaarEmirates = new UAEEmirate[](2);
        emaarEmirates[0] = UAEEmirate.DUBAI;
        emaarEmirates[1] = UAEEmirate.ABU_DHABI;
        
        developers[0x1111111111111111111111111111111111111111] = DeveloperInfo({
            name: "EMAAR Properties",
            tier: DeveloperTier.TIER1,
            operatingEmirates: emaarEmirates,
            isActive: true,
            registrationDate: block.timestamp,
            reraLicense: "RERA-EMAAR-001",
            completedProjects: 150
        });
        
        // MERAAS Holding - TIER1  
        UAEEmirate[] memory meraasEmirates = new UAEEmirate[](1);
        meraasEmirates[0] = UAEEmirate.DUBAI;
        
        developers[0x2222222222222222222222222222222222222222] = DeveloperInfo({
            name: "MERAAS Holding",
            tier: DeveloperTier.TIER1,
            operatingEmirates: meraasEmirates,
            isActive: true,
            registrationDate: block.timestamp,
            reraLicense: "RERA-MERAAS-001",
            completedProjects: 85
        });
        
        // NAKHEEL - TIER1
        developers[0x3333333333333333333333333333333333333333] = DeveloperInfo({
            name: "NAKHEEL",
            tier: DeveloperTier.TIER1,
            operatingEmirates: meraasEmirates, // Dubai only
            isActive: true,
            registrationDate: block.timestamp,
            reraLicense: "RERA-NAKHEEL-001",
            completedProjects: 120
        });
        
        // DAMAC Properties - TIER2
        developers[0x4444444444444444444444444444444444444444] = DeveloperInfo({
            name: "DAMAC Properties",
            tier: DeveloperTier.TIER2,
            operatingEmirates: emaarEmirates, // Dubai + Abu Dhabi
            isActive: true,
            registrationDate: block.timestamp,
            reraLicense: "RERA-DAMAC-001",
            completedProjects: 95
        });
        
        // ALDAR Properties - TIER1 (Abu Dhabi's largest developer)
        UAEEmirate[] memory aldarEmirates = new UAEEmirate[](1);
        aldarEmirates[0] = UAEEmirate.ABU_DHABI;
        
        developers[0x5555555555555555555555555555555555555555] = DeveloperInfo({
            name: "ALDAR Properties",
            tier: DeveloperTier.TIER1,
            operatingEmirates: aldarEmirates,
            isActive: true,
            registrationDate: block.timestamp,
            reraLicense: "ADRA-ALDAR-001", // Abu Dhabi regulatory authority
            completedProjects: 180
        });
    }

    // =============================================================================
    // UTILITY FUNCTIONS
    // =============================================================================

    function _formatAED(uint256 amount) internal pure returns (string memory) {
        return string(abi.encodePacked(_toString(amount.div(1e18))));
    }

    function _tierToString(DeveloperTier tier) internal pure returns (string memory) {
        if (tier == DeveloperTier.TIER1) return "1";
        if (tier == DeveloperTier.TIER2) return "2";
        if (tier == DeveloperTier.TIER3) return "3";
        return "0";
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    // =============================================================================
    // VIEW FUNCTIONS
    // =============================================================================

    function getDeveloperInfo(address developer) external view returns (DeveloperInfo memory) {
        return developers[developer];
    }

    function isPremiumZone(string memory zone) external view returns (bool) {
        return premiumZones[zone];
    }

    function getEmirateZones(UAEEmirate emirate) external view returns (string[] memory) {
        return emirateZones[emirate];
    }

    function getTierFee(DeveloperTier tier) external view returns (uint256) {
        return tierFees[tier];
    }
}