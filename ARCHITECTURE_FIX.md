# esbuild Architecture Fix for Apple Silicon (M1/M2/M3)

## Problem
When using this project on Apple Silicon Macs (M1/M2/M3), you may encounter an esbuild architecture mismatch error:

```
Error: You installed esbuild for another platform than the one you're currently using.
Specifically the "@esbuild/darwin-x64" package is present but this platform
needs the "@esbuild/darwin-arm64" package instead.
```

This occurs when:
- Node.js runs under Rosetta 2 (x86_64 emulation mode)
- Dependencies are installed with the wrong architecture
- You switch between ARM64 and x64 Node.js installations

## Root Cause
Your Node.js binary is running in Rosetta 2 compatibility mode (x86_64) instead of native ARM64 mode. This causes npm to install x64 versions of native packages like esbuild.

## One-Time Fix

### Option 1: Use the Fix Script (Recommended)
```bash
./fix-architecture.sh
```

This script will:
1. Remove all node_modules
2. Reinstall dependencies with correct architecture
3. Verify esbuild installation

### Option 2: Manual Fix
```bash
# 1. Clean all dependencies
rm -rf node_modules services/*/node_modules apps/*/node_modules packages/*/node_modules
rm -f package-lock.json

# 2. Remove wrong esbuild architecture
rm -rf node_modules/@esbuild/darwin-x64

# 3. Install with correct architecture
npm install --legacy-peer-deps

# 4. Generate Prisma client
cd packages/database && npx prisma generate

# 5. Verify
ls -la node_modules/@esbuild/ | grep darwin
# Should show: darwin-arm64 (not darwin-x64)
```

## Permanent Solution

### Check Your Node.js Architecture
```bash
# Check system architecture
arch
# Should output: arm64

# Check Node.js architecture  
node -p "process.arch"
# Should output: arm64 (NOT x64)
```

If Node.js shows `x64`, you need to fix your Node.js installation:

### Fix Node.js to Run Natively

**Option A: Reinstall Node.js (Recommended)**
1. Download the ARM64 installer from https://nodejs.org/
2. Install it (choose the "macOS ARM64" version)
3. Restart your terminal
4. Verify: `node -p "process.arch"` should show `arm64`

**Option B: Use nvm (Node Version Manager)**
```bash
# Install nvm in ARM64 mode
arch -arm64 zsh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node.js
nvm install 20
nvm use 20
```

**Option C: Force ARM64 in Your Shell**
Add this to your `~/.zshrc` or `~/.bash_profile`:
```bash
# Force ARM64 architecture for Homebrew and Node
if [ "$(uname -m)" = "arm64" ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
fi
```

## Configuration Files Added

### `.npmrc`
The project now includes an `.npmrc` file with:
```
legacy-peer-deps=true
```

This helps npm handle peer dependency conflicts during installation.

### `fix-architecture.sh`
A maintenance script that:
- Detects architecture mismatches
- Cleans and reinstalls dependencies
- Verifies esbuild installation

### `quick-start.sh` (Updated)
Now includes architecture checks that warn you if running under Rosetta 2.

## Troubleshooting

### Services Still Failing?
```bash
# Check service logs
cat /tmp/class.log
cat /tmp/subject.log
cat /tmp/grade.log
cat /tmp/timetable.log
```

### Verify Architecture
```bash
# Should all show arm64
arch
node -p "process.arch"  
ls -la node_modules/@esbuild/ | grep darwin
```

### Still Getting x64 esbuild?
Your terminal might be running in Rosetta mode:
```bash
# Check terminal architecture
arch
# If it shows "i386" or "x86_64", your terminal is in Rosetta mode

# Solution 1: Quit Terminal.app and reopen
# Solution 2: Right-click Terminal.app > Get Info > Uncheck "Open using Rosetta"
# Solution 3: Use this command to start a new ARM64 shell:
arch -arm64 zsh
```

## Prevention

1. **Always use native ARM64 Node.js** on Apple Silicon
2. **Check architecture** before installing: `node -p "process.arch"`
3. **Run fix script** if you see esbuild errors: `./fix-architecture.sh`
4. **Don't use Rosetta mode** unless absolutely necessary

## What Was Fixed

1. ✅ Added `.npmrc` with `legacy-peer-deps=true`
2. ✅ Removed `@esbuild/darwin-x64` package
3. ✅ Installed `@esbuild/darwin-arm64` package
4. ✅ Generated Prisma client
5. ✅ Updated `quick-start.sh` with architecture detection
6. ✅ Created `fix-architecture.sh` maintenance script
7. ✅ Verified all services start successfully

## Quick Reference

```bash
# Fix everything
./fix-architecture.sh

# Start all services
./quick-start.sh

# Check status
curl http://localhost:3005/health  # Class service
curl http://localhost:3006/health  # Subject service
curl http://localhost:3007/health  # Grade service
curl http://localhost:3009/health  # Timetable service
```
