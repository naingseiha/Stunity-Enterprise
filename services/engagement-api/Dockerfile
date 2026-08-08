# =============================================
# Engagement API — Multi-stage Docker Build
# Consolidated auth/feed/learn/messaging/notification/analytics service
# (Phase 0, docs/ARCHITECTURE_REVIEW_2026-07.md).
# Optimized for Google Cloud Run deployment.
#
# BUILD CONTEXT must be monorepo root:
#   docker build -f services/engagement-api/Dockerfile .
#   OR: from Cloud Build with cloudbuild.yaml
# =============================================

# Stage 1: Build
FROM node:22-slim AS builder

WORKDIR /app

# Install build dependencies for Debian
RUN apt-get update && apt-get install -y \
  openssl \
  python3 \
  make \
  g++ \
  && rm -rf /var/lib/apt/lists/*

# Copy package files for engagement-api (layer caching)
COPY services/engagement-api/package.json services/engagement-api/package-lock.json* ./

# Install ALL dependencies (including devDependencies for build)
RUN npm install --ignore-scripts

# Copy Prisma schema from packages/database and generate client (output to /node_modules; copy into app for tsc)
COPY packages/database/prisma ./prisma/
RUN npx prisma@5.22.0 generate --schema=./prisma/schema.prisma && cp -r /node_modules/.prisma ./node_modules/

# Copy source and build
COPY services/engagement-api/tsconfig.json ./
COPY services/engagement-api/src/ ./src/
COPY services/lib/ /lib/
RUN npm run build

# Stage 2: Production runtime
FROM node:22-slim AS runtime

WORKDIR /app

# Install runtime dependencies for Debian (Prisma needs openssl)
RUN apt-get update && apt-get install -y \
  openssl \
  ca-certificates \
  wget \
  && rm -rf /var/lib/apt/lists/*

# Security: run as non-root
RUN groupadd -g 1001 nodejs && \
  useradd -m -u 1001 -g nodejs engagementapi

# Copy package files and install production deps only
COPY services/engagement-api/package.json services/engagement-api/package-lock.json* ./
RUN npm install --omit=dev --ignore-scripts

# Copy Prisma schema & generate client for runtime (output goes to /node_modules; copy into app)
COPY --from=builder /app/prisma ./prisma/
RUN npx prisma@5.22.0 generate --schema=./prisma/schema.prisma && cp -r /node_modules/.prisma ./node_modules/

# Copy shared service runtime helpers
COPY services/lib/ /lib/

# Copy compiled JavaScript
COPY --from=builder /app/dist ./dist/

# Set environment
ENV NODE_ENV=production
# Cloud Run sets PORT=8080 by default — our app reads process.env.PORT
ENV PORT=8080
# Shared helpers live at /lib (outside /app). Without NODE_PATH, require('jsonwebtoken')
# from /lib/auth-tokens.js cannot see /app/node_modules and the container exits on boot.
ENV NODE_PATH=/app/node_modules

# Cloud Run ignores HEALTHCHECK but useful for local Docker testing
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

# Switch to non-root user
USER engagementapi

EXPOSE 8080

CMD ["node", "dist/index.js"]
