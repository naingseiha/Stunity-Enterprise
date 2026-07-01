import {
  ABSTRACTS,
  abstractById,
  addLine,
  applyEdit,
  blankSlide,
  buildDeck,
  CHAPTERS,
  convertSlide,
  GRADIENTS,
  gradientById,
  LENGTH_PICK,
  lineKind,
  removeLine,
  renumber,
  resolveTheme,
  SLIDE_ACCENTS,
  slideBackground,
  slideLines,
  THEMES,
  type Slide,
} from './data';

const base = {
  subject: 'រូបវិទ្យា',
  grade: 'ថ្នាក់ទី១០',
  chapter: CHAPTERS[1], // ប្រភាគ
  lessonTitle: 'ច្បាប់ញូតុន',
};

describe('buildDeck', () => {
  it('honours the length preset slide counts', () => {
    expect(buildDeck({ ...base, length: 'short' })).toHaveLength(LENGTH_PICK.short.length);
    expect(buildDeck({ ...base, length: 'medium' })).toHaveLength(LENGTH_PICK.medium.length);
    expect(buildDeck({ ...base, length: 'long' })).toHaveLength(LENGTH_PICK.long.length);
  });

  it('falls back to the medium preset for an unknown length', () => {
    expect(buildDeck({ ...base, length: 'bogus' })).toHaveLength(LENGTH_PICK.medium.length);
  });

  it('opens with a title cover and ends with a summary', () => {
    const deck = buildDeck({ ...base, length: 'long' });
    expect(deck[0].kind).toBe('title');
    expect(deck[deck.length - 1].kind).toBe('summary');
  });

  it('renumbers slides sequentially with zero-padded Khmer numerals', () => {
    const deck = buildDeck({ ...base, length: 'short' });
    expect(deck.map((s) => s.no)).toEqual(['០១', '០២', '០៣']);
  });

  it('injects the lesson + chapter into the cover slide', () => {
    const [cover] = buildDeck({ ...base, length: 'short' });
    if (cover.kind !== 'title') throw new Error('expected title cover');
    expect(cover.title).toBe('ច្បាប់ញូតុន');
    expect(cover.kicker).toContain('រូបវិទ្យា');
    expect(cover.sub).toContain(CHAPTERS[1].title);
  });

  it('weaves the lesson title into the worked example', () => {
    const deck = buildDeck({ ...base, length: 'long' });
    const example = deck.find((s): s is Extract<Slide, { kind: 'example' }> => s.kind === 'example');
    expect(example?.steps[0]).toContain('ច្បាប់ញូតុន');
  });
});

describe('resolveTheme', () => {
  it('returns the base theme when no accent override is given', () => {
    expect(resolveTheme('mint', '')).toEqual(THEMES.find((t) => t.id === 'mint'));
  });

  it('overrides accent/dot/band/sw when an accent id is supplied', () => {
    const t = resolveTheme('classic', 'blue');
    const blue = SLIDE_ACCENTS.find((a) => a.id === 'blue')!.c;
    expect(t.accent).toBe(blue);
    expect(t.dot).toBe(blue);
    expect(t.band).toContain(blue);
    expect(t.sw).toContain(blue);
    // base, non-accent fields are preserved
    expect(t.bg).toBe(THEMES[0].bg);
  });

  it('falls back to the classic theme for an unknown theme id', () => {
    expect(resolveTheme('nope', '')).toEqual(THEMES[0]);
  });
});

