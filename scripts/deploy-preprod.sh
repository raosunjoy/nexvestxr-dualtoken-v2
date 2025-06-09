#!/bin/bash

set -e  # Exit on any error

# Store the base directory
BASE_DIR=$(pwd)
echo "Starting deployment from: $BASE_DIR"

# Function to cleanup on exit
cleanup() {
    echo "Cleaning up..."
    docker compose -f docker-compose.preprod.yaml down --remove-orphans || true
}
trap cleanup EXIT

# Create required directories
mkdir -p logs/{backend,frontend,nginx,ai-service}
mkdir -p uploads

# Remove existing images to ensure fresh builds
echo "Removing existing images..."
docker rmi nexvestxr-backend:preprod || true
docker rmi nexvestxr-frontend:preprod || true
docker rmi nexvestxr-ai-service:preprod || true

# Prune unused Docker resources
echo "Cleaning up Docker resources..."
docker system prune -f

# Build and tag images for preprod
echo "Building and tagging images for preprod..."

# Build backend
echo "Building backend image..."
cd "$BASE_DIR/backend"
docker build -t nexvestxr-backend:preprod -f Dockerfile.dev --no-cache .
if [ $? -ne 0 ]; then
    echo "Backend build failed!"
    exit 1
fi
echo "Backend image built successfully!"

# Build frontend
echo "Building frontend image..."
cd "$BASE_DIR/frontend"
docker build -t nexvestxr-frontend:preprod -f Dockerfile.dev --no-cache .
if [ $? -ne 0 ]; then
    echo "Frontend build failed!"
    exit 1
fi
echo "Frontend image built successfully!"

# Build AI service
echo "Building AI service image..."
cd "$BASE_DIR/ai-service"
docker build -t nexvestxr-ai-service:preprod -f Dockerfile --no-cache .
if [ $? -ne 0 ]; then
    echo "AI service build failed!"
    exit 1
fi
echo "AI service image built successfully!"

# Verify all images are available
echo "Verifying built images..."
cd "$BASE_DIR"
BACKEND_IMAGE=$(docker images | grep nexvestxr-backend:preprod)
FRONTEND_IMAGE=$(docker images | grep nexvestxr-frontend:preprod)
AI_IMAGE=$(docker images | grep nexvestxr-ai-service:preprod)

if [ -z "$BACKEND_IMAGE" ] || [ -z "$FRONTEND_IMAGE" ] || [ -z "$AI_IMAGE" ]; then
    echo "Some images are missing! Build verification failed."
    echo "Backend: $BACKEND_IMAGE"
    echo "Frontend: $FRONTEND_IMAGE"
    echo "AI Service: $AI_IMAGE"
    exit 1
fi

# Deploy using docker-compose.preprod.yml
echo "Deploying services in preprod environment..."
docker compose -f docker-compose.preprod.yaml down --remove-orphans || true

# Wait a moment for cleanup
sleep 5

# Start services with proper ordering
echo "Starting infrastructure services first..."
docker compose -f docker-compose.preprod.yaml up -d mongo1 redis

# Wait for infrastructure to be ready
echo "Waiting for infrastructure services to be ready..."
sleep 30

# Start application services
echo "Starting application services..."
docker compose -f docker-compose.preprod.yaml up -d ai-service nexvestxr-backend nexvestxr-frontend

# Wait for application services
sleep 20

# Start nginx last
echo "Starting nginx proxy..."
docker compose -f docker-compose.preprod.yaml up -d nginx

if [ $? -eq 0 ]; then
    echo "Pre-production deployment completed successfully!"
    echo "Checking service status..."
    docker compose -f docker-compose.preprod.yaml ps
    echo "Checking service health..."
    docker compose -f docker-compose.preprod.yaml logs --tail=10
else
    echo "Deployment failed!"
    docker compose -f docker-compose.preprod.yaml logs
    exit 1
fi

# Remove the cleanup trap since deployment succeeded
trap - EXIT

