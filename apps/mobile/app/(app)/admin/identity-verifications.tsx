import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";

export default function IdentityVerificationsScreen() {
  const router = useRouter();
  const [identities, setIdentities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchIdentities = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("identity_documents")
        .select("id, status, created_at, profiles!inner(id, full_name, email)")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setIdentities(data || []);
    } catch (err) {
      console.error("Fetch pending identities error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchIdentities();
    }, [fetchIdentities])
  );

  return (
    <View className="flex-1 bg-white">
      <View className="px-4 pt-16 pb-4 border-b border-gray-100 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">
          Identitäts-Prüfungen
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <FlatList
          data={identities}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchIdentities();
              }}
              tintColor="#2563EB"
            />
          }
          ListEmptyComponent={
            <View className="items-center py-12">
              <Ionicons name="checkmark-circle-outline" size={48} color="#cbd5e1" />
              <Text className="text-gray-500 mt-3">Keine ausstehenden Prüfungen.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/(app)/admin/identity-review/[id]",
                  params: { id: item.id },
                })
              }
              className="bg-white rounded-xl p-4 mb-3 border border-gray-200 shadow-sm"
              activeOpacity={0.7}
            >
              <View className="flex-row items-start justify-between mb-2">
                <Text className="text-gray-900 font-semibold text-base flex-1 mr-2">
                  {item.profiles?.full_name || "Unbekannt"}
                </Text>
                <View className="bg-amber-100 px-2.5 py-1 rounded-full">
                  <Text className="text-amber-800 text-xs font-medium">Ausstehend</Text>
                </View>
              </View>
              <Text className="text-gray-500 text-sm mb-1">
                E-Mail: {item.profiles?.email}
              </Text>
              <Text className="text-gray-400 text-xs mt-2">
                Eingereicht am {new Date(item.created_at).toLocaleDateString("de-DE")}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
