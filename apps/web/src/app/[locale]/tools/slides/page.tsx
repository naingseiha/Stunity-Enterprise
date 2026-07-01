'use client';

// Slides — MoEYS teaching-deck generator for teachers.
// Ported from the "Lesson Planner" Claude Design as a Stunity creator tool.
// Flow: Hub → Config → Generating → deck viewer (+ fullscreen Present mode).
// Works without an account; Save keeps a device-local draft and invites sign-up.

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  Baseline,
  Bold,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  GripVertical,
  Download,
  FileText,
  Highlighter,
  Home,
  Image as ImageIcon,
  Italic,
  Layers,
  LayoutTemplate,
  Loader2,
  Minus,
  Palette,
  PanelBottom,
  Play,
  Plus,
  Presentation,
  Redo2,
  RefreshCw,
  RemoveFormatting,
  Sparkles,
  StickyNote,
  Strikethrough,
  Trash2,
  Underline,
  Undo2,
  Upload,
  Wallpaper,
  Wand2,
  X,
} from 'lucide-react';
import {
  ABSTRACTS,
  addLine,
  applyEdit,
  blankSlide,
  buildDeck,
  CHAPTERS,
  convertSlide,
  DEFAULT_DECK_SETTINGS,
  FOOTER_LAYOUTS,
  GRADES,
  GRADIENTS,
  lineKind,
  removeLine,
  renumber,
  resolveTheme,
  SCENES,
  slideBackground,
  SLIDE_ACCENTS,
  SLIDE_GEN_STEPS,
  SLIDE_H,
  SLIDE_KINDS,
  SLIDE_LENGTHS,
  SLIDE_W,
  SUBJECTS,
  THEMES,
  toKh,
  type Chapter,
  type DeckSettings,
  type EditField,
  type EditPatch,
  type FooterLayout,
  type Slide,
  type SlideBg,
  type Theme,
} from './data';
import { cloudUpsert, getDraft, isAuthed, saveDraft } from '../lib/drafts';
import { captureSlideImages, downloadPdf, downloadPptx, safeFileName } from './export';

type Screen = 'hub' | 'config' | 'generating' | 'result';
type Toast = { id: number; message: string; type: 'success' | 'info' | 'error' };

// ─── Studio chrome palette ─────────────────────────────────────────
// "Light canvas studio": warm-white workspace, charcoal ink, one vivid violet
// accent. The slide *themes* (data.ts) are untouched — this only styles the
// editor frame so the slide content stays the colourful centre of attention.
const C = {
  paper: '#f6f5f2', // workspace bg
  panel: '#ffffff', // surfaces / cards
  border: 'rgba(28,27,25,.10)',
  borderSoft: 'rgba(28,27,25,.07)',
  ink: '#1c1b19',
  body: '#39362f',
  muted: '#817c72',
  muted2: '#615d54',
  faintLabel: '#a8a39a',
  accent: '#6d5bf0',
  green: '#3f9d6b',
};
const ACCENT_GRAD = 'linear-gradient(135deg,#7c6cff,#a47bff)';
const ACCENT_SOFT = '#efecff';
const ACCENT_SHADOW = '0 12px 26px -12px rgba(109,91,240,.55)';
// A soft mesh + dot-grid backdrop for the workspace.
const MESH_BG =
  'radial-gradient(1100px 560px at 12% -12%, rgba(124,108,255,.10), transparent 60%),' +
  'radial-gradient(900px 520px at 112% 8%, rgba(255,160,110,.08), transparent 55%),' +
  '#f6f5f2';
const KH = "'Battambang', sans-serif";
const KO = "'Koulen', sans-serif";

// Fine dot-grid overlay (absolute, behind content).
function DotGrid() {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(rgba(28,27,25,.045) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        maskImage: 'radial-gradient(120% 120% at 50% 0%, #000 40%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(120% 120% at 50% 0%, #000 40%, transparent 100%)',
        pointerEvents: 'none',
      }}
    />
  );
}

// Signature decorative backdrop for the studio's chrome screens (Hub,
// Generating) — a fluid multi-hue gradient mesh + Memphis-style outline
// dots/squiggle, distinct from the plain slide-content backgrounds.
function StudioAura() {
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div className="sl-blob" style={{ position: 'absolute', top: '-16%', left: '2%', width: 460, height: 460, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,108,255,.26), transparent 68%)', filter: 'blur(6px)' }} />
      <div className="sl-blob" style={{ position: 'absolute', bottom: '-20%', right: '-2%', width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,140,190,.20), transparent 65%)', filter: 'blur(6px)', animationDelay: '-5s' }} />
      <div className="sl-blob" style={{ position: 'absolute', top: '36%', right: '10%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,180,120,.20), transparent 70%)', filter: 'blur(6px)', animationDelay: '-9s' }} />
      <div className="sl-blob" style={{ position: 'absolute', bottom: '8%', left: '9%', width: 210, height: 210, borderRadius: '50%', background: 'radial-gradient(circle, rgba(120,190,255,.18), transparent 70%)', filter: 'blur(6px)', animationDelay: '-2s' }} />
      <svg width="220" height="220" viewBox="0 0 220 220" style={{ position: 'absolute', top: 36, right: 36, opacity: 0.55 }}>
        <path d="M10 120 Q 70 40 140 90 T 210 60" stroke="#a78bfa" strokeWidth="1.5" fill="none" />
        <circle cx="26" cy="150" r="6" fill="none" stroke="#a78bfa" strokeWidth="1.4" />
        <circle cx="26" cy="172" r="6" fill="none" stroke="#a78bfa" strokeWidth="1.4" />
        <circle cx="26" cy="194" r="6" fill="none" stroke="#a78bfa" strokeWidth="1.4" />
      </svg>
    </div>
  );
}

export default function SlidesPage() {
  return (
    <Suspense fallback={null}>
      <SlidesBuilder />
    </Suspense>
  );
}

