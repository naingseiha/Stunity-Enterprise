# Quick Fix Guide - Apple Silicon (M1/M2/M3) Users

## ⚠️ Getting esbuild Architecture Errors?

If you see this error when starting services:
```
Error: You installed esbuild for another platform than the one you're currently using.
Specifically the "@esbuild/darwin-x64" package is present but this platform
needs the "@esbuild/darwin-arm64" package instead.
```

### Quick Fix (2 minutes):
```bash
./fix-architecture.sh
```

That's it! This script will:
1. ✅ Clean all dependencies
2. ✅ Reinstall with correct ARM64 architecture
3. ✅ Generate Prisma client
4. ✅ Verify esbuild is correctly installed

### Then Start Services:
```bash
./quick-start.sh
```

All services should now start successfully! ✅

## Why Does This Happen?

Your Node.js is running in Rosetta 2 (x86_64 compatibility mode) instead of native ARM64 mode. This happens when:
- You installed Node.js before updating to macOS for Apple Silicon
- You're using an Intel-based tool that launches Node.js
- Your terminal is configured to run in Rosetta mode

## Permanent Solution

To prevent this issue from recurring:

### Check Your Setup
```bash
# Should output "arm64"
node -p "process.arch"

# If it outputs "x64", you need to fix your Node.js installation
```

### Fix Node.js (Choose One):

**Option 1: Reinstall Node.js (Easiest)**
1. Download ARM64 installer from https://nodejs.org/
2. Install and restart terminal
3. Verify: `node -p "process.arch"` shows `arm64`

**Option 2: Check Terminal Settings**
1. Right-click Terminal.app in Applications
2. Get Info → Uncheck "Open using Rosetta"
3. Restart Terminal

**Option 3: Use nvm**
```bash
arch -arm64 zsh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

## Need More Help?

See the full troubleshooting guide: [ARCHITECTURE_FIX.md](./ARCHITECTURE_FIX.md)

## Files Modified

- ✅ `.npmrc` - Added to handle peer dependencies
- ✅ `fix-architecture.sh` - One-command fix script
- ✅ `quick-start.sh` - Now detects architecture mismatches
- ✅ `ARCHITECTURE_FIX.md` - Complete troubleshooting guide
- ✅ `QUICK_FIX.md` - This quick reference (you are here!)

---

**TL;DR**: Run `./fix-architecture.sh` then `./quick-start.sh` and you're good to go! 🚀
