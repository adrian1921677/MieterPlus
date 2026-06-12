import { Text, type TextProps } from 'react-native';
import type { ReactNode } from 'react';

export function Label({
  children,
  className,
  ...rest
}: TextProps & { children: ReactNode; className?: string }) {
  return (
    <Text className={`text-sm font-medium text-foreground ${className ?? ''}`} {...rest}>
      {children}
    </Text>
  );
}
