const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

class WebSocketService {
  constructor(io) {
    this.io = io;
    this.initialize();
  }

  async initialize() {
    try {
      this.io.on('connection', (socket) => {
        logger.info('New WebSocket connection', { socketId: socket.id });

        socket.on('subscribe', (data) => {
          const { pairId } = data;
          socket.join(pairId);
          logger.info('Client subscribed to pair', { socketId: socket.id, pairId });
        });

        socket.on('disconnect', () => {
          logger.info('WebSocket disconnected', { socketId: socket.id });
        });
      });

      // Simulate market updates (in production, integrate with XRPL ledger updates)
      setInterval(() => {
        this.broadcastMarketUpdate('JVCOIMB789/XRP', {
          price: (1000 + Math.random() * 100).toFixed(2),
          change24h: (Math.random() * 5).toFixed(2),
        });
      }, 10000);
    } catch (error) {
      logger.error('WebSocket initialization failed', { error: error.message });
      throw error;
    }
  }

  broadcastMarketUpdate(pairId, update) {
    this.io.to(pairId).emit('marketUpdate', update);
    logger.info('Broadcast market update', { pairId, update });
  }
}

module.exports = WebSocketService;