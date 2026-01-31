'use client';

import { ReactNode, useEffect, useState } from 'react';

interface AnimatedContentProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  animation?: 'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'scale';
}

/**
 * AnimatedContent Component
 *
 * Provides smooth entrance animations for content
 */
export default function AnimatedContent({
  children,
  className = '',
  delay = 0,
  animation = 'fade',
}: AnimatedContentProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  const animationClasses = {
    fade: 'animate-in fade-in duration-500',
    'slide-up': 'animate-in slide-in-from-bottom-4 fade-in duration-500',
    'slide-down': 'animate-in slide-in-from-top-4 fade-in duration-500',
    'slide-left': 'animate-in slide-in-from-right-4 fade-in duration-500',
    'slide-right': 'animate-in slide-in-from-left-4 fade-in duration-500',
    scale: 'animate-in zoom-in-95 fade-in duration-500',
  };

  return (
    <div
      className={`
        ${isVisible ? animationClasses[animation] : 'opacity-0'}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

/**
 * Stagger Children Animation
 *
 * Animates children with staggered delays
 */
export function StaggeredList({
  children,
  staggerDelay = 50,
  animation = 'slide-up',
  className = '',
}: {
  children: ReactNode[];
  staggerDelay?: number;
  animation?: 'fade' | 'slide-up' | 'slide-down' | 'scale';
  className?: string;
}) {
  return (
    <div className={className}>
      {Array.isArray(children) &&
        children.map((child, index) => (
          <AnimatedContent key={index} delay={index * staggerDelay} animation={animation}>
            {child}
          </AnimatedContent>
        ))}
    </div>
  );
}