describe('slide backgrounds', () => {
  const theme = THEMES[0];

  it('returns the bare theme bg when no background is set', () => {
    const r = slideBackground(undefined, theme);
    expect(r.base).toBe(theme.bg);
    expect(r.layer).toEqual({});
    expect(r.scrim).toBeUndefined();
  });

  it('weaves the theme accent into every abstract preset', () => {
    const hex = theme.accent.slice(1); // raw "#aabbcc" or url-encoded "%23aabbcc" both contain this
    for (const a of ABSTRACTS) {
      expect(JSON.stringify(a.css(theme))).toContain(hex);
    }
  });

  it('resolves an abstract background by id into a css layer', () => {
    const r = slideBackground({ type: 'abstract', value: 'aurora' }, theme);
    expect(r.layer).toEqual(abstractById('aurora')!.css(theme));
  });

  it('renders an image background with a readability scrim', () => {
    const r = slideBackground({ type: 'image', value: 'https://x/y.png' }, theme);
    expect(r.layer.backgroundImage).toContain('https://x/y.png');
    expect(r.layer.backgroundSize).toBe('cover');
    expect(r.scrim).toBeTruthy();
  });

  it('renders a gradient background with its css and a scrim', () => {
    const g = GRADIENTS[0];
    const r = slideBackground({ type: 'gradient', value: g.id }, theme);
    expect(r.layer.backgroundImage).toBe(g.css);
    expect(r.scrim).toBeTruthy();
    expect(gradientById(g.id)).toBe(g);
  });

  it('drops the gradient layer + scrim for an unknown gradient id', () => {
    const r = slideBackground({ type: 'gradient', value: 'nope' }, theme);
    expect(r.layer).toEqual({});
    expect(r.scrim).toBeUndefined();
  });

  it('keeps a slide background through edits and layout conversion', () => {
    const withBg: Slide = { ...buildDeck({ ...base, length: 'short' })[1], bg: { type: 'abstract', value: 'mesh' } } as Slide;
    expect(applyEdit(withBg, { field: 'title', value: 'x' }).bg).toEqual({ type: 'abstract', value: 'mesh' });
    expect(convertSlide(withBg, 'example').bg).toEqual({ type: 'abstract', value: 'mesh' });
  });

  it('carries speaker notes through edits and layout conversion', () => {
    const withNotes: Slide = { ...buildDeck({ ...base, length: 'short' })[1], notes: 'say this aloud' } as Slide;
    expect(applyEdit(withNotes, { field: 'title', value: 'x' }).notes).toBe('say this aloud');
    expect(convertSlide(withNotes, 'timeline').notes).toBe('say this aloud');
  });
});

