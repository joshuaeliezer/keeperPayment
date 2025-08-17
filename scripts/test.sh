#!/bin/bash

# Test script for Keeper Payment application
# This script runs all tests and generates coverage reports

set -e

echo "🧪 Running Keeper Payment Tests"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# Create coverage directory
mkdir -p coverage

print_status "Running unit tests with coverage..."
npm run test:cov

print_status "Running e2e tests..."
npm run test:e2e

print_status "Running all tests..."
npm test

print_success "All tests completed successfully!"

# Generate coverage summary
if [ -f "coverage/lcov-report/index.html" ]; then
    print_success "Coverage report generated at: coverage/lcov-report/index.html"
    
    # Extract coverage percentage
    COVERAGE=$(grep -o '[0-9.]*%' coverage/lcov-report/index.html | head -1)
    print_status "Overall coverage: $COVERAGE"
    
    # Check if coverage is above threshold
    COVERAGE_NUM=$(echo $COVERAGE | sed 's/%//')
    if (( $(echo "$COVERAGE_NUM >= 80" | bc -l) )); then
        print_success "Coverage is above 80% threshold"
    else
        print_warning "Coverage is below 80% threshold"
    fi
fi

print_status "Test execution completed!"
echo "================================"
