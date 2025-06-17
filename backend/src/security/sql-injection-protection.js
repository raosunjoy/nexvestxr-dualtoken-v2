// NexVestXR SQL Injection Protection
// Comprehensive protection against SQL injection attacks

const { Pool } = require('pg');
const validator = require('validator');
const crypto = require('crypto');

class SQLInjectionProtection {
    constructor(databaseConfig) {
        this.pool = new Pool({
            ...databaseConfig,
            // Security configurations
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            connectionTimeoutMillis: 10000,
            idleTimeoutMillis: 30000,
            max: 20, // Maximum number of clients in the pool
            statement_timeout: 30000, // 30 seconds
            query_timeout: 30000,
            application_name: 'nexvestxr-secure-app'
        });

        this.auditLogger = require('./audit-logger');
        
        // SQL injection patterns for detection
        this.injectionPatterns = [
            // Union-based injection
            /(\bunion\b.*\bselect\b)/i,
            /(\bselect\b.*\bunion\b)/i,
            
            // Boolean-based injection
            /(\bor\b\s+\d+\s*=\s*\d+)/i,
            /(\band\b\s+\d+\s*=\s*\d+)/i,
            /(\bor\b\s+['"][^'"]*['"]?\s*=\s*['"][^'"]*['"]?)/i,
            
            // Time-based injection
            /(\bwaitfor\b|\bdelay\b|\bsleep\b|\bbenchmark\b)/i,
            
            // Error-based injection
            /(\bcast\b|\bconvert\b|\bextractvalue\b|\bupdatexml\b)/i,
            
            // Stacked queries
            /(;\s*(drop|delete|insert|update|create|alter)\b)/i,
            
            // Comment-based injection
            /(--|\/*|\*\/|#)/,
            
            // Information schema injection
            /(\binformation_schema\b|\btables\b|\bcolumns\b)/i,
            
            // Database-specific functions
            /(\bversion\b|\buser\b|\bdatabase\b|\bschema\b)/i,
            
            // Hex encoding attempts
            /(0x[0-9a-f]+)/i,
            
            // Concatenation attempts
            /(\|\||\bconcat\b)/i
        ];

        // Dangerous SQL keywords that should be parameterized
        this.dangerousKeywords = [
            'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER',
            'EXEC', 'EXECUTE', 'UNION', 'HAVING', 'GROUP', 'ORDER', 'WHERE',
            'FROM', 'INTO', 'VALUES', 'SET', 'JOIN', 'INNER', 'OUTER', 'LEFT',
            'RIGHT', 'FULL', 'CROSS', 'ON', 'AS', 'DISTINCT', 'ALL', 'EXISTS',
            'IN', 'BETWEEN', 'LIKE', 'IS', 'NULL', 'NOT', 'AND', 'OR'
        ];

        this.initializeSecurityFeatures();
    }

    // Initialize database security features
    async initializeSecurityFeatures() {
        try {
            // Set secure connection parameters
            await this.executeSecureQuery(`
                SET statement_timeout = '30s';
                SET lock_timeout = '10s';
                SET idle_in_transaction_session_timeout = '60s';
                SET log_statement = 'all';
                SET log_min_duration_statement = 1000;
            `);

            console.log('Database security features initialized');
        } catch (error) {
            console.error('Failed to initialize database security:', error);
        }
    }

    // Secure query execution with comprehensive protection
    async executeSecureQuery(query, params = [], options = {}) {
        const startTime = Date.now();
        const queryId = crypto.randomUUID();

        try {
            // Pre-execution security checks
            this.validateQuery(query, params);
            this.detectInjectionAttempts(query, params);

            // Log query attempt
            this.auditLogger.log('database_query_attempt', {
                queryId,
                query: this.sanitizeQueryForLogging(query),
                paramCount: params.length,
                timestamp: new Date().toISOString(),
                userId: options.userId,
                ipAddress: options.ipAddress
            });

            // Execute with prepared statement
            const client = await this.pool.connect();
            let result;

            try {
                // Use prepared statements to prevent SQL injection
                result = await client.query({
                    text: query,
                    values: params,
                    rowMode: options.rowMode || 'array'
                });

                const duration = Date.now() - startTime;

                // Log successful query
                this.auditLogger.log('database_query_success', {
                    queryId,
                    duration,
                    rowCount: result.rowCount,
                    timestamp: new Date().toISOString(),
                    userId: options.userId
                });

                return result;

            } finally {
                client.release();
            }

        } catch (error) {
            const duration = Date.now() - startTime;

            // Log query failure
            this.auditLogger.log('database_query_failure', {
                queryId,
                error: error.message,
                duration,
                timestamp: new Date().toISOString(),
                userId: options.userId,
                ipAddress: options.ipAddress
            });

            // Check if error indicates potential injection attempt
            if (this.isPotentialInjectionError(error)) {
                this.auditLogger.log('potential_sql_injection_detected', {
                    queryId,
                    error: error.message,
                    query: this.sanitizeQueryForLogging(query),
                    params: this.sanitizeParamsForLogging(params),
                    timestamp: new Date().toISOString(),
                    userId: options.userId,
                    ipAddress: options.ipAddress
                });
            }

            throw new Error('Database query failed');
        }
    }

    // Validate query structure and parameters
    validateQuery(query, params) {
        if (!query || typeof query !== 'string') {
            throw new Error('Invalid query: Query must be a non-empty string');
        }

        if (!Array.isArray(params)) {
            throw new Error('Invalid parameters: Parameters must be an array');
        }

        // Check for placeholder count mismatch
        const placeholderCount = (query.match(/\$\d+/g) || []).length;
        if (placeholderCount !== params.length) {
            throw new Error(`Parameter count mismatch: Expected ${placeholderCount}, got ${params.length}`);
        }

        // Validate parameter types
        params.forEach((param, index) => {
            if (!this.isValidParameterType(param)) {
                throw new Error(`Invalid parameter type at index ${index}: ${typeof param}`);
            }
        });
    }

    // Check if parameter type is valid
    isValidParameterType(param) {
        const validTypes = ['string', 'number', 'boolean', 'object'];
        const paramType = typeof param;
        
        if (!validTypes.includes(paramType)) {
            return false;
        }

        // Additional checks for objects (allow null, Date, arrays)
        if (paramType === 'object') {
            return param === null || 
                   param instanceof Date || 
                   Array.isArray(param) ||
                   Buffer.isBuffer(param);
        }

        return true;
    }

    // Detect potential SQL injection attempts
    detectInjectionAttempts(query, params) {
        const fullQuery = query + ' ' + params.join(' ');

        // Check against injection patterns
        for (const pattern of this.injectionPatterns) {
            if (pattern.test(fullQuery)) {
                throw new Error('Potential SQL injection detected');
            }
        }

        // Check for dangerous unparameterized content
        this.checkForUnparameterizedContent(query);

        // Validate that all user input is properly parameterized
        this.validateParameterization(query, params);
    }

    // Check for dangerous unparameterized content
    checkForUnparameterizedContent(query) {
        // Remove parameterized placeholders for analysis
        const queryWithoutParams = query.replace(/\$\d+/g, 'PARAM');

        // Check for string concatenation patterns that might indicate injection
        const concatenationPatterns = [
            /\+\s*['"][^'"]*['"]/, // String concatenation with quotes
            /['"][^'"]*['"]?\s*\+/, // Quotes followed by concatenation
            /\|\|[^$]/, // PostgreSQL concatenation not followed by parameter
        ];

        concatenationPatterns.forEach(pattern => {
            if (pattern.test(queryWithoutParams)) {
                throw new Error('Potential string concatenation detected in query');
            }
        });
    }

    // Validate proper parameterization
    validateParameterization(query, params) {
        // Check for quotes around parameters (indicates potential injection)
        const quotedParamPattern = /['"][^'"]*\$\d+[^'"]*['"]/;
        if (quotedParamPattern.test(query)) {
            throw new Error('Parameters should not be quoted in query string');
        }

        // Check for dangerous keywords in parameters
        params.forEach((param, index) => {
            if (typeof param === 'string') {
                const upperParam = param.toUpperCase();
                if (this.dangerousKeywords.some(keyword => upperParam.includes(keyword))) {
                    this.auditLogger.log('suspicious_parameter_detected', {
                        paramIndex: index,
                        paramValue: this.sanitizeParamForLogging(param),
                        timestamp: new Date().toISOString()
                    });
                }
            }
        });
    }

    // Check if error indicates potential injection attempt
    isPotentialInjectionError(error) {
        const injectionErrorPatterns = [
            /syntax error/i,
            /unterminated quoted string/i,
            /invalid input syntax/i,
            /column.*does not exist/i,
            /relation.*does not exist/i,
            /function.*does not exist/i,
            /operator does not exist/i
        ];

        return injectionErrorPatterns.some(pattern => pattern.test(error.message));
    }

    // Sanitize query for logging (remove sensitive data)
    sanitizeQueryForLogging(query) {
        // Replace potential sensitive patterns with placeholders
        return query
            .replace(/\$\d+/g, '[PARAM]')
            .replace(/(['"]).+?\1/g, '[STRING]')
            .replace(/\d{13,}/g, '[LONG_NUMBER]') // Potential IDs or timestamps
            .substring(0, 500); // Limit length
    }

    // Sanitize parameters for logging
    sanitizeParamsForLogging(params) {
        return params.map(param => this.sanitizeParamForLogging(param));
    }

    // Sanitize individual parameter for logging
    sanitizeParamForLogging(param) {
        if (param === null || param === undefined) {
            return param;
        }

        if (typeof param === 'string') {
            // Check for sensitive patterns
            if (param.length > 50) return '[LONG_STRING]';
            if (/\d{13,}/.test(param)) return '[ID_NUMBER]';
            if (validator.isEmail(param)) return '[EMAIL]';
            if (validator.isCreditCard(param)) return '[CREDIT_CARD]';
            if (/password|secret|token|key/i.test(param)) return '[SENSITIVE]';
        }

        if (typeof param === 'number' && param.toString().length > 10) {
            return '[LARGE_NUMBER]';
        }

        return param;
    }

    // Secure query builders for common operations

    // Secure SELECT query builder
    buildSecureSelect(table, columns = '*', whereClause = '', params = [], options = {}) {
        this.validateTableName(table);
        this.validateColumns(columns);

        let query = `SELECT ${this.sanitizeColumns(columns)} FROM ${this.sanitizeTableName(table)}`;
        
        if (whereClause) {
            query += ` WHERE ${whereClause}`;
        }

        if (options.orderBy) {
            query += ` ORDER BY ${this.sanitizeOrderBy(options.orderBy)}`;
        }

        if (options.limit) {
            query += ` LIMIT $${params.length + 1}`;
            params.push(parseInt(options.limit));
        }

        if (options.offset) {
            query += ` OFFSET $${params.length + 1}`;
            params.push(parseInt(options.offset));
        }

        return { query, params };
    }

    // Secure INSERT query builder
    buildSecureInsert(table, data, options = {}) {
        this.validateTableName(table);
        this.validateInsertData(data);

        const columns = Object.keys(data);
        const values = Object.values(data);
        const placeholders = values.map((_, index) => `$${index + 1}`);

        let query = `INSERT INTO ${this.sanitizeTableName(table)} (${columns.map(this.sanitizeColumnName).join(', ')}) VALUES (${placeholders.join(', ')})`;

        if (options.returning) {
            query += ` RETURNING ${this.sanitizeColumns(options.returning)}`;
        }

        return { query, params: values };
    }

    // Secure UPDATE query builder
    buildSecureUpdate(table, data, whereClause, whereParams = [], options = {}) {
        this.validateTableName(table);
        this.validateUpdateData(data);

        const setClause = Object.keys(data).map((column, index) => 
            `${this.sanitizeColumnName(column)} = $${index + 1}`
        ).join(', ');

        const dataValues = Object.values(data);
        let query = `UPDATE ${this.sanitizeTableName(table)} SET ${setClause}`;

        if (whereClause) {
            const adjustedWhereParams = whereParams.map((_, index) => 
                whereClause.replace(new RegExp(`\\$${index + 1}`, 'g'), `$${dataValues.length + index + 1}`)
            );
            query += ` WHERE ${whereClause.replace(/\$(\d+)/g, (match, num) => `$${parseInt(num) + dataValues.length}`)}`;
        }

        if (options.returning) {
            query += ` RETURNING ${this.sanitizeColumns(options.returning)}`;
        }

        return { query, params: [...dataValues, ...whereParams] };
    }

    // Secure DELETE query builder
    buildSecureDelete(table, whereClause, params = [], options = {}) {
        this.validateTableName(table);

        let query = `DELETE FROM ${this.sanitizeTableName(table)}`;

        if (whereClause) {
            query += ` WHERE ${whereClause}`;
        } else {
            throw new Error('DELETE queries must include WHERE clause for safety');
        }

        if (options.returning) {
            query += ` RETURNING ${this.sanitizeColumns(options.returning)}`;
        }

        return { query, params };
    }

    // Validation methods

    validateTableName(table) {
        if (!table || typeof table !== 'string') {
            throw new Error('Invalid table name');
        }

        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
            throw new Error('Table name contains invalid characters');
        }

        if (table.length > 64) {
            throw new Error('Table name too long');
        }
    }

    validateColumns(columns) {
        if (columns === '*') return;

        if (typeof columns === 'string') {
            columns = [columns];
        }

        if (!Array.isArray(columns)) {
            throw new Error('Columns must be string or array');
        }

        columns.forEach(column => {
            if (!/^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$/.test(column)) {
                throw new Error(`Invalid column name: ${column}`);
            }
        });
    }

    validateInsertData(data) {
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            throw new Error('Insert data must be an object');
        }

        if (Object.keys(data).length === 0) {
            throw new Error('Insert data cannot be empty');
        }

        Object.keys(data).forEach(key => {
            if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
                throw new Error(`Invalid column name: ${key}`);
            }
        });
    }

    validateUpdateData(data) {
        this.validateInsertData(data);
    }

    // Sanitization methods

    sanitizeTableName(table) {
        return table.replace(/[^a-zA-Z0-9_]/g, '');
    }

    sanitizeColumnName(column) {
        return column.replace(/[^a-zA-Z0-9_.]/g, '');
    }

    sanitizeColumns(columns) {
        if (columns === '*') return '*';

        if (typeof columns === 'string') {
            return this.sanitizeColumnName(columns);
        }

        if (Array.isArray(columns)) {
            return columns.map(col => this.sanitizeColumnName(col)).join(', ');
        }

        throw new Error('Invalid columns format');
    }

    sanitizeOrderBy(orderBy) {
        const parts = orderBy.split(',').map(part => {
            const trimmed = part.trim();
            const match = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*(ASC|DESC)?$/i);
            
            if (!match) {
                throw new Error(`Invalid ORDER BY clause: ${part}`);
            }

            return match[1] + (match[2] ? ` ${match[2].toUpperCase()}` : '');
        });

        return parts.join(', ');
    }

    // Transaction support with security
    async executeSecureTransaction(queries, options = {}) {
        const client = await this.pool.connect();
        const transactionId = crypto.randomUUID();

        try {
            await client.query('BEGIN');

            this.auditLogger.log('database_transaction_start', {
                transactionId,
                queryCount: queries.length,
                timestamp: new Date().toISOString(),
                userId: options.userId
            });

            const results = [];

            for (let i = 0; i < queries.length; i++) {
                const { query, params } = queries[i];
                
                // Apply same security checks as single queries
                this.validateQuery(query, params);
                this.detectInjectionAttempts(query, params);

                const result = await client.query(query, params);
                results.push(result);
            }

            await client.query('COMMIT');

            this.auditLogger.log('database_transaction_commit', {
                transactionId,
                timestamp: new Date().toISOString(),
                userId: options.userId
            });

            return results;

        } catch (error) {
            await client.query('ROLLBACK');

            this.auditLogger.log('database_transaction_rollback', {
                transactionId,
                error: error.message,
                timestamp: new Date().toISOString(),
                userId: options.userId
            });

            throw error;

        } finally {
            client.release();
        }
    }

    // Close pool gracefully
    async close() {
        await this.pool.end();
    }

    // Health check
    async healthCheck() {
        try {
            const result = await this.executeSecureQuery('SELECT 1 as health_check');
            return result.rows[0].health_check === 1;
        } catch (error) {
            return false;
        }
    }
}

module.exports = SQLInjectionProtection;