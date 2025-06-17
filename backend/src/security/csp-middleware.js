// NexVestXR Content Security Policy (CSP) Middleware
// Advanced CSP implementation for XSS protection and secure content loading

class CSPMiddleware {
    constructor() {
        this.auditLogger = require('./audit-logger');
        
        // Environment-specific configuration
        this.environment = process.env.NODE_ENV || 'development';
        this.isDevelopment = this.environment === 'development';
        this.isProduction = this.environment === 'production';
        
        // Domain configuration
        this.domains = {
            primary: process.env.PRIMARY_DOMAIN || 'nexvestxr.com',
            api: process.env.API_DOMAIN || 'api.nexvestxr.com',
            cdn: process.env.CDN_DOMAIN || 'cdn.nexvestxr.com',
            images: process.env.IMAGES_DOMAIN || 'images.nexvestxr.com',
            websocket: process.env.WEBSOCKET_DOMAIN || 'ws.nexvestxr.com'
        };
        
        // Trusted third-party domains
        this.trustedDomains = {
            analytics: [
                'www.google-analytics.com',
                'www.googletagmanager.com',
                'analytics.google.com'
            ],
            maps: [
                'maps.googleapis.com',
                'maps.gstatic.com'
            ],
            payment: [
                'js.stripe.com',
                'checkout.stripe.com',
                'api.razorpay.com',
                'checkout.razorpay.com'
            ],
            social: [
                'connect.facebook.net',
                'www.facebook.com',
                'twitter.com',
                'www.twitter.com',
                'linkedin.com',
                'www.linkedin.com'
            ],
            fonts: [
                'fonts.googleapis.com',
                'fonts.gstatic.com'
            ],
            blockchain: [
                'mainnet.infura.io',
                'polygon-rpc.com',
                'rpc-mainnet.matic.network'
            ]
        };
        
        // CSP violation reporting
        this.reportingEndpoint = '/api/security/csp-report';
        this.enableReporting = process.env.CSP_REPORTING_ENABLED === 'true';
    }

    // ============================================================================
    // MAIN CSP MIDDLEWARE
    // ============================================================================

    // Generate CSP middleware with environment-specific policies
    getCSPMiddleware() {
        return (req, res, next) => {
            try {
                const cspPolicy = this.generateCSPPolicy(req);
                
                // Set CSP header
                res.setHeader('Content-Security-Policy', cspPolicy);
                
                // Set additional security headers
                this.setAdditionalSecurityHeaders(res);
                
                // Log CSP policy application
                this.auditLogger.log('csp_policy_applied', {
                    path: req.path,
                    userAgent: req.get('User-Agent'),
                    ip: req.ip,
                    environment: this.environment,
                    timestamp: new Date().toISOString()
                });
                
                next();
                
            } catch (error) {
                console.error('CSP middleware error:', error);
                this.auditLogger.log('csp_middleware_error', {
                    error: error.message,
                    path: req.path,
                    timestamp: new Date().toISOString()
                });
                next(); // Continue without CSP rather than blocking
            }
        };
    }

    // ============================================================================
    // CSP POLICY GENERATION
    // ============================================================================

    generateCSPPolicy(req) {
        const nonce = this.generateNonce();
        req.cspNonce = nonce; // Make nonce available to templates
        
        const policy = {
            'default-src': this.getDefaultSrc(),
            'script-src': this.getScriptSrc(nonce),
            'style-src': this.getStyleSrc(nonce),
            'img-src': this.getImgSrc(),
            'font-src': this.getFontSrc(),
            'connect-src': this.getConnectSrc(),
            'media-src': this.getMediaSrc(),
            'object-src': this.getObjectSrc(),
            'child-src': this.getChildSrc(),
            'frame-src': this.getFrameSrc(),
            'worker-src': this.getWorkerSrc(),
            'manifest-src': this.getManifestSrc(),
            'form-action': this.getFormAction(),
            'frame-ancestors': this.getFrameAncestors(),
            'base-uri': this.getBaseUri(),
            'upgrade-insecure-requests': this.getUpgradeInsecureRequests()
        };
        
        // Add reporting if enabled
        if (this.enableReporting) {
            policy['report-uri'] = this.reportingEndpoint;
            policy['report-to'] = 'csp-endpoint';
        }
        
        // Convert policy object to CSP string
        return this.policyObjectToString(policy);
    }

