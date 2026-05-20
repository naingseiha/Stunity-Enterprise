#!/usr/bin/env bash
# Load Supabase DEV database overrides for this shell session.
# Works when sourced from bash or zsh.
#
# Usage:
#   source scripts/activate-dev-database.sh
#   ./quick-start-lite.sh
#
# Requires .env.development.local (gitignored). Generate once:
#   ./scripts/setup-dev-supabase-env.sh

# Detect "sourced" vs executed (bash + zsh)
if ! (return 0 2>/dev/null); then
  echo "Run with: source scripts/activate-dev-database.sh"
  exit 1
fi

# Resolve this file's directory when sourced
if [ -n "${BASH_SOURCE[0]:-}" ]; then
  _SCRIPT_PATH="${BASH_SOURCE[0]}"
elif [ -n "${ZSH_VERSION:-}" ]; then
  # zsh: path of the file being sourced
  _SCRIPT_PATH="${(%):-%x}"
else
  _SCRIPT_PATH="$0"
fi

_SCRIPT_DIR="$(cd "$(dirname "$_SCRIPT_PATH")" && pwd)"
_PROJECT_DIR="$(cd "$_SCRIPT_DIR/.." && pwd)"
_DEV_ENV="$_PROJECT_DIR/.env.development.local"

if [ ! -f "$_DEV_ENV" ]; then
  echo "❌ Missing $_DEV_ENV — run: ./scripts/setup-dev-supabase-env.sh"
  return 1 2>/dev/null || exit 1
fi

set -a
# shellcheck disable=SC1090
source "$_DEV_ENV"
set +a

export STUNITY_USE_DEV_DB=1
echo "✅ Dev Supabase active (stunity-dev / ykvqgyrwizqjjzfuitto)"
echo "   Start stack: ./quick-start-lite.sh"
