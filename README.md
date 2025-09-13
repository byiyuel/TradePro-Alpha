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

---

## 🚀 Hızlı Başlangıç

### 📋 Gereksinimler

* Node.js 16.0.0+
* npm 8.0.0+
* Modern web tarayıcısı

### ⚡ Kurulum

```bash
# 1. Bağımlılıkları yükleyin
npm install

# 2. Sunucuyu başlatın
npm start

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
* **Cache Sistemi**: 5 dakika hızlı cache

### 📈 Teknik Analiz

* RSI, MACD, SMA (20/50)
* Bollinger Bands
* Stochastic Oscillator
* **Otomatik AL/SAT/BEKLE** sinyalleri

### ⚡ Gerçek Zamanlı Veriler

* Yahoo Finance API entegrasyonu
* WebSocket ile 30 saniyede bir güncelleme
* TRY ve USD desteği
* 139 hisse için sürekli veri akışı

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

---

## 🔧 Teknik Detaylar

### Backend

* Node.js & Express.js
* WebSocket (real-time)
* SQLite veritabanı
* Yahoo Finance API
* 5 dakikalık cache sistemi

### Frontend

* HTML5, CSS3, JavaScript
* Chart.js grafikler
* Responsive tasarım
* Optimize edilmiş arama (500ms debounce)

### API Endpoints

* `GET /api/stocks` → Tüm hisse verileri
* `GET /api/search?q=query` → Canlı arama
* `GET /api/chart/:symbol` → Grafik verisi
* `GET /api/health` → Sistem durumu
* `WebSocket ws://localhost:3000` → Canlı veri

---

## 🐛 Sorun Giderme

### ⚠️ Yaygın Sorunlar

| Sorun                    | Çözüm                                            |
| ------------------------ | ------------------------------------------------ |
| **Port 3000 kullanımda** | `taskkill /f /im node.exe` ile Node.js’i kapatın |
| **Veri gelmiyor**        | İnternet ve API bağlantısını kontrol edin        |
| **Grafik yüklenmiyor**   | Chart.js erişimini kontrol edin                  |
| **Arama çalışmıyor**     | En az 3 karakter girildiğinden emin olun         |

### 🔧 Debug Komutları

```bash
# Port kontrolü
netstat -an | findstr :3000

# Node.js versiyonu
node --version

# Bağımlılıkları yeniden yükle
npm install
```

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
# Repository’yi klonlayın
git clone https://github.com/byiyuel/TradePro-Alpha.git
cd TradePro-Alpha

# Bağımlılıkları yükleyin
npm install

# Development modunda başlatın
npm start
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
