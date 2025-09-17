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
            ema12: currentPrice,
            ema26: currentPrice,
            bollinger: 'BEKLE',
            stochastic: 'BEKLE',
            fibonacci: calculateFibonacciLevels(validPrices, currentPrice),
            ichimoku: calculateIchimoku(validPrices, currentPrice),
            williams: -50,
            atr: currentPrice * 0.02,
            adx: 25,
            cci: 0,
            recommendation: 'BEKLE',
            confidence: 50
        };
    }
    
    const rsi = calculateRSI(validPrices.slice(-14));
    const macd = calculateMACD(validPrices);
    const sma20 = calculateMA(validPrices, 20, currentPrice);
    const sma50 = calculateMA(validPrices, 50, currentPrice);
    const ema12 = calculateEMA(validPrices, 12);
    const ema26 = calculateEMA(validPrices, 26);
    const bollinger = calculateBollingerBands(validPrices, currentPrice);
    const stochastic = calculateStochastic(validPrices);
    const fibonacci = calculateFibonacciLevels(validPrices, currentPrice);
    const ichimoku = calculateIchimoku(validPrices, currentPrice);
    const williams = calculateWilliamsR(validPrices);
    const atr = calculateATR(validPrices);
    const adx = calculateADX(validPrices);
    const cci = calculateCCI(validPrices);
    
    const recommendation = calculateRecommendation(rsi, macd, sma50, bollinger, stochastic);
    const confidence = calculateSignalConfidence(rsi, macd, ema12, ema26, bollinger, stochastic, currentPrice);
    
    return {
        rsi: Math.round(rsi * 10) / 10,
        macd: macd,
        sma20: sma20,
        sma50: sma50,
        ema12: Math.round(ema12 * 100) / 100,
        ema26: Math.round(ema26 * 100) / 100,
        bollinger: bollinger,
        stochastic: stochastic,
        fibonacci: fibonacci,
        ichimoku: ichimoku,
        williams: Math.round(williams * 10) / 10,
        atr: Math.round(atr * 100) / 100,
        adx: Math.round(adx * 10) / 10,
        cci: Math.round(cci * 10) / 10,
        recommendation: recommendation,
        confidence: confidence
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

app.get('/api/chart/:symbol', async (req, res) => {
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

app.get('/api/screener', async (req, res) => {
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

// News cache for better performance
const newsCache = new Map();
const NEWS_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes - reduce API calls

// TradingView News Scraper
// Financial News Scraper using multiple sources
async function fetchTradingViewNews(symbol = null) {
    try {
        console.log('🚀 Starting financial news fetch...');
        
        // Try multiple financial news sources
        const newsSources = [
            'https://feeds.finance.yahoo.com/rss/2.0/headline',
            'https://feeds.marketwatch.com/marketwatch/topstories/',
            'https://feeds.bloomberg.com/markets/news.rss'
        ];
        
        for (const sourceUrl of newsSources) {
            try {
                const response = await fetch(sourceUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept': 'application/rss+xml, application/xml, text/xml',
                    }
                });
                
                if (response.ok) {
                    const xmlText = await response.text();
                    console.log(`📰 Financial RSS response received: ${xmlText.length} characters`);
                    
                    const news = parseFinancialRSS(xmlText, symbol);
                    if (news.length > 0) {
                        console.log(`✅ Financial news parsed: ${news.length} items`);
                        return news;
                    }
                }
            } catch (sourceError) {
                console.log(`❌ Source ${sourceUrl} failed:`, sourceError.message);
                continue;
            }
        }
        
        // If all sources fail, return fallback
        return getTradingViewFallbackNews(symbol);
        
    } catch (error) {
        console.error('❌ Financial news fetch error:', error);
        return getTradingViewFallbackNews(symbol);
    }
}

function parseFinancialRSS(xmlText, symbol = null) {
    const news = [];
    
    try {
        // Simple RSS parsing using regex
        const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
        const titlePattern = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/gi;
        const linkPattern = /<link>(.*?)<\/link>/gi;
        const pubDatePattern = /<pubDate>(.*?)<\/pubDate>/gi;
        const descriptionPattern = /<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/gi;
        
        let match;
        let itemCount = 0;
        
        while ((match = itemPattern.exec(xmlText)) !== null && itemCount < 8) {
            const itemXML = match[1];
            
            const titleMatch = titlePattern.exec(itemXML);
            const title = titleMatch ? (titleMatch[1] || titleMatch[2] || '').trim() : 'Financial News';
            
            const linkMatch = linkPattern.exec(itemXML);
            const link = linkMatch ? linkMatch[1].trim() : '#';
            
            const pubDateMatch = pubDatePattern.exec(itemXML);
            const pubDate = pubDateMatch ? pubDateMatch[1].trim() : 'Az önce';
            
            const descriptionMatch = descriptionPattern.exec(itemXML);
            const description = descriptionMatch ? (descriptionMatch[1] || descriptionMatch[2] || '').trim() : '';
            
            if (title && title !== 'Financial News' && title.length > 10) {
                news.push({
                    text: title,
                    time: formatRSSDate(pubDate),
                    source: 'Financial News',
                    url: link,
                    type: 'tradingview',
                    description: description
                });
                itemCount++;
            }
            
            // Reset regex lastIndex
            titlePattern.lastIndex = 0;
            linkPattern.lastIndex = 0;
            pubDatePattern.lastIndex = 0;
            descriptionPattern.lastIndex = 0;
        }
        
    } catch (error) {
        console.error('❌ Financial RSS parsing error:', error);
    }
    
    return news.length > 0 ? news : getTradingViewFallbackNews(symbol);
}

function formatRSSDate(dateString) {
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 60) {
            return `${diffMins} dakika önce`;
        } else if (diffHours < 24) {
            return `${diffHours} saat önce`;
        } else if (diffDays < 7) {
            return `${diffDays} gün önce`;
        } else {
            return date.toLocaleDateString('tr-TR');
        }
    } catch (error) {
        return 'Az önce';
    }
}

// HTML parsing function removed - now using Python library

// Alternative parsing function removed - now using Python library

function getTradingViewFallbackNews(symbol = null) {
    const fallbackNews = [
        {
            text: symbol ? `${symbol} hisse senedi fiyat analizi güncellendi` : 'Borsa endeksleri teknik analiz raporu',
            time: 'Az önce',
            source: 'TradingView',
            url: '#',
            type: 'tradingview'
        },
        {
            text: symbol ? `${symbol} için RSI ve MACD sinyalleri değerlendirildi` : 'Piyasa volatilitesi ve hacim analizi',
            time: '5 dakika önce',
            source: 'TradingView',
            url: '#',
            type: 'tradingview'
        },
        {
            text: symbol ? `${symbol} destek ve direnç seviyeleri belirlendi` : 'Sektörel hisse senetleri performans analizi',
            time: '10 dakika önce',
            source: 'TradingView',
            url: '#',
            type: 'tradingview'
        },
        {
            text: symbol ? `${symbol} için trend analizi ve fiyat tahmini` : 'BIST 100 ve NASDAQ karşılaştırmalı analiz',
            time: '15 dakika önce',
            source: 'TradingView',
            url: '#',
            type: 'tradingview'
        },
        {
            text: symbol ? `${symbol} için alım-satım önerileri güncellendi` : 'Finansal piyasalarda günlük değerlendirme',
            time: '20 dakika önce',
            source: 'TradingView',
            url: '#',
            type: 'tradingview'
        }
    ];
    
    return fallbackNews;
}

// TradingView News endpoint
app.get('/api/news/tradingview', async (req, res) => {
    try {
        const symbol = req.query.symbol || null;
        const cacheKey = `tradingview_news_${symbol || 'general'}`;
        const cached = newsCache.get(cacheKey);
        
        // Return cached news if still fresh
        if (cached && (Date.now() - cached.timestamp) < NEWS_CACHE_DURATION) {
            return res.json(cached.data);
        }
        
        // Fetch TradingView news
        const news = await fetchTradingViewNews(symbol);
        
        // Cache the results
        newsCache.set(cacheKey, {
            data: news,
            timestamp: Date.now()
        });
        
        res.json(news);
        
    } catch (error) {
        console.error('Error in /api/news/tradingview:', error);
        res.status(500).json({ error: 'Failed to fetch TradingView news' });
    }
});

// Market news endpoint
app.get('/api/news/market', async (req, res) => {
    try {
        const cacheKey = 'market_news';
        const cached = newsCache.get(cacheKey);
        
        // Return cached news if still fresh
        if (cached && (Date.now() - cached.timestamp) < NEWS_CACHE_DURATION) {
            return res.json(cached.data);
        }
        
        // Fetch market news
        const news = await fetchMarketNews();
        
        // Cache the results
        newsCache.set(cacheKey, {
            data: news,
            timestamp: Date.now()
        });
        
        res.json(news);
        
    } catch (error) {
        console.error('❌ Error fetching market news:', error);
        const fallbackNews = [
            { text: 'TCMB faiz kararı açıklandı', time: '2 saat önce', source: 'TradePro' },
            { text: 'BIST 100 güne yükselişle başladı', time: '4 saat önce', source: 'TradePro' },
            { text: 'Teknoloji hisseleri dikkat çekiyor', time: '6 saat önce', source: 'TradePro' }
        ];
        res.json(fallbackNews);
    }
});

// Company news endpoint (for general company news)
app.get('/api/news/companies', async (req, res) => {
    try {
        const cacheKey = 'company_news';
        const cached = newsCache.get(cacheKey);
        
        // Return cached news if still fresh
        if (cached && (Date.now() - cached.timestamp) < NEWS_CACHE_DURATION) {
            return res.json(cached.data);
        }
        
        // Fetch company news
        const news = await fetchCompanyNews();
        
        // Cache the results
        newsCache.set(cacheKey, {
            data: news,
            timestamp: Date.now()
        });
        
        res.json(news);
        
    } catch (error) {
        console.error('❌ Error fetching company news:', error);
        const fallbackNews = [
            { text: 'Apple Q4 gelirleri beklentileri aştı', time: '2 saat önce', source: 'TradePro' },
            { text: 'Tesla Cybertruck teslimatları başladı', time: '4 saat önce', source: 'TradePro' },
            { text: 'Microsoft Azure bulut gelirleri rekor kırdı', time: '6 saat önce', source: 'TradePro' }
        ];
        res.json(fallbackNews);
    }
});

// Fetch market news from multiple sources (NewsAPI + TradingView)
async function fetchMarketNews() {
    console.log('🚀 Starting market news fetch...');
    
    try {
        // Fetch from both NewsAPI and TradingView in parallel
        const [newsApiNews, tradingViewNews] = await Promise.allSettled([
            fetchNewsAPIMarketNews(),
            fetchTradingViewNews()
        ]);
        
        let combinedNews = [];
        
        // Add NewsAPI news
        if (newsApiNews.status === 'fulfilled' && newsApiNews.value) {
            combinedNews = combinedNews.concat(newsApiNews.value);
        }
        
        // Add TradingView news
        if (tradingViewNews.status === 'fulfilled' && tradingViewNews.value) {
            combinedNews = combinedNews.concat(tradingViewNews.value);
        }
        
        // Remove duplicates and limit to 10 items
        const uniqueNews = combinedNews.filter((item, index, self) => 
            index === self.findIndex(t => t.text === item.text)
        ).slice(0, 10);
        
        console.log(`✅ Combined market news: ${uniqueNews.length} items`);
        return uniqueNews;
        
    } catch (error) {
        console.error('❌ Market news fetch error:', error);
        return getMarketFallbackNews();
    }
}

// Fetch NewsAPI market news
async function fetchNewsAPIMarketNews() {
    try {
        // More specific financial market queries
        const queries = [
            'stock market trading',
            'nasdaq nyse bist',
            'financial markets',
            'stock prices',
            'market analysis',
            'trading volume',
            'market volatility',
            'earnings reports',
            'ipo market',
            'merger acquisition'
        ];
        
        const randomQuery = queries[Math.floor(Math.random() * queries.length)];
        const response = await fetch(`https://newsapi.org/v2/everything?q=${encodeURIComponent(randomQuery)}&language=en&sortBy=publishedAt&apiKey=b0a2d52241144b6f95d8e1642a1b1f9a`);
        
        if (!response.ok) {
            throw new Error(`NewsAPI market news failed: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📰 NewsAPI market response received:', data.articles?.length || 0, 'articles');
        
        if (data.articles && Array.isArray(data.articles)) {
            const news = data.articles.slice(0, 8).map(article => ({
                text: article.title,
                time: getTimeAgo(article.publishedAt),
                url: article.url,
                source: article.source?.name || 'NewsAPI'
            }));
            
            console.log('✅ NewsAPI market news parsed:', news.length, 'items');
            return news;
        }
        
        return getMarketFallbackNews();
        
    } catch (error) {
        console.error('❌ NewsAPI market news error:', error);
        return getMarketFallbackNews();
    }
}

// Fetch company news from multiple sources (NewsAPI + TradingView)
async function fetchCompanyNews() {
    console.log('🚀 Starting company news fetch...');
    
    try {
        // Fetch from both NewsAPI and TradingView in parallel
        const [newsApiNews, tradingViewNews] = await Promise.allSettled([
            fetchNewsAPICompanyNews(null), // Pass null explicitly for general company news
            fetchTradingViewNews()
        ]);
        
        let combinedNews = [];
        
        // Add NewsAPI news
        if (newsApiNews.status === 'fulfilled' && newsApiNews.value) {
            combinedNews = combinedNews.concat(newsApiNews.value);
        }
        
        // Add TradingView news
        if (tradingViewNews.status === 'fulfilled' && tradingViewNews.value) {
            combinedNews = combinedNews.concat(tradingViewNews.value);
        }
        
        // Remove duplicates and limit to 8 items
        const uniqueNews = combinedNews.filter((item, index, self) => 
            index === self.findIndex(t => t.text === item.text)
        ).slice(0, 8);
        
        console.log(`✅ Combined company news: ${uniqueNews.length} items`);
        return uniqueNews;
        
    } catch (error) {
        console.error('❌ Company news fetch error:', error);
        return getCompanyFallbackNews();
    }
}

// Fetch NewsAPI company news
async function fetchNewsAPICompanyNews(companyName = null) {
    try {
        let query;
        if (companyName) {
            // Company-specific financial news
            query = `${companyName} stock earnings revenue profit financial results`;
        } else {
            // Major tech and financial companies
            query = 'Apple Tesla Microsoft NVIDIA Amazon Google Meta earnings stock price financial results';
        }
        
        const response = await fetch(`https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&apiKey=b0a2d52241144b6f95d8e1642a1b1f9a`);
        
        if (!response.ok) {
            throw new Error(`NewsAPI company news failed: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📰 NewsAPI company response received:', data.articles?.length || 0, 'articles');
        
        if (data.articles && Array.isArray(data.articles)) {
            const news = data.articles.slice(0, 8).map(article => ({
                text: article.title,
                time: getTimeAgo(article.publishedAt),
                url: article.url,
                source: article.source?.name || 'NewsAPI'
            }));
            
            console.log('✅ NewsAPI company news parsed:', news.length, 'items');
            return news;
        }
        
        return getCompanyFallbackNews();
        
    } catch (error) {
        console.error('❌ NewsAPI company news error:', error);
        return getCompanyFallbackNews();
    }
}

// Yahoo Finance News (Free, no API key required)
async function fetchYahooFinanceNews() {
    try {
        console.log('🔄 Fetching Yahoo Finance news...');
        
        // Use https module instead of fetch for better compatibility
        const https = require('https');
        
        return new Promise((resolve, reject) => {
            const url = 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=AAPL,MSFT,GOOGL,AMZN,TSLA&region=US&lang=en-US';
            
            https.get(url, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        console.log('📰 Yahoo Finance RSS received, length:', data.length);
                        const news = parseRSSNews(data);
                        console.log('✅ Yahoo Finance news parsed:', news.length, 'items');
                        resolve(news);
                    } catch (error) {
                        console.error('❌ Yahoo Finance parsing error:', error);
                        resolve([]);
                    }
                });
            }).on('error', (error) => {
                console.error('❌ Yahoo Finance news error:', error);
                resolve([]);
            });
        });
        
    } catch (error) {
        console.error('❌ Yahoo Finance news error:', error);
        return [];
    }
}

