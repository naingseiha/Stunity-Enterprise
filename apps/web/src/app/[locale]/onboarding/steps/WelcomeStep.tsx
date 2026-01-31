'use client';

import React from 'react';
import StepContainer from '@/components/onboarding/StepContainer';
import { CheckCircle, Calendar, BookOpen, Users, GraduationCap } from 'lucide-react';

interface WelcomeStepProps {
  onNext: () => void;
  onboardingData: any;
}

export default function WelcomeStep({ onNext, onboardingData }: WelcomeStepProps) {
  const school = onboardingData?.school;

  return (
    <StepContainer
      stepNumber={1}
      title="Welcome to Your School!"
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
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {school?.name || 'Your School'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Email:</span>{' '}
                  <span className="font-medium text-gray-900">{school?.email}</span>
                </div>
                <div>
                  <span className="text-gray-600">Type:</span>{' '}
                  <span className="font-medium text-gray-900">
                    {school?.schoolType?.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Trial:</span>{' '}
                  <span className="font-medium text-gray-900">
                    {school?.subscriptionTier === 'FREE_TRIAL_3M' ? '3 months' : '1 month'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>{' '}
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* What's Already Done */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            ✨ What We've Set Up For You
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Academic Year */}
            <div className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900">Academic Year</h4>
                <p className="text-sm text-gray-600 mt-1">
                  2026-2027 school year with 2 semesters
                </p>
              </div>
            </div>

            {/* Calendar */}
            <div className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900">Calendar & Holidays</h4>
                <p className="text-sm text-gray-600 mt-1">
                  13 Cambodian public holidays pre-loaded
                </p>
              </div>
            </div>

            {/* Subjects */}
            <div className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900">Subjects</h4>
                <p className="text-sm text-gray-600 mt-1">
                  15 subjects from Cambodian curriculum
                </p>
              </div>
            </div>

            {/* Grading System */}
            <div className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900">Grading System</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Standard A-F scale with GPA calculation
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps Preview */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            📝 What's Next
          </h3>
          <p className="text-gray-600 mb-4">
            We'll guide you through adding your teachers, creating classes, and importing students. 
            You can skip any step and come back to it later!
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-white border border-gray-300 text-gray-700">
              <Users className="w-4 h-4 mr-1.5" />
              Add Teachers
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-white border border-gray-300 text-gray-700">
              <BookOpen className="w-4 h-4 mr-1.5" />
              Create Classes
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-white border border-gray-300 text-gray-700">
              <GraduationCap className="w-4 h-4 mr-1.5" />
              Import Students
            </span>
          </div>
        </div>
      </div>
    </StepContainer>
  );
}
