# Stunity Enterprise V2

**Multi-Tenant School Management SaaS for Cambodia**

A modern, microservices-based school management system built with Next.js 14 and TypeScript.

---

## 🎯 Overview

Stunity Enterprise V2 is a complete school management solution designed specifically for Cambodian schools, featuring:

- **Multi-tenant SaaS architecture** - One platform, multiple schools
- **Microservices backend** - 9 independent services
- **Modern UI** - Next.js 14 with TailwindCSS
- **Bilingual support** - English & Khmer
- **Mobile responsive** - Works on all devices

---

## ✨ Current Features

### **Core Management:**
- ✅ **Students** - Complete student management with profiles
- ✅ **Teachers** - Teacher management with subject specialization
- ✅ **Classes** - Class management with sections and grade levels
- ✅ **Academic Years** - Multi-year support with rollover
- ✅ **Subjects** - Subject catalog with categories and grade levels

### **Academic Operations:**
- ✅ **Grade Entry** - Excel-like grade entry interface with auto-save
- ✅ **Attendance** - Daily attendance marking with 5 status types
- ✅ **Settings Rollover** - Copy subjects, teachers, classes between years

### **System Features:**
- ✅ **Unified Navigation** - Consistent sidebar navigation across all pages
- ✅ **Academic Year Context** - Global academic year selection
- ✅ **Multi-language** - English and Khmer support
- ✅ **JWT Authentication** - Secure token-based auth

---

## 🚀 Quick Start

### **Prerequisites:**
- Node.js 18+
- PostgreSQL  
- Git

### **Installation:**

```bash
# Clone repository
git clone <repository-url>
cd Stunity-Enterprise

# Install dependencies
npm install

# Start all services
./start-all-services.sh

# Check service status
./check-services.sh

# Open browser
open http://localhost:3000
```

See **QUICK_START.md** for detailed instructions.

---

## 📁 Project Structure

```
Stunity-Enterprise/
├── apps/web/                   # Next.js Frontend (Port 3000)
├── services/
│   ├── auth-service/           # Authentication (Port 3001)
│   ├── school-service/         # School Management (Port 3002)
│   ├── student-service/        # Students (Port 3003)
│   ├── teacher-service/        # Teachers (Port 3004)
│   ├── class-service/          # Classes (Port 3005)
│   ├── subject-service/        # Subjects (Port 3006)
│   ├── grade-service/          # Grades (Port 3007)
│   └── attendance-service/     # Attendance (Port 3008)
├── *.sh                        # Service management scripts
└── docs/                       # Documentation
```

---

## 📚 Documentation

### **Essential Docs:**
- **QUICK_START.md** - Get started in 5 minutes
- **COMPLETE_SYSTEM_STATUS.md** - Full system overview and features
- **IMPLEMENTATION_ROADMAP.md** - Next features to implement
- **SERVICE_MANAGEMENT.md** - Service operations guide

### **Read First:**
1. Start with **QUICK_START.md**
2. Review **COMPLETE_SYSTEM_STATUS.md** for current features
3. Check **IMPLEMENTATION_ROADMAP.md** for what's next
4. Use **SERVICE_MANAGEMENT.md** when working with services

---

## 🛠️ Technology Stack

### **Frontend:**
- Next.js 14 (App Router)
- TypeScript
- TailwindCSS
- next-intl (i18n)

### **Backend:**
- Node.js + Express
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT Authentication

---

## 🎯 Next Features

### **Priority 1: Feature Completeness** (Week 1)
- Attendance Reports & Analytics
- Grade Reports & Analytics
- Student/Teacher Profile Enhancements

### **Priority 2: Timetable Generator** (Week 2-3)
- Automatic timetable generation
- Teacher-Subject-Class assignment
- Conflict detection and resolution
- Class/Teacher/Student timetable views
- **This is NEW and unique to V2!**

See **IMPLEMENTATION_ROADMAP.md** for full details.

---

## 🧪 Service Management

### **Common Commands:**

```bash
# Start all services
./start-all-services.sh

# Stop all services
./stop-all-services.sh

# Restart all services
./restart-all-services.sh

# Check status
./check-services.sh

# Kill specific port
./kill-port.sh <port>

# Create academic year (helper)
./create-academic-year.sh
```

---

## 📊 System Status

**Current Phase:** ✅ Core System Complete

**Services:** 9/9 Running  
**Features:** 8 Major Features Complete  
**Documentation:** 4 Essential Docs  

**Next Phase:** 🚀 Feature Enhancement & Timetable System

---

## 🐛 Troubleshooting

### **Port Already in Use:**
```bash
./kill-port.sh <port>
./restart-all-services.sh
```

### **Service Won't Start:**
```bash
# Check logs
tail -f /tmp/stunity-*.log

# Restart specific service
cd services/<service-name>
npm run dev
```

### **Database Issues:**
```bash
# Run migrations
cd services/<service-name>
npx prisma migrate dev
```

---

## 📞 Support

- **Logs:** `/tmp/stunity-*.log`
- **Documentation:** `/docs` and root `.md` files
- **Service Status:** `./check-services.sh`

---

## 🎓 For Developers

1. **Read QUICK_START.md** - Setup and first run
2. **Read COMPLETE_SYSTEM_STATUS.md** - Understand the system
3. **Read IMPLEMENTATION_ROADMAP.md** - See what's next
4. **Review SERVICE_MANAGEMENT.md** - Learn service operations
5. **Start building!** 🚀

---

## 📄 License

Proprietary - Stunity Enterprise

---

**Built with ❤️ for Cambodian Schools**
