# Sharp Installation Fix for Development Mode

## Problem

When running `npm run dev` (ts-node), Sharp fails to load on Apple Silicon (M1/M2):

```
Error: Could not load the "sharp" module using the darwin-arm64 runtime
```

This happens because:
1. Sharp is a native module that needs to be compiled for your architecture
2. In a monorepo workspace, Sharp at root level may not be properly compiled
3. `ts-node` loads from workspace root, not service folder

## Solutions

### Solution 1: Use Compiled Version (Recommended)

Instead of `npm run dev`, use the compiled version:

```bash
cd services/feed-service

# Build TypeScript
npm run build

# Run compiled version (works with Sharp)
npm start
```

**Pros:**
- ✅ Works immediately
- ✅ Production-like environment
- ✅ Faster startup

**Cons:**
- Need to rebuild after changes (run `npm run build` again)

---

### Solution 2: Use Quick Start Script

The project's quick-start script handles everything:

```bash
cd /Users/naingseiha/Documents/Stunity-Enterprise
./quick-start.sh
```

This starts all services including feed-service with proper Sharp support.

---

### Solution 3: Fix Sharp at Root (Advanced)

Install Sharp with proper native bindings at workspace root:

```bash
cd /Users/naingseiha/Documents/Stunity-Enterprise

# Remove any existing sharp
rm -rf node_modules/sharp
rm -rf node_modules/@img

# Install with platform-specific flags
npm install --include=optional --os=darwin --cpu=arm64 sharp

# Or rebuild native modules
npm rebuild sharp
```

Then try `npm run dev` again.

---

### Solution 4: Use Nodemon with Compiled Code

Modify `package.json` to watch compiled output:

```json
{
  "scripts": {
    "dev": "tsc --watch & nodemon dist/index.js",
    "dev:ts": "ts-node src/index.ts"
  }
}
```

Then:
```bash
npm run dev  # Watch and restart on changes
```

---

## Recommended Workflow

For development with Sharp:

1. **Start services:**
   ```bash
   ./quick-start.sh
   ```

2. **Make changes** to feed-service code

3. **Rebuild and test:**
   ```bash
   cd services/feed-service
   npm run build
   # Service auto-restarts with quick-start
   ```

4. **For rapid development without Sharp features:**
   - Comment out Sharp imports temporarily
   - Use `npm run dev` for hot reload
   - Uncomment and rebuild before testing image uploads

---

## Why This Happens

Sharp is a **native C++ module** that:
- Must be compiled for each platform (darwin-arm64, linux-x64, etc.)
- Uses node-gyp for compilation
- Needs platform-specific binaries

When using:
- ✅ `npm start` → Uses compiled `dist/index.js` → Works
- ❌ `npm run dev` → Uses `ts-node src/index.ts` → May fail in monorepo

---

## Quick Fix Right Now

**Option A: Use compiled version**
```bash
cd services/feed-service
npm run build && npm start
```

**Option B: Use quick-start**
```bash
cd /Users/naingseiha/Documents/Stunity-Enterprise
./quick-start.sh
```

Both options work perfectly with Sharp! ✅

---

**Status:** Feed service is running on port 3010  
**Health Check:** http://localhost:3010/health  
**Image Upload:** http://localhost:3010/media/upload (with Sharp optimization)
