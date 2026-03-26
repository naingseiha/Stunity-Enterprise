'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import FeedZoomLoader from './feed/FeedZoomLoader';

interface SplashScreenContextType {
  isLoading: boolean;
  showSplash: boolean;
  hasFinishedInitialSplash: boolean;
}

const SplashScreenContext = createContext<SplashScreenContextType>({
  isLoading: true,
  showSplash: true,
  hasFinishedInitialSplash: false,
});

export const useSplashScreen = () => useContext(SplashScreenContext);

interface SplashScreenProviderProps {
  children: ReactNode;
}

export default function SplashScreenProvider({ children }: SplashScreenProviderProps) {
  const [showSplash, setShowSplash] = useState(true); // Default to true for SSR to avoid white flash
  const [isLoading, setIsLoading] = useState(true);
  const [hasFinishedInitialSplash, setHasFinishedInitialSplash] = useState(false);

  useEffect(() => {
    // Check if this is a fresh page load (not a client-side navigation)
    const hasSeenSplash = sessionStorage.getItem('stunity-splash-seen');
    
    if (hasSeenSplash) {
      // Skip splash for client-side navigations within the same session
      setShowSplash(false);
      setIsLoading(false);
      setHasFinishedInitialSplash(true);
    } else {
      // Show splash only on fresh page loads
      setShowSplash(true);
      setIsLoading(true);
      setHasFinishedInitialSplash(false);

      // Trigger the exit animation after a short delay
      // FeedZoomLoader will still wait for its minimumDuration (1000ms)
      const exitTimer = setTimeout(() => {
        setIsLoading(false);
      }, 500);

      // Fallback: Force hide after 5 seconds if something goes wrong
      const fallbackTimer = setTimeout(() => {
        handleSplashComplete();
      }, 5000);

      return () => {
        clearTimeout(exitTimer);
        clearTimeout(fallbackTimer);
      };
    }
  }, []);

  const handleSplashComplete = () => {
    sessionStorage.setItem('stunity-splash-seen', 'true');
    setShowSplash(false);
    setIsLoading(false);
    setHasFinishedInitialSplash(true);
  };

  return (
    <SplashScreenContext.Provider value={{ isLoading, showSplash, hasFinishedInitialSplash }}>
      <FeedZoomLoader 
        isLoading={isLoading} 
        onAnimationComplete={handleSplashComplete}
        minimumDuration={1000}
      />
      <div 
        className={`transition-opacity duration-300 ${
          showSplash ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {children}
      </div>
    </SplashScreenContext.Provider>
  );
}
