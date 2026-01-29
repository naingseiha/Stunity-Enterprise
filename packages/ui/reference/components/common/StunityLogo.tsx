import React from "react";
import Image from "next/image";

interface StunityLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const StunityLogo: React.FC<StunityLogoProps> = ({
  size = "md",
  className = "",
}) => {
  // Size configurations - adjusted for better app bar fit
  const sizes = {
    sm: {
      width: 120,
      height: 48,
    },
    md: {
      width: 180,
      height: 72,
    },
    lg: {
      width: 240,
      height: 96,
    },
  };

  const { width, height } = sizes[size];

  return (
    <div className={`flex items-center flex-shrink-0 ${className}`}>
      <Image
        src="/Stunity.png"
        alt="Stunity Logo"
        width={width}
        height={height}
        className="object-contain"
        priority
      />
    </div>
  );
};

export default StunityLogo;
