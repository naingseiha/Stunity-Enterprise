/**
 * Subject derivation for auto-created recall cards.
 *
 * Root cause being guarded against: quiz posts are tagged with a literal
 * "#quiz", so the old topicTags[0] derivation produced subject="quiz" — which
 * collapsed unrelated subjects into one mastery bucket and read as "you haven't
 * reviewed quiz" in the nudge. These tests pin the real-subject behaviour.
 */
import { deriveSubjectFromPost } from './recallCardsFromQuiz';

describe('deriveSubjectFromPost', () => {
  it('uses the first REAL topic tag when present', () => {
    expect(
      deriveSubjectFromPost({ id: 'p', title: 'Cell Structure', topicTags: ['#Biology'] }),
    ).toEqual({ subject: 'biology', subjectLabel: 'Biology · Cell Structure' });
  });

  it('skips a generic leading #quiz tag and uses the next real tag', () => {
    expect(
      deriveSubjectFromPost({ id: 'p', title: 'Cell Structure', topicTags: ['#quiz', '#Biology'] }),
    ).toEqual({ subject: 'biology', subjectLabel: 'Biology · Cell Structure' });
  });

  it('strips a "Quiz:" prefix from the title when building a real-tag label', () => {
    // Real production shape: tagged #quiz + #english, Khmer "Quiz:"-prefixed title.
    expect(
      deriveSubjectFromPost({
        id: 'p',
        title: 'Quiz: អង់គ្លេសថ្នាក់ទី១២ - Vocabulary',
        topicTags: ['#quiz', '#english'],
      }),
    ).toEqual({
      subject: 'english',
      subjectLabel: 'english · អង់គ្លេសថ្នាក់ទី១២ - Vocabulary',
    });
  });

  it('parses subject + topic from the title when only generic tags exist', () => {
    expect(
      deriveSubjectFromPost({
        id: 'p',
        title: 'Quiz: អង់គ្លេសថ្នាក់ទី១២ - Vocabulary',
        topicTags: ['#quiz'],
      }),
    ).toEqual({
      subject: 'អង់គ្លេសថ្នាក់ទី១២',
      subjectLabel: 'អង់គ្លេសថ្នាក់ទី១២ · Vocabulary',
    });
  });

  it('handles a Khmer subject and Khmer topic', () => {
    expect(
      deriveSubjectFromPost({
        id: 'p',
        title: 'Quiz: ផែនដីវិទ្យាទី១២ - រចនាសម្ព័ន្ធផែនដី',
        topicTags: ['#quiz'],
      }),
    ).toEqual({
      subject: 'ផែនដីវិទ្យាទី១២',
      subjectLabel: 'ផែនដីវិទ្យាទី១២ · រចនាសម្ព័ន្ធផែនដី',
    });
  });

  it('treats a title with no " - " separator as subject-only (no topic segment)', () => {
    expect(
      deriveSubjectFromPost({
        id: 'p',
        title: 'Quiz: Cambodia និងអាស៊ីអាគ្នេយ៍',
        topicTags: ['#quiz'],
      }),
    ).toEqual({
      subject: 'cambodia និងអាស៊ីអាគ្នេយ៍',
      subjectLabel: 'Cambodia និងអាស៊ីអាគ្នេយ៍',
    });
  });

  it('parses the title when there are no tags at all', () => {
    expect(
      deriveSubjectFromPost({ id: 'p', title: 'Quiz: Math - Limits' }),
    ).toEqual({ subject: 'math', subjectLabel: 'Math · Limits' });
  });

  it('falls back to general / Quiz Review when nothing is usable', () => {
    expect(deriveSubjectFromPost({ id: 'p', title: '', topicTags: ['#quiz'] })).toEqual({
      subject: 'general',
      subjectLabel: 'Quiz Review',
    });
    expect(deriveSubjectFromPost({ id: 'p' })).toEqual({
      subject: 'general',
      subjectLabel: 'Quiz Review',
    });
  });

  it('keeps the tag as subject and appends the title as topic for a real tag', () => {
    expect(
      deriveSubjectFromPost({
        id: 'p',
        title: 'AI & Prompts',
        topicTags: ['#Computer Science'],
      }),
    ).toEqual({
      subject: 'computer science',
      subjectLabel: 'Computer Science · AI & Prompts',
    });
  });
});
