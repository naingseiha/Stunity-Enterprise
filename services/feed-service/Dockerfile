# =============================================
# Feed Service — Multi-stage Docker Build
# Optimized for Google Cloud Run deployment
# =============================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first (layer caching)
COPY package.json package-lock.json* ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci --ignore-scripts

# Copy Prisma schema & generate client
COPY ../../packages/database/prisma ./prisma/
RUN npx prisma generate --schema=./prisma/schema.prisma

# Copy source and build
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Stage 2: Production runtime
FROM node:20-alpine AS runtime

WORKDIR /app

# Security: run as non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S feedservice -u 1001

# Copy package files and install production deps only
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts

# Copy Prisma schema & generate client for runtime
COPY --from=builder /app/prisma ./prisma/
RUN npx prisma generate --schema=./prisma/schema.prisma

# Copy compiled JavaScript
COPY --from=builder /app/dist ./dist/

# Set environment
ENV NODE_ENV=production
ENV PORT=3010

# Cloud Run health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3010/health || exit 1

# Switch to non-root user
USER feedservice

EXPOSE 3010

CMD ["node", "dist/index.js"]
