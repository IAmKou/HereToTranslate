# Docker Setup

This project uses a standalone Docker approach that builds the application locally and creates a minimal Docker image.

## Quick Start

### Windows PowerShell
```powershell
# Build and create Docker image
.\build.ps1

# Run the container
docker run -p 3000:3000 here-to-translate-server:latest
```

### Manual Steps
```bash
# Install dependencies
npm install --legacy-peer-deps

# Build with bundled dependencies
npx nx build @here-to-translate/server --configuration=production --webpackConfig=apps/server/webpack.config.prod.cjs

# Build Docker image
docker build -f apps/server/Dockerfile -t here-to-translate-server:latest .

# Run container
docker run -p 3000:3000 here-to-translate-server:latest
```

## How It Works

1. **Local Build**: Dependencies are installed and the application is built locally
2. **Bundled Dependencies**: All dependencies are bundled into a single file using webpack
3. **Minimal Docker Image**: Only the built application is copied to Docker (no npm install in Docker)
4. **Fast Builds**: Docker build takes only a few seconds since it just copies files

## Files

- `apps/server/Dockerfile` - Main Dockerfile
- `apps/server/webpack.config.prod.cjs` - Production webpack config with bundled dependencies
- `build.ps1` - Windows PowerShell build script
- `.dockerignore` - Excludes unnecessary files from Docker build context

## Troubleshooting

If you encounter issues:
1. Make sure all dependencies are installed: `npm install --legacy-peer-deps`
2. Clear the dist folder: `rm -rf dist`
3. Rebuild: `.\build.ps1` 