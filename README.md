# TradePro Alpha - Advanced Trading Platform

Modern, gerçek zamanlı verilerle çalışan profesyonel trading platformu. BIST, NASDAQ ve NYSE hisselerini destekler.

[![Node.js](https://img.shields.io/badge/Node.js-16.0.0+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Alpha-orange.svg)](https://github.com/yourusername/TradePro-Alpha)

## 🚀 Özellikler

### 📊 Gerçek Zamanlı Veriler
- Yahoo Finance API entegrasyonu
- WebSocket ile anlık fiyat güncellemeleri
- BIST, NASDAQ ve NYSE hisseleri
- Çoklu para birimi desteği (TRY, USD)

### 📈 Teknik Analiz
- RSI (Relative Strength Index)
- MACD (Moving Average Convergence Divergence)
- SMA 20/50 (Simple Moving Average)
- Bollinger Bands
- Stochastic Oscillator
- Otomatik AL/SAT/BEKLE önerileri

### 🎯 Gelişmiş Özellikler
- **Takip Listesi**: Hisse ekleme/çıkarma sistemi
- **Hisse Screener**: Tüm borsalarda filtreleme
- **Arama**: Gelişmiş hisse arama sistemi
- **Grafikler**: Chart.js ile interaktif grafikler
- **Zaman Dilimi**: 1D, 1H, 1G, 1A grafik görünümleri
- **Haberler**: Piyasa haberleri
- **Responsive**: Mobil ve desktop uyumlu

## 🛠️ Kurulum

### Gereksinimler
- Node.js 16.0.0 veya üzeri
- npm 8.0.0 veya üzeri
- Modern web tarayıcısı

### Hızlı Başlangıç

1. **Bağımlılıkları yükleyin:**
   ```bash
   npm install
   ```

2. **Sunucuyu başlatın:**
   ```bash
   npm start
   ```
   
   Veya Windows için:
   ```
   start-tradepro.bat
   ```

3. **Tarayıcıda açın:**
   ```
   http://localhost:3000
   ```

## 📁 Proje Yapısı

```
TradePro-Alpha/
├── src/                   # Kaynak kodlar
│   ├── frontend/          # Frontend dosyaları
│   │   ├── index.html     # Ana HTML dosyası
│   │   ├── css/
│   │   │   └── styles.css # CSS stilleri
│   │   ├── js/
│   │   │   └── script.js  # Frontend JavaScript
│   │   └── assets/        # Statik dosyalar
│   └── backend/           # Backend dosyaları
│       ├── server.js      # Node.js backend server
│       ├── api/           # API endpoint'leri
│       └── database/
│           └── tradepro.db # SQLite database
├── scripts/               # Yardımcı scriptler
│   ├── start-tradepro.bat # Windows başlatma scripti
│   ├── install-deps.bat   # Windows dependency installer
│   ├── setup-nodejs.bat   # Node.js setup script
│   └── setup-git.bat      # Git kurulum scripti
├── docs/                  # Dokümantasyon
│   ├── CONTRIBUTING.md    # Katkıda bulunma rehberi
│   └── LICENSE            # MIT lisansı
├── .github/               # GitHub konfigürasyonu
│   ├── ISSUE_TEMPLATE/    # Issue şablonları
│   └── pull_request_template.md
├── package.json           # NPM konfigürasyonu
├── package-lock.json      # NPM lock file
├── .gitignore             # Git ignore file
└── README.md              # Bu dosya
```

## 🔧 API Endpoints

### REST API
- `GET /api/stocks` - Tüm hisse verileri
- `GET /api/stocks/:symbol` - Belirli hisse verisi
- `GET /api/search?q=query` - Hisse arama
- `GET /api/chart/:symbol` - Grafik verisi
- `GET /api/screener` - Hisse screener
- `GET /api/news` - Piyasa haberleri
- `GET /api/health` - Sistem durumu

### WebSocket
- `ws://localhost:3000` - Gerçek zamanlı veri akışı

## 📊 Desteklenen Borsalar

### BIST (Borsa İstanbul)
- ASELS, TUPRS, THYAO, AKBNK, GARAN
- ISCTR, KRDMD, SAHOL, TCELL, VAKBN

### NASDAQ
- AAPL, MSFT, GOOGL, AMZN, TSLA
- NVDA, META, NFLX, AMD, INTC
- CRM, ADBE, PYPL, UBER, ZM

### NYSE
- JPM, BAC, WMT, JNJ, PG
- KO, PFE, V, MA, HD
- DIS, NKE, MCD, IBM, GE

## 🎨 Kullanım

### Takip Listesi
- Sol paneldeki "+" butonuna tıklayın
- Arama yaparak hisse bulun
- Hisseye tıklayarak takip listesine ekleyin
- "X" butonuyla listeden çıkarın

### Grafik Görüntüleme
- Takip listesinden hisse seçin
- Zaman dilimi butonlarını kullanın (1D, 1H, 1G, 1A)
- Grafik otomatik olarak güncellenir

### Teknik Analiz
- Sağ panelde teknik göstergeleri görün
- AL/SAT/BEKLE önerilerini takip edin
- TradingView benzeri analiz

### Hisse Screener
- Sağ panelde "Hisse Screener" bölümü
- Borsa filtresi (Tümü, BIST, ABD)
- Hacim bazlı sıralama

## 🔄 Güncelleme Sistemi

- **Gerçek Zamanlı**: WebSocket ile 30 saniyede bir
- **Manuel**: Sayfa yenileme ile
- **Otomatik**: Bağlantı kesilirse yeniden bağlanma

## 🐛 Sorun Giderme

### Sunucu Başlamıyor
```bash
# Port kontrolü
netstat -an | findstr :3000

# Node.js versiyonu
node --version
```

### Veri Gelmiyor
- İnternet bağlantısını kontrol edin
- Yahoo Finance API erişimini kontrol edin
- WebSocket bağlantısını kontrol edin

### Grafik Yüklenmiyor
- Chart.js CDN erişimini kontrol edin
- Tarayıcı konsolunda hata mesajlarını kontrol edin

## 📝 Notlar

- Yahoo Finance API ücretsiz kullanım limitleri vardır
- Gerçek trading için ek güvenlik önlemleri gerekir
- Bu platform eğitim amaçlıdır

## 🤝 Katkıda Bulunma

1. Bu repository'yi fork yapın
2. Feature branch oluşturun (`git checkout -b feature/AmazingFeature`)
3. Değişikliklerinizi commit yapın (`git commit -m 'Add some AmazingFeature'`)
4. Branch'inizi push yapın (`git push origin feature/AmazingFeature`)
5. Pull Request oluşturun

### Geliştirme Kurulumu

```bash
# Repository'yi klonlayın
git clone https://github.com/yourusername/TradePro-Alpha.git
cd TradePro-Alpha

# Bağımlılıkları yükleyin
npm install

# Development modunda çalıştırın
npm run dev
```

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 📞 İletişim

- GitHub: [TradePro-Alpha Repository](https://github.com/yourusername/TradePro-Alpha)
- Issues: [GitHub Issues](https://github.com/yourusername/TradePro-Alpha/issues)
- Email: support@tradepro.com

---

**⚠️ Uyarı**: Bu platform eğitim amaçlıdır. Gerçek trading için profesyonel platformlar kullanın.
