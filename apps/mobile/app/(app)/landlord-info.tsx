import { Linking, ScrollView, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-context';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const WEB_URL =
  (Constants.expoConfig?.extra?.webApiUrl as string | undefined) ??
  'https://mieterplus.abdullahu.de';

export default function LandlordInfoScreen() {
  const { profile } = useAuth();
  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView contentContainerClassName="p-4 gap-4">
        <Card>
          <CardHeader className="gap-2">
            <CardTitle>Hallo {profile?.full_name ?? ''}!</CardTitle>
            <CardDescription>
              Diese App ist für deine Mieter gedacht. Verwalte deine Immobilien und
              Mängel-Anfragen bequem im Web-Dashboard am Computer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button fullWidth size="lg" onPress={() => Linking.openURL(WEB_URL)}>
              <View className="flex-row items-center gap-2">
                <Ionicons name="open-outline" size={18} color="white" />
                <Text className="text-base font-semibold text-primary-foreground">
                  Web-Dashboard öffnen
                </Text>
              </View>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-2">
            <CardTitle className="text-base">Was du im Web machst</CardTitle>
          </CardHeader>
          <CardContent>
            <View className="gap-3">
              <Row icon="business-outline" text="Immobilien hinzufügen & verwalten" />
              <Row icon="document-text-outline" text="Eigentumsnachweise hochladen" />
              <Row icon="key-outline" text="Einladungscodes für Mieter generieren" />
              <Row icon="build-outline" text="Mängel-Anfragen einsehen & beantworten" />
              <Row icon="chatbubbles-outline" text="Mit Mietern kommunizieren" />
            </View>
          </CardContent>
        </Card>
      </ScrollView>
    </View>
  );
}

function Row({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View className="flex-row items-center gap-3">
      <Ionicons name={icon} size={18} color="#64748b" />
      <Text className="text-sm text-foreground">{text}</Text>
    </View>
  );
}
