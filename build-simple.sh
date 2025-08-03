#!/bin/bash

echo "🚀 Starting build process..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build common library
echo "🔨 Building common library..."
npx nx@21.1.3 build @here-to-translate/common

# Build web application
echo "🌐 Building web application..."
npx nx@21.1.3 build @here-to-translate/web

echo "✅ Build completed successfully!"
echo "📁 Static files are in: apps/web/dist" 