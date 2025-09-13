# Katkıda Bulunma Rehberi

TradePro Alpha projesine katkıda bulunduğunuz için teşekkürler! Bu rehber, projeye nasıl katkıda bulunabileceğinizi açıklar.

## 🚀 Başlangıç

### Gereksinimler
- Node.js 16.0.0 veya üzeri
- npm 8.0.0 veya üzeri
- Git

### Kurulum
1. Repository'yi fork yapın
2. Fork'unuzu klonlayın:
   ```bash
   git clone https://github.com/YOUR_USERNAME/TradePro-Alpha.git
   cd TradePro-Alpha
   ```
3. Bağımlılıkları yükleyin:
   ```bash
   npm install
   ```
4. Development modunda çalıştırın:
   ```bash
   npm run dev
   ```

## 📝 Katkı Süreci

### 1. Issue Oluşturma
- Yeni bir özellik veya bug raporu için önce bir issue oluşturun
- Mevcut issue'ları kontrol edin, benzer bir issue varsa yorum yapın
- Issue'da açık ve detaylı açıklama yapın

### 2. Branch Oluşturma
```bash
git checkout -b feature/your-feature-name
# veya
git checkout -b bugfix/your-bugfix-name
```

### 3. Kod Yazma
- Kodunuzu temiz ve okunabilir yazın
- Mevcut kod stilini takip edin
- Gerekli yorumları ekleyin
- Test edin

### 4. Commit Yapma
```bash
git add .
git commit -m "Add: Yeni özellik açıklaması"
```

Commit mesajları için:
- `Add:` Yeni özellik
- `Fix:` Bug düzeltmesi
- `Update:` Mevcut özellik güncellemesi
- `Remove:` Özellik kaldırma
- `Refactor:` Kod yeniden düzenleme
- `Docs:` Dokümantasyon güncellemesi

### 5. Push ve Pull Request
```bash
git push origin feature/your-feature-name
```

GitHub'da Pull Request oluşturun ve:
- Değişikliklerinizi açıklayın
- İlgili issue'ları referans edin
- Screenshot'lar ekleyin (UI değişiklikleri için)

## 🎯 Katkı Alanları

### Frontend (script.js, styles.css, index.html)
- UI/UX iyileştirmeleri
- Yeni grafik türleri
- Responsive tasarım
- Accessibility iyileştirmeleri

### Backend (server.js)
- API endpoint'leri
- WebSocket iyileştirmeleri
- Performans optimizasyonları
- Güvenlik iyileştirmeleri

### Veri ve Analiz
- Yeni teknik göstergeler
- Algoritma iyileştirmeleri
- Veri kaynakları entegrasyonu

### Dokümantasyon
- README güncellemeleri
- API dokümantasyonu
- Kod yorumları

## 🧪 Test Etme

### Manuel Test
1. Uygulamayı başlatın: `npm start`
2. Tarayıcıda `http://localhost:3000` açın
3. Tüm özellikleri test edin:
   - Giriş/Kayıt
   - Hisse ekleme/çıkarma
   - Grafik görüntüleme
   - Alarm sistemi
   - WebSocket bağlantısı

### Test Senaryoları
- [ ] Giriş/Kayıt işlemleri
- [ ] Hisse arama ve ekleme
- [ ] Grafik güncellemeleri
- [ ] Alarm oluşturma/silme
- [ ] Responsive tasarım
- [ ] WebSocket bağlantısı

## 📋 Kod Standartları

### JavaScript
- ES6+ özelliklerini kullanın
- Async/await tercih edin
- Hata yönetimi ekleyin
- Console.log'ları production'da kaldırın

### CSS
- CSS custom properties kullanın
- Responsive tasarım uygulayın
- Dark/Light tema desteği
- Modern CSS özelliklerini kullanın

### HTML
- Semantic HTML kullanın
- Accessibility özelliklerini ekleyin
- Meta tag'leri güncelleyin

## 🐛 Bug Raporlama

Bug raporu oluştururken şunları ekleyin:
- Adım adım reprodüksiyon
- Beklenen davranış
- Gerçek davranış
- Ekran görüntüleri
- Tarayıcı/sistem bilgileri

## 💡 Özellik Önerileri

Özellik önerisi yaparken:
- Özelliğin amacını açıklayın
- Kullanım senaryolarını belirtin
- Alternatif çözümleri düşünün
- Implementation detaylarını tartışın

## 📞 İletişim

- GitHub Issues: Sorular ve tartışmalar için
- Email: support@tradepro.com
- Discord: [Eğer varsa]

## 📄 Lisans

Bu projeye katkıda bulunarak, katkılarınızın MIT lisansı altında lisanslanacağını kabul etmiş olursunuz.

---

**Teşekkürler!** 🎉
