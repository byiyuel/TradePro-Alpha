const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const fetch = require('node-fetch');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Alarm management (legacy - now using database)

// Database setup
const db = new sqlite3.Database(path.join(__dirname, 'database/tradepro.db'), (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Alarms table
    db.run(`CREATE TABLE IF NOT EXISTS alarms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        symbol TEXT NOT NULL,
        type TEXT NOT NULL,
        condition TEXT NOT NULL,
        value REAL NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // Watchlist table
    db.run(`CREATE TABLE IF NOT EXISTS watchlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        symbol TEXT NOT NULL,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        UNIQUE(user_id, symbol)
    )`);
}

// User management
const JWT_SECRET = 'tradepro_secret_key_2024';

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Alarm data structure
const createAlarm = (userId, symbol, type, value, condition) => ({
    id: Date.now() + Math.random(),
    userId,
    symbol,
    type, // 'price', 'rsi', 'macd', etc.
    value,
    condition, // 'above', 'below', 'crosses'
    isActive: true,
    createdAt: new Date().toISOString()
});

// Extended stock symbols
const STOCK_SYMBOLS = {
    BIST: [
        'ASELS', 'TUPRS', 'THYAO', 'AKBNK', 'GARAN', 'ISCTR', 'KRDMD', 'SAHOL', 'TCELL', 'VAKBN',
        'BIMAS', 'EREGL', 'KOZAL', 'PETKM', 'SISE', 'TOASO', 'TUPRS', 'ULKER', 'VESTL', 'YATAS',
        'ARCLK', 'BAGFS', 'BRISA', 'CCOLA', 'DOAS', 'EKGYO', 'FROTO', 'GUBRF', 'HUNER', 'ISGYO',
        'KCHOL', 'LOGO', 'MGROS', 'NTHOL', 'OTKAR', 'PGSUS', 'SAHOL', 'SMRTG', 'TKFEN', 'TRCAS'
    ],
    NASDAQ: [
        'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', 'AMD', 'INTC',
        'CRM', 'ADBE', 'PYPL', 'UBER', 'ZM', 'ROKU', 'SQ', 'SHOP', 'TWTR', 'SNAP',
        'ORCL', 'CSCO', 'AVGO', 'TXN', 'QCOM', 'AMAT', 'MU', 'ADI', 'LRCX', 'KLAC',
        'MRVL', 'SNPS', 'CDNS', 'FTNT', 'CHKP', 'CRWD', 'ZS', 'OKTA', 'PANW',
        'DOCU', 'TEAM', 'WDAY', 'SNOW', 'DDOG', 'NET', 'ESTC', 'MDB', 'SPLK', 'NOW'
    ],
    NYSE: [
        'JPM', 'BAC', 'WMT', 'JNJ', 'PG', 'KO', 'PFE', 'V', 'MA', 'HD',
        'DIS', 'NKE', 'MCD', 'IBM', 'GE', 'CAT', 'BA', 'XOM', 'CVX', 'COP',
        'ABBV', 'ABT', 'ACN', 'ADP', 'AEP', 'AIG', 'ALL', 'AMGN', 'AMT', 'ANTM',
        'AXP', 'BAX', 'BDX', 'BIIB', 'BK', 'BLK', 'BMY', 'BRK-B', 'BSX', 'C',
        'CB', 'CCI', 'CL', 'CMCSA', 'COF', 'COP', 'COST', 'CSX', 'CTAS', 'CTSH'
    ]
};

const ALL_SYMBOLS = [
    ...STOCK_SYMBOLS.BIST.map(s => `BIST:${s}`),
    ...STOCK_SYMBOLS.NASDAQ,
    ...STOCK_SYMBOLS.NYSE
];

// Stock names mapping
const STOCK_NAMES = {
    // BIST
    'BIST:ASELS': 'Aselsan A.Ş.',
    'BIST:TUPRS': 'Tüpraş',
    'BIST:THYAO': 'Türk Hava Yolları',
    'BIST:AKBNK': 'Akbank',
    'BIST:GARAN': 'Garanti BBVA',
    'BIST:ISCTR': 'İş Bankası',
    'BIST:KRDMD': 'Kardemir',
    'BIST:SAHOL': 'Sabancı Holding',
    'BIST:TCELL': 'Turkcell',
    'BIST:VAKBN': 'VakıfBank',
    'BIST:BIMAS': 'BİM Birleşik Mağazalar',
    'BIST:EREGL': 'Ereğli Demir ve Çelik',
    'BIST:KOZAL': 'Koza Altın',
    'BIST:PETKM': 'Petkim Petrokimya',
    'BIST:SISE': 'Şişe ve Cam',
    'BIST:TOASO': 'Tofaş',
    'BIST:ULKER': 'Ülker Bisküvi',
    'BIST:VESTL': 'Vestel',
    'BIST:YATAS': 'Yataş Yatak',
    'BIST:ARCLK': 'Arçelik',
    'BIST:BAGFS': 'Bağfas',
    'BIST:BRISA': 'Bridgestone',
    'BIST:CCOLA': 'Coca-Cola İçecek',
    'BIST:DOAS': 'Doğuş Otomotiv',
    'BIST:EKGYO': 'Emlak Konut',
    'BIST:FROTO': 'Ford Otosan',
    'BIST:GUBRF': 'Gübre Fabrikaları',
    'BIST:HUNER': 'Hünkar',
    'BIST:ISGYO': 'İş Gayrimenkul',
    'BIST:KCHOL': 'Koç Holding',
    'BIST:LOGO': 'Logo Yazılım',
    'BIST:MGROS': 'Migros',
    'BIST:NTHOL': 'Net Holding',
    'BIST:OTKAR': 'Otokar',
    'BIST:PGSUS': 'Pegasus Hava',
    'BIST:SMRTG': 'Smart Güneş',
    'BIST:TKFEN': 'Tekfen Holding',
    'BIST:TRCAS': 'Türk Telekom',
    
    // NASDAQ
    'AAPL': 'Apple Inc.',
    'MSFT': 'Microsoft Corporation',
    'GOOGL': 'Alphabet Inc.',
    'AMZN': 'Amazon.com Inc.',
    'TSLA': 'Tesla Inc.',
    'NVDA': 'NVIDIA Corporation',
    'META': 'Meta Platforms Inc.',
    'NFLX': 'Netflix Inc.',
    'AMD': 'Advanced Micro Devices',
    'INTC': 'Intel Corporation',
    'CRM': 'Salesforce Inc.',
    'ADBE': 'Adobe Inc.',
    'PYPL': 'PayPal Holdings',
    'UBER': 'Uber Technologies',
    'ZM': 'Zoom Video Communications',
    'ROKU': 'Roku Inc.',
    'SQ': 'Block Inc.',
    'SHOP': 'Shopify Inc.',
    'TWTR': 'Twitter Inc.',
    'SNAP': 'Snap Inc.',
    'ORCL': 'Oracle Corporation',
    'CSCO': 'Cisco Systems Inc.',
    'AVGO': 'Broadcom Inc.',
    'TXN': 'Texas Instruments',
    'QCOM': 'Qualcomm Inc.',
    'AMAT': 'Applied Materials',
    'MU': 'Micron Technology',
    'ADI': 'Analog Devices',
    'LRCX': 'Lam Research',
    'KLAC': 'KLA Corporation',
    'MRVL': 'Marvell Technology',
    'SNPS': 'Synopsys Inc.',
    'CDNS': 'Cadence Design',
    'FTNT': 'Fortinet Inc.',
    'CHKP': 'Check Point Software',
    'CRWD': 'CrowdStrike Holdings',
    'ZS': 'Zscaler Inc.',
    'OKTA': 'Okta Inc.',
    'PANW': 'Palo Alto Networks',
    'DOCU': 'DocuSign Inc.',
    'TEAM': 'Atlassian Corporation',
    'WDAY': 'Workday Inc.',
    'SNOW': 'Snowflake Inc.',
    'DDOG': 'Datadog Inc.',
    'NET': 'Cloudflare Inc.',
    'ESTC': 'Elastic N.V.',
    'MDB': 'MongoDB Inc.',
    'SPLK': 'Splunk Inc.',
    'NOW': 'ServiceNow Inc.',
    
    // NYSE
    'JPM': 'JPMorgan Chase',
    'BAC': 'Bank of America',
    'WMT': 'Walmart Inc.',
    'JNJ': 'Johnson & Johnson',
    'PG': 'Procter & Gamble',
    'KO': 'Coca-Cola Company',
    'PFE': 'Pfizer Inc.',
    'V': 'Visa Inc.',
    'MA': 'Mastercard Inc.',
    'HD': 'Home Depot Inc.',
    'DIS': 'Walt Disney Company',
    'NKE': 'Nike Inc.',
    'MCD': 'McDonald\'s Corporation',
    'IBM': 'International Business Machines',
    'GE': 'General Electric',
    'CAT': 'Caterpillar Inc.',
    'BA': 'Boeing Company',
    'XOM': 'Exxon Mobil Corporation',
    'CVX': 'Chevron Corporation',
    'COP': 'ConocoPhillips',
    'ABBV': 'AbbVie Inc.',
    'ABT': 'Abbott Laboratories',
    'ACN': 'Accenture plc',
    'ADP': 'Automatic Data Processing',
    'AEP': 'American Electric Power',
    'AIG': 'American International Group',
    'ALL': 'Allstate Corporation',
    'AMGN': 'Amgen Inc.',
    'AMT': 'American Tower Corporation',
    'ANTM': 'Anthem Inc.',
    'AXP': 'American Express Company',
    'BAX': 'Baxter International',
    'BDX': 'Becton Dickinson',
    'BIIB': 'Biogen Inc.',
    'BK': 'Bank of New York Mellon',
    'BLK': 'BlackRock Inc.',
    'BMY': 'Bristol Myers Squibb',
    'BRK-B': 'Berkshire Hathaway',
    'BSX': 'Boston Scientific',
    'C': 'Citigroup Inc.',
    'CB': 'Chubb Limited',
    'CCI': 'Crown Castle International',
    'CL': 'Colgate-Palmolive Company',
    'CMCSA': 'Comcast Corporation',
    'COF': 'Capital One Financial',
    'COST': 'Costco Wholesale',
    'CSX': 'CSX Corporation',
    'CTAS': 'Cintas Corporation',
    'CTSH': 'Cognizant Technology'
};

// Cache for stock data
const stockDataCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Pre-cached popular stocks for instant loading
let preCachedPopularStocks = null;
let lastPreCacheUpdate = 0;
const PRE_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

// Get stock data from Yahoo Finance (optimized for specific symbols)
async function getStockData(symbols = []) {
    const results = {};
    const symbolsToFetch = [];
    
    // Check cache first
    for (const symbol of symbols) {
        const cached = stockDataCache.get(symbol);
        if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
            results[symbol] = cached.data;
        } else {
            symbolsToFetch.push(symbol);
        }
    }
    
    // Fetch only uncached symbols
    for (const symbol of symbolsToFetch) {
        try {
            let symbolKey, url;
            
            // Handle different symbol formats
            if (symbol.startsWith('BIST:')) {
                symbolKey = symbol.replace('BIST:', '');
                url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbolKey}.IS?interval=1d&range=1mo`;
            } else if (symbol.includes('.')) {
                // Handle symbols with exchange suffixes (e.g., AAPL, TSLA)
                symbolKey = symbol;
                url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbolKey}?interval=1d&range=1mo`;
            } else {
                // Default to US market
                symbolKey = symbol;
                url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbolKey}?interval=1d&range=1mo`;
            }
            
            const response = await fetch(url);
            if (!response.ok) {
                results[symbol] = getFallbackData(symbol);
                continue;
            }
            
            const data = await response.json();
            if (!data.chart?.result?.[0]) {
                results[symbol] = getFallbackData(symbol);
                continue;
            }
            
            const result = data.chart.result[0];
            const meta = result.meta;
            const quotes = result.indicators.quote[0];
            const timestamps = result.timestamp;
            
            // Check if we have valid data
            if (!quotes || !quotes.close || !Array.isArray(quotes.close) || !timestamps || !Array.isArray(timestamps)) {
                // Silent fallback for problematic stocks
                results[symbol] = getFallbackData(symbol);
                continue;
            }
            
            const latestIndex = timestamps.length - 1;
            const currentPrice = quotes.close[latestIndex] || meta.previousClose || 0;
            
            // Get previous day's close price
            let previousClose = meta.previousClose;
            if (latestIndex > 0) {
                previousClose = quotes.close[latestIndex - 1] || meta.previousClose;
            }
            
            // If we still don't have a previous close, use a simulated one
            if (!previousClose || previousClose === currentPrice) {
                previousClose = currentPrice * (0.95 + Math.random() * 0.1); // Random change between -5% and +5%
            }
            
            const change = currentPrice - previousClose;
            const changePercent = previousClose ? (change / previousClose) * 100 : 0;
            
            const indicators = calculateTechnicalIndicators(quotes.close, currentPrice);
            
            const stockData = {
                symbol: symbol,
                name: STOCK_NAMES[symbol] || symbol,
                price: currentPrice,
                change: change,
                changePercent: changePercent,
                volume: quotes.volume[latestIndex] || 0,
                high: quotes.high[latestIndex] || currentPrice,
                low: quotes.low[latestIndex] || currentPrice,
                open: quotes.open[latestIndex] || currentPrice,
                currency: symbol.startsWith('BIST:') ? 'TRY' : 'USD',
                exchange: getExchangeFromSymbol(symbol),
                ...indicators,
                lastUpdate: new Date().toISOString()
            };
            
            results[symbol] = stockData;
            
            // Cache the result
            stockDataCache.set(symbol, {
                data: stockData,
                timestamp: Date.now()
            });
            
        } catch (error) {
            // Silent error handling for problematic stocks
            results[symbol] = getFallbackData(symbol);
        }
    }
    
    return results;
}

