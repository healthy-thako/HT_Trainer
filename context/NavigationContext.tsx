import React, { createContext, useContext, useRef, useCallback } from 'react';
import { NavigationContainerRef } from '@react-navigation/native';
import NavigationHelper, { RootStackParamList, AppNavigationProp } from '../lib/navigation';

interface NavigationContextType {
  navigationRef: React.RefObject<NavigationContainerRef<RootStackParamList>>;
  isReady: boolean;
  onReady: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const [isReady, setIsReady] = React.useState(false);

  const onReady = useCallback(() => {
    setIsReady(true);
    if (navigationRef.current) {
      NavigationHelper.setNavigation(navigationRef.current as AppNavigationProp);
      console.log('Navigation helper initialized');
    }
  }, []);

  const value: NavigationContextType = {
    navigationRef,
    isReady,
    onReady,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigationContext() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigationContext must be used within a NavigationProvider');
  }
  return context;
} 