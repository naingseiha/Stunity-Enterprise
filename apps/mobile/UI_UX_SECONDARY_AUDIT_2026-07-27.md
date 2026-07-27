# Stunity Mobile — Secondary UI/UX & React Native Audit

Audit date: 2026-07-27  
Scope: Expo/React Native secondary screens, nested stacks, modal surfaces, bottom sheets, and shared design foundations. The five already-audited tab roots (Feed, Learn, Reels, Clubs, Profile) are excluded except where their implementation affects nested screens.

## Executive result

Overall consistency grade: **D+**.

The app has a valid theme context and a root `SafeAreaProvider`, but most secondary experiences predate that system. In the reviewed secondary-screen set, 65 of 103 files do not consume the dynamic theme; the set contains roughly 4,064 hex literals and 364 uses of weight `800`/`900`. Four full-screen surfaces use React Native's legacy `SafeAreaView` instead of `react-native-safe-area-context`.

The largest risks are:

1. **Dark Mode is incomplete by architecture, not by isolated mistakes.** Assignments, most Class/Club administration, Lesson Viewer, Create Course, Parent, Stats, Live Quiz, Auth, and several modal families use fixed light palettes.
2. **Header language is fragmented.** Every navigator sets `headerShown: false`, so more than 80 screens independently implement back buttons, title alignment, status-bar treatment, and safe-area behavior.
3. **The design tokens do not encode the approved standard.** `Typography.fontSize.base` is 16 rather than the approved body size 15; `BorderRadius` has 12, 14, and 24 but no standard 16; the exported top-level `Colors.background/card/text` are permanently light.
4. **EdTech screens often miss the approved hero.** Many Learn/Clubs screens use flat white headers or unrelated gradients instead of a tokenized gradient with 32px lower corners.
5. **Typography is locally invented.** Small 9–11px labels and `800`/`900` weights are common outside immersive/gaming contexts.

## Canonical fixes referenced below

### T1 — Dynamic theme styles

```tsx
const { colors, isDark } = useThemeContext();
const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

const createStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    card: { backgroundColor: colors.card, borderColor: colors.border },
    title: { color: colors.text },
    meta: { color: colors.textSecondary },
  });
```

Status and brand colors may remain palette values, but page, card, border, primary text, secondary text, input, and overlay surfaces must use semantic tokens.

### H1 — Flat social header

```tsx
<SafeAreaView edges={['top']} style={{ backgroundColor: colors.card }}>
  <View style={styles.headerRow}>
    <HeaderIconButton icon="chevron-back" onPress={navigation.goBack} />
    <Text style={styles.headerTitle}>{title}</Text>
    <View style={styles.headerSlot}>{rightAction}</View>
  </View>
</SafeAreaView>

const styles = StyleSheet.create({
  headerRow: { height: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  headerSlot: { width: 40, height: 40 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' },
});
```

### H2 — Learn/Clubs gradient hero

```tsx
<LinearGradient
  colors={[colors.primary, colors.info]}
  style={styles.heroHeader}
>
  <SafeAreaView edges={['top']}>
    <View style={styles.headerRow}>{/* 40x40 actions + title */}</View>
    {heroContent}
  </SafeAreaView>
</LinearGradient>

const styles = StyleSheet.create({
  heroHeader: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
});
```

### Y1 — Approved type roles

```tsx
body: { fontSize: 15, fontWeight: '600', lineHeight: 22, color: colors.text },
chip: { fontSize: 12, fontWeight: '700' },
meta: { fontSize: 12, fontWeight: '500', color: colors.textSecondary },
```

### M1 — Theme- and inset-safe sheet

```tsx
const insets = useSafeAreaInsets();
<View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]} />

sheet: {
  backgroundColor: colors.card,
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
}
```

## Design foundations and navigation

- **File/Screen Name:** `src/config/theme.ts`
- **Score:** D
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Top-level `Colors.background`, `Colors.card`, and `Colors.text` are light-only yet remain available to screens -> remove them from runtime screen usage and expose typed `ThemeColors` from `useThemeContext` (T1).
  - Approved 15/22 body and 16px card radius are not first-class tokens -> add `Typography.body`, `Typography.meta`, `Typography.chip`, and `BorderRadius.card = 16` using Y1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - `BorderRadius.xl = 14` conflicts with the established 16px standard; naming also makes 24px appear as `2xl` rather than `hero`.
- **✅ Good Practices Found:**
  - Light and dark semantic palettes already include background, card, text, border, surfaces, status colors, skeletons, and overlays.

- **File/Screen Name:** `src/navigation/MainNavigator.tsx`, `AuthNavigator.tsx`, `ParentNavigator.tsx`, `RootNavigator.tsx`
- **Score:** C-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - All nested navigators disable native headers, forcing each screen to recreate safe-area and header behavior -> adopt shared H1/H2 components or navigator-level headers.
  - `AuthNavigator` sets `contentStyle.backgroundColor: Colors.white` -> use `const { colors } = useThemeContext()` and `backgroundColor: colors.background`.
  - Reels hardcoded black/white navigation colors are valid for the approved immersive context; the same exception should not spread to other stacks.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Route types declare `VerifyOTP`, `ParentMessages`, and `ParentNotifications` without registered screens. `CertificateScreen` and `CourseQAScreen` are exported but unreachable.
  - Several route definitions are cast with `as any`, reducing navigation safety.
- **✅ Good Practices Found:**
  - Stack ownership is thoughtful: Reels keeps Comments/Bounty/Profile in its own stack, tab-bar visibility is route-aware, and root navigation mirrors theme tokens.

- **File/Screen Name:** `src/components/common/Button.tsx`, `Card.tsx`, `Input.tsx`
- **Score:** B-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - The primitives are theme-aware, but adoption is extremely low: only Register and ClaimCodeSetup directly import common Button/Input across the audited screen set. Most screens rebuild these controls with fixed colors.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Card inherits `BorderRadius.xl = 14` instead of 16; Input uses 16px text rather than the approved 15/600/22 role; Button gradients are locally hardcoded. Update the primitives to the approved tokens, then migrate screen-local controls.
- **✅ Good Practices Found:**
  - Buttons are pill-shaped, all three primitives use dynamic theme styles, and variants/states provide a solid reusable base.

## Profile and account secondary screens

- **File/Screen Name:** `src/screens/profile/SettingsScreen.tsx`
- **Score:** B-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - No page-level Dark Mode break was found; surfaces correctly use `colors.*`.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Cards use radius 14 instead of 16; rows use `paddingVertical: 13`; the header has only 6px bottom padding; many labels are 10/11/13px.
  - Body labels are `15/500` instead of `15/600/22`; icon/background metadata contains a large local hardcoded palette.
  - Use `borderRadius: 16`, `paddingVertical: 12`, Y1, and status palette tokens. Keep the current 40x40 safe header action.
