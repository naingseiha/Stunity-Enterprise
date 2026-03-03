# =============================================
# Ai Service — Multi-stage Docker Build
# Optimized for Google Cloud Run deployment
#
# BUILD CONTEXT must be monorepo root:
#   docker build -f services/ai-service/Dockerfile .
#   OR: from Cloud Build with cloudbuild.yaml
# =============================================

# Stage 1: Build
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies for Debian
RUN apt-get update && apt-get install -y \
  openssl \
  python3 \
  make \
  g++ \
  && rm -rf /var/lib/apt/lists/*

# Copy package files for ai-service (layer caching)
COPY services/ai-service/package.json services/ai-service/package-lock.json* ./

# Install ALL dependencies (including devDependencies for build)
RUN npm install --ignore-scripts

# Copy Prisma schema from packages/database and generate client
COPY packages/database/prisma ./prisma/
RUN npx prisma@5.22.0 generate --schema=./prisma/schema.prisma

# Copy source and build
COPY services/ai-service/tsconfig.json ./
COPY services/ai-service/src/ ./src/
RUN npm run build

# Stage 2: Production runtime
FROM node:20-slim AS runtime

WORKDIR /app

# Install runtime dependencies for Debian (Prisma needs openssl)
RUN apt-get update && apt-get install -y \
  openssl \
  ca-certificates \
  wget \
  && rm -rf /var/lib/apt/lists/*

# Security: run as non-root
RUN groupadd -g 1001 nodejs && \
  useradd -m -u 1001 -g nodejs aiservice

# Copy package files and install production deps only
COPY services/ai-service/package.json services/ai-service/package-lock.json* ./
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
USER aiservice

EXPOSE 8080

CMD ["node", "dist/index.js"]