    // Default source policy
    getDefaultSrc() {
        const sources = ["'self'"];
        
        if (this.isDevelopment) {
            sources.push('localhost:*', '127.0.0.1:*', '*.local:*');
        }
        
        return sources;
    }

    // Script source policy
    getScriptSrc(nonce) {
        const sources = [
            "'self'",
            `'nonce-${nonce}'`,
            `https://${this.domains.cdn}`,
            `https://${this.domains.api}`
        ];
        
        // Add trusted third-party script sources
        sources.push(...this.trustedDomains.analytics);
        sources.push(...this.trustedDomains.payment);
        sources.push(...this.trustedDomains.social);
        sources.push(...this.trustedDomains.blockchain);
        
        if (this.isDevelopment) {
            sources.push(
                "'unsafe-eval'", // Allow eval() in development
                "'unsafe-inline'", // Allow inline scripts in development
                'localhost:*',
                '127.0.0.1:*',
                'ws://localhost:*',
                'ws://127.0.0.1:*'
            );
        }
        
        return sources;
    }

    // Style source policy
    getStyleSrc(nonce) {
        const sources = [
            "'self'",
            `'nonce-${nonce}'`,
            "'unsafe-inline'", // Required for many CSS frameworks
            `https://${this.domains.cdn}`
        ];
        
        // Add trusted font and style sources
        sources.push(...this.trustedDomains.fonts);
        sources.push(...this.trustedDomains.social);
        
        if (this.isDevelopment) {
            sources.push('localhost:*', '127.0.0.1:*');
        }
        
        return sources;
    }

    // Image source policy
    getImgSrc() {
        const sources = [
            "'self'",
            'data:', // Allow data URIs for small images
            'blob:', // Allow blob URLs for generated images
            `https://${this.domains.images}`,
            `https://${this.domains.cdn}`
        ];
        
        // Add trusted image sources
        sources.push(...this.trustedDomains.analytics);
        sources.push(...this.trustedDomains.maps);
        sources.push(...this.trustedDomains.social);
        sources.push(...this.trustedDomains.payment);
        
        // Allow profile images from social platforms
        sources.push(
            'https://graph.facebook.com',
            'https://pbs.twimg.com',
            'https://abs.twimg.com',
            'https://media.licdn.com'
        );
        
        if (this.isDevelopment) {
            sources.push('localhost:*', '127.0.0.1:*');
        }
        
        return sources;
    }

    // Font source policy
    getFontSrc() {
        const sources = [
            "'self'",
            `https://${this.domains.cdn}`
        ];
        
        sources.push(...this.trustedDomains.fonts);
        
        if (this.isDevelopment) {
            sources.push('localhost:*', '127.0.0.1:*');
        }
        
        return sources;
    }

    // Connect source policy (AJAX, WebSocket, etc.)
    getConnectSrc() {
        const sources = [
            "'self'",
            `https://${this.domains.api}`,
            `wss://${this.domains.websocket}`,
            `https://${this.domains.primary}`
        ];
        
        // Add blockchain RPC endpoints
        sources.push(...this.trustedDomains.blockchain);
        
        // Add payment gateways
        sources.push(...this.trustedDomains.payment);
        
        // Add analytics
        sources.push(...this.trustedDomains.analytics);
        
        if (this.isDevelopment) {
            sources.push(
                'localhost:*',
                '127.0.0.1:*',
                'ws://localhost:*',
                'ws://127.0.0.1:*'
            );
        }
        
        return sources;
    }

    // Media source policy (audio/video)
    getMediaSrc() {
        const sources = [
            "'self'",
            `https://${this.domains.cdn}`,
            'blob:', // Allow blob URLs for media
            'data:' // Allow data URIs for small media files
        ];
        
        if (this.isDevelopment) {
            sources.push('localhost:*', '127.0.0.1:*');
        }
        
        return sources;
    }

