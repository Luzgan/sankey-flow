#!/bin/bash

echo "🚀 Starting Tableau Extension Development Environment"
echo "=================================================="

# Check if Extensions API server is running
if ! curl -s http://localhost:8765 > /dev/null; then
    echo "⚠️  Extensions API server not running on port 8765"
    echo "📝 Please start it first:"
    echo "   cd ../extensions-api && npm start"
    echo ""
    echo "🔄 Starting it now..."
    cd ../extensions-api
    npm start &
    cd ../sankey-tableau-extension
    sleep 3
fi

echo "✅ Extensions API server is running"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
npm run clean

# Start development mode
echo "🔄 Starting development mode with watch..."
echo "   - TypeScript compilation with source maps"
echo "   - Automatic file copying to extensions-api"
echo "   - Hot reloading for development"
echo ""

npm run dev:full
