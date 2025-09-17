const express = require('express');
const cors = require('cors');
const compression = require('compression');
const WebSocket = require('ws');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Custom modules
const config = require('./config/environment');
const logger = require('./utils/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { helmet, apiLimiter } = require('./middleware/security');
const redisService = require('./services/redisService');
const websocketService = require('./services/websocketService');

// Routes
const stocksRoutes = require('./routes/stocks');
const newsRoutes = require('./routes/news');
const healthRoutes = require('./routes/health');
const monitoringRoutes = require('./routes/monitoring');

const app = express();
const PORT = config.port;

// Trust proxy (rate limiting için)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet);

// Compression middleware
app.use(compression());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    logger.info(`${req.method} ${req.url}`, {
      status: res.statusCode,
      responseTime: `${responseTime}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  });
  
  next();
});

// Database setup
const db = new sqlite3.Database(path.join(__dirname, 'database/tradepro.db'), (err) => {
  if (err) {
    logger.error('Error opening database:', err.message);
  } else {
    logger.info('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS alarms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      type TEXT NOT NULL,
      condition TEXT NOT NULL,
      value REAL NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`,
    `CREATE TABLE IF NOT EXISTS watchlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      UNIQUE(user_id, symbol)
    )`
  ];

  tables.forEach(sql => {
    db.run(sql, (err) => {
      if (err) {
        logger.error('Database initialization error:', err.message);
      }
    });
  });
}

// API Routes
app.use('/api/stocks', stocksRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/monitoring', monitoringRoutes);

// Legacy API endpoints (backward compatibility)
app.get('/api/search', apiLimiter, (req, res) => {
  res.redirect('/api/stocks/search/' + encodeURIComponent(req.query.q || ''));
});

// HTTP server
const server = require('http').createServer(app);

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

// Graceful shutdown
async function gracefulShutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully`);
  
  try {
    // Close WebSocket service
    websocketService.cleanup();
    
    // Close Redis connections
    await redisService.disconnect();
    
    // Close HTTP server
    server.close(() => {
      logger.info('HTTP server closed');
      
      // Close database
      db.close((err) => {
        if (err) {
          logger.error('Error closing database:', err.message);
        } else {
          logger.info('Database connection closed');
        }
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Initialize services and start server
async function startServer() {
  try {
    // Initialize Redis
    logger.info('Initializing Redis service...');
    const redisConnected = await redisService.connect();
    if (redisConnected) {
      logger.info('✅ Redis service connected');
    } else {
      logger.warn('⚠️ Redis service failed to connect, continuing without Redis');
    }

    // Initialize WebSocket service
    logger.info('Initializing WebSocket service...');
    const wsInitialized = websocketService.initialize(server);
    if (wsInitialized) {
      logger.info('✅ WebSocket service initialized');
    } else {
      logger.warn('⚠️ WebSocket service initialization failed');
    }

    // Start HTTP server
    server.listen(PORT, () => {
      logger.info(`🚀 TradePro Alpha server started on port ${PORT}`);
      logger.info(`📊 Environment: ${config.nodeEnv}`);
      logger.info(`🔗 WebSocket: ws://localhost:${PORT}/ws`);
      logger.info(`🌐 Web: http://localhost:${PORT}`);
      logger.info(`📈 Monitoring: http://localhost:${PORT}/api/monitoring/dashboard`);
    });
  } catch (error) {
    logger.error('Server startup failed:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Export for testing
module.exports = app;
