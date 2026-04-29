import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { notFound } from 'next/navigation';
import { BadgeCheck, Calendar, Clock } from 'lucide-react';
import { LEARN_SERVICE_URL } from '@/lib/api/config';

export const metadata = {
  title: 'Certificate Verification | Stunity',
  description: 'Verify the authenticity of a Stunity completion certificate.',
};

async function getCertificate(code: string) {
  try {
    const res = await fetch(`${LEARN_SERVICE_URL}/certificates/verify/${code}`, {
      next: { revalidate: 60 } 
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.certificate : null;
  } catch {
    return null;
  }
}

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ code: string; locale: string }>;
}) {
  const { code, locale } = await params;
  const certificate = await getCertificate(code);

  if (!certificate) {
    notFound();
  }

  const { course, user, issuedAt, verificationCode } = certificate;
  const issueDate = new Date(issuedAt).toLocaleDateString(locale === 'km' ? 'km-KH' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
      <div className="max-w-3xl w-full bg-white dark:bg-gray-900 rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-6 sm:p-10 text-center relative overflow-hidden">
          <BadgeCheck className="w-16 h-16 text-white mx-auto mb-4" />
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight"><AutoI18nText i18nKey="auto.web.locale_verify_code_page.k_2e2875d5" /></h1>
          <p className="text-orange-50 mt-2 font-medium"><AutoI18nText i18nKey="auto.web.locale_verify_code_page.k_74e2aa56" /></p>
        </div>

        {/* Content */}
        <div className="p-8 sm:p-12 text-center">
          <p className="text-gray-500 uppercase tracking-widest text-sm font-bold mb-4"><AutoI18nText i18nKey="auto.web.locale_verify_code_page.k_92e93429" /></p>
          <h2 className="text-3xl sm:text-5xl font-serif text-gray-900 dark:text-white mb-8 capitalize">{user.firstName} {user.lastName}</h2>
          
          <p className="text-gray-500 uppercase tracking-widest text-sm font-bold mb-4"><AutoI18nText i18nKey="auto.web.locale_verify_code_page.k_3f2a8432" /></p>
          <div className="inline-block bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-100 mb-10 w-full">
            <h3 className="text-xl sm:text-2xl font-bold text-[#1F2937] mb-2">{course.title}</h3>
            {course.duration > 0 && (
              <div className="flex items-center justify-center gap-2 text-gray-500 mt-3">
                <Clock className="w-4 h-4" />
                <span>{Math.round(course.duration / 60)} <AutoI18nText i18nKey="auto.web.locale_verify_code_page.k_92748f5d" /></span>
              </div>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left border-t border-gray-100 pt-8 mt-4">
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1"><AutoI18nText i18nKey="auto.web.locale_verify_code_page.k_05d29653" /></p>
              <div className="flex items-center gap-2 text-gray-900 dark:text-white font-medium">
                <Calendar className="w-4 h-4 text-[#F9A825]" />
                {issueDate}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1"><AutoI18nText i18nKey="auto.web.locale_verify_code_page.k_d9f235c3" /></p>
              <p className="text-gray-900 dark:text-white font-medium">{course.instructor.firstName} {course.instructor.lastName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1"><AutoI18nText i18nKey="auto.web.locale_verify_code_page.k_e4d62e1c" /></p>
              <p className="text-gray-900 dark:text-white font-mono text-sm tracking-wide bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded inline-block">{verificationCode}</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8 text-center text-sm text-gray-400 font-medium flex items-center justify-center gap-2">
        <BadgeCheck className="w-4 h-4" />
        <span><AutoI18nText i18nKey="auto.web.locale_verify_code_page.k_1b9454c7" /></span>
      </div>
    </div>
  );
}
