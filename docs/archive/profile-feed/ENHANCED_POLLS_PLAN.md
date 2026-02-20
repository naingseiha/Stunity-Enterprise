# Enhanced Poll Features - Implementation Plan 📊

**Feature:** Enhanced Poll Features  
**Priority:** MEDIUM-HIGH  
**Effort:** 1 week (5-7 days)  
**Status:** Ready to implement

---

## 🎯 Overview

Enhance the existing poll system with professional features:
- Poll expiry dates with countdown
- Anonymous voting option
- Multiple choice polls
- Result visibility settings
- Poll templates
- Export results to CSV

---

## ✅ What Already Works

Current poll system (optimized on Jan 28):
- ✅ Create polls with multiple options
- ✅ Vote on polls (single selection)
- ✅ Real-time vote counting
- ✅ Visual progress bars
- ✅ Prevent duplicate voting
- ✅ Optimized backend (single transaction)
- ✅ Beautiful UI with animations

**We're building on a solid foundation!**

---

## 📋 Features to Implement

### **Phase 1: Poll Expiry (Day 1-2)**
#### Frontend:
- [ ] Add date/time picker to CreatePostModal
- [ ] Show countdown timer on active polls
- [ ] Display "Poll ended" state for expired polls
- [ ] Disable voting on expired polls
- [ ] Show "X days/hours left" indicator

#### Backend:
- [ ] Add `expiresAt` field to Poll model
- [ ] Auto-check expiry on vote attempts
- [ ] Include expiry in poll responses
- [ ] Add cron job to auto-close expired polls (optional)

---

### **Phase 2: Anonymous Voting (Day 2-3)**
#### Frontend:
- [ ] Add "Anonymous voting" checkbox to poll creation
- [ ] Hide voter names on anonymous polls
- [ ] Show privacy badge ("Anonymous Poll")
- [ ] Update vote display (show count, not names)

#### Backend:
- [ ] Add `isAnonymous` boolean to Poll model
- [ ] Modify vote response (exclude voter data if anonymous)
- [ ] Still track who voted (prevent duplicates)
- [ ] Don't return voter info in API

---

### **Phase 3: Multiple Choice (Day 3-4)**
#### Frontend:
- [ ] Add "Multiple choice" checkbox to poll creation
- [ ] Add max selections input (1-all options)
- [ ] Change radio buttons to checkboxes
- [ ] Show "Select up to X options" label
- [ ] Validate selection count
- [ ] Show multiple selections in results

#### Backend:
- [ ] Add `allowMultiple` boolean to Poll model
- [ ] Add `maxSelections` integer field
- [ ] Modify vote endpoint to accept array
- [ ] Update PollVote model for multiple votes
- [ ] Validate selection count

---

### **Phase 4: Result Visibility (Day 4-5)**
#### Frontend:
- [ ] Add visibility settings to poll creation:
  - "After voting" (default)
  - "After poll ends"
  - "Always visible"
  - "Creator only"
- [ ] Conditionally show results based on setting
- [ ] Show "Results hidden until..." message
- [ ] Update UI based on visibility rules

#### Backend:
- [ ] Add `resultVisibility` enum field to Poll model
- [ ] Add logic to check visibility rules
- [ ] Return results only when allowed
- [ ] Include visibility state in response

---

### **Phase 5: Poll Templates (Day 5-6)**
#### Frontend:
- [ ] Add "Save as template" button after poll creation
- [ ] Templates modal/section
- [ ] Show user's saved templates
- [ ] Quick create from template
- [ ] Edit/delete templates

#### Backend:
- [ ] Create PollTemplate model
- [ ] CRUD endpoints for templates
- [ ] Associate templates with users
- [ ] Pre-fill poll from template

---

### **Phase 6: Export Results (Day 6-7)**
#### Frontend:
- [ ] Add "Export" button on polls
- [ ] Export format selector (CSV/PDF)
- [ ] Download file with results
- [ ] Include charts (optional)

