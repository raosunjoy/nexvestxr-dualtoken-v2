# Flare Network Configuration
FLARE_RPC_URL=\${FLARE_RPC_URL_$ENVIRONMENT}
FLARE_PRIVATE_KEY=\${FLARE_PRIVATE_KEY_$ENVIRONMENT}
PROPERTY_FACTORY_ADDRESS=\${PROPERTY_FACTORY_ADDRESS_$ENVIRONMENT}
PRICE_AGGREGATOR_ADDRESS=\${PRICE_AGGREGATOR_ADDRESS_$ENVIRONMENT}

# Payment Gateway Configuration
STRIPE_API_KEY=\${STRIPE_API_KEY_$ENVIRONMENT}
STRIPE_WEBHOOK_SECRET=\${STRIPE_WEBHOOK_SECRET_$ENVIRONMENT}
MOONPAY_API_KEY=\${MOONPAY_API_KEY_$ENVIRONMENT}
MOONPAY_SECRET=\${MOONPAY_SECRET_$ENVIRONMENT}
RAMP_API_KEY=\${RAMP_API_KEY_$ENVIRONMENT}

# Security Configuration
JWT_SECRET=\${JWT_SECRET_$ENVIRONMENT}
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# AI Service Configuration
AI_SERVICE_URL=http://ai-service:5000
ENABLE_AI_SERVICE=true

# Feature Flags
ENABLE_CURRENCY_AUTO_DETECTION=true
ENABLE_REAL_TIME_EXCHANGE_RATES=true
ENABLE_MULTI_CURRENCY_DISPLAY=true
ENABLE_B2B_INR_ONLY=true
ENABLE_CONSUMER_LOCALIZATION=true

# Analytics & Monitoring
GOOGLE_ANALYTICS_ID=\${GOOGLE_ANALYTICS_ID}
MIXPANEL_TOKEN=\${MIXPANEL_TOKEN}
SENTRY_DSN=\${SENTRY_DSN}

# Email Configuration
SENDGRID_API_KEY=\${SENDGRID_API_KEY}
FROM_EMAIL=noreply@nexvestxr.com

# Geolocation & Currency Detection
MAXMIND_LICENSE_KEY=\${MAXMIND_LICENSE_KEY}
IP_GEOLOCATION_API_KEY=\${IP_GEOLOCATION_API_KEY}

# Social Media & Marketing
FACEBOOK_PIXEL_ID=\${FACEBOOK_PIXEL_ID}
LINKEDIN_INSIGHT_TAG=\${LINKEDIN_INSIGHT_TAG}
TWITTER_PIXEL_ID=\${TWITTER_PIXEL_ID}
EOF

    log "INFO" "Environment configuration created successfully"
}

