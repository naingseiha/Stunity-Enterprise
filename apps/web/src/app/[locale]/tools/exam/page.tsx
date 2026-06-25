'use client';

// Exam Builder — MoEYS exam-paper generator for teachers.
// Ported from the "Lesson Planner" Claude Design as a Stunity creator tool.
// Flow: Hub → Config → Generating → editable MoEYS exam paper.
// Works without an account; Save keeps a device-local draft and invites sign-up.

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  FileText,
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
  buildExercises,
  CHAPTERS,
  DIFFICULTIES,
  DURATION_LABEL,
  EXAM_DURATIONS,
  EXAM_GEN_STEPS,
  FORMATS,
  toKh,
} from './data';
import { GRADES, SUBJECTS } from '../lesson-planner/data';
import { cloudUpsert, getDraft, isAuthed, saveDraft } from '../lib/drafts';

type Screen = 'hub' | 'config' | 'generating' | 'result';
type Toast = { id: number; message: string; type: 'success' | 'info' | 'error' };

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
  custom: '#3f7a52',
};
const KH = "'Battambang', sans-serif";
const KO = "'Koulen', sans-serif";

export default function ExamPage() {
  return (
    <Suspense fallback={null}>
      <ExamBuilder />
    </Suspense>
  );
}

function ExamBuilder() {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();

  const [screen, setScreen] = useState<Screen>('hub');
  const [subject, setSubject] = useState('គណិតវិទ្យា');
  const [grade, setGrade] = useState('ថ្នាក់ទី១២');
  const [chapters, setChapters] = useState<Record<string, boolean>>({ '២': true, '៣': true, '៤': true });
  const [duration, setDuration] = useState('120');
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState('mixed');
  const [format, setFormat] = useState('moeys');
  const [genStep, setGenStep] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [draftId, setDraftId] = useState<string | undefined>(undefined);
  const [showGate, setShowGate] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);

  const selectedChapters = useMemo(() => {
    const sel = CHAPTERS.filter((c) => chapters[c.no]);
    return sel.length ? sel : [CHAPTERS[0]];
  }, [chapters]);
  const isMix = selectedChapters.length > 1;
  const exercises = useMemo(() => buildExercises(count, selectedChapters), [count, selectedChapters]);

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
    scrollTop();
    const steps = [750, 1100, 1300, 1200, 900];
    let i = 0;
    const tick = () => {
      i += 1;
      if (i >= steps.length) {
        setScreen('result');
        notify('បង្កើតវិញ្ញាសាប្រឡងដោយជោគជ័យ');
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

  useEffect(() => {
    const id = searchParams.get('draft');
    if (!id) return;
    const d = getDraft(id);
    if (!d) return;
    const p = d.payload as Record<string, unknown>;
    setDraftId(d.id);
    if (typeof p.subject === 'string') setSubject(p.subject);
    if (typeof p.grade === 'string') setGrade(p.grade);
    if (p.chapters && typeof p.chapters === 'object') setChapters(p.chapters as Record<string, boolean>);
    if (typeof p.duration === 'string') setDuration(p.duration);
    if (typeof p.count === 'number') setCount(p.count);
    if (typeof p.difficulty === 'string') setDifficulty(p.difficulty);
    if (typeof p.format === 'string') setFormat(p.format);
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
      tool: 'exam',
      title: `វិញ្ញាសា ${subject}`,
      subject,
      grade,
      payload: { subject, grade, chapters, duration, count, difficulty, format },
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

  const toggleChapter = (no: string) => setChapters((c) => ({ ...c, [no]: !c[no] }));
  const setCountClamped = (n: number) => setCount(Math.max(3, Math.min(20, n)));

  const accent = format === 'custom' ? C.custom : C.accent;
  const durLabel = DURATION_LABEL[duration] || '២ ម៉ោង';

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
        onConfig={() => go('config')}
        onExit={() => router.push(`/${locale}/tools`)}
      />

      <main
        ref={mainRef as React.RefObject<HTMLElement>}
        style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', overflowY: 'auto' }}
      >
        {screen === 'hub' && <Hub onStart={() => go('config')} />}

        {screen === 'config' && (
          <Config
            subject={subject}
            setSubject={setSubject}
            grade={grade}
            setGrade={setGrade}
            chapters={chapters}
            toggleChapter={toggleChapter}
            duration={duration}
            setDuration={setDuration}
            count={count}
            setCount={setCountClamped}
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            format={format}
            setFormat={setFormat}
            selectedChapters={selectedChapters}
            isMix={isMix}
            exercises={exercises}
            durLabel={durLabel}
            accent={accent}
            onGenerate={generate}
          />
        )}

        {screen === 'generating' && <Generating step={genStep} subject={subject} grade={grade} />}

        {screen === 'result' && (
          <Result
            subject={subject}
            grade={grade}
            durLabel={durLabel}
            selectedChapters={selectedChapters}
            exercises={exercises}
            format={format}
            accent={accent}
            zoom={zoom}
            setZoom={setZoom}
            onRegen={generate}
            onPrint={handlePrint}
            onEdit={() => go('config')}
            onSave={handleSave}
          />
        )}
      </main>

      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
      {showGate && <SignupGate locale={locale} onClose={() => setShowGate(false)} />}

      <style>{`
        @media (max-width: 560px) { .ex-hide-sm { display: none !important; } }
        @media (max-width: 920px) {
          .ex-config-grid { grid-template-columns: 1fr !important; }
          .ex-config-grid > aside { border-right: none !important; }
        }
        @media print {
          body { background: #fff !important; }
          header.ex-no-print, .ex-no-print { display: none !important; }
          main { height: auto !important; overflow: visible !important; }
          .ex-page { box-shadow: none !important; width: 100% !important; max-width: 100% !important; transform: none !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Top bar
// ════════════════════════════════════════════════════════════════════
function TopBar({
  screen,
  onHome,
  onConfig,
  onExit,
}: {
  screen: Screen;
  onHome: () => void;
  onConfig: () => void;
  onExit: () => void;
}) {
  const configActive = screen === 'config' || screen === 'generating' || screen === 'result';
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
      <button
        onClick={onExit}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 12px 8px 9px', borderRadius: 10, border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer', fontFamily: KH, fontSize: 13, color: C.muted2 }}
      >
        <ArrowLeft size={16} />
        <span className="ex-hide-sm">ឧបករណ៍</span>
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg,#e0668a,#c0392b)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flex: 'none' }}>
          <FileText size={16} />
        </div>
        <span className="ex-hide-sm" style={{ fontFamily: KO, fontSize: 16, color: C.ink, letterSpacing: '.4px' }}>
          វិញ្ញាសាប្រឡង
        </span>
      </div>
      <div style={{ flex: 1 }} />
      <nav style={{ display: 'flex', alignItems: 'center', gap: 2, padding: 3, borderRadius: 100, background: '#f3e7d4' }}>
        <button onClick={onHome} style={tab(screen === 'hub')}>
          <Home size={15} />
          <span className="ex-hide-sm">ទំព័រដើម</span>
        </button>
        <button onClick={onConfig} style={tab(configActive)}>
          <Wand2 size={15} />
          <span className="ex-hide-sm">បង្កើត</span>
        </button>
      </nav>
    </header>
  );
}

// ════════════════════════════════════════════════════════════════════
// Hub
// ════════════════════════════════════════════════════════════════════
function Hub({ onStart }: { onStart: () => void }) {
  return (
    <section
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 40px',
        textAlign: 'center',
        background: 'radial-gradient(1200px 500px at 50% -10%, rgba(192,57,43,.08), transparent), #f1e8da',
      }}
    >
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 16px', borderRadius: 100, background: C.panel, border: `1px solid ${C.border}`, marginBottom: 24, fontSize: 12, fontWeight: 700, color: C.accent }}>
        <Sparkles size={14} /> វិញ្ញាសាប្រឡង · បង្កើតដោយ AI
      </div>
      <h1 style={{ fontFamily: KO, fontSize: 'clamp(36px, 5vw, 60px)', lineHeight: 1.15, color: C.ink, letterSpacing: '.5px', marginBottom: 18 }}>
        បង្កើតវិញ្ញាសាប្រឡង
        <br />
        តាមស្តង់ដារ MoEYS
      </h1>
      <p style={{ fontSize: 16, color: C.muted, maxWidth: 540, lineHeight: 1.8, marginBottom: 30 }}>
        ជ្រើសមុខវិជ្ជា ថ្នាក់ និងជំពូក រួច AI នឹងចេញលំហាត់ពីធនាគារសំណួរ
        កំណត់ពិន្ទុ ១០០ និងរៀបចំជាវិញ្ញាសាពេញលេញ។
      </p>
      <button
        onClick={onStart}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '15px 30px', border: 'none', borderRadius: 14, cursor: 'pointer', fontFamily: KO, fontSize: 17, letterSpacing: '.5px', color: '#fff', background: 'linear-gradient(135deg,#d2703f,#a84d22)', boxShadow: '0 14px 30px -12px rgba(168,77,34,.6)' }}
      >
        <Wand2 size={20} /> ចាប់ផ្តើមបង្កើត
      </button>
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
  chapters: Record<string, boolean>;
  toggleChapter: (no: string) => void;
  duration: string;
  setDuration: (v: string) => void;
  count: number;
  setCount: (n: number) => void;
  difficulty: string;
  setDifficulty: (v: string) => void;
  format: string;
  setFormat: (v: string) => void;
  selectedChapters: typeof CHAPTERS;
  isMix: boolean;
  exercises: ReturnType<typeof buildExercises>;
  durLabel: string;
  accent: string;
  onGenerate: () => void;
}) {
  const {
    subject, setSubject, grade, setGrade, chapters, toggleChapter, duration, setDuration,
    count, setCount, difficulty, setDifficulty, format, setFormat, selectedChapters, isMix,
    exercises, durLabel, accent, onGenerate,
  } = props;

  return (
    <>
      <header style={{ padding: '18px 40px', borderBottom: `1px solid ${C.border}`, background: 'rgba(241,232,218,.85)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 5 }}>
        <h1 style={{ fontFamily: KO, fontSize: 24, color: C.ink, letterSpacing: '.4px' }}>បង្កើតវិញ្ញាសាប្រឡង</h1>
        <p style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>ជ្រើសវិសាលភាព និងកំណត់ លំហាត់ ពិន្ទុ និងទម្រង់</p>
      </header>

      <div className="ex-config-grid" style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0,420px) minmax(0,1fr)', alignItems: 'start' }}>
        <aside style={{ background: C.panel, borderRight: `1px solid ${C.border}`, padding: '20px 22px 40px' }}>
          <SectionLabel>ប្រភពមាតិកា</SectionLabel>
          <Select label="មុខវិជ្ជា" value={subject} onChange={setSubject} options={SUBJECTS} />
          <Select label="ថ្នាក់" value={grade} onChange={setGrade} options={GRADES} />

          <Field label="ជំពូកក្នុងវិញ្ញាសា">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {CHAPTERS.map((c) => {
                const on = !!chapters[c.no];
                return (
                  <button
                    key={c.no}
                    onClick={() => toggleChapter(c.no)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, cursor: 'pointer', textAlign: 'left', border: `1.5px solid ${on ? '#e2b48a' : '#ecdfc9'}`, background: on ? '#fbf3e9' : '#fffdf9', transition: 'all .14s' }}
                  >
                    <span style={{ width: 20, height: 20, borderRadius: 6, flex: 'none', border: `1.5px solid ${on ? C.accent3 : '#d8c6a9'}`, background: on ? 'linear-gradient(135deg,#d2703f,#a84d22)' : '#fff', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                      {on ? '✓' : ''}
                    </span>
                    <span style={{ flex: 1 }}>
                      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: C.body }}>ជំពូកទី {c.no} ៖ {c.title}</span>
                      <span style={{ fontSize: 11.5, color: C.muted }}>{toKh(c.lessons.length)} មេរៀន</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Field>

          {isMix && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 100, background: '#fbe8d8', color: C.accent, fontSize: 11.5, fontWeight: 700, marginBottom: 16 }}>
              <Sparkles size={13} /> របៀប Mix · {toKh(selectedChapters.length)} ជំពូក
            </div>
          )}

          <SectionLabel style={{ marginTop: 12 }}>ការកំណត់</SectionLabel>
          <Select label="រយៈពេល" value={duration} onChange={setDuration} options={EXAM_DURATIONS.map((d) => ({ v: d.v, l: d.l }))} />

          <Field label="ចំនួនលំហាត់">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Stepper onClick={() => setCount(count - 1)} disabled={count <= 3}><Minus size={15} /></Stepper>
              <div style={{ fontFamily: KO, fontSize: 22, color: C.ink, minWidth: 28, textAlign: 'center' }}>{toKh(count)}</div>
              <Stepper onClick={() => setCount(count + 1)} disabled={count >= 20}><Plus size={15} /></Stepper>
              <span style={{ fontSize: 12, color: C.muted, flex: 1, textAlign: 'right' }}>១០០ ពិន្ទុសរុប</span>
            </div>
          </Field>

          <Field label="កម្រិតលំបាក">
            <div style={{ display: 'flex', gap: 8 }}>
              {DIFFICULTIES.map((d) => {
                const active = difficulty === d.id;
                return (
                  <button key={d.id} onClick={() => setDifficulty(d.id)} style={{ flex: 1, padding: '10px 4px', border: `1.5px solid ${active ? C.accent3 : C.borderSoft}`, borderRadius: 11, cursor: 'pointer', fontFamily: KH, fontSize: 12.5, fontWeight: 700, color: active ? '#fff' : C.muted, background: active ? 'linear-gradient(135deg,#d2703f,#a84d22)' : '#fdf8f0' }}>
                    {d.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="ទម្រង់">
            <div style={{ display: 'flex', gap: 8 }}>
              {FORMATS.map((f) => {
                const active = format === f.id;
                return (
                  <button key={f.id} onClick={() => setFormat(f.id)} style={{ flex: 1, padding: '13px 14px', border: `1.5px solid ${active ? C.accent3 : C.borderSoft}`, borderRadius: 13, cursor: 'pointer', textAlign: 'left', background: active ? '#fbf3e9' : '#fffdf9' }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: C.body }}>{f.label}</span>
                    <span style={{ fontSize: 11, color: C.muted }}>{f.sub}</span>
                  </button>
                );
              })}
            </div>
          </Field>

          <button
            onClick={onGenerate}
            style={{ width: '100%', marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 15, border: 'none', borderRadius: 14, cursor: 'pointer', fontFamily: KO, fontSize: 17, letterSpacing: '.5px', color: '#fff', background: 'linear-gradient(135deg,#d2703f,#a84d22)', boxShadow: '0 12px 26px -12px rgba(168,77,34,.6)' }}
          >
            <Wand2 size={19} /> បង្កើតដោយ AI
          </button>
        </aside>

        <div style={{ padding: '34px 40px 70px', display: 'flex', justifyContent: 'center' }}>
          <ExamPaper subject={subject} grade={grade} durLabel={durLabel} selectedChapters={selectedChapters} exercises={exercises} format={format} accent={accent} ghost />
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// Generating
// ════════════════════════════════════════════════════════════════════
function Generating({ step, subject, grade }: { step: number; subject: string; grade: string }) {
  const pct = Math.round(((step + 1) / EXAM_GEN_STEPS.length) * 100);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg,#e0668a,#c0392b)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', marginBottom: 26, boxShadow: '0 16px 34px -14px rgba(192,57,43,.6)', animation: 'exPulse 1.4s ease infinite' }}>
        <FileText size={34} />
      </div>
      <h2 style={{ fontFamily: KO, fontSize: 27, color: C.ink, letterSpacing: '.4px', marginBottom: 6 }}>កំពុងបង្កើតវិញ្ញាសា</h2>
      <p style={{ fontSize: 13.5, color: C.muted, marginBottom: 26 }}>វិញ្ញាសា {subject} · {grade}</p>

      <div style={{ width: 380, maxWidth: '90%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ flex: 1, height: 7, background: '#e3d7c2', borderRadius: 7, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#d2703f,#e0a45a)', borderRadius: 7, transition: 'width .5s ease' }} />
          </div>
          <span style={{ fontSize: 15, color: C.accent, minWidth: 42, fontFamily: KO }}>{pct}%</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {EXAM_GEN_STEPS.map((label, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flex: 'none', color: '#fff', background: done ? C.green : active ? C.accent2 : '#dccbb1', animation: active ? 'exPulse 1s ease infinite' : 'none' }}>
                  {done ? '✓' : toKh(i + 1)}
                </div>
                <span style={{ fontSize: 14, fontWeight: active || done ? 700 : 400, color: done ? C.green : active ? C.accent : '#b3a386' }}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>
      <style>{`@keyframes exPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.08);opacity:.85}}`}</style>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Result
// ════════════════════════════════════════════════════════════════════
function Result(props: {
  subject: string;
  grade: string;
  durLabel: string;
  selectedChapters: typeof CHAPTERS;
  exercises: ReturnType<typeof buildExercises>;
  format: string;
  accent: string;
  zoom: number;
  setZoom: (v: number) => void;
  onRegen: () => void;
  onPrint: () => void;
  onEdit: () => void;
  onSave: () => void;
}) {
  const { subject, grade, durLabel, selectedChapters, exercises, format, accent, zoom, setZoom, onRegen, onPrint, onEdit, onSave } = props;
  return (
    <>
      <header className="ex-no-print" style={{ flex: 'none', padding: '11px 22px', display: 'flex', alignItems: 'center', gap: 13, background: C.panel, borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 6, flexWrap: 'wrap' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 13px', borderRadius: 100, background: '#e8f1e8', color: C.green, fontSize: 12, fontWeight: 700 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.green, boxShadow: '0 0 0 3px rgba(79,157,105,.18)' }} />
          រួចរាល់
        </div>
        <h1 style={{ fontFamily: KO, fontSize: 18, color: C.ink, letterSpacing: '.3px', flex: 1, minWidth: 120 }}>វិញ្ញាសា {subject}</h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: 3, borderRadius: 10, background: '#f3e7d4' }}>
          <IconBtn onClick={() => setZoom(Math.max(0.6, +(zoom - 0.1).toFixed(2)))}><ZoomOut size={15} /></IconBtn>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.muted2, minWidth: 38, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
          <IconBtn onClick={() => setZoom(Math.min(1.6, +(zoom + 0.1).toFixed(2)))}><ZoomIn size={15} /></IconBtn>
        </div>

        <ToolBtn onClick={onEdit}><RefreshCw size={15} />កែខ្លឹមសារ</ToolBtn>
        <ToolBtn onClick={onRegen}><Wand2 size={15} />បង្កើតឡើងវិញ</ToolBtn>
        <ToolBtn onClick={onSave}>រក្សាទុក</ToolBtn>
        <ToolBtn primary onClick={onPrint}><Printer size={15} />ទាញយក PDF</ToolBtn>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 90px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
          <ExamPaper editable subject={subject} grade={grade} durLabel={durLabel} selectedChapters={selectedChapters} exercises={exercises} format={format} accent={accent} />
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// A4 exam paper (shared by config preview + result)
// ════════════════════════════════════════════════════════════════════
function ExamPaper(props: {
  subject: string;
  grade: string;
  durLabel: string;
  selectedChapters: typeof CHAPTERS;
  exercises: ReturnType<typeof buildExercises>;
  format: string;
  accent: string;
  editable?: boolean;
  ghost?: boolean;
}) {
  const { subject, grade, durLabel, selectedChapters, exercises, format, accent, editable, ghost } = props;
  const scope = selectedChapters.map((c) => `ជំពូក ${c.no} ៖ ${c.title}`).join(' · ');
  const isCustom = format === 'custom';

  return (
    <div
      className="ex-page"
      style={{ width: 760, maxWidth: 'calc(100vw - 84px)', background: '#fff', borderRadius: 4, boxShadow: '0 30px 70px -34px rgba(60,40,15,.55),0 2px 6px rgba(60,40,15,.08)', overflow: 'hidden', opacity: ghost ? 0.97 : 1 }}
    >
      {isCustom ? (
        <div style={{ background: 'linear-gradient(135deg,#3f7a52,#2f5c3e)', padding: '26px 56px', color: '#fff' }}>
          <div style={{ fontFamily: KO, fontSize: 22, letterSpacing: '.4px' }}>វិញ្ញាសាប្រឡង {subject}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.85)', marginTop: 3 }}>{grade} · ទម្រង់ Customize</div>
        </div>
      ) : (
        <div style={{ padding: '34px 56px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: C.muted2, letterSpacing: '.5px' }}>ព្រះរាជាណាចក្រកម្ពុជា</div>
          <div style={{ fontSize: 13, color: C.muted2, marginTop: 1 }}>ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
          <div style={{ fontSize: 8.5, color: '#b3a386', fontWeight: 700, letterSpacing: '1.5px', marginTop: 4 }}>MINISTRY OF EDUCATION, YOUTH AND SPORT</div>
          <div style={{ width: 44, height: 2.5, background: accent, borderRadius: 2, margin: '13px auto' }} />
        </div>
      )}

      <div style={{ padding: isCustom ? '26px 56px 56px' : '0 56px 56px' }}>
        {/* title block */}
        <div style={{ textAlign: 'center', borderTop: `2px solid ${C.ink}`, borderBottom: `2px solid ${C.ink}`, padding: '14px 0', marginBottom: 18 }}>
          <h1 contentEditable={editable} suppressContentEditableWarning style={{ fontFamily: KO, fontSize: 27, color: C.ink, letterSpacing: '.5px', outline: 'none' }}>
            វិញ្ញាសាប្រឡង មុខវិជ្ជា{subject}
          </h1>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 8, fontSize: 13, color: C.muted2, flexWrap: 'wrap' }}>
            <span>ថ្នាក់ ៖ <b>{grade}</b></span>
            <span>រយៈពេល ៖ <b>{durLabel}</b></span>
            <span>ពិន្ទុសរុប ៖ <b>១០០</b></span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 12.5, color: '#8a7d6b' }}>
          <FileText size={14} style={{ color: accent }} />
          <span>វិសាលភាព ៖ {scope}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, padding: '9px 13px', borderRadius: 9, background: '#f6efe3', fontSize: 11.5, color: C.muted }}>
          សិស្សត្រូវដោះស្រាយលំហាត់ទាំងអស់។ ចម្លើយត្រូវសរសេរឲ្យបានច្បាស់លាស់ និងមានដំណើរការគណនា។
        </div>

        <div contentEditable={editable} suppressContentEditableWarning spellCheck={false} style={{ display: 'flex', flexDirection: 'column', gap: 18, outline: 'none', caretColor: accent }}>
          {exercises.map((ex) => (
            <div key={ex.no} style={{ display: 'flex', gap: 14 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: '#fbe8d8', color: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: KO, fontSize: 14, flex: 'none' }}>{ex.no}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 5, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, color: C.body, fontSize: 13.5, whiteSpace: 'nowrap' }}>លំហាត់ទី {ex.no}</span>
                  {ex.showChip && (
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: '#a06a3a', background: '#f6e7d4', padding: '3px 9px', borderRadius: 7, whiteSpace: 'nowrap' }}>{ex.chapTag}</span>
                  )}
                  <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: C.accent, whiteSpace: 'nowrap' }}>( {ex.points} ពិន្ទុ )</span>
                </div>
                <p style={{ fontSize: 13.5, lineHeight: 1.8, color: C.body, margin: 0 }}>{ex.statement}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 34, paddingTop: 16, borderTop: '1px solid #f1e7d6' }}>
          <span style={{ fontSize: 11, color: '#b3a386' }}>បង្កើតដោយ Stunity AI</span>
          <span style={{ fontSize: 12, color: C.muted2, fontStyle: 'italic' }}>— សូមជូនពរសំណាងល្អ —</span>
        </div>
      </div>
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
  background: '#fdfaf4',
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

function Stepper({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ width: 36, height: 36, borderRadius: 10, border: `1.5px solid ${C.borderSoft}`, background: '#fdf8f0', cursor: disabled ? 'not-allowed' : 'pointer', color: C.muted2, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : 1 }}>
      {children}
    </button>
  );
}

function IconBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ width: 28, height: 26, border: 'none', borderRadius: 7, background: 'transparent', cursor: 'pointer', color: '#5a4d3d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </button>
  );
}

function ToolBtn({ children, onClick, primary }: { children: React.ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: KH, fontSize: 12.5, fontWeight: 700, border: primary ? 'none' : `1px solid ${C.border}`, color: primary ? '#fff' : C.muted2, background: primary ? 'linear-gradient(135deg,#d2703f,#a84d22)' : C.panel, boxShadow: primary ? '0 8px 18px -10px rgba(168,77,34,.6)' : 'none' }}>
      {children}
    </button>
  );
}

function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="ex-no-print" style={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 10, zIndex: 1000, pointerEvents: 'none' }}>
      {toasts.map((t) => {
        const tone = t.type === 'error' ? { bd: '#f3c6c0', bg: '#fdecea', ic: '#c0392b' } : t.type === 'info' ? { bd: '#cdddf0', bg: '#eef3fb', ic: '#3a6ea8' } : { bd: '#d8e3d8', bg: '#e8f1e8', ic: C.green };
        return (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 280, maxWidth: 380, padding: '13px 15px', borderRadius: 13, background: C.panel, border: `1px solid ${tone.bd}`, boxShadow: '0 12px 28px -12px rgba(90,60,25,.4)', pointerEvents: 'auto', color: C.body }}>
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
    <div className="ex-no-print" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(33,27,23,.45)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 380, maxWidth: '100%', background: C.panel, borderRadius: 18, padding: '26px 24px', boxShadow: '0 30px 70px -20px rgba(60,40,15,.5)', textAlign: 'center' }}>
        <div style={{ width: 54, height: 54, margin: '0 auto 14px', borderRadius: 15, background: 'linear-gradient(135deg,#d2703f,#a84d22)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <Sparkles size={26} />
        </div>
        <h3 style={{ fontFamily: KO, fontSize: 20, color: C.ink, letterSpacing: '.3px' }}>រក្សាទុករួចហើយក្នុងឧបករណ៍នេះ</h3>
        <p style={{ fontSize: 13.5, color: C.muted, marginTop: 8, lineHeight: 1.7 }}>បង្កើតគណនីដោយឥតគិតថ្លៃ ដើម្បី sync ការងាររបស់អ្នកគ្រប់ឧបករណ៍ ចែករំលែក និងភ្ជាប់ជាមួយសាលា។</p>
        <Link href={`/${locale}/register-school`} style={{ display: 'block', marginTop: 18, padding: 13, borderRadius: 12, background: 'linear-gradient(135deg,#d2703f,#a84d22)', color: '#fff', fontFamily: KO, fontSize: 16, letterSpacing: '.4px', textDecoration: 'none' }}>
          បង្កើតគណនីឥតគិតថ្លៃ
        </Link>
        <Link href={`/${locale}/auth/login`} style={{ display: 'block', marginTop: 10, fontSize: 13, color: C.accent, textDecoration: 'none' }}>មានគណនីរួចហើយ? ចូល</Link>
        <button onClick={onClose} style={{ marginTop: 14, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, color: C.muted }}>ពេលក្រោយ</button>
      </div>
    </div>
  );
}
