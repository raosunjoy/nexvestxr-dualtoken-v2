// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
// Interface for factory interaction
interface IPROPXFactory {
    enum DeveloperTier { NONE, TIER2, TIER1 }
    
    struct DeveloperProfile {
        address developerAddress;
        string companyName;
        string brandCode;
        DeveloperTier tier;
        uint256 projectsDelivered;
        uint256 totalValueDelivered;
        uint256 reputationScore;
        bool isActive;
        uint256 registrationDate;
    }
    
    function developers(address) external view returns (DeveloperProfile memory);
}

// ============================================================================
// INDIVIDUAL PROPX TOKEN CONTRACT
// ============================================================================

contract PROPXToken is ERC20, ReentrancyGuard, Pausable {
    using SafeMath for uint256;

    address public factory;
    address public developer;
    string public cityCode;
    uint8 public category; // PropertyCategory as uint8
    uint256 public pricePerToken;
    uint256 public fundingGoal;
    uint256 public fundingDeadline;
    uint256 public totalRaised;
    bool public isActive;
    bool public isFunded;

    struct PropertyMetrics {
        uint256 currentValuation;
        uint256 lastValuationDate;
        uint256 monthlyRental;
        uint256 occupancyRate; // Percentage * 100 (e.g., 9500 = 95%)
        uint256 maintenanceCosts;
        uint256 capRate; // Cap rate * 10000 (e.g., 750 = 7.5%)
    }

    struct PerformanceData {
        uint256 totalDividendsPaid;
        uint256 lastDividendDate;
        uint256 averageMonthlyReturn;
        uint256 annualizedReturn;
        uint256 totalAppreciation;
    }

    PropertyMetrics public propertyMetrics;
    PerformanceData public performanceData;
    
    mapping(address => uint256) public investments;
    mapping(address => uint256) public dividendsClaimed;
    
    uint256 public constant MINIMUM_INVESTMENT = 10000 * 10**18; // ₹10,000 minimum
    uint256 public dividendPool;

    // Events
    event TokensPurchased(address indexed investor, uint256 amount, uint256 cost);
    event DividendDistributed(uint256 totalAmount, uint256 perTokenAmount);
    event PropertyMetricsUpdated(uint256 newValuation, uint256 occupancyRate);
    event PropertySold(uint256 salePrice, uint256 perTokenReturn);

    modifier onlyFactory() {
        require(msg.sender == factory, "Only factory can call");
        _;
    }

    modifier onlyDeveloper() {
        require(msg.sender == developer, "Only developer can call");
        _;
    }

    modifier onlyActive() {
        require(isActive, "Token not active");
        _;
    }

    constructor(
        string memory name,
        string memory symbol,
        uint256 _totalSupply,
        uint256 _pricePerToken,
        address _developer,
        address _factory,
        string memory _cityCode,
        uint8 _category
    ) ERC20(name, symbol) {
        _mint(address(this), _totalSupply);
        pricePerToken = _pricePerToken;
        developer = _developer;
        factory = _factory;
        cityCode = _cityCode;
        category = _category;
        fundingGoal = _totalSupply.mul(_pricePerToken);
        fundingDeadline = block.timestamp + 90 days;
    }

    function activateToken() external onlyFactory {
        isActive = true;
    }

    // Enhanced property metrics tracking
    function updatePropertyMetrics(
        uint256 newValuation,
        uint256 monthlyRental,
        uint256 occupancyRate,
        uint256 maintenanceCosts
    ) external onlyDeveloper {
        propertyMetrics.currentValuation = newValuation;
        propertyMetrics.lastValuationDate = block.timestamp;
        propertyMetrics.monthlyRental = monthlyRental;
        propertyMetrics.occupancyRate = occupancyRate;
        propertyMetrics.maintenanceCosts = maintenanceCosts;
        
        // Calculate cap rate (Net Operating Income / Property Value)
        uint256 annualNOI = monthlyRental.mul(12).mul(occupancyRate).div(10000).sub(maintenanceCosts.mul(12));
        propertyMetrics.capRate = newValuation > 0 ? annualNOI.mul(10000).div(newValuation) : 0;

        emit PropertyMetricsUpdated(newValuation, occupancyRate);
    }

    function buyTokens(uint256 tokenAmount) external payable nonReentrant onlyActive {
        require(tokenAmount >= MINIMUM_INVESTMENT.div(pricePerToken), "Below minimum investment");
        require(msg.value == tokenAmount.mul(pricePerToken), "Incorrect payment amount");
        require(block.timestamp <= fundingDeadline, "Funding period ended");
        require(balanceOf(address(this)) >= tokenAmount, "Insufficient tokens available");

        investments[msg.sender] = investments[msg.sender].add(msg.value);
        totalRaised = totalRaised.add(msg.value);

        _transfer(address(this), msg.sender, tokenAmount);
        emit TokensPurchased(msg.sender, tokenAmount, msg.value);

        if (totalRaised >= fundingGoal) {
            isFunded = true;
            // Transfer funds to developer (minus platform fee)
            IPROPXFactory factoryContract = IPROPXFactory(factory);
            IPROPXFactory.DeveloperProfile memory dev = factoryContract.developers(developer);
            IPROPXFactory.DeveloperTier tier = dev.tier;
            
            uint256 platformFee = tier == IPROPXFactory.DeveloperTier.TIER1 ? 
                totalRaised.mul(150).div(10000) : // 1.5% for Tier 1
                totalRaised.mul(250).div(10000);   // 2.5% for Tier 2
            
            payable(developer).transfer(totalRaised.sub(platformFee));
            payable(factory).transfer(platformFee);
        }
    }

    function distributeDividends() external payable onlyDeveloper {
        require(msg.value > 0, "No dividend to distribute");
        require(totalSupply() > balanceOf(address(this)), "No investors");

        dividendPool = dividendPool.add(msg.value);
        uint256 circulatingSupply = totalSupply().sub(balanceOf(address(this)));
        uint256 perTokenDividend = msg.value.div(circulatingSupply);

        // Update performance metrics
        performanceData.totalDividendsPaid = performanceData.totalDividendsPaid.add(msg.value);
        performanceData.lastDividendDate = block.timestamp;
        
        // Calculate annualized return
        if (performanceData.lastDividendDate > 0) {
            uint256 timeElapsed = block.timestamp.sub(performanceData.lastDividendDate);
            if (timeElapsed > 0) {
                performanceData.averageMonthlyReturn = msg.value.mul(30 days).div(timeElapsed).div(circulatingSupply);
                performanceData.annualizedReturn = performanceData.averageMonthlyReturn.mul(12);
            }
        }

        emit DividendDistributed(msg.value, perTokenDividend);
    }

    function claimDividends() external nonReentrant {
        uint256 userBalance = balanceOf(msg.sender);
        require(userBalance > 0, "No tokens held");

        uint256 circulatingSupply = totalSupply().sub(balanceOf(address(this)));
        uint256 userShare = dividendPool.mul(userBalance).div(circulatingSupply);
        uint256 unclaimedDividends = userShare.sub(dividendsClaimed[msg.sender]);

        require(unclaimedDividends > 0, "No dividends available");
        
        dividendsClaimed[msg.sender] = dividendsClaimed[msg.sender].add(unclaimedDividends);
        payable(msg.sender).transfer(unclaimedDividends);
    }

    // Enhanced analytics functions
    function getTokenPrice() external view returns (uint256 marketPrice, uint256 navPrice) {
        marketPrice = pricePerToken; // This would be updated from trading data
        
        if (propertyMetrics.currentValuation > 0) {
            uint256 circulatingSupply = totalSupply().sub(balanceOf(address(this)));
            navPrice = propertyMetrics.currentValuation.div(circulatingSupply);
        } else {
            navPrice = pricePerToken;
        }
    }

    function getInvestmentMetrics() external view returns (
        uint256 currentYield,
        uint256 capRate,
        uint256 occupancyRate,
        uint256 totalReturn,
        uint256 annualizedReturn
    ) {
        currentYield = performanceData.averageMonthlyReturn.mul(12);
        capRate = propertyMetrics.capRate;
        occupancyRate = propertyMetrics.occupancyRate;
        totalReturn = performanceData.totalDividendsPaid.add(performanceData.totalAppreciation);
        annualizedReturn = performanceData.annualizedReturn;
    }

    function getFundingStatus() external view returns (
        uint256 raised,
        uint256 goal,
        uint256 deadline,
        bool funded,
        uint256 tokensRemaining,
        uint256 investorCount
    ) {
        return (
            totalRaised,
            fundingGoal,
            fundingDeadline,
            isFunded,
            balanceOf(address(this)),
            getInvestorCount()
        );
    }

    function getInvestorCount() internal view returns (uint256) {
        // This would be maintained in a more sophisticated implementation
        // For now, return a placeholder
        return totalRaised > 0 ? totalRaised.div(MINIMUM_INVESTMENT) : 0;
    }

    // Required for receiving ETH
    receive() external payable {}
}