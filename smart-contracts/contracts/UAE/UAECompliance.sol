// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title UAECompliance
 * @dev Compliance contract for UAE real estate regulations
 * @dev Handles RERA, DLD, and other regulatory requirements
 */
contract UAECompliance is AccessControl, Pausable, ReentrancyGuard {
    
    // =============================================================================
    // ROLES
    // =============================================================================
    
    bytes32 public constant RERA_OFFICER_ROLE = keccak256("RERA_OFFICER_ROLE");
    bytes32 public constant DLD_OFFICER_ROLE = keccak256("DLD_OFFICER_ROLE");
    bytes32 public constant COMPLIANCE_OFFICER_ROLE = keccak256("COMPLIANCE_OFFICER_ROLE");
    bytes32 public constant KYC_OFFICER_ROLE = keccak256("KYC_OFFICER_ROLE");
    bytes32 public constant AML_OFFICER_ROLE = keccak256("AML_OFFICER_ROLE");
    
    // =============================================================================
    // STATE VARIABLES
    // =============================================================================
    
    // RERA compliance tracking
    struct RERACompliance {
        string registrationNumber;
        uint256 expiryDate;
        bool isActive;
        string projectType;
        address developer;
        uint256 lastUpdated;
    }
    
    // DLD compliance tracking
    struct DLDCompliance {
        string titleDeedNumber;
        string plotNumber;
        string district;
        bool isRegistered;
        uint256 registrationDate;
        uint256 lastUpdated;
    }
    
    // KYC compliance levels
    enum KYCLevel {
        NONE,
        BASIC,
        STANDARD,
        ENHANCED,
        COMPREHENSIVE
    }
    
    // AML risk levels
    enum AMLRisk {
        LOW,
        MEDIUM,
        HIGH,
        PROHIBITED
    }
    
    // User compliance data
    struct UserCompliance {
        KYCLevel kycLevel;
        AMLRisk amlRisk;
        bool isApproved;
        uint256 approvalDate;
        uint256 expiryDate;
        string emirate;
        bool isUAEResident;
        bool isGCCResident;
        mapping(string => bool) documents;
    }
    
    // Property compliance mappings
    mapping(uint256 => RERACompliance) public reraCompliance;
    mapping(uint256 => DLDCompliance) public dldCompliance;
    mapping(string => uint256) public reraToPropertyId;
    mapping(string => uint256) public dldToPropertyId;
    
    // User compliance mappings
    mapping(address => UserCompliance) public userCompliance;
    mapping(address => bool) public verifiedDevelopers;
    mapping(address => bool) public authorizedAgents;
    
    // Investment limits based on compliance
    mapping(KYCLevel => uint256) public maxInvestmentLimits;
    mapping(AMLRisk => bool) public allowedInvestmentRisk;
    
    // Document requirements
    mapping(KYCLevel => string[]) public requiredDocuments;
    
    // =============================================================================
    // EVENTS
    // =============================================================================
    
    event RERAComplianceUpdated(
        uint256 indexed propertyId,
        string registrationNumber,
        bool isActive
    );
    
    event DLDComplianceUpdated(
        uint256 indexed propertyId,
        string titleDeedNumber,
        bool isRegistered
    );
    
    event UserKYCUpdated(
        address indexed user,
        KYCLevel oldLevel,
        KYCLevel newLevel
    );
    
    event UserAMLUpdated(
        address indexed user,
        AMLRisk oldRisk,
        AMLRisk newRisk
    );
    
    event DeveloperVerified(
        address indexed developer,
        bool verified
    );
    
    event ComplianceCheckFailed(
        address indexed user,
        uint256 propertyId,
        string reason
    );
    
    // =============================================================================
    // CONSTRUCTOR
    // =============================================================================
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(RERA_OFFICER_ROLE, msg.sender);
        _grantRole(DLD_OFFICER_ROLE, msg.sender);
        _grantRole(COMPLIANCE_OFFICER_ROLE, msg.sender);
        _grantRole(KYC_OFFICER_ROLE, msg.sender);
        _grantRole(AML_OFFICER_ROLE, msg.sender);
        
        // Initialize investment limits (in AED wei)
        maxInvestmentLimits[KYCLevel.BASIC] = 50000 * 1e18;          // 50K AED
        maxInvestmentLimits[KYCLevel.STANDARD] = 500000 * 1e18;      // 500K AED
        maxInvestmentLimits[KYCLevel.ENHANCED] = 2000000 * 1e18;     // 2M AED
        maxInvestmentLimits[KYCLevel.COMPREHENSIVE] = type(uint256).max; // No limit
        
        // Initialize risk allowances
        allowedInvestmentRisk[AMLRisk.LOW] = true;
        allowedInvestmentRisk[AMLRisk.MEDIUM] = true;
        allowedInvestmentRisk[AMLRisk.HIGH] = false;
        allowedInvestmentRisk[AMLRisk.PROHIBITED] = false;
    }
    
    // =============================================================================
    // RERA COMPLIANCE FUNCTIONS
    // =============================================================================
    
    /**
     * @dev Update RERA compliance for a property
     */
    function updateRERACompliance(
        uint256 propertyId,
        string memory registrationNumber,
        uint256 expiryDate,
        bool isActive,
        string memory projectType,
        address developer
    ) external onlyRole(RERA_OFFICER_ROLE) {
        require(propertyId > 0, "Invalid property ID");
        require(bytes(registrationNumber).length > 0, "Invalid registration number");
        require(expiryDate > block.timestamp, "Expiry date must be in future");
        
        RERACompliance storage compliance = reraCompliance[propertyId];
        compliance.registrationNumber = registrationNumber;
        compliance.expiryDate = expiryDate;
        compliance.isActive = isActive;
        compliance.projectType = projectType;
        compliance.developer = developer;
        compliance.lastUpdated = block.timestamp;
        
        reraToPropertyId[registrationNumber] = propertyId;
        
        emit RERAComplianceUpdated(propertyId, registrationNumber, isActive);
    }
    
    /**
     * @dev Check if property has valid RERA compliance
     */
    function checkRERACompliance(uint256 propertyId) external view returns (bool isCompliant) {
        RERACompliance memory compliance = reraCompliance[propertyId];
        return compliance.isActive && compliance.expiryDate > block.timestamp;
    }
    
    // =============================================================================
    // DLD COMPLIANCE FUNCTIONS
    // =============================================================================
    
    /**
     * @dev Update DLD compliance for a property
     */
    function updateDLDCompliance(
        uint256 propertyId,
        string memory titleDeedNumber,
        string memory plotNumber,
        string memory district,
        bool isRegistered
    ) external onlyRole(DLD_OFFICER_ROLE) {
        require(propertyId > 0, "Invalid property ID");
        require(bytes(titleDeedNumber).length > 0, "Invalid title deed number");
        
        DLDCompliance storage compliance = dldCompliance[propertyId];
        compliance.titleDeedNumber = titleDeedNumber;
        compliance.plotNumber = plotNumber;
        compliance.district = district;
        compliance.isRegistered = isRegistered;
        compliance.registrationDate = block.timestamp;
        compliance.lastUpdated = block.timestamp;
        
        dldToPropertyId[titleDeedNumber] = propertyId;
        
        emit DLDComplianceUpdated(propertyId, titleDeedNumber, isRegistered);
    }
    
    /**
     * @dev Check if property has valid DLD compliance
     */
    function checkDLDCompliance(uint256 propertyId) external view returns (bool isCompliant) {
        return dldCompliance[propertyId].isRegistered;
    }
    
    // =============================================================================
    // KYC FUNCTIONS
    // =============================================================================
    
    /**
     * @dev Update user KYC level
     */
    function updateUserKYC(
        address user,
        KYCLevel newLevel,
        uint256 expiryDate,
        string memory emirate,
        bool isUAEResident,
        bool isGCCResident
    ) external onlyRole(KYC_OFFICER_ROLE) {
        require(user != address(0), "Invalid user address");
        require(expiryDate > block.timestamp, "Expiry date must be in future");
        
        UserCompliance storage compliance = userCompliance[user];
        KYCLevel oldLevel = compliance.kycLevel;
        
        compliance.kycLevel = newLevel;
        compliance.approvalDate = block.timestamp;
        compliance.expiryDate = expiryDate;
        compliance.emirate = emirate;
        compliance.isUAEResident = isUAEResident;
        compliance.isGCCResident = isGCCResident;
        compliance.isApproved = true;
        
        emit UserKYCUpdated(user, oldLevel, newLevel);
    }
    
    /**
     * @dev Check if user has valid KYC
     */
    function checkUserKYC(address user) external view returns (bool isValid, KYCLevel level) {
        UserCompliance storage compliance = userCompliance[user];
        isValid = compliance.isApproved && compliance.expiryDate > block.timestamp;
        level = compliance.kycLevel;
    }
    
    // =============================================================================
    // AML FUNCTIONS
    // =============================================================================
    
    /**
     * @dev Update user AML risk level
     */
    function updateUserAML(
        address user,
        AMLRisk newRisk
    ) external onlyRole(AML_OFFICER_ROLE) {
        require(user != address(0), "Invalid user address");
        
        UserCompliance storage compliance = userCompliance[user];
        AMLRisk oldRisk = compliance.amlRisk;
        
        compliance.amlRisk = newRisk;
        
        emit UserAMLUpdated(user, oldRisk, newRisk);
    }
    
    /**
     * @dev Check if user has acceptable AML risk
     */
    function checkUserAML(address user) external view returns (bool isAcceptable, AMLRisk risk) {
        UserCompliance storage compliance = userCompliance[user];
        risk = compliance.amlRisk;
        isAcceptable = allowedInvestmentRisk[risk];
    }
    
    // =============================================================================
    // INVESTMENT VALIDATION
    // =============================================================================
    
    /**
     * @dev Validate investment compliance
     */
    function validateInvestment(
        address user,
        uint256 propertyId,
        uint256 amount
    ) external view returns (bool isValid, string memory reason) {
        // Check property compliance
        if (!this.checkRERACompliance(propertyId)) {
            return (false, "Property not RERA compliant");
        }
        
        if (!this.checkDLDCompliance(propertyId)) {
            return (false, "Property not DLD registered");
        }
        
        // Check user compliance
        UserCompliance storage compliance = userCompliance[user];
        
        if (!compliance.isApproved || compliance.expiryDate <= block.timestamp) {
            return (false, "User KYC expired or not approved");
        }
        
        if (!allowedInvestmentRisk[compliance.amlRisk]) {
            return (false, "User AML risk too high");
        }
        
        // Check investment limits
        if (amount > maxInvestmentLimits[compliance.kycLevel]) {
            return (false, "Investment amount exceeds KYC limit");
        }
        
        return (true, "Investment validated");
    }
    
    // =============================================================================
    // DEVELOPER VERIFICATION
    // =============================================================================
    
    /**
     * @dev Verify developer
     */
    function verifyDeveloper(
        address developer,
        bool verified
    ) external onlyRole(RERA_OFFICER_ROLE) {
        verifiedDevelopers[developer] = verified;
        emit DeveloperVerified(developer, verified);
    }
    
    /**
     * @dev Check if developer is verified
     */
    function isDeveloperVerified(address developer) external view returns (bool) {
        return verifiedDevelopers[developer];
    }
    
    // =============================================================================
    // DOCUMENT MANAGEMENT
    // =============================================================================
    
    /**
     * @dev Mark document as submitted for user
     */
    function submitDocument(
        address user,
        string memory documentType,
        bool isValid
    ) external onlyRole(KYC_OFFICER_ROLE) {
        userCompliance[user].documents[documentType] = isValid;
    }
    
    /**
     * @dev Check if user has submitted required documents
     */
    function hasRequiredDocuments(
        address user,
        KYCLevel requiredLevel
    ) external view returns (bool hasAll) {
        string[] memory required = requiredDocuments[requiredLevel];
        UserCompliance storage compliance = userCompliance[user];
        
        for (uint256 i = 0; i < required.length; i++) {
            if (!compliance.documents[required[i]]) {
                return false;
            }
        }
        return true;
    }
    
    // =============================================================================
    // ADMIN FUNCTIONS
    // =============================================================================
    
    /**
     * @dev Set investment limit for KYC level
     */
    function setInvestmentLimit(
        KYCLevel level,
        uint256 limit
    ) external onlyRole(COMPLIANCE_OFFICER_ROLE) {
        maxInvestmentLimits[level] = limit;
    }
    
    /**
     * @dev Set AML risk allowance
     */
    function setAMLRiskAllowance(
        AMLRisk risk,
        bool allowed
    ) external onlyRole(COMPLIANCE_OFFICER_ROLE) {
        allowedInvestmentRisk[risk] = allowed;
    }
    
    /**
     * @dev Set required documents for KYC level
     */
    function setRequiredDocuments(
        KYCLevel level,
        string[] memory documents
    ) external onlyRole(COMPLIANCE_OFFICER_ROLE) {
        requiredDocuments[level] = documents;
    }
    
    /**
     * @dev Emergency pause
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @dev Unpause
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
    
    // =============================================================================
    // VIEW FUNCTIONS
    // =============================================================================
    
    /**
     * @dev Get user compliance summary
     */
    function getUserComplianceSummary(address user) external view returns (
        KYCLevel kycLevel,
        AMLRisk amlRisk,
        bool isApproved,
        uint256 maxInvestment,
        string memory emirate,
        bool isUAEResident
    ) {
        UserCompliance storage compliance = userCompliance[user];
        return (
            compliance.kycLevel,
            compliance.amlRisk,
            compliance.isApproved && compliance.expiryDate > block.timestamp,
            maxInvestmentLimits[compliance.kycLevel],
            compliance.emirate,
            compliance.isUAEResident
        );
    }
    
    /**
     * @dev Get property compliance summary
     */
    function getPropertyComplianceSummary(uint256 propertyId) external view returns (
        bool reraCompliant,
        bool dldCompliant,
        string memory reraNumber,
        string memory dldNumber,
        address developer
    ) {
        RERACompliance memory rera = reraCompliance[propertyId];
        DLDCompliance memory dld = dldCompliance[propertyId];
        
        return (
            rera.isActive && rera.expiryDate > block.timestamp,
            dld.isRegistered,
            rera.registrationNumber,
            dld.titleDeedNumber,
            rera.developer
        );
    }
}