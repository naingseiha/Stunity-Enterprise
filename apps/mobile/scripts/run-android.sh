#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SDK_PATH="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$HOME/Library/Android/sdk}}"

bash "$PROJECT_ROOT/scripts/ensure-android-sdk.sh"

export ANDROID_HOME="$SDK_PATH"
export ANDROID_SDK_ROOT="$SDK_PATH"

cd "$PROJECT_ROOT"
npx expo run:android "$@"
