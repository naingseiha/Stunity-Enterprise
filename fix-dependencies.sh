#!/bin/bash

# Stunity Enterprise - Complete Dependency Fix Script
# Fixes all common dependency issues in one go

set -e  # Exit on error

echo "🔧 Stunity Enterprise - Complete Dependency Fix"
echo "================================================"
echo ""

# Change to project root
cd "$(dirname "$0")"

echo "📦 Step 1: Regenerating Prisma Client..."
cd packages/database
npx prisma generate > /dev/null 2>&1
echo "✅ Prisma Client regenerated"
cd ../..

echo ""
echo "📦 Step 2: Fixing esbuild architecture issue..."
rm -rf node_modules/@esbuild/darwin-x64 2>/dev/null || true
npm install @esbuild/darwin-arm64 --save-optional > /dev/null 2>&1
echo "✅ esbuild fixed for ARM64"

echo ""
echo "📦 Step 3: Ensuring all service dependencies..."

services=("auth" "school" "student" "teacher" "class")

for service in "${services[@]}"; do
  echo "  → Checking ${service}-service..."
  cd "services/${service}-service"
  
  # Install missing dependencies if needed
  if ! npm list array-flatten > /dev/null 2>&1; then
    npm install array-flatten --silent > /dev/null 2>&1
  fi
  
  cd ../..
  echo "    ✅ ${service}-service ready"
done

echo ""
echo "================================================"
echo "✅ All dependencies fixed!"
echo ""
echo "🚀 You can now start your services:"
echo ""
echo "Run in separate terminals:"
echo "  cd services/auth-service && npm run dev"
echo "  cd services/school-service && npm run dev"
echo "  cd services/student-service && npm run dev"
echo "  cd services/teacher-service && npm run dev"
echo "  cd services/class-service && npm run dev"
echo "  cd apps/web && npm run dev"
echo ""
echo "Or use: ./prepare-services.sh to free ports first"
echo ""