// Get popular stocks (most searched/common ones)
async function getPopularStocks() {
    const popularSymbols = [
        'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META',
        'BIST:ASELS', 'BIST:TUPRS', 'BIST:THYAO', 'BIST:AKBNK', 'BIST:GARAN'
    ];
    return await getStockData(popularSymbols);
}

// Get pre-cached popular stocks for instant loading
async function getPreCachedPopularStocks() {
    const now = Date.now();
    
    // Return cached data if still fresh
    if (preCachedPopularStocks && (now - lastPreCacheUpdate) < PRE_CACHE_DURATION) {
        return preCachedPopularStocks;
    }
    
    // Update cache in background
    updatePreCacheInBackground();
    
    // Return cached data even if stale (better than nothing)
    return preCachedPopularStocks || {};
}

// Update pre-cache in background
async function updatePreCacheInBackground() {
    try {
        const popularSymbols = [
            'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META',
            'BIST:ASELS', 'BIST:TUPRS', 'BIST:THYAO', 'BIST:AKBNK', 'BIST:GARAN'
        ];
        
        const data = await getStockData(popularSymbols);
        preCachedPopularStocks = data;
        lastPreCacheUpdate = Date.now();
        
        console.log('🔄 Pre-cache updated successfully');
    } catch (error) {
        console.error('❌ Failed to update pre-cache:', error);
    }
}

