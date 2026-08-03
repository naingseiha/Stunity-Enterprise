'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles, Shield, Send, Youtube, Facebook, Video, HelpCircle, FileText, Globe } from 'lucide-react';

export function Footer({ locale, isKm }: { locale: string; isKm: boolean }) {
  const fontTitle = isKm ? "'Koulen', sans-serif" : "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
  const fontBody = isKm ? "'Battambang', sans-serif" : "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

  const currentYear = new Date().getFullYear();

  return (
    <footer id="contact" className="bg-[#0b0f17] text-gray-400 relative overflow-hidden pt-16 pb-12">
      
      {/* ── PRE-FOOTER ENTERPRISE CTA BANNER ── */}
      <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-16 xl:px-20 mb-20">
        <div className="relative rounded-[32px] sm:rounded-[40px] p-8 sm:p-14 overflow-hidden bg-gradient-to-r from-sky-950 via-[#111827] to-blue-950 border border-gray-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col lg:flex-row items-center justify-between gap-8">
          
          {/* Ambient Glows */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-[90px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-orange-500/10 rounded-full blur-[90px] pointer-events-none" />

          {/* Banner Text */}
          <div className="relative z-10 max-w-2xl text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-400 text-xs font-bold mb-4">
              <Sparkles size={14} />
              <span>{isKm ? 'ផ្លាស់ប្តូរការគ្រប់គ្រងសាលារៀន' : 'TRANSFORM YOUR INSTITUTION'}</span>
            </div>
            <h2 
              className={`font-bold text-white mb-4 ${isKm ? 'text-2xl sm:text-3xl lg:text-4xl' : 'text-3xl sm:text-4xl lg:text-5xl tracking-tight'}`}
              style={{ fontFamily: fontTitle, lineHeight: isKm ? '1.5' : '1.15' }}
            >
              {isKm ? (
                <>ចាប់ផ្តើមប្រើប្រាស់ <span className="text-sky-400">Stunity Enterprise</span> ថ្ងៃនេះ</>
              ) : (
                <>Ready to connect your <span className="text-sky-400">school operations</span>?</>
              )}
            </h2>
            <p className="text-gray-300 text-xs sm:text-sm leading-relaxed" style={{ fontFamily: fontBody }}>
              {isKm
                ? 'ចុះឈ្មោះសាលាដោយខ្លួនឯង ហើយរៀបចំសាលា ឆ្នាំសិក្សា ក្រុមការងារ និងទិន្នន័យសិស្សក្នុងប្រព័ន្ធតែមួយ។'
                : 'Register your school online and organize schools, academic years, staff, and student data in one connected platform.'}
            </p>
          </div>

          {/* Banner CTA Buttons — Fully Rounded Pills */}
          <div className="relative z-10 flex flex-wrap gap-4 shrink-0 justify-center">
            <Link
              href={`/${locale}/register-school`}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-[#09CFF7] hover:bg-sky-300 text-[#082f49] font-extrabold text-xs sm:text-sm shadow-lg hover:shadow-sky-500/20 transition-all duration-200"
              style={{ fontFamily: fontBody }}
            >
              <span>{isKm ? 'ចុះឈ្មោះឥតគិតថ្លៃ' : 'Get Started Free'}</span>
              <ArrowRight size={16} />
            </Link>
            <a
              href="#contact"
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-white/10 hover:bg-white/15 text-white border border-white/20 font-bold text-xs sm:text-sm transition-all duration-200 backdrop-blur-md"
              style={{ fontFamily: fontBody }}
            >
              {isKm ? 'ទំនាក់ទំនងសាកល្បង' : 'Contact Sales'}
            </a>
          </div>

        </div>
      </div>

      {/* ── MAIN FOOTER MULTI-COLUMN GRID ── */}
      <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-16 xl:px-20 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-16">
          
          {/* Col 1: Brand & Mission (Spans 2 cols on lg) */}
          <div className="lg:col-span-2 space-y-6">
            <Link href={`/${locale}`} className="inline-flex items-center gap-2">
              <img src="/Stunity.png" alt="Stunity" className="h-7 w-auto filter brightness-200" />
              <span className="font-extrabold text-white text-lg tracking-wider">STUNITY.™</span>
            </Link>

            <p className="text-gray-400 text-xs sm:text-sm leading-relaxed max-w-sm" style={{ fontFamily: fontBody }}>
              {isKm
                ? 'ប្រព័ន្ធគ្រប់គ្រងសាលា និងសហគមន៍សិក្សា ដែលភ្ជាប់សិស្ស គ្រូ មាតាបិតា និងអ្នកគ្រប់គ្រងលើ Web និង Mobile។'
                : 'A school management and social learning platform connecting students, teachers, parents, and administrators across web and mobile.'}
            </p>

            {/* Real-time Status Badge */}
            <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-orange-400" />
              <span style={{ fontFamily: fontBody }}>{isKm ? 'គាំទ្រភាសាខ្មែរ និងអង់គ្លេស' : 'Khmer & English Platform'}</span>
            </div>

            {/* Social Glass Circles */}
            <div className="flex items-center gap-3 pt-2">
              {[
                { icon: <Send size={15} />, href: 'https://t.me', label: 'Telegram' },
                { icon: <Facebook size={15} />, href: 'https://facebook.com', label: 'Facebook' },
                { icon: <Youtube size={15} />, href: 'https://youtube.com', label: 'YouTube' },
                { icon: <Video size={15} />, href: 'https://tiktok.com', label: 'TikTok' },
              ].map((s, i) => (
                <a
                  key={i}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="w-9 h-9 rounded-full bg-white/5 hover:bg-sky-500/20 hover:text-sky-400 border border-white/10 flex items-center justify-center text-gray-400 transition-all duration-200"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Col 2: Products & Platform */}
          <div className="space-y-4">
            <h4 className="text-white text-xs font-bold uppercase tracking-wider" style={{ fontFamily: fontTitle }}>
              {isKm ? 'ផលិតផល & ប្រព័ន្ធ' : 'Platform & OS'}
            </h4>
            <ul className="space-y-2.5 text-xs text-gray-400" style={{ fontFamily: fontBody }}>
              <li><a href="#features" className="hover:text-sky-400 transition-colors">{isKm ? 'ឆ្នាំសិក្សា និងឆមាស' : 'Academic Years & Terms'}</a></li>
              <li><a href="#social" className="hover:text-sky-400 transition-colors">{isKm ? 'បណ្តាញសិក្សាសង្គម' : 'Academic Social Feed'}</a></li>
              <li><a href="#schools" className="hover:text-sky-400 transition-colors">{isKm ? 'គ្រប់គ្រងវត្តមាន & ពិន្ទុ' : 'School OS & Attendance'}</a></li>
              <li><a href="#features" className="hover:text-sky-400 transition-colors">{isKm ? 'វគ្គសិក្សា & Quizzes' : 'Courses & Quizzes'}</a></li>
              <li><a href="#mobile" className="hover:text-sky-400 transition-colors">{isKm ? 'កម្មវិធីទូរសព្ទ iOS / Android' : 'Mobile Apps'}</a></li>
            </ul>
          </div>

          {/* Col 3: Solutions for Institutions */}
          <div className="space-y-4">
            <h4 className="text-white text-xs font-bold uppercase tracking-wider" style={{ fontFamily: fontTitle }}>
              {isKm ? 'សម្រាប់ស្ថាប័ន' : 'Solutions'}
            </h4>
            <ul className="space-y-2.5 text-xs text-gray-400" style={{ fontFamily: fontBody }}>
              <li><a href="#schools" className="hover:text-sky-400 transition-colors">{isKm ? 'សាលាបឋម & វិទ្យាល័យ' : 'Primary & High Schools'}</a></li>
              <li><a href="#enterprise" className="hover:text-sky-400 transition-colors">{isKm ? 'សាកលវិទ្យាល័យ & ស្ថាប័ន' : 'Universities & Enterprise'}</a></li>
              <li><a href="#features" className="hover:text-sky-400 transition-colors">{isKm ? 'របាយការណ៍ MoEYS' : 'MoEYS Reports'}</a></li>
              <li><a href="#pricing" className="hover:text-sky-400 transition-colors">{isKm ? 'ជម្រើសចាប់ផ្តើម' : 'Getting Started'}</a></li>
              <li><a href="#schools" className="hover:text-sky-400 transition-colors">{isKm ? 'សុវត្ថិភាព & ការពារទិន្នន័យ' : 'Enterprise Security'}</a></li>
            </ul>
          </div>

          {/* Col 4: Resources & Legal */}
          <div className="space-y-4">
            <h4 className="text-white text-xs font-bold uppercase tracking-wider" style={{ fontFamily: fontTitle }}>
              {isKm ? 'ធនធាន & ច្បាប់' : 'Resources & Legal'}
            </h4>
            <ul className="space-y-2.5 text-xs text-gray-400" style={{ fontFamily: fontBody }}>
              <li><a href="#blog" className="hover:text-sky-400 transition-colors">{isKm ? 'ស្វែងយល់ពី Stunity' : 'Explore Stunity'}</a></li>
              <li><a href="#features" className="hover:text-sky-400 transition-colors">{isKm ? 'មុខងារ Platform' : 'Platform Features'}</a></li>
              <li><Link href={`/${locale}/privacy`} className="hover:text-sky-400 transition-colors">{isKm ? 'គោលការណ៍ឯកជនភាព' : 'Privacy Policy'}</Link></li>
              <li><Link href={`/${locale}/privacy`} className="hover:text-sky-400 transition-colors">{isKm ? 'ល័ក្ខខ័ណ្ឌប្រើប្រាស់' : 'Terms of Service'}</Link></li>
              <li><a href="#contact" className="hover:text-sky-400 transition-colors">{isKm ? 'ទំនាក់ទំនងគាំទ្រ' : 'Contact Support'}</a></li>
            </ul>
          </div>

        </div>

        {/* ── BOTTOM LEGAL & COPYRIGHT BAR ── */}
        <div className="pt-8 border-t border-gray-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>© {currentYear} Stunity. All rights reserved.</p>
          <div className="flex items-center gap-6" style={{ fontFamily: fontBody }}>
            <Link href={`/${locale}/privacy`} className="hover:text-gray-300 transition-colors">{isKm ? 'ឯកជនភាព' : 'Privacy'}</Link>
            <Link href={`/${locale}/privacy`} className="hover:text-gray-300 transition-colors">{isKm ? 'ល័ក្ខខ័ណ្ឌ' : 'Terms'}</Link>
            <span className="text-gray-700">|</span>
            <span className="text-gray-400 flex items-center gap-1.5">
              <Globe size={13} className="text-sky-500" />
              <span>Cambodia (MoEYS Standard)</span>
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
}
