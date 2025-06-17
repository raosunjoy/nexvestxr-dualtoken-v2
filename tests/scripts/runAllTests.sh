#!/bin/bash

# =============================================================================
# NexVestXR UAE Platform - Comprehensive Test Runner
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
PARALLEL_JOBS=4
TIMEOUT=300  # 5 minutes per test suite
TEST_ENV="test"

echo -e "${BLUE}🧪 NexVestXR UAE Platform - Comprehensive Test Suite${NC}"
echo -e "${BLUE}====================================================${NC}"
echo ""

# Function to print section headers
print_section() {
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}$(printf '=%.0s' {1..50})${NC}"
}

# Function to run test with timeout and error handling
run_test_suite() {
    local suite_name="$1"
    local test_command="$2"
    local start_time=$(date +%s)
    
    echo -e "${YELLOW}▶ Running $suite_name...${NC}"
    
    if timeout $TIMEOUT $test_command; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        echo -e "${GREEN}✅ $suite_name completed in ${duration}s${NC}"
        return 0
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        echo -e "${RED}❌ $suite_name failed after ${duration}s${NC}"
        return 1
    fi
}

# Initialize test results tracking
TOTAL_SUITES=0
PASSED_SUITES=0
FAILED_SUITES=0
START_TIME=$(date +%s)

# Create test reports directory
mkdir -p reports

echo -e "${YELLOW}🔧 Pre-test Setup${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Set environment variables
export NODE_ENV=test
export LOG_LEVEL=error
export DISABLE_NOTIFICATIONS=true
export MOCK_EXTERNAL_SERVICES=true

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt "18" ]; then
    echo -e "${RED}❌ Node.js version 18+ required (found v$NODE_VERSION)${NC}"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check MongoDB
if ! command -v mongod &> /dev/null; then
    echo -e "${YELLOW}⚠️  MongoDB not found in PATH, using in-memory database${NC}"
    export USE_MEMORY_DB=true
else
    echo "✅ MongoDB available"
fi

# Check Redis (optional)
if ! command -v redis-server &> /dev/null; then
    echo -e "${YELLOW}⚠️  Redis not found in PATH, using mock Redis${NC}"
    export MOCK_REDIS=true
else
    echo "✅ Redis available"
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing test dependencies..."
    npm install --silent
fi

echo ""

# =============================================================================
# UNIT TESTS
# =============================================================================
print_section "🔬 Unit Tests"

echo "Testing individual components and services..."

TOTAL_SUITES=$((TOTAL_SUITES + 1))
if run_test_suite "Currency Service Tests" "npm run test:unit -- tests/unit/services/currencyService.test.js"; then
    PASSED_SUITES=$((PASSED_SUITES + 1))
else
    FAILED_SUITES=$((FAILED_SUITES + 1))
fi

TOTAL_SUITES=$((TOTAL_SUITES + 1))
if run_test_suite "KYC Service Tests" "npm run test:unit -- tests/unit/services/kycService.test.js"; then
    PASSED_SUITES=$((PASSED_SUITES + 1))
else
    FAILED_SUITES=$((FAILED_SUITES + 1))
fi

TOTAL_SUITES=$((TOTAL_SUITES + 1))
if run_test_suite "Property Model Tests" "npm run test:unit -- tests/unit/models/"; then
    PASSED_SUITES=$((PASSED_SUITES + 1))
else
    FAILED_SUITES=$((FAILED_SUITES + 1))
fi

echo ""

# =============================================================================
# INTEGRATION TESTS
# =============================================================================
print_section "🔗 Integration Tests"

echo "Testing API endpoints and service integration..."

TOTAL_SUITES=$((TOTAL_SUITES + 1))
if run_test_suite "UAE API Routes" "npm run test:integration -- tests/integration/api/uaeRoutes.test.js"; then
    PASSED_SUITES=$((PASSED_SUITES + 1))
else
    FAILED_SUITES=$((FAILED_SUITES + 1))
