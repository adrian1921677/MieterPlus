import { Pressable, Text, View } from 'react-native';

export type Role = 'tenant' | 'landlord';

/**
 * Zwei-Buttons-Picker für Rolle (Mieter / Vermieter).
 * Visuell identisch zur Web-Variante in GoogleSignupSection.
 */
export function RolePicker({
  value,
  onChange,
  label = 'Ich bin…',
}: {
  value: Role;
  onChange: (r: Role) => void;
  label?: string;
}) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-foreground">{label}</Text>
      <View className="flex-row gap-2">
        <RoleButton
          active={value === 'tenant'}
          onPress={() => onChange('tenant')}
          label="Mieter"
        />
        <RoleButton
          active={value === 'landlord'}
          onPress={() => onChange('landlord')}
          label="Vermieter"
        />
      </View>
    </View>
  );
}

function RoleButton({
  active,
  onPress,
  label,
}: {
  active: boolean;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 rounded-md border p-3 ${
        active ? 'border-primary bg-primary/5' : 'border-border bg-background'
      }`}
    >
      <Text
        className={`text-center text-sm font-medium ${
          active ? 'text-primary' : 'text-foreground'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