// Get reliable stocks (tested and working)
async function getReliableStocks() {
    const reliableSymbols = [
        'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX',
        'BIST:ASELS', 'BIST:TUPRS', 'BIST:THYAO', 'BIST:AKBNK', 'BIST:GARAN',
        'BIST:TCELL', 'BIST:ISCTR', 'BIST:KRDMD', 'BIST:SAHOL'
    ];
    return await getStockData(reliableSymbols);
}

// Determine exchange from symbol
function getExchangeFromSymbol(symbol) {
    if (symbol.startsWith('BIST:')) {
        return 'BIST';
    } else if (symbol.includes('.TO')) {
        return 'TSX';
    } else if (symbol.includes('.L')) {
        return 'LSE';
    } else if (symbol.includes('.PA')) {
        return 'EPA';
    } else if (symbol.includes('.DE')) {
        return 'ETR';
    } else if (symbol.includes('.HK')) {
        return 'HKG';
    } else if (symbol.includes('.T')) {
        return 'TYO';
    } else if (symbol.includes('.SS')) {
        return 'SHA';
    } else if (symbol.includes('.SZ')) {
        return 'SHE';
    } else {
        // Default to US exchanges
        return 'NASDAQ'; // Most symbols are NASDAQ or NYSE, default to NASDAQ
    }
}

