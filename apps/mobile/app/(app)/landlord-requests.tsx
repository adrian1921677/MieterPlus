import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";

interface Request {
  id: string;
  title: string;
  description: string;
  status: string;
  category: string;
  priority: string;
  created_at: string;
  tenancies: { profiles: { full_name: string } | null } | null;
}

const STATUS_FILTERS = [
  { key: "all", label: "Alle" },
  { key: "open", label: "Offen" },
  { key: "in_progress", label: "In Arbeit" },
  { key: "resolved", label: "Gelöst" },
];

export default function LandlordRequestsScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const fetchRequests = useCallback(async () => {
    try {
      let query = supabase
        .from("requests")
        .select("id, title, description, status, category, priority, created_at, tenancies(profiles:tenant_id(full_name))")
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRequests((data ?? []) as unknown as Request[]);
    } catch (err) {
      console.error("Fetch requests error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [fetchRequests])
  );

  const filtered = requests.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    (r.tenancies?.profiles?.full_name || "").toLowerCase().includes(search.toLowerCase())
  );

  function statusColor(status: string) {
    switch (status) {
      case "open":
        return "#F59E0B";
      case "in_progress":
        return "#3B82F6";
      case "resolved":
      case "closed":
        return "#22C55E";
      default:
        return "#64748B";
    }
  }

  function statusLabel(status: string) {
    switch (status) {
      case "open":
        return "Offen";
      case "in_progress":
        return "In Bearbeitung";
      case "resolved":
        return "Gelöst";
      case "closed":
        return "Geschlossen";
      default:
        return status;
    }
  }

  return (
    <View className="flex-1 bg-white">
      <View className="px-4 pt-4 pb-2 border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900 mb-4">Mängelanfragen</Text>
        
        <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-2 border border-gray-200 mb-4">
          <Ionicons name="search-outline" size={18} color="#64748B" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Anfragen oder Mieter durchsuchen..."
            placeholderTextColor="#94A3B8"
            className="flex-1 text-gray-900 ml-2 text-base"
          />
        </View>

        <ScrollableFilter
          filters={STATUS_FILTERS}
          active={filter}
          onChange={setFilter}
        />
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchRequests();
              }}
              tintColor="#2563EB"
            />
          }
          ListEmptyComponent={
            <View className="items-center py-12">
              <Ionicons
                name="document-text-outline"
                size={48}
                color="#cbd5e1"
              />
              <Text className="text-gray-500 mt-3">Keine Anfragen gefunden.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/(app)/request/[id]",
                  params: { id: item.id },
                })
              }
              className="bg-white rounded-xl p-4 mb-3 border border-gray-200 shadow-sm"
              activeOpacity={0.7}
            >
              <View className="flex-row items-start justify-between mb-2">
                <Text
                  className="text-gray-900 font-semibold text-base flex-1 mr-2"
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <View
                  className="px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: statusColor(item.status) + "20" }}
                >
                  <Text
                    className="text-xs font-medium"
                    style={{ color: statusColor(item.status) }}
                  >
                    {statusLabel(item.status)}
                  </Text>
                </View>
              </View>
              <Text className="text-gray-500 text-sm mb-3" numberOfLines={2}>
                {item.description}
              </Text>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Text className="text-gray-400 text-xs">
                    {new Date(item.created_at).toLocaleDateString("de-DE")}
                  </Text>
                </View>
                {item.tenancies?.profiles && (
                  <Text className="text-xs font-medium text-gray-600">
                    Von: {item.tenancies.profiles.full_name}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

function ScrollableFilter({
  filters,
  active,
  onChange,
}: {
  filters: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <View className="flex-row pb-2">
      {filters.map((f) => (
        <TouchableOpacity
          key={f.key}
          onPress={() => onChange(f.key)}
          className={`mr-2 px-4 py-2 rounded-full border ${
            active === f.key
              ? "bg-blue-50 border-blue-200"
              : "bg-white border-gray-200"
          }`}
        >
          <Text
            className={`text-sm font-medium ${
              active === f.key ? "text-blue-700" : "text-gray-600"
            }`}
          >
            {f.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