- **✅ Good Practices Found:**
  - Dynamic theme, top safe area, semantic page/card colors, balanced 40px header slots, dark-aware icon tints, and memoized style factories are all present.

- **File/Screen Name:** `src/screens/profile/EditProfileScreen.tsx`
- **Score:** C+
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Dynamic theming is present, but multiple gradient and fixed light accent surfaces need dark variants -> route neutral surfaces through T1 and keep hardcoded values only for brand/status accents.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - 11/13/14/17px type roles and two heavy weights fragment hierarchy; consolidate to Y1 and a single 18/700 screen title.
- **✅ Good Practices Found:**
  - Safe-area handling, responsive styles, and semantic input text/placeholder treatment are established.

- **File/Screen Name:** `src/screens/profile/AcademicProfileScreen.tsx`
- **Score:** B-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - None at the page-surface level; theme context is used.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Fixed achievement palettes and a `32/800` value style are visually louder than the non-gaming profile context -> preserve status colors, reduce ordinary labels to Y1.
- **✅ Good Practices Found:**
  - Uses safe area, semantic background/card/text tokens, and standard 16px content rhythm.

- **File/Screen Name:** `src/screens/profile/BlockedUsersScreen.tsx`
- **Score:** B+
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - None found.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - One `800` weight and 17px title should become 18/700; ensure the flat H1 header uses 40x40 actions.
- **✅ Good Practices Found:**
  - Very low hardcoded-color usage, dynamic theming, semantic separators, and safe-area coverage.

- **File/Screen Name:** `src/screens/profile/ProfileVisitorsScreen.tsx`
- **Score:** C
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - No full Dark Mode failure; dynamic tokens cover core surfaces.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - A profile/social utility uses a gradient header and five `800/900` styles; replace with H1 and 700 maximum for ordinary hierarchy.
- **✅ Good Practices Found:**
  - Safe area and theme context are correctly wired.

- **File/Screen Name:** `src/screens/profile/PasswordSecurityScreen.tsx`
- **Score:** B
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - None found on core surfaces.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Header is locally rebuilt; type varies across 12/13/14/15/17. Use H1 and Y1.
- **✅ Good Practices Found:**
  - Theme-aware form controls, safe area, and restrained weight usage.

- **File/Screen Name:** `src/screens/profile/ManageDeadlinesScreen.tsx`
- **Score:** F
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Entire screen is fixed to `#F8FAFC`, `#FFFFFF`, and dark text without `useThemeContext` -> apply T1 to container, header, cards, inputs, text, and borders.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Local form/button styles reinvent common Input/Button; button radius 12 should be pill-shaped for a primary action.
- **✅ Good Practices Found:**
  - Top safe area and 16px horizontal page padding are correct.

- **File/Screen Name:** `src/screens/profile/MyQRCardScreen.tsx`
- **Score:** C-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Screen chrome does not consume the theme. Keep the QR canvas/card white for scan reliability, but theme the surrounding page and header with T1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Header uses 20px padding and 12px action radius; role/title text overuses 800. Align chrome to H1; document the intentional white QR exception.
- **✅ Good Practices Found:**
  - Responsive card/QR sizing and safe-area handling are good; fixed contrast inside the scannable ID artifact is defensible.

- **File/Screen Name:** `src/screens/profile/UserCardScreen.tsx`
- **Score:** C-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Theme context exists, but 86 hex literals and many locally fixed decorative surfaces leave partial Dark Mode inconsistencies -> migrate neutral colors via T1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Nineteen heavy weights and many one-off dimensions/radii create a separate design language; reserve heavy type for the card artifact and use Y1 for surrounding UI.
- **✅ Good Practices Found:**
  - Safe area, responsive sizing, and semantic outer surfaces are implemented.

## Feed/social secondary screens

- **File/Screen Name:** `src/screens/feed/PostDetailScreen.tsx`
- **Score:** C+
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Dynamic theme covers the page, but post-type badge backgrounds such as `#D1FAE5/#E0F2FE` are injected unchanged in Dark Mode -> provide `lightBg/darkBg` or derive translucent accent backgrounds.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Back target is 36x36 and action buttons are padding-only instead of required 40x40; header padding is 12/10; card radii are frequently 12/14.
  - Body copy is `16/25` rather than Y1, and non-gaming quiz subsections use 800. Apply H1, 16px cards, and Y1.
- **✅ Good Practices Found:**
  - Flat `colors.card` header, top safe area, semantic page/card text, keyboard avoidance, and focused content structure match the social pattern.

- **File/Screen Name:** `src/screens/feed/CommentsScreen.tsx`
- **Score:** C
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Theme support exists, but numerous fixed tints/gradients are not dark-paired -> tokenise neutral surfaces and use translucent status accents.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Comment body is 14px instead of 15/600/22; header should use H1 and 40x40 actions.
- **✅ Good Practices Found:**
  - Safe area, keyboard handling, theme context, and semantic input text colors are present.

- **File/Screen Name:** `src/screens/feed/BookmarksScreen.tsx`
- **Score:** B-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - None on primary surfaces.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - A social utility should remain flat; remove decorative header gradient if visible and standardize H1/Y1.
- **✅ Good Practices Found:**
  - Theme tokens, safe area, empty/loading states, and standard content padding.

- **File/Screen Name:** `src/screens/feed/MyPostsScreen.tsx`
- **Score:** B-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - None on primary surfaces.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Use a flat H1 header rather than gradient decoration; normalize 16/22 body to Y1.
- **✅ Good Practices Found:**
  - Dynamic theme and safe-area coverage are correctly implemented.

- **File/Screen Name:** `src/screens/feed/SearchScreen.tsx`
- **Score:** C-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Core theming is dynamic, but 46 hex literals and unpaired result-card tints cause uneven Dark Mode.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Thirteen heavy weights, numerous 10/11/13/17px styles, and one-off 19/38 sizing indicate duplicated mini-components -> extract SearchResultRow, SearchChip, and H1.
- **✅ Good Practices Found:**
  - Uses theme context, safe-area insets, responsive lists, and semantic page background.

- **File/Screen Name:** `src/screens/feed/SuggestedUsersScreen.tsx`
- **Score:** B
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - None found on neutral surfaces.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Replace 17px title and mixed 11/13/14/15 type with H1/Y1.
- **✅ Good Practices Found:**
  - Dynamic theme, safe area, flat social presentation, and restrained weight usage.