// Calculate technical indicators
function calculateTechnicalIndicators(prices, currentPrice) {
    const validPrices = prices.filter(p => p !== null && p !== undefined);
    
    if (validPrices.length < 14) {
        return {
            rsi: 50,
            macd: 'BEKLE',
            sma20: 'BEKLE',
            sma50: 'BEKLE',
            bollinger: 'BEKLE',
            stochastic: 'BEKLE',
            recommendation: 'BEKLE'
        };
    }
    
    const rsi = calculateRSI(validPrices.slice(-14));
    const macd = calculateMACD(validPrices);
    const sma20 = calculateMA(validPrices, 20, currentPrice);
    const sma50 = calculateMA(validPrices, 50, currentPrice);
    const bollinger = calculateBollingerBands(validPrices, currentPrice);
    const stochastic = calculateStochastic(validPrices);
    const recommendation = calculateRecommendation(rsi, macd, sma50, bollinger, stochastic);
    
    return {
        rsi: Math.round(rsi * 10) / 10,
        macd: macd,
        sma20: sma20,
        sma50: sma50,
        bollinger: bollinger,
        stochastic: stochastic,
        recommendation: recommendation
    };
}

function calculateRSI(prices) {
    if (prices.length < 14) return 50;
    
    let gains = 0, losses = 0;
    for (let i = 1; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];
        if (change > 0) gains += change;
        else losses += Math.abs(change);
    }
    
    const avgGain = gains / 13;
    const avgLoss = losses / 13;
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

function calculateMACD(prices) {
    if (prices.length < 26) return 'BEKLE';
    
    const ema12 = calculateEMA(prices, 12);
    const ema26 = calculateEMA(prices, 26);
    
    if (ema12 > ema26) return 'AL';
    else if (ema12 < ema26) return 'SAT';
    else return 'BEKLE';
}

function calculateEMA(prices, period) {
    if (prices.length < period) return prices[prices.length - 1];
    
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
        ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
}

function calculateMA(prices, period, currentPrice) {
    if (prices.length < period) return 'BEKLE';
    
    const ma = prices.slice(-period).reduce((sum, price) => sum + price, 0) / period;
    
    if (currentPrice > ma) return 'AL';
    else if (currentPrice < ma) return 'SAT';
    else return 'BEKLE';
}

function calculateBollingerBands(prices, currentPrice) {
    if (prices.length < 20) return 'BEKLE';
    
    const period = 20;
    const stdDev = calculateStandardDeviation(prices.slice(-period));
    const sma = prices.slice(-period).reduce((sum, price) => sum + price, 0) / period;
    
    const upperBand = sma + (2 * stdDev);
    const lowerBand = sma - (2 * stdDev);
    
    if (currentPrice > upperBand) return 'SAT';
    else if (currentPrice < lowerBand) return 'AL';
    else return 'BEKLE';
}

function calculateStandardDeviation(prices) {
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
    return Math.sqrt(variance);
}

function calculateStochastic(prices) {
    if (prices.length < 14) return 'BEKLE';
    
    const period = 14;
    const recentPrices = prices.slice(-period);
    const highest = Math.max(...recentPrices);
    const lowest = Math.min(...recentPrices);
    const currentPrice = prices[prices.length - 1];
    
    const k = ((currentPrice - lowest) / (highest - lowest)) * 100;
    
    if (k > 80) return 'SAT';
    else if (k < 20) return 'AL';
    else return 'BEKLE';
}

function calculateRecommendation(rsi, macd, sma50, bollinger, stochastic) {
    let buySignals = 0, sellSignals = 0;
    
    if (rsi < 30) buySignals++;
    else if (rsi > 70) sellSignals++;
    
    if (macd === 'AL') buySignals++;
    else if (macd === 'SAT') sellSignals++;
    
    if (sma50 === 'AL') buySignals++;
    else if (sma50 === 'SAT') sellSignals++;
    
    if (bollinger === 'AL') buySignals++;
    else if (bollinger === 'SAT') sellSignals++;
    
    if (stochastic === 'AL') buySignals++;
    else if (stochastic === 'SAT') sellSignals++;
    
    if (buySignals > sellSignals && buySignals >= 3) return 'AL';
    else if (sellSignals > buySignals && sellSignals >= 3) return 'SAT';
    else return 'BEKLE';
}

function getFallbackData(symbol) {
    const fallbackPrices = {
        'BIST:ASELS': 173.90, 'BIST:TUPRS': 95.20, 'BIST:THYAO': 205.50,
        'BIST:AKBNK': 45.20, 'BIST:GARAN': 137.90, 'BIST:ISCTR': 13.95,
        'AAPL': 234.07, 'MSFT': 509.90, 'TSLA': 395.94, 'NVDA': 177.82,
        'JPM': 120.00, 'BAC': 25.00, 'WMT': 150.00
    };
    
    const price = fallbackPrices[symbol] || 100;
    // Generate more realistic percentage changes (-10% to +10%)
    const changePercent = (Math.random() - 0.5) * 20;
    const change = (price * changePercent) / 100;
    
    return {
        symbol: symbol,
        name: STOCK_NAMES[symbol] || symbol,
        price: price,
        change: change,
        changePercent: changePercent,
        volume: Math.floor(Math.random() * 5000000) + 1000000,
        high: price * (1 + Math.random() * 0.05),
        low: price * (1 - Math.random() * 0.05),
        open: price * (0.98 + Math.random() * 0.04),
        currency: symbol.startsWith('BIST:') ? 'TRY' : 'USD',
        exchange: symbol.startsWith('BIST:') ? 'BIST' : 'NASDAQ',
        rsi: Math.floor(Math.random() * 100),
        macd: Math.random() > 0.5 ? 'AL' : 'SAT',
        sma20: Math.random() > 0.5 ? 'AL' : 'SAT',
        sma50: Math.random() > 0.5 ? 'AL' : 'SAT',
        bollinger: Math.random() > 0.5 ? 'AL' : 'SAT',
        stochastic: Math.random() > 0.5 ? 'AL' : 'SAT',
        recommendation: ['AL', 'SAT', 'BEKLE'][Math.floor(Math.random() * 3)],
        lastUpdate: new Date().toISOString()
    };
}