#### Backend:
- [ ] Generate CSV with vote data
- [ ] Include timestamps, voters (if not anonymous)
- [ ] Return file for download
- [ ] PDF generation (optional - can use library)

---

## 🗄️ Database Schema Changes

### Update Poll Model:
```prisma
model Poll {
  id               String      @id @default(uuid())
  postId           String      @unique
  post             Post        @relation(fields: [postId], references: [id], onDelete: Cascade)
  options          PollOption[]
  votes            PollVote[]
  
  // NEW FIELDS
  expiresAt        DateTime?   // null = no expiry
  isAnonymous      Boolean     @default(false)
  allowMultiple    Boolean     @default(false)
  maxSelections    Int         @default(1)
  resultVisibility String      @default("AFTER_VOTE") // AFTER_VOTE, AFTER_END, ALWAYS, CREATOR_ONLY
  
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt
}

model PollVote {
  id        String   @id @default(uuid())
  pollId    String
  poll      Poll     @relation(fields: [pollId], references: [id], onDelete: Cascade)
  optionId  String
  option    PollOption @relation(fields: [optionId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  // Changed: Allow multiple votes per user (for multi-choice)
  @@unique([pollId, optionId, userId]) // User can vote for same option once
  @@index([pollId, userId]) // For checking if user voted
}

model PollTemplate {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name        String   // Template name
  description String?
  options     Json     // Array of option texts
  settings    Json     // Poll settings (anonymous, multiple, etc.)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

---

## 🔌 API Endpoints

### Existing (Keep):
- `POST /api/posts/:id/vote` - Vote on poll
- `GET /api/posts/:id` - Get post with poll

### New/Updated:

#### Poll Creation (Update existing):
```typescript
POST /api/posts
Body: {
  type: "POLL",
  content: "...",
  poll: {
    options: ["Option 1", "Option 2"],
    // NEW FIELDS
    expiresAt: "2026-02-01T23:59:59Z",
    isAnonymous: false,
    allowMultiple: true,
    maxSelections: 2,
    resultVisibility: "AFTER_VOTE"
  }
}
```

#### Poll Voting (Update existing):
```typescript
POST /api/posts/:id/vote
Body: {
  optionIds: ["uuid1", "uuid2"] // Array for multi-choice
}
```

#### Export Results:
```typescript
GET /api/posts/:id/poll/export?format=csv
Response: File download
```

#### Templates:
```typescript
// Create template
POST /api/poll-templates
Body: { name, description, options, settings }

// List templates
GET /api/poll-templates

// Use template
POST /api/posts/from-template/:templateId

// Delete template
DELETE /api/poll-templates/:id
```

---

## 🎨 UI Components to Update/Create

### Update Existing:

#### 1. CreatePostModal.tsx
Add poll settings section:
```tsx
{postType === "POLL" && (
  <PollSettings>
    <DateTimePicker
      label="Poll expires"
      value={expiresAt}
      onChange={setExpiresAt}
      optional
    />
    <Checkbox
      label="Anonymous voting"
      checked={isAnonymous}
      onChange={setIsAnonymous}
    />
    <Checkbox
      label="Multiple choice"
      checked={allowMultiple}
      onChange={setAllowMultiple}
    />
    {allowMultiple && (
      <Input
        type="number"
        label="Max selections"
        value={maxSelections}
        onChange={setMaxSelections}
        min={1}
        max={pollOptions.length}
      />
    )}
    <Select
      label="Show results"
      value={resultVisibility}
      onChange={setResultVisibility}
      options={[
        { value: "AFTER_VOTE", label: "After voting" },
        { value: "AFTER_END", label: "After poll ends" },
        { value: "ALWAYS", label: "Always" },
        { value: "CREATOR_ONLY", label: "Creator only" }
      ]}
    />
  </PollSettings>
)}
```

#### 2. PollCard.tsx
Add expiry display and multi-choice support:
```tsx
<PollCard>
  {/* Expiry countdown */}
  {poll.expiresAt && !isPollExpired && (
    <ExpiryBadge>
      <Clock className="w-4 h-4" />
      {formatTimeLeft(poll.expiresAt)}
    </ExpiryBadge>
  )}
  
  {/* Anonymous badge */}
  {poll.isAnonymous && (
    <Badge variant="secondary">
      <EyeOff className="w-3 h-3" />
      Anonymous
    </Badge>
  )}
  
  {/* Multiple choice label */}
  {poll.allowMultiple && (
    <p className="text-sm text-gray-600">
      Select up to {poll.maxSelections} options
    </p>
  )}
  
  {/* Options - checkboxes for multi-choice */}
  {poll.options.map(option => (
    <PollOption
      key={option.id}
      type={poll.allowMultiple ? "checkbox" : "radio"}
      checked={selectedOptions.includes(option.id)}
      onChange={() => toggleOption(option.id)}
      disabled={isPollExpired || hasVoted}
    />
  ))}
  
  {/* Export button */}
  {isCreator && (
    <Button onClick={exportResults}>
      <Download className="w-4 h-4" />
      Export Results
    </Button>
  )}
