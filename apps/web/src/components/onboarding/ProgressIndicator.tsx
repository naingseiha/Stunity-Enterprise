'use client';

import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

interface Step {
  number: number;
  title: string;
  completed: boolean;
}

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  completedSteps: number[];
  stepTitles: string[];
}

export default function ProgressIndicator({
  currentStep,
  totalSteps,
  completedSteps,
  stepTitles,
}: ProgressIndicatorProps) {
  const steps: Step[] = Array.from({ length: totalSteps }, (_, i) => ({
    number: i + 1,
    title: stepTitles[i] || `Step ${i + 1}`,
    completed: completedSteps.includes(i + 1),
  }));

  return (
    <div className="w-full max-w-4xl mx-auto mb-8">
      {/* Progress Bar */}
      <div className="relative">
        <div className="absolute top-5 left-0 w-full h-0.5 bg-gray-200">
          <div
            className="h-full bg-blue-600 transition-all duration-500"
            style={{
              width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%`,
            }}
          />
        </div>

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step) => {
            const isActive = step.number === currentStep;
            const isCompleted = step.completed;
            const isPast = step.number < currentStep;

            return (
              <div
                key={step.number}
                className="flex flex-col items-center"
              >
                {/* Step Circle */}
                <div
                  className={`
                    relative z-10 flex items-center justify-center
                    w-10 h-10 rounded-full border-2 font-semibold
                    transition-all duration-300
                    ${
                      isCompleted || isPast
                        ? 'bg-green-500 border-green-500 text-white'
                        : isActive
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-gray-300 text-gray-500'
                    }
                  `}
                >
                  {isCompleted || isPast ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <span className="text-sm">{step.number}</span>
                  )}
                </div>

                {/* Step Title */}
                <div
                  className={`
                    mt-2 text-xs sm:text-sm font-medium text-center max-w-[80px] sm:max-w-none
                    ${
                      isActive
                        ? 'text-blue-600'
                        : isCompleted || isPast
                        ? 'text-green-600'
                        : 'text-gray-500'
                    }
                  `}
                >
                  {step.title}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Completion Percentage */}
      <div className="mt-4 text-center">
        <div className="text-sm text-gray-600">
          Step {currentStep} of {totalSteps}
          <span className="mx-2">•</span>
          <span className="font-semibold text-blue-600">
            {Math.round((completedSteps.length / totalSteps) * 100)}% Complete
          </span>
        </div>
      </div>
    </div>
  );
}
