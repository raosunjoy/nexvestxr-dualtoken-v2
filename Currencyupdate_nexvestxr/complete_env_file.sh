# .env.production - Complete production environment configuration
# Copy this file and replace with actual values

# ==========================================
# CORE APPLICATION SETTINGS
# ==========================================
NODE_ENV=production
ENVIRONMENT=production
PORT=3000

# Domain Configuration
DOMAIN=nexvestxr.com
API_URL=https://api.nexvestxr.com
FRONTEND_URL=https://nexvestxr.com
REACT_APP_API_URL=https://api.nexvestxr.com

# ==========================================
# DATABASE CONFIGURATION
# ==========================================
MONGO_URI=mongodb://admin:YOUR_MONGO_PASSWORD@mongo1:27017,mongo2:27017,mongo3:27017/nexvestxr?replicaSet=rs0&authSource=admin
MONGO_ROOT_PASSWORD=YOUR_STRONG_MONGO_PASSWORD

# Redis Configuration
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=YOUR_STRONG_REDIS_PASSWORD

# ==========================================
# CURRENCY SERVICE CONFIGURATION
# ==========================================
EXCHANGE_RATE_API_KEY=YOUR_EXCHANGE_RATE_API_KEY
EXCHANGE_RATE_API_URL=https://api.exchangerate-api.com/v4/latest/USD
GEO_LOCATION_API_URL=http://ip-api.com/json/
SUPPORTED_CURRENCIES=USD,EUR,GBP,SGD,INR
BASE_CURRENCY=USD
CURRENCY_UPDATE_INTERVAL=900000

# GeoIP Configuration
MAXMIND_LICENSE_KEY=YOUR_MAXMIND_LICENSE_KEY
IP_GEOLOCATION_API_KEY=YOUR_IP_GEOLOCATION_API_KEY

# ==========================================
# BLOCKCHAIN CONFIGURATION
# ==========================================

# XRPL Configuration
XRPL_SERVER=wss://xrplcluster.com
XRPL_ISSUER_SEED=YOUR_XRPL_ISSUER_SEED
XRPL_ISSUER_ADDRESS=YOUR_XRPL_ISSUER_ADDRESS

# XUMM Integration
XUMM_API_KEY=YOUR_XUMM_API_KEY
XUMM_API_SECRET=YOUR_XUMM_API_SECRET

# Flare Network Configuration
FLARE_RPC_URL=https://flare-api.flare.network/ext/bc/C/rpc
FLARE_PRIVATE_KEY=YOUR_FLARE_PRIVATE_KEY
PROPERTY_FACTORY_ADDRESS=0xYOUR_PROPERTY_FACTORY_CONTRACT_ADDRESS
PRICE_AGGREGATOR_ADDRESS=0xYOUR_PRICE_AGGREGATOR_CONTRACT_ADDRESS

# ==========================================
# PAYMENT GATEWAY CONFIGURATION
# ==========================================

# Stripe Configuration
STRIPE_API_KEY=sk_live_YOUR_STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_STRIPE_WEBHOOK_SECRET

# MoonPay Configuration
MOONPAY_API_KEY=pk_live_YOUR_MOONPAY_API_KEY
MOONPAY_SECRET=YOUR_MOONPAY_SECRET

# Ramp Configuration
RAMP_API_KEY=YOUR_RAMP_API_KEY

# Razorpay Configuration (India)
RAZORPAY_KEY_ID=rzp_live_YOUR_RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_RAZORPAY_KEY_SECRET

# ==========================================
# SECURITY CONFIGURATION
# ==========================================
JWT_SECRET=YOUR_SUPER_SECURE_JWT_SECRET_AT_LEAST_64_CHARACTERS_LONG_FOR_PRODUCTION
BCRYPT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_AUTH_MAX=5

# API Keys
API_SECRET_KEY=YOUR_INTERNAL_API_SECRET_KEY

# ==========================================
# EMAIL CONFIGURATION
# ==========================================
SENDGRID_API_KEY=SG.YOUR_SENDGRID_API_KEY
FROM_EMAIL=noreply@nexvestxr.com
SUPPORT_EMAIL=support@nexvestxr.com

# SMTP Configuration (Alternative to SendGrid)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# ==========================================
# MONITORING & ANALYTICS
# ==========================================

# Grafana Configuration
GRAFANA_ADMIN_PASSWORD=YOUR_STRONG_GRAFANA_PASSWORD

# Google Analytics
GOOGLE_ANALYTICS_ID=G-YOUR_GA_MEASUREMENT_ID

# Mixpanel
MIXPANEL_TOKEN=YOUR_MIXPANEL_TOKEN

# Sentry Error Tracking
SENTRY_DSN=https://YOUR_SENTRY_DSN@sentry.io/PROJECT_ID

# ==========================================
# SOCIAL MEDIA & MARKETING
# ==========================================

# Facebook Pixel
FACEBOOK_PIXEL_ID=YOUR_FACEBOOK_PIXEL_ID

