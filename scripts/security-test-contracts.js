// NexVestXR Smart Contract Security Testing Suite
// Comprehensive security testing for XERA and PROPX token contracts

const fs = require('fs');
const path = require('path');

class SmartContractSecurityTester {
  constructor() {
    this.vulnerabilities = [];
    this.testResults = {
      reentrancy: [],
      accessControl: [],
      integerOverflow: [],
      gasOptimization: [],
      frontRunning: [],
      flashLoanAttacks: [],
      oracleManipulation: [],
      governanceAttacks: []
    };
  }

  // Main security testing function
  async runSecurityTests() {
    console.log('🔐 Smart Contract Security Testing Suite');
    console.log('========================================');

    const contractsDir = path.join(__dirname, '../smart-contracts/contracts');
    
    if (!fs.existsSync(contractsDir)) {
      console.log('❌ Smart contracts directory not found');
      return false;
    }

    // Test core contracts
    await this.testContract(path.join(contractsDir, 'XERAToken.sol'), 'XERA');
    await this.testContract(path.join(contractsDir, 'PROPXTokenFactory.sol'), 'PROPX Factory');
    
    // Test UAE-specific contracts
    const uaeDir = path.join(contractsDir, 'UAE');
    if (fs.existsSync(uaeDir)) {
      await this.testContract(path.join(uaeDir, 'UAEXERAToken.sol'), 'UAE XERA');
      await this.testContract(path.join(uaeDir, 'UAEPROPXFactory.sol'), 'UAE PROPX Factory');
      await this.testContract(path.join(uaeDir, 'UAEDualTokenClassifier.sol'), 'UAE Classifier');
    }

    this.generateSecurityReport();
    return this.vulnerabilities.length === 0;
  }

  // Test individual contract for security vulnerabilities
  async testContract(contractPath, contractName) {
    if (!fs.existsSync(contractPath)) {
      console.log(`⚠️  Contract not found: ${contractName}`);
      return;
    }

    console.log(`\n🔍 Testing ${contractName}`);
    console.log('=' .repeat(30 + contractName.length));

    const contractContent = fs.readFileSync(contractPath, 'utf8');
    
    // Run all security tests
    this.testReentrancyVulnerabilities(contractContent, contractName);
    this.testAccessControlVulnerabilities(contractContent, contractName);
    this.testIntegerOverflowVulnerabilities(contractContent, contractName);
    this.testGasOptimizationIssues(contractContent, contractName);
    this.testFrontRunningVulnerabilities(contractContent, contractName);
    this.testFlashLoanVulnerabilities(contractContent, contractName);
    this.testOracleManipulationVulnerabilities(contractContent, contractName);
    this.testGovernanceVulnerabilities(contractContent, contractName);
  }

