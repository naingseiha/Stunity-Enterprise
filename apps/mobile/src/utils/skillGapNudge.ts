/**
 * Skill-gap nudge selection (experiment — gated by the `skill_gap_nudge` flag).
 *
 * Pure, deterministic, no I/O — so it's unit-testable and cheap to run inside a
 * render memo. It does NOT build copy or call analytics; the caller owns i18n +
 * tracking. It only answers: "of the recall cards already due, which ONE subject
 * has the student neglected longest (and still weak) — i.e. the strongest
 * skill gap to gently surface?"
 *
 * Why this is a valid skill-gap proxy WITHOUT new server work: a RecallCard is
 * created the moment a student engages a subject (quiz/reel/answer), and
 * `daysSinceLastSeen` + `recallStrength` come straight from the SM-2 scheduler.
 * A high `daysSinceLastSeen` on a low-`recallStrength` card = a subject they
 * started learning but let decay. That's exactly the "you haven't practiced X
 * in a while" signal — derived entirely from data `/recall/due` already returns.
 */

import type { RecallCard } from '@/types';

export interface SkillGapPick {
  card: RecallCard;
  daysSince: number;
  subject: string;
}

/** Minimum days of neglect before we'll nudge (avoid nagging on fresh cards). */
export const SKILL_GAP_MIN_DAYS = 2;
/** Only nudge subjects whose memory has actually decayed (0..1; 1 = fresh). */
export const SKILL_GAP_MAX_STRENGTH = 0.6;

/**
 * Pick the single strongest skill-gap card, or null if none qualifies.
 * Selection = most-neglected (highest daysSinceLastSeen) among weak, overdue
 * cards; ties broken by weaker memory first.
 */
export function pickSkillGapCard(cards: RecallCard[] | null | undefined): SkillGapPick | null {
  if (!cards || cards.length === 0) return null;

  const candidates = cards
    .filter(
      (c) =>
        c.daysSinceLastSeen >= SKILL_GAP_MIN_DAYS &&
        c.recallStrength < SKILL_GAP_MAX_STRENGTH,
    )
    .sort((a, b) => {
      if (b.daysSinceLastSeen !== a.daysSinceLastSeen) {
        return b.daysSinceLastSeen - a.daysSinceLastSeen; // most neglected first
      }
      return a.recallStrength - b.recallStrength; // then weakest memory first
    });

  if (candidates.length === 0) return null;

  const card = candidates[0];
  return { card, daysSince: card.daysSinceLastSeen, subject: card.subject };
}

/**
 * Generic, non-subject placeholders that recall-card creation can emit when a
 * quiz post's first topic tag isn't a real subject (e.g. a literal "#quiz"
 * tag). Nudging on these reads as "you haven't reviewed quiz" — meaningless —
 * so we skip the placeholder and fall back to the quiz-title segment instead.
 */
const GENERIC_SUBJECT_TOKENS = new Set(['quiz', 'general', 'quiz review']);

/**
 * Short, display-friendly subject name from a RecallCard's subjectLabel
 * ("Biology · Cell Structure" → "Biology"). Used by the caller to build copy.
 *
 * subjectLabel is "<tag> · <quiz title>". When the leading tag is a generic
 * placeholder ("quiz"), fall back to the title segment and clean it up: strip a
 * "Quiz:" label prefix and drop a trailing " - <topic>" detail so the nudge
 * names the actual subject ("quiz · Quiz: អង់គ្លេសថ្នាក់ទី១២ - Vocabulary"
 * → "អង់គ្លេសថ្នាក់ទី១២") rather than the word "quiz".
 */
export function shortSubjectName(card: RecallCard): string {
  const label = card.subjectLabel || card.subject || '';
  const segments = label.split('·').map((s) => s.trim()).filter(Boolean);
  let name = segments[0] || label;

  // Generic leading tag → use the quiz-title segment instead, when present.
  if (segments.length > 1 && GENERIC_SUBJECT_TOKENS.has(name.toLowerCase())) {
    name = segments.slice(1).join(' · ');
  }
  // Strip a leading "Quiz:"/"Quiz -" label some titles carry.
  name = name.replace(/^quiz\s*[:\-–]\s*/i, '').trim();
  // Keep the subject, drop a trailing " - <topic>" detail.
  const [subjectPart] = name.split(/\s+[-–]\s+/);
  name = (subjectPart || name).trim();

  return name || label;
}
