#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SDK_PATH="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$HOME/Library/Android/sdk}}"
LOCAL_PROPERTIES_PATH="$PROJECT_ROOT/android/local.properties"

if [ ! -d "$SDK_PATH" ]; then
  echo "❌ Android SDK not found at: $SDK_PATH"
  echo "Set ANDROID_HOME or ANDROID_SDK_ROOT, or install SDK at $HOME/Library/Android/sdk"
  exit 1
fi

mkdir -p "$PROJECT_ROOT/android"
printf 'sdk.dir=%s\n' "$SDK_PATH" > "$LOCAL_PROPERTIES_PATH"

echo "✅ Android SDK configured: $SDK_PATH"
echo "✅ Wrote $LOCAL_PROPERTIES_PATH"
