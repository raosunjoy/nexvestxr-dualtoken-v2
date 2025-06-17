// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title UAEPropertyToken
 * @dev ERC1155 token contract for UAE real estate tokenization
 * @dev Compliant with RERA (Real Estate Regulatory Agency) requirements
 * @dev Supports multi-currency investment with AED as primary currency
 */
contract UAEPropertyToken is ERC1155, Ownable, Pausable, ReentrancyGuard {
    using Counters for Counters.Counter;
    using Strings for uint256;

    // =============================================================================
    // STATE VARIABLES
    // =============================================================================

    Counters.Counter private _tokenIds;
    
    // UAE-specific configuration
    string public constant JURISDICTION = "UAE";
    string public constant REGULATORY_AUTHORITY = "RERA";
    address public reraCompliance;
    address public dldRegistry; // Dubai Land Department
    
    // Property registry
    struct Property {
        uint256 tokenId;
        string reraRegistrationNumber;
        string dldTitleDeedNumber;
        string propertyAddress;
        string zone; // Dubai zone, Abu Dhabi area, etc.
        string emirate;
        uint256 totalValue; // in AED wei (18 decimals)
        uint256 totalSupply; // total tokens for this property
        uint256 pricePerToken; // in AED wei
        PropertyType propertyType;
        PropertyStatus status;
        address developer;
        uint256 createdAt;
        uint256 fundingDeadline;
        bool reraApproved;
        bool dldRegistered;
        mapping(address => uint256) investorBalances;
        mapping(string => bool) complianceChecks;
    }

    enum PropertyType {
        APARTMENT,
        VILLA,
        TOWNHOUSE,
        PENTHOUSE,
        OFFICE,
        RETAIL,
        WAREHOUSE,
        HOTEL_APARTMENT
    }

    enum PropertyStatus {
        PENDING_APPROVAL,
        FUNDRAISING,
        FUNDED,
        CONSTRUCTION,
        COMPLETED,
        GENERATING_INCOME,
        SOLD
    }

    enum InvestmentTier {
        RETAIL,     // 25,000 - 500,000 AED
        PREMIUM,    // 500,000 - 2,000,000 AED  
        INSTITUTIONAL // 2,000,000+ AED
    }

    // Property storage
    mapping(uint256 => Property) public properties;
    mapping(string => uint256) public reraToTokenId;
    mapping(string => uint256) public dldToTokenId;
    
    // Investment tracking
    mapping(address => mapping(uint256 => uint256)) public userInvestments;
    mapping(address => InvestmentTier) public userTiers;
    mapping(address => bool) public kycApproved;
    mapping(address => bool) public amlCleared;
    mapping(address => string) public userEmirates;
    
    // Currency support (all amounts stored in AED wei)
    mapping(string => bool) public supportedCurrencies;
    mapping(string => uint256) public exchangeRates; // to AED, 18 decimals
    
    // Dividend tracking
    mapping(uint256 => uint256) public totalDividendsPaid;
    mapping(uint256 => mapping(address => uint256)) public userDividendsClaimed;
    mapping(uint256 => uint256) public dividendPerToken;
    
    // UAE-specific features
    mapping(address => bool) public reraVerifiedDevelopers;
    mapping(address => bool) public uaeResidents;
    mapping(address => bool) public gccResidents;
    
    // =============================================================================
    // EVENTS
    // =============================================================================

    event PropertyListed(
        uint256 indexed tokenId,
        string reraNumber,
        string dldNumber,
        address indexed developer,
        uint256 totalValue,
        uint256 totalSupply
    );
    
    event PropertyInvestment(
        uint256 indexed tokenId,
        address indexed investor,
        uint256 amount,
        uint256 tokens,
        string currency
    );
    
    event PropertyFunded(
        uint256 indexed tokenId,
        uint256 totalRaised,
        uint256 totalInvestors
    );
    
    event DividendDistributed(
        uint256 indexed tokenId,
        uint256 totalAmount,
        uint256 perTokenAmount
    );
    
    event DividendClaimed(
        uint256 indexed tokenId,
        address indexed investor,
        uint256 amount
    );
    
    event RERAApprovalUpdated(
        uint256 indexed tokenId,
        bool approved,
        string registrationNumber
    );
    
    event DLDRegistrationUpdated(
        uint256 indexed tokenId,
        bool registered,
        string titleDeedNumber
    );
    
    event ComplianceCheckUpdated(
        uint256 indexed tokenId,
        string checkType,
        bool passed
    );

    // =============================================================================
    // MODIFIERS
    // =============================================================================

    modifier onlyRERACompliance() {
        require(msg.sender == reraCompliance, "Only RERA compliance officer");
        _;
    }

    modifier onlyKYCApproved() {
        require(kycApproved[msg.sender], "KYC approval required");
        _;
    }

    modifier onlyAMLCleared() {
        require(amlCleared[msg.sender], "AML clearance required");
        _;
    }

    modifier validProperty(uint256 tokenId) {
        require(tokenId > 0 && tokenId <= _tokenIds.current(), "Invalid property token");
        _;
    }

    modifier onlyPropertyFunding(uint256 tokenId) {
        require(properties[tokenId].status == PropertyStatus.FUNDRAISING, "Property not in fundraising");
        require(block.timestamp <= properties[tokenId].fundingDeadline, "Funding period ended");
        _;
    }

    // =============================================================================
    // CONSTRUCTOR
    // =============================================================================

    constructor(
        string memory _uri,
        address _reraCompliance,
        address _dldRegistry
    ) ERC1155(_uri) {
        reraCompliance = _reraCompliance;
        dldRegistry = _dldRegistry;
        
        // Initialize supported currencies
        supportedCurrencies["AED"] = true;
        supportedCurrencies["USD"] = true;
        supportedCurrencies["EUR"] = true;
        supportedCurrencies["GBP"] = true;
        supportedCurrencies["SAR"] = true;
        supportedCurrencies["QAR"] = true;
        supportedCurrencies["KWD"] = true;
        
        // Initial exchange rates (18 decimals, 1 AED = X)
        exchangeRates["AED"] = 1e18;
        exchangeRates["USD"] = 272e15; // 1 USD = ~3.67 AED
        exchangeRates["EUR"] = 246e15; // 1 EUR = ~4.06 AED
        exchangeRates["GBP"] = 214e15; // 1 GBP = ~4.67 AED
        exchangeRates["SAR"] = 272e15; // 1 SAR = ~0.98 AED
        exchangeRates["QAR"] = 101e16; // 1 QAR = ~1.01 AED
        exchangeRates["KWD"] = 83e15;  // 1 KWD = ~12.04 AED
    }

    // =============================================================================
    // PROPERTY MANAGEMENT
    // =============================================================================

    /**
     * @dev List a new property for tokenization
     * @param reraNumber RERA registration number
     * @param dldNumber DLD title deed number
     * @param propertyAddress Full property address
     * @param zone Dubai zone or area designation
     * @param emirate UAE emirate
     * @param totalValue Total property value in AED wei
     * @param totalSupply Total tokens to be issued
     * @param propertyType Type of property
     * @param developer Developer address
     * @param fundingDurationDays Funding period in days
     */
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
    ) external onlyOwner returns (uint256) {
        require(bytes(reraNumber).length > 0, "RERA number required");
        require(bytes(dldNumber).length > 0, "DLD number required");
        require(totalValue > 0, "Invalid total value");
        require(totalSupply > 0, "Invalid total supply");
        require(developer != address(0), "Invalid developer address");
        // Check if developer is verified through RERA compliance contract
        // For now, allow any developer (can be enhanced later)
        // require(reraVerifiedDevelopers[developer], "Developer not RERA verified");
        
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        // Initialize property
        Property storage property = properties[newTokenId];
        property.tokenId = newTokenId;
        property.reraRegistrationNumber = reraNumber;
        property.dldTitleDeedNumber = dldNumber;
        property.propertyAddress = propertyAddress;
        property.zone = zone;
        property.emirate = emirate;
        property.totalValue = totalValue;
        property.totalSupply = totalSupply;
        property.pricePerToken = totalValue / totalSupply;
        property.propertyType = propertyType;
        property.status = PropertyStatus.PENDING_APPROVAL;
        property.developer = developer;
        property.createdAt = block.timestamp;
        property.fundingDeadline = block.timestamp + (fundingDurationDays * 1 days);
        property.reraApproved = false;
        property.dldRegistered = false;
        
        // Map RERA and DLD numbers to token ID
        reraToTokenId[reraNumber] = newTokenId;
        dldToTokenId[dldNumber] = newTokenId;
        
        emit PropertyListed(
            newTokenId,
            reraNumber,
            dldNumber,
            developer,
            totalValue,
            totalSupply
        );
        
        return newTokenId;
    }

    /**
     * @dev Approve property for fundraising (RERA compliance)
     */
    function approvePropertyRERA(
        uint256 tokenId,
        bool approved
    ) external onlyRERACompliance validProperty(tokenId) {
        properties[tokenId].reraApproved = approved;
        properties[tokenId].complianceChecks["RERA_APPROVED"] = approved;
        
        if (approved && properties[tokenId].dldRegistered) {
            properties[tokenId].status = PropertyStatus.FUNDRAISING;
        }
        
        emit RERAApprovalUpdated(tokenId, approved, properties[tokenId].reraRegistrationNumber);
        emit ComplianceCheckUpdated(tokenId, "RERA_APPROVED", approved);
    }

    /**
     * @dev Register property with DLD
     */
    function registerPropertyDLD(
        uint256 tokenId,
        bool registered
    ) external validProperty(tokenId) {
        require(msg.sender == dldRegistry || msg.sender == owner(), "Unauthorized DLD registration");
        
        properties[tokenId].dldRegistered = registered;
        properties[tokenId].complianceChecks["DLD_REGISTERED"] = registered;
        
        if (registered && properties[tokenId].reraApproved) {
            properties[tokenId].status = PropertyStatus.FUNDRAISING;
        }
        
        emit DLDRegistrationUpdated(tokenId, registered, properties[tokenId].dldTitleDeedNumber);
        emit ComplianceCheckUpdated(tokenId, "DLD_REGISTERED", registered);
    }

    // =============================================================================
    // INVESTMENT FUNCTIONS
    // =============================================================================

    /**
     * @dev Invest in a property with multi-currency support
     * @param tokenId Property token ID
     * @param tokenAmount Number of tokens to purchase
     * @param currency Currency code (AED, USD, EUR, etc.)
     * @param currencyAmount Amount in specified currency (wei)
     */
    function invest(
        uint256 tokenId,
        uint256 tokenAmount,
        string memory currency,
        uint256 currencyAmount
    ) external 
        onlyKYCApproved 
        onlyAMLCleared 
        validProperty(tokenId) 
        onlyPropertyFunding(tokenId)
        nonReentrant 
        whenNotPaused {
        
        require(supportedCurrencies[currency], "Currency not supported");
        require(tokenAmount > 0, "Invalid token amount");
        
        Property storage property = properties[tokenId];
        require(property.reraApproved && property.dldRegistered, "Property not approved");
        
        // Calculate required AED amount
        uint256 requiredAED = tokenAmount * property.pricePerToken;
        
        // Convert currency amount to AED
        uint256 aedEquivalent = (currencyAmount * exchangeRates[currency]) / 1e18;
        require(aedEquivalent >= requiredAED, "Insufficient amount");
        
        // Check investment limits based on user tier
        _checkInvestmentLimits(msg.sender, aedEquivalent);
        
        // Check token availability
        uint256 currentSupply = _getTotalSupply(tokenId);
        require(currentSupply + tokenAmount <= property.totalSupply, "Insufficient tokens available");
        
        // Mint tokens to investor
        _mint(msg.sender, tokenId, tokenAmount, "");
        
        // Update investment tracking
        userInvestments[msg.sender][tokenId] += aedEquivalent;
        property.investorBalances[msg.sender] += tokenAmount;
        
        // Check if property is fully funded
        if (_getTotalSupply(tokenId) >= property.totalSupply) {
            property.status = PropertyStatus.FUNDED;
            emit PropertyFunded(tokenId, property.totalValue, _getInvestorCount(tokenId));
        }
        
        emit PropertyInvestment(tokenId, msg.sender, aedEquivalent, tokenAmount, currency);
    }

    /**
     * @dev Check investment limits based on user tier and UAE regulations
     */
    function _checkInvestmentLimits(address investor, uint256 aedAmount) private view {
        InvestmentTier tier = userTiers[investor];
        
        if (tier == InvestmentTier.RETAIL) {
            require(aedAmount >= 25000 * 1e18, "Below minimum retail investment"); // 25,000 AED
            require(aedAmount <= 500000 * 1e18, "Above maximum retail investment"); // 500,000 AED
        } else if (tier == InvestmentTier.PREMIUM) {
            require(aedAmount >= 500000 * 1e18, "Below minimum premium investment"); // 500,000 AED
            require(aedAmount <= 2000000 * 1e18, "Above maximum premium investment"); // 2,000,000 AED
        } else if (tier == InvestmentTier.INSTITUTIONAL) {
            require(aedAmount >= 2000000 * 1e18, "Below minimum institutional investment"); // 2,000,000 AED
        }
    }

    // =============================================================================
    // DIVIDEND FUNCTIONS
    // =============================================================================

    /**
     * @dev Distribute dividends to token holders
     * @param tokenId Property token ID
     * @param totalDividend Total dividend amount in AED wei
     */
    function distributeDividends(
        uint256 tokenId,
        uint256 totalDividend
    ) external validProperty(tokenId) onlyOwner {
        require(totalDividend > 0, "Invalid dividend amount");
        require(properties[tokenId].status == PropertyStatus.GENERATING_INCOME, "Property not generating income");
        
        uint256 totalTokens = _getTotalSupply(tokenId);
        require(totalTokens > 0, "No tokens in circulation");
        
        uint256 dividendPerTokenAmount = totalDividend / totalTokens;
        
        dividendPerToken[tokenId] += dividendPerTokenAmount;
        totalDividendsPaid[tokenId] += totalDividend;
        
        emit DividendDistributed(tokenId, totalDividend, dividendPerTokenAmount);
    }

    /**
     * @dev Claim accumulated dividends
     * @param tokenId Property token ID
     */
    function claimDividends(uint256 tokenId) external validProperty(tokenId) nonReentrant {
        uint256 userTokens = balanceOf(msg.sender, tokenId);
        require(userTokens > 0, "No tokens owned");
        
        uint256 totalDividendPerToken = dividendPerToken[tokenId];
        uint256 userClaimedPerToken = userDividendsClaimed[tokenId][msg.sender];
        
        require(totalDividendPerToken > userClaimedPerToken, "No dividends to claim");
        
        uint256 unclaimedPerToken = totalDividendPerToken - userClaimedPerToken;
        uint256 dividendAmount = userTokens * unclaimedPerToken;
        
        userDividendsClaimed[tokenId][msg.sender] = totalDividendPerToken;
        
        // Transfer dividend (in native token or USDC/USDT)
        // Implementation depends on chosen dividend token
        
        emit DividendClaimed(tokenId, msg.sender, dividendAmount);
    }

    // =============================================================================
    // KYC/AML FUNCTIONS
    // =============================================================================

    /**
     * @dev Approve user KYC
     */
    function approveKYC(address user, bool approved) external onlyOwner {
        kycApproved[user] = approved;
    }

    /**
     * @dev Clear user AML
     */
    function clearAML(address user, bool cleared) external onlyOwner {
        amlCleared[user] = cleared;
    }

    /**
     * @dev Set user investment tier
     */
    function setUserTier(address user, InvestmentTier tier) external onlyOwner {
        userTiers[user] = tier;
    }

    /**
     * @dev Set user emirate
     */
    function setUserEmirate(address user, string memory emirate) external onlyOwner {
        userEmirates[user] = emirate;
    }

    /**
     * @dev Verify developer with RERA
     */
    function verifyDeveloper(address developer, bool verified) external onlyRERACompliance {
        reraVerifiedDevelopers[developer] = verified;
    }

    // =============================================================================
    // CURRENCY FUNCTIONS
    // =============================================================================

    /**
     * @dev Update exchange rates
     */
    function updateExchangeRate(string memory currency, uint256 rate) external onlyOwner {
        require(supportedCurrencies[currency], "Currency not supported");
        exchangeRates[currency] = rate;
    }

    /**
     * @dev Add supported currency
     */
    function addSupportedCurrency(string memory currency, uint256 initialRate) external onlyOwner {
        supportedCurrencies[currency] = true;
        exchangeRates[currency] = initialRate;
    }

    // =============================================================================
    // VIEW FUNCTIONS
    // =============================================================================

    /**
     * @dev Get property details
     */
    function getPropertyDetails(uint256 tokenId) external view validProperty(tokenId) returns (
        string memory reraNumber,
        string memory dldNumber,
        string memory propertyAddress,
        string memory zone,
        string memory emirate,
        uint256 totalValue,
        uint256 totalSupply,
        uint256 pricePerToken,
        PropertyType propertyType,
        PropertyStatus status,
        address developer,
        bool reraApproved,
        bool dldRegistered
    ) {
        Property storage property = properties[tokenId];
        return (
            property.reraRegistrationNumber,
            property.dldTitleDeedNumber,
            property.propertyAddress,
            property.zone,
            property.emirate,
            property.totalValue,
            property.totalSupply,
            property.pricePerToken,
            property.propertyType,
            property.status,
            property.developer,
            property.reraApproved,
            property.dldRegistered
        );
    }

    /**
     * @dev Get user investment summary
     */
    function getUserInvestmentSummary(address user, uint256 tokenId) external view returns (
        uint256 tokensOwned,
        uint256 aedInvested,
        uint256 currentValue,
        uint256 unclaimedDividends
    ) {
        tokensOwned = balanceOf(user, tokenId);
        aedInvested = userInvestments[user][tokenId];
        currentValue = tokensOwned * properties[tokenId].pricePerToken;
        
        uint256 totalDividendPerToken = dividendPerToken[tokenId];
        uint256 userClaimedPerToken = userDividendsClaimed[tokenId][user];
        unclaimedDividends = tokensOwned * (totalDividendPerToken - userClaimedPerToken);
    }

    /**
     * @dev Get total supply of tokens for a property
     */
    function _getTotalSupply(uint256 tokenId) private view returns (uint256) {
        // For ERC1155, we need to track total supply separately
        // This is a simplified implementation
        return properties[tokenId].totalSupply - _getRemainingTokens(tokenId);
    }
    
    /**
     * @dev Get remaining tokens available for a property
     */
    function _getRemainingTokens(uint256 tokenId) private view returns (uint256) {
        // Calculate based on property total supply and current state
        // This is a simplified implementation for demonstration
        return 0;
    }

    /**
     * @dev Get total number of investors for a property
     */
    function _getInvestorCount(uint256 tokenId) private view returns (uint256) {
        // This would need to be tracked separately in a real implementation
        // For simplicity, we're not implementing the full tracking here
        return 0;
    }

    /**
     * @dev Convert currency amount to AED
     */
    function convertToAED(string memory currency, uint256 amount) external view returns (uint256) {
        require(supportedCurrencies[currency], "Currency not supported");
        return (amount * exchangeRates[currency]) / 1e18;
    }

    // =============================================================================
    // ADMIN FUNCTIONS
    // =============================================================================

    /**
     * @dev Update property status
     */
    function updatePropertyStatus(uint256 tokenId, PropertyStatus newStatus) external onlyOwner validProperty(tokenId) {
        properties[tokenId].status = newStatus;
    }

    /**
     * @dev Set RERA compliance address
     */
    function setRERACompliance(address _reraCompliance) external onlyOwner {
        reraCompliance = _reraCompliance;
    }

    /**
     * @dev Set DLD registry address
     */
    function setDLDRegistry(address _dldRegistry) external onlyOwner {
        dldRegistry = _dldRegistry;
    }

    /**
     * @dev Pause contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Override URI for metadata
     */
    function uri(uint256 tokenId) public view override returns (string memory) {
        require(tokenId > 0 && tokenId <= _tokenIds.current(), "Token does not exist");
        return string(abi.encodePacked(super.uri(tokenId), tokenId.toString()));
    }

    // =============================================================================
    // HOOKS
    // =============================================================================

    /**
     * @dev Hook for token transfers
     */
    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
        
        // Additional checks for UAE compliance
        if (to != address(0) && from != address(0)) {
            require(kycApproved[to], "Recipient must be KYC approved");
            require(amlCleared[to], "Recipient must be AML cleared");
        }
    }
}