import { Sparkles, Monitor, Layers, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function WebPlatformShowcase({ isKm, locale }: { isKm: boolean, locale: string }) {
  const fontTitle = isKm ? "'Koulen', sans-serif" : "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

  return (
    <section className="py-24 bg-[#faf9ff] relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          
          {/* Left Text Content */}
          <div className="flex-1 text-center lg:text-left">
            <h2 
              className={`font-black text-[#111827] mb-6 ${isKm ? 'text-3xl sm:text-4xl lg:text-5xl' : 'text-4xl sm:text-5xl lg:text-6xl tracking-tight'}`}
              style={{ fontFamily: fontTitle, lineHeight: isKm ? '1.7' : '1.15' }}
            >
              {isKm ? (
                <>
                  ឧបករណ៍ <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-rose-500">AI ឆ្លាតវៃ</span><br />
                  សម្រាប់លោកគ្រូ អ្នកគ្រូ
                </>
              ) : (
                <>
                  Creativity And Quality is<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-rose-500">Our Destination</span>
                </>
              )}
            </h2>
            
            <p className="text-gray-500 text-sm sm:text-base leading-relaxed mb-10 max-w-lg mx-auto lg:mx-0">
              {isKm 
                ? 'ចំណេញពេលវេលាជាមួយប្រព័ន្ធបង្កើតកិច្ចតែងការ និងស្លាយបង្រៀនស្វ័យប្រវត្តិ។ ងាយស្រួលប្រើប្រាស់ ស្របតាមស្តង់ដារក្រសួងអប់រំ។' 
                : 'Save hours of prep time with our automated lesson planner and interactive slide generator. Designed for modern educators.'}
            </p>

            <div className="space-y-6 mb-10 text-left max-w-lg mx-auto lg:mx-0">
              
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 mt-1">
                  <Monitor size={18} className="text-blue-600" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-gray-900 mb-1">{isKm ? 'ប្រព័ន្ធបង្កើតកិច្ចតែងការ AI' : 'AI Lesson Plan Generator'}</h4>
                  <p className="text-xs text-gray-500">{isKm ? 'បង្កើតមេរៀនលម្អិតក្នុងពេលប៉ុន្មានវិនាទី។' : 'Generate detailed MoEYS compliant plans in seconds.'}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0 mt-1">
                  <Layers size={18} className="text-purple-600" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-gray-900 mb-1">{isKm ? 'ឧបករណ៍បង្កើតស្លាយបង្រៀន' : 'Interactive Slide Creator'}</h4>
                  <p className="text-xs text-gray-500">{isKm ? 'បំប្លែងអត្ថបទទៅជាស្លាយបង្រៀនទាក់ទាញដោយស្វ័យប្រវត្តិ។' : 'Automatically transform text into beautiful, interactive slides.'}</p>
                </div>
              </div>

            </div>

            <Link
              href={`/${locale}/tools`}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 hover:shadow-lg transition-all"
            >
              {isKm ? 'មើលមុខងារទាំងអស់' : 'See All Features'}
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Right Mockup Graphic */}
          <div className="flex-1 w-full relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-blue-200/40 to-orange-200/30 rounded-full blur-[80px] pointer-events-none" />
            
            {/* Desktop Browser Mockup */}
            <div className="relative z-10 w-full max-w-[600px] mx-auto bg-white rounded-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] border border-gray-200 overflow-hidden transform hover:-translate-y-2 transition-transform duration-500">
              
              {/* Browser Chrome */}
              <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 border-b border-gray-200">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                </div>
                <div className="mx-auto w-1/2 h-5 bg-white rounded-md shadow-sm border border-gray-200/60" />
              </div>

              {/* Browser Content */}
              <div className="p-6 bg-gray-50 flex gap-4 h-[350px]">
                 {/* Sidebar */}
                 <div className="w-1/4 h-full flex flex-col gap-3">
                   <div className="h-6 w-20 bg-indigo-100 rounded-md mb-2" />
                   <div className="h-4 w-full bg-gray-200 rounded-sm" />
                   <div className="h-4 w-5/6 bg-gray-200 rounded-sm" />
                   <div className="h-4 w-4/6 bg-gray-200 rounded-sm" />
                   <div className="mt-auto h-24 bg-blue-50 rounded-lg border border-blue-100 flex items-center justify-center">
                     <Sparkles size={24} className="text-blue-400" />
                   </div>
                 </div>

                 {/* Main Content Area */}
                 <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex flex-col">
                   <div className="flex justify-between items-center mb-4">
                     <div className="h-5 w-32 bg-gray-800 rounded-md" />
                     <div className="h-6 w-16 bg-green-100 rounded-full" />
                   </div>
                   
                   {/* Slide Mockup */}
                   <div className="flex-1 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg p-4 flex flex-col justify-center border border-indigo-100">
                      <div className="h-6 w-3/4 bg-indigo-200 rounded-md mb-3" />
                      <div className="h-3 w-1/2 bg-gray-300 rounded-sm mb-2" />
                      <div className="h-3 w-2/3 bg-gray-300 rounded-sm" />
                   </div>
                 </div>
              </div>

            </div>

            {/* Floating Elements */}
            <div className="absolute -right-6 top-10 bg-white p-3 rounded-xl shadow-glass border border-white flex items-center gap-3 animate-float z-20">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-600 text-xs">
                $3.5K
              </div>
              <div className="flex flex-col gap-1">
                <div className="w-16 h-2 bg-gray-200 rounded-full" />
                <div className="w-10 h-2 bg-gray-100 rounded-full" />
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
