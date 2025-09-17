const logger = require('../utils/logger');
const config = require('../config/environment');

class CacheService {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
    this.maxSize = config.cacheMaxSize;
    this.defaultTTL = config.cacheDurationMinutes * 60 * 1000; // ms'ye çevir
  }

  // Cache'e veri ekleme
  set(key, value, ttl = this.defaultTTL) {
    try {
      // Cache boyutu kontrolü
      if (this.cache.size >= this.maxSize) {
        this.evictOldest();
      }

      // Eski timer'ı temizle
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
      }

      // Veriyi cache'e ekle
      this.cache.set(key, {
        value,
        timestamp: Date.now(),
        ttl
      });

      // TTL timer'ı ayarla
      const timer = setTimeout(() => {
        this.delete(key);
      }, ttl);

      this.timers.set(key, timer);

      logger.debug(`Cache set: ${key}`, { ttl });
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  // Cache'den veri alma
  get(key) {
    try {
      const item = this.cache.get(key);
      
      if (!item) {
        logger.debug(`Cache miss: ${key}`);
        return null;
      }

      // TTL kontrolü
      if (Date.now() - item.timestamp > item.ttl) {
        this.delete(key);
        logger.debug(`Cache expired: ${key}`);
        return null;
      }

      logger.debug(`Cache hit: ${key}`);
      return item.value;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  // Cache'den veri silme
  delete(key) {
    try {
      const deleted = this.cache.delete(key);
      
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
        this.timers.delete(key);
      }

      if (deleted) {
        logger.debug(`Cache deleted: ${key}`);
      }
      
      return deleted;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  // Cache'i temizleme
  clear() {
    try {
      // Tüm timer'ları temizle
      for (const timer of this.timers.values()) {
        clearTimeout(timer);
      }

      this.cache.clear();
      this.timers.clear();
      
      logger.info('Cache cleared');
      return true;
    } catch (error) {
      logger.error('Cache clear error:', error);
      return false;
    }
  }

  // En eski veriyi silme (LRU benzeri)
  evictOldest() {
    try {
      let oldestKey = null;
      let oldestTime = Date.now();

      for (const [key, item] of this.cache.entries()) {
        if (item.timestamp < oldestTime) {
          oldestTime = item.timestamp;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        this.delete(oldestKey);
        logger.debug(`Cache evicted: ${oldestKey}`);
      }
    } catch (error) {
      logger.error('Cache evict error:', error);
    }
  }

  // Cache istatistikleri
  getStats() {
    try {
      const stats = {
        size: this.cache.size,
        maxSize: this.maxSize,
        hitRate: this.calculateHitRate(),
        memoryUsage: this.getMemoryUsage()
      };

      return stats;
    } catch (error) {
      logger.error('Cache stats error:', error);
      return null;
    }
  }

  // Hit rate hesaplama (basit implementasyon)
  calculateHitRate() {
    // Bu gerçek bir hit rate değil, sadece örnek
    return this.cache.size > 0 ? (this.cache.size / this.maxSize) * 100 : 0;
  }

  // Memory usage hesaplama
  getMemoryUsage() {
    try {
      const used = process.memoryUsage();
      return {
        rss: Math.round(used.rss / 1024 / 1024 * 100) / 100,
        heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100,
        heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100,
        external: Math.round(used.external / 1024 / 1024 * 100) / 100
      };
    } catch (error) {
      logger.error('Memory usage error:', error);
      return null;
    }
  }

  // Cache'i yenileme (TTL'i sıfırlama)
  refresh(key, newTTL = this.defaultTTL) {
    try {
      const item = this.cache.get(key);
      if (item) {
        item.timestamp = Date.now();
        item.ttl = newTTL;
        
        // Timer'ı yenile
        if (this.timers.has(key)) {
          clearTimeout(this.timers.get(key));
        }
        
        const timer = setTimeout(() => {
          this.delete(key);
        }, newTTL);
        
        this.timers.set(key, timer);
        
        logger.debug(`Cache refreshed: ${key}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Cache refresh error:', error);
      return false;
    }
  }
}

// Singleton instance
const cacheService = new CacheService();

module.exports = cacheService;