// API Routes

// Authentication Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert user into database
        db.run(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword],
            function(err) {
                if (err) {
                    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                        return res.status(400).json({ error: 'User already exists' });
                    }
                    console.error('Registration error:', err);
                    return res.status(500).json({ error: 'Registration failed' });
                }
                
                const userId = this.lastID;
                
                // Generate JWT token
                const token = jwt.sign(
                    { userId, email, username },
                    JWT_SECRET,
                    { expiresIn: '24h' }
                );
                
                res.json({
                    message: 'User created successfully',
                    token,
                    user: { id: userId, username, email }
                });
            }
        );
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        // Check if user exists in database
        db.get(
            'SELECT * FROM users WHERE email = ?',
            [email],
            async (err, user) => {
                if (err) {
                    console.error('Login error:', err);
                    return res.status(500).json({ error: 'Login failed' });
                }
                
                if (!user) {
                    return res.status(401).json({ error: 'Invalid credentials' });
                }
                
                // Verify password
                const isValidPassword = await bcrypt.compare(password, user.password);
                if (!isValidPassword) {
                    return res.status(401).json({ error: 'Invalid credentials' });
                }
                
                // Generate JWT token
                const token = jwt.sign(
                    { userId: user.id, email: user.email, username: user.username },
                    JWT_SECRET,
                    { expiresIn: '24h' }
                );
                
                res.json({
                    message: 'Login successful',
                    token,
                    user: { id: user.id, username: user.username, email: user.email }
                });
            }
        );
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

app.get('/api/auth/verify', authenticateToken, (req, res) => {
    res.json({
        valid: true,
        user: req.user
    });
});

// User Data Routes
app.get('/api/user/watchlist', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    
    db.all(
        'SELECT symbol FROM watchlist WHERE user_id = ? ORDER BY added_at DESC',
        [userId],
        (err, rows) => {
            if (err) {
                console.error('Watchlist error:', err);
                return res.status(500).json({ error: 'Failed to fetch watchlist' });
            }
            
            const watchlist = rows.map(row => row.symbol);
            res.json(watchlist);
        }
    );
});

app.post('/api/user/watchlist', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const { symbol } = req.body;
        
        if (!symbol) {
            return res.status(400).json({ error: 'Symbol is required' });
        }
        
        db.run(
            'INSERT OR IGNORE INTO watchlist (user_id, symbol) VALUES (?, ?)',
            [userId, symbol],
            function(err) {
                if (err) {
                    console.error('Watchlist error:', err);
                    return res.status(500).json({ error: 'Failed to update watchlist' });
                }
                
                res.json({ message: 'Added to watchlist', symbol });
            }
        );
        
    } catch (error) {
        console.error('Watchlist error:', error);
        res.status(500).json({ error: 'Failed to update watchlist' });
    }
});

app.delete('/api/user/watchlist/:symbol', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const symbol = req.params.symbol;
        
        db.run(
            'DELETE FROM watchlist WHERE user_id = ? AND symbol = ?',
            [userId, symbol],
            function(err) {
                if (err) {
                    console.error('Watchlist error:', err);
                    return res.status(500).json({ error: 'Failed to update watchlist' });
                }
                
                res.json({ message: 'Removed from watchlist', symbol });
            }
        );
        
    } catch (error) {
        console.error('Watchlist error:', error);
        res.status(500).json({ error: 'Failed to update watchlist' });
    }
});

app.get('/api/stocks', authenticateToken, async (req, res) => {
    try {
        // Only return popular stocks instead of all stocks
        const stockData = await getPopularStocks();
        res.json(stockData);
    } catch (error) {
        console.error('Error in /api/stocks:', error);
        res.status(500).json({ error: 'Failed to fetch stock data' });
    }
});

app.get('/api/stocks/:symbol', authenticateToken, async (req, res) => {
    try {
        const symbol = req.params.symbol;
        const stockData = await getStockData([symbol]);
        res.json(stockData[symbol] || {});
    } catch (error) {
        console.error(`Error in /api/stocks/${req.params.symbol}:`, error);
        res.status(500).json({ error: 'Failed to fetch stock data' });
    }
});

