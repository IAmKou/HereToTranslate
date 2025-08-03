#!/bin/bash

# Build script for frontend static site
echo "🚀 Building frontend for production..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Ensure Nx is available
echo "🔧 Ensuring Nx is available..."
npx nx --version

# Build the static site
echo "🌐 Building static site..."
npm run build:static

echo "✅ Build completed successfully!"
echo "📁 Static files are in: apps/web/dist" 