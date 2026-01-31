# Stunity Design Language v1.0

**A professional, clean design system for enterprise education software**

---

## 🎨 Brand Colors

### Primary Palette
```css
--stunity-primary-50: #EFF6FF;    /* Lightest blue */
--stunity-primary-100: #DBEAFE;
--stunity-primary-200: #BFDBFE;
--stunity-primary-300: #93C5FD;
--stunity-primary-400: #60A5FA;
--stunity-primary-500: #3B82F6;   /* Main brand blue */
--stunity-primary-600: #2563EB;   /* Darker blue */
--stunity-primary-700: #1D4ED8;
--stunity-primary-800: #1E40AF;
--stunity-primary-900: #1E3A8A;
```

### Secondary (Amber - Cambodia Gold)
```css
--stunity-secondary-50: #FFFBEB;
--stunity-secondary-500: #F59E0B;  /* Accent gold */
--stunity-secondary-600: #D97706;
```

### Neutrals (Professional Grays)
```css
--stunity-gray-50: #F9FAFB;      /* Backgrounds */
--stunity-gray-100: #F3F4F6;     /* Subtle backgrounds */
--stunity-gray-200: #E5E7EB;     /* Borders */
--stunity-gray-300: #D1D5DB;
--stunity-gray-400: #9CA3AF;     /* Disabled text */
--stunity-gray-500: #6B7280;     /* Secondary text */
--stunity-gray-600: #4B5563;     /* Body text */
--stunity-gray-700: #374151;
--stunity-gray-800: #1F2937;     /* Headings */
--stunity-gray-900: #111827;     /* Dark text */
```

### Semantic Colors
```css
--stunity-success: #10B981;      /* Green */
--stunity-warning: #F59E0B;      /* Amber */
--stunity-error: #EF4444;        /* Red */
--stunity-info: #3B82F6;         /* Blue */
```

---

## 📐 Typography

### Font Stack
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### Type Scale
```css
/* Display */
--text-display: 36px/1.2/700    /* Hero headings */

/* Headings */
--text-h1: 32px/1.3/700         /* Page titles */
--text-h2: 24px/1.4/600         /* Section titles */
--text-h3: 20px/1.4/600         /* Card titles */
--text-h4: 16px/1.5/600         /* Small headings */

/* Body */
--text-base: 14px/1.5/400       /* Body text */
--text-sm: 13px/1.5/400         /* Small text */
--text-xs: 12px/1.5/400         /* Tiny text */

/* Labels */
--text-label: 12px/1.5/500      /* Form labels */
```

---

## 📏 Spacing System (8px base)

```css
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-5: 20px
--space-6: 24px
--space-8: 32px
--space-10: 40px
--space-12: 48px
--space-16: 64px
--space-20: 80px
```

---

## 🎯 Border Radius

```css
--radius-sm: 4px      /* Small elements */
--radius-md: 6px      /* Buttons */
--radius-lg: 8px      /* Cards */
--radius-xl: 12px     /* Large cards */
--radius-2xl: 16px    /* Modals */
--radius-full: 9999px /* Pills, avatars */
```

---

## ✨ Shadows

```css
/* Subtle elevation */
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);

/* Card elevation */
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);

/* Dropdown/modal elevation */
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);

/* Heavy elevation */
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
```

---

## 📱 Layout

### Dashboard Layout
```
┌─────────────────────────────────────────────────────┐
│ Header (64px)                                       │
├──────┬──────────────────────────────────────────────┤
│      │                                              │
│ Side │  Content Area                                │
│ bar  │  - Max width: 1400px                         │
│ 256px│  - Padding: 24px                             │
│      │  - Background: gray-50                       │
│      │                                              │
└──────┴──────────────────────────────────────────────┘
```

### Sidebar
- Width: 256px (expanded), 64px (collapsed)
- Background: white
- Border: 1px solid gray-200
- Shadow: subtle

### Content Area
- Max width: 1400px
- Padding: 24px
- Background: gray-50
- Centered with auto margins

---

## 🎴 Component Patterns

### Stat Card
```
┌──────────────────────────┐
│ Icon  Label       Badge  │
│                          │
│ 2,847                    │
│ +142 this semester       │
└──────────────────────────┘
```
- Background: white
- Border: 1px gray-200
- Radius: 8px
- Padding: 20px
- Shadow: sm on hover

### Action Card
```
┌──────────────────────────┐
│ [Icon] Title          >  │
│        Subtitle          │
└──────────────────────────┘
```
- Background: white
- Border: 1px gray-200
- Radius: 8px
- Padding: 16px
- Hover: shadow-md + scale(1.01)

### Navigation Item
```
[Icon] Label          Badge
```
- Height: 40px
- Padding: 8px 12px
- Radius: 6px
- Active: primary-50 background + primary-600 text
- Hover: gray-50 background

---

## 🎭 Interactive States

### Buttons

**Primary:**
- Default: primary-600 bg, white text
- Hover: primary-700
- Active: primary-800
- Disabled: gray-300 bg, gray-500 text

**Secondary:**
- Default: white bg, gray-700 text, gray-300 border
- Hover: gray-50 bg
- Active: gray-100 bg

### Links
- Default: primary-600
- Hover: primary-700 + underline
- Active: primary-800

---

## 📊 Data Visualization

### Colors for Charts
```css
--chart-1: #3B82F6  /* Blue */
--chart-2: #8B5CF6  /* Purple */
--chart-3: #10B981  /* Green */
--chart-4: #F59E0B  /* Amber */
--chart-5: #EF4444  /* Red */
```

### Trend Indicators
- Positive: Green with ↑
- Negative: Red with ↓
- Neutral: Gray with →

---

## 🎯 Usage Principles

1. **Consistency** - Use the same patterns across all pages
2. **Hierarchy** - Clear visual hierarchy with size, weight, color
3. **Whitespace** - Generous spacing for clarity
4. **Accessibility** - WCAG AA contrast ratios minimum
5. **Performance** - Optimize for fast rendering
6. **Responsive** - Mobile-first, graceful degradation

---

## 🚀 Quick Reference

### Most Used Combinations

**Card with header:**
```
bg-white border border-gray-200 rounded-lg shadow-sm p-6
```

**Section title:**
```
text-xl font-semibold text-gray-900
```

**Body text:**
```
text-sm text-gray-600
```

**Button primary:**
```
bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700
```

**Stat number:**
```
text-3xl font-bold text-gray-900
```

---

**Version:** 1.0  
**Last Updated:** January 30, 2026  
**Status:** Active
