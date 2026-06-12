import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';
import type { ReactNode } from 'react';

type Variant = 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary';
type Size = 'default' | 'sm' | 'lg' | 'icon';

const variantClasses: Record<Variant, { container: string; text: string; active: string }> = {
  default: {
    container: 'bg-primary',
    text: 'text-primary-foreground',
    active: 'bg-primary-dark',
  },
  outline: {
    container: 'border border-input bg-background',
    text: 'text-foreground',
    active: 'bg-accent',
  },
  ghost: {
    container: 'bg-transparent',
    text: 'text-foreground',
    active: 'bg-accent',
  },
  destructive: {
    container: 'bg-destructive',
    text: 'text-destructive-foreground',
    active: 'bg-red-600',
  },
  secondary: {
    container: 'bg-secondary',
    text: 'text-secondary-foreground',
    active: 'bg-slate-200',
  },
};

const sizeClasses: Record<Size, { container: string; text: string }> = {
  default: { container: 'h-10 px-4', text: 'text-sm font-medium' },
  sm: { container: 'h-9 px-3', text: 'text-sm font-medium' },
  lg: { container: 'h-11 px-8', text: 'text-base font-semibold' },
  icon: { container: 'h-10 w-10', text: 'text-sm' },
};

type ButtonProps = Omit<PressableProps, 'children'> & {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
};

export function Button({
  children,
  variant = 'default',
  size = 'default',
  loading = false,
  fullWidth = false,
  disabled,
  className,
  ...rest
}: ButtonProps) {
  const v = variantClasses[variant];
  const s = sizeClasses[size];

  return (
    <Pressable
      disabled={loading || disabled}
      className={`flex-row items-center justify-center gap-2 rounded-md ${v.container} ${s.container} ${
        fullWidth ? 'w-full' : ''
      } ${disabled || loading ? 'opacity-50' : ''} ${className ?? ''}`}
      style={({ pressed }) =>
        pressed && !(disabled || loading) ? { opacity: 0.85 } : null
      }
      {...rest}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? '#0f172a' : '#ffffff'}
        />
      )}
      {typeof children === 'string' ? (
        <Text className={`${v.text} ${s.text}`}>{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
