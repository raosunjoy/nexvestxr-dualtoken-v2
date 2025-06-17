// backend/src/server.js - Complete Express server with currency support
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const { createProxyMiddleware } = require('http-proxy-middleware');

// Import services and middleware
const CurrencyService = require('./services/CurrencyService');
const currencyDetectionMiddleware = require('./middleware/currencyDetection');
const auth = require('./middleware/auth');

// Import routes
const currencyRoutes = require('./routes/currencyRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const investmentRoutes = require('./routes/investmentRoutes');
const authRoutes = require('./routes/authRoutes');
const advancedTradeRoutes = require('./routes/advancedTradeRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  }
}));

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3001',
      'https://nexvestxr.com',
      'https://preprod.nexvestxr.com',
      'https://api.nexvestxr.com'
    ];
    
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Preferred-Currency', 'X-User-Region']
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.'
  }
});

// Apply rate limiting
app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// Currency detection middleware (applies to all routes)
app.use(currencyDetectionMiddleware);

// Request logging
app.use((req, res, next) => {
  logger.info('Request received', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    detectedCurrency: req.detectedCurrency,
    userCurrency: req.userCurrency
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      currency: 'active',
      blockchain: 'active'
    }
  });
});

// API Routes
app.use('/api/currency', currencyRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/advanced-trade', advancedTradeRoutes);
app.use('/api/payment', paymentRoutes);

// WebSocket proxy for real-time trading
app.use('/ws', createProxyMiddleware({
  target: 'ws://localhost:3002',
  ws: true,
  changeOrigin: true
}));

// Metrics endpoint (restricted)
app.get('/metrics', (req, res) => {
  // Only allow access from internal networks
  const allowedIPs = ['127.0.0.1', '::1', '172.20.0.0/16'];
  const clientIP = req.ip;
  
  // Simple IP check (in production, use proper network validation)
  if (!allowedIPs.some(ip => clientIP.includes(ip.split('/')[0]))) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  res.set('Content-Type', 'text/plain');
  res.send(`
# NexVestXR Backend Metrics
nexvestxr_total_requests_total ${global.totalRequests || 0}
nexvestxr_active_users_total ${global.activeUsers || 0}
nexvestxr_total_investments_usd ${global.totalInvestments || 0}
nexvestxr_currency_conversions_total ${global.currencyConversions || 0}
nexvestxr_response_time_seconds ${global.averageResponseTime || 0}
  `);
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });
  
  res.status(error.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: [
      '/api/currency/*',
      '/api/auth/*',
      '/api/properties/*',
      '/api/investments/*',
      '/api/advanced-trade/*',
      '/api/payment/*'
    ]
  });
});

// Database connection
const connectDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    logger.info('MongoDB connected successfully');
    
    // Initialize currency service after DB connection
    await CurrencyService.initializeExchangeRates();
    
  } catch (error) {
    logger.error('MongoDB connection failed', { error: error.message });
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    
    mongoose.connection.close(false, () => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const startServer = async () => {
  try {
    await connectDatabase();
    
    const server = app.listen(PORT, () => {
      logger.info(`NexVestXR Backend Server running on port ${PORT}`, {
        environment: process.env.NODE_ENV,
        port: PORT,
        timestamp: new Date().toISOString()
      });
    });
    
    // Store server reference for graceful shutdown
    global.server = server;
    
    return server;
  } catch (error) {
    logger.error('Server startup failed', { error: error.message });
    process.exit(1);
  }
};

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;