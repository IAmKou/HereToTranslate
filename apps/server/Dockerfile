# ====== 1. Build Locally First ======
# Run these commands locally before building Docker:
# npm install
# npx nx build @here-to-translate/server --webpackConfig=apps/server/webpack.config.bundle.cjs

# ====== 2. Docker Runtime Stage ======
FROM node:20-slim AS runner

# Install runtime dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built application (built locally with bundled dependencies)
COPY dist/apps/server ./apps/server

# Set the default command
CMD ["node", "apps/server/main.js"] 