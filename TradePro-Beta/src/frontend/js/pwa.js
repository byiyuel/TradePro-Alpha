// TradePro Alpha PWA Manager
class PWAManager {
  constructor() {
    this.isInstalled = false;
    this.deferredPrompt = null;
    this.swRegistration = null;
    this.isOnline = navigator.onLine;
    
    this.init();
  }

  async init() {
    try {
      // Service Worker registration
      await this.registerServiceWorker();
      
      // Install prompt handling
      this.setupInstallPrompt();
      
      // Online/offline handling
      this.setupOnlineOfflineHandlers();
      
      // Update handling
      this.setupUpdateHandlers();
      
      // Background sync
      this.setupBackgroundSync();
      
      console.log('PWA Manager initialized successfully');
    } catch (error) {
      console.error('PWA Manager initialization failed:', error);
    }
  }

  // Service Worker registration
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        this.swRegistration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', this.swRegistration);
        
        // Check for updates
        this.swRegistration.addEventListener('updatefound', () => {
          console.log('Service Worker update found');
          this.handleServiceWorkerUpdate();
        });
        
        return this.swRegistration;
      } catch (error) {
        console.error('Service Worker registration failed:', error);
        throw error;
      }
    } else {
      console.warn('Service Worker not supported');
      return null;
    }
  }

  // Install prompt setup
  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('PWA install prompt available');
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallButton();
    });

    window.addEventListener('appinstalled', () => {
      console.log('PWA installed successfully');
      this.isInstalled = true;
      this.hideInstallButton();
      this.deferredPrompt = null;
      this.showNotification('TradePro Alpha installed successfully!', 'success');
    });
  }

  // Show install button
  showInstallButton() {
    const installButton = document.getElementById('install-button');
    if (installButton) {
      installButton.style.display = 'block';
      installButton.addEventListener('click', () => this.installApp());
    } else {
      this.createInstallButton();
    }
  }

  // Hide install button
  hideInstallButton() {
    const installButton = document.getElementById('install-button');
    if (installButton) {
      installButton.style.display = 'none';
    }
  }

  // Create install button
  createInstallButton() {
    const button = document.createElement('button');
    button.id = 'install-button';
    button.className = 'install-button';
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
      </svg>
      Install App
    `;
    
    button.addEventListener('click', () => this.installApp());
    
    // Add to header or create floating button
    const header = document.querySelector('header') || document.body;
    header.appendChild(button);
    
    // Style the button
    button.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      background: #00b894;
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(0, 184, 148, 0.3);
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.3s ease;
    `;
    
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-2px)';
      button.style.boxShadow = '0 6px 16px rgba(0, 184, 148, 0.4)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 4px 12px rgba(0, 184, 148, 0.3)';
    });
  }

  // Install app
  async installApp() {
    if (!this.deferredPrompt) {
      console.log('Install prompt not available');
      return;
    }

    try {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      console.log('Install prompt outcome:', outcome);
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      
      this.deferredPrompt = null;
      this.hideInstallButton();
    } catch (error) {
      console.error('Install app failed:', error);
    }
  }

  // Online/offline handlers
  setupOnlineOfflineHandlers() {
    window.addEventListener('online', () => {
      console.log('App is online');
      this.isOnline = true;
      this.showNotification('Connection restored', 'success');
      this.syncOfflineData();
    });

    window.addEventListener('offline', () => {
      console.log('App is offline');
      this.isOnline = false;
      this.showNotification('You are offline', 'warning');
      this.enableOfflineMode();
    });
  }

  // Update handlers
  setupUpdateHandlers() {
    if (this.swRegistration) {
      this.swRegistration.addEventListener('updatefound', () => {
        const newWorker = this.swRegistration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.showUpdateNotification();
            }
          });
        }
      });
    }
  }

  // Handle service worker update
  handleServiceWorkerUpdate() {
    if (this.swRegistration && this.swRegistration.waiting) {
      this.showUpdateNotification();
    }
  }

  // Show update notification
  showUpdateNotification() {
    const updateNotification = document.createElement('div');
    updateNotification.className = 'update-notification';
    updateNotification.innerHTML = `
      <div class="update-content">
        <div class="update-icon">🔄</div>
        <div class="update-text">
          <h4>Update Available</h4>
          <p>A new version of TradePro Alpha is available.</p>
        </div>
        <div class="update-actions">
          <button class="update-button" onclick="pwaManager.updateApp()">Update Now</button>
          <button class="dismiss-button" onclick="pwaManager.dismissUpdate()">Later</button>
        </div>
      </div>
    `;
    
    updateNotification.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      animation: slideDown 0.3s ease;
    `;
    
    document.body.appendChild(updateNotification);
    
    // Add CSS animation
    if (!document.getElementById('pwa-styles')) {
      const style = document.createElement('style');
      style.id = 'pwa-styles';
      style.textContent = `
        @keyframes slideDown {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }
        .update-content {
          display: flex;
          align-items: center;
          gap: 16px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .update-icon {
          font-size: 24px;
        }
        .update-text h4 {
          margin: 0 0 4px 0;
          font-size: 16px;
        }
        .update-text p {
          margin: 0;
          font-size: 14px;
          opacity: 0.9;
        }
        .update-actions {
          display: flex;
          gap: 12px;
          margin-left: auto;
        }
        .update-button, .dismiss-button {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s ease;
        }
        .update-button {
          background: white;
          color: #667eea;
        }
        .update-button:hover {
          background: #f8f9fa;
        }
        .dismiss-button {
          background: transparent;
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .dismiss-button:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `;
      document.head.appendChild(style);
    }
  }

  // Update app
  updateApp() {
    if (this.swRegistration && this.swRegistration.waiting) {
      this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }

  // Dismiss update
  dismissUpdate() {
    const notification = document.querySelector('.update-notification');
    if (notification) {
      notification.remove();
    }
  }

  // Background sync setup
  setupBackgroundSync() {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      console.log('Background sync supported');
    } else {
      console.log('Background sync not supported');
    }
  }

  // Sync offline data
  async syncOfflineData() {
    try {
      // Sync stock subscriptions
      await this.syncStockSubscriptions();
      
      // Sync portfolio updates
      await this.syncPortfolioUpdates();
      
      console.log('Offline data synced successfully');
    } catch (error) {
      console.error('Failed to sync offline data:', error);
    }
  }

  // Sync stock subscriptions
  async syncStockSubscriptions() {
    const subscriptions = this.getStoredSubscriptions();
    if (subscriptions.length > 0) {
      try {
        await fetch('/api/stocks/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbols: subscriptions })
        });
        console.log('Stock subscriptions synced');
      } catch (error) {
        console.error('Failed to sync subscriptions:', error);
      }
    }
  }

  // Sync portfolio updates
  async syncPortfolioUpdates() {
    const updates = this.getStoredPortfolioUpdates();
    for (const update of updates) {
      try {
        await fetch('/api/portfolio/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(update)
        });
      } catch (error) {
        console.error('Failed to sync portfolio update:', error);
      }
    }
  }

  // Enable offline mode
  enableOfflineMode() {
    // Show offline indicator
    this.showOfflineIndicator();
    
    // Disable real-time features
    this.disableRealTimeFeatures();
  }

  // Show offline indicator
  showOfflineIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'offline-indicator';
    indicator.innerHTML = '📡 Offline Mode';
    indicator.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #ff6b6b;
      color: white;
      text-align: center;
      padding: 8px;
      font-size: 14px;
      font-weight: 600;
      z-index: 9999;
    `;
    document.body.appendChild(indicator);
  }

  // Hide offline indicator
  hideOfflineIndicator() {
    const indicator = document.getElementById('offline-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  // Disable real-time features
  disableRealTimeFeatures() {
    // Disable WebSocket connections
    if (window.wsConnection) {
      window.wsConnection.close();
    }
    
    // Show cached data
    this.showCachedData();
  }

  // Show cached data
  showCachedData() {
    // This would show cached stock data, portfolio, etc.
    console.log('Showing cached data');
  }

  // Show notification
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#00b894' : type === 'warning' ? '#fdcb6e' : '#74b9ff'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Get stored subscriptions
  getStoredSubscriptions() {
    try {
      return JSON.parse(localStorage.getItem('stockSubscriptions') || '[]');
    } catch (error) {
      console.error('Failed to get stored subscriptions:', error);
      return [];
    }
  }

  // Get stored portfolio updates
  getStoredPortfolioUpdates() {
    try {
      return JSON.parse(localStorage.getItem('portfolioUpdates') || '[]');
    } catch (error) {
      console.error('Failed to get stored portfolio updates:', error);
      return [];
    }
  }

  // Check if app is installed
  checkInstallStatus() {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
      console.log('App is running in standalone mode');
    }
  }

  // Get app info
  getAppInfo() {
    return {
      isInstalled: this.isInstalled,
      isOnline: this.isOnline,
      hasServiceWorker: 'serviceWorker' in navigator,
      hasBackgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
      swRegistration: this.swRegistration
    };
  }
}

// Initialize PWA Manager
const pwaManager = new PWAManager();

// Make it globally available
window.pwaManager = pwaManager;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PWAManager;
}