# Setup Docker configuration for multi-currency platform
create_docker_config() {
    log "INFO" "Creating Docker configuration with currency services"
    
    cat > docker-compose.$ENVIRONMENT.yml << 'EOF'
version: '3.8'

services:
  # Nginx Reverse Proxy with Currency Detection
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/sites-available/nexvestxr.conf:/etc/nginx/conf.d/default.conf
      - ./ssl:/etc/nginx/ssl
      - ./nginx/geoip:/etc/nginx/geoip
    depends_on:
      - nexvestxr-backend
      - nexvestxr-frontend
    networks:
      - nexvestxr-network
    restart: unless-stopped

  # Backend Service with Currency Support
  nexvestxr-backend:
    image: nexvestxr-backend:${ENVIRONMENT}
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGO_URI=${MONGO_URI}
      - REDIS_URL=redis://redis:6379
      - EXCHANGE_RATE_API_KEY=${EXCHANGE_RATE_API_KEY}
      - XRPL_SERVER=${XRPL_SERVER}
      - XUMM_API_KEY=${XUMM_API_KEY}
      - XUMM_API_SECRET=${XUMM_API_SECRET}
      - FLARE_RPC_URL=${FLARE_RPC_URL}
      - FLARE_PRIVATE_KEY=${FLARE_PRIVATE_KEY}
      - STRIPE_API_KEY=${STRIPE_API_KEY}
      - MOONPAY_API_KEY=${MOONPAY_API_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - AI_SERVICE_URL=http://ai-service:5000
    volumes:
      - ./logs/backend:/app/logs
      - ./uploads:/app/uploads
      - ./currency-data:/app/currency-data
    depends_on:
      - mongo1
      - redis
      - ai-service
      - currency-service
    networks:
      - nexvestxr-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Frontend Service with Currency Localization
  nexvestxr-frontend:
    image: nexvestxr-frontend:${ENVIRONMENT}
    ports:
      - "3001:80"
    environment:
      - REACT_APP_API_URL=https://api.${DOMAIN}
      - REACT_APP_XUMM_API_KEY=${XUMM_API_KEY}
      - REACT_APP_ENVIRONMENT=${ENVIRONMENT}
      - REACT_APP_ENABLE_CURRENCY_DETECTION=true
      - REACT_APP_SUPPORTED_CURRENCIES=USD,EUR,GBP,SGD,INR
      - REACT_APP_DEFAULT_CURRENCY=USD
    volumes:
      - ./logs/frontend:/var/log/nginx
    depends_on:
      - nexvestxr-backend
    networks:
      - nexvestxr-network
    restart: unless-stopped

  # Currency Service (Dedicated Microservice)
  currency-service:
    image: nexvestxr-currency:${ENVIRONMENT}
    ports:
      - "3002:3000"
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
      - EXCHANGE_RATE_API_KEY=${EXCHANGE_RATE_API_KEY}
      - MONGO_URI=${MONGO_URI}
      - SUPPORTED_CURRENCIES=USD,EUR,GBP,SGD,INR
      - UPDATE_INTERVAL=900000
    volumes:
      - ./logs/currency-service:/app/logs
      - ./currency-data:/app/data
    depends_on:
      - redis
      - mongo1
    networks:
      - nexvestxr-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 60s
      timeout: 15s
      retries: 3

  # AI Service
  ai-service:
    image: nexvestxr-ai:${ENVIRONMENT}
    ports:
      - "5000:5000"
    volumes:
      - ./ai-service/models:/app/models
      - ./ai-service/data:/app/data
      - ./logs/ai-service:/app/logs
    environment:
      - FLASK_ENV=production
      - MODEL_PATH=/app/models
      - REDIS_URL=redis://redis:6379
    networks:
      - nexvestxr-network
    restart: unless-stopped

  # MongoDB Primary
  mongo1:
    image: mongo:5.0
    command: mongod --replSet rs0 --bind_ip_all --auth
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
      MONGO_INITDB_DATABASE: nexvestxr
    volumes:
      - mongo1-data:/data/db
      - ./mongodb/mongod.conf:/etc/mongod.conf
      - ./mongodb/init-replica-set.js:/docker-entrypoint-initdb.d/init-replica-set.js
    networks:
      - nexvestxr-network
    restart: unless-stopped

  # Redis Cache with Currency Data
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD} --maxmemory 2gb --maxmemory-policy allkeys-lru
    volumes:
      - redis-data:/data
      - ./redis/redis.conf:/usr/local/etc/redis/redis.conf
    networks:
      - nexvestxr-network
    restart: unless-stopped

  # Prometheus Monitoring
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - prometheus-data:/prometheus
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
    networks:
      - nexvestxr-network
    restart: unless-stopped

  # Grafana Dashboard
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3003:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/dashboards:/var/lib/grafana/dashboards
    networks:
      - nexvestxr-network
    restart: unless-stopped

volumes:
  mongo1-data:
  redis-data:
  prometheus-data:
  grafana-data:

networks:
  nexvestxr-network:
    driver: bridge
EOF

    log "INFO" "Docker configuration created successfully"
}

