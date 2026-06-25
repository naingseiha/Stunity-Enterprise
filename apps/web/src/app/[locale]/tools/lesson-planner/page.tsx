'use client';

// Lesson Planner — MoEYS lesson-plan creation tool for teachers.
// Ported from the "Lesson Planner" Claude Design as a Stunity web feature.
// Phase 1 (core): Hub → Create → Generating → MoEYS document/editor.
// Other tools from the source design (Exam, Slides, Cards, Certificates,
// Timetable, Director dashboard) are intentionally out of scope for now and
// surface as "coming soon" nav items.

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ChevronDown,
  Download,
  GraduationCap,
  Home,
  Minus,
  Plus,
  Printer,
  RefreshCw,
  Sparkles,
  Wand2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  CHAPTERS,
  DEPTHS,
  DEPTH_LABEL,
  DURATIONS,
  GEN_STEPS,
  GRADES,
  SAMPLE_OBJECTIVES,
  SAMPLE_PROCEDURE,
  SUBJECTS,
  SUGGESTIONS,
  toKh,
} from './data';
import { getDraft, isAuthed, saveDraft } from '../lib/drafts';

type Screen = 'hub' | 'create' | 'generating' | 'result';
type InputMode = 'title' | 'paste' | 'upload';
type Toast = { id: number; message: string; type: 'success' | 'info' | 'error' };

// ── Palette (matches source design) ────────────────────────────────
const C = {
  paper: '#f1e8da',
  panel: '#fffdf9',
  border: '#e3d7c2',
  borderSoft: '#e6d6bd',
  ink: '#2f2519',
  body: '#3a2f24',
  muted: '#7a6952',
  muted2: '#6b5d49',
  accent: '#a84d22',
  accent2: '#d2703f',
  accent3: '#c2603a',
  green: '#4f9d69',
};

const KH = "'Battambang', sans-serif";
const KO = "'Koulen', sans-serif";

export default function LessonPlannerPage() {
  return (
    <Suspense fallback={null}>
      <LessonPlanner />
    </Suspense>
  );
}

