import { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { getPropertyAccess, propertyIdsWithPermission } from '@/lib/access';
import { PLAN_LIMITS, VAULT_DOCUMENT_TYPE_LABELS_DE, VaultDocumentType } from '@mieterplus/shared';

interface DocumentAccess {
  viewerName: string;
  action: string;
  at: string;
}

interface DocumentItem {
  id: string;
  propertyId: string;
  type: VaultDocumentType;
  title: string;
  visibleToTenant: boolean;
  createdAt: string;
  accesses: DocumentAccess[];
}

export default function VaultScreen() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [properties, setProperties] = useState<Record<string, string>>({});
  
  const [quotaInfo, setQuotaInfo] = useState({ used: 0, total: 0, show: false, plan: 'free' });
  const [canUpload, setCanUpload] = useState(false);

  const fetchData = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const access = await getPropertyAccess(supabase, session.user.id);
      const uploadableIds = propertyIdsWithPermission(access, 'vault');
      setCanUpload(uploadableIds.length > 0);

      // Fetch properties
      const propIds = access.allIds.length > 0 ? access.allIds : ['00000000-0000-0000-0000-000000000000'];
      const { data: propsData } = await supabase
        .from('properties')
        .select('id, street, house_number, postal_code, city')
        .in('id', propIds);
        
      const propsMap: Record<string, string> = {};
      (propsData || []).forEach(p => {
        propsMap[p.id] = `${p.street} ${p.house_number}, ${p.postal_code} ${p.city}`;
      });
      setProperties(propsMap);

      // Fetch documents
      const { data: docs } = await supabase
        .from('vault_documents')
        .select('id, property_id, type, title, visible_to_tenant, created_at, document_access_log(viewer_id, action, created_at, profiles:viewer_id(full_name))')
        .in('property_id', propIds)
        .order('created_at', { ascending: false });

      const ownedSet = new Set(access.ownedIds);
      const usedCount = (docs || []).filter(d => ownedSet.has(d.property_id)).length;
      const plan = profile?.subscription_plan || 'free';
      const quota = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS]?.vaultDocs || 10;
      
      setQuotaInfo({
        used: usedCount,
        total: quota,
        show: access.ownedIds.length > 0,
        plan: plan
      });

      const formattedDocs: DocumentItem[] = (docs || []).map(d => {
        const accesses = (d.document_access_log || []).map((a: any) => ({
          viewerName: a.profiles?.full_name || 'Mieter',
          action: a.action,
          at: a.created_at
        }));
        return {
          id: d.id,
          propertyId: d.property_id,
          type: d.type as VaultDocumentType,
          title: d.title,
          visibleToTenant: d.visible_to_tenant,
          createdAt: d.created_at,
          accesses
        };
      });
      setDocuments(formattedDocs);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.user?.id, profile?.subscription_plan]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const renderQuota = () => {
    if (!quotaInfo.show) return null;
    const progress = Math.min(100, (quotaInfo.used / quotaInfo.total) * 100);
    return (
      <View className="bg-white rounded-xl p-4 mb-4 border border-gray-200">
        <View className="flex-row justify-between mb-2">
          <Text className="font-medium text-gray-900">
            {quotaInfo.used} / {quotaInfo.total} Dokumenten belegt
          </Text>
          <Text className="text-xs text-gray-500 capitalize">{quotaInfo.plan}-Kontingent</Text>
        </View>
        <View className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
          <View className="h-full bg-blue-600 rounded-full" style={{ width: `${progress}%` }} />
        </View>
      </View>
    );
  };

  const renderItem = ({ item }: { item: DocumentItem }) => {
    const reads = item.accesses.filter(a => a.action === 'read');
    return (
      <TouchableOpacity 
        onPress={() => router.push(`/(app)/vault/${item.id}`)}
        className="bg-white rounded-xl p-4 mb-3 border border-gray-200"
      >
        <View className="flex-row items-start justify-between mb-1">
          <Text className="text-base font-semibold text-gray-900 flex-1 mr-2">{item.title}</Text>
          <View className="bg-blue-50 px-2 py-1 rounded-full">
            <Text className="text-blue-700 text-xs font-medium">
              {VAULT_DOCUMENT_TYPE_LABELS_DE[item.type]}
            </Text>
          </View>
        </View>
        <Text className="text-gray-500 text-xs mb-3">{properties[item.propertyId]}</Text>
        
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Ionicons 
              name={item.visibleToTenant ? "eye-outline" : "eye-off-outline"} 
              size={14} 
              color={item.visibleToTenant ? "#16a34a" : "#94a3b8"} 
            />
            <Text className="text-gray-500 text-xs ml-1">
              {item.visibleToTenant ? "Für Mieter sichtbar" : "Versteckt"}
            </Text>
          </View>
          {reads.length > 0 && (
            <View className="flex-row items-center bg-gray-50 px-2 py-1 rounded-full">
              <Ionicons name="checkmark-done" size={14} color="#16a34a" />
              <Text className="text-xs text-gray-600 ml-1">{reads.length}x gelesen</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="px-4 py-4 bg-white border-b border-gray-100 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-gray-900">Dokumenten-Tresor</Text>
          <Text className="text-gray-500 text-sm">Dokumente sicher teilen</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="close" size={24} color="#64748b" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={d => d.id}
          contentContainerStyle={{ padding: 16 }}
          ListHeaderComponent={renderQuota}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />
          }
          ListEmptyComponent={
            <View className="items-center py-12">
              <Ionicons name="folder-open-outline" size={48} color="#cbd5e1" />
              <Text className="text-gray-500 mt-3 text-center">
                Noch keine Dokumente hochgeladen.
              </Text>
            </View>
          }
          renderItem={renderItem}
        />
      )}

      {canUpload && (
        <TouchableOpacity
          onPress={() => router.push('/(app)/vault/new')}
          className="absolute bottom-6 right-6 w-14 h-14 bg-blue-600 rounded-full items-center justify-center shadow-lg"
          style={{ elevation: 5 }}
        >
          <Ionicons name="add" size={30} color="white" />
        </TouchableOpacity>
      )}
    </View>
  );
}
