// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title UAEXERAToken
 * @dev UAE-customized XERA token with Dubai/Abu Dhabi/Sharjah city pools
 * @dev Implements AED-based staking, governance, and dividends
 */
contract UAEXERAToken is ERC20Permit, ERC20Votes, ReentrancyGuard, Pausable, AccessControl {
    using SafeMath for uint256;

    // =============================================================================
    // ROLES & CONSTANTS
    // =============================================================================

    bytes32 public constant PROPERTY_MANAGER_ROLE = keccak256("PROPERTY_MANAGER_ROLE");
    bytes32 public constant DIVIDEND_MANAGER_ROLE = keccak256("DIVIDEND_MANAGER_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    uint256 public constant MAX_SUPPLY = 1000000000 * 1e18; // 1 billion XERA tokens
    uint256 public constant PLATFORM_FEE_PERCENT = 250;    // 2.5% platform fee

    // =============================================================================
    // ENUMS & STRUCTS
    // =============================================================================

    enum UAECity { DUBAI, ABU_DHABI, SHARJAH, AJMAN, RAS_AL_KHAIMAH, FUJAIRAH, UMM_AL_QUWAIN }
    enum PropertyCategory { RESIDENTIAL, COMMERCIAL, MIXED_USE, HOSPITALITY, INDUSTRIAL }
    enum StakingTier { BRONZE, SILVER, GOLD, PLATINUM, DIAMOND }

    struct CityPool {
        string name;
        uint256 totalValue;         // Total value of properties in AED wei
        uint256 totalTokens;        // Total XERA tokens allocated
        uint256 propertiesCount;    // Number of properties in pool
        uint256 monthlyDividends;   // Monthly dividends in AED wei
        uint256 averageYield;       // Average yield percentage (basis points)
        bool isActive;
        uint256 multiplier;         // City multiplier (basis points, 10000 = 1.0x)
    }

    struct PropertyInfo {
        uint256 id;
        string name;
        uint256 valueInAED;
        UAECity city;
        PropertyCategory category;
        uint256 tokensAllocated;
        uint256 monthlyRental;
        bool isActive;
        address developer;
        string zone;
    }

    struct StakingInfo {
        uint256 amount;             // Staked XERA amount
        uint256 stakingTimestamp;   // When staking started
        uint256 lastRewardClaim;    // Last reward claim timestamp
        StakingTier tier;           // Current staking tier
        uint256 accumulatedRewards; // Accumulated AED rewards
        UAECity preferredCity;      // Preferred city for rewards
    }

    struct UserPortfolio {
        uint256 totalXERABalance;
        uint256 totalStaked;
        uint256 totalDividends;
        uint256 totalRewards;
        mapping(UAECity => uint256) cityAllocations;
        mapping(PropertyCategory => uint256) categoryAllocations;
        StakingInfo stakingInfo;
    }

    // =============================================================================
    // STATE VARIABLES
    // =============================================================================

    // City pools
    mapping(UAECity => CityPool) public cityPools;
    UAECity[] public supportedCities;

    // Properties
    mapping(uint256 => PropertyInfo) public properties;
    mapping(UAECity => uint256[]) public cityProperties;
    uint256 public nextPropertyId = 1;

    // User portfolios
    mapping(address => UserPortfolio) public userPortfolios;

    // Staking configuration
    mapping(StakingTier => uint256) public stakingThresholds; // Minimum XERA for tier
    mapping(StakingTier => uint256) public stakingAPY;        // APY in basis points
    mapping(StakingTier => uint256) public feeDiscounts;     // Fee discount in basis points

    // Dividend distribution
    uint256 public totalDividendPool;
    uint256 public lastDividendDistribution;
    mapping(address => uint256) public pendingDividends;

    // Category multipliers (basis points, 10000 = 1.0x)
    mapping(PropertyCategory => uint256) public categoryMultipliers;

    // Events
    event PropertyAdded(uint256 indexed propertyId, string name, UAECity city, uint256 valueInAED);
    event TokensAllocated(uint256 indexed propertyId, uint256 tokensAllocated, address recipient);
    event DividendDistributed(address indexed user, uint256 amount, UAECity city);
    event StakingTierChanged(address indexed user, StakingTier oldTier, StakingTier newTier);
    event CityPoolUpdated(UAECity city, uint256 totalValue, uint256 totalTokens);

    // =============================================================================
    // CONSTRUCTOR
    // =============================================================================

    constructor() 
        ERC20("UAE XERA Token", "UAEXERA") 
        ERC20Permit("UAE XERA Token") 
    {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PROPERTY_MANAGER_ROLE, msg.sender);
        _grantRole(DIVIDEND_MANAGER_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);

        // Initialize city pools
        _initializeCityPools();
        
        // Initialize staking tiers (amounts in XERA wei)
        _initializeStakingTiers();
        
        // Initialize category multipliers
        _initializeCategoryMultipliers();

        // Mint initial supply to contract for distribution
        _mint(address(this), MAX_SUPPLY);
    }

    // =============================================================================
    // PROPERTY MANAGEMENT
    // =============================================================================

    /**
     * @dev Add new property to UAE city pool
     */
    function addProperty(
        string memory name,
        uint256 valueInAED,
        UAECity city,
        PropertyCategory category,
        uint256 monthlyRental,
        address developer,
        string memory zone
    ) external onlyRole(PROPERTY_MANAGER_ROLE) returns (uint256 propertyId) {
        
        propertyId = nextPropertyId++;
        
        // Calculate tokens to allocate based on city multiplier and category
        uint256 baseTokens = _calculateTokenAllocation(valueInAED, city, category);
        
        properties[propertyId] = PropertyInfo({
            id: propertyId,
            name: name,
            valueInAED: valueInAED,
            city: city,
            category: category,
            tokensAllocated: baseTokens,
            monthlyRental: monthlyRental,
            isActive: true,
            developer: developer,
            zone: zone
        });
        
        // Update city pool
        CityPool storage pool = cityPools[city];
        pool.totalValue = pool.totalValue.add(valueInAED);
        pool.totalTokens = pool.totalTokens.add(baseTokens);
        pool.propertiesCount = pool.propertiesCount.add(1);
        pool.monthlyDividends = pool.monthlyDividends.add(monthlyRental);
        
        // Add to city properties list
        cityProperties[city].push(propertyId);
        
        emit PropertyAdded(propertyId, name, city, valueInAED);
        emit CityPoolUpdated(city, pool.totalValue, pool.totalTokens);
        
        return propertyId;
    }

    /**
     * @dev Allocate property tokens to investor
     */
    function allocateTokens(
        uint256 propertyId,
        address investor,
        uint256 aedInvestmentAmount
    ) external onlyRole(PROPERTY_MANAGER_ROLE) nonReentrant {
        
        PropertyInfo storage property = properties[propertyId];
        require(property.isActive, "Property not active");
        
        // Calculate token allocation based on investment percentage
        uint256 investmentPercentage = aedInvestmentAmount.mul(10000).div(property.valueInAED);
        uint256 tokensToAllocate = property.tokensAllocated.mul(investmentPercentage).div(10000);
        
        require(tokensToAllocate > 0, "Invalid token allocation");
        
        // Transfer tokens to investor
        _transfer(address(this), investor, tokensToAllocate);
        
        // Update user portfolio
        UserPortfolio storage portfolio = userPortfolios[investor];
        portfolio.totalXERABalance = portfolio.totalXERABalance.add(tokensToAllocate);
        portfolio.cityAllocations[property.city] = portfolio.cityAllocations[property.city].add(tokensToAllocate);
        portfolio.categoryAllocations[property.category] = portfolio.categoryAllocations[property.category].add(tokensToAllocate);
        
        emit TokensAllocated(propertyId, tokensToAllocate, investor);
    }

    // =============================================================================
    // STAKING FUNCTIONS
    // =============================================================================

    /**
     * @dev Stake XERA tokens for rewards
     */
    function stakeTokens(uint256 amount, UAECity preferredCity) external nonReentrant whenNotPaused {
        require(amount > 0, "Invalid staking amount");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        UserPortfolio storage portfolio = userPortfolios[msg.sender];
        StakingInfo storage stakingInfo = portfolio.stakingInfo;
        
        // Claim pending rewards before updating stake
        _claimStakingRewards(msg.sender);
        
        // Transfer tokens to contract
        _transfer(msg.sender, address(this), amount);
        
        // Update staking info
        stakingInfo.amount = stakingInfo.amount.add(amount);
        stakingInfo.stakingTimestamp = block.timestamp;
        stakingInfo.lastRewardClaim = block.timestamp;
        stakingInfo.preferredCity = preferredCity;
        
        // Update portfolio
        portfolio.totalStaked = portfolio.totalStaked.add(amount);
        
        // Check for tier upgrade
        StakingTier oldTier = stakingInfo.tier;
        stakingInfo.tier = _calculateStakingTier(stakingInfo.amount);
        
        if (stakingInfo.tier != oldTier) {
            emit StakingTierChanged(msg.sender, oldTier, stakingInfo.tier);
        }
    }

    /**
     * @dev Unstake XERA tokens
     */
    function unstakeTokens(uint256 amount) external nonReentrant {
        UserPortfolio storage portfolio = userPortfolios[msg.sender];
        StakingInfo storage stakingInfo = portfolio.stakingInfo;
        
        require(stakingInfo.amount >= amount, "Insufficient staked amount");
        
        // Claim pending rewards
        _claimStakingRewards(msg.sender);
        
        // Update staking info
        stakingInfo.amount = stakingInfo.amount.sub(amount);
        portfolio.totalStaked = portfolio.totalStaked.sub(amount);
        
        // Update tier
        StakingTier oldTier = stakingInfo.tier;
        stakingInfo.tier = _calculateStakingTier(stakingInfo.amount);
        
        if (stakingInfo.tier != oldTier) {
            emit StakingTierChanged(msg.sender, oldTier, stakingInfo.tier);
        }
        
        // Transfer tokens back to user
        _transfer(address(this), msg.sender, amount);
    }

    /**
     * @dev Claim staking rewards
     */
    function claimStakingRewards() external nonReentrant {
        _claimStakingRewards(msg.sender);
    }

    /**
     * @dev Internal function to claim staking rewards
     */
    function _claimStakingRewards(address user) internal {
        UserPortfolio storage portfolio = userPortfolios[user];
        StakingInfo storage stakingInfo = portfolio.stakingInfo;
        
        if (stakingInfo.amount == 0) return;
        
        uint256 timeSinceLastClaim = block.timestamp.sub(stakingInfo.lastRewardClaim);
        uint256 apy = stakingAPY[stakingInfo.tier];
        
        // Calculate AED rewards (assuming 1 XERA = 1 AED for simplicity)
        uint256 rewards = stakingInfo.amount
            .mul(apy)
            .mul(timeSinceLastClaim)
            .div(365 days)
            .div(10000); // Convert from basis points
        
        if (rewards > 0) {
            stakingInfo.accumulatedRewards = stakingInfo.accumulatedRewards.add(rewards);
            stakingInfo.lastRewardClaim = block.timestamp;
            portfolio.totalRewards = portfolio.totalRewards.add(rewards);
            
            // Add to pending dividends (in AED)
            pendingDividends[user] = pendingDividends[user].add(rewards);
        }
    }

    // =============================================================================
    // DIVIDEND FUNCTIONS
    // =============================================================================

    /**
     * @dev Distribute monthly dividends to token holders
     */
    function distributeDividends() external onlyRole(DIVIDEND_MANAGER_ROLE) {
        require(block.timestamp >= lastDividendDistribution.add(30 days), "Too early for dividend distribution");
        
        for (uint256 i = 0; i < supportedCities.length; i++) {
            UAECity city = supportedCities[i];
            CityPool storage pool = cityPools[city];
            
            if (pool.totalTokens > 0 && pool.monthlyDividends > 0) {
                // Calculate dividend per token for this city
                uint256 dividendPerToken = pool.monthlyDividends.mul(1e18).div(pool.totalTokens);
                
                // Update city pool average yield
                pool.averageYield = pool.monthlyDividends.mul(10000).mul(12).div(pool.totalValue);
            }
        }
        
        lastDividendDistribution = block.timestamp;
    }

    /**
     * @dev Claim pending dividends
     */
    function claimDividends() external nonReentrant {
        uint256 amount = pendingDividends[msg.sender];
        require(amount > 0, "No pending dividends");
        
        pendingDividends[msg.sender] = 0;
        userPortfolios[msg.sender].totalDividends = userPortfolios[msg.sender].totalDividends.add(amount);
        
        // Transfer AED equivalent (would be actual AED in production)
        // For now, we'll mint equivalent XERA tokens as dividends
        _mint(msg.sender, amount);
        
        emit DividendDistributed(msg.sender, amount, UAECity.DUBAI); // Default to Dubai
    }

    // =============================================================================
    // HELPER FUNCTIONS
    // =============================================================================

    /**
     * @dev Calculate token allocation for property
     */
    function _calculateTokenAllocation(
        uint256 valueInAED,
        UAECity city,
        PropertyCategory category
    ) internal view returns (uint256) {
        
        // Base allocation: 1 token per 100 AED
        uint256 baseTokens = valueInAED.div(100 * 1e18);
        
        // Apply city multiplier
        uint256 cityMultiplier = cityPools[city].multiplier;
        baseTokens = baseTokens.mul(cityMultiplier).div(10000);
        
        // Apply category multiplier
        uint256 categoryMultiplier = categoryMultipliers[category];
        baseTokens = baseTokens.mul(categoryMultiplier).div(10000);
        
        return baseTokens.mul(1e18); // Convert to wei
    }

    /**
     * @dev Calculate staking tier based on amount
     */
    function _calculateStakingTier(uint256 stakedAmount) internal view returns (StakingTier) {
        if (stakedAmount >= stakingThresholds[StakingTier.DIAMOND]) return StakingTier.DIAMOND;
        if (stakedAmount >= stakingThresholds[StakingTier.PLATINUM]) return StakingTier.PLATINUM;
        if (stakedAmount >= stakingThresholds[StakingTier.GOLD]) return StakingTier.GOLD;
        if (stakedAmount >= stakingThresholds[StakingTier.SILVER]) return StakingTier.SILVER;
        return StakingTier.BRONZE;
    }

    // =============================================================================
    // INITIALIZATION FUNCTIONS
    // =============================================================================

    /**
     * @dev Initialize UAE city pools
     */
    function _initializeCityPools() internal {
        // Dubai Pool
        cityPools[UAECity.DUBAI] = CityPool({
            name: "Dubai Property Pool",
            totalValue: 0,
            totalTokens: 0,
            propertiesCount: 0,
            monthlyDividends: 0,
            averageYield: 0,
            isActive: true,
            multiplier: 13000 // 1.3x multiplier for Dubai
        });
        supportedCities.push(UAECity.DUBAI);

        // Abu Dhabi Pool
        cityPools[UAECity.ABU_DHABI] = CityPool({
            name: "Abu Dhabi Property Pool",
            totalValue: 0,
            totalTokens: 0,
            propertiesCount: 0,
            monthlyDividends: 0,
            averageYield: 0,
            isActive: true,
            multiplier: 12500 // 1.25x multiplier for Abu Dhabi
        });
        supportedCities.push(UAECity.ABU_DHABI);

        // Sharjah Pool
        cityPools[UAECity.SHARJAH] = CityPool({
            name: "Sharjah Property Pool",
            totalValue: 0,
            totalTokens: 0,
            propertiesCount: 0,
            monthlyDividends: 0,
            averageYield: 0,
            isActive: true,
            multiplier: 11000 // 1.1x multiplier for Sharjah
        });
        supportedCities.push(UAECity.SHARJAH);

        // Other Emirates (lower multipliers)
        cityPools[UAECity.AJMAN] = CityPool({
            name: "Ajman Property Pool",
            totalValue: 0,
            totalTokens: 0,
            propertiesCount: 0,
            monthlyDividends: 0,
            averageYield: 0,
            isActive: true,
            multiplier: 10500 // 1.05x multiplier
        });
        supportedCities.push(UAECity.AJMAN);
    }

    /**
     * @dev Initialize staking tiers and APY
     */
    function _initializeStakingTiers() internal {
        // Staking thresholds (in XERA wei)
        stakingThresholds[StakingTier.BRONZE] = 1000 * 1e18;    // 1K XERA
        stakingThresholds[StakingTier.SILVER] = 5000 * 1e18;    // 5K XERA
        stakingThresholds[StakingTier.GOLD] = 25000 * 1e18;     // 25K XERA
        stakingThresholds[StakingTier.PLATINUM] = 100000 * 1e18; // 100K XERA
        stakingThresholds[StakingTier.DIAMOND] = 500000 * 1e18;  // 500K XERA

        // APY rates (in basis points)
        stakingAPY[StakingTier.BRONZE] = 600;    // 6% APY
        stakingAPY[StakingTier.SILVER] = 800;    // 8% APY
        stakingAPY[StakingTier.GOLD] = 1000;     // 10% APY
        stakingAPY[StakingTier.PLATINUM] = 1200; // 12% APY
        stakingAPY[StakingTier.DIAMOND] = 1500;  // 15% APY

        // Fee discounts (in basis points)
        feeDiscounts[StakingTier.BRONZE] = 1000;  // 10% discount
        feeDiscounts[StakingTier.SILVER] = 1500;  // 15% discount
        feeDiscounts[StakingTier.GOLD] = 2000;    // 20% discount
        feeDiscounts[StakingTier.PLATINUM] = 2500; // 25% discount
        feeDiscounts[StakingTier.DIAMOND] = 3500;  // 35% discount
    }

    /**
     * @dev Initialize category multipliers
     */
    function _initializeCategoryMultipliers() internal {
        categoryMultipliers[PropertyCategory.RESIDENTIAL] = 10000;   // 1.0x
        categoryMultipliers[PropertyCategory.COMMERCIAL] = 12000;    // 1.2x
        categoryMultipliers[PropertyCategory.MIXED_USE] = 11000;     // 1.1x
        categoryMultipliers[PropertyCategory.HOSPITALITY] = 11500;   // 1.15x
        categoryMultipliers[PropertyCategory.INDUSTRIAL] = 10500;    // 1.05x
    }

    // =============================================================================
    // VIEW FUNCTIONS
    // =============================================================================

    function getCityPool(UAECity city) external view returns (CityPool memory) {
        return cityPools[city];
    }

    function getUserPortfolio(address user) external view returns (
        uint256 totalBalance,
        uint256 totalStaked,
        uint256 totalDividends,
        uint256 totalRewards,
        StakingTier stakingTier
    ) {
        UserPortfolio storage portfolio = userPortfolios[user];
        return (
            portfolio.totalXERABalance,
            portfolio.totalStaked,
            portfolio.totalDividends,
            portfolio.totalRewards,
            portfolio.stakingInfo.tier
        );
    }

    function getProperty(uint256 propertyId) external view returns (PropertyInfo memory) {
        return properties[propertyId];
    }

    function getCityProperties(UAECity city) external view returns (uint256[] memory) {
        return cityProperties[city];
    }

    // =============================================================================
    // OVERRIDES
    // =============================================================================

    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        whenNotPaused
        override
    {
        super._beforeTokenTransfer(from, to, amount);
    }

    function _afterTokenTransfer(address from, address to, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(address to, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._burn(account, amount);
    }
}