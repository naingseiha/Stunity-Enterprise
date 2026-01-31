'use client';

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
        const response = await fetch(`http://localhost:3003/students/batch`, {
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
      title="Add Students"
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
            title="Sample Data"
            description="Generate sample students for testing"
            onClick={() => {
              setSelectedOption('sample');
              handleSampleData();
            }}
            recommended={true}
          />
          <QuickSetupCard
            icon={<Upload className="w-12 h-12 text-blue-500" />}
            title="CSV Import"
            description="Upload student data from CSV file"
            onClick={() => {
              setSelectedOption('csv');
            }}
          />
          <QuickSetupCard
            icon={<X className="w-12 h-12 text-gray-500" />}
            title="Skip for Now"
            description="Add students later from dashboard"
            onClick={() => setSelectedOption('skip')}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Sample Data Generator */}
          {selectedOption === 'sample' && students.length === 0 && (
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">Generate Sample Students</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Students: {studentCount}
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
                  Generate {studentCount} Students
                </button>
              </div>
            </div>
          )}

          {/* CSV Upload */}
          {selectedOption === 'csv' && (
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">Upload CSV File</h3>
              <div className="space-y-4">
                <button
                  onClick={handleDownloadTemplate}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Download CSV Template
                </button>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-sm text-gray-600 mb-2">Drop CSV file here or click to upload</p>
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
                    Choose File
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Preview Students */}
          {students.length > 0 && (
            <div className="bg-white rounded-lg border p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Students Preview ({students.length})</h3>
                <button
                  onClick={() => {
                    setSelectedOption(null);
                    setStudents([]);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Choose Different Option
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gender</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">DOB</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {students.slice(0, 10).map((student, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
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
                    ... and {students.length - 10} more students
                  </p>
                )}
              </div>
              
              {/* Statistics */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{students.filter(s => s.gender === 'M').length}</p>
                  <p className="text-sm text-blue-700">Male</p>
                </div>
                <div className="bg-pink-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-pink-600">{students.filter(s => s.gender === 'F').length}</p>
                  <p className="text-sm text-pink-700">Female</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-purple-600">{students.length}</p>
                  <p className="text-sm text-purple-700">Total</p>
                </div>
              </div>
            </div>
          )}

          {selectedOption === 'skip' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <p className="text-sm text-yellow-800">
                You can add students anytime from your dashboard under Student Management.
              </p>
            </div>
          )}
        </div>
      )}
    </StepContainer>
  );
}
