const winston = require('winston');
const path = require('path');
const config = require('../config/environment');

// Log format tanımlama
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Console format (development için)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Logger konfigürasyonu
const logger = winston.createLogger({
  level: config.logLevel,
  format: logFormat,
  defaultMeta: { service: 'tradepro-alpha' },
  transports: [
    // Console transport (development)
    new winston.transports.Console({
      format: consoleFormat
    }),
    
    // File transport (production)
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Combined log file
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ],
});

// Production'da console log'u kapat
if (config.nodeEnv === 'production') {
  logger.remove(logger.transports[0]); // Console transport'u kaldır
}

// Logs klasörünü oluştur - Render.com için geçici dizin
const fs = require('fs');
const logsDir = process.env.NODE_ENV === 'production' 
  ? '/tmp/logs'  // Render.com'da geçici dizin
  : path.join(__dirname, '../../logs');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

module.exports = logger;

