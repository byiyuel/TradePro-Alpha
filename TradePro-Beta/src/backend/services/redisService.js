const Redis = require('ioredis');
const logger = require('../utils/logger');
const config = require('../config/environment');

class RedisService {
  constructor() {
    this.client = null;
    this.subscriber = null;
    this.publisher = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  // Redis bağlantısını başlat
  async connect() {
    try {
      // Render.com için Redis URL kontrolü
      const redisConfig = process.env.REDIS_URL ? {
        url: process.env.REDIS_URL,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        connectTimeout: 10000,
        commandTimeout: 5000,
        retryDelayOnClusterDown: 300,
        enableOfflineQueue: false
      } : {
        ...config.redis,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        connectTimeout: 10000,
        commandTimeout: 5000,
        retryDelayOnClusterDown: 300,
        enableOfflineQueue: false
      };

      // Ana Redis client
      this.client = new Redis({
        ...redisConfig,
        onConnect: () => {
          logger.info('Redis client connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
        },
        onError: (error) => {
          logger.error('Redis client error:', error);
          this.isConnected = false;
        },
        onClose: () => {
          logger.warn('Redis client connection closed');
          this.isConnected = false;
        }
      });

      // Publisher client (WebSocket için)
      this.publisher = new Redis({
        ...redisConfig,
        lazyConnect: true
      });

      // Subscriber client (WebSocket için)
      this.subscriber = new Redis({
        ...redisConfig,
        lazyConnect: true
      });

      // Bağlantıları başlat
      await Promise.all([
        this.client.connect(),
        this.publisher.connect(),
        this.subscriber.connect()
      ]);

      logger.info('Redis service initialized successfully');
      return true;
    } catch (error) {
      logger.error('Redis connection failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  // Cache işlemleri
  async set(key, value, ttl = 3600) {
    try {
      if (!this.isConnected) {
        logger.warn('Redis not connected, skipping cache set');
        return false;
      }

      const serializedValue = JSON.stringify(value);
      await this.client.setex(key, ttl, serializedValue);
      
      logger.debug(`Redis set: ${key}`, { ttl });
      return true;
    } catch (error) {
      logger.error(`Redis set error for key ${key}:`, error);
      return false;
    }
  }

  async get(key) {
    try {
      if (!this.isConnected) {
        logger.warn('Redis not connected, skipping cache get');
        return null;
      }

      const value = await this.client.get(key);
      if (!value) {
        logger.debug(`Redis miss: ${key}`);
        return null;
      }

      logger.debug(`Redis hit: ${key}`);
      return JSON.parse(value);
    } catch (error) {
      logger.error(`Redis get error for key ${key}:`, error);
      return null;
    }
  }

  async del(key) {
    try {
      if (!this.isConnected) {
        logger.warn('Redis not connected, skipping cache delete');
        return false;
      }

      const result = await this.client.del(key);
      logger.debug(`Redis delete: ${key}`, { deleted: result > 0 });
      return result > 0;
    } catch (error) {
      logger.error(`Redis delete error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key) {
    try {
      if (!this.isConnected) return false;
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Redis exists error for key ${key}:`, error);
      return false;
    }
  }

  // Hash işlemleri (stock data için)
  async hset(key, field, value) {
    try {
      if (!this.isConnected) return false;
      await this.client.hset(key, field, JSON.stringify(value));
      logger.debug(`Redis hset: ${key}.${field}`);
      return true;
    } catch (error) {
      logger.error(`Redis hset error for ${key}.${field}:`, error);
      return false;
    }
  }

  async hget(key, field) {
    try {
      if (!this.isConnected) return null;
      const value = await this.client.hget(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Redis hget error for ${key}.${field}:`, error);
      return null;
    }
  }

  async hgetall(key) {
    try {
      if (!this.isConnected) return {};
      const hash = await this.client.hgetall(key);
      const result = {};
      for (const [field, value] of Object.entries(hash)) {
        result[field] = JSON.parse(value);
      }
      return result;
    } catch (error) {
      logger.error(`Redis hgetall error for ${key}:`, error);
      return {};
    }
  }

  // List işlemleri (historical data için)
  async lpush(key, ...values) {
    try {
      if (!this.isConnected) return false;
      const serializedValues = values.map(v => JSON.stringify(v));
      await this.client.lpush(key, ...serializedValues);
      logger.debug(`Redis lpush: ${key}`, { count: values.length });
      return true;
    } catch (error) {
      logger.error(`Redis lpush error for ${key}:`, error);
      return false;
    }
  }

  async lrange(key, start = 0, stop = -1) {
    try {
      if (!this.isConnected) return [];
      const values = await this.client.lrange(key, start, stop);
      return values.map(v => JSON.parse(v));
    } catch (error) {
      logger.error(`Redis lrange error for ${key}:`, error);
      return [];
    }
  }

  async ltrim(key, start, stop) {
    try {
      if (!this.isConnected) return false;
      await this.client.ltrim(key, start, stop);
      logger.debug(`Redis ltrim: ${key}`, { start, stop });
      return true;
    } catch (error) {
      logger.error(`Redis ltrim error for ${key}:`, error);
      return false;
    }
  }

  // Pub/Sub işlemleri (WebSocket için)
  async publish(channel, message) {
    try {
      if (!this.isConnected) return false;
      await this.publisher.publish(channel, JSON.stringify(message));
      logger.debug(`Redis publish: ${channel}`);
      return true;
    } catch (error) {
      logger.error(`Redis publish error for ${channel}:`, error);
      return false;
    }
  }

  async subscribe(channel, callback) {
    try {
      if (!this.isConnected) return false;
      await this.subscriber.subscribe(channel);
      this.subscriber.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          try {
            const parsedMessage = JSON.parse(message);
            callback(parsedMessage);
          } catch (error) {
            logger.error('Redis message parsing error:', error);
          }
        }
      });
      logger.debug(`Redis subscribe: ${channel}`);
      return true;
    } catch (error) {
      logger.error(`Redis subscribe error for ${channel}:`, error);
      return false;
    }
  }

  // Batch işlemleri
  async mget(keys) {
    try {
      if (!this.isConnected) return [];
      const values = await this.client.mget(keys);
      return values.map(v => v ? JSON.parse(v) : null);
    } catch (error) {
      logger.error('Redis mget error:', error);
      return [];
    }
  }

  async mset(keyValuePairs) {
    try {
      if (!this.isConnected) return false;
      const serializedPairs = [];
      for (const [key, value] of Object.entries(keyValuePairs)) {
        serializedPairs.push(key, JSON.stringify(value));
      }
      await this.client.mset(...serializedPairs);
      logger.debug('Redis mset:', { count: Object.keys(keyValuePairs).length });
      return true;
    } catch (error) {
      logger.error('Redis mset error:', error);
      return false;
    }
  }

  // Redis bilgileri
  async info() {
    try {
      if (!this.isConnected) return null;
      const info = await this.client.info();
      return this.parseRedisInfo(info);
    } catch (error) {
      logger.error('Redis info error:', error);
      return null;
    }
  }

  parseRedisInfo(info) {
    const lines = info.split('\r\n');
    const result = {};
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = value;
      }
    }
    
    return result;
  }

  // Bağlantı durumu
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }

  // Bağlantıyı kapat
  async disconnect() {
    try {
      await Promise.all([
        this.client?.quit(),
        this.publisher?.quit(),
        this.subscriber?.quit()
      ]);
      logger.info('Redis service disconnected');
      return true;
    } catch (error) {
      logger.error('Redis disconnect error:', error);
      return false;
    }
  }
}

// Singleton instance
const redisService = new RedisService();

module.exports = redisService;

