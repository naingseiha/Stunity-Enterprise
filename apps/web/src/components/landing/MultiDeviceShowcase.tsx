import { Sparkles, LayoutDashboard, MessageCircle, MonitorSmartphone } from 'lucide-react';
import Link from 'next/link';

export function MultiDeviceShowcase({ isKm, locale }: { isKm: boolean, locale: string }) {
  const fontTitle = isKm ? "'Koulen', sans-serif" : "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

  return (
    <section className="py-24 sm:py-32 bg-white relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 mb-6">
            <MonitorSmartphone size={16} className="text-indigo-600" />
            <span className="text-xs font-bold text-indigo-700 tracking-wide uppercase">
              {isKm ? 'ដំណើរការគ្រប់ប្រព័ន្ធ' : 'Cross-Platform Ecosystem'}
            </span>
          </div>
          <h2 
            className={`font-black text-[#111827] mb-6 ${isKm ? 'text-3xl sm:text-5xl' : 'text-4xl sm:text-5xl lg:text-6xl tracking-tight'}`}
            style={{ fontFamily: fontTitle, lineHeight: isKm ? '1.7' : '1.15' }}
          >
            {isKm ? 'ភ្ជាប់សាលារៀនរបស់អ្នកនៅលើ' : 'Connect Your Entire School On'}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">
              {isKm ? 'គ្រប់ឧបករណ៍' : 'Any Device'}
            </span>
          </h2>
          <p className="text-gray-500 text-sm sm:text-base leading-relaxed">
            {isKm 
              ? 'ប្រើប្រាស់ Stunity តាមរយៈកុំព្យូទ័រសម្រាប់រដ្ឋបាល និងតាមរយៈកម្មវិធីទូរសព្ទ iOS/Android សម្រាប់សិស្ស និងលោកគ្រូអ្នកគ្រូ។' 
              : 'Access the powerful School OS on web for administrators, and our seamless iOS & Android apps for students, parents, and teachers.'}
          </p>
        </div>

        {/* Creative Multi-Device Mockup Showcase */}
        <div className="relative w-full max-w-5xl mx-auto h-[400px] sm:h-[600px] flex items-center justify-center mt-10">
          
          {/* Ambient Background Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[800px] aspect-[2/1] bg-gradient-to-r from-indigo-300/40 via-purple-300/30 to-rose-300/40 blur-[80px] rounded-full pointer-events-none" />

          {/* ── Laptop Mockup (Center/Back) ── */}
          <div className="absolute top-0 md:top-8 left-1/2 -translate-x-1/2 w-[85%] max-w-[700px] z-10 transform transition-transform duration-700 hover:scale-[1.02]">
            {/* Screen */}
            <div className="relative bg-black rounded-t-[20px] p-2.5 sm:p-4 shadow-2xl pb-1">
              {/* Webcam */}
              <div className="absolute top-1 sm:top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-gray-800 border border-gray-700" />
              {/* Display Area */}
              <div className="w-full aspect-[16/10] bg-[#f8fafc] rounded-lg sm:rounded-xl overflow-hidden border border-gray-800 flex flex-col relative">
                {/* Dashboard Navbar */}
                <div className="w-full h-8 sm:h-12 bg-white border-b border-gray-200 flex items-center px-4 justify-between">
                  <div className="w-16 sm:w-24 h-2 sm:h-3 bg-indigo-100 rounded-full" />
                  <div className="flex gap-2">
                    <div className="w-4 h-4 sm:w-6 sm:h-6 rounded-full bg-gray-100" />
                    <div className="w-4 h-4 sm:w-6 sm:h-6 rounded-full bg-gray-200" />
                  </div>
                </div>
                {/* Dashboard Content */}
                <div className="flex-1 p-4 flex gap-4">
                  {/* Sidebar */}
                  <div className="w-1/4 h-full bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col p-3 gap-3">
                     <div className="w-full h-6 bg-indigo-50 rounded-md" />
                     <div className="w-3/4 h-3 bg-gray-100 rounded-sm" />
                     <div className="w-2/3 h-3 bg-gray-100 rounded-sm" />
                  </div>
                  {/* Main Grid */}
                  <div className="flex-1 flex flex-col gap-4">
                     <div className="w-1/3 h-6 bg-gray-800 rounded-md" />
                     <div className="flex gap-4">
                       <div className="flex-1 h-20 sm:h-24 bg-white rounded-xl shadow-sm border border-gray-100" />
                       <div className="flex-1 h-20 sm:h-24 bg-white rounded-xl shadow-sm border border-gray-100" />
                     </div>
                     <div className="w-full flex-1 bg-white rounded-xl shadow-sm border border-gray-100 p-4 relative overflow-hidden">
                       <div className="w-full h-full bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg opacity-50" />
                       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-300">
                         <LayoutDashboard size={48} />
                       </div>
                     </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Base/Keyboard Area */}
            <div className="w-[110%] -ml-[5%] h-3 sm:h-4 bg-gray-300 rounded-b-xl rounded-t-sm shadow-xl relative border-t border-gray-400">
               <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/4 h-1 sm:h-1.5 bg-gray-400 rounded-b-md" />
            </div>
          </div>

          {/* ── iOS Phone Mockup (Left/Front) ── */}
          <div className="absolute bottom-10 sm:bottom-0 left-0 sm:left-[10%] w-[120px] sm:w-[180px] z-20 transform -rotate-6 hover:-translate-y-4 hover:rotate-0 transition-all duration-500 shadow-glass-lg animate-float">
            <div className="w-full aspect-[1/2.16] bg-white rounded-[24px] sm:rounded-[36px] p-1 sm:p-1.5 shadow-2xl border-[4px] sm:border-[6px] border-gray-200">
              <div className="w-full h-full bg-gradient-to-b from-indigo-500 to-purple-600 rounded-[18px] sm:rounded-[28px] overflow-hidden relative border border-gray-100 shadow-inner">
                {/* Dynamic Island */}
                <div className="absolute top-1 sm:top-2 left-1/2 -translate-x-1/2 w-[40px] sm:w-[60px] h-[12px] sm:h-[18px] bg-black rounded-full z-30" />
                
                {/* Social Feed UI Mockup */}
                <div className="p-3 sm:p-4 pt-8 sm:pt-10 flex flex-col gap-3 h-full">
                  <div className="w-full h-16 sm:h-24 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/30">
                     <MessageCircle className="text-white/80 w-6 h-6 sm:w-8 sm:h-8" />
                  </div>
                  <div className="w-full h-12 sm:h-16 bg-white/10 rounded-xl" />
                  <div className="w-full h-12 sm:h-16 bg-white/10 rounded-xl" />
                  <div className="mt-auto flex justify-between px-2">
                    <div className="w-4 h-4 sm:w-6 sm:h-6 bg-white/40 rounded-full" />
                    <div className="w-4 h-4 sm:w-6 sm:h-6 bg-white/40 rounded-full" />
                    <div className="w-4 h-4 sm:w-6 sm:h-6 bg-white/40 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
            {/* Floating Label */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-white px-3 py-1 rounded-full shadow-md border border-gray-100 text-[10px] font-bold text-gray-800 whitespace-nowrap">
              iOS App
            </div>
          </div>

          {/* ── Android Phone Mockup (Right/Front) ── */}
          <div className="absolute bottom-16 sm:bottom-10 right-0 sm:right-[10%] w-[110px] sm:w-[170px] z-20 transform rotate-6 hover:-translate-y-4 hover:rotate-0 transition-all duration-500 shadow-glass-lg animate-float-slow">
            <div className="w-full aspect-[1/2.1] bg-gray-900 rounded-[20px] sm:rounded-[32px] p-0.5 shadow-2xl border-[3px] sm:border-[4px] border-gray-800">
              <div className="w-full h-full bg-[#faf9ff] rounded-[16px] sm:rounded-[26px] overflow-hidden relative border border-gray-700 shadow-inner">
                {/* Hole Punch Camera */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-black rounded-full z-30" />
                
                {/* Quiz/Learn UI Mockup */}
                <div className="p-3 pt-8 flex flex-col gap-2 h-full">
                  <div className="w-2/3 h-3 sm:h-4 bg-gray-800 rounded-full mb-2" />
                  <div className="w-full h-24 sm:h-32 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute bottom-0 right-0 w-16 h-16 bg-indigo-200 rounded-tl-full opacity-50" />
                    <Sparkles className="text-indigo-400 w-8 h-8 z-10" />
                  </div>
                  <div className="w-full h-8 sm:h-10 bg-indigo-600 rounded-lg mt-auto flex items-center justify-center">
                    <div className="w-1/2 h-2 bg-white/50 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
            {/* Floating Label */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-white px-3 py-1 rounded-full shadow-md border border-gray-100 text-[10px] font-bold text-gray-800 whitespace-nowrap">
              Android App
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
