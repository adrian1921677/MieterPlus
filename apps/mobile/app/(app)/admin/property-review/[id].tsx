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

export default function PropertyReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [property, setProperty] = useState<any>(null);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: propRes, error } = await supabase
          .from("properties")
          .select("id, name, address, city, zip_code, ownership_doc_path, created_at, landlord:profiles!properties_landlord_id_fkey(full_name, email)")
          .eq("id", id)
          .single();

        if (error) throw error;
        setProperty(propRes);

        if (propRes.ownership_doc_path) {
          const { data } = await supabase.storage
            .from("ownership-docs")
            .createSignedUrl(propRes.ownership_doc_path, 300);
          setDocUrl(data?.signedUrl || null);
        }
      } catch (err) {
        console.error("Fetch property error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  async function handleReview(approved: boolean) {
    setReviewing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/review-property`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            property_id: id,
            approved,
          }),
        }
      );

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Unbekannter Fehler");
      }

      Alert.alert(
        "Erfolg",
        `Das Objekt wurde ${approved ? "freigegeben" : "abgelehnt"}.`,
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

  if (!property) {
    return (
      <View className="flex-1 justify-center items-center bg-white px-6">
        <Text className="text-gray-500">Objekt nicht gefunden.</Text>
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
          Objekt-Prüfung
        </Text>
      </View>

      <View className="p-4 space-y-6">
        <View className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <Text className="text-lg font-semibold text-gray-900 mb-1">{property.name}</Text>
          <Text className="text-gray-600 mb-2">
            {property.address}, {property.zip_code} {property.city}
          </Text>
          <View className="h-px bg-gray-200 my-2" />
          <Text className="text-sm font-medium text-gray-800">Vermieter:</Text>
          <Text className="text-gray-600">{property.landlord?.full_name}</Text>
          <Text className="text-gray-500 text-sm">{property.landlord?.email}</Text>
        </View>

        <View>
          <Text className="text-base font-semibold text-gray-900 mb-3">Eigentumsnachweis</Text>
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
              <Text className="text-white font-semibold">Freigeben</Text>
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