# LinkedIn Insight Tag
LINKEDIN_INSIGHT_TAG=YOUR_LINKEDIN_INSIGHT_TAG

# Twitter Pixel
TWITTER_PIXEL_ID=YOUR_TWITTER_PIXEL_ID

# ==========================================
# NOTIFICATION SERVICES
# ==========================================

# Slack Webhook for Alerts
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Discord Webhook
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR/DISCORD/WEBHOOK

# ==========================================
# FILE STORAGE & CDN
# ==========================================

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
AWS_REGION=us-east-1
S3_BUCKET=nexvestxr-uploads
BACKUP_S3_BUCKET=nexvestxr-backups

# CloudFlare CDN
CLOUDFLARE_API_KEY=YOUR_CLOUDFLARE_API_KEY
CLOUDFLARE_EMAIL=your-email@example.com

# ==========================================
# AI SERVICE CONFIGURATION
# ==========================================
AI_SERVICE_URL=http://ai-service:5000
ENABLE_AI_SERVICE=true
AI_CONFIDENCE_THRESHOLD=0.85
MAX_FILE_SIZE=10485760
SUPPORTED_DOCUMENT_TYPES=pdf,jpg,jpeg,png

# OpenAI API (for enhanced AI features)
OPENAI_API_KEY=sk-YOUR_OPENAI_API_KEY

# ==========================================
# FEATURE FLAGS
# ==========================================
ENABLE_ADVANCED_TRADING=true
ENABLE_PAYMENT_GATEWAYS=true
ENABLE_FLARE_INTEGRATION=true
ENABLE_FRAUD_DETECTION=true
ENABLE_CURRENCY_AUTO_DETECTION=true
ENABLE_REAL_TIME_EXCHANGE_RATES=true
ENABLE_MULTI_CURRENCY_DISPLAY=true
ENABLE_B2B_INR_ONLY=true
ENABLE_CONSUMER_LOCALIZATION=true
ENABLE_2FA=true
ENABLE_KYC_VERIFICATION=true

# ==========================================
# EXTERNAL SERVICES
# ==========================================

# KYC/AML Service
KYC_SERVICE_URL=https://api.onfido.com
KYC_API_KEY=YOUR_ONFIDO_API_KEY

# Document Verification
JUMIO_API_TOKEN=YOUR_JUMIO_API_TOKEN
JUMIO_API_SECRET=YOUR_JUMIO_API_SECRET

# SMS Service (Twilio)
TWILIO_ACCOUNT_SID=YOUR_TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN=YOUR_TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER=+1234567890

# ==========================================
# DEPLOYMENT CONFIGURATION
# ==========================================

# Server Configuration
MAX_FILE_UPLOAD_SIZE=50mb
REQUEST_TIMEOUT=30000
KEEP_ALIVE_TIMEOUT=65000

# SSL Configuration
SSL_CERT_PATH=/etc/nginx/ssl/fullchain.pem
SSL_KEY_PATH=/etc/nginx/ssl/privkey.pem

# Backup Configuration
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30

# ==========================================
# PERFORMANCE TUNING
# ==========================================

# Database Connection Pool
DB_MAX_POOL_SIZE=10
DB_MIN_POOL_SIZE=5
DB_CONNECTION_TIMEOUT=30000

# Redis Configuration
REDIS_MAX_RETRIES=3
REDIS_RETRY_DELAY=1000

# Cache TTL Settings
CACHE_TTL_SHORT=300
CACHE_TTL_MEDIUM=1800
CACHE_TTL_LONG=3600

# ==========================================
# LOGGING CONFIGURATION
# ==========================================
LOG_LEVEL=info
LOG_FORMAT=json
LOG_MAX_SIZE=100mb
LOG_MAX_FILES=14

# ==========================================
# HEALTH CHECK CONFIGURATION
# ==========================================
HEALTH_CHECK_INTERVAL=30
HEALTH_CHECK_TIMEOUT=10
HEALTH_CHECK_RETRIES=3

# ==========================================
# REACT APP CONFIGURATION (Frontend)
# ==========================================
REACT_APP_ENVIRONMENT=production
REACT_APP_XUMM_API_KEY=${XUMM_API_KEY}
REACT_APP_ENABLE_CURRENCY_DETECTION=true
REACT_APP_SUPPORTED_CURRENCIES=USD,EUR,GBP,SGD,INR
REACT_APP_DEFAULT_CURRENCY=USD
REACT_APP_STRIPE_PUBLISHABLE_KEY=${STRIPE_PUBLISHABLE_KEY}
REACT_APP_GOOGLE_ANALYTICS_ID=${GOOGLE_ANALYTICS_ID}
REACT_APP_SENTRY_DSN=${SENTRY_DSN}

# ==========================================
# CURRENCY-SPECIFIC SETTINGS
# ==========================================

# Exchange Rate Providers (Fallback Order)
EXCHANGE_RATE_PRIMARY=exchangerate-api.com
EXCHANGE_RATE_SECONDARY=fixer.io
EXCHANGE_RATE_TERTIARY=openexchangerates.org