    // Object source policy (plugins)
    getObjectSrc() {
        return ["'none'"]; // Disable object/embed/applet
    }

    // Child source policy (deprecated, but included for compatibility)
    getChildSrc() {
        return this.getFrameSrc();
    }

    // Frame source policy
    getFrameSrc() {
        const sources = [
            "'self'",
            `https://${this.domains.primary}`
        ];
        
        // Add payment frame sources
        sources.push(...this.trustedDomains.payment);
        
        // Add social media embeds
        sources.push(...this.trustedDomains.social);
        
        // Add maps
        sources.push(...this.trustedDomains.maps);
        
        return sources;
    }

    // Worker source policy
    getWorkerSrc() {
        const sources = [
            "'self'",
            'blob:' // Allow blob URLs for web workers
        ];
        
        if (this.isDevelopment) {
            sources.push('localhost:*', '127.0.0.1:*');
        }
        
        return sources;
    }

    // Manifest source policy
    getManifestSrc() {
        const sources = [
            "'self'",
            `https://${this.domains.cdn}`
        ];
        
        if (this.isDevelopment) {
            sources.push('localhost:*', '127.0.0.1:*');
        }
        
        return sources;
    }

    // Form action policy
    getFormAction() {
        const sources = [
            "'self'",
            `https://${this.domains.api}`,
            `https://${this.domains.primary}`
        ];
        
        // Add payment form actions
        sources.push(...this.trustedDomains.payment);
        
        if (this.isDevelopment) {
            sources.push('localhost:*', '127.0.0.1:*');
        }
        
        return sources;
    }

    // Frame ancestors policy (who can embed this page)
    getFrameAncestors() {
        if (this.isProduction) {
            return ["'none'"]; // Don't allow framing in production
        } else {
            return ["'self'"]; // Allow self-framing in development
        }
    }

    // Base URI policy
    getBaseUri() {
        return ["'self'"];
    }

    // Upgrade insecure requests
    getUpgradeInsecureRequests() {
        return this.isProduction ? [] : null; // Only in production
    }

    // ============================================================================
    // ADDITIONAL SECURITY HEADERS
    // ============================================================================

    setAdditionalSecurityHeaders(res) {
        // Prevent MIME type sniffing
        res.setHeader('X-Content-Type-Options', 'nosniff');
        
        // Enable XSS protection
        res.setHeader('X-XSS-Protection', '1; mode=block');
        
        // Control framing
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        
        // Referrer policy
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        
        // Feature policy / Permissions policy
        res.setHeader('Permissions-Policy', this.getPermissionsPolicy());
        
        // HSTS (HTTP Strict Transport Security)
        if (this.isProduction) {
            res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        }
        
        // Expect-CT
        if (this.isProduction) {
            res.setHeader('Expect-CT', 'max-age=86400, enforce');
        }
        
        // Cross-Origin policies
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
        
        // Set reporting endpoints
        if (this.enableReporting) {
            res.setHeader('Report-To', JSON.stringify({
                group: 'csp-endpoint',
                max_age: 31536000,
                endpoints: [{ url: this.reportingEndpoint }]
            }));
        }
    }

    // Generate Permissions Policy header
    getPermissionsPolicy() {
        const policies = [
            'geolocation=(self)',
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
            'picture-in-picture=()'
        ];
        
        return policies.join(', ');
    }

    // ============================================================================
    // CSP VIOLATION REPORTING
    // ============================================================================

    // CSP violation report handler
    getCSPReportHandler() {
        return (req, res) => {
            try {
                const report = req.body;
                
                // Log CSP violation
                this.auditLogger.log('csp_violation', {
                    documentUri: report.documentUri,
                    referrer: report.referrer,
                    violatedDirective: report.violatedDirective,
                    effectiveDirective: report.effectiveDirective,
                    originalPolicy: report.originalPolicy,
                    disposition: report.disposition,
                    blockedUri: report.blockedUri,
                    statusCode: report.statusCode,
                    lineNumber: report.lineNumber,
                    columnNumber: report.columnNumber,
                    sourceFile: report.sourceFile,
                    userAgent: req.get('User-Agent'),
                    ip: req.ip,
                    timestamp: new Date().toISOString()
                });
                
                // Analyze violation patterns
                this.analyzeViolationPattern(report);
                
                res.status(204).send(); // No content response
                
            } catch (error) {
                console.error('CSP report handler error:', error);
                res.status(400).json({ error: 'Invalid report format' });
            }
        };
    }

