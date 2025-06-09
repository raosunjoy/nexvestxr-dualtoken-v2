// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

// Forward declaration for PROPXToken
interface IPROPXToken {
    function activateToken() external;
}

// NOTE: PROPXToken contract should be deployed separately or defined below

// ============================================================================
// PROPX TOKEN FACTORY - For Premium Developer Properties
// ============================================================================

contract PROPXTokenFactory is AccessControl, ReentrancyGuard {
    using SafeMath for uint256;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant DEVELOPER_ROLE = keccak256("DEVELOPER_ROLE");

    enum DeveloperTier { NONE, TIER2, TIER1 }
    enum PropertyTokenStatus { PENDING, ACTIVE, FUNDED, COMPLETED, CANCELLED }
    enum PropertyCategory { RESIDENTIAL, COMMERCIAL, MIXED_USE, LUXURY, INDUSTRIAL }

    struct DeveloperProfile {
        address developerAddress;
        string companyName;
        string brandCode; // GODREJ, PRESTIGE, BRIGADE, SOBHA, DLF
        DeveloperTier tier;
        uint256 projectsDelivered;
        uint256 totalValueDelivered;
        uint256 reputationScore;
        bool isActive;
        uint256 registrationDate;
    }

    struct PROPXTokenInfo {
        address tokenContract;
        address developer;
        string propertyName;
        string propertyAddress;
        string projectCode; // BKC001, TECH002, etc.
        uint256 totalTokens;
        uint256 pricePerToken;
        uint256 minimumRaise;
        uint256 raisedAmount;
        uint256 fundingDeadline;
        PropertyTokenStatus status;
        string ipfsDocumentHash;
        string cityCode;
        PropertyCategory category;
    }

    mapping(address => DeveloperProfile) public developers;
    mapping(uint256 => PROPXTokenInfo) public propxTokens;
    mapping(string => bool) public usedProjectCodes; // Prevent duplicate codes
    mapping(string => address[]) public developersByCity; // City => developer addresses
    
    uint256 public propxTokenCount;
    uint256 public tier1PlatformFee = 150; // 1.5% for Tier 1 developers
    uint256 public tier2PlatformFee = 250; // 2.5% for Tier 2 developers

    // Events
    event DeveloperRegistered(
        address indexed developer, 
        string brandCode, 
        DeveloperTier tier
    );
    event PROPXTokenCreated(
        uint256 indexed tokenId, 
        address indexed developer, 
        address tokenContract,
        string projectCode
    );
    event PROPXTokenFunded(uint256 indexed tokenId, uint256 totalRaised);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    // ============================================================================
    // ENHANCED DEVELOPER MANAGEMENT
    // ============================================================================

    function registerDeveloper(
        address developerAddress,
        string memory companyName,
        string memory brandCode,
        DeveloperTier tier,
        uint256 projectsDelivered,
        uint256 totalValueDelivered,
        string memory primaryCity,
        bytes32[] memory verificationDocuments
    ) external onlyRole(ADMIN_ROLE) {
        require(developers[developerAddress].developerAddress == address(0), "Developer already registered");
        require(bytes(companyName).length > 0, "Company name required");
        require(bytes(brandCode).length > 0, "Brand code required");
        require(!isDuplicateBrandCode(brandCode), "Brand code already exists");

        uint256 reputationScore = calculateReputationScore(projectsDelivered, totalValueDelivered, tier);

        developers[developerAddress] = DeveloperProfile({
            developerAddress: developerAddress,
            companyName: companyName,
            brandCode: brandCode,
            tier: tier,
            projectsDelivered: projectsDelivered,
            totalValueDelivered: totalValueDelivered,
            reputationScore: reputationScore,
            isActive: true,
            registrationDate: block.timestamp
        });

        developersByCity[primaryCity].push(developerAddress);
        _grantRole(DEVELOPER_ROLE, developerAddress);
        
        emit DeveloperRegistered(developerAddress, brandCode, tier);
    }

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
    ) external onlyRole(DEVELOPER_ROLE) returns (address) {
        require(developers[msg.sender].isActive, "Developer not active");
        require(bytes(propertyName).length > 0, "Property name required");
        require(!usedProjectCodes[projectCode], "Project code already used");
        require(totalTokens > 0 && pricePerToken > 0, "Invalid token parameters");

        string memory brandCode = developers[msg.sender].brandCode;
        string memory tokenSymbol = string(abi.encodePacked("PROPX-", brandCode, "-", projectCode));
        string memory fullPropertyName = string(abi.encodePacked("PROPX ", brandCode, " ", propertyName));

        // TODO: Deploy new PROPX token contract
        // For now, we'll store the token info without creating the actual contract
        address newTokenAddress = address(0); // Placeholder

        propxTokenCount++;
        propxTokens[propxTokenCount] = PROPXTokenInfo({
            tokenContract: newTokenAddress,
            developer: msg.sender,
            propertyName: propertyName,
            propertyAddress: propertyAddress,
            projectCode: projectCode,
            totalTokens: totalTokens,
            pricePerToken: pricePerToken,
            minimumRaise: minimumRaise,
            raisedAmount: 0,
            fundingDeadline: block.timestamp + (fundingPeriodDays * 1 days),
            status: PropertyTokenStatus.PENDING,
            ipfsDocumentHash: ipfsDocumentHash,
            cityCode: cityCode,
            category: category
        });

        usedProjectCodes[projectCode] = true;

        emit PROPXTokenCreated(propxTokenCount, msg.sender, newTokenAddress, projectCode);
        return newTokenAddress;
    }

    function activatePROPXToken(uint256 tokenId) external onlyRole(ADMIN_ROLE) {
        require(tokenId <= propxTokenCount, "Invalid token ID");
        require(propxTokens[tokenId].status == PropertyTokenStatus.PENDING, "Token not pending");
        
        propxTokens[tokenId].status = PropertyTokenStatus.ACTIVE;
        IPROPXToken(propxTokens[tokenId].tokenContract).activateToken();
    }

    function isDuplicateBrandCode(string memory brandCode) internal view returns (bool) {
        // Check against existing developers
        // This is a simplified check - in practice, you'd maintain a mapping
        return false; // Implement proper duplicate checking
    }

    function calculateReputationScore(
        uint256 projectsDelivered,
        uint256 totalValueDelivered,
        DeveloperTier tier
    ) public pure returns (uint256) {
        uint256 baseScore = projectsDelivered.mul(10).add(totalValueDelivered.div(10**18));
        uint256 tierMultiplier = tier == DeveloperTier.TIER1 ? 150 : 100;
        return baseScore.mul(tierMultiplier).div(100);
    }

    // ============================================================================
    // ANALYTICS AND REPORTING
    // ============================================================================

    function getDeveloperPortfolio(address developer) external view returns (
        string memory brandCode,
        uint256 activeProjects,
        uint256 totalRaised,
        uint256 averageRaise,
        DeveloperTier tier
    ) {
        DeveloperProfile memory dev = developers[developer];
        uint256 projectCount = 0;
        uint256 totalFunding = 0;

        for (uint256 i = 1; i <= propxTokenCount; i++) {
            if (propxTokens[i].developer == developer && 
                propxTokens[i].status == PropertyTokenStatus.ACTIVE) {
                projectCount++;
                totalFunding = totalFunding.add(propxTokens[i].raisedAmount);
            }
        }

        return (
            dev.brandCode,
            projectCount,
            totalFunding,
            projectCount > 0 ? totalFunding.div(projectCount) : 0,
            dev.tier
        );
    }

    function getCityDevelopers(string memory cityCode) external view returns (address[] memory) {
        return developersByCity[cityCode];
    }

    function getPROPXTokensByCategory(PropertyCategory category) external view returns (uint256[] memory) {
        uint256[] memory tokens = new uint256[](propxTokenCount);
        uint256 count = 0;

        for (uint256 i = 1; i <= propxTokenCount; i++) {
            if (propxTokens[i].category == category) {
                tokens[count] = i;
                count++;
            }
        }

        // Resize array
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = tokens[i];
        }
        return result;
    }

    function getTokenInfo(uint256 tokenId) external view returns (PROPXTokenInfo memory) {
        require(tokenId <= propxTokenCount, "Invalid token ID");
        return propxTokens[tokenId];
    }

    function getTokenCount() external view returns (uint256) {
        return propxTokenCount;
    }
}