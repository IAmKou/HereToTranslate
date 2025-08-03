#!/bin/bash

# Build script for frontend static site
echo "🚀 Building frontend for production..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production --ignore-scripts

# Build the static site
echo "🌐 Building static site..."
npm run build:static

echo "✅ Build completed successfully!"
echo "📁 Static files are in: apps/web/dist" 