- **File/Screen Name:** `src/screens/feed/EventsScreen.tsx`
- **Score:** C
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Theme exists but fixed event-category surfaces need dark variants.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - 21px title, 9–14px label spread, 800 weights, and 38/19 dimensions violate shared roles. Use H1/Y1 and 16/24 radii.
- **✅ Good Practices Found:**
  - Safe area and semantic background/card colors.

- **File/Screen Name:** `src/screens/feed/EventDetailScreen.tsx`
- **Score:** C
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Several light fixed detail/chip surfaces do not change in Dark Mode -> replace neutrals with `colors.card/surfaceVariant/border`.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Four non-immersive 800 styles and 10/11px metadata; use Y1 and pill actions.
- **✅ Good Practices Found:**
  - Theme context and safe area are present.

- **File/Screen Name:** `src/screens/feed/CreatePostScreen.tsx`
- **Score:** C-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Although theme-aware, its nested editor surfaces still contain many fixed light tints; neutralize them through T1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - At 1,820 lines it owns headers, media controls, type pickers, forms, and modal state. Split into shared ComposerHeader, ComposerAction, Chip, and field primitives.
- **✅ Good Practices Found:**
  - Safe area, dynamic theme, keyboard-aware editing, and modal navigation presentation.

- **File/Screen Name:** `src/screens/feed/EditPostScreen.tsx`
- **Score:** B-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - No full surface break; fixed accents should still move to the shared palette.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Local editor header and mixed 10–17px roles should reuse CreatePost primitives and Y1.
- **✅ Good Practices Found:**
  - Theme, safe area, and restrained font weights.

- **File/Screen Name:** `src/screens/feed/BountyDetailScreen.tsx`
- **Score:** C
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Neutral surfaces are themed, but accent backgrounds and text pairs are only partly dark-aware.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Nine heavy weights are excessive for a feed detail; keep gaming reward numerals heavy, use Y1 elsewhere.
- **✅ Good Practices Found:**
  - Safe insets, theme context, gradient reserved for a featured/gamified area, and pill actions.

- **File/Screen Name:** `src/screens/feed/CreateBountyScreen.tsx`
- **Score:** C+
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Raw React Native `SafeAreaView` is also imported alongside safe-area-context; remove the legacy import and use context consistently.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Six heavy weights plus one 900 style; keep 900 only for reward/XP, normalize form copy to Y1.
- **✅ Good Practices Found:**
  - Theme-aware modal screen, bottom inset handling, pill actions, and slide-up presentation.

- **File/Screen Name:** `src/screens/feed/CreateFocusReelScreen.tsx`
- **Score:** B-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - None on core surfaces.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - The authoring flow should use the approved black immersive shell consistently; six heavy weights are acceptable only for focus/reel emphasis.
- **✅ Good Practices Found:**
  - Theme and safe-area wiring; very limited fixed palette usage.

- **File/Screen Name:** `src/screens/feed/CreateQuestionCardScreen.tsx`
- **Score:** B-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - None on neutral surfaces.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Four heavy weights and a local header; use the immersive composer shell and shared action components.
- **✅ Good Practices Found:**
  - Safe area, theme context, and limited hardcoded colors.

## Learn secondary screens

- **File/Screen Name:** `src/screens/learn/CourseDetailScreen.tsx`
- **Score:** C-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - The required Learn hero is absent: the screen renders separate flat navigation and a card hero. Replace with H2 and 32px lower corners.
  - Rating/learner/lesson pills use fixed light backgrounds (`#FEF3C7`, `#E0E7FF`, `#E0F2FE`) in Dark Mode -> create dark translucent pairs.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Header actions are 44x44 rather than the shared 40x40; content uses 20px horizontal padding rather than 16 mobile/24 tablet.
  - Sixteen 800/900 uses; title is `24/900` with lineHeight 40; description is `14/500/26`. Apply Y1 outside featured metrics.
- **✅ Good Practices Found:**
  - Dynamic theme, safe area/insets, semantic card borders, 24px hero cards, and pill CTAs are present.

- **File/Screen Name:** `src/screens/learn/LessonViewerScreen.tsx`
- **Score:** F
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - No dynamic theme and roughly 295 fixed color literals; white lesson surfaces and dark text remain unchanged in Dark Mode -> migrate the whole style sheet to T1 before cosmetic work.
  - Learn header is flat and locally built -> use H2 or a focused lesson variant with the same tokenized family.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Thirty heavy weights and extensive 10/11/13/14px micro-type. Extract LessonSection, ResourceCard, DiscussionCard, and use Y1.
- **✅ Good Practices Found:**
  - Top safe area and broad lesson/resource functionality are in place.

- **File/Screen Name:** `src/screens/learn/DocumentViewerScreen.tsx`
- **Score:** D
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - No theme context; viewer chrome uses fixed light surfaces -> apply T1 to chrome while allowing document content to preserve source colors.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Six heavy weights and 11px metadata; use a focused viewer header and Y1.
- **✅ Good Practices Found:**
  - Safe area and dedicated loading/error states.

- **File/Screen Name:** `src/screens/learn/CreateCourseScreen.tsx`
- **Score:** F
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - No dynamic theme and roughly 187 fixed colors; form cards/inputs will remain light in Dark Mode -> convert to T1 and shared Input/Button/Card.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - 2,600+ lines combine a wizard, editors, uploaders, validators, and presentation; split by step and adopt H2.
- **✅ Good Practices Found:**
  - Safe-area insets, responsive scroll behavior, and clear multi-step functionality.

- **File/Screen Name:** `src/screens/learn/instructor/InstructorDashboardScreen.tsx`
- **Score:** D+
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Uses static `Colors` rather than theme context -> apply T1 to dashboard surfaces.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Gradient does not establish the consistent 32px Learn hero; 10/11px metadata should be 12/500.
- **✅ Good Practices Found:**
  - Safe area, limited hardcoded values, and restrained font weight.

- **File/Screen Name:** `src/screens/learn/path/ExamPaperBrowseScreen.tsx`
- **Score:** C
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Theme exists, but many fixed exam/status tints lack dark counterparts.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - 11px labels and three heavy weights; align header to H2 and content to Y1.
- **✅ Good Practices Found:**
  - Dynamic theme, safe-area insets, responsive browsing, and a suitable EdTech gradient direction.

- **File/Screen Name:** `src/screens/learn/path/PracticeSessionScreen.tsx`
- **Score:** C
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Fixed practice-state palettes need dark variants despite theme-aware page chrome.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Nine heavy weights; reserve them for score/result states and apply Y1 to prompts/meta.
- **✅ Good Practices Found:**
  - Safe-area insets, theme context, and focused task flow.