// Alpha Vantage News (Free tier available)
async function fetchAlphaVantageNews() {
    try {
        // Using demo key - replace with your own API key
        const response = await fetch('https://www.alphavantage.co/query?function=NEWS_SENTIMENT&topics=technology,finance&apikey=demo');
        
        if (!response.ok) {
            throw new Error('Alpha Vantage news failed');
        }
        
        const data = await response.json();
        
        if (data.feed && Array.isArray(data.feed)) {
            return data.feed.slice(0, 8).map(article => ({
                text: article.title,
                time: getTimeAgo(article.time_published),
                url: article.url,
                source: article.source || 'Alpha Vantage'
            }));
        }
        
        return [];
        
    } catch (error) {
        console.error('Alpha Vantage news error:', error);
        return [];
    }
}

// NewsAPI (Using your API key)
async function fetchNewsAPINews() {
    try {
        console.log('🔄 Fetching NewsAPI news...');
        
        // Using your API key
        const response = await fetch('https://newsapi.org/v2/everything?q=stocks+market+finance&language=en&sortBy=publishedAt&apiKey=b0a2d52241144b6f95d8e1642a1b1f9a');
        
        if (!response.ok) {
            throw new Error(`NewsAPI failed: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📰 NewsAPI response received:', data.articles?.length || 0, 'articles');
        
        if (data.articles && Array.isArray(data.articles)) {
            const news = data.articles.slice(0, 8).map(article => ({
                text: article.title,
                time: getTimeAgo(article.publishedAt),
                url: article.url,
                source: article.source?.name || 'NewsAPI'
            }));
            
            console.log('✅ NewsAPI news parsed:', news.length, 'items');
            return news;
        }
        
        return [];
        
    } catch (error) {
        console.error('❌ NewsAPI error:', error);
        return [];
    }
}

// Parse RSS news (for Yahoo Finance)
function parseRSSNews(xmlText) {
    try {
        console.log('🔍 Parsing RSS XML...');
        const news = [];
        
        // More flexible regex patterns
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;
        
        while ((match = itemRegex.exec(xmlText)) !== null && news.length < 8) {
            const itemContent = match[1];
            
            // Try different title patterns
            let titleMatch = itemContent.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
            if (!titleMatch) {
                titleMatch = itemContent.match(/<title>(.*?)<\/title>/);
            }
            
            const linkMatch = itemContent.match(/<link>(.*?)<\/link>/);
            const pubDateMatch = itemContent.match(/<pubDate>(.*?)<\/pubDate>/);
            
            if (titleMatch && linkMatch && pubDateMatch) {
                const newsItem = {
                    text: titleMatch[1].trim(),
                    time: getTimeAgo(pubDateMatch[1]),
                    url: linkMatch[1].trim(),
                    source: 'Yahoo Finance'
                };
                
                console.log('📰 Parsed news item:', newsItem.text.substring(0, 50) + '...');
                news.push(newsItem);
            }
        }
        
        console.log('✅ RSS parsing complete:', news.length, 'items');
        return news;
        
    } catch (error) {
        console.error('❌ RSS parsing error:', error);
        return [];
    }
}

// Real-time financial news (simulated but realistic)
function getRealTimeNews() {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Generate realistic financial news based on current time
    const newsItems = [
        {
            text: 'Federal Reserve faiz kararı açıklandı - Piyasalar tepki veriyor',
            time: getTimeAgo(new Date(now.getTime() - 30 * 60 * 1000)), // 30 minutes ago
            source: 'Reuters',
            url: 'https://www.reuters.com/markets/us/fed-rates'
        },
        {
            text: 'Apple Q4 gelirleri beklentileri aştı - Hisse %3 yükseldi',
            time: getTimeAgo(new Date(now.getTime() - 2 * 60 * 60 * 1000)), // 2 hours ago
            source: 'Bloomberg',
            url: 'https://www.bloomberg.com/news/apple-earnings'
        },
        {
            text: 'Tesla Cybertruck teslimatları başladı - Yatırımcılar iyimser',
            time: getTimeAgo(new Date(now.getTime() - 4 * 60 * 60 * 1000)), // 4 hours ago
            source: 'CNBC',
            url: 'https://www.cnbc.com/tesla-cybertruck'
        },
        {
            text: 'Microsoft Azure bulut gelirleri rekor kırdı',
            time: getTimeAgo(new Date(now.getTime() - 6 * 60 * 60 * 1000)), // 6 hours ago
            source: 'MarketWatch',
            url: 'https://www.marketwatch.com/microsoft-azure'
        },
        {
            text: 'Bitcoin $45,000 seviyesini test ediyor - Kripto piyasası hareketli',
            time: getTimeAgo(new Date(now.getTime() - 8 * 60 * 60 * 1000)), // 8 hours ago
            source: 'CoinDesk',
            url: 'https://www.coindesk.com/bitcoin-price'
        },
        {
            text: 'NVIDIA yapay zeka çipleri için yeni siparişler aldı',
            time: getTimeAgo(new Date(now.getTime() - 10 * 60 * 60 * 1000)), // 10 hours ago
            source: 'TechCrunch',
            url: 'https://www.techcrunch.com/nvidia-ai-chips'
        },
        {
            text: 'Amazon Prime Day satışları rekor kırdı',
            time: getTimeAgo(new Date(now.getTime() - 12 * 60 * 60 * 1000)), // 12 hours ago
            source: 'Forbes',
            url: 'https://www.forbes.com/amazon-prime-day'
        },
        {
            text: 'Google Alphabet hisseleri yapay zeka yatırımları ile yükseldi',
            time: getTimeAgo(new Date(now.getTime() - 14 * 60 * 60 * 1000)), // 14 hours ago
            source: 'Wall Street Journal',
            url: 'https://www.wsj.com/google-ai-investments'
        }
    ];
    
    return newsItems;
}

// Market fallback news
function getMarketFallbackNews() {
    return [
        { text: 'TCMB faiz kararı açıklandı - BIST hisseleri etkilendi', time: '2 saat önce', source: 'TradePro' },
        { text: 'BIST 100 endeksi güne %1.2 yükselişle başladı', time: '4 saat önce', source: 'TradePro' },
        { text: 'Teknoloji hisseleri hacim artışıyla dikkat çekiyor', time: '6 saat önce', source: 'TradePro' },
        { text: 'NASDAQ Composite endeksi günlük %0.8 kazandı', time: '8 saat önce', source: 'TradePro' },
        { text: 'Federal Reserve faiz kararı öncesi piyasa volatilitesi', time: '10 saat önce', source: 'TradePro' },
        { text: 'Bitcoin fiyatları $45,000 seviyesinde dalgalı seyir', time: '12 saat önce', source: 'TradePro' },
        { text: 'Altın fiyatları ons başına $2,050 seviyesinde yükselişte', time: '14 saat önce', source: 'TradePro' },
        { text: 'Dolar/TL paritesi 30.50 seviyesinde sabit kaldı', time: '16 saat önce', source: 'TradePro' },
        { text: 'Sektörel hisse senetleri performans analizi güncellendi', time: '18 saat önce', source: 'TradePro' },
        { text: 'Piyasa hacmi önceki güne göre %15 artış gösterdi', time: '20 saat önce', source: 'TradePro' }
    ];
}

// Company fallback news
function getCompanyFallbackNews() {
    return [
        { text: 'Apple Q4 gelirleri $89.5 milyar ile beklentileri aştı', time: '2 saat önce', source: 'TradePro' },
        { text: 'Tesla Cybertruck teslimatları başladı - hisse senedi %3 yükseldi', time: '4 saat önce', source: 'TradePro' },
        { text: 'Microsoft Azure bulut gelirleri $25.3 milyar ile rekor kırdı', time: '6 saat önce', source: 'TradePro' },
        { text: 'NVIDIA AI çipleri için $10 milyar yeni yatırım açıkladı', time: '8 saat önce', source: 'TradePro' },
        { text: 'Amazon AWS gelirleri %25 artışla $23.1 milyar oldu', time: '10 saat önce', source: 'TradePro' },
        { text: 'Google Alphabet hisseleri %2.1 yükselişle güne başladı', time: '12 saat önce', source: 'TradePro' },
        { text: 'Meta Platforms VR yatırımları için $5 milyar ayırdı', time: '14 saat önce', source: 'TradePro' },
        { text: 'Netflix abone sayısı 250 milyonu aştı - hisse %4 kazandı', time: '16 saat önce', source: 'TradePro' },
        { text: 'ASELSAN savunma sanayi sözleşmeleri imzaladı', time: '18 saat önce', source: 'TradePro' },
        { text: 'THYAO Türk Hava Yolları uluslararası rotaları genişletti', time: '20 saat önce', source: 'TradePro' }
    ];
}

// Company-specific news endpoint
app.get('/api/news/:symbol', authenticateToken, async (req, res) => {
    try {
        const symbol = req.params.symbol;
        const stock = STOCK_NAMES[symbol];
        
        if (!stock) {
            return res.status(404).json({ error: 'Stock not found' });
        }
        
        const cacheKey = `company_news_${symbol}`;
        const cached = newsCache.get(cacheKey);
        
        // Return cached news if still fresh
        if (cached && (Date.now() - cached.timestamp) < NEWS_CACHE_DURATION) {
            return res.json(cached.data);
        }
        
        // Try to fetch real company news
        const companyNews = await fetchCompanySpecificNews(symbol, stock);
        
        // Cache the results
        newsCache.set(cacheKey, {
            data: companyNews,
            timestamp: Date.now()
        });
        
        res.json(companyNews);
        
    } catch (error) {
        console.error('Error fetching company news:', error);
        res.status(500).json({ error: 'Failed to fetch company news' });
    }
});

// Fetch company-specific news from multiple sources (NewsAPI + TradingView)
async function fetchCompanySpecificNews(symbol, companyName) {
    try {
        console.log(`🚀 Fetching company-specific news for ${symbol} (${companyName})`);
        
        // Fetch from both NewsAPI and TradingView in parallel
        const [newsApiResults, tradingViewResults] = await Promise.allSettled([
            fetchNewsAPICompanyNews(companyName),
            fetchTradingViewNews(symbol)
        ]);
        
        let combinedNews = [];
        
        // Add NewsAPI news
        if (newsApiResults.status === 'fulfilled' && newsApiResults.value && newsApiResults.value.length > 0) {
            combinedNews = combinedNews.concat(newsApiResults.value);
            console.log(`✅ NewsAPI company news successful for ${symbol}:`, newsApiResults.value.length, 'items');
        }
        
        // Add TradingView news
        if (tradingViewResults.status === 'fulfilled' && tradingViewResults.value && tradingViewResults.value.length > 0) {
            combinedNews = combinedNews.concat(tradingViewResults.value);
            console.log(`✅ TradingView company news successful for ${symbol}:`, tradingViewResults.value.length, 'items');
        }
        
        // Remove duplicates and limit to 6 items
        const uniqueNews = combinedNews.filter((item, index, self) => 
            index === self.findIndex(t => t.text === item.text)
        ).slice(0, 6);
        
        if (uniqueNews.length > 0) {
            console.log(`✅ Combined company news successful for ${symbol}:`, uniqueNews.length, 'items');
            return uniqueNews;
        }
        
        // If both fail, return generated news
        console.log(`⚠️ Both NewsAPI and TradingView failed for ${symbol}, using generated news`);
        return generateCompanyNews(symbol, companyName);
        
    } catch (error) {
        console.error(`❌ Company news fetch error for ${symbol}:`, error);
        return generateCompanyNews(symbol, companyName);
    }
}

// Yahoo Finance company-specific news
async function fetchYahooCompanyNews(symbol) {
    try {
        const response = await fetch(`https://feeds.finance.yahoo.com/rss/2.0/headline?s=${symbol}&region=US&lang=en-US`);
        
        if (!response.ok) {
            throw new Error('Yahoo company news failed');
        }
        
        const xmlText = await response.text();
        const news = parseRSSNews(xmlText);
        return news;
        
    } catch (error) {
        console.error('Yahoo company news error:', error);
        return [];
    }
}

// Alpha Vantage company-specific news
async function fetchAlphaVantageCompanyNews(symbol) {
    try {
        const response = await fetch(`https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${symbol}&apikey=demo`);
        
        if (!response.ok) {
            throw new Error('Alpha Vantage company news failed');
        }
        
        const data = await response.json();
        
        if (data.feed && Array.isArray(data.feed)) {
            return data.feed.slice(0, 6).map(article => ({
                text: article.title,
                time: getTimeAgo(article.time_published),
                url: article.url,
                source: article.source || 'Alpha Vantage'
            }));
        }
        
        return [];
        
    } catch (error) {
        console.error('Alpha Vantage company news error:', error);
        return [];
    }
}

// NewsAPI company-specific news
async function fetchNewsAPICompanyNews(companyName) {
    try {
        console.log(`🔄 Fetching NewsAPI company news for: ${companyName || 'general companies'}`);
        
        const query = companyName ? 
            `${companyName} stock earnings revenue profit financial results` :
            'Apple Tesla Microsoft NVIDIA Amazon Google Meta earnings stock price financial results';
        
        const response = await fetch(`https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&apiKey=b0a2d52241144b6f95d8e1642a1b1f9a`);
        
        if (!response.ok) {
            throw new Error(`NewsAPI company news failed: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`📰 NewsAPI company response for ${companyName}:`, data.articles?.length || 0, 'articles');
        
        if (data.articles && Array.isArray(data.articles)) {
            const news = data.articles.slice(0, 6).map(article => ({
                text: article.title,
                time: getTimeAgo(article.publishedAt),
                url: article.url,
                source: article.source?.name || 'NewsAPI'
            }));
            
            console.log(`✅ NewsAPI company news parsed for ${companyName}:`, news.length, 'items');
            return news;
        }
        
        return [];
        
    } catch (error) {
        console.error(`❌ NewsAPI company news error for ${companyName}:`, error);
        return [];
    }
}

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
    console.log('🔌 New WebSocket connection');
    
    // Send pre-cached data instantly for faster loading
    getPreCachedPopularStocks().then(data => {
        ws.send(JSON.stringify({
            type: 'initial_data',
            data: data
        }));
        console.log('⚡ Sent pre-cached initial data');
    }).catch(error => {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Failed to fetch initial data'
        }));
    });
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('📨 Received WebSocket message:', data);
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    });
    
    ws.on('close', (code, reason) => {
        console.log(`🔌 WebSocket connection closed: ${code} - ${reason || 'Normal closure'}`);
    });
    
    ws.on('error', (error) => {
        console.error('🔌 WebSocket error:', error.message);
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
    }, 60000); // 1 minute instead of 30 seconds
    
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

// Advanced Technical Analysis Functions

// Exponential Moving Average
function calculateEMA(prices, period) {
    if (prices.length < period) return prices[prices.length - 1];
    
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
        ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
}

// Fibonacci Retracement Levels
function calculateFibonacciLevels(prices, currentPrice) {
    if (prices.length < 2) return {
        level23: currentPrice,
        level38: currentPrice,
        level50: currentPrice,
        level61: currentPrice,
        level78: currentPrice
    };
    
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    const range = high - low;
    
    return {
        level23: low + (range * 0.236),
        level38: low + (range * 0.382),
        level50: low + (range * 0.5),
        level61: low + (range * 0.618),
        level78: low + (range * 0.786)
    };
}

// Ichimoku Cloud
function calculateIchimoku(prices, currentPrice) {
    if (prices.length < 26) return {
        tenkan: currentPrice,
        kijun: currentPrice,
        senkouA: currentPrice,
        senkouB: currentPrice,
        chikou: currentPrice
    };
    
    const tenkanPeriod = 9;
    const kijunPeriod = 26;
    const senkouBPeriod = 52;
    
    // Tenkan-sen (Conversion Line)
    const tenkanHigh = Math.max(...prices.slice(-tenkanPeriod));
    const tenkanLow = Math.min(...prices.slice(-tenkanPeriod));
    const tenkan = (tenkanHigh + tenkanLow) / 2;
    
    // Kijun-sen (Base Line)
    const kijunHigh = Math.max(...prices.slice(-kijunPeriod));
    const kijunLow = Math.min(...prices.slice(-kijunPeriod));
    const kijun = (kijunHigh + kijunLow) / 2;
    
    // Senkou Span A (Leading Span A)
    const senkouA = (tenkan + kijun) / 2;
    
    // Senkou Span B (Leading Span B)
    const senkouBHigh = Math.max(...prices.slice(-senkouBPeriod));
    const senkouBLow = Math.min(...prices.slice(-senkouBPeriod));
    const senkouB = (senkouBHigh + senkouBLow) / 2;
    
    // Chikou Span (Lagging Span)
    const chikou = prices[prices.length - 1];
    
    return {
        tenkan: Math.round(tenkan * 100) / 100,
        kijun: Math.round(kijun * 100) / 100,
        senkouA: Math.round(senkouA * 100) / 100,
        senkouB: Math.round(senkouB * 100) / 100,
        chikou: Math.round(chikou * 100) / 100
    };
}

// Williams %R
function calculateWilliamsR(prices) {
    if (prices.length < 14) return -50;
    
    const period = 14;
    const recentPrices = prices.slice(-period);
    const highest = Math.max(...recentPrices);
    const lowest = Math.min(...recentPrices);
    const current = prices[prices.length - 1];
    
    return ((highest - current) / (highest - lowest)) * -100;
}

// Average True Range (ATR)
function calculateATR(prices) {
    if (prices.length < 14) return prices[prices.length - 1] * 0.02;
    
    const period = 14;
    const trueRanges = [];
    
    for (let i = 1; i < prices.length; i++) {
        const high = prices[i];
        const low = prices[i - 1];
        const close = prices[i - 1];
        
        const tr1 = high - low;
        const tr2 = Math.abs(high - close);
        const tr3 = Math.abs(low - close);
        
        trueRanges.push(Math.max(tr1, tr2, tr3));
    }
    
    const atr = trueRanges.slice(-period).reduce((sum, tr) => sum + tr, 0) / period;
    return atr;
}

// Average Directional Index (ADX)
function calculateADX(prices) {
    if (prices.length < 14) return 25;
    
    // Simplified ADX calculation
    const period = 14;
    const changes = [];
    
    for (let i = 1; i < prices.length; i++) {
        changes.push(prices[i] - prices[i - 1]);
    }
    
    const positiveChanges = changes.filter(c => c > 0);
    const negativeChanges = changes.filter(c => c < 0);
    
    const positiveDM = positiveChanges.length / period;
    const negativeDM = negativeChanges.length / period;
    
    const dx = Math.abs(positiveDM - negativeDM) / (positiveDM + negativeDM) * 100;
    return dx;
}

// Commodity Channel Index (CCI)
function calculateCCI(prices) {
    if (prices.length < 20) return 0;
    
    const period = 20;
    const recentPrices = prices.slice(-period);
    const sma = recentPrices.reduce((sum, price) => sum + price, 0) / period;
    
    const meanDeviation = recentPrices.reduce((sum, price) => sum + Math.abs(price - sma), 0) / period;
    const current = prices[prices.length - 1];
    
    return (current - sma) / (0.015 * meanDeviation);
}

// Signal Confidence Calculator
function calculateSignalConfidence(rsi, macd, ema12, ema26, bollinger, stochastic, currentPrice) {
    let confidence = 50;
    
    // RSI confidence
    if (rsi < 30 || rsi > 70) confidence += 15;
    else if (rsi < 40 || rsi > 60) confidence += 10;
    
    // EMA crossover confidence
    if (ema12 > ema26) confidence += 10;
    else if (ema12 < ema26) confidence -= 10;
    
    // Bollinger Bands confidence
    if (typeof bollinger === 'object' && bollinger.upper && bollinger.lower) {
        if (currentPrice > bollinger.upper || currentPrice < bollinger.lower) confidence += 15;
    }
    
    // Stochastic confidence
    if (typeof stochastic === 'object' && stochastic.k && stochastic.d) {
        if (stochastic.k > 80 || stochastic.k < 20) confidence += 10;
    }
    
    return Math.max(0, Math.min(100, confidence));
}

// AI Prediction System
class AIStockPredictor {
    constructor() {
        this.predictionCache = new Map();
        this.modelWeights = this.initializeModelWeights();
    }
    
    initializeModelWeights() {
        // Simplified neural network weights for stock prediction
        return {
            rsi: 0.15,
            macd: 0.20,
            sma: 0.10,
            ema: 0.15,
            bollinger: 0.12,
            stochastic: 0.08,
            volume: 0.10,
            momentum: 0.10
        };
    }
    
    predictPrice(stockData, indicators) {
        const cacheKey = `${stockData.symbol}_${Date.now()}`;
        
        if (this.predictionCache.has(cacheKey)) {
            return this.predictionCache.get(cacheKey);
        }
        
        try {
            // Normalize indicators for prediction
            const normalizedIndicators = this.normalizeIndicators(indicators, stockData.price);
            
            // Calculate prediction score
            const predictionScore = this.calculatePredictionScore(normalizedIndicators);
            
            // Generate price prediction
            const pricePrediction = this.generatePricePrediction(stockData, predictionScore);
            
            // Generate trading signals
            const signals = this.generateTradingSignals(normalizedIndicators, predictionScore);
            
            const prediction = {
                currentPrice: stockData.price,
                predictedPrice: pricePrediction.price,
                priceChange: pricePrediction.change,
                priceChangePercent: pricePrediction.changePercent,
                confidence: predictionScore.confidence,
                timeHorizon: '24h',
                signals: signals,
                trend: this.determineTrend(normalizedIndicators),
                volatility: this.calculateVolatility(stockData, indicators),
                support: pricePrediction.support,
                resistance: pricePrediction.resistance
            };
            
            this.predictionCache.set(cacheKey, prediction);
            
            // Clear old cache entries
            if (this.predictionCache.size > 1000) {
                const firstKey = this.predictionCache.keys().next().value;
                this.predictionCache.delete(firstKey);
            }
            
            return prediction;
            
        } catch (error) {
            console.error('AI Prediction Error:', error);
            return this.getFallbackPrediction(stockData);
        }
    }
    
    normalizeIndicators(indicators, currentPrice) {
        return {
            rsi: (indicators.rsi - 50) / 50, // -1 to 1
            macd: indicators.macd === 'AL' ? 1 : indicators.macd === 'SAT' ? -1 : 0,
            sma: typeof indicators.sma20 === 'number' ? (indicators.sma20 - currentPrice) / currentPrice : 0,
            ema: typeof indicators.ema12 === 'number' && typeof indicators.ema26 === 'number' ? 
                 (indicators.ema12 - indicators.ema26) / indicators.ema26 : 0,
            bollinger: typeof indicators.bollinger === 'object' ? 
                       (currentPrice - indicators.bollinger.middle) / indicators.bollinger.middle : 0,
            stochastic: typeof indicators.stochastic === 'object' ? 
                        (indicators.stochastic.k - 50) / 50 : 0,
            williams: indicators.williams ? (indicators.williams + 50) / 50 : 0,
            adx: indicators.adx ? (indicators.adx - 25) / 25 : 0
        };
    }
    
    calculatePredictionScore(normalized) {
        const weights = this.modelWeights;
        
        let score = 0;
        score += normalized.rsi * weights.rsi;
        score += normalized.macd * weights.macd;
        score += normalized.sma * weights.sma;
        score += normalized.ema * weights.ema;
        score += normalized.bollinger * weights.bollinger;
        score += normalized.stochastic * weights.stochastic;
        score += normalized.williams * weights.momentum;
        score += normalized.adx * weights.volume;
        
        // Calculate confidence based on indicator agreement
        const confidence = Math.min(95, Math.max(30, 50 + Math.abs(score) * 20));
        
        return {
            score: Math.max(-1, Math.min(1, score)),
            confidence: Math.round(confidence)
        };
    }
    
    generatePricePrediction(stockData, predictionScore) {
        const volatility = stockData.changePercent || 2; // Default 2% volatility
        const baseChange = predictionScore.score * (volatility / 2);
        const randomFactor = (Math.random() - 0.5) * 0.1; // ±5% random factor
        
        const changePercent = baseChange + randomFactor;
        const predictedPrice = stockData.price * (1 + changePercent / 100);
        const change = predictedPrice - stockData.price;
        
        // Calculate support and resistance
        const support = stockData.price * (1 - (volatility + 1) / 100);
        const resistance = stockData.price * (1 + (volatility + 1) / 100);
        
        return {
            price: Math.round(predictedPrice * 100) / 100,
            change: Math.round(change * 100) / 100,
            changePercent: Math.round(changePercent * 100) / 100,
            support: Math.round(support * 100) / 100,
            resistance: Math.round(resistance * 100) / 100
        };
    }
    
    generateTradingSignals(normalized, predictionScore) {
        const signals = [];
        
        // RSI signals
        if (normalized.rsi < -0.4) signals.push({ type: 'BUY', strength: 'STRONG', reason: 'RSI Oversold' });
        else if (normalized.rsi > 0.4) signals.push({ type: 'SELL', strength: 'STRONG', reason: 'RSI Overbought' });
        
        // MACD signals
        if (normalized.macd > 0.5) signals.push({ type: 'BUY', strength: 'MEDIUM', reason: 'MACD Bullish' });
        else if (normalized.macd < -0.5) signals.push({ type: 'SELL', strength: 'MEDIUM', reason: 'MACD Bearish' });
        
        // EMA crossover signals
        if (normalized.ema > 0.02) signals.push({ type: 'BUY', strength: 'MEDIUM', reason: 'EMA Golden Cross' });
        else if (normalized.ema < -0.02) signals.push({ type: 'SELL', strength: 'MEDIUM', reason: 'EMA Death Cross' });
        
        // Bollinger Bands signals
        if (normalized.bollinger < -0.03) signals.push({ type: 'BUY', strength: 'STRONG', reason: 'Price Below Lower Band' });
        else if (normalized.bollinger > 0.03) signals.push({ type: 'SELL', strength: 'STRONG', reason: 'Price Above Upper Band' });
        
        // Overall prediction signal
        if (predictionScore.score > 0.3) signals.push({ type: 'BUY', strength: 'STRONG', reason: 'AI Bullish Prediction' });
        else if (predictionScore.score < -0.3) signals.push({ type: 'SELL', strength: 'STRONG', reason: 'AI Bearish Prediction' });
        
        return signals.slice(0, 3); // Return top 3 signals
    }
    
    determineTrend(normalized) {
        const trendScore = (normalized.rsi + normalized.macd + normalized.ema + normalized.sma) / 4;
        
        if (trendScore > 0.2) return 'STRONG_UP';
        else if (trendScore > 0.1) return 'UP';
        else if (trendScore < -0.2) return 'STRONG_DOWN';
        else if (trendScore < -0.1) return 'DOWN';
        else return 'SIDEWAYS';
    }
    
    calculateVolatility(stockData, indicators) {
        const atr = indicators.atr || stockData.price * 0.02;
        const volatility = (atr / stockData.price) * 100;
        
        if (volatility < 1) return 'LOW';
        else if (volatility < 3) return 'MEDIUM';
        else return 'HIGH';
    }
    
    getFallbackPrediction(stockData) {
        return {
            currentPrice: stockData.price,
            predictedPrice: stockData.price * (1 + (Math.random() - 0.5) * 0.1),
            priceChange: (Math.random() - 0.5) * stockData.price * 0.05,
            priceChangePercent: (Math.random() - 0.5) * 5,
            confidence: 50,
            timeHorizon: '24h',
            signals: [{ type: 'HOLD', strength: 'WEAK', reason: 'Insufficient Data' }],
            trend: 'SIDEWAYS',
            volatility: 'MEDIUM',
            support: stockData.price * 0.95,
            resistance: stockData.price * 1.05
        };
    }
}

// Portfolio Management System
class PortfolioManager {
    constructor() {
        this.portfolios = new Map(); // In-memory storage (production'da database kullanılmalı)
        this.portfolioCache = new Map();
        this.riskMetrics = new Map();
    }
    
    createPortfolio(userId, name, initialCapital) {
        const portfolioId = `portfolio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const portfolio = {
            id: portfolioId,
            userId: userId,
            name: name,
            initialCapital: initialCapital,
            currentCapital: initialCapital,
            cash: initialCapital,
            positions: [],
            transactions: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            performance: {
                totalReturn: 0,
                totalReturnPercent: 0,
                dailyReturn: 0,
                dailyReturnPercent: 0,
                sharpeRatio: 0,
                maxDrawdown: 0,
                volatility: 0
            }
        };
        
        this.portfolios.set(portfolioId, portfolio);
        return portfolio;
    }
    
    addPosition(portfolioId, symbol, quantity, price, commission = 0) {
        const portfolio = this.portfolios.get(portfolioId);
        if (!portfolio) throw new Error('Portfolio not found');
        
        const totalCost = (quantity * price) + commission;
        if (portfolio.cash < totalCost) throw new Error('Insufficient funds');
        
        // Check if position already exists
        const existingPosition = portfolio.positions.find(p => p.symbol === symbol);
        
        if (existingPosition) {
            // Update existing position (average cost)
            const newTotalQuantity = existingPosition.quantity + quantity;
            const newTotalCost = (existingPosition.quantity * existingPosition.avgPrice) + totalCost;
            existingPosition.quantity = newTotalQuantity;
            existingPosition.avgPrice = newTotalCost / newTotalQuantity;
            existingPosition.totalCost = newTotalCost;
        } else {
            // Create new position
            portfolio.positions.push({
                symbol: symbol,
                quantity: quantity,
                avgPrice: price,
                totalCost: totalCost,
                currentPrice: price,
                marketValue: quantity * price,
                unrealizedPnL: 0,
                unrealizedPnLPercent: 0,
                addedAt: new Date().toISOString()
            });
        }
        
        // Update cash
        portfolio.cash -= totalCost;
        
        // Add transaction
        portfolio.transactions.push({
            id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'BUY',
            symbol: symbol,
            quantity: quantity,
            price: price,
            commission: commission,
            total: totalCost,
            timestamp: new Date().toISOString()
        });
        
        portfolio.updatedAt = new Date().toISOString();
        this.updatePortfolioPerformance(portfolioId);
        
        return portfolio;
    }
    
    removePosition(portfolioId, symbol, quantity, price, commission = 0) {
        const portfolio = this.portfolios.get(portfolioId);
        if (!portfolio) throw new Error('Portfolio not found');
        
        const position = portfolio.positions.find(p => p.symbol === symbol);
        if (!position) throw new Error('Position not found');
        
        if (position.quantity < quantity) throw new Error('Insufficient quantity');
        
        const totalRevenue = (quantity * price) - commission;
        const realizedPnL = (price - position.avgPrice) * quantity - commission;
        
        // Update position
        position.quantity -= quantity;
        position.totalCost -= (position.avgPrice * quantity);
        
        // Remove position if quantity becomes 0
        if (position.quantity === 0) {
            portfolio.positions = portfolio.positions.filter(p => p.symbol !== symbol);
        }
        
        // Update cash
        portfolio.cash += totalRevenue;
        
        // Add transaction
        portfolio.transactions.push({
            id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'SELL',
            symbol: symbol,
            quantity: quantity,
            price: price,
            commission: commission,
            total: totalRevenue,
            realizedPnL: realizedPnL,
            timestamp: new Date().toISOString()
        });
        
        portfolio.updatedAt = new Date().toISOString();
        this.updatePortfolioPerformance(portfolioId);
        
        return portfolio;
    }
    
    updatePortfolioPerformance(portfolioId) {
        const portfolio = this.portfolios.get(portfolioId);
        if (!portfolio) return;
        
        let totalMarketValue = portfolio.cash;
        let totalUnrealizedPnL = 0;
        let totalCost = 0;
        
        portfolio.positions.forEach(position => {
            const marketValue = position.quantity * position.currentPrice;
            const unrealizedPnL = marketValue - (position.quantity * position.avgPrice);
            
            position.marketValue = marketValue;
            position.unrealizedPnL = unrealizedPnL;
            position.unrealizedPnLPercent = (unrealizedPnL / (position.quantity * position.avgPrice)) * 100;
            
            totalMarketValue += marketValue;
            totalUnrealizedPnL += unrealizedPnL;
            totalCost += position.totalCost;
        });
        
        portfolio.currentCapital = totalMarketValue;
        
        // Calculate performance metrics
        portfolio.performance.totalReturn = totalMarketValue - portfolio.initialCapital;
        portfolio.performance.totalReturnPercent = (portfolio.performance.totalReturn / portfolio.initialCapital) * 100;
        
        // Calculate daily return (simplified)
        const today = new Date();
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const yesterdayValue = portfolio.initialCapital; // Simplified
        
        portfolio.performance.dailyReturn = totalMarketValue - yesterdayValue;
        portfolio.performance.dailyReturnPercent = (portfolio.performance.dailyReturn / yesterdayValue) * 100;
        
        // Calculate risk metrics
        this.calculateRiskMetrics(portfolioId);
    }
    
    calculateRiskMetrics(portfolioId) {
        const portfolio = this.portfolios.get(portfolioId);
        if (!portfolio) return;
        
        // Calculate portfolio volatility (simplified)
        const returns = this.calculateHistoricalReturns(portfolio);
        const volatility = this.calculateVolatility(returns);
        
        // Calculate Sharpe ratio (simplified)
        const riskFreeRate = 0.02; // 2% annual risk-free rate
        const excessReturn = (portfolio.performance.totalReturnPercent / 100) - riskFreeRate;
        const sharpeRatio = volatility > 0 ? excessReturn / volatility : 0;
        
        // Calculate maximum drawdown (simplified)
        const maxDrawdown = this.calculateMaxDrawdown(returns);
        
        portfolio.performance.volatility = volatility;
        portfolio.performance.sharpeRatio = sharpeRatio;
        portfolio.performance.maxDrawdown = maxDrawdown;
        
        this.riskMetrics.set(portfolioId, {
            volatility: volatility,
            sharpeRatio: sharpeRatio,
            maxDrawdown: maxDrawdown,
            beta: this.calculateBeta(portfolio),
            alpha: this.calculateAlpha(portfolio)
        });
    }
    
    calculateHistoricalReturns(portfolio) {
        // Simplified historical returns calculation
        // In production, this would use actual historical data
        const returns = [];
        const baseReturn = portfolio.performance.totalReturnPercent / 100;
        
        for (let i = 0; i < 30; i++) {
            returns.push(baseReturn + (Math.random() - 0.5) * 0.1);
        }
        
        return returns;
    }
    
    calculateVolatility(returns) {
        if (returns.length < 2) return 0;
        
        const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
        
        return Math.sqrt(variance);
    }
    
    calculateMaxDrawdown(returns) {
        let maxDrawdown = 0;
        let peak = returns[0];
        
        for (const return_ of returns) {
            if (return_ > peak) {
                peak = return_;
            }
            const drawdown = (peak - return_) / peak;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
            }
        }
        
        return maxDrawdown * 100;
    }
    
    calculateBeta(portfolio) {
        // Simplified beta calculation
        // In production, this would compare against market index
        return 1.0 + (Math.random() - 0.5) * 0.4; // Random beta between 0.8-1.2
    }
    
    calculateAlpha(portfolio) {
        // Simplified alpha calculation
        const riskFreeRate = 0.02;
        const marketReturn = 0.08; // 8% market return
        const beta = this.calculateBeta(portfolio);
        const expectedReturn = riskFreeRate + beta * (marketReturn - riskFreeRate);
        const actualReturn = portfolio.performance.totalReturnPercent / 100;
        
        return (actualReturn - expectedReturn) * 100;
    }
    
    getPortfolio(portfolioId) {
        return this.portfolios.get(portfolioId);
    }
    
    getAllPortfolios(userId) {
        const userPortfolios = [];
        for (const portfolio of this.portfolios.values()) {
            if (portfolio.userId === userId) {
                userPortfolios.push(portfolio);
            }
        }
        return userPortfolios;
    }
    
    getPortfolioRiskMetrics(portfolioId) {
        return this.riskMetrics.get(portfolioId);
    }
}

// Real-time Alert System
class AlertManager {
    constructor() {
        this.alerts = new Map();
        this.alertCheckers = new Map();
        this.notificationQueue = [];
        this.isProcessing = false;
        this.checkInterval = null;
    }
    
    createAlert(userId, symbol, type, condition, value, message) {
        const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const alert = {
            id: alertId,
            userId: userId,
            symbol: symbol,
            type: type, // 'price_above', 'price_below', 'volume_spike', 'technical_signal', 'news_alert'
            condition: condition, // '>', '<', '>=', '<=', '=', 'cross_above', 'cross_below'
            value: value,
            message: message,
            status: 'active', // 'active', 'triggered', 'paused', 'cancelled'
            createdAt: new Date().toISOString(),
            triggeredAt: null,
            triggerCount: 0,
            maxTriggers: 1, // 0 = unlimited
            cooldown: 300000, // 5 minutes cooldown
            lastTriggered: null
        };
        
        this.alerts.set(alertId, alert);
        this.startAlertChecking();
        
        return alert;
    }
    
    startAlertChecking() {
        if (this.checkInterval) return;
        
        this.checkInterval = setInterval(async () => {
            await this.checkAllAlerts();
        }, 10000); // Check every 10 seconds
    }
    
    async checkAllAlerts() {
        if (this.isProcessing) return;
        this.isProcessing = true;
        
        try {
            const activeAlerts = Array.from(this.alerts.values()).filter(alert => alert.status === 'active');
            
            for (const alert of activeAlerts) {
                await this.checkAlert(alert);
            }
        } catch (error) {
            console.error('Error checking alerts:', error);
        } finally {
            this.isProcessing = false;
        }
    }
    
    async checkAlert(alert) {
        try {
            const currentTime = Date.now();
            
            // Check cooldown
            if (alert.lastTriggered && (currentTime - alert.lastTriggered) < alert.cooldown) {
                return;
            }
            
            // Check max triggers
            if (alert.maxTriggers > 0 && alert.triggerCount >= alert.maxTriggers) {
                alert.status = 'cancelled';
                return;
            }
            
            let shouldTrigger = false;
            let currentValue = null;
            
            switch (alert.type) {
                case 'price_above':
                case 'price_below':
                    const stockData = await getStockData([alert.symbol]);
                    if (stockData[alert.symbol]) {
                        currentValue = stockData[alert.symbol].price;
                        shouldTrigger = this.evaluateCondition(currentValue, alert.condition, alert.value);
                    }
                    break;
                    
                case 'volume_spike':
                    const chartData = await getChartData(alert.symbol);
                    if (chartData.volumes && chartData.volumes.length > 0) {
                        const recentVolume = chartData.volumes[chartData.volumes.length - 1];
                        const avgVolume = chartData.volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
                        currentValue = recentVolume / avgVolume;
                        shouldTrigger = currentValue >= alert.value;
                    }
                    break;
                    
                case 'technical_signal':
                    const indicators = await this.getTechnicalSignals(alert.symbol);
                    if (indicators) {
                        currentValue = indicators[alert.condition];
                        shouldTrigger = this.evaluateTechnicalCondition(indicators, alert.condition, alert.value);
                    }
                    break;
                    
                case 'news_alert':
                    const news = await this.checkNewsForSymbol(alert.symbol);
                    shouldTrigger = news.length > 0;
                    break;
            }
            
            if (shouldTrigger) {
                await this.triggerAlert(alert, currentValue);
            }
            
        } catch (error) {
            console.error(`Error checking alert ${alert.id}:`, error);
        }
    }
    
    evaluateCondition(currentValue, condition, targetValue) {
        switch (condition) {
            case '>': return currentValue > targetValue;
            case '<': return currentValue < targetValue;
            case '>=': return currentValue >= targetValue;
            case '<=': return currentValue <= targetValue;
            case '=': return Math.abs(currentValue - targetValue) < 0.01;
            default: return false;
        }
    }
    
    evaluateTechnicalCondition(indicators, condition, value) {
        switch (condition) {
            case 'rsi_oversold':
                return indicators.rsi < 30;
            case 'rsi_overbought':
                return indicators.rsi > 70;
            case 'macd_bullish':
                return indicators.macd === 'AL';
            case 'macd_bearish':
                return indicators.macd === 'SAT';
            case 'bollinger_upper':
                return indicators.bollinger && indicators.bollinger.upper;
            case 'bollinger_lower':
                return indicators.bollinger && indicators.bollinger.lower;
            default:
                return false;
        }
    }
    
    async getTechnicalSignals(symbol) {
        try {
            const chartData = await getChartData(symbol);
            const stockData = await getStockData([symbol]);
            
            if (chartData.prices && stockData[symbol]) {
                return calculateTechnicalIndicators(chartData.prices, stockData[symbol].price);
            }
            return null;
        } catch (error) {
            console.error('Error getting technical signals:', error);
            return null;
        }
    }
    
    async checkNewsForSymbol(symbol) {
        try {
            const response = await fetch(`https://newsapi.org/v2/everything?q=${symbol}&language=en&sortBy=publishedAt&apiKey=b0a2d52241144b6f95d8e1642a1b1f9a`);
            if (response.ok) {
                const data = await response.json();
                return data.articles || [];
            }
            return [];
        } catch (error) {
            console.error('Error checking news:', error);
            return [];
        }
    }
    
    async triggerAlert(alert, currentValue) {
        alert.status = 'triggered';
        alert.triggeredAt = new Date().toISOString();
        alert.triggerCount++;
        alert.lastTriggered = Date.now();
        
        // Create notification
        const notification = {
            id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: alert.userId,
            alertId: alert.id,
            symbol: alert.symbol,
            type: alert.type,
            message: alert.message || this.generateAlertMessage(alert, currentValue),
            currentValue: currentValue,
            targetValue: alert.value,
            timestamp: new Date().toISOString(),
            read: false
        };
        
        this.notificationQueue.push(notification);
        
        // Broadcast to WebSocket clients
        this.broadcastNotification(notification);
        
        console.log(`🔔 Alert triggered: ${alert.symbol} - ${alert.type}`);
    }
    
    generateAlertMessage(alert, currentValue) {
        const symbol = alert.symbol;
        const type = alert.type;
        const value = currentValue;
        const target = alert.value;
        
        switch (type) {
            case 'price_above':
                return `${symbol} fiyatı ${value} TL'ye yükseldi (Hedef: ${target} TL)`;
            case 'price_below':
                return `${symbol} fiyatı ${value} TL'ye düştü (Hedef: ${target} TL)`;
            case 'volume_spike':
                return `${symbol} hacim patlaması! ${value.toFixed(1)}x normal hacim`;
            case 'technical_signal':
                return `${symbol} teknik sinyal: ${alert.condition}`;
            case 'news_alert':
                return `${symbol} için yeni haberler var!`;
            default:
                return `${symbol} için bildirim tetiklendi`;
        }
    }
    
    broadcastNotification(notification) {
        const message = {
            type: 'alert',
            data: notification
        };
        
        // Broadcast to all connected WebSocket clients
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    }
    
    getUserAlerts(userId) {
        return Array.from(this.alerts.values()).filter(alert => alert.userId === userId);
    }
    
    getUserNotifications(userId, limit = 50) {
        return this.notificationQueue
            .filter(notif => notif.userId === userId)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
    }
    
    markNotificationAsRead(notificationId) {
        const notification = this.notificationQueue.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
        }
    }
    
    deleteAlert(alertId) {
        this.alerts.delete(alertId);
    }
    
    pauseAlert(alertId) {
        const alert = this.alerts.get(alertId);
        if (alert) {
            alert.status = 'paused';
        }
    }
    
    resumeAlert(alertId) {
        const alert = this.alerts.get(alertId);
        if (alert) {
            alert.status = 'active';
        }
    }
    
    stopAlertChecking() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
}

// Social Trading System
class SocialTradingManager {
    constructor() {
        this.traders = new Map();
        this.followers = new Map();
        this.trades = new Map();
        this.performance = new Map();
        this.socialFeed = [];
        this.leaderboard = [];
    }
    
    // Trader Management
    createTrader(userId, username, bio = '') {
        const trader = {
            id: userId,
            username: username,
            bio: bio,
            joinDate: new Date().toISOString(),
            isPublic: true,
            verified: false,
            totalFollowers: 0,
            totalTrades: 0,
            winRate: 0,
            totalReturn: 0,
            maxDrawdown: 0,
            sharpeRatio: 0,
            riskScore: 0
        };
        
        this.traders.set(userId, trader);
        this.followers.set(userId, new Set());
        this.trades.set(userId, []);
        this.performance.set(userId, {
            totalReturn: 0,
            winRate: 0,
            sharpeRatio: 0,
            maxDrawdown: 0,
            trades: []
        });
        
        return trader;
    }
    
    followTrader(followerId, traderId) {
        if (followerId === traderId) return false;
        
        const followers = this.followers.get(traderId);
        if (followers && !followers.has(followerId)) {
            followers.add(followerId);
            const trader = this.traders.get(traderId);
            if (trader) {
                trader.totalFollowers = followers.size;
            }
            return true;
        }
        return false;
    }
    
    unfollowTrader(followerId, traderId) {
        const followers = this.followers.get(traderId);
        if (followers && followers.has(followerId)) {
            followers.delete(followerId);
            const trader = this.traders.get(traderId);
            if (trader) {
                trader.totalFollowers = followers.size;
            }
            return true;
        }
        return false;
    }
    
    // Trade Sharing
    shareTrade(traderId, tradeData) {
        const trader = this.traders.get(traderId);
        if (!trader) return null;
        
        const trade = {
            id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            traderId: traderId,
            traderUsername: trader.username,
            symbol: tradeData.symbol,
            action: tradeData.action, // 'BUY' or 'SELL'
            quantity: tradeData.quantity,
            price: tradeData.price,
            timestamp: new Date().toISOString(),
            reason: tradeData.reason || '',
            confidence: tradeData.confidence || 0,
            likes: 0,
            comments: [],
            isPublic: true
        };
        
        // Add to trader's trades
        const traderTrades = this.trades.get(traderId) || [];
        traderTrades.push(trade);
        this.trades.set(traderId, traderTrades);
        
        // Add to social feed
        this.socialFeed.unshift(trade);
        
        // Keep only last 1000 trades in feed
        if (this.socialFeed.length > 1000) {
            this.socialFeed = this.socialFeed.slice(0, 1000);
        }
        
        // Update trader stats
        trader.totalTrades++;
        
        // Broadcast to followers
        this.broadcastTradeToFollowers(traderId, trade);
        
        return trade;
    }
    
    broadcastTradeToFollowers(traderId, trade) {
        const followers = this.followers.get(traderId);
        if (followers) {
            const message = {
                type: 'social_trade',
                data: {
                    traderId: traderId,
                    trade: trade
                }
            };
            
            // Send to all WebSocket clients (in real app, filter by followers)
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(message));
                }
            });
        }
    }
    
    // Performance Tracking
    updateTraderPerformance(traderId, tradeResult) {
        const performance = this.performance.get(traderId);
        if (!performance) return;
        
        performance.trades.push(tradeResult);
        
        // Calculate new metrics
        const totalTrades = performance.trades.length;
        const winningTrades = performance.trades.filter(t => t.pnl > 0).length;
        const totalReturn = performance.trades.reduce((sum, t) => sum + t.pnl, 0);
        
        performance.winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
        performance.totalReturn = totalReturn;
        
        // Calculate Sharpe Ratio (simplified)
        if (performance.trades.length > 1) {
            const returns = performance.trades.map(t => t.pnl);
            const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
            const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
            const stdDev = Math.sqrt(variance);
            performance.sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;
        }
        
        // Update trader object
        const trader = this.traders.get(traderId);
        if (trader) {
            trader.totalTrades = totalTrades;
            trader.winRate = performance.winRate;
            trader.totalReturn = performance.totalReturn;
            trader.sharpeRatio = performance.sharpeRatio;
        }
        
        this.updateLeaderboard();
    }
    
    updateLeaderboard() {
        this.leaderboard = Array.from(this.traders.values())
            .filter(trader => trader.isPublic)
            .sort((a, b) => b.totalReturn - a.totalReturn)
            .slice(0, 50);
    }
    
    // Social Feed
    getSocialFeed(limit = 50, offset = 0) {
        return this.socialFeed.slice(offset, offset + limit);
    }
    
    getTraderFeed(traderId, limit = 50) {
        const traderTrades = this.trades.get(traderId) || [];
        return traderTrades.slice(0, limit);
    }
    
    // Leaderboard
    getLeaderboard(limit = 20) {
        return this.leaderboard.slice(0, limit);
    }
    
    // Trader Search
    searchTraders(query, limit = 20) {
        const queryLower = query.toLowerCase();
        return Array.from(this.traders.values())
            .filter(trader => 
                trader.isPublic && 
                (trader.username.toLowerCase().includes(queryLower) ||
                 trader.bio.toLowerCase().includes(queryLower))
            )
            .slice(0, limit);
    }
    
    // Trade Interactions
    likeTrade(tradeId, userId) {
        // Find trade in social feed
        const trade = this.socialFeed.find(t => t.id === tradeId);
        if (trade) {
            trade.likes++;
            return true;
        }
        return false;
    }
    
    addTradeComment(tradeId, userId, comment) {
        const trade = this.socialFeed.find(t => t.id === tradeId);
        if (trade) {
            const commentObj = {
                id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                userId: userId,
                username: this.traders.get(userId)?.username || 'Anonim',
                comment: comment,
                timestamp: new Date().toISOString()
            };
            
            trade.comments.push(commentObj);
            return commentObj;
        }
        return null;
    }
    
    // Copy Trading
    copyTrade(copierId, originalTradeId, amount) {
        const originalTrade = this.socialFeed.find(t => t.id === originalTradeId);
        if (!originalTrade) return null;
        
        // Calculate proportional quantity
        const proportionalQuantity = Math.floor(amount / originalTrade.price);
        
        const copiedTrade = {
            id: `copy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            copierId: copierId,
            originalTradeId: originalTradeId,
            originalTraderId: originalTrade.traderId,
            symbol: originalTrade.symbol,
            action: originalTrade.action,
            quantity: proportionalQuantity,
            price: originalTrade.price,
            amount: amount,
            timestamp: new Date().toISOString(),
            status: 'copied'
        };
        
        // Add to copier's trades
        const copierTrades = this.trades.get(copierId) || [];
        copierTrades.push(copiedTrade);
        this.trades.set(copierId, copierTrades);
        
        return copiedTrade;
    }
    
    // Analytics
    getTraderAnalytics(traderId) {
        const trader = this.traders.get(traderId);
        const performance = this.performance.get(traderId);
        const trades = this.trades.get(traderId) || [];
        
        if (!trader || !performance) return null;
        
        return {
            trader: trader,
            performance: performance,
            recentTrades: trades.slice(-10),
            monthlyReturns: this.calculateMonthlyReturns(trades),
            riskMetrics: this.calculateRiskMetrics(trades)
        };
    }
    
    calculateMonthlyReturns(trades) {
        // Group trades by month and calculate returns
        const monthlyData = {};
        
        trades.forEach(trade => {
            const month = new Date(trade.timestamp).toISOString().substr(0, 7);
            if (!monthlyData[month]) {
                monthlyData[month] = { pnl: 0, trades: 0 };
            }
            monthlyData[month].pnl += trade.pnl || 0;
            monthlyData[month].trades++;
        });
        
        return monthlyData;
    }
    
    calculateRiskMetrics(trades) {
        if (trades.length < 2) return { volatility: 0, maxDrawdown: 0 };
        
        const returns = trades.map(t => t.pnl || 0);
        const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        
        // Calculate volatility
        const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
        const volatility = Math.sqrt(variance);
        
        // Calculate max drawdown
        let peak = 0;
        let maxDrawdown = 0;
        let currentReturn = 0;
        
        returns.forEach(ret => {
            currentReturn += ret;
            if (currentReturn > peak) peak = currentReturn;
            const drawdown = peak - currentReturn;
            if (drawdown > maxDrawdown) maxDrawdown = drawdown;
        });
        
        return { volatility, maxDrawdown };
    }
}

// Backtesting System
class BacktestingEngine {
    constructor() {
        this.strategies = new Map();
        this.backtests = new Map();
        this.historicalData = new Map();
        this.indicators = new Map();
    }
    
    // Strategy Management
    createStrategy(userId, name, description, rules) {
        const strategy = {
            id: `strategy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: userId,
            name: name,
            description: description,
            rules: rules,
            createdAt: new Date().toISOString(),
            isPublic: false,
            totalBacktests: 0,
            bestReturn: 0,
            averageReturn: 0,
            winRate: 0
        };
        
        this.strategies.set(strategy.id, strategy);
        return strategy;
    }
    
    // Backtesting Execution
    async runBacktest(strategyId, symbol, startDate, endDate, initialCapital = 10000, commission = 0.001) {
        const strategy = this.strategies.get(strategyId);
        if (!strategy) throw new Error('Strategy not found');
        
        const backtestId = `backtest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        try {
            // Get historical data
            const historicalData = await this.getHistoricalData(symbol, startDate, endDate);
            
            // Initialize backtest
            const backtest = {
                id: backtestId,
                strategyId: strategyId,
                symbol: symbol,
                startDate: startDate,
                endDate: endDate,
                initialCapital: initialCapital,
                commission: commission,
                status: 'running',
                createdAt: new Date().toISOString(),
                results: {
                    totalTrades: 0,
                    winningTrades: 0,
                    losingTrades: 0,
                    totalReturn: 0,
                    totalReturnPercent: 0,
                    maxDrawdown: 0,
                    sharpeRatio: 0,
                    winRate: 0,
                    profitFactor: 0,
                    averageWin: 0,
                    averageLoss: 0,
                    largestWin: 0,
                    largestLoss: 0,
                    totalCommission: 0,
                    trades: []
                },
                equity: [],
                drawdown: []
            };
            
            this.backtests.set(backtestId, backtest);
            
            // Run backtest simulation
            await this.simulateStrategy(backtest, strategy, historicalData);
            
            // Calculate final metrics
            this.calculateBacktestMetrics(backtest);
            
            // Update strategy stats
            this.updateStrategyStats(strategyId, backtest.results);
            
            return backtest;
            
        } catch (error) {
            console.error('Backtest error:', error);
            throw error;
        }
    }
    
    async getHistoricalData(symbol, startDate, endDate) {
        // Generate realistic historical data for backtesting
        const data = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        
        let currentPrice = 100; // Starting price
        
        for (let i = 0; i < days; i++) {
            const date = new Date(start.getTime() + (i * 24 * 60 * 60 * 1000));
            
            // Generate realistic price movement
            const volatility = 0.02;
            const trend = 0.0001; // Slight upward trend
            const randomChange = (Math.random() - 0.5) * volatility;
            const priceChange = trend + randomChange;
            
            const open = currentPrice;
            const close = currentPrice * (1 + priceChange);
            const high = Math.max(open, close) * (1 + Math.random() * 0.01);
            const low = Math.min(open, close) * (1 - Math.random() * 0.01);
            const volume = Math.floor(Math.random() * 1000000) + 100000;
            
            data.push({
                date: date.toISOString().split('T')[0],
                timestamp: date.getTime(),
                open: Math.round(open * 100) / 100,
                high: Math.round(high * 100) / 100,
                low: Math.round(low * 100) / 100,
                close: Math.round(close * 100) / 100,
                volume: volume
            });
            
            currentPrice = close;
        }
        
        return data;
    }
    
    async simulateStrategy(backtest, strategy, data) {
        let position = null;
        let cash = backtest.initialCapital;
        let equity = backtest.initialCapital;
        let peakEquity = backtest.initialCapital;
        
        // Calculate indicators for each data point
        const dataWithIndicators = this.calculateIndicators(data);
        
        for (let i = 20; i < dataWithIndicators.length; i++) { // Start after indicator calculation
            const currentData = dataWithIndicators[i];
            const previousData = dataWithIndicators[i - 1];
            
            // Evaluate strategy rules
            const signal = this.evaluateStrategyRules(strategy.rules, currentData, previousData, position);
            
            if (signal === 'BUY' && !position) {
                // Open long position
                const quantity = Math.floor(cash * 0.95 / currentData.close); // Use 95% of cash
                const cost = quantity * currentData.close;
                const commissionCost = cost * backtest.commission;
                
                if (cost + commissionCost <= cash) {
                    position = {
                        type: 'LONG',
                        quantity: quantity,
                        entryPrice: currentData.close,
                        entryDate: currentData.date,
                        entryTime: currentData.timestamp
                    };
                    
                    cash -= (cost + commissionCost);
                    backtest.results.totalCommission += commissionCost;
                }
            } else if (signal === 'SELL' && position) {
                // Close position
                const revenue = position.quantity * currentData.close;
                const commissionCost = revenue * backtest.commission;
                const pnl = revenue - (position.quantity * position.entryPrice) - commissionCost;
                
                const trade = {
                    id: `trade_${backtest.results.totalTrades + 1}`,
                    entryDate: position.entryDate,
                    exitDate: currentData.date,
                    entryPrice: position.entryPrice,
                    exitPrice: currentData.close,
                    quantity: position.quantity,
                    type: position.type,
                    pnl: Math.round(pnl * 100) / 100,
                    pnlPercent: Math.round((pnl / (position.quantity * position.entryPrice)) * 10000) / 100,
                    commission: commissionCost,
                    duration: currentData.timestamp - position.entryTime
                };
                
                backtest.results.trades.push(trade);
                backtest.results.totalTrades++;
                
                if (pnl > 0) {
                    backtest.results.winningTrades++;
                    backtest.results.largestWin = Math.max(backtest.results.largestWin, pnl);
                } else {
                    backtest.results.losingTrades++;
                    backtest.results.largestLoss = Math.min(backtest.results.largestLoss, pnl);
                }
                
                cash += revenue - commissionCost;
                backtest.results.totalCommission += commissionCost;
                
                position = null;
            }
            
            // Update equity
            if (position) {
                equity = cash + (position.quantity * currentData.close);
            } else {
                equity = cash;
            }
            
            // Track equity curve
            backtest.equity.push({
                date: currentData.date,
                equity: Math.round(equity * 100) / 100,
                cash: Math.round(cash * 100) / 100,
                positionValue: position ? Math.round(position.quantity * currentData.close * 100) / 100 : 0
            });
            
            // Track drawdown
            if (equity > peakEquity) {
                peakEquity = equity;
            }
            
            const currentDrawdown = (peakEquity - equity) / peakEquity;
            backtest.drawdown.push({
                date: currentData.date,
                drawdown: Math.round(currentDrawdown * 10000) / 100
            });
            
            backtest.results.maxDrawdown = Math.max(backtest.results.maxDrawdown, currentDrawdown);
        }
        
        // Close any remaining position
        if (position && dataWithIndicators.length > 0) {
            const lastData = dataWithIndicators[dataWithIndicators.length - 1];
            const revenue = position.quantity * lastData.close;
            const commissionCost = revenue * backtest.commission;
            const pnl = revenue - (position.quantity * position.entryPrice) - commissionCost;
            
            const trade = {
                id: `trade_${backtest.results.totalTrades + 1}`,
                entryDate: position.entryDate,
                exitDate: lastData.date,
                entryPrice: position.entryPrice,
                exitPrice: lastData.close,
                quantity: position.quantity,
                type: position.type,
                pnl: Math.round(pnl * 100) / 100,
                pnlPercent: Math.round((pnl / (position.quantity * position.entryPrice)) * 10000) / 100,
                commission: commissionCost,
                duration: lastData.timestamp - position.entryTime
            };
            
            backtest.results.trades.push(trade);
            backtest.results.totalTrades++;
            
            if (pnl > 0) {
                backtest.results.winningTrades++;
                backtest.results.largestWin = Math.max(backtest.results.largestWin, pnl);
            } else {
                backtest.results.losingTrades++;
                backtest.results.largestLoss = Math.min(backtest.results.largestLoss, pnl);
            }
            
            cash += revenue - commissionCost;
            backtest.results.totalCommission += commissionCost;
        }
        
        backtest.results.totalReturn = Math.round((equity - backtest.initialCapital) * 100) / 100;
        backtest.results.totalReturnPercent = Math.round((backtest.results.totalReturn / backtest.initialCapital) * 10000) / 100;
        backtest.status = 'completed';
    }
    
    calculateIndicators(data) {
        const result = [...data];
        
        // Calculate SMA
        for (let i = 19; i < result.length; i++) {
            const sma20 = result.slice(i - 19, i + 1).reduce((sum, d) => sum + d.close, 0) / 20;
            result[i].sma20 = Math.round(sma20 * 100) / 100;
        }
        
        // Calculate EMA
        const multiplier = 2 / (12 + 1);
        result[0].ema12 = result[0].close;
        for (let i = 1; i < result.length; i++) {
            result[i].ema12 = Math.round((result[i].close * multiplier + result[i - 1].ema12 * (1 - multiplier)) * 100) / 100;
        }
        
        // Calculate RSI
        for (let i = 14; i < result.length; i++) {
            const gains = [];
            const losses = [];
            
            for (let j = i - 13; j <= i; j++) {
                const change = result[j].close - result[j - 1].close;
                gains.push(change > 0 ? change : 0);
                losses.push(change < 0 ? Math.abs(change) : 0);
            }
            
            const avgGain = gains.reduce((a, b) => a + b, 0) / 14;
            const avgLoss = losses.reduce((a, b) => a + b, 0) / 14;
            
            if (avgLoss === 0) {
                result[i].rsi = 100;
            } else {
                const rs = avgGain / avgLoss;
                result[i].rsi = Math.round((100 - (100 / (1 + rs))) * 100) / 100;
            }
        }
        
        return result;
    }
    
    evaluateStrategyRules(rules, currentData, previousData, position) {
        // Simple strategy rule evaluation
        // This is a simplified example - in real implementation, you'd have a more complex rule engine
        
        let buySignals = 0;
        let sellSignals = 0;
        
        // Example rules
        if (currentData.close > currentData.sma20 && previousData.close <= previousData.sma20) {
            buySignals++;
        }
        
        if (currentData.rsi < 30) {
            buySignals++;
        }
        
        if (currentData.close < currentData.sma20 && previousData.close >= previousData.sma20) {
            sellSignals++;
        }
        
        if (currentData.rsi > 70) {
            sellSignals++;
        }
        
        if (position && currentData.close > position.entryPrice * 1.05) { // 5% profit target
            sellSignals++;
        }
        
        if (position && currentData.close < position.entryPrice * 0.95) { // 5% stop loss
            sellSignals++;
        }
        
        if (buySignals > sellSignals && !position) {
            return 'BUY';
        } else if (sellSignals > buySignals && position) {
            return 'SELL';
        }
        
        return 'HOLD';
    }
    
    calculateBacktestMetrics(backtest) {
        const results = backtest.results;
        
        if (results.totalTrades > 0) {
            results.winRate = Math.round((results.winningTrades / results.totalTrades) * 10000) / 100;
            
            if (results.winningTrades > 0) {
                const winningTrades = results.trades.filter(t => t.pnl > 0);
                results.averageWin = Math.round(winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length * 100) / 100;
            }
            
            if (results.losingTrades > 0) {
                const losingTrades = results.trades.filter(t => t.pnl < 0);
                results.averageLoss = Math.round(losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length * 100) / 100;
            }
            
            // Calculate Profit Factor
            const totalWins = results.trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
            const totalLosses = Math.abs(results.trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
            results.profitFactor = totalLosses > 0 ? Math.round((totalWins / totalLosses) * 100) / 100 : 0;
            
            // Calculate Sharpe Ratio (simplified)
            if (results.trades.length > 1) {
                const returns = results.trades.map(t => t.pnl);
                const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
                const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
                const stdDev = Math.sqrt(variance);
                results.sharpeRatio = stdDev > 0 ? Math.round((avgReturn / stdDev) * 100) / 100 : 0;
            }
        }
        
        results.maxDrawdown = Math.round(results.maxDrawdown * 10000) / 100;
    }
    
    updateStrategyStats(strategyId, results) {
        const strategy = this.strategies.get(strategyId);
        if (!strategy) return;
        
        strategy.totalBacktests++;
        
        if (results.totalReturnPercent > strategy.bestReturn) {
            strategy.bestReturn = results.totalReturnPercent;
        }
        
        // Update average return (simplified)
        strategy.averageReturn = Math.round((strategy.averageReturn * (strategy.totalBacktests - 1) + results.totalReturnPercent) / strategy.totalBacktests * 100) / 100;
        
        if (results.winRate > 0) {
            strategy.winRate = Math.round((strategy.winRate * (strategy.totalBacktests - 1) + results.winRate) / strategy.totalBacktests * 100) / 100;
        }
    }
    
    // Get backtest results
    getBacktest(backtestId) {
        return this.backtests.get(backtestId);
    }
    
    getUserBacktests(userId) {
        return Array.from(this.backtests.values()).filter(b => b.strategyId && this.strategies.get(b.strategyId)?.userId === userId);
    }
    
    getUserStrategies(userId) {
        return Array.from(this.strategies.values()).filter(s => s.userId === userId);
    }
    
    deleteStrategy(strategyId) {
        this.strategies.delete(strategyId);
    }
    
    deleteBacktest(backtestId) {
        this.backtests.delete(backtestId);
    }
}

// Initialize Backtesting Engine
const backtestingEngine = new BacktestingEngine();

// Create demo strategy
const demoStrategy = backtestingEngine.createStrategy(
    'demo_user',
    'SMA + RSI Strategy',
    'Basit SMA crossover ve RSI aşırı alım/satım sinyalleri',
    {
        entry: {
            sma_crossover: true,
            rsi_oversold: true
        },
        exit: {
            sma_crossunder: true,
            rsi_overbought: true,
            profit_target: 0.05,
            stop_loss: 0.05
        }
    }
);

// Initialize Social Trading Manager
const socialTradingManager = new SocialTradingManager();

// Create demo traders
socialTradingManager.createTrader('trader_1', 'TechTrader_Pro', 'Teknoloji hisselerinde uzman. 5 yıllık deneyim.');
socialTradingManager.createTrader('trader_2', 'CryptoKing', 'Kripto ve geleneksel piyasalarda aktif trader.');
socialTradingManager.createTrader('trader_3', 'ValueInvestor', 'Değer yatırımı ve uzun vadeli stratejiler.');
socialTradingManager.createTrader('trader_4', 'DayTrader_Mike', 'Günlük işlemler ve scalping uzmanı.');
socialTradingManager.createTrader('trader_5', 'GrowthSeeker', 'Büyüme hisseleri ve momentum stratejileri.');

// Demo trades
setTimeout(() => {
    socialTradingManager.shareTrade('trader_1', {
        symbol: 'AAPL',
        action: 'BUY',
        quantity: 100,
        price: 175.50,
        reason: 'Strong Q4 earnings expected',
        confidence: 85
    });
    
    socialTradingManager.shareTrade('trader_2', {
        symbol: 'TSLA',
        action: 'BUY',
        quantity: 50,
        price: 250.00,
        reason: 'EV market growth potential',
        confidence: 90
    });
    
    socialTradingManager.shareTrade('trader_3', {
        symbol: 'BRK.B',
        action: 'BUY',
        quantity: 200,
        price: 340.25,
        reason: 'Long-term value play',
        confidence: 95
    });
}, 5000);

// Initialize Alert Manager
const alertManager = new AlertManager();

// Initialize Portfolio Manager
const portfolioManager = new PortfolioManager();

// Initialize AI Predictor
const aiPredictor = new AIStockPredictor();

// Portfolio API Endpoints
app.post('/api/portfolio/create', async (req, res) => {
    try {
        const { userId, name, initialCapital } = req.body;
        
        if (!userId || !name || !initialCapital) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const portfolio = portfolioManager.createPortfolio(userId, name, initialCapital);
        res.json(portfolio);
        
    } catch (error) {
        console.error('Portfolio creation error:', error);
        res.status(500).json({ error: 'Failed to create portfolio' });
    }
});

app.get('/api/portfolio/:portfolioId', async (req, res) => {
    try {
        const { portfolioId } = req.params;
        const portfolio = portfolioManager.getPortfolio(portfolioId);
        
        if (!portfolio) {
            return res.status(404).json({ error: 'Portfolio not found' });
        }
        
        // Update current prices for positions
        if (portfolio.positions.length > 0) {
            const symbols = portfolio.positions.map(p => p.symbol);
            const stockData = await getStockData(symbols);
            
            portfolio.positions.forEach(position => {
                if (stockData[position.symbol]) {
                    position.currentPrice = stockData[position.symbol].price;
                }
            });
            
            portfolioManager.updatePortfolioPerformance(portfolioId);
        }
        
        res.json(portfolio);
        
    } catch (error) {
        console.error('Portfolio fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch portfolio' });
    }
});

app.get('/api/portfolios/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const portfolios = portfolioManager.getAllPortfolios(userId);
        res.json(portfolios);
        
    } catch (error) {
        console.error('Portfolios fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch portfolios' });
    }
});

app.post('/api/portfolio/:portfolioId/buy', async (req, res) => {
    try {
        const { portfolioId } = req.params;
        const { symbol, quantity, price, commission } = req.body;
        
        if (!symbol || !quantity || !price) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Get current stock price if not provided
        const currentPrice = price || (await getStockData([symbol]))[symbol]?.price;
        if (!currentPrice) {
            return res.status(404).json({ error: 'Stock not found or price unavailable' });
        }
        
        const portfolio = portfolioManager.addPosition(
            portfolioId, 
            symbol, 
            quantity, 
            currentPrice, 
            commission || 0
        );
        
        res.json(portfolio);
        
    } catch (error) {
        console.error('Portfolio buy error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/portfolio/:portfolioId/sell', async (req, res) => {
    try {
        const { portfolioId } = req.params;
        const { symbol, quantity, price, commission } = req.body;
        
        if (!symbol || !quantity || !price) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Get current stock price if not provided
        const currentPrice = price || (await getStockData([symbol]))[symbol]?.price;
        if (!currentPrice) {
            return res.status(404).json({ error: 'Stock not found or price unavailable' });
        }
        
        const portfolio = portfolioManager.removePosition(
            portfolioId, 
            symbol, 
            quantity, 
            currentPrice, 
            commission || 0
        );
        
        res.json(portfolio);
        
    } catch (error) {
        console.error('Portfolio sell error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/portfolio/:portfolioId/risk', async (req, res) => {
    try {
        const { portfolioId } = req.params;
        const riskMetrics = portfolioManager.getPortfolioRiskMetrics(portfolioId);
        
        if (!riskMetrics) {
            return res.status(404).json({ error: 'Risk metrics not found' });
        }
        
        res.json(riskMetrics);
        
    } catch (error) {
        console.error('Risk metrics error:', error);
        res.status(500).json({ error: 'Failed to fetch risk metrics' });
    }
});

// Alert API Endpoints
app.post('/api/alert/create', async (req, res) => {
    try {
        const { userId, symbol, type, condition, value, message } = req.body;
        
        if (!userId || !symbol || !type || !condition || value === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const alert = alertManager.createAlert(userId, symbol, type, condition, value, message);
        res.json(alert);
        
    } catch (error) {
        console.error('Alert creation error:', error);
        res.status(500).json({ error: 'Failed to create alert' });
    }
});

app.get('/api/alerts/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const alerts = alertManager.getUserAlerts(userId);
        res.json(alerts);
        
    } catch (error) {
        console.error('Alerts fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
});

app.get('/api/notifications/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        const notifications = alertManager.getUserNotifications(userId, limit);
        res.json(notifications);
        
    } catch (error) {
        console.error('Notifications fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

app.put('/api/alert/:alertId/pause', async (req, res) => {
    try {
        const { alertId } = req.params;
        alertManager.pauseAlert(alertId);
        res.json({ success: true });
        
    } catch (error) {
        console.error('Alert pause error:', error);
        res.status(500).json({ error: 'Failed to pause alert' });
    }
});

app.put('/api/alert/:alertId/resume', async (req, res) => {
    try {
        const { alertId } = req.params;
        alertManager.resumeAlert(alertId);
        res.json({ success: true });
        
    } catch (error) {
        console.error('Alert resume error:', error);
        res.status(500).json({ error: 'Failed to resume alert' });
    }
});

app.delete('/api/alert/:alertId', async (req, res) => {
    try {
        const { alertId } = req.params;
        alertManager.deleteAlert(alertId);
        res.json({ success: true });
        
    } catch (error) {
        console.error('Alert deletion error:', error);
        res.status(500).json({ error: 'Failed to delete alert' });
    }
});

app.put('/api/notification/:notificationId/read', async (req, res) => {
    try {
        const { notificationId } = req.params;
        alertManager.markNotificationAsRead(notificationId);
        res.json({ success: true });
        
    } catch (error) {
        console.error('Notification mark read error:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});

// Social Trading API Endpoints
app.post('/api/social/trader/create', async (req, res) => {
    try {
        const { userId, username, bio } = req.body;
        
        if (!userId || !username) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const trader = socialTradingManager.createTrader(userId, username, bio);
        res.json(trader);
        
    } catch (error) {
        console.error('Trader creation error:', error);
        res.status(500).json({ error: 'Failed to create trader' });
    }
});

app.post('/api/social/trader/follow', async (req, res) => {
    try {
        const { followerId, traderId } = req.body;
        
        const success = socialTradingManager.followTrader(followerId, traderId);
        if (success) {
            res.json({ success: true, message: 'Trader followed successfully' });
        } else {
            res.status(400).json({ error: 'Failed to follow trader' });
        }
        
    } catch (error) {
        console.error('Follow trader error:', error);
        res.status(500).json({ error: 'Failed to follow trader' });
    }
});

app.post('/api/social/trader/unfollow', async (req, res) => {
    try {
        const { followerId, traderId } = req.body;
        
        const success = socialTradingManager.unfollowTrader(followerId, traderId);
        if (success) {
            res.json({ success: true, message: 'Trader unfollowed successfully' });
        } else {
            res.status(400).json({ error: 'Failed to unfollow trader' });
        }
        
    } catch (error) {
        console.error('Unfollow trader error:', error);
        res.status(500).json({ error: 'Failed to unfollow trader' });
    }
});

app.post('/api/social/trade/share', async (req, res) => {
    try {
        const { traderId, tradeData } = req.body;
        
        const trade = socialTradingManager.shareTrade(traderId, tradeData);
        if (trade) {
            res.json(trade);
        } else {
            res.status(400).json({ error: 'Failed to share trade' });
        }
        
    } catch (error) {
        console.error('Share trade error:', error);
        res.status(500).json({ error: 'Failed to share trade' });
    }
});

app.get('/api/social/feed', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        
        const feed = socialTradingManager.getSocialFeed(limit, offset);
        res.json(feed);
        
    } catch (error) {
        console.error('Social feed error:', error);
        res.status(500).json({ error: 'Failed to fetch social feed' });
    }
});

app.get('/api/social/trader/:traderId/feed', async (req, res) => {
    try {
        const { traderId } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        
        const feed = socialTradingManager.getTraderFeed(traderId, limit);
        res.json(feed);
        
    } catch (error) {
        console.error('Trader feed error:', error);
        res.status(500).json({ error: 'Failed to fetch trader feed' });
    }
});

app.get('/api/social/leaderboard', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        
        const leaderboard = socialTradingManager.getLeaderboard(limit);
        res.json(leaderboard);
        
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

app.get('/api/social/traders/search', async (req, res) => {
    try {
        const { q } = req.query;
        const limit = parseInt(req.query.limit) || 20;
        
        if (!q) {
            return res.status(400).json({ error: 'Search query required' });
        }
        
        const traders = socialTradingManager.searchTraders(q, limit);
        res.json(traders);
        
    } catch (error) {
        console.error('Trader search error:', error);
        res.status(500).json({ error: 'Failed to search traders' });
    }
});

app.get('/api/social/trader/:traderId/analytics', async (req, res) => {
    try {
        const { traderId } = req.params;
        
        const analytics = socialTradingManager.getTraderAnalytics(traderId);
        if (analytics) {
            res.json(analytics);
        } else {
            res.status(404).json({ error: 'Trader not found' });
        }
        
    } catch (error) {
        console.error('Trader analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch trader analytics' });
    }
});

app.post('/api/social/trade/:tradeId/like', async (req, res) => {
    try {
        const { tradeId } = req.params;
        const { userId } = req.body;
        
        const success = socialTradingManager.likeTrade(tradeId, userId);
        if (success) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Trade not found' });
        }
        
    } catch (error) {
        console.error('Like trade error:', error);
        res.status(500).json({ error: 'Failed to like trade' });
    }
});

app.post('/api/social/trade/:tradeId/comment', async (req, res) => {
    try {
        const { tradeId } = req.params;
        const { userId, comment } = req.body;
        
        const commentObj = socialTradingManager.addTradeComment(tradeId, userId, comment);
        if (commentObj) {
            res.json(commentObj);
        } else {
            res.status(404).json({ error: 'Trade not found' });
        }
        
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ error: 'Failed to add comment' });
    }
});

app.post('/api/social/trade/:tradeId/copy', async (req, res) => {
    try {
        const { tradeId } = req.params;
        const { copierId, amount } = req.body;
        
        const copiedTrade = socialTradingManager.copyTrade(copierId, tradeId, amount);
        if (copiedTrade) {
            res.json(copiedTrade);
        } else {
            res.status(404).json({ error: 'Trade not found' });
        }
        
    } catch (error) {
        console.error('Copy trade error:', error);
        res.status(500).json({ error: 'Failed to copy trade' });
    }
});

// Backtesting API Endpoints
app.post('/api/backtest/strategy/create', async (req, res) => {
    try {
        const { userId, name, description, rules } = req.body;
        
        if (!userId || !name || !rules) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const strategy = backtestingEngine.createStrategy(userId, name, description, rules);
        res.json(strategy);
        
    } catch (error) {
        console.error('Strategy creation error:', error);
        res.status(500).json({ error: 'Failed to create strategy' });
    }
});

app.post('/api/backtest/run', async (req, res) => {
    try {
        const { strategyId, symbol, startDate, endDate, initialCapital, commission } = req.body;
        
        if (!strategyId || !symbol || !startDate || !endDate) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const backtest = await backtestingEngine.runBacktest(
            strategyId, 
            symbol, 
            startDate, 
            endDate, 
            initialCapital || 10000, 
            commission || 0.001
        );
        
        res.json(backtest);
        
    } catch (error) {
        console.error('Backtest execution error:', error);
        res.status(500).json({ error: 'Failed to run backtest' });
    }
});

app.get('/api/backtest/:backtestId', async (req, res) => {
    try {
        const { backtestId } = req.params;
        
        const backtest = backtestingEngine.getBacktest(backtestId);
        if (backtest) {
            res.json(backtest);
        } else {
            res.status(404).json({ error: 'Backtest not found' });
        }
        
    } catch (error) {
        console.error('Backtest fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch backtest' });
    }
});

app.get('/api/backtest/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const backtests = backtestingEngine.getUserBacktests(userId);
        res.json(backtests);
        
    } catch (error) {
        console.error('User backtests fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch user backtests' });
    }
});

app.get('/api/backtest/strategies/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const strategies = backtestingEngine.getUserStrategies(userId);
        res.json(strategies);
        
    } catch (error) {
        console.error('User strategies fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch user strategies' });
    }
});

app.delete('/api/backtest/strategy/:strategyId', async (req, res) => {
    try {
        const { strategyId } = req.params;
        
        backtestingEngine.deleteStrategy(strategyId);
        res.json({ success: true });
        
    } catch (error) {
        console.error('Strategy deletion error:', error);
        res.status(500).json({ error: 'Failed to delete strategy' });
    }
});

app.delete('/api/backtest/:backtestId', async (req, res) => {
    try {
        const { backtestId } = req.params;
        
        backtestingEngine.deleteBacktest(backtestId);
        res.json({ success: true });
        
    } catch (error) {
        console.error('Backtest deletion error:', error);
        res.status(500).json({ error: 'Failed to delete backtest' });
    }
});

// Advanced Chart Data endpoint
app.get('/api/chart/:symbol', async (req, res) => {
    try {
        const symbol = req.params.symbol;
        const timeframe = req.query.timeframe || '1D';
        
        console.log(`📊 Advanced chart data requested for ${symbol} (${timeframe})`);
        
        // Get chart data based on timeframe
        const chartData = await getAdvancedChartData(symbol, timeframe);
        
        res.json(chartData);
        
    } catch (error) {
        console.error('Advanced chart endpoint error:', error);
        res.status(500).json({ error: 'Failed to fetch chart data' });
    }
});

async function getAdvancedChartData(symbol, timeframe) {
    try {
        // Map timeframe to data points
        const timeframeMap = {
            '1D': 24 * 4, // 1 day = 96 data points (15-min intervals)
            '1W': 24 * 7 * 4, // 1 week
            '1M': 24 * 30 * 4, // 1 month
            '3M': 24 * 90 * 4, // 3 months
            '1Y': 24 * 365 * 4, // 1 year
            'ALL': 24 * 365 * 5 * 4 // 5 years
        };
        
        const dataPoints = timeframeMap[timeframe] || timeframeMap['1D'];
        
        // Generate realistic OHLC data
        const data = [];
        const basePrice = await getBasePrice(symbol);
        let currentPrice = basePrice;
        
        for (let i = 0; i < dataPoints; i++) {
            // Generate realistic price movement
            const volatility = 0.02; // 2% volatility
            const change = (Math.random() - 0.5) * volatility * currentPrice;
            const newPrice = currentPrice + change;
            
            // Generate OHLC from price
            const open = currentPrice;
            const close = newPrice;
            const high = Math.max(open, close) * (1 + Math.random() * 0.01);
            const low = Math.min(open, close) * (1 - Math.random() * 0.01);
            
            // Generate volume
            const volume = Math.floor(Math.random() * 1000000) + 100000;
            
            data.push({
                timestamp: Date.now() - (dataPoints - i) * 15 * 60 * 1000, // 15-min intervals
                open: Math.round(open * 100) / 100,
                high: Math.round(high * 100) / 100,
                low: Math.round(low * 100) / 100,
                close: Math.round(close * 100) / 100,
                volume: volume
            });
            
            currentPrice = close;
        }
        
        return {
            symbol: symbol,
            timeframe: timeframe,
            prices: data.map(d => ({
                timestamp: d.timestamp,
                open: d.open,
                high: d.high,
                low: d.low,
                close: d.close,
                price: d.close // For compatibility
            })),
            volumes: data.map(d => d.volume),
            metadata: {
                totalPoints: data.length,
                startTime: data[0]?.timestamp,
                endTime: data[data.length - 1]?.timestamp,
                priceRange: {
                    min: Math.min(...data.map(d => d.low)),
                    max: Math.max(...data.map(d => d.high))
                }
            }
        };
        
    } catch (error) {
        console.error('Error generating advanced chart data:', error);
        throw error;
    }
}

async function getBasePrice(symbol) {
    try {
        const stockData = await getStockData([symbol]);
        return stockData[symbol]?.price || 100; // Default price if not found
    } catch (error) {
        console.error('Error getting base price:', error);
        return 100;
    }
}

// AI Prediction endpoint
app.get('/api/prediction/:symbol', async (req, res) => {
    try {
        const symbol = req.params.symbol;
        
        // Get current stock data
        const stockData = await getStockData([symbol]);
        if (!stockData[symbol]) {
            return res.status(404).json({ error: 'Stock not found' });
        }
        
        // Get technical indicators
        const chartData = await getChartData(symbol);
        const indicators = calculateTechnicalIndicators(chartData.prices, stockData[symbol].price);
        
        // Generate AI prediction
        const prediction = aiPredictor.predictPrice(stockData[symbol], indicators);
        
        res.json(prediction);
        
    } catch (error) {
        console.error('AI Prediction endpoint error:', error);
        res.status(500).json({ error: 'Failed to generate prediction' });
    }
});

startServer();