    // Analyze CSP violation patterns for security threats
    analyzeViolationPattern(report) {
        try {
            const blockedUri = report.blockedUri;
            const directive = report.violatedDirective;
            
            // Check for common attack patterns
            if (this.isXSSAttempt(blockedUri, directive)) {
                this.auditLogger.log('potential_xss_attack', {
                    blockedUri: blockedUri,
                    directive: directive,
                    documentUri: report.documentUri,
                    severity: 'high',
                    timestamp: new Date().toISOString()
                });
            }
            
            if (this.isDataExfiltrationAttempt(blockedUri)) {
                this.auditLogger.log('potential_data_exfiltration', {
                    blockedUri: blockedUri,
                    directive: directive,
                    documentUri: report.documentUri,
                    severity: 'critical',
                    timestamp: new Date().toISOString()
                });
            }
            
        } catch (error) {
            console.error('Violation pattern analysis error:', error);
        }
    }

    // Check if violation indicates XSS attempt
    isXSSAttempt(blockedUri, directive) {
        if (!blockedUri) return false;
        
        const xssPatterns = [
            /javascript:/i,
            /data:text\/html/i,
            /eval\(/i,
            /document\.write/i,
            /innerHTML/i,
            /onclick/i,
            /onerror/i,
            /onload/i
        ];
        
        return xssPatterns.some(pattern => pattern.test(blockedUri)) &&
               directive.includes('script-src');
    }

    // Check if violation indicates data exfiltration attempt
    isDataExfiltrationAttempt(blockedUri) {
        if (!blockedUri) return false;
        
        const exfiltrationPatterns = [
            /\b(?:\d{1,3}\.){3}\d{1,3}\b/, // IP addresses
            /[a-z0-9-]+\.(?:tk|ml|ga|cf|gq)/, // Suspicious TLDs
            /webhook/i,
            /collect/i,
            /track/i
        ];
        
        return exfiltrationPatterns.some(pattern => pattern.test(blockedUri));
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    // Generate cryptographically secure nonce
    generateNonce() {
        const crypto = require('crypto');
        return crypto.randomBytes(16).toString('base64');
    }

    // Convert policy object to CSP header string
    policyObjectToString(policy) {
        return Object.entries(policy)
            .filter(([key, value]) => value !== null && value !== undefined)
            .map(([directive, sources]) => {
                if (Array.isArray(sources)) {
                    return sources.length > 0 ? `${directive} ${sources.join(' ')}` : null;
                } else {
                    return directive; // For directives without values like upgrade-insecure-requests
                }
            })
            .filter(directive => directive !== null)
            .join('; ');
    }

    // Update trusted domains dynamically
    addTrustedDomain(category, domain) {
        if (this.trustedDomains[category]) {
            this.trustedDomains[category].push(domain);
            
            this.auditLogger.log('trusted_domain_added', {
                category: category,
                domain: domain,
                timestamp: new Date().toISOString()
            });
        }
    }

    // Remove trusted domain
    removeTrustedDomain(category, domain) {
        if (this.trustedDomains[category]) {
            const index = this.trustedDomains[category].indexOf(domain);
            if (index > -1) {
                this.trustedDomains[category].splice(index, 1);
                
                this.auditLogger.log('trusted_domain_removed', {
                    category: category,
                    domain: domain,
                    timestamp: new Date().toISOString()
                });
            }
        }
    }

    // Get current CSP configuration
    getCSPConfiguration() {
        return {
            environment: this.environment,
            domains: this.domains,
            trustedDomains: this.trustedDomains,
            reportingEnabled: this.enableReporting,
            reportingEndpoint: this.reportingEndpoint
        };
    }
}

module.exports = CSPMiddleware;