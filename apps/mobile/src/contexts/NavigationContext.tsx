/**
 * Navigation Context
 * 
 * Provides sidebar toggle functionality across the app
 */

import React, { createContext, useContext, useState } from 'react';

interface NavigationContextType {
  sidebarVisible: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const openSidebar = () => setSidebarVisible(true);
  const closeSidebar = () => setSidebarVisible(false);
  const toggleSidebar = () => setSidebarVisible(prev => !prev);

  return (
    <NavigationContext.Provider
      value={{
        sidebarVisible,
        openSidebar,
        closeSidebar,
        toggleSidebar,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigationContext = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigationContext must be used within NavigationProvider');
  }
  return context;
};
