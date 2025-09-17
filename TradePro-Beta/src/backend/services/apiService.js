const fetch = require('node-fetch');
const logger = require('../utils/logger');
const cacheService = require('./cacheService');
const config = require('../config/environment');

class ApiService {
  constructor() {
    this.apiKeys = {
      yahoo: config.yahooFinanceApiKey,
      news: config.newsApiKey
    };
    this.requestCounts = new Map();
    this.maxRequestsPerMinute = 100;
  }

  // Generic API request wrapper
  async makeRequest(url, options = {}) {
    try {
      const startTime = Date.now();
      
      const defaultOptions = {
        method: 'GET',
        headers: {
          'User-Agent': 'TradePro-Alpha/2.0.0',
          'Accept': 'application/json',
          ...options.headers
        },
        timeout: 10000, // 10 saniye timeout
        ...options
      };

      logger.debug(`API Request: ${url}`, { options: defaultOptions });

      const response = await fetch(url, defaultOptions);
      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      logger.debug(`API Response: ${url}`, { 
        status: response.status, 
        responseTime: `${responseTime}ms`,
        dataSize: JSON.stringify(data).length
      });

      return data;
    } catch (error) {
      logger.error(`API Request failed: ${url}`, { error: error.message });
      throw error;
    }
  }

  // Yahoo Finance API wrapper
  async getYahooFinanceData(symbol, modules = ['price', 'summaryDetail']) {
    try {
      const cacheKey = `yahoo_${symbol}_${modules.join('_')}`;
      
      // Cache'den kontrol et
      const cachedData = cacheService.get(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
      const params = new URLSearchParams({
        modules: modules.join(','),
        interval: '1d',
        range: '1mo'
      });

      const data = await this.makeRequest(`${url}?${params}`);
      
      // Cache'e kaydet (5 dakika)
      cacheService.set(cacheKey, data, 5 * 60 * 1000);
      
      return data;
    } catch (error) {
      logger.error(`Yahoo Finance API error for ${symbol}:`, error);
      throw new Error(`Failed to fetch data for ${symbol}: ${error.message}`);
    }
  }

  // Multiple symbols için batch request
  async getMultipleSymbolsData(symbols) {
    try {
      const promises = symbols.map(symbol => 
        this.getYahooFinanceData(symbol).catch(error => ({
          symbol,
          error: error.message
        }))
      );

      const results = await Promise.allSettled(promises);
      
      return results.map((result, index) => ({
        symbol: symbols[index],
        success: result.status === 'fulfilled',
        data: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected' ? result.reason.message : null
      }));
    } catch (error) {
      logger.error('Multiple symbols API error:', error);
      throw error;
    }
  }

  // News API wrapper
  async getNewsData(query = '', category = 'business', language = 'tr') {
    try {
      const cacheKey = `news_${query}_${category}_${language}`;
      
      // Cache'den kontrol et
      const cachedData = cacheService.get(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      if (!this.apiKeys.news) {
        logger.warn('News API key not configured');
        return { articles: [] };
      }

      const url = 'https://newsapi.org/v2/top-headlines';
      const params = new URLSearchParams({
        apiKey: this.apiKeys.news,
        country: 'tr',
        category: category,
        q: query,
        language: language,
        pageSize: '20'
      });

      const data = await this.makeRequest(`${url}?${params}`);
      
      // Cache'e kaydet (30 dakika)
      cacheService.set(cacheKey, data, 30 * 60 * 1000);
      
      return data;
    } catch (error) {
      logger.error('News API error:', error);
      return { articles: [] };
    }
  }

  // RSS feed parser (TradingView news için)
  async getRSSFeed(url) {
    try {
      const cacheKey = `rss_${url}`;
      
      // Cache'den kontrol et
      const cachedData = cacheService.get(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const response = await this.makeRequest(url);
      
      // RSS XML'i parse et (basit implementasyon)
      const items = this.parseRSSFeed(response);
      
      // Cache'e kaydet (15 dakika)
      cacheService.set(cacheKey, items, 15 * 60 * 1000);
      
      return items;
    } catch (error) {
      logger.error(`RSS feed error for ${url}:`, error);
      return [];
    }
  }

  // Basit RSS parser
  parseRSSFeed(xmlData) {
    try {
      // Bu basit bir implementasyon, gerçek projede xml2js gibi kütüphane kullanın
      const items = [];
      
      // Basit regex ile item'ları bul
      const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/g;
      let match;
      
      while ((match = itemRegex.exec(xmlData)) !== null) {
        const itemContent = match[1];
        
        const titleMatch = itemContent.match(/<title[^>]*>([^<]*)<\/title>/);
        const linkMatch = itemContent.match(/<link[^>]*>([^<]*)<\/link>/);
        const descriptionMatch = itemContent.match(/<description[^>]*>([^<]*)<\/description>/);
        const pubDateMatch = itemContent.match(/<pubDate[^>]*>([^<]*)<\/pubDate>/);
        
        if (titleMatch && linkMatch) {
          items.push({
            title: titleMatch[1].trim(),
            link: linkMatch[1].trim(),
            description: descriptionMatch ? descriptionMatch[1].trim() : '',
            pubDate: pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString()
          });
        }
      }
      
      return items.slice(0, 20); // İlk 20 item
    } catch (error) {
      logger.error('RSS parsing error:', error);
      return [];
    }
  }

  // API health check
  async healthCheck() {
    try {
      const checks = {
        yahoo: false,
        news: false,
        cache: false,
        memory: false
      };

      // Yahoo Finance test
      try {
        await this.getYahooFinanceData('AAPL');
        checks.yahoo = true;
      } catch (error) {
        logger.warn('Yahoo Finance health check failed:', error.message);
      }

      // News API test
      try {
        await this.getNewsData('', 'business');
        checks.news = true;
      } catch (error) {
        logger.warn('News API health check failed:', error.message);
      }

      // Cache test
      try {
        cacheService.set('health_check', 'ok', 1000);
        const result = cacheService.get('health_check');
        checks.cache = result === 'ok';
      } catch (error) {
        logger.warn('Cache health check failed:', error.message);
      }

      // Memory check
      try {
        const memoryUsage = cacheService.getMemoryUsage();
        checks.memory = memoryUsage && memoryUsage.heapUsed < 1000; // 1GB altında
      } catch (error) {
        logger.warn('Memory health check failed:', error.message);
      }

      return {
        status: Object.values(checks).every(check => check) ? 'healthy' : 'degraded',
        checks,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Health check error:', error);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Singleton instance
const apiService = new ApiService();

module.exports = apiService;

