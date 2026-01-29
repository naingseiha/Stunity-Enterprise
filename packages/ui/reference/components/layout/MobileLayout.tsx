import MobileHeader from "./MobileHeader";
import MobileBottomNav from "./MobileBottomNav";

interface MobileLayoutProps {
  children: React.ReactNode;
  title: string;
  showMenu?: boolean;
  onMenuClick?: () => void;
  onNavigate?: (href: string) => boolean; // Returns false to prevent navigation
}

export default function MobileLayout({
  children,
  title,
  showMenu = false,
  onMenuClick,
  onNavigate,
}: MobileLayoutProps) {
  return (
    <div className="flex flex-col h-screen bg-gray-50 mobile-touch">
      <MobileHeader title={title} showMenu={showMenu} onMenuClick={onMenuClick} />
      <main className="flex-1 overflow-y-auto pb-20 mobile-scroll hide-scrollbar">
        {children}
      </main>
      <MobileBottomNav onNavigate={onNavigate} />
    </div>
  );
}
