#!/bin/bash

# run-tests.sh
# Script to run tests for NexVestXR platform

set -e

echo "Running tests for NexVestXR platform..."

# Run backend tests
echo "Running backend tests..."
cd backend
npm run test

# Run frontend tests
echo "Running frontend tests..."
cd ../frontend
npm run test

# Run smart contract tests
echo "Running smart contract tests..."
cd ../smart-contracts
npm run test

# Run performance tests
echo "Running performance tests..."
cd ../tests/performance
node load-test.js

echo "All tests completed successfully!"