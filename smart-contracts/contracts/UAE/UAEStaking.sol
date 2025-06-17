// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title UAEStaking
 * @dev Staking contract for UAE property tokens with tier-based rewards
 * @dev Supports multi-currency rewards and volume-based bonuses
 */
contract UAEStaking is Ownable, Pausable, ReentrancyGuard {
    using SafeMath for uint256;

    // =============================================================================
    // STATE VARIABLES
    // =============================================================================

    IERC1155 public propertyToken;
    IERC20 public rewardToken;
    
    uint256 public constant PRECISION = 1e18;
    uint256 public rewardDuration;
    uint256 public baseRewardRate; // Base APY in basis points (1000 = 10%)
    
    // Staking tiers with different rewards
    enum StakingTier {
        BRONZE,   // 0-100K AED staked
        SILVER,   // 100K-500K AED staked  
        GOLD,     // 500K-2M AED staked
        PLATINUM, // 2M+ AED staked
        DIAMOND   // 5M+ AED staked (institutional)
    }
    
    struct StakingInfo {
        uint256[] tokenIds;           // Property tokens staked
        uint256[] amounts;            // Amount of each token staked
        uint256 totalValueStaked;     // Total AED value staked
        uint256 stakingStartTime;     // When user started staking
        uint256 lastRewardClaim;      // Last reward claim timestamp
        uint256 accumulatedRewards;   // Unclaimed rewards
        StakingTier tier;             // Current staking tier
        uint256 tradingVolume30d;     // Trading volume last 30 days
        bool isActive;                // Staking status
    }
    
    struct TierConfig {
        uint256 minStakeAmount;       // Minimum AED to achieve tier
        uint256 rewardMultiplier;     // Reward multiplier (1000 = 1x)
        uint256 volumeBonusRate;      // Additional bonus per 1M AED volume
        bool unlocked;                // Tier availability
    }
    
    // User staking information
    mapping(address => StakingInfo) public stakingInfo;
    mapping(StakingTier => TierConfig) public tierConfigs;
    
    // Property token pricing (in AED wei)
    mapping(uint256 => uint256) public tokenPrices;
    
    // Trading volume tracking
    mapping(address => mapping(uint256 => uint256)) public dailyVolume;
    mapping(address => uint256) public lastVolumeUpdate;
    
    // Reward tracking
    uint256 public totalStaked;
    uint256 public totalRewardsDistributed;
    uint256 public rewardPool;
    
    // UAE-specific features
    mapping(address => bool) public uaeResidents;
    mapping(address => string) public userEmirates;
    mapping(address => bool) public gccResidents;
    
    // Events
    event Staked(address indexed user, uint256[] tokenIds, uint256[] amounts, uint256 totalValue);
    event Unstaked(address indexed user, uint256[] tokenIds, uint256[] amounts, uint256 totalValue);
    event RewardsClaimed(address indexed user, uint256 amount);
    event TierUpgrade(address indexed user, StakingTier oldTier, StakingTier newTier);
    event VolumeRecorded(address indexed user, uint256 amount, uint256 newTotal);
    event RewardPoolIncreased(uint256 amount, uint256 newTotal);

    // =============================================================================
    // CONSTRUCTOR
    // =============================================================================

    constructor(
        address _propertyToken,
        address _rewardToken,
        uint256 _rewardDuration,
        uint256 _baseRewardRate
    ) {
        propertyToken = IERC1155(_propertyToken);
        rewardToken = IERC20(_rewardToken);
        rewardDuration = _rewardDuration;
        baseRewardRate = _baseRewardRate;
        
        // Initialize tier configurations
        _initializeTiers();
    }

    // =============================================================================
    // TIER INITIALIZATION
    // =============================================================================

    function _initializeTiers() private {
        // BRONZE: 0-100K AED
        tierConfigs[StakingTier.BRONZE] = TierConfig({
            minStakeAmount: 0,
            rewardMultiplier: 1000,  // 1x base rate
            volumeBonusRate: 50,     // 0.05% per 1M volume
            unlocked: true
        });
        
        // SILVER: 100K-500K AED  
        tierConfigs[StakingTier.SILVER] = TierConfig({
            minStakeAmount: 100000 * 1e18,
            rewardMultiplier: 1200,  // 1.2x base rate
            volumeBonusRate: 75,     // 0.075% per 1M volume
            unlocked: true
        });
        
        // GOLD: 500K-2M AED
        tierConfigs[StakingTier.GOLD] = TierConfig({
            minStakeAmount: 500000 * 1e18,
            rewardMultiplier: 1500,  // 1.5x base rate
            volumeBonusRate: 100,    // 0.1% per 1M volume
            unlocked: true
        });
        
        // PLATINUM: 2M-5M AED
        tierConfigs[StakingTier.PLATINUM] = TierConfig({
            minStakeAmount: 2000000 * 1e18,
            rewardMultiplier: 2000,  // 2x base rate
            volumeBonusRate: 150,    // 0.15% per 1M volume
            unlocked: true
        });
        
        // DIAMOND: 5M+ AED (Institutional)
        tierConfigs[StakingTier.DIAMOND] = TierConfig({
            minStakeAmount: 5000000 * 1e18,
            rewardMultiplier: 3000,  // 3x base rate
            volumeBonusRate: 200,    // 0.2% per 1M volume
            unlocked: true
        });
    }

    // =============================================================================
    // STAKING FUNCTIONS
    // =============================================================================

    /**
     * @dev Stake property tokens
     * @param tokenIds Array of property token IDs to stake
     * @param amounts Array of amounts for each token
     */
    function stake(
        uint256[] memory tokenIds,
        uint256[] memory amounts
    ) external nonReentrant whenNotPaused {
        require(tokenIds.length == amounts.length, "Array length mismatch");
        require(tokenIds.length > 0, "No tokens to stake");
        
        StakingInfo storage userStaking = stakingInfo[msg.sender];
        
        // Calculate total value being staked
        uint256 totalValue = 0;
        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(amounts[i] > 0, "Invalid amount");
            require(tokenPrices[tokenIds[i]] > 0, "Token price not set");
            
            totalValue = totalValue.add(amounts[i].mul(tokenPrices[tokenIds[i]]));
            
            // Transfer tokens to this contract
            propertyToken.safeTransferFrom(
                msg.sender,
                address(this),
                tokenIds[i],
                amounts[i],
                ""
            );
        }
        
        // Update user staking info
        if (!userStaking.isActive) {
            userStaking.stakingStartTime = block.timestamp;
            userStaking.lastRewardClaim = block.timestamp;
            userStaking.isActive = true;
        }
        
        // Add to existing stakes
        for (uint256 i = 0; i < tokenIds.length; i++) {
            bool found = false;
            for (uint256 j = 0; j < userStaking.tokenIds.length; j++) {
                if (userStaking.tokenIds[j] == tokenIds[i]) {
                    userStaking.amounts[j] = userStaking.amounts[j].add(amounts[i]);
                    found = true;
                    break;
                }
            }
            if (!found) {
                userStaking.tokenIds.push(tokenIds[i]);
                userStaking.amounts.push(amounts[i]);
            }
        }
        
        userStaking.totalValueStaked = userStaking.totalValueStaked.add(totalValue);
        totalStaked = totalStaked.add(totalValue);
        
        // Update tier
        _updateUserTier(msg.sender);
        
        emit Staked(msg.sender, tokenIds, amounts, totalValue);
    }

    /**
     * @dev Unstake property tokens
     * @param tokenIds Array of property token IDs to unstake
     * @param amounts Array of amounts for each token
     */
    function unstake(
        uint256[] memory tokenIds,
        uint256[] memory amounts
    ) external nonReentrant {
        require(tokenIds.length == amounts.length, "Array length mismatch");
        require(tokenIds.length > 0, "No tokens to unstake");
        
        StakingInfo storage userStaking = stakingInfo[msg.sender];
        require(userStaking.isActive, "No active staking");
        
        // Claim pending rewards first
        _claimRewards(msg.sender);
        
        uint256 totalValue = 0;
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(amounts[i] > 0, "Invalid amount");
            
            // Find token in user's stakes
            bool found = false;
            for (uint256 j = 0; j < userStaking.tokenIds.length; j++) {
                if (userStaking.tokenIds[j] == tokenIds[i]) {
                    require(userStaking.amounts[j] >= amounts[i], "Insufficient staked amount");
                    
                    uint256 value = amounts[i].mul(tokenPrices[tokenIds[i]]);
                    totalValue = totalValue.add(value);
                    
                    userStaking.amounts[j] = userStaking.amounts[j].sub(amounts[i]);
                    
                    // Remove token if amount becomes 0
                    if (userStaking.amounts[j] == 0) {
                        _removeTokenFromStaking(userStaking, j);
                    }
                    
                    // Transfer tokens back to user
                    propertyToken.safeTransferFrom(
                        address(this),
                        msg.sender,
                        tokenIds[i],
                        amounts[i],
                        ""
                    );
                    
                    found = true;
                    break;
                }
            }
            require(found, "Token not staked");
        }
        
        userStaking.totalValueStaked = userStaking.totalValueStaked.sub(totalValue);
        totalStaked = totalStaked.sub(totalValue);
        
        // Deactivate if no tokens left
        if (userStaking.tokenIds.length == 0) {
            userStaking.isActive = false;
        }
        
        // Update tier
        _updateUserTier(msg.sender);
        
        emit Unstaked(msg.sender, tokenIds, amounts, totalValue);
    }

    /**
     * @dev Remove token from staking arrays
     */
    function _removeTokenFromStaking(StakingInfo storage userStaking, uint256 index) private {
        require(index < userStaking.tokenIds.length, "Index out of bounds");
        
        userStaking.tokenIds[index] = userStaking.tokenIds[userStaking.tokenIds.length - 1];
        userStaking.amounts[index] = userStaking.amounts[userStaking.amounts.length - 1];
        
        userStaking.tokenIds.pop();
        userStaking.amounts.pop();
    }

    // =============================================================================
    // REWARD FUNCTIONS
    // =============================================================================

    /**
     * @dev Claim accumulated staking rewards
     */
    function claimRewards() external nonReentrant {
        _claimRewards(msg.sender);
    }

    /**
     * @dev Internal function to claim rewards
     */
    function _claimRewards(address user) private {
        StakingInfo storage userStaking = stakingInfo[user];
        require(userStaking.isActive, "No active staking");
        
        uint256 pendingRewards = calculatePendingRewards(user);
        
        if (pendingRewards > 0) {
            require(rewardPool >= pendingRewards, "Insufficient reward pool");
            
            userStaking.accumulatedRewards = userStaking.accumulatedRewards.add(pendingRewards);
            userStaking.lastRewardClaim = block.timestamp;
            rewardPool = rewardPool.sub(pendingRewards);
            totalRewardsDistributed = totalRewardsDistributed.add(pendingRewards);
            
            // Transfer rewards (assuming reward token is available)
            if (address(rewardToken) != address(0)) {
                rewardToken.transfer(user, pendingRewards);
            }
            
            emit RewardsClaimed(user, pendingRewards);
        }
    }

    /**
     * @dev Calculate pending rewards for a user
     */
    function calculatePendingRewards(address user) public view returns (uint256) {
        StakingInfo storage userStaking = stakingInfo[user];
        
        if (!userStaking.isActive || userStaking.totalValueStaked == 0) {
            return 0;
        }
        
        uint256 stakingDuration = block.timestamp.sub(userStaking.lastRewardClaim);
        if (stakingDuration == 0) {
            return 0;
        }
        
        TierConfig memory tierConfig = tierConfigs[userStaking.tier];
        
        // Base reward calculation (annual rate converted to per second)
        uint256 baseReward = userStaking.totalValueStaked
            .mul(baseRewardRate)
            .mul(tierConfig.rewardMultiplier)
            .mul(stakingDuration)
            .div(365 days)
            .div(10000)  // basis points
            .div(1000);  // multiplier precision
        
        // Volume bonus calculation
        uint256 volumeBonus = _calculateVolumeBonus(user, stakingDuration);
        
        // UAE resident bonus (additional 0.5% APY)
        uint256 uaeBonus = 0;
        if (uaeResidents[user]) {
            uaeBonus = userStaking.totalValueStaked
                .mul(50) // 0.5% in basis points
                .mul(stakingDuration)
                .div(365 days)
                .div(10000);
        }
        
        return baseReward.add(volumeBonus).add(uaeBonus);
    }

    /**
     * @dev Calculate volume-based bonus
     */
    function _calculateVolumeBonus(address user, uint256 duration) private view returns (uint256) {
        StakingInfo storage userStaking = stakingInfo[user];
        TierConfig memory tierConfig = tierConfigs[userStaking.tier];
        
        if (userStaking.tradingVolume30d == 0) {
            return 0;
        }
        
        // Bonus = (volume in millions) * tier rate * staked amount * duration
        uint256 volumeInMillions = userStaking.tradingVolume30d.div(1000000 * 1e18);
        
        return userStaking.totalValueStaked
            .mul(volumeInMillions)
            .mul(tierConfig.volumeBonusRate)
            .mul(duration)
            .div(365 days)
            .div(10000);
    }

    // =============================================================================
    // TIER MANAGEMENT
    // =============================================================================

    /**
     * @dev Update user's staking tier based on staked amount
     */
    function _updateUserTier(address user) private {
        StakingInfo storage userStaking = stakingInfo[user];
        StakingTier oldTier = userStaking.tier;
        StakingTier newTier = StakingTier.BRONZE;
        
        uint256 stakedAmount = userStaking.totalValueStaked;
        
        if (stakedAmount >= tierConfigs[StakingTier.DIAMOND].minStakeAmount) {
            newTier = StakingTier.DIAMOND;
        } else if (stakedAmount >= tierConfigs[StakingTier.PLATINUM].minStakeAmount) {
            newTier = StakingTier.PLATINUM;
        } else if (stakedAmount >= tierConfigs[StakingTier.GOLD].minStakeAmount) {
            newTier = StakingTier.GOLD;
        } else if (stakedAmount >= tierConfigs[StakingTier.SILVER].minStakeAmount) {
            newTier = StakingTier.SILVER;
        }
        
        if (newTier != oldTier) {
            userStaking.tier = newTier;
            emit TierUpgrade(user, oldTier, newTier);
        }
    }

    // =============================================================================
    // TRADING VOLUME TRACKING
    // =============================================================================

    /**
     * @dev Record trading volume for rewards calculation
     * @param user User address
     * @param amount Trading amount in AED wei
     */
    function recordTradingVolume(address user, uint256 amount) external onlyOwner {
        StakingInfo storage userStaking = stakingInfo[user];
        
        // Update rolling 30-day volume
        uint256 today = block.timestamp / 1 days;
        uint256 lastUpdate = lastVolumeUpdate[user] / 1 days;
        
        // Reset volume if more than 30 days passed
        if (today > lastUpdate + 30) {
            userStaking.tradingVolume30d = amount;
        } else {
            userStaking.tradingVolume30d = userStaking.tradingVolume30d.add(amount);
        }
        
        lastVolumeUpdate[user] = block.timestamp;
        
        emit VolumeRecorded(user, amount, userStaking.tradingVolume30d);
    }

    // =============================================================================
    // ADMIN FUNCTIONS
    // =============================================================================

    /**
     * @dev Set token price for reward calculations
     */
    function setTokenPrice(uint256 tokenId, uint256 price) external onlyOwner {
        tokenPrices[tokenId] = price;
    }

    /**
     * @dev Add to reward pool
     */
    function addRewardPool(uint256 amount) external onlyOwner {
        require(rewardToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        rewardPool = rewardPool.add(amount);
        emit RewardPoolIncreased(amount, rewardPool);
    }

    /**
     * @dev Update tier configuration
     */
    function updateTierConfig(
        StakingTier tier,
        uint256 minStakeAmount,
        uint256 rewardMultiplier,
        uint256 volumeBonusRate,
        bool unlocked
    ) external onlyOwner {
        tierConfigs[tier] = TierConfig({
            minStakeAmount: minStakeAmount,
            rewardMultiplier: rewardMultiplier,
            volumeBonusRate: volumeBonusRate,
            unlocked: unlocked
        });
    }

    /**
     * @dev Set UAE resident status for bonus rewards
     */
    function setUAEResident(address user, bool isResident) external onlyOwner {
        uaeResidents[user] = isResident;
    }

    /**
     * @dev Set user emirate
     */
    function setUserEmirate(address user, string memory emirate) external onlyOwner {
        userEmirates[user] = emirate;
    }

    /**
     * @dev Pause/unpause contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // =============================================================================
    // VIEW FUNCTIONS
    // =============================================================================

    /**
     * @dev Get user staking details
     */
    function getUserStakingInfo(address user) external view returns (
        uint256[] memory tokenIds,
        uint256[] memory amounts,
        uint256 totalValueStaked,
        uint256 pendingRewards,
        StakingTier tier,
        uint256 tradingVolume30d
    ) {
        StakingInfo storage userStaking = stakingInfo[user];
        return (
            userStaking.tokenIds,
            userStaking.amounts,
            userStaking.totalValueStaked,
            calculatePendingRewards(user),
            userStaking.tier,
            userStaking.tradingVolume30d
        );
    }

    /**
     * @dev Get tier requirements and benefits
     */
    function getTierInfo(StakingTier tier) external view returns (
        uint256 minStakeAmount,
        uint256 rewardMultiplier,
        uint256 volumeBonusRate,
        bool unlocked
    ) {
        TierConfig memory config = tierConfigs[tier];
        return (
            config.minStakeAmount,
            config.rewardMultiplier,
            config.volumeBonusRate,
            config.unlocked
        );
    }

    /**
     * @dev Get contract statistics
     */
    function getContractStats() external view returns (
        uint256 totalStakedAmount,
        uint256 totalRewards,
        uint256 currentRewardPool,
        uint256 totalStakers
    ) {
        return (
            totalStaked,
            totalRewardsDistributed,
            rewardPool,
            0 // Would need to track this separately
        );
    }

    // =============================================================================
    // ERC1155 RECEIVER
    // =============================================================================

    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes memory
    ) public virtual returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] memory,
        uint256[] memory,
        bytes memory
    ) public virtual returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }
}