function SlidesBuilder() {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();

  const [screen, setScreen] = useState<Screen>('hub');
  const [subject, setSubject] = useState('រូបវិទ្យា');
  const [grade, setGrade] = useState('ថ្នាក់ទី១០');
  const [chapterNo, setChapterNo] = useState(CHAPTERS[0].no);
  const [lessonTitle, setLessonTitle] = useState(CHAPTERS[0].lessons[0].title);
  const [themeId, setThemeId] = useState('classic');
  const [accentId, setAccentId] = useState('');
  const [length, setLength] = useState('medium');
  // Deck-wide header/footer chrome (like PowerPoint's Header & Footer dialog) —
  // not undo-tracked, same as theme/accent selection.
  const [deckSettings, setDeckSettings] = useState<DeckSettings>(DEFAULT_DECK_SETTINGS);
  const patchDeckSettings = (patch: Partial<DeckSettings>) => setDeckSettings((d) => ({ ...d, ...patch }));
  const [slideIndex, setSlideIndex] = useState(0);
  const [genStep, setGenStep] = useState(0);
  const [presenting, setPresenting] = useState(false);
  // Real PDF / PowerPoint export. Set while a hidden off-screen copy of the
  // deck is mounted + rasterised; cleared once the file downloads.
  const [exportKind, setExportKind] = useState<'pdf' | 'pptx' | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const [draftId, setDraftId] = useState<string | undefined>(undefined);
  const [showGate, setShowGate] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  // The generated deck is editable state once on the result screen.
  const [deck, setDeck] = useState<Slide[]>([]);
  // Undo / redo history — past + future snapshots of the deck. Refs hold the
  // stacks (no re-render on push); bumpHist re-renders so canUndo/canRedo and the
  // ribbon buttons reflect the current stack depth.
  const past = useRef<Slide[][]>([]);
  const future = useRef<Slide[][]>([]);
  const [, forceHist] = useState(0);
  const bumpHist = useCallback(() => forceHist((v) => v + 1), []);
  const HIST_MAX = 80;

  // History-tracked deck update — used by every editing op. Pushes the current
  // deck onto the past stack and clears the redo future.
  const commitDeck = useCallback((updater: (d: Slide[]) => Slide[]) => {
    setDeck((cur) => {
      const next = updater(cur);
      if (next === cur) return cur;
      past.current = [...past.current.slice(-(HIST_MAX - 1)), cur];
      future.current = [];
      return next;
    });
    bumpHist();
  }, [bumpHist]);

  // Full deck replacement (generate / draft-load) — clears history.
  const resetDeck = useCallback((d: Slide[]) => {
    past.current = [];
    future.current = [];
    setDeck(d);
    bumpHist();
  }, [bumpHist]);

  const undo = useCallback(() => {
    if (!past.current.length) return;
    setDeck((cur) => {
      const prev = past.current[past.current.length - 1];
      past.current = past.current.slice(0, -1);
      future.current = [cur, ...future.current].slice(0, HIST_MAX);
      return prev;
    });
    bumpHist();
  }, [bumpHist]);

  const redo = useCallback(() => {
    if (!future.current.length) return;
    setDeck((cur) => {
      const nxt = future.current[0];
      future.current = future.current.slice(1);
      past.current = [...past.current.slice(-(HIST_MAX - 1)), cur];
      return nxt;
    });
    bumpHist();
  }, [bumpHist]);

  const canUndo = past.current.length > 0;
  const canRedo = future.current.length > 0;

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);

  const chapter = useMemo(() => CHAPTERS.find((c) => c.no === chapterNo) || CHAPTERS[0], [chapterNo]);
  const theme = useMemo(() => resolveTheme(themeId, accentId), [themeId, accentId]);
  // Live, non-editable preview shown on the config screen before generating.
  const previewDeck = useMemo(
    () => buildDeck({ subject, grade, chapter, lessonTitle, length }),
    [subject, grade, chapter, lessonTitle, length],
  );
  const idx = Math.max(0, Math.min(deck.length - 1, slideIndex));

  const scrollTop = () => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
  };
  const notify = (message: string, type: Toast['type'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  };
  const go = (s: Screen) => {
    setScreen(s);
    scrollTop();
  };

  const generate = () => {
    setScreen('generating');
    setGenStep(0);
    setSlideIndex(0);
    scrollTop();
    const steps = [700, 1050, 1250, 1100, 850];
    let i = 0;
    const tick = () => {
      i += 1;
      if (i >= steps.length) {
        resetDeck(buildDeck({ subject, grade, chapter, lessonTitle, length }));
        setScreen('result');
        notify('បង្កើតស្លាយបង្ហាញដោយជោគជ័យ');
        return;
      }
      setGenStep(i);
      timer.current = setTimeout(tick, steps[i]);
    };
    timer.current = setTimeout(tick, steps[0]);
  };

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // Reopen from a saved draft (?draft=…).
  useEffect(() => {
    const id = searchParams.get('draft');
    if (!id) return;
    const d = getDraft(id);
    if (!d) return;
    const p = d.payload as Record<string, unknown>;
    setDraftId(d.id);
    if (typeof p.subject === 'string') setSubject(p.subject);
    if (typeof p.grade === 'string') setGrade(p.grade);
    if (typeof p.chapterNo === 'string') setChapterNo(p.chapterNo);
    if (typeof p.lessonTitle === 'string') setLessonTitle(p.lessonTitle);
    if (typeof p.themeId === 'string') setThemeId(p.themeId);
    if (typeof p.accentId === 'string') setAccentId(p.accentId);
    if (typeof p.length === 'string') setLength(p.length);
    if (p.deckSettings && typeof p.deckSettings === 'object') {
      setDeckSettings({ ...DEFAULT_DECK_SETTINGS, ...(p.deckSettings as Partial<DeckSettings>) });
    }
    // Restore the edited deck if the draft has one; otherwise rebuild from config.
    if (Array.isArray(p.slides) && p.slides.length) {
      resetDeck(renumber(p.slides as Slide[]));
    } else {
      const ch = CHAPTERS.find((c) => c.no === p.chapterNo) || CHAPTERS[0];
      resetDeck(buildDeck({
        subject: typeof p.subject === 'string' ? p.subject : subject,
        grade: typeof p.grade === 'string' ? p.grade : grade,
        chapter: ch,
        lessonTitle: typeof p.lessonTitle === 'string' ? p.lessonTitle : lessonTitle,
        length: typeof p.length === 'string' ? p.length : length,
      }));
    }
    setScreen('result');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the cursor in range when the deck length changes.
  useEffect(() => {
    setSlideIndex((i) => Math.max(0, Math.min(deck.length - 1, i)));
  }, [deck.length]);

  const slidePrev = useCallback(() => setSlideIndex((i) => Math.max(0, i - 1)), []);
  const slideNext = useCallback(() => setSlideIndex((i) => Math.min(deck.length - 1, i + 1)), [deck.length]);

  // ── Deck editing ── (all history-tracked via commitDeck)
  const editSlide = (patch: EditPatch) =>
    commitDeck((d) => d.map((s, k) => (k === idx ? applyEdit(s, patch) : s)));
  const addSlide = (kind: Slide['kind']) => {
    commitDeck((d) => renumber([...d.slice(0, idx + 1), blankSlide(kind), ...d.slice(idx + 1)]));
    setSlideIndex(idx + 1);
    notify('បានបន្ថែមស្លាយ');
  };
  const duplicateSlide = () => {
    commitDeck((d) => renumber([...d.slice(0, idx + 1), { ...d[idx] }, ...d.slice(idx + 1)]));
    setSlideIndex(idx + 1);
    notify('បានចម្លងស្លាយ');
  };
  const deleteSlide = () => {
    if (deck.length <= 1) {
      notify('ត្រូវមានស្លាយយ៉ាងតិច ១', 'error');
      return;
    }
    commitDeck((d) => renumber(d.filter((_, k) => k !== idx)));
    setSlideIndex((i) => Math.max(0, Math.min(deck.length - 2, i)));
    notify('បានលុបស្លាយ');
  };
  const moveSlide = (dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= deck.length) return;
    commitDeck((d) => {
      const nd = [...d];
      [nd[idx], nd[j]] = [nd[j], nd[idx]];
      return renumber(nd);
    });
    setSlideIndex(j);
  };
  const changeLayout = (kind: Slide['kind']) =>
    commitDeck((d) => d.map((s, k) => (k === idx ? convertSlide(s, kind) : s)));
  // Drag-reorder from the filmstrip — moves slide `from` to position `to`.
  const reorderSlide = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= deck.length || to >= deck.length) return;
    commitDeck((d) => {
      const nd = [...d];
      const [moved] = nd.splice(from, 1);
      nd.splice(to, 0, moved);
      return renumber(nd);
    });
    setSlideIndex(to);
  };
  const addLineAt = (index: number) =>
    commitDeck((d) => d.map((s, k) => (k === idx ? addLine(s, index) : s)));
  const removeLineAt = (index: number) =>
    commitDeck((d) => d.map((s, k) => (k === idx ? removeLine(s, index) : s)));
  const setBg = (bg: SlideBg | undefined) =>
    commitDeck((d) => d.map((s, k) => (k === idx ? { ...s, bg } : s)));
  const setBgAll = (bg: SlideBg | undefined) => {
    commitDeck((d) => d.map((s) => ({ ...s, bg })));
    notify('បានដាក់ផ្ទៃខាងក្រោយគ្រប់ស្លាយ');
  };
  const setNotes = (value: string) =>
    commitDeck((d) => d.map((s, k) => (k === idx ? { ...s, notes: value } : s)));
  const setMediaImage = (url: string | undefined) =>
    commitDeck((d) => d.map((s, k) => (k === idx && s.kind === 'media' ? { ...s, image: url } : s)));

  // Present-mode keyboard nav.
  useEffect(() => {
    if (!presenting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPresenting(false);
      else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        slideNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        slidePrev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [presenting, slideNext, slidePrev]);

  // Undo / redo shortcuts on the editor. Skip when focus is inside an editable /
  // form field so the browser's native text undo still works there.
  useEffect(() => {
    if (screen !== 'result' || presenting) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k !== 'z' && k !== 'y') return;
      const el = document.activeElement as HTMLElement | null;
      const inField = !!el && (el.getAttribute('contenteditable') === 'true' || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
      if (inField) return;
      if (k === 'y' || (k === 'z' && e.shiftKey)) {
        e.preventDefault();
        redo();
      } else if (k === 'z') {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, presenting, undo, redo]);

  const handleSave = () => {
    const d = saveDraft({
      id: draftId,
      tool: 'slides',
      title: `ស្លាយ ${lessonTitle}`,
      subject,
      grade,
      payload: { subject, grade, chapterNo, lessonTitle, themeId, accentId, length, slides: deck, deckSettings },
    });
    setDraftId(d.id);
    if (!isAuthed()) {
      notify('បានរក្សាទុកក្នុងឧបករណ៍នេះ');
      setShowGate(true);
      return;
    }
    notify('បានរក្សាទុក');
    cloudUpsert(d).then((ok) => {
      if (ok) notify('បាន sync ទៅគណនី');
    });
  };

  // Runs once the hidden off-screen deck (rendered below) is mounted for the
  // chosen export kind: waits for images to finish loading, rasterises each
  // slide, then downloads a real PDF or PPTX matching what's on screen.
  useEffect(() => {
    if (!exportKind) return;
    let cancelled = false;
    (async () => {
      const container = exportRef.current;
      if (!container) return;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const imgs = Array.from(container.querySelectorAll('img'));
      await Promise.all(
        imgs.map((img) => (img.complete ? Promise.resolve() : new Promise((res) => { img.onload = img.onerror = () => res(null); }))),
      );
      try {
        const images = await captureSlideImages(container);
        const name = safeFileName(lessonTitle);
        if (exportKind === 'pdf') await downloadPdf(images, `${name}.pdf`, SLIDE_W, SLIDE_H);
        else await downloadPptx(images, `${name}.pptx`);
        if (!cancelled) notify(exportKind === 'pdf' ? 'បាននាំចេញជា PDF' : 'បាននាំចេញជា PowerPoint');
      } catch {
        if (!cancelled) notify('មានបញ្ហាក្នុងការនាំចេញ សូមព្យាយាមម្តងទៀត', 'error');
      } finally {
        if (!cancelled) setExportKind(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [exportKind, lessonTitle]);

  const handleExport = (kind: 'pdf' | 'pptx') => {
    notify(kind === 'pdf' ? 'កំពុងរៀបចំ PDF…' : 'កំពុងរៀបចំ PowerPoint…', 'info');
    setExportKind(kind);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: MESH_BG, fontFamily: KH, color: C.body }}>
      <TopBar
        screen={screen}
        onHome={() => go('hub')}
        onConfig={() => go('config')}
        onExit={() => router.push(`/${locale}/tools`)}
        title={screen === 'result' ? `ស្លាយ ${lessonTitle}` : undefined}
        status="បានរក្សាទុក"
        actions={
          screen === 'result' ? (
            <>
              <ToolBtn onClick={() => go('config')} title="កំណត់ឡើងវិញ"><RefreshCw size={15} /><span className="sl-hide-md">កំណត់</span></ToolBtn>
              <ToolBtn onClick={generate} title="បង្កើតឡើងវិញ"><Wand2 size={15} /><span className="sl-hide-md">ឡើងវិញ</span></ToolBtn>
              <ExportMenu busy={exportKind} onExport={handleExport} />
              <ToolBtn onClick={handleSave}>រក្សាទុក</ToolBtn>
              <ToolBtn primary onClick={() => setPresenting(true)}><Play size={15} />បង្ហាញ</ToolBtn>
            </>
          ) : undefined
        }
      />

      <main ref={mainRef as React.RefObject<HTMLElement>} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', overflowY: 'auto' }}>
        {screen === 'hub' && <Hub onStart={() => go('config')} />}

        {screen === 'config' && (
          <Config
            subject={subject}
            setSubject={setSubject}
            grade={grade}
            setGrade={setGrade}
            chapterNo={chapterNo}
            setChapter={(no) => {
              setChapterNo(no);
              const ch = CHAPTERS.find((c) => c.no === no);
              if (ch) setLessonTitle(ch.lessons[0].title);
            }}
            chapter={chapter}
            lessonTitle={lessonTitle}
            setLessonTitle={setLessonTitle}
            themeId={themeId}
            setThemeId={setThemeId}
            accentId={accentId}
            setAccentId={setAccentId}
            length={length}
            setLength={setLength}
            theme={theme}
            deck={previewDeck}
            onGenerate={generate}
            deckSettings={deckSettings}
          />
        )}

        {screen === 'generating' && <Generating step={genStep} theme={theme} lessonTitle={lessonTitle} />}

        {screen === 'result' && (
          <Result
            deck={deck}
            idx={idx}
            theme={theme}
            themeId={themeId}
            setThemeId={setThemeId}
            accentId={accentId}
            setAccentId={setAccentId}
            onSelect={setSlideIndex}
            onPrev={slidePrev}
            onNext={slideNext}
            onEditSlide={editSlide}
            onAddSlide={addSlide}
            onDuplicate={duplicateSlide}
            onDelete={deleteSlide}
            onMove={moveSlide}
            onReorder={reorderSlide}
            onChangeLayout={changeLayout}
            onAddLine={addLineAt}
            onRemoveLine={removeLineAt}
            onSetBg={setBg}
            onSetBgAll={setBgAll}
            onSetNotes={setNotes}
            onSetImage={setMediaImage}
            onUndo={undo}
            onRedo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
            deckSettings={deckSettings}
            onPatchDeckSettings={patchDeckSettings}
          />
        )}
      </main>

      {presenting && (
        <Present
          deck={deck}
          idx={idx}
          theme={theme}
          onPrev={slidePrev}
          onNext={slideNext}
          onClose={() => setPresenting(false)}
          deckSettings={deckSettings}
        />
      )}

      {/* Off-screen full-size copy of the deck, mounted only while exporting.
          html2canvas rasterises each [data-export-slide] node from here. */}
      {exportKind && (
        <div ref={exportRef} aria-hidden style={{ position: 'fixed', left: -99999, top: 0, pointerEvents: 'none' }}>
          {deck.map((s, i) => (
            <div key={i} data-export-slide={i} style={{ width: SLIDE_W, height: SLIDE_H, position: 'relative', overflow: 'hidden' }}>
              <SlideBoard slide={s} theme={theme} total={deck.length} deckSettings={deckSettings} />
            </div>
          ))}
        </div>
      )}

      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
      {showGate && <SignupGate locale={locale} onClose={() => setShowGate(false)} />}

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Hanuman:wght@400;700&family=Moul&family=Suwannaphum:wght@400;700&family=Content:wght@400;700&display=swap');`}</style>
      <style>{`
        .sl-ed:hover { background: rgba(109,91,240,.07); }
        .sl-ed:focus { background: rgba(109,91,240,.05); box-shadow: 0 0 0 2px rgba(109,91,240,.28); }
        .sl-only-sm { display: none; }
        .sl-spin { animation: sl-spin .8s linear infinite; }
        @keyframes sl-spin { to { transform: rotate(360deg); } }
        .sl-hero-in { opacity: 0; animation: sl-hero-up .7s cubic-bezier(.16,1,.3,1) forwards; }
        .sl-hero-d1 { animation-delay: .05s; }
        .sl-hero-d2 { animation-delay: .16s; }
        .sl-hero-d3 { animation-delay: .28s; }
        .sl-hero-d4 { animation-delay: .4s; }
        .sl-hero-d5 { animation-delay: .52s; }
        @keyframes sl-hero-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .sl-blob { animation: sl-blob-float 14s ease-in-out infinite; }
        @keyframes sl-blob-float { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(3%,-4%) scale(1.06); } }
        .sl-cta-pulse:hover { transform: translateY(-1px) scale(1.015); box-shadow: 0 16px 34px -12px rgba(109,91,240,.68); }
        .sl-cta-pulse { transition: transform .2s ease, box-shadow .2s ease; }
        .sl-navpill-inactive:hover { color: #1c1b19 !important; }
        .sl-topbar-back:hover { transform: translateY(-1px); box-shadow: 0 6px 16px -8px rgba(28,27,25,.35); }
        .sl-film-item:hover { transform: translateX(2px); }
        .sl-film-no { display: inline; }
        .sl-film-gripicon { display: none; }
        .sl-film-item:hover .sl-film-no { display: none; }
        .sl-film-item:hover .sl-film-gripicon { display: inline; }
        .sl-stage-in { animation: sl-stage-in .28s cubic-bezier(.16,1,.3,1); }
        @keyframes sl-stage-in { from { opacity: .45; transform: scale(.986); } to { opacity: 1; transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) {
          .sl-hero-in, .sl-blob, .sl-cta-pulse, .sl-stage-in { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
        @media (max-width: 900px) { .sl-hide-md { display: none !important; } }
        .sl-ribbon::-webkit-scrollbar { height: 6px; }
        .sl-ribbon::-webkit-scrollbar-thumb { background: rgba(28,27,25,.18); border-radius: 6px; }
        @media (max-width: 560px) {
          .sl-hide-sm { display: none !important; }
          .sl-only-sm { display: inline !important; }
        }
        @media (max-width: 760px) {
          .sl-ribbon { flex-wrap: nowrap !important; overflow-x: auto; }
        }
        @media (max-width: 980px) {
          .sl-config-grid { grid-template-columns: 1fr !important; }
          .sl-config-grid > aside { border-right: none !important; }
        }
      `}</style>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Top bar
// ════════════════════════════════════════════════════════════════════
function TopBar({ screen, onHome, onConfig, onExit, title, status, actions }: { screen: Screen; onHome: () => void; onConfig: () => void; onExit: () => void; title?: string; status?: string; actions?: React.ReactNode }) {
  const editor = screen === 'result';
  const configActive = screen === 'config' || screen === 'generating';
  const tab = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    padding: '8px 18px',
    borderRadius: 100,
    border: 'none',
    cursor: 'pointer',
    fontFamily: KO,
    fontSize: 13.5,
    letterSpacing: '.3px',
    color: active ? '#fff' : C.muted2,
    background: active ? C.ink : 'transparent',
    transition: 'all .18s cubic-bezier(.16,1,.3,1)',
  });
  return (
    <header className="sl-topbar" style={{ position: 'sticky', height: 64, flex: 'none', display: 'flex', alignItems: 'center', gap: 14, padding: '0 18px', background: 'rgba(255,255,255,.8)', backdropFilter: 'blur(18px)', borderBottom: `1px solid ${C.borderSoft}`, top: 0, zIndex: 30 }}>
      <button onClick={onExit} className="sl-topbar-back" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 12, border: `1px solid ${C.border}`, background: C.panel, cursor: 'pointer', color: C.muted2, flex: 'none', transition: 'transform .15s, box-shadow .15s' }} title="ឧបករណ៍ទាំងអស់">
        <ArrowLeft size={17} />
      </button>
      <div style={{ width: 36, height: 36, borderRadius: 11, background: ACCENT_GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flex: 'none' }}>
        <Presentation size={18} />
      </div>

      {editor ? (
        <>
          {/* doc title + saved status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.green, flex: 'none', boxShadow: '0 0 0 3px rgba(63,157,107,.18)' }} title={status} />
            <span style={{ fontFamily: KO, fontSize: 15.5, color: C.ink, letterSpacing: '.2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} dangerouslySetInnerHTML={{ __html: title || '' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 'none' }}>{actions}</div>
        </>
      ) : (
        <>
          <div className="sl-hide-sm" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontFamily: KO, fontSize: 16.5, color: C.ink, letterSpacing: '.3px', lineHeight: 1.1 }}>ស្លាយបង្ហាញ</span>
            <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '2px', color: C.accent, lineHeight: 1.2 }}>STUNITY STUDIO</span>
          </div>
          <div style={{ flex: 1 }} />
          <nav style={{ display: 'flex', alignItems: 'center', gap: 3, padding: 4, borderRadius: 100, background: '#f3f4f6', border: `1px solid ${C.borderSoft}` }}>
            <button onClick={onHome} className={screen === 'hub' ? '' : 'sl-navpill-inactive'} style={tab(screen === 'hub')}>
              <Home size={15} />
              <span className="sl-hide-sm">ទំព័រដើម</span>
            </button>
            <button onClick={onConfig} className={configActive ? '' : 'sl-navpill-inactive'} style={tab(configActive)}>
              <Wand2 size={15} />
              <span className="sl-hide-sm">បង្កើត</span>
            </button>
          </nav>
        </>
      )}
    </header>
  );
}

// ════════════════════════════════════════════════════════════════════
// Hub
// ════════════════════════════════════════════════════════════════════
function Hub({ onStart }: { onStart: () => void }) {
  return (
    <section style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '70px 40px', textAlign: 'center', overflow: 'hidden' }}>
      <StudioAura />
      <DotGrid />

      <div className="sl-hero-in sl-hero-d1" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 16px', borderRadius: 100, background: C.panel, border: `1px solid ${C.borderSoft}`, marginBottom: 26, fontSize: 12, fontWeight: 700, color: C.accent, boxShadow: '0 8px 22px -14px rgba(28,27,25,.4)' }}>
        <span style={{ width: 18, height: 18, borderRadius: 6, background: ACCENT_GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><Sparkles size={11} /></span>
        AI Presentation Studio
      </div>
      <h1 className="sl-hero-in sl-hero-d2" style={{ position: 'relative', fontFamily: KO, fontSize: 'clamp(38px, 5.5vw, 66px)', lineHeight: 1.1, color: C.ink, letterSpacing: '.5px', marginBottom: 20 }}>
        បម្លែងមេរៀន
        <br />
        ទៅជា <span style={{ background: ACCENT_GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>ស្លាយបង្រៀន</span>
      </h1>
      <p className="sl-hero-in sl-hero-d3" style={{ position: 'relative', fontSize: 16, color: C.muted, maxWidth: 520, lineHeight: 1.8, marginBottom: 32 }}>
        ជ្រើសមុខវិជ្ជា ថ្នាក់ និងមេរៀន រួច AI បង្កើតស្លាយ ១៦:៩ ពេញលេញ
        ដែលអ្នកអាចកែ និងបង្ហាញបានភ្លាម។
      </p>
      <button onClick={onStart} className="sl-hero-in sl-hero-d4 sl-cta-pulse" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 10, padding: '16px 32px', border: 'none', borderRadius: 16, cursor: 'pointer', fontFamily: KO, fontSize: 17, letterSpacing: '.5px', color: '#fff', background: ACCENT_GRAD, boxShadow: ACCENT_SHADOW }}>
        <Wand2 size={20} /> ចាប់ផ្តើមបង្កើត
      </button>
      <div className="sl-hero-in sl-hero-d5" style={{ position: 'relative', marginTop: 24, display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        {['រចនាបថ ៣ + ពណ៌', 'កែអក្សរ inline', 'Present ពេញអេក្រង់'].map((f) => (
          <span key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px 6px 10px', borderRadius: 100, background: C.panel, border: `1px solid ${C.borderSoft}`, fontSize: 12, fontWeight: 700, color: C.muted2, boxShadow: '0 4px 14px -10px rgba(28,27,25,.35)' }}>
            <span style={{ width: 15, height: 15, borderRadius: '50%', background: ACCENT_SOFT, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
              <Check size={9.5} style={{ color: C.accent }} strokeWidth={3} />
            </span>
            {f}
          </span>
        ))}
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════════════
// Config (controls + live preview)
// ════════════════════════════════════════════════════════════════════
function Config(props: {
  subject: string;
  setSubject: (v: string) => void;
  grade: string;
  setGrade: (v: string) => void;
  chapterNo: string;
  setChapter: (no: string) => void;
  chapter: Chapter;
  lessonTitle: string;
  setLessonTitle: (v: string) => void;
  themeId: string;
  setThemeId: (v: string) => void;
  accentId: string;
  setAccentId: (v: string) => void;
  length: string;
  setLength: (v: string) => void;
  theme: Theme;
  deck: Slide[];
  onGenerate: () => void;
  deckSettings: DeckSettings;
}) {
  const {
    subject, setSubject, grade, setGrade, chapterNo, setChapter, chapter, lessonTitle, setLessonTitle,
    themeId, setThemeId, accentId, setAccentId, length, setLength, theme, deck, onGenerate, deckSettings,
  } = props;

  return (
    <>
      <header style={{ padding: '18px 40px', borderBottom: `1px solid ${C.border}`, background: 'rgba(246,245,242,.75)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 5 }}>
        <h1 style={{ fontFamily: KO, fontSize: 24, color: C.ink, letterSpacing: '.4px' }}>បង្កើតស្លាយបង្ហាញ</h1>
        <p style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>ជ្រើសមេរៀន រួចកំណត់ រចនាបថ ពណ៌ និងប្រវែង</p>
      </header>

      <div className="sl-config-grid" style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0,420px) minmax(0,1fr)', alignItems: 'start' }}>
        <aside style={{ background: C.panel, borderRight: `1px solid ${C.border}`, padding: '20px 22px 40px' }}>
          <SectionLabel>ប្រភពមាតិកា</SectionLabel>
          <Select label="មុខវិជ្ជា" value={subject} onChange={setSubject} options={SUBJECTS} />
          <Select label="ថ្នាក់" value={grade} onChange={setGrade} options={GRADES} />
          <Select label="ជំពូក" value={chapterNo} onChange={setChapter} options={CHAPTERS.map((c) => ({ v: c.no, l: `ជំពូកទី ${c.no} ៖ ${c.title}` }))} />
          <Select label="មេរៀន" value={lessonTitle} onChange={setLessonTitle} options={chapter.lessons.map((l) => l.title)} />

          <SectionLabel style={{ marginTop: 14 }}>រូបរាង</SectionLabel>
          <Field label="រចនាបថ">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {THEMES.map((t) => {
                const active = themeId === t.id;
                return (
                  <button key={t.id} onClick={() => setThemeId(t.id)} style={{ padding: 8, borderRadius: 12, cursor: 'pointer', border: `1.5px solid ${active ? '#6d5bf0' : C.borderSoft}`, background: active ? '#efecff' : '#ffffff', textAlign: 'center' }}>
                    <div style={{ height: 34, borderRadius: 8, background: t.panel, border: `1px solid ${C.borderSoft}`, marginBottom: 6, position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', left: 6, right: 6, bottom: 6, height: 4, borderRadius: 3, background: t.band }} />
                    </div>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: active ? C.accent : C.muted2 }}>{t.name}</span>
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="ពណ៌សំខាន់">
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
              <Swatch color={(THEMES.find((t) => t.id === themeId) || THEMES[0]).accent} active={accentId === ''} onClick={() => setAccentId('')} title="ដើម" />
              {SLIDE_ACCENTS.map((a) => (
                <Swatch key={a.id} color={a.c} active={accentId === a.id} onClick={() => setAccentId(a.id)} title={a.name} />
              ))}
            </div>
          </Field>

          <Field label="ប្រវែង">
            <div style={{ display: 'flex', gap: 8 }}>
              {SLIDE_LENGTHS.map((l) => {
                const active = length === l.id;
                return (
                  <button key={l.id} onClick={() => setLength(l.id)} style={{ flex: 1, padding: '11px 4px', border: `1.5px solid ${active ? '#6d5bf0' : C.borderSoft}`, borderRadius: 11, cursor: 'pointer', background: active ? 'linear-gradient(135deg,#7c6cff,#a47bff)' : '#ffffff', color: active ? '#fff' : C.muted }}>
                    <div style={{ fontFamily: KH, fontSize: 12.5, fontWeight: 700 }}>{l.name}</div>
                    <div style={{ fontSize: 10.5, opacity: 0.85 }}>{l.n} ស្លាយ</div>
                  </button>
                );
              })}
            </div>
          </Field>

          <button onClick={onGenerate} style={{ width: '100%', marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 15, border: 'none', borderRadius: 14, cursor: 'pointer', fontFamily: KO, fontSize: 17, letterSpacing: '.5px', color: '#fff', background: 'linear-gradient(135deg,#7c6cff,#a47bff)', boxShadow: '0 12px 26px -12px rgba(109,91,240,.6)' }}>
            <Wand2 size={19} /> បង្កើតដោយ AI
          </button>
        </aside>

        <div style={{ padding: '34px 40px 70px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start', fontSize: 11.5, fontWeight: 700, color: C.muted2, letterSpacing: '.3px' }}>
            <Presentation size={14} style={{ color: theme.accent }} /> ស្លាយ · 16:9 · មើលជាមុន · {toKh(deck.length)} ស្លាយ
          </div>
          <ScaledSlide slide={deck[0]} theme={theme} total={deck.length} width={620} shadow deckSettings={deckSettings} />
          <ThumbStrip deck={deck} idx={-1} theme={theme} onSelect={() => {}} deckSettings={deckSettings} />
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// Generating
// ════════════════════════════════════════════════════════════════════
function Generating({ step, theme, lessonTitle }: { step: number; theme: Theme; lessonTitle: string }) {
  const pct = Math.round(((step + 1) / SLIDE_GEN_STEPS.length) * 100);
  return (
    <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, overflow: 'hidden' }}>
      <StudioAura />
      <DotGrid />

      <div style={{ position: 'relative', width: 88, height: 88, marginBottom: 28 }}>
        <div aria-hidden style={{ position: 'absolute', inset: -6, borderRadius: 26, background: 'conic-gradient(from 0deg, transparent, rgba(124,108,255,.6), transparent 30%)', animation: 'sl-ring-spin 2.1s linear infinite' }} />
        <div style={{ position: 'relative', width: 88, height: 88, borderRadius: 22, background: 'linear-gradient(135deg,#7c6cff,#a47bff)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 18px 40px -16px rgba(109,91,240,.65)', animation: 'slPulse 1.4s ease infinite' }}>
          <Presentation size={38} />
        </div>
      </div>
      <h2 className="sl-hero-in sl-hero-d1" style={{ position: 'relative', fontFamily: KO, fontSize: 27, color: C.ink, letterSpacing: '.4px', marginBottom: 6 }}>កំពុងបង្កើតស្លាយ</h2>
      <p className="sl-hero-in sl-hero-d2" style={{ position: 'relative', fontSize: 13.5, color: C.muted, marginBottom: 26 }}>ស្លាយ ៖ {lessonTitle}</p>

      <div className="sl-hero-in sl-hero-d3" style={{ position: 'relative', width: 400, maxWidth: '90%', background: C.panel, borderRadius: 20, border: `1px solid ${C.borderSoft}`, boxShadow: '0 20px 46px -24px rgba(28,27,25,.35)', padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 8, background: '#e7e4dd', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: ACCENT_GRAD, borderRadius: 8, transition: 'width .5s ease', position: 'relative', overflow: 'hidden' }}>
              <div className="sl-shimmer" aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent)' }} />
            </div>
          </div>
          <span style={{ fontSize: 15, color: theme.accent, minWidth: 42, fontFamily: KO }}>{pct}%</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {SLIDE_GEN_STEPS.map((label, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flex: 'none', color: '#fff', background: done ? C.green : active ? theme.accent : '#e7e4dd', animation: active ? 'slPulse 1s ease infinite' : 'none' }}>
                  {done ? '✓' : toKh(i + 1)}
                </div>
                <span style={{ fontSize: 14, fontWeight: active || done ? 700 : 400, color: done ? C.green : active ? theme.accent : '#b4b0a8' }}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>
      <style>{`
        @keyframes slPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.08);opacity:.85}}
        @keyframes sl-ring-spin{to{transform:rotate(360deg)}}
        .sl-shimmer{animation:sl-shimmer 1.6s linear infinite}
        @keyframes sl-shimmer{from{transform:translateX(-100%)}to{transform:translateX(220%)}}
        @media (prefers-reduced-motion: reduce){.sl-shimmer{animation:none!important}}
      `}</style>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Result (deck viewer)
// ════════════════════════════════════════════════════════════════════
function Result(props: {
  deck: Slide[];
  idx: number;
  theme: Theme;
  themeId: string;
  setThemeId: (v: string) => void;
  accentId: string;
  setAccentId: (v: string) => void;
  onSelect: (i: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onEditSlide: (patch: EditPatch) => void;
  onAddSlide: (kind: Slide['kind']) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
  onReorder: (from: number, to: number) => void;
  onChangeLayout: (kind: Slide['kind']) => void;
  onAddLine: (index: number) => void;
  onRemoveLine: (index: number) => void;
  onSetBg: (bg: SlideBg | undefined) => void;
  onSetBgAll: (bg: SlideBg | undefined) => void;
  onSetNotes: (value: string) => void;
  onSetImage: (url: string | undefined) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  deckSettings: DeckSettings;
  onPatchDeckSettings: (patch: Partial<DeckSettings>) => void;
}) {
  const { deck, idx, theme, themeId, setThemeId, accentId, setAccentId, onSelect, onPrev, onNext, onEditSlide, onAddSlide, onDuplicate, onDelete, onMove, onReorder, onChangeLayout, onAddLine, onRemoveLine, onSetBg, onSetBgAll, onSetNotes, onSetImage, onUndo, onRedo, canUndo, canRedo, deckSettings, onPatchDeckSettings } = props;
  // Drag-reorder state for the filmstrip.
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  if (!deck.length) return null;
  return (
    <>
      {/* persistent editor ribbon */}
      <EditorToolbar
        kind={deck[idx].kind}
        idx={idx}
        total={deck.length}
        theme={theme}
        themeId={themeId}
        setThemeId={setThemeId}
        accentId={accentId}
        setAccentId={setAccentId}
        onAddSlide={onAddSlide}
        onChangeLayout={onChangeLayout}
        onDuplicate={onDuplicate}
        onMove={onMove}
        onDelete={onDelete}
        onUndo={onUndo}
        onRedo={onRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        bg={deck[idx].bg}
        onSetBg={onSetBg}
        onSetBgAll={onSetBgAll}
        deckSettings={deckSettings}
        onPatchDeckSettings={onPatchDeckSettings}
      />

      {/* body: filmstrip + canvas */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {/* left filmstrip */}
        <aside className="sl-hide-sm" style={{ width: 176, flex: 'none', borderRight: `1px solid ${C.borderSoft}`, background: 'rgba(255,255,255,.55)', backdropFilter: 'blur(8px)', overflowY: 'auto', padding: '14px 14px 40px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '1px', color: C.faintLabel, marginBottom: 4, paddingLeft: 4 }}>ស្លាយ · {toKh(deck.length)}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 700, color: C.faintLabel, marginBottom: 12, paddingLeft: 4 }}>
            <GripVertical size={11} /> អូសដើម្បីរៀបលំដាប់
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {deck.map((sl, i) => {
              const active = i === idx;
              const isDragging = dragIdx === i;
              const isOver = overIdx === i && dragIdx !== null && dragIdx !== i;
              return (
                <div
                  key={i}
                  draggable
                  onDragStart={(e) => { setDragIdx(i); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', String(i)); } catch { /* ignore */ } }}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (overIdx !== i) setOverIdx(i); }}
                  onDrop={(e) => { e.preventDefault(); if (dragIdx !== null) onReorder(dragIdx, i); setDragIdx(null); setOverIdx(null); }}
                  onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
                  onClick={() => onSelect(i)}
                  title="អូសដើម្បីផ្លាស់ទីលំដាប់"
                  className="sl-film-item"
                  style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 9, padding: 0, cursor: 'grab', textAlign: 'left', opacity: isDragging ? 0.4 : 1, transition: 'opacity .15s, transform .15s' }}
                >
                  {isOver && <span aria-hidden style={{ position: 'absolute', top: -7, left: 22, right: 0, height: 3, borderRadius: 3, background: C.accent, boxShadow: '0 0 0 3px rgba(109,91,240,.18)' }} />}
                  <span className="sl-film-grip" style={{ fontFamily: KO, fontSize: 12, width: 18, flex: 'none', color: active ? C.accent : C.faintLabel, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="sl-film-no">{sl.no}</span>
                    <GripVertical className="sl-film-gripicon" size={13} />
                  </span>
                  <span style={{ flex: 1, borderRadius: 9, overflow: 'hidden', border: `2px solid ${active ? C.accent : isOver ? `${C.accent}66` : 'transparent'}`, boxShadow: active ? '0 8px 20px -10px rgba(109,91,240,.5)' : '0 2px 8px -4px rgba(28,27,25,.25)', transition: 'all .15s', pointerEvents: 'none' }}>
                    <ScaledSlide slide={sl} theme={theme} total={deck.length} width="100%" deckSettings={deckSettings} />
                  </span>
                </div>
              );
            })}
          </div>
        </aside>

        {/* canvas */}
        <div style={{ flex: 1, minWidth: 0, position: 'relative', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <DotGrid />
          {/* slide stage */}
          <div style={{ position: 'relative', flex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: 16, padding: '34px 20px 70px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, maxWidth: '100%' }}>
              <NavArrow onClick={onPrev} disabled={idx <= 0}><ChevronLeft size={22} /></NavArrow>
              <div key={idx} className="sl-stage-in" style={{ maxWidth: '100%' }}>
                <ScaledSlide slide={deck[idx]} theme={theme} total={deck.length} width={820} shadow edit={onEditSlide} onAddLine={onAddLine} onRemoveLine={onRemoveLine} onSetImage={onSetImage} deckSettings={deckSettings} />
              </div>
              <NavArrow onClick={onNext} disabled={idx >= deck.length - 1}><ChevronRight size={22} /></NavArrow>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 100, background: C.panel, border: `1px solid ${C.borderSoft}`, fontSize: 12.5, fontWeight: 700, color: C.muted2, fontFamily: KO }}>
              {toKh(idx + 1)} / {toKh(deck.length)}
            </div>

            {/* speaker notes for the current slide (key includes value so
                undo/redo of notes re-syncs the uncontrolled textarea) */}
            <NotesPanel key={`${idx}|${deck[idx].notes || ''}`} value={deck[idx].notes || ''} onCommit={onSetNotes} />
          </div>
        </div>
      </div>
    </>
  );
}

// Speaker-notes editor under the slide stage. Uncontrolled (keyed by slide
// index so it resets on slide change) — commits to deck state on blur.
function NotesPanel({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [expanded, setExpanded] = useState(!!value.trim());
  const [focused, setFocused] = useState(false);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 4, padding: '8px 16px', borderRadius: 100, border: `1.5px dashed ${C.border}`, background: C.panel, color: C.muted2, cursor: 'pointer', fontFamily: KH, fontSize: 12.5, fontWeight: 700, transition: 'border-color .15s, color .15s' }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted2; }}
      >
        <StickyNote size={13} /> បន្ថែមកំណត់ចំណាំវាគ្មិន
      </button>
    );
  }

  return (
    <div style={{ width: 820, maxWidth: 'calc(100vw - 120px)', marginTop: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7, paddingLeft: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 20, height: 20, borderRadius: 7, background: ACCENT_SOFT, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            <StickyNote size={11} style={{ color: C.accent }} />
          </span>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.4px', color: C.muted2 }}>កំណត់ចំណាំវាគ្មិន</span>
          <span style={{ fontSize: 10.5, color: C.faintLabel }}>· បង្ហាញតែពេលបង្ហាញ (ចុច N)</span>
        </div>
        {!value.trim() && (
          <button onClick={() => setExpanded(false)} title="លាក់" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: C.faintLabel, display: 'flex', alignItems: 'center' }}>
            <ChevronUp size={15} />
          </button>
        )}
      </div>
      <textarea
        autoFocus={!value.trim()}
        defaultValue={value}
        onFocus={() => setFocused(true)}
        onBlur={(e) => { setFocused(false); if (e.target.value !== value) onCommit(e.target.value); }}
        placeholder="សរសេរចំណាំសម្រាប់ការបង្រៀន — អ្វីដែលអ្នកនឹងនិយាយលើស្លាយនេះ…"
        rows={3}
        style={{ width: '100%', resize: 'vertical', minHeight: 66, padding: '12px 14px', borderRadius: 14, border: `1.5px solid ${focused ? C.accent : C.borderSoft}`, borderTop: `2.5px solid ${focused ? C.accent : `${C.accent}55`}`, boxShadow: focused ? '0 0 0 3px rgba(109,91,240,.14)' : '0 2px 10px -6px rgba(28,27,25,.2)', background: C.panel, color: C.body, fontFamily: KH, fontSize: 14, lineHeight: 1.7, outline: 'none', transition: 'border-color .15s, box-shadow .15s', boxSizing: 'border-box' }}
      />
    </div>
  );
}

// Small dropdown for picking a slide kind (used by Add + Change-layout).
function KindMenu({ label, icon, onPick, currentKind }: { label: string; icon: React.ReactNode; onPick: (k: Slide['kind']) => void; currentKind?: Slide['kind'] }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <RibBtn onClick={() => setOpen((o) => !o)} title={label}>{icon}<span className="sl-hide-sm">{label}</span><ChevronDown size={13} /></RibBtn>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 41, minWidth: 150, padding: 5, borderRadius: 12, background: C.panel, border: `1px solid ${C.border}`, boxShadow: '0 14px 32px -14px rgba(28,27,25,.45)' }}>
            {SLIDE_KINDS.map((k) => (
              <button key={k.id} onClick={() => { onPick(k.id); setOpen(false); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: currentKind === k.id ? '#efecff' : 'transparent', fontFamily: KH, fontSize: 13, fontWeight: 700, color: C.body, textAlign: 'left' }}>
                {k.name}
                {currentKind === k.id && <Check size={14} style={{ color: C.accent }} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Background picker — abstract presets gallery + image (upload / URL).
function BgMenu({ bg, theme, onPick, onAll }: { bg?: SlideBg; theme: Theme; onPick: (b: SlideBg | undefined) => void; onAll: (b: SlideBg | undefined) => void }) {
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(false);
  const [url, setUrl] = useState('');
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const apply = (b: SlideBg | undefined) => {
    (all ? onAll : onPick)(b);
    setOpen(false);
  };
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      setErr('រូបភាពធំពេក (≤ ២MB)');
      return;
    }
    const r = new FileReader();
    r.onload = () => apply({ type: 'image', value: String(r.result) });
    r.readAsDataURL(f);
  };
  const tile = (id: string, active: boolean, style: React.CSSProperties, onClick: () => void, label: string) => (
    <button key={id} onClick={onClick} title={label} style={{ padding: 0, border: `2px solid ${active ? C.accent : 'transparent'}`, borderRadius: 9, cursor: 'pointer', overflow: 'hidden', background: 'transparent', boxShadow: active ? '0 0 0 2px rgba(109,91,240,.2)' : 'none' }}>
      <span style={{ display: 'block', width: '100%', height: 40, borderRadius: 7, border: `1px solid ${C.borderSoft}`, ...style }} />
      <span style={{ display: 'block', fontSize: 9.5, fontWeight: 700, color: C.muted2, padding: '3px 0 1px', textAlign: 'center' }}>{label}</span>
    </button>
  );

  return (
    <div style={{ position: 'relative' }}>
      <RibBtn onClick={() => setOpen((o) => !o)} title="ផ្ទៃខាងក្រោយ"><Wallpaper size={15} /><span className="sl-hide-md">ផ្ទៃ</span><ChevronDown size={12} /></RibBtn>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div style={{ position: 'absolute', top: '120%', right: 0, zIndex: 41, width: 300, maxHeight: 'min(70vh, 540px)', overflowY: 'auto', padding: 14, borderRadius: 16, background: C.panel, border: `1px solid ${C.border}`, boxShadow: '0 20px 44px -16px rgba(28,27,25,.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontFamily: KO, fontSize: 14, color: C.ink }}>ផ្ទៃខាងក្រោយ</span>
              <button onClick={() => setAll((a) => !a)} title="ដាក់គ្រប់ស្លាយ" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 100, cursor: 'pointer', border: `1px solid ${all ? C.accent : C.border}`, background: all ? ACCENT_SOFT : '#fff', color: all ? C.accent : C.muted2, fontSize: 11, fontWeight: 700 }}>
                {all && <Check size={12} />} ទាំងអស់
              </button>
            </div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.8px', color: C.faintLabel, marginBottom: 7 }}>រចនាបថ</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7 }}>
              {tile('none', !bg, { background: theme.bg, position: 'relative' }, () => apply(undefined), 'គ្មាន')}
              {ABSTRACTS.map((a) => tile(a.id, bg?.type === 'abstract' && bg.value === a.id, a.css(theme), () => apply({ type: 'abstract', value: a.id }), a.name))}
            </div>

            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.8px', color: C.faintLabel, margin: '14px 0 7px' }}>ពណ៌ Gradient</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7 }}>
              {GRADIENTS.map((g) => tile(g.id, bg?.type === 'gradient' && bg.value === g.id, { backgroundImage: g.css }, () => apply({ type: 'gradient', value: g.id }), g.name))}
            </div>

            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.8px', color: C.faintLabel, margin: '14px 0 7px' }}>សិល្បៈ</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7 }}>
              {SCENES.map((s) => tile(s.id, bg?.type === 'image' && bg.value === s.dataUrl, { backgroundImage: `url("${s.dataUrl}")`, backgroundSize: 'cover', backgroundPosition: 'center' }, () => apply({ type: 'image', value: s.dataUrl }), s.name))}
            </div>

            <div style={{ height: 1, background: C.borderSoft, margin: '12px 0' }} />
            <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />
            <button onClick={() => fileRef.current?.click()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%', padding: '10px', borderRadius: 10, cursor: 'pointer', border: `1px dashed ${C.border}`, background: '#faf9ff', color: C.accent, fontFamily: KH, fontSize: 12.5, fontWeight: 700 }}>
              <Upload size={15} /> បញ្ចូលរូបភាព
            </button>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="បិទភ្ជាប់ URL រូបភាព" style={{ ...inputStyle, padding: '8px 10px', fontSize: 12 }} />
              <button onClick={() => { if (url.trim()) apply({ type: 'image', value: url.trim() }); }} style={{ flex: 'none', padding: '0 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: ACCENT_GRAD, color: '#fff', fontFamily: KH, fontSize: 12.5, fontWeight: 700 }}>ប្រើ</button>
            </div>
            {err && <div style={{ marginTop: 8, fontSize: 11.5, color: '#b8472f' }}>{err}</div>}
          </div>
        </>
      )}
    </div>
  );
}

// Small pill switch used inside the header/footer settings popover.
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      style={{ position: 'relative', width: 34, height: 20, borderRadius: 100, border: 'none', cursor: 'pointer', background: on ? C.accent : 'rgba(28,27,25,.16)', flex: 'none', transition: 'background .15s' }}
    >
      <span style={{ position: 'absolute', top: 2, left: on ? 16 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.3)', transition: 'left .15s' }} />
    </button>
  );
}

function SettingsRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '7px 0' }}>
      <span style={{ fontFamily: KH, fontSize: 12.5, fontWeight: 700, color: C.body }}>{label}</span>
      {children}
    </div>
  );
}

// Deck-wide header/footer settings — logo, footer text, page number, and a
// choice of footer layout templates (like PowerPoint's Header & Footer dialog).
function HeaderFooterMenu({ settings, onPatch }: { settings: DeckSettings; onPatch: (patch: Partial<DeckSettings>) => void }) {
  const [open, setOpen] = useState(false);
  const layoutPreview = (id: FooterLayout): React.ReactNode => {
    const dot = <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.accent, flex: 'none' }} />;
    const bar = <span style={{ width: 14, height: 4, borderRadius: 2, background: C.faintLabel, flex: 'none' }} />;
    if (id === 'minimal') return <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>{bar}</div>;
    if (id === 'centered') return <div style={{ display: 'flex', justifyContent: 'center', gap: 4, width: '100%' }}>{dot}{bar}</div>;
    if (id === 'split') return <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>{dot}{bar}</div>;
    return <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span style={{ display: 'flex', gap: 3 }}>{dot}{bar}</span>{bar}</div>;
  };
  return (
    <div style={{ position: 'relative' }}>
      <RibBtn onClick={() => setOpen((o) => !o)} title="ក្បាល / បាតទំព័រ"><PanelBottom size={15} /><span className="sl-hide-md">ក្បាល/បាត</span><ChevronDown size={12} /></RibBtn>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div style={{ position: 'absolute', top: '120%', left: 0, zIndex: 41, width: 300, maxHeight: 'min(70vh, 560px)', overflowY: 'auto', padding: 14, borderRadius: 16, background: C.panel, border: `1px solid ${C.border}`, boxShadow: '0 20px 44px -16px rgba(28,27,25,.5)' }}>
            <div style={{ fontFamily: KO, fontSize: 14, color: C.ink, marginBottom: 10 }}>ក្បាល & បាតទំព័រ</div>

            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.8px', color: C.faintLabel, marginBottom: 6 }}>គំរូបាតទំព័រ</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 12 }}>
              {FOOTER_LAYOUTS.map((l) => {
                const active = settings.footerLayout === l.id;
                return (
                  <button key={l.id} onClick={() => onPatch({ footerLayout: l.id })} title={l.name} style={{ padding: 0, border: `1.5px solid ${active ? C.accent : C.borderSoft}`, borderRadius: 9, cursor: 'pointer', background: active ? ACCENT_SOFT : '#fff', overflow: 'hidden' }}>
                    <span style={{ display: 'flex', alignItems: 'center', height: 30, padding: '0 6px', width: '100%', boxSizing: 'border-box' }}>{layoutPreview(l.id)}</span>
                    <span style={{ display: 'block', fontSize: 9.5, fontWeight: 700, color: active ? C.accent : C.muted2, padding: '2px 0 4px', textAlign: 'center' }}>{l.name}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ height: 1, background: C.borderSoft, margin: '4px 0 4px' }} />
            <SettingsRow label="ឡូហ្គោ">
              <Toggle on={settings.footerLogo} onChange={(v) => onPatch({ footerLogo: v })} />
            </SettingsRow>
            <SettingsRow label="អត្ថបទបាតទំព័រ">
              <Toggle on={settings.footerTextEnabled} onChange={(v) => onPatch({ footerTextEnabled: v })} />
            </SettingsRow>
            {settings.footerTextEnabled && (
              <input
                value={settings.footerText}
                onChange={(e) => onPatch({ footerText: e.target.value })}
                placeholder="ឧ. ឈ្មោះសាលា, មុខវិជ្ជា…"
                style={{ ...inputStyle, marginBottom: 8, padding: '8px 10px', fontSize: 12.5 }}
              />
            )}
            <SettingsRow label="លេខទំព័រ">
              <Toggle on={settings.pageNumber} onChange={(v) => onPatch({ pageNumber: v })} />
            </SettingsRow>

            <div style={{ height: 1, background: C.borderSoft, margin: '8px 0 4px' }} />
            <SettingsRow label="ក្បាលទំព័រ (Header)">
              <Toggle on={settings.headerEnabled} onChange={(v) => onPatch({ headerEnabled: v })} />
            </SettingsRow>
            {settings.headerEnabled && (
              <>
                <input
                  value={settings.headerText}
                  onChange={(e) => onPatch({ headerText: e.target.value })}
                  placeholder="ឧ. ថ្ងៃទី ១ កក្កដា ២០២៦"
                  style={{ ...inputStyle, marginBottom: 8, padding: '8px 10px', fontSize: 12.5 }}
                />
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  {(['left', 'right'] as const).map((a) => (
                    <button key={a} onClick={() => onPatch({ headerAlign: a })} style={{ flex: 1, padding: '7px 0', borderRadius: 9, cursor: 'pointer', border: `1.5px solid ${settings.headerAlign === a ? C.accent : C.borderSoft}`, background: settings.headerAlign === a ? ACCENT_SOFT : '#fff', color: settings.headerAlign === a ? C.accent : C.muted2, fontFamily: KH, fontSize: 12, fontWeight: 700 }}>
                      {a === 'left' ? 'ឆ្វេង' : 'ស្ដាំ'}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div style={{ height: 1, background: C.borderSoft, margin: '4px 0 8px' }} />
            <button onClick={() => onPatch({ showOnCover: !settings.showOnCover })} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '2px 0', border: 'none', background: 'transparent', cursor: 'pointer' }}>
              <span style={{ width: 16, height: 16, borderRadius: 5, border: `1.5px solid ${settings.showOnCover ? C.accent : C.border}`, background: settings.showOnCover ? C.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                {settings.showOnCover && <Check size={11} style={{ color: '#fff' }} strokeWidth={3} />}
              </span>
              <span style={{ fontFamily: KH, fontSize: 12, fontWeight: 700, color: C.muted2, textAlign: 'left' }}>បង្ហាញលើស្លាយក្រប</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Content-image picker for a `media` slide — upload / URL, sits as a small
// trigger button overlaid on the image box (only rendered while editing).
function MediaImageMenu({ image, onSet }: { image?: string; onSet: (url: string | undefined) => void }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) {
      setErr('រូបភាពធំពេក (≤ ៤MB)');
      return;
    }
    const r = new FileReader();
    r.onload = () => { onSet(String(r.result)); setOpen(false); };
    r.readAsDataURL(f);
  };
  return (
    <div style={{ position: 'relative' }}>
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
        title="ប្តូររូបភាព"
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 9, border: 'none', cursor: 'pointer', background: 'rgba(15,12,10,.55)', backdropFilter: 'blur(4px)', color: '#fff' }}
      >
        <ImageIcon size={15} />
      </button>
      {open && (
        <>
          <div onMouseDown={(e) => e.preventDefault()} onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div onMouseDown={(e) => e.preventDefault()} style={{ position: 'absolute', top: '115%', right: 0, zIndex: 41, width: 240, padding: 12, borderRadius: 14, background: C.panel, border: `1px solid ${C.border}`, boxShadow: '0 16px 34px -14px rgba(28,27,25,.45)' }}>
            <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />
            <button onClick={() => fileRef.current?.click()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%', padding: 10, borderRadius: 10, cursor: 'pointer', border: `1px dashed ${C.border}`, background: '#faf9ff', color: C.accent, fontFamily: KH, fontSize: 12.5, fontWeight: 700 }}>
              <Upload size={15} /> បញ្ចូលរូបភាព
            </button>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL រូបភាព" style={{ ...inputStyle, padding: '8px 10px', fontSize: 12 }} />
              <button onClick={() => { if (url.trim()) { onSet(url.trim()); setOpen(false); } }} style={{ flex: 'none', padding: '0 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: ACCENT_GRAD, color: '#fff', fontFamily: KH, fontSize: 12.5, fontWeight: 700 }}>ប្រើ</button>
            </div>
            {image && (
              <button onClick={() => { onSet(undefined); setOpen(false); }} style={{ marginTop: 8, width: '100%', padding: '8px 0', borderRadius: 9, border: 'none', cursor: 'pointer', background: 'transparent', color: '#b8472f', fontFamily: KH, fontSize: 12, fontWeight: 700 }}>
                លុបរូបភាព
              </button>
            )}
            {err && <div style={{ marginTop: 8, fontSize: 11.5, color: '#b8472f' }}>{err}</div>}
          </div>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Present (fullscreen)
// ════════════════════════════════════════════════════════════════════
function Present({ deck, idx, theme, onPrev, onNext, onClose, deckSettings }: { deck: Slide[]; idx: number; theme: Theme; onPrev: () => void; onNext: () => void; onClose: () => void; deckSettings: DeckSettings }) {
  const [showNotes, setShowNotes] = useState(false);
  const notes = (deck[idx].notes || '').trim();
  // 'N' toggles the presenter-notes overlay.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setShowNotes((s) => !s);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: '#0b0907', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 'min(96vw, calc(94vh * 880 / 495))' }}>
        <ScaledSlide slide={deck[idx]} theme={theme} total={deck.length} width="100%" deckSettings={deckSettings} />
      </div>

      <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, width: 40, height: 40, borderRadius: 10, border: 'none', background: 'rgba(255,255,255,.12)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Exit">
        <X size={20} />
      </button>

      {/* presenter-notes toggle */}
      <button onClick={() => setShowNotes((s) => !s)} title="បង្ហាញ/លាក់ចំណាំវាគ្មិន (N)" style={{ position: 'absolute', top: 20, right: 70, width: 40, height: 40, borderRadius: 10, border: 'none', background: showNotes ? 'rgba(232,176,106,.9)' : 'rgba(255,255,255,.12)', color: showNotes ? '#241d18' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Toggle notes">
        <StickyNote size={18} />
      </button>

      <button onClick={onPrev} disabled={idx <= 0} style={presentArrow('left', idx <= 0)} aria-label="Previous">
        <ChevronLeft size={26} />
      </button>
      <button onClick={onNext} disabled={idx >= deck.length - 1} style={presentArrow('right', idx >= deck.length - 1)} aria-label="Next">
        <ChevronRight size={26} />
      </button>

      {/* presenter-notes overlay (only the presenter reveals it) */}
      {showNotes && (
        <div style={{ position: 'absolute', bottom: 64, left: '50%', transform: 'translateX(-50%)', width: 'min(760px, 90vw)', maxHeight: '34vh', overflowY: 'auto', padding: '16px 20px', borderRadius: 16, background: 'rgba(15,12,10,.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,.14)', boxShadow: '0 20px 50px -20px rgba(0,0,0,.7)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8, fontSize: 11, fontWeight: 800, letterSpacing: '.5px', color: '#e8b06a' }}>
            <StickyNote size={13} /> កំណត់ចំណាំវាគ្មិន · ស្លាយ {toKh(idx + 1)}
          </div>
          <div style={{ fontFamily: KH, fontSize: 15, lineHeight: 1.85, color: '#f3ece0', whiteSpace: 'pre-wrap' }}>
            {notes || 'គ្មានចំណាំសម្រាប់ស្លាយនេះ។'}
          </div>
        </div>
      )}

      <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', padding: '7px 16px', borderRadius: 100, background: 'rgba(255,255,255,.12)', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: KO }}>
        {toKh(idx + 1)} / {toKh(deck.length)}
      </div>
    </div>
  );
}

function presentArrow(side: 'left' | 'right', disabled: boolean): React.CSSProperties {
  return {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    [side]: 20,
    width: 48,
    height: 48,
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(255,255,255,.12)',
    color: '#fff',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.25 : 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
}

// ════════════════════════════════════════════════════════════════════
// Slide rendering — native 880×495, scaled by the container
// ════════════════════════════════════════════════════════════════════
function ScaledSlide({ slide, theme, total, width, shadow, edit, onAddLine, onRemoveLine, onSetImage, deckSettings }: { slide: Slide; theme: Theme; total: number; width: number | string; shadow?: boolean; edit?: (patch: EditPatch) => void; onAddLine?: (index: number) => void; onRemoveLine?: (index: number) => void; onSetImage?: (url: string | undefined) => void; deckSettings?: DeckSettings }) {
  // The native 880×495 board is always scaled to the *actual* rendered width via
  // a container query (100cqw / 880). This keeps the scale honest even when
  // maxWidth clamps the wrapper on a narrow viewport, so the board never clips.
  return (
    <div
      style={{
        width,
        aspectRatio: `${SLIDE_W} / ${SLIDE_H}`,
        maxWidth: typeof width === 'number' ? 'calc(100vw - 120px)' : '100%',
        borderRadius: 10,
        overflow: 'hidden',
        position: 'relative',
        boxShadow: shadow ? '0 30px 70px -34px rgba(20,12,4,.6), 0 2px 6px rgba(20,12,4,.12)' : 'none',
        background: theme.bg,
        containerType: 'inline-size',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, width: SLIDE_W, height: SLIDE_H, transform: `scale(calc(100cqw / ${SLIDE_W}px))`, transformOrigin: 'top left' }}>
        <SlideBoard slide={slide} theme={theme} total={total} edit={edit} onAddLine={onAddLine} onRemoveLine={onRemoveLine} onSetImage={onSetImage} deckSettings={deckSettings} />
      </div>
    </div>
  );
}

// Strip anything unsafe before storing user-authored slide HTML.
function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined') return html;
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  tpl.content.querySelectorAll('*').forEach((el) => {
    if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK'].includes(el.tagName)) {
      el.remove();
      return;
    }
    [...el.attributes].forEach((a) => {
      if (/^on/i.test(a.name) || (/^(href|src)$/i.test(a.name) && /^\s*javascript:/i.test(a.value))) el.removeAttribute(a.name);
    });
  });
  return tpl.innerHTML;
}

// Inline rich-text node. Uncontrolled: HTML is written to the DOM via a ref only
// when the value prop actually changes (tracked with `last`), so React never
// reconciles the contentEditable's children — no cursor jumps, and live
// formatting from the selection toolbar survives unrelated re-renders (theme,
// etc.). Edits commit (sanitized) to deck state on blur.
function Editable({ value, onCommit, style }: { value: string; onCommit: (v: string) => void; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const last = useRef(value);
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = value;
    last.current = value;
  }, []); // mount
  useEffect(() => {
    if (value !== last.current && ref.current) {
      ref.current.innerHTML = value;
      last.current = value;
    }
  }, [value]);
  return (
    <div
      ref={ref}
      data-sl-editable="1"
      className="sl-ed"
      contentEditable
      suppressContentEditableWarning
      onBlur={(e) => {
        const html = sanitizeHtml(e.currentTarget.innerHTML);
        if (html !== value) onCommit(html);
      }}
      style={{ outline: 'none', cursor: 'text', borderRadius: 4, ...style }}
    />
  );
}

// ════════════════════════════════════════════════════════════════════
// Persistent rich-text + slide-ops toolbar (always visible, like Google
// Slides / PowerPoint). Text-format buttons preserve the editable selection
// via onMouseDown preventDefault, then run document.execCommand on it.
// ════════════════════════════════════════════════════════════════════
const TEXT_COLORS = ['#1c1b19', '#ffffff', '#a84d22', '#c0503f', '#3f7a52', '#4a5d8a', '#6d5bf0', '#c98a2b'];
const HILITE_COLORS = ['#fbe8b0', '#cdeacb', '#cfe0f5', '#e7e1ff', '#f6d3c4', 'transparent'];
const FONT_SIZES = [
  { px: '16px', label: 'តូច' },
  { px: '22px', label: 'ធម្មតា' },
  { px: '30px', label: 'ធំ' },
  { px: '42px', label: 'ធំខ្លាំង' },
  { px: '56px', label: 'ចំណងជើង' },
];
const FONT_FAMILIES = [
  { v: "'Battambang', sans-serif", label: 'Battambang' },
  { v: "'Koulen', sans-serif", label: 'Koulen' },
  { v: "'Moul', serif", label: 'Moul' },
  { v: "'Hanuman', serif", label: 'Hanuman' },
  { v: "'Suwannaphum', serif", label: 'Suwannaphum' },
  { v: "'Content', sans-serif", label: 'Content' },
];

function fmtExec(cmd: string, val?: string) {
  document.execCommand('styleWithCSS', false, 'true');
  document.execCommand(cmd, false, val);
}
function fmtFontSize(px: string) {
  document.execCommand('styleWithCSS', false, 'true');
  document.execCommand('fontSize', false, '7');
  document.querySelectorAll('font[size="7"]').forEach((f) => {
    const s = document.createElement('span');
    s.style.fontSize = px;
    while (f.firstChild) s.appendChild(f.firstChild);
    f.replaceWith(s);
  });
}

function EditorToolbar(props: {
  kind: Slide['kind'];
  idx: number;
  total: number;
  themeId: string;
  setThemeId: (v: string) => void;
  accentId: string;
  setAccentId: (v: string) => void;
  onAddSlide: (k: Slide['kind']) => void;
  onChangeLayout: (k: Slide['kind']) => void;
  onDuplicate: () => void;
  onMove: (d: -1 | 1) => void;
  onDelete: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  theme: Theme;
  bg?: SlideBg;
  onSetBg: (b: SlideBg | undefined) => void;
  onSetBgAll: (b: SlideBg | undefined) => void;
  deckSettings: DeckSettings;
  onPatchDeckSettings: (patch: Partial<DeckSettings>) => void;
}) {
  const { kind, idx, total, themeId, setThemeId, accentId, setAccentId, onAddSlide, onChangeLayout, onDuplicate, onMove, onDelete, onUndo, onRedo, canUndo, canRedo, theme, bg, onSetBg, onSetBgAll, deckSettings, onPatchDeckSettings } = props;
  const [menu, setMenu] = useState<null | 'font' | 'size' | 'color' | 'hilite'>(null);
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [curFont, setCurFont] = useState('Battambang');
  const [curSize, setCurSize] = useState('ធម្មតា');
  const [curColor, setCurColor] = useState(C.accent);
  const [curHilite, setCurHilite] = useState('#fbe8b0');
  const tog = (m: typeof menu) => setMenu((x) => (x === m ? null : m));

  // Live formatting state — buttons light up when the selection is bold/aligned.
  useEffect(() => {
    const update = () => {
      try {
        setActive({
          bold: document.queryCommandState('bold'),
          italic: document.queryCommandState('italic'),
          underline: document.queryCommandState('underline'),
          strikeThrough: document.queryCommandState('strikeThrough'),
          justifyLeft: document.queryCommandState('justifyLeft'),
          justifyCenter: document.queryCommandState('justifyCenter'),
          justifyRight: document.queryCommandState('justifyRight'),
        });
      } catch {
        /* not in an editable */
      }
    };
    document.addEventListener('selectionchange', update);
    return () => document.removeEventListener('selectionchange', update);
  }, []);

  return (
    <div className="sl-no-print sl-ribbon" style={{ flex: 'none', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', padding: '10px 18px', borderBottom: `1px solid ${C.borderSoft}`, background: 'linear-gradient(180deg, rgba(247,245,255,.85), rgba(246,245,242,.8))', backdropFilter: 'blur(16px)', position: 'sticky', top: 0, zIndex: 5 }}>
      {/* undo / redo */}
      <RibGroup>
        <RibBtn onClick={onUndo} disabled={!canUndo} title="មិនធ្វើវិញ (Ctrl+Z)"><Undo2 size={16} /></RibBtn>
        <RibBtn onClick={onRedo} disabled={!canRedo} title="ធ្វើវិញ (Ctrl+Y)"><Redo2 size={16} /></RibBtn>
      </RibGroup>

      {/* slide ops */}
      <RibGroup icon={<Layers size={14} />}>
        <KindMenu label="បន្ថែម" icon={<Plus size={15} />} onPick={onAddSlide} />
        <KindMenu label="Layout" icon={<LayoutTemplate size={15} />} onPick={onChangeLayout} currentKind={kind} />
        <Rule />
        <RibBtn onClick={onDuplicate} title="ចម្លងស្លាយ"><Copy size={15} /></RibBtn>
        <RibBtn onClick={() => onMove(-1)} disabled={idx <= 0} title="ផ្លាស់ឡើង"><ChevronUp size={16} /></RibBtn>
        <RibBtn onClick={() => onMove(1)} disabled={idx >= total - 1} title="ផ្លាស់ចុះ"><ChevronDown size={16} /></RibBtn>
        <RibBtn onClick={onDelete} disabled={total <= 1} danger title="លុបស្លាយ"><Trash2 size={15} /></RibBtn>
      </RibGroup>

      {/* text format */}
      <RibGroup hold icon={<span style={{ fontFamily: KO, fontSize: 13, paddingTop: 1 }}>Aa</span>}>
        <Popover open={menu === 'font'} onToggle={() => tog('font')} title="ពុម្ពអក្សរ" button={<><span style={{ fontSize: 12.5, fontWeight: 700, maxWidth: 78, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{curFont}</span><ChevronDown size={12} /></>}>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 156 }}>
            {FONT_FAMILIES.map((f) => (
              <button key={f.v} onMouseDown={(e) => e.preventDefault()} onClick={() => { fmtExec('fontName', f.v); setCurFont(f.label); setMenu(null); }} style={{ ...menuItemStyle, fontFamily: f.v, justifyContent: 'flex-start' }}>{f.label}</button>
            ))}
          </div>
        </Popover>
        <Popover open={menu === 'size'} onToggle={() => tog('size')} title="ទំហំអក្សរ" button={<><span style={{ fontSize: 12.5, fontWeight: 700 }}>{curSize}</span><ChevronDown size={12} /></>}>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 130 }}>
            {FONT_SIZES.map((s) => (
              <button key={s.px} onMouseDown={(e) => e.preventDefault()} onClick={() => { fmtFontSize(s.px); setCurSize(s.label); setMenu(null); }} style={menuItemStyle}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{s.label}</span>
                <span style={{ fontSize: 11, color: C.muted }}>{s.px.replace('px', '')}</span>
              </button>
            ))}
          </div>
        </Popover>
        <Rule />
        <RibBtn hold active={active.bold} onClick={() => fmtExec('bold')} title="ដិត (Ctrl+B)"><Bold size={15} /></RibBtn>
        <RibBtn hold active={active.italic} onClick={() => fmtExec('italic')} title="ទ្រេត (Ctrl+I)"><Italic size={15} /></RibBtn>
        <RibBtn hold active={active.underline} onClick={() => fmtExec('underline')} title="គូសបន្ទាត់ (Ctrl+U)"><Underline size={15} /></RibBtn>
        <RibBtn hold active={active.strikeThrough} onClick={() => fmtExec('strikeThrough')} title="គូសឆូត"><Strikethrough size={15} /></RibBtn>
        <Popover open={menu === 'color'} onToggle={() => tog('color')} title="ពណ៌អក្សរ" button={<span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}><Baseline size={15} /><span style={{ width: 15, height: 3, borderRadius: 2, background: curColor }} /></span>}>
          <Swatches colors={TEXT_COLORS} onPick={(c) => { fmtExec('foreColor', c); setCurColor(c); setMenu(null); }} />
        </Popover>
        <Popover open={menu === 'hilite'} onToggle={() => tog('hilite')} title="ពណ៌បន្លិច" button={<span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}><Highlighter size={15} /><span style={{ width: 15, height: 3, borderRadius: 2, background: curHilite }} /></span>}>
          <Swatches colors={HILITE_COLORS} onPick={(c) => { fmtExec('hiliteColor', c === 'transparent' ? '#ffffff00' : c); setCurHilite(c === 'transparent' ? 'transparent' : c); setMenu(null); }} />
        </Popover>
        <Rule />
        <RibBtn hold active={active.justifyLeft} onClick={() => fmtExec('justifyLeft')} title="តម្រឹមឆ្វេង"><AlignLeft size={15} /></RibBtn>
        <RibBtn hold active={active.justifyCenter} onClick={() => fmtExec('justifyCenter')} title="តម្រឹមកណ្ដាល"><AlignCenter size={15} /></RibBtn>
        <RibBtn hold active={active.justifyRight} onClick={() => fmtExec('justifyRight')} title="តម្រឹមស្ដាំ"><AlignRight size={15} /></RibBtn>
        <RibBtn hold onClick={() => fmtExec('removeFormat')} title="សម្អាតទ្រង់ទ្រាយ"><RemoveFormatting size={15} /></RibBtn>
      </RibGroup>

      {/* design: background + theme + accent */}
      <RibGroup icon={<Palette size={14} />}>
        <BgMenu bg={bg} theme={theme} onPick={onSetBg} onAll={onSetBgAll} />
        <HeaderFooterMenu settings={deckSettings} onPatch={onPatchDeckSettings} />
        <Rule />
        {THEMES.map((t) => (
          <button key={t.id} onClick={() => setThemeId(t.id)} title={t.name} style={{ width: 24, height: 24, borderRadius: '50%', cursor: 'pointer', border: themeId === t.id ? `2px solid ${C.accent}` : '1px solid rgba(28,27,25,.16)', background: t.panel, flex: 'none', boxShadow: themeId === t.id ? '0 0 0 3px rgba(109,91,240,.16)' : 'none' }} />
        ))}
        <Rule />
        <Swatch color={(THEMES.find((t) => t.id === themeId) || THEMES[0]).accent} active={accentId === ''} onClick={() => setAccentId('')} title="ដើម" sm />
        {SLIDE_ACCENTS.map((a) => (
          <Swatch key={a.id} color={a.c} active={accentId === a.id} onClick={() => setAccentId(a.id)} title={a.name} sm />
        ))}
      </RibGroup>
    </div>
  );
}

// A grouped cluster of toolbar controls — a premium "control deck": soft
// violet-tinted gradient, hairline accent border, and a leading accent icon
// chip that labels the group. `hold` keeps the text selection alive.
function RibGroup({ children, hold, icon }: { children: React.ReactNode; hold?: boolean; icon?: React.ReactNode }) {
  return (
    <div onMouseDown={hold ? (e) => e.preventDefault() : undefined} style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '4px 6px', borderRadius: 14, background: 'linear-gradient(180deg,#ffffff,#f7f5ff)', border: '1px solid rgba(109,91,240,.16)', boxShadow: '0 6px 18px -13px rgba(109,91,240,.55), inset 0 1px 0 rgba(255,255,255,.9)' }}>
      {icon && (
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 9, background: ACCENT_SOFT, color: C.accent, flex: 'none', marginRight: 2 }}>{icon}</span>
      )}
      {children}
    </div>
  );
}

function Rule() {
  return <span style={{ width: 1, height: 18, background: 'rgba(109,91,240,.18)', margin: '0 4px', flex: 'none' }} />;
}

function RibBtn({ children, onClick, title, disabled, danger, hold, active }: { children: React.ReactNode; onClick: () => void; title: string; disabled?: boolean; danger?: boolean; hold?: boolean; active?: boolean }) {
  const base = disabled ? '#c2bdb4' : danger ? '#b8472f' : active ? C.accent : C.body;
  return (
    <button
      title={title}
      disabled={disabled}
      onMouseDown={hold ? (e) => e.preventDefault() : undefined}
      onClick={onClick}
      style={{ height: 32, minWidth: 32, padding: '0 7px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, border: 'none', borderRadius: 9, cursor: disabled ? 'not-allowed' : 'pointer', background: active ? ACCENT_SOFT : 'transparent', color: base, opacity: disabled ? 0.6 : 1, fontFamily: KH, fontSize: 12.5, fontWeight: 700, transition: 'background .12s' }}
      onMouseEnter={(e) => { if (!disabled && !active) e.currentTarget.style.background = danger ? '#fcebe7' : '#f1eef6'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

const menuItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '8px 10px',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  background: 'transparent',
  fontFamily: KH,
  color: C.body,
  textAlign: 'left',
};

function Popover({ open, onToggle, button, title, children }: { open: boolean; onToggle: () => void; button: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative' }}>
      <button
        title={title}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onToggle}
        style={{ height: 32, padding: '0 8px', display: 'flex', alignItems: 'center', gap: 3, border: 'none', borderRadius: 9, cursor: 'pointer', background: open ? '#e7e1ff' : 'transparent', color: C.body }}
      >
        {button}
      </button>
      {open && (
        <>
          <div onMouseDown={(e) => e.preventDefault()} onClick={onToggle} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div style={{ position: 'absolute', top: '120%', left: '50%', transform: 'translateX(-50%)', zIndex: 41, padding: 6, borderRadius: 12, background: C.panel, border: `1px solid ${C.border}`, boxShadow: '0 14px 34px -12px rgba(28,27,25,.4)' }}>
            {children}
          </div>
        </>
      )}
    </div>
  );
}

function Swatches({ colors, onPick }: { colors: string[]; onPick: (c: string) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, width: 132 }}>
      {colors.map((c) => (
        <button
          key={c}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onPick(c)}
          title={c}
          style={{ width: 26, height: 26, borderRadius: 7, cursor: 'pointer', background: c === 'transparent' ? '#fff' : c, border: c === '#ffffff' || c === 'transparent' ? '1px solid rgba(28,27,25,.16)' : '1px solid rgba(0,0,0,.12)', position: 'relative' }}
        >
          {c === 'transparent' && <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#b8472f' }}>⊘</span>}
        </button>
      ))}
    </div>
  );
}

function SlideBoard({ slide, theme, total, edit, onAddLine, onRemoveLine, onSetImage, deckSettings = DEFAULT_DECK_SETTINGS }: { slide: Slide; theme: Theme; total: number; edit?: (patch: EditPatch) => void; onAddLine?: (index: number) => void; onRemoveLine?: (index: number) => void; onSetImage?: (url: string | undefined) => void; deckSettings?: DeckSettings }) {
  const isDark = theme.bg === '#241d18';
  const subTint = isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.028)';
  const kh: React.CSSProperties = { fontFamily: KO, letterSpacing: '.5px' };
  const body: React.CSSProperties = { fontFamily: KH };

  // Line editing controls — only on the editable stage, for list-like kinds.
  const editingLines = !!(edit && onAddLine && onRemoveLine) && !!lineKind(slide);
  // A small "−" to delete a line; clicking commits after the blur of any focused line.
  const delBtn = (index: number) =>
    editingLines ? (
      <button onMouseDown={(e) => e.preventDefault()} onClick={() => onRemoveLine!(index)} title="លុបជួរ" style={{ flex: 'none', width: 28, height: 28, borderRadius: 9, border: 'none', cursor: 'pointer', background: isDark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.05)', color: theme.sub, display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', opacity: 0.85 }}>
        <Minus size={16} />
      </button>
    ) : null;
  // A dashed "+ add line" pill placed after a list.
  const addBtn = (afterIndex: number) =>
    editingLines ? (
      <button onMouseDown={(e) => e.preventDefault()} onClick={() => onAddLine!(afterIndex)} style={{ marginTop: 18, alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 100, border: `1.5px dashed ${theme.accent}66`, background: 'transparent', color: theme.accent, cursor: 'pointer', fontFamily: KH, fontSize: 16, fontWeight: 700 }}>
        <Plus size={17} /> បន្ថែមជួរ
      </button>
    ) : null;

  // Render a text node: inline rich-text editable on the result stage, static
  // HTML otherwise (thumbnails / present / config preview).
  const T = (field: EditField, value: string, style: React.CSSProperties, index = 0) =>
    edit ? (
      <Editable value={value} style={style} onCommit={(v) => edit({ field, index, value: v })} />
    ) : (
      <div style={style} dangerouslySetInnerHTML={{ __html: value }} />
    );

  const labelTag = (txt: string) => (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 15px', borderRadius: 100, background: subTint, marginBottom: 18 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: theme.dot }} />
      <span style={{ ...body, fontSize: 15, fontWeight: 700, color: theme.accent, letterSpacing: '.4px' }}>{txt}</span>
    </div>
  );
  const titleEl = (txt: string) => T('title', txt, { ...kh, fontSize: 42, lineHeight: 1.25, color: theme.ink, marginBottom: 8, overflowWrap: 'anywhere' });

  let content: React.ReactNode = null;

  if (slide.kind === 'title') {
    content = (
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 80px' }}>
        {T('kicker', slide.kicker, { ...body, fontSize: 15, fontWeight: 700, color: theme.accent, letterSpacing: '1px', marginBottom: 20, textTransform: 'uppercase', opacity: 0.9 })}
        {T('title', slide.title, { ...kh, fontSize: 64, lineHeight: 1.14, color: theme.ink, overflowWrap: 'anywhere' })}
        <div style={{ width: 80, height: 4, background: theme.accent, borderRadius: 3, margin: '26px 0 22px' }} />
        {T('sub', slide.sub, { ...body, fontSize: 22, color: theme.sub, lineHeight: 1.5 })}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 80px', borderTop: `1px solid ${theme.accent}18`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          {T('foot', slide.foot, { ...body, fontSize: 13, color: theme.sub, flex: 1 })}
          <div style={{ ...body, fontSize: 12, color: theme.sub, opacity: 0.5, flex: 'none' }}>{slide.label}</div>
        </div>
      </div>
    );
  } else if (slide.kind === 'list') {
    content = (
      <div style={{ flex: 1, padding: '48px 70px 60px', display: 'flex', flexDirection: 'column' }}>
        {labelTag(slide.label)}
        {titleEl(slide.title)}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 22 }}>
          {slide.bullets.map((b, i) => (
            <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, flex: 'none', background: theme.sw, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', ...kh, fontSize: 15, paddingTop: 2 }}>{toKh(i + 1)}</div>
              {T('bullet', b, { ...body, fontSize: 22, lineHeight: 1.5, color: theme.ink, flex: 1, minWidth: 0 }, i)}
              {delBtn(i)}
            </div>
          ))}
          {addBtn(slide.bullets.length - 1)}
        </div>
      </div>
    );
  } else if (slide.kind === 'two-col') {
    const half = Math.ceil(slide.bullets.length / 2);
    const cols = [slide.bullets.slice(0, half), slide.bullets.slice(half)];
    content = (
      <div style={{ flex: 1, padding: '38px 60px 54px', display: 'flex', flexDirection: 'column' }}>
        {labelTag(slide.label)}
        {titleEl(slide.title)}
        <div style={{ display: 'flex', gap: 22, marginTop: 22, flex: 1 }}>
          {cols.map((items, ci) => (
            <div key={ci} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, padding: 22, borderRadius: 16, background: subTint }}>
              {items.map((b, i) => {
                const gi = ci === 0 ? i : half + i;
                return (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: theme.accent, flex: 'none', marginTop: 9, transform: 'rotate(45deg)' }} />
                    {T('bullet', b, { ...body, fontSize: 20, lineHeight: 1.55, color: theme.ink, flex: 1, minWidth: 0 }, gi)}
                    {delBtn(gi)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {addBtn(slide.bullets.length - 1)}
      </div>
    );
  } else if (slide.kind === 'example') {
    content = (
      <div style={{ flex: 1, padding: '52px 70px 64px', display: 'flex', flexDirection: 'column' }}>
        {labelTag(slide.label)}
        {titleEl(slide.title)}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 15, marginTop: 24 }}>
          {slide.steps.map((st, i) => (
            <div key={i} style={{ display: 'flex', gap: 18, alignItems: 'flex-start', padding: '18px 22px', borderRadius: 14, background: subTint }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', flex: 'none', background: theme.sw, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', ...kh, fontSize: 18, paddingTop: 2 }}>{toKh(i + 1)}</div>
              {T('step', st, { ...body, fontSize: 21, lineHeight: 1.5, color: theme.ink, flex: 1, minWidth: 0 }, i)}
              {delBtn(i)}
            </div>
          ))}
          {addBtn(slide.steps.length - 1)}
        </div>
      </div>
    );
  } else if (slide.kind === 'data') {
    content = (
      <div style={{ flex: 1, padding: '44px 60px 54px', display: 'flex', flexDirection: 'column' }}>
        {labelTag(slide.label)}
        {titleEl(slide.title)}
        <div style={{ display: 'flex', gap: 18, marginTop: 28, flex: 1, alignItems: 'stretch' }}>
          {slide.stats.map((st, i) => (
            <div key={i} style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '22px 14px', borderRadius: 18, background: subTint, border: `1.5px solid ${theme.accent}22` }}>
              {editingLines && slide.stats.length > 1 && (
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => onRemoveLine!(i)} title="លុប" style={{ position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 7, border: 'none', cursor: 'pointer', background: isDark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.06)', color: theme.sub, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={13} />
                </button>
              )}
              {T('statNum', st.num, { ...kh, fontSize: 52, lineHeight: 1, color: theme.accent, marginBottom: 12, textAlign: 'center' }, i)}
              {T('statLabel', st.label, { ...body, fontSize: 17, color: theme.sub, textAlign: 'center', lineHeight: 1.45 }, i)}
            </div>
          ))}
        </div>
        {addBtn(slide.stats.length - 1)}
      </div>
    );
  } else if (slide.kind === 'quote') {
    content = (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '50px 80px', textAlign: 'center', background: `radial-gradient(ellipse at center,${subTint} 0%,transparent 70%)` }}>
        <div style={{ fontSize: 90, lineHeight: 0.8, color: theme.accent, opacity: 0.35, fontFamily: 'Georgia, serif', marginBottom: 10 }}>&ldquo;</div>
        {T('quote', slide.quote, { ...kh, fontSize: 36, lineHeight: 1.4, color: theme.ink, maxWidth: 720, overflowWrap: 'anywhere', textAlign: 'center' })}
        <div style={{ width: 50, height: 3, background: theme.accent, borderRadius: 2, margin: '28px auto 18px' }} />
        {T('author', slide.author, { ...body, fontSize: 20, color: theme.sub, textAlign: 'center' })}
      </div>
    );
  } else if (slide.kind === 'timeline') {
    content = (
      <div style={{ flex: 1, padding: '44px 70px 60px', display: 'flex', flexDirection: 'column' }}>
        {labelTag(slide.label)}
        {titleEl(slide.title)}
        <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: 28, flex: 1 }}>
          {slide.steps.map((ev, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: theme.sw, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', ...kh, fontSize: 16, flex: 'none', zIndex: 1, paddingTop: 2 }}>{toKh(i + 1)}</div>
              {i < slide.steps.length - 1 && <div style={{ position: 'absolute', top: 18, left: '50%', width: '100%', height: 3, background: `${theme.accent}44` }} />}
              {T('step', ev, { ...body, fontSize: 19, lineHeight: 1.4, color: theme.ink, textAlign: 'center', marginTop: 16, padding: '0 10px' }, i)}
              {editingLines && slide.steps.length > 1 && (
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => onRemoveLine!(i)} title="លុប" style={{ marginTop: 10, width: 24, height: 24, borderRadius: 7, border: 'none', cursor: 'pointer', background: isDark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.06)', color: theme.sub, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
        {addBtn(slide.steps.length - 1)}
      </div>
    );
  } else if (slide.kind === 'media') {
    content = (
      <div style={{ flex: 1, padding: '40px 60px 34px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {labelTag(slide.label)}
        {titleEl(slide.title)}
        <div style={{ position: 'relative', flex: 1, minHeight: 0, marginTop: 16, borderRadius: 16, overflow: 'hidden', background: subTint, border: slide.image ? 'none' : `1.5px dashed ${theme.accent}55` }}>
          {slide.image ? (
            <img src={slide.image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: theme.sub }}>
              <ImageIcon size={30} style={{ opacity: 0.5 }} />
              <span style={{ ...body, fontSize: 13.5, opacity: 0.75 }}>គ្មានរូបភាព</span>
            </div>
          )}
          {edit && onSetImage && (
            <div style={{ position: 'absolute', top: 10, right: 10 }}>
              <MediaImageMenu image={slide.image} onSet={onSetImage} />
            </div>
          )}
        </div>
        {T('caption', slide.caption, { ...body, fontSize: 15, color: theme.sub, marginTop: 12, textAlign: 'center' })}
      </div>
    );
  } else if (slide.kind === 'summary') {
    content = (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '50px 80px', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: theme.sw, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, color: '#fff' }}>
          <Check size={30} />
        </div>
        {T('title', slide.title, { ...kh, fontSize: 50, color: theme.ink, lineHeight: 1.2, marginBottom: 16, overflowWrap: 'anywhere', textAlign: 'center' })}
        <div style={{ width: 60, height: 3.5, background: theme.accent, borderRadius: 2, margin: '0 auto 20px' }} />
        {T('sub', slide.sub, { ...body, fontSize: 22, color: theme.sub, maxWidth: 580, lineHeight: 1.55, marginBottom: 22, textAlign: 'center' })}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          {slide.bullets.map((b, i) => (
            <span key={i} style={{ ...body, fontSize: 16, fontWeight: 700, color: theme.accent, padding: '9px 16px', borderRadius: 100, background: subTint }}>{b}</span>
          ))}
        </div>
      </div>
    );
  }

  // ── Header / footer chrome (deck-wide, configurable) ──
  const ds = deckSettings;
  const isCover = slide.kind === 'title';
  const showChrome = !isCover || ds.showOnCover;
  const logoChip = (
    <div style={{ width: 20, height: 20, borderRadius: 6, background: theme.sw, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
      <span style={{ ...kh, color: '#fff', fontSize: 11, paddingTop: 1 }}>S</span>
    </div>
  );
  const footerTextEl = ds.footerTextEnabled && ds.footerText.trim() ? (
    <span style={{ fontFamily: KH, fontSize: 10, fontWeight: 700, letterSpacing: '1px', color: theme.sub, whiteSpace: 'nowrap' }}>{ds.footerText}</span>
  ) : null;
  const pageNumEl = ds.pageNumber ? (
    <span style={{ fontFamily: KO, fontSize: 13, fontWeight: 700, color: theme.sub, flex: 'none' }}>{slide.no} / {toKh(total)}</span>
  ) : null;
  const brandEl = ds.footerLogo || footerTextEl ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>{ds.footerLogo && logoChip}{footerTextEl}</div>
  ) : null;

  let footerNode: React.ReactNode = null;
  if (showChrome && (brandEl || pageNumEl)) {
    if (ds.footerLayout === 'minimal') {
      footerNode = pageNumEl && <div style={{ position: 'absolute', zIndex: 1, right: 34, bottom: 22 }}>{pageNumEl}</div>;
    } else if (ds.footerLayout === 'centered') {
      footerNode = (
        <div style={{ position: 'absolute', zIndex: 1, left: 0, right: 0, bottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          {brandEl}{pageNumEl}
        </div>
      );
    } else if (ds.footerLayout === 'split') {
      footerNode = (
        <div style={{ position: 'absolute', zIndex: 1, left: 34, right: 34, bottom: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>{ds.footerLogo && logoChip}</div>
          <div>{footerTextEl}</div>
          <div>{pageNumEl}</div>
        </div>
      );
    } else {
      // 'branded' (default): logo+text bottom-left, page number bottom-right.
      footerNode = (
        <>
          {brandEl && <div style={{ position: 'absolute', zIndex: 1, left: 34, bottom: 22 }}>{brandEl}</div>}
          {pageNumEl && <div style={{ position: 'absolute', zIndex: 1, right: 34, bottom: 24 }}>{pageNumEl}</div>}
        </>
      );
    }
  }

  const headerNode = ds.headerEnabled && ds.headerText.trim() && showChrome ? (
    <div style={{ position: 'absolute', zIndex: 1, top: 20, [ds.headerAlign]: 34, fontFamily: KH, fontSize: 10.5, fontWeight: 700, letterSpacing: '.6px', color: theme.sub, opacity: 0.85 }}>
      {ds.headerText}
    </div>
  ) : null;

  const bg = slideBackground(slide.bg, theme);
  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, background: bg.base, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      {/* background layers */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0, ...bg.layer }} />
      {bg.scrim && <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0, background: bg.scrim }} />}
      {/* foreground */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 8, background: theme.band, flex: 'none' }} />
        {content}
      </div>
      {headerNode}
      {footerNode}
    </div>
  );
}

function ThumbStrip({ deck, idx, theme, onSelect, deckSettings }: { deck: Slide[]; idx: number; theme: Theme; onSelect: (i: number) => void; deckSettings?: DeckSettings }) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 900 }}>
      {deck.map((sl, i) => {
        const active = i === idx;
        return (
          <button key={i} onClick={() => onSelect(i)} title={(sl.kind === 'quote' ? sl.label : sl.title).replace(/<[^>]*>/g, '')} style={{ position: 'relative', padding: 0, border: `2px solid ${active ? theme.accent : C.borderSoft}`, borderRadius: 8, cursor: 'pointer', background: 'transparent', lineHeight: 0, overflow: 'hidden' }}>
            <ScaledSlide slide={sl} theme={theme} total={deck.length} width={132} deckSettings={deckSettings} />
            <span style={{ position: 'absolute', top: 4, left: 4, fontSize: 9, fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,.45)', borderRadius: 5, padding: '1px 5px', lineHeight: 1.4 }}>{sl.no}</span>
          </button>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Shared UI
// ════════════════════════════════════════════════════════════════════
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 13px',
  border: `1.5px solid ${C.borderSoft}`,
  borderRadius: 11,
  fontFamily: KH,
  fontSize: 13.5,
  background: '#faf9f7',
  color: C.body,
  outline: 'none',
  boxSizing: 'border-box',
};

function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <h2 style={{ fontFamily: KO, fontSize: 16, color: C.ink, letterSpacing: '.3px', margin: '0 0 12px', ...style }}>{children}</h2>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.muted2, marginBottom: 7 }}>{label}</label>
      {children}
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: (string | { v: string; l: string })[] }) {
  const opts = options.map((o) => (typeof o === 'string' ? { v: o, l: o } : o));
  return (
    <Field label={label}>
      <div style={{ position: 'relative' }}>
        <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle, appearance: 'none', paddingRight: 34, cursor: 'pointer' }}>
          {opts.map((o) => (
            <option key={o.v} value={o.v}>{o.l}</option>
          ))}
        </select>
        <ChevronDown size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} />
      </div>
    </Field>
  );
}

function Swatch({ color, active, onClick, title, sm }: { color: string; active: boolean; onClick: () => void; title: string; sm?: boolean }) {
  const d = sm ? 20 : 30;
  return (
    <button onClick={onClick} title={title} style={{ width: d, height: d, borderRadius: '50%', cursor: 'pointer', background: color, border: active ? '2px solid #2f2519' : '2px solid transparent', boxShadow: active ? '0 0 0 2px #fff inset' : '0 0 0 1px rgba(0,0,0,.12)' }} />
  );
}

function NavArrow({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ width: 44, height: 44, flex: 'none', borderRadius: '50%', border: `1px solid ${C.border}`, background: C.panel, cursor: disabled ? 'default' : 'pointer', color: C.muted2, opacity: disabled ? 0.35 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px -6px rgba(28,27,25,.4)' }}>
      {children}
    </button>
  );
}

function ToolBtn({ children, onClick, primary, title }: { children: React.ReactNode; onClick: () => void; primary?: boolean; title?: string }) {
  return (
    <button onClick={onClick} title={title} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: KH, fontSize: 12.5, fontWeight: 700, border: primary ? 'none' : `1px solid ${C.border}`, color: primary ? '#fff' : C.muted2, background: primary ? 'linear-gradient(135deg,#7c6cff,#a47bff)' : C.panel, boxShadow: primary ? '0 8px 18px -10px rgba(109,91,240,.6)' : 'none' }}>
      {children}
    </button>
  );
}

// "នាំចេញ" (Export) trigger in the top bar — a small dropdown with real PDF
// and PowerPoint downloads. Shows a spinner + disables while a file is being
// generated (`busy` = the export kind in progress, or null when idle).
function ExportMenu({ busy, onExport }: { busy: 'pdf' | 'pptx' | null; onExport: (kind: 'pdf' | 'pptx') => void }) {
  const [open, setOpen] = useState(false);
  const pick = (kind: 'pdf' | 'pptx') => {
    setOpen(false);
    onExport(kind);
  };
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="នាំចេញ"
        disabled={!!busy}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, cursor: busy ? 'default' : 'pointer', fontFamily: KH, fontSize: 12.5, fontWeight: 700, border: `1px solid ${C.border}`, color: C.muted2, background: C.panel, opacity: busy ? 0.7 : 1 }}
      >
        {busy ? <Loader2 size={15} className="sl-spin" /> : <Download size={15} />}
        <span className="sl-hide-md">{busy ? 'កំពុងនាំចេញ…' : 'នាំចេញ'}</span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div style={{ position: 'absolute', top: '115%', right: 0, zIndex: 41, minWidth: 190, padding: 5, borderRadius: 12, background: C.panel, border: `1px solid ${C.border}`, boxShadow: '0 14px 32px -14px rgba(28,27,25,.45)' }}>
            <button onClick={() => pick('pdf')} style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '9px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', fontFamily: KH, fontSize: 13, fontWeight: 700, color: C.body, textAlign: 'left' }}>
              <FileText size={15} style={{ color: C.accent }} /> នាំចេញជា PDF
            </button>
            <button onClick={() => pick('pptx')} style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '9px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', fontFamily: KH, fontSize: 13, fontWeight: 700, color: C.body, textAlign: 'left' }}>
              <Presentation size={15} style={{ color: C.accent }} /> នាំចេញជា PowerPoint
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 10, zIndex: 3000, pointerEvents: 'none' }}>
      {toasts.map((t) => {
        const tone = t.type === 'error' ? { bd: '#f3c6c0', bg: '#fdecea', ic: '#c0392b' } : t.type === 'info' ? { bd: '#cdddf0', bg: '#eef3fb', ic: '#3a6ea8' } : { bd: '#d8e3d8', bg: '#e8f6ee', ic: C.green };
        return (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 280, maxWidth: 380, padding: '13px 15px', borderRadius: 13, background: C.panel, border: `1px solid ${tone.bd}`, boxShadow: '0 12px 28px -12px rgba(28,27,25,.4)', pointerEvents: 'auto', color: C.body }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: tone.bg, color: tone.ic, fontWeight: 700 }}>
              {t.type === 'error' ? '✕' : t.type === 'info' ? 'i' : '✓'}
            </div>
            <span style={{ flex: 1, fontSize: 13 }}>{t.message}</span>
            <button onClick={() => onDismiss(t.id)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: C.muted }}>
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function SignupGate({ locale, onClose }: { locale: string; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 3100, background: 'rgba(33,27,23,.45)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 380, maxWidth: '100%', background: C.panel, borderRadius: 18, padding: '26px 24px', boxShadow: '0 30px 70px -20px rgba(28,27,25,.5)', textAlign: 'center' }}>
        <div style={{ width: 54, height: 54, margin: '0 auto 14px', borderRadius: 15, background: 'linear-gradient(135deg,#7c6cff,#a47bff)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <Sparkles size={26} />
        </div>
        <h3 style={{ fontFamily: KO, fontSize: 20, color: C.ink, letterSpacing: '.3px' }}>រក្សាទុករួចហើយក្នុងឧបករណ៍នេះ</h3>
        <p style={{ fontSize: 13.5, color: C.muted, marginTop: 8, lineHeight: 1.7 }}>បង្កើតគណនីដោយឥតគិតថ្លៃ ដើម្បី sync ការងាររបស់អ្នកគ្រប់ឧបករណ៍ ចែករំលែក និងភ្ជាប់ជាមួយសាលា។</p>
        <Link href={`/${locale}/register-school`} style={{ display: 'block', marginTop: 18, padding: 13, borderRadius: 12, background: 'linear-gradient(135deg,#7c6cff,#a47bff)', color: '#fff', fontFamily: KO, fontSize: 16, letterSpacing: '.4px', textDecoration: 'none' }}>
          បង្កើតគណនីឥតគិតថ្លៃ
        </Link>
        <Link href={`/${locale}/auth/login`} style={{ display: 'block', marginTop: 10, fontSize: 13, color: C.accent, textDecoration: 'none' }}>មានគណនីរួចហើយ? ចូល</Link>
        <button onClick={onClose} style={{ marginTop: 14, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, color: C.muted }}>ពេលក្រោយ</button>
      </div>
    </div>
  );
}
