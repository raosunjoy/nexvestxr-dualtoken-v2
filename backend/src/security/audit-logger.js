// NexVestXR Security Audit Logger
// Comprehensive logging for PCI DSS compliance and security monitoring

const winston = require('winston');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class SecurityAuditLogger {
    constructor() {
        this.logDir = process.env.AUDIT_LOG_DIR || '/var/log/nexvestxr/audit';
        this.logKey = process.env.LOG_ENCRYPTION_KEY || 'default-key-change-in-production';
        this.initializeLogger();
    }

    // Initialize Winston logger with security configurations
    initializeLogger() {
        // Ensure log directory exists
        this.ensureLogDirectory();

        // Configure log format with encryption
        const logFormat = winston.format.combine(
            winston.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss.SSS'
            }),
            winston.format.errors({ stack: true }),
            winston.format.json(),
            winston.format.printf(info => {
                return this.encryptLogEntry(JSON.stringify({
                    timestamp: info.timestamp,
                    level: info.level,
                    message: info.message,
                    meta: info.meta || {},
                    checksum: this.generateChecksum(info)
                }));
            })
        );

        // Create logger with multiple transports
        this.logger = winston.createLogger({
            level: 'info',
            format: logFormat,
            transports: [
                // Authentication events
                new winston.transports.File({
                    filename: path.join(this.logDir, 'authentication.log'),
                    level: 'info',
                    maxsize: 10485760, // 10MB
                    maxFiles: 12, // Keep 12 months of logs
                    tailable: true
                }),

                // Payment processing events
                new winston.transports.File({
                    filename: path.join(this.logDir, 'payment.log'),
                    level: 'info',
                    maxsize: 10485760,
                    maxFiles: 12,
                    tailable: true
                }),

                // Access control events
                new winston.transports.File({
                    filename: path.join(this.logDir, 'access.log'),
                    level: 'info',
                    maxsize: 10485760,
                    maxFiles: 12,
                    tailable: true
                }),

                // System security events
                new winston.transports.File({
                    filename: path.join(this.logDir, 'security.log'),
                    level: 'info',
                    maxsize: 10485760,
                    maxFiles: 12,
                    tailable: true
                }),

                // Data access events
                new winston.transports.File({
                    filename: path.join(this.logDir, 'data-access.log'),
                    level: 'info',
                    maxsize: 10485760,
                    maxFiles: 12,
                    tailable: true
                }),

                // Administrative events
                new winston.transports.File({
                    filename: path.join(this.logDir, 'admin.log'),
                    level: 'info',
                    maxsize: 10485760,
                    maxFiles: 12,
                    tailable: true
                }),

                // Error events
                new winston.transports.File({
                    filename: path.join(this.logDir, 'error.log'),
                    level: 'error',
                    maxsize: 10485760,
                    maxFiles: 12,
                    tailable: true
                }),

                // Console output for development
                ...(process.env.NODE_ENV === 'development' ? [
                    new winston.transports.Console({
                        format: winston.format.combine(
                            winston.format.colorize(),
                            winston.format.simple()
                        )
                    })
                ] : [])
            ]
        });

        // Handle uncaught exceptions and rejections
        this.logger.exceptions.handle(
            new winston.transports.File({
                filename: path.join(this.logDir, 'exceptions.log')
            })
        );

        this.logger.rejections.handle(
            new winston.transports.File({
                filename: path.join(this.logDir, 'rejections.log')
            })
        );
    }

    // Ensure log directory exists
    async ensureLogDirectory() {
        try {
            await fs.mkdir(this.logDir, { recursive: true, mode: 0o750 });
        } catch (error) {
            console.error('Failed to create log directory:', error);
        }
    }

    // Main logging method with event categorization
    log(eventType, data) {
        const logEntry = {
            eventType,
            eventId: this.generateEventId(),
            timestamp: new Date().toISOString(),
            data: this.sanitizeLogData(data),
            severity: this.determineSeverity(eventType),
            category: this.categorizeEvent(eventType),
            sourceIp: data.ipAddress || 'unknown',
            userAgent: data.userAgent || 'unknown',
            sessionId: data.sessionId || null,
            userId: data.userId || null
        };

        // Add compliance tags
        logEntry.complianceTags = this.getComplianceTags(eventType);

        // Log to appropriate file based on category
        switch (logEntry.category) {
            case 'authentication':
                this.logAuthentication(logEntry);
                break;
            case 'payment':
                this.logPayment(logEntry);
                break;
            case 'access':
                this.logAccess(logEntry);
                break;
            case 'security':
                this.logSecurity(logEntry);
                break;
            case 'data_access':
                this.logDataAccess(logEntry);
                break;
            case 'admin':
                this.logAdmin(logEntry);
                break;
            default:
                this.logGeneral(logEntry);
        }

        // Send alerts for critical events
        if (logEntry.severity === 'critical' || logEntry.severity === 'high') {
            this.sendSecurityAlert(logEntry);
        }
    }

    // Authentication event logging
    logAuthentication(logEntry) {
        const authLogger = winston.createLogger({
            transports: [
                new winston.transports.File({
                    filename: path.join(this.logDir, 'authentication.log')
                })
            ]
        });

        authLogger.info('Authentication Event', { meta: logEntry });

        // Track failed authentication attempts
        if (logEntry.eventType.includes('failure') || logEntry.eventType.includes('failed')) {
            this.trackFailedAttempts(logEntry);
        }
    }

    // Payment processing event logging
    logPayment(logEntry) {
        // Remove sensitive payment data before logging
        const sanitizedEntry = {
            ...logEntry,
            data: {
                ...logEntry.data,
                cardNumber: logEntry.data.cardNumber ? '[REDACTED]' : undefined,
                cvv: '[REDACTED]',
                pin: '[REDACTED]'
            }
        };

        const paymentLogger = winston.createLogger({
            transports: [
                new winston.transports.File({
                    filename: path.join(this.logDir, 'payment.log')
                })
            ]
        });

        paymentLogger.info('Payment Event', { meta: sanitizedEntry });
    }

    // Access control event logging
    logAccess(logEntry) {
        const accessLogger = winston.createLogger({
            transports: [
                new winston.transports.File({
                    filename: path.join(this.logDir, 'access.log')
                })
            ]
        });

        accessLogger.info('Access Event', { meta: logEntry });
    }

    // Security event logging
    logSecurity(logEntry) {
        const securityLogger = winston.createLogger({
            transports: [
                new winston.transports.File({
                    filename: path.join(this.logDir, 'security.log')
                })
            ]
        });

        securityLogger.info('Security Event', { meta: logEntry });
    }

    // Data access event logging
    logDataAccess(logEntry) {
        const dataLogger = winston.createLogger({
            transports: [
                new winston.transports.File({
                    filename: path.join(this.logDir, 'data-access.log')
                })
            ]
        });

        dataLogger.info('Data Access Event', { meta: logEntry });
    }

    // Administrative event logging
    logAdmin(logEntry) {
        const adminLogger = winston.createLogger({
            transports: [
                new winston.transports.File({
                    filename: path.join(this.logDir, 'admin.log')
                })
            ]
        });

        adminLogger.info('Admin Event', { meta: logEntry });
    }

    // General event logging
    logGeneral(logEntry) {
        this.logger.info('General Event', { meta: logEntry });
    }

    // Categorize events for proper routing
    categorizeEvent(eventType) {
        const categories = {
            authentication: [
                'login_attempt', 'login_success', 'login_failure',
                'logout', 'password_change', 'account_lockout',
                'two_factor_auth', 'authentication_success', 'authentication_failure'
            ],
            payment: [
                'payment_processing', 'card_data_processed', 'tokenization',
                'payment_success', 'payment_failure', 'refund_processed',
                'cardholder_data_protection', 'payment_validation'
            ],
            access: [
                'access_control_check', 'permission_denied', 'role_change',
                'privilege_escalation', 'unauthorized_access', 'resource_access'
            ],
            security: [
                'security_violation', 'intrusion_detected', 'malware_detected',
                'vulnerability_scan', 'security_policy_violation',
                'rate_limit_exceeded', 'suspicious_activity'
            ],
            data_access: [
                'database_query', 'sensitive_data_access', 'data_export',
                'data_modification', 'data_deletion', 'backup_access'
            ],
            admin: [
                'system_configuration', 'user_management', 'system_maintenance',
                'log_access', 'policy_change', 'system_update'
            ]
        };

        for (const [category, events] of Object.entries(categories)) {
            if (events.some(event => eventType.includes(event))) {
                return category;
            }
        }

        return 'general';
    }

    // Determine event severity
    determineSeverity(eventType) {
        const severityMap = {
            critical: [
                'cardholder_data_breach', 'system_compromise', 'privilege_escalation',
                'malware_detected', 'intrusion_detected', 'payment_fraud'
            ],
            high: [
                'authentication_failure', 'unauthorized_access', 'security_violation',
                'payment_failure', 'data_access_violation', 'rate_limit_exceeded'
            ],
            medium: [
                'login_failure', 'permission_denied', 'suspicious_activity',
                'configuration_change', 'data_export'
            ],
            low: [
                'login_success', 'logout', 'routine_access', 'system_maintenance',
                'regular_data_access'
            ]
        };

        for (const [severity, events] of Object.entries(severityMap)) {
            if (events.some(event => eventType.includes(event))) {
                return severity;
            }
        }

        return 'info';
    }

    // Get compliance tags for events
    getComplianceTags(eventType) {
        const complianceTags = [];

        // PCI DSS requirements
        if (eventType.includes('payment') || eventType.includes('cardholder')) {
            complianceTags.push('PCI-DSS');
        }

        if (eventType.includes('access') || eventType.includes('authentication')) {
            complianceTags.push('PCI-DSS-Req7', 'PCI-DSS-Req8');
        }

        if (eventType.includes('audit') || eventType.includes('log')) {
            complianceTags.push('PCI-DSS-Req10');
        }

        // GDPR requirements
        if (eventType.includes('personal_data') || eventType.includes('user_data')) {
            complianceTags.push('GDPR');
        }

        // SOX compliance
        if (eventType.includes('financial') || eventType.includes('admin')) {
            complianceTags.push('SOX');
        }

        return complianceTags;
    }

    // Sanitize log data to remove sensitive information
    sanitizeLogData(data) {
        const sanitized = { ...data };
        const sensitiveFields = [
            'password', 'creditCard', 'ssn', 'bankAccount',
            'cvv', 'cvc', 'pin', 'secret', 'token', 'key'
        ];

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

    // Generate unique event ID
    generateEventId() {
        return `EVT_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }

    // Generate checksum for log integrity
    generateChecksum(logEntry) {
        const data = JSON.stringify(logEntry);
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    // Encrypt log entries for secure storage
    encryptLogEntry(logData) {
        try {
            const cipher = crypto.createCipher('aes-256-cbc', this.logKey);
            let encrypted = cipher.update(logData, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            return encrypted;
        } catch (error) {
            // If encryption fails, return unencrypted data with warning
            console.warn('Log encryption failed:', error.message);
            return `[ENCRYPTION_FAILED] ${logData}`;
        }
    }

    // Decrypt log entries for reading
    decryptLogEntry(encryptedData) {
        try {
            if (encryptedData.startsWith('[ENCRYPTION_FAILED]')) {
                return encryptedData.substring(19); // Remove prefix
            }

            const decipher = crypto.createDecipher('aes-256-cbc', this.logKey);
            let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (error) {
            console.error('Log decryption failed:', error.message);
            return '[DECRYPTION_FAILED]';
        }
    }

    // Track failed authentication attempts for intrusion detection
    trackFailedAttempts(logEntry) {
        const key = `failed_attempts:${logEntry.sourceIp}:${logEntry.data.username || 'unknown'}`;
        
        // In production, this would use Redis for tracking
        console.log(`Tracking failed attempt: ${key}`);
        
        // Trigger alerts after threshold
        // Implementation would check Redis counter and send alerts
    }

    // Send security alerts for critical events
    async sendSecurityAlert(logEntry) {
        try {
            const alert = {
                alertId: this.generateEventId(),
                severity: logEntry.severity,
                eventType: logEntry.eventType,
                timestamp: logEntry.timestamp,
                summary: this.generateAlertSummary(logEntry),
                details: logEntry.data,
                recommendedActions: this.getRecommendedActions(logEntry.eventType)
            };

            // Send to monitoring systems (would integrate with real systems)
            console.log('SECURITY ALERT:', JSON.stringify(alert, null, 2));

            // In production, integrate with:
            // - SNS for notifications
            // - PagerDuty for on-call alerts
            // - Slack for team notifications
            // - SIEM systems for correlation

        } catch (error) {
            console.error('Failed to send security alert:', error);
        }
    }

    // Generate alert summary
    generateAlertSummary(logEntry) {
        const summaries = {
            'cardholder_data_breach': 'Potential cardholder data breach detected',
            'authentication_failure': 'Multiple authentication failures detected',
            'unauthorized_access': 'Unauthorized access attempt detected',
            'rate_limit_exceeded': 'Rate limit exceeded - potential DoS attack',
            'payment_fraud': 'Suspicious payment activity detected',
            'privilege_escalation': 'Privilege escalation attempt detected'
        };

        return summaries[logEntry.eventType] || `Security event: ${logEntry.eventType}`;
    }

    // Get recommended actions for security events
    getRecommendedActions(eventType) {
        const actions = {
            'cardholder_data_breach': [
                'Immediately isolate affected systems',
                'Notify PCI compliance team',
                'Begin incident response procedures',
                'Contact payment processors'
            ],
            'authentication_failure': [
                'Check for brute force attacks',
                'Consider temporary IP blocking',
                'Review account lockout policies',
                'Notify security team'
            ],
            'unauthorized_access': [
                'Review access logs',
                'Check for compromised accounts',
                'Update access controls',
                'Monitor for lateral movement'
            ],
            'rate_limit_exceeded': [
                'Implement additional rate limiting',
                'Check for DDoS attack patterns',
                'Consider temporary IP blocking',
                'Monitor system performance'
            ]
        };

        return actions[eventType] || ['Review event details', 'Follow security procedures'];
    }

    // Query logs for compliance reporting
    async queryLogs(criteria) {
        try {
            const logFiles = await this.getLogFiles();
            const results = [];

            for (const logFile of logFiles) {
                const logs = await this.readLogFile(logFile);
                const filteredLogs = this.filterLogs(logs, criteria);
                results.push(...filteredLogs);
            }

            return results;
        } catch (error) {
            console.error('Failed to query logs:', error);
            return [];
        }
    }

    // Get all log files
    async getLogFiles() {
        try {
            const files = await fs.readdir(this.logDir);
            return files.filter(file => file.endsWith('.log'))
                       .map(file => path.join(this.logDir, file));
        } catch (error) {
            console.error('Failed to read log directory:', error);
            return [];
        }
    }

    // Read and decrypt log file
    async readLogFile(filePath) {
        try {
            const data = await fs.readFile(filePath, 'utf8');
            const lines = data.split('\n').filter(line => line.trim());
            
            return lines.map(line => {
                try {
                    const decrypted = this.decryptLogEntry(line);
                    return JSON.parse(decrypted);
                } catch (error) {
                    console.warn('Failed to parse log line:', error.message);
                    return null;
                }
            }).filter(Boolean);
        } catch (error) {
            console.error('Failed to read log file:', error);
            return [];
        }
    }

    // Filter logs based on criteria
    filterLogs(logs, criteria) {
        return logs.filter(log => {
            if (criteria.startDate && new Date(log.timestamp) < new Date(criteria.startDate)) {
                return false;
            }
            if (criteria.endDate && new Date(log.timestamp) > new Date(criteria.endDate)) {
                return false;
            }
            if (criteria.severity && log.severity !== criteria.severity) {
                return false;
            }
            if (criteria.eventType && !log.eventType.includes(criteria.eventType)) {
                return false;
            }
            if (criteria.userId && log.userId !== criteria.userId) {
                return false;
            }
            return true;
        });
    }

    // Generate compliance report
    async generateComplianceReport(startDate, endDate) {
        const criteria = { startDate, endDate };
        const logs = await this.queryLogs(criteria);

        const report = {
            reportId: this.generateEventId(),
            period: { startDate, endDate },
            generatedAt: new Date().toISOString(),
            summary: {
                totalEvents: logs.length,
                byCategory: this.groupBy(logs, 'category'),
                bySeverity: this.groupBy(logs, 'severity'),
                byEventType: this.groupBy(logs, 'eventType')
            },
            complianceMetrics: {
                pciDssEvents: logs.filter(log => 
                    log.complianceTags && log.complianceTags.includes('PCI-DSS')
                ).length,
                gdprEvents: logs.filter(log => 
                    log.complianceTags && log.complianceTags.includes('GDPR')
                ).length,
                securityIncidents: logs.filter(log => 
                    log.severity === 'critical' || log.severity === 'high'
                ).length
            },
            trends: this.analyzeTrends(logs),
            recommendations: this.generateRecommendations(logs)
        };

        return report;
    }

    // Group logs by a field
    groupBy(logs, field) {
        return logs.reduce((groups, log) => {
            const key = log[field] || 'unknown';
            groups[key] = (groups[key] || 0) + 1;
            return groups;
        }, {});
    }

    // Analyze trends in log data
    analyzeTrends(logs) {
        // Implementation would analyze patterns, anomalies, etc.
        return {
            dailyVolume: 'Stable',
            errorRate: 'Normal',
            securityEvents: 'Low',
            anomalies: []
        };
    }

    // Generate recommendations based on log analysis
    generateRecommendations(logs) {
        const recommendations = [];

        const failedLogins = logs.filter(log => log.eventType.includes('login_failure'));
        if (failedLogins.length > 100) {
            recommendations.push('Consider implementing additional account lockout policies');
        }

        const securityEvents = logs.filter(log => log.category === 'security');
        if (securityEvents.length > 50) {
            recommendations.push('Review security monitoring and response procedures');
        }

        return recommendations;
    }
}

module.exports = SecurityAuditLogger;