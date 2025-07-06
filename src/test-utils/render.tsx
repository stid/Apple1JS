import React from 'react';
import { render as rtlRender, RenderOptions } from '@testing-library/react';
import { DebuggerNavigationProvider } from '../contexts/DebuggerNavigationContext';
import { LoggingProvider } from '../contexts/LoggingContext';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  withDebuggerNavigation?: boolean;
  withLogging?: boolean;
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) {
  const { 
    withDebuggerNavigation = true, 
    withLogging = true,
    ...renderOptions 
  } = options;

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    let content = children;

    if (withLogging) {
      content = <LoggingProvider>{content}</LoggingProvider>;
    }

    if (withDebuggerNavigation) {
      content = <DebuggerNavigationProvider>{content}</DebuggerNavigationProvider>;
    }

    return <>{content}</>;
  };

  return rtlRender(ui, { wrapper: Wrapper, ...renderOptions });
}

// Re-export everything from @testing-library/react
export * from '@testing-library/react';
export { renderWithProviders as render };