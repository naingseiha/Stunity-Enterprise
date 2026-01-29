# 🚀 Stunity - Quick Reference Guide

**Ultra-fast reference for developers, designers, and product managers**

---

## 📌 Essential Links

| What | Where | Why |
|------|-------|-----|
| **Start Here** | [README.md](./README.md) | Master index of all docs |
| **Big Picture** | [Vision & Strategy](./VISION_AND_STRATEGY.md) | Understand the mission |
| **All Features** | [Feature Roadmap](./COMPREHENSIVE_FEATURE_ROADMAP.md) | Complete feature list |
| **How It Works** | [Technical Architecture](./TECHNICAL_ARCHITECTURE.md) | System design |
| **Visual Guide** | [Design System](./DESIGN_SYSTEM.md) | UI/UX standards |
| **Quality** | [Testing Strategy](./TESTING_STRATEGY.md) | Testing approach |
| **Build It** | [Implementation Guide](./IMPLEMENTATION_GUIDE.md) | Step-by-step guide |

---

## ⚡ Quick Commands

```bash
# Development
npm run dev              # Start dev server
npm test                 # Run all tests
npm run build            # Build for production

# Database
npx prisma studio        # Open database GUI
npx prisma generate      # Generate Prisma client
npx prisma migrate dev   # Create migration

# Deployment
vercel                   # Deploy preview
vercel --prod            # Deploy production

# Testing
npm run test:unit        # Unit tests
npm run test:e2e         # E2E tests
npm run test:coverage    # Coverage report
```

---

## 🎨 Design Quick Reference

### Colors
```css
Primary:   #3b82f6 (Blue-500)
Secondary: #f97316 (Orange-500)
Success:   #22c55e (Green-500)
Error:     #ef4444 (Red-500)
Text:      #111827 (Gray-900)
```

### Spacing (4px grid)
```
1 = 4px   |  4 = 16px  |  8 = 32px
2 = 8px   |  5 = 20px  | 10 = 40px
3 = 12px  |  6 = 24px  | 12 = 48px
```

### Typography
```
Display: 48px-72px
Heading: 20px-36px
Body:    16px
Small:   14px
Tiny:    12px
```

### Components
- Cards: `rounded-3xl shadow-lg`
- Buttons: `rounded-xl`
- Inputs: `rounded-xl border-2`

---

## 🗂️ File Structure

```
src/
├── app/              # Next.js pages
├── components/       # React components
│   ├── ui/          # UI components
│   └── layout/      # Layout components
├── lib/             # Utilities
├── services/        # API services
├── hooks/           # Custom hooks
└── types/           # TypeScript types
```

---

## 🔑 Key Features by Role

### Students
- ✅ Feed, Courses, Assignments, Progress, Profile
- 🚧 Messaging, Teams, Study Groups
- 📅 Content Library, Certifications

### Teachers
- ✅ Feed, Profile
- 🚧 Course Creation, Grading, Analytics
- 📅 Student Management, Course Marketplace

### Researchers
- 🚧 Research Network, Publication Repository
- 📅 Collaboration Tools, Grant Opportunities

**Legend:** ✅ Done | 🚧 In Progress | 📅 Planned

---

## 📊 Performance Targets

| Metric | Target | Max |
|--------|--------|-----|
| Page Load | < 2s | 3s |
| API Response | < 300ms | 500ms |
| Database Query | < 100ms | 200ms |
| Test Coverage | 80% | 70% min |
| Lighthouse Score | 90+ | 80+ |

---

## 🐛 Common Issues

### Database connection failed
```bash
# Check DATABASE_URL in .env.local
# Regenerate Prisma client
npx prisma generate
```

### Build errors
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
```

### Tests failing
```bash
# Clear test cache
npm test -- --clearCache
```

---

## 📅 Phase 1 Timeline

**Weeks 1-3:** Profile System  
**Weeks 4-6:** Network Features  
**Weeks 7-9:** Enhanced Feed  
**Weeks 10-12:** Messaging MVP

**Total:** 12 weeks (Jan 27 - Apr 20, 2026)

---

## 🎯 Success Checklist

### Before Starting
- [ ] Read Vision & Strategy
- [ ] Understand Feature Roadmap
- [ ] Set up local environment
- [ ] Understand Design System

### Before Committing
- [ ] Code follows style guide
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] No console errors

### Before Deploying
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Performance tested
- [ ] Security checked

---

## 🆘 Need Help?

1. **Check docs:** Start with README.md
2. **Search issues:** GitHub Issues
3. **Ask community:** Discord/Discussions
4. **Contact lead:** [Your Email]

---

## 📈 Current Status

**Phase:** 0 → 1 Transition  
**Last Milestone:** Student Navigation ✅  
**Next Milestone:** Profile System (Week 3)  
**Overall:** 15% Complete

---

## 💡 Pro Tips

1. **Read docs first** - Save time, avoid confusion
2. **Test early** - Don't wait until the end
3. **Commit often** - Small, focused commits
4. **Ask questions** - No question is too small
5. **Document changes** - Future you will thank you

---

## 🎉 Motivation

**You're building something amazing!**

Every line of code brings us closer to revolutionizing education. Keep going! 💪

---

**Quick Links:**
- 📖 [Full Documentation](./README.md)
- 🎯 [Current Tasks](./IMPLEMENTATION_GUIDE.md#phase-1-implementation)
- 🐛 [Report Issues](../issues)
- 💬 [Discussions](../discussions)

---

**Last Updated:** January 27, 2026  
**Print this and keep it handy! 📌**
