import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

export default function VerifyIdentityScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [docUri, setDocUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function pickDocument() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setDocUri(result.assets[0].uri);
    }
  }

  async function handleSubmit() {
    if (!docUri) {
      Alert.alert("Fehler", "Bitte lade ein Dokument hoch.");
      return;
    }

    setLoading(true);
    try {
      const filename = `${session?.user.id}/${Date.now()}-identity.jpg`;
      const formData = new FormData();
      formData.append("file", {
        uri: docUri,
        name: filename,
        type: "image/jpeg",
      } as any);

      const { error: uploadError } = await supabase.storage
        .from("identity-docs")
        .upload(filename, formData);

      if (uploadError) throw uploadError;

      const { error } = await supabase.from("identity_documents").insert({
        user_id: session?.user.id,
        document_path: filename,
        status: "pending",
      });

      if (error) {
        console.warn("Could not insert into identity_documents", error);
      }

      Alert.alert("Erfolg", "Dokument wurde hochgeladen. Warte auf Verifikation.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert("Fehler", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View className="px-4 pt-16 pb-4 flex-row items-center border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">
          Identität verifizieren
        </Text>
      </View>

      <View className="px-4 pt-6 space-y-6">
        <View className="bg-blue-50 p-4 rounded-xl border border-blue-100">
          <Text className="text-blue-800 font-medium mb-1">Warum verifizieren?</Text>
          <Text className="text-blue-700 text-sm">
            Um die Sicherheit auf der Plattform zu gewährleisten, müssen sich Vermieter vor der vollständigen Freigabe verifizieren. Bitte lade ein Foto deines Personalausweises (Vorderseite) hoch.
          </Text>
        </View>

        <View>
          <Text className="text-gray-700 text-sm font-medium mb-2">
            Dokument (Ausweis)
          </Text>
          {docUri ? (
            <View className="relative">
              <Image source={{ uri: docUri }} className="w-full h-48 rounded-xl object-cover" />
              <TouchableOpacity
                onPress={() => setDocUri(null)}
                className="absolute top-2 right-2 bg-red-500 w-8 h-8 rounded-full items-center justify-center"
              >
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={pickDocument}
              className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl px-4 py-8 items-center justify-center"
            >
              <Ionicons name="id-card-outline" size={40} color="#94A3B8" />
              <Text className="text-gray-500 mt-2 font-medium">Foto auswählen</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading || !docUri}
          className={`rounded-xl py-4 items-center mt-4 ${
            loading || !docUri ? "bg-gray-300" : "bg-blue-600"
          }`}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold text-base">
              Dokument einreichen
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
