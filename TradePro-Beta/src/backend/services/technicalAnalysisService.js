const logger = require('../utils/logger');

class TechnicalAnalysisService {
  constructor() {
    this.indicators = {
      sma: this.calculateSMA,
      ema: this.calculateEMA,
      rsi: this.calculateRSI,
      macd: this.calculateMACD,
      bollinger: this.calculateBollingerBands,
      atr: this.calculateATR,
      williams: this.calculateWilliamsR,
      stochastic: this.calculateStochastic,
      cci: this.calculateCCI,
      obv: this.calculateOBV
    };
  }

  // Simple Moving Average
  calculateSMA(prices, period = 20) {
    if (prices.length < period) return null;
    
    const recentPrices = prices.slice(-period);
    const sum = recentPrices.reduce((acc, price) => acc + price, 0);
    return sum / period;
  }

  // Exponential Moving Average
  calculateEMA(prices, period = 20) {
    if (prices.length < period) return null;
    
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }

  // Relative Strength Index
  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return null;
    
    const gains = [];
    const losses = [];
    
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    const avgGain = gains.slice(-period).reduce((sum, gain) => sum + gain, 0) / period;
    const avgLoss = losses.slice(-period).reduce((sum, loss) => sum + loss, 0) / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  // MACD (Moving Average Convergence Divergence)
  calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (prices.length < slowPeriod) return null;
    
    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);
    
    if (!fastEMA || !slowEMA) return null;
    
    const macdLine = fastEMA - slowEMA;
    
    // Signal line için MACD değerlerini hesapla
    const macdValues = [];
    for (let i = slowPeriod; i < prices.length; i++) {
      const fastEMA_i = this.calculateEMA(prices.slice(0, i + 1), fastPeriod);
      const slowEMA_i = this.calculateEMA(prices.slice(0, i + 1), slowPeriod);
      if (fastEMA_i && slowEMA_i) {
        macdValues.push(fastEMA_i - slowEMA_i);
      }
    }
    
    const signalLine = this.calculateEMA(macdValues, signalPeriod);
    const histogram = macdLine - (signalLine || 0);
    
    return {
      macd: macdLine,
      signal: signalLine,
      histogram: histogram
    };
  }

  // Bollinger Bands
  calculateBollingerBands(prices, period = 20, stdDev = 2) {
    if (prices.length < period) return null;
    
    const sma = this.calculateSMA(prices, period);
    if (!sma) return null;
    
    const recentPrices = prices.slice(-period);
    const variance = recentPrices.reduce((sum, price) => {
      return sum + Math.pow(price - sma, 2);
    }, 0) / period;
    
    const standardDeviation = Math.sqrt(variance);
    
    return {
      upper: sma + (stdDev * standardDeviation),
      middle: sma,
      lower: sma - (stdDev * standardDeviation),
      bandwidth: (stdDev * standardDeviation * 2) / sma * 100
    };
  }

  // Average True Range
  calculateATR(highPrices, lowPrices, closePrices, period = 14) {
    if (highPrices.length < period + 1) return null;
    
    const trueRanges = [];
    
    for (let i = 1; i < highPrices.length; i++) {
      const tr = Math.max(
        highPrices[i] - lowPrices[i],
        Math.abs(highPrices[i] - closePrices[i - 1]),
        Math.abs(lowPrices[i] - closePrices[i - 1])
      );
      trueRanges.push(tr);
    }
    
    const recentTRs = trueRanges.slice(-period);
    return recentTRs.reduce((sum, tr) => sum + tr, 0) / period;
  }

  // Williams %R
  calculateWilliamsR(highPrices, lowPrices, closePrices, period = 14) {
    if (highPrices.length < period) return null;
    
    const recentHighs = highPrices.slice(-period);
    const recentLows = lowPrices.slice(-period);
    const currentClose = closePrices[closePrices.length - 1];
    
    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);
    
    return ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
  }

  // Stochastic Oscillator
  calculateStochastic(highPrices, lowPrices, closePrices, kPeriod = 14, dPeriod = 3) {
    if (highPrices.length < kPeriod) return null;
    
    const recentHighs = highPrices.slice(-kPeriod);
    const recentLows = lowPrices.slice(-kPeriod);
    const currentClose = closePrices[closePrices.length - 1];
    
    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);
    
    const kPercent = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    
    // %D için son 3 %K değerinin ortalaması
    const kValues = [];
    for (let i = kPeriod; i <= highPrices.length; i++) {
      const periodHighs = highPrices.slice(i - kPeriod, i);
      const periodLows = lowPrices.slice(i - kPeriod, i);
      const periodClose = closePrices[i - 1];
      
      const periodHighest = Math.max(...periodHighs);
      const periodLowest = Math.min(...periodLows);
      
      const kValue = ((periodClose - periodLowest) / (periodHighest - periodLowest)) * 100;
      kValues.push(kValue);
    }
    
    const dPercent = kValues.slice(-dPeriod).reduce((sum, k) => sum + k, 0) / dPeriod;
    
    return {
      k: kPercent,
      d: dPercent
    };
  }

  // Commodity Channel Index
  calculateCCI(highPrices, lowPrices, closePrices, period = 20) {
    if (highPrices.length < period) return null;
    
    const typicalPrices = [];
    for (let i = 0; i < highPrices.length; i++) {
      typicalPrices.push((highPrices[i] + lowPrices[i] + closePrices[i]) / 3);
    }
    
    const recentTPs = typicalPrices.slice(-period);
    const smaTP = recentTPs.reduce((sum, tp) => sum + tp, 0) / period;
    
    const meanDeviation = recentTPs.reduce((sum, tp) => {
      return sum + Math.abs(tp - smaTP);
    }, 0) / period;
    
    const currentTP = typicalPrices[typicalPrices.length - 1];
    
    return (currentTP - smaTP) / (0.015 * meanDeviation);
  }

  // On-Balance Volume
  calculateOBV(closePrices, volumes) {
    if (closePrices.length !== volumes.length || closePrices.length < 2) return null;
    
    let obv = volumes[0];
    
    for (let i = 1; i < closePrices.length; i++) {
      if (closePrices[i] > closePrices[i - 1]) {
        obv += volumes[i];
      } else if (closePrices[i] < closePrices[i - 1]) {
        obv -= volumes[i];
      }
      // Eğer fiyat aynıysa OBV değişmez
    }
    
    return obv;
  }

  // Tüm göstergeleri hesapla
  calculateAllIndicators(priceData) {
    try {
      const { prices, highs, lows, closes, volumes } = priceData;
      
      if (!prices || prices.length < 20) {
        return { error: 'Insufficient data for technical analysis' };
      }

      const indicators = {
        sma_20: this.calculateSMA(prices, 20),
        sma_50: this.calculateSMA(prices, 50),
        ema_12: this.calculateEMA(prices, 12),
        ema_26: this.calculateEMA(prices, 26),
        rsi: this.calculateRSI(prices, 14),
        macd: this.calculateMACD(prices),
        bollinger: this.calculateBollingerBands(prices),
        atr: highs && lows && closes ? this.calculateATR(highs, lows, closes) : null,
        williams: highs && lows && closes ? this.calculateWilliamsR(highs, lows, closes) : null,
        stochastic: highs && lows && closes ? this.calculateStochastic(highs, lows, closes) : null,
        cci: highs && lows && closes ? this.calculateCCI(highs, lows, closes) : null,
        obv: closes && volumes ? this.calculateOBV(closes, volumes) : null
      };

      // Trading sinyalleri
      const signals = this.generateTradingSignals(indicators, prices[prices.length - 1]);
      
      return {
        indicators,
        signals,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Technical analysis error:', error);
      return { error: 'Technical analysis failed' };
    }
  }

  // Trading sinyalleri oluştur
  generateTradingSignals(indicators, currentPrice) {
    const signals = {
      trend: 'NEUTRAL',
      strength: 'MEDIUM',
      recommendation: 'HOLD',
      confidence: 0
    };

    let bullishSignals = 0;
    let bearishSignals = 0;
    let totalSignals = 0;

    // RSI sinyalleri
    if (indicators.rsi) {
      totalSignals++;
      if (indicators.rsi < 30) {
        bullishSignals++;
      } else if (indicators.rsi > 70) {
        bearishSignals++;
      }
    }

    // MACD sinyalleri
    if (indicators.macd && indicators.macd.macd && indicators.macd.signal) {
      totalSignals++;
      if (indicators.macd.macd > indicators.macd.signal) {
        bullishSignals++;
      } else {
        bearishSignals++;
      }
    }

    // Bollinger Bands sinyalleri
    if (indicators.bollinger) {
      totalSignals++;
      if (currentPrice < indicators.bollinger.lower) {
        bullishSignals++; // Oversold
      } else if (currentPrice > indicators.bollinger.upper) {
        bearishSignals++; // Overbought
      }
    }

    // SMA trend sinyalleri
    if (indicators.sma_20 && indicators.sma_50) {
      totalSignals++;
      if (indicators.sma_20 > indicators.sma_50) {
        bullishSignals++;
      } else {
        bearishSignals++;
      }
    }

    // Williams %R sinyalleri
    if (indicators.williams) {
      totalSignals++;
      if (indicators.williams < -80) {
        bullishSignals++; // Oversold
      } else if (indicators.williams > -20) {
        bearishSignals++; // Overbought
      }
    }

    // Genel trend belirleme
    const bullishRatio = totalSignals > 0 ? bullishSignals / totalSignals : 0.5;
    const bearishRatio = totalSignals > 0 ? bearishSignals / totalSignals : 0.5;

    if (bullishRatio > 0.6) {
      signals.trend = 'BULLISH';
      signals.recommendation = 'BUY';
      signals.confidence = Math.round(bullishRatio * 100);
    } else if (bearishRatio > 0.6) {
      signals.trend = 'BEARISH';
      signals.recommendation = 'SELL';
      signals.confidence = Math.round(bearishRatio * 100);
    } else {
      signals.trend = 'NEUTRAL';
      signals.recommendation = 'HOLD';
      signals.confidence = Math.round(Math.max(bullishRatio, bearishRatio) * 100);
    }

    // Trend gücü
    if (signals.confidence > 80) {
      signals.strength = 'STRONG';
    } else if (signals.confidence > 60) {
      signals.strength = 'MEDIUM';
    } else {
      signals.strength = 'WEAK';
    }

    return signals;
  }

  // Geçmiş veri analizi
  analyzeHistoricalData(historicalData, symbol) {
    try {
      const analysis = {
        symbol,
        timeframe: '1D',
        summary: {},
        trends: [],
        patterns: [],
        timestamp: new Date().toISOString()
      };

      if (!historicalData || historicalData.length < 30) {
        return { error: 'Insufficient historical data' };
      }

      // Fiyat trend analizi
      const prices = historicalData.map(d => d.close);
      const volumes = historicalData.map(d => d.volume || 0);
      
      // Volatilite analizi
      const returns = [];
      for (let i = 1; i < prices.length; i++) {
        returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
      }
      
      const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
      const volatility = Math.sqrt(returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length);
      
      analysis.summary = {
        totalReturn: ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100,
        averageReturn: avgReturn * 100,
        volatility: volatility * 100,
        maxDrawdown: this.calculateMaxDrawdown(prices),
        sharpeRatio: avgReturn / volatility,
        averageVolume: volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length
      };

      return analysis;
    } catch (error) {
      logger.error('Historical analysis error:', error);
      return { error: 'Historical analysis failed' };
    }
  }

  // Maximum Drawdown hesaplama
  calculateMaxDrawdown(prices) {
    let maxDrawdown = 0;
    let peak = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      if (prices[i] > peak) {
        peak = prices[i];
      } else {
        const drawdown = (peak - prices[i]) / peak;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
      }
    }
    
    return maxDrawdown * 100;
  }
}

// Singleton instance
const technicalAnalysisService = new TechnicalAnalysisService();

module.exports = technicalAnalysisService;

