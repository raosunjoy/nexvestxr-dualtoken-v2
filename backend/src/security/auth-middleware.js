// NexVestXR Advanced Authentication Middleware
// Comprehensive authentication and authorization system

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

class AuthenticationMiddleware {
    constructor() {
        this.auditLogger = require('./audit-logger');
        this.inputValidator = require('./input-validation');
        
        // JWT configuration
        this.jwtSecret = process.env.JWT_SECRET;
        this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
        this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '1h';
        this.refreshTokenExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
        
        // Session configuration
        this.sessionTimeout = 3600000; // 1 hour in milliseconds
        this.maxSessions = 5; // Maximum concurrent sessions per user
        
        // Security settings
        this.maxLoginAttempts = 5;
        this.lockoutDuration = 900000; // 15 minutes
        this.passwordMinLength = 12;
        this.twoFactorRequired = process.env.TWO_FACTOR_REQUIRED === 'true';
        
        // Rate limiting configuration
        this.loginRateLimit = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 5, // Limit each IP to 5 login attempts per windowMs
            skipSuccessfulRequests: true,
            message: {
                error: 'Too many login attempts',
                message: 'Please try again later'
            }
        });

        // Active sessions storage (in production, use Redis)
        this.activeSessions = new Map();
        this.userSessions = new Map(); // userId -> Set of sessionIds
        this.failedAttempts = new Map(); // IP/username -> attempt count
    }

    // ============================================================================
    // MAIN AUTHENTICATION MIDDLEWARE
    // ============================================================================

    // Primary authentication middleware
    authenticate(options = {}) {
        return async (req, res, next) => {
            try {
                const token = this.extractToken(req);
                
                if (!token) {
                    return this.sendUnauthorized(res, 'Authentication token required');
                }

                // Verify and decode token
                const decoded = await this.verifyToken(token);
                
                // Check if session is still active
                const sessionActive = this.isSessionActive(decoded.sessionId);
                if (!sessionActive) {
                    return this.sendUnauthorized(res, 'Session expired');
                }

                // Check if user is still active
                const user = await this.getUserById(decoded.userId);
                if (!user || !user.isActive) {
                    return this.sendUnauthorized(res, 'User account inactive');
                }

                // Check role-based access if specified
                if (options.roles && !this.hasRequiredRole(user, options.roles)) {
                    return this.sendForbidden(res, 'Insufficient permissions');
                }

                // Check permission-based access if specified
                if (options.permissions && !this.hasRequiredPermissions(user, options.permissions)) {
                    return this.sendForbidden(res, 'Insufficient permissions');
                }

                // Update session activity
                this.updateSessionActivity(decoded.sessionId);

                // Attach user info to request
                req.user = user;
                req.session = {
                    sessionId: decoded.sessionId,
                    issuedAt: decoded.iat,
                    expiresAt: decoded.exp
                };

                // Log successful authentication
                this.auditLogger.log('authentication_success', {
                    userId: user.id,
                    sessionId: decoded.sessionId,
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent'),
                    timestamp: new Date().toISOString()
                });

                next();

            } catch (error) {
                this.auditLogger.log('authentication_failure', {
                    error: error.message,
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent'),
                    timestamp: new Date().toISOString()
                });

                return this.sendUnauthorized(res, 'Invalid authentication token');
            }
        };
    }

    // Optional authentication (doesn't fail if no token)
    optionalAuthenticate() {
        return async (req, res, next) => {
            const token = this.extractToken(req);
            
            if (token) {
                try {
                    const decoded = await this.verifyToken(token);
                    const user = await this.getUserById(decoded.userId);
                    
                    if (user && user.isActive && this.isSessionActive(decoded.sessionId)) {
                        req.user = user;
                        req.session = {
                            sessionId: decoded.sessionId,
                            issuedAt: decoded.iat,
                            expiresAt: decoded.exp
                        };
                    }
                } catch (error) {
                    // Silently fail for optional authentication
                }
            }
            
            next();
        };
    }

    // ============================================================================
    // LOGIN AND LOGOUT
    // ============================================================================

    // Login endpoint
    async login(credentials, req) {
        const { username, password, twoFactorCode, rememberMe = false } = credentials;
        const ipAddress = req.ip;
        const userAgent = req.get('User-Agent');

        try {
            // Check rate limiting
            if (this.isRateLimited(ipAddress, username)) {
                throw new Error('Too many login attempts. Please try again later.');
            }

            // Validate input
            this.validateLoginCredentials(credentials);

            // Find user by username or email
            const user = await this.findUserByCredentials(username);
            if (!user) {
                this.recordFailedAttempt(ipAddress, username);
                throw new Error('Invalid credentials');
            }

            // Check if account is locked
            if (this.isAccountLocked(user)) {
                throw new Error('Account is temporarily locked');
            }

            // Verify password
            const passwordValid = await bcrypt.compare(password, user.passwordHash);
            if (!passwordValid) {
                this.recordFailedAttempt(ipAddress, username);
                await this.incrementUserFailedAttempts(user.id);
                throw new Error('Invalid credentials');
            }

            // Check two-factor authentication if required
            if (this.twoFactorRequired || user.twoFactorEnabled) {
                if (!twoFactorCode) {
                    throw new Error('Two-factor authentication code required');
                }

                const twoFactorValid = this.verifyTwoFactorCode(user.twoFactorSecret, twoFactorCode);
                if (!twoFactorValid) {
                    this.recordFailedAttempt(ipAddress, username);
                    throw new Error('Invalid two-factor authentication code');
                }
            }

            // Clear failed attempts
            this.clearFailedAttempts(ipAddress, username);
            await this.clearUserFailedAttempts(user.id);

            // Check maximum concurrent sessions
            if (this.getUserSessionCount(user.id) >= this.maxSessions) {
                await this.removeOldestSession(user.id);
            }

            // Create session
            const session = await this.createSession(user, {
                ipAddress,
                userAgent,
                rememberMe
            });

            // Update last login
            await this.updateLastLogin(user.id, ipAddress);

            // Log successful login
            this.auditLogger.log('login_success', {
                userId: user.id,
                username: user.username,
                sessionId: session.sessionId,
                ipAddress,
                userAgent,
                twoFactorUsed: !!(twoFactorCode),
                timestamp: new Date().toISOString()
            });

            return {
                user: this.sanitizeUser(user),
                accessToken: session.accessToken,
                refreshToken: session.refreshToken,
                expiresIn: this.jwtExpiresIn,
                sessionId: session.sessionId
            };

        } catch (error) {
            this.auditLogger.log('login_failure', {
                username,
                ipAddress,
                userAgent,
                error: error.message,
                timestamp: new Date().toISOString()
            });

            throw error;
        }
    }

    // Logout endpoint
    async logout(req) {
        try {
            const sessionId = req.session?.sessionId;
            const userId = req.user?.id;

            if (sessionId) {
                // Remove session
                this.removeSession(sessionId);

                // Log logout
                this.auditLogger.log('logout_success', {
                    userId,
                    sessionId,
                    ipAddress: req.ip,
                    timestamp: new Date().toISOString()
                });
            }

            return { message: 'Successfully logged out' };

        } catch (error) {
            this.auditLogger.log('logout_error', {
                error: error.message,
                userId: req.user?.id,
                timestamp: new Date().toISOString()
            });

            throw error;
        }
    }

    // Logout from all devices
    async logoutAll(req) {
        try {
            const userId = req.user?.id;
            
            if (userId) {
                // Remove all user sessions
                this.removeAllUserSessions(userId);

                this.auditLogger.log('logout_all_success', {
                    userId,
                    ipAddress: req.ip,
                    timestamp: new Date().toISOString()
                });
            }

            return { message: 'Successfully logged out from all devices' };

        } catch (error) {
            this.auditLogger.log('logout_all_error', {
                error: error.message,
                userId: req.user?.id,
                timestamp: new Date().toISOString()
            });

            throw error;
        }
    }

    // ============================================================================
    // TOKEN MANAGEMENT
    // ============================================================================

    // Extract token from request
    extractToken(req) {
        // Check Authorization header
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }

        // Check cookie
        if (req.cookies && req.cookies.accessToken) {
            return req.cookies.accessToken;
        }

        // Check query parameter (not recommended for production)
        if (req.query.token) {
            return req.query.token;
        }

        return null;
    }

    // Verify JWT token
    async verifyToken(token) {
        try {
            return jwt.verify(token, this.jwtSecret);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new Error('Token expired');
            } else if (error.name === 'JsonWebTokenError') {
                throw new Error('Invalid token');
            } else {
                throw new Error('Token verification failed');
            }
        }
    }

    // Generate access token
    generateAccessToken(user, sessionId) {
        const payload = {
            userId: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            permissions: user.permissions || [],
            sessionId: sessionId
        };

        return jwt.sign(payload, this.jwtSecret, {
            expiresIn: this.jwtExpiresIn,
            issuer: 'nexvestxr-api',
            audience: 'nexvestxr-app'
        });
    }

    // Generate refresh token
    generateRefreshToken(user, sessionId) {
        const payload = {
            userId: user.id,
            sessionId: sessionId,
            type: 'refresh'
        };

        return jwt.sign(payload, this.jwtRefreshSecret, {
            expiresIn: this.refreshTokenExpiresIn,
            issuer: 'nexvestxr-api',
            audience: 'nexvestxr-app'
        });
    }

    // Refresh access token
    async refreshToken(refreshToken, req) {
        try {
            const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret);
            
            if (decoded.type !== 'refresh') {
                throw new Error('Invalid refresh token');
            }

            // Check if session is still active
            if (!this.isSessionActive(decoded.sessionId)) {
                throw new Error('Session expired');
            }

            // Get user
            const user = await this.getUserById(decoded.userId);
            if (!user || !user.isActive) {
                throw new Error('User account inactive');
            }

            // Generate new access token
            const newAccessToken = this.generateAccessToken(user, decoded.sessionId);

            // Update session activity
            this.updateSessionActivity(decoded.sessionId);

            this.auditLogger.log('token_refreshed', {
                userId: user.id,
                sessionId: decoded.sessionId,
                ipAddress: req.ip,
                timestamp: new Date().toISOString()
            });

            return {
                accessToken: newAccessToken,
                expiresIn: this.jwtExpiresIn
            };

        } catch (error) {
            this.auditLogger.log('token_refresh_failed', {
                error: error.message,
                ipAddress: req.ip,
                timestamp: new Date().toISOString()
            });

            throw new Error('Token refresh failed');
        }
    }

    // ============================================================================
    // SESSION MANAGEMENT
    // ============================================================================

    // Create new session
    async createSession(user, options = {}) {
        const sessionId = crypto.randomUUID();
        const accessToken = this.generateAccessToken(user, sessionId);
        const refreshToken = this.generateRefreshToken(user, sessionId);

        const session = {
            sessionId,
            userId: user.id,
            accessToken,
            refreshToken,
            createdAt: new Date(),
            lastActivity: new Date(),
            ipAddress: options.ipAddress,
            userAgent: options.userAgent,
            rememberMe: options.rememberMe || false,
            isActive: true
        };

        // Store session
        this.activeSessions.set(sessionId, session);

        // Add to user sessions
        if (!this.userSessions.has(user.id)) {
            this.userSessions.set(user.id, new Set());
        }
        this.userSessions.get(user.id).add(sessionId);

        return session;
    }

    // Check if session is active
    isSessionActive(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session || !session.isActive) {
            return false;
        }

        // Check if session has expired
        const now = new Date();
        const sessionAge = now - session.lastActivity;
        
        if (sessionAge > this.sessionTimeout) {
            this.removeSession(sessionId);
            return false;
        }

        return true;
    }

    // Update session activity
    updateSessionActivity(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (session) {
            session.lastActivity = new Date();
        }
    }

    // Remove session
    removeSession(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (session) {
            // Remove from active sessions
            this.activeSessions.delete(sessionId);

            // Remove from user sessions
            const userSessionsSet = this.userSessions.get(session.userId);
            if (userSessionsSet) {
                userSessionsSet.delete(sessionId);
                if (userSessionsSet.size === 0) {
                    this.userSessions.delete(session.userId);
                }
            }
        }
    }

    // Remove all sessions for a user
    removeAllUserSessions(userId) {
        const userSessionsSet = this.userSessions.get(userId);
        if (userSessionsSet) {
            userSessionsSet.forEach(sessionId => {
                this.activeSessions.delete(sessionId);
            });
            this.userSessions.delete(userId);
        }
    }

    // Get session count for user
    getUserSessionCount(userId) {
        const userSessionsSet = this.userSessions.get(userId);
        return userSessionsSet ? userSessionsSet.size : 0;
    }

    // Remove oldest session for user
    async removeOldestSession(userId) {
        const userSessionsSet = this.userSessions.get(userId);
        if (userSessionsSet && userSessionsSet.size > 0) {
            let oldestSession = null;
            let oldestTime = new Date();

            for (const sessionId of userSessionsSet) {
                const session = this.activeSessions.get(sessionId);
                if (session && session.createdAt < oldestTime) {
                    oldestTime = session.createdAt;
                    oldestSession = sessionId;
                }
            }

            if (oldestSession) {
                this.removeSession(oldestSession);
            }
        }
    }

    // ============================================================================
    // TWO-FACTOR AUTHENTICATION
    // ============================================================================

    // Setup two-factor authentication
    async setupTwoFactor(userId) {
        try {
            const user = await this.getUserById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Generate secret
            const secret = speakeasy.generateSecret({
                name: `NexVestXR (${user.email})`,
                issuer: 'NexVestXR'
            });

            // Generate QR code
            const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

            // Store secret (temporarily until verified)
            await this.storeTempTwoFactorSecret(userId, secret.base32);

            return {
                secret: secret.base32,
                qrCode: qrCodeUrl,
                backupCodes: this.generateBackupCodes()
            };

        } catch (error) {
            this.auditLogger.log('two_factor_setup_error', {
                userId,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    // Verify two-factor authentication setup
    async verifyTwoFactorSetup(userId, verificationCode) {
        try {
            const tempSecret = await this.getTempTwoFactorSecret(userId);
            if (!tempSecret) {
                throw new Error('No setup in progress');
            }

            const verified = speakeasy.totp.verify({
                secret: tempSecret,
                encoding: 'base32',
                token: verificationCode,
                window: 1
            });

            if (!verified) {
                throw new Error('Invalid verification code');
            }

            // Enable two-factor for user
            await this.enableTwoFactor(userId, tempSecret);
            await this.removeTempTwoFactorSecret(userId);

            this.auditLogger.log('two_factor_enabled', {
                userId,
                timestamp: new Date().toISOString()
            });

            return { success: true, message: 'Two-factor authentication enabled' };

        } catch (error) {
            this.auditLogger.log('two_factor_verification_error', {
                userId,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    // Verify two-factor code during login
    verifyTwoFactorCode(secret, code) {
        return speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: code,
            window: 1
        });
    }

    // Generate backup codes
    generateBackupCodes() {
        const codes = [];
        for (let i = 0; i < 10; i++) {
            codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
        }
        return codes;
    }

    // ============================================================================
    // ROLE AND PERMISSION CHECKING
    // ============================================================================

    // Check if user has required role
    hasRequiredRole(user, requiredRoles) {
        if (!Array.isArray(requiredRoles)) {
            requiredRoles = [requiredRoles];
        }

        return requiredRoles.includes(user.role);
    }

    // Check if user has required permissions
    hasRequiredPermissions(user, requiredPermissions) {
        if (!Array.isArray(requiredPermissions)) {
            requiredPermissions = [requiredPermissions];
        }

        const userPermissions = user.permissions || [];
        return requiredPermissions.every(permission => 
            userPermissions.includes(permission)
        );
    }

    // ============================================================================
    // RATE LIMITING AND SECURITY
    // ============================================================================

    // Check if IP/username is rate limited
    isRateLimited(ipAddress, username) {
        const key = `${ipAddress}:${username}`;
        const attempts = this.failedAttempts.get(key);
        
        if (!attempts) return false;
        
        return attempts.count >= this.maxLoginAttempts && 
               (Date.now() - attempts.lastAttempt) < this.lockoutDuration;
    }

    // Record failed login attempt
    recordFailedAttempt(ipAddress, username) {
        const key = `${ipAddress}:${username}`;
        const attempts = this.failedAttempts.get(key) || { count: 0, lastAttempt: 0 };
        
        attempts.count++;
        attempts.lastAttempt = Date.now();
        
        this.failedAttempts.set(key, attempts);
    }

    // Clear failed attempts
    clearFailedAttempts(ipAddress, username) {
        const key = `${ipAddress}:${username}`;
        this.failedAttempts.delete(key);
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    // Validate login credentials
    validateLoginCredentials(credentials) {
        const { username, password } = credentials;

        if (!username || typeof username !== 'string') {
            throw new Error('Username is required');
        }

        if (!password || typeof password !== 'string') {
            throw new Error('Password is required');
        }

        if (password.length < this.passwordMinLength) {
            throw new Error(`Password must be at least ${this.passwordMinLength} characters`);
        }
    }

    // Sanitize user data for response
    sanitizeUser(user) {
        const { passwordHash, twoFactorSecret, ...sanitized } = user;
        return sanitized;
    }

    // Send unauthorized response
    sendUnauthorized(res, message) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: message
        });
    }

    // Send forbidden response
    sendForbidden(res, message) {
        return res.status(403).json({
            error: 'Forbidden',
            message: message
        });
    }

    // Placeholder methods (implement with actual database)
    async getUserById(userId) {
        // Implementation would query database
        return null;
    }

    async findUserByCredentials(username) {
        // Implementation would query database
        return null;
    }

    async updateLastLogin(userId, ipAddress) {
        // Implementation would update database
    }

    async incrementUserFailedAttempts(userId) {
        // Implementation would update database
    }

    async clearUserFailedAttempts(userId) {
        // Implementation would update database
    }

    isAccountLocked(user) {
        // Implementation would check user lockout status
        return false;
    }

    async storeTempTwoFactorSecret(userId, secret) {
        // Implementation would store in database
    }

    async getTempTwoFactorSecret(userId) {
        // Implementation would retrieve from database
        return null;
    }

    async removeTempTwoFactorSecret(userId) {
        // Implementation would remove from database
    }

    async enableTwoFactor(userId, secret) {
        // Implementation would update user in database
    }
}

module.exports = AuthenticationMiddleware;