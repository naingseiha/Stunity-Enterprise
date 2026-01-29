import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { GraduationCap, Users, BarChart3, Globe } from 'lucide-react';

export default function HomePage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('landing');
  const tc = useTranslations('common');

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-20 pb-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8 flex justify-center">
            <div className="p-4 bg-white rounded-full shadow-lg">
              <GraduationCap className="w-16 h-16 text-stunity-primary-600" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            {t('hero.title')}
          </h1>
          <p className="text-xl text-gray-600 mb-10">
            {t('hero.subtitle')}
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href={`/${locale}/auth/login`}
              className="px-8 py-4 bg-stunity-primary-600 text-white rounded-lg font-semibold hover:bg-stunity-primary-700 transition-colors shadow-lg hover:shadow-xl"
            >
              {t('hero.ctaLogin')}
            </Link>
            <button className="px-8 py-4 bg-white text-stunity-primary-600 rounded-lg font-semibold hover:bg-gray-50 transition-colors shadow-lg border-2 border-stunity-primary-200">
              {t('hero.ctaRegister')}
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-gray-900">
            {t('features.title')}
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Multi-Tenant */}
            <div className="p-8 bg-gradient-to-br from-stunity-primary-50 to-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="mb-4 p-3 bg-stunity-primary-100 rounded-lg w-fit">
                <Globe className="w-8 h-8 text-stunity-primary-600" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">
                {t('features.multiTenant')}
              </h3>
              <p className="text-gray-600">
                {t('features.multiTenantDesc')}
              </p>
            </div>

            {/* Social Learning */}
            <div className="p-8 bg-gradient-to-br from-stunity-primary-50 to-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="mb-4 p-3 bg-stunity-primary-100 rounded-lg w-fit">
                <Users className="w-8 h-8 text-stunity-primary-600" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">
                {t('features.social')}
              </h3>
              <p className="text-gray-600">
                {t('features.socialDesc')}
              </p>
            </div>

            {/* Analytics */}
            <div className="p-8 bg-gradient-to-br from-stunity-primary-50 to-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="mb-4 p-3 bg-stunity-primary-100 rounded-lg w-fit">
                <BarChart3 className="w-8 h-8 text-stunity-primary-600" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">
                {t('features.analytics')}
              </h3>
              <p className="text-gray-600">
                {t('features.analyticsDesc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-gray-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">
            © 2026 {tc('appName')} - Modern School Management System
          </p>
        </div>
      </footer>
    </div>
  );
}
