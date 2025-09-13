class TradeProApp {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3000/api';
        this.wsUrl = 'ws://localhost:3000';
        this.ws = null;
        this.chart = null;
        this.currentSymbol = 'BIST:ASELS';
        this.watchlist = ['BIST:ASELS', 'AAPL', 'MSFT', 'TSLA', 'NVDA'];
        this.stockData = {};
        this.searchResults = [];
        this.isConnected = false;
        this.userId = 'demo-user'; // Demo user ID
        this.alarms = [];
        this.currentTheme = 'dark';
        this.chartType = 'line';
        this.user = null;
        this.token = null;
        this.searchCache = new Map(); // Cache for search results
        
        this.init();
    }
    
    async init() {
        this.loadTheme();
        this.setupEventListeners();
        
        // Check for existing authentication
        const isAuthenticated = await this.checkAuthentication();
        
        if (!isAuthenticated) {
            this.showAuthScreen();
            return;
        }
        
        // User is authenticated, proceed with app initialization
        this.showLoadingScreen();
        this.connectWebSocket();
        
        try {
            // Load data in parallel for faster initialization
            const [initialDataResult, alarmsResult] = await Promise.allSettled([
                this.loadInitialData(),
                this.loadAlarms()
            ]);
            
            // Load news after initial data (non-blocking)
            this.loadCompanyNews(this.currentSymbol).catch(error => {
                console.warn('News loading failed:', error);
            });
            
            this.startPeriodicUpdates();
            
            // Hide loading screen faster
            setTimeout(() => {
                this.hideLoadingScreen();
            }, 800); // Reduced from 1.5s to 0.8s
            
        } catch (error) {
            console.error('Error during initialization:', error);
            this.hideLoadingScreen();
        }
    }
    
    async checkAuthentication() {
        const token = localStorage.getItem('tradepro_token');
        const user = localStorage.getItem('tradepro_user');
        
        if (!token || !user) {
            return false;
        }
        
        try {
            // Verify token with server
            const response = await fetch(`${this.apiBaseUrl}/auth/verify`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.token = token;
                this.user = JSON.parse(user);
                this.userId = this.user.id;
                this.updateAuthUI();
                return true;
            } else {
                // Token is invalid, clear storage
                localStorage.removeItem('tradepro_token');
                localStorage.removeItem('tradepro_user');
                return false;
            }
        } catch (error) {
            console.error('Error verifying authentication:', error);
            localStorage.removeItem('tradepro_token');
            localStorage.removeItem('tradepro_user');
            return false;
        }
    }
    
    setupEventListeners() {
        // Search functionality
        const searchInput = document.querySelector('.search-input');
        const searchDropdown = document.querySelector('.search-dropdown');
        
        // Optimized real-time search
        let searchTimeout;
        let lastSearchQuery = '';
        
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            // Clear previous timeout
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
            
            // If query is empty, hide results
            if (query.length === 0) {
                this.hideSearchResults();
                lastSearchQuery = '';
                return;
            }
            
            // Don't search if it's the same query
            if (query === lastSearchQuery) {
                return;
            }
            
            // For very short queries, show message
            if (query.length <= 2) {
                this.showSearchMessage('En az 3 karakter girin');
                return;
            }
            
            // Debounce search - wait 500ms after user stops typing for API calls
            searchTimeout = setTimeout(() => {
                this.handleSearch(query);
                lastSearchQuery = query;
            }, 500);
        });
        
        // Also handle Enter key for immediate search
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = e.target.value.trim();
                if (query.length > 0) {
                    this.handleSearch(query);
                }
            }
        });
        
        searchInput.addEventListener('focus', () => {
            if (this.searchResults.length > 0) {
                this.showSearchResults();
            }
        });
        
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                this.hideSearchResults();
            }
        });
        
        // Add stock modal
        const addStockBtn = document.getElementById('addStockBtn');
        const addStockModal = document.getElementById('addStockModal');
        const closeModalBtn = document.getElementById('closeModalBtn');
        const modalSearchInput = document.getElementById('modalSearchInput');
        
        addStockBtn.addEventListener('click', () => {
            addStockModal.style.display = 'block';
            modalSearchInput.focus();
        });
        
        closeModalBtn.addEventListener('click', () => {
            addStockModal.style.display = 'none';
        });
        
        // Optimized real-time modal search
        let modalSearchTimeout;
        let lastModalSearchQuery = '';
        
        modalSearchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            // Clear previous timeout
            if (modalSearchTimeout) {
                clearTimeout(modalSearchTimeout);
            }
            
            // If query is empty, clear results
            if (query.length === 0) {
                document.getElementById('modalSearchResults').innerHTML = '';
                lastModalSearchQuery = '';
                return;
            }
            
            // Don't search if it's the same query
            if (query === lastModalSearchQuery) {
                return;
            }
            
            // For very short queries, show message
            if (query.length <= 2) {
                this.showModalSearchMessage('En az 3 karakter girin');
                return;
            }
            
            // Debounce search - wait 500ms after user stops typing for API calls
            modalSearchTimeout = setTimeout(() => {
                this.handleModalSearch(query);
                lastModalSearchQuery = query;
            }, 500);
        });
        
        modalSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = e.target.value.trim();
                if (query.length > 0) {
                    this.handleModalSearch(query);
                }
            }
        });
        
        // Timeframe selector
        document.querySelectorAll('.timeframe-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.loadChartData(this.currentSymbol, e.target.dataset.period);
            });
        });
        
        // Chart type selector
        document.querySelectorAll('.chart-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.chart-type-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.chartType = e.target.dataset.type;
                this.loadChartData(this.currentSymbol, document.querySelector('.timeframe-btn.active').dataset.period);
            });
        });
        
        // Screener toggle
        const screenerToggle = document.getElementById('screenerToggle');
        screenerToggle.addEventListener('click', () => {
            this.toggleScreenerFilters();
        });
        
        // Apply filters button
        const applyFiltersBtn = document.getElementById('applyFiltersBtn');
        applyFiltersBtn.addEventListener('click', () => {
            this.applyScreenerFilters();
        });
        
        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        themeToggle.addEventListener('click', () => {
            this.toggleTheme();
        });
        
        // Authentication Screen
        const loginTab = document.getElementById('loginTab');
        const registerTab = document.getElementById('registerTab');
        const authLoginForm = document.getElementById('authLoginForm');
        const authRegisterForm = document.getElementById('authRegisterForm');
        
        if (loginTab) loginTab.addEventListener('click', () => this.switchAuthTab('login'));
        if (registerTab) registerTab.addEventListener('click', () => this.switchAuthTab('register'));
        if (authLoginForm) authLoginForm.addEventListener('submit', (e) => this.handleAuthLogin(e));
        if (authRegisterForm) authRegisterForm.addEventListener('submit', (e) => this.handleAuthRegister(e));
        
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', () => this.logout());
        
        
        // Add alarm button
        const addAlarmBtn = document.getElementById('addAlarmBtn');
        addAlarmBtn.addEventListener('click', () => {
            this.openAlarmModal();
        });
        
        // Alarm modal
        const alarmModal = document.getElementById('addAlarmModal');
        const closeAlarmModalBtn = document.getElementById('closeAlarmModalBtn');
        const alarmSubmitBtn = document.getElementById('alarmSubmitBtn');
        
        closeAlarmModalBtn.addEventListener('click', () => {
            alarmModal.style.display = 'none';
        });
        
        alarmSubmitBtn.addEventListener('click', () => {
            this.createAlarm();
        });
    }
    
    async connectWebSocket() {
        if (!this.token) {
            console.error('Cannot connect WebSocket: No authentication token');
            return;
        }
        
        try {
            this.ws = new WebSocket(`${this.wsUrl}?token=${this.token}`);
            
            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.isConnected = true;
                this.updateConnectionStatus('Bağlandı');
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'update') {
                        this.updateStockData(data.data);
                    } else if (data.type === 'initial_data') {
                        this.stockData = data.data;
                        this.updateAllDisplays();
                        console.log('⚡ Initial data received and displayed');
                    } else if (data.type === 'error') {
                        console.error('WebSocket error:', data.message);
                        if (data.message === 'Authentication required' || data.message === 'Invalid authentication token') {
                            this.logout();
                        }
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };
            
            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                this.isConnected = false;
                this.updateConnectionStatus('Bağlantı kesildi');
                // Reconnect after 5 seconds if user is still authenticated
                if (this.token) {
                    setTimeout(() => this.connectWebSocket(), 5000);
                }
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateConnectionStatus('Bağlantı hatası');
            };
            
        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
            this.updateConnectionStatus('Bağlantı başarısız');
        }
    }
    
    async loadInitialData() {
        try {
            const headers = {};
            if (this.token) {
                headers['Authorization'] = `Bearer ${this.token}`;
            }
            
            const response = await fetch(`${this.apiBaseUrl}/stocks`, { headers });
            if (!response.ok) {
                if (response.status === 401) {
                    this.logout();
                    return;
                }
                throw new Error('Failed to fetch stock data');
            }
            
            this.stockData = await response.json();
            this.updateAllDisplays();
            await this.loadChartData(this.currentSymbol);
            await this.loadScreenerData();
            await this.loadNews();
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('Veri yüklenirken hata oluştu');
        }
    }
    
    updateAllDisplays() {
        this.updateWatchlist();
        this.updateStockDisplay();
        this.updateTechnicalAnalysis();
    }
    
    updateWatchlist() {
        const container = document.getElementById('watchlistContainer');
        container.innerHTML = '';
        
        this.watchlist.forEach(symbol => {
            const stock = this.stockData[symbol];
            if (!stock) return;
            
            const stockItem = document.createElement('div');
            stockItem.className = `stock-item ${symbol === this.currentSymbol ? 'active' : ''}`;
            stockItem.innerHTML = `
                <div class="stock-info">
                    <div class="stock-symbol">${stock.symbol}</div>
                    <div class="stock-name">${stock.name}</div>
                </div>
                <div class="stock-price">
                    <div class="price">${this.formatPrice(stock.price, stock.currency)}</div>
                    <div class="change ${stock.changePercent >= 0 ? 'positive' : 'negative'}">
                        ${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%
                    </div>
                </div>
                <button class="remove-stock-btn" onclick="app.removeFromWatchlist('${symbol}')">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            stockItem.addEventListener('click', () => {
                this.selectStock(symbol);
            });
            
            container.appendChild(stockItem);
        });
    }
    
    updateStockDisplay() {
        const stock = this.stockData[this.currentSymbol];
        if (!stock) return;
        
        document.getElementById('selectedSymbol').textContent = stock.symbol;
        document.getElementById('selectedName').textContent = stock.name;
        document.getElementById('selectedPrice').textContent = this.formatPrice(stock.price, stock.currency);
        
        const changeElement = document.getElementById('selectedChange');
        changeElement.textContent = `${stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)} (${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%)`;
        changeElement.className = `stock-change-large ${stock.changePercent >= 0 ? 'positive' : 'negative'}`;
    }
    
    updateTechnicalAnalysis() {
        const stock = this.stockData[this.currentSymbol];
        if (!stock) return;
        
        const container = document.getElementById('indicatorsContainer');
        container.innerHTML = '';
        
        const indicators = [
            { name: 'RSI', value: stock.rsi, type: 'number' },
            { name: 'MACD', value: stock.macd, type: 'signal' },
            { name: 'SMA 20', value: stock.sma20, type: 'signal' },
            { name: 'SMA 50', value: stock.sma50, type: 'signal' },
            { name: 'Bollinger', value: stock.bollinger, type: 'signal' },
            { name: 'Stochastic', value: stock.stochastic, type: 'signal' }
        ];
        
        indicators.forEach(indicator => {
            const item = document.createElement('div');
            item.className = 'indicator-item';
            
            let valueClass = 'neutral';
            let displayValue = indicator.value;
            
            if (indicator.type === 'signal') {
                if (indicator.value === 'AL') valueClass = 'buy';
                else if (indicator.value === 'SAT') valueClass = 'sell';
            } else if (indicator.type === 'number') {
                if (indicator.value > 70) valueClass = 'sell';
                else if (indicator.value < 30) valueClass = 'buy';
            }
            
            item.innerHTML = `
                <span class="indicator-name">${indicator.name}</span>
                <span class="indicator-value ${valueClass}">${displayValue}</span>
            `;
            
            container.appendChild(item);
        });
        
        // Update recommendation
        if (stock.recommendation) {
            const recommendationSection = document.getElementById('recommendationSection');
            const recommendationValue = document.getElementById('recommendationValue');
            
            recommendationSection.style.display = 'block';
            recommendationValue.textContent = stock.recommendation;
            recommendationValue.className = `recommendation-value ${stock.recommendation.toLowerCase()}`;
        }
    }
    
    async loadChartData(symbol, period = '1wk') {
        try {
            const range = this.getRangeFromPeriod(period);
            const headers = {};
            if (this.token) {
                headers['Authorization'] = `Bearer ${this.token}`;
            }
            
            const response = await fetch(`${this.apiBaseUrl}/chart/${symbol}?range=${range}`, { headers });
            
            if (!response.ok) {
                if (response.status === 401) {
                    this.logout();
                    return;
                }
                throw new Error('Failed to fetch chart data');
            }
            
            const data = await response.json();
            this.updateChart(data, period);
            
        } catch (error) {
            console.error('Error loading chart data:', error);
            this.showChartError('Grafik verisi yüklenemedi');
        }
    }
    
    getRangeFromPeriod(period) {
        const ranges = {
            '1d': '1d',
            '1wk': '5d',
            '1mo': '1mo',
            '1y': '1y'
        };
        return ranges[period] || '5d';
    }
    
    updateChart(data, period) {
        const ctx = document.getElementById('stockChart').getContext('2d');
        
        if (this.chart) {
            this.chart.destroy();
        }
        
        const labels = data.timestamps.map(timestamp => {
            const date = new Date(timestamp * 1000);
            if (period === '1d') {
                return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            } else if (period === '1wk') {
                return date.toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' });
            } else {
                return date.toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' });
            }
        });
        
        const stock = this.stockData[this.currentSymbol];
        const currency = stock?.currency || 'USD';
        
        if (this.chartType === 'candlestick') {
            this.createCandlestickChart(ctx, labels, data, currency);
        } else {
            this.createLineChart(ctx, labels, data, currency);
        }
    }
    
    createLineChart(ctx, labels, data, currency) {
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Fiyat',
                    data: data.close,
                    borderColor: '#00d4ff',
                    backgroundColor: 'rgba(0, 212, 255, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: '#333333'
                        },
                        ticks: {
                            color: '#888888',
                            maxTicksLimit: 8
                        }
                    },
                    y: {
                        grid: {
                            color: '#333333'
                        },
                        ticks: {
                            color: '#888888',
                            callback: function(value) {
                                return currency === 'TRY' ? '₺' + value.toFixed(2) : '$' + value.toFixed(2);
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                elements: {
                    point: {
                        hoverBackgroundColor: '#00d4ff'
                    }
                }
            }
        });
    }
    
    createCandlestickChart(ctx, labels, data, currency) {
        // Create candlestick data
        const candlestickData = data.timestamps.map((timestamp, index) => ({
            x: labels[index],
            o: data.open[index] || data.close[index],
            h: data.high[index] || data.close[index],
            l: data.low[index] || data.close[index],
            c: data.close[index]
        }));
        
        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'OHLC',
                    data: candlestickData,
                    backgroundColor: candlestickData.map(d => d.c >= d.o ? '#00ff88' : '#ff4444'),
                    borderColor: candlestickData.map(d => d.c >= d.o ? '#00ff88' : '#ff4444'),
                    borderWidth: 1,
                    barThickness: 6,
                    maxBarThickness: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const data = context.raw;
                                return [
                                    `Açılış: ${currency === 'TRY' ? '₺' : '$'}${data.o.toFixed(2)}`,
                                    `Yüksek: ${currency === 'TRY' ? '₺' : '$'}${data.h.toFixed(2)}`,
                                    `Düşük: ${currency === 'TRY' ? '₺' : '$'}${data.l.toFixed(2)}`,
                                    `Kapanış: ${currency === 'TRY' ? '₺' : '$'}${data.c.toFixed(2)}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: '#333333'
                        },
                        ticks: {
                            color: '#888888',
                            maxTicksLimit: 8
                        }
                    },
                    y: {
                        grid: {
                            color: '#333333'
                        },
                        ticks: {
                            color: '#888888',
                            callback: function(value) {
                                return currency === 'TRY' ? '₺' + value.toFixed(2) : '$' + value.toFixed(2);
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }
    
    showChartError(message) {
        const container = document.querySelector('.chart-container');
        container.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #ff4444;">
                <i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>
                ${message}
            </div>
        `;
    }
    
    async loadScreenerData(filters = {}) {
        try {
            const params = new URLSearchParams();
            
            // Default filters
            params.append('exchange', filters.exchange || 'all');
            params.append('sort', filters.sort || 'volume');
            params.append('minPrice', filters.minPrice || '0');
            params.append('maxPrice', filters.maxPrice || '');
            params.append('minVolume', filters.minVolume || '0');
            params.append('recommendation', filters.recommendation || 'all');
            
            const headers = {};
            if (this.token) {
                headers['Authorization'] = `Bearer ${this.token}`;
            }
            
            const response = await fetch(`${this.apiBaseUrl}/screener?${params}`, { headers });
            if (!response.ok) {
                if (response.status === 401) {
                    this.logout();
                    return;
                }
                throw new Error('Failed to fetch screener data');
            }
            
            const data = await response.json();
            this.updateScreener(data);
            
        } catch (error) {
            console.error('Error loading screener data:', error);
        }
    }
    
    updateScreener(data) {
        const container = document.getElementById('screenerContainer');
        container.innerHTML = '';
        
        if (data.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px;">Filtrelere uygun hisse bulunamadı</div>';
            return;
        }
        
        data.forEach(stock => {
            const item = document.createElement('div');
            item.className = 'screener-item';
            item.innerHTML = `
                <div class="screener-info">
                    <span class="screener-symbol">${stock.symbol}</span>
                    <span class="screener-name">${stock.name}</span>
                </div>
                <div class="screener-details">
                    <span class="screener-price">${this.formatPrice(stock.price, stock.currency)}</span>
                    <span class="screener-change ${stock.changePercent >= 0 ? 'positive' : 'negative'}">
                        ${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%
                    </span>
                    <span class="screener-rsi">RSI: ${stock.rsi}</span>
                </div>
            `;
            
            item.addEventListener('click', () => {
                this.selectStock(stock.symbol);
            });
            
            container.appendChild(item);
        });
    }
    
    toggleScreenerFilters() {
        const filters = document.getElementById('screenerFilters');
        const toggle = document.getElementById('screenerToggle');
        const icon = toggle.querySelector('i');
        
        if (filters.classList.contains('show')) {
            filters.classList.remove('show');
            icon.className = 'fas fa-chevron-down';
        } else {
            filters.classList.add('show');
            icon.className = 'fas fa-chevron-up';
        }
    }
    
    applyScreenerFilters() {
        const filters = {
            exchange: document.getElementById('screenerExchange').value,
            sort: document.getElementById('screenerSort').value,
            minPrice: document.getElementById('minPrice').value,
            maxPrice: document.getElementById('maxPrice').value,
            minVolume: document.getElementById('minVolume').value,
            recommendation: document.getElementById('screenerRecommendation').value
        };
        
        this.loadScreenerData(filters);
        this.showNotification('Filtreler uygulandı', 'success');
    }
    
    async loadNews() {
        try {
            const headers = {};
            if (this.token) {
                headers['Authorization'] = `Bearer ${this.token}`;
            }
            
            const response = await fetch(`${this.apiBaseUrl}/news`, { headers });
            if (!response.ok) {
                if (response.status === 401) {
                    this.logout();
                    return;
                }
                throw new Error('Failed to fetch news');
            }
            
            const news = await response.json();
            this.updateNews(news);
            
        } catch (error) {
            console.error('Error loading news:', error);
        }
    }
    
    async loadCompanyNews(symbol) {
        try {
            const headers = {};
            if (this.token) {
                headers['Authorization'] = `Bearer ${this.token}`;
            }
            
            const response = await fetch(`${this.apiBaseUrl}/news/${symbol}`, { headers });
            if (!response.ok) {
                if (response.status === 401) {
                    this.logout();
                    return;
                }
                throw new Error('Failed to fetch company news');
            }
            
            const companyNews = await response.json();
            this.updateCompanyNews(companyNews);
            
        } catch (error) {
            console.error('Error loading company news:', error);
        }
    }
    
    updateCompanyNews(news) {
        const container = document.getElementById('companyNewsContainer');
        container.innerHTML = '';
        
        if (news.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px;">Bu şirket için haber bulunamadı</div>';
            return;
        }
        
        news.forEach(item => {
            const newsItem = document.createElement('div');
            newsItem.className = 'company-news-item';
            newsItem.innerHTML = `
                <div class="company-news-text">${item.text}</div>
                <div class="company-news-time">${item.time}</div>
            `;
            
            if (item.url) {
                newsItem.addEventListener('click', () => {
                    window.open(item.url, '_blank');
                });
            }
            
            container.appendChild(newsItem);
        });
    }
    
    updateNews(news) {
        const container = document.getElementById('newsContainer');
        container.innerHTML = '';
        
        news.forEach(item => {
            const newsItem = document.createElement('div');
            newsItem.className = 'news-item';
            newsItem.innerHTML = `
                <div class="news-text">${item.text}</div>
                <div class="news-time">${item.time}</div>
            `;
            
            if (item.url) {
                newsItem.addEventListener('click', () => {
                    window.open(item.url, '_blank');
                });
            }
            
            container.appendChild(newsItem);
        });
    }
    
    async handleSearch(query) {
        if (!query || query.trim().length === 0) {
            this.hideSearchResults();
            return;
        }
        
        const trimmedQuery = query.trim();
        
        // Check cache first
        if (this.searchCache.has(trimmedQuery)) {
            this.searchResults = this.searchCache.get(trimmedQuery);
            this.showSearchResults();
            return;
        }
        
        // Show loading state
        this.showSearchLoading();
        
        try {
            const headers = {};
            if (this.token) {
                headers['Authorization'] = `Bearer ${this.token}`;
            }
            
            const response = await fetch(`${this.apiBaseUrl}/search?q=${encodeURIComponent(trimmedQuery)}`, { headers });
            if (!response.ok) {
                if (response.status === 401) {
                    this.logout();
                    return;
                }
                throw new Error('Search failed');
            }
            
            this.searchResults = await response.json();
            
            // Cache the results
            this.searchCache.set(trimmedQuery, this.searchResults);
            
            // Limit cache size to prevent memory issues
            if (this.searchCache.size > 50) {
                const firstKey = this.searchCache.keys().next().value;
                this.searchCache.delete(firstKey);
            }
            
            this.showSearchResults();
            
        } catch (error) {
            console.error('Search error:', error);
            this.showSearchError('Arama sırasında hata oluştu');
        }
    }
    
    showSearchResults() {
        const dropdown = document.querySelector('.search-dropdown');
        dropdown.innerHTML = '';
        
        if (this.searchResults.length === 0) {
            dropdown.innerHTML = `
                <div style="padding: 12px 16px; text-align: center; color: var(--text-secondary);">
                    <i class="fas fa-search" style="margin-right: 8px;"></i>
                    Sonuç bulunamadı
                </div>
            `;
            dropdown.style.display = 'block';
            return;
        }
        
        this.searchResults.forEach(stock => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            
            // Highlight matching text
            const highlightedSymbol = this.highlightText(stock.symbol, document.querySelector('.search-input').value);
            const highlightedName = this.highlightText(stock.name, document.querySelector('.search-input').value);
            
            item.innerHTML = `
                <span class="search-symbol">${highlightedSymbol}</span>
                <span class="search-name">${highlightedName}</span>
                <span class="search-price">${this.formatPrice(stock.price, stock.currency)}</span>
                <span class="search-change ${stock.changePercent >= 0 ? 'positive' : 'negative'}">
                    ${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%
                </span>
            `;
            
            item.addEventListener('click', () => {
                this.selectStock(stock.symbol);
                this.hideSearchResults();
                document.querySelector('.search-input').value = '';
            });
            
            dropdown.appendChild(item);
        });
        
        dropdown.style.display = 'block';
    }
    
    hideSearchResults() {
        document.querySelector('.search-dropdown').style.display = 'none';
    }
    
    showSearchLoading() {
        const dropdown = document.querySelector('.search-dropdown');
        dropdown.innerHTML = `
            <div style="padding: 12px 16px; text-align: center; color: var(--text-secondary);">
                <i class="fas fa-spinner fa-spin" style="margin-right: 8px;"></i>
                Aranıyor...
            </div>
        `;
        dropdown.style.display = 'block';
    }
    
    showSearchError(message) {
        const dropdown = document.querySelector('.search-dropdown');
        dropdown.innerHTML = `
            <div style="padding: 12px 16px; text-align: center; color: var(--error-color);">
                <i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>
                ${message}
            </div>
        `;
        dropdown.style.display = 'block';
    }
    
    showSearchMessage(message) {
        const dropdown = document.querySelector('.search-dropdown');
        dropdown.innerHTML = `
            <div style="padding: 12px 16px; text-align: center; color: var(--text-secondary);">
                <i class="fas fa-info-circle" style="margin-right: 8px;"></i>
                ${message}
            </div>
        `;
        dropdown.style.display = 'block';
    }
    
    // Local search for fast results using cached data
    handleLocalSearch(query) {
        if (!query || query.trim().length === 0) {
            this.hideSearchResults();
            return;
        }
        
        const queryLower = query.toLowerCase();
        const localResults = [];
        
        // Search in cached stock data
        Object.values(this.stockData).forEach(stock => {
            if (stock.symbol.toLowerCase().includes(queryLower) || 
                stock.name.toLowerCase().includes(queryLower)) {
                localResults.push(stock);
            }
        });
        
        // Sort by relevance (exact symbol matches first)
        localResults.sort((a, b) => {
            const aSymbolMatch = a.symbol.toLowerCase().startsWith(queryLower);
            const bSymbolMatch = b.symbol.toLowerCase().startsWith(queryLower);
            
            if (aSymbolMatch && !bSymbolMatch) return -1;
            if (!aSymbolMatch && bSymbolMatch) return 1;
            
            return a.symbol.localeCompare(b.symbol);
        });
        
        // Limit results to 15 for performance
        this.searchResults = localResults.slice(0, 15);
        this.showSearchResults();
    }
    
    // Local search for modal
    handleModalLocalSearch(query) {
        if (!query || query.trim().length === 0) {
            document.getElementById('modalSearchResults').innerHTML = '';
            return;
        }
        
        const queryLower = query.toLowerCase();
        const localResults = [];
        
        // Search in cached stock data
        Object.values(this.stockData).forEach(stock => {
            if (stock.symbol.toLowerCase().includes(queryLower) || 
                stock.name.toLowerCase().includes(queryLower)) {
                localResults.push(stock);
            }
        });
        
        // Sort by relevance (exact symbol matches first)
        localResults.sort((a, b) => {
            const aSymbolMatch = a.symbol.toLowerCase().startsWith(queryLower);
            const bSymbolMatch = b.symbol.toLowerCase().startsWith(queryLower);
            
            if (aSymbolMatch && !bSymbolMatch) return -1;
            if (!aSymbolMatch && bSymbolMatch) return 1;
            
            return a.symbol.localeCompare(b.symbol);
        });
        
        // Limit results to 20 for modal
        this.updateModalSearchResults(localResults.slice(0, 20));
    }
    
    // Highlight matching text in search results
    highlightText(text, query) {
        if (!query || query.trim().length === 0) {
            return text;
        }
        
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark style="background-color: rgba(0, 212, 255, 0.3); color: inherit; padding: 0;">$1</mark>');
    }
    
    async handleModalSearch(query) {
        if (!query || query.trim().length === 0) {
            document.getElementById('modalSearchResults').innerHTML = '';
            return;
        }
        
        const trimmedQuery = query.trim();
        
        // Check cache first
        if (this.searchCache.has(trimmedQuery)) {
            const results = this.searchCache.get(trimmedQuery);
            this.updateModalSearchResults(results);
            return;
        }
        
        // Show loading state
        this.showModalSearchLoading();
        
        try {
            const headers = {};
            if (this.token) {
                headers['Authorization'] = `Bearer ${this.token}`;
            }
            
            const response = await fetch(`${this.apiBaseUrl}/search?q=${encodeURIComponent(trimmedQuery)}`, { headers });
            if (!response.ok) {
                if (response.status === 401) {
                    this.logout();
                    return;
                }
                throw new Error('Search failed');
            }
            
            const results = await response.json();
            
            // Cache the results
            this.searchCache.set(trimmedQuery, results);
            
            // Limit cache size to prevent memory issues
            if (this.searchCache.size > 50) {
                const firstKey = this.searchCache.keys().next().value;
                this.searchCache.delete(firstKey);
            }
            
            this.updateModalSearchResults(results);
            
        } catch (error) {
            console.error('Modal search error:', error);
            this.showModalSearchError('Arama sırasında hata oluştu');
        }
    }
    
    updateModalSearchResults(results) {
        const container = document.getElementById('modalSearchResults');
        container.innerHTML = '';
        
        if (results.length === 0) {
            container.innerHTML = `
                <div style="padding: 20px; text-align: center; color: var(--text-secondary);">
                    <i class="fas fa-search" style="margin-right: 8px;"></i>
                    Sonuç bulunamadı
                </div>
            `;
            return;
        }
        
        results.forEach(stock => {
            const item = document.createElement('div');
            item.className = 'modal-search-result';
            
            // Highlight matching text
            const highlightedSymbol = this.highlightText(stock.symbol, document.getElementById('modalSearchInput').value);
            const highlightedName = this.highlightText(stock.name, document.getElementById('modalSearchInput').value);
            
            item.innerHTML = `
                <div>
                    <div style="font-weight: 600; color: #ffffff;">${highlightedSymbol}</div>
                    <div style="font-size: 12px; color: #888888;">${highlightedName}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: 600; color: #ffffff;">${this.formatPrice(stock.price, stock.currency)}</div>
                    <div style="font-size: 12px; color: ${stock.changePercent >= 0 ? '#00ff88' : '#ff4444'};">
                        ${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%
                    </div>
                </div>
            `;
            
            item.addEventListener('click', () => {
                this.addToWatchlist(stock.symbol);
                document.getElementById('addStockModal').style.display = 'none';
                document.getElementById('modalSearchInput').value = '';
            });
            
            container.appendChild(item);
        });
    }
    
    showModalSearchLoading() {
        const container = document.getElementById('modalSearchResults');
        container.innerHTML = `
            <div style="padding: 20px; text-align: center; color: var(--text-secondary);">
                <i class="fas fa-spinner fa-spin" style="margin-right: 8px;"></i>
                Aranıyor...
            </div>
        `;
    }
    
    showModalSearchError(message) {
        const container = document.getElementById('modalSearchResults');
        container.innerHTML = `
            <div style="padding: 20px; text-align: center; color: var(--error-color);">
                <i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>
                ${message}
            </div>
        `;
    }
    
    showModalSearchMessage(message) {
        const container = document.getElementById('modalSearchResults');
        container.innerHTML = `
            <div style="padding: 20px; text-align: center; color: var(--text-secondary);">
                <i class="fas fa-info-circle" style="margin-right: 8px;"></i>
                ${message}
            </div>
        `;
    }
    
    selectStock(symbol) {
        this.currentSymbol = symbol;
        this.updateWatchlist();
        this.updateStockDisplay();
        this.updateTechnicalAnalysis();
        this.loadChartData(symbol);
        this.loadCompanyNews(symbol);
    }
    
    addToWatchlist(symbol) {
        if (!this.watchlist.includes(symbol)) {
            this.watchlist.push(symbol);
            this.updateWatchlist();
        }
    }
    
    removeFromWatchlist(symbol) {
        this.watchlist = this.watchlist.filter(s => s !== symbol);
        this.updateWatchlist();
        
        if (symbol === this.currentSymbol && this.watchlist.length > 0) {
            this.selectStock(this.watchlist[0]);
        }
    }
    
    updateStockData(newData) {
        this.stockData = { ...this.stockData, ...newData };
        this.updateAllDisplays();
        this.updateLastUpdateTime();
    }
    
    updateConnectionStatus(status) {
        const lastUpdateElement = document.getElementById('lastUpdate');
        lastUpdateElement.textContent = status;
        
        if (status === 'Bağlandı') {
            lastUpdateElement.style.color = '#00ff88';
        } else {
            lastUpdateElement.style.color = '#ff4444';
        }
    }
    
    updateLastUpdateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('tr-TR');
        document.getElementById('lastUpdate').textContent = `Son güncelleme: ${timeString}`;
        document.getElementById('lastUpdate').style.color = '#888888';
    }
    
    formatPrice(price, currency) {
        if (currency === 'TRY') {
            return `₺${price.toFixed(2)}`;
        } else {
            return `$${price.toFixed(2)}`;
        }
    }
    
    showError(message) {
        console.error(message);
        // You can implement a toast notification here
    }
    
    startPeriodicUpdates() {
        // Update every 30 seconds
        setInterval(() => {
            if (this.isConnected) {
                this.updateLastUpdateTime();
            }
        }, 30000);
    }
    
    // Theme Management
    loadTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            this.currentTheme = savedTheme;
        }
        
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        
        const themeIcon = document.querySelector('#themeToggle i');
        if (themeIcon) {
            themeIcon.className = this.currentTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
        }
    }
    
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        
        const themeIcon = document.querySelector('#themeToggle i');
        themeIcon.className = this.currentTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
        
        localStorage.setItem('theme', this.currentTheme);
    }
    
    
    // Alarm Management
    async loadAlarms() {
        try {
            const headers = {};
            if (this.token) {
                headers['Authorization'] = `Bearer ${this.token}`;
            }
            
            const response = await fetch(`${this.apiBaseUrl}/alarms`, { headers });
            if (!response.ok) throw new Error('Failed to fetch alarms');
            
            this.alarms = await response.json();
            this.updateAlarmDisplay();
            
        } catch (error) {
            console.error('Error loading alarms:', error);
        }
    }
    
    updateAlarmDisplay() {
        const container = document.getElementById('alarmContainer');
        container.innerHTML = '';
        
        if (this.alarms.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px;">Henüz alarm yok</div>';
            return;
        }
        
        this.alarms.forEach(alarm => {
            const alarmItem = document.createElement('div');
            alarmItem.className = 'alarm-item';
            alarmItem.innerHTML = `
                <div class="alarm-info">
                    <div class="alarm-symbol">${alarm.symbol}</div>
                    <div class="alarm-details">${alarm.type} ${alarm.condition} ${alarm.value}</div>
                </div>
                <div class="alarm-actions">
                    <button class="alarm-delete-btn" onclick="app.deleteAlarm('${alarm.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            container.appendChild(alarmItem);
        });
    }
    
    openAlarmModal() {
        const stock = this.stockData[this.currentSymbol];
        if (!stock) return;
        
        document.getElementById('alarmSymbol').textContent = stock.symbol;
        document.getElementById('addAlarmModal').style.display = 'block';
    }
    
    async createAlarm() {
        const type = document.getElementById('alarmType').value;
        const condition = document.getElementById('alarmCondition').value;
        const value = parseFloat(document.getElementById('alarmValue').value);
        
        if (!value || value <= 0) {
            this.showNotification('Geçerli bir değer girin', 'error');
            return;
        }
        
        if (!this.token) {
            this.showNotification('Alarm eklemek için giriş yapmalısınız', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/alarms`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    symbol: this.currentSymbol,
                    type: type,
                    condition: condition,
                    value: value
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create alarm');
            }
            
            await this.loadAlarms();
            document.getElementById('addAlarmModal').style.display = 'none';
            this.showNotification('Alarm başarıyla eklendi!', 'success');
            
        } catch (error) {
            console.error('Alarm creation error:', error);
            this.showNotification(error.message, 'error');
        }
    }
    
    async deleteAlarm(alarmId) {
        if (!this.token) {
            this.showNotification('Alarm silmek için giriş yapmalısınız', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/alarms/${alarmId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete alarm');
            }
            
            await this.loadAlarms();
            this.showNotification('Alarm silindi', 'success');
            
        } catch (error) {
            console.error('Alarm deletion error:', error);
            this.showNotification('Alarm silinemedi', 'error');
        }
    }
    
    // Utility Functions
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: var(--border-radius);
            color: white;
            font-weight: 600;
            z-index: 1000;
            transition: var(--transition);
            background-color: ${type === 'success' ? 'var(--success-color)' : 
                             type === 'error' ? 'var(--error-color)' : 
                             'var(--primary-color)'};
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    showLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        const mainApp = document.getElementById('mainApp');
        const progressBar = document.getElementById('progressBar');
        
        if (loadingScreen && mainApp) {
            loadingScreen.style.display = 'flex';
            mainApp.style.display = 'none';
            
            // Faster progress bar animation
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += Math.random() * 25; // Increased from 15 to 25
                if (progress > 90) progress = 90;
                progressBar.style.width = progress + '%';
            }, 100); // Reduced from 200ms to 100ms
            
            // Store interval for cleanup
            this.progressInterval = progressInterval;
        }
    }
    
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        const mainApp = document.getElementById('mainApp');
        const progressBar = document.getElementById('progressBar');
        
        if (loadingScreen && mainApp) {
            // Complete progress bar
            if (progressBar) {
                progressBar.style.width = '100%';
            }
            
            // Clear progress interval
            if (this.progressInterval) {
                clearInterval(this.progressInterval);
            }
            
            // Hide loading screen and show main app
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
                mainApp.style.display = 'block';
                
                // Remove loading screen from DOM after animation
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 500);
            }, 500);
        }
    }
    
    
    updateAuthUI() {
        if (this.user) {
            const userAvatar = document.getElementById('userAvatar');
            const userName = document.getElementById('userName');
            
            if (userAvatar) {
                userAvatar.textContent = this.user.username.charAt(0).toUpperCase();
            }
            if (userName) {
                userName.textContent = this.user.username;
            }
        }
    }
    
    logout() {
        this.user = null;
        this.token = null;
        this.userId = 'demo-user';
        
        // Clear localStorage
        localStorage.removeItem('tradepro_token');
        localStorage.removeItem('tradepro_user');
        
        // Show authentication screen
        this.showAuthScreen();
        this.showNotification('Çıkış yapıldı', 'info');
    }
    
    // Authentication Screen Methods
    showAuthScreen() {
        const authScreen = document.getElementById('authScreen');
        const mainApp = document.getElementById('mainApp');
        
        if (authScreen && mainApp) {
            authScreen.style.display = 'flex';
            mainApp.style.display = 'none';
        }
    }
    
    hideAuthScreen() {
        const authScreen = document.getElementById('authScreen');
        const mainApp = document.getElementById('mainApp');
        
        if (authScreen && mainApp) {
            authScreen.classList.add('hidden');
            setTimeout(() => {
                authScreen.style.display = 'none';
                mainApp.style.display = 'block';
            }, 500);
        }
    }
    
    switchAuthTab(tab) {
        const loginTab = document.getElementById('loginTab');
        const registerTab = document.getElementById('registerTab');
        const loginFormContainer = document.getElementById('loginFormContainer');
        const registerFormContainer = document.getElementById('registerFormContainer');
        
        if (tab === 'login') {
            loginTab.classList.add('active');
            registerTab.classList.remove('active');
            loginFormContainer.style.display = 'block';
            registerFormContainer.style.display = 'none';
        } else {
            registerTab.classList.add('active');
            loginTab.classList.remove('active');
            registerFormContainer.style.display = 'block';
            loginFormContainer.style.display = 'none';
        }
    }
    
    async handleAuthLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('authLoginEmail').value;
        const password = document.getElementById('authLoginPassword').value;
        
        const submitBtn = e.target.querySelector('.auth-submit-btn');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Giriş yapılıyor...';
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.user = data.user;
                this.token = data.token;
                this.userId = data.user.id;
                
                // Store token in localStorage
                localStorage.setItem('tradepro_token', this.token);
                localStorage.setItem('tradepro_user', JSON.stringify(this.user));
                
                this.updateAuthUI();
                this.hideAuthScreen();
                
                // Initialize app after successful login
                this.connectWebSocket();
                this.showLoadingScreen();
                
                try {
                    await this.loadInitialData();
                    await this.loadAlarms();
                    await this.loadCompanyNews(this.currentSymbol);
                    this.startPeriodicUpdates();
                    
                    setTimeout(() => {
                        this.hideLoadingScreen();
                    }, 1500);
                    
                } catch (error) {
                    console.error('Error during post-login initialization:', error);
                    this.hideLoadingScreen();
                }
                
                this.showNotification('Giriş başarılı!', 'success');
            } else {
                this.showAuthNotification(data.error, 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showAuthNotification('Giriş yapılırken hata oluştu', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }
    
    async handleAuthRegister(e) {
        e.preventDefault();
        
        const username = document.getElementById('authRegisterUsername').value;
        const email = document.getElementById('authRegisterEmail').value;
        const password = document.getElementById('authRegisterPassword').value;
        const confirmPassword = document.getElementById('authConfirmPassword').value;
        
        if (password !== confirmPassword) {
            this.showAuthNotification('Şifreler eşleşmiyor', 'error');
            return;
        }
        
        const submitBtn = e.target.querySelector('.auth-submit-btn');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Kayıt olunuyor...';
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.user = data.user;
                this.token = data.token;
                this.userId = data.user.id;
                
                // Store token in localStorage
                localStorage.setItem('tradepro_token', this.token);
                localStorage.setItem('tradepro_user', JSON.stringify(this.user));
                
                this.updateAuthUI();
                this.hideAuthScreen();
                
                // Initialize app after successful registration
                this.connectWebSocket();
                this.showLoadingScreen();
                
                try {
                    await this.loadInitialData();
                    await this.loadAlarms();
                    await this.loadCompanyNews(this.currentSymbol);
                    this.startPeriodicUpdates();
                    
                    setTimeout(() => {
                        this.hideLoadingScreen();
                    }, 1500);
                    
                } catch (error) {
                    console.error('Error during post-registration initialization:', error);
                    this.hideLoadingScreen();
                }
                
                this.showNotification('Kayıt başarılı!', 'success');
            } else {
                this.showAuthNotification(data.error, 'error');
            }
        } catch (error) {
            console.error('Register error:', error);
            this.showAuthNotification('Kayıt olurken hata oluştu', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }
    
    showAuthNotification(message, type = 'info') {
        // Create notification element for auth screen
        const notification = document.createElement('div');
        notification.className = `auth-notification auth-notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 20px;
            border-radius: var(--border-radius);
            color: white;
            font-weight: 600;
            z-index: 10001;
            transition: var(--transition);
            background-color: ${type === 'success' ? 'var(--success-color)' : 
                             type === 'error' ? 'var(--error-color)' : 
                             'var(--primary-color)'};
        `;
        
        const authContainer = document.querySelector('.auth-container');
        authContainer.style.position = 'relative';
        authContainer.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    async loadUserData() {
        if (!this.token) return;
        
        try {
            // Load user watchlist
            const watchlistResponse = await fetch(`${this.apiBaseUrl}/user/watchlist`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (watchlistResponse.ok) {
                const userWatchlist = await watchlistResponse.json();
                this.watchlist = userWatchlist;
                this.updateWatchlist();
            }
            
            // Load user alarms
            await this.loadAlarms();
            
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TradeProApp();
});
