# 🎨 Stunity - Design System & UI Guidelines

**Version:** 1.0  
**Date:** January 27, 2026  
**Status:** Active

---

## 📖 Table of Contents

1. [Design Principles](#design-principles)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Components Library](#components-library)
6. [Icons & Imagery](#icons--imagery)
7. [Animations & Transitions](#animations--transitions)
8. [Responsive Design](#responsive-design)
9. [Accessibility](#accessibility)
10. [Brand Guidelines](#brand-guidelines)

---

## 🎯 Design Principles

### 1. **Clarity First**
- Clean, uncluttered interfaces
- Clear visual hierarchy
- Obvious call-to-actions
- Minimal cognitive load

### 2. **Consistency**
- Consistent patterns across platform
- Reusable components
- Unified visual language
- Predictable interactions

### 3. **Accessibility**
- WCAG 2.1 Level AA compliance
- Keyboard navigation support
- Screen reader friendly
- High contrast options

### 4. **Performance**
- Fast loading times
- Smooth animations (60fps)
- Optimized images
- Progressive enhancement

### 5. **Mobile-First**
- Design for mobile, enhance for desktop
- Touch-friendly targets (min 44x44px)
- Thumb-zone optimization
- Responsive layouts

### 6. **Delight**
- Micro-interactions
- Smooth transitions
- Friendly error messages
- Celebration moments

---

## 🎨 Color System

### Primary Colors

```css
/* Blue - Trust, Intelligence, Primary Actions */
--blue-50:  #eff6ff;
--blue-100: #dbeafe;
--blue-200: #bfdbfe;
--blue-300: #93c5fd;
--blue-400: #60a5fa;
--blue-500: #3b82f6;  /* Primary */
--blue-600: #2563eb;
--blue-700: #1d4ed8;
--blue-800: #1e40af;
--blue-900: #1e3a8a;
```

### Secondary Colors

```css
/* Orange - Energy, Creativity, Secondary Actions */
--orange-50:  #fff7ed;
--orange-100: #ffedd5;
--orange-200: #fed7aa;
--orange-300: #fdba74;
--orange-400: #fb923c;
--orange-500: #f97316;  /* Secondary */
--orange-600: #ea580c;
--orange-700: #c2410c;
--orange-800: #9a3412;
--orange-900: #7c2d12;
```

### Accent Colors

```css
/* Purple - Innovation, Wisdom */
--purple-50:  #faf5ff;
--purple-100: #f3e8ff;
--purple-200: #e9d5ff;
--purple-300: #d8b4fe;
--purple-400: #c084fc;
--purple-500: #a855f7;  /* Accent */
--purple-600: #9333ea;
--purple-700: #7e22ce;
--purple-800: #6b21a8;
--purple-900: #581c87;

/* Green - Success, Growth */
--green-50:  #f0fdf4;
--green-100: #dcfce7;
--green-200: #bbf7d0;
--green-300: #86efac;
--green-400: #4ade80;
--green-500: #22c55e;  /* Success */
--green-600: #16a34a;
--green-700: #15803d;
--green-800: #166534;
--green-900: #14532d;
```

### Semantic Colors

```css
/* Status Colors */
--success:  #22c55e;  /* Green-500 */
--warning:  #f59e0b;  /* Amber-500 */
--error:    #ef4444;  /* Red-500 */
--info:     #3b82f6;  /* Blue-500 */

/* Text Colors */
--text-primary:   #111827;  /* Gray-900 */
--text-secondary: #6b7280;  /* Gray-500 */
--text-tertiary:  #9ca3af;  /* Gray-400 */
--text-disabled:  #d1d5db;  /* Gray-300 */

/* Background Colors */
--bg-primary:   #ffffff;
--bg-secondary: #f9fafb;  /* Gray-50 */
--bg-tertiary:  #f3f4f6;  /* Gray-100 */
--bg-dark:      #111827;  /* Gray-900 */

/* Border Colors */
--border-light:  #e5e7eb;  /* Gray-200 */
--border-medium: #d1d5db;  /* Gray-300 */
--border-dark:   #9ca3af;  /* Gray-400 */
```

### Gradients

```css
/* Brand Gradients */
--gradient-primary: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
--gradient-secondary: linear-gradient(135deg, #f97316 0%, #fbbf24 100%);
--gradient-success: linear-gradient(135deg, #10b981 0%, #34d399 100%);
--gradient-hero: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Overlay Gradients */
--gradient-overlay-dark: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.7) 100%);
--gradient-overlay-light: linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.9) 100%);
```

### Color Usage Guidelines

| Purpose | Color | When to Use |
|---------|-------|-------------|
| Primary Actions | Blue-500 | Main buttons, links, active states |
| Secondary Actions | Orange-500 | Secondary buttons, highlights |
| Success States | Green-500 | Success messages, completed tasks |
| Warning States | Amber-500 | Warning messages, cautionary info |
| Error States | Red-500 | Error messages, failed actions |
| Info States | Blue-500 | Informational messages, tips |
| Disabled States | Gray-300 | Disabled buttons, inactive elements |

---

## ✏️ Typography

### Font Families

```css
/* Primary Font: Inter (Sans-serif) */
--font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Secondary Font: Poppins (Display) */
--font-display: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Khmer Font: Koulen */
--font-khmer: 'Koulen', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Monospace Font: Fira Code */
--font-mono: 'Fira Code', 'Courier New', monospace;
```

### Font Scale

```css
/* Display Sizes */
--text-display-2xl: 4.5rem;   /* 72px - Hero headings */
--text-display-xl:  3.75rem;  /* 60px - Page titles */
--text-display-lg:  3rem;     /* 48px - Section headers */

/* Heading Sizes */
--text-h1: 2.25rem;  /* 36px */
--text-h2: 1.875rem; /* 30px */
--text-h3: 1.5rem;   /* 24px */
--text-h4: 1.25rem;  /* 20px */
--text-h5: 1.125rem; /* 18px */
--text-h6: 1rem;     /* 16px */

/* Body Sizes */
--text-xl:   1.25rem;  /* 20px - Large body text */
--text-lg:   1.125rem; /* 18px - Standard large text */
--text-base: 1rem;     /* 16px - Body text */
--text-sm:   0.875rem; /* 14px - Small text */
--text-xs:   0.75rem;  /* 12px - Captions, labels */
```

### Font Weights

```css
--font-thin:       100;
--font-extralight: 200;
--font-light:      300;
--font-normal:     400;  /* Body text */
--font-medium:     500;  /* Emphasis */
--font-semibold:   600;  /* Subheadings */
--font-bold:       700;  /* Headings */
--font-extrabold:  800;  /* Strong emphasis */
--font-black:      900;  /* Display text */
```

### Line Heights

```css
--leading-none:   1;
--leading-tight:  1.25;
--leading-snug:   1.375;
--leading-normal: 1.5;   /* Body text */
--leading-relaxed: 1.625;
--leading-loose:  2;
```

### Typography Components

```tsx
// Heading Component
<h1 className="text-h1 font-bold text-gray-900 leading-tight">
  Welcome to Stunity
</h1>

// Body Text
<p className="text-base font-normal text-gray-700 leading-normal">
  Your learning journey starts here.
</p>

// Caption
<span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
  Featured Course
</span>

// Khmer Text
<h2 className="font-koulen text-h2 text-gray-900">
  សូមស្វាគមន៍
</h2>
```

---

## 📏 Spacing & Layout

### Spacing Scale (4px baseline)

```css
--space-0:  0;
--space-1:  0.25rem;  /* 4px */
--space-2:  0.5rem;   /* 8px */
--space-3:  0.75rem;  /* 12px */
--space-4:  1rem;     /* 16px - Base unit */
--space-5:  1.25rem;  /* 20px */
--space-6:  1.5rem;   /* 24px */
--space-8:  2rem;     /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
--space-24: 6rem;     /* 96px */
```

### Container Widths

```css
--container-sm:  640px;   /* Mobile landscape */
--container-md:  768px;   /* Tablet portrait */
--container-lg:  1024px;  /* Tablet landscape */
--container-xl:  1280px;  /* Desktop */
--container-2xl: 1536px;  /* Large desktop */
```

### Border Radius

```css
--rounded-none: 0;
--rounded-sm:   0.125rem; /* 2px */
--rounded:      0.25rem;  /* 4px */
--rounded-md:   0.375rem; /* 6px */
--rounded-lg:   0.5rem;   /* 8px */
--rounded-xl:   0.75rem;  /* 12px - Buttons */
--rounded-2xl:  1rem;     /* 16px */
--rounded-3xl:  1.5rem;   /* 24px - Cards */
--rounded-full: 9999px;   /* Circular */
```

### Shadows

```css
/* Elevation System */
--shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
--shadow:    0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
--shadow-md: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
--shadow-2xl: 0 40px 60px -20px rgba(0, 0, 0, 0.3);

/* Colored Shadows */
--shadow-blue: 0 10px 25px -5px rgba(59, 130, 246, 0.3);
--shadow-orange: 0 10px 25px -5px rgba(249, 115, 22, 0.3);
--shadow-purple: 0 10px 25px -5px rgba(168, 85, 247, 0.3);
```

### Layout Grid

```css
/* 12-column grid */
.grid-12 {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 1.5rem; /* 24px */
}

/* Common layouts */
.layout-sidebar {
  display: grid;
  grid-template-columns: 280px 1fr; /* Sidebar + Main */
  gap: 2rem;
}

.layout-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}
```

---

## 🧩 Components Library

### Buttons

```tsx
// Primary Button
<button className="
  px-6 py-3 
  bg-blue-500 hover:bg-blue-600 active:bg-blue-700
  text-white font-medium
  rounded-xl
  shadow-sm hover:shadow-md
  transition-all duration-200
  disabled:opacity-50 disabled:cursor-not-allowed
">
  Primary Action
</button>

// Secondary Button
<button className="
  px-6 py-3
  bg-white hover:bg-gray-50 active:bg-gray-100
  text-blue-600 font-medium
  border-2 border-blue-500
  rounded-xl
  transition-all duration-200
">
  Secondary Action
</button>

// Ghost Button
<button className="
  px-6 py-3
  bg-transparent hover:bg-gray-100 active:bg-gray-200
  text-gray-700 font-medium
  rounded-xl
  transition-all duration-200
">
  Ghost Button
</button>

// Icon Button
<button className="
  w-10 h-10
  flex items-center justify-center
  bg-gray-100 hover:bg-gray-200
  rounded-xl
  transition-all duration-200
">
  <IconName className="w-5 h-5" />
</button>
```

### Cards

```tsx
// Standard Card
<div className="
  bg-white
  rounded-3xl
  shadow-lg
  p-6
  hover:shadow-xl
  transition-shadow duration-300
">
  <h3 className="text-h4 font-bold text-gray-900 mb-2">Card Title</h3>
  <p className="text-base text-gray-600">Card content goes here.</p>
</div>

// Course Card
<div className="
  bg-white
  rounded-3xl
  shadow-lg
  overflow-hidden
  hover:shadow-xl hover:scale-[1.02]
  transition-all duration-300
">
  <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600" />
  <div className="p-5">
    <h3 className="text-h4 font-bold text-gray-900">Course Title</h3>
    <p className="text-sm text-gray-600 mt-2">Course description</p>
    <div className="mt-4 flex items-center justify-between">
      <span className="text-xs text-gray-500">12 lessons</span>
      <span className="text-sm font-semibold text-blue-600">85%</span>
    </div>
  </div>
</div>

// Stat Card
<div className="
  bg-gradient-to-br from-blue-50 to-purple-50
  rounded-3xl
  p-6
  border-2 border-blue-100
">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-gray-600">Total Courses</p>
      <p className="text-3xl font-black text-gray-900 mt-1">24</p>
    </div>
    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
      <IconName className="w-6 h-6 text-white" />
    </div>
  </div>
</div>
```

### Forms

```tsx
// Text Input
<div className="space-y-2">
  <label className="block text-sm font-medium text-gray-700">
    Email Address
  </label>
  <input
    type="email"
    className="
      w-full px-4 py-3
      bg-white
      border-2 border-gray-200
      focus:border-blue-500 focus:ring-2 focus:ring-blue-200
      rounded-xl
      text-base text-gray-900
      placeholder:text-gray-400
      transition-all duration-200
    "
    placeholder="you@example.com"
  />
</div>

// Select
<select className="
  w-full px-4 py-3
  bg-white
  border-2 border-gray-200
  focus:border-blue-500 focus:ring-2 focus:ring-blue-200
  rounded-xl
  text-base text-gray-900
  transition-all duration-200
">
  <option>Select an option</option>
</select>

// Checkbox
<label className="flex items-center space-x-3 cursor-pointer">
  <input
    type="checkbox"
    className="
      w-5 h-5
      text-blue-500
      border-2 border-gray-300
      rounded
      focus:ring-2 focus:ring-blue-200
    "
  />
  <span className="text-base text-gray-700">Remember me</span>
</label>

// Radio Button
<label className="flex items-center space-x-3 cursor-pointer">
  <input
    type="radio"
    name="option"
    className="
      w-5 h-5
      text-blue-500
      border-2 border-gray-300
      focus:ring-2 focus:ring-blue-200
    "
  />
  <span className="text-base text-gray-700">Option 1</span>
</label>
```

### Badges

```tsx
// Status Badges
<span className="
  inline-flex items-center
  px-3 py-1
  bg-green-100 text-green-800
  text-xs font-semibold
  rounded-full
">
  Completed
</span>

<span className="
  inline-flex items-center
  px-3 py-1
  bg-yellow-100 text-yellow-800
  text-xs font-semibold
  rounded-full
">
  Pending
</span>

<span className="
  inline-flex items-center
  px-3 py-1
  bg-red-100 text-red-800
  text-xs font-semibold
  rounded-full
">
  Overdue
</span>

// Notification Badge
<div className="relative">
  <IconBell className="w-6 h-6" />
  <span className="
    absolute -top-1 -right-1
    w-5 h-5
    bg-red-500 text-white
    text-xs font-bold
    flex items-center justify-center
    rounded-full
  ">
    3
  </span>
</div>
```

### Modals

```tsx
// Modal Overlay
<div className="
  fixed inset-0 z-50
  bg-black/50 backdrop-blur-sm
  flex items-center justify-center
  p-4
">
  {/* Modal Content */}
  <div className="
    w-full max-w-md
    bg-white
    rounded-3xl
    shadow-2xl
    p-6
    transform transition-all
  ">
    <h2 className="text-h3 font-bold text-gray-900 mb-4">
      Modal Title
    </h2>
    <p className="text-base text-gray-600 mb-6">
      Modal content goes here.
    </p>
    <div className="flex gap-3 justify-end">
      <button className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl">
        Cancel
      </button>
      <button className="px-4 py-2 bg-blue-500 text-white rounded-xl">
        Confirm
      </button>
    </div>
  </div>
</div>
```

### Alerts

```tsx
// Success Alert
<div className="
  flex items-start gap-3
  p-4
  bg-green-50 border-2 border-green-200
  rounded-xl
">
  <IconCheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
  <div>
    <h4 className="text-sm font-semibold text-green-900">Success!</h4>
    <p className="text-sm text-green-700 mt-1">Your changes have been saved.</p>
  </div>
</div>

// Error Alert
<div className="
  flex items-start gap-3
  p-4
  bg-red-50 border-2 border-red-200
  rounded-xl
">
  <IconXCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
  <div>
    <h4 className="text-sm font-semibold text-red-900">Error!</h4>
    <p className="text-sm text-red-700 mt-1">Something went wrong.</p>
  </div>
</div>
```

### Loading States

```tsx
// Spinner
<div className="
  w-8 h-8
  border-4 border-gray-200 border-t-blue-500
  rounded-full
  animate-spin
" />

// Skeleton Loader
<div className="space-y-4 animate-pulse">
  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
  <div className="h-4 bg-gray-200 rounded"></div>
  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
</div>

// Progress Bar
<div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
  <div 
    className="h-full bg-blue-500 transition-all duration-300"
    style={{ width: '65%' }}
  />
</div>
```

---

## 🖼️ Icons & Imagery

### Icon System

**Library:** Lucide React (recommended)

```tsx
import { 
  Home, Book, MessageCircle, User, Settings,
  Plus, Search, Filter, Bell, Menu
} from 'lucide-react'

// Usage
<Home className="w-6 h-6 text-gray-600" />
```

### Icon Sizes

```css
--icon-xs:  12px;  /* 3/4 of text size */
--icon-sm:  16px;  /* Same as text */
--icon-md:  20px;  /* Default */
--icon-lg:  24px;  /* Large actions */
--icon-xl:  32px;  /* Hero icons */
--icon-2xl: 48px;  /* Feature icons */
```

### Image Guidelines

```tsx
// Avatar
<img 
  src="/avatar.jpg"
  alt="User name"
  className="w-10 h-10 rounded-full object-cover"
/>

// Course Thumbnail
<img 
  src="/course.jpg"
  alt="Course title"
  className="w-full h-48 object-cover"
/>

// Always use Next.js Image component for optimization
import Image from 'next/image'

<Image
  src="/course.jpg"
  alt="Course title"
  width={400}
  height={200}
  className="rounded-3xl"
/>
```

---

## ⚡ Animations & Transitions

### Transition Durations

```css
--duration-fast:   150ms;  /* Micro-interactions */
--duration-normal: 200ms;  /* Default */
--duration-slow:   300ms;  /* Complex animations */
--duration-slower: 500ms;  /* Page transitions */
```

### Easing Functions

```css
--ease-in:      cubic-bezier(0.4, 0, 1, 1);
--ease-out:     cubic-bezier(0, 0, 0.2, 1);
--ease-in-out:  cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce:  cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

### Common Animations

```tsx
// Fade In
<div className="animate-fade-in">
  Content
</div>

// Slide Up
<div className="animate-slide-up">
  Content
</div>

// Scale on Hover
<div className="
  transition-transform duration-200
  hover:scale-105
">
  Hover me
</div>

// Button Press Effect
<button className="
  transition-all duration-150
  active:scale-95
">
  Click me
</button>
```

### Custom Keyframes (Tailwind Config)

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' }
        },
        'bounce-in': {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        }
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'bounce-in': 'bounce-in 0.5s ease-out'
      }
    }
  }
}
```

---

## 📱 Responsive Design

### Breakpoints

```css
/* Mobile First */
--screen-sm:  640px;   /* Mobile landscape */
--screen-md:  768px;   /* Tablet portrait */
--screen-lg:  1024px;  /* Tablet landscape / Small laptop */
--screen-xl:  1280px;  /* Desktop */
--screen-2xl: 1536px;  /* Large desktop */
```

### Responsive Patterns

```tsx
// Responsive Grid
<div className="
  grid
  grid-cols-1       /* Mobile: 1 column */
  sm:grid-cols-2    /* Tablet: 2 columns */
  lg:grid-cols-3    /* Desktop: 3 columns */
  xl:grid-cols-4    /* Large: 4 columns */
  gap-6
">
  {/* Cards */}
</div>

// Responsive Text
<h1 className="
  text-2xl sm:text-3xl lg:text-4xl xl:text-5xl
  font-bold
">
  Responsive Heading
</h1>

// Responsive Padding
<div className="
  px-4 sm:px-6 lg:px-8
  py-8 sm:py-12 lg:py-16
">
  Content
</div>

// Hide/Show on Breakpoints
<div className="
  hidden         /* Hidden on mobile */
  md:block       /* Visible on tablet+ */
">
  Desktop only content
</div>
```

### Mobile Navigation

```tsx
// Bottom Navigation (Mobile)
<nav className="
  fixed bottom-0 left-0 right-0
  md:hidden        /* Hide on desktop */
  bg-white
  border-t border-gray-200
  px-6 py-3
  flex justify-around items-center
">
  <NavItem icon={Home} label="Feed" />
  <NavItem icon={Book} label="Courses" />
  <NavItem icon={User} label="Profile" />
</nav>

// Sidebar Navigation (Desktop)
<nav className="
  hidden md:block    /* Hidden on mobile */
  fixed left-0 top-0 bottom-0
  w-64
  bg-white
  border-r border-gray-200
  p-6
">
  <NavItem icon={Home} label="Feed" />
  <NavItem icon={Book} label="Courses" />
  <NavItem icon={User} label="Profile" />
</nav>
```

---

## ♿ Accessibility

### Keyboard Navigation

```tsx
// Focusable Elements
<button className="
  focus:outline-none
  focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
  rounded-xl
">
  Accessible Button
</button>

// Skip to Main Content
<a 
  href="#main-content"
  className="
    sr-only
    focus:not-sr-only focus:absolute focus:top-4 focus:left-4
    bg-blue-500 text-white
    px-4 py-2 rounded-xl
  "
>
  Skip to main content
</a>
```

### ARIA Labels

```tsx
// Button with Icon Only
<button aria-label="Close modal">
  <IconX className="w-5 h-5" />
</button>

// Loading State
<button disabled aria-busy="true">
  <Spinner /> Loading...
</button>

// Form Labels
<label htmlFor="email" className="block text-sm font-medium">
  Email Address
</label>
<input
  id="email"
  type="email"
  aria-required="true"
  aria-describedby="email-error"
/>
<p id="email-error" className="text-red-600 text-sm" role="alert">
  Please enter a valid email
</p>
```

### Color Contrast

- **Normal Text**: Minimum 4.5:1 contrast ratio
- **Large Text (18px+)**: Minimum 3:1 contrast ratio
- **UI Components**: Minimum 3:1 contrast ratio

### Screen Reader Support

```tsx
// Live Regions
<div aria-live="polite" aria-atomic="true">
  {successMessage}
</div>

// Hidden Text for Screen Readers
<span className="sr-only">
  Loading more posts
</span>

// Expandable Content
<button
  aria-expanded={isOpen}
  aria-controls="dropdown-menu"
>
  Open Menu
</button>
<div id="dropdown-menu" hidden={!isOpen}>
  Menu content
</div>
```

---

## 🎨 Brand Guidelines

### Logo Usage

```
✅ DO:
- Use official logo files
- Maintain clear space (min 20px)
- Use on solid backgrounds
- Keep logo proportions

❌ DON'T:
- Distort or stretch logo
- Change logo colors
- Add effects (shadows, gradients)
- Place on busy backgrounds
```

### Voice & Tone

**Voice:** Friendly, supportive, knowledgeable, encouraging

**Tone Examples:**
- **Success:** "Great job! You've completed the course. 🎉"
- **Error:** "Oops! Something went wrong. Let's try that again."
- **Empty State:** "No courses yet. Let's find your first one!"
- **Loading:** "Hang tight! We're getting things ready..."

### Writing Guidelines

1. **Be Clear:** Use simple, direct language
2. **Be Concise:** Get to the point quickly
3. **Be Helpful:** Provide guidance and next steps
4. **Be Encouraging:** Celebrate achievements
5. **Be Bilingual:** Support English and Khmer equally

---

## 📦 Component Export

All components should be exported from a central library:

```tsx
// src/components/ui/index.ts
export { Button } from './Button'
export { Card } from './Card'
export { Input } from './Input'
export { Modal } from './Modal'
export { Badge } from './Badge'
export { Alert } from './Alert'
// ... etc
```

---

## 🚀 Implementation Checklist

### Phase 1: Foundation
- [x] Set up Tailwind CSS
- [x] Define color variables
- [x] Set up typography system
- [x] Create spacing scale
- [x] Implement basic components

### Phase 2: Components
- [ ] Button variations
- [ ] Card components
- [ ] Form elements
- [ ] Navigation components
- [ ] Modal and dialogs

### Phase 3: Patterns
- [ ] Layout patterns
- [ ] List patterns
- [ ] Feed patterns
- [ ] Dashboard patterns

### Phase 4: Documentation
- [ ] Component Storybook
- [ ] Usage examples
- [ ] Accessibility guide
- [ ] Migration guide

---

## 📞 Next Steps

1. ✅ Review this design system
2. 🧪 Review testing strategy
3. 💻 Start implementing components
4. 📚 Build component library
5. 🎨 Create Figma designs

---

**Document Owner:** Naing Seiha  
**Last Updated:** January 27, 2026  
**Next Review:** February 15, 2026

---

**Building beautiful, accessible, and consistent experiences! ✨**
