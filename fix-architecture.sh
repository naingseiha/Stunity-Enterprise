#!/bin/bash

# Fix architecture mismatch for M1/M2 Macs
# This script ensures all dependencies are installed for the correct architecture

echo "🔧 Fixing Architecture for Apple Silicon (M1/M2)"
echo "================================================"

# Check current architecture
ARCH=$(uname -m)
NODE_ARCH=$(node -p "process.arch")

echo "System Architecture: $ARCH"
echo "Node.js Architecture: $NODE_ARCH"

if [[ "$ARCH" == "arm64" && "$NODE_ARCH" == "x64" ]]; then
    echo ""
    echo "⚠️  WARNING: Node.js is running under Rosetta 2 (x64 mode)"
    echo "This causes esbuild architecture mismatches!"
    echo ""
    echo "To fix permanently, run Node.js natively:"
    echo "  arch -arm64 /usr/local/bin/node"
    echo ""
    echo "Or reinstall Node.js using the ARM64 installer from:"
    echo "  https://nodejs.org/en/download/"
    echo ""
fi

echo ""
echo "🧹 Cleaning existing dependencies..."
rm -rf node_modules
rm -rf services/*/node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules
rm -rf .turbo
rm -f package-lock.json
rm -f services/*/package-lock.json
rm -f apps/*/package-lock.json
rm -f packages/*/package-lock.json

echo ""
echo "📦 Reinstalling with correct architecture..."

# Force ARM64 architecture if on Apple Silicon
if [[ "$ARCH" == "arm64" ]]; then
    echo "Installing for ARM64..."
    arch -arm64 npm install --legacy-peer-deps
else
    npm install --legacy-peer-deps
fi

echo ""
echo "🔧 Generating Prisma client..."
cd packages/database && npx prisma generate
cd /Users/naingseiha/Documents/Stunity-Enterprise

echo ""
echo "✅ Dependencies reinstalled!"
echo ""
echo "🔍 Verifying esbuild installation..."
if [ -d "node_modules/@esbuild/darwin-arm64" ]; then
    echo "✅ @esbuild/darwin-arm64 installed correctly"
elif [ -d "node_modules/@esbuild/darwin-x64" ]; then
    echo "❌ WARNING: @esbuild/darwin-x64 found (wrong architecture)"
fi

echo ""
echo "Done! Try starting services with: ./quick-start.sh"