function LessonPlanner() {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();

  // ── State ─────────────────────────────────────────────────────────
  const [screen, setScreen] = useState<Screen>('hub');
  const [draftId, setDraftId] = useState<string | undefined>(undefined);
  const [showGate, setShowGate] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>('title');
  const [title, setTitle] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [subject, setSubject] = useState('គណិតវិទ្យា');
  const [grade, setGrade] = useState('ថ្នាក់ទី៧');
  const [chapterNo, setChapterNo] = useState('២');
  const [lessonNo, setLessonNo] = useState('១');
  const [duration, setDuration] = useState('50');
  const [depth, setDepth] = useState('standard');
  const [count, setCount] = useState(1);
  const [genStep, setGenStep] = useState(0);
  const [activePlan, setActivePlan] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);

  // ── Derived ───────────────────────────────────────────────────────
  const curCh = useMemo(
    () => CHAPTERS.find((c) => c.no === chapterNo) ?? CHAPTERS[0],
    [chapterNo],
  );
  const curLesson = useMemo(
    () => curCh.lessons.find((l) => l.no === lessonNo) ?? curCh.lessons[0],
    [curCh, lessonNo],
  );

  const previewTitle = title || curLesson.title;
  const previewTitleColor = title ? C.ink : '#c2a988';

  // ── Helpers ───────────────────────────────────────────────────────
  const scrollTop = () => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
  };

  const notify = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const go = (s: Screen) => {
    setScreen(s);
    scrollTop();
  };

  // ── Generation (stepped animation) ────────────────────────────────
  const generate = () => {
    setScreen('generating');
    setGenStep(0);
    scrollTop();
    const steps = [700, 1100, 1400, 1300, 900];
    let i = 0;
    const tick = () => {
      i += 1;
      if (i >= steps.length) {
        setScreen('result');
        setActivePlan(0);
        notify('បង្កើតកិច្ចតែងការដោយជោគជ័យ');
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

  // Re-open a device-local draft via ?draft=<id>
  useEffect(() => {
    const id = searchParams.get('draft');
    if (!id) return;
    const d = getDraft(id);
    if (!d) return;
    const p = d.payload as Record<string, unknown>;
    setDraftId(d.id);
    if (typeof p.title === 'string') setTitle(p.title);
    if (typeof p.subject === 'string') setSubject(p.subject);
    if (typeof p.grade === 'string') setGrade(p.grade);
    if (typeof p.chapterNo === 'string') setChapterNo(p.chapterNo);
    if (typeof p.lessonNo === 'string') setLessonNo(p.lessonNo);
    if (typeof p.duration === 'string') setDuration(p.duration);
    if (typeof p.depth === 'string') setDepth(p.depth);
    if (typeof p.count === 'number') setCount(p.count);
    setScreen('result');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePrint = () => {
    notify('កំពុងរៀបចំ PDF…', 'info');
    setTimeout(() => window.print(), 120);
  };

  const handleSave = () => {
    const d = saveDraft({
      id: draftId,
      tool: 'lesson-planner',
      title: previewTitle,
      subject,
      grade,
      payload: { title, subject, grade, chapterNo, lessonNo, duration, depth, count },
    });
    setDraftId(d.id);
    // Drafts are device-local for now (cloud sync is a follow-up), so keep the
    // confirmation honest and don't claim the work left this device.
    notify('បានរក្សាទុកក្នុងឧបករណ៍នេះ');
    if (!isAuthed()) setShowGate(true);
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: C.paper,
        fontFamily: KH,
        color: C.body,
      }}
    >
      <TopBar
        screen={screen}
        onHome={() => go('hub')}
        onCreate={() => go('create')}
        onExit={() => router.push(`/${locale}/tools`)}
      />

      <main
        ref={mainRef as React.RefObject<HTMLElement>}
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 56px)',
          overflowY: 'auto',
        }}
      >
        {screen === 'hub' && <Hub onStart={() => go('create')} />}

        {screen === 'create' && (
          <CreateScreen
            inputMode={inputMode}
            setInputMode={setInputMode}
            title={title}
            setTitle={setTitle}
            pastedText={pastedText}
            setPastedText={setPastedText}
            subject={subject}
            setSubject={setSubject}
            grade={grade}
            setGrade={setGrade}
            chapterNo={chapterNo}
            setChapterNo={(v) => {
              setChapterNo(v);
              setLessonNo('១');
            }}
            lessonNo={lessonNo}
            setLessonNo={setLessonNo}
            duration={duration}
            setDuration={setDuration}
            depth={depth}
            setDepth={setDepth}
            count={count}
            setCount={setCount}
            curCh={curCh}
            curLesson={curLesson}
            previewTitle={previewTitle}
            previewTitleColor={previewTitleColor}
            onGenerate={generate}
          />
        )}

        {screen === 'generating' && <Generating step={genStep} />}

        {screen === 'result' && (
          <ResultScreen
            title={previewTitle}
            subject={subject}
            grade={grade}
            duration={duration}
            curCh={curCh}
            curLesson={curLesson}
            zoom={zoom}
            setZoom={setZoom}
            count={count}
            activePlan={activePlan}
            setActivePlan={setActivePlan}
            onRegen={generate}
            onPrint={handlePrint}
            onEdit={() => go('create')}
            onSave={handleSave}
          />
        )}
      </main>

      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />

      {showGate && <SignupGate locale={locale} onClose={() => setShowGate(false)} />}

      {/* Responsive + print */}
      <style>{`
        @media (max-width: 560px) { .lp-hide-sm { display: none !important; } }
        @media (max-width: 920px) {
          .lp-create-grid { grid-template-columns: 1fr !important; }
          .lp-create-grid > aside { border-right: none !important; }
        }
        @media print {
          body { background: #fff !important; }
          aside, header.lp-no-print, .lp-no-print { display: none !important; }
          main { height: auto !important; overflow: visible !important; }
          .lp-page {
            box-shadow: none !important;
            width: 100% !important;
            max-width: 100% !important;
            transform: none !important;
          }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Top bar — light, minimal app chrome (replaces the old dark sidebar)
// ════════════════════════════════════════════════════════════════════
function TopBar({
  screen,
  onHome,
  onCreate,
  onExit,
}: {
  screen: Screen;
  onHome: () => void;
  onCreate: () => void;
  onExit: () => void;
}) {
  const createActive = screen === 'create' || screen === 'generating' || screen === 'result';

  const tab = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    padding: '8px 15px',
    borderRadius: 100,
    border: 'none',
    cursor: 'pointer',
    fontFamily: KO,
    fontSize: 14,
    letterSpacing: '.4px',
    color: active ? C.accent : C.muted2,
    background: active ? '#fff' : 'transparent',
    boxShadow: active ? '0 2px 8px -3px rgba(90,60,25,.25)' : 'none',
    transition: 'all .14s',
  });

  return (
    <header
      style={{
        height: 56,
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '0 16px',
        background: 'rgba(255,253,249,.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${C.border}`,
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      {/* back to tools */}
      <button
        onClick={onExit}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          padding: '8px 12px 8px 9px',
          borderRadius: 10,
          border: `1px solid ${C.border}`,
          background: '#fff',
          cursor: 'pointer',
          fontFamily: KH,
          fontSize: 13,
          color: C.muted2,
        }}
      >
        <ArrowLeft size={16} />
        <span className="lp-hide-sm">ឧបករណ៍</span>
      </button>

      {/* brand / tool name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            background: 'linear-gradient(135deg,#d2703f,#a84d22)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            flex: 'none',
          }}
        >
          <GraduationCap size={17} />
        </div>
        <span className="lp-hide-sm" style={{ fontFamily: KO, fontSize: 16, color: C.ink, letterSpacing: '.4px' }}>
          កិច្ចតែងការបង្រៀន
        </span>
      </div>

      <div style={{ flex: 1 }} />

      {/* screen tabs */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 2, padding: 3, borderRadius: 100, background: '#f3e7d4' }}>
        <button onClick={onHome} style={tab(screen === 'hub')}>
          <Home size={15} />
          <span className="lp-hide-sm">ទំព័រដើម</span>
        </button>
        <button onClick={onCreate} style={tab(createActive)}>
          <Wand2 size={15} />
          <span className="lp-hide-sm">បង្កើត</span>
        </button>
      </nav>
    </header>
  );
}

