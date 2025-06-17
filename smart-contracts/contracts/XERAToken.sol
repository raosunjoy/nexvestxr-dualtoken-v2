// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "./security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

// ============================================================================
// XERA PLATFORM TOKEN - For Small Developers and Landowners
// ============================================================================

contract XERAToken is ERC20, ERC20Votes, ReentrancyGuard, Pausable, AccessControl {
    using SafeMath for uint256;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PROPERTY_MANAGER_ROLE = keccak256("PROPERTY_MANAGER_ROLE");
    bytes32 public constant VALUER_ROLE = keccak256("VALUER_ROLE");

    struct Property {
        uint256 id;
        address owner;
        string propertyAddress;
        uint256 valuationInWei;
        uint256 tokenAllocation;
        uint256 lastValuationDate;
        PropertyStatus status;
        string ipfsDocumentHash;
        PropertyCategory category;
        string cityCode; // MUM, BANG, DEL, CHEN, HYD, PUN
    }

    struct DividendPeriod {
        uint256 periodId;
        uint256 totalDividend;
        uint256 exDividendDate;
        uint256 paymentDate;
        mapping(address => bool) claimed;
    }

    enum PropertyStatus { PENDING, ACTIVE, UNDER_REVIEW, SUSPENDED, SOLD }
    enum PropertyCategory { RESIDENTIAL, COMMERCIAL, MIXED_USE, LAND, INDUSTRIAL }

    // State variables
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1 billion XERA tokens
    uint256 public totalPropertyValue;
    uint256 public currentPropertyCount;
    uint256 public currentDividendPeriod;
    uint256 public minimumPropertyValue = 5000000 * 10**18; // ₹50 lakh in wei
    uint256 public platformFeePercentage = 250; // 2.5%
    uint256 public reserveRatio = 1000; // 10%

    // Regional pools tracking
    mapping(string => uint256) public cityPoolValues; // MUM => total value
    mapping(string => uint256[]) public cityProperties; // MUM => [property IDs]
    mapping(PropertyCategory => uint256) public categoryValues;

    mapping(uint256 => Property) public properties;
    mapping(uint256 => DividendPeriod) public dividendPeriods;
    mapping(address => uint256[]) public userProperties;
    mapping(address => uint256) public lastClaimedDividend;

    // Events
    event PropertyAdded(
        uint256 indexed propertyId, 
        address indexed owner, 
        uint256 valuation,
        string cityCode,
        PropertyCategory category
    );
    event PropertyRevalued(uint256 indexed propertyId, uint256 oldValuation, uint256 newValuation);
    event DividendDeclared(uint256 indexed periodId, uint256 totalAmount);
    event DividendClaimed(address indexed user, uint256 amount, uint256 periodId);
    event PropertySold(uint256 indexed propertyId, uint256 salePrice);
    event CityPoolUpdated(string indexed cityCode, uint256 newValue);

    constructor() ERC20("XERA Real Estate India", "XERA") ERC20Permit("XERA") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        
        // Initial minting for liquidity and platform reserves
        _mint(msg.sender, MAX_SUPPLY.mul(15).div(100)); // 15% for liquidity and reserves
    }

    // ============================================================================
    // ENHANCED PROPERTY MANAGEMENT
    // ============================================================================

    function addProperty(
        address propertyOwner,
        string memory propertyAddress,
        uint256 valuationInWei,
        string memory ipfsDocumentHash,
        PropertyCategory category,
        string memory cityCode
    ) external onlyRole(PROPERTY_MANAGER_ROLE) nonReentrantFunction returns (uint256) {
        require(valuationInWei >= minimumPropertyValue, "Property value below minimum");
        require(bytes(propertyAddress).length > 0, "Property address required");
        require(bytes(ipfsDocumentHash).length > 0, "Document hash required");
        require(bytes(cityCode).length > 0, "City code required");

        uint256 propertyId = currentPropertyCount + 1;
        uint256 tokenAllocation = calculateTokenAllocation(valuationInWei, category, cityCode);

        properties[propertyId] = Property({
            id: propertyId,
            owner: propertyOwner,
            propertyAddress: propertyAddress,
            valuationInWei: valuationInWei,
            tokenAllocation: tokenAllocation,
            lastValuationDate: block.timestamp,
            status: PropertyStatus.PENDING,
            ipfsDocumentHash: ipfsDocumentHash,
            category: category,
            cityCode: cityCode
        });

        userProperties[propertyOwner].push(propertyId);
        cityProperties[cityCode].push(propertyId);
        currentPropertyCount++;

        emit PropertyAdded(propertyId, propertyOwner, valuationInWei, cityCode, category);
        return propertyId;
    }

    function approveProperty(uint256 propertyId) external onlyRole(ADMIN_ROLE) nonReentrantAdvanced {
        require(properties[propertyId].id != 0, "Property does not exist");
        require(properties[propertyId].status == PropertyStatus.PENDING, "Property not pending");

        Property storage property = properties[propertyId];
        property.status = PropertyStatus.ACTIVE;

        // Mint tokens to property owner
        _mint(property.owner, property.tokenAllocation);
        
        // Update tracking variables
        totalPropertyValue = totalPropertyValue.add(property.valuationInWei);
        cityPoolValues[property.cityCode] = cityPoolValues[property.cityCode].add(property.valuationInWei);
        categoryValues[property.category] = categoryValues[property.category].add(property.valuationInWei);

        emit CityPoolUpdated(property.cityCode, cityPoolValues[property.cityCode]);
    }

    function calculateTokenAllocation(
        uint256 propertyValue, 
        PropertyCategory category,
        string memory cityCode
    ) public view returns (uint256) {
        if (totalPropertyValue == 0) {
            return MAX_SUPPLY.mul(80).div(100).div(1000); // Initial allocation
        }
        
        uint256 baseAllocation = propertyValue.mul(10**18).div(totalPropertyValue.add(propertyValue));
        
        // Apply category multipliers
        uint256 categoryMultiplier = getCategoryMultiplier(category);
        uint256 cityMultiplier = getCityMultiplier(cityCode);
        
        return MAX_SUPPLY.mul(80).div(100) // 80% of tokens for properties
            .mul(baseAllocation).div(10**18)
            .mul(categoryMultiplier).div(100)
            .mul(cityMultiplier).div(100);
    }

    function getCategoryMultiplier(PropertyCategory category) public pure returns (uint256) {
        if (category == PropertyCategory.COMMERCIAL) return 120; // 20% premium
        if (category == PropertyCategory.MIXED_USE) return 110; // 10% premium  
        if (category == PropertyCategory.INDUSTRIAL) return 105; // 5% premium
        return 100; // Base for residential and land
    }

    function getCityMultiplier(string memory cityCode) public pure returns (uint256) {
        bytes32 cityHash = keccak256(abi.encodePacked(cityCode));
        
        if (cityHash == keccak256("MUM") || cityHash == keccak256("DEL")) return 130; // Tier 1A
        if (cityHash == keccak256("BANG") || cityHash == keccak256("CHEN") || cityHash == keccak256("HYD")) return 120; // Tier 1B
        if (cityHash == keccak256("PUN") || cityHash == keccak256("AHM") || cityHash == keccak256("KOL")) return 110; // Tier 1C
        return 100; // Other cities
    }

    // ============================================================================
    // CITY AND CATEGORY ANALYTICS
    // ============================================================================

    function getCityPortfolio(string memory cityCode) external view returns (
        uint256 totalValue,
        uint256 propertyCount,
        uint256[] memory propertyIds
    ) {
        return (
            cityPoolValues[cityCode],
            cityProperties[cityCode].length,
            cityProperties[cityCode]
        );
    }

    function getCategoryBreakdown() external view returns (
        uint256 residential,
        uint256 commercial,
        uint256 mixedUse,
        uint256 land,
        uint256 industrial
    ) {
        return (
            categoryValues[PropertyCategory.RESIDENTIAL],
            categoryValues[PropertyCategory.COMMERCIAL],
            categoryValues[PropertyCategory.MIXED_USE],
            categoryValues[PropertyCategory.LAND],
            categoryValues[PropertyCategory.INDUSTRIAL]
        );
    }

    function getXERAMetrics() external view returns (
        uint256 netAssetValue,
        uint256 totalProperties,
        uint256 averagePropertyValue,
        uint256 diversificationScore
    ) {
        netAssetValue = getNetAssetValue();
        totalProperties = currentPropertyCount;
        averagePropertyValue = totalProperties > 0 ? totalPropertyValue.div(totalProperties) : 0;
        diversificationScore = calculateDiversificationScore();
    }

    function calculateDiversificationScore() public view returns (uint256) {
        if (totalPropertyValue == 0) return 0;
        
        // Calculate city diversification (max 50 points)
        uint256 cityDiversification = 0;
        string[6] memory cities = ["MUM", "DEL", "BANG", "CHEN", "HYD", "PUN"];
        for (uint256 i = 0; i < 6; i++) {
            uint256 cityPercentage = cityPoolValues[cities[i]].mul(100).div(totalPropertyValue);
            if (cityPercentage > 0 && cityPercentage <= 30) {
                cityDiversification = cityDiversification.add(8); // 8 points per well-balanced city
            }
        }
        
        // Calculate category diversification (max 50 points)
        uint256 categoryDiversification = 0;
        for (uint256 i = 0; i < 5; i++) {
            PropertyCategory category = PropertyCategory(i);
            uint256 categoryPercentage = categoryValues[category].mul(100).div(totalPropertyValue);
            if (categoryPercentage > 0 && categoryPercentage <= 40) {
                categoryDiversification = categoryDiversification.add(10); // 10 points per category
            }
        }
        
        return cityDiversification.add(categoryDiversification);
    }

    // ============================================================================
    // ENHANCED DIVIDEND MANAGEMENT
    // ============================================================================

    function declareDividend(string memory source) external payable onlyRole(ADMIN_ROLE) nonReentrantAdvanced {
        require(msg.value > 0, "Dividend amount must be positive");
        
        currentDividendPeriod++;
        DividendPeriod storage period = dividendPeriods[currentDividendPeriod];
        period.periodId = currentDividendPeriod;
        period.totalDividend = msg.value;
        period.exDividendDate = block.timestamp;
        period.paymentDate = block.timestamp + 7 days;

        emit DividendDeclared(currentDividendPeriod, msg.value);
    }

    function claimAllAvailableDividends() external nonReentrantAdvanced {
        uint256 totalClaimable = 0;
        uint256 userBalance = balanceOf(msg.sender);
        require(userBalance > 0, "No tokens held");

        for (uint256 i = lastClaimedDividend[msg.sender] + 1; i <= currentDividendPeriod; i++) {
            if (block.timestamp >= dividendPeriods[i].paymentDate && 
                !dividendPeriods[i].claimed[msg.sender]) {
                
                uint256 totalSupplyAtPeriod = totalSupply();
                uint256 dividendAmount = dividendPeriods[i].totalDividend
                    .mul(userBalance)
                    .div(totalSupplyAtPeriod);
                
                totalClaimable = totalClaimable.add(dividendAmount);
                dividendPeriods[i].claimed[msg.sender] = true;
            }
        }

        require(totalClaimable > 0, "No dividends available");
        lastClaimedDividend[msg.sender] = currentDividendPeriod;

        payable(msg.sender).transfer(totalClaimable);
        emit DividendClaimed(msg.sender, totalClaimable, currentDividendPeriod);
    }

    // ============================================================================
    // VIEW FUNCTIONS
    // ============================================================================

    function getNetAssetValue() public view returns (uint256) {
        if (totalSupply() == 0) return 0;
        return totalPropertyValue.mul(10**18).div(totalSupply());
    }

    function getProperty(uint256 propertyId) external view returns (
        uint256 id,
        address owner,
        string memory propertyAddress,
        uint256 valuationInWei,
        uint256 tokenAllocation,
        uint256 lastValuationDate,
        PropertyStatus status,
        PropertyCategory category,
        string memory cityCode
    ) {
        Property storage prop = properties[propertyId];
        return (
            prop.id,
            prop.owner,
            prop.propertyAddress,
            prop.valuationInWei,
            prop.tokenAllocation,
            prop.lastValuationDate,
            prop.status,
            prop.category,
            prop.cityCode
        );
    }

    // Required overrides
    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal whenNotPaused override {
        super._beforeTokenTransfer(from, to, amount);
    }

    function _afterTokenTransfer(address from, address to, uint256 amount)
        internal override(ERC20, ERC20Votes) {
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal override(ERC20, ERC20Votes) {
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount) internal override(ERC20, ERC20Votes) {
        super._burn(account, amount);
    }

    // ============================================================================
    // SECURITY FUNCTIONS
    // ============================================================================

    /**
     * @dev Emergency pause function
     */
    function emergencyPause() external onlyRole(ADMIN_ROLE) {
        _pause();
        _emergencyLock();
    }

    /**
     * @dev Unpause function
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
        _emergencyUnlock();
    }

    /**
     * @dev Enhanced transfer with additional security checks
     */
    function secureTransfer(address to, uint256 amount) external nonReentrantAdvanced returns (bool) {
        require(to != address(0), "Transfer to zero address");
        require(to != address(this), "Transfer to contract address");
        require(amount > 0, "Transfer amount must be positive");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        return transfer(to, amount);
    }

    /**
     * @dev Batch transfer with reentrancy protection
     */
    function batchTransfer(address[] calldata recipients, uint256[] calldata amounts) 
        external 
        nonReentrantAdvanced 
        returns (bool) 
    {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        require(recipients.length <= 100, "Too many recipients");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount = totalAmount.add(amounts[i]);
        }
        
        require(balanceOf(msg.sender) >= totalAmount, "Insufficient balance for batch transfer");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Transfer to zero address");
            require(amounts[i] > 0, "Transfer amount must be positive");
            _transfer(msg.sender, recipients[i], amounts[i]);
        }
        
        return true;
    }

    /**
     * @dev Override transfer to add security checks
     */
    function transfer(address to, uint256 amount) public override nonReentrant returns (bool) {
        require(!_isEmergencyLocked(), "Contract is emergency locked");
        return super.transfer(to, amount);
    }

    /**
     * @dev Override transferFrom to add security checks
     */
    function transferFrom(address from, address to, uint256 amount) public override nonReentrant returns (bool) {
        require(!_isEmergencyLocked(), "Contract is emergency locked");
        return super.transferFrom(from, to, amount);
    }

    /**
     * @dev Override approve to add security checks
     */
    function approve(address spender, uint256 amount) public override nonReentrant returns (bool) {
        require(!_isEmergencyLocked(), "Contract is emergency locked");
        require(spender != address(0), "Approve to zero address");
        return super.approve(spender, amount);
    }

    /**
     * @dev Get security status
     */
    function getSecurityStatus() external view returns (
        bool isPaused,
        bool isEmergencyLocked,
        uint256 lockCounter,
        bool reentrancyGuardEntered
    ) {
        return (
            paused(),
            _isEmergencyLocked(),
            _getLockCounter(),
            _reentrancyGuardEntered()
        );
    }
}