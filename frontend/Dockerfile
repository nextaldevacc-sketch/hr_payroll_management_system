# Stage 1: Build & Dependencies
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat

# Copy workspace package manifests
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

# Install full workspace dependencies for building
RUN npm ci

# Copy source trees
COPY shared ./shared
COPY frontend ./frontend

# Build Next.js application
WORKDIR /app/frontend
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production
RUN npm run build

# Prune dev dependencies
WORKDIR /app
RUN npm prune --omit=dev

# Stage 2: Minimal Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache libc6-compat wget

ENV NODE_ENV=production \
    PORT=3100 \
    NEXT_TELEMETRY_DISABLED=1

# Non-root setup
RUN chown -R node:node /app

# Copy production workspace artifacts
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/shared ./shared
COPY --chown=node:node --from=builder /app/frontend ./frontend

WORKDIR /app/frontend

USER node

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3100/login || exit 1

EXPOSE 3100

CMD ["npx", "next", "start", "-p", "3100"]
