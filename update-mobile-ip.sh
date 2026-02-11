#!/bin/bash

# ============================================================================
# Mobile IP Auto-Update Script (OPTIONAL)
# ============================================================================
# 
# This script automatically detects your local IP address and updates the
# .env file for the mobile app.
#
# 🎉 NEW: As of Feb 2026, this script is now OPTIONAL!
# The mobile app auto-detects your IP using Expo's hostUri.
# Only use this if you need to manually override auto-detection.
# ============================================================================

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ENV_FILE="$SCRIPT_DIR/.env"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Detecting local IP address...${NC}"

# Get local IP address (works on macOS and Linux)
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
else
  # Linux
  LOCAL_IP=$(hostname -I | awk '{print $1}')
fi

if [ -z "$LOCAL_IP" ]; then
  echo -e "${YELLOW}⚠️  Could not detect local IP. Using localhost${NC}"
  LOCAL_IP="localhost"
fi

echo -e "${GREEN}📍 Detected IP: $LOCAL_IP${NC}"

# Check if .env exists
if [ ! -f "$ENV_FILE" ]; then
  echo -e "${YELLOW}⚠️  .env file not found, creating one...${NC}"
  touch "$ENV_FILE"
fi

# Update or add EXPO_PUBLIC_API_HOST in .env
if grep -q "EXPO_PUBLIC_API_HOST=" "$ENV_FILE"; then
  # Update existing entry
  sed -i.bak "s/EXPO_PUBLIC_API_HOST=.*/EXPO_PUBLIC_API_HOST=$LOCAL_IP/" "$ENV_FILE"
  echo -e "${GREEN}✅ Updated EXPO_PUBLIC_API_HOST in .env${NC}"
else
  # Add new entry
  echo "EXPO_PUBLIC_API_HOST=$LOCAL_IP" >> "$ENV_FILE"
  echo -e "${GREEN}✅ Added EXPO_PUBLIC_API_HOST to .env${NC}"
fi

# Remove backup file
rm -f "$ENV_FILE.bak"

echo ""
echo -e "${BLUE}📱 Mobile app will now connect to:${NC}"
echo -e "   Auth:  http://$LOCAL_IP:3001"
echo -e "   Feed:  http://$LOCAL_IP:3010"
echo -e "   Clubs: http://$LOCAL_IP:3012"
echo ""
echo -e "${YELLOW}⚠️  Restart Expo dev server to apply changes:${NC}"
echo -e "   1. Stop Expo (Ctrl+C)"
echo -e "   2. Run: ${GREEN}cd apps/mobile && npx expo start --clear${NC}"
echo ""
echo -e "${BLUE}💡 TIP: The app now auto-detects IP changes!${NC}"
echo -e "   You only need this script if auto-detection fails."
echo ""
