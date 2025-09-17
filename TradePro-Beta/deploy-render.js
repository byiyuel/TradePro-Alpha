#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 TradePro Beta - Render.com Deployment Setup');
console.log('==============================================');

// Environment variables template
const envTemplate = `# TradePro Beta Environment Variables for Render.com
# Bu dosyayı .env olarak kopyalayın ve değerleri doldurun

# Server Configuration
PORT=10000
NODE_ENV=production

# JWT Secret Key (Production'da mutlaka değiştirin!)
JWT_SECRET=tradepro_beta_secret_key_2024_secure_random_string_here

# API Keys (Yahoo Finance API için)
YAHOO_FINANCE_API_KEY=your_yahoo_finance_api_key_here
NEWS_API_KEY=your_news_api_key_here

# Database Configuration (Render.com için geçici dizin)
DB_PATH=/tmp/tradepro.db

# Cache Configuration
CACHE_DURATION_MINUTES=30
CACHE_MAX_SIZE=1000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Security Headers
HELMET_CSP_ENABLED=true
HELMET_HSTS_ENABLED=true

# Logging (Render.com için geçici dizin)
LOG_LEVEL=info
LOG_FILE=/tmp/logs/tradepro.log

# WebSocket Configuration
WS_HEARTBEAT_INTERVAL=30000
WS_MAX_CONNECTIONS=50

# Redis Configuration (Render.com için)
REDIS_URL=redis://user:pass@host:port/db
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Technical Analysis
TECHNICAL_ANALYSIS_ENABLED=true
TECHNICAL_ANALYSIS_CACHE_TTL=300

# PWA Configuration
PWA_ENABLED=true
PWA_UPDATE_CHECK_INTERVAL=3600000

# Monitoring
MONITORING_ENABLED=true
MONITORING_METRICS_INTERVAL=60000

# Render.com Specific
FRONTEND_URL=https://your-app.onrender.com
`;

// Create .env file if it doesn't exist
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, envTemplate);
  console.log('✅ .env dosyası oluşturuldu');
} else {
  console.log('⚠️ .env dosyası zaten mevcut');
}

console.log('\n📋 Render.com Deploy Adımları:');
console.log('===============================');

console.log('\n1. 🔗 Repository\'yi Render.com\'a bağlayın:');
console.log('   - render.com → New + → Web Service');
console.log('   - GitHub repository\'nizi seçin');
console.log('   - Branch: main/master');

console.log('\n2. ⚙️ Build & Deploy ayarları:');
console.log('   - Build Command: npm install');
console.log('   - Start Command: npm start');
console.log('   - Environment: Node');
console.log('   - Plan: Free (başlangıç için)');

console.log('\n3. 🔑 Environment Variables ekleyin:');
console.log('   - NODE_ENV=production');
console.log('   - PORT=10000');
console.log('   - JWT_SECRET=your_secure_secret');
console.log('   - YAHOO_FINANCE_API_KEY=your_api_key');
console.log('   - NEWS_API_KEY=your_api_key');
console.log('   - REDIS_URL=your_redis_url (opsiyonel)');

console.log('\n4. 🗄️ Redis Database ekleyin (opsiyonel):');
console.log('   - render.com → New + → Redis');
console.log('   - Plan: Free');
console.log('   - Connection string\'i environment variable olarak ekleyin');

console.log('\n5. 🚀 Deploy:');
console.log('   - "Create Web Service" butonuna tıklayın');
console.log('   - İlk deploy 5-10 dakika sürebilir');
console.log('   - Logs\'u takip edin');

console.log('\n📊 Deploy sonrası kontrol:');
console.log('========================');
console.log('✅ Health Check: https://your-app.onrender.com/api/health/ping');
console.log('📈 Monitoring: https://your-app.onrender.com/api/monitoring/dashboard');
console.log('🌐 Web App: https://your-app.onrender.com');

console.log('\n🔧 Troubleshooting:');
console.log('==================');
console.log('❌ Deploy başarısız → Environment variables kontrol edin');
console.log('❌ Redis hatası → REDIS_URL doğru mu?');
console.log('❌ Port hatası → PORT=10000 ayarlandı mı?');
console.log('❌ CORS hatası → Domain whitelist\'te mi?');

console.log('\n🎉 TradePro Beta Render.com\'da hazır!');
console.log('=====================================');
