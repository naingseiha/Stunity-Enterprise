# Password Security System - Quick Start Guide

## 🚀 How to Test the New Features

### Prerequisites
- Backend API running on port 5001
- Frontend app running on port 3000
- At least one teacher account in database
- At least one admin account in database

---

## 👨‍🏫 Testing Teacher Experience

### 1. Test Password Warning Banner

**Steps:**
1. Login as a teacher using phone number as password
   ```
   Phone: 0123456789
   Password: 0123456789
   ```

2. You should see:
   - Login successful
   - Redirect to teacher portal
   - **Orange/Red warning banner** at top
   - Message: "សូមប្តូរពាក្យសម្ងាត់ | Please Change Password"
   - Countdown showing days/hours remaining

3. Banner should show different colors:
   - **Blue** if 3-5 days remaining
   - **Orange** if 1-3 days remaining
   - **Red** if less than 1 day remaining
   - **Pulsing** if less than 1 day

### 2. Test Password Change

**Steps:**
1. Click "ប្តូរពាក្យសម្ងាត់ឥឡូវនេះ | Change Password Now" button
2. Password change modal should open
3. Fill in:
   - Old Password: `0123456789`
   - New Password: `MySecure123`
   - Confirm Password: `MySecure123`
4. Click submit
5. You should see:
   - Success message
   - Modal closes after 2 seconds
   - Warning banner disappears
   - No more password warning

### 3. Test Dismissing Warning

**Steps:**
1. Login with default password (if more than 1 day remaining)
2. See warning banner
3. Click X button on banner
4. Banner should disappear
5. Refresh page - banner should not reappear during session

**Note:** Danger level (less than 1 day) warnings cannot be dismissed

---

## 👨‍💼 Testing Admin Dashboard

### 1. Access Admin Security Dashboard

**Steps:**
1. Login as admin
2. Navigate to: `/admin/security`
3. You should see:
   - Security overview cards:
     - Total Teachers
     - Default Passwords count
     - Expired count
     - Security Score %
   - Filter buttons
   - Search bar
   - Teacher list table

### 2. Test Filters

**Steps:**
1. Click "Default" filter
   - Should show only teachers using default passwords
2. Click "Expiring" filter
   - Should show teachers with passwords expiring in next 7 days
3. Click "Expired" filter
   - Should show teachers with expired passwords
4. Click "Suspended" filter
   - Should show suspended accounts
5. Click "All" filter
   - Should show all teachers

### 3. Test Search

**Steps:**
1. Type teacher name in search box
2. Table should filter in real-time
3. Try searching by:
   - First name
   - Last name
   - Email
   - Phone number
   - Khmer name

### 4. Test Reset Password

**Steps:**
1. Find a teacher in the list
2. Click "Actions" button
3. Click "Reset Password"
4. Modal should open
5. Enter reason: "Testing password reset"
6. Click "Reset Password"
7. You should see:
   - Success message
   - Temporary password displayed
   - Copy button
8. Click copy button
   - Should copy to clipboard
   - Shows "✓ Copied to clipboard"
9. Click "Done"
   - Modal closes
   - Table refreshes

**Important:** Save the temporary password to give to the teacher!

### 5. Test Extend Deadline

**Steps:**
1. Find a teacher with default password
2. Click "Actions" > "Extend Deadline"
3. Modal should open showing:
   - Current expiration date
   - Quick select buttons (3, 7, 14, 30 days)
4. Click "7" days button
5. See new expiration date preview
6. Enter reason: "Teacher on sick leave"
7. Click "Extend"
8. You should see:
   - Success message
   - Modal closes
   - Table refreshes
   - Teacher's expiration date updated

### 6. Test Suspend Account

**Steps:**
1. Find an active teacher
2. Click "Actions" > "Suspend Account"
3. Modal should open with:
   - Red warning banner
   - Warning message
4. Enter reason: "Testing suspension"
5. Click "Suspend Account"
6. You should see:
   - Success message
   - Modal closes
   - Table refreshes
   - Teacher status shows "Suspended"

**Test Unsuspend:**
1. Find the suspended teacher
2. Click "Actions" > "Unsuspend Account"
3. Green modal should open
4. Enter reason (optional): "Testing complete"
5. Click "Unsuspend Account"
6. Teacher should be active again

### 7. Test Pagination

**Steps:**
1. If you have more than 20 teachers:
   - Should see pagination controls at bottom
   - "Previous" and "Next" buttons
   - Current page indicator
2. Click "Next"
   - Should load next page
3. Click "Previous"
   - Should go back

### 8. Test Refresh

**Steps:**
1. Click refresh icon (top right)
2. Dashboard should reload
3. Statistics should update
4. Teacher list should refresh

