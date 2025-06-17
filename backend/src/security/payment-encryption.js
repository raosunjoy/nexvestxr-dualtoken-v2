// NexVestXR Payment Data Encryption
// Advanced encryption for PCI DSS compliant payment processing

const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { promisify } = require('util');

class PaymentDataEncryption {
    constructor() {
        this.auditLogger = require('./audit-logger');
        
        // Encryption configuration
        this.algorithm = 'aes-256-gcm';
        this.keyLength = 32; // 256 bits
        this.ivLength = 16;  // 128 bits
        this.tagLength = 16; // 128 bits
        this.saltLength = 32; // 256 bits
        
        // Key derivation configuration
        this.kdfIterations = 100000; // PBKDF2 iterations
        this.kdfHashAlgorithm = 'sha512';
        
        // Master encryption key (should be in secure key management)
        this.masterKey = process.env.PAYMENT_MASTER_KEY || this.generateSecureKey();
        
        // Field-specific encryption keys
        this.fieldKeys = {
            cardNumber: this.deriveFieldKey('CARD_NUMBER'),
            expiryDate: this.deriveFieldKey('EXPIRY_DATE'),
            holderName: this.deriveFieldKey('HOLDER_NAME'),
            bankAccount: this.deriveFieldKey('BANK_ACCOUNT'),
            routingNumber: this.deriveFieldKey('ROUTING_NUMBER'),
            cvv: this.deriveFieldKey('CVV'), // Temporary encryption only
            pin: this.deriveFieldKey('PIN')  // Should never be stored
        };

        // Tokenization vault (in production, use external service)
        this.tokenVault = new Map();
        this.reverseTokenVault = new Map();

        // Initialize secure random generator
        this.secureRandom = promisify(crypto.randomBytes);
    }

    // Generate cryptographically secure random key
    generateSecureKey() {
        return crypto.randomBytes(this.keyLength).toString('hex');
    }

    // Derive field-specific encryption keys
    deriveFieldKey(fieldName) {
        const salt = crypto.createHash('sha256').update(fieldName).digest();
        return crypto.pbkdf2Sync(
            this.masterKey,
            salt,
            this.kdfIterations,
            this.keyLength,
            this.kdfHashAlgorithm
        );
    }

    // ============================================================================
    // CREDIT CARD DATA ENCRYPTION
    // ============================================================================

    // Encrypt credit card number with tokenization
    async encryptCardNumber(cardNumber, options = {}) {
        try {
            // Validate card number
            this.validateCardNumber(cardNumber);

            // Generate token for card number
            const token = await this.generateCardToken(cardNumber);

            // Encrypt the actual card number
            const encryptedData = await this.encryptSensitiveField(
                cardNumber,
                this.fieldKeys.cardNumber,
                'CARD_NUMBER'
            );

            // Store in tokenization vault (production: use external vault)
            this.tokenVault.set(token, encryptedData);
            this.reverseTokenVault.set(cardNumber, token);

            // Create masked version for display
            const maskedNumber = this.maskCardNumber(cardNumber);

            // Audit log
            this.auditLogger.log('card_number_encrypted', {
                tokenId: token,
                maskedNumber: maskedNumber,
                encryptionAlgorithm: this.algorithm,
                timestamp: new Date().toISOString(),
                userId: options.userId,
                ipAddress: options.ipAddress
            });

            return {
                token: token,
                maskedNumber: maskedNumber,
                encryptedData: encryptedData.encrypted,
                metadata: {
                    algorithm: this.algorithm,
                    keyVersion: '1.0',
                    encryptedAt: new Date().toISOString()
                }
            };

        } catch (error) {
            this.auditLogger.log('card_encryption_error', {
                error: error.message,
                timestamp: new Date().toISOString(),
                userId: options.userId,
                ipAddress: options.ipAddress
            });
            throw new Error('Card encryption failed');
        }
    }

    // Decrypt credit card number from token
    async decryptCardNumber(token, options = {}) {
        try {
            // Retrieve encrypted data from vault
            const encryptedData = this.tokenVault.get(token);
            if (!encryptedData) {
                throw new Error('Invalid token');
            }

            // Decrypt the card number
            const cardNumber = await this.decryptSensitiveField(
                encryptedData,
                this.fieldKeys.cardNumber,
                'CARD_NUMBER'
            );

            // Audit log
            this.auditLogger.log('card_number_decrypted', {
                tokenId: token,
                timestamp: new Date().toISOString(),
                userId: options.userId,
                ipAddress: options.ipAddress,
                purpose: options.purpose || 'payment_processing'
            });

            return cardNumber;

        } catch (error) {
            this.auditLogger.log('card_decryption_error', {
                tokenId: token,
                error: error.message,
                timestamp: new Date().toISOString(),
                userId: options.userId
            });
            throw new Error('Card decryption failed');
        }
    }

