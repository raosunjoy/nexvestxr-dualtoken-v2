// NexVestXR Security Headers Middleware Integration
// Comprehensive security headers middleware for Express applications

const CSPMiddleware = require('../security/csp-middleware');

class SecurityHeadersMiddleware {
    constructor() {
        this.cspMiddleware = new CSPMiddleware();
        this.auditLogger = require('../security/audit-logger');
        
        // Security configuration
        this.config = {
            enableCSP: process.env.ENABLE_CSP !== 'false',
            enableHSTS: process.env.ENABLE_HSTS !== 'false',
            enableNOSNIFF: process.env.ENABLE_NOSNIFF !== 'false',
            enableXSSProtection: process.env.ENABLE_XSS_PROTECTION !== 'false',
            enableFrameOptions: process.env.ENABLE_FRAME_OPTIONS !== 'false',
            enableReferrerPolicy: process.env.ENABLE_REFERRER_POLICY !== 'false',
            enablePermissionsPolicy: process.env.ENABLE_PERMISSIONS_POLICY !== 'false',
            enableCOOP: process.env.ENABLE_COOP !== 'false',
            enableCOEP: process.env.ENABLE_COEP !== 'false',
            enableCORP: process.env.ENABLE_CORP !== 'false'
        };
    }

    // ============================================================================
    // MAIN SECURITY HEADERS MIDDLEWARE
    // ============================================================================

    // Apply all security headers
    applySecurityHeaders() {
        return (req, res, next) => {
            try {
                // Apply CSP headers
                if (this.config.enableCSP) {
                    this.applyCspHeaders(req, res);
                }
                
                // Apply HSTS
                if (this.config.enableHSTS) {
                    this.applyHstsHeaders(res);
                }
                
                // Apply content type protection
                if (this.config.enableNOSNIFF) {
                    this.applyContentTypeHeaders(res);
                }
                
                // Apply XSS protection
                if (this.config.enableXSSProtection) {
                    this.applyXssProtectionHeaders(res);
                }
                
                // Apply frame options
                if (this.config.enableFrameOptions) {
                    this.applyFrameHeaders(res);
                }
                
                // Apply referrer policy
                if (this.config.enableReferrerPolicy) {
                    this.applyReferrerPolicyHeaders(res);
                }
                
                // Apply permissions policy
                if (this.config.enablePermissionsPolicy) {
                    this.applyPermissionsPolicyHeaders(res);
                }
                
                // Apply cross-origin policies
                this.applyCrossOriginHeaders(res);
                
                // Apply additional security headers
                this.applyAdditionalHeaders(res);
                
                // Log security headers application
                this.logSecurityHeaders(req, res);
                
                next();
                
            } catch (error) {
                console.error('Security headers middleware error:', error);
                this.auditLogger.log('security_headers_error', {
                    error: error.message,
                    path: req.path,
                    timestamp: new Date().toISOString()
                });
                next(); // Continue without headers rather than blocking
            }
        };
    }

    // ============================================================================
    // INDIVIDUAL HEADER APPLICATIONS
    // ============================================================================

    // Apply Content Security Policy headers
    applyCspHeaders(req, res) {
        const cspMiddleware = this.cspMiddleware.getCSPMiddleware();
        cspMiddleware(req, res, () => {}); // Execute CSP middleware
    }

    // Apply HTTP Strict Transport Security headers
    applyHstsHeaders(res) {
        const environment = process.env.NODE_ENV;
        
        if (environment === 'production') {
            // Production HSTS - strict settings
            res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        } else if (environment === 'staging') {
            // Staging HSTS - moderate settings
            res.setHeader('Strict-Transport-Security', 'max-age=86400; includeSubDomains');
        }
        // No HSTS in development
    }

    // Apply content type protection headers
    applyContentTypeHeaders(res) {
        // Prevent MIME type sniffing
        res.setHeader('X-Content-Type-Options', 'nosniff');
    }

