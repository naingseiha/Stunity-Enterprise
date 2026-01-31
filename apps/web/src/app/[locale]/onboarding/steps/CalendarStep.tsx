'use client';

import React from 'react';
import StepContainer from '@/components/onboarding/StepContainer';
import { Calendar, CheckCircle } from 'lucide-react';

interface CalendarStepProps {
  onNext: () => void;
  onBack: () => void;
  onboardingData: any;
}

export default function CalendarStep({ onNext, onBack, onboardingData }: CalendarStepProps) {
  // Sample holidays data (this would come from onboardingData in production)
  const holidays = [
    { name: 'International New Year', date: 'January 1', duration: '1 day' },
    { name: 'Victory Over Genocide Day', date: 'January 7', duration: '1 day' },
    { name: 'International Women\'s Day', date: 'March 8', duration: '1 day' },
    { name: 'Khmer New Year', date: 'April 14-16', duration: '3 days' },
    { name: 'International Labor Day', date: 'May 1', duration: '1 day' },
    { name: 'Royal Ploughing Ceremony', date: 'May 10', duration: '1 day' },
    { name: 'King Sihamoni\'s Birthday', date: 'May 14', duration: '1 day' },
    { name: 'Queen Mother\'s Birthday', date: 'June 18', duration: '1 day' },
    { name: 'Constitution Day', date: 'September 24', duration: '1 day' },
    { name: 'Pchum Ben Festival', date: 'September 24-26', duration: '3 days' },
    { name: 'Commemoration Day of King Father', date: 'October 15', duration: '1 day' },
    { name: 'Independence Day', date: 'November 9', duration: '1 day' },
    { name: 'Water Festival', date: 'November 14-16', duration: '3 days' },
  ];

  return (
    <StepContainer
      stepNumber={2}
      title="Academic Calendar"
      description="Your calendar is ready with all Cambodian public holidays"
      onNext={onNext}
      onBack={onBack}
      nextLabel="Looks Good"
    >
      <div className="space-y-6">
        {/* Academic Year Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-8 h-8 text-blue-600" />
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Academic Year 2026-2027
              </h3>
              <p className="text-sm text-gray-600">September 2026 - August 2027</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="bg-white rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Semester 1</div>
              <div className="font-semibold text-gray-900">September - December</div>
              <div className="text-xs text-gray-500 mt-1">4 months</div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Semester 2</div>
              <div className="font-semibold text-gray-900">January - August</div>
              <div className="text-xs text-gray-500 mt-1">8 months</div>
            </div>
          </div>
        </div>

        {/* Holidays List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Public Holidays ({holidays.length})
            </h3>
            <span className="text-sm text-gray-600">
              All Cambodian holidays included
            </span>
          </div>

          <div className="space-y-2">
            {holidays.map((holiday, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{holiday.name}</div>
                    <div className="text-sm text-gray-600">{holiday.date}</div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">{holiday.duration}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            💡 <strong>Tip:</strong> You can add more holidays, school events, and important dates later from the Calendar section in settings.
          </p>
        </div>
      </div>
    </StepContainer>
  );
}