    // Encrypt cardholder name
    async encryptCardholderName(name, options = {}) {
        try {
            this.validateCardholderName(name);

            const encryptedData = await this.encryptSensitiveField(
                name,
                this.fieldKeys.holderName,
                'CARDHOLDER_NAME'
            );

            this.auditLogger.log('cardholder_name_encrypted', {
                encryptionAlgorithm: this.algorithm,
                timestamp: new Date().toISOString(),
                userId: options.userId
            });

            return encryptedData;

        } catch (error) {
            this.auditLogger.log('cardholder_name_encryption_error', {
                error: error.message,
                timestamp: new Date().toISOString(),
                userId: options.userId
            });
            throw error;
        }
    }

    // Encrypt expiry date
    async encryptExpiryDate(expiryDate, options = {}) {
        try {
            this.validateExpiryDate(expiryDate);

            const encryptedData = await this.encryptSensitiveField(
                expiryDate,
                this.fieldKeys.expiryDate,
                'EXPIRY_DATE'
            );

            this.auditLogger.log('expiry_date_encrypted', {
                encryptionAlgorithm: this.algorithm,
                timestamp: new Date().toISOString(),
                userId: options.userId
            });

            return encryptedData;

        } catch (error) {
            this.auditLogger.log('expiry_date_encryption_error', {
                error: error.message,
                timestamp: new Date().toISOString(),
                userId: options.userId
            });
            throw error;
        }
    }

    // ============================================================================
    // BANK ACCOUNT DATA ENCRYPTION
    // ============================================================================

    // Encrypt bank account number
    async encryptBankAccount(accountNumber, options = {}) {
        try {
            this.validateBankAccount(accountNumber);

            // Generate token for bank account
            const token = await this.generateBankToken(accountNumber);

            const encryptedData = await this.encryptSensitiveField(
                accountNumber,
                this.fieldKeys.bankAccount,
                'BANK_ACCOUNT'
            );

            // Create masked version
            const maskedAccount = this.maskBankAccount(accountNumber);

            this.auditLogger.log('bank_account_encrypted', {
                tokenId: token,
                maskedAccount: maskedAccount,
                timestamp: new Date().toISOString(),
                userId: options.userId
            });

            return {
                token: token,
                maskedAccount: maskedAccount,
                encryptedData: encryptedData.encrypted,
                metadata: {
                    algorithm: this.algorithm,
                    keyVersion: '1.0',
                    encryptedAt: new Date().toISOString()
                }
            };

        } catch (error) {
            this.auditLogger.log('bank_account_encryption_error', {
                error: error.message,
                timestamp: new Date().toISOString(),
                userId: options.userId
            });
            throw error;
        }
    }

    // Encrypt routing number
    async encryptRoutingNumber(routingNumber, options = {}) {
        try {
            this.validateRoutingNumber(routingNumber);

            const encryptedData = await this.encryptSensitiveField(
                routingNumber,
                this.fieldKeys.routingNumber,
                'ROUTING_NUMBER'
            );

            return encryptedData;

        } catch (error) {
            this.auditLogger.log('routing_number_encryption_error', {
                error: error.message,
                timestamp: new Date().toISOString(),
                userId: options.userId
            });
            throw error;
        }
    }

    // ============================================================================
    // CORE ENCRYPTION FUNCTIONS
    // ============================================================================

