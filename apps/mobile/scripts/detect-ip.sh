#!/bin/bash
echo "🔍 Detecting your local IP addresses..."
echo ""

# macOS WiFi IP
WIFI_IP=$(ipconfig getifaddr en0 2>/dev/null)
if [ ! -z "$WIFI_IP" ]; then
  echo "✅ WiFi IP: $WIFI_IP"
fi

# macOS Hotspot IP
HOTSPOT_IP=$(ipconfig getifaddr bridge100 2>/dev/null)
if [ ! -z "$HOTSPOT_IP" ]; then
  echo "✅ Hotspot IP: $HOTSPOT_IP"
fi

echo ""
echo "📝 To use an IP:"
echo "1. Create: apps/mobile/.env.local"
echo "2. Add: EXPO_PUBLIC_API_HOST=<YOUR_IP>"
echo ""
echo "💡 Current: Using localhost (change if needed)"
