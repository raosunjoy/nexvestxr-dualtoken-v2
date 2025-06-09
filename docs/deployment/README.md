# Deployment Guide for NexVestXR

This guide outlines the steps to deploy the NexVestXR platform in pre-production and production environments.

## Prerequisites
- Docker and Docker Compose installed
- Node.js v18.x
- Python 3.9 for AI service
- Access to Flare Network RPC (for smart contracts)
- API keys for XUMM, Stripe, MoonPay, Razorpay, Intercom, and Sentry

## Environment Setup
1. Copy `.env.example` to `.env` and fill in all required variables.
2. Ensure all secrets (e.g., `JWT_SECRET`, `XRPL_ISSUER_SEED`) are securely stored.

## Pre-Production Deployment
1. Run the pre-production deployment script:
   ```bash
   ./scripts/deploy-preprod.sh
   ```
2. Access the platform at `http://localhost` (or configured domain).
3. Monitor services using Grafana (`http://localhost:3002`) and Prometheus (`http://localhost:9090`).

## Production Deployment
1. Run the complete deployment script:
   ```bash
   ./scripts/deploy-complete.sh
   ```
2. Configure DNS to point to your production domain.
3. Ensure SSL certificates are set up in `infrastructure/ssl/`.
4. Monitor logs and metrics via configured tools (Grafana, Prometheus, Sentry).

## Running Tests
To ensure the deployment is successful, run the test suite:
```bash
./scripts/run-tests.sh
```

## Troubleshooting
- Check logs in `backend/logs/`, `frontend/logs/`, and `ai-service/logs/`.
- Review Prometheus metrics for service health.
- Contact support via Intercom for assistance.