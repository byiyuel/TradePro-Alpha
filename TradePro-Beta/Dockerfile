# Multi-stage build for TradePro Beta (Render.com optimized)
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM node:18-alpine AS production

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S tradepro -u 1001

# Set working directory
WORKDIR /app

# Copy dependencies from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY --chown=tradepro:nodejs . .

# Create necessary directories for Render.com
RUN mkdir -p /tmp/logs /tmp/database && \
    chown -R tradepro:nodejs /tmp/logs /tmp/database

# Switch to non-root user
USER tradepro

# Expose port (Render.com uses PORT env var)
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:10000/api/health/ping', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start application
CMD ["node", "src/backend/server-new.js"]