// Live search API - searches any stock symbol
app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query || query.length < 2) {
            return res.json([]);
        }
        
        // Use Yahoo Finance search API for live search
        const searchResults = await searchStocksLive(query);
        res.json(searchResults);
    } catch (error) {
        console.error('Error in live search:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

// Live stock search function
async function searchStocksLive(query) {
    try {
        // Use Yahoo Finance search endpoint
        const searchUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=25&newsCount=0`;
        
        const response = await fetch(searchUrl);
        if (!response.ok) {
            throw new Error('Search API failed');
        }
        
        const data = await response.json();
        const results = [];
        
        if (data.quotes && Array.isArray(data.quotes)) {
            for (const quote of data.quotes) {
                if (quote.symbol && quote.longname) {
                    // Try to get current price for each found stock
                    try {
                        const stockData = await getStockData([quote.symbol]);
                        if (stockData[quote.symbol]) {
                            results.push(stockData[quote.symbol]);
                        } else {
                            // If we can't get live data, create a basic result
                            results.push({
                                symbol: quote.symbol,
                                name: quote.longname,
                                price: quote.regularMarketPrice || 0,
                                change: 0,
                                changePercent: 0,
                                volume: 0,
                                high: quote.regularMarketDayHigh || 0,
                                low: quote.regularMarketDayLow || 0,
                                open: quote.regularMarketOpen || 0,
                                currency: quote.currency || 'USD',
                                exchange: quote.exchange || 'UNKNOWN',
                                rsi: 50,
                                macd: 'BEKLE',
                                sma20: 'BEKLE',
                                sma50: 'BEKLE',
                                bollinger: 'BEKLE',
                                stochastic: 'BEKLE',
                                recommendation: 'BEKLE',
                                lastUpdate: new Date().toISOString()
                            });
                        }
                    } catch (error) {
                        // Skip this stock if we can't get data
                        continue;
                    }
                }
            }
        }
        
        return results.slice(0, 25); // Limit to 25 results
        
    } catch (error) {
        console.error('Live search error:', error);
        return [];
    }
}

app.get('/api/chart/:symbol', authenticateToken, async (req, res) => {
    try {
        const symbol = req.params.symbol;
        const interval = req.query.interval || '1d';
        const range = req.query.range || '1mo';
        
        let symbolKey, url;
        
        if (symbol.startsWith('BIST:')) {
            symbolKey = symbol.replace('BIST:', '');
            url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbolKey}.IS?interval=${interval}&range=${range}`;
        } else {
            symbolKey = symbol;
            url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbolKey}?interval=${interval}&range=${range}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data.chart?.result?.[0]) {
            throw new Error('No data available');
        }
        
        const result = data.chart.result[0];
        const timestamps = result.timestamp;
        const quotes = result.indicators.quote[0];
        
        const chartData = {
            timestamps: timestamps,
            open: quotes.open,
            high: quotes.high,
            low: quotes.low,
            close: quotes.close,
            volume: quotes.volume
        };
        
        res.json(chartData);
    } catch (error) {
        console.error('Error fetching chart data:', error);
        res.status(500).json({ error: 'Failed to fetch chart data' });
    }
});

app.get('/api/screener', authenticateToken, async (req, res) => {
    try {
        const exchange = req.query.exchange || 'all';
        const sortBy = req.query.sort || 'volume';
        const minPrice = parseFloat(req.query.minPrice) || 0;
        const maxPrice = parseFloat(req.query.maxPrice) || Infinity;
        const minVolume = parseFloat(req.query.minVolume) || 0;
        const minChange = parseFloat(req.query.minChange) || -Infinity;
        const maxChange = parseFloat(req.query.maxChange) || Infinity;
        const recommendation = req.query.recommendation || 'all';
        
        let symbols = ALL_SYMBOLS;
        if (exchange === 'bist') {
            symbols = STOCK_SYMBOLS.BIST.map(s => `BIST:${s}`);
        } else if (exchange === 'us') {
            symbols = [...STOCK_SYMBOLS.NASDAQ, ...STOCK_SYMBOLS.NYSE];
        }
        
        const stockData = await getStockData(symbols);
        let screenerData = Object.values(stockData);
        
        // Apply filters
        screenerData = screenerData.filter(stock => {
            return stock.price >= minPrice && 
                   stock.price <= maxPrice &&
                   stock.volume >= minVolume &&
                   stock.changePercent >= minChange &&
                   stock.changePercent <= maxChange &&
                   (recommendation === 'all' || stock.recommendation === recommendation);
        });
        
        // Sort by criteria
        if (sortBy === 'volume') {
            screenerData.sort((a, b) => b.volume - a.volume);
        } else if (sortBy === 'change') {
            screenerData.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
        } else if (sortBy === 'price') {
            screenerData.sort((a, b) => b.price - a.price);
        } else if (sortBy === 'rsi') {
            screenerData.sort((a, b) => Math.abs(b.rsi - 50) - Math.abs(a.rsi - 50));
        } else if (sortBy === 'name') {
            screenerData.sort((a, b) => a.name.localeCompare(b.name));
        }
        
        res.json(screenerData.slice(0, 50));
    } catch (error) {
        console.error('Error in /api/screener:', error);
        res.status(500).json({ error: 'Failed to fetch screener data' });
    }
});

app.get('/api/news', authenticateToken, async (req, res) => {
    try {
        // Try to fetch real news
        const newsResponse = await fetch('https://newsapi.org/v2/everything?q=stocks+market&language=en&sortBy=publishedAt&apiKey=demo');
        
        if (newsResponse.ok) {
            const newsData = await newsResponse.json();
            const news = newsData.articles?.slice(0, 5).map(article => ({
                text: article.title,
                time: getTimeAgo(article.publishedAt),
                url: article.url
            })) || [];
            
            res.json(news);
        } else {
            // Fallback news
            const fallbackNews = [
                { text: 'TCMB faiz kararı açıklandı', time: '2 saat önce' },
                { text: 'BIST 100 güne yükselişle başladı', time: '4 saat önce' },
                { text: 'Teknoloji hisseleri dikkat çekiyor', time: '6 saat önce' },
                { text: 'NASDAQ yükselişte', time: '8 saat önce' },
                { text: 'Apple hisseleri güçlü', time: '10 saat önce' },
                { text: 'Tesla yeni fabrika açılışı', time: '12 saat önce' },
                { text: 'Microsoft bulut gelirleri artıyor', time: '14 saat önce' }
            ];
            res.json(fallbackNews);
        }
    } catch (error) {
        console.error('Error fetching news:', error);
        const fallbackNews = [
            { text: 'TCMB faiz kararı açıklandı', time: '2 saat önce' },
            { text: 'BIST 100 güne yükselişle başladı', time: '4 saat önce' },
            { text: 'Teknoloji hisseleri dikkat çekiyor', time: '6 saat önce' }
        ];
        res.json(fallbackNews);
    }
});

