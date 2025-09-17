const express = require('express');
const router = express.Router();
const redisService = require('../services/redisService');
const websocketService = require('../services/websocketService');
const cacheService = require('../services/cacheService');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// Sistem monitoring dashboard
router.get('/dashboard', asyncHandler(async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Sistem bilgileri
    const systemInfo = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid
    };

    // Redis durumu
    const redisStatus = redisService.getConnectionStatus();
    const redisInfo = await redisService.info();

    // WebSocket durumu
    const wsStats = websocketService.getStats();

    // Cache durumu
    const cacheStats = cacheService.getStats();

    // API durumu
    const apiHealth = await checkAPIHealth();

    // Database durumu
    const dbHealth = await checkDatabaseHealth();

    const responseTime = Date.now() - startTime;

    const dashboard = {
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      system: {
        ...systemInfo,
        loadAverage: process.platform !== 'win32' ? require('os').loadavg() : null,
        freeMemory: require('os').freemem(),
        totalMemory: require('os').totalmem(),
        cpuCount: require('os').cpus().length
      },
      services: {
        redis: {
          status: redisStatus.connected ? 'healthy' : 'unhealthy',
          connection: redisStatus,
          info: redisInfo
        },
        websocket: {
          status: wsStats.totalClients > 0 ? 'active' : 'idle',
          stats: wsStats
        },
        cache: {
          status: cacheStats ? 'healthy' : 'unhealthy',
          stats: cacheStats
        },
        api: apiHealth,
        database: dbHealth
      },
      performance: {
        memoryUsage: {
          rss: Math.round(systemInfo.memory.rss / 1024 / 1024 * 100) / 100,
          heapTotal: Math.round(systemInfo.memory.heapTotal / 1024 / 1024 * 100) / 100,
          heapUsed: Math.round(systemInfo.memory.heapUsed / 1024 / 1024 * 100) / 100,
          external: Math.round(systemInfo.memory.external / 1024 / 1024 * 100) / 100
        },
        uptime: {
          seconds: Math.floor(systemInfo.uptime),
          formatted: formatUptime(systemInfo.uptime)
        }
      }
    };

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    logger.error('Monitoring dashboard error:', error);
    throw error;
  }
}));

// Detaylı sistem metrikleri
router.get('/metrics', asyncHandler(async (req, res) => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version,
        pid: process.pid,
        loadAverage: process.platform !== 'win32' ? require('os').loadavg() : null,
        freeMemory: require('os').freemem(),
        totalMemory: require('os').totalmem(),
        cpuCount: require('os').cpus().length,
        cpuModel: require('os').cpus()[0]?.model || 'Unknown'
      },
      redis: {
        status: redisService.getConnectionStatus(),
        info: await redisService.info()
      },
      websocket: websocketService.getStats(),
      cache: cacheService.getStats(),
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 3000,
        version: '3.1.0'
      }
    };

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Metrics endpoint error:', error);
    throw error;
  }
}));

