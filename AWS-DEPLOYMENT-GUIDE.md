# 🚀 NexVestXR v2 Dual Token Platform - AWS Deployment Guide

**Complete Production Deployment and Environment Setup on AWS for Scale**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Security Considerations](#security-considerations)
5. [Deployment Steps](#deployment-steps)
6. [Infrastructure Components](#infrastructure-components)
7. [CI/CD Pipeline](#cicd-pipeline)
8. [Monitoring & Alerting](#monitoring--alerting)
9. [Scaling Configuration](#scaling-configuration)
10. [Maintenance & Operations](#maintenance--operations)
11. [Troubleshooting](#troubleshooting)
12. [Cost Optimization](#cost-optimization)

---

## 🎯 Overview

This guide provides comprehensive instructions for deploying the NexVestXR v2 Dual Token Platform to AWS with production-grade infrastructure, security, and scalability. The deployment includes:

- **Dual Token Architecture**: XERA (governance) + PROPX (property tokens)
- **Multi-Chain Support**: XRPL and Flare Network integration
- **UAE Market Focus**: Aldar Properties integration and AED payments
- **Enterprise Security**: PCI DSS compliance and regulatory adherence
- **High Availability**: Multi-AZ deployment with auto-scaling
- **Performance Optimized**: Advanced caching and CDN distribution

---

## 🏗️ Architecture

### Production Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                           Users                                  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                    CloudFront CDN                               │
│              (Global Content Delivery)                          │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                  Application Load Balancer                      │
│                    (Multi-AZ, SSL/TLS)                         │
└─────────────────┬─────────────────┬─────────────────────────────┘
                  │                 │
    ┌─────────────▼─────────────┐   │
    │      ECS Cluster          │   │
    │    (Fargate Services)     │   │
    │                           │   │
    │  ┌─────────┐ ┌─────────┐  │   │
    │  │Frontend │ │Backend  │  │   │
    │  │Container│ │Container│  │   │
    │  └─────────┘ └─────────┘  │   │
    └─────────────┬─────────────┘   │
                  │                 │
    ┌─────────────▼─────────────────▼─────────────────────────────┐
    │                   Private Subnets                           │
    │                                                             │
    │  ┌─────────────────┐              ┌─────────────────────┐    │
    │  │   RDS Database  │              │   ElastiCache       │    │
    │  │   (PostgreSQL)  │              │     (Redis)         │    │
    │  │   Multi-AZ      │              │   Cluster Mode      │    │
    │  └─────────────────┘              └─────────────────────┘    │
    └─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    External Integrations                        │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │    XRPL     │  │   Flare     │  │     Aldar Properties    │  │
│  │  Mainnet    │  │  Network    │  │      APIs & Data        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

- **Frontend**: React.js application served via CloudFront CDN
- **Backend**: Node.js API with real-time WebSocket support
- **Database**: PostgreSQL RDS with Multi-AZ deployment
- **Cache**: Redis ElastiCache cluster for session and data caching
- **Storage**: S3 for static assets and document storage
- **Monitoring**: CloudWatch, X-Ray, and custom dashboards
- **Security**: WAF, VPC, Security Groups, and encryption at rest/transit

---

## ✅ Prerequisites

### Required Tools

```bash
# Install required CLI tools
aws --version          # AWS CLI v2.0+
docker --version       # Docker 20.0+
node --version         # Node.js 18+
npm --version          # npm 8+
git --version          # Git 2.0+
```

### AWS Account Setup

1. **AWS Account with appropriate permissions**
2. **Domain name registered** (e.g., nexvestxr.com)
3. **SSL/TLS Certificate** in AWS Certificate Manager
4. **GitHub repository** with source code
5. **Environment-specific secrets** configured

### Required AWS Services

- EC2, ECS, Fargate
- RDS, ElastiCache
- S3, CloudFront
- Route 53, Certificate Manager
- CloudFormation, CodePipeline, CodeBuild
- Lambda, SNS, CloudWatch
- Secrets Manager, IAM

---

## 🔒 Security Considerations

### ⚠️ Critical Security Issues (Must Fix Before Deployment)

Based on our security audit, the following **CRITICAL** issues must be addressed:

#### 1. PCI DSS Compliance (CRITICAL)
```bash
# Implement before deployment
- Encrypt all payment data at rest and in transit
- Implement strict access controls for payment systems
- Conduct quarterly security assessments
- Establish security policy maintenance procedures
```

#### 2. API Security Vulnerabilities (CRITICAL)
```bash
# Required fixes
- Add comprehensive input validation to all endpoints
- Use parameterized queries to prevent SQL injection
- Implement authentication middleware on all protected routes
- Add intelligent rate limiting with Redis
```

#### 3. Smart Contract Oracle Dependencies (HIGH)
```bash
# Implementation required
- Deploy multi-oracle architecture with Chainlink
- Add price staleness and deviation checks
- Implement TWAP (Time-Weighted Average Prices)
- Add circuit breakers for unusual price movements
```

### Security Implementation Checklist

- [ ] PCI DSS Level 1 compliance framework
- [ ] Multi-factor authentication for admin access
- [ ] End-to-end encryption for sensitive data
- [ ] Regular security scanning and penetration testing
- [ ] GDPR and UAE regulatory compliance
- [ ] Container security with vulnerability scanning
- [ ] Network segmentation and access controls

---

## 🚀 Deployment Steps

### Step 1: Environment Preparation

```bash
# Clone the repository
git clone https://github.com/your-org/nexvestxr-v2-dual-token.git
cd nexvestxr-v2-dual-token

# Set environment variables
export AWS_REGION=us-east-1
export ENVIRONMENT=production
export AWS_PROFILE=nexvestxr-prod
```

### Step 2: Create Parameter Files

Create environment-specific parameter files:

```bash
# aws-infrastructure/cloudformation/production-parameters.json
[
  {
    "ParameterKey": "Environment",
    "ParameterValue": "production"
  },
  {
    "ParameterKey": "VpcCidr",
    "ParameterValue": "10.0.0.0/16"
  },
  {
    "ParameterKey": "DatabasePassword",
    "ParameterValue": "your-secure-password"
  },
  {
    "ParameterKey": "RedisAuthToken",
    "ParameterValue": "your-redis-auth-token"
  },
  {
    "ParameterKey": "KeyPairName",
    "ParameterValue": "nexvestxr-keypair"
  },
  {
    "ParameterKey": "DomainName",
    "ParameterValue": "nexvestxr.com"
  },
  {
    "ParameterKey": "CertificateArn",
    "ParameterValue": "arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012"
  }
]
```

### Step 3: Deploy Infrastructure

```bash
# Make deployment script executable
chmod +x aws-infrastructure/scripts/deploy.sh

# Deploy complete infrastructure
./aws-infrastructure/scripts/deploy.sh deploy

# Or deploy in stages
./aws-infrastructure/scripts/deploy.sh infrastructure  # Infrastructure only
./aws-infrastructure/scripts/deploy.sh build          # Build and push images
./aws-infrastructure/scripts/deploy.sh services       # Deploy ECS services
```

### Step 4: Configure Secrets

```bash
# Store sensitive configuration in AWS Secrets Manager
aws secretsmanager create-secret \
  --name "production/nexvestxr/database" \
  --secret-string '{"database_url":"postgresql://user:pass@host:5432/nexvestxr"}'

aws secretsmanager create-secret \
  --name "production/nexvestxr/jwt" \
  --secret-string '{"jwt_secret":"your-jwt-secret"}'

aws secretsmanager create-secret \
  --name "production/nexvestxr/blockchain" \
  --secret-string '{
    "xrpl_network":"mainnet",
    "xrpl_wallet_seed":"your-xrpl-seed",
    "flare_private_key":"your-flare-private-key",
    "flare_rpc_url":"https://flare-api.flare.network/ext/bc/C/rpc"
  }'
```

### Step 5: Setup CI/CD Pipeline

```bash
# Deploy CI/CD pipeline
aws cloudformation deploy \
  --template-file aws-infrastructure/cicd/codepipeline.yaml \
  --stack-name production-nexvestxr-cicd \
  --parameter-overrides \
    Environment=production \
    GitHubOwner=your-github-username \
    GitHubRepo=nexvestxr-v2-dual-token \
    GitHubBranch=master \
    GitHubToken=your-github-token \
  --capabilities CAPABILITY_IAM
```

### Step 6: Validate Deployment

```bash
# Run validation script
./aws-infrastructure/scripts/deploy.sh validate

# Check application health
curl -f https://nexvestxr.com/health
curl -f https://nexvestxr.com/api/health
```

---

## 🏗️ Infrastructure Components

### Networking
- **VPC**: 10.0.0.0/16 with public and private subnets
- **Multi-AZ**: Deployment across 2 availability zones
- **NAT Gateways**: For private subnet internet access
- **Security Groups**: Restrictive access controls

### Compute
- **ECS Fargate**: Serverless container platform
- **Application Load Balancer**: Layer 7 load balancing with SSL termination
- **Auto Scaling**: Based on CPU, memory, and custom metrics

### Storage & Database
- **RDS PostgreSQL**: Multi-AZ with automated backups
- **ElastiCache Redis**: Cluster mode for high availability
- **S3**: Versioned storage with lifecycle policies

### Security
- **WAF**: Web Application Firewall with managed rules
- **Secrets Manager**: Secure storage for sensitive data
- **IAM Roles**: Least privilege access controls
- **VPC Flow Logs**: Network traffic monitoring

---

## 🔄 CI/CD Pipeline

### Pipeline Stages

1. **Source**: GitHub repository with webhook triggers
2. **Build**: Multi-stage Docker builds with caching
3. **Security Test**: SAST, dependency scanning, container scanning
4. **Performance Test**: Load testing and bundle analysis
5. **Deploy**: Blue-green deployment with health checks
6. **Post-Deploy**: Smoke tests and notifications

### Build Process

```yaml
# buildspec.yml key features
- Node.js 18 runtime
- Docker BuildKit for optimized builds
- Security scanning with Snyk and Trivy
- SonarQube code quality analysis
- Automated testing and linting
- Performance budget enforcement
```

### Deployment Strategy

- **Blue-Green Deployment**: Zero downtime deployments
- **Health Checks**: Application and load balancer health monitoring
- **Rollback**: Automatic rollback on deployment failures
- **Notifications**: Slack/SNS notifications for pipeline events

---

## 📊 Monitoring & Alerting

### CloudWatch Dashboards

1. **Application Performance**
   - Response times, error rates
   - Database connections and query performance
   - Cache hit rates and memory usage

2. **Infrastructure Health**
   - CPU, memory, network utilization
   - Load balancer metrics
   - Container health and restart counts

3. **Business Metrics**
   - User registrations and transactions
   - Token minting and trading volume
   - Property valuations and investments

### Alerting Rules

```yaml
Critical Alerts:
  - Application error rate > 5%
  - Database connection failures
  - High memory/CPU utilization (>80%)
  - Security incidents detected

Warning Alerts:
  - Response time > 2 seconds
  - Cache miss rate > 20%
  - Unusual traffic patterns
  - Failed deployments
```

### Log Aggregation

- **CloudWatch Logs**: Centralized log collection
- **Log Groups**: Organized by service and environment
- **Log Retention**: 30 days for applications, 7 days for access logs
- **Log Analysis**: CloudWatch Insights for queries and analysis

---

## ⚡ Scaling Configuration

### Auto Scaling Policies

```yaml
ECS Service Auto Scaling:
  Target Tracking:
    - CPU Utilization: 70%
    - Memory Utilization: 80%
    - Request Count per Target: 1000
  
  Scale Out:
    - Cooldown: 300 seconds
    - Maximum capacity: 50 tasks
  
  Scale In:
    - Cooldown: 300 seconds
    - Minimum capacity: 2 tasks
```

### Database Scaling

- **Read Replicas**: Up to 5 read replicas for read traffic
- **Connection Pooling**: PgBouncer for connection management
- **Query Optimization**: Automated query performance insights

### Cache Scaling

- **Redis Cluster**: Automatic sharding across nodes
- **Memory Optimization**: TTL-based cache eviction
- **Failover**: Multi-AZ deployment with automatic failover

---

## 🛠️ Maintenance & Operations

### Regular Maintenance Tasks

```bash
# Weekly Tasks
- Review CloudWatch alarms and metrics
- Check application logs for errors
- Validate backup integrity
- Update security patches

# Monthly Tasks
- Review AWS costs and optimization opportunities
- Analyze performance metrics and trends
- Update dependency versions
- Conduct security reviews

# Quarterly Tasks
- Disaster recovery testing
- Capacity planning review
- Security penetration testing
- Business continuity plan updates
```

### Backup & Recovery

```yaml
Database Backups:
  - Automated daily snapshots (30-day retention)
  - Point-in-time recovery (7 days)
  - Cross-region backup replication

Application Data:
  - S3 versioning enabled
  - Cross-region replication
  - Lifecycle policies for cost optimization
```

### Disaster Recovery

- **RTO (Recovery Time Objective)**: 4 hours
- **RPO (Recovery Point Objective)**: 1 hour
- **Multi-Region**: Standby infrastructure in secondary region
- **Runbooks**: Documented procedures for common scenarios

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Application Not Starting
```bash
# Check ECS service events
aws ecs describe-services --cluster production-nexvestxr-cluster --services production-nexvestxr-backend

# Check CloudWatch logs
aws logs describe-log-streams --log-group-name /ecs/production-nexvestxr-backend
```

#### 2. Database Connection Issues
```bash
# Check RDS instance status
aws rds describe-db-instances --db-instance-identifier production-nexvestxr-db

# Check security group rules
aws ec2 describe-security-groups --group-ids sg-xxxxx
```

#### 3. High Response Times
```bash
# Check load balancer metrics
aws elbv2 describe-target-health --target-group-arn arn:aws:elasticloadbalancing:...

# Check database performance
aws rds describe-db-performance-history --db-instance-identifier production-nexvestxr-db
```

### Debug Commands

```bash
# Connect to ECS container
aws ecs execute-command \
  --cluster production-nexvestxr-cluster \
  --task task-id \
  --container nexvestxr-backend \
  --interactive \
  --command "/bin/bash"

# View application logs in real-time
aws logs tail /ecs/production-nexvestxr-backend --follow

# Check database connections
aws rds describe-db-clusters --db-cluster-identifier production-nexvestxr-db
```

---

## 💰 Cost Optimization

### Current Cost Estimates (Monthly)

```yaml
Production Environment (Monthly Costs):
  ECS Fargate: $200-400
  RDS PostgreSQL: $150-300
  ElastiCache Redis: $100-200
  Load Balancer: $20-25
  CloudFront CDN: $10-50
  S3 Storage: $20-50
  Data Transfer: $50-100
  Other Services: $100-200
  
Total Estimated: $650-1,325/month
```

### Cost Optimization Strategies

1. **Reserved Instances**: 40-60% savings on RDS and ElastiCache
2. **Spot Instances**: Use for non-critical workloads
3. **S3 Intelligent Tiering**: Automatic storage class optimization
4. **CloudFront Caching**: Reduce origin requests
5. **Resource Right-Sizing**: Regular review of instance sizes

---

## 📞 Support & Contacts

### Emergency Contacts
- **DevOps Team**: devops@nexvestxr.com
- **Security Team**: security@nexvestxr.com
- **On-Call Engineer**: +1-XXX-XXX-XXXX

### Monitoring & Alerting
- **PagerDuty**: Production incidents
- **Slack**: #nexvestxr-alerts
- **Email**: ops-alerts@nexvestxr.com

### Documentation
- **Internal Wiki**: confluence.nexvestxr.com
- **Runbooks**: github.com/nexvestxr/runbooks
- **API Documentation**: api.nexvestxr.com/docs

---

## ⚠️ Important Notes

1. **Security First**: Address all critical security issues before production deployment
2. **Testing**: Thoroughly test all components in staging environment
3. **Monitoring**: Set up comprehensive monitoring before going live
4. **Backups**: Verify backup and recovery procedures
5. **Documentation**: Keep deployment documentation updated
6. **Compliance**: Ensure regulatory compliance for UAE market
7. **Performance**: Monitor and optimize for scale

---

## 🎉 Deployment Complete!

Your NexVestXR v2 Dual Token Platform is now deployed on AWS with:

✅ **High Availability**: Multi-AZ deployment with auto-scaling  
✅ **Security**: Enterprise-grade security controls  
✅ **Performance**: Optimized for low latency and high throughput  
✅ **Monitoring**: Comprehensive observability and alerting  
✅ **CI/CD**: Automated deployment pipeline  
✅ **Compliance**: UAE regulatory compliance ready  

**Next Steps**: Address critical security issues, conduct user acceptance testing, and prepare for production traffic.

---

*For technical support or questions, contact the DevOps team at devops@nexvestxr.com*