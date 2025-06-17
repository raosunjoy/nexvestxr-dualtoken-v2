// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title UAEPriceOracle
 * @dev Oracle contract for AED exchange rates and UAE property prices
 * @dev Supports multi-currency conversion and property valuation
 */
contract UAEPriceOracle is Ownable, Pausable {
    using SafeMath for uint256;

    // =============================================================================
    // STATE VARIABLES
    // =============================================================================

    uint256 public constant PRECISION = 1e18;
    uint256 public constant MAX_STALENESS = 24 hours; // Maximum price staleness
    
    // Exchange rates (AED to other currencies, 18 decimals)
    struct ExchangeRate {
        uint256 rate;           // Rate with 18 decimals (1 AED = rate * currency)
        uint256 lastUpdated;    // Timestamp of last update
        bool isActive;          // Whether this rate is active
        address updater;        // Who can update this rate
    }
    
    // Property pricing data
    struct PropertyPrice {
        uint256 pricePerSqFt;   // Price per square foot in AED wei
        uint256 totalValue;     // Total property value in AED wei
        uint256 lastUpdated;    // Last price update timestamp
        string zone;            // Dubai zone or area
        string emirate;         // UAE emirate
        bool isVerified;        // RERA/DLD verification status
    }
    
    // Currency exchange rates
    mapping(string => ExchangeRate) public exchangeRates;
    mapping(address => bool) public authorizedUpdaters;
    
    // Property pricing
    mapping(uint256 => PropertyPrice) public propertyPrices;
    mapping(string => uint256[]) public zoneProperties; // Zone to property IDs
    mapping(string => uint256) public averageZonePrices; // Average price per zone
    
    // Market data
    mapping(string => uint256) public marketCapitalization; // Per emirate
    mapping(string => uint256) public tradingVolume24h;     // Per currency pair
    
    // Oracle configuration
    string[] public supportedCurrencies;
    mapping(string => bool) public currencySupported;
    
    // Events
    event ExchangeRateUpdated(string indexed currency, uint256 newRate, uint256 timestamp);
    event PropertyPriceUpdated(uint256 indexed propertyId, uint256 newPrice, string zone);
    event AuthorizedUpdaterAdded(address indexed updater, string currency);
    event AuthorizedUpdaterRemoved(address indexed updater);
    event MarketDataUpdated(string indexed dataType, string key, uint256 value);

    // =============================================================================
    // CONSTRUCTOR
    // =============================================================================

    constructor() {
        // Initialize supported currencies
        _addSupportedCurrency("USD", 272e15);  // 1 AED = 0.272 USD
        _addSupportedCurrency("EUR", 248e15);  // 1 AED = 0.248 EUR
        _addSupportedCurrency("GBP", 214e15);  // 1 AED = 0.214 GBP
        _addSupportedCurrency("SAR", 102e16);  // 1 AED = 1.02 SAR
        _addSupportedCurrency("QAR", 99e16);   // 1 AED = 0.99 QAR
        _addSupportedCurrency("KWD", 83e15);   // 1 AED = 0.083 KWD
        _addSupportedCurrency("OMR", 105e15);  // 1 AED = 0.105 OMR
        _addSupportedCurrency("BHD", 103e15);  // 1 AED = 0.103 BHD
    }

    // =============================================================================
    // MODIFIERS
    // =============================================================================

    modifier onlyAuthorizedUpdater(string memory currency) {
        require(
            authorizedUpdaters[msg.sender] || 
            exchangeRates[currency].updater == msg.sender || 
            msg.sender == owner(),
            "Unauthorized updater"
        );
        _;
    }

    modifier validCurrency(string memory currency) {
        require(currencySupported[currency], "Currency not supported");
        _;
    }

    modifier notStale(uint256 lastUpdated) {
        require(block.timestamp.sub(lastUpdated) <= MAX_STALENESS, "Price data is stale");
        _;
    }

    // =============================================================================
    // EXCHANGE RATE FUNCTIONS
    // =============================================================================

    /**
     * @dev Update exchange rate for a specific currency
     * @param currency Currency code (USD, EUR, etc.)
     * @param rate New exchange rate (18 decimals)
     */
    function updateExchangeRate(
        string memory currency, 
        uint256 rate
    ) external onlyAuthorizedUpdater(currency) validCurrency(currency) whenNotPaused {
        require(rate > 0, "Invalid exchange rate");
        
        exchangeRates[currency].rate = rate;
        exchangeRates[currency].lastUpdated = block.timestamp;
        exchangeRates[currency].isActive = true;
        
        emit ExchangeRateUpdated(currency, rate, block.timestamp);
    }

    /**
     * @dev Batch update multiple exchange rates
     * @param currencies Array of currency codes
     * @param rates Array of corresponding rates
     */
    function batchUpdateExchangeRates(
        string[] memory currencies,
        uint256[] memory rates
    ) external onlyOwner whenNotPaused {
        require(currencies.length == rates.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < currencies.length; i++) {
            require(currencySupported[currencies[i]], "Currency not supported");
            require(rates[i] > 0, "Invalid exchange rate");
            
            exchangeRates[currencies[i]].rate = rates[i];
            exchangeRates[currencies[i]].lastUpdated = block.timestamp;
            exchangeRates[currencies[i]].isActive = true;
            
            emit ExchangeRateUpdated(currencies[i], rates[i], block.timestamp);
        }
    }

    /**
     * @dev Get current exchange rate for a currency
     * @param currency Currency code
     * @return rate Current exchange rate
     * @return lastUpdated Timestamp of last update
     * @return isActive Whether the rate is active
     */
    function getExchangeRate(string memory currency) external view validCurrency(currency) returns (
        uint256 rate,
        uint256 lastUpdated,
        bool isActive
    ) {
        ExchangeRate memory rateData = exchangeRates[currency];
        return (rateData.rate, rateData.lastUpdated, rateData.isActive);
    }

    /**
     * @dev Convert AED amount to another currency
     * @param aedAmount Amount in AED wei
     * @param targetCurrency Target currency code
     * @return convertedAmount Amount converted to target currency
     */
    function convertFromAED(
        uint256 aedAmount,
        string memory targetCurrency
    ) external view validCurrency(targetCurrency) returns (uint256 convertedAmount) {
        ExchangeRate memory rateData = exchangeRates[targetCurrency];
        require(rateData.isActive, "Exchange rate not active");
        
        return aedAmount.mul(rateData.rate).div(PRECISION);
    }

    /**
     * @dev Convert from another currency to AED
     * @param amount Amount in source currency wei
     * @param sourceCurrency Source currency code
     * @return aedAmount Amount converted to AED
     */
    function convertToAED(
        uint256 amount,
        string memory sourceCurrency
    ) external view validCurrency(sourceCurrency) returns (uint256 aedAmount) {
        ExchangeRate memory rateData = exchangeRates[sourceCurrency];
        require(rateData.isActive, "Exchange rate not active");
        
        return amount.mul(PRECISION).div(rateData.rate);
    }

    // =============================================================================
    // PROPERTY PRICING FUNCTIONS
    // =============================================================================

    /**
     * @dev Update property price information
     * @param propertyId Unique property identifier
     * @param pricePerSqFt Price per square foot in AED wei
     * @param totalValue Total property value in AED wei
     * @param zone Property zone/area
     * @param emirate UAE emirate
     * @param isVerified RERA/DLD verification status
     */
    function updatePropertyPrice(
        uint256 propertyId,
        uint256 pricePerSqFt,
        uint256 totalValue,
        string memory zone,
        string memory emirate,
        bool isVerified
    ) external onlyOwner {
        require(propertyId > 0, "Invalid property ID");
        require(pricePerSqFt > 0, "Invalid price per sq ft");
        require(totalValue > 0, "Invalid total value");
        
        PropertyPrice storage price = propertyPrices[propertyId];
        price.pricePerSqFt = pricePerSqFt;
        price.totalValue = totalValue;
        price.lastUpdated = block.timestamp;
        price.zone = zone;
        price.emirate = emirate;
        price.isVerified = isVerified;
        
        // Update zone properties tracking
        zoneProperties[zone].push(propertyId);
        _updateAverageZonePrice(zone);
        
        emit PropertyPriceUpdated(propertyId, totalValue, zone);
    }

    /**
     * @dev Get property price information
     * @param propertyId Property identifier
     * @return pricePerSqFt Price per square foot in AED wei
     * @return totalValue Total property value in AED wei
     * @return lastUpdated Last update timestamp
     * @return zone Property zone
     * @return emirate Property emirate
     * @return isVerified Verification status
     */
    function getPropertyPrice(uint256 propertyId) external view returns (
        uint256 pricePerSqFt,
        uint256 totalValue,
        uint256 lastUpdated,
        string memory zone,
        string memory emirate,
        bool isVerified
    ) {
        PropertyPrice memory price = propertyPrices[propertyId];
        return (
            price.pricePerSqFt,
            price.totalValue,
            price.lastUpdated,
            price.zone,
            price.emirate,
            price.isVerified
        );
    }

    /**
     * @dev Get property value in different currency
     * @param propertyId Property identifier
     * @param currency Target currency
     * @return value Property value in target currency
     */
    function getPropertyValueInCurrency(
        uint256 propertyId,
        string memory currency
    ) external view validCurrency(currency) returns (uint256 value) {
        PropertyPrice memory price = propertyPrices[propertyId];
        require(price.totalValue > 0, "Property price not set");
        
        if (keccak256(bytes(currency)) == keccak256(bytes("AED"))) {
            return price.totalValue;
        }
        
        ExchangeRate memory rateData = exchangeRates[currency];
        require(rateData.isActive, "Exchange rate not active");
        
        return price.totalValue.mul(rateData.rate).div(PRECISION);
    }

    /**
     * @dev Update average zone price
     */
    function _updateAverageZonePrice(string memory zone) private {
        uint256[] memory properties = zoneProperties[zone];
        if (properties.length == 0) return;
        
        uint256 totalValue = 0;
        uint256 validProperties = 0;
        
        for (uint256 i = 0; i < properties.length; i++) {
            PropertyPrice memory price = propertyPrices[properties[i]];
            if (price.totalValue > 0) {
                totalValue = totalValue.add(price.totalValue);
                validProperties++;
            }
        }
        
        if (validProperties > 0) {
            averageZonePrices[zone] = totalValue.div(validProperties);
        }
    }

    /**
     * @dev Get average price for a zone
     * @param zone Zone identifier
     * @return averagePrice Average property price in the zone
     */
    function getAverageZonePrice(string memory zone) external view returns (uint256 averagePrice) {
        return averageZonePrices[zone];
    }

    // =============================================================================
    // MARKET DATA FUNCTIONS
    // =============================================================================

    /**
     * @dev Update market capitalization for an emirate
     * @param emirate Emirate name
     * @param marketCap Market capitalization in AED wei
     */
    function updateMarketCap(string memory emirate, uint256 marketCap) external onlyOwner {
        marketCapitalization[emirate] = marketCap;
        emit MarketDataUpdated("MARKET_CAP", emirate, marketCap);
    }

    /**
     * @dev Update 24h trading volume for a currency pair
     * @param currencyPair Currency pair (e.g., "AED_USD")
     * @param volume Trading volume
     */
    function updateTradingVolume(string memory currencyPair, uint256 volume) external onlyOwner {
        tradingVolume24h[currencyPair] = volume;
        emit MarketDataUpdated("VOLUME_24H", currencyPair, volume);
    }

    // =============================================================================
    // ADMIN FUNCTIONS
    // =============================================================================

    /**
     * @dev Add supported currency
     * @param currency Currency code
     * @param initialRate Initial exchange rate
     */
    function addSupportedCurrency(string memory currency, uint256 initialRate) external onlyOwner {
        _addSupportedCurrency(currency, initialRate);
    }

    /**
     * @dev Internal function to add supported currency
     */
    function _addSupportedCurrency(string memory currency, uint256 initialRate) private {
        require(!currencySupported[currency], "Currency already supported");
        require(initialRate > 0, "Invalid initial rate");
        
        currencySupported[currency] = true;
        supportedCurrencies.push(currency);
        
        exchangeRates[currency] = ExchangeRate({
            rate: initialRate,
            lastUpdated: block.timestamp,
            isActive: true,
            updater: owner()
        });
        
        emit ExchangeRateUpdated(currency, initialRate, block.timestamp);
    }

    /**
     * @dev Add authorized updater for exchange rates
     * @param updater Address of the updater
     * @param currency Currency they can update
     */
    function addAuthorizedUpdater(address updater, string memory currency) external onlyOwner {
        authorizedUpdaters[updater] = true;
        exchangeRates[currency].updater = updater;
        emit AuthorizedUpdaterAdded(updater, currency);
    }

    /**
     * @dev Remove authorized updater
     * @param updater Address to remove
     */
    function removeAuthorizedUpdater(address updater) external onlyOwner {
        authorizedUpdaters[updater] = false;
        emit AuthorizedUpdaterRemoved(updater);
    }

    /**
     * @dev Get all supported currencies
     * @return currencies Array of supported currency codes
     */
    function getSupportedCurrencies() external view returns (string[] memory currencies) {
        return supportedCurrencies;
    }

    /**
     * @dev Check if price data is fresh
     * @param currency Currency to check
     * @return isFresh Whether the price data is fresh
     */
    function isPriceFresh(string memory currency) external view validCurrency(currency) returns (bool isFresh) {
        ExchangeRate memory rateData = exchangeRates[currency];
        return block.timestamp.sub(rateData.lastUpdated) <= MAX_STALENESS;
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

    // =============================================================================
    // VIEW FUNCTIONS
    // =============================================================================

    /**
     * @dev Get oracle health status
     * @return totalCurrencies Number of supported currencies
     * @return activeCurrencies Number of active currencies
     * @return stalePrices Number of stale price feeds
     */
    function getOracleHealth() external view returns (
        uint256 totalCurrencies,
        uint256 activeCurrencies,
        uint256 stalePrices
    ) {
        totalCurrencies = supportedCurrencies.length;
        activeCurrencies = 0;
        stalePrices = 0;
        
        for (uint256 i = 0; i < supportedCurrencies.length; i++) {
            ExchangeRate memory rateData = exchangeRates[supportedCurrencies[i]];
            if (rateData.isActive) {
                activeCurrencies++;
            }
            if (block.timestamp.sub(rateData.lastUpdated) > MAX_STALENESS) {
                stalePrices++;
            }
        }
    }
}