# ---- Stage 1: Build the application ----
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json and lock for installing deps
COPY package.json package-lock.json nx.json tsconfig.base.json ./

# Copy the whole workspace including apps and libs
COPY apps ./apps
COPY libs ./libs

# Install dependencies
RUN npm ci

# Set NX environment variables for better build performance
ENV NX_VERBOSE_LOGGING=true
ENV NX_CACHE_PROJECT_GRAPH=false
ENV NX_SKIP_NX_CACHE=true

# Build the common library first
RUN npx nx build @here-to-translate/common --verbose --skip-nx-cache

# Ensure TypeScript declarations are generated
RUN npx tsc --project libs/common/tsconfig.lib.json

# Build the server with production webpack config
RUN npx nx build @here-to-translate/server --configuration=production --with-deps --skip-nx-cache --verbose

# ---- Stage 2: Runtime image ----
FROM node:20-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libcairo2 libpango-1.0-0 libjpeg62-turbo libgif7 librsvg2-2 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist/apps/server ./apps/server
COPY --from=builder /app/dist/libs/common ./node_modules/@here-to-translate/common/dist/libs/common
COPY --from=builder /app/libs/common/package.json ./node_modules/@here-to-translate/common/package.json
COPY .env .env
ENV NODE_ENV=production
CMD ["node", "apps/server/main.js"]
