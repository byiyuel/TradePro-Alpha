# TradePro Alpha

> **Modern Trading Platform** - Gerçek zamanlı verilerle çalışan profesyonel trading platformu

[![Node.js](https://img.shields.io/badge/Node.js-16.0.0+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Alpha-orange.svg)](https://github.com/byiyuel/TradePro-Alpha)

---

## 🌟 Öne Çıkan Özellikler

- 🔍 **Live Arama**: Dünya çapında herhangi bir hisse arama
- 📊 **139 Hisse**: BIST, NASDAQ, NYSE'de kapsamlı hisse desteği
- ⚡ **Gerçek Zamanlı**: WebSocket ile anlık fiyat güncellemeleri
- 📈 **Teknik Analiz**: RSI, MACD, Bollinger Bands ve daha fazlası
- 🌍 **9 Borsa**: Global borsa desteği
- 📱 **Responsive**: Mobil ve desktop uyumlu

## 🚀 Hızlı Başlangıç

### 📋 Gereksinimler
- Node.js 16.0.0+
- npm 8.0.0+
- Modern web tarayıcısı

### ⚡ Kurulum
```bash
# 1. Bağımlılıkları yükleyin
npm install

# 2. Sunucuyu başlatın
npm start

# 3. Tarayıcıda açın
# http://localhost:3000
```

### 🎯 İlk Adımlar
1. **Arama**: Header'daki arama kutusuna hisse adı yazın
2. **Takip**: "+" butonuna tıklayarak hisse ekleyin
3. **Analiz**: Grafik ve teknik göstergeleri inceleyin
4. **Takip**: Takip listesinde hisselerinizi yönetin

## 📊 Özellikler

### 🔍 Live Arama Sistemi
- **Global Arama**: Dünya çapında herhangi bir hisse
- **9 Borsa Desteği**: BIST, NASDAQ, NYSE, TSX, LSE, EPA, ETR, HKG, TYO
- **Anlık Sonuçlar**: Yazarken gerçek zamanlı sonuçlar
- **Cache Sistemi**: 5 dakika cache ile hızlı arama

### 📈 Teknik Analiz
- **RSI**: Relative Strength Index
- **MACD**: Moving Average Convergence Divergence
- **SMA**: Simple Moving Average (20/50)
- **Bollinger Bands**: Volatilite analizi
- **Stochastic**: Momentum göstergesi
- **Otomatik Öneriler**: AL/SAT/BEKLE sinyalleri

### ⚡ Gerçek Zamanlı Veriler
- **Yahoo Finance API**: Güvenilir veri kaynağı
- **WebSocket**: 30 saniyede bir güncelleme
- **Çoklu Para Birimi**: TRY, USD desteği
- **139 Hisse**: Kapsamlı hisse kütüphanesi

## 🌐 Desteklenen Borsalar

### 🇹🇷 BIST (Borsa İstanbul) - 40 Hisse
**Popüler Hisseler**: ASELS, TUPRS, THYAO, AKBNK, GARAN, ISCTR, KRDMD, SAHOL, TCELL, VAKBN

### 🇺🇸 NASDAQ - 50 Hisse  
**Teknoloji**: AAPL, MSFT, GOOGL, AMZN, TSLA, NVDA, META, NFLX, AMD, INTC

### 🇺🇸 NYSE - 50 Hisse
**Finans & Tüketim**: JPM, BAC, WMT, JNJ, PG, KO, PFE, V, MA, HD

### 🌍 Global Borsalar (Live Arama)
- **🇨🇦 TSX**: Toronto Borsası
- **🇬🇧 LSE**: Londra Borsası  
- **🇫🇷 EPA**: Paris Borsası
- **🇩🇪 ETR**: Frankfurt Borsası
- **🇭🇰 HKG**: Hong Kong Borsası
- **🇯🇵 TYO**: Tokyo Borsası
- **🇨🇳 SHA/SHE**: Çin borsaları

## 🎨 Kullanım Kılavuzu

### 🔍 Live Arama
1. **Arama Kutusu**: Header'daki arama kutusuna hisse adı yazın
2. **Minimum 3 Karakter**: En az 3 karakter girin
3. **Anlık Sonuçlar**: Yazarken gerçek zamanlı sonuçlar görünür
4. **Global Arama**: Dünya çapında herhangi bir hisse arayabilirsiniz

### ⭐ Takip Listesi
1. **Hisse Ekleme**: Sol paneldeki "+" butonuna tıklayın
2. **Arama**: Live arama ile istediğiniz hisse adını yazın
3. **Seçim**: Hisseye tıklayarak takip listesine ekleyin
4. **Çıkarma**: "X" butonuyla listeden çıkarın

### 📈 Grafik & Analiz
1. **Hisse Seçimi**: Takip listesinden hisse seçin
2. **Zaman Dilimi**: 1D, 1H, 1G, 1A butonlarını kullanın
3. **Teknik Analiz**: Sağ panelde göstergeleri inceleyin
4. **Öneriler**: AL/SAT/BEKLE sinyallerini takip edin

## 🔧 Teknik Detaylar

### Backend
- **Node.js & Express.js**: Modern web server
- **WebSocket**: Real-time communication
- **SQLite**: Kullanıcı verileri için veritabanı
- **Yahoo Finance API**: Güvenilir veri kaynağı
- **Cache Sistemi**: 5 dakika server-side cache
- **Error Handling**: Güvenli hata yönetimi

### Frontend
- **HTML5, CSS3, JavaScript**: Modern web teknolojileri
- **Chart.js**: Interaktif grafikler
- **Responsive Design**: Mobil ve desktop uyumlu
- **Real-time Search**: 500ms debouncing ile optimize arama
- **Client-side Cache**: Tarayıcıda arama sonuçları cache

### API Endpoints
- `GET /api/stocks` - Tüm hisse verileri
- `GET /api/search?q=query` - Live hisse arama
- `GET /api/chart/:symbol` - Grafik verisi
- `GET /api/health` - Sistem durumu
- `WebSocket ws://localhost:3000` - Gerçek zamanlı veri akışı

## 🐛 Sorun Giderme

### ⚠️ Yaygın Sorunlar

| Sorun | Çözüm |
|-------|-------|
| **Port 3000 kullanımda** | `taskkill /f /im node.exe` ile Node.js'i kapatın |
| **Veri gelmiyor** | İnternet bağlantısını ve Yahoo Finance API erişimini kontrol edin |
| **Grafik yüklenmiyor** | Chart.js CDN erişimini ve tarayıcı konsolunu kontrol edin |
| **Arama çalışmıyor** | En az 3 karakter girdiğinizden emin olun |

### 🔧 Debug Komutları
```bash
# Port kontrolü
netstat -an | findstr :3000

# Node.js versiyonu
node --version

# Bağımlılıkları yeniden yükle
npm install
```

## ⚠️ Önemli Notlar

- **Eğitim Amaçlı**: Bu platform eğitim amaçlıdır
- **Gerçek Trading**: Gerçek trading için profesyonel platformlar kullanın
- **API Limitleri**: Yahoo Finance API ücretsiz kullanım limitleri vardır
- **Güvenlik**: Gerçek trading için ek güvenlik önlemleri gerekir

## 🤝 Katkıda Bulunma

1. **Fork**: Bu repository'yi fork yapın
2. **Branch**: Feature branch oluşturun (`git checkout -b feature/AmazingFeature`)
3. **Commit**: Değişikliklerinizi commit yapın (`git commit -m 'Add some AmazingFeature'`)
4. **Push**: Branch'inizi push yapın (`git push origin feature/AmazingFeature`)
5. **PR**: Pull Request oluşturun

### 🛠️ Geliştirme Kurulumu
```bash
# Repository'yi klonlayın
git clone https://github.com/byiyuel/TradePro-Alpha.git
cd TradePro-Alpha

# Bağımlılıkları yükleyin
npm install

# Development modunda çalıştırın
npm start
```

## 📞 İletişim & Destek

- **GitHub**: [TradePro-Alpha Repository](https://github.com/byiyuel/TradePro-Alpha)
- **Issues**: [GitHub Issues](https://github.com/byiyuel/TradePro-Alpha/issues)
- **Email**: baranyucel643@gmail.com
- **Lisans**: MIT License

---

<div align="center">

**🚀 TradePro Alpha - Modern Trading Platform**

*Gerçek zamanlı verilerle profesyonel trading deneyimi*

</div>