# Create Nginx configuration with GeoIP for currency detection
create_nginx_config() {
    log "INFO" "Creating Nginx configuration with GeoIP support"
    
    mkdir -p nginx/sites-available
    
    cat > nginx/sites-available/nexvestxr.conf << 'EOF'
# NexVestXR Nginx Configuration with Currency Detection

# GeoIP Configuration for Currency Detection
geoip_country /etc/nginx/geoip/GeoIP.dat;
geoip_city /etc/nginx/geoip/GeoLiteCity.dat;

# Currency mapping based on country
map $geoip_country_code $detected_currency {
    default "USD";
    US "USD";
    UM "USD";
    VI "USD";
    
    # European Union Countries
    DE "EUR";
    FR "EUR";
    IT "EUR";
    ES "EUR";
    NL "EUR";
    BE "EUR";
    AT "EUR";
    PT "EUR";
    IE "EUR";
    FI "EUR";
    EE "EUR";
    LV "EUR";
    LT "EUR";
    LU "EUR";
    MT "EUR";
    CY "EUR";
    SK "EUR";
    SI "EUR";
    
    # British Pound
    GB "GBP";
    
    # Singapore Dollar
    SG "SGD";
    
    # Indian Rupee
    IN "INR";
}

# Regional grouping for marketing
map $geoip_country_code $user_region {
    default "global";
    US "north_america";
    CA "north_america";
    MX "north_america";
    
    GB "europe";
    DE "europe";
    FR "europe";
    IT "europe";
    ES "europe";
    NL "europe";
    
    SG "asia_pacific";
    MY "asia_pacific";
    TH "asia_pacific";
    VN "asia_pacific";
    PH "asia_pacific";
    
    IN "india";
    
    AE "middle_east";
    SA "middle_east";
    QA "middle_east";
    KW "middle_east";
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name ${DOMAIN} api.${DOMAIN} *.${DOMAIN};
    return 301 https://$server_name$request_uri;
}

# Main frontend server with currency detection
server {
    listen 443 ssl http2;
    server_name ${DOMAIN};

    # SSL configuration
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

    # Currency detection headers
    add_header X-Detected-Currency $detected_currency;
    add_header X-User-Region $user_region;
    add_header X-Country-Code $geoip_country_code;

    # Frontend proxy with currency headers
    location / {
        proxy_pass http://nexvestxr-frontend:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Currency detection headers
        proxy_set_header X-Detected-Currency $detected_currency;
        proxy_set_header X-User-Region $user_region;
        proxy_set_header X-Country-Code $geoip_country_code;
        proxy_set_header X-City $geoip_city;

        # Cache static assets with currency-aware caching
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            add_header Vary "Accept-Encoding, X-Detected-Currency";
            proxy_pass http://nexvestxr-frontend:80;
        }
    }

    # Currency-specific landing pages
    location ~ ^/(usd|eur|gbp|sgd|inr)(/.*)?$ {
        rewrite ^/([a-z]{3})(/.*)?$ $2?currency=$1 last;
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}

# API server with currency detection
server {
    listen 443 ssl http2;
    server_name api.${DOMAIN};

    # SSL configuration
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/s;

    # API proxy with currency detection
    location / {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://nexvestxr-backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Currency detection headers
        proxy_set_header X-Detected-Currency $detected_currency;
        proxy_set_header X-User-Region $user_region;
        proxy_set_header X-Country-Code $geoip_country_code;
    }

    # Currency service endpoints
    location /api/currency/ {
        proxy_pass http://currency-service:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Detected-Currency $detected_currency;
        proxy_set_header X-User-Region $user_region;
    }

    # Authentication with stricter rate limiting
    location ~ ^/api/(auth|kyc|payment) {
        limit_req zone=auth burst=5 nodelay;
        
        proxy_pass http://nexvestxr-backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Detected-Currency $detected_currency;
    }

    # File upload with currency context
    location /api/upload {
        client_max_body_size 50M;
        proxy_pass http://nexvestxr-backend:3000;
        proxy_set_header X-Detected-Currency $detected_currency;
        proxy_set_header X-User-Region $user_region;
    }
}
EOF

    log "INFO" "Nginx configuration created successfully"
}

