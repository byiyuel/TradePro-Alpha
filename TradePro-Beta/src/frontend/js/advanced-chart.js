class AdvancedChart {
    constructor(canvasId, volumeCanvasId) {
        this.canvas = document.getElementById(canvasId);
        this.volumeCanvas = document.getElementById(volumeCanvasId);
        this.ctx = this.canvas.getContext('2d');
        this.volumeCtx = this.volumeCanvas.getContext('2d');
        
        // Chart configuration
        this.config = {
            currentTimeframe: '1D',
            chartType: 'candlestick',
            indicators: [],
            zoomLevel: 1,
            panOffset: 0,
            crosshair: { x: 0, y: 0, visible: false },
            priceLine: { y: 0, visible: false }
        };
        
        // Chart data
        this.data = {
            ohlc: [],
            volume: [],
            sma: [],
            ema: [],
            bollinger: { upper: [], middle: [], lower: [] },
            rsi: [],
            macd: { macd: [], signal: [], histogram: [] }
        };
        
        // Chart dimensions
        this.dimensions = {
            width: 0,
            height: 0,
            volumeHeight: 80,
            padding: { top: 20, right: 60, bottom: 40, left: 80 }
        };
        
        // Colors
        this.colors = {
            bullish: '#26a69a',
            bearish: '#ef5350',
            volume: '#546e7a',
            sma: '#ff9800',
            ema: '#2196f3',
            bollinger: '#9c27b0',
            rsi: '#ff5722',
            macd: '#4caf50',
            background: '#1e1e1e',
            grid: '#2d2d2d',
            text: '#ffffff',
            crosshair: '#00bcd4'
        };
        
        this.setupEventListeners();
        this.resize();
    }
    
    setupEventListeners() {
        // Timeframe buttons
        document.querySelectorAll('.timeframe-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.config.currentTimeframe = e.target.dataset.timeframe;
                this.loadChartData();
            });
        });
        
        // Chart type buttons
        document.querySelectorAll('.chart-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.chart-type-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.config.chartType = e.target.dataset.type;
                this.render();
            });
        });
        
        // Tool buttons
        document.getElementById('zoomInBtn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOutBtn').addEventListener('click', () => this.zoomOut());
        document.getElementById('resetZoomBtn').addEventListener('click', () => this.resetZoom());
        document.getElementById('fullscreenBtn').addEventListener('click', () => this.toggleFullscreen());
        
        // Indicator selector
        document.getElementById('addIndicatorBtn').addEventListener('click', () => this.addIndicator());
        
        // Mouse events
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseleave', () => this.hideCrosshair());
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
        
        // Resize
        window.addEventListener('resize', () => this.resize());
    }
    
    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.dimensions.width = rect.width;
        this.dimensions.height = rect.height;
        
        this.canvas.width = this.dimensions.width;
        this.canvas.height = this.dimensions.height;
        
        this.volumeCanvas.width = this.dimensions.width;
        this.volumeCanvas.height = this.dimensions.volumeHeight;
        
        this.render();
    }
    
    async loadChartData() {
        try {
            const response = await fetch(`/api/chart/${window.stockApp?.currentSymbol || 'ASELS'}?timeframe=${this.config.currentTimeframe}`);
            if (response.ok) {
                const chartData = await response.json();
                this.processChartData(chartData);
                this.render();
            }
        } catch (error) {
            console.error('Error loading chart data:', error);
        }
    }
    
    processChartData(data) {
        this.data.ohlc = data.prices || [];
        this.data.volume = data.volumes || [];
        
        // Calculate indicators
        this.calculateIndicators();
    }
    
    calculateIndicators() {
        if (this.data.ohlc.length === 0) return;
        
        const prices = this.data.ohlc.map(d => d.close || d.price);
        
        // SMA
        this.data.sma = this.calculateSMA(prices, 20);
        
        // EMA
        this.data.ema = this.calculateEMA(prices, 12);
        
        // Bollinger Bands
        this.data.bollinger = this.calculateBollingerBands(prices, 20);
        
        // RSI
        this.data.rsi = this.calculateRSI(prices);
        
        // MACD
        this.data.macd = this.calculateMACD(prices);
    }
    
    calculateSMA(prices, period) {
        const sma = [];
        for (let i = period - 1; i < prices.length; i++) {
            const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
            sma.push(sum / period);
        }
        return sma;
    }
    
    calculateEMA(prices, period) {
        const ema = [];
        const multiplier = 2 / (period + 1);
        ema[0] = prices[0];
        
        for (let i = 1; i < prices.length; i++) {
            ema[i] = (prices[i] * multiplier) + (ema[i - 1] * (1 - multiplier));
        }
        return ema;
    }
    
    calculateBollingerBands(prices, period) {
        const sma = this.calculateSMA(prices, period);
        const bands = { upper: [], middle: [], lower: [] };
        
        for (let i = period - 1; i < prices.length; i++) {
            const slice = prices.slice(i - period + 1, i + 1);
            const mean = sma[i - period + 1];
            const variance = slice.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period;
            const stdDev = Math.sqrt(variance);
            
            bands.upper.push(mean + (2 * stdDev));
            bands.middle.push(mean);
            bands.lower.push(mean - (2 * stdDev));
        }
        
        return bands;
    }
    
    calculateRSI(prices, period = 14) {
        if (prices.length < period + 1) return [];
        
        const gains = [];
        const losses = [];
        
        for (let i = 1; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? Math.abs(change) : 0);
        }
        
        const rsi = [];
        let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
        let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
        
        for (let i = period; i < gains.length; i++) {
            avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
            avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
            
            const rs = avgGain / avgLoss;
            const rsiValue = 100 - (100 / (1 + rs));
            rsi.push(rsiValue);
        }
        
        return rsi;
    }
    
    calculateMACD(prices) {
        const ema12 = this.calculateEMA(prices, 12);
        const ema26 = this.calculateEMA(prices, 26);
        
        const macd = [];
        const signal = [];
        const histogram = [];
        
        for (let i = 25; i < prices.length; i++) {
            const macdValue = ema12[i] - ema26[i];
            macd.push(macdValue);
        }
        
        // Signal line (EMA of MACD)
        const signalLine = this.calculateEMA(macd, 9);
        signal.push(...signalLine);
        
        // Histogram
        for (let i = 0; i < macd.length; i++) {
            histogram.push(macd[i] - (signal[i] || 0));
        }
        
        return { macd, signal, histogram };
    }
    
    render() {
        this.clearCanvas();
        this.drawGrid();
        this.drawChart();
        this.drawVolume();
        this.drawCrosshair();
        this.updateChartInfo();
    }
    
    clearCanvas() {
        this.ctx.fillStyle = this.colors.background;
        this.ctx.fillRect(0, 0, this.dimensions.width, this.dimensions.height);
        
        this.volumeCtx.fillStyle = this.colors.background;
        this.volumeCtx.fillRect(0, 0, this.dimensions.width, this.dimensions.volumeHeight);
    }
    
    drawGrid() {
        this.ctx.strokeStyle = this.colors.grid;
        this.ctx.lineWidth = 0.5;
        
        // Horizontal grid lines
        const gridLines = 5;
        for (let i = 0; i <= gridLines; i++) {
            const y = this.dimensions.padding.top + (i * (this.dimensions.height - this.dimensions.padding.top - this.dimensions.padding.bottom) / gridLines);
            this.ctx.beginPath();
            this.ctx.moveTo(this.dimensions.padding.left, y);
            this.ctx.lineTo(this.dimensions.width - this.dimensions.padding.right, y);
            this.ctx.stroke();
        }
        
        // Vertical grid lines
        const dataWidth = this.dimensions.width - this.dimensions.padding.left - this.dimensions.padding.right;
        const verticalLines = 10;
        for (let i = 0; i <= verticalLines; i++) {
            const x = this.dimensions.padding.left + (i * dataWidth / verticalLines);
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.dimensions.padding.top);
            this.ctx.lineTo(x, this.dimensions.height - this.dimensions.padding.bottom);
            this.ctx.stroke();
        }
    }
    
    drawChart() {
        if (this.data.ohlc.length === 0) return;
        
        switch (this.config.chartType) {
            case 'candlestick':
                this.drawCandlesticks();
                break;
            case 'line':
                this.drawLineChart();
                break;
            case 'area':
                this.drawAreaChart();
                break;
        }
        
        // Draw indicators
        this.drawIndicators();
    }
    
    drawCandlesticks() {
        const data = this.data.ohlc;
        const width = this.dimensions.width - this.dimensions.padding.left - this.dimensions.padding.right;
        const height = this.dimensions.height - this.dimensions.padding.top - this.dimensions.padding.bottom;
        
        const minPrice = Math.min(...data.map(d => Math.min(d.low || d.price, d.high || d.price, d.open || d.price, d.close || d.price)));
        const maxPrice = Math.max(...data.map(d => Math.max(d.low || d.price, d.high || d.price, d.open || d.price, d.close || d.price)));
        
        const candleWidth = width / data.length * 0.8;
        const priceRange = maxPrice - minPrice;
        
        data.forEach((candle, index) => {
            const x = this.dimensions.padding.left + (index * width / data.length) + (width / data.length - candleWidth) / 2;
            
            const open = candle.open || candle.price;
            const close = candle.close || candle.price;
            const high = candle.high || candle.price;
            const low = candle.low || candle.price;
            
            const isBullish = close >= open;
            const color = isBullish ? this.colors.bullish : this.colors.bearish;
            
            // High-Low line
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(x + candleWidth / 2, this.dimensions.padding.top + ((maxPrice - high) / priceRange) * height);
            this.ctx.lineTo(x + candleWidth / 2, this.dimensions.padding.top + ((maxPrice - low) / priceRange) * height);
            this.ctx.stroke();
            
            // Candle body
            const bodyTop = this.dimensions.padding.top + ((maxPrice - Math.max(open, close)) / priceRange) * height;
            const bodyHeight = Math.abs(close - open) / priceRange * height;
            
            if (isBullish) {
                this.ctx.fillStyle = color;
                this.ctx.fillRect(x, bodyTop, candleWidth, bodyHeight);
            } else {
                this.ctx.strokeStyle = color;
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(x, bodyTop, candleWidth, bodyHeight);
            }
        });
    }
    
    drawLineChart() {
        const data = this.data.ohlc;
        const width = this.dimensions.width - this.dimensions.padding.left - this.dimensions.padding.right;
        const height = this.dimensions.height - this.dimensions.padding.top - this.dimensions.padding.bottom;
        
        const prices = data.map(d => d.close || d.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice;
        
        this.ctx.strokeStyle = this.colors.bullish;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        
        data.forEach((point, index) => {
            const x = this.dimensions.padding.left + (index * width / data.length);
            const y = this.dimensions.padding.top + ((maxPrice - prices[index]) / priceRange) * height;
            
            if (index === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        });
        
        this.ctx.stroke();
    }
    
    drawAreaChart() {
        const data = this.data.ohlc;
        const width = this.dimensions.width - this.dimensions.padding.left - this.dimensions.padding.right;
        const height = this.dimensions.height - this.dimensions.padding.top - this.dimensions.padding.bottom;
        
        const prices = data.map(d => d.close || d.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice;
        
        // Create gradient
        const gradient = this.ctx.createLinearGradient(0, this.dimensions.padding.top, 0, this.dimensions.height - this.dimensions.padding.bottom);
        gradient.addColorStop(0, this.colors.bullish + '40');
        gradient.addColorStop(1, this.colors.bullish + '00');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        
        data.forEach((point, index) => {
            const x = this.dimensions.padding.left + (index * width / data.length);
            const y = this.dimensions.padding.top + ((maxPrice - prices[index]) / priceRange) * height;
            
            if (index === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        });
        
        // Close the area
        this.ctx.lineTo(this.dimensions.width - this.dimensions.padding.right, this.dimensions.height - this.dimensions.padding.bottom);
        this.ctx.lineTo(this.dimensions.padding.left, this.dimensions.height - this.dimensions.padding.bottom);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Draw the line
        this.ctx.strokeStyle = this.colors.bullish;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        
        data.forEach((point, index) => {
            const x = this.dimensions.padding.left + (index * width / data.length);
            const y = this.dimensions.padding.top + ((maxPrice - prices[index]) / priceRange) * height;
            
            if (index === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        });
        
        this.ctx.stroke();
    }
    
    drawVolume() {
        if (this.data.volume.length === 0) return;
        
        const data = this.data.volume;
        const width = this.dimensions.width - this.dimensions.padding.left - this.dimensions.padding.right;
        const maxVolume = Math.max(...data);
        
        const barWidth = width / data.length * 0.8;
        
        data.forEach((volume, index) => {
            const x = this.dimensions.padding.left + (index * width / data.length) + (width / data.length - barWidth) / 2;
            const barHeight = (volume / maxVolume) * this.dimensions.volumeHeight;
            
            this.volumeCtx.fillStyle = this.colors.volume;
            this.volumeCtx.fillRect(x, this.dimensions.volumeHeight - barHeight, barWidth, barHeight);
        });
    }
    
    drawIndicators() {
        this.config.indicators.forEach(indicator => {
            switch (indicator.type) {
                case 'sma':
                    this.drawSMA(indicator);
                    break;
                case 'ema':
                    this.drawEMA(indicator);
                    break;
                case 'bollinger':
                    this.drawBollingerBands(indicator);
                    break;
                case 'rsi':
                    this.drawRSI(indicator);
                    break;
            }
        });
    }
    
    drawSMA(indicator) {
        const data = this.data.sma;
        if (data.length === 0) return;
        
        const width = this.dimensions.width - this.dimensions.padding.left - this.dimensions.padding.right;
        const height = this.dimensions.height - this.dimensions.padding.top - this.dimensions.padding.bottom;
        
        const minPrice = Math.min(...this.data.ohlc.map(d => d.close || d.price));
        const maxPrice = Math.max(...this.data.ohlc.map(d => d.close || d.price));
        const priceRange = maxPrice - minPrice;
        
        this.ctx.strokeStyle = this.colors.sma;
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        
        data.forEach((value, index) => {
            const x = this.dimensions.padding.left + ((index + 19) * width / this.data.ohlc.length);
            const y = this.dimensions.padding.top + ((maxPrice - value) / priceRange) * height;
            
            if (index === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        });
        
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }
    
    drawEMA(indicator) {
        const data = this.data.ema;
        if (data.length === 0) return;
        
        const width = this.dimensions.width - this.dimensions.padding.left - this.dimensions.padding.right;
        const height = this.dimensions.height - this.dimensions.padding.top - this.dimensions.padding.bottom;
        
        const minPrice = Math.min(...this.data.ohlc.map(d => d.close || d.price));
        const maxPrice = Math.max(...this.data.ohlc.map(d => d.close || d.price));
        const priceRange = maxPrice - minPrice;
        
        this.ctx.strokeStyle = this.colors.ema;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        
        data.forEach((value, index) => {
            const x = this.dimensions.padding.left + (index * width / this.data.ohlc.length);
            const y = this.dimensions.padding.top + ((maxPrice - value) / priceRange) * height;
            
            if (index === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        });
        
        this.ctx.stroke();
    }
    
    drawBollingerBands(indicator) {
        const upper = this.data.bollinger.upper;
        const middle = this.data.bollinger.middle;
        const lower = this.data.bollinger.lower;
        
        if (upper.length === 0) return;
        
        const width = this.dimensions.width - this.dimensions.padding.left - this.dimensions.padding.right;
        const height = this.dimensions.height - this.dimensions.padding.top - this.dimensions.padding.bottom;
        
        const minPrice = Math.min(...this.data.ohlc.map(d => d.close || d.price));
        const maxPrice = Math.max(...this.data.ohlc.map(d => d.close || d.price));
        const priceRange = maxPrice - minPrice;
        
        // Draw upper band
        this.ctx.strokeStyle = this.colors.bollinger;
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([3, 3]);
        this.ctx.beginPath();
        
        upper.forEach((value, index) => {
            const x = this.dimensions.padding.left + ((index + 19) * width / this.data.ohlc.length);
            const y = this.dimensions.padding.top + ((maxPrice - value) / priceRange) * height;
            
            if (index === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        });
        
        this.ctx.stroke();
        
        // Draw lower band
        this.ctx.beginPath();
        
        lower.forEach((value, index) => {
            const x = this.dimensions.padding.left + ((index + 19) * width / this.data.ohlc.length);
            const y = this.dimensions.padding.top + ((maxPrice - value) / priceRange) * height;
            
            if (index === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        });
        
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }
    
    drawRSI(indicator) {
        // RSI would be drawn in a separate subplot
        // For now, we'll skip this implementation
    }
    
    drawCrosshair() {
        if (!this.config.crosshair.visible) return;
        
        this.ctx.strokeStyle = this.colors.crosshair;
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([2, 2]);
        
        // Vertical line
        this.ctx.beginPath();
        this.ctx.moveTo(this.config.crosshair.x, this.dimensions.padding.top);
        this.ctx.lineTo(this.config.crosshair.x, this.dimensions.height - this.dimensions.padding.bottom);
        this.ctx.stroke();
        
        // Horizontal line
        this.ctx.beginPath();
        this.ctx.moveTo(this.dimensions.padding.left, this.config.crosshair.y);
        this.ctx.lineTo(this.dimensions.width - this.dimensions.padding.right, this.config.crosshair.y);
        this.ctx.stroke();
        
        this.ctx.setLineDash([]);
    }
    
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.config.crosshair.x = e.clientX - rect.left;
        this.config.crosshair.y = e.clientY - rect.top;
        this.config.crosshair.visible = true;
        
        this.render();
    }
    
    hideCrosshair() {
        this.config.crosshair.visible = false;
        this.render();
    }
    
    handleWheel(e) {
        e.preventDefault();
        
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.config.zoomLevel *= delta;
        this.config.zoomLevel = Math.max(0.5, Math.min(5, this.config.zoomLevel));
        
        this.render();
    }
    
    zoomIn() {
        this.config.zoomLevel *= 1.2;
        this.config.zoomLevel = Math.min(5, this.config.zoomLevel);
        this.render();
    }
    
    zoomOut() {
        this.config.zoomLevel *= 0.8;
        this.config.zoomLevel = Math.max(0.5, this.config.zoomLevel);
        this.render();
    }
    
    resetZoom() {
        this.config.zoomLevel = 1;
        this.config.panOffset = 0;
        this.render();
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            this.canvas.parentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }
    
    addIndicator() {
        const selector = document.getElementById('indicatorSelector');
        const indicatorType = selector.value;
        
        if (!indicatorType) return;
        
        const indicator = {
            type: indicatorType,
            id: Date.now(),
            visible: true
        };
        
        this.config.indicators.push(indicator);
        this.render();
        this.updateLegend();
        
        // Reset selector
        selector.value = '';
    }
    
    updateLegend() {
        const legend = document.getElementById('chartLegend');
        legend.innerHTML = '';
        
        this.config.indicators.forEach(indicator => {
            const item = document.createElement('div');
            item.className = 'legend-item';
            
            const color = this.getIndicatorColor(indicator.type);
            item.innerHTML = `
                <div class="legend-color" style="background: ${color}"></div>
                <span class="legend-label">${indicator.type.toUpperCase()}</span>
            `;
            
            legend.appendChild(item);
        });
    }
    
    getIndicatorColor(type) {
        const colors = {
            sma: this.colors.sma,
            ema: this.colors.ema,
            bollinger: this.colors.bollinger,
            rsi: this.colors.rsi,
            macd: this.colors.macd
        };
        return colors[type] || '#ffffff';
    }
    
    updateChartInfo() {
        if (this.data.ohlc.length === 0) return;
        
        const latest = this.data.ohlc[this.data.ohlc.length - 1];
        const volume = this.data.volume[this.data.volume.length - 1] || 0;
        
        document.getElementById('chartOpen').textContent = this.formatPrice(latest.open || latest.price);
        document.getElementById('chartHigh').textContent = this.formatPrice(latest.high || latest.price);
        document.getElementById('chartLow').textContent = this.formatPrice(latest.low || latest.price);
        document.getElementById('chartClose').textContent = this.formatPrice(latest.close || latest.price);
        document.getElementById('chartVolume').textContent = this.formatVolume(volume);
    }
    
    formatPrice(price) {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
            minimumFractionDigits: 2
        }).format(price);
    }
    
    formatVolume(volume) {
        if (volume >= 1000000) {
            return (volume / 1000000).toFixed(1) + 'M';
        } else if (volume >= 1000) {
            return (volume / 1000).toFixed(1) + 'K';
        }
        return volume.toString();
    }
}

// Export for use in main script
window.AdvancedChart = AdvancedChart;

