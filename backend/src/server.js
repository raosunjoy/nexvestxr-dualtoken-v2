const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const redis = require('redis');
const { createServer } = require('http');
const { Server } = require('socket.io');
const winston = require('winston');
const Sentry = require('@sentry/node');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./docs/api-docs');
require('dotenv').config();

require('./models/User');

// Import routes
const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payment');
const paymentWebhookRoutes = require('./routes/paymentWebhook');
const tradeRoutes = require('./routes/trade');
const subscriptionRoutes = require('./routes/subscription');
const propertyRoutes = require('./routes/property');
const advancedTradeRoutes = require('./routes/advancedTrade');
const flareRoutes = require('./routes/flare');
const xummRoutes = require('./routes/xumm');
const portfolioRoutes = require('./routes/portfolio');
const ekycRoutes = require('./routes/eKYC');
const taxRoutes = require('./routes/tax');
const supportRoutes = require('./routes/support');
const supportMetricsRoutes = require('./routes/supportMetrics');
const userMetricsRoutes = require('./routes/userMetrics');
const notificationsRoutes = require('./routes/notifications');
const dualTokenRoutes = require('./routes/dualToken');

// Import middleware
const sebiRestriction = require('./middleware/sebiRestriction');

// Import services
const AdvancedTradeService = require('./services/AdvancedTradeService');
const WebSocketService = require('./services/WebSocketService');
const flareService = require('./services/FlareService');

// Logger setup
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
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

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV || 'development',
});

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3001",
    methods: ["GET", "POST"]
  }
});

// Use Sentry middleware
app.use(Sentry.Handlers.requestHandler());

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"],
    },
  },
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes  
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts'
});

app.use(generalLimiter);
app.use('/api/auth', authLimiter);

// Rate limiting for other SaaS endpoints
const saasLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/property', saasLimiter);
app.use('/api/subscription', saasLimiter);
app.use('/api/trade', saasLimiter);
app.use('/api/advanced-trade', saasLimiter);
app.use('/api/payment', saasLimiter);
app.use('/api/ekyc', saasLimiter);
app.use('/api/tax', saasLimiter);
app.use('/api/support', saasLimiter);

// Basic middleware
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3001",
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Apply SEBI restriction middleware to investor routes
app.use('/api/trade', sebiRestriction);
app.use('/api/advanced-trade', sebiRestriction);
app.use('/api/portfolio', sebiRestriction);

// Swagger UI setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/payment/webhook', paymentWebhookRoutes);
app.use('/api/trade', tradeRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/property', propertyRoutes);
app.use('/api/advanced-trade', advancedTradeRoutes);
app.use('/api/flare', flareRoutes);
app.use('/api/xumm', xummRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/ekyc', ekycRoutes);
app.use('/api/tax', taxRoutes);
app.use('/api/support', supportRoutes);
app.use('/support-metrics', supportMetricsRoutes);
app.use('/user-metrics', userMetricsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/dual-token', dualTokenRoutes);

// KYC status endpoints
app.post('/api/organizations/:orgId/kyc-status', async (req, res) => {
  const { orgId } = req.params;
  const { status } = req.body;
  const txHash = await flareService.setKYCStatus(orgId, status);
  res.json({ success: true, data: { txHash } });
});

app.get('/api/organizations/:orgId/kyc-status', async (req, res) => {
  const { orgId } = req.params;
  const status = await flareService.getKYCStatus(orgId);
  res.json({ success: true, data: status });
});

// WebSocket service initialization
const webSocketService = new WebSocketService(io);

// Error handling middleware
app.use(Sentry.Handlers.errorHandler());
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Database connections
async function connectDatabases() {
  try {
    // MongoDB connection
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info('Connected to MongoDB');

    // Redis connection
    const redisClient = redis.createClient({
      url: process.env.REDIS_URL
    });
    
    redisClient.on('error', (err) => {
      logger.error('Redis connection error', { error: err.message });
      Sentry.captureException(err);
    });
    
    await redisClient.connect();
    logger.info('Connected to Redis');

    // Store redis client globally for services
    global.redisClient = redisClient;

  } catch (error) {
    logger.error('Database connection failed', { error: error.message });
    Sentry.captureException(error);
    process.exit(1);
  }
}

// Initialize services
async function initializeServices() {
  try {
    // Initialize Advanced Trade Service
    await AdvancedTradeService.initialize();
    logger.info('Advanced Trade Service initialized');
    
    // Initialize WebSocket service
    await webSocketService.initialize();
    logger.info('WebSocket Service initialized');
    
  } catch (error) {
    logger.error('Service initialization failed', { error: error.message });
    Sentry.captureException(error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  await mongoose.connection.close();
  logger.info('MongoDB connection closed');
  
  if (global.redisClient) {
    await global.redisClient.quit();
    logger.info('Redis connection closed');
  }
  
  process.exit(0);
});

// Start server
async function startServer() {
  await connectDatabases();
  await initializeServices();
  
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    logger.info(`NexVestXR Backend Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer().catch((error) => {
  logger.error('Server startup failed', { error: error.message });
  Sentry.captureException(error);
  process.exit(1);
});

module.exports = { app, server, io, mongoose };

