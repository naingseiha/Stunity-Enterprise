'use client';

import { useTranslations } from 'next-intl';
import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import React from 'react';
import StepContainer from '@/components/onboarding/StepContainer';
import { BookOpen, CheckCircle } from 'lucide-react';

interface SubjectsStepProps {
  onNext: () => void;
  onBack: () => void;
  onboardingData: any;
}

function getCategoryBadge(category: string) {
  if (category === 'CORE') {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        <AutoI18nText i18nKey="auto.web.locale_onboarding_steps_SubjectsStep.k_200f72d0" />
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
      <AutoI18nText i18nKey="auto.web.locale_onboarding_steps_SubjectsStep.k_9672cf78" />
    </span>
  );
}

export default function SubjectsStep({ onNext, onBack, onboardingData }: SubjectsStepProps) {
    const autoT = useTranslations();
  const school = onboardingData?.school;
  const defaults = onboardingData?.defaults || {};
  const model = school?.educationModel || 'KHM_MOEYS';
  const subjectSeedMode = defaults?.subjectSeedMode || (model === 'KHM_MOEYS' ? 'persisted' : model === 'CUSTOM' ? 'none' : 'template');
  const subjects = defaults?.previewSubjects || [];
  const subjectCount = defaults?.subjects || defaults?.subjectTemplates || subjects.length;
  const coreCount = subjects.filter((subject: any) => subject.category === 'CORE').length;
  const electiveCount = subjects.filter((subject: any) => subject.category === 'ELECTIVE').length;

  let description = 'Your curriculum is ready with the standard Cambodian subject set.';
  let summaryTitle = `${subjectCount} Subjects Loaded`;
  let summarySubtitle = 'School-wide curriculum defaults are ready across your active grades.';
  let listTitle = 'Subject List';
  let statusLabel = 'Loaded from your current setup';

  if (model === 'EU_STANDARD') {
    description = 'Review the suggested starter curriculum for your term-based setup.';
    summaryTitle = `${subjectCount} Starter Subjects Suggested`;
    summarySubtitle = 'These stay manual for now so one school never changes another school\'s shared production curriculum data.';
    listTitle = 'Starter Subject Suggestions';
    statusLabel = 'Suggested during onboarding';
  } else if (model === 'INT_BACC') {
    description = 'Review the suggested IB-style starter curriculum for this school.';
    summaryTitle = `${subjectCount} Starter Subjects Suggested`;
    summarySubtitle = 'These stay manual for now so one school never changes another school\'s shared production curriculum data.';
    listTitle = 'Starter Subject Suggestions';
    statusLabel = 'Suggested during onboarding';
  } else if (model === 'CUSTOM') {
    description = 'Your curriculum starts blank so you can define it entirely yourself.';
    summaryTitle = 'Curriculum Starts Blank';
    summarySubtitle = 'Add your own subjects after onboarding.';
    listTitle = 'Curriculum Setup';
    statusLabel = 'Manual setup required';
  }

  return (
    <StepContainer
      stepNumber={3}
      title={autoT("auto.web.locale_onboarding_steps_SubjectsStep.k_91bb1bdc")}
      description={description}
      onNext={onNext}
      onBack={onBack}
      nextLabel="Continue"
    >
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <BookOpen className="w-8 h-8 text-blue-600" />
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{summaryTitle}</h3>
              <p className="text-sm text-gray-600">{summarySubtitle}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-600">{subjectCount}</div>
              <div className="text-xs text-gray-600">
                {subjectSeedMode === 'persisted' ? 'Loaded Subjects' : 'Suggested Subjects'}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg p-3">
              <div className="text-2xl font-bold text-purple-600">{coreCount}</div>
              <div className="text-xs text-gray-600"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_SubjectsStep.k_a48c5901" /></div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600">{electiveCount}</div>
              <div className="text-xs text-gray-600"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_SubjectsStep.k_8c2de99c" /></div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg p-3">
              <div className="text-2xl font-bold text-orange-600">
                {subjects.reduce((sum: number, subject: any) => sum + (subject.coefficient || 0), 0).toFixed(1)}
              </div>
              <div className="text-xs text-gray-600"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_SubjectsStep.k_b6fcb673" /></div>
            </div>
          </div>
        </div>

        {subjectSeedMode !== 'persisted' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-amber-900 mb-1"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_SubjectsStep.k_6c736692" /></h3>
            <p className="text-sm text-amber-800">
              <AutoI18nText i18nKey="auto.web.locale_onboarding_steps_SubjectsStep.k_95ecd515" />
            </p>
          </div>
        )}

        {subjects.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{listTitle}</h3>
              <span className="text-sm text-gray-600">{statusLabel}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      <AutoI18nText i18nKey="auto.web.locale_onboarding_steps_SubjectsStep.k_defbb691" />
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                      <AutoI18nText i18nKey="auto.web.locale_onboarding_steps_SubjectsStep.k_610a909c" />
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                      <AutoI18nText i18nKey="auto.web.locale_onboarding_steps_SubjectsStep.k_7083731b" />
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                  {subjects.map((subject: any, index: number) => (
                    <tr key={`${subject.name}-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{subject.name}</div>
                            {subject.nameKh && subject.nameKh !== subject.name && (
                              <div className="text-sm text-gray-600">{subject.nameKh}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">{getCategoryBadge(subject.category)}</td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-900 dark:text-white">
                        {subject.coefficient}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_SubjectsStep.k_b0e3334c" /></h3>
            <p className="text-sm text-gray-600">
              <AutoI18nText i18nKey="auto.web.locale_onboarding_steps_SubjectsStep.k_fb090403" />
            </p>
          </div>
        )}

        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            <strong><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_SubjectsStep.k_3eb28191" /></strong> <AutoI18nText i18nKey="auto.web.locale_onboarding_steps_SubjectsStep.k_9c90683a" />
          </p>
        </div>
      </div>
    </StepContainer>
  );
}
