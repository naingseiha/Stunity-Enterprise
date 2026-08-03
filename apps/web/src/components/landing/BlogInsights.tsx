import { ArrowUpRight, Calendar, User } from 'lucide-react';
import Link from 'next/link';

export function BlogInsights({ isKm, locale }: { isKm: boolean, locale: string }) {
  const fontTitle = isKm ? "'Koulen', sans-serif" : "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

  const posts = [
    {
      id: 1,
      image: "bg-sky-50",
      date: isKm ? "ពហុសាលា" : "Multi-school",
      author: "Stunity",
      title: isKm ? "គ្រប់គ្រងសាលា និងសាខាច្រើនក្នុងអង្គភាពតែមួយ" : "Manage multiple schools and campuses in one organization.",
      link: "#schools"
    },
    {
      id: 2,
      image: "bg-orange-50",
      date: isKm ? "ឆ្នាំសិក្សា" : "Academic years",
      author: "Stunity",
      title: isKm ? "រក្សាប្រវត្តិសិស្សបានត្រឹមត្រូវពីមួយឆ្នាំសិក្សាទៅមួយឆ្នាំ" : "Preserve accurate student history across academic years.",
      link: "#features"
    },
    {
      id: 3,
      image: "bg-cyan-50",
      date: isKm ? "សហគមន៍សិក្សា" : "Learning community",
      author: "Stunity",
      title: isKm ? "ភ្ជាប់ការបង្រៀន ការទំនាក់ទំនង និងសកម្មភាពសិក្សាលើ Mobile" : "Connect teaching, communication, and learning activities on mobile.",
      link: "#mobile"
    }
  ];

  return (
    <section id="blog" className="py-24 sm:py-32 bg-[#faf9ff]">
      <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-16 xl:px-20">
        
        <div className="flex justify-between items-end mb-12">
          <h2 
            className={`font-black text-[#111827] ${isKm ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl tracking-tight'}`}
            style={{ fontFamily: fontTitle, lineHeight: isKm ? '1.8' : '1.2' }}
          >
            {isKm ? 'ស្វែងយល់ពី Stunity' : 'Explore Stunity'}
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
              <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 transition-all hover:shadow-md hover:border-sky-100 h-full flex flex-col">
                
                {/* Image Placeholder */}
                <div className={`w-full aspect-video rounded-2xl ${post.image} mb-4 relative overflow-hidden flex items-center justify-center`}>
                   <div className="w-12 h-12 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center transform scale-0 group-hover:scale-100 transition-transform duration-300 shadow-sm text-sky-600">
                     <ArrowUpRight size={20} />
                   </div>
                </div>

                {/* Meta */}
                <div className="flex items-center gap-4 text-[11px] font-medium text-gray-500 mb-3 px-2 uppercase tracking-wide">
                  <span className="flex items-center gap-1.5"><Calendar size={12} /> {post.date}</span>
                  <span className="flex items-center gap-1.5"><User size={12} /> {post.author}</span>
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-gray-900 px-2 line-clamp-2 leading-snug group-hover:text-sky-600 transition-colors">
                  {post.title}
                </h3>
                
                <div className="mt-auto pt-6 px-2">
                  <span className="text-xs font-bold text-sky-600 flex items-center gap-1">
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
