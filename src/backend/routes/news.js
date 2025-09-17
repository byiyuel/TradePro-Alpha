const express = require('express');
const router = express.Router();
const apiService = require('../services/apiService');
const { asyncHandler } = require('../middleware/errorHandler');
const { newsLimiter } = require('../middleware/security');
const logger = require('../utils/logger');

// Şirket haberleri
router.get('/companies', newsLimiter, asyncHandler(async (req, res) => {
  try {
    const { symbol, limit = 20 } = req.query;
    
    let query = '';
    if (symbol) {
      query = symbol.replace('.IS', '').replace('.TR', '');
    }

    const newsData = await apiService.getNewsData(query, 'business', 'tr');
    
    res.json({
      success: true,
      data: newsData.articles || [],
      count: newsData.articles ? newsData.articles.length : 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Company news route error:', error);
    throw error;
  }
}));

// Piyasa haberleri
router.get('/market', newsLimiter, asyncHandler(async (req, res) => {
  try {
    const newsData = await apiService.getNewsData('', 'business', 'tr');
    
    res.json({
      success: true,
      data: newsData.articles || [],
      count: newsData.articles ? newsData.articles.length : 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Market news route error:', error);
    throw error;
  }
}));

// TradingView RSS haberleri
router.get('/tradingview', newsLimiter, asyncHandler(async (req, res) => {
  try {
    const rssUrls = [
      'https://www.tradingview.com/news/feed/',
      'https://feeds.finance.yahoo.com/rss/2.0/headline',
      'https://www.marketwatch.com/rss/topstories'
    ];

    const allNews = [];
    
    for (const url of rssUrls) {
      try {
        const news = await apiService.getRSSFeed(url);
        allNews.push(...news);
      } catch (error) {
        logger.warn(`RSS feed error for ${url}:`, error.message);
      }
    }

    // Haberleri tarihe göre sırala
    allNews.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    res.json({
      success: true,
      data: allNews.slice(0, 50), // İlk 50 haber
      count: allNews.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('TradingView news route error:', error);
    throw error;
  }
}));

// Genel haber arama
router.get('/search', newsLimiter, asyncHandler(async (req, res) => {
  try {
    const { q, category = 'business', language = 'tr' } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters long'
      });
    }

    const newsData = await apiService.getNewsData(q, category, language);
    
    res.json({
      success: true,
      data: newsData.articles || [],
      count: newsData.articles ? newsData.articles.length : 0,
      query: q,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('News search route error:', error);
    throw error;
  }
}));

module.exports = router;

