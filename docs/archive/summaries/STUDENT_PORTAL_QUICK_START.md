# Student Mobile Portal - Quick Start Guide 🚀

## For Students

### How to Access
1. Go to your school's website
2. Click "Login" 
3. Select "Student Login"
4. Enter your Student ID and password
5. You'll be redirected to `/student-portal`

### Default Login Credentials
- **Username:** Your Student ID (e.g., STU001)
- **Password:** Your Student ID (same as username)
- ⚠️ **Please change your password after first login!**

### Mobile App Installation (PWA)
1. Open the portal in Chrome (Android) or Safari (iOS)
2. Tap the menu (⋮ or share button)
3. Select "Add to Home Screen"
4. The app icon will appear on your home screen
5. Use it like a native app!

## Features Overview

### 🏠 Dashboard Tab
- See your average score
- Check attendance rate
- Quick access to all sections
- View recent grades

### 📚 Grades Tab
- View all your grades by subject
- Filter by month/year
- See monthly summaries
- Check your class rank
- View coefficient and percentages

### 📅 Attendance Tab
- View attendance history
- Filter by date range
- See attendance statistics:
  - Present days
  - Absent days
  - Late arrivals
  - Permission days
- Attendance rate percentage

### 👤 Profile Tab
- View your information:
  - Name (English & Khmer)
  - Student ID
  - Class and section
  - Role (if class leader)
  - Contact info
- Change your password
- Logout

## For Administrators

### Student Account Setup
```bash
# Students need accounts created by admin first
# Default password = Student ID
```

### API Endpoints
```
GET  /api/student-portal/profile      # Get student profile
GET  /api/student-portal/grades       # Get grades (with filters)
GET  /api/student-portal/attendance   # Get attendance (with filters)
POST /api/student-portal/change-password  # Change password
PUT  /api/student-portal/profile      # Update profile
```

### Testing
```bash
# Test student login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"studentCode": "STU001", "password": "STU001"}'

# Test get grades (with token)
curl -X GET http://localhost:5001/api/student-portal/grades \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### "Cannot login"
- ✅ Check student account is created
- ✅ Check account is activated (not deactivated)
- ✅ Verify password (default = Student ID)
- ✅ Check internet connection

### "No data showing"
- ✅ Make sure grades have been entered by teachers
- ✅ Check if attendance has been marked
- ✅ Try refreshing the page
- ✅ Check filter settings (year/month)

### "Password change failed"
- ✅ Old password must be correct
- ✅ New password must be at least 6 characters
- ✅ New password and confirm password must match

### "Mobile app not working offline"
- ✅ Visit the site while online first
- ✅ PWA needs initial load to cache
- ✅ Some features require internet

## Security Notes

- 🔒 Always logout on shared devices
- 🔒 Change default password immediately
- 🔒 Don't share your password
- 🔒 Use a strong password (mix of letters, numbers, symbols)
- 🔒 Report any suspicious activity to administrators

## Support

For technical support, contact your school administrator.

## Mobile Browser Compatibility

✅ **Supported:**
- Chrome (Android)
- Safari (iOS)
- Samsung Internet
- Firefox Mobile
- Edge Mobile

⚠️ **Limited Support:**
- Older browsers
- UC Browser

## Recommended Screen Sizes

- 📱 **Phone:** 375px - 428px width (optimal)
- 📱 **Tablet:** 768px - 1024px width (supported)
- 💻 **Desktop:** Also works, but designed for mobile

## Quick Tips

1. **Swipe** between tabs at the bottom
2. **Pull down** to refresh data
3. **Tap stats** to see detailed views
4. **Filter grades/attendance** by date for specific periods
5. **Add to home screen** for fastest access

## Coming Soon 🚀

Future features being considered:
- Push notifications for new grades
- School announcements
- Class schedule view
- Download grade reports
- Message teachers
- Homework tracking

---

**Version:** 1.0.0  
**Last Updated:** January 11, 2026  
**Status:** ✅ Production Ready
