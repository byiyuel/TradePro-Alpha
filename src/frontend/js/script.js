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
        this.chartType = 'line';
        this.user = null;
        this.token = null;
        this.searchCache = new Map(); // Cache for search results
        
        this.init();
    }
    
    async init() {
        console.log('🚀 TradePro App initializing...');
        this.setupEventListeners();
        
        // Direct app initialization without authentication
        this.showLoadingScreen();
        this.connectWebSocket();
        
        try {
            // Load data in parallel for faster initialization
            const [initialDataResult, alarmsResult] = await Promise.allSettled([
                this.loadInitialData(),
                this.loadAlarms()
            ]);
            
            // Load initial chart
            await this.loadChartData(this.currentSymbol);
            
            // Load initial screener data
            await this.loadScreenerData();
            
            // Load portfolios
            await this.loadPortfolios();
            
            // Initialize advanced chart
            this.initializeAdvancedChart();
            
            // Load alerts and notifications (with error handling)
            try {
                await this.loadAlerts();
            } catch (error) {
                console.error('Error loading alerts:', error);
            }
            
            try {
                await this.loadNotifications();
            } catch (error) {
                console.error('Error loading notifications:', error);
            }
            
            this.startPeriodicUpdates();
            
            // Hide loading screen immediately after data loads
            console.log('✅ All data loaded successfully, hiding loading screen...');
            this.hideLoadingScreen();
            
        } catch (error) {
            console.error('❌ Error during initialization:', error);
            this.hideLoadingScreen();
        }
        
        // Emergency fallback - hide loading screen after 3 seconds no matter what
        setTimeout(() => {
            this.hideLoadingScreen();
        }, 3000);
    }
    
    setupNavbarDropdowns() {
        // Notifications dropdown
        const notificationsBtn = document.getElementById('notificationsBtn');
        const notificationsDropdown = document.getElementById('notificationsDropdown');
        
        if (notificationsBtn && notificationsDropdown) {
            notificationsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown(notificationsDropdown);
            });
        }
        
        // Social Trading dropdown
        const socialTradingBtn = document.getElementById('socialTradingBtn');
        const socialTradingDropdown = document.getElementById('socialTradingDropdown');
        
        if (socialTradingBtn && socialTradingDropdown) {
            socialTradingBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown(socialTradingDropdown);
            });
        }
        
        // Portfolio dropdown
        const portfolioBtn = document.getElementById('portfolioBtn');
        const portfolioDropdown = document.getElementById('portfolioDropdownContent');
        
        if (portfolioBtn && portfolioDropdown) {
            portfolioBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown(portfolioDropdown);
            });
        }
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.nav-dropdown')) {
                this.closeAllDropdowns();
            }
        });
        
        // Social trading tabs
        this.setupSocialTradingTabs();
    }
    
    toggleDropdown(dropdown) {
        const isActive = dropdown.classList.contains('active');
        this.closeAllDropdowns();
        
        if (!isActive) {
            dropdown.classList.add('active');
            const toggleBtn = dropdown.previousElementSibling;
            if (toggleBtn) {
                toggleBtn.classList.add('active');
            }
        }
    }
    
    closeAllDropdowns() {
        const dropdowns = document.querySelectorAll('.dropdown-content');
        const toggleBtns = document.querySelectorAll('.dropdown-toggle');
        
        dropdowns.forEach(dropdown => {
            dropdown.classList.remove('active');
        });
        
        toggleBtns.forEach(btn => {
            btn.classList.remove('active');
        });
    }
    
    setupSocialTradingTabs() {
        const socialTabBtns = document.querySelectorAll('.social-tab-btn');
        const socialTabContents = document.querySelectorAll('.social-tab-content');
        
        socialTabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.getAttribute('data-tab');
                
                // Remove active class from all tabs and contents
                socialTabBtns.forEach(b => b.classList.remove('active'));
                socialTabContents.forEach(c => c.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding content
                btn.classList.add('active');
                const targetContent = document.getElementById(tabName + 'Tab');
                if (targetContent) {
                    targetContent.classList.add('active');
                }
            });
        });
    }
    
    
    setupEventListeners() {
        // Navbar dropdown functionality
        this.setupNavbarDropdowns();
        
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
            
            // Tab system for technical analysis
            if (e.target.classList.contains('tab-btn')) {
                this.switchAnalysisTab(e.target.dataset.tab);
            }
        });
        
        // Portfolio management
        this.currentPortfolio = null;
        this.portfolios = [];
        
        // Advanced chart
        this.advancedChart = null;
        
        // Alert system
        this.alerts = [];
        this.notifications = [];
        this.unreadNotifications = 0;
        
        // Portfolio event listeners
        const createPortfolioBtn = document.getElementById('createPortfolioBtn');
        if (createPortfolioBtn) {
            createPortfolioBtn.addEventListener('click', () => this.showCreatePortfolioModal());
        }
        
        const portfolioToggle = document.getElementById('portfolioToggle');
        if (portfolioToggle) {
            portfolioToggle.addEventListener('click', () => this.togglePortfolioContent());
        }
        
        const portfolioDropdown = document.getElementById('portfolioDropdown');
        if (portfolioDropdown) {
            portfolioDropdown.addEventListener('change', (e) => this.selectPortfolio(e.target.value));
        }
        
        const buyStockBtn = document.getElementById('buyStockBtn');
        if (buyStockBtn) {
            buyStockBtn.addEventListener('click', () => this.showTradeModal('BUY'));
        }
        
        const sellStockBtn = document.getElementById('sellStockBtn');
        if (sellStockBtn) {
            sellStockBtn.addEventListener('click', () => this.showTradeModal('SELL'));
        }
        
        const viewRiskBtn = document.getElementById('viewRiskBtn');
        if (viewRiskBtn) {
            viewRiskBtn.addEventListener('click', () => this.showRiskAnalysis());
        }
        
        // Portfolio modal listeners
        const closeCreatePortfolioBtn = document.getElementById('closeCreatePortfolioBtn');
        if (closeCreatePortfolioBtn) {
            closeCreatePortfolioBtn.addEventListener('click', () => this.hideCreatePortfolioModal());
        }
        
        const cancelCreatePortfolio = document.getElementById('cancelCreatePortfolio');
        if (cancelCreatePortfolio) {
            cancelCreatePortfolio.addEventListener('click', () => this.hideCreatePortfolioModal());
        }
        
        const confirmCreatePortfolio = document.getElementById('confirmCreatePortfolio');
        if (confirmCreatePortfolio) {
            confirmCreatePortfolio.addEventListener('click', () => this.createPortfolio());
        }
        
        const closeTradeModalBtn = document.getElementById('closeTradeModalBtn');
        if (closeTradeModalBtn) {
            closeTradeModalBtn.addEventListener('click', () => this.hideTradeModal());
        }
        
        const cancelTrade = document.getElementById('cancelTrade');
        if (cancelTrade) {
            cancelTrade.addEventListener('click', () => this.hideTradeModal());
        }
        
        const confirmTrade = document.getElementById('confirmTrade');
        if (confirmTrade) {
            confirmTrade.addEventListener('click', () => this.executeTrade());
        }
        
        const closeRiskModalBtn = document.getElementById('closeRiskModalBtn');
        if (closeRiskModalBtn) {
            closeRiskModalBtn.addEventListener('click', () => this.hideRiskAnalysisModal());
        }
        
        const closeRiskAnalysis = document.getElementById('closeRiskAnalysis');
        if (closeRiskAnalysis) {
            closeRiskAnalysis.addEventListener('click', () => this.hideRiskAnalysisModal());
        }
        
        // Trade form listeners
        const tradeQuantity = document.getElementById('tradeQuantity');
        if (tradeQuantity) {
            tradeQuantity.addEventListener('input', () => this.calculateTradeTotal());
        }
        
        const tradePrice = document.getElementById('tradePrice');
        if (tradePrice) {
            tradePrice.addEventListener('input', () => this.calculateTradeTotal());
        }
        
        const tradeCommission = document.getElementById('tradeCommission');
        if (tradeCommission) {
            tradeCommission.addEventListener('input', () => this.calculateTradeTotal());
        }
        
        // Alert system listeners
        const createAlertBtn = document.getElementById('createAlertBtn');
        if (createAlertBtn) {
            createAlertBtn.addEventListener('click', () => this.showCreateAlertModal());
        }
        
        const alertToggle = document.getElementById('alertToggle');
        if (alertToggle) {
            alertToggle.addEventListener('click', () => this.toggleAlertContent());
        }
        const alertTabBtns = document.querySelectorAll('.alert-tab-btn');
        if (alertTabBtns.length > 0) {
            alertTabBtns.forEach(btn => {
                btn.addEventListener('click', (e) => this.switchAlertTab(e.target.dataset.tab));
            });
        }
        
        // Alert modal listeners
        const closeCreateAlertBtn = document.getElementById('closeCreateAlertBtn');
        if (closeCreateAlertBtn) {
            closeCreateAlertBtn.addEventListener('click', () => this.hideCreateAlertModal());
        }
        
        const cancelCreateAlert = document.getElementById('cancelCreateAlert');
        if (cancelCreateAlert) {
            cancelCreateAlert.addEventListener('click', () => this.hideCreateAlertModal());
        }
        
        const confirmCreateAlert = document.getElementById('confirmCreateAlert');
        if (confirmCreateAlert) {
            confirmCreateAlert.addEventListener('click', () => this.createAlert());
        }
        
        // Alert type change listener
        const alertType = document.getElementById('alertType');
        if (alertType) {
            alertType.addEventListener('change', (e) => this.handleAlertTypeChange(e.target.value));
        }
        
        // Social trading listeners
        const createTraderBtn = document.getElementById('createTraderBtn');
        if (createTraderBtn) {
            createTraderBtn.addEventListener('click', () => this.showCreateTraderModal());
        }
        
        const socialToggle = document.getElementById('socialToggle');
        if (socialToggle) {
            socialToggle.addEventListener('click', () => this.toggleSocialContent());
        }
        
        const socialTabBtns = document.querySelectorAll('.social-tab-btn');
        if (socialTabBtns.length > 0) {
            socialTabBtns.forEach(btn => {
                btn.addEventListener('click', (e) => this.switchSocialTab(e.target.dataset.tab));
            });
        }
        
        // Trader search
        const searchTradersBtn = document.getElementById('searchTradersBtn');
        if (searchTradersBtn) {
            searchTradersBtn.addEventListener('click', () => this.searchTraders());
        }
        
        const traderSearchInput = document.getElementById('traderSearchInput');
        if (traderSearchInput) {
            traderSearchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.searchTraders();
            });
        }
        
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
        
        
        
        
        
        // Old alarm system removed - now using advanced alert system
    
        // News link button (no event listener needed - just a link)
        }
        
    async connectWebSocket() {
        try {
            this.ws = new WebSocket(`${this.wsUrl}`);
            
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
                    } else if (data.type === 'alert') {
                        this.handleAlertMessage(data);
                    } else if (data.type === 'error') {
                        console.error('WebSocket error:', data.message);
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };
            
            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                this.isConnected = false;
                this.updateConnectionStatus('Bağlantı kesildi');
                // Reconnect after 5 seconds
                    setTimeout(() => this.connectWebSocket(), 5000);
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
                    console.error('Unauthorized access');
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
            
            stockItem.addEventListener('click', async () => {
                await this.selectStock(symbol);
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
        
        // Update advanced technical analysis
        this.updateAdvancedIndicators(stock);
    }
    
    switchAnalysisTab(tabName) {
        // Remove active class from all tabs and content
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Add active class to selected tab and content
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}Indicators`).classList.add('active');
    }
    
    updateAdvancedIndicators(stock) {
        if (!stock.indicators) return;
        
        const indicators = stock.indicators;
        
        // EMA values
        if (indicators.ema12) document.getElementById('ema12Value').textContent = this.formatPrice(indicators.ema12, stock.currency);
        if (indicators.ema26) document.getElementById('ema26Value').textContent = this.formatPrice(indicators.ema26, stock.currency);
        
        // Ichimoku values
        if (indicators.ichimoku) {
            const ichimoku = indicators.ichimoku;
            if (ichimoku.tenkan) document.getElementById('tenkanValue').textContent = this.formatPrice(ichimoku.tenkan, stock.currency);
            if (ichimoku.kijun) document.getElementById('kijunValue').textContent = this.formatPrice(ichimoku.kijun, stock.currency);
            if (ichimoku.senkouA) document.getElementById('senkouAValue').textContent = this.formatPrice(ichimoku.senkouA, stock.currency);
        }
        
        // Momentum indicators
        if (indicators.williams !== undefined) document.getElementById('williamsValue').textContent = `${indicators.williams.toFixed(1)}%`;
        if (indicators.cci !== undefined) document.getElementById('cciValue').textContent = indicators.cci.toFixed(1);
        if (indicators.adx !== undefined) document.getElementById('adxValue').textContent = indicators.adx.toFixed(1);
        
        // Volatility
        if (indicators.atr) document.getElementById('atrValue').textContent = this.formatPrice(indicators.atr, stock.currency);
        
        // Fibonacci levels
        if (indicators.fibonacci) {
            const fib = indicators.fibonacci;
            if (fib.level78) document.getElementById('fib78Value').textContent = this.formatPrice(fib.level78, stock.currency);
            if (fib.level61) document.getElementById('fib61Value').textContent = this.formatPrice(fib.level61, stock.currency);
            if (fib.level50) document.getElementById('fib50Value').textContent = this.formatPrice(fib.level50, stock.currency);
            if (fib.level38) document.getElementById('fib38Value').textContent = this.formatPrice(fib.level38, stock.currency);
            if (fib.level23) document.getElementById('fib23Value').textContent = this.formatPrice(fib.level23, stock.currency);
        }
        
        // Update confidence meter
        if (indicators.confidence !== undefined) {
            const confidence = indicators.confidence;
            document.getElementById('confidenceValue').textContent = `${confidence}%`;
            document.getElementById('confidenceFill').style.width = `${confidence}%`;
        }
        
        // Update recommendation
        if (indicators.recommendation) {
            const recommendationElement = document.getElementById('recommendationValue');
            recommendationElement.textContent = indicators.recommendation;
            recommendationElement.className = `recommendation-value ${indicators.recommendation.toLowerCase()}`;
        }
    }
    
    // Portfolio Management Functions
    async loadPortfolios() {
        try {
            const userId = 'demo_user'; // In production, get from auth
            const response = await fetch(`/api/portfolios/${userId}`);
            if (response.ok) {
                this.portfolios = await response.json();
                this.updatePortfolioDropdown();
            }
        } catch (error) {
            console.error('Error loading portfolios:', error);
        }
    }
    
    updatePortfolioDropdown() {
        const dropdown = document.getElementById('portfolioDropdown');
        dropdown.innerHTML = '<option value="">Portföy Seçin</option>';
        
        this.portfolios.forEach(portfolio => {
            const option = document.createElement('option');
            option.value = portfolio.id;
            option.textContent = portfolio.name;
            dropdown.appendChild(option);
        });
    }
    
    async selectPortfolio(portfolioId) {
        if (!portfolioId) {
            document.getElementById('portfolioSummary').style.display = 'none';
            this.currentPortfolio = null;
            return;
        }
        
        try {
            const response = await fetch(`/api/portfolio/${portfolioId}`);
            if (response.ok) {
                this.currentPortfolio = await response.json();
                this.updatePortfolioDisplay();
                document.getElementById('portfolioSummary').style.display = 'block';
            }
        } catch (error) {
            console.error('Error loading portfolio:', error);
        }
    }
    
    updatePortfolioDisplay() {
        if (!this.currentPortfolio) return;
        
        const portfolio = this.currentPortfolio;
        
        // Update summary cards
        document.getElementById('totalValue').textContent = this.formatPrice(portfolio.currentCapital, '$');
        document.getElementById('dailyReturn').textContent = this.formatPrice(portfolio.performance.dailyReturn, '$');
        document.getElementById('totalReturn').textContent = this.formatPrice(portfolio.performance.totalReturn, '$');
        document.getElementById('returnPercent').textContent = `${portfolio.performance.totalReturnPercent.toFixed(2)}%`;
        
        // Update colors
        document.getElementById('dailyReturn').className = `summary-value ${portfolio.performance.dailyReturn >= 0 ? 'positive' : 'negative'}`;
        document.getElementById('totalReturn').className = `summary-value ${portfolio.performance.totalReturn >= 0 ? 'positive' : 'negative'}`;
        document.getElementById('returnPercent').className = `summary-value ${portfolio.performance.totalReturnPercent >= 0 ? 'positive' : 'negative'}`;
        
        // Update positions
        this.updatePortfolioPositions();
    }
    
    updatePortfolioPositions() {
        const container = document.getElementById('portfolioPositions');
        container.innerHTML = '';
        
        if (this.currentPortfolio.positions.length === 0) {
            container.innerHTML = '<div class="no-positions">Henüz pozisyon yok</div>';
            return;
        }
        
        this.currentPortfolio.positions.forEach(position => {
            const positionItem = document.createElement('div');
            positionItem.className = 'position-item';
            
            positionItem.innerHTML = `
                <div class="position-info">
                    <div class="position-symbol">${position.symbol}</div>
                    <div class="position-quantity">${position.quantity} adet</div>
                </div>
                <div class="position-values">
                    <div class="position-value">${this.formatPrice(position.marketValue, '$')}</div>
                    <div class="position-pnl ${position.unrealizedPnL >= 0 ? 'positive' : 'negative'}">
                        ${position.unrealizedPnL >= 0 ? '+' : ''}${this.formatPrice(position.unrealizedPnL, '$')} (${position.unrealizedPnLPercent.toFixed(2)}%)
                    </div>
                </div>
            `;
            
            container.appendChild(positionItem);
        });
    }
    
    togglePortfolioContent() {
        const content = document.getElementById('portfolioContent');
        const toggle = document.getElementById('portfolioToggle');
        
        if (content.classList.contains('active')) {
            content.classList.remove('active');
            toggle.innerHTML = '<i class="fas fa-chevron-down"></i>';
        } else {
            content.classList.add('active');
            toggle.innerHTML = '<i class="fas fa-chevron-up"></i>';
        }
    }
    
    showCreatePortfolioModal() {
        document.getElementById('createPortfolioModal').style.display = 'block';
    }
    
    hideCreatePortfolioModal() {
        document.getElementById('createPortfolioModal').style.display = 'none';
        document.getElementById('portfolioName').value = '';
        document.getElementById('initialCapital').value = '';
    }
    
    async createPortfolio() {
        const name = document.getElementById('portfolioName').value.trim();
        const capital = parseFloat(document.getElementById('initialCapital').value);
        
        if (!name || !capital || capital < 1000) {
            alert('Lütfen geçerli bir portföy adı ve en az $1,000 sermaye girin.');
            return;
        }
        
        try {
            const response = await fetch('/api/portfolio/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: 'demo_user',
                    name: name,
                    initialCapital: capital
                })
            });
            
            if (response.ok) {
                const portfolio = await response.json();
                this.portfolios.push(portfolio);
                this.updatePortfolioDropdown();
                this.hideCreatePortfolioModal();
                
                // Auto-select the new portfolio
                document.getElementById('portfolioDropdown').value = portfolio.id;
                this.selectPortfolio(portfolio.id);
            } else {
                const error = await response.json();
                alert('Portföy oluşturulamadı: ' + error.error);
            }
        } catch (error) {
            console.error('Error creating portfolio:', error);
            alert('Portföy oluşturulurken hata oluştu.');
        }
    }
    
    showTradeModal(type) {
        if (!this.currentPortfolio) {
            alert('Lütfen önce bir portföy seçin.');
            return;
        }
        
        this.currentTradeType = type;
        document.getElementById('tradeModalTitle').textContent = `Hisse ${type === 'BUY' ? 'Al' : 'Sat'}`;
        document.getElementById('tradeModal').style.display = 'block';
        
        // Clear form
        document.getElementById('tradeSymbol').value = '';
        document.getElementById('tradeQuantity').value = '';
        document.getElementById('tradePrice').value = '';
        document.getElementById('tradeCommission').value = '0';
        this.calculateTradeTotal();
    }
    
    hideTradeModal() {
        document.getElementById('tradeModal').style.display = 'none';
    }
    
    calculateTradeTotal() {
        const quantity = parseFloat(document.getElementById('tradeQuantity').value) || 0;
        const price = parseFloat(document.getElementById('tradePrice').value) || 0;
        const commission = parseFloat(document.getElementById('tradeCommission').value) || 0;
        
        const total = (quantity * price) + commission;
        document.getElementById('tradeTotal').textContent = this.formatPrice(total, '$');
    }
    
    async executeTrade() {
        const symbol = document.getElementById('tradeSymbol').value.trim().toUpperCase();
        const quantity = parseInt(document.getElementById('tradeQuantity').value);
        const price = parseFloat(document.getElementById('tradePrice').value);
        const commission = parseFloat(document.getElementById('tradeCommission').value) || 0;
        
        if (!symbol || !quantity || !price) {
            alert('Lütfen tüm alanları doldurun.');
            return;
        }
        
        try {
            const endpoint = this.currentTradeType === 'BUY' ? 'buy' : 'sell';
            const response = await fetch(`/api/portfolio/${this.currentPortfolio.id}/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    symbol: symbol,
                    quantity: quantity,
                    price: price,
                    commission: commission
                })
            });
            
            if (response.ok) {
                const updatedPortfolio = await response.json();
                this.currentPortfolio = updatedPortfolio;
                this.updatePortfolioDisplay();
                this.hideTradeModal();
                
                // Show success message
                const message = this.currentTradeType === 'BUY' ? 
                    `${quantity} adet ${symbol} alındı.` : 
                    `${quantity} adet ${symbol} satıldı.`;
                this.showNotification(message, 'success');
            } else {
                const error = await response.json();
                alert('İşlem başarısız: ' + error.error);
            }
        } catch (error) {
            console.error('Error executing trade:', error);
            alert('İşlem sırasında hata oluştu.');
        }
    }
    
    async showRiskAnalysis() {
        if (!this.currentPortfolio) {
            alert('Lütfen önce bir portföy seçin.');
            return;
        }
        
        try {
            const response = await fetch(`/api/portfolio/${this.currentPortfolio.id}/risk`);
            if (response.ok) {
                const riskMetrics = await response.json();
                this.updateRiskAnalysisDisplay(riskMetrics);
                document.getElementById('riskAnalysisModal').style.display = 'block';
            }
        } catch (error) {
            console.error('Error loading risk analysis:', error);
            alert('Risk analizi yüklenirken hata oluştu.');
        }
    }
    
    updateRiskAnalysisDisplay(metrics) {
        document.getElementById('riskVolatility').textContent = `${(metrics.volatility * 100).toFixed(2)}%`;
        document.getElementById('riskSharpe').textContent = metrics.sharpeRatio.toFixed(2);
        document.getElementById('riskDrawdown').textContent = `${metrics.maxDrawdown.toFixed(2)}%`;
        document.getElementById('riskBeta').textContent = metrics.beta.toFixed(2);
        document.getElementById('riskAlpha').textContent = `${metrics.alpha.toFixed(2)}%`;
    }
    
    hideRiskAnalysisModal() {
        document.getElementById('riskAnalysisModal').style.display = 'none';
    }
    
    showNotification(message, type = 'info') {
        // Simple notification system
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    // Alert System Functions
    async loadAlerts() {
        try {
            const userId = 'demo_user';
            const response = await fetch(`/api/alerts/${userId}`);
            if (response.ok) {
                this.alerts = await response.json();
                this.updateAlertsDisplay();
            }
        } catch (error) {
            console.error('Error loading alerts:', error);
        }
    }
    
    async loadNotifications() {
        try {
            const userId = 'demo_user';
            const response = await fetch(`/api/notifications/${userId}`);
            if (response.ok) {
                this.notifications = await response.json();
                this.unreadNotifications = this.notifications.filter(n => !n.read).length;
                this.updateNotificationsDisplay();
                this.updateNotificationBadge();
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }
    
    updateAlertsDisplay() {
        const container = document.getElementById('alertsContainer');
        if (!container) {
            console.log('Alert container not found, skipping display update');
            return;
        }
        
        container.innerHTML = '';
        
        if (this.alerts.length === 0) {
            container.innerHTML = '<div class="no-alerts">Henüz bildirim yok</div>';
            return;
        }
        
        this.alerts.forEach(alert => {
            const alertItem = document.createElement('div');
            alertItem.className = 'alert-item';
            
            alertItem.innerHTML = `
                <div class="alert-info">
                    <div class="alert-symbol">${alert.symbol}</div>
                    <div class="alert-type">${this.getAlertTypeName(alert.type)}</div>
                    <div class="alert-message">${alert.message || this.generateAlertDescription(alert)}</div>
                </div>
                <div class="alert-status">
                    <span class="status-badge status-${alert.status}">${alert.status}</span>
                    <div class="alert-actions-buttons">
                        ${alert.status === 'active' ? 
                            `<button class="alert-action-btn pause" onclick="this.pauseAlert('${alert.id}')">Duraklat</button>` :
                            `<button class="alert-action-btn resume" onclick="this.resumeAlert('${alert.id}')">Devam</button>`
                        }
                        <button class="alert-action-btn delete" onclick="this.deleteAlert('${alert.id}')">Sil</button>
                    </div>
                </div>
            `;
            
            container.appendChild(alertItem);
        });
    }
    
    updateNotificationsDisplay() {
        const container = document.getElementById('notificationsContainer');
        if (!container) {
            console.log('Notification container not found, skipping display update');
            return;
        }
        
        container.innerHTML = '';
        
        if (this.notifications.length === 0) {
            container.innerHTML = '<div class="no-notifications">Henüz bildirim yok</div>';
            return;
        }
        
        this.notifications.forEach(notification => {
            const notificationItem = document.createElement('div');
            notificationItem.className = 'notification-item';
            
            notificationItem.innerHTML = `
                <div class="notification-info">
                    <div class="notification-symbol">${notification.symbol}</div>
                    <div class="notification-type">${this.getAlertTypeName(notification.type)}</div>
                    <div class="notification-message">${notification.message}</div>
                    <div class="notification-timestamp">${this.formatTimestamp(notification.timestamp)}</div>
                </div>
                <div class="notification-status">
                    <span class="status-badge status-${notification.read ? 'read' : 'unread'}">
                        ${notification.read ? 'Okundu' : 'Okunmadı'}
                    </span>
                </div>
            `;
            
            if (!notification.read) {
                notificationItem.addEventListener('click', () => this.markNotificationAsRead(notification.id));
            }
            
            container.appendChild(notificationItem);
        });
    }
    
    updateNotificationBadge() {
        const badge = document.querySelector('.notification-badge');
        if (badge) {
            badge.textContent = this.unreadNotifications;
            badge.style.display = this.unreadNotifications > 0 ? 'flex' : 'none';
        }
    }
    
    getAlertTypeName(type) {
        const types = {
            'price_above': 'Fiyat Üstü',
            'price_below': 'Fiyat Altı',
            'volume_spike': 'Hacim Patlaması',
            'technical_signal': 'Teknik Sinyal',
            'news_alert': 'Haber Bildirimi'
        };
        return types[type] || type;
    }
    
    generateAlertDescription(alert) {
        const symbol = alert.symbol;
        const condition = alert.condition;
        const value = alert.value;
        
        switch (alert.type) {
            case 'price_above':
                return `Fiyat ${value} TL'nin üstüne çıktığında bildir`;
            case 'price_below':
                return `Fiyat ${value} TL'nin altına düştüğünde bildir`;
            case 'volume_spike':
                return `Hacim ${value}x normal hacim olduğunda bildir`;
            case 'technical_signal':
                return `Teknik sinyal: ${condition}`;
            case 'news_alert':
                return `Yeni haberler için bildir`;
            default:
                return 'Bildirim tetiklendi';
        }
    }
    
    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Az önce';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} dakika önce`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} saat önce`;
        return date.toLocaleDateString('tr-TR');
    }
    
    showCreateAlertModal() {
        document.getElementById('createAlertModal').style.display = 'block';
        
        // Set current symbol if available
        if (this.currentSymbol) {
            document.getElementById('alertSymbol').value = this.currentSymbol;
        }
    }
    
    hideCreateAlertModal() {
        document.getElementById('createAlertModal').style.display = 'none';
        this.clearAlertForm();
    }
    
    clearAlertForm() {
        document.getElementById('alertSymbol').value = '';
        document.getElementById('alertType').value = 'price_above';
        document.getElementById('alertCondition').value = '>';
        document.getElementById('alertValue').value = '';
        document.getElementById('alertMessage').value = '';
        document.getElementById('alertCooldown').value = '5';
        document.getElementById('alertMaxTriggers').value = '1';
        
        // Hide technical group
        document.getElementById('technicalGroup').style.display = 'none';
    }
    
    handleAlertTypeChange(type) {
        const conditionGroup = document.getElementById('conditionGroup');
        const valueGroup = document.getElementById('valueGroup');
        const technicalGroup = document.getElementById('technicalGroup');
        
        if (type === 'technical_signal') {
            conditionGroup.style.display = 'none';
            valueGroup.style.display = 'none';
            technicalGroup.style.display = 'block';
        } else if (type === 'news_alert') {
            conditionGroup.style.display = 'none';
            valueGroup.style.display = 'none';
            technicalGroup.style.display = 'none';
        } else {
            conditionGroup.style.display = 'block';
            valueGroup.style.display = 'block';
            technicalGroup.style.display = 'none';
        }
    }
    
    async createAlert() {
        const symbol = document.getElementById('alertSymbol').value.trim().toUpperCase();
        const type = document.getElementById('alertType').value;
        const condition = type === 'technical_signal' ? 
            document.getElementById('technicalCondition').value : 
            document.getElementById('alertCondition').value;
        const value = type === 'technical_signal' || type === 'news_alert' ? 
            0 : parseFloat(document.getElementById('alertValue').value);
        const message = document.getElementById('alertMessage').value.trim();
        
        if (!symbol) {
            alert('Lütfen hisse kodu girin.');
            return;
        }
        
        if ((type === 'price_above' || type === 'price_below') && !value) {
            alert('Lütfen hedef değer girin.');
            return;
        }
        
        try {
            const response = await fetch('/api/alert/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: 'demo_user',
                    symbol: symbol,
                    type: type,
                    condition: condition,
                    value: value,
                    message: message
                })
            });
            
            if (response.ok) {
                const alert = await response.json();
                this.alerts.push(alert);
                this.updateAlertsDisplay();
                this.hideCreateAlertModal();
                this.showNotification('Bildirim oluşturuldu!', 'success');
            } else {
                const error = await response.json();
                alert('Bildirim oluşturulamadı: ' + error.error);
            }
        } catch (error) {
            console.error('Error creating alert:', error);
            alert('Bildirim oluşturulurken hata oluştu.');
        }
    }
    
    async pauseAlert(alertId) {
        try {
            const response = await fetch(`/api/alert/${alertId}/pause`, { method: 'PUT' });
            if (response.ok) {
                const alert = this.alerts.find(a => a.id === alertId);
                if (alert) alert.status = 'paused';
                this.updateAlertsDisplay();
                this.showNotification('Bildirim duraklatıldı', 'info');
            }
        } catch (error) {
            console.error('Error pausing alert:', error);
        }
    }
    
    async resumeAlert(alertId) {
        try {
            const response = await fetch(`/api/alert/${alertId}/resume`, { method: 'PUT' });
            if (response.ok) {
                const alert = this.alerts.find(a => a.id === alertId);
                if (alert) alert.status = 'active';
                this.updateAlertsDisplay();
                this.showNotification('Bildirim devam ettirildi', 'success');
            }
        } catch (error) {
            console.error('Error resuming alert:', error);
        }
    }
    
    async deleteAlert(alertId) {
        if (!confirm('Bu bildirimi silmek istediğinizden emin misiniz?')) return;
        
        try {
            const response = await fetch(`/api/alert/${alertId}`, { method: 'DELETE' });
            if (response.ok) {
                this.alerts = this.alerts.filter(a => a.id !== alertId);
                this.updateAlertsDisplay();
                this.showNotification('Bildirim silindi', 'info');
            }
        } catch (error) {
            console.error('Error deleting alert:', error);
        }
    }
    
    async markNotificationAsRead(notificationId) {
        try {
            const response = await fetch(`/api/notification/${notificationId}/read`, { method: 'PUT' });
            if (response.ok) {
                const notification = this.notifications.find(n => n.id === notificationId);
                if (notification && !notification.read) {
                    notification.read = true;
                    this.unreadNotifications--;
                    this.updateNotificationsDisplay();
                    this.updateNotificationBadge();
                }
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }
    
    toggleAlertContent() {
        const content = document.getElementById('alertContent');
        const toggle = document.getElementById('alertToggle');
        
        if (content.classList.contains('active')) {
            content.classList.remove('active');
            toggle.innerHTML = '<i class="fas fa-chevron-down"></i>';
        } else {
            content.classList.add('active');
            toggle.innerHTML = '<i class="fas fa-chevron-up"></i>';
        }
    }
    
    switchAlertTab(tabName) {
        // Remove active class from all tabs and content
        document.querySelectorAll('.alert-tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.alert-tab-content').forEach(content => content.classList.remove('active'));
        
        // Add active class to selected tab and content
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}Tab`).classList.add('active');
    }
    
    // Handle WebSocket alert messages
    handleAlertMessage(data) {
        if (data.type === 'alert') {
            const notification = data.data;
            this.notifications.unshift(notification);
            if (!notification.read) {
                this.unreadNotifications++;
            }
            
            this.updateNotificationsDisplay();
            this.updateNotificationBadge();
            
            // Show browser notification if permission granted
            if (Notification.permission === 'granted') {
                new Notification(notification.symbol, {
                    body: notification.message,
                    icon: '/favicon.ico'
                });
            }
        }
    }
    
    // Social Trading Functions (Placeholder)
    showCreateTraderModal() {
        console.log('Create trader modal - coming soon');
    }
    
    toggleSocialContent() {
        const content = document.getElementById('socialContent');
        const toggle = document.getElementById('socialToggle');
        
        if (content.classList.contains('active')) {
            content.classList.remove('active');
            toggle.innerHTML = '<i class="fas fa-chevron-down"></i>';
        } else {
            content.classList.add('active');
            toggle.innerHTML = '<i class="fas fa-chevron-up"></i>';
        }
    }
    
    switchSocialTab(tabName) {
        document.querySelectorAll('.social-tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.social-tab-content').forEach(content => content.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}Tab`).classList.add('active');
    }
    
    searchTraders() {
        console.log('Search traders - coming soon');
    }
    
    // Advanced Chart Functions
    initializeAdvancedChart() {
        try {
            this.advancedChart = new AdvancedChart('stockChart', 'volumeChart');
            console.log('Advanced chart initialized successfully');
        } catch (error) {
            console.error('Error initializing advanced chart:', error);
        }
    }
    
    updateAdvancedChart(symbol) {
        if (this.advancedChart) {
            this.advancedChart.loadChartData();
        }
    }
    
    showStockLoadingState(symbol) {
        // Show loading state for selected stock
        document.getElementById('selectedSymbol').textContent = symbol;
        document.getElementById('selectedName').textContent = 'Veriler yükleniyor...';
        document.getElementById('selectedPrice').textContent = '---';
        document.getElementById('selectedChange').textContent = '---';
        document.getElementById('selectedChange').className = 'stock-change-large';
    }
    
    showStockErrorState(symbol) {
        // Show error state for selected stock
        document.getElementById('selectedSymbol').textContent = symbol;
        document.getElementById('selectedName').textContent = 'Veri yüklenemedi';
        document.getElementById('selectedPrice').textContent = '---';
        document.getElementById('selectedChange').textContent = '---';
        document.getElementById('selectedChange').className = 'stock-change-large';
    }
    
    async fetchStockData(symbol) {
        const headers = {};
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        const response = await fetch(`${this.apiBaseUrl}/stocks/${symbol}`, { headers });
        
        if (!response.ok) {
            if (response.status === 401) {
                this.logout();
                return;
            }
            throw new Error('Failed to fetch stock data');
        }
        
        const stockData = await response.json();
        this.stockData[symbol] = stockData;
        return stockData;
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
            
            const response = await fetch(`${this.apiBaseUrl}/chart/${symbol}?range=${range}`);
            
            if (!response.ok) {
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
        const canvas = document.getElementById('stockChart');
        if (!canvas) {
            console.error('Chart canvas not found');
            return;
        }
        
        if (typeof Chart === 'undefined') {
            console.error('Chart.js not loaded');
            this.showChartError('Chart.js yüklenemedi');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        if (this.chart) {
            this.chart.destroy();
        }
        
        // Validate chart data
        if (!data.timestamps || !data.close || data.timestamps.length === 0) {
            console.error('Invalid chart data:', data);
            this.showChartError('Geçersiz grafik verisi');
            return;
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
        
        try {
        if (this.chartType === 'candlestick') {
            this.createCandlestickChart(ctx, labels, data, currency);
        } else {
            this.createLineChart(ctx, labels, data, currency);
            }
        } catch (error) {
            console.error('Chart creation error:', error);
            this.showChartError('Grafik oluşturulamadı');
        }
    }
    
    createLineChart(ctx, labels, data, currency) {
        try {
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
        } catch (error) {
            console.error('Line chart creation error:', error);
            throw error;
        }
    }
    
    createCandlestickChart(ctx, labels, data, currency) {
        try {
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
        } catch (error) {
            console.error('Candlestick chart creation error:', error);
            throw error;
        }
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
            
            const response = await fetch(`${this.apiBaseUrl}/screener?${params}`);
            if (!response.ok) {
                throw new Error('Failed to fetch screener data');
            }
            
            const data = await response.json();
            this.updateScreener(data);
            
        } catch (error) {
            console.error('Error loading screener data:', error);
            this.showScreenerError('Screener verisi yüklenemedi');
        }
    }
    
    updateScreener(data) {
        const container = document.getElementById('screenerContainer');
        container.innerHTML = '';
        
        if (!data || !Array.isArray(data)) {
            console.error('Invalid screener data:', data);
            this.showScreenerError('Geçersiz screener verisi');
            return;
        }
        
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
            
            item.addEventListener('click', async () => {
                await this.selectStock(stock.symbol);
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
    
    showScreenerError(message) {
        const container = document.getElementById('screenerContainer');
        container.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100px; color: #ff4444;">
                <i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>
                ${message}
            </div>
        `;
    }
    
    async loadNews() {
        // Load news for the currently selected stock
        if (this.currentSymbol) {
            try {
                // Load TradingView news for the selected stock
                const response = await fetch(`${this.apiBaseUrl}/news/tradingview?symbol=${this.currentSymbol}`);
                if (response.ok) {
                    const tradingViewNews = await response.json();
                    this.updateNews(tradingViewNews);
                }
            } catch (error) {
                console.error('Error loading TradingView news:', error);
            }
        }
    }
    
    updateNews(news) {
        const newsContainer = document.getElementById('newsContainer');
        if (!newsContainer) return;
        
        if (!news || news.length === 0) {
            newsContainer.innerHTML = '<div class="empty-state">Haber bulunamadı</div>';
            return;
        }
        
        newsContainer.innerHTML = news.slice(0, 5).map(item => `
            <div class="news-item">
                <div class="news-content">
                    <div class="news-text">${item.text}</div>
                    <div class="news-meta">
                        <span class="news-time">${item.time}</span>
                        <span class="news-source">${item.source}</span>
                        ${item.url && item.url !== '#' ? `<a href="${item.url}" target="_blank" class="news-link"><i class="fas fa-external-link-alt"></i></a>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
        
        // Add click listeners to news items
        document.querySelectorAll('.news-item').forEach(item => {
            item.addEventListener('click', () => {
                item.style.backgroundColor = '#2a2a2a';
                setTimeout(() => {
                    item.style.backgroundColor = '';
                }, 200);
            });
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
                    console.error('Unauthorized access');
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
                <button class="add-to-watchlist-btn" title="Takip listesine ekle">
                    <i class="fas fa-plus"></i>
                </button>
            `;
            
            item.addEventListener('click', async (e) => {
                // Don't trigger if clicking the add button
                if (e.target.closest('.add-to-watchlist-btn')) {
                    e.stopPropagation();
                    this.addToWatchlist(stock.symbol);
                    this.hideSearchResults();
                    document.querySelector('.search-input').value = '';
                    return;
                }
                
                await this.selectStock(stock.symbol);
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
                    console.error('Unauthorized access');
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
    
    async selectStock(symbol) {
        this.currentSymbol = symbol;
        this.updateWatchlist();
        
        // Update display immediately if we have data for this symbol
        if (this.stockData[symbol]) {
        this.updateStockDisplay();
        this.updateTechnicalAnalysis();
        } else {
            // Show loading state for the selected stock
            this.showStockLoadingState(symbol);
            
            // Try to fetch stock data if not available
            try {
                await this.fetchStockData(symbol);
                this.updateStockDisplay();
                this.updateTechnicalAnalysis();
            } catch (error) {
                console.error('Failed to fetch stock data for', symbol, error);
                this.showStockErrorState(symbol);
            }
        }
        
        this.loadChartData(symbol);
        
        // Update advanced chart
        this.updateAdvancedChart(symbol);
        
        // Load TradingView news for the selected stock
        this.loadNews();
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
            this.selectStock(this.watchlist[0]).catch(error => {
                console.error('Error selecting stock after removal:', error);
            });
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
        console.log('🔄 Attempting to hide loading screen...');
        const loadingScreen = document.getElementById('loadingScreen');
        const mainApp = document.getElementById('mainApp');
        const progressBar = document.getElementById('progressBar');
        
        console.log('Loading screen element:', loadingScreen);
        console.log('Main app element:', mainApp);
        
        if (loadingScreen && mainApp) {
            // Complete progress bar
            if (progressBar) {
                progressBar.style.width = '100%';
            }
            
            // Clear progress interval
            if (this.progressInterval) {
                clearInterval(this.progressInterval);
            }
            
            // Hide loading screen and show main app immediately
            loadingScreen.style.display = 'none';
            mainApp.style.display = 'block';
            console.log('✅ Loading screen hidden, main app shown');
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