fi

TOTAL_SUITES=$((TOTAL_SUITES + 1))
if run_test_suite "Authentication Flow" "npm run test:integration -- tests/integration/auth/"; then
    PASSED_SUITES=$((PASSED_SUITES + 1))
else
    FAILED_SUITES=$((FAILED_SUITES + 1))
fi

TOTAL_SUITES=$((TOTAL_SUITES + 1))
if run_test_suite "Database Integration" "npm run test:integration -- tests/integration/database/"; then
    PASSED_SUITES=$((PASSED_SUITES + 1))
else
    FAILED_SUITES=$((FAILED_SUITES + 1))
fi

echo ""

# =============================================================================
# SMART CONTRACT TESTS
# =============================================================================
print_section "⛓️  Smart Contract Tests"

echo "Testing UAE property tokenization contracts..."

# Check if Hardhat is available
if command -v npx hardhat &> /dev/null; then
    TOTAL_SUITES=$((TOTAL_SUITES + 1))
    if run_test_suite "UAE Property Token Contract" "cd ../smart-contracts && npx hardhat test tests/UAEPropertyToken.test.js"; then
        PASSED_SUITES=$((PASSED_SUITES + 1))
    else
        FAILED_SUITES=$((FAILED_SUITES + 1))
    fi

    TOTAL_SUITES=$((TOTAL_SUITES + 1))
    if run_test_suite "UAE Compliance Contract" "cd ../smart-contracts && npx hardhat test tests/UAECompliance.test.js"; then
        PASSED_SUITES=$((PASSED_SUITES + 1))
    else
        FAILED_SUITES=$((FAILED_SUITES + 1))
    fi
else
    echo -e "${YELLOW}⚠️  Hardhat not available, skipping smart contract tests${NC}"
fi

echo ""

# =============================================================================
# USER FLOW TESTS
# =============================================================================
print_section "👤 User Flow Tests"

echo "Testing complete user journeys..."

TOTAL_SUITES=$((TOTAL_SUITES + 1))
if run_test_suite "User Registration & KYC Journey" "npm run test -- tests/flows/userJourney.test.js --testNamePattern='Complete User Investment Journey'"; then
    PASSED_SUITES=$((PASSED_SUITES + 1))
else
    FAILED_SUITES=$((FAILED_SUITES + 1))
fi

TOTAL_SUITES=$((TOTAL_SUITES + 1))
if run_test_suite "Investment Flow Tests" "npm run test -- tests/flows/userJourney.test.js --testNamePattern='premium investor'"; then
    PASSED_SUITES=$((PASSED_SUITES + 1))
else
    FAILED_SUITES=$((FAILED_SUITES + 1))
fi

echo ""

# =============================================================================
# PERFORMANCE TESTS
# =============================================================================
print_section "⚡ Performance Tests"

echo "Testing system performance and load handling..."

TOTAL_SUITES=$((TOTAL_SUITES + 1))
if run_test_suite "API Load Tests" "npm run test:performance -- tests/performance/loadTest.js"; then
    PASSED_SUITES=$((PASSED_SUITES + 1))
else
    FAILED_SUITES=$((FAILED_SUITES + 1))
fi

TOTAL_SUITES=$((TOTAL_SUITES + 1))
if run_test_suite "Database Performance" "npm run test -- tests/performance/database.test.js"; then
    PASSED_SUITES=$((PASSED_SUITES + 1))
else
    FAILED_SUITES=$((FAILED_SUITES + 1))
fi

echo ""

# =============================================================================
# SECURITY TESTS
# =============================================================================
print_section "🔒 Security Tests"

echo "Testing security measures and vulnerability scanning..."

TOTAL_SUITES=$((TOTAL_SUITES + 1))
if run_test_suite "API Security Tests" "npm run test -- tests/security/apiSecurity.test.js"; then
    PASSED_SUITES=$((PASSED_SUITES + 1))
