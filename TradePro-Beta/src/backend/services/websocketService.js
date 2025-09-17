const WebSocket = require('ws');
const logger = require('../utils/logger');
const redisService = require('./redisService');
const config = require('../config/environment');

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // clientId -> { ws, subscriptions, lastPing }
    this.subscriptions = new Map(); // symbol -> Set of clientIds
    this.heartbeatInterval = null;
    this.dataUpdateInterval = null;
    this.isInitialized = false;
  }

  // WebSocket server'ı başlat
  initialize(server) {
    try {
      this.wss = new WebSocket.Server({ 
        server,
        path: '/ws',
        maxPayload: 1024 * 1024, // 1MB
        perMessageDeflate: false // Compression'ı kapat (Redis pub/sub ile çakışabilir)
      });

      this.wss.on('connection', (ws, req) => {
        this.handleConnection(ws, req);
      });

      // Heartbeat başlat
      this.startHeartbeat();
      
      // Data update loop başlat
      this.startDataUpdateLoop();

      this.isInitialized = true;
      logger.info('WebSocket service initialized');
      return true;
    } catch (error) {
      logger.error('WebSocket initialization error:', error);
      return false;
    }
  }

  // Yeni bağlantı işleme
  handleConnection(ws, req) {
    const clientId = this.generateClientId();
    const clientIP = req.socket.remoteAddress;
    
    // Client bilgilerini sakla
    this.clients.set(clientId, {
      ws,
      subscriptions: new Set(),
      lastPing: Date.now(),
      ip: clientIP,
      connectedAt: new Date().toISOString()
    });

    logger.info(`WebSocket client connected: ${clientId} from ${clientIP}`);

    // Welcome mesajı gönder
    this.sendToClient(clientId, {
      type: 'welcome',
      clientId,
      message: 'Connected to TradePro Alpha WebSocket',
      timestamp: new Date().toISOString(),
      features: ['real-time-data', 'subscriptions', 'notifications']
    });

    // Mesaj dinleyicileri
    ws.on('message', (message) => {
      this.handleMessage(clientId, message);
    });

    ws.on('pong', () => {
      this.handlePong(clientId);
    });

    ws.on('close', (code, reason) => {
      this.handleDisconnection(clientId, code, reason);
    });

    ws.on('error', (error) => {
      this.handleError(clientId, error);
    });
  }

  // Mesaj işleme
  handleMessage(clientId, message) {
    try {
      const data = JSON.parse(message);
      logger.debug(`WebSocket message from ${clientId}:`, data);

      switch (data.type) {
        case 'subscribe':
          this.handleSubscribe(clientId, data.symbols);
          break;
        
        case 'unsubscribe':
          this.handleUnsubscribe(clientId, data.symbols);
          break;
        
        case 'ping':
          this.handlePing(clientId);
          break;
        
        case 'get_status':
          this.sendClientStatus(clientId);
          break;
        
        case 'get_subscriptions':
          this.sendSubscriptions(clientId);
          break;
        
        default:
          this.sendToClient(clientId, {
            type: 'error',
            message: 'Unknown message type',
            timestamp: new Date().toISOString()
          });
      }
    } catch (error) {
      logger.error(`WebSocket message error from ${clientId}:`, error);
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Invalid message format',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Subscribe işlemi
  handleSubscribe(clientId, symbols) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const validSymbols = Array.isArray(symbols) ? symbols : [symbols];
    const subscribedSymbols = [];

    for (const symbol of validSymbols) {
      if (this.isValidSymbol(symbol)) {
        // Client'a symbol ekle
        client.subscriptions.add(symbol);
        
        // Symbol'a client ekle
        if (!this.subscriptions.has(symbol)) {
          this.subscriptions.set(symbol, new Set());
        }
        this.subscriptions.get(symbol).add(clientId);
        
        subscribedSymbols.push(symbol);
      }
    }

    // Redis'e subscribe et
    this.subscribeToRedisSymbols(subscribedSymbols);

    this.sendToClient(clientId, {
      type: 'subscribed',
      symbols: subscribedSymbols,
      totalSubscriptions: client.subscriptions.size,
      timestamp: new Date().toISOString()
    });

    logger.debug(`Client ${clientId} subscribed to:`, subscribedSymbols);
  }

  // Unsubscribe işlemi
  handleUnsubscribe(clientId, symbols) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const validSymbols = Array.isArray(symbols) ? symbols : [symbols];
    const unsubscribedSymbols = [];

    for (const symbol of validSymbols) {
      if (client.subscriptions.has(symbol)) {
        // Client'tan symbol kaldır
        client.subscriptions.delete(symbol);
        
        // Symbol'dan client kaldır
        if (this.subscriptions.has(symbol)) {
          this.subscriptions.get(symbol).delete(clientId);
          
          // Eğer symbol'da hiç client kalmadıysa, Redis'ten unsubscribe et
          if (this.subscriptions.get(symbol).size === 0) {
            this.subscriptions.delete(symbol);
            this.unsubscribeFromRedisSymbol(symbol);
          }
        }
        
        unsubscribedSymbols.push(symbol);
      }
    }

    this.sendToClient(clientId, {
      type: 'unsubscribed',
      symbols: unsubscribedSymbols,
      totalSubscriptions: client.subscriptions.size,
      timestamp: new Date().toISOString()
    });

    logger.debug(`Client ${clientId} unsubscribed from:`, unsubscribedSymbols);
  }

  // Ping işlemi
  handlePing(clientId) {
    const client = this.clients.get(clientId);
    if (client) {
      client.lastPing = Date.now();
      this.sendToClient(clientId, {
        type: 'pong',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Pong işlemi
  handlePong(clientId) {
    const client = this.clients.get(clientId);
    if (client) {
      client.lastPing = Date.now();
    }
  }

  // Bağlantı kesilme işlemi
  handleDisconnection(clientId, code, reason) {
    const client = this.clients.get(clientId);
    if (!client) return;

    logger.info(`WebSocket client disconnected: ${clientId} (${code}) - ${reason}`);

    // Tüm subscription'ları temizle
    for (const symbol of client.subscriptions) {
      if (this.subscriptions.has(symbol)) {
        this.subscriptions.get(symbol).delete(clientId);
        
        if (this.subscriptions.get(symbol).size === 0) {
          this.subscriptions.delete(symbol);
          this.unsubscribeFromRedisSymbol(symbol);
        }
      }
    }

    // Client'ı kaldır
    this.clients.delete(clientId);
  }

  // Hata işleme
  handleError(clientId, error) {
    logger.error(`WebSocket error for client ${clientId}:`, error);
    this.handleDisconnection(clientId, 1006, 'Error occurred');
  }

  // Client'a mesaj gönder
  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      client.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      logger.error(`Error sending message to client ${clientId}:`, error);
      this.handleDisconnection(clientId, 1006, 'Send error');
      return false;
    }
  }

  // Symbol'a subscribe olan tüm client'lara mesaj gönder
  broadcastToSymbol(symbol, message) {
    const subscribers = this.subscriptions.get(symbol);
    if (!subscribers) return 0;

    let sentCount = 0;
    for (const clientId of subscribers) {
      if (this.sendToClient(clientId, message)) {
        sentCount++;
      }
    }

    logger.debug(`Broadcasted ${symbol} to ${sentCount} clients`);
    return sentCount;
  }

  // Tüm client'lara mesaj gönder
  broadcastToAll(message) {
    let sentCount = 0;
    for (const [clientId] of this.clients) {
      if (this.sendToClient(clientId, message)) {
        sentCount++;
      }
    }
    return sentCount;
  }

  // Redis symbol subscription
  async subscribeToRedisSymbols(symbols) {
    try {
      for (const symbol of symbols) {
        await redisService.subscribe(`stock:${symbol}`, (data) => {
          this.broadcastToSymbol(symbol, {
            type: 'stock_update',
            symbol,
            data,
            timestamp: new Date().toISOString()
          });
        });
      }
    } catch (error) {
      logger.error('Redis subscription error:', error);
    }
  }

  // Redis symbol unsubscription
  async unsubscribeFromRedisSymbol(symbol) {
    try {
      await redisService.subscriber?.unsubscribe(`stock:${symbol}`);
    } catch (error) {
      logger.error(`Redis unsubscription error for ${symbol}:`, error);
    }
  }

  // Heartbeat başlat
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeout = config.wsHeartbeatInterval * 2; // 2x heartbeat interval

      for (const [clientId, client] of this.clients) {
        if (now - client.lastPing > timeout) {
          logger.warn(`Client ${clientId} heartbeat timeout`);
          this.handleDisconnection(clientId, 1006, 'Heartbeat timeout');
        } else {
          // Ping gönder
          if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.ping();
          }
        }
      }
    }, config.wsHeartbeatInterval);
  }

  // Data update loop başlat
  startDataUpdateLoop() {
    this.dataUpdateInterval = setInterval(async () => {
      try {
        // Aktif symbol'ları al
        const activeSymbols = Array.from(this.subscriptions.keys());
        
        if (activeSymbols.length === 0) return;

        // Her symbol için veri güncelle
        for (const symbol of activeSymbols) {
          await this.updateSymbolData(symbol);
        }
      } catch (error) {
        logger.error('Data update loop error:', error);
      }
    }, 60000); // 1 dakikada bir güncelle
  }

  // Symbol verisini güncelle
  async updateSymbolData(symbol) {
    try {
      // Burada gerçek API çağrısı yapılacak
      // Şimdilik mock data gönderelim
      const mockData = {
        symbol,
        price: Math.random() * 100 + 50,
        change: (Math.random() - 0.5) * 10,
        changePercent: (Math.random() - 0.5) * 5,
        volume: Math.floor(Math.random() * 1000000),
        timestamp: new Date().toISOString()
      };

      // Redis'e publish et
      await redisService.publish(`stock:${symbol}`, mockData);
    } catch (error) {
      logger.error(`Symbol data update error for ${symbol}:`, error);
    }
  }

  // Client status gönder
  sendClientStatus(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    this.sendToClient(clientId, {
      type: 'client_status',
      clientId,
      status: {
        connected: true,
        subscriptions: client.subscriptions.size,
        connectedAt: client.connectedAt,
        lastPing: new Date(client.lastPing).toISOString()
      },
      timestamp: new Date().toISOString()
    });
  }

  // Subscriptions gönder
  sendSubscriptions(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    this.sendToClient(clientId, {
      type: 'subscriptions',
      symbols: Array.from(client.subscriptions),
      count: client.subscriptions.size,
      timestamp: new Date().toISOString()
    });
  }

  // Symbol geçerliliği kontrolü
  isValidSymbol(symbol) {
    // Basit symbol validation
    return typeof symbol === 'string' && 
           symbol.length > 0 && 
           symbol.length < 20 &&
           /^[A-Z0-9.]+$/.test(symbol);
  }

  // Client ID oluştur
  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // İstatistikler
  getStats() {
    return {
      totalClients: this.clients.size,
      totalSubscriptions: Array.from(this.subscriptions.values()).reduce((sum, set) => sum + set.size, 0),
      activeSymbols: this.subscriptions.size,
      clients: Array.from(this.clients.entries()).map(([id, client]) => ({
        id,
        subscriptions: client.subscriptions.size,
        connectedAt: client.connectedAt,
        ip: client.ip
      }))
    };
  }

  // Temizlik
  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.dataUpdateInterval) {
      clearInterval(this.dataUpdateInterval);
    }
    
    // Tüm client'ları kapat
    for (const [clientId] of this.clients) {
      this.handleDisconnection(clientId, 1000, 'Server shutdown');
    }
    
    logger.info('WebSocket service cleaned up');
  }
}

// Singleton instance
const websocketService = new WebSocketService();

module.exports = websocketService;