    // Apply XSS protection headers
    applyXssProtectionHeaders(res) {
        // Enable XSS filtering (legacy browsers)
        res.setHeader('X-XSS-Protection', '1; mode=block');
    }

    // Apply frame protection headers
    applyFrameHeaders(res) {
        const environment = process.env.NODE_ENV;
        
        if (environment === 'production') {
            // Production - deny all framing
            res.setHeader('X-Frame-Options', 'DENY');
        } else {
            // Development/staging - allow same origin
            res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        }
    }

    // Apply referrer policy headers
    applyReferrerPolicyHeaders(res) {
        // Strict referrer policy for privacy
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    }

    // Apply permissions policy headers
    applyPermissionsPolicyHeaders(res) {
        const policies = [
            'geolocation=(self "https://nexvestxr.com")',
            'microphone=()',
            'camera=()',
            'payment=(self)',
            'usb=()',
            'magnetometer=()',
            'gyroscope=()',
            'accelerometer=()',
            'ambient-light-sensor=()',
            'autoplay=(self)',
            'encrypted-media=(self)',
            'fullscreen=(self)',
            'picture-in-picture=(self)',
            'sync-xhr=()',
            'clipboard-read=(self)',
            'clipboard-write=(self)',
            'web-share=(self)'
        ];
        
        res.setHeader('Permissions-Policy', policies.join(', '));
    }

    // Apply cross-origin headers
    applyCrossOriginHeaders(res) {
        if (this.config.enableCOOP) {
            // Cross-Origin-Opener-Policy
            res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        }
        
        if (this.config.enableCOEP) {
            // Cross-Origin-Embedder-Policy
            res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
        }
        
        if (this.config.enableCORP) {
            // Cross-Origin-Resource-Policy
            res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
        }
    }

    // Apply additional security headers
    applyAdditionalHeaders(res) {
        const environment = process.env.NODE_ENV;
        
        // Server header hiding
        res.removeHeader('X-Powered-By');
        res.setHeader('Server', 'NexVestXR');
        
        // Cache control for sensitive pages
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
        
        // Certificate transparency
        if (environment === 'production') {
            res.setHeader('Expect-CT', 'max-age=86400, enforce');
        }
        
        // Clear site data on logout (will be set conditionally)
        // res.setHeader('Clear-Site-Data', '"cache", "cookies", "storage", "executionContexts"');
        
        // Feature policy for older browsers
        res.setHeader('Feature-Policy', 
            'geolocation \'self\'; microphone \'none\'; camera \'none\'; payment \'self\''
        );
    }

    // ============================================================================
    // SPECIALIZED MIDDLEWARE
    // ============================================================================

