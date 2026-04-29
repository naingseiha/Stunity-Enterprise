'use client';

import { useTranslations } from 'next-intl';
import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useState } from 'react';
import { GraduationCap, Sparkles, Upload, X } from 'lucide-react';
import StepContainer from '@/components/onboarding/StepContainer';
import QuickSetupCard from '@/components/onboarding/QuickSetupCard';
import { generateSampleStudents, generateStudentsCSVTemplate, downloadCSV } from '../utils/dataGenerators';

interface StudentsStepProps {
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  schoolId: string;
  classIds: string[];
}

export default function StudentsStep({ onNext, onBack, onSkip, schoolId, classIds }: StudentsStepProps) {
    const autoT = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [studentCount, setStudentCount] = useState(50);
  const [students, setStudents] = useState<any[]>([]);

  // Generate sample students
  const handleSampleData = () => {
    setSelectedOption('sample');
    const sampleStudents = generateSampleStudents(studentCount, classIds);
    setStudents(sampleStudents);
  };

  // Download CSV template
  const handleDownloadTemplate = () => {
    const template = generateStudentsCSVTemplate();
    downloadCSV('students-template.csv', template);
  };

  // Create students via API
  const handleCreateStudents = async () => {
    if (students.length === 0 && selectedOption !== 'skip') {
      alert('Please add students first');
      return;
    }

    setIsLoading(true);
    try {
      if (students.length > 0) {
        const response = await fetch(`${process.env.NEXT_PUBLIC_STUDENT_SERVICE_URL || 'http://localhost:3003'}/students/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schoolId,
            students,
          }),
        });

        if (!response.ok) throw new Error('Failed to create students');
      }
      
      onNext();
    } catch (error) {
      console.error('Error creating students:', error);
      alert('Failed to create students. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <StepContainer
      stepNumber={6}
      title={autoT("auto.web.locale_onboarding_steps_StudentsStep.k_c4461c27")}
      description="Import your student roster. You can add students later or import them in batches throughout the year."
      onNext={selectedOption === 'skip' ? onSkip : handleCreateStudents}
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
            title={autoT("auto.web.locale_onboarding_steps_StudentsStep.k_042cc526")}
            description="Generate sample students for testing"
            onClick={() => {
              setSelectedOption('sample');
              handleSampleData();
            }}
            recommended={true}
          />
          <QuickSetupCard
            icon={<Upload className="w-12 h-12 text-blue-500" />}
            title={autoT("auto.web.locale_onboarding_steps_StudentsStep.k_584fabce")}
            description="Upload student data from CSV file"
            onClick={() => {
              setSelectedOption('csv');
            }}
          />
          <QuickSetupCard
            icon={<X className="w-12 h-12 text-gray-500" />}
            title={autoT("auto.web.locale_onboarding_steps_StudentsStep.k_38b9a7fb")}
            description="Add students later from dashboard"
            onClick={() => setSelectedOption('skip')}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Sample Data Generator */}
          {selectedOption === 'sample' && students.length === 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_StudentsStep.k_10465740" /></h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    <AutoI18nText i18nKey="auto.web.locale_onboarding_steps_StudentsStep.k_607384a1" /> {studentCount}
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    step="10"
                    value={studentCount}
                    onChange={(e) => setStudentCount(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>10</span>
                    <span>200</span>
                  </div>
                </div>
                <button
                  onClick={handleSampleData}
                  className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                >
                  <AutoI18nText i18nKey="auto.web.locale_onboarding_steps_StudentsStep.k_92783131" /> {studentCount} <AutoI18nText i18nKey="auto.web.locale_onboarding_steps_StudentsStep.k_ca1540c2" />
                </button>
              </div>
            </div>
          )}

          {/* CSV Upload */}
          {selectedOption === 'csv' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_StudentsStep.k_a7f88f44" /></h3>
              <div className="space-y-4">
                <button
                  onClick={handleDownloadTemplate}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  <AutoI18nText i18nKey="auto.web.locale_onboarding_steps_StudentsStep.k_22a897dc" />
                </button>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-sm text-gray-600 mb-2"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_StudentsStep.k_a485b76a" /></p>
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    id="students-csv"
                    onChange={(e) => {
                      alert('CSV parsing coming soon!');
                    }}
                  />
                  <label
                    htmlFor="students-csv"
                    className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700"
                  >
                    <AutoI18nText i18nKey="auto.web.locale_onboarding_steps_StudentsStep.k_30d5e91b" />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Preview Students */}
          {students.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-lg border p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_StudentsStep.k_a090fcbe" />{students.length})</h3>
                <button
                  onClick={() => {
                    setSelectedOption(null);
                    setStudents([]);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  <AutoI18nText i18nKey="auto.web.locale_onboarding_steps_StudentsStep.k_c9d9bd7a" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_StudentsStep.k_7f6cd432" /></th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_StudentsStep.k_bc7e8557" /></th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_StudentsStep.k_01bb52fd" /></th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">DOB</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                    {students.slice(0, 10).map((student, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {student.firstName} {student.lastName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.grade}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.gender}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.dateOfBirth}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {students.length > 10 && (
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    <AutoI18nText i18nKey="auto.web.locale_onboarding_steps_StudentsStep.k_9d387aac" /> {students.length - 10} <AutoI18nText i18nKey="auto.web.locale_onboarding_steps_StudentsStep.k_7723abec" />
                  </p>
                )}
              </div>
              
              {/* Statistics */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{students.filter(s => s.gender === 'M').length}</p>
                  <p className="text-sm text-blue-700"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_StudentsStep.k_c32d3f0e" /></p>
                </div>
                <div className="bg-pink-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-pink-600">{students.filter(s => s.gender === 'F').length}</p>
                  <p className="text-sm text-pink-700"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_StudentsStep.k_de50094b" /></p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-purple-600">{students.length}</p>
                  <p className="text-sm text-purple-700"><AutoI18nText i18nKey="auto.web.locale_onboarding_steps_StudentsStep.k_372ea5f7" /></p>
                </div>
              </div>
            </div>
          )}

          {selectedOption === 'skip' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <p className="text-sm text-yellow-800">
                <AutoI18nText i18nKey="auto.web.locale_onboarding_steps_StudentsStep.k_f0a8a8af" />
              </p>
            </div>
          )}
        </div>
      )}
    </StepContainer>
  );
}
