FROM node:20-alpine AS base

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

# Copy workspace package manifests
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install dependencies across workspace
RUN npm ci

# Copy shared code and api code
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

WORKDIR /app/apps/api
RUN npx prisma generate

EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
