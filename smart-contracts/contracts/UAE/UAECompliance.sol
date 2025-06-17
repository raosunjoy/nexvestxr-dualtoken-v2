// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title UAECompliance
 * @dev Compliance management contract for UAE real estate tokenization
 * @dev Handles RERA, DLD, KYC, AML, and other regulatory requirements
 */
contract UAECompliance is Ownable, AccessControl, Pausable {
    using Counters for Counters.Counter;

    // =============================================================================
    // ROLES
    // =============================================================================

    bytes32 public constant RERA_OFFICER_ROLE = keccak256("RERA_OFFICER_ROLE");
    bytes32 public constant DLD_OFFICER_ROLE = keccak256("DLD_OFFICER_ROLE");
    bytes32 public constant KYC_OFFICER_ROLE = keccak256("KYC_OFFICER_ROLE");
    bytes32 public constant AML_OFFICER_ROLE = keccak256("AML_OFFICER_ROLE");
    bytes32 public constant COMPLIANCE_ADMIN_ROLE = keccak256("COMPLIANCE_ADMIN_ROLE");

    // =============================================================================
    // STRUCTS
    // =============================================================================

    struct RERARegistration {
        string registrationNumber;
        string propertyId;
        address developer;
        string developerLicense;
        bool isActive;
        uint256 issuedDate;
        uint256 expiryDate;
        string propertyType;
        string location;
        bytes32 documentHash;
        bool verified;
        address verifiedBy;
        uint256 verifiedAt;
    }

    struct DLDRegistration {
        string titleDeedNumber;
        string propertyId;
        address owner;
        string plotNumber;
        string area;
        string emirate;
        uint256 registrationDate;
        bool isActive;
        bytes32 documentHash;
        bool verified;
        address verifiedBy;
        uint256 verifiedAt;
    }

    struct KYCRecord {
        address user;
        string nationality;
        string emiratesId;
        string passportNumber;
        string visaNumber;
        KYCStatus status;
        KYCLevel level;
        uint256 submittedAt;
        uint256 approvedAt;
        uint256 expiryDate;
        address approvedBy;
        string rejectionReason;
        mapping(string => DocumentInfo) documents;
        bool pepCheck;
        bool sanctionsCheck;
        uint256 riskScore; // 0-100
    }

    struct DocumentInfo {
        bytes32 documentHash;
        string documentType;
        string ipfsHash;
        bool verified;
        uint256 uploadedAt;
        uint256 verifiedAt;
        address verifiedBy;
    }

    struct AMLRecord {
        address user;
        AMLStatus status;
        uint256 riskScore; // 0-100
        bool pepStatus; // Politically Exposed Person
        bool sanctionsListed;
        string[] watchlistMatches;
        uint256 lastChecked;
        address checkedBy;
        string jurisdiction;
        bool fatfCompliant;
        mapping(string => bool) complianceChecks;
    }

    struct InvestorProfile {
        address investor;
        InvestmentTier tier;
        string emirate;
        string residencyStatus; // citizen, resident, visitor, investor_visa
        bool uaeResident;
        bool gccResident;
        bool accreditedInvestor;
        uint256 annualIncome; // in AED
        uint256 netWorth; // in AED
        uint256 maxInvestmentLimit; // in AED
        uint256 usedInvestmentLimit; // in AED
        uint256 limitResetDate;
        bool active;
    }

    enum KYCStatus {
        PENDING,
        SUBMITTED,
        UNDER_REVIEW,
        APPROVED,
        REJECTED,
        EXPIRED,
        SUSPENDED
    }

    enum KYCLevel {
        STANDARD,    // Basic verification
        ENHANCED,    // Enhanced due diligence  
        COMPREHENSIVE // Full institutional verification
    }

    enum AMLStatus {
        PENDING,
        CLEARED,
        FLAGGED,
        UNDER_INVESTIGATION,
        BLOCKED
    }

    enum InvestmentTier {
        RETAIL,        // 25,000 - 500,000 AED
        PREMIUM,       // 500,000 - 2,000,000 AED
        INSTITUTIONAL  // 2,000,000+ AED
    }

    // =============================================================================
    // STATE VARIABLES
    // =============================================================================

    Counters.Counter private _kycIds;
    Counters.Counter private _amlIds;

    // Registrations
    mapping(string => RERARegistration) public reraRegistrations;
    mapping(string => DLDRegistration) public dldRegistrations;
    mapping(string => string) public propertyToRERA; // propertyId -> RERA number
    mapping(string => string) public propertyToDLD;  // propertyId -> DLD number

    // KYC/AML
    mapping(address => KYCRecord) public kycRecords;
    mapping(address => AMLRecord) public amlRecords;
    mapping(address => InvestorProfile) public investorProfiles;
    mapping(uint256 => address) public kycIdToAddress;
    mapping(uint256 => address) public amlIdToAddress;

    // Developers and entities
    mapping(address => bool) public reraVerifiedDevelopers;
    mapping(address => string) public developerLicenses;
    mapping(string => address) public licenseToAddress;

    // Compliance tracking
    mapping(address => mapping(string => bool)) public userCompliance;
    mapping(string => bool) public requiredComplianceChecks;

    // UAE-specific data
    string[] public uaeEmirates = [
        "Dubai", "Abu Dhabi", "Sharjah", "Ajman", 
        "Fujairah", "Ras Al Khaimah", "Umm Al Quwain"
    ];
    
    mapping(string => bool) public validEmirates;

    // =============================================================================
    // EVENTS
    // =============================================================================

    event RERARegistrationAdded(string indexed reraNumber, string propertyId, address developer);
    event RERARegistrationVerified(string indexed reraNumber, address verifiedBy);
    event DLDRegistrationAdded(string indexed titleDeedNumber, string propertyId, address owner);
    event DLDRegistrationVerified(string indexed titleDeedNumber, address verifiedBy);
    
    event KYCSubmitted(address indexed user, uint256 kycId, KYCLevel level);
    event KYCApproved(address indexed user, KYCLevel level, address approvedBy);
    event KYCRejected(address indexed user, string reason, address rejectedBy);
    event KYCDocumentUploaded(address indexed user, string documentType, bytes32 documentHash);
    
    event AMLCheckCompleted(address indexed user, AMLStatus status, uint256 riskScore);
    event AMLFlagged(address indexed user, string reason, uint256 riskScore);
    
    event InvestorProfileCreated(address indexed investor, InvestmentTier tier, string emirate);
    event InvestmentLimitUpdated(address indexed investor, uint256 newLimit);
    
    event DeveloperVerified(address indexed developer, string licenseNumber);
    event ComplianceCheckUpdated(string checkType, bool required);

    // =============================================================================
    // CONSTRUCTOR
    // =============================================================================

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(COMPLIANCE_ADMIN_ROLE, msg.sender);
        
        // Initialize UAE emirates
        for (uint i = 0; i < uaeEmirates.length; i++) {
            validEmirates[uaeEmirates[i]] = true;
        }
        
        // Initialize required compliance checks
        requiredComplianceChecks["RERA_REGISTRATION"] = true;
        requiredComplianceChecks["DLD_REGISTRATION"] = true;
        requiredComplianceChecks["KYC_APPROVAL"] = true;
        requiredComplianceChecks["AML_CLEARANCE"] = true;
        requiredComplianceChecks["SANCTIONS_CHECK"] = true;
        requiredComplianceChecks["PEP_CHECK"] = true;
    }

    // =============================================================================
    // RERA FUNCTIONS
    // =============================================================================

    /**
     * @dev Add RERA registration
     */
    function addRERARegistration(
        string memory reraNumber,
        string memory propertyId,
        address developer,
        string memory developerLicense,
        uint256 expiryDate,
        string memory propertyType,
        string memory location,
        bytes32 documentHash
    ) external onlyRole(RERA_OFFICER_ROLE) {
        require(bytes(reraNumber).length > 0, "Invalid RERA number");
        require(reraVerifiedDevelopers[developer], "Developer not verified");
        
        RERARegistration storage registration = reraRegistrations[reraNumber];
        registration.registrationNumber = reraNumber;
        registration.propertyId = propertyId;
        registration.developer = developer;
        registration.developerLicense = developerLicense;
        registration.isActive = true;
        registration.issuedDate = block.timestamp;
        registration.expiryDate = expiryDate;
        registration.propertyType = propertyType;
        registration.location = location;
        registration.documentHash = documentHash;
        registration.verified = false;
        
        propertyToRERA[propertyId] = reraNumber;
        
        emit RERARegistrationAdded(reraNumber, propertyId, developer);
    }

    /**
     * @dev Verify RERA registration
     */
    function verifyRERARegistration(string memory reraNumber) 
        external 
        onlyRole(RERA_OFFICER_ROLE) 
    {
        RERARegistration storage registration = reraRegistrations[reraNumber];
        require(bytes(registration.registrationNumber).length > 0, "Registration not found");
        
        registration.verified = true;
        registration.verifiedBy = msg.sender;
        registration.verifiedAt = block.timestamp;
        
        emit RERARegistrationVerified(reraNumber, msg.sender);
    }

    // =============================================================================
    // DLD FUNCTIONS
    // =============================================================================

    /**
     * @dev Add DLD registration
     */
    function addDLDRegistration(
        string memory titleDeedNumber,
        string memory propertyId,
        address owner,
        string memory plotNumber,
        string memory area,
        string memory emirate,
        bytes32 documentHash
    ) external onlyRole(DLD_OFFICER_ROLE) {
        require(bytes(titleDeedNumber).length > 0, "Invalid title deed number");
        require(validEmirates[emirate], "Invalid emirate");
        
        DLDRegistration storage registration = dldRegistrations[titleDeedNumber];
        registration.titleDeedNumber = titleDeedNumber;
        registration.propertyId = propertyId;
        registration.owner = owner;
        registration.plotNumber = plotNumber;
        registration.area = area;
        registration.emirate = emirate;
        registration.registrationDate = block.timestamp;
        registration.isActive = true;
        registration.documentHash = documentHash;
        registration.verified = false;
        
        propertyToDLD[propertyId] = titleDeedNumber;
        
        emit DLDRegistrationAdded(titleDeedNumber, propertyId, owner);
    }

    /**
     * @dev Verify DLD registration
     */
    function verifyDLDRegistration(string memory titleDeedNumber) 
        external 
        onlyRole(DLD_OFFICER_ROLE) 
    {
        DLDRegistration storage registration = dldRegistrations[titleDeedNumber];
        require(bytes(registration.titleDeedNumber).length > 0, "Registration not found");
        
        registration.verified = true;
        registration.verifiedBy = msg.sender;
        registration.verifiedAt = block.timestamp;
        
        emit DLDRegistrationVerified(titleDeedNumber, msg.sender);
    }

    // =============================================================================
    // KYC FUNCTIONS
    // =============================================================================

    /**
     * @dev Submit KYC application
     */
    function submitKYC(
        string memory nationality,
        string memory emiratesId,
        string memory passportNumber,
        string memory visaNumber,
        KYCLevel level
    ) external whenNotPaused {
        _kycIds.increment();
        uint256 kycId = _kycIds.current();
        
        KYCRecord storage record = kycRecords[msg.sender];
        record.user = msg.sender;
        record.nationality = nationality;
        record.emiratesId = emiratesId;
        record.passportNumber = passportNumber;
        record.visaNumber = visaNumber;
        record.status = KYCStatus.SUBMITTED;
        record.level = level;
        record.submittedAt = block.timestamp;
        
        kycIdToAddress[kycId] = msg.sender;
        
        emit KYCSubmitted(msg.sender, kycId, level);
    }

    /**
     * @dev Upload KYC document
     */
    function uploadKYCDocument(
        string memory documentType,
        bytes32 documentHash,
        string memory ipfsHash
    ) external whenNotPaused {
        KYCRecord storage record = kycRecords[msg.sender];
        require(record.user == msg.sender, "KYC record not found");
        
        DocumentInfo storage doc = record.documents[documentType];
        doc.documentHash = documentHash;
        doc.documentType = documentType;
        doc.ipfsHash = ipfsHash;
        doc.verified = false;
        doc.uploadedAt = block.timestamp;
        
        emit KYCDocumentUploaded(msg.sender, documentType, documentHash);
    }

    /**
     * @dev Approve KYC
     */
    function approveKYC(
        address user,
        uint256 expiryDate
    ) external onlyRole(KYC_OFFICER_ROLE) {
        KYCRecord storage record = kycRecords[user];
        require(record.user == user, "KYC record not found");
        
        record.status = KYCStatus.APPROVED;
        record.approvedAt = block.timestamp;
        record.expiryDate = expiryDate;
        record.approvedBy = msg.sender;
        
        userCompliance[user]["KYC_APPROVED"] = true;
        
        emit KYCApproved(user, record.level, msg.sender);
    }

    /**
     * @dev Reject KYC
     */
    function rejectKYC(
        address user,
        string memory reason
    ) external onlyRole(KYC_OFFICER_ROLE) {
        KYCRecord storage record = kycRecords[user];
        require(record.user == user, "KYC record not found");
        
        record.status = KYCStatus.REJECTED;
        record.rejectionReason = reason;
        
        userCompliance[user]["KYC_APPROVED"] = false;
        
        emit KYCRejected(user, reason, msg.sender);
    }

    // =============================================================================
    // AML FUNCTIONS
    // =============================================================================

    /**
     * @dev Perform AML check
     */
    function performAMLCheck(
        address user,
        uint256 riskScore,
        bool pepStatus,
        bool sanctionsListed,
        string[] memory watchlistMatches,
        string memory jurisdiction
    ) external onlyRole(AML_OFFICER_ROLE) {
        AMLRecord storage record = amlRecords[user];
        record.user = user;
        record.riskScore = riskScore;
        record.pepStatus = pepStatus;
        record.sanctionsListed = sanctionsListed;
        record.watchlistMatches = watchlistMatches;
        record.lastChecked = block.timestamp;
        record.checkedBy = msg.sender;
        record.jurisdiction = jurisdiction;
        record.fatfCompliant = true; // Default to true for UAE
        
        // Determine AML status based on checks
        if (sanctionsListed || riskScore > 80) {
            record.status = AMLStatus.FLAGGED;
            userCompliance[user]["AML_CLEARED"] = false;
        } else if (riskScore > 60 || pepStatus) {
            record.status = AMLStatus.UNDER_INVESTIGATION;
            userCompliance[user]["AML_CLEARED"] = false;
        } else {
            record.status = AMLStatus.CLEARED;
            userCompliance[user]["AML_CLEARED"] = true;
        }
        
        // Update compliance checks
        record.complianceChecks["SANCTIONS_CHECK"] = !sanctionsListed;
        record.complianceChecks["PEP_CHECK"] = !pepStatus;
        record.complianceChecks["RISK_ASSESSMENT"] = riskScore <= 60;
        
        userCompliance[user]["SANCTIONS_CHECK"] = !sanctionsListed;
        userCompliance[user]["PEP_CHECK"] = !pepStatus;
        
        emit AMLCheckCompleted(user, record.status, riskScore);
        
        if (record.status == AMLStatus.FLAGGED) {
            emit AMLFlagged(user, "High risk or sanctions listed", riskScore);
        }
    }

    // =============================================================================
    // INVESTOR PROFILE FUNCTIONS
    // =============================================================================

    /**
     * @dev Create investor profile
     */
    function createInvestorProfile(
        address investor,
        InvestmentTier tier,
        string memory emirate,
        string memory residencyStatus,
        bool uaeResident,
        bool gccResident,
        uint256 annualIncome,
        uint256 netWorth
    ) external onlyRole(COMPLIANCE_ADMIN_ROLE) {
        require(validEmirates[emirate], "Invalid emirate");
        
        InvestorProfile storage profile = investorProfiles[investor];
        profile.investor = investor;
        profile.tier = tier;
        profile.emirate = emirate;
        profile.residencyStatus = residencyStatus;
        profile.uaeResident = uaeResident;
        profile.gccResident = gccResident;
        profile.annualIncome = annualIncome;
        profile.netWorth = netWorth;
        profile.active = true;
        
        // Set investment limits based on tier
        if (tier == InvestmentTier.RETAIL) {
            profile.maxInvestmentLimit = 500000 * 1e18; // 500,000 AED
        } else if (tier == InvestmentTier.PREMIUM) {
            profile.maxInvestmentLimit = 2000000 * 1e18; // 2,000,000 AED
        } else if (tier == InvestmentTier.INSTITUTIONAL) {
            profile.maxInvestmentLimit = type(uint256).max; // No limit
        }
        
        profile.limitResetDate = block.timestamp + 365 days;
        
        emit InvestorProfileCreated(investor, tier, emirate);
    }

    // =============================================================================
    // DEVELOPER FUNCTIONS
    // =============================================================================

    /**
     * @dev Verify developer
     */
    function verifyDeveloper(
        address developer,
        string memory licenseNumber
    ) external onlyRole(RERA_OFFICER_ROLE) {
        reraVerifiedDevelopers[developer] = true;
        developerLicenses[developer] = licenseNumber;
        licenseToAddress[licenseNumber] = developer;
        
        emit DeveloperVerified(developer, licenseNumber);
    }

    // =============================================================================
    // VIEW FUNCTIONS
    // =============================================================================

    /**
     * @dev Check if user is compliant
     */
    function isUserCompliant(address user) external view returns (bool) {
        return userCompliance[user]["KYC_APPROVED"] && 
               userCompliance[user]["AML_CLEARED"] &&
               userCompliance[user]["SANCTIONS_CHECK"] &&
               userCompliance[user]["PEP_CHECK"];
    }

    /**
     * @dev Check specific compliance requirement
     */
    function checkCompliance(address user, string memory checkType) external view returns (bool) {
        return userCompliance[user][checkType];
    }

    /**
     * @dev Get KYC status
     */
    function getKYCStatus(address user) external view returns (KYCStatus, KYCLevel, uint256, uint256) {
        KYCRecord storage record = kycRecords[user];
        return (record.status, record.level, record.approvedAt, record.expiryDate);
    }

    /**
     * @dev Get AML status
     */
    function getAMLStatus(address user) external view returns (AMLStatus, uint256, uint256) {
        AMLRecord storage record = amlRecords[user];
        return (record.status, record.riskScore, record.lastChecked);
    }

    /**
     * @dev Get investor profile
     */
    function getInvestorProfile(address investor) external view returns (
        InvestmentTier tier,
        string memory emirate,
        uint256 maxLimit,
        uint256 usedLimit,
        bool active
    ) {
        InvestorProfile storage profile = investorProfiles[investor];
        return (profile.tier, profile.emirate, profile.maxInvestmentLimit, profile.usedInvestmentLimit, profile.active);
    }

    /**
     * @dev Check if property is RERA compliant
     */
    function isRERACompliant(string memory propertyId) external view returns (bool) {
        string memory reraNumber = propertyToRERA[propertyId];
        if (bytes(reraNumber).length == 0) return false;
        
        RERARegistration storage registration = reraRegistrations[reraNumber];
        return registration.verified && registration.isActive && registration.expiryDate > block.timestamp;
    }

    /**
     * @dev Check if property is DLD registered
     */
    function isDLDRegistered(string memory propertyId) external view returns (bool) {
        string memory dldNumber = propertyToDLD[propertyId];
        if (bytes(dldNumber).length == 0) return false;
        
        DLDRegistration storage registration = dldRegistrations[dldNumber];
        return registration.verified && registration.isActive;
    }

    // =============================================================================
    // ADMIN FUNCTIONS
    // =============================================================================

    /**
     * @dev Update compliance requirement
     */
    function updateComplianceRequirement(string memory checkType, bool required) 
        external 
        onlyRole(COMPLIANCE_ADMIN_ROLE) 
    {
        requiredComplianceChecks[checkType] = required;
        emit ComplianceCheckUpdated(checkType, required);
    }

    /**
     * @dev Grant RERA officer role
     */
    function grantRERAOfficerRole(address officer) external onlyRole(COMPLIANCE_ADMIN_ROLE) {
        grantRole(RERA_OFFICER_ROLE, officer);
    }

    /**
     * @dev Grant DLD officer role
     */
    function grantDLDOfficerRole(address officer) external onlyRole(COMPLIANCE_ADMIN_ROLE) {
        grantRole(DLD_OFFICER_ROLE, officer);
    }

    /**
     * @dev Grant KYC officer role
     */
    function grantKYCOfficerRole(address officer) external onlyRole(COMPLIANCE_ADMIN_ROLE) {
        grantRole(KYC_OFFICER_ROLE, officer);
    }

    /**
     * @dev Grant AML officer role
     */
    function grantAMLOfficerRole(address officer) external onlyRole(COMPLIANCE_ADMIN_ROLE) {
        grantRole(AML_OFFICER_ROLE, officer);
    }

    /**
     * @dev Pause contract
     */
    function pause() external onlyRole(COMPLIANCE_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause contract
     */
    function unpause() external onlyRole(COMPLIANCE_ADMIN_ROLE) {
        _unpause();
    }
}