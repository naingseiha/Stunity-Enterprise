# 🚨 System Resource Optimization Guide
**Critical Issue:** File Descriptor Exhaustion on macOS  
**Date:** February 13, 2026

---

## 🔴 Problem Description

### **Symptoms:**
```
ENFILE: file table overflow
Abort trap: 6
Segmentation fault: 11
Services failing to start
Metro bundler crashes
```

### **Root Cause:**
- **macOS default limit:** 256 file descriptors
- **12 microservices running:** Each opens 50-200 files
- **Metro bundler:** Opens 100-500 files for caching
- **Total needed:** 2000-4000 file descriptors
- **Result:** System exhaustion

---

## ✅ Immediate Fix (Emergency)

### **Step 1: Kill Everything**
```bash
pkill -9 node
pkill -9 npm
pkill -9 expo
```

### **Step 2: Increase Limits**
```bash
# Check current limit
ulimit -n

# Increase to 65536
ulimit -n 65536

# Verify
ulimit -n  # Should show 65536
```

### **Step 3: Clean Temp Files**
```bash
cd /Users/naingseiha/Documents/Stunity-Enterprise

# Clean Metro cache
rm -rf /tmp/metro-*
rm -rf apps/mobile/.expo
rm -rf apps/mobile/node_modules/.cache

# Clean service logs
rm -rf /tmp/*.log
```

### **Step 4: Minimal Service Startup**

**For quiz feature testing, you only need 3 services:**

```bash
# Terminal 1: Auth Service
cd services/auth-service
npm run dev

# Terminal 2: Feed Service (wait 5 seconds after auth)
cd services/feed-service
npm run dev

# Terminal 3: Analytics Service (wait 5 seconds after feed)
cd services/analytics-service
npm run dev

# Terminal 4: Mobile App (wait 10 seconds after all services)
cd apps/mobile
ulimit -n 65536  # IMPORTANT: Run in this terminal too
npx expo start --clear
```

---

## 🔧 Permanent Solution

### **Option A: Update quick-start.sh**

Add these improvements:

```bash
#!/bin/bash

# Check and set ulimit
CURRENT_LIMIT=$(ulimit -n)
if [ "$CURRENT_LIMIT" -lt 65536 ]; then
  echo "⚠️  Increasing file descriptor limit to 65536..."
  ulimit -n 65536
fi

# Add minimal mode option
if [ "$1" == "--minimal" ]; then
  echo "🚀 Starting minimal services (Auth, Feed, Analytics)..."
  
  # Start only essential services
  cd services/auth-service && npm run dev > /tmp/auth.log 2>&1 &
  sleep 3
  
  cd services/feed-service && npm run dev > /tmp/feed.log 2>&1 &
  sleep 3
  
  cd services/analytics-service && npm run dev > /tmp/analytics.log 2>&1 &
  sleep 3
  
  echo "✅ Minimal services started"
  exit 0
fi

# Sequential startup with delays (not parallel)
for service in auth school student teacher class subject grade attendance timetable feed club analytics; do
  echo "Starting $service..."
  cd services/${service}-service && npm run dev > /tmp/${service}.log 2>&1 &
  sleep 2  # Wait 2 seconds before starting next service
done
```

### **Option B: Docker Compose** (Recommended for Production)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: stunity_enterprise
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  auth-service:
    build: ./services/auth-service
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/stunity_enterprise
      JWT_SECRET: stunity-enterprise-secret-2026
    depends_on:
      - postgres

  feed-service:
    build: ./services/feed-service
    ports:
      - "3010:3010"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/stunity_enterprise
      JWT_SECRET: stunity-enterprise-secret-2026
    depends_on:
      - postgres

  analytics-service:
    build: ./services/analytics-service
    ports:
      - "3014:3014"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/stunity_enterprise
      JWT_SECRET: stunity-enterprise-secret-2026
    depends_on:
      - postgres

volumes:
  postgres_data:
```

**Benefits:**
- Isolated containers (no resource conflicts)
- Automatic restarts
- Easy scaling
- Consistent environment

---

## 📊 Monitoring & Prevention

### **Check File Descriptor Usage:**

```bash
# Total open files (system-wide)
lsof | wc -l

# Files opened by Node processes
lsof -c node | wc -l

# Files opened by specific process
lsof -p <PID> | wc -l

# Current limits
ulimit -n      # Soft limit
ulimit -Hn     # Hard limit
```

### **Set Permanent Limits (macOS):**

Edit `/Library/LaunchDaemons/limit.maxfiles.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>limit.maxfiles</string>
    <key>ProgramArguments</key>
    <array>
      <string>launchctl</string>
      <string>limit</string>
      <string>maxfiles</string>
      <string>65536</string>
      <string>200000</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>ServiceIPC</key>
    <false/>
  </dict>
