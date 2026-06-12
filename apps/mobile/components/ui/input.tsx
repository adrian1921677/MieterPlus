import { forwardRef } from 'react';
import { TextInput, type TextInputProps } from 'react-native';

type InputProps = TextInputProps & {
  hasError?: boolean;
  className?: string;
};

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { hasError, className, ...props },
  ref,
) {
  return (
    <TextInput
      ref={ref}
      placeholderTextColor="#94a3b8"
      className={`h-10 rounded-md border bg-background px-3 text-sm text-foreground ${
        hasError ? 'border-destructive' : 'border-input'
      } ${className ?? ''}`}
      {...props}
    />
  );
});
