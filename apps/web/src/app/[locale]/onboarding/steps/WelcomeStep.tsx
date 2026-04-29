'use client';

import { useTranslations } from 'next-intl';
import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import React from 'react';
import StepContainer from '@/components/onboarding/StepContainer';
import { CheckCircle, BookOpen, Users, GraduationCap } from 'lucide-react';

interface WelcomeStepProps {
  onNext: () => void;
  onboardingData: any;
}

export default function WelcomeStep({ onNext, onboardingData }: WelcomeStepProps) {
    const autoT = useTranslations();
  const school = onboardingData?.school;
  const defaults = onboardingData?.defaults || {};
  const model = school?.educationModel || 'KHM_MOEYS';
  const subjectSeedMode = defaults?.subjectSeedMode || (model === 'KHM_MOEYS' ? 'persisted' : model === 'CUSTOM' ? 'none' : 'template');
  const termCount = defaults?.termCount || onboardingData?.academicYear?.terms?.length || 0;
  const holidayCount = defaults?.holidays || onboardingData?.academicYear?.calendars?.[0]?.events?.length || 0;
  const subjectCount = defaults?.subjects || defaults?.subjectTemplates || 0;

  let termText = `${termCount || 2} academic terms`;
  let calendarText = holidayCount > 0 ? `${holidayCount} calendar events ready` : 'Calendar scaffold created';
  let subjectsText = subjectCount > 0 ? `${subjectCount} subject templates ready` : 'Curriculum setup stays manual';

  if (model === 'EU_STANDARD') {
    termText = `${termCount || 2} terms (Autumn/Spring)`;
    calendarText = 'No holidays pre-loaded. Add your local calendar from Settings.';
    subjectsText = subjectSeedMode === 'template'
      ? 'Starter subject suggestions are ready for review'
      : 'Curriculum setup stays manual';
  } else if (model === 'INT_BACC') {
    termText = `${termCount || 3} terms`;
    calendarText = 'No holidays pre-loaded. Add your local calendar from Settings.';
    subjectsText = subjectSeedMode === 'template'
      ? 'IB-style starter subject suggestions are ready for review'
      : 'Curriculum setup stays manual';
  } else if (model === 'CUSTOM') {
    termText = `${termCount || 2} terms`;
    calendarText = 'No holidays pre-loaded. Add them from Settings.';
    subjectsText = 'No curriculum defaults were applied';
  } else {
    termText = `${termCount || 2} semesters`;
    calendarText = `${holidayCount || 13} Cambodian public holidays pre-loaded`;
    subjectsText = `${subjectCount || 15} MoEYS subjects ready`;
  }

  return (
    <StepContainer
      stepNumber={1}
      title={autoT("auto.web.locale_onboarding_steps_WelcomeStep.k_4634c8be")}
      description="Great news! Your school is already set up with everything you need to get started."
      onNext={onNext}
      showBack={false}
      nextLabel="Let's Begin"
    >
      <div className="space-y-6">
        {/* School Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <GraduationCap className="w-12 h-12 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {school?.name || 'Your School'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_WelcomeStep.k_d7a0bb25" /></span>{' '}
                  <span className="font-medium text-gray-900 dark:text-white">{school?.email}</span>
                </div>
                <div>
                  <span className="text-gray-600"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_WelcomeStep.k_564fcb0e" /></span>{' '}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {school?.schoolType?.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_WelcomeStep.k_ca91bbd9" /></span>{' '}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {school?.subscriptionTier === 'FREE_TRIAL_3M' ? '3 months' : '1 month'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_WelcomeStep.k_62daf254" /></span>{' '}
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <AutoI18nText i18nKey="auto.web.locale_onboarding_steps_WelcomeStep.k_85eb98be" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {subjectSeedMode !== 'persisted' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-amber-900 mb-1"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_WelcomeStep.k_680ef429" /></h3>
            <p className="text-sm text-amber-800">
              <AutoI18nText i18nKey="auto.web.locale_onboarding_steps_WelcomeStep.k_6b39139d" />
            </p>
          </div>
        )}

        {/* What's Already Done */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            <AutoI18nText i18nKey="auto.web.locale_onboarding_steps_WelcomeStep.k_32c729de" />
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Academic Year */}
            <div className="flex items-start gap-3 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_WelcomeStep.k_22bec0cc" /></h4>
                <p className="text-sm text-gray-600 mt-1">
                  <AutoI18nText i18nKey="auto.web.locale_onboarding_steps_WelcomeStep.k_60690c68" /> {termText}
                </p>
              </div>
            </div>

            {/* Calendar */}
            <div className="flex items-start gap-3 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_WelcomeStep.k_7b6f1a0d" /></h4>
                <p className="text-sm text-gray-600 mt-1">
                  {calendarText}
                </p>
              </div>
            </div>

            {/* Subjects */}
            <div className="flex items-start gap-3 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_WelcomeStep.k_ba5bc9bf" /></h4>
                <p className="text-sm text-gray-600 mt-1">
                  {subjectsText}
                </p>
              </div>
            </div>

            {/* Grading System */}
            <div className="flex items-start gap-3 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_WelcomeStep.k_0a8a04cc" /></h4>
                <p className="text-sm text-gray-600 mt-1">
                  <AutoI18nText i18nKey="auto.web.locale_onboarding_steps_WelcomeStep.k_d06ffd89" />
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps Preview */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            <AutoI18nText i18nKey="auto.web.locale_onboarding_steps_WelcomeStep.k_256047a1" />
          </h3>
          <p className="text-gray-600 mb-4">
            <AutoI18nText i18nKey="auto.web.locale_onboarding_steps_WelcomeStep.k_bfe7cc57" />
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200">
              <Users className="w-4 h-4 mr-1.5" />
              <AutoI18nText i18nKey="auto.web.locale_onboarding_steps_WelcomeStep.k_834ab37c" />
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200">
              <BookOpen className="w-4 h-4 mr-1.5" />
              <AutoI18nText i18nKey="auto.web.locale_onboarding_steps_WelcomeStep.k_61e6a6c7" />
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200">
              <GraduationCap className="w-4 h-4 mr-1.5" />
              <AutoI18nText i18nKey="auto.web.locale_onboarding_steps_WelcomeStep.k_dbdb58d3" />
            </span>
          </div>
        </div>
      </div>
    </StepContainer>
  );
}