// ════════════════════════════════════════════════════════════════════
// Hub (landing)
// ════════════════════════════════════════════════════════════════════
function Hub({ onStart }: { onStart: () => void }) {
  return (
    <section
      style={{
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '96px 40px 120px',
        textAlign: 'center',
        background:
          'radial-gradient(1200px 500px at 50% -10%, rgba(210,112,63,.10), transparent), #f1e8da',
        minHeight: '100vh',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '7px 16px',
          borderRadius: 100,
          background: C.panel,
          border: `1px solid ${C.border}`,
          marginBottom: 26,
          fontSize: 12,
          fontWeight: 700,
          color: C.accent,
        }}
      >
        <Sparkles size={14} />
        ឧបករណ៍សម្រាប់គ្រូ · បង្កើតដោយ AI
      </div>

      <h1
        style={{
          fontFamily: KO,
          fontSize: 'clamp(40px, 6vw, 74px)',
          lineHeight: 1.1,
          color: C.ink,
          letterSpacing: '.5px',
          marginBottom: 22,
        }}
      >
        បង្កើតកិច្ចតែងការបង្រៀន
        <br />
        ក្នុងរយៈពេលប៉ុន្មាននាទី
      </h1>
      <p style={{ fontSize: 16, color: C.muted, maxWidth: 560, lineHeight: 1.8, marginBottom: 34 }}>
        បញ្ចូលចំណងជើងមេរៀន រួច AI នឹងបង្កើតកិច្ចតែងការពេញលេញតាមទ្រង់ទ្រាយ
        ក្រសួងអប់រំ យុវជន និងកីឡា — គោលបំណង សម្ភារៈ ដំណើរការ និងការវាយតម្លៃ។
      </p>

      <button
        onClick={onStart}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: '15px 30px',
          border: 'none',
          borderRadius: 14,
          cursor: 'pointer',
          fontFamily: KO,
          fontSize: 17,
          letterSpacing: '.5px',
          color: '#fff',
          background: 'linear-gradient(135deg,#d2703f,#a84d22)',
          boxShadow: '0 14px 30px -12px rgba(168,77,34,.6)',
        }}
      >
        <Wand2 size={20} />
        ចាប់ផ្តើមបង្កើត
      </button>

      <div style={{ display: 'flex', gap: 16, marginTop: 56, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { n: '៤៨', l: 'កិច្ចតែងការសរុប' },
          { n: '១២', l: 'ខែនេះ' },
          { n: '៩៤%', l: 'អត្រាបញ្ចប់' },
        ].map((s) => (
          <div
            key={s.l}
            style={{
              minWidth: 140,
              padding: '18px 22px',
              borderRadius: 16,
              background: C.panel,
              border: `1px solid ${C.border}`,
            }}
          >
            <div style={{ fontFamily: KO, fontSize: 30, color: C.accent }}>{s.n}</div>
            <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════════════
// Create screen (controls + live A4 preview)
// ════════════════════════════════════════════════════════════════════
function CreateScreen(props: {
  inputMode: InputMode;
  setInputMode: (m: InputMode) => void;
  title: string;
  setTitle: (v: string) => void;
  pastedText: string;
  setPastedText: (v: string) => void;
  subject: string;
  setSubject: (v: string) => void;
  grade: string;
  setGrade: (v: string) => void;
  chapterNo: string;
  setChapterNo: (v: string) => void;
  lessonNo: string;
  setLessonNo: (v: string) => void;
  duration: string;
  setDuration: (v: string) => void;
  depth: string;
  setDepth: (v: string) => void;
  count: number;
  setCount: (v: number) => void;
  curCh: (typeof CHAPTERS)[number];
  curLesson: { no: string; title: string };
  previewTitle: string;
  previewTitleColor: string;
  onGenerate: () => void;
}) {
  const {
    inputMode,
    setInputMode,
    title,
    setTitle,
    pastedText,
    setPastedText,
    subject,
    setSubject,
    grade,
    setGrade,
    chapterNo,
    setChapterNo,
    lessonNo,
    setLessonNo,
    duration,
    setDuration,
    depth,
    setDepth,
    count,
    setCount,
    curCh,
    curLesson,
    previewTitle,
    previewTitleColor,
    onGenerate,
  } = props;

  return (
    <>
      <header
        style={{
          padding: '18px 40px',
          borderBottom: `1px solid ${C.border}`,
          background: 'rgba(241,232,218,.85)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 5,
        }}
      >
        <div>
          <h1 style={{ fontFamily: KO, fontSize: 24, color: C.ink, letterSpacing: '.4px' }}>
            បង្កើតកិច្ចតែងការ
          </h1>
          <p style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>
            បំពេញព័ត៌មាន រួច AI នឹងបង្កើតកិច្ចតែងការតាមស្តង់ដារ MoEYS
          </p>
        </div>
      </header>

      <div
        className="lp-create-grid"
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'minmax(0,420px) minmax(0,1fr)',
          gap: 0,
          alignItems: 'start',
        }}
      >
        {/* ── Control panel ── */}
        <aside
          style={{
            background: C.panel,
            borderRight: `1px solid ${C.border}`,
            padding: '20px 22px 40px',
          }}
        >
          <SectionLabel>ខ្លឹមសារមេរៀន</SectionLabel>

          {/* input mode tabs */}
          <div
            style={{
              display: 'flex',
              gap: 6,
              padding: 5,
              borderRadius: 14,
              background: '#f3e7d4',
              marginBottom: 16,
            }}
          >
            {(
              [
                ['title', 'ចំណងជើង'],
                ['paste', 'បិទភ្ជាប់'],
                ['upload', 'ផ្ទុកឯកសារ'],
              ] as [InputMode, string][]
            ).map(([m, label]) => {
              const active = inputMode === m;
              return (
                <button
                  key={m}
                  onClick={() => setInputMode(m)}
                  style={{
                    flex: 1,
                    padding: '11px 8px',
                    borderRadius: 11,
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: KH,
                    fontSize: 13,
                    fontWeight: 700,
                    color: active ? C.accent : '#8a7a63',
                    background: active ? C.panel : 'transparent',
                    boxShadow: active ? '0 2px 6px rgba(90,60,25,.1),inset 0 0 0 1px #eddcc4' : 'none',
                    transition: 'all .15s',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {inputMode === 'title' && (
            <>
              <Field label="ចំណងជើងមេរៀន">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ឧ. ការបូកប្រភាគ"
                  style={inputStyle}
                />
              </Field>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: -4, marginBottom: 16 }}>
                {SUGGESTIONS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTitle(t)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: 9,
                      border: `1px solid ${C.borderSoft}`,
                      background: '#fdf8f0',
                      cursor: 'pointer',
                      fontFamily: KH,
                      fontSize: 12,
                      color: C.muted2,
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </>
          )}

          {inputMode === 'paste' && (
            <Field label="បិទភ្ជាប់ខ្លឹមសារ ឬ outline">
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                rows={5}
                placeholder="បិទភ្ជាប់អត្ថបទមេរៀននៅទីនេះ…"
                style={{ ...inputStyle, resize: 'vertical', minHeight: 110 }}
              />
            </Field>
          )}

          {inputMode === 'upload' && (
            <div
              style={{
                border: `1.5px dashed ${C.borderSoft}`,
                borderRadius: 14,
                padding: '30px 16px',
                textAlign: 'center',
                background: '#fdf8f0',
                marginBottom: 16,
                color: C.muted,
              }}
            >
              <Download size={26} style={{ margin: '0 auto 8px', display: 'block' }} />
              <div style={{ fontSize: 13, fontWeight: 700, color: C.body }}>ផ្ទុកឯកសារ PDF / Word</div>
              <div style={{ fontSize: 11.5, marginTop: 3 }}>(នឹងភ្ជាប់ជាមួយ storage-service ពេលក្រោយ)</div>
            </div>
          )}

          <Select label="មុខវិជ្ជា" value={subject} onChange={setSubject} options={SUBJECTS} />
          <Select label="ថ្នាក់" value={grade} onChange={setGrade} options={GRADES} />
          <Select
            label="ជំពូក"
            value={chapterNo}
            onChange={setChapterNo}
            options={CHAPTERS.map((c) => ({ v: c.no, l: `ជំពូកទី ${c.no} ៖ ${c.title}` }))}
          />
          <Select
            label="មេរៀន"
            value={lessonNo}
            onChange={setLessonNo}
            options={curCh.lessons.map((l) => ({ v: l.no, l: `មេរៀនទី ${l.no} ៖ ${l.title}` }))}
          />
          <Select
            label="រយៈពេល"
            value={duration}
            onChange={setDuration}
            options={DURATIONS.map((d) => ({ v: d.v, l: d.l }))}
          />

          <SectionLabel style={{ marginTop: 20 }}>ការកំណត់</SectionLabel>

          <Field label="កម្រិតលម្អិត">
            <div style={{ display: 'flex', gap: 8 }}>
              {DEPTHS.map((d) => {
                const active = depth === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => setDepth(d.id)}
                    style={{
                      flex: 1,
                      padding: '10px 4px',
                      border: `1.5px solid ${active ? C.accent3 : C.borderSoft}`,
                      borderRadius: 11,
                      cursor: 'pointer',
                      fontFamily: KH,
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: active ? '#fff' : C.muted,
                      background: active ? 'linear-gradient(135deg,#d2703f,#a84d22)' : '#fdf8f0',
                      transition: 'all .15s',
                    }}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="ចំនួនកិច្ចតែងការ">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Stepper onClick={() => setCount(Math.max(1, count - 1))} disabled={count <= 1}>
                <Minus size={15} />
              </Stepper>
              <div style={{ fontFamily: KO, fontSize: 22, color: C.ink, minWidth: 28, textAlign: 'center' }}>
                {toKh(count)}
              </div>
              <Stepper onClick={() => setCount(Math.min(5, count + 1))} disabled={count >= 5}>
                <Plus size={15} />
              </Stepper>
              <span style={{ fontSize: 12, color: C.muted }}>
                {count > 1 ? 'AI បង្កើតជាជម្រើសច្រើន' : 'កិច្ចតែងការតែមួយ'}
              </span>
            </div>
          </Field>

          <button
            onClick={onGenerate}
            style={{
              width: '100%',
              marginTop: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '15px',
              border: 'none',
              borderRadius: 14,
              cursor: 'pointer',
              fontFamily: KO,
              fontSize: 17,
              letterSpacing: '.5px',
              color: '#fff',
              background: 'linear-gradient(135deg,#d2703f,#a84d22)',
              boxShadow: '0 12px 26px -12px rgba(168,77,34,.6)',
            }}
          >
            <Wand2 size={19} />
            បង្កើតដោយ AI
          </button>
        </aside>

        {/* ── Live preview ── */}
        <div style={{ padding: '34px 40px 70px', display: 'flex', justifyContent: 'center' }}>
          <A4Page
            title={previewTitle}
            titleColor={previewTitleColor}
            subject={subject}
            grade={grade}
            duration={DURATIONS.find((d) => d.v === duration)?.l ?? duration}
            chapter={`ជំពូកទី ${chapterNo} ៖ ${curCh.title}`}
            lesson={`មេរៀនទី ${lessonNo} ៖ ${curLesson.title}`}
            ghost
          />
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// Generating
// ════════════════════════════════════════════════════════════════════
function Generating({ step }: { step: number }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        minHeight: '100vh',
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          background: 'linear-gradient(135deg,#d2703f,#a84d22)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          marginBottom: 26,
          boxShadow: '0 16px 34px -14px rgba(168,77,34,.7)',
          animation: 'lpPulse 1.4s ease infinite',
        }}
      >
        <Wand2 size={34} />
      </div>
      <h2 style={{ fontFamily: KO, fontSize: 27, color: C.ink, letterSpacing: '.4px', marginBottom: 7 }}>
        កំពុងបង្កើតកិច្ចតែងការ
      </h2>
      <p style={{ fontSize: 14, color: C.muted, marginBottom: 30 }}>សូមរង់ចាំបន្តិច AI កំពុងធ្វើការ…</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 360, maxWidth: '90%' }}>
        {GEN_STEPS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  flex: 'none',
                  color: '#fff',
                  background: done ? C.green : active ? C.accent2 : '#dccbb1',
                  animation: active ? 'lpPulse 1s ease infinite' : 'none',
                }}
              >
                {done ? '✓' : toKh(i + 1)}
              </div>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: active || done ? 700 : 400,
                  color: done ? C.green : active ? C.accent : '#b3a386',
                }}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <style>{`@keyframes lpPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.08);opacity:.85}}`}</style>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Result (MoEYS document + editor toolbar)
// ════════════════════════════════════════════════════════════════════
function ResultScreen(props: {
  title: string;
  subject: string;
  grade: string;
  duration: string;
  curCh: (typeof CHAPTERS)[number];
  curLesson: { no: string; title: string };
  zoom: number;
  setZoom: (v: number) => void;
  count: number;
  activePlan: number;
  setActivePlan: (i: number) => void;
  onRegen: () => void;
  onPrint: () => void;
  onEdit: () => void;
  onSave: () => void;
}) {
  const {
    title,
    subject,
    grade,
    duration,
    curCh,
    curLesson,
    zoom,
    setZoom,
    count,
    activePlan,
    setActivePlan,
    onRegen,
    onPrint,
    onEdit,
    onSave,
  } = props;

  return (
    <>
      <header
        className="lp-no-print"
        style={{
          flex: 'none',
          padding: '11px 22px',
          display: 'flex',
          alignItems: 'center',
          gap: 13,
          background: C.panel,
          borderBottom: `1px solid ${C.border}`,
          position: 'sticky',
          top: 0,
          zIndex: 6,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            padding: '6px 13px',
            borderRadius: 100,
            background: '#e8f1e8',
            color: C.green,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: C.green,
              boxShadow: '0 0 0 3px rgba(79,157,105,.18)',
            }}
          />
          រួចរាល់
        </div>

        <h1 style={{ fontFamily: KO, fontSize: 18, color: C.ink, letterSpacing: '.3px', flex: 1, minWidth: 120 }}>
          {title}
        </h1>

        {/* zoom */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            padding: 3,
            borderRadius: 10,
            background: '#f3e7d4',
          }}
        >
          <IconBtn onClick={() => setZoom(Math.max(0.6, +(zoom - 0.1).toFixed(2)))}>
            <ZoomOut size={15} />
          </IconBtn>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.muted2, minWidth: 38, textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <IconBtn onClick={() => setZoom(Math.min(1.6, +(zoom + 0.1).toFixed(2)))}>
            <ZoomIn size={15} />
          </IconBtn>
        </div>

        <ToolBtn onClick={onEdit}>
          <RefreshCw size={15} />
          កែខ្លឹមសារ
        </ToolBtn>
        <ToolBtn onClick={onRegen}>
          <Wand2 size={15} />
          បង្កើតឡើងវិញ
        </ToolBtn>
        <ToolBtn onClick={onSave}>រក្សាទុក</ToolBtn>
        <ToolBtn primary onClick={onPrint}>
          <Printer size={15} />
          ទាញយក PDF
        </ToolBtn>
      </header>

      {/* batch tabs */}
      {count > 1 && (
        <div
          className="lp-no-print"
          style={{ display: 'flex', gap: 8, padding: '12px 24px 0', flexWrap: 'wrap' }}
        >
          {Array.from({ length: count }).map((_, i) => {
            const active = activePlan === i;
            return (
              <button
                key={i}
                onClick={() => setActivePlan(i)}
                style={{
                  padding: '8px 16px',
                  border: `1px solid ${active ? C.accent3 : '#ddcdb4'}`,
                  borderRadius: 9,
                  cursor: 'pointer',
                  fontFamily: KH,
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: active ? '#fff' : C.muted2,
                  background: active ? 'linear-gradient(135deg,#d2703f,#a84d22)' : '#fdfaf4',
                }}
              >
                កិច្ចតែងការ {toKh(i + 1)}
              </button>
            );
          })}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 90px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
          <A4Page
            editable
            title={title}
            titleColor={C.ink}
            subject={subject}
            grade={grade}
            duration={DURATIONS.find((d) => d.v === duration)?.l ?? `${duration} នាទី`}
            chapter={`ជំពូកទី ${curCh.no} ៖ ${curCh.title}`}
            lesson={`មេរៀនទី ${curLesson.no} ៖ ${curLesson.title}`}
          />
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// A4 MoEYS lesson-plan page (shared by preview + result)
// ════════════════════════════════════════════════════════════════════
function A4Page(props: {
  title: string;
  titleColor: string;
  subject: string;
  grade: string;
  duration: string;
  chapter: string;
  lesson: string;
  editable?: boolean;
  ghost?: boolean;
}) {
  const { title, titleColor, subject, grade, duration, chapter, lesson, editable, ghost } = props;

  const h2: React.CSSProperties = {
    fontFamily: KO,
    fontWeight: 400,
    fontSize: 17,
    color: C.accent,
    letterSpacing: '.3px',
    margin: '0 0 10px',
  };
  const td: React.CSSProperties = { border: '1px solid #ecdcc2', padding: '9px 10px', verticalAlign: 'top' };
  const th: React.CSSProperties = {
    border: '1px solid #e0cdab',
    padding: '8px 10px',
    textAlign: 'left',
    fontFamily: KO,
    fontWeight: 400,
    color: '#7a4a22',
  };

  return (
    <div
      className="lp-page"
      style={{
        width: 760,
        maxWidth: 'calc(100vw - 84px)',
        background: '#fff',
        borderRadius: 4,
        boxShadow: '0 30px 70px -34px rgba(60,40,15,.55),0 2px 6px rgba(60,40,15,.08)',
        overflow: 'hidden',
        opacity: ghost ? 0.97 : 1,
      }}
    >
      {/* Royal header */}
      <div style={{ padding: '38px 56px 26px', borderBottom: '2px solid #2f2519', textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: C.muted2, letterSpacing: '.5px' }}>ព្រះរាជាណាចក្រកម្ពុជា</div>
        <div style={{ fontSize: 13, color: C.muted2, marginTop: 1 }}>ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
        <div style={{ fontSize: 8.5, color: '#b3a386', fontWeight: 700, letterSpacing: '1.5px', marginTop: 4 }}>
          MINISTRY OF EDUCATION, YOUTH AND SPORT
        </div>
        <div style={{ width: 44, height: 2.5, background: C.accent2, borderRadius: 2, margin: '15px auto' }} />
        <div style={{ fontSize: 14, color: C.muted, letterSpacing: '.3px' }}>កិច្ចតែងការបង្រៀន</div>
        <h1 style={{ fontFamily: KO, fontSize: 27, letterSpacing: '.4px', lineHeight: 1.3, color: titleColor, marginTop: 4 }}>
          {title}
        </h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 14 }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: C.accent, background: '#fbe8d8', padding: '5px 13px', borderRadius: 8 }}>
            {subject}
          </span>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#4a5d8a', background: '#e3eaf5', padding: '5px 13px', borderRadius: 8 }}>
            {grade}
          </span>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#3f7a52', background: '#e3efe3', padding: '5px 13px', borderRadius: 8 }}>
            {duration}
          </span>
        </div>
        <div style={{ fontSize: 13, color: '#5a4d3d', marginTop: 13 }}>{chapter}</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{lesson}</div>
      </div>

      {/* Body */}
      <div
        contentEditable={editable}
        suppressContentEditableWarning
        spellCheck={false}
        style={{
          padding: '34px 56px 56px',
          outline: 'none',
          fontFamily: KH,
          fontSize: 13.5,
          lineHeight: 1.85,
          color: C.body,
          caretColor: C.accent,
          minHeight: 520,
        }}
      >
        <h2 style={h2}>១. គោលបំណង</h2>
        <ul style={{ margin: '0 0 22px', paddingLeft: 22 }}>
          {SAMPLE_OBJECTIVES.map((o) => (
            <li key={o.cat} style={{ marginBottom: 6 }}>
              <b>{o.cat} ៖</b> {o.text}
            </li>
          ))}
        </ul>

        <h2 style={h2}>២. សម្ភារៈបង្រៀន និងឯកសារយោង</h2>
        <p style={{ margin: '0 0 6px' }}>
          <b>សម្ភារៈ ៖</b> ក្តារខៀន និងប៉ាកាពណ៌ · សន្លឹកលំហាត់សម្រាប់សិស្ស · រូបភាព ឬគំរូជាក់ស្តែង។
        </p>
        <p style={{ margin: '0 0 22px' }}>
          <b>ឯកសារយោង ៖</b> សៀវភៅសិក្សា — ក្រសួងអប់រំ យុវជន និងកីឡា · មគ្គុទេសក៍គ្រូបង្រៀន MoEYS។
        </p>

        <h2 style={{ ...h2, margin: '0 0 12px' }}>៣. ដំណើរការបង្រៀន និងរៀន</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 24 }}>
          <thead>
            <tr style={{ background: '#f6e2cb' }}>
              <th style={{ ...th, width: '30%' }}>ដំណាក់កាល</th>
              <th style={{ ...th, width: '8%' }}>ពេល</th>
              <th style={th}>សកម្មភាពគ្រូ</th>
              <th style={th}>សកម្មភាពសិស្ស</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_PROCEDURE.map((p, i) => (
              <tr key={p.stage} style={{ verticalAlign: 'top', background: i % 2 ? '#fdfaf4' : '#fff' }}>
                <td style={{ ...td, fontWeight: 700, color: C.accent }}>{p.stage}</td>
                <td style={td}>{p.time}</td>
                <td style={td}>{p.teacher}</td>
                <td style={td}>{p.student}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 style={h2}>៤. ការវាយតម្លៃ</h2>
        <p style={{ margin: 0 }}>
          តាមដានការចូលរួមរបស់សិស្សក្នុងថ្នាក់ ពិនិត្យលំហាត់ និងវាយតម្លៃតាមរយៈសំណួរ-ចម្លើយ
          ដើម្បីវាស់ស្ទង់កម្រិតយល់ដឹង។
        </p>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Small shared UI bits
// ════════════════════════════════════════════════════════════════════
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 13px',
  border: `1.5px solid ${C.borderSoft}`,
  borderRadius: 11,
  fontFamily: KH,
  fontSize: 13.5,
  background: '#fdfaf4',
  color: C.body,
  outline: 'none',
  boxSizing: 'border-box',
};

function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <h2 style={{ fontFamily: KO, fontSize: 16, color: C.ink, letterSpacing: '.3px', margin: '0 0 12px', ...style }}>
      {children}
    </h2>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.muted2, marginBottom: 7 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: (string | { v: string; l: string })[];
}) {
  const opts = options.map((o) => (typeof o === 'string' ? { v: o, l: o } : o));
  return (
    <Field label={label}>
      <div style={{ position: 'relative' }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...inputStyle, appearance: 'none', paddingRight: 34, cursor: 'pointer' }}
        >
          {opts.map((o) => (
            <option key={o.v} value={o.v}>
              {o.l}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }}
        />
      </div>
    </Field>
  );
}

function Stepper({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        border: `1.5px solid ${C.borderSoft}`,
        background: '#fdf8f0',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: C.muted2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  );
}

function IconBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 28,
        height: 26,
        border: 'none',
        borderRadius: 7,
        background: 'transparent',
        cursor: 'pointer',
        color: '#5a4d3d',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </button>
  );
}

function ToolBtn({
  children,
  onClick,
  primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '9px 14px',
        borderRadius: 10,
        cursor: 'pointer',
        fontFamily: KH,
        fontSize: 12.5,
        fontWeight: 700,
        border: primary ? 'none' : `1px solid ${C.border}`,
        color: primary ? '#fff' : C.muted2,
        background: primary ? 'linear-gradient(135deg,#d2703f,#a84d22)' : C.panel,
        boxShadow: primary ? '0 8px 18px -10px rgba(168,77,34,.6)' : 'none',
      }}
    >
      {children}
    </button>
  );
}

