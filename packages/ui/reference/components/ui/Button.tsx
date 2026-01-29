import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

const variantClasses = {
  primary:
    "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl",
  secondary:
    "bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 hover:border-gray-300",
  danger:
    "bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl",
  success:
    "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl",
};

const sizeClasses = {
  sm: "px-3 py-1.5 text-sm gap-1.5",
  md: "px-5 py-2.5 text-base gap-2",
  lg: "px-6 py-3 text-lg gap-2.5",
};

export default function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center
        rounded-xl font-semibold 
        transition-all duration-200
        hover:scale-105
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        ${variantClasses[variant]} 
        ${sizeClasses[size]} 
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
