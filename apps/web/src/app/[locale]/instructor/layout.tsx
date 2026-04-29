'use client';

import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  BarChart3, 
  Settings, 
  GraduationCap, 
  LogOut,
  Menu,
  X,
  Plus,
  ArrowLeftRight
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';

interface SidebarItemProps {
  href: string;
  icon: any;
  label: string;
  active: boolean;
}

function SidebarItem({ href, icon: Icon, label, active }: SidebarItemProps) {
  return (
    <Link 
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
        active 
          ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' 
          : 'text-slate-400 hover:text-white hover:bg-slate-800'
      }`}
    >
      <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-500 group-hover:text-amber-400'}`} />
      <span className="font-medium">{label}</span>
    </Link>
  );
}

export default function InstructorLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const locale = (params?.locale as string) || 'en';
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = TokenManager.getUserData();
    if (!userData.user) {
      router.push(`/${locale}/auth/login`);
      return;
    }
    setUser(userData.user);
  }, [locale, router]);

  const navItems = [
    { href: `/${locale}/instructor`, icon: LayoutDashboard, label: 'Dashboard' },
    { href: `/${locale}/instructor/courses`, icon: BookOpen, label: 'My Courses' },
    { href: `/${locale}/instructor/students`, icon: Users, label: 'Students' },
    { href: `/${locale}/instructor/analytics`, icon: BarChart3, label: 'Analytics' },
    { href: `/${locale}/instructor/settings`, icon: Settings, label: 'Settings' },
  ];

  const handleLogout = () => {
    TokenManager.logout();
    router.push(`/${locale}/auth/login`);
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 flex overflow-hidden font-sans">
      {/* Sidebar */}
      <aside 
        className={`${
          sidebarOpen ? 'w-72' : 'w-20'
        } fixed inset-y-0 left-0 z-50 bg-[#1E293B]/50 backdrop-blur-xl border-r border-slate-800 transition-all duration-500 flex flex-col`}
      >
        {/* Logo */}
        <div className="p-6 flex items-center justify-between">
          <Link href={`/${locale}/feed`} className={`flex items-center gap-3 ${!sidebarOpen && 'hidden'}`}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-amber-500/20">
              S
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              <AutoI18nText i18nKey="auto.web.app_locale_instructor_layout.k_12be2130" />
            </span>
          </Link>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2 py-4">
          <div className={`text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 px-4 ${!sidebarOpen && 'hidden'}`}>
            <AutoI18nText i18nKey="auto.web.app_locale_instructor_layout.k_0d2e2221" />
          </div>
          {navItems.map((item) => (
            <SidebarItem 
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={pathname === item.href || (item.href !== `/${locale}/instructor` && pathname.startsWith(item.href))}
            />
          ))}

          <div className="pt-8">
            <div className={`text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 px-4 ${!sidebarOpen && 'hidden'}`}>
              <AutoI18nText i18nKey="auto.web.app_locale_instructor_layout.k_15f174a3" />
            </div>
            <Link 
              href={`/${locale}/learn`}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all group"
            >
              <ArrowLeftRight className="w-5 h-5 text-slate-500 group-hover:text-sky-400" />
              <span className={`font-medium ${!sidebarOpen && 'hidden'}`}><AutoI18nText i18nKey="auto.web.app_locale_instructor_layout.k_a22a7edc" /></span>
            </Link>
          </div>
        </nav>

        {/* Bottom Profile */}
        <div className="p-4 border-t border-slate-800 mt-auto">
          {user && sidebarOpen ? (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-800/50">
              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border border-slate-600">
                {user.profilePictureUrl ? (
                  <img src={user.profilePictureUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-slate-300">{user.firstName?.[0]}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate text-white">{user.firstName} {user.lastName}</p>
                <p className="text-[10px] text-slate-400 truncate uppercase tracking-wider">{user.role}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <button onClick={handleLogout} className="p-3 text-slate-500 hover:text-rose-400 rounded-xl hover:bg-slate-800 transition-all">
                <LogOut className="w-6 h-6" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main 
        className={`flex-1 transition-all duration-500 ${sidebarOpen ? 'ml-72' : 'ml-20'} relative`}
      >
        {/* Top Floating bar */}
        <header className="sticky top-0 z-40 px-8 py-6 flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-sm text-slate-500 font-medium"><AutoI18nText i18nKey="auto.web.app_locale_instructor_layout.k_d5d82149" /></h2>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              href={`/${locale}/learn/create`}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all"
            >
              <Plus className="w-5 h-5" />
              <span><AutoI18nText i18nKey="auto.web.app_locale_instructor_layout.k_ca5ccf74" /></span>
            </Link>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="px-8 pb-12">
          {children}
        </div>

        {/* Subtle decorative elements */}
        <div className="fixed top-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="fixed bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />
      </main>
    </div>
  );
}
