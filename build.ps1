# Build script for Windows PowerShell - Standalone approach
# Builds locally with bundled dependencies, creates standalone Docker image

Write-Host "🚀 Building standalone server application..." -ForegroundColor Green

# Install dependencies locally
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install --legacy-peer-deps

# Build the server application with bundled webpack config
Write-Host "Building server application with bundled dependencies..." -ForegroundColor Yellow
npx nx build @here-to-translate/server --configuration=production --webpackConfig=apps/server/webpack.config.prod.cjs

# Build Docker image with standalone application
Write-Host "Building Docker image (standalone approach)..." -ForegroundColor Yellow
docker build -f apps/server/Dockerfile -t here-to-translate-server:latest .

Write-Host "✅ Build completed successfully!" -ForegroundColor Green
Write-Host "You can now run: docker run -p 3000:3000 here-to-translate-server:latest" -ForegroundColor Cyan 