---

## 🔍 API Testing with cURL

### Check Password Status
```bash
# Get your token first by logging in
TOKEN="your_jwt_token_here"

curl -X GET "http://localhost:5001/api/auth/password-status" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "isDefaultPassword": true,
    "passwordExpiresAt": "2026-01-23T...",
    "passwordChangedAt": null,
    "daysRemaining": 3,
    "hoursRemaining": 12,
    "isExpired": false,
    "alertLevel": "warning",
    "canExtend": true
  }
}
```

### Admin Security Dashboard
```bash
# Login as admin first
ADMIN_TOKEN="your_admin_token_here"

curl -X GET "http://localhost:5001/api/admin/security/dashboard" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "totalTeachers": 50,
    "defaultPasswordCount": 35,
    "expiredCount": 5,
    "expiringInDay": 3,
    "expiringIn3Days": 8,
    "suspendedCount": 2,
    "securityScore": 30
  }
}
```

### Get Teacher List
```bash
curl -X GET "http://localhost:5001/api/admin/security/teachers?filter=default&page=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Force Password Reset
```bash
curl -X POST "http://localhost:5001/api/admin/security/force-reset" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "teacherId": "user_id_here",
    "reason": "Teacher forgot password"
  }'
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Warning banner not showing
**Solution:**
- Check if user is using default password (phone number)
- Check if password expiration is set in database
- Check browser console for errors
- Verify API endpoint is working

### Issue 2: Password change not working
**Solution:**
- Verify old password is correct
- Check new password meets requirements (min 6 characters)
- Check network tab for API errors
- Verify token is valid

### Issue 3: Admin dashboard shows 403 Forbidden
**Solution:**
- Verify user role is "ADMIN"
- Check JWT token is valid
- Re-login if token expired
- Check backend logs for errors

### Issue 4: Modals not opening
**Solution:**
- Check browser console for JavaScript errors
- Verify dynamic imports are loading
- Clear browser cache
- Check network tab

### Issue 5: Copy button not working
**Solution:**
- Check browser permissions for clipboard
- Try HTTPS instead of HTTP
- Use modern browser (Chrome, Firefox, Safari)
- Check clipboard API support

---

## 📱 Mobile Testing

### Test on Mobile Devices
1. Open on phone/tablet
2. Check responsive layout
3. Test touch interactions
4. Verify readable text
5. Check modal sizing
6. Test scrolling

### Recommended Tests:
- iPhone (Safari)
- Android (Chrome)
- Tablet (both)
- Desktop (all browsers)

---

## ✅ Complete Testing Checklist

### Teacher Portal:
- [ ] Warning banner appears for default password
- [ ] Banner shows correct alert level
- [ ] Countdown is accurate
- [ ] Click change password opens modal
- [ ] Password change works
- [ ] Warning disappears after change
- [ ] Dismiss works (non-danger level)
- [ ] Mobile responsive

### Admin Dashboard:
- [ ] Dashboard loads with statistics
- [ ] All filters work
- [ ] Search works
- [ ] Pagination works
- [ ] Reset password generates temp password
- [ ] Copy button works
- [ ] Extend expiration updates date
- [ ] Suspend blocks login
- [ ] Unsuspend restores access
- [ ] Refresh updates data
- [ ] Mobile responsive

### API Endpoints:
- [ ] GET /api/auth/password-status
- [ ] GET /api/admin/security/dashboard
- [ ] GET /api/admin/security/teachers
- [ ] POST /api/admin/security/force-reset
- [ ] POST /api/admin/security/extend-expiration
- [ ] POST /api/admin/security/toggle-suspension

---

## 🎯 Success Criteria

System is working correctly if:

1. ✅ Teachers see password warnings
2. ✅ Teachers can change passwords
3. ✅ Warnings disappear after password change
4. ✅ Admins can view security dashboard
5. ✅ Admins can filter and search teachers
6. ✅ Admins can reset passwords
7. ✅ Admins can extend deadlines
8. ✅ Admins can suspend/unsuspend accounts
9. ✅ All actions are logged
10. ✅ Everything is responsive

---

## 🆘 Need Help?

If you encounter issues:
1. Check browser console for errors
2. Check network tab for API errors
3. Check backend logs
4. Verify database has correct data
5. Review API documentation
6. Check the implementation files

---

**Happy Testing! 🎉**

For questions or issues, refer to:
- `PASSWORD_SECURITY_PHASE3_COMPLETE.md` - Full documentation
- `PASSWORD_SECURITY_API_REFERENCE.md` - API details
- `PASSWORD_SECURITY_IMPLEMENTATION_COMPLETE.md` - Backend details
