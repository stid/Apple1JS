import React, { createContext, useContext, useState, useCallback } from 'react';

export type NavigationTarget = 'disassembly' | 'memory';

interface NavigationEvent {
  address: number;
  target: NavigationTarget;
}

interface DebuggerNavigationContextType {
  navigate: (address: number, target?: NavigationTarget) => void;
  currentNavigation: NavigationEvent | null;
  clearNavigation: () => void;
  subscribeToNavigation: (callback: (event: NavigationEvent) => void) => () => void;
}

const DebuggerNavigationContext = createContext<DebuggerNavigationContextType | undefined>(
  undefined
);

export const useDebuggerNavigation = () => {
  const context = useContext(DebuggerNavigationContext);
  if (!context) {
    throw new Error('useDebuggerNavigation must be used within DebuggerNavigationProvider');
  }
  return context;
};

interface DebuggerNavigationProviderProps {
  children: React.ReactNode;
}

export const DebuggerNavigationProvider: React.FC<DebuggerNavigationProviderProps> = ({
  children,
}) => {
  const [currentNavigation, setCurrentNavigation] = useState<NavigationEvent | null>(null);
  const [listeners, setListeners] = useState<Array<(event: NavigationEvent) => void>>([]);

  const navigate = useCallback((address: number, target: NavigationTarget = 'disassembly') => {
    const event: NavigationEvent = { address, target };
    setCurrentNavigation(event);
    
    listeners.forEach(listener => {
      listener(event);
    });
  }, [listeners]);

  const clearNavigation = useCallback(() => {
    setCurrentNavigation(null);
  }, []);

  const subscribeToNavigation = useCallback((callback: (event: NavigationEvent) => void) => {
    setListeners(prev => [...prev, callback]);
    
    return () => {
      setListeners(prev => prev.filter(listener => listener !== callback));
    };
  }, []);

  const value: DebuggerNavigationContextType = {
    navigate,
    currentNavigation,
    clearNavigation,
    subscribeToNavigation,
  };

  return (
    <DebuggerNavigationContext.Provider value={value}>
      {children}
    </DebuggerNavigationContext.Provider>
  );
};