- **File/Screen Name:** `src/screens/learn/path/TutorChatScreen.tsx`
- **Score:** B
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - None on core surfaces.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Use the shared chat/header primitives; normalize 14/15/16 type to Y1.
- **✅ Good Practices Found:**
  - Theme-aware chat, safe area, semantic text/input surfaces, and restrained weights.

- **File/Screen Name:** `src/screens/learn/path/UnitLessonScreen.tsx`
- **Score:** B-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - None on primary surfaces.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - One unnecessary 800 weight and no Learn-family H2 hero; standardize header and type.
- **✅ Good Practices Found:**
  - Dynamic theme, safe area, low fixed-color count.

- **File/Screen Name:** `src/screens/learn/CertificateScreen.tsx`
- **Score:** D
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Static palette and no dynamic theme -> theme screen chrome via T1 while preserving an intentional printable certificate canvas.
  - Screen is exported but not registered in navigation, so it is currently unreachable.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Add an explicit route type and a completion entry point; use pill download/share actions.
- **✅ Good Practices Found:**
  - Safe area and separate certificate artifact layout.

- **File/Screen Name:** `src/screens/learn/CourseQAScreen.tsx`
- **Score:** F
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Static light palette across page, messages, and input -> apply T1.
  - Exported but not registered or referenced, creating dead UI code.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Reuse TutorChat/Chat primitives rather than maintaining a third conversation UI.
- **✅ Good Practices Found:**
  - Safe area and keyboard-aware layout.

## Clubs, classes, and assignments

- **File/Screen Name:** `src/screens/clubs/ClubDetailsScreen.tsx`
- **Score:** C
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Dynamic theme exists, but 48 fixed colors leave inconsistent dark accent surfaces -> use dark-paired translucent accents.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Ensure gradient header lower corners are exactly 32; five heavy weights and 11px metadata should be normalized.
- **✅ Good Practices Found:**
  - Theme context, safe area, gradient identity, and semantic background/card tokens.

- **File/Screen Name:** `src/screens/clubs/ClassDetailsScreen.tsx`
- **Score:** C-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Theme-aware outer shell still contains more than 100 local color literals and fixed subcards -> migrate neutral surfaces to T1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Eleven heavy weights and many one-off sizes/radii; standardize H2, cards 16/24, and Y1.
- **✅ Good Practices Found:**
  - Safe area, dynamic theme, responsive class hero, and nested-feature organization.

- **File/Screen Name:** `src/screens/clubs/ClassDirectoryScreen.tsx`
- **Score:** C
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Theme support is partial; fixed member/status cards need dark variants.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Seven heavy weights and mixed 10–20px roles; use H2/Y1.
- **✅ Good Practices Found:**
  - Safe area, dynamic theme, and gradient EdTech direction.

- **File/Screen Name:** `src/screens/clubs/DisciplineWorkbenchScreen.tsx`
- **Score:** C-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Semantic theme is used, but fixed workbench/status tints are numerous and not consistently paired.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Eleven heavy weights plus 9/10/11px labels; reserve heavy type for severity and use H2/Y1 elsewhere.
- **✅ Good Practices Found:**
  - Safe area, theme context, and gradient header foundation.

- **File/Screen Name:** `src/screens/clubs/ClassAnnouncementsScreen.tsx`
- **Score:** F
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Defines a fixed light `COLORS` object (`#F8FBFF`, `#FFFFFF`, dark text) and uses it for both screen and two modals -> replace it with T1 and M1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Flat header violates the Clubs H2 pattern; modal buttons use radius 12/22 rather than pills.
- **✅ Good Practices Found:**
  - Safe-area coverage, 16px cards, 15/22 announcement content, and clear list/compose states.

- **File/Screen Name:** `src/screens/clubs/ClubAnnouncementsScreen.tsx`
- **Score:** D
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - No theme context; static light surfaces -> apply T1 and H2.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Flat header and mixed 12/14/15/18 hierarchy; use Y1.
- **✅ Good Practices Found:**
  - Safe area and restrained weights.

- **File/Screen Name:** `src/screens/clubs/ClassMaterialsScreen.tsx`
- **Score:** D
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Static light palette -> apply T1; inline material modal must use M1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Use H2 and shared MaterialCard/empty state.
- **✅ Good Practices Found:**
  - Safe area and standard 16px content spacing.

- **File/Screen Name:** `src/screens/clubs/ClubMaterialsScreen.tsx`
- **Score:** D
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - No dynamic theme; light cards/inputs remain fixed -> T1/M1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Duplicates ClassMaterials presentation; consolidate a shared MaterialsScreen shell.
- **✅ Good Practices Found:**
  - Safe area and restrained font weights.

- **File/Screen Name:** `src/screens/clubs/ClassMembersScreen.tsx`
- **Score:** D-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Fixed palette across member list and actions -> apply T1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Seven heavy weights and gradient/local avatar treatments; reuse Avatar, H2, and Y1.
- **✅ Good Practices Found:**
  - Safe area and clear role/member structure.

- **File/Screen Name:** `src/screens/clubs/ClubMembersScreen.tsx`
- **Score:** D
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Static light palette -> apply T1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Consolidate with ClassMembers shared row/actions; use H2.
- **✅ Good Practices Found:**
  - Safe area and ordinary weights are restrained.

- **File/Screen Name:** `src/screens/clubs/ClubInvitesScreen.tsx`
- **Score:** D
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - No dynamic theme; invitation cards are fixed light -> apply T1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Flat header instead of H2; 34px local control size should use 40px action primitive.
- **✅ Good Practices Found:**
  - Safe area and simple, scannable hierarchy.

- **File/Screen Name:** `src/screens/clubs/ClubAcademicsScreen.tsx`
- **Score:** D-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Static palette across an EdTech hub -> apply T1 and H2.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Ten heavy weights and 11px labels; normalize with Y1.
- **✅ Good Practices Found:**
  - Safe area and pill-like filter concepts.

- **File/Screen Name:** `src/screens/clubs/ClassGradesScreen.tsx`
- **Score:** D-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - No theme context; fixed grading surfaces -> T1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Eight heavy weights and many large one-off chart dimensions; reserve heavy type for grade values, use H2/Y1.
- **✅ Good Practices Found:**
  - Safe area and a gradient direction appropriate for EdTech.

- **File/Screen Name:** `src/screens/clubs/ClassAttendanceScreen.tsx`
- **Score:** D-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Static palette and 76 hardcoded colors -> migrate to T1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Ten heavy weights and 9/10/11px labels; retain heavy only for attendance totals/status.
- **✅ Good Practices Found:**
  - Safe area and H2-compatible gradient foundation.