# Create currency-specific marketing configurations
create_marketing_configs() {
    log "INFO" "Creating currency-specific marketing configurations"
    
    mkdir -p marketing/configs
    
    # US Market Configuration
    cat > marketing/configs/usd-market.json << 'EOF'
{
  "market": "USD",
  "region": "North America",
  "targetAudience": "Indian Americans",
  "messaging": {
    "headline": "Mobile-First Cross-Border Real Estate Investment",
    "subheadline": "Invest in Mumbai real estate from Silicon Valley in 31 seconds",
    "cta": "Start with $25",
    "minInvestment": "$12",
    "averageInvestment": "$300",
    "successStory": "Own Mumbai real estate for $12"
  },
  "investmentAmounts": [12, 50, 100, 500, 1000, 5000],
  "adPlatforms": {
    "facebook": {
      "budget": 2500,
      "targeting": "Indian Americans, Real Estate Interest",
      "creative": "USD-specific visuals"
    },
    "google": {
      "budget": 2000,
      "keywords": ["real estate investment", "cross border investment", "Indian property"],
      "landingPage": "/usd"
    }
  },
  "compliance": "SEC-compliant investment platform for US investors"
}
EOF

    # European Market Configuration
    cat > marketing/configs/eur-market.json << 'EOF'
{
  "market": "EUR",
  "region": "Europe",
  "targetAudience": "European Indians",
  "messaging": {
    "headline": "European Gateway to Indian Real Estate",
    "subheadline": "Invest in India's booming property market from Europe",
    "cta": "Start with €22",
    "minInvestment": "€10",
    "averageInvestment": "€270",
    "successStory": "Own Indian real estate for €10"
  },
  "investmentAmounts": [10, 45, 90, 450, 900, 4500],
  "adPlatforms": {
    "facebook": {
      "budget": 1500,
      "targeting": "Indian diaspora in EU, Property Investment",
      "creative": "EUR-specific visuals"
    },
    "google": {
      "budget": 1000,
      "keywords": ["India immobilien", "real estate investment Europe"],
      "landingPage": "/eur"
    }
  },
  "compliance": "MiFID II compliant for European investors"
}
EOF

    # Singapore Market Configuration
    cat > marketing/configs/sgd-market.json << 'EOF'
{
  "market": "SGD",
  "region": "Asia Pacific",
  "targetAudience": "Singapore Indians",
  "messaging": {
    "headline": "Singapore to India Real Estate Bridge",
    "subheadline": "Connect Singapore wealth with Indian property growth",
    "cta": "Start with S$35",
    "minInvestment": "S$16",
    "averageInvestment": "S$405",
    "successStory": "Own Indian real estate for S$16"
  },
  "investmentAmounts": [16, 70, 135, 675, 1350, 6750],
  "adPlatforms": {
    "facebook": {
      "budget": 1000,
      "targeting": "Singapore Indians, Cross-border Investment",
      "creative": "SGD-specific visuals"
    },
    "google": {
      "budget": 800,
      "keywords": ["India property investment Singapore", "cross border real estate"],
      "landingPage": "/sgd"
    }
  },
  "compliance": "MAS regulated platform for Singapore investors"
}
EOF

    # UK Market Configuration
    cat > marketing/configs/gbp-market.json << 'EOF'
{
  "market": "GBP",
  "region": "United Kingdom",
  "targetAudience": "British Indians",
  "messaging": {
    "headline": "From London to Mumbai in 31 Seconds",
    "subheadline": "British Indians' gateway to Indian real estate investment",
    "cta": "Start with £20",
    "minInvestment": "£8",
    "averageInvestment": "£240",
    "successStory": "Own Mumbai property for £8"
  },
  "investmentAmounts": [8, 40, 80, 400, 800, 4000],
  "adPlatforms": {
    "facebook": {
      "budget": 1200,
      "targeting": "British Indians, Property Investment UK",
      "creative": "GBP-specific visuals"
    },
    "google": {
      "budget": 1000,
      "keywords": ["India property investment UK", "British Indian real estate"],
      "landingPage": "/gbp"
    }
  },
  "compliance": "FCA guidelines compliant for UK investors"
}
EOF

    # Indian Market Configuration
    cat > marketing/configs/inr-market.json << 'EOF'
{
  "market": "INR",
  "region": "India",
  "targetAudience": "Indian Retail Investors",
  "messaging": {
    "headline": "India's Mobile-First Real Estate Platform",
    "subheadline": "Democratizing real estate investment for every Indian",
    "cta": "Start with ₹2,500",
    "minInvestment": "₹1,000",
    "averageInvestment": "₹25,000",
    "successStory": "Own premium Mumbai property for ₹1,000"
  },
  "investmentAmounts": [1000, 5000, 10000, 50000, 100000, 500000],
  "adPlatforms": {
    "facebook": {
      "budget": 150000,
      "targeting": "Urban Indians, Real Estate Investment",
      "creative": "INR-specific visuals"
    },
    "google": {
      "budget": 100000,
      "keywords": ["real estate investment India", "property investment platform"],
      "landingPage": "/inr"
    }
  },
  "compliance": "RBI and SEBI compliant for Indian investors"
}
EOF

    log "INFO" "Marketing configurations created successfully"
}

