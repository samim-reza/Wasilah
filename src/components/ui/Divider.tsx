import { View } from 'react-native';

export interface DividerProps {
  /** Indents the line to align with content that has a leading icon. */
  inset?: boolean;
  className?: string;
}

export function Divider({ inset = false, className = '' }: DividerProps) {
  return (
    <View
      className={`h-px bg-border ${inset ? 'ml-12' : ''} ${className}`}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