- **File/Screen Name:** `src/screens/clubs/ClassLeaderboardScreen.tsx`
- **Score:** D-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Static palette and no approved gradient hero -> T1/H2.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Fifteen heavy weights; leaderboard numbers may be heavy, but names/meta should use Y1.
- **✅ Good Practices Found:**
  - Safe area and clear rank grouping.

- **File/Screen Name:** `src/screens/clubs/ClassReportScreen.tsx`
- **Score:** F
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Static palette across a 2,100-line report screen -> convert neutral surfaces to T1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Twenty-seven heavy weights and local charts/cards create severe hierarchy noise; extract report widgets and use Y1.
- **✅ Good Practices Found:**
  - Safe area and featured gradient concepts.

- **File/Screen Name:** `src/screens/clubs/CreateClubScreen.tsx`
- **Score:** D-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - No theme context with 63 fixed colors -> migrate form to T1/shared Input/Button/Card.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Six heavy weights and inconsistent radii; use H2, 16px cards, pill CTA.
- **✅ Good Practices Found:**
  - Safe area and suitable gradient direction.

- **File/Screen Name:** `src/screens/clubs/EditStudentScreen.tsx`
- **Score:** D+
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Static light form -> T1 and shared Input/Button.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Flat header; use H2 and Y1.
- **✅ Good Practices Found:**
  - Safe area, restrained weights, standard 16px page spacing.

- **File/Screen Name:** `src/screens/clubs/EditTeacherScreen.tsx`
- **Score:** D+
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Static light form -> T1 and shared Input/Button.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Duplicates EditStudent almost exactly; extract a shared MemberEditor and H2.
- **✅ Good Practices Found:**
  - Safe area and restrained hierarchy.

- **File/Screen Name:** `src/screens/clubs/ClassAssignmentsScreen.tsx`
- **Score:** D
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Static palette -> T1/H2.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Local cards and filters should reuse assignment primitives.
- **✅ Good Practices Found:**
  - Safe area and restrained weights.

- **File/Screen Name:** `src/screens/clubs/ClassAssignmentDetailScreen.tsx`
- **Score:** D-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Fixed light detail surfaces -> T1/H2.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Two heavy styles and 12/14/15/16/18/22 fragmentation; use Y1.
- **✅ Good Practices Found:**
  - Safe area and clear assignment grouping.

- **File/Screen Name:** `src/screens/assignments/AssignmentsListScreen.tsx`
- **Score:** F
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - No dynamic theme; 64 fixed colors across list and create modal -> T1 + M1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Inline create modal and list screen should be split; use H2 and shared assignment cards.
- **✅ Good Practices Found:**
  - Safe area and role-aware actions.

- **File/Screen Name:** `src/screens/assignments/AssignmentDetailScreen.tsx`
- **Score:** F
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Explicit `#FFFFFF`, `#111827`, `#374151`, and `#6B7280` dominate cards/text with no theme context -> apply T1 throughout.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Cards use radius 8/12 instead of 16; CTA radius 12 instead of pill; header should use H2.
- **✅ Good Practices Found:**
  - Safe area, 16px horizontal rhythm, and approved 15/600 body appears in some rows.

- **File/Screen Name:** `src/screens/assignments/SubmissionFormScreen.tsx`
- **Score:** D-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Static `Colors`/light form surfaces -> T1; replace iOS-only action-sheet dependency with a cross-platform themed sheet where needed.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - CTA and inputs reinvent globals; use shared Input/Button and pill CTA.
- **✅ Good Practices Found:**
  - Safe area and upload-state feedback.

- **File/Screen Name:** `src/screens/assignments/SubmissionsListScreen.tsx`
- **Score:** D
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Uses static `Colors`, not theme context -> T1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - 24px one-off metric and mixed typography; standardize assignment row and Y1.
- **✅ Good Practices Found:**
  - Safe area and restrained fixed palette count relative to peers.

- **File/Screen Name:** `src/screens/assignments/GradeSubmissionScreen.tsx`
- **Score:** D
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Static theme constants across grading form -> T1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Too many type sizes; reserve large type for score and use Y1 elsewhere.
- **✅ Good Practices Found:**
  - Safe area, restrained weights, and clear state modeling.

## Quiz, live quiz, stats, and achievements

- **File/Screen Name:** `src/screens/quiz/QuizDashboardScreen.tsx` and `src/components/quiz/QuizDashboardComponents.tsx`
- **Score:** C-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - The quiz hub intentionally uses a gaming shell, but it has no tokenized theme contract and the component bundle contains many fixed neutral surfaces -> define a dedicated `GamingTheme` whose background may remain immersive while neutral/status colors are semantic.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - `QuizDashboardComponents.tsx` is 1,300+ lines with nine heavy styles and many one-off dimensions. Split header, streak, metrics, banners, actions, categories, and recommendations; retain heavy type only for scores/XP.
- **✅ Good Practices Found:**
  - Safe area, strong responsive tablet layouts, focused dark presentation, and component-level dashboard composition.

- **File/Screen Name:** `src/screens/quiz/QuizDetailsScreen.tsx`
- **Score:** C-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Theme context exists, but many fixed surfaces and gradients need dark pairs.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Seven 800/900 styles are acceptable for score/XP only; normalize description/meta to Y1.
- **✅ Good Practices Found:**
  - Safe-area insets and a gaming-appropriate featured header.

- **File/Screen Name:** `src/screens/quiz/TakeQuizScreen.tsx`
- **Score:** F
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Uses React Native's legacy `SafeAreaView`, lacks theme context, and owns 87 fixed colors -> use safe-area-context and T1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - 1,500+ lines should be decomposed into QuestionHeader, AnswerOption, Progress, and ResultTransition; heavy type may stay only for game state.
- **✅ Good Practices Found:**
  - Full-screen focus flow and high-contrast answer feedback suit the gaming context.

- **File/Screen Name:** `src/screens/quiz/QuizResultsScreen.tsx`
- **Score:** D-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - No dynamic theme; fixed result surfaces and text -> T1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Ten heavy weights can remain for score/XP, not explanations/meta; normalize with Y1.
- **✅ Good Practices Found:**
  - Safe area, celebratory hierarchy, and gaming-appropriate gradient.

- **File/Screen Name:** `src/screens/quiz/QuizHistoryScreen.tsx`
- **Score:** B-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - No full surface break; fixed result/status colors should use semantic status tokens.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Two heavy weights and mixed typography; use Y1 for history rows.
- **✅ Good Practices Found:**
  - Dynamic theme and safe-area context.

