# 📊 Statistics Page - Quick Reference Guide

## 🚀 Quick Start

```bash
# Start development server
npm run dev

# Navigate to
http://localhost:3000/statistics

# Build for production
npm run build
```

---

## 📑 Tab Navigation

| Tab | Khmer | Content |
|-----|-------|---------|
| 📊 Overview | ទិដ្ឋភាពទូទៅ | Key metrics + Top 6 classes |
| 📈 Performance | ការអនុវត្ត | Pass rate charts + Grade cards |
| 🎯 Distribution | ការចែកចាយពិន្ទុ | A-F grades + Gender stats |
| 🏆 Rankings | ចំណាត់ថ្នាក់ | Top 10 students + Details |

---

## 🎨 Color Scheme

```
Primary:     Indigo (#6366f1) & Purple (#8b5cf6)
Success:     Green (#10b981)
Danger:      Red (#ef4444)
Warning:     Orange (#f59e0b)
Male:        Blue (#3b82f6)
Female:      Pink (#ec4899)

Grades:
A = Green (#10b981)
B = Blue (#3b82f6)
C = Yellow (#f59e0b)
D = Orange (#f97316)
E = Red (#ef4444)
F = Red (#dc2626)
```

---

## 📥 Export Functions

```typescript
// Export to PDF
await exportUtils.exportToPDF('statistics-content', 'report.pdf');

// Export to PNG
await exportUtils.exportToPNG('statistics-content', 'chart.png');

// Export entire page
await exportUtils.exportPageToPDF('statistics-report.pdf');
```

---

## 📊 Chart Components

### Bar Chart
```tsx
<CustomBarChart
  data={chartData}
  xKey="grade"
  yKey="value"
  colors={['#10b981']}
  height={350}
  tooltipFormatter={(value) => `${value}%`}
/>
```

### Pie Chart
```tsx
<CustomPieChart
  data={pieData}
  nameKey="name"
  valueKey="value"
  colors={['#6366f1', '#ec4899']}
  height={300}
  showLegend={true}
/>
```

### Line Chart
```tsx
<CustomLineChart
  data={trendData}
  xKey="month"
  yKey={['series1', 'series2']}
  colors={['#3b82f6', '#f59e0b']}
  height={300}
/>
```

---

## 🔌 API Endpoints

### Get Statistics
```
GET /api/dashboard/comprehensive-stats?month=មករា&year=2025
```

### Get Top Students (Needs Implementation)
```
GET /api/dashboard/top-students?month=មករា&year=2025&limit=10

Response:
{
  students: [
    {
      id: string,
      name: string,
      className: string,
      grade: string,
      gender: "MALE" | "FEMALE",
      averageScore: number
    }
  ]
}
```

### Comparison (Client-side)
```typescript
const [stats1, stats2] = await Promise.all([
  dashboardApi.getComprehensiveStats(month1, year),
  dashboardApi.getComprehensiveStats(month2, year)
]);
```

---

## 📂 File Structure

```
src/
├── components/
│   └── charts/
│       ├── CustomBarChart.tsx
│       ├── CustomPieChart.tsx
│       ├── CustomLineChart.tsx
│       └── index.ts
├── lib/
│   ├── api/
│   │   └── dashboard.ts (Enhanced)
│   └── exportUtils.ts (New)
└── app/
    └── statistics/
        ├── page.tsx (Redesigned)
        └── page.tsx.old (Backup)
```

---

## 🐛 Troubleshooting

### Charts not showing?
```bash
# Check if Recharts is installed
npm list recharts

# Reinstall if needed
npm install recharts
```

### Export not working?
```bash
# Check export libraries
npm list html-to-image jspdf html2canvas

# Reinstall if needed
npm install html-to-image jspdf html2canvas
```

### Build errors?
```bash
# Clear cache and rebuild
rm -rf .next
npm run build
```

### Data not loading?
1. Check browser console for API errors
2. Verify backend endpoints are running
3. Check network tab in DevTools
4. Clear cache and reload

---

## 🎯 Key Features

