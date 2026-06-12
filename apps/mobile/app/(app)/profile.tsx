import { useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const WEB_URL =
  (Constants.expoConfig?.extra?.webApiUrl as string | undefined) ??
  'https://mieterplus.abdullahu.de';

export default function ProfileScreen() {
  const { profile, session, tenancy, home, signOut } = useAuth();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateCode = async () => {
    if (!tenancy) return;
    setGenerating(true);
    setError(null);
    setGeneratedCode(null);
    try {
      const { data, error: rpcErr } = await supabase.rpc('generate_invitation_code', {
        p_unit_id: tenancy.unit_id,
      });
      if (rpcErr) {
        setError(rpcErr.message ?? 'Code-Generierung fehlgeschlagen');
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = data;
      setGeneratedCode(result?.code ?? null);
      setExpiresAt(result?.expires_at ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    if (!generatedCode) return;
    await Clipboard.setStringAsync(generatedCode);
    Alert.alert('Kopiert', 'Code in Zwischenablage kopiert.');
  };

  const shareCode = async () => {
    if (!generatedCode) return;
    await Share.share({
      message: `Du wurdest zu Mieter + eingeladen!\n\nDein Einladungscode für unsere Wohnung (${
        home?.street ?? ''
      } ${home?.house_number ?? ''}, ${home?.city ?? ''}):\n\n${generatedCode}\n\nLade die App "Mieter +" aus dem Play Store und gib den Code bei der Registrierung ein.`,
    });
  };

  const openInviteModal = () => {
    setInviteOpen(true);
    setGeneratedCode(null);
    setError(null);
  };

  const roleLabel =
    profile?.role === 'tenant'
      ? 'Mieter'
      : profile?.role === 'landlord'
        ? 'Vermieter'
        : 'Administrator';

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView contentContainerClassName="p-4 gap-4">
        <Card>
          <CardHeader className="gap-1">
            <CardDescription>Eingeloggt als</CardDescription>
            <CardTitle>{profile?.full_name ?? '—'}</CardTitle>
            <Text className="text-sm text-muted-foreground">{session?.user?.email ?? ''}</Text>
            <View className="mt-2">
              <Badge variant={profile?.role === 'admin' ? 'destructive' : 'info'}>
                {roleLabel}
              </Badge>
            </View>
          </CardHeader>
        </Card>

        {profile?.role === 'tenant' && home && (
          <Card>
            <CardHeader className="gap-1">
              <CardDescription>Deine Wohnung</CardDescription>
              <CardTitle>
                {home.street} {home.house_number}
              </CardTitle>
              <Text className="text-sm text-muted-foreground">
                {home.postal_code} {home.city} · {home.unit_label}
              </Text>
              {home.landlord_name && (
                <Text className="mt-1 text-xs text-muted-foreground">
                  Vermieter: {home.landlord_name}
                </Text>
              )}
            </CardHeader>
          </Card>
        )}

        {profile?.role === 'tenant' && tenancy && (
          <Pressable onPress={openInviteModal}>
            <Card>
              <CardContent className="flex-row items-center gap-3 p-4">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <Ionicons name="person-add-outline" size={20} color="#2563eb" />
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-foreground">Mitbewohner einladen</Text>
                  <Text className="text-xs text-muted-foreground">
                    Partner, WG-Mitbewohner oder Familie hinzufügen
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
              </CardContent>
            </Card>
          </Pressable>
        )}

        {profile?.role === 'landlord' && (
          <Pressable onPress={() => Linking.openURL(`${WEB_URL}/dashboard/upgrade`)}>
            <Card>
              <CardContent className="flex-row items-center gap-3 p-4 bg-gradient-to-r from-amber-50 to-amber-100/50">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-amber-200/50">
                  <Ionicons name="star" size={20} color="#d97706" />
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-amber-900">
                    {profile.subscription_plan === 'pro' || profile.subscription_plan === 'premium' ? 'Tarif verwalten' : 'Auf Premium upgraden'}
                  </Text>
                  <Text className="text-xs text-amber-700/80">
                    Aktueller Tarif: <Text className="font-semibold uppercase">{profile.subscription_plan || 'free'}</Text>
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#b45309" />
              </CardContent>
            </Card>
          </Pressable>
        )}

        <Card>
          <CardContent className="p-2">
            <Button variant="ghost" fullWidth onPress={signOut}>
              <View className="flex-row items-center gap-2">
                <Ionicons name="log-out-outline" size={18} color="#ef4444" />
                <Text className="text-sm font-medium text-destructive">Abmelden</Text>
              </View>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-2">
            <Button
              variant="ghost"
              fullWidth
              onPress={() => Linking.openURL(`${WEB_URL}/konto-loeschen`)}
            >
              <View className="flex-row items-center gap-2">
                <Ionicons name="trash-outline" size={18} color="#64748b" />
                <Text className="text-sm font-medium text-muted-foreground">
                  Konto & Daten löschen
                </Text>
              </View>
            </Button>
          </CardContent>
        </Card>

        <Text className="mt-2 text-center text-xs text-muted-foreground">
          Mieter + · Eine App von ADB · v1.0.1
        </Text>
      </ScrollView>

      <Modal
        visible={inviteOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setInviteOpen(false)}
      >
        <View className="flex-1 bg-slate-50">
          <View className="flex-row items-center justify-between border-b border-border bg-white px-4 py-4">
            <Text className="text-xl font-bold text-foreground">Mitbewohner einladen</Text>
            <Pressable onPress={() => setInviteOpen(false)} className="rounded-full p-2">
              <Ionicons name="close" size={24} color="#64748b" />
            </Pressable>
          </View>

          <ScrollView contentContainerClassName="p-4 gap-4">
            {home && (
              <Card>
                <CardHeader className="gap-1">
                  <CardDescription>Für deine Wohnung</CardDescription>
                  <CardTitle className="text-base">
                    {home.street} {home.house_number} · {home.unit_label}
                  </CardTitle>
                </CardHeader>
              </Card>
            )}

            {!generatedCode ? (
              <Card>
                <CardContent className="items-center gap-4 py-8">
                  <View className="h-20 w-20 items-center justify-center rounded-full bg-blue-100">
                    <Ionicons name="people-outline" size={36} color="#2563eb" />
                  </View>
                  <Text className="text-center text-base text-foreground">
                    Erstelle einen Einladungscode für eine Person, die mit dir in dieser
                    Wohnung wohnt. Sie kann sich damit in Mieter + registrieren und sieht
                    dann die gleichen Mängel.
                  </Text>

                  {error && (
                    <View className="w-full rounded-md bg-destructive/10 p-3">
                      <Text className="text-sm text-destructive">{error}</Text>
                    </View>
                  )}

                  <Button
                    fullWidth
                    size="lg"
                    loading={generating}
                    onPress={generateCode}
                  >
                    {generating ? 'Wird erstellt…' : 'Code jetzt erstellen'}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="items-center gap-4 py-8">
                  <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Dein Einladungscode
                  </Text>
                  <View className="rounded-lg border-2 border-primary bg-blue-50 px-6 py-4">
                    <Text className="font-mono text-3xl font-bold tracking-widest text-primary">
                      {generatedCode}
                    </Text>
                  </View>
                  {expiresAt && (
                    <Text className="text-xs text-muted-foreground">
                      Gültig bis {new Date(expiresAt).toLocaleDateString('de-DE')}
                    </Text>
                  )}

                  <View className="w-full gap-2">
                    <Button fullWidth size="lg" onPress={shareCode}>
                      <View className="flex-row items-center gap-2">
                        <Ionicons name="share-outline" size={18} color="white" />
                        <Text className="text-base font-semibold text-primary-foreground">
                          Teilen
                        </Text>
                      </View>
                    </Button>
                    <Button fullWidth variant="outline" onPress={copyToClipboard}>
                      <View className="flex-row items-center gap-2">
                        <Ionicons name="copy-outline" size={18} color="#0f172a" />
                        <Text className="text-sm font-medium text-foreground">
                          Code kopieren
                        </Text>
                      </View>
                    </Button>
                  </View>

                  <Text className="text-center text-xs text-muted-foreground">
                    Der Code kann nur einmal eingelöst werden und ist 30 Tage gültig.
                  </Text>
                </CardContent>
              </Card>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
