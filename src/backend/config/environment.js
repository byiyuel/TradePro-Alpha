require('dotenv').config();

const config = {
  // Server Configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Security
  jwtSecret: process.env.JWT_SECRET || 'tradepro_secret_key_2024',
  
  // API Keys
  yahooFinanceApiKey: process.env.YAHOO_FINANCE_API_KEY || '',
  newsApiKey: process.env.NEWS_API_KEY || '',
  
  // Database
  dbPath: process.env.DB_PATH || './src/backend/database/tradepro.db',
  
  // Cache Configuration
  cacheDurationMinutes: parseInt(process.env.CACHE_DURATION_MINUTES) || 30,
  cacheMaxSize: parseInt(process.env.CACHE_MAX_SIZE) || 1000,
  
  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  
  // Security Headers
  helmetCspEnabled: process.env.HELMET_CSP_ENABLED === 'true',
  helmetHstsEnabled: process.env.HELMET_HSTS_ENABLED === 'true',
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  logFile: process.env.LOG_FILE || './logs/tradepro.log',
  
  // WebSocket Configuration
  wsHeartbeatInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL) || 30000,
  wsMaxConnections: parseInt(process.env.WS_MAX_CONNECTIONS) || 100,
  
  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB) || 0,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true
  },
};

module.exports = config;