- **File/Screen Name:** `src/screens/quiz/BrowseQuizzesScreen.tsx`
- **Score:** B-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Theme-aware core; fixed category accents need dark-paired backgrounds.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - 11/13/14/15/17/20 spread; adopt Y1 and H2.
- **✅ Good Practices Found:**
  - Dynamic theme, safe area, filters, and appropriate EdTech gradient.

- **File/Screen Name:** `src/screens/quiz/MyJoinedQuizzesScreen.tsx`
- **Score:** B-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - No full surface break.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Flat header and mixed 13/15/20 type; use H2/Y1.
- **✅ Good Practices Found:**
  - Theme context, safe area, and limited fixed colors.

- **File/Screen Name:** `src/screens/quiz/QuizStudioScreen.tsx`
- **Score:** D-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Uses legacy React Native `SafeAreaView`, no theme context, and fixed editor surfaces -> safe-area-context + T1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Editor should reuse CreatePost quiz inputs and global Input/Button.
- **✅ Good Practices Found:**
  - Gaming/EdTech gradient and restrained heavy weights.

- **File/Screen Name:** `src/screens/live-quiz/LiveQuizJoinScreen.tsx`
- **Score:** C
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Self-contained gradient palette ignores theme; acceptable brand accents should remain, but neutral inputs/cards need T1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - 15px and 50px one-off controls; keep game title heavy, use Y1 for instructions.
- **✅ Good Practices Found:**
  - Safe area, focused flow, pill-like controls, high contrast.

- **File/Screen Name:** `src/screens/live-quiz/LiveQuizHostScreen.tsx`
- **Score:** C
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Fixed neutral surfaces inside the gaming shell -> tokenise neutrals while retaining game gradient.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Mixed 14/16/17/18/20/24/36 type; define explicit game display/body/meta roles.
- **✅ Good Practices Found:**
  - Safe area and gaming-appropriate emphasis.

- **File/Screen Name:** `src/screens/live-quiz/LiveQuizLobbyScreen.tsx`
- **Score:** C
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Fixed lobby neutrals and status colors are not theme-driven -> T1 for neutral surfaces.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Consolidate game type roles and shared LiveQuizHeader.
- **✅ Good Practices Found:**
  - Safe area, clear session code hierarchy, and high contrast.

- **File/Screen Name:** `src/screens/live-quiz/LiveQuizPlayScreen.tsx`
- **Score:** C+
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - The immersive fixed gradient is defensible, but fixed answer-state colors should come from semantic success/error/warning tokens.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - 20px horizontal padding should be 16 mobile/24 tablet; reserve 800 for timer/score.
- **✅ Good Practices Found:**
  - Safe area, focused full-screen gameplay, high contrast, and clear answer feedback.

- **File/Screen Name:** `src/screens/live-quiz/LiveQuizLeaderboardScreen.tsx`
- **Score:** C
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Neutral cards are fixed rather than semantic -> T1 for neutrals.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Define shared leaderboard row and gaming type roles.
- **✅ Good Practices Found:**
  - Safe area and appropriate gaming hierarchy.

- **File/Screen Name:** `src/screens/live-quiz/LiveQuizPodiumScreen.tsx`
- **Score:** C
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Neutral surfaces and status pairs are fixed -> tokenise neutrals/status values.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Five heavy weights are acceptable on podium/score only; instructions/meta should use Y1.
- **✅ Good Practices Found:**
  - Safe area and celebratory immersive presentation.

- **File/Screen Name:** `src/screens/stats/StatsScreen.tsx`
- **Score:** D-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - No dynamic theme; fixed charts/cards/text -> T1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - 13px and one-off chart measurements; define reusable metric cards and H2.
- **✅ Good Practices Found:**
  - Safe area and featured gradient direction.

- **File/Screen Name:** `src/screens/stats/LeaderboardScreen.tsx`
- **Score:** D-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Fixed palette with 48 color literals and no theme context -> T1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Consolidate with gamification Leaderboard; use gaming type roles only for rank/score.
- **✅ Good Practices Found:**
  - Safe area and gradient header concept.

- **File/Screen Name:** `src/screens/gamification/LeaderboardScreen.tsx`
- **Score:** D
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Second leaderboard implementation also has no dynamic theme -> T1 and consolidate with the stats version.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Duplicate feature ownership and mixed type roles.
- **✅ Good Practices Found:**
  - Safe area and gaming-appropriate emphasis.

- **File/Screen Name:** `src/screens/stats/ChallengeScreen.tsx`
- **Score:** D-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Static palette and fixed modal surfaces -> T1/M1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Keep 800 only for game scores; use 16px cards and grid spacing.
- **✅ Good Practices Found:**
  - Safe area and focused challenge structure.

- **File/Screen Name:** `src/screens/stats/ChallengeResultScreen.tsx`
- **Score:** D-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Static result palette -> T1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Three heavy weights are acceptable for result/score only; standardize supporting copy.
- **✅ Good Practices Found:**
  - Safe area and strong result hierarchy.

- **File/Screen Name:** `src/screens/achievements/AchievementsScreen.tsx`
- **Score:** D+
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - No dynamic theme; fixed achievement cards/neutral surfaces -> T1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Normalize 10/11/12/14/16/18/20/32 hierarchy; retain display scale only for achievement moments.
- **✅ Good Practices Found:**
  - Safe area, restrained weights, and appropriate featured gradient.

## Messaging, notifications, parent, and auth

- **File/Screen Name:** `src/screens/messages/ConversationsScreen.tsx`
- **Score:** B-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - No primary Dark Mode break.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Social messaging should use flat H1 rather than decorative gradient; normalize 11/14/15/17/20 type.
- **✅ Good Practices Found:**
  - Dynamic theme, safe area, semantic list rows and separators.

- **File/Screen Name:** `src/screens/messages/ChatScreen.tsx`
- **Score:** B
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - None on core surfaces.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Replace iOS-only action sheet path with the shared themed M1 sheet for parity; message text should use Y1.
- **✅ Good Practices Found:**
  - Dynamic theme, safe area, keyboard-aware input, limited hardcoded colors.

- **File/Screen Name:** `src/screens/messages/NewMessageScreen.tsx`
- **Score:** B+
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - None found.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Use H1 and normalize 12/13/14/15/16/17 roles.
- **✅ Good Practices Found:**
  - Dynamic theme, safe area, semantic inputs/separators, very low fixed-color use.

- **File/Screen Name:** `src/screens/notifications/NotificationsScreen.tsx`
- **Score:** B-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Theme covers core surfaces; notification category tints need dark-paired backgrounds.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Uses 13px body in places; adopt H1/Y1 and shared notification row.
- **✅ Good Practices Found:**
  - Dynamic theme, safe-area header, hairline semantic separators.

