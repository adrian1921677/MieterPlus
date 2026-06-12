import type { ReactNode } from 'react';
import { Text, View, type ViewProps } from 'react-native';

export function Card({ children, className, ...rest }: ViewProps & { children: ReactNode }) {
  return (
    <View
      className={`rounded-lg border border-border bg-card ${className ?? ''}`}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      }}
      {...rest}
    >
      {children}
    </View>
  );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <View className={`gap-1.5 p-6 ${className ?? ''}`}>{children}</View>;
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Text className={`text-lg font-semibold text-foreground ${className ?? ''}`}>{children}</Text>
  );
}

export function CardDescription({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Text className={`text-sm text-muted-foreground ${className ?? ''}`}>{children}</Text>
  );
}

export function CardContent({ children, className }: { children: ReactNode; className?: string }) {
  return <View className={`p-6 pt-0 ${className ?? ''}`}>{children}</View>;
}

export function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <View className={`flex-row items-center p-6 pt-0 ${className ?? ''}`}>{children}</View>
  );
}
