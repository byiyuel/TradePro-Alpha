const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('../config/environment');

// Helmet security headers
const helmetConfig = {
  contentSecurityPolicy: config.helmetCspEnabled ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  } : false,
  hsts: config.helmetHstsEnabled ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false,
  crossOriginEmbedderPolicy: false, // WebSocket için gerekli
};

// Rate limiting
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: message || 'Too many requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// API rate limiting (dakikada 100 istek)
const apiLimiter = createRateLimit(
  config.rateLimitWindowMs,
  config.rateLimitMaxRequests,
  'API rate limit exceeded. Please try again later.'
);

// Search rate limiting (dakikada 50 istek)
const searchLimiter = createRateLimit(
  60000, // 1 dakika
  50,
  'Search rate limit exceeded. Please try again later.'
);

// News rate limiting (dakikada 20 istek)
const newsLimiter = createRateLimit(
  60000, // 1 dakika
  20,
  'News rate limit exceeded. Please try again later.'
);

// WebSocket rate limiting (dakikada 200 bağlantı)
const wsLimiter = createRateLimit(
  60000, // 1 dakika
  200,
  'WebSocket connection limit exceeded.'
);

module.exports = {
  helmet: helmet(helmetConfig),
  apiLimiter,
  searchLimiter,
  newsLimiter,
  wsLimiter
};