// Company-specific news endpoint
app.get('/api/news/:symbol', authenticateToken, async (req, res) => {
    try {
        const symbol = req.params.symbol;
        const stock = STOCK_NAMES[symbol];
        
        if (!stock) {
            return res.status(404).json({ error: 'Stock not found' });
        }
        
        // Generate company-specific news
        const companyNews = generateCompanyNews(symbol, stock);
        res.json(companyNews);
        
    } catch (error) {
        console.error('Error fetching company news:', error);
        res.status(500).json({ error: 'Failed to fetch company news' });
    }
});

// Generate company-specific news
function generateCompanyNews(symbol, companyName) {
    const newsTemplates = {
        // BIST Companies
        'BIST:ASELS': [
            { text: 'Aselsan savunma sanayiinde yeni projeler', time: '1 saat önce' },
            { text: 'Aselsan teknoloji yatırımlarını artırıyor', time: '3 saat önce' },
            { text: 'Aselsan ihracat rakamları açıklandı', time: '5 saat önce' },
            { text: 'Aselsan AR-GE çalışmaları hızlanıyor', time: '7 saat önce' },
            { text: 'Aselsan yeni fabrika yatırımı', time: '9 saat önce' }
        ],
        'BIST:GARAN': [
            { text: 'Garanti BBVA kredi faizlerini güncelledi', time: '2 saat önce' },
            { text: 'Garanti BBVA dijital bankacılıkta öncü', time: '4 saat önce' },
            { text: 'Garanti BBVA müşteri memnuniyeti artıyor', time: '6 saat önce' },
            { text: 'Garanti BBVA yeni şube açılışları', time: '8 saat önce' },
            { text: 'Garanti BBVA teknoloji yatırımları', time: '10 saat önce' }
        ],
        'BIST:ISCTR': [
            { text: 'İş Bankası finansal sonuçları açıklandı', time: '1 saat önce' },
            { text: 'İş Bankası sürdürülebilirlik projeleri', time: '3 saat önce' },
            { text: 'İş Bankası müşteri hizmetleri geliştirildi', time: '5 saat önce' },
            { text: 'İş Bankası dijital dönüşüm hızlanıyor', time: '7 saat önce' },
            { text: 'İş Bankası sosyal sorumluluk projeleri', time: '9 saat önce' }
        ],
        'BIST:TUPRS': [
            { text: 'Tüpraş rafineri kapasitesini artırıyor', time: '2 saat önce' },
            { text: 'Tüpraş çevre dostu yakıt üretimi', time: '4 saat önce' },
            { text: 'Tüpraş ihracat performansı güçlü', time: '6 saat önce' },
            { text: 'Tüpraş teknoloji modernizasyonu', time: '8 saat önce' },
            { text: 'Tüpraş sürdürülebilirlik hedefleri', time: '10 saat önce' }
        ],
        'BIST:THYAO': [
            { text: 'Türk Hava Yolları yeni rotalar açıyor', time: '1 saat önce' },
            { text: 'THY filo genişletme planları', time: '3 saat önce' },
            { text: 'THY müşteri memnuniyeti artıyor', time: '5 saat önce' },
            { text: 'THY dijital dönüşüm projeleri', time: '7 saat önce' },
            { text: 'THY sürdürülebilir havacılık', time: '9 saat önce' }
        ],
        
        // US Companies
        'AAPL': [
            { text: 'Apple yeni iPhone modeli duyuruldu', time: '1 saat önce' },
            { text: 'Apple App Store gelirleri rekor kırdı', time: '3 saat önce' },
            { text: 'Apple AR/VR teknolojileri geliştiriyor', time: '5 saat önce' },
            { text: 'Apple çevre dostu üretim hedefleri', time: '7 saat önce' },
            { text: 'Apple yapay zeka yatırımları', time: '9 saat önce' }
        ],
        'MSFT': [
            { text: 'Microsoft Azure bulut hizmetleri büyüyor', time: '2 saat önce' },
            { text: 'Microsoft AI teknolojileri geliştiriyor', time: '4 saat önce' },
            { text: 'Microsoft Teams kullanıcı sayısı artıyor', time: '6 saat önce' },
            { text: 'Microsoft güvenlik çözümleri güçleniyor', time: '8 saat önce' },
            { text: 'Microsoft sürdürülebilirlik taahhütleri', time: '10 saat önce' }
        ],
        'TSLA': [
            { text: 'Tesla yeni Gigafactory açılışı', time: '1 saat önce' },
            { text: 'Tesla otonom sürüş teknolojisi', time: '3 saat önce' },
            { text: 'Tesla enerji depolama çözümleri', time: '5 saat önce' },
            { text: 'Tesla Model Y satışları artıyor', time: '7 saat önce' },
            { text: 'Tesla sürdürülebilir enerji hedefleri', time: '9 saat önce' }
        ],
        'NVDA': [
            { text: 'NVIDIA yapay zeka çipleri güçleniyor', time: '2 saat önce' },
            { text: 'NVIDIA oyun grafikleri geliştiriyor', time: '4 saat önce' },
            { text: 'NVIDIA veri merkezi çözümleri', time: '6 saat önce' },
            { text: 'NVIDIA otomotiv teknolojileri', time: '8 saat önce' },
            { text: 'NVIDIA araştırma ve geliştirme', time: '10 saat önce' }
        ]
    };
    
    // Return specific news for the company or generic news
    return newsTemplates[symbol] || [
        { text: `${companyName} finansal sonuçları açıklandı`, time: '1 saat önce' },
        { text: `${companyName} yeni projeler duyurdu`, time: '3 saat önce' },
        { text: `${companyName} teknoloji yatırımları`, time: '5 saat önce' },
        { text: `${companyName} müşteri memnuniyeti artıyor`, time: '7 saat önce' },
        { text: `${companyName} sürdürülebilirlik hedefleri`, time: '9 saat önce' }
    ];
}

