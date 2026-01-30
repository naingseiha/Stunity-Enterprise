# Quick Start Guide

**Welcome to Stunity Enterprise V2!**

This guide will help you get started quickly.

---

## 📋 PREREQUISITES

- Node.js 18+ installed
- PostgreSQL database running
- Git installed

---

## 🚀 QUICK START

### **1. Clone & Install**

```bash
cd /Users/naingseiha/Documents/Stunity-Enterprise
npm install
```

### **2. Start All Services**

```bash
./start-all-services.sh
```

This will start all 9 microservices:
- Web App (Port 3000)
- Auth Service (Port 3001)
- School Service (Port 3002)
- Student Service (Port 3003)
- Teacher Service (Port 3004)
- Class Service (Port 3005)
- Subject Service (Port 3006)
- Grade Service (Port 3007)
- Attendance Service (Port 3008)

### **3. Check Services**

```bash
./check-services.sh
```

All services should show ✅ Running.

### **4. Access Application**

Open browser: **http://localhost:3000**

---

## 🛠️ COMMON COMMANDS

### **Service Management:**

```bash
# Start all services
./start-all-services.sh

# Stop all services
./stop-all-services.sh

# Restart all services
./restart-all-services.sh

# Check service status
./check-services.sh

# Kill specific port
./kill-port.sh 3000
```

### **Database:**

```bash
# Run migrations
cd services/[service-name]
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# View database
npx prisma studio
```

---

## 📁 KEY LOCATIONS

### **Frontend:**
- Pages: `/apps/web/src/app/[locale]/`
- Components: `/apps/web/src/components/`
- API Clients: `/apps/web/src/lib/api/`
- Contexts: `/apps/web/src/contexts/`

### **Backend:**
- Services: `/services/[service-name]/src/`
- Database: `/services/[service-name]/prisma/`

### **Documentation:**
- **COMPLETE_SYSTEM_STATUS.md** - Full system overview
- **IMPLEMENTATION_ROADMAP.md** - Next features to build
- **SERVICE_MANAGEMENT.md** - Service operations guide

---

## 🎯 KEY FEATURES

### **Already Implemented:**
- ✅ Students Management
- ✅ Teachers Management
- ✅ Classes Management
- ✅ Academic Years
- ✅ Subjects
- ✅ Grade Entry
- ✅ Attendance Marking

### **Coming Next:**
- 🚧 Attendance Reports
- 🚧 Grade Reports
- 🚧 Timetable Generator (NEW!)

---

## 🐛 TROUBLESHOOTING

### **Service Won't Start:**
```bash
# Check if port is in use
lsof -ti:3000

# Kill the port
./kill-port.sh 3000

# Restart service
./restart-all-services.sh
```

### **Database Connection Error:**
```bash
# Check .env file in service directory
# Verify DATABASE_URL is correct
# Ensure PostgreSQL is running
```

### **Build Error:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Clear Next.js cache
rm -rf apps/web/.next
```

---

## 📚 LEARN MORE

- **System Overview:** See `COMPLETE_SYSTEM_STATUS.md`
- **Next Steps:** See `IMPLEMENTATION_ROADMAP.md`
- **Service Management:** See `SERVICE_MANAGEMENT.md`

---

## 💡 TIPS

1. **Always check service status** before starting work
2. **Read the roadmap** to understand next features
3. **Use service management scripts** instead of manual commands
4. **Keep documentation updated** as you build

---

**Need Help?** Check the documentation or review service logs at `/tmp/stunity-*.log`

---

**Ready to build? Start with the IMPLEMENTATION_ROADMAP.md!** 🚀
