import { ArrowUpRight, Calendar, User } from 'lucide-react';
import Link from 'next/link';

export function BlogInsights({ isKm, locale }: { isKm: boolean, locale: string }) {
  const fontTitle = isKm ? "'Koulen', sans-serif" : "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

  const posts = [
    {
      id: 1,
      image: "bg-indigo-50",
      date: "May 12, 2026",
      author: "Admin",
      title: isKm ? "តើ AI អាចជួយគ្រូបង្រៀនបានកម្រិតណា?" : "How AI is transforming modern education and saving teachers time.",
      link: "#"
    },
    {
      id: 2,
      image: "bg-blue-50",
      date: "May 10, 2026",
      author: "Admin",
      title: isKm ? "វិធីសាស្ត្ររៀបចំកាលវិភាគឆ្លាតវៃសម្រាប់សាលារៀនធំៗ" : "Smart scheduling techniques for large scale educational institutions.",
      link: "#"
    },
    {
      id: 3,
      image: "bg-emerald-50",
      date: "May 08, 2026",
      author: "Admin",
      title: isKm ? "របៀបប្រើប្រាស់បណ្តាញសិក្សាសង្គមឱ្យមានប្រសិទ្ធភាព" : "How to effectively utilize academic social networks for learning.",
      link: "#"
    }
  ];

  return (
    <section className="py-24 sm:py-32 bg-[#faf9ff]">
      <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-16 xl:px-20">
        
        <div className="flex justify-between items-end mb-12">
          <h2 
            className={`font-black text-[#111827] ${isKm ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl tracking-tight'}`}
            style={{ fontFamily: fontTitle, lineHeight: isKm ? '1.8' : '1.2' }}
          >
            {isKm ? 'ព័ត៌មាន និងអត្ថបទថ្មីៗ' : 'Latest Blog Insights'}
          </h2>
          
          <div className="flex gap-2">
            <button className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:border-gray-300 transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <button className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-900 hover:border-gray-300 transition-colors bg-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {posts.map(post => (
            <Link key={post.id} href={post.link} className="group block">
              <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 transition-all hover:shadow-md hover:border-indigo-100 h-full flex flex-col">
                
                {/* Image Placeholder */}
                <div className={`w-full aspect-video rounded-2xl ${post.image} mb-4 relative overflow-hidden flex items-center justify-center`}>
                   <div className="w-12 h-12 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center transform scale-0 group-hover:scale-100 transition-transform duration-300 shadow-sm text-indigo-600">
                     <ArrowUpRight size={20} />
                   </div>
                </div>

                {/* Meta */}
                <div className="flex items-center gap-4 text-[11px] font-medium text-gray-500 mb-3 px-2 uppercase tracking-wide">
                  <span className="flex items-center gap-1.5"><Calendar size={12} /> {post.date}</span>
                  <span className="flex items-center gap-1.5"><User size={12} /> {post.author}</span>
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-gray-900 px-2 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
                  {post.title}
                </h3>
                
                <div className="mt-auto pt-6 px-2">
                  <span className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                    {isKm ? 'អានបន្ថែម' : 'Learn More'} <ArrowUpRight size={14} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </section>
  );
}
