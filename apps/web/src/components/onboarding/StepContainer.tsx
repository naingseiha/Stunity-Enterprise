'use client';

import React from 'react';
import { ArrowLeft, ArrowRight, SkipForward } from 'lucide-react';

interface StepContainerProps {
  stepNumber: number;
  title: string;
  description?: string;
  children: React.ReactNode;
  onNext?: () => void;
  onBack?: () => void;
  onSkip?: () => void;
  nextLabel?: string;
  backLabel?: string;
  skipLabel?: string;
  showNext?: boolean;
  showBack?: boolean;
  showSkip?: boolean;
  nextDisabled?: boolean;
  isLoading?: boolean;
}

export default function StepContainer({
  stepNumber,
  title,
  description,
  children,
  onNext,
  onBack,
  onSkip,
  nextLabel = 'Continue',
  backLabel = 'Back',
  skipLabel = 'Skip for now',
  showNext = true,
  showBack = true,
  showSkip = false,
  nextDisabled = false,
  isLoading = false,
}: StepContainerProps) {
  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Step Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
            {stepNumber}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {title}
          </h1>
        </div>
        {description && (
          <p className="text-gray-600 text-base sm:text-lg ml-11">
            {description}
          </p>
        )}
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 sm:p-8 mb-6">
        {children}
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Back Button */}
        <div>
          {showBack && onBack && (
            <button
              onClick={onBack}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {backLabel}
            </button>
          )}
        </div>

        {/* Skip & Next Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {showSkip && onSkip && (
            <button
              onClick={onSkip}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <SkipForward className="w-4 h-4" />
              {skipLabel}
            </button>
          )}

          {showNext && onNext && (
            <button
              onClick={onNext}
              disabled={nextDisabled || isLoading}
              className="inline-flex items-center justify-center gap-2 px-8 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
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
                  Processing...
                </>
              ) : (
                <>
                  {nextLabel}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
