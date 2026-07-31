import { Smartphone, BookOpen, Clock, Activity, Video, LayoutDashboard } from 'lucide-react';

export function AppFeaturesSteps({ isKm }: { isKm: boolean }) {
  const fontTitle = isKm ? "'Koulen', sans-serif" : "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

  const steps = [
    {
      icon: <Video size={24} />,
      iconBg: 'bg-rose-100 text-rose-600',
      title: isKm ? 'បណ្តាញសិក្សា និង Reels' : 'Social Feed & Reels',
      desc: isKm ? 'ចែករំលែកមេរៀន និងវីដេអូខ្លីៗអប់រំ ជាមួយសហគមន៍សិស្សានុសិស្សទូទាំងប្រទេស។' : 'Share short educational reels and engage with a nationwide community of learners.',
      bg: 'bg-rose-50/50',
    },
    {
      icon: <BookOpen size={24} />,
      iconBg: 'bg-cyan-100 text-cyan-600',
      title: isKm ? 'រៀន និងប្រឡង (Quizzes)' : 'Learn & Quizzes',
      desc: isKm ? 'ចូលរៀនវគ្គសិក្សា ធ្វើលំហាត់ និងតេស្តសមត្ថភាពផ្ទាល់នៅលើទូរសព្ទដៃ។' : 'Access courses, complete assignments, and take real-time quizzes directly from your phone.',
      bg: 'bg-cyan-50/50',
    },
    {
      icon: <LayoutDashboard size={24} />,
      iconBg: 'bg-purple-100 text-purple-600',
      title: isKm ? 'ព័ត៌មានសាលារៀន' : 'School Dashboard',
      desc: isKm ? 'តាមដានកាលវិភាគ វត្តមាន ពិន្ទុ និងសេចក្តីជូនដំណឹងពីសាលារៀនជារៀងរាល់ថ្ងៃ។' : 'Track timetables, attendance, grades, and school announcements effortlessly.',
      bg: 'bg-purple-50/50',
    },
  ];

  return (
    <section className="py-24 bg-white relative">
      <div className="mx-auto max-w-6xl px-6">
        
        {/* Section Heading */}
        <div className="text-center mb-16">
          <p className="text-sm font-bold text-indigo-600 mb-3 uppercase tracking-wider">
            {isKm ? 'មុខងារកម្មវិធីទូរសព្ទ' : 'Mobile App Features'}
          </p>
          <h2 
            className={`font-black text-[#111827] ${isKm ? 'text-3xl sm:text-4xl' : 'text-3xl sm:text-4xl lg:text-5xl tracking-tight'}`}
            style={{ fontFamily: fontTitle, lineHeight: isKm ? '1.8' : '1.2' }}
          >
            {isKm ? 'រៀន និងគ្រប់គ្រង ក្នុង' : 'Everything you need in'}{' '}
            <span className="text-indigo-600">{isKm ? 'កម្មវិធីតែមួយ' : 'one app'}</span>
          </h2>
        </div>

        {/* Timeline / Dashed Line (hidden on mobile) */}
        <div className="hidden md:block relative max-w-4xl mx-auto h-0.5 border-t-2 border-dashed border-gray-200 mb-12">
          {/* Node points */}
          <div className="absolute top-1/2 left-[16.6%] -translate-y-1/2 w-4 h-4 rounded-full bg-rose-200 border-4 border-white" />
          <div className="absolute top-1/2 left-[50%] -translate-y-1/2 w-4 h-4 rounded-full bg-cyan-200 border-4 border-white" />
          <div className="absolute top-1/2 left-[83.3%] -translate-y-1/2 w-4 h-4 rounded-full bg-purple-200 border-4 border-white" />
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, idx) => (
            <div key={idx} className={`rounded-3xl p-8 ${step.bg} border border-gray-50 flex flex-col items-center text-center transition-transform hover:-translate-y-2 duration-300`}>
              
              <div className={`w-16 h-16 rounded-2xl ${step.iconBg} flex items-center justify-center mb-6 shadow-sm`}>
                {step.icon}
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 mb-3" style={{ fontFamily: fontTitle }}>
                {step.title}
              </h3>
              
              <p className="text-gray-600 text-sm leading-relaxed">
                {step.desc}
              </p>

            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
