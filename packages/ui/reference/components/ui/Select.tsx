"use client";

import React from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  icon?: React.ReactNode;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: SelectOption[];
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function Select({
  label,
  icon,
  value,
  onChange,
  options,
  required = false,
  disabled = false,
  className = "",
}: SelectProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10">
            {icon}
          </div>
        )}
        <select
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          style={{
            // ✅ Custom styles for dropdown options
            lineHeight: "1.5",
          }}
          className={`
            w-full 
            ${icon ? "pl-10" : "pl-4"} 
            pr-10 
            py-3
            text-base
            border-2 
            border-gray-300 
            rounded-lg 
            focus:ring-2 
            focus:ring-blue-500 
            focus:border-blue-500 
            bg-white 
            text-gray-900 
            disabled:bg-gray-100 
            disabled:cursor-not-allowed 
            appearance-none 
            cursor-pointer 
            transition-all
            hover:border-gray-400
            [&>option]:py-3
            [&>option]:px-4
            [&>option]:text-base
            [&>option]:leading-relaxed
          `}
        >
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              className="py-3 px-4 text-base"
            >
              {option.label}
            </option>
          ))}
        </select>
        {/* Custom dropdown arrow */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