    // Encrypt sensitive field with authenticated encryption
    async encryptSensitiveField(data, key, fieldType) {
        try {
            // Generate random IV
            const iv = await this.secureRandom(this.ivLength);
            
            // Create cipher
            const cipher = crypto.createCipher(this.algorithm, key);
            cipher.setAAD(Buffer.from(fieldType, 'utf8'));

            // Encrypt data
            let encrypted = cipher.update(data, 'utf8', 'hex');
            encrypted += cipher.final('hex');

            // Get authentication tag
            const authTag = cipher.getAuthTag();

            return {
                encrypted: encrypted,
                iv: iv.toString('hex'),
                authTag: authTag.toString('hex'),
                algorithm: this.algorithm,
                fieldType: fieldType,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            throw new Error(`Encryption failed for ${fieldType}: ${error.message}`);
        }
    }

    // Decrypt sensitive field with authentication verification
    async decryptSensitiveField(encryptedData, key, fieldType) {
        try {
            const { encrypted, iv, authTag, algorithm } = encryptedData;

            // Verify algorithm matches
            if (algorithm !== this.algorithm) {
                throw new Error('Algorithm mismatch');
            }

            // Create decipher
            const decipher = crypto.createDecipher(algorithm, key);
            decipher.setAuthTag(Buffer.from(authTag, 'hex'));
            decipher.setAAD(Buffer.from(fieldType, 'utf8'));

            // Decrypt data
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;

        } catch (error) {
            throw new Error(`Decryption failed for ${fieldType}: ${error.message}`);
        }
    }

    // ============================================================================
    // TOKENIZATION FUNCTIONS
    // ============================================================================

    // Generate secure card token
    async generateCardToken(cardNumber) {
        const hash = crypto.createHash('sha256').update(cardNumber).digest('hex');
        const randomBytes = await this.secureRandom(8);
        return `CTK_${hash.substring(0, 8)}${randomBytes.toString('hex').toUpperCase()}`;
    }

    // Generate secure bank account token
    async generateBankToken(accountNumber) {
        const hash = crypto.createHash('sha256').update(accountNumber).digest('hex');
        const randomBytes = await this.secureRandom(8);
        return `BTK_${hash.substring(0, 8)}${randomBytes.toString('hex').toUpperCase()}`;
    }

    // ============================================================================
    // VALIDATION FUNCTIONS
    // ============================================================================

    validateCardNumber(cardNumber) {
        if (!cardNumber || typeof cardNumber !== 'string') {
            throw new Error('Invalid card number format');
        }

        // Remove spaces and dashes
        const cleaned = cardNumber.replace(/[\s-]/g, '');

        // Check if all digits
        if (!/^\d+$/.test(cleaned)) {
            throw new Error('Card number must contain only digits');
        }

        // Check length (13-19 digits for most card types)
        if (cleaned.length < 13 || cleaned.length > 19) {
            throw new Error('Invalid card number length');
        }

        // Luhn algorithm validation
        if (!this.luhnCheck(cleaned)) {
            throw new Error('Invalid card number checksum');
        }

        return true;
    }

    validateCardholderName(name) {
        if (!name || typeof name !== 'string') {
            throw new Error('Invalid cardholder name');
        }

        if (name.length < 2 || name.length > 100) {
            throw new Error('Cardholder name length invalid');
        }

        // Only letters, spaces, hyphens, and apostrophes
        if (!/^[a-zA-Z\s\-']+$/.test(name)) {
            throw new Error('Cardholder name contains invalid characters');
        }

        return true;
    }

    validateExpiryDate(expiryDate) {
        if (!expiryDate || typeof expiryDate !== 'string') {
            throw new Error('Invalid expiry date format');
        }

        // Accept MM/YY or MM/YYYY format
        const match = expiryDate.match(/^(\d{2})\/(\d{2}|\d{4})$/);
        if (!match) {
            throw new Error('Expiry date must be in MM/YY or MM/YYYY format');
        }

        const month = parseInt(match[1]);
        let year = parseInt(match[2]);

        // Convert YY to YYYY
        if (year < 100) {
            year += 2000;
        }

        // Validate month
        if (month < 1 || month > 12) {
            throw new Error('Invalid expiry month');
        }

        // Check if expired
        const currentDate = new Date();
        const expiryDateObj = new Date(year, month - 1);
        
        if (expiryDateObj < currentDate) {
            throw new Error('Card has expired');
        }

        // Check if too far in future (more than 10 years)
        const maxFutureDate = new Date();
        maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 10);
        
        if (expiryDateObj > maxFutureDate) {
            throw new Error('Expiry date too far in future');
        }

        return true;
    }

    validateBankAccount(accountNumber) {
        if (!accountNumber || typeof accountNumber !== 'string') {
            throw new Error('Invalid bank account number');
        }

        const cleaned = accountNumber.replace(/[\s-]/g, '');

        // Check if all digits
        if (!/^\d+$/.test(cleaned)) {
            throw new Error('Bank account number must contain only digits');
        }

        // Check length (typically 8-17 digits)
        if (cleaned.length < 8 || cleaned.length > 17) {
            throw new Error('Invalid bank account number length');
        }

        return true;
    }

    validateRoutingNumber(routingNumber) {
        if (!routingNumber || typeof routingNumber !== 'string') {
            throw new Error('Invalid routing number');
        }

        const cleaned = routingNumber.replace(/[\s-]/g, '');

        // Must be exactly 9 digits for US routing numbers
        if (!/^\d{9}$/.test(cleaned)) {
            throw new Error('Routing number must be exactly 9 digits');
        }

        // Validate routing number checksum
        if (!this.validateRoutingChecksum(cleaned)) {
            throw new Error('Invalid routing number checksum');
        }

        return true;
    }

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================

    // Luhn algorithm for card number validation
    luhnCheck(cardNumber) {
        let sum = 0;
        let alternate = false;

        for (let i = cardNumber.length - 1; i >= 0; i--) {
            let digit = parseInt(cardNumber.charAt(i));

            if (alternate) {
                digit *= 2;
                if (digit > 9) {
                    digit = (digit % 10) + 1;
                }
            }

            sum += digit;
            alternate = !alternate;
        }

        return (sum % 10) === 0;
    }

    // Routing number checksum validation
    validateRoutingChecksum(routingNumber) {
        const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1];
        let sum = 0;

        for (let i = 0; i < 9; i++) {
            sum += parseInt(routingNumber.charAt(i)) * weights[i];
        }

        return (sum % 10) === 0;
    }

