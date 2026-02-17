# Architecture Fix Summary - February 8, 2026

## Problem Identified
The Stunity Enterprise services were failing to start on Apple Silicon (M1 Mac) with the following error:

```
Error: You installed esbuild for another platform than the one you're currently using.
Specifically the "@esbuild/darwin-x64" package is present but this platform
needs the "@esbuild/darwin-arm64" package instead.
```

**Affected Services:**
- ❌ Class Service (Port 3005)
- ❌ Subject Service (Port 3006)  
- ❌ Grade Service (Port 3007)
- ❌ Timetable Service (Port 3009)

**Root Cause:**
Node.js was running in Rosetta 2 compatibility mode (x86_64) instead of native ARM64 mode. This caused npm to install the wrong architecture version of esbuild and other native dependencies.

## Solution Implemented

### 1. Architecture Detection
Updated `quick-start.sh` to detect architecture mismatches and warn users before services fail.

### 2. Automatic Fix Script
Created `fix-architecture.sh` that:
- Removes all node_modules directories
- Cleans package-lock files
- Reinstalls dependencies with correct architecture
- Generates Prisma client
- Verifies esbuild installation

### 3. Configuration Files
- Added `.npmrc` with `legacy-peer-deps=true` to handle React 18/19 peer dependency conflicts
- Ensures proper architecture selection during npm install

### 4. Documentation
Created comprehensive guides:
- `QUICK_FIX.md` - Quick reference for users experiencing the issue
- `ARCHITECTURE_FIX.md` - Detailed troubleshooting and prevention guide
- This summary document

### 5. Verification
✅ All 11 services now start successfully:
- Auth Service (3001)
- School Service (3002)
- Student Service (3003)
- Teacher Service (3004)
- **Class Service (3005)** ← Fixed!
- **Subject Service (3006)** ← Fixed!
- **Grade Service (3007)** ← Fixed!
- Attendance Service (3008)
- **Timetable Service (3009)** ← Fixed!
- Feed Service (3010)
- Web App (3000)

## How to Use

### If You Encounter the Error:
```bash
./fix-architecture.sh
```

### Start Services:
```bash
./quick-start.sh
```

### Verify Services:
```bash
# All should return OK or a health check response
curl http://localhost:3005/health
curl http://localhost:3006/health
curl http://localhost:3007/health
curl http://localhost:3009/health
```

## Prevention

To prevent this issue in the future:

1. **Check Node.js Architecture:**
   ```bash
   node -p "process.arch"
   # Should output: arm64 (NOT x64)
   ```

2. **If Wrong Architecture:**
   - Reinstall Node.js from https://nodejs.org/ (ARM64 version)
   - Or use nvm to manage Node.js versions
   - Ensure Terminal.app is not set to "Open using Rosetta"

3. **After Any Node.js Change:**
   ```bash
   ./fix-architecture.sh
   ```

## Technical Details

### Files Modified:
- `.npmrc` (new)
- `fix-architecture.sh` (new)
- `quick-start.sh` (updated)
- `ARCHITECTURE_FIX.md` (new)
- `QUICK_FIX.md` (new)
- `ARCHITECTURE_FIX_SUMMARY.md` (this file)

### Packages Fixed:
- Removed: `@esbuild/darwin-x64`
- Installed: `@esbuild/darwin-arm64@0.27.2`
- Generated: Prisma Client

### Why This Keeps Happening:
The issue recurs because your Node.js binary is still running in x86_64 mode. Each time you reinstall node_modules, npm detects the wrong architecture and installs x64 packages. The permanent fix is to ensure Node.js itself runs natively in ARM64 mode.

## Verification Command:
```bash
# All should show arm64 (or darwin-arm64 for esbuild)
echo "System: $(uname -m)"
echo "Node: $(node -p 'process.arch')"
echo "esbuild:"
ls -la node_modules/@esbuild/ | grep darwin
```

## Support

If the issue persists after running `fix-architecture.sh`:
1. Check your Node.js architecture: `node -p "process.arch"`
2. If it shows `x64`, you need to reinstall Node.js
3. See `ARCHITECTURE_FIX.md` for detailed troubleshooting
4. Check service logs in `/tmp/*.log` for other potential issues

---

**Status:** ✅ RESOLVED - All services running successfully  
**Date:** February 8, 2026  
**Platform:** macOS (Apple Silicon M1/M2/M3)
