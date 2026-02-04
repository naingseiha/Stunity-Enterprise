'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import DrawingSplashScreen from './DrawingSplashScreen';

interface SplashScreenContextType {
  isLoading: boolean;
  showSplash: boolean;
}

const SplashScreenContext = createContext<SplashScreenContextType>({
  isLoading: true,
  showSplash: true,
});

export const useSplashScreen = () => useContext(SplashScreenContext);

interface SplashScreenProviderProps {
  children: ReactNode;
}

export default function SplashScreenProvider({ children }: SplashScreenProviderProps) {
  const [showSplash, setShowSplash] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if this is a fresh page load (not a client-side navigation)
    const hasSeenSplash = sessionStorage.getItem('stunity-splash-seen');
    
    if (hasSeenSplash) {
      // Skip splash for client-side navigations within the same session
      setShowSplash(false);
      setIsLoading(false);
    } else {
      // Show splash only on fresh page loads
      setIsLoading(true);
    }
  }, []);

  const handleSplashComplete = () => {
    sessionStorage.setItem('stunity-splash-seen', 'true');
    setShowSplash(false);
    setIsLoading(false);
  };

  return (
    <SplashScreenContext.Provider value={{ isLoading, showSplash }}>
      {showSplash && <DrawingSplashScreen onComplete={handleSplashComplete} />}
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
