import { useContext } from 'react';

import { ThemeContext } from './ThemeProvider';
import type { ThemeContextValue } from './types';

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return context;
}
