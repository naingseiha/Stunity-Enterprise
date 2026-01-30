# 🛠️ Service Management Guide

## 📋 Available Scripts

### **1. Check Service Status**
```bash
./check-services.sh
```
**What it does:**
- Shows which ports are in use
- Displays PID for running services
- Shows summary of running/free ports

**Example output:**
```
Port  | Service          | Status   | PID
------|------------------|----------|--------
3000  | Web App          | 🟢 Running | 12345
3001  | Auth Service     | ⚪ Free    | -
```

---

### **2. Stop All Services**
```bash
./stop-all-services.sh
```
**What it does:**
- Kills all processes on ports 3000-3006
- Shows what was stopped
- Verifies all ports are free

**Use this when:**
- Ports are stuck/occupied
- Need to restart services
- Before deploying updates

---

### **3. Start All Services**
```bash
./start-all-services.sh
```
**What it does:**
- Checks for port conflicts first
- Starts all 7 services (Auth, School, Student, Teacher, Class, Subject, Web)
- Verifies each service started successfully
- Shows access URLs

**Requirements:**
- All ports must be free (3000-3006)
- If ports are in use, script will exit with error

---

### **4. Restart All Services**
```bash
./restart-all-services.sh
```
**What it does:**
- Stops all services
- Waits 2 seconds
- Starts all services

**Use this when:**
- Made code changes
- Services are misbehaving
- Need a clean restart

---

### **5. Kill Specific Port**
```bash
./kill-port.sh <PORT>
```
**Examples:**
```bash
./kill-port.sh 3001    # Kill auth service
./kill-port.sh 3006    # Kill subject service
```

**What it does:**
- Kills process on specified port
- Verifies port is free after

---

## 🚀 Common Workflows

### **First Time Startup**
```bash
# 1. Check status
./check-services.sh

# 2. Start all services
./start-all-services.sh

# 3. Open browser
# http://localhost:3000
```

---

### **Port Already in Use Error**
```bash
# Option 1: Stop everything and start
./stop-all-services.sh
./start-all-services.sh

# Option 2: Use restart (does both)
./restart-all-services.sh

# Option 3: Kill specific port
./kill-port.sh 3001
```

---

### **After Code Changes**
```bash
# Restart all services to pick up changes
./restart-all-services.sh
```

---

### **Troubleshooting**
```bash
# 1. Check which services are running
./check-services.sh

# 2. View logs for specific service
tail -f /tmp/stunity-auth.log
tail -f /tmp/stunity-web.log

# 3. If service failed to start, check its log
cat /tmp/stunity-<service-name>.log

# 4. Kill all and restart
./stop-all-services.sh
sleep 2
./start-all-services.sh
```

---

## 📊 Service Ports

| Port | Service         | Log File                    |
|------|-----------------|------------------------------|
| 3000 | Web Application | `/tmp/stunity-web.log`       |
| 3001 | Auth Service    | `/tmp/stunity-auth.log`      |
| 3002 | School Service  | `/tmp/stunity-school.log`    |
| 3003 | Student Service | `/tmp/stunity-student.log`   |
| 3004 | Teacher Service | `/tmp/stunity-teacher.log`   |
| 3005 | Class Service   | `/tmp/stunity-class.log`     |
| 3006 | Subject Service | `/tmp/stunity-subject.log`   |

---

## ⚠️ Important Notes

1. **Always check status first** - Run `./check-services.sh` before starting
2. **Logs are in /tmp** - They persist even after stopping services
3. **Wait between stops/starts** - Give processes time to fully terminate
4. **Port conflicts** - If start fails, ports are likely still in use
5. **Manual kill** - If scripts don't work: `lsof -ti:<PORT> | xargs kill -9`

---

## 🔧 Manual Commands

If scripts don't work, use these commands:

### Check port
```bash
lsof -ti:3001
```

### Kill specific port
```bash
kill -9 $(lsof -ti:3001)
```

### Kill all Node processes (DANGEROUS - kills ALL node processes)
```bash
pkill -9 node
```

### Check if port is listening
```bash
lsof -Pi :3001 -sTCP:LISTEN
```

### View all Node processes
```bash
ps aux | grep node
```

---

## 📝 Quick Reference

```bash
# Check status
./check-services.sh

# Stop all
./stop-all-services.sh

# Start all
./start-all-services.sh

# Restart all (stop + start)
./restart-all-services.sh

# Kill specific port
./kill-port.sh 3001

# View logs
tail -f /tmp/stunity-*.log
```

---

## 💡 Pro Tips

1. **Create an alias** (add to ~/.zshrc or ~/.bashrc):
   ```bash
   alias stunity-start="cd ~/Documents/Stunity-Enterprise && ./start-all-services.sh"
   alias stunity-stop="cd ~/Documents/Stunity-Enterprise && ./stop-all-services.sh"
   alias stunity-check="cd ~/Documents/Stunity-Enterprise && ./check-services.sh"
   alias stunity-restart="cd ~/Documents/Stunity-Enterprise && ./restart-all-services.sh"
   ```

2. **Monitor all logs at once**:
   ```bash
   tail -f /tmp/stunity-*.log
   ```

3. **Clean old logs**:
   ```bash
   rm /tmp/stunity-*.log
   ```

---

## 🆘 Emergency Stop

If everything is stuck:

```bash
# Stop all services
./stop-all-services.sh

# If that doesn't work, kill all node processes
pkill -9 node

# Verify all ports are free
./check-services.sh

# Start fresh
./start-all-services.sh
```

---

**Need help?** Check logs in `/tmp/stunity-*.log` for error messages.
