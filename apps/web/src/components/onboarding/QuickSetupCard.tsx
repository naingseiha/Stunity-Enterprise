'use client';

import React from 'react';

interface QuickSetupCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  recommended?: boolean;
}

export default function QuickSetupCard({
  icon,
  title,
  description,
  onClick,
  disabled = false,
  recommended = false,
}: QuickSetupCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative flex flex-col items-center p-6 bg-white border-2 rounded-lg
        transition-all duration-200 hover:shadow-lg
        ${
          disabled
            ? 'opacity-50 cursor-not-allowed border-gray-200'
            : 'cursor-pointer border-gray-300 hover:border-blue-500'
        }
        ${recommended ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
      `}
    >
      {/* Recommended Badge */}
      {recommended && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-600 text-white">
            Recommended
          </span>
        </div>
      )}

      {/* Icon */}
      <div className={`mb-4 ${recommended ? 'text-blue-600' : 'text-gray-600'}`}>
        {icon}
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>

      {/* Description */}
      <p className="text-sm text-gray-600 text-center">
        {description}
      </p>
    </button>
  );
}
