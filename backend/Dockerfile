# Stage 1: Build & Dependencies
FROM node:20-alpine AS builder

WORKDIR /app

# Install native build tools for bcrypt and OpenSSL for Prisma
RUN apk add --no-cache python3 make g++ openssl libc6-compat

# Copy workspace package definitions
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install workspace dependencies
RUN npm ci

# Copy source trees
COPY shared ./shared
COPY backend ./backend
COPY scripts/setup-company.mjs ./scripts/setup-company.mjs

# Generate Prisma Client
WORKDIR /app/backend
RUN npx prisma generate

# Prune dev dependencies for minimal production footprint
WORKDIR /app
RUN npm prune --omit=dev

# Stage 2: Production Minimal Runtime
FROM node:20-alpine AS runner

WORKDIR /app

# Install runtime libraries: OpenSSL, Chromium for PDF reporting, fonts, and wget for healthchecks
RUN apk add --no-cache \
    openssl \
    libc6-compat \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    wget

ENV NODE_ENV=production \
    PORT=5000 \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Setup storage directory and ownership for non-root node user
RUN mkdir -p /app/backend/storage && chown -R node:node /app

# Copy production workspace artifacts from builder
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/shared ./shared
COPY --chown=node:node --from=builder /app/backend ./backend
COPY --chown=node:node --from=builder /app/scripts ./scripts

WORKDIR /app/backend

# Switch to non-root user
USER node

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5000/api/v1/health || exit 1

EXPOSE 5000

CMD ["node", "src/server.js"]
