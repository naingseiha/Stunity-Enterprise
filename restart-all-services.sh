#!/bin/bash

# ========================================
# Restart All Stunity Services (Clean)
# ========================================

echo "🔄 Restarting all Stunity services..."
echo ""

# Step 1: Stop all services
echo "Step 1/2: Stopping existing services..."
./stop-all-services.sh

echo ""
sleep 2

# Step 2: Start all services
echo "Step 2/2: Starting all services..."
./start-all-services.sh
