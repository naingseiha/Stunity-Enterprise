import { Check } from 'lucide-react';
import Link from 'next/link';

export function Pricing({ c, isKm, locale }: { c: any, isKm: boolean, locale: string }) {
  const fontTitle = isKm ? "'Koulen', sans-serif" : "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

  return (
    <section id="pricing" className="py-24 sm:py-32 bg-white relative">
      <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-16 xl:px-20">
        
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 
            className={`font-bold text-[#111827] ${isKm ? 'text-3xl sm:text-4xl' : 'text-4xl sm:text-5xl tracking-tight'}`}
            style={{ fontFamily: fontTitle, lineHeight: isKm ? '1.8' : '1.15' }}
          >
            {c.pricingTitle}
          </h2>
          <p className="mt-4 text-gray-500 text-sm sm:text-base leading-relaxed">
            {c.pricingSub}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {c.plans.map((plan: any, i: number) => (
            <div 
              key={i}
              className={`rounded-[32px] p-8 border ${plan.highlight ? 'border-indigo-600 shadow-glass-lg bg-indigo-600 text-white transform md:-translate-y-4' : 'border-gray-200 bg-white text-gray-900'} relative transition-all duration-300`}
            >
              {plan.highlight && (
                <div className="absolute top-0 right-8 -translate-y-1/2">
                  <span className="bg-gradient-to-r from-rose-400 to-orange-400 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Recommended
                  </span>
                </div>
              )}
              
              <h3 className={`text-xl font-bold mb-2 ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
              <p className={`text-sm mb-6 ${plan.highlight ? 'text-indigo-200' : 'text-gray-500'}`}>{plan.desc}</p>
              
              <div className="mb-8">
                <span className={`text-4xl font-black ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>{plan.priceMonthly}</span>
                <span className={`text-sm ${plan.highlight ? 'text-indigo-200' : 'text-gray-500'}`}>{c.perMonth}</span>
              </div>
              
              <ul className="space-y-4 mb-8">
                {plan.feats.map((feat: string, j: number) => (
                  <li key={j} className="flex items-start gap-3 text-sm">
                    <Check size={18} className={`mt-0.5 shrink-0 ${plan.highlight ? 'text-indigo-300' : 'text-indigo-600'}`} />
                    <span className={plan.highlight ? 'text-indigo-50' : 'text-gray-700'}>{feat}</span>
                  </li>
                ))}
              </ul>
              
              <Link
                href={`/${locale}/register-school`}
                className={`block w-full py-4 text-center rounded-2xl text-sm font-bold transition-all duration-300 ${
                  plan.highlight 
                    ? 'bg-white text-indigo-600 hover:shadow-lg' 
                    : 'bg-gray-50 text-gray-900 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
