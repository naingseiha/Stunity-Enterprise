# =============================================
# Notification Service — Multi-stage Docker Build
# Optimized for Google Cloud Run deployment
#
# BUILD CONTEXT must be monorepo root:
#   docker build -f services/notification-service/Dockerfile .
#   OR: from Cloud Build with cloudbuild.yaml
# =============================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files for notification-service (layer caching)
COPY services/notification-service/package.json services/notification-service/package-lock.json* ./

# Install ALL dependencies (including devDependencies for build)
RUN npm install --ignore-scripts

# Copy Prisma schema from packages/database and generate client
COPY packages/database/prisma ./prisma/
RUN npx prisma@5.22.0 generate --schema=./prisma/schema.prisma

# Copy source and build
COPY services/notification-service/tsconfig.json ./
COPY services/notification-service/src/ ./src/
RUN npm run build

# Stage 2: Production runtime
FROM node:20-alpine AS runtime

WORKDIR /app

# Security: run as non-root
RUN addgroup -g 1001 -S nodejs && \
  adduser -S notificationservice -u 1001

# Copy package files and install production deps only
COPY services/notification-service/package.json services/notification-service/package-lock.json* ./
RUN npm install --omit=dev --ignore-scripts

# Copy Prisma schema & generate client for runtime
COPY --from=builder /app/prisma ./prisma/
RUN npx prisma@5.22.0 generate --schema=./prisma/schema.prisma

# Copy compiled JavaScript
COPY --from=builder /app/dist ./dist/

# Set environment
ENV NODE_ENV=production
# Cloud Run sets PORT=8080 by default — our app reads process.env.PORT
ENV PORT=8080

# Cloud Run ignores HEALTHCHECK but useful for local Docker testing
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

# Switch to non-root user
USER notificationservice

EXPOSE 8080

CMD ["node", "dist/index.js"]