  // Test for reentrancy vulnerabilities
  testReentrancyVulnerabilities(contractContent, contractName) {
    console.log('   🔄 Testing Reentrancy Vulnerabilities');

    const findings = [];

    // Check for external calls without reentrancy protection
    const externalCallPatterns = [
      /\.call\s*\(/g,
      /\.delegatecall\s*\(/g,
      /\.staticcall\s*\(/g,
      /\.send\s*\(/g,
      /\.transfer\s*\(/g
    ];

    let hasExternalCalls = false;
    externalCallPatterns.forEach(pattern => {
      const matches = contractContent.match(pattern);
      if (matches) {
        hasExternalCalls = true;
      }
    });

    if (hasExternalCalls) {
      // Check for reentrancy protection
      const hasReentrancyGuard = contractContent.includes('nonReentrant') ||
                                 contractContent.includes('ReentrancyGuard') ||
                                 contractContent.includes('_reentrancyGuard');

      if (!hasReentrancyGuard) {
        const vulnerability = {
          severity: 'CRITICAL',
          type: 'Reentrancy',
          contract: contractName,
          description: 'External calls without reentrancy protection',
          recommendation: 'Implement OpenZeppelin ReentrancyGuard',
          impact: 'Attackers could drain contract funds through reentrancy attacks'
        };

        findings.push(vulnerability);
        this.vulnerabilities.push(vulnerability);
        console.log('      🚨 CRITICAL: Potential reentrancy vulnerability detected');
      } else {
        console.log('      ✅ Reentrancy protection found');
      }
    } else {
      console.log('      ✅ No external calls detected');
    }

    // Check for state changes after external calls
    const functionsWithCalls = this.extractFunctionsWithExternalCalls(contractContent);
    functionsWithCalls.forEach(func => {
      if (this.hasStateChangesAfterExternalCall(func)) {
        const vulnerability = {
          severity: 'HIGH',
          type: 'Reentrancy - State Changes',
          contract: contractName,
          description: 'State changes after external calls (Checks-Effects-Interactions violation)',
          recommendation: 'Move state changes before external calls',
          impact: 'Potential for reentrancy exploitation'
        };

        findings.push(vulnerability);
        this.vulnerabilities.push(vulnerability);
        console.log('      🔴 HIGH: State changes after external calls detected');
      }
    });

    this.testResults.reentrancy = findings;
  }

  // Test for access control vulnerabilities
  testAccessControlVulnerabilities(contractContent, contractName) {
    console.log('   🔐 Testing Access Control Vulnerabilities');

    const findings = [];

    // Check for missing access controls on critical functions
    const criticalFunctions = [
      'mint', 'burn', 'transfer', 'approve', 'withdraw', 
      'setOwner', 'pause', 'unpause', 'upgrade'
    ];

    criticalFunctions.forEach(funcName => {
      const funcRegex = new RegExp(`function\\s+${funcName}\\s*\\([^)]*\\)([^{]*){`, 'g');
      const matches = contractContent.match(funcRegex);

      if (matches) {
        matches.forEach(match => {
          const hasAccessControl = match.includes('onlyOwner') ||
                                  match.includes('onlyRole') ||
                                  match.includes('onlyAdmin') ||
                                  match.includes('requireRole');

          if (!hasAccessControl) {
            const vulnerability = {
              severity: 'HIGH',
              type: 'Access Control',
              contract: contractName,
              description: `Critical function '${funcName}' lacks access control`,
              recommendation: 'Add appropriate access control modifiers',
              impact: 'Unauthorized users could call critical functions'
            };

            findings.push(vulnerability);
            this.vulnerabilities.push(vulnerability);
            console.log(`      🔴 HIGH: ${funcName} function lacks access control`);
          }
        });
      }
    });

    // Check for proper role-based access control
    const hasRBAC = contractContent.includes('AccessControl') ||
                    contractContent.includes('AccessControlEnumerable');

    if (!hasRBAC && contractContent.includes('onlyRole')) {
      const vulnerability = {
        severity: 'MEDIUM',
        type: 'Access Control',
        contract: contractName,
        description: 'Uses role-based access without importing AccessControl',
        recommendation: 'Import and use OpenZeppelin AccessControl',
        impact: 'Inconsistent access control implementation'
      };

      findings.push(vulnerability);
      this.vulnerabilities.push(vulnerability);
      console.log('      🟡 MEDIUM: Inconsistent RBAC implementation');
    }

    // Check for owner transfer security
    if (contractContent.includes('transferOwnership')) {
      if (!contractContent.includes('_checkOwner') && !contractContent.includes('onlyOwner')) {
        const vulnerability = {
          severity: 'HIGH',
          type: 'Access Control',
          contract: contractName,
          description: 'Ownership transfer without proper validation',
          recommendation: 'Use secure ownership transfer pattern',
          impact: 'Potential unauthorized ownership transfer'
        };

        findings.push(vulnerability);
        this.vulnerabilities.push(vulnerability);
        console.log('      🔴 HIGH: Insecure ownership transfer detected');
      }
    }

    if (findings.length === 0) {
      console.log('      ✅ Access control checks passed');
    }

    this.testResults.accessControl = findings;
  }

  // Test for integer overflow/underflow vulnerabilities
  testIntegerOverflowVulnerabilities(contractContent, contractName) {
    console.log('   🔢 Testing Integer Overflow/Underflow');

    const findings = [];

    // Check Solidity version
    const solidityVersionMatch = contractContent.match(/pragma\s+solidity\s+([^;]+);/);
    
    if (solidityVersionMatch) {
      const version = solidityVersionMatch[1];
      const hasVersion08 = version.includes('0.8') || version.includes('^0.8');

      if (!hasVersion08) {
        // Check for SafeMath usage
        const hasSafeMath = contractContent.includes('SafeMath') ||
                           contractContent.includes('using SafeMath');

        if (!hasSafeMath) {
          const vulnerability = {
            severity: 'CRITICAL',
            type: 'Integer Overflow',
            contract: contractName,
            description: 'No overflow protection in pre-0.8 Solidity',
            recommendation: 'Use SafeMath library or upgrade to Solidity 0.8+',
            impact: 'Arithmetic operations could overflow/underflow'
          };

          findings.push(vulnerability);
          this.vulnerabilities.push(vulnerability);
          console.log('      🚨 CRITICAL: No overflow protection detected');
        } else {
          console.log('      ✅ SafeMath usage detected');
        }
      } else {
        console.log('      ✅ Solidity 0.8+ provides built-in overflow protection');
      }
    }

    // Check for unchecked blocks in 0.8+
    const uncheckedBlocks = contractContent.match(/unchecked\s*{[^}]*}/g);
    if (uncheckedBlocks && uncheckedBlocks.length > 0) {
      const vulnerability = {
        severity: 'MEDIUM',
        type: 'Integer Overflow',
        contract: contractName,
        description: 'Unchecked arithmetic blocks detected',
        recommendation: 'Review unchecked blocks for potential overflow',
        impact: 'Arithmetic in unchecked blocks could overflow'
      };

      findings.push(vulnerability);
      this.vulnerabilities.push(vulnerability);
      console.log(`      🟡 MEDIUM: ${uncheckedBlocks.length} unchecked blocks found`);
    }

    this.testResults.integerOverflow = findings;
  }

  // Test for gas optimization issues that could lead to security problems
  testGasOptimizationIssues(contractContent, contractName) {
    console.log('   ⛽ Testing Gas Optimization Security Issues');

    const findings = [];

    // Check for loops without gas limits
    const loopPatterns = [
      /for\s*\([^)]*\)[^{]*{/g,
      /while\s*\([^)]*\)[^{]*{/g
    ];

    let hasUnboundedLoops = false;
    loopPatterns.forEach(pattern => {
      const matches = contractContent.match(pattern);
      if (matches) {
        hasUnboundedLoops = true;
      }
    });

    if (hasUnboundedLoops) {
      const vulnerability = {
        severity: 'MEDIUM',
        type: 'Gas Optimization',
        contract: contractName,
        description: 'Potentially unbounded loops detected',
        recommendation: 'Implement gas-efficient patterns and loop limits',
        impact: 'Functions could run out of gas or be expensive to execute'
      };

      findings.push(vulnerability);
      this.vulnerabilities.push(vulnerability);
      console.log('      🟡 MEDIUM: Unbounded loops detected');
    }

    // Check for large arrays operations
    if (contractContent.includes('push(') && contractContent.includes('[]')) {
      const vulnerability = {
        severity: 'LOW',
        type: 'Gas Optimization',
        contract: contractName,
        description: 'Dynamic array operations detected',
        recommendation: 'Consider gas costs for array operations',
        impact: 'Array operations could become expensive as array grows'
      };

      findings.push(vulnerability);
      this.vulnerabilities.push(vulnerability);
      console.log('      🟢 LOW: Dynamic array operations found');
    }

    if (findings.length === 0) {
      console.log('      ✅ No gas optimization issues detected');
    }

    this.testResults.gasOptimization = findings;
  }

  // Test for front-running vulnerabilities
  testFrontRunningVulnerabilities(contractContent, contractName) {
    console.log('   🏃 Testing Front-Running Vulnerabilities');

    const findings = [];

    // Check for vulnerable patterns
    const frontRunPatterns = [
      'approve', 'setPrice', 'bidding', 'auction'
    ];

    frontRunPatterns.forEach(pattern => {
      if (contractContent.includes(pattern)) {
        const vulnerability = {
          severity: 'MEDIUM',
          type: 'Front-Running',
          contract: contractName,
          description: `Function '${pattern}' may be vulnerable to front-running`,
          recommendation: 'Consider commit-reveal schemes or other MEV protection',
          impact: 'Users could be front-run by miners or other users'
        };

        findings.push(vulnerability);
        this.vulnerabilities.push(vulnerability);
        console.log(`      🟡 MEDIUM: ${pattern} function vulnerable to front-running`);
      }
    });

    // Check for timestamp dependencies
    if (contractContent.includes('block.timestamp') || contractContent.includes('now')) {
      const vulnerability = {
        severity: 'LOW',
        type: 'Front-Running',
        contract: contractName,
        description: 'Timestamp dependency detected',
        recommendation: 'Avoid relying on block.timestamp for critical logic',
        impact: 'Miners could manipulate timestamps within reasonable bounds'
      };

      findings.push(vulnerability);
      this.vulnerabilities.push(vulnerability);
      console.log('      🟢 LOW: Timestamp dependency detected');
    }

    if (findings.length === 0) {
      console.log('      ✅ No front-running vulnerabilities detected');
    }

    this.testResults.frontRunning = findings;
  }

  // Test for flash loan attack vulnerabilities
  testFlashLoanVulnerabilities(contractContent, contractName) {
    console.log('   ⚡ Testing Flash Loan Attack Vulnerabilities');

    const findings = [];

    // Check for price oracle dependencies
    if (contractContent.includes('getPrice') || contractContent.includes('oracle')) {
      const vulnerability = {
        severity: 'HIGH',
        type: 'Flash Loan Attack',
        contract: contractName,
        description: 'Price oracle dependency detected',
        recommendation: 'Use TWAP or multiple oracle sources',
        impact: 'Flash loans could manipulate prices within single transaction'
      };

      findings.push(vulnerability);
      this.vulnerabilities.push(vulnerability);
      console.log('      🔴 HIGH: Oracle manipulation vulnerability');
    }

    // Check for single-block vulnerabilities
    if (contractContent.includes('balanceOf') && contractContent.includes('totalSupply')) {
      const vulnerability = {
        severity: 'MEDIUM',
        type: 'Flash Loan Attack',
        contract: contractName,
        description: 'Token balance dependencies detected',
        recommendation: 'Avoid relying on spot balances for critical calculations',
        impact: 'Flash loans could temporarily manipulate token balances'
      };

      findings.push(vulnerability);
      this.vulnerabilities.push(vulnerability);
      console.log('      🟡 MEDIUM: Balance manipulation vulnerability');
    }

    if (findings.length === 0) {
      console.log('      ✅ No flash loan vulnerabilities detected');
    }

    this.testResults.flashLoanAttacks = findings;
  }

  // Test for oracle manipulation vulnerabilities
  testOracleManipulationVulnerabilities(contractContent, contractName) {
    console.log('   🔮 Testing Oracle Manipulation Vulnerabilities');

    const findings = [];

    // Check for single oracle dependency
    const oracleCount = (contractContent.match(/oracle/gi) || []).length;
    
    if (oracleCount > 0) {
      if (oracleCount === 1 || !contractContent.includes('chainlink')) {
        const vulnerability = {
          severity: 'HIGH',
          type: 'Oracle Manipulation',
          contract: contractName,
          description: 'Single oracle dependency detected',
          recommendation: 'Use multiple oracle sources and price aggregation',
          impact: 'Oracle manipulation could affect contract behavior'
        };

        findings.push(vulnerability);
        this.vulnerabilities.push(vulnerability);
        console.log('      🔴 HIGH: Single oracle dependency');
      }

      // Check for price staleness validation
      if (!contractContent.includes('updatedAt') && !contractContent.includes('timestamp')) {
        const vulnerability = {
          severity: 'MEDIUM',
          type: 'Oracle Manipulation',
          contract: contractName,
          description: 'No price staleness validation',
          recommendation: 'Validate oracle price freshness',
          impact: 'Stale prices could be used for calculations'
        };

        findings.push(vulnerability);
        this.vulnerabilities.push(vulnerability);
        console.log('      🟡 MEDIUM: No price staleness validation');
      }
    }

    if (findings.length === 0) {
      console.log('      ✅ No oracle manipulation vulnerabilities detected');
    }

    this.testResults.oracleManipulation = findings;
  }

  // Test for governance attack vulnerabilities
  testGovernanceVulnerabilities(contractContent, contractName) {
    console.log('   🗳️  Testing Governance Attack Vulnerabilities');

    const findings = [];

    // Check for governance functions
    if (contractContent.includes('propose') || contractContent.includes('vote')) {
      // Check for timelock
      if (!contractContent.includes('timelock') && !contractContent.includes('delay')) {
        const vulnerability = {
          severity: 'HIGH',
          type: 'Governance Attack',
          contract: contractName,
          description: 'Governance without timelock protection',
          recommendation: 'Implement timelock for governance proposals',
          impact: 'Malicious proposals could be executed immediately'
        };

        findings.push(vulnerability);
        this.vulnerabilities.push(vulnerability);
        console.log('      🔴 HIGH: No timelock protection');
      }

      // Check for quorum requirements
      if (!contractContent.includes('quorum')) {
        const vulnerability = {
          severity: 'MEDIUM',
          type: 'Governance Attack',
          contract: contractName,
          description: 'No quorum requirements detected',
          recommendation: 'Implement minimum quorum for proposals',
          impact: 'Proposals could pass with minimal participation'
        };

        findings.push(vulnerability);
        this.vulnerabilities.push(vulnerability);
        console.log('      🟡 MEDIUM: No quorum requirements');
      }
    }

    if (findings.length === 0) {
      console.log('      ✅ No governance vulnerabilities detected');
    }

    this.testResults.governanceAttacks = findings;
  }

  // Helper function to extract functions with external calls
  extractFunctionsWithExternalCalls(contractContent) {
    const functions = [];
    const funcRegex = /function\s+\w+\s*\([^)]*\)[^{]*{[^}]*}/g;
    const matches = contractContent.match(funcRegex);

    if (matches) {
      matches.forEach(func => {
        if (func.includes('.call(') || func.includes('.send(') || func.includes('.transfer(')) {
          functions.push(func);
        }
      });
    }

    return functions;
  }

  // Helper function to check for state changes after external calls
  hasStateChangesAfterExternalCall(functionContent) {
    const lines = functionContent.split('\n');
    let foundExternalCall = false;

    for (let line of lines) {
      if (line.includes('.call(') || line.includes('.send(') || line.includes('.transfer(')) {
        foundExternalCall = true;
      } else if (foundExternalCall && (line.includes('=') || line.includes('++'))) {
        return true;
      }
    }

    return false;
  }

  // Generate comprehensive security report
  generateSecurityReport() {
    console.log('\n📊 Smart Contract Security Report');
    console.log('==================================');

    const severityCounts = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0
    };

    this.vulnerabilities.forEach(vuln => {
      severityCounts[vuln.severity]++;
    });

    console.log(`🚨 Critical: ${severityCounts.CRITICAL}`);
    console.log(`🔴 High: ${severityCounts.HIGH}`);
    console.log(`🟡 Medium: ${severityCounts.MEDIUM}`);
    console.log(`🟢 Low: ${severityCounts.LOW}`);
    console.log(`📊 Total: ${this.vulnerabilities.length}`);

    if (this.vulnerabilities.length > 0) {
      console.log('\n🔍 Detailed Findings:');
      this.vulnerabilities.forEach((vuln, index) => {
        console.log(`\n   ${index + 1}. ${vuln.severity} - ${vuln.type}`);
        console.log(`      Contract: ${vuln.contract}`);
        console.log(`      Issue: ${vuln.description}`);
        console.log(`      Recommendation: ${vuln.recommendation}`);
        console.log(`      Impact: ${vuln.impact}`);
      });
    }

    // Generate security recommendations
    this.generateSecurityRecommendations();

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      platform: 'NexVestXR Smart Contracts',
      vulnerabilities: this.vulnerabilities,
      testResults: this.testResults,
      summary: severityCounts,
      recommendations: this.generateSecurityRecommendations()
    };

    const reportFile = `smart-contract-security-report-${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved: ${reportFile}`);

    return report;
  }

  // Generate security recommendations
  generateSecurityRecommendations() {
    const recommendations = [
      {
        category: 'Critical Security',
        items: [
          'Implement reentrancy guards for all external calls',
          'Use proper access control modifiers on critical functions',
          'Ensure integer overflow protection (SafeMath or Solidity 0.8+)',
          'Validate all external oracle data'
        ]
      },
      {
        category: 'Access Control',
        items: [
          'Use OpenZeppelin AccessControl for role-based permissions',
          'Implement multi-signature for critical operations',
          'Add emergency pause functionality',
          'Use timelock for governance proposals'
        ]
      },
      {
        category: 'Economic Security',
        items: [
          'Implement price manipulation protection',
          'Use time-weighted average prices (TWAP)',
          'Add slippage protection for large transactions',
          'Implement circuit breakers for unusual activity'
        ]
      },
      {
        category: 'Governance Security',
        items: [
          'Require minimum voting periods',
          'Implement quorum requirements',
          'Use delegation with vote escrow',
          'Add proposal validation mechanisms'
        ]
      },
      {
        category: 'Monitoring & Response',
        items: [
          'Implement comprehensive event logging',
          'Set up real-time monitoring systems',
          'Create incident response procedures',
          'Regular security audits and updates'
        ]
      }
    ];

    console.log('\n💡 Security Recommendations:');
    recommendations.forEach(category => {
      console.log(`\n   📋 ${category.category}:`);
      category.items.forEach(item => {
        console.log(`      • ${item}`);
      });
    });

    return recommendations;
  }
}

// Run if called directly
if (require.main === module) {
  const tester = new SmartContractSecurityTester();
  
  tester.runSecurityTests()
    .then((success) => {
      if (success) {
        console.log('\n🎉 Smart contract security tests passed!');
        process.exit(0);
      } else {
        console.log('\n⚠️  Smart contract security issues found.');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error(`Smart contract security testing failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = SmartContractSecurityTester;