</plist>
```

Then:
```bash
sudo chown root:wheel /Library/LaunchDaemons/limit.maxfiles.plist
sudo launchctl load -w /Library/LaunchDaemons/limit.maxfiles.plist
```

**Reboot required for system-wide effect.**

---

## 🎯 Best Practices

### **Development Environment:**

1. **Use Minimal Services**
   - Only run services needed for current feature
   - Auth + Feature Service + Analytics

2. **Sequential Startup**
   - Never start all services simultaneously
   - Add 2-3 second delays between starts

3. **Monitor Resources**
   - Use Activity Monitor (macOS)
   - Check file descriptor usage regularly
   - Watch for memory leaks

4. **Clean Regularly**
   - Clear Metro cache daily: `npx expo start --clear`
   - Clean temp files: `rm -rf /tmp/metro-*`
   - Restart services every few hours

### **Production Environment:**

1. **Use Docker/Kubernetes**
   - Container isolation
   - Resource limits per service
   - Automatic scaling

2. **Reverse Proxy (nginx)**
   - Single entry point
   - Load balancing
   - Reduces connection overhead

3. **Process Manager (PM2)**
   - Automatic restarts
   - Log management
   - Cluster mode

---

## 📋 Troubleshooting Checklist

### **If Services Won't Start:**

- [ ] Check ulimit: `ulimit -n` (should be 65536)
- [ ] Kill all Node processes: `pkill -9 node`
- [ ] Clean temp files: `rm -rf /tmp/metro-* /tmp/*.log`
- [ ] Check available disk space: `df -h`
- [ ] Check service logs: `tail /tmp/*.log`
- [ ] Restart PostgreSQL: `brew services restart postgresql@14`

### **If Metro Bundler Crashes:**

- [ ] Increase ulimit in terminal: `ulimit -n 65536`
- [ ] Clear Metro cache: `rm -rf /tmp/metro-*`
- [ ] Clear Expo cache: `rm -rf apps/mobile/.expo`
- [ ] Clear node_modules cache: `rm -rf apps/mobile/node_modules/.cache`
- [ ] Start with clean flag: `npx expo start --clear`
- [ ] If still failing, restart computer

### **If Getting 403 Errors:**

- [ ] Verify JWT_SECRET matches across services
- [ ] Log out and log back in (fresh token)
- [ ] Check service is running: `lsof -i :3014`
- [ ] Check service logs for auth errors
- [ ] Verify token in AsyncStorage is valid

---

## 🚀 Quick Reference

### **Minimal Startup (Recommended):**

```bash
# Terminal 1
cd ~/Documents/Stunity-Enterprise
ulimit -n 65536
cd services/auth-service && npm run dev

# Terminal 2 (after auth starts)
cd ~/Documents/Stunity-Enterprise
cd services/feed-service && npm run dev

# Terminal 3 (after feed starts)
cd ~/Documents/Stunity-Enterprise
cd services/analytics-service && npm run dev

# Terminal 4 (after all services start)
cd ~/Documents/Stunity-Enterprise/apps/mobile
ulimit -n 65536
npx expo start --clear
```

### **Full Startup (If Needed):**

```bash
# Set limit FIRST
ulimit -n 65536

# Use updated quick-start script
./quick-start.sh --minimal  # 3 services only
# OR
./quick-start.sh            # All services (sequential)
```

### **Emergency Recovery:**

```bash
# Kill everything
pkill -9 node; pkill -9 npm; pkill -9 expo

# Clean everything
rm -rf /tmp/metro-* /tmp/*.log apps/mobile/.expo apps/mobile/node_modules/.cache

# Increase limit
ulimit -n 65536

# Start minimal
cd services/auth-service && npm run dev
```

---

## 📈 Resource Requirements

### **Per Service:**
- **File Descriptors:** 50-200
- **Memory:** 100-300 MB
- **CPU:** 5-15% (idle), 20-50% (active)

### **Metro Bundler:**
- **File Descriptors:** 100-500
- **Memory:** 500 MB - 2 GB
- **CPU:** 50-100% (bundling), 10-20% (idle)

### **Total System (12 services + Metro):**
- **File Descriptors:** 2000-4000
- **Memory:** 4-8 GB
- **CPU:** 50-200%

### **Recommended System:**
- **RAM:** 16 GB minimum
- **CPU:** 8 cores (Apple Silicon recommended)
- **Storage:** 50 GB free space (node_modules)
- **OS:** macOS 12+ with increased limits

---

## ✅ Success Checklist

After applying fixes, verify:

- [ ] `ulimit -n` shows 65536
- [ ] All 3 essential services running
- [ ] No error logs in `/tmp/*.log`
- [ ] Mobile app connects successfully
- [ ] Quiz submission works
- [ ] Analytics API responds (200 OK)
- [ ] No file descriptor errors

---

**Last Updated:** February 13, 2026  
**Status:** Critical fix applied, permanent solution pending
