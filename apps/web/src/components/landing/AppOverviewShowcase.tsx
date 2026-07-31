'use client';

import { Sparkles, MessageSquare, TrendingUp, CheckCircle2, Zap, Layers, Bell } from 'lucide-react';

export function AppOverviewShowcase({ isKm }: { isKm: boolean }) {
  const fontTitle = isKm ? "'Koulen', sans-serif" : "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
  const fontBody = isKm ? "'Battambang', sans-serif" : "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

  return (
    <section className="w-full relative overflow-hidden py-24 sm:py-32 bg-gradient-to-b from-sky-50/90 via-indigo-50/40 to-emerald-50/70 border-b border-gray-100">
      {/* Background Ambient Glow & Dot Grid Pattern (Full-Screen Edge-to-Edge) */}
      <div 
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#94a3b8 1.2px, transparent 1.2px)',
          backgroundSize: '24px 24px'
        }}
      />
      <div className="absolute top-1/4 left-1/6 w-[500px] h-[500px] bg-sky-200/50 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/6 w-[500px] h-[500px] bg-emerald-200/50 rounded-full blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-16 xl:px-20 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/70 border border-emerald-200/80 mb-5 shadow-sm">
            <Sparkles size={15} className="text-emerald-700" />
            <span className="text-xs font-bold text-emerald-800 tracking-wide uppercase" style={{ fontFamily: fontBody }}>
              {isKm ? 'ប្រព័ន្ធសិក្សា និងគ្រប់គ្រងឆ្លាតវៃ' : 'All-In-One Education Ecosystem'}
            </span>
          </div>
          <h2
            className={`font-black text-[#111827] mb-6 ${isKm ? 'text-3xl sm:text-4xl lg:text-5xl' : 'text-4xl sm:text-5xl lg:text-6xl tracking-tight'}`}
            style={{ fontFamily: fontTitle, lineHeight: isKm ? '1.6' : '1.15' }}
          >
            {isKm ? (
              <>
                មុខងារគ្រប់យ៉ាងសម្រាប់ <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-500 to-indigo-600">សិស្ស គ្រូ និងសាលារៀន</span>
              </>
            ) : (
              <>
                Everything you need to <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-500 to-indigo-600">Learn, Teach & Manage</span>
              </>
            )}
          </h2>
          <p className="text-gray-600 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto" style={{ fontFamily: fontBody }}>
            {isKm
              ? 'ភ្ជាប់ទំនាក់ទំនងរវាងសិស្ស គ្រូបង្រៀន និងមាតាបិតា ជាមួយប្រព័ន្ធបណ្តាញសង្គមអប់រំ និងឧបករណ៍ AI ជំនួយការបង្រៀនស្តង់ដារ MoEYS។'
              : 'Connect students, educators, and parents seamlessly with our MoEYS-compliant AI tools, automated grading, and social learning feed.'}
          </p>
        </div>

        {/* ── Full-Screen Edge-to-Edge Canvas Area ── */}
        <div className="relative w-full min-h-[560px] sm:min-h-[640px] flex items-center justify-center">

          {/* ── CENTER PHONE MOCKUP (Matching Screenshot) ── */}
          <div className="relative z-20 w-[280px] sm:w-[330px] aspect-[9/18.5] bg-[#0d1117] rounded-[48px] p-3.5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] border-[6px] border-gray-800 transform hover:scale-[1.01] transition-transform duration-500">
            {/* Dynamic Island / Notch */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-4 bg-black rounded-full z-30 flex items-center justify-end px-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#101827] border border-gray-800" />
            </div>

            {/* Screen Display Area */}
            <div className="w-full h-full bg-[#111827] rounded-[36px] overflow-hidden flex flex-col relative text-white border border-gray-800/80">
              
              {/* Phone Header */}
              <div className="pt-8 px-5 pb-3 bg-[#161f2e] border-b border-gray-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white tracking-tight">Stunity OS</h4>
                  <p className="text-[10px] text-gray-400">1,200 active learners</p>
                </div>
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Bell size={12} />
                  </div>
                </div>
              </div>

              {/* Phone Content UI */}
              <div className="flex-1 p-4 flex flex-col gap-3 overflow-hidden bg-gradient-to-b from-[#111827] to-[#0b0f19]">
                
                {/* Chat/Post Item 1 */}
                <div className="bg-[#1f293d] rounded-2xl p-3 border border-gray-700/60 shadow-sm flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xs font-bold shrink-0">
                    👨‍🏫
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-xs font-bold text-white truncate">លោកគ្រូ សុខា</span>
                      <span className="text-[9px] text-gray-400">14:23</span>
                    </div>
                    <p className="text-[11px] text-gray-300 line-clamp-2 leading-snug">
                      កិច្ចតែងការមេរៀនទី២ រួចរាល់ហើយ! សូមសិស្សទាំងអស់ចូលមើលក្នុង Feed។
                    </p>
                  </div>
                </div>

                {/* Chat/Post Item 2 */}
                <div className="bg-[#1f293d] rounded-2xl p-3 border border-gray-700/60 shadow-sm flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xs font-bold shrink-0">
                    👩‍🎓
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-xs font-bold text-white truncate">សិស្ស ណារី</span>
                      <span className="text-[9px] text-gray-400">13:20</span>
                    </div>
                    <p className="text-[11px] text-gray-300 line-clamp-2 leading-snug">
                      ខ្ញុំបានធ្វើតេស្ត Quizzes ជំពូកទី១ រួចរាល់ហើយទទួលបានពិន្ទុ A!
                    </p>
                  </div>
                </div>

                {/* Chat/Post Item 3 */}
                <div className="bg-[#1f293d]/80 rounded-2xl p-3 border border-gray-800 shadow-sm flex items-start gap-2.5 opacity-80">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-xs font-bold shrink-0">
                    🏫
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-xs font-bold text-white truncate">សាលា បាក់ទូក</span>
                      <span className="text-[9px] text-gray-400">11:45</span>
                    </div>
                    <p className="text-[11px] text-gray-300 line-clamp-1">
                      សេចក្តីជូនដំណឹងប្រឡងឆមាសទី១...
                    </p>
                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* ── FLOATING WIDGET 1: Top-Left Toggle Pill (Matching Screenshot) ── */}
          <div className="absolute top-4 sm:top-8 left-0 sm:left-4 z-30 hidden sm:flex items-center gap-3 bg-white/95 backdrop-blur-xl border border-white/90 rounded-full px-4.5 py-2.5 shadow-xl transition-transform hover:scale-105 duration-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-gray-800" style={{ fontFamily: fontBody }}>
              {isKm ? 'ឧបករណ៍ AI ឆ្លាតវៃ' : 'AI Helper Tools'}
            </span>
            <div className="w-8 h-4.5 bg-emerald-500 rounded-full p-0.5 flex items-center justify-end shadow-inner">
              <div className="w-3.5 h-3.5 bg-white rounded-full shadow-sm" />
            </div>
          </div>

          {/* ── FLOATING WIDGET 2: Mid-Left Glass Card (Matching Screenshot) ── */}
          <div className="absolute top-28 sm:top-32 left-0 sm:left-2 z-30 hidden sm:flex flex-col gap-2 bg-white/90 backdrop-blur-xl border border-white/90 rounded-2xl p-4 shadow-xl w-48 transition-transform hover:-translate-y-1 duration-300">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
                <Zap size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900" style={{ fontFamily: fontBody }}>AI Helper</p>
                <p className="text-[10px] text-gray-400">MoEYS Template</p>
              </div>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
              <div className="w-3/4 h-full bg-purple-500 rounded-full" />
            </div>
          </div>

          {/* ── FLOATING WIDGET 3: Bottom-Left Teacher Speech Bubble (Matching Screenshot) ── */}
          <div className="absolute bottom-12 sm:bottom-16 left-0 sm:left-0 z-30 flex items-center gap-3 bg-white/95 backdrop-blur-xl border border-white/90 rounded-2xl p-4 shadow-2xl max-w-[280px] sm:max-w-[340px] transform hover:scale-105 transition-transform duration-300">
            <div className="w-9 h-9 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-sm font-bold shrink-0">
              👩‍🏫
            </div>
            <p className="text-xs font-semibold text-gray-800 leading-snug" style={{ fontFamily: fontBody }}>
              {isKm ? 'តើកិច្ចតែងការមេរៀនទី២ រៀបចំស្របតាម MoEYS ដែរឬទេ?' : 'Is Lesson 2 plan aligned with MoEYS standard?'}
            </p>
          </div>

          {/* ── FLOATING WIDGET 4: Top-Right Stat Badge (Matching Screenshot) ── */}
          <div className="absolute top-6 sm:top-10 right-0 sm:right-4 z-30 hidden sm:flex items-center gap-3 bg-white/95 backdrop-blur-xl border border-white/90 rounded-2xl px-4.5 py-3 shadow-xl transition-transform hover:scale-105 duration-300">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <TrendingUp size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900" style={{ fontFamily: fontBody }}>
                {isKm ? 'ការរៀនសូត្ររបស់សិស្ស' : 'Student Engagement'}
              </p>
              <p className="text-[11px] text-emerald-600 font-bold">
                {isKm ? 'កើនឡើង +១៨% ខែនេះ!' : 'Increased by 18% this month!'}
              </p>
            </div>
          </div>

          {/* ── FLOATING WIDGET 5: Mid-Right 2x2 Floating Grid (Matching Screenshot) ── */}
          <div className="absolute top-32 sm:top-36 right-0 sm:right-6 z-30 hidden sm:grid grid-cols-2 gap-3 bg-white/90 backdrop-blur-xl border border-white/90 p-3.5 rounded-2xl shadow-xl">
            <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-md font-bold text-xs">
              MoEYS
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-500 text-white flex items-center justify-center shadow-md">
              <MessageSquare size={18} />
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
              <CheckCircle2 size={18} />
            </div>
            <div className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center shadow-md">
              <Layers size={18} />
            </div>
          </div>

          {/* ── FLOATING WIDGET 6: Bottom-Right AI Speech Bubble (Matching Screenshot) ── */}
          <div className="absolute bottom-6 sm:bottom-10 right-0 sm:right-0 z-30 flex items-center gap-3 bg-white/95 backdrop-blur-xl border border-white/90 rounded-2xl p-4 shadow-2xl max-w-[290px] sm:max-w-[360px] transform hover:scale-105 transition-transform duration-300">
            <p className="text-xs font-semibold text-gray-800 leading-snug" style={{ fontFamily: fontBody }}>
              {isKm 
                ? 'បាទ! ឧបករណ៍ AI បានរៀបចំកិច្ចតែងការស្តង់ដារក្រសួងអប់រំរួចរាល់ 👨‍🏫' 
                : 'Yes! AI has generated the official MoEYS standard lesson plan automatically 👨‍🏫'}
            </p>
            <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-md">
              <Sparkles size={16} />
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
