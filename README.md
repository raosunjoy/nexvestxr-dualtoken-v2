# NexVestXR Platform

NexVestXR is a SaaS platform integrated with a real estate token exchange on the XRP Ledger (XRPL), enabling smaller value investments (₹1,000-₹1 lakh) from global investors in India’s $265 billion real estate market.

## Overview
- **Purpose**: Facilitate fractional ownership of real estate properties via tokenization.
- **Target**: $13.1 billion in NRI investments.
- **Technology**: XRPL for cross-border transactions, Flare Network for oracles, AI for fraud detection.

## Directory Structure
- **backend/**: Node.js/Express backend for API and services.
- **frontend/**: React frontend for user interface.
- **smart-contracts/**: Solidity contracts on Flare Network.
- **ai-service/**: Python/Flask service for fraud detection.
- **infrastructure/**: Configurations for Nginx, Prometheus, Grafana.
- **scripts/**: Deployment and test scripts.
- **tests/**: Unit and performance tests.
- **docs/**: API, deployment, and security documentation.

## Getting Started
1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```
2. Set up environment variables (see `.env.example`).
3. Deploy the platform:
   ```bash
   ./scripts/deploy-complete.sh
   ```
4. Access the platform at `http://localhost` (or configured domain).

## Contributing
See `CONTRIBUTING.md` for guidelines on contributing to the project.

## License
This project is licensed under the MIT License.# Workflow Test
