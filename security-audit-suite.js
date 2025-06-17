// NexVestXR v2 Dual Token Platform - Comprehensive Security Audit Suite
// Complete security assessment for blockchain-based real estate tokenization platform

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

class SecurityAuditSuite {
  constructor() {
    this.auditResults = {
      smartContracts: [],
      api: [],
      frontend: [],
      infrastructure: [],
      database: [],
      authentication: [],
      compliance: [],
      summary: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0
      }
    };
    this.vulnerabilities = [];
    this.recommendations = [];
  }

  // Log security finding
  logFinding(category, severity, title, description, recommendation = '', file = '') {
    const finding = {
      id: crypto.randomUUID(),
      category,
      severity,
      title,
      description,
      recommendation,
      file,
      timestamp: new Date().toISOString()
    };

    this.auditResults[category].push(finding);
    this.auditResults.summary[severity]++;

    const severityIcon = {
      critical: '🚨',
      high: '🔴',
      medium: '🟡',
      low: '🟢',
      info: 'ℹ️'
    };

    console.log(`   ${severityIcon[severity]} ${severity.toUpperCase()}: ${title}`);
    if (description) console.log(`      ${description}`);
    if (file) console.log(`      File: ${file}`);
  }

  // Smart Contract Security Audit
  async auditSmartContracts() {
    console.log('\n🔐 Smart Contract Security Audit');
    console.log('=================================');

    const contractsDir = path.join(__dirname, 'smart-contracts/contracts');
    
    if (!fs.existsSync(contractsDir)) {
      this.logFinding('smartContracts', 'medium', 
        'Contracts directory not found', 
        'Smart contracts directory is missing or not accessible');
      return;
    }

    // Audit core contracts
    await this.auditContract(path.join(contractsDir, 'XERAToken.sol'));
    await this.auditContract(path.join(contractsDir, 'PROPXTokenFactory.sol'));
    
    // Audit UAE-specific contracts
    const uaeDir = path.join(contractsDir, 'UAE');
    if (fs.existsSync(uaeDir)) {
      await this.auditContract(path.join(uaeDir, 'UAEXERAToken.sol'));
      await this.auditContract(path.join(uaeDir, 'UAEPROPXFactory.sol'));
      await this.auditContract(path.join(uaeDir, 'UAEDualTokenClassifier.sol'));
    }

    // Check for common smart contract vulnerabilities
    await this.checkContractVulnerabilities();
  }

  // Audit individual smart contract
  async auditContract(contractPath) {
    if (!fs.existsSync(contractPath)) {
      this.logFinding('smartContracts', 'medium',
        'Contract file not found',
        `Contract file missing: ${path.basename(contractPath)}`,
        'Ensure all required contracts are present',
        contractPath);
      return;
    }

    const contractContent = fs.readFileSync(contractPath, 'utf8');
    const contractName = path.basename(contractPath);

    console.log(`\n   🔍 Auditing ${contractName}`);

    // Check for reentrancy vulnerabilities
    if (contractContent.includes('call.value') || contractContent.includes('.call(')) {
      if (!contractContent.includes('nonReentrant') && !contractContent.includes('ReentrancyGuard')) {
        this.logFinding('smartContracts', 'critical',
          'Potential Reentrancy Vulnerability',
          'Contract uses external calls without reentrancy protection',
          'Implement ReentrancyGuard from OpenZeppelin',
          contractName);
      }
    }

    // Check for overflow/underflow protection
    if (!contractContent.includes('SafeMath') && !contractContent.includes('pragma solidity ^0.8')) {
      this.logFinding('smartContracts', 'high',
        'No Overflow Protection',
        'Contract may be vulnerable to integer overflow/underflow',
        'Use SafeMath library or Solidity 0.8+',
        contractName);
    }

    // Check for proper access controls
    if (!contractContent.includes('onlyOwner') && !contractContent.includes('AccessControl')) {
      this.logFinding('smartContracts', 'medium',
        'Missing Access Controls',
        'Contract lacks proper access control mechanisms',
        'Implement role-based access control',
        contractName);
    }

    // Check for pausable functionality
    if (contractContent.includes('mint') || contractContent.includes('burn')) {
      if (!contractContent.includes('Pausable') && !contractContent.includes('paused')) {
        this.logFinding('smartContracts', 'medium',
          'Missing Emergency Pause',
          'Critical functions lack emergency pause capability',
          'Implement Pausable contract for emergency stops',
          contractName);
      }
    }

    // Check for proper event emission
    const functionMatches = contractContent.match(/function\s+\w+\s*\([^)]*\)\s*[^{]*{/g);
    if (functionMatches) {
      const hasEvents = contractContent.includes('emit ');
      if (!hasEvents) {
        this.logFinding('smartContracts', 'low',
          'Missing Event Emissions',
          'Contract functions do not emit events for transparency',
          'Add event emissions for state-changing functions',
          contractName);
      }
    }

    // Check for hardcoded values
    const hardcodedAddresses = contractContent.match(/0x[a-fA-F0-9]{40}/g);
    if (hardcodedAddresses && hardcodedAddresses.length > 0) {
      this.logFinding('smartContracts', 'medium',
        'Hardcoded Addresses',
        'Contract contains hardcoded addresses',
        'Use configurable addresses or address provider',
        contractName);
    }

    console.log(`      ✅ ${contractName} audit complete`);
  }

  // Check for common smart contract vulnerabilities
  async checkContractVulnerabilities() {
    console.log('\n   🔍 Checking Common Vulnerabilities');

    const commonVulns = [
      {
        name: 'Front-running',
        description: 'Transaction ordering attacks',
        mitigation: 'Use commit-reveal schemes or MEV protection'
      },
      {
        name: 'Flash loan attacks',
        description: 'Manipulation using flash loans',
        mitigation: 'Implement oracle manipulation protection'
      },
      {
        name: 'Governance attacks',
        description: 'Voting manipulation',
        mitigation: 'Use timelock and minimum voting periods'
      },
      {
        name: 'Price oracle manipulation',
        description: 'External price feed attacks',
        mitigation: 'Use multiple oracle sources and TWAP'
      }
    ];

    commonVulns.forEach(vuln => {
      this.logFinding('smartContracts', 'info',
        `Check: ${vuln.name}`,
        vuln.description,
        vuln.mitigation);
    });
  }

  // API Security Assessment
  async auditAPIEndpoints() {
    console.log('\n🔐 API Security Assessment');
    console.log('==========================');

    const backendDir = path.join(__dirname, 'backend/src');
    
    if (!fs.existsSync(backendDir)) {
      this.logFinding('api', 'medium',
        'Backend directory not found',
        'Backend source code directory is missing');
      return;
    }

    // Check authentication implementation
    await this.checkAuthentication();
    
    // Check API route security
    await this.checkAPIRoutes();
    
    // Check input validation
    await this.checkInputValidation();
    
    // Check rate limiting
    await this.checkRateLimiting();
    
    // Check CORS configuration
    await this.checkCORSConfiguration();
  }

  // Check authentication security
  async checkAuthentication() {
    console.log('\n   🔐 Checking Authentication Security');

    const authFile = path.join(__dirname, 'backend/src/routes/auth.js');
    
    if (fs.existsSync(authFile)) {
      const authContent = fs.readFileSync(authFile, 'utf8');
      
      // Check for JWT implementation
      if (authContent.includes('jsonwebtoken')) {
        console.log('      ✅ JWT implementation found');
        
        // Check for proper secret handling
        if (authContent.includes('process.env.JWT_SECRET')) {
          console.log('      ✅ Environment-based JWT secret');
        } else {
          this.logFinding('api', 'critical',
            'Hardcoded JWT Secret',
            'JWT secret is hardcoded in source code',
            'Use environment variables for JWT secret',
            'auth.js');
        }
        
        // Check for token expiration
        if (authContent.includes('expiresIn')) {
          console.log('      ✅ Token expiration configured');
        } else {
          this.logFinding('api', 'high',
            'Missing Token Expiration',
            'JWT tokens do not have expiration time',
            'Set appropriate token expiration time',
            'auth.js');
        }
      } else {
        this.logFinding('api', 'medium',
          'Authentication Method Unknown',
          'Cannot identify authentication implementation',
          'Ensure proper authentication is implemented',
          'auth.js');
      }
      
      // Check for password hashing
      if (authContent.includes('bcrypt') || authContent.includes('argon2')) {
        console.log('      ✅ Password hashing found');
      } else {
        this.logFinding('api', 'critical',
          'Missing Password Hashing',
          'Passwords may not be properly hashed',
          'Implement bcrypt or argon2 for password hashing',
          'auth.js');
      }
      
    } else {
      this.logFinding('api', 'high',
        'Authentication File Missing',
        'Cannot find authentication implementation',
        'Implement proper authentication system');
    }
  }

  // Check API route security
  async checkAPIRoutes() {
    console.log('\n   🛡️  Checking API Route Security');

    const routesDir = path.join(__dirname, 'backend/src/routes');
    
    if (!fs.existsSync(routesDir)) {
      this.logFinding('api', 'medium',
        'Routes directory not found',
        'API routes directory is missing');
      return;
    }

    const routeFiles = fs.readdirSync(routesDir).filter(file => file.endsWith('.js'));
    
    routeFiles.forEach(file => {
      const routePath = path.join(routesDir, file);
      const routeContent = fs.readFileSync(routePath, 'utf8');
      
      // Check for authentication middleware
      const hasAuth = routeContent.includes('auth') || 
                      routeContent.includes('authenticate') ||
                      routeContent.includes('verifyToken');
      
      if (!hasAuth && !file.includes('public')) {
        this.logFinding('api', 'high',
          'Missing Authentication Middleware',
          `Route file ${file} may lack authentication protection`,
          'Add authentication middleware to protected routes',
          file);
      }
      
      // Check for input validation
      const hasValidation = routeContent.includes('joi') ||
                           routeContent.includes('express-validator') ||
                           routeContent.includes('validate');
      
      if (!hasValidation) {
        this.logFinding('api', 'medium',
          'Missing Input Validation',
          `Route file ${file} lacks input validation`,
          'Implement input validation using Joi or express-validator',
          file);
      }
      
      // Check for SQL injection protection
      if (routeContent.includes('query') && !routeContent.includes('prepared')) {
        this.logFinding('api', 'high',
          'Potential SQL Injection',
          `Route file ${file} may be vulnerable to SQL injection`,
          'Use parameterized queries or ORM',
          file);
      }
    });

    console.log(`      ✅ Audited ${routeFiles.length} route files`);
  }

  // Check input validation
  async checkInputValidation() {
    console.log('\n   ✅ Checking Input Validation');

    const middlewareDir = path.join(__dirname, 'backend/src/middleware');
    
    if (fs.existsSync(middlewareDir)) {
      const middlewareFiles = fs.readdirSync(middlewareDir);
      
      const hasValidationMiddleware = middlewareFiles.some(file => 
        file.includes('validation') || file.includes('sanitize')
      );
      
      if (hasValidationMiddleware) {
        console.log('      ✅ Validation middleware found');
      } else {
        this.logFinding('api', 'medium',
          'Missing Validation Middleware',
          'No dedicated validation middleware found',
          'Create validation middleware for input sanitization');
      }
    }

    // Check for common validation patterns
    const validationChecks = [
      'XSS Protection',
      'SQL Injection Prevention',
      'NoSQL Injection Prevention',
      'File Upload Validation',
      'Email Validation',
      'Phone Number Validation'
    ];

    validationChecks.forEach(check => {
      this.logFinding('api', 'info',
        `Validation Check: ${check}`,
        'Ensure proper validation is implemented',
        'Use appropriate validation libraries');
    });
  }

  // Check rate limiting
  async checkRateLimiting() {
    console.log('\n   🚦 Checking Rate Limiting');

    const serverFile = path.join(__dirname, 'backend/src/server.js');
    
    if (fs.existsSync(serverFile)) {
      const serverContent = fs.readFileSync(serverFile, 'utf8');
      
      if (serverContent.includes('express-rate-limit') || serverContent.includes('rate-limit')) {
        console.log('      ✅ Rate limiting implemented');
      } else {
        this.logFinding('api', 'medium',
          'Missing Rate Limiting',
          'API lacks rate limiting protection',
          'Implement express-rate-limit middleware',
          'server.js');
      }
    }
  }

  // Check CORS configuration
  async checkCORSConfiguration() {
    console.log('\n   🌐 Checking CORS Configuration');

    const serverFile = path.join(__dirname, 'backend/src/server.js');
    
    if (fs.existsSync(serverFile)) {
      const serverContent = fs.readFileSync(serverFile, 'utf8');
      
      if (serverContent.includes('cors')) {
        console.log('      ✅ CORS middleware found');
        
        // Check for wildcard origin
        if (serverContent.includes('origin: "*"') || serverContent.includes("origin: '*'")) {
          this.logFinding('api', 'high',
            'Overly Permissive CORS',
            'CORS is configured to allow all origins',
            'Configure specific allowed origins',
            'server.js');
        }
      } else {
        this.logFinding('api', 'low',
          'CORS Not Configured',
          'CORS middleware not found',
          'Configure CORS for production security',
          'server.js');
      }
    }
  }

  // Frontend Security Review
  async auditFrontendSecurity() {
    console.log('\n🔐 Frontend Security Review');
    console.log('===========================');

    await this.checkClientSideSecurity();
    await this.checkDependencyVulnerabilities();
    await this.checkContentSecurityPolicy();
    await this.checkXSSProtection();
  }

  // Check client-side security
  async checkClientSideSecurity() {
    console.log('\n   💻 Checking Client-Side Security');

    const frontendDir = path.join(__dirname, 'frontend/src');
    
    if (!fs.existsSync(frontendDir)) {
      this.logFinding('frontend', 'medium',
        'Frontend directory not found',
        'Frontend source code directory is missing');
      return;
    }

    // Check for sensitive data exposure
    const checkForSecrets = (dir, level = 0) => {
      if (level > 3) return; // Limit recursion depth
      
      const files = fs.readdirSync(dir);
      
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory() && !file.includes('node_modules')) {
          checkForSecrets(filePath, level + 1);
        } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')) {
          const content = fs.readFileSync(filePath, 'utf8');
          
          // Check for API keys or secrets
          const secretPatterns = [
            /api[_-]?key[_-]?=\s*['"]\w+['"]/i,
            /secret[_-]?key[_-]?=\s*['"]\w+['"]/i,
            /password[_-]?=\s*['"]\w+['"]/i,
            /token[_-]?=\s*['"]\w+['"]/i
          ];
          
          secretPatterns.forEach(pattern => {
            if (pattern.test(content)) {
              this.logFinding('frontend', 'critical',
                'Potential Secret Exposure',
                'Hardcoded secrets found in frontend code',
                'Move secrets to environment variables',
                file);
            }
          });
          
          // Check for dangerouslySetInnerHTML
          if (content.includes('dangerouslySetInnerHTML')) {
            this.logFinding('frontend', 'high',
              'Dangerous HTML Injection',
              'dangerouslySetInnerHTML usage found',
              'Sanitize content or use safer alternatives',
              file);
          }
        }
      });
    };

    checkForSecrets(frontendDir);
    console.log('      ✅ Client-side security check complete');
  }

  // Check dependency vulnerabilities
  async checkDependencyVulnerabilities() {
    console.log('\n   📦 Checking Dependency Vulnerabilities');

    const packagePaths = [
      path.join(__dirname, 'package.json'),
      path.join(__dirname, 'backend/package.json'),
      path.join(__dirname, 'frontend/package.json'),
      path.join(__dirname, 'mobile/package.json')
    ];

    for (const packagePath of packagePaths) {
      if (fs.existsSync(packagePath)) {
        try {
          const packageDir = path.dirname(packagePath);
          const relativePath = path.relative(__dirname, packagePath);
          
          // Run npm audit (if available)
          try {
            const auditResult = execSync('npm audit --json', { 
              cwd: packageDir,
              timeout: 30000 
            }).toString();
            
            const auditData = JSON.parse(auditResult);
            
            if (auditData.vulnerabilities) {
              const vulnCount = Object.keys(auditData.vulnerabilities).length;
              
              if (vulnCount > 0) {
                this.logFinding('frontend', 'medium',
                  'Dependency Vulnerabilities',
                  `${vulnCount} vulnerable dependencies found`,
                  'Run npm audit fix to resolve vulnerabilities',
                  relativePath);
              } else {
                console.log(`      ✅ No vulnerabilities in ${relativePath}`);
              }
            }
          } catch (auditError) {
            this.logFinding('frontend', 'info',
              'Audit Check Failed',
              'Could not run npm audit',
              'Manually check dependencies for vulnerabilities',
              relativePath);
          }
          
        } catch (error) {
          console.log(`      ⚠️  Could not audit ${packagePath}`);
        }
      }
    }
  }

  // Check Content Security Policy
  async checkContentSecurityPolicy() {
    console.log('\n   🛡️  Checking Content Security Policy');

    const indexPath = path.join(__dirname, 'frontend/public/index.html');
    
    if (fs.existsSync(indexPath)) {
      const indexContent = fs.readFileSync(indexPath, 'utf8');
      
      if (indexContent.includes('Content-Security-Policy')) {
        console.log('      ✅ CSP header found');
      } else {
        this.logFinding('frontend', 'medium',
          'Missing Content Security Policy',
          'No CSP headers found in HTML',
          'Implement Content-Security-Policy headers',
          'index.html');
      }
    }

    // Check server-side CSP implementation
    const serverFile = path.join(__dirname, 'backend/src/server.js');
    
    if (fs.existsSync(serverFile)) {
      const serverContent = fs.readFileSync(serverFile, 'utf8');
      
      if (serverContent.includes('helmet') || serverContent.includes('csp')) {
        console.log('      ✅ Server-side CSP configuration found');
      } else {
        this.logFinding('frontend', 'medium',
          'Missing Server-Side CSP',
          'No server-side CSP configuration found',
          'Configure CSP headers using helmet middleware',
          'server.js');
      }
    }
  }

  // Check XSS protection
  async checkXSSProtection() {
    console.log('\n   🔒 Checking XSS Protection');

    const recommendations = [
      'Input sanitization',
      'Output encoding',
      'CSP headers',
      'XSS-Protection headers',
      'Content-Type validation'
    ];

    recommendations.forEach(rec => {
      this.logFinding('frontend', 'info',
        `XSS Protection: ${rec}`,
        'Ensure proper XSS protection is implemented',
        `Implement ${rec} for XSS prevention`);
    });
  }

  // Infrastructure Security Assessment
  async auditInfrastructure() {
    console.log('\n🔐 Infrastructure Security Assessment');
    console.log('====================================');

    await this.checkDockerSecurity();
    await this.checkEnvironmentSecurity();
    await this.checkNetworkSecurity();
    await this.checkMonitoringSecurity();
  }

  // Check Docker security
  async checkDockerSecurity() {
    console.log('\n   🐳 Checking Docker Security');

    const dockerfiles = [
      'Dockerfile',
      'backend/Dockerfile',
      'frontend/Dockerfile',
      'ai-service/Dockerfile'
    ];

    dockerfiles.forEach(dockerfile => {
      const dockerPath = path.join(__dirname, dockerfile);
      
      if (fs.existsSync(dockerPath)) {
        const dockerContent = fs.readFileSync(dockerPath, 'utf8');
        
        // Check for running as root
        if (!dockerContent.includes('USER ') || dockerContent.includes('USER root')) {
          this.logFinding('infrastructure', 'medium',
            'Docker Running as Root',
            'Container may be running as root user',
            'Use non-root user in Dockerfile',
            dockerfile);
        }
        
        // Check for secrets in Dockerfile
        if (dockerContent.match(/password|secret|key/i)) {
          this.logFinding('infrastructure', 'high',
            'Potential Secrets in Dockerfile',
            'Dockerfile may contain hardcoded secrets',
            'Use build args or environment variables',
            dockerfile);
        }
        
        console.log(`      ✅ ${dockerfile} checked`);
      }
    });

    // Check docker-compose security
    const composeFiles = ['docker-compose.yml', 'docker-compose.prod.yml'];
    
    composeFiles.forEach(composeFile => {
      const composePath = path.join(__dirname, composeFile);
      
      if (fs.existsSync(composePath)) {
        const composeContent = fs.readFileSync(composePath, 'utf8');
        
        // Check for exposed ports
        if (composeContent.includes('ports:')) {
          this.logFinding('infrastructure', 'low',
            'Exposed Ports in Docker Compose',
            'Services expose ports directly',
            'Use reverse proxy for production',
            composeFile);
        }
        
        console.log(`      ✅ ${composeFile} checked`);
      }
    });
  }

  // Check environment security
  async checkEnvironmentSecurity() {
    console.log('\n   🌍 Checking Environment Security');

    const envFiles = [
      '.env',
      '.env.example',
      'backend/.env',
      'frontend/.env'
    ];

    envFiles.forEach(envFile => {
      const envPath = path.join(__dirname, envFile);
      
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        
        // Check for weak secrets
        const lines = envContent.split('\n');
        lines.forEach(line => {
          if (line.includes('=')) {
            const [key, value] = line.split('=');
            
            if (key.includes('SECRET') || key.includes('KEY')) {
              if (value && (value.length < 32 || value === 'your-secret-here')) {
                this.logFinding('infrastructure', 'high',
                  'Weak Environment Secret',
                  `Weak secret found: ${key}`,
                  'Use strong, randomly generated secrets',
                  envFile);
              }
            }
          }
        });
        
        console.log(`      ✅ ${envFile} checked`);
      }
    });
  }

  // Check network security
  async checkNetworkSecurity() {
    console.log('\n   🌐 Checking Network Security');

    const networkChecks = [
      'HTTPS enforcement',
      'SSL/TLS configuration',
      'Firewall rules',
      'VPC configuration',
      'Load balancer security',
      'API Gateway protection'
    ];

    networkChecks.forEach(check => {
      this.logFinding('infrastructure', 'info',
        `Network Security: ${check}`,
        'Ensure proper network security is configured',
        `Implement ${check} for production`);
    });
  }

  // Check monitoring security
  async checkMonitoringSecurity() {
    console.log('\n   📊 Checking Monitoring Security');

    const monitoringChecks = [
      'Security event logging',
      'Intrusion detection',
      'Anomaly detection',
      'Access logging',
      'Audit trails',
      'Alert mechanisms'
    ];

    monitoringChecks.forEach(check => {
      this.logFinding('infrastructure', 'info',
        `Monitoring: ${check}`,
        'Ensure comprehensive security monitoring',
        `Implement ${check} for security visibility`);
    });
  }

  // Database Security Assessment
  async auditDatabaseSecurity() {
    console.log('\n🔐 Database Security Assessment');
    console.log('===============================');

    await this.checkDatabaseConfiguration();
    await this.checkDataEncryption();
    await this.checkAccessControls();
    await this.checkDataBackup();
  }

  // Check database configuration
  async checkDatabaseConfiguration() {
    console.log('\n   🗄️  Checking Database Configuration');

    const dbChecks = [
      {
        name: 'Connection Security',
        description: 'Ensure encrypted connections (SSL/TLS)',
        severity: 'high'
      },
      {
        name: 'Authentication',
        description: 'Strong database authentication',
        severity: 'critical'
      },
      {
        name: 'Network Access',
        description: 'Restrict network access to database',
        severity: 'high'
      },
      {
        name: 'Default Settings',
        description: 'Change default database settings',
        severity: 'medium'
      }
    ];

    dbChecks.forEach(check => {
      this.logFinding('database', check.severity,
        check.name,
        check.description,
        'Configure according to security best practices');
    });
  }

  // Check data encryption
  async checkDataEncryption() {
    console.log('\n   🔒 Checking Data Encryption');

    const encryptionChecks = [
      'Encryption at rest',
      'Encryption in transit',
      'Key management',
      'Field-level encryption for PII',
      'Backup encryption'
    ];

    encryptionChecks.forEach(check => {
      this.logFinding('database', 'high',
        `Data Encryption: ${check}`,
        'Ensure comprehensive data encryption',
        `Implement ${check} for data protection`);
    });
  }

  // Check access controls
  async checkAccessControls() {
    console.log('\n   👥 Checking Database Access Controls');

    const accessChecks = [
      'Role-based access control',
      'Principle of least privilege',
      'Regular access reviews',
      'Service account management',
      'Query logging and monitoring'
    ];

    accessChecks.forEach(check => {
      this.logFinding('database', 'medium',
        `Access Control: ${check}`,
        'Ensure proper database access controls',
        `Implement ${check} for access security`);
    });
  }

  // Check data backup security
  async checkDataBackup() {
    console.log('\n   💾 Checking Data Backup Security');

    const backupChecks = [
      'Backup encryption',
      'Backup access controls',
      'Backup testing and validation',
      'Geographic distribution',
      'Retention policies'
    ];

    backupChecks.forEach(check => {
      this.logFinding('database', 'medium',
        `Backup Security: ${check}`,
        'Ensure secure backup practices',
        `Implement ${check} for backup security`);
    });
  }

  // Compliance and Regulatory Assessment
  async auditCompliance() {
    console.log('\n🔐 Compliance and Regulatory Assessment');
    console.log('======================================');

    await this.checkGDPRCompliance();
    await this.checkPCIDSSCompliance();
    await this.checkSOC2Compliance();
    await this.checkUAECompliance();
  }

  // Check GDPR compliance
  async checkGDPRCompliance() {
    console.log('\n   🇪🇺 Checking GDPR Compliance');

    const gdprChecks = [
      'Data processing lawfulness',
      'Data subject consent',
      'Right to be forgotten',
      'Data portability',
      'Privacy by design',
      'Data protection impact assessment',
      'Data breach notification'
    ];

    gdprChecks.forEach(check => {
      this.logFinding('compliance', 'medium',
        `GDPR: ${check}`,
        'Ensure GDPR compliance for EU users',
        `Implement ${check} according to GDPR requirements`);
    });
  }

  // Check PCI DSS compliance (if handling payments)
  async checkPCIDSSCompliance() {
    console.log('\n   💳 Checking PCI DSS Compliance');

    const pciChecks = [
      'Secure cardholder data storage',
      'Encryption of payment data',
      'Access controls for payment systems',
      'Regular security testing',
      'Security policy maintenance'
    ];

    pciChecks.forEach(check => {
      this.logFinding('compliance', 'critical',
        `PCI DSS: ${check}`,
        'Ensure PCI DSS compliance for payment processing',
        `Implement ${check} for payment security`);
    });
  }

  // Check SOC 2 compliance
  async checkSOC2Compliance() {
    console.log('\n   🔍 Checking SOC 2 Compliance');

    const soc2Checks = [
      'Security controls',
      'Availability controls',
      'Processing integrity',
      'Confidentiality controls',
      'Privacy controls'
    ];

    soc2Checks.forEach(check => {
      this.logFinding('compliance', 'medium',
        `SOC 2: ${check}`,
        'Ensure SOC 2 compliance for enterprise customers',
        `Implement ${check} according to SOC 2 requirements`);
    });
  }

  // Check UAE regulatory compliance
  async checkUAECompliance() {
    console.log('\n   🇦🇪 Checking UAE Regulatory Compliance');

    const uaeChecks = [
      'RERA compliance for real estate',
      'ADRA compliance for Abu Dhabi',
      'CBUAE compliance for financial services',
      'Data localization requirements',
      'KYC/AML compliance',
      'Securities regulations'
    ];

    uaeChecks.forEach(check => {
      this.logFinding('compliance', 'high',
        `UAE Compliance: ${check}`,
        'Ensure compliance with UAE regulations',
        `Implement ${check} for UAE market operations`);
    });
  }

  // Generate security recommendations
  generateSecurityRecommendations() {
    console.log('\n💡 Security Recommendations');
    console.log('============================');

    const recommendations = [
      {
        priority: 'Critical',
        category: 'Authentication',
        recommendations: [
          'Implement multi-factor authentication (MFA)',
          'Use strong password policies',
          'Implement account lockout mechanisms',
          'Regular password rotation for service accounts'
        ]
      },
      {
        priority: 'High',
        category: 'Smart Contracts',
        recommendations: [
          'Conduct formal security audit by third party',
          'Implement reentrancy guards',
          'Use OpenZeppelin security libraries',
          'Implement emergency pause functionality'
        ]
      },
      {
        priority: 'High',
        category: 'Infrastructure',
        recommendations: [
          'Implement Web Application Firewall (WAF)',
          'Use Container security scanning',
          'Implement network segmentation',
          'Regular security updates and patching'
        ]
      },
      {
        priority: 'Medium',
        category: 'Monitoring',
        recommendations: [
          'Implement security information and event management (SIEM)',
          'Set up intrusion detection system (IDS)',
          'Regular security assessments',
          'Incident response plan'
        ]
      },
      {
        priority: 'Medium',
        category: 'Data Protection',
        recommendations: [
          'Implement data classification',
          'Regular backup testing',
          'Data loss prevention (DLP)',
          'Encryption key rotation'
        ]
      }
    ];

    recommendations.forEach(section => {
      console.log(`\n   🎯 ${section.priority} Priority - ${section.category}:`);
      section.recommendations.forEach(rec => {
        console.log(`      • ${rec}`);
      });
    });

    return recommendations;
  }

  // Generate penetration testing checklist
  generatePentestChecklist() {
    console.log('\n🎯 Penetration Testing Checklist');
    console.log('=================================');

    const pentestChecklist = {
      'Network Security': [
        'Port scanning and service enumeration',
        'Vulnerability scanning',
        'Network protocol testing',
        'Wireless security assessment',
        'Firewall and IDS evasion'
      ],
      'Web Application Security': [
        'OWASP Top 10 testing',
        'Authentication bypass attempts',
        'Session management testing',
        'Input validation testing',
        'Business logic flaws'
      ],
      'API Security': [
        'API endpoint enumeration',
        'Authentication and authorization testing',
        'Rate limiting bypass',
        'Input validation on API parameters',
        'API versioning security'
      ],
      'Smart Contract Security': [
        'Reentrancy attack testing',
        'Integer overflow/underflow testing',
        'Access control testing',
        'Gas limit and DoS testing',
        'Front-running attack simulation'
      ],
      'Infrastructure Security': [
        'Container escape testing',
        'Privilege escalation attempts',
        'Configuration assessment',
        'Backup and recovery testing',
        'Disaster recovery validation'
      ]
    };

    Object.entries(pentestChecklist).forEach(([category, tests]) => {
      console.log(`\n   🔍 ${category}:`);
      tests.forEach(test => {
        console.log(`      • ${test}`);
      });
    });

    return pentestChecklist;
  }

  // Generate security report
  generateSecurityReport() {
    console.log('\n📊 Security Audit Summary');
    console.log('==========================');

    const total = this.auditResults.summary.critical + 
                  this.auditResults.summary.high + 
                  this.auditResults.summary.medium + 
                  this.auditResults.summary.low + 
                  this.auditResults.summary.info;

    console.log(`🚨 Critical: ${this.auditResults.summary.critical}`);
    console.log(`🔴 High: ${this.auditResults.summary.high}`);
    console.log(`🟡 Medium: ${this.auditResults.summary.medium}`);
    console.log(`🟢 Low: ${this.auditResults.summary.low}`);
    console.log(`ℹ️  Info: ${this.auditResults.summary.info}`);
    console.log(`📊 Total: ${total}`);

    // Calculate risk score
    const riskScore = (this.auditResults.summary.critical * 10) +
                      (this.auditResults.summary.high * 7) +
                      (this.auditResults.summary.medium * 4) +
                      (this.auditResults.summary.low * 1);

    let riskLevel = 'Low';
    if (riskScore > 50) riskLevel = 'Critical';
    else if (riskScore > 30) riskLevel = 'High';
    else if (riskScore > 15) riskLevel = 'Medium';

    console.log(`\n🎯 Overall Risk Level: ${riskLevel} (Score: ${riskScore})`);

    // Generate detailed report
    const report = {
      timestamp: new Date().toISOString(),
      platform: 'NexVestXR v2 Dual Token Platform',
      auditResults: this.auditResults,
      riskScore,
      riskLevel,
      recommendations: this.generateSecurityRecommendations(),
      pentestChecklist: this.generatePentestChecklist(),
      nextSteps: [
        'Address all critical and high severity findings',
        'Implement security recommendations',
        'Conduct third-party security audit',
        'Perform penetration testing',
        'Regular security assessments'
      ]
    };

    // Save report
    const reportFile = `security-audit-report-${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed security report saved: ${reportFile}`);

    return report;
  }

  // Run complete security audit
  async runCompleteAudit() {
    try {
      console.log('🛡️  NexVestXR v2 Comprehensive Security Audit');
      console.log('=============================================');

      await this.auditSmartContracts();
      await this.auditAPIEndpoints();
      await this.auditFrontendSecurity();
      await this.auditInfrastructure();
      await this.auditDatabaseSecurity();
      await this.auditCompliance();

      const report = this.generateSecurityReport();

      if (this.auditResults.summary.critical > 0) {
        console.log('\n🚨 CRITICAL SECURITY ISSUES FOUND!');
        console.log('   Address immediately before deployment.');
        return false;
      } else if (this.auditResults.summary.high > 0) {
        console.log('\n⚠️  HIGH PRIORITY SECURITY ISSUES FOUND!');
        console.log('   Address before production deployment.');
        return false;
      } else {
        console.log('\n🎉 Security audit completed successfully!');
        console.log('   No critical or high priority issues found.');
        return true;
      }

    } catch (error) {
      console.error(`❌ Security audit failed: ${error.message}`);
      return false;
    }
  }
}

// Run security audit if called directly
if (require.main === module) {
  const audit = new SecurityAuditSuite();
  
  audit.runCompleteAudit()
    .then((success) => {
      if (success) {
        console.log('Security audit passed!');
        process.exit(0);
      } else {
        console.log('Security audit found issues that need attention.');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error(`Security audit crashed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = SecurityAuditSuite;