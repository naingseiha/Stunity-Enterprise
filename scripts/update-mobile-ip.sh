#!/bin/bash
# Update Mobile App API Host
# This script updates the .env.local file with your current IP address

# Get the current IP address
CURRENT_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)

if [ -z "$CURRENT_IP" ]; then
    echo "❌ Could not detect IP address"
    echo "   Make sure you're connected to WiFi"
    exit 1
fi

echo "📱 Mobile App API Configuration"
echo "================================"
echo ""
echo "Current IP: $CURRENT_IP"
echo ""

# Update .env.local file
ENV_FILE="apps/mobile/.env.local"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ .env.local file not found at $ENV_FILE"
    exit 1
fi

# Backup the file
cp "$ENV_FILE" "$ENV_FILE.backup"

# Update the file
cat > "$ENV_FILE" << EOF
# API Host Configuration
# Your current IP: $CURRENT_IP
# Change this based on which network you're using
# Updated: $(date +"%Y-%m-%d %H:%M:%S")

# Current network
EXPO_PUBLIC_API_HOST=$CURRENT_IP

# Uncomment for localhost (only works on physical device with port forwarding):
# EXPO_PUBLIC_API_HOST=localhost
EOF

echo "✅ Updated .env.local with IP: $CURRENT_IP"
echo ""
echo "🔄 Next steps:"
echo "   1. Stop your Expo dev server (Ctrl+C)"
echo "   2. Restart it: npm start"
echo "   3. Press 'r' to reload the app"
echo ""
echo "💡 Tip: Run this script whenever you switch networks"