function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div
      className="lp-no-print"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        zIndex: 1000,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => {
        const tone =
          t.type === 'error'
            ? { bd: '#f3c6c0', bg: '#fdecea', ic: '#c0392b' }
            : t.type === 'info'
            ? { bd: '#cdddf0', bg: '#eef3fb', ic: '#3a6ea8' }
            : { bd: '#d8e3d8', bg: '#e8f1e8', ic: C.green };
        return (
          <div
            key={t.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              minWidth: 280,
              maxWidth: 380,
              padding: '13px 15px',
              borderRadius: 13,
              background: C.panel,
              border: `1px solid ${tone.bd}`,
              boxShadow: '0 12px 28px -12px rgba(90,60,25,.4)',
              pointerEvents: 'auto',
              color: C.body,
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                flex: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: tone.bg,
                color: tone.ic,
                fontWeight: 700,
              }}
            >
              {t.type === 'error' ? '✕' : t.type === 'info' ? 'i' : '✓'}
            </div>
            <span style={{ flex: 1, fontSize: 13 }}>{t.message}</span>
            <button
              onClick={() => onDismiss(t.id)}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: C.muted }}
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Signup gate — anonymous work is saved on-device; offer cloud sync.
// ════════════════════════════════════════════════════════════════════
function SignupGate({ locale, onClose }: { locale: string; onClose: () => void }) {
  return (
    <div
      className="lp-no-print"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        background: 'rgba(33,27,23,.45)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 380,
          maxWidth: '100%',
          background: C.panel,
          borderRadius: 18,
          padding: '26px 24px',
          boxShadow: '0 30px 70px -20px rgba(60,40,15,.5)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 54,
            height: 54,
            margin: '0 auto 14px',
            borderRadius: 15,
            background: 'linear-gradient(135deg,#d2703f,#a84d22)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
          }}
        >
          <Sparkles size={26} />
        </div>
        <h3 style={{ fontFamily: KO, fontSize: 20, color: C.ink, letterSpacing: '.3px' }}>
          រក្សាទុករួចហើយក្នុងឧបករណ៍នេះ
        </h3>
        <p style={{ fontSize: 13.5, color: C.muted, marginTop: 8, lineHeight: 1.7 }}>
          បង្កើតគណនីដោយឥតគិតថ្លៃ ដើម្បី sync ការងាររបស់អ្នកគ្រប់ឧបករណ៍ ចែករំលែក
          និងភ្ជាប់ជាមួយសាលា។
        </p>
        <Link
          href={`/${locale}/register-school`}
          style={{
            display: 'block',
            marginTop: 18,
            padding: '13px',
            borderRadius: 12,
            background: 'linear-gradient(135deg,#d2703f,#a84d22)',
            color: '#fff',
            fontFamily: KO,
            fontSize: 16,
            letterSpacing: '.4px',
            textDecoration: 'none',
          }}
        >
          បង្កើតគណនីឥតគិតថ្លៃ
        </Link>
        <Link
          href={`/${locale}/auth/login`}
          style={{ display: 'block', marginTop: 10, fontSize: 13, color: C.accent, textDecoration: 'none' }}
        >
          មានគណនីរួចហើយ? ចូល
        </Link>
        <button
          onClick={onClose}
          style={{ marginTop: 14, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, color: C.muted }}
        >
          ពេលក្រោយ
        </button>
      </div>
    </div>
  );
}