</PollCard>
```

### Create New:

#### 3. PollTemplatesModal.tsx
```tsx
<Modal title="Poll Templates">
  <TemplateGrid>
    {templates.map(template => (
      <TemplateCard
        key={template.id}
        name={template.name}
        description={template.description}
        options={template.options}
        onUse={() => createFromTemplate(template.id)}
        onDelete={() => deleteTemplate(template.id)}
      />
    ))}
  </TemplateGrid>
  <Button onClick={openNewTemplate}>
    Create New Template
  </Button>
</Modal>
```

---

## 🔧 Backend Implementation

### 1. Update Poll Controller

#### createPost (update):
```typescript
export const createPost = async (req: Request, res: Response) => {
  // ... existing code ...
  
  if (type === "POLL") {
    const {
      options,
      expiresAt,
      isAnonymous,
      allowMultiple,
      maxSelections,
      resultVisibility
    } = req.body.poll;
    
    // Create poll with new fields
    await prisma.poll.create({
      data: {
        postId: post.id,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isAnonymous: isAnonymous || false,
        allowMultiple: allowMultiple || false,
        maxSelections: maxSelections || 1,
        resultVisibility: resultVisibility || "AFTER_VOTE",
        options: {
          create: options.map((text: string, index: number) => ({
            text,
            order: index
          }))
        }
      }
    });
  }
};
```

#### votePoll (update):
```typescript
export const votePoll = async (req: Request, res: Response) => {
  const { postId } = req.params;
  const { optionIds } = req.body; // Array for multi-choice
  const userId = req.userId;
  
  const poll = await prisma.poll.findUnique({
    where: { postId },
    include: { options: true }
  });
  
  // Check if expired
  if (poll.expiresAt && new Date() > poll.expiresAt) {
    return res.status(400).json({
      success: false,
      message: "Poll has expired"
    });
  }
  
  // Validate multi-choice
  if (poll.allowMultiple) {
    if (optionIds.length > poll.maxSelections) {
      return res.status(400).json({
        success: false,
        message: `You can only select up to ${poll.maxSelections} options`
      });
    }
  } else {
    if (optionIds.length > 1) {
      return res.status(400).json({
        success: false,
        message: "You can only select one option"
      });
    }
  }
  
  // Single transaction for all votes
  await prisma.$transaction(async (tx) => {
    // Remove existing votes
    await tx.pollVote.deleteMany({
      where: { pollId: poll.id, userId }
    });
    
    // Create new votes
    await tx.pollVote.createMany({
      data: optionIds.map((optionId: string) => ({
        pollId: poll.id,
        optionId,
        userId
      }))
    });
  });
  
  // Return results based on visibility
  const shouldShowResults = checkResultVisibility(poll, userId);
  
  res.json({
    success: true,
    data: shouldShowResults ? await getPollResults(poll.id) : null
  });
};
```

#### Export Results:
```typescript
export const exportPollResults = async (req: Request, res: Response) => {
  const { postId } = req.params;
  const { format } = req.query; // csv or pdf
  
  const poll = await prisma.poll.findUnique({
    where: { postId },
    include: {
      options: {
        include: {
          votes: {
            include: {
              user: poll.isAnonymous ? false : {
                select: { firstName: true, lastName: true }
              }
            }
          }
        }
      }
    }
  });
  
  if (format === "csv") {
    const csv = generatePollCSV(poll);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="poll-results-${postId}.csv"`);
    return res.send(csv);
  }
  
  // PDF export (optional - can use library like pdfkit)
};

function generatePollCSV(poll: any): string {
  const rows = [
    ['Option', 'Votes', 'Percentage'],
    ...poll.options.map((opt: any) => [
      opt.text,
      opt.votes.length,
      `${((opt.votes.length / totalVotes) * 100).toFixed(1)}%`
    ])
  ];
  
  if (!poll.isAnonymous) {
    rows[0].push('Voters');
    poll.options.forEach((opt: any, i: number) => {
      const voters = opt.votes.map((v: any) => 
        `${v.user.firstName} ${v.user.lastName}`
      ).join('; ');
      rows[i + 1].push(voters);
    });
  }
  
  return rows.map(row => row.join(',')).join('\n');
}
```

---

## 🧪 Testing Checklist

### Poll Expiry:
- [ ] Create poll with expiry date
- [ ] Countdown shows correctly
- [ ] Can't vote after expiry
- [ ] "Poll ended" displays correctly
- [ ] Expiry notification works

### Anonymous Voting:
- [ ] Create anonymous poll
- [ ] Privacy badge shows
- [ ] Voter names hidden
- [ ] Still prevents duplicate voting
- [ ] Results show counts only

### Multiple Choice:
- [ ] Create multi-choice poll
- [ ] Checkboxes instead of radio
- [ ] Max selection enforced
- [ ] Can select multiple options
- [ ] Results show multiple votes

### Result Visibility:
- [ ] "After voting" - shows after user votes
- [ ] "After end" - hides until expiry
- [ ] "Always" - visible to everyone
- [ ] "Creator only" - only creator sees
- [ ] Messages display correctly

### Templates:
- [ ] Save poll as template
- [ ] Templates list shows
- [ ] Create from template
- [ ] Delete template
- [ ] Template pre-fills correctly

### Export:
- [ ] CSV export works
- [ ] File downloads correctly
- [ ] Anonymous polls hide names
- [ ] Data is accurate
- [ ] Format is readable

---

## 📅 Implementation Timeline

### Day 1: Poll Expiry
- Morning: Database migration + backend
- Afternoon: Frontend UI + countdown

### Day 2: Anonymous Voting
- Morning: Backend logic
- Afternoon: Frontend UI + badges

### Day 3: Multiple Choice
- Morning: Database changes + backend
- Afternoon: Frontend checkboxes + validation

### Day 4: Result Visibility
- Morning: Backend visibility logic
- Afternoon: Frontend conditional display

### Day 5: Poll Templates
- Morning: Templates model + API
- Afternoon: Templates UI

### Day 6: Export Results
- Morning: CSV generation
- Afternoon: Download + UI polish

### Day 7: Testing & Polish
- Morning: Full testing
- Afternoon: Bug fixes + documentation

---

## 🚀 Success Metrics

After implementation, track:
- Poll creation rate (expect +30%)
- Poll participation rate (expect +40%)
- Multi-choice poll usage
- Template usage rate
- Export feature usage
- User feedback

---

## 📝 Documentation to Create

1. **User Guide:** How to use new poll features
2. **API Docs:** Update endpoint documentation
3. **Migration Guide:** Database changes
4. **Testing Guide:** How to test polls
5. **Feature Announcement:** Blog post/changelog

---

## 🎯 Next Steps

1. **Review this plan** - Any changes needed?
2. **Database migration** - Create Prisma migration
3. **Start Day 1** - Poll expiry feature
4. **Daily progress** - Ship feature by feature
5. **Test & iterate** - Get user feedback

---

**Ready to start building?** 🚀

Let me know when you want to begin, and I'll help implement each feature step by step!