# Setup monitoring and analytics for currency tracking
setup_currency_monitoring() {
    log "INFO" "Setting up currency-specific monitoring and analytics"
    
    mkdir -p monitoring/dashboards
    
    cat > monitoring/dashboards/currency-analytics.json << 'EOF'
{
  "dashboard": {
    "title": "NexVestXR Currency Analytics",
    "panels": [
      {
        "title": "User Distribution by Currency",
        "type": "piechart",
        "targets": [
          {
            "expr": "sum by (currency) (nexvestxr_users_total)",
            "legendFormat": "{{currency}}"
          }
        ]
      },
      {
        "title": "Investment Volume by Currency",
        "type": "graph",
        "targets": [
          {
            "expr": "sum by (currency) (rate(nexvestxr_investments_total[5m]))",
            "legendFormat": "{{currency}}"
          }
        ]
      },
      {
        "title": "Exchange Rate Performance",
        "type": "graph",
        "targets": [
          {
            "expr": "nexvestxr_exchange_rates",
            "legendFormat": "{{currency}}"
          }
        ]
      },
      {
        "title": "Currency Detection Accuracy",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(nexvestxr_currency_detection_correct) / sum(nexvestxr_currency_detection_total) * 100",
            "legendFormat": "Detection Accuracy %"
          }
        ]
      },
      {
        "title": "Top Converting Currencies",
        "type": "table",
        "targets": [
          {
            "expr": "topk(5, sum by (currency) (nexvestxr_conversions_total))",
            "format": "table"
          }
        ]
      },
      {
        "title": "Revenue by Currency (USD Equivalent)",
        "type": "graph",
        "targets": [
          {
            "expr": "sum by (currency) (nexvestxr_revenue_usd_equivalent)",
            "legendFormat": "{{currency}}"
          }
        ]
      }
    ]
  }
}
EOF

    log "INFO" "Currency monitoring dashboard created successfully"
}

# Create database migration scripts for currency support
create_currency_migrations() {
    log "INFO" "Creating database migration scripts for currency support"
    
    mkdir -p migrations
    
    cat > migrations/001_add_currency_support.js << 'EOF'
// Migration: Add currency support to existing data
db.users.updateMany(
  { preferredCurrency: { $exists: false } },
  { 
    $set: { 
      preferredCurrency: "USD",
      detectedCurrency: "USD",
      detectedCountry: "Unknown"
    } 
  }
);

// Add currency indexes
db.users.createIndex({ "preferredCurrency": 1 });
db.users.createIndex({ "country": 1, "preferredCurrency": 1 });

// Create exchange rates collection
db.createCollection("exchangerates");
db.exchangerates.createIndex({ "lastUpdated": -1 });

// Add currency fields to investments
db.investments.updateMany(
  { "investment.originalCurrency": { $exists: false } },
  {
    $set: {
      "investment.originalCurrency.currency": "USD",
      "investment.originalCurrency.exchangeRate": 1.0
    }
  }
);

// Add currency indexes to investments
db.investments.createIndex({ "investment.originalCurrency.currency": 1 });

// Create campaigns collection with currency targeting
db.createCollection("campaigns");
db.campaigns.createIndex({ "targeting.currencies": 1 });
db.campaigns.createIndex({ "targeting.countries": 1 });

// Insert initial exchange rate data
db.exchangerates.insertOne({
  baseCurrency: "USD",
  rates: {
    USD: 1.0,
    EUR: 0.85,
    GBP: 0.73,
    SGD: 1.35,
    INR: 83.0
  },
  lastUpdated: new Date(),
  source: "initial"
});

print("Currency support migration completed successfully");
EOF

    cat > migrations/002_add_b2b_inr_enforcement.js << 'EOF'
// Migration: Ensure B2B entities use INR
db.properties.updateMany(
  { "valuation.inr": { $exists: false } },
  [
    {
      $set: {
        "valuation.inr": { $multiply: ["$valuation.usd", 83] },
        "valuation.lastUpdated": new Date()
      }
    }
  ]
);

// Ensure tokenization pricing is in INR
db.properties.updateMany(
  { "tokenization.tokenPrice.minInvestment.inr": { $exists: false } },
  [
    {
      $set: {
        "tokenization.tokenPrice.minInvestment": {
          inr: { $multiply: ["$tokenization.tokenPrice.usd", 83] },
          usd: "$tokenization.tokenPrice.usd",
          eur: { $multiply: ["$tokenization.tokenPrice.usd", 0.85] },
          gbp: { $multiply: ["$tokenization.tokenPrice.usd", 0.73] },
          sgd: { $multiply: ["$tokenization.tokenPrice.usd", 1.35] }
        }
      }
    }
  ]
);

// Index B2B fields
db.properties.createIndex({ "ownerUserId": 1, "tokenType": 1 });
db.users.createIndex({ "userType": 1 });

print("B2B INR enforcement migration completed successfully");
EOF

    log "INFO" "Database migration scripts created successfully"
}

