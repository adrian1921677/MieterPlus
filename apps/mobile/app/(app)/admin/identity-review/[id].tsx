import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";

export default function IdentityReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [identity, setIdentity] = useState<any>(null);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: identRes, error } = await supabase
          .from("identity_documents")
          .select("id, document_path, user_id, profiles!inner(id, full_name, email, role)")
          .eq("id", id)
          .single();

        if (error) throw error;
        setIdentity(identRes);

        if (identRes.document_path) {
          const { data } = await supabase.storage
            .from("identity-docs")
            .createSignedUrl(identRes.document_path, 300);
          setDocUrl(data?.signedUrl || null);
        }
      } catch (err) {
        console.error("Fetch identity error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  async function handleReview(approved: boolean) {
    setReviewing(true);
    try {
      const newStatus = approved ? "approved" : "rejected";
      
      const { error: updateDocError } = await supabase
        .from("identity_documents")
        .update({ status: newStatus })
        .eq("id", id);

      if (updateDocError) throw updateDocError;

      Alert.alert(
        "Erfolg",
        `Die Identität wurde ${approved ? "bestätigt" : "abgelehnt"}.`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (err: any) {
      Alert.alert("Fehler", err.message);
    } finally {
      setReviewing(false);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!identity) {
    return (
      <View className="flex-1 justify-center items-center bg-white px-6">
        <Text className="text-gray-500">Prüfung nicht gefunden.</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="px-4 pt-16 pb-4 border-b border-gray-100 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">
          Identitäts-Prüfung
        </Text>
      </View>

      <View className="p-4 space-y-6">
        <View className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <Text className="text-sm font-medium text-gray-800">Nutzer:</Text>
          <Text className="text-lg font-semibold text-gray-900 mb-1">{identity.profiles?.full_name}</Text>
          <Text className="text-gray-500 text-sm mb-2">{identity.profiles?.email}</Text>
          <View className="h-px bg-gray-200 my-2" />
          <Text className="text-sm text-gray-600">Rolle: {identity.profiles?.role}</Text>
        </View>

        <View>
          <Text className="text-base font-semibold text-gray-900 mb-3">Ausweisdokument</Text>
          {docUrl ? (
            <Image
              source={{ uri: docUrl }}
              className="w-full h-64 rounded-xl bg-gray-100"
              resizeMode="contain"
            />
          ) : (
            <View className="bg-gray-50 rounded-xl p-8 items-center border border-gray-200">
              <Ionicons name="document-outline" size={48} color="#94A3B8" />
              <Text className="text-gray-500 mt-2 text-center">
                Kein Dokument hochgeladen.
              </Text>
            </View>
          )}
        </View>

        <View className="flex-row gap-3 pt-4">
          <TouchableOpacity
            onPress={() => handleReview(true)}
            disabled={reviewing}
            className={`flex-1 rounded-xl py-4 items-center ${
              reviewing ? "bg-green-300" : "bg-green-500"
            }`}
          >
            {reviewing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold">Bestätigen</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleReview(false)}
            disabled={reviewing}
            className={`flex-1 rounded-xl py-4 items-center ${
              reviewing ? "bg-red-300" : "bg-red-50"
            } border border-red-200`}
          >
            {reviewing ? (
              <ActivityIndicator color="#EF4444" />
            ) : (
              <Text className="text-red-600 font-semibold">Ablehnen</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
