"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface AnimatedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "success" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

const VARIANT_CLASSES = {
  primary:
    "bg-gradient-stunity text-white hover:shadow-glow-purple disabled:opacity-50",
  secondary:
    "bg-white border-2 border-stunity-primary-300 text-stunity-primary-700 hover:bg-stunity-primary-50 hover:border-stunity-primary-400",
  success:
    "bg-gradient-practice text-white hover:shadow-glow-green disabled:opacity-50",
  danger:
    "bg-gradient-to-r from-red-500 to-rose-500 text-white hover:from-red-600 hover:to-rose-600 disabled:opacity-50",
  ghost:
    "bg-transparent hover:bg-gray-100 text-gray-700 hover:text-gray-900",
};

const SIZE_CLASSES = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-base",
  lg: "px-6 py-3 text-lg",
};

export default function AnimatedButton({
  variant = "primary",
  size = "md",
  isLoading = false,
  icon,
  children,
  className = "",
  disabled,
  ...props
}: AnimatedButtonProps) {
  const variantClass = VARIANT_CLASSES[variant];
  const sizeClass = SIZE_CLASSES[size];

  return (
    <button
      className={`
        relative inline-flex items-center justify-center gap-2 
        rounded-xl font-semibold 
        transition-all duration-300 
        hover:scale-105 hover:shadow-lg
        active:scale-95
        disabled:cursor-not-allowed disabled:hover:scale-100
        ${variantClass} ${sizeClass} ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading...</span>
        </>
      ) : (
        <>
          {icon && (
            <span className="transition-transform group-hover:scale-110">
              {icon}
            </span>
          )}
          {children}
        </>
      )}
    </button>
  );
}
