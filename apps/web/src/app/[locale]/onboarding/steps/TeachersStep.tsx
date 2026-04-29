'use client';

import { useTranslations } from 'next-intl';
import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useState } from 'react';
import { Users, Sparkles, Upload, Plus, X } from 'lucide-react';
import StepContainer from '@/components/onboarding/StepContainer';
import QuickSetupCard from '@/components/onboarding/QuickSetupCard';
import { generateSampleTeachers, generateTeachersCSVTemplate, downloadCSV } from '../utils/dataGenerators';

interface TeachersStepProps {
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  schoolId: string;
}

export default function TeachersStep({ onNext, onBack, onSkip, schoolId }: TeachersStepProps) {
    const autoT = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [showManualForm, setShowManualForm] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);

  // Generate sample teachers
  const handleSampleData = async () => {
    setSelectedOption('sample');
    const sampleTeachers = generateSampleTeachers(10, 'school');
    setTeachers(sampleTeachers);
  };

  // Download CSV template
  const handleDownloadTemplate = () => {
    const template = generateTeachersCSVTemplate();
    downloadCSV('teachers-template.csv', template);
  };

  // Create teachers via API
  const handleCreateTeachers = async () => {
    if (teachers.length === 0) {
      alert('Please add teachers first');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_TEACHER_SERVICE_URL || 'http://localhost:3004'}/teachers/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId,
          teachers,
        }),
      });

      if (!response.ok) throw new Error('Failed to create teachers');
      
      onNext();
    } catch (error) {
      console.error('Error creating teachers:', error);
      alert('Failed to create teachers. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <StepContainer
      stepNumber={4}
      title={autoT("auto.web.locale_onboarding_steps_TeachersStep.k_cd1fe07f")}
      description="Choose how to add your teaching staff. You can skip this step and add teachers later from the dashboard."
      onNext={selectedOption === 'skip' ? onSkip : handleCreateTeachers}
      onBack={onBack}
      onSkip={onSkip}
      showSkip={true}
      isLoading={isLoading}
      nextLabel={selectedOption ? 'Continue' : 'Choose an Option'}
      nextDisabled={!selectedOption}
    >
      {!selectedOption ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <QuickSetupCard
            icon={<Sparkles className="w-12 h-12 text-purple-500" />}
            title={autoT("auto.web.locale_onboarding_steps_TeachersStep.k_4736062c")}
            description="Generate 10 sample teachers to get started quickly"
            onClick={handleSampleData}
            recommended={true}
          />
          <QuickSetupCard
            icon={<Upload className="w-12 h-12 text-blue-500" />}
            title={autoT("auto.web.locale_onboarding_steps_TeachersStep.k_d0973703")}
            description="Upload a CSV file with your teacher data"
            onClick={() => {
              setSelectedOption('csv');
              setShowCSVUpload(true);
            }}
          />
          <QuickSetupCard
            icon={<Plus className="w-12 h-12 text-green-500" />}
            title={autoT("auto.web.locale_onboarding_steps_TeachersStep.k_11fcacd4")}
            description="Add teachers one by one manually"
            onClick={() => {
              setSelectedOption('manual');
              setShowManualForm(true);
            }}
          />
          <QuickSetupCard
            icon={<X className="w-12 h-12 text-gray-500" />}
            title={autoT("auto.web.locale_onboarding_steps_TeachersStep.k_691556d5")}
            description="Add teachers later from your dashboard"
            onClick={() => setSelectedOption('skip')}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Preview teachers */}
          {teachers.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-lg border p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_TeachersStep.k_b4e920bb" />{teachers.length})</h3>
                <button
                  onClick={() => {
                    setSelectedOption(null);
                    setTeachers([]);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  <AutoI18nText i18nKey="auto.web.locale_onboarding_steps_TeachersStep.k_26764540" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_TeachersStep.k_f0fcfaff" /></th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_TeachersStep.k_80b322fa" /></th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_TeachersStep.k_1e821a38" /></th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_TeachersStep.k_bfa4cfc5" /></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                    {teachers.slice(0, 5).map((teacher, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {teacher.firstName} {teacher.lastName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{teacher.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{teacher.phone}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{teacher.gender}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {teachers.length > 5 && (
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    <AutoI18nText i18nKey="auto.web.locale_onboarding_steps_TeachersStep.k_0fdcc409" /> {teachers.length - 5} <AutoI18nText i18nKey="auto.web.locale_onboarding_steps_TeachersStep.k_8ca034fb" />
                  </p>
                )}
              </div>
            </div>
          )}

          {/* CSV Upload Section */}
          {showCSVUpload && (
            <div className="bg-white dark:bg-gray-900 rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_TeachersStep.k_9cc0fe54" /></h3>
              <div className="space-y-4">
                <button
                  onClick={handleDownloadTemplate}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  <AutoI18nText i18nKey="auto.web.locale_onboarding_steps_TeachersStep.k_24086393" />
                </button>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-sm text-gray-600 mb-2"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_TeachersStep.k_650750e6" /></p>
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    id="csv-upload"
                    onChange={(e) => {
                      // Handle CSV parsing here
                      alert('CSV parsing coming soon!');
                    }}
                  />
                  <label
                    htmlFor="csv-upload"
                    className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700"
                  >
                    <AutoI18nText i18nKey="auto.web.locale_onboarding_steps_TeachersStep.k_6ae5da15" />
                  </label>
                </div>
              </div>
            </div>
          )}

          {selectedOption === 'skip' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <p className="text-sm text-yellow-800">
                <AutoI18nText i18nKey="auto.web.locale_onboarding_steps_TeachersStep.k_916514ee" />
              </p>
            </div>
          )}
        </div>
      )}
    </StepContainer>
  );
}
