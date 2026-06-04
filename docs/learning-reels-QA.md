# Learning Reels — Manual QA Scripts (WI1–WI5)

Manual test scripts mapped to each work item's acceptance criteria. Run on a
small physical device (or small simulator, e.g. iPhone SE) in both light/dark and
both locales (en + km). Pre-req: a test account with at least one attempted quiz.

---

## WI4 — Persist & replay prior responses (priority)

**Quiz / True-False / Cloze card replay**
1. Open Reels. Answer a **quiz** card (select an option → Submit).
2. Confirm: correct/incorrect coloring + explanation appear; combo/XP update.
3. Scroll several cards forward, then back to the same card.
   - ✅ Expect: card shows **your previous pick**, correct/incorrect state, explanation, and an **"Answer again"** affordance ("You answered this before").
4. **Cold restart** the app (kill from app switcher → reopen → Reels).
   - ✅ Expect: the same card still shows your prior answer (hydrated from server).
5. Tap **"Answer again"** → answer again.
   - ✅ Expect: it records the attempt but awards **0 XP**, combo unchanged, no new recall reschedule (anti-farming).
6. Repeat steps 1–5 for a **True/False** and a **Cloze (fill-in-the-blank)** card.

**Poll replay**
7. Vote on a **poll** reel → scroll away/back → cold restart.
   - ✅ Expect: your vote + percentages persist across all three.

---

## WI1 — Poll option limits (2–6, ≤80 chars)

**Creation (client)**
1. Create post → Poll. Add options.
   - ✅ Expect: cannot add more than **6**; cannot remove below **2**; each option capped at **80 chars**; badge shows `n/6`.
**Server**
2. (API) POST a poll with 7 options or a 90-char option.
   - ✅ Expect: server **400** (rejected).
**Render**
3. View a 6-option poll with long labels in the **feed** and as a **reel**.
   - ✅ Expect: labels ellipsize to 1–2 lines, bars stay readable, no overflow.
4. (If a legacy >6-option poll exists) view it.
   - ✅ Expect: caps to 6 visible + "+N more"; no layout break.

---

## WI2 — Quiz option limits & resilient render (2–6, ≤120 chars)

**Authoring (client)**
1. Create post → Quiz → add a question.
   - ✅ Expect: 2–6 options enforced; each option ≤120 chars.
**Server**
2. (API) POST quizData with a question having 7 options, an out-of-range
   `correctAnswer`, or an empty question.
   - ✅ Expect: server **400** each time.
**Render**
3. Take a quiz with max options + long answer text in **TakeQuizScreen** and as
   a **reel quiz/cloze card**.
   - ✅ Expect: answers wrap/ellipsize, correct answer never hidden, no clipping.

---

## WI3 — Labeled Q&A answer flow

1. Open a **QUESTION** post as a reel → tap the CTA.
   - ✅ Expect: CTA reads **"Answer this"** (+ answer count if any).
2. On the opened screen:
   - ✅ Expect: header **"Answers"**, input placeholder **"Write your answer…"**,
     empty state **"Be the first to answer"** (not generic "comments").
3. Submit an answer → confirm it appears; analytics `question_answer_submit` fires.
4. As the post author/teacher: verify an answer.
   - ✅ Expect: it surfaces as the **accepted/verified answer** (golden check).
5. Open a non-QUESTION post's comments.
   - ✅ Expect: still reads as **"Comments"** (Q&A framing only for QUESTION).

---

## WI5 — Quiz History

1. Finish a quiz → on results, tap **History** (or open a quiz with prior
   attempts → tap the previous-attempt card).
2. ✅ Expect: **best / latest / average** score, **attempts**, **pass rate**,
   **trend** (up/down/flat).
3. ✅ Expect: **"Questions to review"** lists weak questions (≤60% accuracy) with
   accuracy bars.
4. ✅ Expect: a paginated **attempt timeline** (passed/failed, score, date);
   scrolling loads more.
5. Tap **Retake** → lands on QuizDetails. Tap **Review latest** → opens the
   latest attempt's results.
6. Empty state: open History for a never-attempted quiz → friendly empty state +
   "Take quiz".

---

## Cross-cutting spot checks
- **i18n:** switch device language en ⇄ km; every new string above is translated
  (no raw keys shown).
- **a11y:** with a screen reader, each new button (Answer again, Answer this,
  Retake, Review latest, poll/quiz options) is announced with a label.
- **Performance:** Reels first page is instant from cache; answering a card does
  not trigger a per-card network refetch (hydration is batched).
