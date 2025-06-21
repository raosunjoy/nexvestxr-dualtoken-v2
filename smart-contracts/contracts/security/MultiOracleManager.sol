// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
// import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

// Temporary interface definition to avoid dependency issues
interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function description() external view returns (string memory);
    function version() external view returns (uint256);
    function getRoundData(uint80 _roundId) external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
    function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
}

/**
 * @title MultiOracleManager
 * @dev Advanced multi-oracle price feed manager with security features
 * Implements TWAP, deviation checks, and circuit breakers
 */
contract MultiOracleManager is Ownable, ReentrancyGuard, Pausable {
    // Structure for oracle data
    struct OracleData {
        AggregatorV3Interface priceFeed;
        uint256 maxDeviation; // Maximum allowed deviation percentage (basis points)
        uint256 heartbeat; // Maximum time between price updates
        bool isActive;
        uint256 weight; // Weight for weighted average calculation
        string description;
    }

    // Structure for price data
    struct PriceData {
        uint256 price;
        uint256 timestamp;
        uint256 roundId;
        address oracle;
    }

    // Structure for TWAP calculation
    struct TWAPData {
        uint256 cumulativePrice;
        uint256 lastUpdateTime;
        uint256 windowSize;
        uint256[] priceHistory;
        uint256[] timestampHistory;
        uint256 currentIndex;
    }

    // Constants
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MAX_ORACLE_COUNT = 10;
    uint256 public constant MIN_ORACLE_COUNT = 3;
    uint256 public constant DEFAULT_TWAP_WINDOW = 1 hours;
    uint256 public constant MAX_PRICE_STALENESS = 3600; // 1 hour
    uint256 public constant CIRCUIT_BREAKER_THRESHOLD = 1000; // 10% in basis points

    // State variables
    mapping(string => OracleData[]) public oracles; // symbol => oracle array
    mapping(string => TWAPData) public twapData; // symbol => TWAP data
    mapping(string => bool) public supportedAssets;
    mapping(string => uint256) public lastValidPrices;
    mapping(string => bool) public circuitBreakerTriggered;

    // Events
    event OracleAdded(string indexed symbol, address indexed oracle, uint256 weight);
    event OracleRemoved(string indexed symbol, address indexed oracle);
    event OracleUpdated(string indexed symbol, address indexed oracle, uint256 newWeight);
    event PriceUpdated(string indexed symbol, uint256 price, uint256 timestamp);
    event CircuitBreakerTriggered(string indexed symbol, uint256 oldPrice, uint256 newPrice);
    event CircuitBreakerReset(string indexed symbol);
    event AssetAdded(string indexed symbol);
    event AssetRemoved(string indexed symbol);

    // Modifiers
    modifier validSymbol(string memory symbol) {
        require(supportedAssets[symbol], "Asset not supported");
        _;
    }

    modifier circuitBreakerCheck(string memory symbol) {
        require(!circuitBreakerTriggered[symbol], "Circuit breaker triggered");
        _;
    }

    constructor() {}

    /**
     * @dev Add a new supported asset
     */
    function addAsset(string memory symbol, uint256 twapWindow) external onlyOwner {
        require(!supportedAssets[symbol], "Asset already supported");
        require(twapWindow >= 300 && twapWindow <= 86400, "Invalid TWAP window"); // 5 min to 24 hours

        supportedAssets[symbol] = true;
        
        // Initialize TWAP data
        twapData[symbol] = TWAPData({
            cumulativePrice: 0,
            lastUpdateTime: block.timestamp,
            windowSize: twapWindow,
            priceHistory: new uint256[](0),
            timestampHistory: new uint256[](0),
            currentIndex: 0
        });

        emit AssetAdded(symbol);
    }

    /**
     * @dev Remove a supported asset
     */
    function removeAsset(string memory symbol) external onlyOwner validSymbol(symbol) {
        supportedAssets[symbol] = false;
        delete twapData[symbol];
        delete lastValidPrices[symbol];
        delete circuitBreakerTriggered[symbol];
        
        // Remove all oracles for this asset
        delete oracles[symbol];

        emit AssetRemoved(symbol);
    }

    /**
     * @dev Add an oracle for a specific asset
     */
    function addOracle(
        string memory symbol,
        address oracleAddress,
        uint256 maxDeviation,
        uint256 heartbeat,
        uint256 weight,
        string memory description
    ) external onlyOwner validSymbol(symbol) {
        require(oracleAddress != address(0), "Invalid oracle address");
        require(oracles[symbol].length < MAX_ORACLE_COUNT, "Max oracles reached");
        require(weight > 0 && weight <= 100, "Invalid weight");
        require(maxDeviation <= 2000, "Max deviation too high"); // Max 20%
        require(heartbeat >= 60 && heartbeat <= 86400, "Invalid heartbeat"); // 1 min to 24 hours

        // Check if oracle already exists
        for (uint256 i = 0; i < oracles[symbol].length; i++) {
            require(address(oracles[symbol][i].priceFeed) != oracleAddress, "Oracle already exists");
        }

        oracles[symbol].push(OracleData({
            priceFeed: AggregatorV3Interface(oracleAddress),
            maxDeviation: maxDeviation,
            heartbeat: heartbeat,
            isActive: true,
            weight: weight,
            description: description
        }));

        emit OracleAdded(symbol, oracleAddress, weight);
    }

    /**
     * @dev Remove an oracle for a specific asset
     */
    function removeOracle(string memory symbol, address oracleAddress) 
        external 
        onlyOwner 
        validSymbol(symbol) 
    {
        require(oracles[symbol].length > MIN_ORACLE_COUNT, "Cannot remove, min oracles required");

        for (uint256 i = 0; i < oracles[symbol].length; i++) {
            if (address(oracles[symbol][i].priceFeed) == oracleAddress) {
                // Move last element to current position and remove last
                oracles[symbol][i] = oracles[symbol][oracles[symbol].length - 1];
                oracles[symbol].pop();
                
                emit OracleRemoved(symbol, oracleAddress);
                return;
            }
        }
        
        revert("Oracle not found");
    }

    /**
     * @dev Update oracle weight
     */
    function updateOracleWeight(
        string memory symbol, 
        address oracleAddress, 
        uint256 newWeight
    ) external onlyOwner validSymbol(symbol) {
        require(newWeight > 0 && newWeight <= 100, "Invalid weight");

        for (uint256 i = 0; i < oracles[symbol].length; i++) {
            if (address(oracles[symbol][i].priceFeed) == oracleAddress) {
                oracles[symbol][i].weight = newWeight;
                emit OracleUpdated(symbol, oracleAddress, newWeight);
                return;
            }
        }
        
        revert("Oracle not found");
    }

    /**
     * @dev Toggle oracle active status
     */
    function toggleOracle(string memory symbol, address oracleAddress) 
        external 
        onlyOwner 
        validSymbol(symbol) 
    {
        for (uint256 i = 0; i < oracles[symbol].length; i++) {
            if (address(oracles[symbol][i].priceFeed) == oracleAddress) {
                oracles[symbol][i].isActive = !oracles[symbol][i].isActive;
                return;
            }
        }
        
        revert("Oracle not found");
    }

    /**
     * @dev Get current aggregated price with deviation checks
     */
    function getPrice(string memory symbol) 
        external 
        view 
        validSymbol(symbol) 
        circuitBreakerCheck(symbol) 
        returns (uint256 price, uint256 timestamp) 
    {
        return _getAggregatedPrice(symbol);
    }

    /**
     * @dev Get TWAP price
     */
    function getTWAPPrice(string memory symbol) 
        external 
        view 
        validSymbol(symbol) 
        returns (uint256 price, uint256 timestamp) 
    {
        return _calculateTWAP(symbol);
    }

    /**
     * @dev Update price and TWAP data (can be called by anyone)
     */
    function updatePrice(string memory symbol) 
        external 
        nonReentrant 
        whenNotPaused 
        validSymbol(symbol) 
    {
        (uint256 newPrice, uint256 timestamp) = _getAggregatedPrice(symbol);
        
        // Check for circuit breaker conditions
        if (lastValidPrices[symbol] != 0) {
            uint256 oldPrice = lastValidPrices[symbol];
            uint256 deviation = _calculateDeviation(oldPrice, newPrice);
            
            if (deviation > CIRCUIT_BREAKER_THRESHOLD) {
                circuitBreakerTriggered[symbol] = true;
                emit CircuitBreakerTriggered(symbol, oldPrice, newPrice);
                return;
            }
        }

        // Update TWAP data
        _updateTWAP(symbol, newPrice, timestamp);
        
        lastValidPrices[symbol] = newPrice;
        emit PriceUpdated(symbol, newPrice, timestamp);
    }

    /**
     * @dev Reset circuit breaker (owner only)
     */
    function resetCircuitBreaker(string memory symbol) 
        external 
        onlyOwner 
        validSymbol(symbol) 
    {
        circuitBreakerTriggered[symbol] = false;
        emit CircuitBreakerReset(symbol);
    }

    /**
     * @dev Get oracle count for an asset
     */
    function getOracleCount(string memory symbol) 
        external 
        view 
        validSymbol(symbol) 
        returns (uint256) 
    {
        return oracles[symbol].length;
    }

    /**
     * @dev Get oracle data
     */
    function getOracleData(string memory symbol, uint256 index) 
        external 
        view 
        validSymbol(symbol) 
        returns (
            address oracle,
            uint256 maxDeviation,
            uint256 heartbeat,
            bool isActive,
            uint256 weight,
            string memory description
        ) 
    {
        require(index < oracles[symbol].length, "Invalid oracle index");
        
        OracleData memory data = oracles[symbol][index];
        return (
            address(data.priceFeed),
            data.maxDeviation,
            data.heartbeat,
            data.isActive,
            data.weight,
            data.description
        );
    }

    /**
     * @dev Get price from specific oracle
     */
    function getOraclePrice(string memory symbol, uint256 index) 
        external 
        view 
        validSymbol(symbol) 
        returns (uint256 price, uint256 timestamp, bool isStale) 
    {
        require(index < oracles[symbol].length, "Invalid oracle index");
        
        OracleData memory oracle = oracles[symbol][index];
        (price, timestamp, isStale) = _getOraclePrice(oracle);
    }

    /**
     * @dev Internal function to get aggregated price
     */
    function _getAggregatedPrice(string memory symbol) 
        internal 
        view 
        returns (uint256 weightedPrice, uint256 latestTimestamp) 
    {
        uint256 totalWeight = 0;
        uint256 totalWeightedPrice = 0;
        uint256[] memory validPrices = new uint256[](oracles[symbol].length);
        uint256 validCount = 0;

        // Collect valid prices
        for (uint256 i = 0; i < oracles[symbol].length; i++) {
            if (!oracles[symbol][i].isActive) continue;

            (uint256 price, uint256 timestamp, bool isStale) = _getOraclePrice(oracles[symbol][i]);
            
            if (!isStale && price > 0) {
                validPrices[validCount] = price;
                validCount++;
                
                if (timestamp > latestTimestamp) {
                    latestTimestamp = timestamp;
                }
            }
        }

        require(validCount >= MIN_ORACLE_COUNT, "Insufficient valid oracles");

        // Check for price deviation and calculate weighted average
        for (uint256 i = 0; i < oracles[symbol].length; i++) {
            if (!oracles[symbol][i].isActive) continue;

            (uint256 price, , bool isStale) = _getOraclePrice(oracles[symbol][i]);
            
            if (!isStale && price > 0) {
                // Check deviation against other valid prices
                bool withinDeviation = _checkPriceDeviation(price, validPrices, validCount, oracles[symbol][i].maxDeviation);
                
                if (withinDeviation) {
                    totalWeightedPrice += price * oracles[symbol][i].weight;
                    totalWeight += oracles[symbol][i].weight;
                }
            }
        }

        require(totalWeight > 0, "No valid prices after deviation check");
        
        weightedPrice = totalWeightedPrice / totalWeight;
    }

    /**
     * @dev Get price from a single oracle
     */
    function _getOraclePrice(OracleData memory oracle) 
        internal 
        view 
        returns (uint256 price, uint256 timestamp, bool isStale) 
    {
        try oracle.priceFeed.latestRoundData() returns (
            uint80 roundId,
            int256 oraclePrice,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) {
            require(oraclePrice > 0, "Invalid price");
            require(updatedAt > 0, "Invalid timestamp");
            require(roundId == answeredInRound, "Stale round data");

            price = uint256(oraclePrice);
            timestamp = updatedAt;
            isStale = (block.timestamp - updatedAt) > oracle.heartbeat;
        } catch {
            price = 0;
            timestamp = 0;
            isStale = true;
        }
    }

    /**
     * @dev Check if price is within acceptable deviation
     */
    function _checkPriceDeviation(
        uint256 price, 
        uint256[] memory validPrices, 
        uint256 validCount,
        uint256 maxDeviation
    ) internal pure returns (bool) {
        if (validCount <= 1) return true;

        // Calculate median price for comparison
        uint256 median = _calculateMedian(validPrices, validCount);
        uint256 deviation = _calculateDeviation(median, price);

        return deviation <= maxDeviation;
    }

    /**
     * @dev Calculate median price
     */
    function _calculateMedian(uint256[] memory prices, uint256 count) 
        internal 
        pure 
        returns (uint256) 
    {
        // Simple bubble sort for small arrays
        for (uint256 i = 0; i < count - 1; i++) {
            for (uint256 j = 0; j < count - i - 1; j++) {
                if (prices[j] > prices[j + 1]) {
                    uint256 temp = prices[j];
                    prices[j] = prices[j + 1];
                    prices[j + 1] = temp;
                }
            }
        }

        if (count % 2 == 0) {
            return (prices[count / 2 - 1] + prices[count / 2]) / 2;
        } else {
            return prices[count / 2];
        }
    }

    /**
     * @dev Calculate percentage deviation between two prices
     */
    function _calculateDeviation(uint256 basePrice, uint256 newPrice) 
        internal 
        pure 
        returns (uint256) 
    {
        if (basePrice == 0) return 0;
        
        uint256 difference = basePrice > newPrice ? basePrice - newPrice : newPrice - basePrice;
        return (difference * BASIS_POINTS) / basePrice;
    }

    /**
     * @dev Update TWAP data
     */
    function _updateTWAP(string memory symbol, uint256 price, uint256 timestamp) internal {
        TWAPData storage twap = twapData[symbol];
        
        // Initialize arrays if empty
        if (twap.priceHistory.length == 0) {
            twap.priceHistory.push(price);
            twap.timestampHistory.push(timestamp);
            twap.currentIndex = 0;
            twap.cumulativePrice = price;
            twap.lastUpdateTime = timestamp;
            return;
        }

        // Add new price to history
        if (twap.priceHistory.length < 100) { // Limit history size
            twap.priceHistory.push(price);
            twap.timestampHistory.push(timestamp);
        } else {
            // Circular buffer
            twap.currentIndex = (twap.currentIndex + 1) % 100;
            twap.priceHistory[twap.currentIndex] = price;
            twap.timestampHistory[twap.currentIndex] = timestamp;
        }

        twap.lastUpdateTime = timestamp;
    }

    /**
     * @dev Calculate TWAP price
     */
    function _calculateTWAP(string memory symbol) 
        internal 
        view 
        returns (uint256 price, uint256 timestamp) 
    {
        TWAPData storage twap = twapData[symbol];
        
        if (twap.priceHistory.length == 0) {
            return (0, 0);
        }

        uint256 windowStart = block.timestamp > twap.windowSize ? 
            block.timestamp - twap.windowSize : 0;
        
        uint256 totalWeightedPrice = 0;
        uint256 totalTime = 0;
        
        for (uint256 i = 0; i < twap.priceHistory.length; i++) {
            if (twap.timestampHistory[i] >= windowStart) {
                // Time-weighted calculation
                uint256 timeWeight = i == 0 ? 1 : 
                    twap.timestampHistory[i] - twap.timestampHistory[i - 1];
                
                totalWeightedPrice += twap.priceHistory[i] * timeWeight;
                totalTime += timeWeight;
            }
        }

        price = totalTime > 0 ? totalWeightedPrice / totalTime : twap.priceHistory[twap.priceHistory.length - 1];
        timestamp = block.timestamp;
    }

    /**
     * @dev Emergency pause function
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause function
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Get system health status
     */
    function getSystemHealth() external view returns (
        uint256 totalAssets,
        uint256 activeAssets,
        uint256 circuitBreakersTriggered,
        bool systemPaused
    ) {
        // Implementation would iterate through supported assets
        // Simplified for gas efficiency
        systemPaused = paused();
        // Additional health metrics would be calculated here
    }
}