# Currency Display Preferences
CURRENCY_DECIMAL_PLACES_USD=2
CURRENCY_DECIMAL_PLACES_EUR=2
CURRENCY_DECIMAL_PLACES_GBP=2
CURRENCY_DECIMAL_PLACES_SGD=2
CURRENCY_DECIMAL_PLACES_INR=0

# Regional Payment Preferences
PAYMENT_PREFERENCE_US=stripe
PAYMENT_PREFERENCE_EU=stripe
PAYMENT_PREFERENCE_GB=stripe
PAYMENT_PREFERENCE_SG=ramp
PAYMENT_PREFERENCE_IN=razorpay

# ==========================================
# COMPLIANCE & REGULATORY
# ==========================================

# AML Compliance
AML_SCREENING_ENABLED=true
AML_DAILY_LIMIT_USD=10000
AML_MONTHLY_LIMIT_USD=50000

# GDPR Compliance
GDPR_ENABLED=true
DATA_RETENTION_DAYS=2555

# Regional Compliance
US_COMPLIANCE_ENABLED=true
EU_COMPLIANCE_ENABLED=true
UK_COMPLIANCE_ENABLED=true
SG_COMPLIANCE_ENABLED=true
IN_COMPLIANCE_ENABLED=true

# ==========================================
# DEVELOPMENT & DEBUGGING
# ==========================================
DEBUG_MODE=false
VERBOSE_LOGGING=false
ENABLE_CORS=true
CORS_ORIGINS=https://nexvestxr.com,https://www.nexvestxr.com

# ==========================================
# ENVIRONMENT-SPECIFIC OVERRIDES
# ==========================================

# Staging Environment Overrides
# MONGO_URI_STAGING=mongodb://staging-mongo-connection
# XRPL_SERVER_STAGING=wss://s.altnet.rippletest.net:51233
# FLARE_RPC_URL_STAGING=https://coston2-api.flare.network/ext/bc/C/rpc

# Production Environment Overrides
# MONGO_URI_PRODUCTION=mongodb://production-mongo-connection
# XRPL_SERVER_PRODUCTION=wss://xrplcluster.com
# FLARE_RPC_URL_PRODUCTION=https://flare-api.flare.network/ext/bc/C/rpc

# ==========================================
# SECRETS MANAGEMENT
# ==========================================
# Note: In production, consider using HashiCorp Vault, AWS Secrets Manager,
# or Azure Key Vault for managing sensitive environment variables

# Example for AWS Secrets Manager
# AWS_SECRETS_REGION=us-east-1
# AWS_SECRETS_PREFIX=nexvestxr/production/

# Example for HashiCorp Vault
# VAULT_URL=https://vault.yourcompany.com
# VAULT_ROLE_ID=your-role-id
# VAULT_SECRET_ID=your-secret-id

# ==========================================
# CONTAINER ORCHESTRATION
# ==========================================

# Docker Swarm / Kubernetes Configuration
REPLICA_COUNT=3
AUTO_SCALING_ENABLED=true
MIN_REPLICAS=2
MAX_REPLICAS=10
CPU_LIMIT=2000m
MEMORY_LIMIT=4Gi
CPU_REQUEST=500m
MEMORY_REQUEST=1Gi

# ==========================================
# LOAD BALANCER CONFIGURATION
# ==========================================
LOAD_BALANCER_ALGORITHM=round_robin
SESSION_AFFINITY=false
HEALTH_CHECK_PATH=/health
HEALTH_CHECK_INTERVAL=30s

# ==========================================
# CUSTOM BUSINESS LOGIC
# ==========================================

# Investment Limits
MIN_INVESTMENT_USD=10
MAX_INVESTMENT_USD=1000000
DAILY_INVESTMENT_LIMIT_USD=50000

# Property Token Configuration
MIN_TOKEN_PRICE_INR=1000
MAX_TOKEN_PRICE_INR=10000000
TOKEN_DECIMAL_PLACES=6

# Trading Configuration
TRADING_FEE_PERCENTAGE=0.2
MARKET_MAKER_FEE_PERCENTAGE=0.1
WITHDRAWAL_FEE_XRP=0.02

# ==========================================
# DISASTER RECOVERY
# ==========================================
BACKUP_ENCRYPTION_KEY=YOUR_BACKUP_ENCRYPTION_KEY
DISASTER_RECOVERY_SITE=https://dr.nexvestxr.com
FAILOVER_ENABLED=true
RTO_MINUTES=30
RPO_MINUTES=15

# ==========================================
# NOTES
# ==========================================
# 1. Replace all YOUR_* placeholders with actual values
# 2. Store this file securely and never commit to version control
# 3. Use different values for staging/production environments
# 4. Regularly rotate secrets and API keys
# 5. Monitor for any leaked credentials
# 6. Consider using a secrets management service for production
# 7. Ensure all team members understand security practices
# 8. Regular security audits of environment configurations
# 9. Implement proper access controls for environment files
# 10. Document all environment variables and their purposes