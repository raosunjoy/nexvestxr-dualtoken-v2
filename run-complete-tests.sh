#!/bin/bash

# NexVestXR v2 Dual Token Platform - Complete Test Suite Runner
# This script runs comprehensive testing and validation for the entire platform

echo "🚀 NexVestXR v2 Dual Token Platform - Complete Testing & Validation"
echo "=================================================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# Function to log test results
log_test_result() {
    local test_name="$1"
    local status="$2"
    local details="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    case $status in
        "PASS")
            echo -e "${GREEN}✅ PASS${NC} - $test_name"
            PASSED_TESTS=$((PASSED_TESTS + 1))
            ;;
        "FAIL")
            echo -e "${RED}❌ FAIL${NC} - $test_name"
            if [ ! -z "$details" ]; then
                echo -e "   ${RED}Error:${NC} $details"
            fi
            FAILED_TESTS=$((FAILED_TESTS + 1))
            ;;
        "SKIP")
            echo -e "${YELLOW}⏭️  SKIP${NC} - $test_name"
            if [ ! -z "$details" ]; then
                echo -e "   ${YELLOW}Reason:${NC} $details"
            fi
            SKIPPED_TESTS=$((SKIPPED_TESTS + 1))
            ;;
    esac
}

# Function to run tests with timeout and error handling
run_test() {
    local test_name="$1"
    local test_command="$2"
    local test_dir="$3"
    local timeout_duration="${4:-120}" # Default 2 minutes
    
    echo ""
    echo -e "${BLUE}🔍 Running:${NC} $test_name"
    echo "   Command: $test_command"
    echo "   Directory: $test_dir"
    
    if [ ! -d "$test_dir" ]; then
        log_test_result "$test_name" "SKIP" "Directory not found: $test_dir"
        return
    fi
    
    cd "$test_dir"
    
    # Check if package.json exists for npm tests
    if [[ $test_command == npm* ]] && [ ! -f "package.json" ]; then
        log_test_result "$test_name" "SKIP" "package.json not found"
        cd - > /dev/null
        return
    fi
    
    # Check if node_modules exists for npm tests
    if [[ $test_command == npm* ]] && [ ! -d "node_modules" ]; then
        echo "   Installing dependencies..."
        timeout 300 npm install > /dev/null 2>&1
        if [ $? -ne 0 ]; then
            log_test_result "$test_name" "FAIL" "Failed to install dependencies"
            cd - > /dev/null
            return
        fi
    fi
    
    # Run the test with timeout
    timeout $timeout_duration $test_command > /tmp/test_output.log 2>&1
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        log_test_result "$test_name" "PASS"
        # Show summary of successful test output
        local test_summary=$(tail -5 /tmp/test_output.log | grep -E "(passing|failing|Tests:|Test Suites:)" | head -2)
        if [ ! -z "$test_summary" ]; then
            echo -e "   ${GREEN}Summary:${NC} $test_summary"
        fi
    elif [ $exit_code -eq 124 ]; then
        log_test_result "$test_name" "FAIL" "Test timed out after ${timeout_duration}s"
    else
        local error_details=$(tail -3 /tmp/test_output.log | head -1)
        log_test_result "$test_name" "FAIL" "$error_details"
    fi
    
    cd - > /dev/null
}

# Function to check system prerequisites
check_prerequisites() {
    echo -e "${BLUE}🔧 Checking Prerequisites${NC}"
    echo "========================"
    
    # Check Node.js
    if command -v node > /dev/null 2>&1; then
        local node_version=$(node --version)
        echo -e "${GREEN}✅${NC} Node.js: $node_version"
    else
        echo -e "${RED}❌${NC} Node.js not found"
        exit 1
    fi
    
    # Check npm
    if command -v npm > /dev/null 2>&1; then
        local npm_version=$(npm --version)
        echo -e "${GREEN}✅${NC} npm: v$npm_version"
    else
        echo -e "${RED}❌${NC} npm not found"
        exit 1
    fi
    
    # Check Python (for AI service)
    if command -v python3 > /dev/null 2>&1; then
        local python_version=$(python3 --version)
        echo -e "${GREEN}✅${NC} Python: $python_version"
    else
        echo -e "${YELLOW}⚠️${NC} Python3 not found (AI service tests will be skipped)"
    fi
    
    # Check Docker (for container tests)
    if command -v docker > /dev/null 2>&1; then
        echo -e "${GREEN}✅${NC} Docker: Available"
    else
        echo -e "${YELLOW}⚠️${NC} Docker not found (container tests will be skipped)"
    fi
    
    echo ""
}

