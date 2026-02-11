#!/bin/bash

# Auto-Update IP Script for Mobile Development
# Updates .env.local with current WiFi IP when network changes

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🌐 Detecting Network Configuration${NC}"
echo ""

# Get current WiFi IP (excluding localhost)
CURRENT_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

if [ -z "$CURRENT_IP" ]; then
  echo -e "${YELLOW}⚠️  No WiFi IP detected!${NC}"
  echo "Make sure you're connected to WiFi"
  exit 1
fi

echo -e "Current IP: ${GREEN}$CURRENT_IP${NC}"
echo ""

# Path to .env.local
ENV_FILE="$(dirname "$0")/.env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo -e "${YELLOW}⚠️  .env.local not found${NC}"
  echo "Creating from example..."
  cp "$(dirname "$0")/.env.local.example" "$ENV_FILE"
fi

# Check current configured IP
CONFIGURED_IP=$(grep "^EXPO_PUBLIC_API_HOST=" "$ENV_FILE" | cut -d'=' -f2)

if [ "$CONFIGURED_IP" == "$CURRENT_IP" ]; then
  echo -e "${GREEN}✅ Already configured for current network ($CURRENT_IP)${NC}"
  echo ""
  echo "API endpoints:"
  echo "  Auth:  http://$CURRENT_IP:3001"
  echo "  Feed:  http://$CURRENT_IP:3010"
  echo "  Club:  http://$CURRENT_IP:3012"
  exit 0
fi

echo -e "${YELLOW}📝 Updating API host from $CONFIGURED_IP to $CURRENT_IP${NC}"

# Update .env.local
TIMESTAMP=$(date "+%Y-%m-%d %H:%M")
sed -i '' "s|^EXPO_PUBLIC_API_HOST=.*|EXPO_PUBLIC_API_HOST=$CURRENT_IP|" "$ENV_FILE"

# Add to history comment
if ! grep -q "# - $TIMESTAMP: $CURRENT_IP" "$ENV_FILE"; then
  echo "# - $TIMESTAMP: $CURRENT_IP" >> "$ENV_FILE"
fi

echo -e "${GREEN}✅ Updated .env.local${NC}"
echo ""
echo "API endpoints:"
echo "  Auth:  http://$CURRENT_IP:3001"
echo "  Feed:  http://$CURRENT_IP:3010"
echo "  Club:  http://$CURRENT_IP:3012"
echo ""
echo -e "${YELLOW}⚠️  Restart Expo to apply changes:${NC}"
echo "  1. Stop current Expo server (Ctrl+C)"
echo "  2. Run: npm start"
echo "  3. Reload app on device (shake → Reload)"
