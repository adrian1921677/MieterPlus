import { Image, Text, View } from 'react-native';

/**
 * ADB-Logo + "Mieter +" mit Tagline — wie auf Web-Auth-Pages.
 * Default-Variante zeigt Logo zentriert oben groß mit Tagline drunter.
 */
export function Brand({
  variant = 'centered',
}: {
  variant?: 'centered' | 'inline-sm' | 'inline-md';
}) {
  if (variant === 'centered') {
    return (
      <View className="items-center gap-2">
        <Image
          source={require('@/assets/logo.png')}
          style={{ width: 64, height: 64, borderRadius: 14 }}
          resizeMode="contain"
        />
        <Text className="text-xl font-bold tracking-wider text-foreground">MIETER +</Text>
        <Text className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          Eine App von ADB
        </Text>
      </View>
    );
  }
  const logoSize = variant === 'inline-sm' ? 28 : 36;
  const titleClass = variant === 'inline-sm' ? 'text-base' : 'text-lg';
  return (
    <View className="flex-row items-center gap-2">
      <Image
        source={require('@/assets/logo.png')}
        style={{ width: logoSize, height: logoSize, borderRadius: logoSize * 0.22 }}
        resizeMode="contain"
      />
      <Text className={`font-semibold text-foreground ${titleClass}`}>Mieter +</Text>
    </View>
  );
}
