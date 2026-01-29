# 🚀 How to Restart All Services - Manual Guide

## Quick Steps

Open **6 terminal windows** and run these commands:

### Terminal 1 - Auth Service (Port 3001)
```bash
cd ~/Documents/Stunity-Enterprise/services/auth-service
npm run dev
```

### Terminal 2 - School Service (Port 3002)
```bash
cd ~/Documents/Stunity-Enterprise/services/school-service
npm run dev
```

### Terminal 3 - Student Service (Port 3003)
```bash
cd ~/Documents/Stunity-Enterprise/services/student-service
npm run dev
```

### Terminal 4 - Teacher Service (Port 3004)
```bash
cd ~/Documents/Stunity-Enterprise/services/teacher-service
npm run dev
```

### Terminal 5 - Class Service (Port 3005)
```bash
cd ~/Documents/Stunity-Enterprise/services/class-service
npm run dev
```

### Terminal 6 - Web App (Port 3000)
```bash
cd ~/Documents/Stunity-Enterprise/apps/web
npm run dev
```

## Verify Services Are Running

In a new terminal, run:
```bash
curl http://localhost:3001/health  # Should show auth-service
curl http://localhost:3002/health  # Should show school-service
curl http://localhost:3004/health  # Should show teacher-service
curl http://localhost:3005/health  # Should show class-service
curl http://localhost:3000         # Should redirect to /en
```

## If Ports Are In Use

If you get "port already in use" errors, stop all services first:

```bash
# Find processes on ports
lsof -ti:3000,3001,3002,3003,3004,3005

# Stop them (replace PIDs with actual numbers from above)
kill -9 <PID1> <PID2> <PID3> ...
```

Or run this command to stop all at once:
```bash
lsof -ti:3000,3001,3002,3003,3004,3005 | xargs kill -9 2>/dev/null
```

Then start services again in separate terminals.

## Test Login

1. Open browser: http://localhost:3000
2. Login with:
   - Email: `john.doe@testhighschool.edu`
   - Password: `SecurePass123!`
3. Should work with no CORS errors! ✅

## What's New

✅ **Performance Optimizations** - 40x faster API requests  
✅ **CORS Fixed** - Proper cross-origin configuration  
✅ **JWT Enhanced** - School data included in token  
✅ **Batch Operations** - Add multiple students at once  

## Troubleshooting

### Service Won't Start
- Check the terminal output for errors
- Make sure no other service is using the port
- Verify you're in the correct directory

### CORS Error Still Showing
- Make sure you restarted ALL services
- Clear browser cache again
- Check you're using the new login (to get new JWT token)

### Port Already In Use
```bash
# Check what's using port 3001 (example)
lsof -i:3001

# Kill specific PID
kill -9 <PID>
```

## Service URLs

Once running, services are available at:
- Web App: http://localhost:3000
- Auth: http://localhost:3001
- School: http://localhost:3002
- Student: http://localhost:3003
- Teacher: http://localhost:3004
- Class: http://localhost:3005

---

**Note:** Keep all terminal windows open while using the app!