    // Mask card number for display
    maskCardNumber(cardNumber) {
        const cleaned = cardNumber.replace(/[\s-]/g, '');
        if (cleaned.length < 13) return '****';

        const firstSix = cleaned.substring(0, 6);
        const lastFour = cleaned.substring(cleaned.length - 4);
        const masked = '*'.repeat(cleaned.length - 10);

        return `${firstSix}${masked}${lastFour}`;
    }

    // Mask bank account for display
    maskBankAccount(accountNumber) {
        const cleaned = accountNumber.replace(/[\s-]/g, '');
        if (cleaned.length < 8) return '****';

        const lastFour = cleaned.substring(cleaned.length - 4);
        const masked = '*'.repeat(cleaned.length - 4);

        return `${masked}${lastFour}`;
    }

    // ============================================================================
    // KEY MANAGEMENT
    // ============================================================================

    // Rotate encryption keys (should be done periodically)
    async rotateKeys() {
        try {
            const oldMasterKey = this.masterKey;
            this.masterKey = this.generateSecureKey();

            // Re-derive field keys
            this.fieldKeys = {
                cardNumber: this.deriveFieldKey('CARD_NUMBER'),
                expiryDate: this.deriveFieldKey('EXPIRY_DATE'),
                holderName: this.deriveFieldKey('HOLDER_NAME'),
                bankAccount: this.deriveFieldKey('BANK_ACCOUNT'),
                routingNumber: this.deriveFieldKey('ROUTING_NUMBER'),
                cvv: this.deriveFieldKey('CVV'),
                pin: this.deriveFieldKey('PIN')
            };

            this.auditLogger.log('encryption_keys_rotated', {
                timestamp: new Date().toISOString(),
                oldKeyHash: crypto.createHash('sha256').update(oldMasterKey).digest('hex').substring(0, 8),
                newKeyHash: crypto.createHash('sha256').update(this.masterKey).digest('hex').substring(0, 8)
            });

            return true;

        } catch (error) {
            this.auditLogger.log('key_rotation_error', {
                error: error.message,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    // Securely wipe sensitive data from memory
    secureWipe(data) {
        if (typeof data === 'string') {
            // Overwrite string memory (best effort)
            for (let i = 0; i < data.length; i++) {
                data = data.substr(0, i) + '0' + data.substr(i + 1);
            }
        }
        return null;
    }

    // Get encryption status
    getEncryptionStatus() {
        return {
            algorithm: this.algorithm,
            keyLength: this.keyLength,
            kdfIterations: this.kdfIterations,
            supportedFields: Object.keys(this.fieldKeys),
            vaultSize: this.tokenVault.size,
            lastKeyRotation: null // Would track in production
        };
    }
}

module.exports = PaymentDataEncryption;