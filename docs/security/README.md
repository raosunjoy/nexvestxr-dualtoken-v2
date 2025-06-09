# Security Practices for NexVestXR

This document outlines the security measures implemented in the NexVestXR platform.

## Authentication and Authorization
- **JWT Authentication**: All API endpoints are protected with JWT tokens.
- **Rate Limiting**: Applied to prevent brute force attacks (e.g., 5 attempts for auth, 100 requests per 15 minutes generally).
- **Role-Based Access**: Separate roles for investors and developers with restricted access.

## Data Protection
- **Encryption**: Sensitive data (e.g., API keys, secrets) is encrypted at rest.
- **HTTPS**: All communications are secured with HTTPS using SSL/TLS.
- **Secure Storage**: Documents are stored on IPFS via Pinata with access control.

## Compliance
- **SEBI Restrictions**: Limited to 100 investors until approval (enforced via middleware).
- **KYC/AML**: Integrated with DigiLocker and MyInfo for investor KYC (mocked for beta).
- **Fraud Detection**: AI-based fraud detection for property documents.

## Monitoring and Logging
- **Sentry**: Integrated for error tracking and alerting.
- **Winston Logging**: Comprehensive logging with rotation in backend.
- **Prometheus/Grafana**: Real-time monitoring of system metrics and user engagement.

## Third-Party Security
- **Intercom**: Secure customer support integration with user data protection.
- **Payment Gateways**: Stripe, MoonPay, Razorpay integrations follow PCI-DSS compliance.
- **XUMM**: Secure wallet integration for XRPL transactions.

For security vulnerabilities, please report to security@nexvestxr.com.