- **File/Screen Name:** `src/screens/parent/ParentHomeScreen.tsx`
- **Score:** D
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Static `Colors` and fixed surfaces -> apply T1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - 17px type and nonstandard padding; define a parent portal H2 family.
- **✅ Good Practices Found:**
  - Safe area and a suitable premium portal gradient.

- **File/Screen Name:** `src/screens/parent/ParentChildScreen.tsx`
- **Score:** D
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Static theme constants -> T1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Consolidate child summary cards and Y1.
- **✅ Good Practices Found:**
  - Safe area and clear child-centric navigation.

- **File/Screen Name:** `src/screens/parent/ParentChildGradesScreen.tsx`
- **Score:** D
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Uses static `Colors`; grade cards and text do not switch themes -> T1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Keep grade status colors, but semanticize all neutral surfaces and use Y1.
- **✅ Good Practices Found:**
  - Safe area and meaningful status colors.

- **File/Screen Name:** `src/screens/parent/ParentChildAttendanceScreen.tsx`
- **Score:** D
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Static theme constants -> T1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Mixed 11/12/14/15/17/18/20 hierarchy; use Y1.
- **✅ Good Practices Found:**
  - Safe area and clear attendance states.

- **File/Screen Name:** `src/screens/parent/ParentChildReportCardScreen.tsx`
- **Score:** D
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Static theme constants -> T1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Standardize report cards to 16px and supporting type to Y1.
- **✅ Good Practices Found:**
  - Safe area and restrained font weights.

- **File/Screen Name:** `src/screens/auth/WelcomeScreen.tsx`
- **Score:** D+
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Branded gradient is valid, but neutral panels and text are fixed and AuthNavigator forces white behind every screen -> theme neutral surfaces with T1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Seven heavy weights; retain 900 only for the brand/display headline.
- **✅ Good Practices Found:**
  - Extensive safe-area/responsive tablet handling and polished branded entry states.

- **File/Screen Name:** `src/screens/auth/LoginScreen.tsx`, `ForgotPasswordScreen.tsx`, `ResetPasswordScreen.tsx`, `PasswordlessAuthScreen.tsx`
- **Score:** D
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Fixed white/cyan gradient, dark text, and light inputs do not adapt -> use T1 for neutral layers while preserving the brand gradient as an accent.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Repeated nearly identical auth shells and 800/900 headings -> extract `AuthScreenShell`, use shared Input/Button, retain heavy only for the display heading.
- **✅ Good Practices Found:**
  - Safe-area-context, tablet shell support, keyboard handling, and consistent brand direction.

- **File/Screen Name:** `src/screens/auth/RegisterScreen.tsx`, `ParentLoginScreen.tsx`, `ParentRegisterScreen.tsx`
- **Score:** D
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Fixed light surfaces/static `Colors` under the same forced-white navigator -> T1 and shared AuthScreenShell.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Repeated auth controls and mixed 10–28px hierarchy; use shared roles/components.
- **✅ Good Practices Found:**
  - Safe areas, responsive layouts, and consistent entry-flow structure.

- **File/Screen Name:** `src/screens/auth/TwoFactorScreen.tsx`, `ForceChangePasswordScreen.tsx`
- **Score:** D+
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - These avoid raw hex values but consume static `Colors`, so Dark Mode still fails -> replace with theme context T1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Reuse the shared auth shell and global Input/Button.
- **✅ Good Practices Found:**
  - Safe-area-context and restrained typography.

- **File/Screen Name:** `src/screens/auth/ClaimCodeSetupScreen.tsx`
- **Score:** D-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Fixed light setup UI and full-screen scanner modals -> theme setup chrome with T1 and camera controls with an explicit immersive palette.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Inline scanner duplicates `ScannerModal`; consolidate and use M1/insets.
- **✅ Good Practices Found:**
  - Safe-area-context and clear scanner state handling.

- **File/Screen Name:** `src/screens/auth/SchoolClaimContinuationScreen.tsx`
- **Score:** F
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Imports legacy React Native `SafeAreaView`, lacks theme context, and uses fixed light surfaces -> safe-area-context + T1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Three heavy weights outside gaming; use shared auth shell/Y1.
- **✅ Good Practices Found:**
  - Clear loading/error/continuation state separation.

## Attendance screens

- **File/Screen Name:** `src/screens/attendance/AttendanceCheckInScreen.tsx`
- **Score:** F
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - No dynamic theme and more than 100 fixed colors across page and modal -> T1/M1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Twelve heavy weights and many fractional/11px type roles; reserve heavy for successful scan/count and use Y1 elsewhere.
- **✅ Good Practices Found:**
  - Safe area, featured gradient, and comprehensive check-in states.

- **File/Screen Name:** `src/screens/attendance/AttendanceReportScreen.tsx`
- **Score:** F
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Static report palette and fixed charts/cards -> T1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Eight heavy weights and extensive local report widgets; extract shared metric cards and H2/Y1.
- **✅ Good Practices Found:**
  - Safe area and suitable data-visual hierarchy.

## Modals, sheets, and nested composer components

- **File/Screen Name:** `src/components/feed/PostOptionsSheet.tsx`
- **Score:** B+
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - None found.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Row label is 15/600 but needs explicit 22 line height; action dimensions should share a global SheetAction primitive.
- **✅ Good Practices Found:**
  - Theme context, `useSafeAreaInsets`, animated dismissal, semantic borders, and rounded sheet shape.

- **File/Screen Name:** `src/components/feed/EducationalValueModal.tsx`
- **Score:** F
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Bottom sheet is fixed `#FFFFFF` with fixed dark text and no theme context/insets -> apply T1 and M1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - 11/13/14/17px hierarchy and 14px submit radius; use Y1 and pill CTA.
- **✅ Good Practices Found:**
  - Drag gesture, dismissal animation, clear rating grouping.

- **File/Screen Name:** `src/components/feed/PostAnalyticsModal.tsx`
- **Score:** C-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Theme context exists, but dozens of fixed analytics colors and several light cards are not paired for Dark Mode -> semanticize neutrals with T1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - 9/10/11/13/15/17/20/22 type and three heavy weights; define analytics metric/body/meta roles.
- **✅ Good Practices Found:**
  - Safe area, page-sheet presentation, and semantic outer container.

- **File/Screen Name:** `src/components/feed/RepostComposer.tsx`
- **Score:** C
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Theme hook is present but static modal styling still includes fixed neutral colors -> finish T1/M1 migration.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - One 800 weight and 14px radius; reuse ComposerHeader/Input/Button and pill CTA.
- **✅ Good Practices Found:**
  - Theme access and keyboard-friendly modal structure.

