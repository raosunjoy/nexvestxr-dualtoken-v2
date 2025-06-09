#!/bin/bash

# Deploy the complete NexVestXR application stack
echo "Starting deployment of NexVestXR..."

# Build Docker images
docker-compose -f docker-compose.yml build

# Deploy the stack
docker-compose -f docker-compose.yml up -d

# Run migrations and seed data
docker exec nexvestxr-backend npm run migrate
docker exec nexvestxr-backend npm run seed

# Train AI model
docker exec nexvestxr-ai-service python train_model.py

echo "Deployment completed successfully!"