describe('deck editing', () => {
  const deck = buildDeck({ ...base, length: 'long' });
  const listSlide = deck.find((s): s is Extract<Slide, { kind: 'list' }> => s.kind === 'list')!;

  describe('renumber', () => {
    it('reassigns sequential zero-padded Khmer numbers regardless of prior no', () => {
      const shuffled = [{ ...deck[2], no: '៩៩' }, { ...deck[0], no: 'x' }, deck[1]];
      expect(renumber(shuffled).map((s) => s.no)).toEqual(['០១', '០២', '០៣']);
    });
  });

  describe('blankSlide', () => {
    it('produces a starter slide of every kind with sensible content', () => {
      for (const kind of ['title', 'list', 'two-col', 'example', 'timeline', 'data', 'quote', 'summary', 'media'] as const) {
        const s = blankSlide(kind);
        expect(s.kind).toBe(kind);
        expect(slideLines(s).length).toBeGreaterThan(0);
      }
    });

    it('starts a media slide with no image', () => {
      const s = blankSlide('media');
      if (s.kind !== 'media') throw new Error('nope');
      expect(s.image).toBeUndefined();
    });
  });

  describe('convertSlide', () => {
    it('carries the title and body lines into the new layout', () => {
      const asExample = convertSlide(listSlide, 'example');
      expect(asExample.kind).toBe('example');
      if (asExample.kind !== 'example') throw new Error('nope');
      expect(asExample.title).toBe(listSlide.title);
      expect(asExample.steps).toEqual(listSlide.bullets.slice(0, 5));
    });

    it('is a no-op when converting to the same kind', () => {
      expect(convertSlide(listSlide, 'list')).toBe(listSlide);
    });

    it('maps a quote into a titled layout using the quote text', () => {
      const quote = deck.find((s): s is Extract<Slide, { kind: 'quote' }> => s.kind === 'quote')!;
      const asList = convertSlide(quote, 'list');
      if (asList.kind !== 'list') throw new Error('nope');
      expect(asList.title).toBe(quote.quote);
    });

    it('converts a slide into a media layout using its title as the caption source', () => {
      const asMedia = convertSlide(listSlide, 'media');
      if (asMedia.kind !== 'media') throw new Error('nope');
      expect(asMedia.title).toBe(listSlide.title);
      expect(asMedia.caption).toBe(listSlide.bullets[0]);
      expect(asMedia.image).toBeUndefined();
    });

    it('drops the image when converting a media slide to another layout', () => {
      const media = { ...blankSlide('media'), image: 'https://x/y.png' } as Slide;
      const asList = convertSlide(media, 'list');
      expect(asList).not.toHaveProperty('image');
    });
  });

  describe('applyEdit', () => {
    it('edits a bullet at an index without touching its siblings', () => {
      const edited = applyEdit(listSlide, { field: 'bullet', index: 1, value: 'កែរួច' });
      if (edited.kind !== 'list') throw new Error('nope');
      expect(edited.bullets[1]).toBe('កែរួច');
      expect(edited.bullets[0]).toBe(listSlide.bullets[0]);
      expect(edited).not.toBe(listSlide); // immutable
    });

    it('edits a media slide caption but ignores caption edits on other kinds', () => {
      const media = blankSlide('media');
      const edited = applyEdit(media, { field: 'caption', value: 'ការពិពណ៌នាថ្មី' });
      if (edited.kind !== 'media') throw new Error('nope');
      expect(edited.caption).toBe('ការពិពណ៌នាថ្មី');
      expect(applyEdit(listSlide, { field: 'caption', value: 'x' })).toBe(listSlide);
    });

    it('edits the title and a stat number/label', () => {
      const data = deck.find((s): s is Extract<Slide, { kind: 'data' }> => s.kind === 'data')!;
      expect((applyEdit(data, { field: 'title', value: 'ស្ថិតិថ្មី' }) as typeof data).title).toBe('ស្ថិតិថ្មី');
      const num = applyEdit(data, { field: 'statNum', index: 0, value: '៥០%' }) as typeof data;
      expect(num.stats[0].num).toBe('៥០%');
      expect(num.stats[0].label).toBe(data.stats[0].label);
    });

    it('ignores edits whose field does not apply to the slide kind', () => {
      const quote = deck.find((s): s is Extract<Slide, { kind: 'quote' }> => s.kind === 'quote')!;
      expect(applyEdit(quote, { field: 'title', value: 'x' })).toBe(quote);
    });
  });

  describe('line add / remove', () => {
    const dataSlide = deck.find((s): s is Extract<Slide, { kind: 'data' }> => s.kind === 'data')!;
    const quote = deck.find((s): s is Extract<Slide, { kind: 'quote' }> => s.kind === 'quote')!;

    it('reports the line container kind per slide', () => {
      expect(lineKind(listSlide)).toBe('bullets');
      expect(lineKind(dataSlide)).toBe('stats');
      expect(lineKind(quote)).toBeNull();
      const example = deck.find((s): s is Extract<Slide, { kind: 'example' }> => s.kind === 'example')!;
      expect(lineKind(example)).toBe('steps');
    });

    it('inserts a blank bullet after the given index', () => {
      const out = addLine(listSlide, 0);
      if (out.kind !== 'list') throw new Error('nope');
      expect(out.bullets.length).toBe(listSlide.bullets.length + 1);
      expect(out.bullets[1]).toBe('ចំណុចថ្មី');
      expect(out.bullets[0]).toBe(listSlide.bullets[0]);
      expect(out).not.toBe(listSlide); // immutable
    });

    it('adds and removes a stat line on a data slide', () => {
      const added = addLine(dataSlide, 0) as typeof dataSlide;
      expect(added.stats.length).toBe(dataSlide.stats.length + 1);
      const removed = removeLine(added, 1) as typeof dataSlide;
      expect(removed.stats.length).toBe(dataSlide.stats.length);
    });

    it('keeps at least one line and is a no-op on non-line kinds', () => {
      const oneLine: Slide = { kind: 'list', no: '០១', label: 'x', title: 't', bullets: ['only'] };
      expect(removeLine(oneLine, 0)).toBe(oneLine);
      expect(addLine(quote, 0)).toBe(quote);
      expect(removeLine(quote, 0)).toBe(quote);
    });

    it('caps the number of bullet lines', () => {
      let s: Slide = { kind: 'list', no: '០១', label: 'x', title: 't', bullets: ['a'] };
      for (let i = 0; i < 20; i += 1) s = addLine(s, 0);
      if (s.kind !== 'list') throw new Error('nope');
      expect(s.bullets.length).toBeLessThanOrEqual(8);
    });
  });
});
