'use client';

import { useState } from 'react';
import { School, Sparkles, Plus } from 'lucide-react';
import StepContainer from '@/components/onboarding/StepContainer';
import QuickSetupCard from '@/components/onboarding/QuickSetupCard';
import { generateClasses } from '../utils/dataGenerators';

interface ClassesStepProps {
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  schoolId: string;
  academicYearId: string;
}

export default function ClassesStep({ onNext, onBack, onSkip, schoolId, academicYearId }: ClassesStepProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedGrades, setSelectedGrades] = useState<string[]>(['10', '11', '12']);
  const [sectionsPerGrade, setSectionsPerGrade] = useState(2);
  const [classes, setClasses] = useState<any[]>([]);

  // Quick generate classes
  const handleQuickGenerate = () => {
    setSelectedOption('quick');
    const generatedClasses = generateClasses(selectedGrades, sectionsPerGrade, academicYearId);
    setClasses(generatedClasses);
  };

  // Create classes via API
  const handleCreateClasses = async () => {
    if (classes.length === 0) {
      alert('Please generate classes first');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:3005/classes/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId,
          academicYearId,
          classes,
        }),
      });

      if (!response.ok) throw new Error('Failed to create classes');
      
      onNext();
    } catch (error) {
      console.error('Error creating classes:', error);
      alert('Failed to create classes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <StepContainer
      stepNumber={5}
      title="Create Classes"
      description="Set up your class structure for the academic year. We'll auto-generate classes based on your selection."
      onNext={selectedOption === 'skip' ? onSkip : handleCreateClasses}
      onBack={onBack}
      onSkip={onSkip}
      showSkip={true}
      isLoading={isLoading}
      nextLabel={selectedOption ? 'Continue' : 'Generate Classes'}
      nextDisabled={!selectedOption}
    >
      {!selectedOption ? (
        <div className="space-y-6">
          {/* Quick Generator */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="w-6 h-6 text-purple-500" />
              <h3 className="text-lg font-semibold">Quick Class Generator (Recommended)</h3>
            </div>

            {/* Grade Selection */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Grades
                </label>
                <div className="flex flex-wrap gap-2">
                  {['7', '8', '9', '10', '11', '12'].map((grade) => (
                    <button
                      key={grade}
                      onClick={() => {
                        setSelectedGrades((prev) =>
                          prev.includes(grade)
                            ? prev.filter((g) => g !== grade)
                            : [...prev, grade]
                        );
                      }}
                      className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                        selectedGrades.includes(grade)
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      Grade {grade}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sections per Grade: {sectionsPerGrade}
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={sectionsPerGrade}
                  onChange={(e) => setSectionsPerGrade(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1 section</span>
                  <span>5 sections</span>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Will generate:</strong> {selectedGrades.length} grades × {sectionsPerGrade} sections = {' '}
                  <strong>{selectedGrades.length * sectionsPerGrade} classes</strong>
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Sections: {['A', 'B', 'C', 'D', 'E'].slice(0, sectionsPerGrade).join(', ')}
                </p>
              </div>

              <button
                onClick={handleQuickGenerate}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Generate Classes
              </button>
            </div>
          </div>

          {/* Other Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <QuickSetupCard
              icon={<Plus className="w-12 h-12 text-green-500" />}
              title="Manual Entry"
              description="Create classes one by one manually"
              onClick={() => setSelectedOption('manual')}
            />
            <QuickSetupCard
              icon={<School className="w-12 h-12 text-gray-500" />}
              title="Skip for Now"
              description="Set up classes later from dashboard"
              onClick={() => setSelectedOption('skip')}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Preview Classes */}
          {classes.length > 0 && (
            <div className="bg-white rounded-lg border p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Classes Preview ({classes.length})</h3>
                <button
                  onClick={() => {
                    setSelectedOption(null);
                    setClasses([]);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Regenerate
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {classes.map((cls, idx) => (
                  <div key={idx} className="border rounded-lg p-3 text-center">
                    <p className="font-medium">{cls.name}</p>
                    <p className="text-xs text-gray-500">{cls.nameKh}</p>
                    <p className="text-xs text-gray-400 mt-1">Capacity: {cls.capacity}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedOption === 'skip' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <p className="text-sm text-yellow-800">
                You can create classes anytime from your dashboard under Academic Management.
              </p>
            </div>
          )}
        </div>
      )}
    </StepContainer>
  );
}
