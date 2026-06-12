import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

type Variant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'warning'
  | 'info';

const variantClasses: Record<Variant, { container: string; text: string }> = {
  default: { container: 'bg-primary', text: 'text-primary-foreground' },
  secondary: { container: 'bg-secondary', text: 'text-secondary-foreground' },
  destructive: { container: 'bg-destructive', text: 'text-destructive-foreground' },
  outline: { container: 'border border-border bg-transparent', text: 'text-foreground' },
  success: { container: 'bg-green-100', text: 'text-green-800' },
  warning: { container: 'bg-amber-100', text: 'text-amber-800' },
  info: { container: 'bg-blue-100', text: 'text-blue-800' },
};

export function Badge({
  children,
  variant = 'default',
  className,
}: {
  children: ReactNode;
  variant?: Variant;
  className?: string;
}) {
  const v = variantClasses[variant];
  return (
    <View className={`self-start rounded-full px-2.5 py-0.5 ${v.container} ${className ?? ''}`}>
      <Text className={`text-xs font-semibold ${v.text}`}>{children}</Text>
    </View>
  );
}
