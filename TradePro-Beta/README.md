# TradePro Beta

> **Enterprise-Grade Trading Platform** — Gelişmiş özelliklerle donatılmış profesyonel trading platformu

[![Node.js](https://img.shields.io/badge/Node.js-18.0.0+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Beta-blue.svg)](https://github.com/yourusername/TradePro-Beta)
[![Render](https://img.shields.io/badge/Deployed%20on-Render-00f9ff.svg)](https://render.com)

---

## 🚀 Render.com'da Hızlı Deploy

### 1. **Render.com'a Deploy Etme**

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

### 2. **Manuel Deploy Adımları**

1. **Render.com hesabı oluşturun**: [render.com](https://render.com)
2. **Yeni Web Service oluşturun**:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: `Node`
   - **Plan**: `Free` (başlangıç için)

3. **Environment Variables ayarlayın**:
   ```
   NODE_ENV=production
   PORT=10000
   JWT_SECRET=your_secure_jwt_secret_here
   YAHOO_FINANCE_API_KEY=your_yahoo_api_key
   NEWS_API_KEY=your_news_api_key
   REDIS_URL=your_redis_url (opsiyonel)
   ```

4. **Redis Database ekleyin** (opsiyonel):
   - Render Dashboard'da "New +" → "Redis"
   - Free plan seçin
   - Connection string'i environment variable olarak ekleyin

### 3. **Otomatik Deploy**

Bu repository'yi Render.com'a bağladığınızda:
- Her push otomatik deploy tetikler
- `render.yaml` dosyası konfigürasyonu otomatik okur
- Redis database otomatik oluşturulur

---

## 🌟 Öne Çıkan Özellikler

### 🚀 **Enterprise Features**
* 🔴 **Redis Integration**: Dağıtık cache ve pub/sub sistemi
* 📊 **Advanced Technical Analysis**: ATR, Williams %R, Stochastic, CCI, OBV
* 🔌 **Client-Specific WebSocket**: Subscription-based real-time streaming
* 📱 **Progressive Web App**: Offline support, installable, push notifications
* 📈 **Monitoring Dashboard**: Comprehensive system monitoring ve metrics
* 🏗️ **Microservices Architecture**: Scalable ve maintainable kod yapısı

### 📊 **Trading Features**
* 🔍 **Canlı Arama**: Dünya çapında hisse arama
* 📊 **139 Hisse Desteği**: BIST, NASDAQ, NYSE
* ⚡ **Gerçek Zamanlı Fiyatlar**: WebSocket ile anlık güncellemeler
* 📈 **Teknik Analiz Araçları**: RSI, MACD, Bollinger Bands, ATR, Williams %R
* 🌍 **9 Borsa Entegrasyonu**: Küresel erişim
* 📱 **Responsive Tasarım**: Mobil ve masaüstü uyumlu
* 📰 **Canlı Finansal Haberler**: RSS feed'lerden gerçek haberler
* 🔧 **Hisse Screener**: Gelişmiş filtreleme ve analiz
* 📊 **Optimized Performance**: Redis-backed cache sistemi
* 🔔 **Akıllı Bildirimler**: Fiyat ve teknik sinyal uyarıları
* 👥 **Sosyal Trading**: Trader takibi ve liderlik tablosu
* 💼 **Portföy Yönetimi**: Çoklu portföy ve risk analizi
* 🎨 **Premium UI**: Modern ve profesyonel arayüz

---

## 🚀 Hızlı Başlangıç

### 📋 Gereksinimler

* Node.js 18.0.0+
* npm 8.0.0+
* Modern web tarayıcısı
* Redis (opsiyonel, production için önerilen)

### ⚡ Local Kurulum

```bash
# 1. Repository'yi klonlayın
git clone https://github.com/yourusername/TradePro-Beta.git
cd TradePro-Beta

# 2. Bağımlılıkları yükleyin
npm install

# 3. Environment variables ayarlayın
cp .env.example .env
# .env dosyasını düzenleyin ve API key'lerinizi ekleyin

# 4. Sunucuyu başlatın
npm start

# 5. Tarayıcıdan erişin
http://localhost:3000
```

### 🐳 Docker ile Kurulum

```bash
# 1. Docker image'ı build edin
docker build -t tradepro-beta .

# 2. Container'ı çalıştırın
docker run -p 3000:3000 \
  -e JWT_SECRET=your_secret_key \
  -e YAHOO_FINANCE_API_KEY=your_api_key \
  tradepro-beta

# 3. Tarayıcıdan erişin
http://localhost:3000
```

---

## 📊 API Endpoints

### 📊 Stock Data
* `GET /api/stocks` → Tüm hisse verileri
* `GET /api/stocks/:symbol` → Belirli hisse verisi
* `GET /api/stocks/search/:query` → Hisse arama
* `GET /api/stocks/technical/:symbol` → Teknik analiz göstergeleri

### 📰 News & Information
* `GET /api/news/companies` → Şirket haberleri
* `GET /api/news/market` → Piyasa haberleri
* `GET /api/news/tradingview` → Finansal haberler (RSS)
* `GET /api/news/search` → Haber arama

### 🔧 System & Monitoring
* `GET /api/health` → Sistem durumu
* `GET /api/health/ping` → Basit ping testi
* `GET /api/monitoring/dashboard` → Monitoring dashboard
* `GET /api/monitoring/metrics` → Detaylı sistem metrikleri
* `GET /api/monitoring/websocket` → WebSocket istatistikleri
* `GET /api/monitoring/redis` → Redis durumu
* `GET /api/monitoring/cache` → Cache istatistikleri

### 🔌 Real-time Data
* `WebSocket ws://your-domain.com/ws` → Canlı veri akışı
* `WebSocket subscribe` → Hisse aboneliği
* `WebSocket unsubscribe` → Abonelik iptali

---

## 🛠️ Geliştirme

### 🧪 Test

```bash
# Tüm testleri çalıştır
npm test

# Watch mode'da testleri çalıştır
npm run test:watch

# Coverage raporu oluştur
npm run test:coverage
```

### 🔧 Environment Variables

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# Security
JWT_SECRET=your_secure_jwt_secret

# API Keys
YAHOO_FINANCE_API_KEY=your_yahoo_api_key
NEWS_API_KEY=your_news_api_key

# Redis (Render.com için)
REDIS_URL=redis://user:pass@host:port/db

# Monitoring
MONITORING_ENABLED=true
LOG_LEVEL=info
```

---

## 🚀 Render.com Optimizasyonları

### ✅ **Render.com için Hazır**
- ✅ **Port Configuration**: Render.com port (10000) desteği
- ✅ **Environment Variables**: Production-ready konfigürasyon
- ✅ **Redis Integration**: Render Redis ile uyumlu
- ✅ **Health Checks**: `/api/health/ping` endpoint
- ✅ **Static Files**: Frontend dosyaları optimize edildi
- ✅ **Logging**: Production logging konfigürasyonu
- ✅ **CORS**: Render.com domain'leri için ayarlandı
- ✅ **Database**: SQLite geçici dosya sistemi

### 📈 **Performance**
- **Cold Start**: ~10-15 saniye
- **Memory Usage**: ~100-200MB
- **Response Time**: <500ms
- **Uptime**: %99.9+ (Render.com SLA)

---

## 🐛 Sorun Giderme

### ⚠️ Yaygın Sorunlar

| Sorun | Çözüm |
|-------|-------|
| **Deploy başarısız** | Environment variables kontrol edin |
| **Redis bağlantı hatası** | REDIS_URL doğru mu kontrol edin |
| **Port hatası** | PORT=10000 ayarlandığından emin olun |
| **CORS hatası** | Domain whitelist'te mi kontrol edin |
| **Database hatası** | SQLite permissions kontrol edin |

### 🔧 Debug Komutları

```bash
# Health check
curl https://your-app.onrender.com/api/health/ping

# Monitoring dashboard
https://your-app.onrender.com/api/monitoring/dashboard

# Logs (Render Dashboard'dan)
# Render Dashboard → Service → Logs
```

---

## 📞 İletişim & Destek

* **GitHub**: [TradePro-Beta](https://github.com/yourusername/TradePro-Beta)
* **Issues**: [GitHub Issues](https://github.com/yourusername/TradePro-Beta/issues)
* **Render Dashboard**: [render.com](https://render.com/dashboard)
* **Lisans**: MIT License

---

<div align="center">

**🚀 TradePro Beta — Enterprise Trading Platform**
*Render.com'da production-ready trading platform*

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

</div>
