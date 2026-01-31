'use client';

import React from 'react';
import StepContainer from '@/components/onboarding/StepContainer';
import { BookOpen, CheckCircle } from 'lucide-react';

interface SubjectsStepProps {
  onNext: () => void;
  onBack: () => void;
  onboardingData: any;
}

export default function SubjectsStep({ onNext, onBack, onboardingData }: SubjectsStepProps) {
  // Sample subjects data (this would come from onboardingData in production)
  const subjects = [
    { name: 'Mathematics', nameKh: 'គណិតវិទ្យា', category: 'CORE', coefficient: 2.0 },
    { name: 'Khmer Literature', nameKh: 'អក្សរសាស្ត្រខ្មែរ', category: 'CORE', coefficient: 2.0 },
    { name: 'Physics', nameKh: 'រូបវិទ្យា', category: 'CORE', coefficient: 2.0 },
    { name: 'Chemistry', nameKh: 'គីមីវិទ្យា', category: 'CORE', coefficient: 2.0 },
    { name: 'Biology', nameKh: 'ជីវវិទ្យា', category: 'CORE', coefficient: 2.0 },
    { name: 'History', nameKh: 'ប្រវត្តិសាស្ត្រ', category: 'CORE', coefficient: 1.5 },
    { name: 'Geography', nameKh: 'ភូមិសាស្ត្រ', category: 'CORE', coefficient: 1.5 },
    { name: 'English', nameKh: 'អង់គ្លេស', category: 'CORE', coefficient: 2.0 },
    { name: 'French', nameKh: 'បារាំង', category: 'ELECTIVE', coefficient: 1.5 },
    { name: 'Information Technology', nameKh: 'បច្ចេកវិទ្យាព័ត៌មាន', category: 'CORE', coefficient: 1.5 },
    { name: 'Physical Education', nameKh: 'អប់រំកាយ', category: 'CORE', coefficient: 1.0 },
    { name: 'Moral-Civics', nameKh: 'សីលធម៌-ពលរដ្ឋ', category: 'CORE', coefficient: 1.0 },
    { name: 'Earth Science', nameKh: 'វិទ្យាសាស្ត្រផែនដី', category: 'ELECTIVE', coefficient: 1.5 },
    { name: 'STEM', nameKh: 'វិទ្យាសាស្ត្រ បច្ចេកវិទ្យា វិស្វកម្ម គណិតវិទ្យា', category: 'ELECTIVE', coefficient: 2.0 },
    { name: 'Life Skills', nameKh: 'ជំនាញរស់នៅ', category: 'ELECTIVE', coefficient: 1.0 },
  ];

  const getCategoryBadge = (category: string) => {
    if (category === 'CORE') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Core
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
        Elective
      </span>
    );
  };

  return (
    <StepContainer
      stepNumber={3}
      title="Subjects & Curriculum"
      description="Your curriculum is ready with all standard Cambodian subjects"
      onNext={onNext}
      onBack={onBack}
      nextLabel="Continue"
    >
      <div className="space-y-6">
        {/* Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <BookOpen className="w-8 h-8 text-blue-600" />
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {subjects.length} Subjects Loaded
              </h3>
              <p className="text-sm text-gray-600">
                Cambodian high school curriculum (Grades 10-12)
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            <div className="bg-white rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-600">
                {subjects.filter(s => s.category === 'CORE').length}
              </div>
              <div className="text-xs text-gray-600">Core Subjects</div>
            </div>
            <div className="bg-white rounded-lg p-3">
              <div className="text-2xl font-bold text-purple-600">
                {subjects.filter(s => s.category === 'ELECTIVE').length}
              </div>
              <div className="text-xs text-gray-600">Electives</div>
            </div>
            <div className="bg-white rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600">
                {subjects.reduce((sum, s) => sum + s.coefficient, 0).toFixed(1)}
              </div>
              <div className="text-xs text-gray-600">Total Credits</div>
            </div>
            <div className="bg-white rounded-lg p-3">
              <div className="text-2xl font-bold text-orange-600">100</div>
              <div className="text-xs text-gray-600">Max Score</div>
            </div>
          </div>
        </div>

        {/* Subjects Table */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Subject List</h3>
            <span className="text-sm text-gray-600">Bilingual (English/Khmer)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider hidden sm:table-cell">
                    Khmer Name
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Coefficient
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {subjects.map((subject, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="font-medium text-gray-900">{subject.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                      {subject.nameKh}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getCategoryBadge(subject.category)}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-gray-900">
                      {subject.coefficient}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            💡 <strong>Tip:</strong> You can add more subjects, modify coefficients, or customize the curriculum later from the Subjects section in settings.
          </p>
        </div>
      </div>
    </StepContainer>
  );
}
