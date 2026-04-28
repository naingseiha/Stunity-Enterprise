'use client';

import React from 'react';
import StepContainer from '@/components/onboarding/StepContainer';
import { Calendar, CheckCircle } from 'lucide-react';

interface CalendarStepProps {
  onNext: () => void;
  onBack: () => void;
  onboardingData: any;
}

const monthRangeFormatter = new Intl.DateTimeFormat('en', {
  month: 'long',
  day: 'numeric',
});

const shortRangeFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function toDate(value: string | Date | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateRange(startValue: string | Date | undefined, endValue: string | Date | undefined): string {
  const startDate = toDate(startValue);
  const endDate = toDate(endValue);

  if (!startDate || !endDate) return 'Dates pending';
  if (startDate.toDateString() === endDate.toDateString()) {
    return shortRangeFormatter.format(startDate);
  }

  return `${shortRangeFormatter.format(startDate)} - ${shortRangeFormatter.format(endDate)}`;
}

function formatMonthWindow(startValue: string | Date | undefined, endValue: string | Date | undefined): string {
  const startDate = toDate(startValue);
  const endDate = toDate(endValue);

  if (!startDate || !endDate) return 'Dates pending';
  return `${monthRangeFormatter.format(startDate)} - ${monthRangeFormatter.format(endDate)}`;
}

function getDurationLabel(startValue: string | Date | undefined, endValue: string | Date | undefined): string {
  const startDate = toDate(startValue);
  const endDate = toDate(endValue);

  if (!startDate || !endDate) return 'Duration pending';

  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const duration = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / millisecondsPerDay) + 1);
  return `${duration} day${duration === 1 ? '' : 's'}`;
}

export default function CalendarStep({ onNext, onBack, onboardingData }: CalendarStepProps) {
  const school = onboardingData?.school;
  const model = school?.educationModel || 'KHM_MOEYS';
  const academicYear = onboardingData?.academicYear;
  const terms = academicYear?.terms || [];
  const holidays = academicYear?.calendars?.[0]?.events || [];

  return (
    <StepContainer
      stepNumber={2}
      title="Academic Calendar"
      description={
        model === 'KHM_MOEYS'
          ? 'Your academic terms and Cambodian public holidays are ready.'
          : 'Your academic terms are ready. Local holidays can be added later.'
      }
      onNext={onNext}
      onBack={onBack}
      nextLabel="Looks Good"
    >
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-8 h-8 text-blue-600" />
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {academicYear?.name || 'Academic Year'}
              </h3>
              <p className="text-sm text-gray-600">
                {formatDateRange(academicYear?.startDate, academicYear?.endDate)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {terms.map((term: any) => (
              <div key={term.id || term.termNumber} className="bg-white dark:bg-gray-900 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">{term.name}</div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {formatMonthWindow(term.startDate, term.endDate)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {getDurationLabel(term.startDate, term.endDate)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Public Holidays ({model === 'KHM_MOEYS' ? holidays.length : 0})
            </h3>
            <span className="text-sm text-gray-600">
              {model === 'KHM_MOEYS' ? 'Loaded from your current academic calendar' : 'No holidays pre-loaded'}
            </span>
          </div>

          {model === 'KHM_MOEYS' && holidays.length > 0 ? (
            <div className="space-y-2">
              {holidays.map((holiday: any) => (
                <div
                  key={holiday.id || `${holiday.title}-${holiday.startDate}`}
                  className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{holiday.title}</div>
                      <div className="text-sm text-gray-600">
                        {formatDateRange(holiday.startDate, holiday.endDate)}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {getDurationLabel(holiday.startDate, holiday.endDate)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5 flex items-start gap-3">
              <Calendar className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-900">No holidays pre-loaded</h4>
                <p className="text-sm text-yellow-800 mt-1">
                  Because this school is not using the Cambodian MoEYS model, public holidays stay manual. Add your local holidays anytime from Settings &rarr; Academic Calendar.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            <strong>Tip:</strong> You can add more holidays, school events, and important dates later from the calendar settings.
          </p>
        </div>
      </div>
    </StepContainer>
  );
}
