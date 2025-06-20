# NexVestXR v2 Deployment Architecture & DevOps Guide

## Overview

This comprehensive guide covers the complete deployment architecture and operational procedures for the NexVestXR v2 dual token platform. The platform utilizes a modern, scalable infrastructure deployed on AWS with robust CI/CD pipelines, containerization, and comprehensive monitoring.

## Table of Contents

1. [Deployment Architecture Overview](#deployment-architecture-overview)
2. [Local Development Setup](#local-development-setup)
3. [AWS Production Infrastructure](#aws-production-infrastructure)
4. [CI/CD Pipeline Configuration](#cicd-pipeline-configuration)
5. [Containerization Strategy](#containerization-strategy)
6. [Monitoring & Observability](#monitoring--observability)
7. [Security & Compliance](#security--compliance)
8. [Backup & Disaster Recovery](#backup--disaster-recovery)
9. [Performance Optimization](#performance-optimization)
10. [Troubleshooting Procedures](#troubleshooting-procedures)
11. [Cost Optimization Strategies](#cost-optimization-strategies)

---

## Deployment Architecture Overview

### System Architecture

The NexVestXR v2 platform employs a **microservices architecture** with the following core components:

```
┌─────────────────────────────────────────────────────────────┐
│                     CloudFront CDN                          │
├─────────────────────────────────────────────────────────────┤
│                   Application Load Balancer                 │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Frontend  │  │   Backend   │  │ AI Service  │         │
│  │   (React)   │  │  (Node.js)  │  │  (Python)   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ PostgreSQL  │  │    Redis    │  │     S3      │         │
│  │  Database   │  │    Cache    │  │   Storage   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Deployment Environments

| Environment | Purpose | URL | Infrastructure |
|-------------|---------|-----|----------------|
| **Development** | Local development | localhost:3000 | Docker Compose |
| **Staging** | Pre-production testing | staging.nexvestxr.com | AWS ECS (Single AZ) |
| **Production** | Live platform | nexvestxr.com | AWS ECS (Multi-AZ) |

### Technology Stack

- **Frontend**: React.js, TypeScript, Material-UI
- **Backend**: Node.js, Express.js, TypeScript
- **AI Service**: Python, Flask, TensorFlow
- **Mobile**: React Native (iOS/Android)
- **Database**: PostgreSQL (AWS RDS)
- **Cache**: Redis (AWS ElastiCache)
- **Storage**: AWS S3
- **Orchestration**: AWS ECS Fargate
- **Monitoring**: Prometheus, Grafana, CloudWatch
- **CI/CD**: GitHub Actions, AWS CodePipeline

---

## Local Development Setup

### Prerequisites

- Docker & Docker Compose
- Node.js 18+
- Python 3.9+
- Git

### Quick Start

```bash
# Clone the repository
git clone https://github.com/your-org/nexvestxr-v2-dual-token.git
cd nexvestxr-v2-dual-token

# Start all services
docker-compose up -d

# Verify services are running
docker-compose ps

# View logs
docker-compose logs -f
```

### Local Service Configuration

The `docker-compose.yml` file defines the following services:

#### Core Services

```yaml
services:
  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    ports: ["80:80"]
    volumes:
      - ./infrastructure/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./infrastructure/nginx/sites-available/nexvestxr.conf:/etc/nginx/conf.d/default.conf

  # Backend Service
  nexvestxr-backend:
    image: nexvestxr-backend:latest
    ports: ["3000:3000"]
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
      - AI_SERVICE_URL=http://ai-service:5000

  # Frontend Service  
  nexvestxr-frontend:
    image: nexvestxr-frontend:latest
    ports: ["3001:80"]

  # AI Service
  ai-service:
    image: nexvestxr-ai-service:latest
    ports: ["5000:5000"]
```

#### Data Services

```yaml
  # MongoDB
  mongo:
    image: mongo:5.0
    ports: ["27017:27017"]
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD:-admin123}

  # Redis Cache
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  # Prometheus Monitoring
  prometheus:
    image: prom/prometheus:latest
    ports: ["9090:9090"]
    volumes:
      - ./infrastructure/prometheus:/etc/prometheus

  # Grafana Dashboard
  grafana:
    image: grafana/grafana:latest
    ports: ["3002:3000"]
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:-admin123}
```

### Environment Variables

Create a `.env` file with the following variables:

```bash
# Database Configuration
MONGO_URI=mongodb://admin:admin123@mongo:27017/nexvestxr
MONGO_ROOT_PASSWORD=admin123

# Blockchain Configuration
XRPL_SERVER=wss://s.altnet.rippletest.net:51233
XUMM_API_KEY=your_xumm_api_key
XUMM_API_SECRET=your_xumm_api_secret
FLARE_RPC_URL=https://flare-api.flare.network/ext/C/rpc

# Payment Integration
STRIPE_API_KEY=your_stripe_key
MOONPAY_API_KEY=your_moonpay_key

# Security
JWT_SECRET=your_jwt_secret_here

# Monitoring
GRAFANA_ADMIN_PASSWORD=admin123
```

### Development Workflow

1. **Start Services**: `docker-compose up -d`
2. **View Logs**: `docker-compose logs -f [service_name]`
3. **Run Tests**: `docker-compose exec nexvestxr-backend npm test`
4. **Hot Reload**: Mount source code for development
5. **Stop Services**: `docker-compose down`

---

## AWS Production Infrastructure

### Infrastructure Components

The production infrastructure is deployed using **AWS CloudFormation** with the following components:

#### Networking

```yaml
# VPC Configuration
VPC: 10.0.0.0/16
Public Subnets: 
  - 10.0.1.0/24 (AZ-1)
  - 10.0.2.0/24 (AZ-2)
Private Subnets:
  - 10.0.11.0/24 (AZ-1) 
  - 10.0.12.0/24 (AZ-2)
Database Subnets:
  - 10.0.21.0/24 (AZ-1)
  - 10.0.22.0/24 (AZ-2)
```

#### Compute

- **ECS Cluster**: Fargate with auto-scaling
- **Application Load Balancer**: Internet-facing with HTTPS
- **CloudFront**: Global CDN distribution
- **WAF**: Web application firewall protection

#### Database & Storage

- **RDS PostgreSQL**: Multi-AZ deployment with encryption
- **ElastiCache Redis**: Cluster mode with failover
- **S3 Buckets**: Versioned with lifecycle policies
- **Secrets Manager**: Encrypted secrets storage

### Deployment Script

The infrastructure deployment is automated using the `deploy.sh` script:

```bash
#!/bin/bash
# AWS Deployment Script

# Configuration
AWS_REGION="us-east-1"
ENVIRONMENT="production"
STACK_NAME="${ENVIRONMENT}-nexvestxr-infrastructure"

# Deploy infrastructure
./aws-infrastructure/scripts/deploy.sh deploy

# Deploy specific components
./aws-infrastructure/scripts/deploy.sh infrastructure  # CloudFormation only
./aws-infrastructure/scripts/deploy.sh build          # Docker images only
./aws-infrastructure/scripts/deploy.sh services       # ECS services only
```

### CloudFormation Template Structure

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'NexVestXR v2 Dual Token Platform - Production Infrastructure'

Parameters:
  Environment: [staging, production]
  VpcCidr: 10.0.0.0/16
  DatabasePassword: (SecureString)
  RedisAuthToken: (SecureString)
  CertificateArn: (SSL Certificate)

Resources:
  # Networking
  VPC, Subnets, Route Tables, NAT Gateways
  
  # Security
  Security Groups, IAM Roles, WAF
  
  # Compute
  ECS Cluster, ALB, CloudFront
  
  # Database
  RDS PostgreSQL, ElastiCache Redis
  
  # Storage
  S3 Buckets, Secrets Manager

Outputs:
  VPCId, DatabaseEndpoint, RedisEndpoint, LoadBalancerDNS
```

### ECS Task Definitions

#### Backend Service

```json
{
  "family": "nexvestxr-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [{
    "name": "nexvestxr-backend",
    "image": "${ECR_REPOSITORY_URI}:backend-latest",
    "portMappings": [{"containerPort": 8080}],
    "environment": [
      {"name": "NODE_ENV", "value": "production"},
      {"name": "PORT", "value": "8080"}
    ],
    "secrets": [
      {"name": "DATABASE_URL", "valueFrom": "${DATABASE_SECRET_ARN}"},
      {"name": "REDIS_URL", "valueFrom": "${REDIS_SECRET_ARN}"},
      {"name": "JWT_SECRET", "valueFrom": "${JWT_SECRET_ARN}"}
    ],
    "healthCheck": {
      "command": ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"],
      "interval": 30,
      "timeout": 5,
      "retries": 3
    }
  }]
}
```

---

## CI/CD Pipeline Configuration

### GitHub Actions Workflows

The platform uses **GitHub Actions** for comprehensive CI/CD with multiple workflows:

#### 1. Main CI/CD Pipeline (`ci-cd.yml`)

```yaml
name: 🚀 NexVestXR CI/CD Pipeline

on:
  push: [master, main, develop]
  pull_request: [master, main, develop]
  schedule: ['0 2 * * *']  # Daily tests

jobs:
  # Multi-environment testing matrix
  multi-env-tests:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: ['16', '18', '20']

  # Code quality & security scanning
  code-quality:
    runs-on: ubuntu-latest
    steps:
      - ESLint analysis
      - Security audit (npm audit, Snyk, TruffleHog)
      - License compliance check

  # Service-specific testing
  test-backend: # Node.js backend with MongoDB/Redis
  test-frontend: # React frontend 
  test-web: # Web application
  test-smart-contracts: # Dual token system
  test-ai-service: # Python AI service
  test-mobile-integration: # React Native mobile

  # Integration & E2E testing
  integration-tests:
    needs: [test-backend, test-frontend, test-web, test-smart-contracts]
    steps:
      - Docker Compose service startup
      - API integration testing
      - Browser compatibility testing (Playwright)
      - Mobile API integration testing

  # Mobile UI testing
  mobile-ui-tests:
    runs-on: macos-latest
    steps:
      - iOS E2E testing with Detox
      - Android simulation testing

  # Security & performance analysis
  security-performance:
    steps:
      - Lighthouse CI performance testing
      - Security vulnerability scanning
      - Service accessibility checks

  # Build and deploy
  build-and-push:
    needs: [integration-tests, security-performance]
    if: github.ref == 'refs/heads/main'
    steps:
      - Multi-platform Docker builds (linux/amd64, linux/arm64)
      - Container registry push
      - GitHub release creation
```

#### 2. Production Deployment (`deploy.yml`)

```yaml
name: 🚀 Production Deployment

on:
  push: [master, main]
  tags: ['v*']
  workflow_dispatch:
    inputs:
      environment: [staging, production]
      force_deploy: boolean

jobs:
  # Pre-deployment validation
  pre-deployment-checks:
    outputs:
      should_deploy: boolean
      environment: string

  # Staging deployment
  deploy-staging:
    if: environment == 'staging'
    environment:
      name: staging
      url: https://staging.nexvestxr.com
    steps:
      - Smart contract deployment (testnet)
      - Docker image builds
      - ECS service deployment
      - Health checks and smoke tests

  # Production deployment  
  deploy-production:
    if: environment == 'production'
    environment:
      name: production
      url: https://nexvestxr.com
    steps:
      - Smart contract deployment (mainnet)
      - Database backup creation
      - Rolling deployment with zero downtime
      - Production smoke tests
      - Monitoring updates

  # Rollback capability
  rollback:
    if: failure()
    steps:
      - Automatic rollback to previous version
      - Service health validation
```

#### 3. Mobile Deployment (`mobile-deployment.yml`)

```yaml
name: 📱 Mobile Deployment & UI Testing Pipeline

jobs:
  mobile-tests: # Unit & integration tests
  android-build-test: # Android APK builds & testing
  ios-build-test: # iOS archive builds & testing  
  mobile-ui-testing: # Detox E2E testing
  mobile-security-performance: # Security audit & performance analysis
  deploy-mobile: # Release package creation
```

### Pipeline Features

- **Multi-Environment Testing**: Ubuntu, Windows, macOS
- **Multi-Node Version Support**: Node.js 16, 18, 20
- **Comprehensive Test Coverage**: Unit, Integration, E2E, Mobile
- **Security Scanning**: Snyk, TruffleHog, npm audit
- **Performance Testing**: Lighthouse CI, bundle analysis
- **Mobile Testing**: iOS/Android builds, Detox E2E
- **Automated Deployment**: Staging and production with rollback
- **Container Builds**: Multi-platform Docker images
- **Smart Contract Deployment**: Testnet and mainnet

---

## Containerization Strategy

### Docker Configuration

#### Backend Dockerfile

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .
USER nodejs
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1
CMD ["npm", "start"]
```

#### Frontend Dockerfile

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS runtime
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost || exit 1
CMD ["nginx", "-g", "daemon off;"]
```

#### AI Service Dockerfile

```dockerfile
FROM python:3.9-slim AS runtime
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1
CMD ["python", "app.py"]
```

### Container Optimization

- **Multi-stage builds** for smaller image sizes
- **Non-root user** execution for security
- **Health checks** for service monitoring
- **Alpine Linux** base images for minimal footprint
- **Layer caching** optimization for faster builds

---

## Monitoring & Observability

### Monitoring Stack

#### Prometheus Configuration

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'nexvestxr-backend'
    static_configs:
      - targets: ['nexvestxr-backend:3000']
    metrics_path: /metrics

  - job_name: 'nexvestxr-frontend'
    static_configs:
      - targets: ['nexvestxr-frontend:3001']
    metrics_path: /metrics

  - job_name: 'ai-service'
    static_configs:
      - targets: ['ai-service:5000']
    metrics_path: /metrics

  - job_name: 'support-metrics'
    static_configs:
      - targets: ['nexvestxr-backend:3000']
    metrics_path: /support-metrics
    scrape_interval: 1m
```

#### Key Metrics

| Metric Category | Metrics | Purpose |
|----------------|---------|---------|
| **Application** | Request rate, Response time, Error rate | Performance monitoring |
| **Infrastructure** | CPU, Memory, Disk, Network | Resource utilization |
| **Business** | User registrations, Transactions, Revenue | Business KPIs |
| **Security** | Failed logins, API rate limits, Suspicious activity | Security monitoring |

#### Grafana Dashboards

- **Application Performance**: Response times, error rates, throughput
- **Infrastructure Health**: CPU, memory, disk usage across services
- **Business Metrics**: User activity, transaction volumes, revenue
- **Mobile Analytics**: App performance, crash rates, user engagement

### Alerting Rules

```yaml
groups:
  - name: nexvestxr-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        annotations:
          summary: "High error rate detected"

      - alert: DatabaseConnectionFailure
        expr: up{job="postgres"} == 0
        for: 30s
        annotations:
          summary: "Database connection failure"

      - alert: HighCPUUsage
        expr: cpu_usage_percent > 80
        for: 10m
        annotations:
          summary: "High CPU usage detected"
```

### Log Management

- **Centralized Logging**: AWS CloudWatch Logs
- **Log Aggregation**: ECS log groups per service
- **Log Retention**: 30 days for production, 7 days for staging
- **Search & Analysis**: CloudWatch Insights queries

---

## Security & Compliance

### Security Measures

#### Infrastructure Security

- **VPC Isolation**: Private subnets for application services
- **Security Groups**: Restrictive inbound/outbound rules
- **WAF Protection**: AWS WAF with managed rule sets
- **DDoS Protection**: AWS Shield Standard
- **SSL/TLS**: End-to-end encryption with ACM certificates

#### Application Security

- **Authentication**: JWT tokens with refresh mechanism
- **Authorization**: Role-based access control (RBAC)
- **Input Validation**: Comprehensive input sanitization
- **Rate Limiting**: API rate limiting per user/IP
- **CORS Configuration**: Restrictive CORS policies

#### Data Security

- **Encryption at Rest**: RDS and S3 encryption
- **Encryption in Transit**: TLS 1.2+ for all communications
- **Secrets Management**: AWS Secrets Manager
- **Database Security**: Connection encryption, restricted access
- **Backup Encryption**: Encrypted database backups

### Compliance Features

- **GDPR Compliance**: Data protection and user rights
- **PCI DSS**: Payment card industry standards
- **SOC 2**: Security and availability controls
- **Data Residency**: Regional data storage options

### Security Scanning

- **Container Scanning**: ECR vulnerability scanning
- **Dependency Scanning**: Snyk integration
- **SAST**: Static application security testing
- **Secret Scanning**: TruffleHog for secret detection

---

## Backup & Disaster Recovery

### Backup Strategy

#### Database Backups

```yaml
RDS Backup Configuration:
  - Backup Retention: 30 days
  - Backup Window: "03:00-04:00 UTC"
  - Snapshot Frequency: Daily automated + manual snapshots
  - Cross-Region Backup: Enabled for production
  - Point-in-Time Recovery: 35 days
```

#### Redis Backups

```yaml
ElastiCache Backup:
  - Snapshot Retention: 7 days
  - Snapshot Window: "03:00-05:00 UTC"
  - Backup Format: Redis dump (RDB)
  - Manual Snapshots: On-demand capability
```

#### Application Data

```yaml
S3 Backup Strategy:
  - Versioning: Enabled with 30-day lifecycle
  - Cross-Region Replication: Production data to secondary region
  - Glacier Transition: After 90 days
  - Deep Archive: After 365 days
```

### Disaster Recovery Plan

#### Recovery Time Objectives (RTO)

| Service | RTO Target | Recovery Method |
|---------|------------|-----------------|
| **Frontend** | 5 minutes | CloudFront failover to S3 static site |
| **Backend API** | 15 minutes | ECS service restart or cross-AZ failover |
| **Database** | 30 minutes | RDS Multi-AZ automatic failover |
| **Cache** | 5 minutes | Redis cluster failover |
| **Full Platform** | 1 hour | Complete infrastructure recreation |

#### Recovery Point Objectives (RPO)

| Data Type | RPO Target | Backup Method |
|-----------|------------|---------------|
| **User Data** | 1 hour | Continuous RDS replication |
| **Transaction Data** | 5 minutes | Synchronous database writes |
| **File Assets** | 15 minutes | S3 cross-region replication |
| **Cache Data** | 1 hour | Acceptable data loss (rebuildable) |

#### Disaster Recovery Procedures

1. **Incident Detection**: Automated monitoring alerts
2. **Impact Assessment**: Determine scope and severity
3. **Failover Execution**: Automated or manual failover
4. **Service Restoration**: Restore services in priority order
5. **Data Validation**: Verify data integrity post-recovery
6. **Service Monitoring**: Enhanced monitoring during recovery
7. **Post-Incident Review**: Document lessons learned

---

## Performance Optimization

### Application Performance

#### Backend Optimization

- **Database Query Optimization**: Indexed queries, connection pooling
- **Caching Strategy**: Redis for session data and frequently accessed data
- **API Rate Limiting**: Prevent abuse and ensure fair usage
- **Connection Pooling**: Efficient database connection management
- **Async Processing**: Background job processing for heavy operations

#### Frontend Optimization

- **Code Splitting**: Lazy loading of components
- **Bundle Optimization**: Webpack optimization and tree shaking
- **CDN Distribution**: CloudFront for global content delivery
- **Image Optimization**: WebP format and responsive images
- **Service Worker**: Offline capability and caching

#### Mobile Performance

- **Bundle Size Optimization**: Minimized JavaScript bundles
- **Native Bridge Optimization**: Efficient React Native communication
- **Image Caching**: Local image caching strategies
- **Offline Support**: Offline-first approach for critical features

### Infrastructure Performance

#### Auto Scaling Configuration

```yaml
ECS Auto Scaling:
  Target Tracking Policies:
    - CPU Utilization: 70%
    - Memory Utilization: 80%
    - ALB Request Count: 1000 requests/target
  
  Scaling Policies:
    - Scale Out: Add 1 task when threshold exceeded for 2 minutes
    - Scale In: Remove 1 task when below threshold for 5 minutes
    - Min Capacity: 2 tasks
    - Max Capacity: 20 tasks
```

#### Database Performance

- **Read Replicas**: Distribute read traffic across replicas
- **Connection Pooling**: PgBouncer for connection management
- **Query Optimization**: Regular performance monitoring and optimization
- **Partitioning**: Table partitioning for large datasets

### Performance Monitoring

- **APM Integration**: Application performance monitoring
- **Real User Monitoring**: Frontend performance tracking
- **Synthetic Monitoring**: Automated performance testing
- **Performance Budgets**: Lighthouse CI performance budgets

---

## Troubleshooting Procedures

### Common Issues & Solutions

#### Service Health Checks

```bash
# Check service status
docker-compose ps
aws ecs describe-services --cluster nexvestxr-cluster

# View service logs
docker-compose logs -f [service_name]
aws logs tail /ecs/nexvestxr-backend --follow

# Check service health endpoints
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:5000/health
```

#### Database Connection Issues

```bash
# Check database connectivity
pg_isready -h database-endpoint -p 5432

# Test Redis connection
redis-cli -h redis-endpoint ping

# View database logs
aws rds describe-db-log-files --db-instance-identifier nexvestxr-db
```

#### Container Issues

```bash
# Check container resource usage
docker stats

# Inspect container configuration
docker inspect [container_id]

# Execute commands in container
docker exec -it [container_id] /bin/sh

# View container logs with timestamps
docker logs -t [container_id]
```

#### Performance Issues

```bash
# Check CPU and memory usage
top -p $(pgrep -f "node")

# Monitor network connections
netstat -an | grep :3000

# Check disk usage
df -h

# Monitor application metrics
curl http://localhost:3000/metrics
```

### Escalation Procedures

#### Severity Levels

| Severity | Response Time | Examples |
|----------|---------------|----------|
| **Critical** | 15 minutes | Platform down, data loss, security breach |
| **High** | 1 hour | Major feature failure, significant performance degradation |
| **Medium** | 4 hours | Minor feature issues, moderate performance impact |
| **Low** | 24 hours | Enhancement requests, minor bugs |

#### On-Call Procedures

1. **Alert Receipt**: Monitor alerts via PagerDuty/Slack
2. **Initial Assessment**: Determine severity and impact
3. **Immediate Response**: Apply quick fixes if available
4. **Escalation**: Involve additional team members if needed
5. **Communication**: Update stakeholders on status
6. **Resolution**: Implement permanent fix
7. **Post-Mortem**: Document incident and improvements

---

## Cost Optimization Strategies

### Infrastructure Cost Management

#### Right-Sizing Resources

```yaml
Production Resource Allocation:
  ECS Services:
    - Backend: 1024 CPU, 2048 MB memory
    - Frontend: 256 CPU, 512 MB memory
    - AI Service: 512 CPU, 1024 MB memory
  
  Database:
    - Production: db.r6g.large (Multi-AZ)
    - Staging: db.t3.medium (Single-AZ)
  
  Cache:
    - Production: cache.r7g.large (Cluster)
    - Staging: cache.t3.micro (Single node)
```

#### Cost Optimization Techniques

1. **Reserved Instances**: 1-year reserved instances for predictable workloads
2. **Spot Instances**: Use Spot instances for development and testing
3. **Auto Scaling**: Scale resources based on demand
4. **Lifecycle Policies**: Automate data archival to cheaper storage classes
5. **Resource Scheduling**: Schedule non-production environments

#### Monitoring & Budgets

- **AWS Cost Explorer**: Analyze spending patterns
- **Budget Alerts**: Set up budget alerts for cost control
- **Resource Tagging**: Tag resources for cost allocation
- **Regular Reviews**: Monthly cost optimization reviews

### Estimated Monthly Costs

| Environment | Compute | Database | Storage | Total |
|-------------|---------|----------|---------|-------|
| **Production** | $800 | $400 | $200 | $1,400 |
| **Staging** | $200 | $100 | $50 | $350 |
| **Development** | $50 | $25 | $10 | $85 |

---

## Best Practices & Recommendations

### Development Best Practices

1. **Infrastructure as Code**: Use CloudFormation/Terraform for all infrastructure
2. **Environment Parity**: Keep development, staging, and production similar
3. **Configuration Management**: Use environment variables and secrets management
4. **Database Migrations**: Version-controlled database schema changes
5. **Blue-Green Deployments**: Zero-downtime deployments
6. **Feature Flags**: Control feature rollouts with feature flags

### Security Best Practices

1. **Principle of Least Privilege**: Minimal necessary permissions
2. **Regular Security Updates**: Keep dependencies and OS updated
3. **Secure Defaults**: Secure configuration by default
4. **Input Validation**: Validate all user inputs
5. **Audit Logging**: Comprehensive audit trail
6. **Penetration Testing**: Regular security assessments

### Operational Best Practices

1. **Monitoring & Alerting**: Comprehensive monitoring coverage
2. **Documentation**: Keep deployment documentation updated
3. **Runbooks**: Detailed operational procedures
4. **Disaster Recovery Testing**: Regular DR drills
5. **Performance Testing**: Regular load and performance testing
6. **Capacity Planning**: Proactive capacity management

---

## Appendices

### A. Environment Variables Reference

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment mode | Yes | `production` |
| `DATABASE_URL` | PostgreSQL connection string | Yes | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL` | Redis connection string | Yes | `redis://host:6379` |
| `JWT_SECRET` | JWT signing secret | Yes | `your-secret-key` |
| `XUMM_API_KEY` | XUMM integration key | Yes | `your-xumm-key` |
| `FLARE_RPC_URL` | Flare network RPC endpoint | Yes | `https://flare-api.flare.network/ext/C/rpc` |

### B. Port Reference

| Service | Port | Protocol | Description |
|---------|------|----------|-------------|
| Frontend | 3001 | HTTP | React application |
| Backend | 3000 | HTTP | Node.js API server |
| AI Service | 5000 | HTTP | Python Flask service |
| Database | 5432 | TCP | PostgreSQL database |
| Redis | 6379 | TCP | Redis cache |
| Prometheus | 9090 | HTTP | Metrics collection |
| Grafana | 3002 | HTTP | Monitoring dashboard |

### C. Health Check Endpoints

| Service | Endpoint | Response |
|---------|----------|----------|
| Backend | `/health` | `{"status": "healthy", "timestamp": "2024-01-01T00:00:00Z"}` |
| Frontend | `/` | HTTP 200 with React app |
| AI Service | `/health` | `{"status": "healthy", "models_loaded": true}` |
| Database | N/A | Use `pg_isready` command |
| Redis | N/A | Use `redis-cli ping` command |

### D. Useful Commands

```bash
# Docker Compose Operations
docker-compose up -d                    # Start all services
docker-compose down                     # Stop all services
docker-compose logs -f [service]        # View service logs
docker-compose exec [service] bash      # Execute shell in service

# AWS CLI Operations
aws ecs describe-services --cluster nexvestxr-cluster
aws rds describe-db-instances
aws elasticache describe-cache-clusters
aws logs tail /ecs/nexvestxr-backend --follow

# Health Checks
curl http://localhost:3000/health       # Backend health
curl http://localhost:3001              # Frontend health
curl http://localhost:5000/health       # AI service health

# Database Operations
psql -h localhost -p 5432 -U nexvestxr -d nexvestxr
redis-cli -h localhost -p 6379 ping
```

---

## Conclusion

This comprehensive deployment guide provides DevOps engineers with all the necessary information to deploy, manage, and maintain the NexVestXR v2 dual token platform. The architecture is designed for scalability, reliability, and security, with comprehensive monitoring and disaster recovery capabilities.

For additional support or questions, please refer to the platform team or create an issue in the project repository.

---

**Document Version**: 1.0  
**Last Updated**: 2024-06-20  
**Next Review**: 2024-09-20