# Main deployment function
main() {
    local start_time=$(date +%s)
    
    log "INFO" "Starting NexVestXR multi-currency platform deployment"
    log "INFO" "Environment: $ENVIRONMENT"
    log "INFO" "Domain: $DOMAIN"
    
    # Create configurations
    create_env_config
    create_docker_config
    create_nginx_config
    create_marketing_configs
    setup_currency_monitoring
    create_currency_migrations
    
    # Build and deploy
    log "INFO" "Building Docker images..."
    docker-compose -f docker-compose.$ENVIRONMENT.yml build
    
    log "INFO" "Starting services..."
    docker-compose -f docker-compose.$ENVIRONMENT.yml up -d
    
    # Wait for services to be ready
    log "INFO" "Waiting for services to be ready..."
    sleep 60
    
    # Run database migrations
    log "INFO" "Running database migrations..."
    docker-compose -f docker-compose.$ENVIRONMENT.yml exec -T mongo1 mongo nexvestxr /docker-entrypoint-initdb.d/001_add_currency_support.js
    docker-compose -f docker-compose.$ENVIRONMENT.yml exec -T mongo1 mongo nexvestxr /docker-entrypoint-initdb.d/002_add_b2b_inr_enforcement.js
    
    # Health checks
    log "INFO" "Running health checks..."
    
    # Test currency service
    if curl -f http://localhost:3002/health > /dev/null 2>&1; then
        log "INFO" "✓ Currency service is healthy"
    else
        log "ERROR" "✗ Currency service health check failed"
        exit 1
    fi
    
    # Test main backend
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        log "INFO" "✓ Backend service is healthy"
    else
        log "ERROR" "✗ Backend service health check failed"
        exit 1
    fi
    
    # Test frontend
    if curl -f http://localhost:3001 > /dev/null 2>&1; then
        log "INFO" "✓ Frontend service is healthy"
    else
        log "ERROR" "✗ Frontend service health check failed"
        exit 1
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log "INFO" "NexVestXR multi-currency deployment completed successfully in ${duration}s"
    
    # Display deployment summary
    cat << EOF

🎉 NexVestXR Multi-Currency Platform Deployed Successfully!

📊 Platform Features:
✅ 5 currencies supported (USD, EUR, GBP, SGD, INR)
✅ Automatic currency detection via GeoIP
✅ Real-time exchange rates (15min updates)
✅#!/bin/bash
# deployment/deploy-nexvestxr-currency.sh
# Complete deployment script for NexVestXR multi-currency platform

set -euo pipefail

# Configuration
PROJECT_NAME="nexvestxr"
ENVIRONMENT=${1:-"staging"}
DOMAIN=${2:-"nexvestxr.com"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")  echo -e "${GREEN}[INFO]${NC} $message" ;;
        "WARN")  echo -e "${YELLOW}[WARN]${NC} $message" ;;
        "ERROR") echo -e "${RED}[ERROR]${NC} $message" ;;
        "DEBUG") echo -e "${BLUE}[DEBUG]${NC} $message" ;;
    esac
}

# Create environment-specific configuration
create_env_config() {
    log "INFO" "Creating environment configuration for $ENVIRONMENT"
    
    cat > .env.$ENVIRONMENT << EOF
# NexVestXR Multi-Currency Platform Configuration
NODE_ENV=production
ENVIRONMENT=$ENVIRONMENT

# Server Configuration
PORT=3000
API_URL=https://api.$DOMAIN
FRONTEND_URL=https://$DOMAIN

# Database Configuration
MONGO_URI=\${MONGO_URI_$ENVIRONMENT}
REDIS_URL=redis://redis:6379

# Currency Service Configuration
EXCHANGE_RATE_API_KEY=\${EXCHANGE_RATE_API_KEY}
EXCHANGE_RATE_API_URL=https://api.exchangerate-api.com/v4/latest/USD
GEO_LOCATION_API_URL=http://ip-api.com/json/
SUPPORTED_CURRENCIES=USD,EUR,GBP,SGD,INR
BASE_CURRENCY=USD

# XRPL Configuration
XRPL_SERVER=\${XRPL_SERVER_$ENVIRONMENT}
XRPL_ISSUER_SEED=\${XRPL_ISSUER_SEED_$ENVIRONMENT}

# XUMM Integration
XUMM_API_KEY=\${XUMM_API_KEY_$ENVIRONMENT}
XUMM_API_SECRET=\${XUMM_API_SECRET_$ENVIRONMENT}

# Flare Network Configuration
FLARE_RPC_URL=\${FLARE_RPC_URL_$ENVIRONMENT}
FLARE