    // Apply headers for API endpoints
    apiSecurityHeaders() {
        return (req, res, next) => {
            // API-specific headers
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('Cache-Control', 'no-store');
            res.setHeader('Referrer-Policy', 'no-referrer');
            
            // CORS headers for API
            const allowedOrigins = this.getAllowedOrigins();
            const origin = req.headers.origin;
            
            if (allowedOrigins.includes(origin)) {
                res.setHeader('Access-Control-Allow-Origin', origin);
            }
            
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 
                'Content-Type, Authorization, X-Requested-With, X-API-Key, X-Client-Version'
            );
            res.setHeader('Access-Control-Allow-Credentials', 'true');
            res.setHeader('Access-Control-Max-Age', '86400');
            
            next();
        };
    }

    // Apply headers for static assets
    staticAssetHeaders() {
        return (req, res, next) => {
            // Cache static assets aggressively
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            
            // CORS for assets
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
            
            next();
        };
    }

    // Apply headers for authentication pages
    authPageHeaders() {
        return (req, res, next) => {
            // Strict security for auth pages
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('Referrer-Policy', 'no-referrer');
            
            // Additional CSP for auth pages
            const authCSP = [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline'",
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' data:",
                "connect-src 'self'",
                "form-action 'self'",
                "frame-ancestors 'none'",
                "base-uri 'self'"
            ].join('; ');
            
            res.setHeader('Content-Security-Policy', authCSP);
            
            next();
        };
    }

    // Apply headers for logout
    logoutHeaders() {
        return (req, res, next) => {
            // Clear site data on logout
            res.setHeader('Clear-Site-Data', '"cache", "cookies", "storage", "executionContexts"');
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            
            next();
        };
    }

    // Apply headers for payment pages
    paymentPageHeaders() {
        return (req, res, next) => {
            // Extra strict security for payment pages
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('Referrer-Policy', 'no-referrer');
            res.setHeader('Permissions-Policy', 'payment=(self)');
            
            next();
        };
    }

    // ============================================================================
    // CSP VIOLATION HANDLING
    // ============================================================================

    // CSP violation report endpoint
    cspViolationHandler() {
        return this.cspMiddleware.getCSPReportHandler();
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    // Get allowed origins for CORS
    getAllowedOrigins() {
        const environment = process.env.NODE_ENV;
        const origins = ['https://nexvestxr.com', 'https://www.nexvestxr.com'];
        
        if (environment === 'development') {
            origins.push(
                'http://localhost:3000',
                'http://localhost:3001',
                'http://127.0.0.1:3000',
                'http://127.0.0.1:3001'
            );
        } else if (environment === 'staging') {
            origins.push('https://staging.nexvestxr.com');
        }
        
        return origins;
    }

    // Log security headers application
    logSecurityHeaders(req, res) {
        const headers = Object.keys(res.getHeaders())
            .filter(header => header.toLowerCase().includes('security') || 
                            header.toLowerCase().includes('x-') ||
                            header.toLowerCase().includes('content-security-policy') ||
                            header.toLowerCase().includes('strict-transport-security'))
            .reduce((obj, key) => {
                obj[key] = res.getHeader(key);
                return obj;
            }, {});
        
        this.auditLogger.log('security_headers_applied', {
            path: req.path,
            method: req.method,
            headers: headers,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            timestamp: new Date().toISOString()
        });
    }

    // Check if request is from mobile app
    isMobileApp(req) {
        const userAgent = req.get('User-Agent') || '';
        return userAgent.includes('NexVestXR-Mobile') || 
               userAgent.includes('ReactNative') ||
               req.headers['x-client-type'] === 'mobile';
    }

    // Check if request is from trusted client
    isTrustedClient(req) {
        const clientId = req.headers['x-client-id'];
        const trustedClients = process.env.TRUSTED_CLIENT_IDS?.split(',') || [];
        return trustedClients.includes(clientId);
    }

    // Dynamic security headers based on threat level
    dynamicSecurityHeaders(threatLevel = 'normal') {
        return (req, res, next) => {
            switch (threatLevel) {
                case 'high':
                    // High threat - maximum security
                    res.setHeader('X-Frame-Options', 'DENY');
                    res.setHeader('X-Content-Type-Options', 'nosniff');
                    res.setHeader('Referrer-Policy', 'no-referrer');
                    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
                    break;
                    
                case 'medium':
                    // Medium threat - balanced security
                    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
                    res.setHeader('X-Content-Type-Options', 'nosniff');
                    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
                    break;
                    
                default:
                    // Normal threat - standard security
                    this.applySecurityHeaders()(req, res, () => {});
            }
            
            next();
        };
    }

    // Get current security configuration
    getSecurityConfiguration() {
        return {
            config: this.config,
            cspConfig: this.cspMiddleware.getCSPConfiguration(),
            allowedOrigins: this.getAllowedOrigins()
        };
    }

    // Update security configuration
    updateSecurityConfiguration(newConfig) {
        Object.assign(this.config, newConfig);
        
        this.auditLogger.log('security_config_updated', {
            newConfig: newConfig,
            timestamp: new Date().toISOString()
        });
    }
}

module.exports = SecurityHeadersMiddleware;