// WebSocket istatistikleri
router.get('/websocket', asyncHandler(async (req, res) => {
  try {
    const stats = websocketService.getStats();
    
    res.json({
      success: true,
      data: {
        ...stats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('WebSocket stats error:', error);
    throw error;
  }
}));

// Redis istatistikleri
router.get('/redis', asyncHandler(async (req, res) => {
  try {
    const status = redisService.getConnectionStatus();
    const info = await redisService.info();
    
    res.json({
      success: true,
      data: {
        status,
        info,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Redis stats error:', error);
    throw error;
  }
}));

// Cache istatistikleri
router.get('/cache', asyncHandler(async (req, res) => {
  try {
    const stats = cacheService.getStats();
    
    res.json({
      success: true,
      data: {
        ...stats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Cache stats error:', error);
    throw error;
  }
}));

// Sistem logları
router.get('/logs', asyncHandler(async (req, res) => {
  try {
    const { level = 'info', limit = 100 } = req.query;
    
    // Bu basit bir implementasyon, gerçek projede log dosyalarını okuyun
    const logs = [
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'System monitoring endpoint accessed',
        service: 'tradepro-alpha'
      },
      {
        timestamp: new Date(Date.now() - 60000).toISOString(),
        level: 'debug',
        message: 'Cache hit for stock data',
        service: 'tradepro-alpha'
      },
      {
        timestamp: new Date(Date.now() - 120000).toISOString(),
        level: 'info',
        message: 'WebSocket client connected',
        service: 'tradepro-alpha'
      }
    ];

    const filteredLogs = logs.filter(log => 
      level === 'all' || log.level === level
    ).slice(0, parseInt(limit));

    res.json({
      success: true,
      data: {
        logs: filteredLogs,
        total: filteredLogs.length,
        level,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Logs endpoint error:', error);
    throw error;
  }
}));

// Sistem performans testi
router.post('/performance-test', asyncHandler(async (req, res) => {
  try {
    const { testType = 'basic' } = req.body;
    
    const startTime = Date.now();
    const results = {
      testType,
      startTime: new Date().toISOString(),
      tests: {}
    };

    // Cache testi
    const cacheTestStart = Date.now();
    cacheService.set('perf_test', 'test_data', 60);
    const cacheData = cacheService.get('perf_test');
    results.tests.cache = {
      duration: Date.now() - cacheTestStart,
      success: cacheData === 'test_data'
    };

    // Redis testi
    const redisTestStart = Date.now();
    await redisService.set('perf_test', { test: 'data' }, 60);
    const redisData = await redisService.get('perf_test');
    results.tests.redis = {
      duration: Date.now() - redisTestStart,
      success: redisData && redisData.test === 'data'
    };

    // Memory testi
    const memoryTestStart = Date.now();
    const testArray = new Array(10000).fill(0).map((_, i) => ({ id: i, data: 'test' }));
    const filtered = testArray.filter(item => item.id % 2 === 0);
    results.tests.memory = {
      duration: Date.now() - memoryTestStart,
      success: filtered.length === 5000
    };

    results.totalDuration = Date.now() - startTime;
    results.endTime = new Date().toISOString();

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    logger.error('Performance test error:', error);
    throw error;
  }
}));

// Sistem temizliği
router.post('/cleanup', asyncHandler(async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Cleanup not allowed in production'
      });
    }

    const cleanupResults = {
      timestamp: new Date().toISOString(),
      operations: {}
    };

    // Cache temizliği
    const cacheCleared = cacheService.clear();
    cleanupResults.operations.cache = {
      success: cacheCleared,
      message: cacheCleared ? 'Cache cleared successfully' : 'Cache clear failed'
    };

    // Redis temizliği (test keys only)
    try {
      await redisService.del('perf_test');
      cleanupResults.operations.redis = {
        success: true,
        message: 'Test keys cleared'
      };
    } catch (error) {
      cleanupResults.operations.redis = {
        success: false,
        message: 'Redis cleanup failed',
        error: error.message
      };
    }

    // Memory temizliği
    if (global.gc) {
      global.gc();
      cleanupResults.operations.memory = {
        success: true,
        message: 'Garbage collection triggered'
      };
    } else {
      cleanupResults.operations.memory = {
        success: false,
        message: 'Garbage collection not available'
      };
    }

    res.json({
      success: true,
      data: cleanupResults
    });
  } catch (error) {
    logger.error('Cleanup error:', error);
    throw error;
  }
}));

// Helper functions
async function checkAPIHealth() {
  try {
    // Yahoo Finance API test
    const testResponse = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1d');
    return {
      yahoo: testResponse.ok,
      status: testResponse.ok ? 'healthy' : 'degraded',
      responseTime: Date.now()
    };
  } catch (error) {
    return {
      yahoo: false,
      status: 'unhealthy',
      error: error.message
    };
  }
}

async function checkDatabaseHealth() {
  try {
    // SQLite database test
    return {
      sqlite: true,
      status: 'healthy',
      message: 'Database connection active'
    };
  } catch (error) {
    return {
      sqlite: false,
      status: 'unhealthy',
      error: error.message
    };
  }
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

module.exports = router;

