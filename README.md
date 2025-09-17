# TradePro Alpha

> **Modern Trading Platform** — Gerçek zamanlı verilerle çalışan profesyonel trading platformu

[![Node.js](https://img.shields.io/badge/Node.js-16.0.0+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Alpha-orange.svg)](https://github.com/byiyuel/TradePro-Alpha)

---

## 🌟 Öne Çıkan Özellikler

* 🔍 **Canlı Arama**: Dünya çapında hisse arama
* 📊 **139 Hisse Desteği**: BIST, NASDAQ, NYSE
* ⚡ **Gerçek Zamanlı Fiyatlar**: WebSocket ile anlık güncellemeler
* 📈 **Teknik Analiz Araçları**: RSI, MACD, Bollinger Bands
* 🌍 **9 Borsa Entegrasyonu**: Küresel erişim
* 📱 **Responsive Tasarım**: Mobil ve masaüstü uyumlu
* 📰 **Canlı Finansal Haberler**: RSS feed'lerden gerçek haberler
* 🔧 **Hisse Screener**: Gelişmiş filtreleme ve analiz
* 📊 **Optimized Performance**: 30 dakika cache sistemi
* 🔔 **Akıllı Bildirimler**: Fiyat ve teknik sinyal uyarıları
* 👥 **Sosyal Trading**: Trader takibi ve liderlik tablosu
* 💼 **Portföy Yönetimi**: Çoklu portföy ve risk analizi
* 🎨 **Premium UI**: Modern ve profesyonel arayüz

---

## 🚀 Hızlı Başlangıç

### 📋 Gereksinimler

* Node.js 16.0.0+
* npm 8.0.0+
* Modern web tarayıcısı
* Docker (opsiyonel)

### ⚡ Kurulum

#### Yöntem 1: NPM ile Kurulum

```bash
# 1. Bağımlılıkları yükleyin
npm install

# 2. Environment variables ayarlayın
cp .env.example .env
# .env dosyasını düzenleyin ve API key'lerinizi ekleyin

# 3. Sunucuyu başlatın
npm start

# 4. Tarayıcıdan erişin
http://localhost:3000
```

#### Yöntem 2: Docker ile Kurulum

```bash
# 1. Docker image'ı build edin
docker build -t tradepro-alpha .

# 2. Container'ı çalıştırın
docker run -p 3000:3000 \
  -e JWT_SECRET=your_secret_key \
  -e YAHOO_FINANCE_API_KEY=your_api_key \
  tradepro-alpha

# 3. Tarayıcıdan erişin
http://localhost:3000
```

#### Yöntem 3: Docker Compose ile Kurulum

```bash
# 1. Environment variables ayarlayın
cp .env.example .env

# 2. Docker Compose ile başlatın
docker-compose up -d

# 3. Tarayıcıdan erişin
http://localhost:3000
```

### 🎯 İlk Kullanım

1. **Arama**: Header’daki arama kutusuna hisse adını girin
2. **Takip Etme**: “+” butonuna basarak hisse ekleyin
3. **Analiz**: Grafik ve teknik göstergeleri görüntüleyin
4. **Takip Listesi**: Eklediğiniz hisseleri yönetin

---

## 📊 Özellikler

### 🔍 Canlı Arama

* **Global Hisse Arama**: 9 borsa desteği
* **Anlık Sonuçlar**: Yazarken eşzamanlı arama
* **Cache Sistemi**: 30 dakika optimize edilmiş cache

### 📈 Teknik Analiz

* RSI, MACD, SMA (20/50)
* Bollinger Bands
* Stochastic Oscillator
* **Otomatik AL/SAT/BEKLE** sinyalleri

### ⚡ Gerçek Zamanlı Veriler

* Yahoo Finance API entegrasyonu
* WebSocket ile 1 dakikada bir güncelleme (optimized)
* TRY ve USD desteği
* 139 hisse için sürekli veri akışı

### 📰 Canlı Finansal Haberler

* RSS feed'lerden gerçek finansal haberler
* Yahoo Finance, MarketWatch, Bloomberg entegrasyonu
* Şirket ve piyasa haberleri ayrımı
* 30 dakika cache sistemi ile optimize edilmiş performans

### 🔧 Hisse Screener

* Gelişmiş filtreleme sistemi
* Fiyat, hacim, değişim oranı filtreleri
* Teknik analiz göstergelerine göre sıralama
* Gerçek zamanlı verilerle güncellenen liste

### 🔔 Akıllı Bildirimler

* Fiyat seviyesi uyarıları (üst/alt)
* Teknik sinyal bildirimleri (RSI, MACD)
* Hacim patlaması uyarıları
* Özelleştirilebilir bildirim kuralları
* Gerçek zamanlı push bildirimleri

### 👥 Sosyal Trading

* Trader takip sistemi
* Liderlik tablosu ve performans sıralaması
* Sosyal trading akışı
* Trader arama ve filtreleme
* Performans istatistikleri

### 💼 Portföy Yönetimi

* Çoklu portföy desteği
* Gerçek zamanlı portföy değeri
* Risk analizi ve metrikleri
* Alım/satım işlemleri
* Performans takibi ve raporlama

### 🎨 Premium UI/UX

* Modern ve profesyonel tasarım
* Responsive grid layout sistemi
* Smooth animasyonlar ve geçişler
* Dark theme optimizasyonu
* Touch-friendly mobil arayüz

---

### 🌍 Desteklenen Borsalar (Canlı Arama ile)

* 🇺🇸 NASDAQ
* 🇺🇸 NYSE
* 🇹🇷 BIST
* 🇨🇦 TSX
* 🇬🇧 LSE
* 🇫🇷 EPA
* 🇩🇪 ETR
* 🇭🇰 HKG
* 🇯🇵 TYO
* 🇨🇳 SHA/SHE

---

## 🎨 Kullanım Kılavuzu

### 🔍 Canlı Arama

1. Header’daki kutuya en az 3 karakter girin
2. Anlık sonuçlar listelenecek
3. Global hisse desteği mevcut

### ⭐ Takip Listesi

1. Sol panelden “+” butonuna tıklayın
2. İstediğiniz hisseyi seçin
3. Eklediğiniz hisseleri listeden yönetin

### 📈 Grafik & Analiz

1. Takip listenizden hisse seçin
2. Zaman dilimi: 1D, 1H, 1G, 1A
3. Teknik göstergeleri inceleyin
4. AL/SAT/BEKLE sinyallerini takip edin

### 📰 Haber Sistemi

1. Ana sayfada seçili hisse haberleri görünür
2. "Haberler" butonuna tıklayarak tüm haberleri görün
3. Şirket, piyasa ve finansal haberleri filtreleyin
4. RSS feed'lerden gerçek zamanlı haberler

### 🔧 Hisse Screener

1. Sol panelden "Screener" sekmesine geçin
2. Fiyat, hacim, değişim oranı filtrelerini ayarlayın
3. Teknik göstergelere göre sıralayın
4. İstediğiniz hisseyi tıklayarak analiz edin

### 🔔 Bildirimler

1. Navbar'daki "Bildirimler" butonuna tıklayın
2. "Yeni Bildirim" ile özel uyarılar oluşturun
3. Fiyat, hacim veya teknik sinyal kuralları belirleyin
4. Bildirimlerinizi gerçek zamanlı takip edin

### 👥 Sosyal Trading

1. Navbar'daki "Sosyal Trading" butonuna tıklayın
2. "Akış" sekmesinde trader aktivitelerini görün
3. "Liderlik" sekmesinde en iyi traderları inceleyin
4. "Traderlar" sekmesinde trader arama yapın

### 💼 Portföy Yönetimi

1. Navbar'daki "Portföy" butonuna tıklayın
2. "Yeni Portföy" ile portföy oluşturun
3. Portföy seçerek pozisyonlarınızı görün
4. "Al/Sat" butonları ile işlem yapın
5. "Risk Analizi" ile portföy riskinizi değerlendirin

---

## 🔧 Teknik Detaylar

### Backend

* Node.js & Express.js
* WebSocket (real-time)
* SQLite veritabanı
* Yahoo Finance API
* NewsAPI entegrasyonu
* RSS feed parsing
* 30 dakikalık cache sistemi (optimized)

### Frontend

* HTML5, CSS3, JavaScript (ES6+)
* Chart.js grafikler
* Premium CSS Grid Layout sistemi
* Responsive tasarım (mobile-first)
* Optimize edilmiş arama (500ms debounce)
* Hisse screener arayüzü
* Canlı haber akışı
* Navbar dropdown sistemi
* Touch-friendly arayüz
* Smooth animasyonlar ve geçişler

### API Endpoints

#### 📊 Stock Data
* `GET /api/stocks` → Tüm hisse verileri
* `GET /api/stocks/:symbol` → Belirli hisse verisi
* `GET /api/stocks/search/:query` → Hisse arama
* `GET /api/stocks/technical/:symbol` → Teknik analiz göstergeleri

#### 📰 News & Information
* `GET /api/news/companies` → Şirket haberleri
* `GET /api/news/market` → Piyasa haberleri
* `GET /api/news/tradingview` → Finansal haberler (RSS)
* `GET /api/news/search` → Haber arama

#### 🔔 Alerts & Notifications
* `GET /api/alerts` → Kullanıcı bildirimleri
* `POST /api/alerts` → Yeni bildirim oluşturma
* `PUT /api/alerts/:id` → Bildirim güncelleme
* `DELETE /api/alerts/:id` → Bildirim silme

#### 💼 Portfolio Management
* `GET /api/portfolios` → Portföy listesi
* `POST /api/portfolios` → Yeni portföy oluşturma
* `GET /api/portfolios/:id` → Portföy detayları
* `POST /api/portfolios/:id/transactions` → İşlem ekleme

#### 👥 Social Trading
* `GET /api/social/traders` → Trader listesi
* `GET /api/social/leaderboard` → Liderlik tablosu
* `GET /api/social/feed` → Sosyal trading akışı

#### 🔧 System & Monitoring
* `GET /api/health` → Sistem durumu
* `GET /api/health/ping` → Basit ping testi
* `GET /api/monitoring/dashboard` → Monitoring dashboard
* `GET /api/monitoring/metrics` → Detaylı sistem metrikleri
* `GET /api/monitoring/websocket` → WebSocket istatistikleri
* `GET /api/monitoring/redis` → Redis durumu
* `GET /api/monitoring/cache` → Cache istatistikleri
* `POST /api/monitoring/performance-test` → Performans testi

#### 🔌 Real-time Data
* `WebSocket ws://localhost:3000/ws` → Canlı veri akışı
* `WebSocket subscribe` → Hisse aboneliği
* `WebSocket unsubscribe` → Abonelik iptali

---

## 🐛 Sorun Giderme

### ⚠️ Yaygın Sorunlar

| Sorun                    | Çözüm                                            |
| ------------------------ | ------------------------------------------------ |
| **Port 3000 kullanımda** | `taskkill /f /im node.exe` ile Node.js'i kapatın |
| **Veri gelmiyor**        | İnternet ve API bağlantısını kontrol edin        |
| **Grafik yüklenmiyor**   | Chart.js erişimini kontrol edin                  |
| **Arama çalışmıyor**     | En az 3 karakter girildiğinden emin olun         |
| **Dropdown açılmıyor**   | JavaScript konsol hatalarını kontrol edin        |
| **Mobil görünüm bozuk**  | Tarayıcı cache'ini temizleyin                     |
| **Bildirimler çalışmıyor** | Tarayıcı bildirim izinlerini kontrol edin       |

### 🔧 Debug Komutları

```bash
# Port kontrolü
netstat -an | findstr :3000

# Node.js versiyonu
node --version

# Bağımlılıkları yeniden yükle
npm install

# Server loglarını kontrol et
curl http://localhost:3000/api/health

# Haber API'lerini test et
curl http://localhost:3000/api/news/tradingview
curl http://localhost:3000/api/news/companies
```

---

## 🆕 Son Güncellemeler

### v3.2.0 - Advanced Features & Enterprise Ready

* ✅ **Redis Entegrasyonu**: Dağıtık cache ve pub/sub sistemi
* ✅ **Advanced Technical Analysis**: ATR, Williams %R, Stochastic, CCI, OBV
* ✅ **Client-Specific WebSocket**: Subscription-based real-time streaming
* ✅ **Progressive Web App**: Offline support, installable, push notifications
* ✅ **Monitoring Dashboard**: Comprehensive system monitoring ve metrics
* ✅ **Enterprise Architecture**: Microservices-ready, scalable design
* ✅ **Background Sync**: Offline data synchronization
* ✅ **Service Worker**: Advanced caching strategies
* ✅ **Performance Optimization**: Memory management, connection pooling

### v3.1.0 - Güvenlik & Altyapı İyileştirmeleri

* ✅ **Güvenlik Paketleri**: Helmet, Rate Limiting, CORS koruması
* ✅ **Environment Variables**: Güvenli konfigürasyon yönetimi
* ✅ **Modüler Kod Yapısı**: Routes, Services, Utils, Middleware ayrımı
* ✅ **Gelişmiş Logging**: Winston ile profesyonel log yönetimi
* ✅ **Error Handling**: Kapsamlı hata yakalama ve yönetimi
* ✅ **Cache Sistemi**: Gelişmiş cache mekanizması ve invalidation
* ✅ **API Service**: Yeniden kullanılabilir API wrapper'ları
* ✅ **Test Altyapısı**: Jest ile unit ve integration testleri
* ✅ **Docker Desteği**: Multi-stage build ve production-ready container
* ✅ **Health Checks**: Sistem sağlık kontrolü ve monitoring
* ✅ **Performance**: Compression, request logging, memory management

### v3.0.0 - Premium UI & Yeni Özellikler

* ✅ **Premium UI/UX**: Modern ve profesyonel arayüz tasarımı
* ✅ **Navbar Dropdown Sistemi**: Bildirimler, Sosyal Trading, Portföy
* ✅ **Akıllı Bildirimler**: Fiyat ve teknik sinyal uyarıları
* ✅ **Sosyal Trading**: Trader takibi ve liderlik tablosu
* ✅ **Portföy Yönetimi**: Çoklu portföy ve risk analizi
* ✅ **Responsive Grid Layout**: Tüm ekran boyutları için optimize
* ✅ **Touch-Friendly**: Mobil cihazlar için dokunma optimizasyonu
* ✅ **Smooth Animations**: Premium geçiş efektleri
* ✅ **Error Handling**: Gelişmiş JavaScript hata yakalama
* ✅ **Performance**: Optimize edilmiş DOM manipülasyonu

### v2.1.0 - Haber Sistemi & Performans İyileştirmeleri

* ✅ **Canlı Finansal Haberler**: RSS feed'lerden gerçek haberler
* ✅ **Hisse Screener**: Gelişmiş filtreleme sistemi
* ✅ **Performans Optimizasyonu**: 30 dakika cache sistemi
* ✅ **WebSocket İyileştirmeleri**: 1 dakika update interval
* ✅ **Error Handling**: Gelişmiş hata yakalama ve logging
* ✅ **API Entegrasyonu**: NewsAPI ve RSS feed desteği
* ✅ **Authentication Removal**: Giriş sistemi kaldırıldı
* ✅ **News Page**: Ayrı haber sayfası eklendi

### v2.0.0 - Temel Özellikler

* ✅ **139 Hisse Desteği**: BIST, NASDAQ, NYSE
* ✅ **Canlı Arama**: 9 borsa entegrasyonu
* ✅ **Teknik Analiz**: RSI, MACD, Bollinger Bands
* ✅ **Real-time Data**: WebSocket ile anlık güncellemeler

---

## ⚠️ Notlar

* **Eğitim Amaçlıdır**: Gerçek yatırımlar için profesyonel platformlar kullanın
* **API Limitleri**: Yahoo Finance API sınırlıdır
* **Güvenlik**: Gerçek trading için ek güvenlik önlemleri gerekir

---

## 🤝 Katkıda Bulunma

1. Repository’yi fork’layın
2. Feature branch oluşturun (`git checkout -b feature/AmazingFeature`)
3. Commit yapın (`git commit -m 'Add some AmazingFeature'`)
4. Push edin (`git push origin feature/AmazingFeature`)
5. Pull Request açın

### 🛠️ Geliştirme Kurulumu

```bash
# Repository'yi klonlayın
git clone https://github.com/byiyuel/TradePro-Alpha.git
cd TradePro-Alpha

# Bağımlılıkları yükleyin
npm install

# Environment variables ayarlayın
cp .env.example .env

# Development modunda başlatın
npm run dev

# Testleri çalıştırın
npm test

# Test coverage raporu
npm run test:coverage
```

### 🧪 Test

```bash
# Tüm testleri çalıştır
npm test

# Watch mode'da testleri çalıştır
npm run test:watch

# Coverage raporu oluştur
npm run test:coverage

# Belirli bir test dosyasını çalıştır
npm test -- tests/health.test.js
```

### 🐳 Docker Geliştirme

```bash
# Development container'ı başlat
docker-compose --profile dev up -d

# Container loglarını takip et
docker-compose logs -f tradepro-dev

# Container'a bağlan
docker-compose exec tradepro-dev sh
```

---

## 📞 İletişim & Destek

* **GitHub**: [TradePro-Alpha](https://github.com/byiyuel/TradePro-Alpha)
* **Issues**: [GitHub Issues](https://github.com/byiyuel/TradePro-Alpha/issues)
* **E-posta**: [baranyucel643@gmail.com](mailto:baranyucel643@gmail.com)
* **Lisans**: MIT License

---

<div align="center">

**🚀 TradePro Alpha — Modern Trading Platform**
*Gerçek zamanlı verilerle profesyonel trading deneyimi*

</div>
