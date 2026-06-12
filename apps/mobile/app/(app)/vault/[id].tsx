import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { VAULT_DOCUMENT_TYPE_LABELS_DE, VaultDocumentType } from '@mieterplus/shared';

interface DocumentDetails {
  id: string;
  property_id: string;
  type: VaultDocumentType;
  title: string;
  visible_to_tenant: boolean;
  created_at: string;
  mime_type: string;
  size_bytes: number;
  properties: {
    street: string;
    house_number: string;
    city: string;
  } | null;
}

interface AccessLog {
  id: string;
  viewer_id: string;
  action: string;
  created_at: string;
  profiles: {
    full_name: string;
    role: string;
  } | null;
}

export default function VaultDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [doc, setDoc] = useState<DocumentDetails | null>(null);
  const [logs, setLogs] = useState<AccessLog[]>([]);

  useEffect(() => {
    async function fetchDoc() {
      if (!id) return;
      try {
        const { data: docData, error: docError } = await supabase
          .from('vault_documents')
          .select('*, properties(street, house_number, city)')
          .eq('id', id)
          .single();
          
        if (docError) throw docError;
        setDoc(docData as any);
        
        const { data: logData, error: logError } = await supabase
          .from('document_access_log')
          .select('*, profiles(full_name, role)')
          .eq('document_id', id)
          .order('created_at', { ascending: false });
          
        if (!logError) {
          setLogs(logData as any);
        }
      } catch (err) {
        console.error(err);
        Alert.alert('Fehler', 'Dokument konnte nicht geladen werden.');
        router.back();
      } finally {
        setLoading(false);
      }
    }
    fetchDoc();
  }, [id]);

  const handleDelete = () => {
    Alert.alert(
      'Dokument löschen',
      'Möchtest du dieses Dokument wirklich endgültig löschen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { 
          text: 'Löschen', 
          style: 'destructive',
          onPress: async () => {
            if (!doc) return;
            setDeleting(true);
            try {
              // Delete from storage
              const filePath = `${doc.property_id}/${doc.id}`;
              await supabase.storage.from('vault').remove([filePath]);
              
              // Delete from DB
              const { error } = await supabase.from('vault_documents').delete().eq('id', doc.id);
              if (error) throw error;
              
              router.back();
            } catch (err: any) {
              Alert.alert('Fehler', err.message || 'Löschen fehlgeschlagen.');
              setDeleting(false);
            }
          }
        }
      ]
    );
  };

  const handleDownload = async () => {
    if (!doc) return;
    try {
      const filePath = `${doc.property_id}/${doc.id}`;
      const { data, error } = await supabase.storage.from('vault').createSignedUrl(filePath, 60 * 60);
      if (error) throw error;
      if (data?.signedUrl) {
        Linking.openURL(data.signedUrl);
      }
    } catch (err) {
      Alert.alert('Fehler', 'Dokument konnte nicht geöffnet werden.');
    }
  };

  if (loading || !doc) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const propStr = doc.properties ? `${doc.properties.street} ${doc.properties.house_number}, ${doc.properties.city}` : 'Unbekannt';
  const sizeMB = doc.size_bytes ? (doc.size_bytes / 1024 / 1024).toFixed(2) + ' MB' : 'Unbekannt';

  return (
    <View className="flex-1 bg-gray-50">
      <View className="px-4 py-4 bg-white border-b border-gray-100 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
            <Ionicons name="arrow-back" size={24} color="#64748b" />
          </TouchableOpacity>
          <View>
            <Text className="text-xl font-bold text-gray-900">Dokument</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleDelete} disabled={deleting} className="p-2">
          {deleting ? <ActivityIndicator size="small" color="#ef4444" /> : <Ionicons name="trash-outline" size={22} color="#ef4444" />}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        <View className="bg-white rounded-xl p-5 border border-gray-200 mb-6 shadow-sm">
          <View className="items-center mb-5">
            <View className="h-16 w-16 bg-blue-50 rounded-full items-center justify-center mb-3">
              <Ionicons name="document-text" size={32} color="#2563eb" />
            </View>
            <Text className="text-xl font-bold text-gray-900 text-center">{doc.title}</Text>
            <View className="mt-2 bg-gray-100 px-3 py-1 rounded-full">
              <Text className="text-xs font-medium text-gray-700">
                {VAULT_DOCUMENT_TYPE_LABELS_DE[doc.type]}
              </Text>
            </View>
          </View>

          <View className="space-y-3">
            <View className="flex-row items-center">
              <Ionicons name="business-outline" size={16} color="#64748b" className="mr-2" />
              <Text className="text-sm text-gray-700">{propStr}</Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="document-outline" size={16} color="#64748b" className="mr-2" />
              <Text className="text-sm text-gray-700">{sizeMB}</Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name={doc.visible_to_tenant ? "eye-outline" : "eye-off-outline"} size={16} color="#64748b" className="mr-2" />
              <Text className="text-sm text-gray-700">{doc.visible_to_tenant ? 'Sichtbar für Mieter' : 'Nicht für Mieter sichtbar'}</Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="calendar-outline" size={16} color="#64748b" className="mr-2" />
              <Text className="text-sm text-gray-700">Hochgeladen am {new Date(doc.created_at).toLocaleDateString('de-DE')}</Text>
            </View>
          </View>

          <TouchableOpacity 
            onPress={handleDownload}
            className="mt-6 bg-blue-50 py-3 rounded-lg flex-row justify-center items-center border border-blue-100"
          >
            <Ionicons name="download-outline" size={18} color="#2563eb" />
            <Text className="text-blue-700 font-semibold ml-2">Öffnen / Herunterladen</Text>
          </TouchableOpacity>
        </View>

        <Text className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3 ml-1">
          Lesebestätigungen ({logs.filter(l => l.action === 'read').length})
        </Text>
        
        {logs.length === 0 ? (
          <View className="bg-white rounded-xl p-5 border border-gray-200 items-center justify-center py-8">
            <Ionicons name="time-outline" size={32} color="#cbd5e1" />
            <Text className="text-sm text-gray-500 mt-2 text-center">Noch niemand hat dieses Dokument geöffnet.</Text>
          </View>
        ) : (
          <View className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
            {logs.map((log, i) => (
              <View key={log.id} className={`p-4 flex-row justify-between items-center ${i !== logs.length - 1 ? 'border-b border-gray-100' : ''}`}>
                <View className="flex-row items-center">
                  <View className={`h-8 w-8 rounded-full items-center justify-center mr-3 ${log.action === 'read' ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Ionicons name={log.action === 'read' ? 'checkmark-done' : 'eye-outline'} size={16} color={log.action === 'read' ? '#16a34a' : '#64748b'} />
                  </View>
                  <View>
                    <Text className="font-medium text-gray-900">{log.profiles?.full_name || 'Unbekannt'}</Text>
                    <Text className="text-xs text-gray-500">{log.action === 'read' ? 'Gelesen' : 'Zugegriffen'}</Text>
                  </View>
                </View>
                <Text className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