# Function to generate test report
generate_report() {
    echo ""
    echo "📊 Test Execution Summary"
    echo "========================"
    echo -e "Total Tests:   ${BLUE}$TOTAL_TESTS${NC}"
    echo -e "Passed:        ${GREEN}$PASSED_TESTS${NC}"
    echo -e "Failed:        ${RED}$FAILED_TESTS${NC}"
    echo -e "Skipped:       ${YELLOW}$SKIPPED_TESTS${NC}"
    
    local success_rate=0
    if [ $TOTAL_TESTS -gt 0 ]; then
        success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    fi
    echo -e "Success Rate:  ${BLUE}$success_rate%${NC}"
    
    echo ""
    echo "📋 Detailed Results"
    echo "==================="
    
    # Save results to file
    local report_file="test-execution-report-$(date +%Y%m%d-%H%M%S).md"
    cat > "$report_file" << EOF
# NexVestXR v2 Test Execution Report

**Date:** $(date)  
**Platform Version:** v2.0.0  

## Summary
- **Total Tests:** $TOTAL_TESTS
- **Passed:** $PASSED_TESTS
- **Failed:** $FAILED_TESTS  
- **Skipped:** $SKIPPED_TESTS
- **Success Rate:** $success_rate%

## Component Status
EOF
    
    echo -e "${GREEN}✅${NC} Test report saved: $report_file"
    
    # Overall status
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "\n${GREEN}🎉 ALL TESTS COMPLETED SUCCESSFULLY!${NC}"
        return 0
    else
        echo -e "\n${RED}⚠️  SOME TESTS FAILED - REVIEW REQUIRED${NC}"
        return 1
    fi
}

# Main testing execution
main() {
    local start_time=$(date +%s)
    
    # Get current directory
    local root_dir=$(pwd)
    echo "Working Directory: $root_dir"
    echo ""
    
    # Check prerequisites
    check_prerequisites
    
    echo -e "${BLUE}🧪 Starting Comprehensive Test Suite${NC}"
    echo "====================================="
    
    # 1. Smart Contract Tests
    echo -e "\n${YELLOW}📜 Smart Contract Tests${NC}"
    echo "======================="
    run_test "Smart Contract Compilation" "npm run compile" "$root_dir/smart-contracts" 60
    run_test "Smart Contract Unit Tests" "npm test" "$root_dir/smart-contracts" 180
    run_test "Smart Contract Coverage" "npm run coverage" "$root_dir/smart-contracts" 300
    
    # 2. Backend API Tests
    echo -e "\n${YELLOW}🔧 Backend API Tests${NC}"
    echo "==================="
    run_test "Backend Unit Tests" "npm run test:unit" "$root_dir/backend" 120
    run_test "Backend Integration Tests" "npm run test:integration" "$root_dir/backend" 180
    run_test "Backend API Coverage" "npm run test:coverage" "$root_dir/backend" 240
    
    # 3. Frontend Tests
    echo -e "\n${YELLOW}🎨 Frontend Tests${NC}"
    echo "================="
    run_test "Frontend Component Tests" "npm test -- --watchAll=false" "$root_dir/frontend" 180
    run_test "Frontend Build Test" "npm run build" "$root_dir/frontend" 300
    
    # 4. Mobile App Tests
    echo -e "\n${YELLOW}📱 Mobile App Tests${NC}"
    echo "==================="
    run_test "Mobile Unit Tests" "npm test" "$root_dir/mobile" 120
    run_test "Mobile Build Test (Android)" "cd android && ./gradlew assembleDebug" "$root_dir/mobile" 600
    
    # 5. AI Service Tests
    echo -e "\n${YELLOW}🤖 AI Service Tests${NC}"
    echo "==================="
    if command -v python3 > /dev/null 2>&1; then
        run_test "AI Service Unit Tests" "python3 -m pytest tests/" "$root_dir/ai-service" 120
        run_test "AI Model Validation" "python3 -c \"import app; app.test_models()\"" "$root_dir/ai-service" 60
    else
        log_test_result "AI Service Tests" "SKIP" "Python3 not available"
    fi
    
    # 6. Integration Tests
    echo -e "\n${YELLOW}🔗 Integration Tests${NC}"
    echo "===================="
    run_test "API Integration Tests" "npm run test:integration" "$root_dir/tests" 240
    run_test "End-to-End Tests" "npm run test:e2e" "$root_dir/tests" 300
    run_test "User Journey Tests" "npm run test:flows" "$root_dir/tests" 180
    
    # 7. Performance Tests
    echo -e "\n${YELLOW}⚡ Performance Tests${NC}"
    echo "===================="
    run_test "Load Testing" "npm run test:load" "$root_dir/tests" 600
    run_test "Stress Testing" "npm run test:stress" "$root_dir/tests" 900
    run_test "Performance Benchmarks" "npm run benchmark" "$root_dir/tests" 300
    
    # 8. Security Tests
    echo -e "\n${YELLOW}🛡️  Security Tests${NC}"
    echo "==================="
    run_test "API Security Tests" "npm run test:security:api" "$root_dir/tests" 180
    run_test "Smart Contract Security" "npm run test:security:smart-contracts" "$root_dir/tests" 240
    
    # 9. Admin Dashboard Tests
    echo -e "\n${YELLOW}🖥️  Admin Dashboard Tests${NC}"
    echo "=========================="
    run_test "Admin Dashboard Tests" "npm test -- --watchAll=false" "$root_dir/web" 120
    run_test "Admin Dashboard Build" "npm run build" "$root_dir/web" 180
    
    # Calculate total execution time
    local end_time=$(date +%s)
    local execution_time=$((end_time - start_time))
    local execution_minutes=$((execution_time / 60))
    local execution_seconds=$((execution_time % 60))
    
    echo ""
    echo -e "${BLUE}⏱️  Total Execution Time: ${execution_minutes}m ${execution_seconds}s${NC}"
    
    # Generate final report
    generate_report
}

# Trap to ensure cleanup on exit
trap 'echo -e "\n${YELLOW}Test execution interrupted${NC}"; exit 1' INT TERM

# Run main function
main "$@"