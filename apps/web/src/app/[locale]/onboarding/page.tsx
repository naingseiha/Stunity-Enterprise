'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ProgressIndicator from '@/components/onboarding/ProgressIndicator';
import WelcomeStep from './steps/WelcomeStep';
import CalendarStep from './steps/CalendarStep';
import SubjectsStep from './steps/SubjectsStep';
import TeachersStep from './steps/TeachersStep';
import ClassesStep from './steps/ClassesStep';
import StudentsStep from './steps/StudentsStep';
import CompleteStep from './steps/CompleteStep';

const STEP_TITLES = [
  'Welcome',
  'Calendar',
  'Subjects',
  'Teachers',
  'Classes',
  'Students',
  'Complete',
];

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingData, setOnboardingData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Load onboarding status
  useEffect(() => {
    loadOnboardingStatus();
  }, []);

  const loadOnboardingStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get school ID from URL params, localStorage, or use test school
      const urlSchoolId = searchParams?.get('schoolId');
      const storedSchoolId = typeof window !== 'undefined' ? localStorage.getItem('schoolId') : null;
      const schoolId = urlSchoolId || storedSchoolId || 'cml11211o00006xsh61xi30o7';
      
      // Store for future use
      if (typeof window !== 'undefined' && schoolId) {
        localStorage.setItem('schoolId', schoolId);
      }
      
      console.log('Loading onboarding for school:', schoolId);
      
      const response = await fetch(`http://localhost:3002/schools/${schoolId}/onboarding/status`);
      
      if (!response.ok) {
        throw new Error('Failed to load onboarding status');
      }
      
      const data = await response.json();

      if (data.success) {
        setOnboardingData(data.data);
        
        // Determine completed steps from checklist
        const checklist = data.data.checklist;
        const completed = [];
        
        if (checklist.registrationDone) completed.push(1);
        if (checklist.calendarDone) completed.push(2);
        if (checklist.subjectsDone) completed.push(3);
        if (checklist.teachersAdded) completed.push(4);
        if (checklist.classesCreated) completed.push(5);
        if (checklist.studentsAdded) completed.push(6);
        
        setCompletedSteps(completed);
        setCurrentStep(checklist.currentStep || 1);
      }
    } catch (error: any) {
      console.error('Error loading onboarding status:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep < 7) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSkip = async () => {
    // Mark step as skipped and move to next
    await updateOnboardingStep(currentStep, false, true);
    handleNext();
  };

  const handleStepComplete = async (stepNumber: number) => {
    // Mark step as completed
    if (!completedSteps.includes(stepNumber)) {
      setCompletedSteps([...completedSteps, stepNumber]);
    }
    await updateOnboardingStep(stepNumber, true, false);
    handleNext();
  };

  const updateOnboardingStep = async (step: number, completed: boolean, skipped: boolean) => {
    try {
      const schoolId = localStorage.getItem('schoolId') || 'demo-school-id';
      const stepNames = ['registration', 'calendar', 'subjects', 'teachers', 'classes', 'students', 'complete'];
      
      await fetch(`http://localhost:3002/schools/${schoolId}/onboarding/step`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: stepNames[step - 1],
          completed,
          skipped,
        }),
      });
    } catch (error) {
      console.error('Error updating onboarding step:', error);
    }
  };

  const handleComplete = async () => {
    try {
      const schoolId = localStorage.getItem('schoolId') || 'demo-school-id';
      
      const response = await fetch(`http://localhost:3002/schools/${schoolId}/onboarding/complete`, {
        method: 'POST',
      });

      if (response.ok) {
        // Redirect to dashboard
        setTimeout(() => {
          router.push('/en/dashboard');
        }, 2000);
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg
            className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="text-gray-600 text-lg">Loading your onboarding...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={loadOnboardingStatus}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Welcome to Stunity Enterprise! 🎉
          </h1>
          <p className="text-lg text-gray-600">
            Let's get your school set up in just a few steps
          </p>
        </div>

        {/* Progress Indicator */}
        <ProgressIndicator
          currentStep={currentStep}
          totalSteps={7}
          completedSteps={completedSteps}
          stepTitles={STEP_TITLES}
        />

        {/* Step Content */}
        <div className="mt-12">
          {currentStep === 1 && (
            <WelcomeStep
              onNext={handleNext}
              onboardingData={onboardingData}
            />
          )}
          {currentStep === 2 && (
            <CalendarStep
              onNext={handleNext}
              onBack={handleBack}
              onboardingData={onboardingData}
            />
          )}
          {currentStep === 3 && (
            <SubjectsStep
              onNext={handleNext}
              onBack={handleBack}
              onboardingData={onboardingData}
            />
          )}
          {currentStep === 4 && (
            <TeachersStep
              onNext={() => handleStepComplete(4)}
              onBack={handleBack}
              onSkip={handleSkip}
              schoolId={onboardingData?.school?.id || ''}
            />
          )}
          {currentStep === 5 && (
            <ClassesStep
              onNext={() => handleStepComplete(5)}
              onBack={handleBack}
              onSkip={handleSkip}
              schoolId={onboardingData?.school?.id || ''}
              academicYearId={onboardingData?.academicYear?.id || ''}
            />
          )}
          {currentStep === 6 && (
            <StudentsStep
              onNext={() => handleStepComplete(6)}
              onBack={handleBack}
              onSkip={handleSkip}
              schoolId={onboardingData?.school?.id || ''}
              classIds={onboardingData?.classes?.map((c: any) => c.id) || []}
            />
          )}
          {currentStep === 7 && (
            <CompleteStep
              onComplete={handleComplete}
              schoolId={onboardingData?.school?.id || ''}
            />
          )}
        </div>
      </div>
    </div>
  );
}