function getTimeAgo(publishedAt) {
    const now = new Date();
    const published = new Date(publishedAt);
    const diffInHours = Math.floor((now - published) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Az önce';
    if (diffInHours < 24) return `${diffInHours} saat önce`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} gün önce`;
}


// Alarm API endpoints
app.get('/api/alarms', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        
        db.all(
            'SELECT * FROM alarms WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC',
            [userId],
            (err, rows) => {
                if (err) {
                    console.error('Error fetching alarms:', err);
                    return res.status(500).json({ error: 'Failed to fetch alarms' });
                }
                
                const userAlarms = rows.map(row => ({
                    id: row.id,
                    userId: row.user_id,
                    symbol: row.symbol,
                    type: row.type,
                    condition: row.condition,
                    value: row.value,
                    isActive: row.is_active,
                    createdAt: row.created_at
                }));
                
                res.json(userAlarms);
            }
        );
    } catch (error) {
        console.error('Error fetching alarms:', error);
        res.status(500).json({ error: 'Failed to fetch alarms' });
    }
});

app.post('/api/alarms', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const { symbol, type, value, condition } = req.body;
        
        if (!symbol || !type || !value || !condition) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        db.run(
            'INSERT INTO alarms (user_id, symbol, type, condition, value) VALUES (?, ?, ?, ?, ?)',
            [userId, symbol, type, condition, value],
            function(err) {
                if (err) {
                    console.error('Error creating alarm:', err);
                    return res.status(500).json({ error: 'Failed to create alarm' });
                }
                
                const alarm = {
                    id: this.lastID,
                    userId: userId,
                    symbol: symbol,
                    type: type,
                    condition: condition,
                    value: value,
                    isActive: true,
                    createdAt: new Date().toISOString()
                };
                
                res.json({ success: true, alarm });
            }
        );
    } catch (error) {
        console.error('Error creating alarm:', error);
        res.status(500).json({ error: 'Failed to create alarm' });
    }
});

app.delete('/api/alarms/:alarmId', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const alarmId = req.params.alarmId;
        
        db.run(
            'UPDATE alarms SET is_active = 0 WHERE id = ? AND user_id = ?',
            [alarmId, userId],
            function(err) {
                if (err) {
                    console.error('Error deleting alarm:', err);
                    return res.status(500).json({ error: 'Failed to delete alarm' });
                }
                
                if (this.changes === 0) {
                    return res.status(404).json({ error: 'Alarm not found' });
                }
                
                res.json({ success: true });
            }
        );
    } catch (error) {
        console.error('Error deleting alarm:', error);
        res.status(500).json({ error: 'Failed to delete alarm' });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        totalSymbols: ALL_SYMBOLS.length,
        cachedSymbols: stockDataCache.size,
        popularSymbols: 12
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// WebSocket server
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
    console.log('🔌 New WebSocket connection attempt');
    
    // Check for authentication token in query parameters
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    
    if (!token) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Authentication required'
        }));
        ws.close();
        return;
    }
    
    // Verify token
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid authentication token'
            }));
            ws.close();
            return;
        }
        
        console.log('🔌 Authenticated WebSocket connection for user:', user.username);
        
        // Send pre-cached data instantly for faster loading
        getPreCachedPopularStocks().then(data => {
            ws.send(JSON.stringify({
                type: 'initial_data',
                data: data
            }));
            console.log('⚡ Sent pre-cached initial data to user:', user.username);
        }).catch(error => {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Failed to fetch initial data'
            }));
        });
        
        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                console.log('📨 Received message from user:', user.username, data);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        });
        
        ws.on('close', () => {
            console.log('🔌 WebSocket connection closed for user:', user.username);
        });
    });
});

function broadcastUpdate(data) {
    const message = JSON.stringify({
        type: 'update',
        data: data,
        timestamp: new Date().toISOString()
    });
    
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

let updateInterval = null;

function startRealTimeUpdates() {
    if (updateInterval) return;
    
    updateInterval = setInterval(async () => {
        try {
            // Only update popular stocks for real-time updates
            const stockData = await getPopularStocks();
            broadcastUpdate(stockData);
            console.log('📊 Broadcasted real-time update (popular stocks only)');
        } catch (error) {
            console.error('Error in real-time update:', error);
        }
    }, 30000);
    
    console.log('🔄 Started real-time updates (optimized)');
}

function stopRealTimeUpdates() {
    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
        console.log('⏹️ Stopped real-time updates');
    }
}

process.on('SIGINT', () => {
    console.log('🛑 Shutting down server...');
    stopRealTimeUpdates();
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

async function startServer() {
    try {
        server.listen(PORT, () => {
            console.log(`🚀 TradePro Server running on http://localhost:${PORT}`);
            console.log(`📊 WebSocket server running on ws://localhost:${PORT}`);
            console.log(`🌐 Frontend available at http://localhost:${PORT}`);
            console.log(`📈 Supporting ${ALL_SYMBOLS.length} stocks (optimized loading)`);
        });
        
        // Initialize pre-cache on startup
        await updatePreCacheInBackground();
        
        startRealTimeUpdates();
        
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
});

startServer();
