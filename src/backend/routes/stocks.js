const express = require('express');
const router = express.Router();
const apiService = require('../services/apiService');
const cacheService = require('../services/cacheService');
const { asyncHandler } = require('../middleware/errorHandler');
const { apiLimiter } = require('../middleware/security');
const logger = require('../utils/logger');

// Tüm hisse verilerini getir
router.get('/', apiLimiter, asyncHandler(async (req, res) => {
  try {
    const cacheKey = 'all_stocks_data';
    const cachedData = cacheService.get(cacheKey);
    
    if (cachedData) {
      logger.debug('Stocks data served from cache');
      return res.json({
        success: true,
        data: cachedData,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    // BIST hisseleri
    const bistSymbols = [
      'THYAO.IS', 'AKBNK.IS', 'BIMAS.IS', 'EREGL.IS', 'GARAN.IS',
      'HALKB.IS', 'ISCTR.IS', 'KCHOL.IS', 'KOZAL.IS', 'PETKM.IS',
      'SAHOL.IS', 'SASA.IS', 'TUPRS.IS', 'VAKBN.IS', 'YKBNK.IS'
    ];

    // NASDAQ hisseleri
    const nasdaqSymbols = [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA',
      'META', 'NVDA', 'NFLX', 'AMD', 'INTC'
    ];

    const allSymbols = [...bistSymbols, ...nasdaqSymbols];
    const stocksData = await apiService.getMultipleSymbolsData(allSymbols);

    // Cache'e kaydet (30 dakika)
    cacheService.set(cacheKey, stocksData, 30 * 60 * 1000);

    res.json({
      success: true,
      data: stocksData,
      cached: false,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Stocks route error:', error);
    throw error;
  }
}));

// Belirli bir hisse verisini getir
router.get('/:symbol', apiLimiter, asyncHandler(async (req, res) => {
  try {
    const { symbol } = req.params;
    const cacheKey = `stock_${symbol}`;
    
    const cachedData = cacheService.get(cacheKey);
    if (cachedData) {
      logger.debug(`Stock data for ${symbol} served from cache`);
      return res.json({
        success: true,
        data: cachedData,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    const stockData = await apiService.getYahooFinanceData(symbol);
    
    // Cache'e kaydet (5 dakika)
    cacheService.set(cacheKey, stockData, 5 * 60 * 1000);

    res.json({
      success: true,
      data: stockData,
      cached: false,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Stock route error for ${req.params.symbol}:`, error);
    throw error;
  }
}));

// Hisse arama
router.get('/search/:query', apiLimiter, asyncHandler(async (req, res) => {
  try {
    const { query } = req.params;
    
    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Query must be at least 2 characters long'
      });
    }

    const cacheKey = `search_${query}`;
    const cachedData = cacheService.get(cacheKey);
    
    if (cachedData) {
      logger.debug(`Search results for "${query}" served from cache`);
      return res.json({
        success: true,
        data: cachedData,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    // Basit arama implementasyonu (gerçek projede daha gelişmiş arama kullanın)
    const searchResults = await performStockSearch(query);
    
    // Cache'e kaydet (10 dakika)
    cacheService.set(cacheKey, searchResults, 10 * 60 * 1000);

    res.json({
      success: true,
      data: searchResults,
      cached: false,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Search route error for "${req.params.query}":`, error);
    throw error;
  }
}));

// Hisse arama fonksiyonu
async function performStockSearch(query) {
  try {
    // Önceden tanımlı hisse listesi
    const stockList = [
      { symbol: 'THYAO.IS', name: 'Türk Hava Yolları', exchange: 'BIST' },
      { symbol: 'AKBNK.IS', name: 'Akbank', exchange: 'BIST' },
      { symbol: 'BIMAS.IS', name: 'BİM', exchange: 'BIST' },
      { symbol: 'EREGL.IS', name: 'Ereğli Demir Çelik', exchange: 'BIST' },
      { symbol: 'GARAN.IS', name: 'Garanti BBVA', exchange: 'BIST' },
      { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ' },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ' },
      { symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ' }
    ];

    // Arama yap
    const results = stockList.filter(stock => 
      stock.name.toLowerCase().includes(query.toLowerCase()) ||
      stock.symbol.toLowerCase().includes(query.toLowerCase())
    );

    return results.slice(0, 10); // İlk 10 sonuç
  } catch (error) {
    logger.error('Stock search error:', error);
    return [];
  }
}

module.exports = router;

