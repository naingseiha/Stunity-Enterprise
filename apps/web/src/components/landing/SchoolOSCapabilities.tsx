import { ClipboardCheck, Users, BarChart3, ShieldCheck } from 'lucide-react';

export function SchoolOSCapabilities({ isKm }: { isKm: boolean }) {
  const fontTitle = isKm ? "'Koulen', sans-serif" : "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

  const capabilities = [
    {
      title: isKm ? 'គ្រប់គ្រងវត្តមាន និងកាលវិភាគ' : 'Attendance & Scheduling',
      desc: isKm 
        ? 'តាមដានវត្តមានសិស្ស និងរៀបចំកាលវិភាគបង្រៀនរបស់គ្រូដោយស្វ័យប្រវត្តិ។' 
        : 'Automated student attendance tracking and smart faculty scheduling systems.',
      icon: <ClipboardCheck size={20} className="text-indigo-600" />,
      mockup: (
        <div className="w-full h-32 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center justify-center p-4">
          <div className="w-full h-full bg-white rounded-lg shadow-sm flex flex-col p-3 gap-2">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
               <div className="w-16 h-2 bg-gray-200 rounded-full" />
               <div className="w-8 h-3 bg-green-100 rounded-full" />
            </div>
            <div className="flex gap-2">
               <div className="w-6 h-6 rounded-full bg-indigo-100" />
               <div className="flex-1 flex flex-col gap-1.5 justify-center">
                 <div className="w-3/4 h-2 bg-gray-200 rounded-full" />
                 <div className="w-1/2 h-1.5 bg-gray-100 rounded-full" />
               </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: isKm ? 'ទំនាក់ទំនងមាតាបិតា' : 'Parent Portal & Messaging',
      desc: isKm 
        ? 'ភ្ជាប់ទំនាក់ទំនងផ្ទាល់ជាមួយមាតាបិតាសិស្ស ផ្តល់ព័ត៌មានពីការសិក្សាទាន់ពេលវេលា។' 
        : 'Direct communication channels with parents for real-time updates on student progress.',
      icon: <Users size={20} className="text-blue-600" />,
      mockup: (
        <div className="w-full h-32 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-center p-4">
           <div className="relative w-full max-w-[140px] h-full bg-white rounded-lg shadow-sm p-2 flex flex-col gap-2 justify-end">
              <div className="self-start bg-gray-100 px-2 py-1.5 rounded-lg rounded-bl-none max-w-[80%]">
                 <div className="w-12 h-1.5 bg-gray-300 rounded-full mb-1" />
                 <div className="w-16 h-1.5 bg-gray-300 rounded-full" />
              </div>
              <div className="self-end bg-blue-500 px-2 py-1.5 rounded-lg rounded-br-none max-w-[80%]">
                 <div className="w-14 h-1.5 bg-blue-200 rounded-full mb-1" />
                 <div className="w-10 h-1.5 bg-blue-200 rounded-full" />
              </div>
           </div>
        </div>
      )
    },
    {
      title: isKm ? 'របាយការណ៍ និងពិន្ទុ (MoEYS)' : 'Grades & MoEYS Reports',
      desc: isKm 
        ? 'ប្រព័ន្ធបញ្ចូលពិន្ទុ និងទាញយករបាយការណ៍ស្របតាមទម្រង់ក្រសួងអប់រំ។' 
        : 'Streamlined grading system with official MoEYS standard report exports.',
      icon: <BarChart3 size={20} className="text-rose-600" />,
      mockup: (
        <div className="w-full h-32 bg-rose-50/50 rounded-xl border border-rose-100 flex items-center justify-center p-4">
           <div className="w-full h-full bg-white rounded-lg shadow-sm p-3 flex items-end gap-2 justify-center">
              <div className="w-4 h-12 bg-rose-200 rounded-t-sm" />
              <div className="w-4 h-16 bg-rose-300 rounded-t-sm" />
              <div className="w-4 h-8 bg-rose-100 rounded-t-sm" />
              <div className="w-4 h-20 bg-rose-400 rounded-t-sm" />
              <div className="w-4 h-14 bg-rose-200 rounded-t-sm" />
           </div>
        </div>
      )
    },
    {
      title: isKm ? 'សុវត្ថិភាព និងការគ្រប់គ្រងសិទ្ធិ' : 'Security & Role Access',
      desc: isKm 
        ? 'ការពារទិន្នន័យសាលារៀន និងកំណត់សិទ្ធិប្រើប្រាស់យ៉ាងច្បាស់លាស់សម្រាប់គ្រូ និងសិស្ស។' 
        : 'Protect school data with custom role-based security access and cloud backups.',
      icon: <ShieldCheck size={20} className="text-emerald-600" />,
      mockup: (
        <div className="w-full h-32 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-center justify-center p-4">
           <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-emerald-100 rounded-full" />
              <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent border-l-transparent rotate-45" />
              <div className="absolute inset-0 flex items-center justify-center">
                 <ShieldCheck size={24} className="text-emerald-500" />
              </div>
           </div>
        </div>
      )
    },
  ];

  return (
    <section className="py-24 sm:py-32 bg-white relative border-t border-gray-100">
      <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-16 xl:px-20">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-gray-50 border border-gray-200 mb-6">
            <div className="w-2 h-2 bg-indigo-500 rounded-sm" />
            <span className="text-xs font-bold text-gray-600 tracking-wider">SCHOOL OS</span>
          </div>
          <h2 
            className={`font-black text-[#111827] mb-4 ${isKm ? 'text-3xl sm:text-4xl' : 'text-3xl sm:text-4xl lg:text-5xl tracking-tight'}`}
            style={{ fontFamily: fontTitle, lineHeight: isKm ? '1.8' : '1.15' }}
          >
            {isKm ? 'ប្រព័ន្ធគ្រប់គ្រងសាលារៀន' : 'School OS Capabilities'}
          </h2>
          <p className="text-gray-500 text-sm sm:text-base leading-relaxed">
            {isKm 
              ? 'ឧបករណ៍និងមុខងាររចនាឡើងដើម្បីជួយសម្រួលការងាររដ្ឋបាលសាលារៀន និងការពារទិន្នន័យ។' 
              : 'Tools and capabilities designed to protect your data and streamline school administration.'}
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-gray-200 border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
          {capabilities.map((cap, idx) => (
            <div key={idx} className="bg-white p-8 sm:p-10 hover:bg-gray-50/50 transition-colors">
              <div className="mb-8">
                {cap.mockup}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: fontTitle }}>
                {cap.title}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                {cap.desc}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
