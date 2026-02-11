#!/bin/bash

# 🔧 Network Helper Script
# Automatically detects your current IP and updates .env.local

echo "🔍 Detecting your current network IP..."

# Get current IP address (excluding localhost)
CURRENT_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

if [ -z "$CURRENT_IP" ]; then
    echo "❌ Could not detect IP address"
    echo "📝 Please check your network connection"
    exit 1
fi

echo "✅ Current IP: $CURRENT_IP"

# Path to .env.local
ENV_FILE="apps/mobile/.env.local"

# Check if file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "📝 Creating new .env.local file..."
    cat > "$ENV_FILE" << EOF
# API Host Configuration
# Auto-updated: $(date)

# Current network IP
EXPO_PUBLIC_API_HOST=$CURRENT_IP
EOF
    echo "✅ Created $ENV_FILE with IP: $CURRENT_IP"
else
    # Update existing file
    echo "📝 Updating $ENV_FILE..."
    
    # Check if EXPO_PUBLIC_API_HOST exists
    if grep -q "EXPO_PUBLIC_API_HOST=" "$ENV_FILE"; then
        # Update existing line
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/^EXPO_PUBLIC_API_HOST=.*/EXPO_PUBLIC_API_HOST=$CURRENT_IP/" "$ENV_FILE"
        else
            # Linux
            sed -i "s/^EXPO_PUBLIC_API_HOST=.*/EXPO_PUBLIC_API_HOST=$CURRENT_IP/" "$ENV_FILE"
        fi
        echo "✅ Updated IP to: $CURRENT_IP"
    else
        # Add new line
        echo "" >> "$ENV_FILE"
        echo "EXPO_PUBLIC_API_HOST=$CURRENT_IP" >> "$ENV_FILE"
        echo "✅ Added IP: $CURRENT_IP"
    fi
    
    # Add comment with previous IPs
    if ! grep -q "# Previous IPs:" "$ENV_FILE"; then
        echo "" >> "$ENV_FILE"
        echo "# Previous IPs:" >> "$ENV_FILE"
    fi
    
    # Log this IP change
    echo "# - $(date): $CURRENT_IP" >> "$ENV_FILE"
fi

echo ""
echo "🎉 Configuration updated successfully!"
echo ""
echo "📱 Next steps:"
echo "   1. Restart Expo: Press 'r' in the terminal"
echo "   2. Or restart completely: npm start"
echo ""
echo "🔍 Testing connection:"

# Test if backend is reachable
if curl -s -o /dev/null -w "%{http_code}" http://$CURRENT_IP:3001/health --connect-timeout 2 | grep -q "200\|404"; then
    echo "   ✅ Auth Service (3001): Reachable"
else
    echo "   ⚠️  Auth Service (3001): Not responding"
    echo "      Make sure backend services are running: ./quick-start.sh"
fi

if curl -s -o /dev/null -w "%{http_code}" http://$CURRENT_IP:3010/health --connect-timeout 2 | grep -q "200\|404"; then
    echo "   ✅ Feed Service (3010): Reachable"
else
    echo "   ⚠️  Feed Service (3010): Not responding"
fi

echo ""
echo "💡 Tip: Run this script whenever you switch WiFi networks"
echo "   ./fix-network.sh"
echo ""