✅ **4 organized tabs** for easy navigation  
✅ **PDF/PNG export** for reports  
✅ **Interactive charts** with tooltips  
✅ **Comparison mode** for month-to-month analysis  
✅ **Responsive design** for all devices  
✅ **Khmer language** support throughout  
✅ **Professional layout** with clean design

---

## 📊 Statistics Calculations

```typescript
// Overall pass percentage
const overallPassPercentage = 
  totalWithGrades > 0 
    ? (totalPassed / totalWithGrades) * 100 
    : 0;

// Grade distribution totals
const totalDistribution = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
stats.grades.forEach(grade => {
  Object.entries(grade.gradeDistribution).forEach(([letter, dist]) => {
    totalDistribution[letter] += dist.total;
  });
});

// Gender totals
const totalMale = stats.grades.reduce((sum, g) => sum + g.maleStudents, 0);
const totalFemale = stats.grades.reduce((sum, g) => sum + g.femaleStudents, 0);
```

---

## 🔄 Comparison Mode

### Enable
```typescript
// Click button or programmatically
setComparisonMode(true);
setCompareMonth('កុម្ភៈ'); // Select second month
```

### Disable
```typescript
setComparisonMode(false);
setCompareStats(null);
```

### UI Changes
- Month selector splits into two
- Blue theme for Month 1
- Orange theme for Month 2
- "vs" text appears
- Close button shows

---

## 📱 Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 768px) {
  - 1 column layout
  - Stacked tabs (scroll horizontal)
  - Cards full width
}

/* Tablet */
@media (min-width: 768px) and (max-width: 1024px) {
  - 2 column layout where applicable
  - Tabs visible
}

/* Desktop */
@media (min-width: 1024px) {
  - Full 2 column grids
  - All features visible
}
```

---

## 🎨 Customization

### Change Tab Colors
```typescript
// In tabs array
const tabs = [
  { 
    id: 'overview', 
    label: 'ទិដ្ឋភាពទូទៅ', 
    icon: BarChart3,
    color: 'indigo' // Add custom color
  }
];

// In tab button className
className={`
  ${activeTab === tab.id ? 'text-indigo-600 border-indigo-600' : ''}
`}
```

### Add New Tab
```typescript
// 1. Add to tabs array
{ id: 'newtab', label: 'New Tab', icon: Icon }

// 2. Add content section
{activeTab === 'newtab' && (
  <div>New tab content</div>
)}
```

### Customize Chart Colors
```typescript
// Define color palette
const colors = ['#6366f1', '#ec4899', '#10b981'];

// Pass to chart
<CustomBarChart colors={colors} />
```

---

## 💡 Best Practices

### Performance
- ✅ Use `useCallback` for handlers
- ✅ Memoize expensive calculations
- ✅ Lazy load charts
- ✅ Implement virtual scrolling for large lists

### Accessibility
- ✅ Add `aria-label` to buttons
- ✅ Keyboard navigation support
- ✅ Screen reader friendly
- ✅ Sufficient color contrast

### Code Quality
- ✅ TypeScript strict mode
- ✅ ESLint rules followed
- ✅ Consistent naming conventions
- ✅ Proper error handling

---

## 📊 Bundle Analysis

```
Statistics Page:      128 KB
Chart Components:     ~40 KB (Recharts)
Export Utils:         ~15 KB
Total First Load:     439 KB

Status: ✅ Acceptable
```

---

## 🚀 Deployment Checklist

- [ ] All dependencies installed
- [ ] Environment variables set
- [ ] API endpoints configured
- [ ] Build successful
- [ ] No console errors
- [ ] Export tested
- [ ] Mobile responsive checked
- [ ] Backend endpoints ready
- [ ] Cache configured
- [ ] Error handling tested

---

## 📞 Support

**Documentation:** `STATISTICS_PAGE_ENHANCEMENT.md`  
**Backup:** `src/app/statistics/page.tsx.old`  
**TODO List:** Check session state folder

---

**Quick Reference Version 1.0**  
*Updated: January 21, 2026*
