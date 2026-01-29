"use client";

import { useState } from "react";
import Image from "next/image"; // ✅ ADDED: Next.js Image

interface GradientAvatarProps {
  name: string;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg";
  isOnline?: boolean;
  isVerified?: boolean;
  level?: number;
  onClick?: () => void;
  className?: string;
}

const SIZE_CLASSES = {
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-base",
  lg: "w-14 h-14 text-xl",
};

const SIZE_PIXELS = {
  sm: 32,
  md: 40,
  lg: 56,
};

export default function GradientAvatar({
  name,
  imageUrl,
  size = "md",
  isOnline = false,
  isVerified = false,
  level,
  onClick,
  className = "",
}: GradientAvatarProps) {
  const [imageError, setImageError] = useState(false);
  
  const initial = name.charAt(0).toUpperCase();
  const sizeClass = SIZE_CLASSES[size];
  
  const shouldShowImage = imageUrl && !imageError;

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`relative ${sizeClass} ${className} ${
        onClick ? "cursor-pointer" : "cursor-default"
      } flex-shrink-0`}
    >
      {/* Beautiful avatar with gradient border effect */}
      <div className="relative w-full h-full rounded-full p-[2px] bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 transition-all">
        <div
          className={`w-full h-full rounded-full overflow-hidden ${
            !shouldShowImage
              ? "bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold"
              : "bg-white"
          }`}
        >
        {shouldShowImage ? (
          <Image
            src={imageUrl}
            alt={name}
            width={SIZE_PIXELS[size]}
            height={SIZE_PIXELS[size]}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
            unoptimized // ✅ Skip optimization for R2 URLs
          />
        ) : (
          <span>{initial}</span>
        )}
        </div>
      </div>

      {/* Minimal online indicator */}
      {isOnline && (
        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
      )}
    </button>
  );
}