else
    FAILED_SUITES=$((FAILED_SUITES + 1))
fi

TOTAL_SUITES=$((TOTAL_SUITES + 1))
if run_test_suite "Authentication Security" "npm run test -- tests/security/authSecurity.test.js"; then
    PASSED_SUITES=$((PASSED_SUITES + 1))
else
    FAILED_SUITES=$((FAILED_SUITES + 1))
fi

# Static security analysis
if command -v npm audit &> /dev/null; then
    TOTAL_SUITES=$((TOTAL_SUITES + 1))
    if run_test_suite "NPM Security Audit" "npm audit --audit-level=moderate"; then
        PASSED_SUITES=$((PASSED_SUITES + 1))
    else
        FAILED_SUITES=$((FAILED_SUITES + 1))
    fi
fi

echo ""

# =============================================================================
# MOBILE TESTS (if React Native setup available)
# =============================================================================
if [ -d "../mobile" ] && [ -f "../mobile/package.json" ]; then
    print_section "📱 Mobile Tests"
    
    echo "Testing React Native mobile application..."
    
    TOTAL_SUITES=$((TOTAL_SUITES + 1))
    if run_test_suite "Mobile Component Tests" "cd ../mobile && npm test -- --watchAll=false"; then
        PASSED_SUITES=$((PASSED_SUITES + 1))
    else
        FAILED_SUITES=$((FAILED_SUITES + 1))
    fi
    
    echo ""
fi

# =============================================================================
# E2E TESTS (if Playwright/Cypress available)
# =============================================================================
if command -v npx playwright &> /dev/null || command -v npx cypress &> /dev/null; then
    print_section "🌐 End-to-End Tests"
    
    echo "Testing complete application workflows..."
    
    TOTAL_SUITES=$((TOTAL_SUITES + 1))
    if run_test_suite "E2E User Workflows" "npm run test:e2e"; then
        PASSED_SUITES=$((PASSED_SUITES + 1))
    else
        FAILED_SUITES=$((FAILED_SUITES + 1))
    fi
    
    echo ""
fi

# =============================================================================
# COVERAGE REPORT
# =============================================================================
print_section "📊 Coverage Report"

echo "Generating comprehensive test coverage report..."

if run_test_suite "Coverage Analysis" "npm run test:coverage -- --silent"; then
    echo "✅ Coverage report generated at coverage/lcov-report/index.html"
else
    echo -e "${YELLOW}⚠️  Coverage report generation failed${NC}"
fi

echo ""

# =============================================================================
# FINAL RESULTS
# =============================================================================
END_TIME=$(date +%s)
TOTAL_DURATION=$((END_TIME - START_TIME))

print_section "🎯 Test Results Summary"

echo ""
echo -e "${BLUE}📈 Test Execution Summary:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "Total Test Suites: ${TOTAL_SUITES}"
echo -e "Passed: ${GREEN}${PASSED_SUITES}${NC}"
echo -e "Failed: ${RED}${FAILED_SUITES}${NC}"
echo -e "Success Rate: $(( PASSED_SUITES * 100 / TOTAL_SUITES ))%"
echo -e "Total Duration: ${TOTAL_DURATION}s"
echo ""

if [ $FAILED_SUITES -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! The UAE platform is ready for deployment.${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "• Review coverage report: open coverage/lcov-report/index.html"
    echo "• Check performance report: open tests/reports/performance-report.html"
    echo "• Deploy to staging environment"
    echo "• Run production readiness checklist"
    
    exit 0
else
    echo -e "${RED}❌ $FAILED_SUITES test suite(s) failed. Please review and fix issues before deployment.${NC}"
    echo ""
    echo -e "${BLUE}Troubleshooting:${NC}"
    echo "• Check individual test logs above for specific failures"
    echo "• Review test reports in tests/reports/ directory"
    echo "• Ensure all dependencies are properly installed"
    echo "• Verify test environment configuration"
    
    exit 1
fi