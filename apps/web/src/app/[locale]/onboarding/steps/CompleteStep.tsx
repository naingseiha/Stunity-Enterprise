'use client';

import { useTranslations } from 'next-intl';
import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useEffect, useState } from 'react';
import { CheckCircle, Sparkles, LayoutDashboard, Users, GraduationCap, BookOpen, Calendar } from 'lucide-react';
import StepContainer from '@/components/onboarding/StepContainer';

interface CompleteStepProps {
  onComplete: () => void;
  schoolId: string;
}

export default function CompleteStep({ onComplete, schoolId }: CompleteStepProps) {
    const autoT = useTranslations();
  const [stats, setStats] = useState({
    teachers: 0,
    classes: 0,
    students: 0,
    subjects: 15,
    events: 13,
  });

  useEffect(() => {
    // Load stats from API
    loadStats();
  }, [schoolId]);

  const loadStats = async () => {
    try {
      // TODO: Fetch actual stats from API
      setStats({
        teachers: 10,
        classes: 6,
        students: 50,
        subjects: 15,
        events: 13,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  return (
    <StepContainer
      stepNumber={7}
      title={autoT("auto.web.locale_onboarding_steps_CompleteStep.k_2af1cd28")}
      description="Congratulations! Your school is now ready to use. Here's what we've set up for you."
      onNext={onComplete}
      nextLabel="Go to Dashboard"
      showBack={false}
      showSkip={false}
    >
      <div className="space-y-6">
        {/* Success Message */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-green-900 mb-2">
            <AutoI18nText i18nKey="auto.web.locale_onboarding_steps_CompleteStep.k_1faffc97" />
          </h2>
          <p className="text-green-700">
            <AutoI18nText i18nKey="auto.web.locale_onboarding_steps_CompleteStep.k_6b044993" />
          </p>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-900 border rounded-lg p-6 text-center hover:shadow-md transition-shadow">
            <Users className="w-8 h-8 mx-auto mb-3 text-blue-600" />
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.teachers}</p>
            <p className="text-sm text-gray-600 mt-1"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_CompleteStep.k_3ece52a5" /></p>
          </div>
          
          <div className="bg-white dark:bg-gray-900 border rounded-lg p-6 text-center hover:shadow-md transition-shadow">
            <LayoutDashboard className="w-8 h-8 mx-auto mb-3 text-purple-600" />
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.classes}</p>
            <p className="text-sm text-gray-600 mt-1"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_CompleteStep.k_52a2df86" /></p>
          </div>
          
          <div className="bg-white dark:bg-gray-900 border rounded-lg p-6 text-center hover:shadow-md transition-shadow">
            <GraduationCap className="w-8 h-8 mx-auto mb-3 text-green-600" />
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.students}</p>
            <p className="text-sm text-gray-600 mt-1"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_CompleteStep.k_f206d9d2" /></p>
          </div>
          
          <div className="bg-white dark:bg-gray-900 border rounded-lg p-6 text-center hover:shadow-md transition-shadow">
            <BookOpen className="w-8 h-8 mx-auto mb-3 text-orange-600" />
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.subjects}</p>
            <p className="text-sm text-gray-600 mt-1"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_CompleteStep.k_a2c2035e" /></p>
          </div>
          
          <div className="bg-white dark:bg-gray-900 border rounded-lg p-6 text-center hover:shadow-md transition-shadow">
            <Calendar className="w-8 h-8 mx-auto mb-3 text-red-600" />
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.events}</p>
            <p className="text-sm text-gray-600 mt-1"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_CompleteStep.k_cfd4c0ed" /></p>
          </div>
          
          <div className="bg-white dark:bg-gray-900 border rounded-lg p-6 text-center hover:shadow-md transition-shadow">
            <Sparkles className="w-8 h-8 mx-auto mb-3 text-yellow-600" />
            <p className="text-3xl font-bold text-gray-900 dark:text-white">100%</p>
            <p className="text-sm text-gray-600 mt-1"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_CompleteStep.k_897dcf09" /></p>
          </div>
        </div>

        {/* What's Next */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_CompleteStep.k_4a4b9ae9" /></h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_CompleteStep.k_e38ae59b" /></span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_CompleteStep.k_3ff44428" /></span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_CompleteStep.k_6165fd9a" /></span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_CompleteStep.k_4b4fb087" /></span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_CompleteStep.k_cf6ce2ca" /></span>
            </li>
          </ul>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border-2 border-gray-200 dark:border-gray-800 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left">
            <Users className="w-6 h-6 text-blue-600 mb-2" />
            <p className="font-medium text-gray-900 dark:text-white"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_CompleteStep.k_0fa6269b" /></p>
            <p className="text-xs text-gray-600 mt-1"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_CompleteStep.k_13b5cc61" /></p>
          </button>
          
          <button className="p-4 border-2 border-gray-200 dark:border-gray-800 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-left">
            <GraduationCap className="w-6 h-6 text-green-600 mb-2" />
            <p className="font-medium text-gray-900 dark:text-white"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_CompleteStep.k_7641c995" /></p>
            <p className="text-xs text-gray-600 mt-1"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_CompleteStep.k_2a77a4f3" /></p>
          </button>
          
          <button className="p-4 border-2 border-gray-200 dark:border-gray-800 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors text-left">
            <Calendar className="w-6 h-6 text-purple-600 mb-2" />
            <p className="font-medium text-gray-900 dark:text-white"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_CompleteStep.k_bf447980" /></p>
            <p className="text-xs text-gray-600 mt-1"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_CompleteStep.k_e82a8369" /></p>
          </button>
        </div>

        {/* Support */}
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 rounded-lg p-6 text-center">
          <p className="text-sm text-gray-700 dark:text-gray-200">
            <AutoI18nText i18nKey="auto.web.locale_onboarding_steps_CompleteStep.k_28383184" />{' '}
            <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
              <AutoI18nText i18nKey="auto.web.locale_onboarding_steps_CompleteStep.k_636add2d" />
            </a>
            {' '}<AutoI18nText i18nKey="auto.web.locale_onboarding_steps_CompleteStep.k_6159728b" />{' '}
            <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
              <AutoI18nText i18nKey="auto.web.locale_onboarding_steps_CompleteStep.k_d71ce687" />
            </a>
            .
          </p>
        </div>
      </div>
    </StepContainer>
  );
}
