// NexVestXR Comprehensive API Input Validation
// Advanced input validation and sanitization for security

const { body, param, query, validationResult } = require('express-validator');
const validator = require('validator');
const DOMPurify = require('isomorphic-dompurify');
const xss = require('xss');
const rateLimit = require('express-rate-limit');

class InputValidationSecurity {
    constructor() {
        this.auditLogger = require('./audit-logger');
        this.patterns = {
            // Blockchain patterns
            xrplAddress: /^r[a-zA-Z0-9]{24,34}$/,
            flareAddress: /^0x[a-fA-F0-9]{40}$/,
            transactionHash: /^[a-fA-F0-9]{64}$/,
            
            // Property patterns
            propertyId: /^PROP_[A-Z0-9]{8,16}$/,
            valuationId: /^VAL_[A-Z0-9]{8,16}$/,
            
            // UAE specific patterns
            emiratesId: /^784-[0-9]{4}-[0-9]{7}-[0-9]{1}$/,
            tradeLicense: /^[A-Z]{2}[0-9]{6,8}$/,
            
            // Financial patterns
            amount: /^\d+(\.\d{1,8})?$/,
            currency: /^[A-Z]{3}$/,
            
            // General security patterns
            uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
            alphanumeric: /^[a-zA-Z0-9]+$/,
            safeString: /^[a-zA-Z0-9\s\-_.,!?()]+$/
        };

        this.maxLengths = {
            username: 50,
            email: 254,
            password: 128,
            name: 100,
            address: 500,
            description: 2000,
            comment: 1000,
            title: 200,
            url: 2048,
            phoneNumber: 20
        };

        this.blockedPatterns = [
            // SQL injection patterns
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
            /(\b(UNION|JOIN|WHERE|HAVING|GROUP BY|ORDER BY)\b)/i,
            /(--|\/\*|\*\/|xp_|sp_)/i,
            /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
            
            // XSS patterns
            /<script[^>]*>.*?<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi,
            /<iframe[^>]*>.*?<\/iframe>/gi,
            
            // Command injection patterns
            /(\||&|;|\$\(|\`)/,
            /(\bcat\b|\bls\b|\bpwd\b|\bwhoami\b|\bps\b)/i,
            
            // Path traversal patterns
            /(\.\.\/)|(\.\.\\)/,
            /(%2e%2e%2f)|(%2e%2e%5c)/i,
            
            // LDAP injection patterns
            /(\(|\)|\\|\*|\0)/,
            
            // NoSQL injection patterns
            /(\$where|\$ne|\$in|\$regex)/i
        ];
    }

    // Main validation middleware
    validateRequest(validations) {
        return [
            ...validations,
            this.handleValidationErrors.bind(this),
            this.logValidationAttempt.bind(this)
        ];
    }

    // Handle validation errors
    handleValidationErrors(req, res, next) {
        const errors = validationResult(req);
        
        if (!errors.isEmpty()) {
            const validationErrors = errors.array();
            
            // Log validation failure
            this.auditLogger.log('input_validation_failure', {
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                path: req.path,
                method: req.method,
                errors: validationErrors,
                userId: req.user?.id,
                timestamp: new Date().toISOString()
            });

            // Check for potential attack patterns
            const suspiciousPatterns = this.detectSuspiciousPatterns(req);
            if (suspiciousPatterns.length > 0) {
                this.auditLogger.log('potential_attack_detected', {
                    ipAddress: req.ip,
                    patterns: suspiciousPatterns,
                    userAgent: req.get('User-Agent'),
                    body: this.sanitizeForLogging(req.body),
                    query: this.sanitizeForLogging(req.query),
                    timestamp: new Date().toISOString()
                });

                return res.status(400).json({
                    error: 'Invalid request',
                    message: 'Request contains potentially malicious content'
                });
            }

            return res.status(400).json({
                error: 'Validation failed',
                message: 'Invalid input data',
                details: process.env.NODE_ENV === 'development' ? validationErrors : undefined
            });
        }

        next();
    }

    // Log validation attempt
    logValidationAttempt(req, res, next) {
        this.auditLogger.log('input_validation_success', {
            ipAddress: req.ip,
            path: req.path,
            method: req.method,
            userId: req.user?.id,
            timestamp: new Date().toISOString()
        });

        next();
    }

    // Detect suspicious patterns in request
    detectSuspiciousPatterns(req) {
        const suspiciousPatterns = [];
        const requestString = JSON.stringify({
            body: req.body,
            query: req.query,
            params: req.params
        });

        this.blockedPatterns.forEach((pattern, index) => {
            if (pattern.test(requestString)) {
                suspiciousPatterns.push({
                    patternIndex: index,
                    patternType: this.getPatternType(index),
                    matched: true
                });
            }
        });

        return suspiciousPatterns;
    }

    // Get pattern type for logging
    getPatternType(index) {
        if (index < 4) return 'SQL_INJECTION';
        if (index < 8) return 'XSS';
        if (index < 10) return 'COMMAND_INJECTION';
        if (index < 12) return 'PATH_TRAVERSAL';
        if (index < 13) return 'LDAP_INJECTION';
        return 'NOSQL_INJECTION';
    }

    // Sanitize data for logging (remove sensitive info)
    sanitizeForLogging(data) {
        const sensitiveFields = ['password', 'token', 'secret', 'key', 'cvv', 'pin'];
        const sanitized = { ...data };

        const sanitizeObject = (obj) => {
            for (const [key, value] of Object.entries(obj)) {
                if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
                    obj[key] = '[REDACTED]';
                } else if (typeof value === 'object' && value !== null) {
                    sanitizeObject(value);
                }
            }
        };

        sanitizeObject(sanitized);
        return sanitized;
    }

    // Custom validation methods

    // Validate blockchain addresses
    validateBlockchainAddress(platform) {
        return body('address')
            .custom((value, { req }) => {
                if (!value) throw new Error('Address is required');
                
                let isValid = false;
                switch (platform.toLowerCase()) {
                    case 'xrpl':
                        isValid = this.patterns.xrplAddress.test(value);
                        break;
                    case 'flare':
                        isValid = this.patterns.flareAddress.test(value);
                        break;
                    default:
                        throw new Error('Unsupported blockchain platform');
                }

                if (!isValid) {
                    throw new Error(`Invalid ${platform.toUpperCase()} address format`);
                }

                return true;
            })
            .customSanitizer(value => value.trim());
    }

    // Validate property data
    validatePropertyData() {
        return [
            body('propertyId')
                .matches(this.patterns.propertyId)
                .withMessage('Invalid property ID format'),
            
            body('title')
                .isLength({ min: 3, max: this.maxLengths.title })
                .withMessage(`Title must be 3-${this.maxLengths.title} characters`)
                .customSanitizer(value => DOMPurify.sanitize(value.trim())),
            
            body('description')
                .isLength({ min: 10, max: this.maxLengths.description })
                .withMessage(`Description must be 10-${this.maxLengths.description} characters`)
                .customSanitizer(value => DOMPurify.sanitize(value.trim())),
            
            body('price')
                .matches(this.patterns.amount)
                .withMessage('Invalid price format')
                .customSanitizer(value => parseFloat(value)),
            
            body('currency')
                .matches(this.patterns.currency)
                .withMessage('Invalid currency code')
                .isIn(['AED', 'USD', 'EUR'])
                .withMessage('Currency must be AED, USD, or EUR'),
            
            body('area')
                .isFloat({ min: 0.1, max: 100000 })
                .withMessage('Area must be between 0.1 and 100000 square meters'),
            
            body('location.emirate')
                .isIn(['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'])
                .withMessage('Invalid emirate'),
            
            body('coordinates.latitude')
                .isFloat({ min: 22, max: 27 })
                .withMessage('Latitude must be within UAE bounds'),
            
            body('coordinates.longitude')
                .isFloat({ min: 51, max: 57 })
                .withMessage('Longitude must be within UAE bounds')
        ];
    }

    // Validate user registration
    validateUserRegistration() {
        return [
            body('username')
                .isLength({ min: 3, max: this.maxLengths.username })
                .withMessage(`Username must be 3-${this.maxLengths.username} characters`)
                .matches(/^[a-zA-Z0-9_-]+$/)
                .withMessage('Username can only contain letters, numbers, underscores, and hyphens')
                .customSanitizer(value => value.trim().toLowerCase()),
            
            body('email')
                .isEmail()
                .withMessage('Invalid email format')
                .isLength({ max: this.maxLengths.email })
                .withMessage(`Email too long (max ${this.maxLengths.email} characters)`)
                .normalizeEmail()
                .custom(async (value) => {
                    // Check for disposable email domains
                    const disposableDomains = ['10minutemail.com', 'tempmail.org', 'guerrillamail.com'];
                    const domain = value.split('@')[1];
                    if (disposableDomains.includes(domain)) {
                        throw new Error('Disposable email addresses are not allowed');
                    }
                    return true;
                }),
            
            body('password')
                .isLength({ min: 12, max: this.maxLengths.password })
                .withMessage(`Password must be 12-${this.maxLengths.password} characters`)
                .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/)
                .withMessage('Password must contain uppercase, lowercase, number, and special character'),
            
            body('firstName')
                .isLength({ min: 1, max: this.maxLengths.name })
                .withMessage(`First name must be 1-${this.maxLengths.name} characters`)
                .matches(/^[a-zA-Z\s\-']+$/)
                .withMessage('First name contains invalid characters')
                .customSanitizer(value => DOMPurify.sanitize(value.trim())),
            
            body('lastName')
                .isLength({ min: 1, max: this.maxLengths.name })
                .withMessage(`Last name must be 1-${this.maxLengths.name} characters`)
                .matches(/^[a-zA-Z\s\-']+$/)
                .withMessage('Last name contains invalid characters')
                .customSanitizer(value => DOMPurify.sanitize(value.trim())),
            
            body('phoneNumber')
                .isMobilePhone('ae-AE')
                .withMessage('Invalid UAE phone number format')
                .customSanitizer(value => value.replace(/\D/g, '')),
            
            body('emiratesId')
                .optional()
                .matches(this.patterns.emiratesId)
                .withMessage('Invalid Emirates ID format'),
            
            body('dateOfBirth')
                .isISO8601()
                .withMessage('Invalid date format')
                .custom(value => {
                    const birthDate = new Date(value);
                    const minAge = new Date();
                    minAge.setFullYear(minAge.getFullYear() - 18);
                    
                    if (birthDate > minAge) {
                        throw new Error('Must be at least 18 years old');
                    }
                    return true;
                }),
            
            body('nationality')
                .isLength({ min: 2, max: 3 })
                .withMessage('Invalid nationality code')
                .isAlpha()
                .withMessage('Nationality must contain only letters'),
            
            body('termsAccepted')
                .equals('true')
                .withMessage('Terms and conditions must be accepted'),
            
            body('privacyAccepted')
                .equals('true')
                .withMessage('Privacy policy must be accepted')
        ];
    }

    // Validate payment data
    validatePaymentData() {
        return [
            body('amount')
                .matches(this.patterns.amount)
                .withMessage('Invalid amount format')
                .custom(value => {
                    const amount = parseFloat(value);
                    if (amount <= 0) throw new Error('Amount must be greater than 0');
                    if (amount > 10000000) throw new Error('Amount exceeds maximum limit');
                    return true;
                }),
            
            body('currency')
                .matches(this.patterns.currency)
                .withMessage('Invalid currency code')
                .isIn(['AED', 'USD'])
                .withMessage('Only AED and USD are supported'),
            
            body('paymentMethod')
                .isIn(['card', 'bank_transfer', 'digital_wallet'])
                .withMessage('Invalid payment method'),
            
            // Note: Card data should never be sent to backend directly
            // This would be tokenized by payment processor
            body('paymentToken')
                .isLength({ min: 10, max: 200 })
                .withMessage('Invalid payment token')
                .matches(/^[a-zA-Z0-9_-]+$/)
                .withMessage('Payment token contains invalid characters'),
            
            body('description')
                .optional()
                .isLength({ max: this.maxLengths.description })
                .withMessage(`Description too long (max ${this.maxLengths.description} characters)`)
                .customSanitizer(value => DOMPurify.sanitize(value.trim()))
        ];
    }

    // Validate investment data
    validateInvestmentData() {
        return [
            body('propertyId')
                .matches(this.patterns.propertyId)
                .withMessage('Invalid property ID format'),
            
            body('investmentAmount')
                .matches(this.patterns.amount)
                .withMessage('Invalid investment amount format')
                .custom(value => {
                    const amount = parseFloat(value);
                    if (amount < 1000) throw new Error('Minimum investment is 1,000 AED');
                    if (amount > 5000000) throw new Error('Maximum investment is 5,000,000 AED');
                    return true;
                }),
            
            body('investmentType')
                .isIn(['full_purchase', 'fractional_ownership', 'rental_income'])
                .withMessage('Invalid investment type'),
            
            body('ownershipPercentage')
                .optional()
                .isFloat({ min: 0.01, max: 100 })
                .withMessage('Ownership percentage must be between 0.01% and 100%'),
            
            body('expectedReturn')
                .optional()
                .isFloat({ min: 0, max: 50 })
                .withMessage('Expected return must be between 0% and 50%'),
            
            body('investmentTerm')
                .isIn(['short_term', 'medium_term', 'long_term'])
                .withMessage('Invalid investment term')
        ];
    }

    // Validate trading data
    validateTradingData() {
        return [
            body('orderType')
                .isIn(['market', 'limit', 'stop_loss', 'take_profit', 'oco', 'trailing_stop'])
                .withMessage('Invalid order type'),
            
            body('side')
                .isIn(['buy', 'sell'])
                .withMessage('Order side must be buy or sell'),
            
            body('quantity')
                .matches(this.patterns.amount)
                .withMessage('Invalid quantity format')
                .custom(value => {
                    const qty = parseFloat(value);
                    if (qty <= 0) throw new Error('Quantity must be greater than 0');
                    return true;
                }),
            
            body('price')
                .optional()
                .matches(this.patterns.amount)
                .withMessage('Invalid price format'),
            
            body('stopPrice')
                .optional()
                .matches(this.patterns.amount)
                .withMessage('Invalid stop price format'),
            
            body('tokenType')
                .isIn(['XERA', 'PROPX'])
                .withMessage('Token type must be XERA or PROPX'),
            
            body('timeInForce')
                .optional()
                .isIn(['GTC', 'IOC', 'FOK', 'DAY'])
                .withMessage('Invalid time in force value')
        ];
    }

    // Validate search parameters
    validateSearchParams() {
        return [
            query('q')
                .optional()
                .isLength({ min: 1, max: 100 })
                .withMessage('Search query must be 1-100 characters')
                .customSanitizer(value => DOMPurify.sanitize(value.trim()))
                .custom(value => {
                    // Check for malicious search patterns
                    if (this.blockedPatterns.some(pattern => pattern.test(value))) {
                        throw new Error('Search query contains invalid characters');
                    }
                    return true;
                }),
            
            query('category')
                .optional()
                .isIn(['residential', 'commercial', 'industrial', 'mixed_use'])
                .withMessage('Invalid property category'),
            
            query('minPrice')
                .optional()
                .matches(this.patterns.amount)
                .withMessage('Invalid minimum price format'),
            
            query('maxPrice')
                .optional()
                .matches(this.patterns.amount)
                .withMessage('Invalid maximum price format'),
            
            query('emirate')
                .optional()
                .isIn(['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'])
                .withMessage('Invalid emirate'),
            
            query('sortBy')
                .optional()
                .isIn(['price', 'area', 'date', 'rating', 'returns'])
                .withMessage('Invalid sort field'),
            
            query('sortOrder')
                .optional()
                .isIn(['asc', 'desc'])
                .withMessage('Sort order must be asc or desc'),
            
            query('page')
                .optional()
                .isInt({ min: 1, max: 1000 })
                .withMessage('Page must be between 1 and 1000'),
            
            query('limit')
                .optional()
                .isInt({ min: 1, max: 100 })
                .withMessage('Limit must be between 1 and 100')
        ];
    }

    // Validate file upload
    validateFileUpload() {
        return [
            body('fileName')
                .matches(/^[a-zA-Z0-9\-_\s\.]+$/)
                .withMessage('Invalid file name characters')
                .isLength({ min: 1, max: 255 })
                .withMessage('File name must be 1-255 characters'),
            
            body('fileType')
                .isIn(['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'])
                .withMessage('File type not allowed'),
            
            body('fileSize')
                .isInt({ min: 1, max: 10485760 }) // 10MB
                .withMessage('File size must be between 1 byte and 10MB'),
            
            body('purpose')
                .isIn(['profile_picture', 'property_image', 'document', 'identity_verification'])
                .withMessage('Invalid file purpose')
        ];
    }

    // Create rate limiter for different endpoints
    createRateLimiter(windowMs, max, skipSuccessfulRequests = false) {
        return rateLimit({
            windowMs,
            max,
            skipSuccessfulRequests,
            message: {
                error: 'Rate limit exceeded',
                message: 'Too many requests, please try again later'
            },
            standardHeaders: true,
            legacyHeaders: false,
            handler: (req, res) => {
                this.auditLogger.log('rate_limit_exceeded', {
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent'),
                    endpoint: req.path,
                    method: req.method,
                    timestamp: new Date().toISOString()
                });

                res.status(429).json({
                    error: 'Rate limit exceeded',
                    message: 'Too many requests, please try again later'
                });
            }
        });
    }

    // Sanitize HTML content
    sanitizeHtml(content) {
        return DOMPurify.sanitize(content, {
            ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
            ALLOWED_ATTR: []
        });
    }

    // Validate and sanitize user input
    sanitizeUserInput(input, type = 'general') {
        if (typeof input !== 'string') return input;

        let sanitized = input.trim();

        switch (type) {
            case 'html':
                sanitized = this.sanitizeHtml(sanitized);
                break;
            case 'search':
                sanitized = sanitized.replace(/[<>\"']/g, '');
                break;
            case 'alphanumeric':
                sanitized = sanitized.replace(/[^a-zA-Z0-9\s]/g, '');
                break;
            case 'numeric':
                sanitized = sanitized.replace(/[^0-9.]/g, '');
                break;
            default:
                sanitized = xss(sanitized);
        }

        return sanitized;
    }

    // Validate UUID format
    validateUUID() {
        return param('id')
            .matches(this.patterns.uuid)
            .withMessage('Invalid UUID format');
    }

    // Validate pagination parameters
    validatePagination() {
        return [
            query('page')
                .optional()
                .isInt({ min: 1, max: 1000 })
                .withMessage('Page must be between 1 and 1000')
                .toInt(),
            
            query('limit')
                .optional()
                .isInt({ min: 1, max: 100 })
                .withMessage('Limit must be between 1 and 100')
                .toInt()
        ];
    }

    // Validate date range
    validateDateRange() {
        return [
            query('startDate')
                .optional()
                .isISO8601()
                .withMessage('Invalid start date format'),
            
            query('endDate')
                .optional()
                .isISO8601()
                .withMessage('Invalid end date format')
                .custom((endDate, { req }) => {
                    if (req.query.startDate && endDate <= req.query.startDate) {
                        throw new Error('End date must be after start date');
                    }
                    return true;
                })
        ];
    }
}

module.exports = InputValidationSecurity;