- **File/Screen Name:** `src/screens/feed/create-post/components/TopicPickerModal.tsx`
- **Score:** B
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - No major theme break; ensure bottom inset is applied if it presents edge-to-edge.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - 7px gap and 13/14/15/16 type; use 8px grid/Y1 and M1.
- **✅ Good Practices Found:**
  - Dynamic theme and zero raw hex neutrals.

- **File/Screen Name:** `src/components/ai/AIPromptModal.tsx`
- **Score:** B-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Core theme works; add bottom inset to the modal sheet.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - 13/14/16/17/18 spread; use Y1 and shared modal header.
- **✅ Good Practices Found:**
  - Dynamic styles, keyboard dismissal, loading state, and semantic text/input colors.

- **File/Screen Name:** `src/components/ai/AILoadingOverlay.tsx`
- **Score:** B
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - No primary Dark Mode break; overlay uses dynamic theme styles.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Ensure the overlay color comes from `colors.overlay` and supporting text uses Y1; avoid the one-off 30px radius unless it is a featured 24px surface.
- **✅ Good Practices Found:**
  - Theme-aware full-screen overlay, clear loading feedback, and isolated animation.

- **File/Screen Name:** `src/components/ai/AIResultPreview.tsx`
- **Score:** B-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Theme is dynamic but pageSheet does not explicitly handle safe insets -> use M1/header safe area.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - 17px title and 54px one-off action; standardize header/action primitives.
- **✅ Good Practices Found:**
  - Semantic surfaces and appropriate page-sheet presentation.

- **File/Screen Name:** `src/components/quiz/QuizAnalyticsModal.tsx`
- **Score:** F
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Fixed white sheet, fixed light cards, dark text, no theme/insets -> T1/M1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - 24/800 headings are too heavy for analytics; use Y1 plus a single 20/700 title.
- **✅ Good Practices Found:**
  - Clear metric/attempt grouping and loading state.

- **File/Screen Name:** `src/components/quiz/LevelUpModal.tsx`
- **Score:** D
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - No theme context and fixed modal surfaces -> T1/M1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Large display type is valid for gaming; supporting text should use Y1.
- **✅ Good Practices Found:**
  - Focused celebratory hierarchy and motion.

- **File/Screen Name:** `src/components/achievements/AchievementUnlockModal.tsx`
- **Score:** D
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - No dynamic theme/inset handling; neutral modal surfaces are fixed -> T1/M1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Large achievement display type is valid; supporting 12/16/18/20 hierarchy should use defined roles.
- **✅ Good Practices Found:**
  - Clear celebration flow and restrained font weights.

- **File/Screen Name:** `src/components/LanguageSelector.tsx`
- **Score:** F
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Imports legacy React Native `SafeAreaView`; modal is fixed `#F8F9FA/#FFF/#333` with no theme -> use safe-area-context + T1/M1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Cards use radius 12; selected state is hardcoded; use 16px cards and semantic primary tint.
- **✅ Good Practices Found:**
  - Localized native names, clear selection state, and efficient list rendering.

- **File/Screen Name:** `src/components/common/ImageViewerModal.tsx`
- **Score:** A-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - None; black is an intentional immersive media surface.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Confirm close/download actions meet 40x40 minimum and use safe insets on every device edge.
- **✅ Good Practices Found:**
  - Correct edge-to-edge dark context, high contrast, gestures, and modal isolation.

- **File/Screen Name:** `src/screens/profile/components/ScannerModal.tsx`
- **Score:** C+
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Uses legacy React Native `SafeAreaView`; switch to safe-area-context. Fixed black camera chrome is intentional.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Consolidate with ClaimCode scanner and verify all controls are at least 40x40.
- **✅ Good Practices Found:**
  - Immersive high-contrast camera treatment and clear scanning overlay.

- **File/Screen Name:** `src/components/navigation/Sidebar.tsx`
- **Score:** C
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Theme context is present, but many fixed decorative tints/gradients remain partially unpaired.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - 1,200+ lines, five heavy weights, many one-off dimensions, and mixed 8–20px text. Split profile summary, menu sections, badges, footer, and modal shell.
- **✅ Good Practices Found:**
  - Safe-area insets, semantic main surfaces, responsive tablet behavior, and centralized navigation mapping.

- **File/Screen Name:** `src/screens/feed/create-post/components/QuizQuestionInput.tsx` and `forms/{Announcement,Course,Poll,Project,Question,Quiz}Form.tsx`
- **Score:** C-
- **🛑 Critical Issues (Breaks UI or Dark Mode):**
  - Parent forms access theme, but QuizQuestionInput and AnimatedButton keep fixed palettes; neutral fields across all forms still contain many local light tints -> move all fields to shared Input/Card/Chip primitives using T1.
- **⚠️ Minor Deviations (Margin, Font size, Icon size):**
  - Repeated 13/14/16 labels, radius 10/12/14, and one-off 1/5/7px spacing. Use 4/8 grid, 16px cards, pills, and Y1.
- **✅ Good Practices Found:**
  - Forms are already separated by post type and generally receive theme-aware parent context.

## Recommended implementation order

1. **Foundation:** update theme tokens; create typed T1 utilities plus `FlatScreenHeader`, `GradientHeroHeader`, `HeaderIconButton`, and `ThemedBottomSheet`.
2. **Dark Mode blockers:** Auth navigator/shell, Assignments, LessonViewer, CreateCourse, Class/Club admin screens, Parent, Attendance, and fixed-white modals.
3. **High-traffic nested routes:** PostDetail, Comments, CourseDetail, QuizDetails/TakeQuiz/Results, Settings.
4. **Consolidation:** duplicate Leaderboards, Member editors, Material screens, scanners, Auth shells, Chat/Q&A, and composer inputs.
5. **Typography/grid cleanup:** replace 9–11px UI text outside exceptional artifacts, cap ordinary weights at 700, migrate random spacing/radii to tokens.

## Acceptance checklist

- Every registered full-screen route renders correctly in light and dark themes without fixed white neutral surfaces.
- Every custom header uses safe-area-context and either H1 or H2; every header action has a 40x40 target.
- Learn/Clubs hero headers have exact 32px lower corners.
- Standard cards are 16px; featured cards are 24px; action buttons are pills.
- Body, chip, and meta type match Y1; 800/900 is limited to Reels/gaming/display artifacts.
- Modal sheets use semantic surfaces and bottom insets.
- No production screen imports React Native's legacy `SafeAreaView`.
- Orphaned routes are either registered with typed params or removed.
