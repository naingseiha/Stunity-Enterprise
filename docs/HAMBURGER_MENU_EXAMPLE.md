# Quick Start: Using the New Responsive Sidebar

## ✅ Method 1: Simple (Recommended)

Use the `DashboardLayout` component that handles everything:

```typescript
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function MyPage() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">My Page Title</h1>
        {/* Your content here */}
      </div>
    </DashboardLayout>
  );
}
```

**That's it!** The hamburger menu works automatically on mobile.

---

## 🔧 Method 2: Manual (Advanced)

If you need more control:

```typescript
"use client";

import { useState } from "react";
import ResponsiveSidebar from "@/components/layout/ResponsiveSidebar";
import Header from "@/components/layout/Header";

export default function MyCustomPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Responsive Sidebar */}
      <ResponsiveSidebar
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        <Header onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />

        <main className="flex-1 overflow-y-auto p-6">
          <h1>My Custom Page</h1>
          {/* Your content */}
        </main>
      </div>
    </div>
  );
}
```

---

## 📱 How Users Interact

### On Mobile (< 1024px):
1. **Tap hamburger icon (☰)** in header
2. Sidebar slides in from left
3. Dark overlay appears
4. **Tap any menu item** to navigate
5. Menu automatically closes

### On Desktop (≥ 1024px):
1. Sidebar always visible
2. Click chevron to collapse/expand
3. No hamburger button shown

---

## 🎨 What You Get

✅ **Mobile hamburger menu**
✅ **Smooth slide-in drawer**
✅ **Dark overlay backdrop**
✅ **Auto-close on navigation**
✅ **ESC key to close**
✅ **Touch-friendly**
✅ **Keyboard accessible**
✅ **Beautiful animations**

---

## 🚀 Migration Example

### Before (Old Way):
```typescript
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export default function Dashboard() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="p-6">
          {/* content */}
        </main>
      </div>
    </div>
  );
}
```

### After (New Way):
```typescript
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="p-6">
        {/* content */}
      </div>
    </DashboardLayout>
  );
}
```

**Much simpler!** And you get mobile responsiveness for free.

---

## 📝 Test It

1. **Desktop:** Open your app on desktop - sidebar should be always visible
2. **Mobile:** Resize browser to < 1024px - hamburger button appears
3. **Click:** Tap hamburger - menu slides in
4. **Navigate:** Click any menu item - menu closes and navigates
5. **Close:** Tap outside overlay - menu closes

---

**Ready to use!** 🎉
