#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SDK_PATH="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$HOME/Library/Android/sdk}}"
ADB_BIN="${SDK_PATH}/platform-tools/adb"

bash "$PROJECT_ROOT/scripts/ensure-android-sdk.sh"

export ANDROID_HOME="$SDK_PATH"
export ANDROID_SDK_ROOT="$SDK_PATH"

# Setup adb reverse for local microservices so real devices can hit host services
# even when mobile config resolves localhost/10.0.2.2 during development.
if [ -x "$ADB_BIN" ] && "$ADB_BIN" get-state >/dev/null 2>&1; then
  PORTS=(3001 3003 3004 3005 3007 3008 3009 3010 3011 3012 3013 3014)
  for port in "${PORTS[@]}"; do
    "$ADB_BIN" reverse "tcp:${port}" "tcp:${port}" >/dev/null 2>&1 || true
  done
  echo "✅ Configured adb reverse for local API ports: ${PORTS[*]}"
else
  echo "ℹ️  No adb-connected device detected before build (skipping adb reverse setup)"
fi

cd "$PROJECT_ROOT"
npx expo run:android "$@"
