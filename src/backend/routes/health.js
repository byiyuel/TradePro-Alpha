const express = require('express');
const router = express.Router();
const apiService = require('../services/apiService');
const cacheService = require('../services/cacheService');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// Sistem sağlık kontrolü
router.get('/', asyncHandler(async (req, res) => {
  try {
    const startTime = Date.now();
    
    // API sağlık kontrolü
    const apiHealth = await apiService.healthCheck();
    
    // Cache istatistikleri
    const cacheStats = cacheService.getStats();
    
    // Memory kullanımı
    const memoryUsage = process.memoryUsage();
    
    // Uptime
    const uptime = process.uptime();
    
    const responseTime = Date.now() - startTime;
    
    const healthData = {
      status: apiHealth.status,
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: Math.floor(uptime),
        formatted: formatUptime(uptime)
      },
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100,
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100,
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100,
        external: Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100
      },
      cache: cacheStats,
      api: apiHealth,
      performance: {
        responseTime: `${responseTime}ms`
      },
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    // Status code'u health durumuna göre ayarla
    const statusCode = healthData.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      success: true,
      data: healthData
    });
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(503).json({
      success: false,
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
}));

// Basit ping endpoint
router.get('/ping', (req, res) => {
  res.json({
    success: true,
    message: 'pong',
    timestamp: new Date().toISOString()
  });
});

// Cache istatistikleri
router.get('/cache', asyncHandler(async (req, res) => {
  try {
    const stats = cacheService.getStats();
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Cache stats error:', error);
    throw error;
  }
}));

// Cache'i temizle (sadece development'ta)
router.delete('/cache', asyncHandler(async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Cache clearing not allowed in production'
      });
    }

    const cleared = cacheService.clear();
    
    res.json({
      success: cleared,
      message: cleared ? 'Cache cleared successfully' : 'Failed to clear cache',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Cache clear error:', error);
    throw error;
  }
}));

// Uptime formatı
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

module.exports = router;

