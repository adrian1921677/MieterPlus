import { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Switch } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { getPropertyAccess, propertyIdsWithPermission } from '@/lib/access';
import * as DocumentPicker from 'expo-document-picker';
import { decode } from 'base64-arraybuffer';
import { VAULT_DOCUMENT_TYPE_LABELS_DE, VaultDocumentType } from '@mieterplus/shared';

interface PropertyOption {
  id: string;
  label: string;
}

export default function VaultNewScreen() {
  const router = useRouter();
  const { session } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  
  const [title, setTitle] = useState('');
  const [selectedProperty, setSelectedProperty] = useState('');
  const [type, setType] = useState<VaultDocumentType>('other');
  const [visible, setVisible] = useState(true);
  
  const [file, setFile] = useState<{ name: string; uri: string; mimeType: string; size: number } | null>(null);

  const fetchProperties = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const access = await getPropertyAccess(supabase, session.user.id);
      const uploadableIds = propertyIdsWithPermission(access, 'vault');
      
      if (uploadableIds.length === 0) {
        setLoading(false);
        return;
      }
      
      const { data } = await supabase
        .from('properties')
        .select('id, street, house_number, city')
        .in('id', uploadableIds);
        
      const options = (data || []).map(p => ({
        id: p.id,
        label: `${p.street} ${p.house_number}, ${p.city}`
      }));
      
      setProperties(options);
      if (options[0]) {
        setSelectedProperty(options[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchProperties();
    }, [fetchProperties])
  );

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: false,
      });

      if (result.canceled) return;

      const doc = result.assets[0];
      if (!doc) return;
      if (doc.size && doc.size > 10 * 1024 * 1024) {
        Alert.alert('Fehler', 'Die Datei ist zu groß (Maximal 10 MB).');
        return;
      }

      setFile({
        name: doc.name,
        uri: doc.uri,
        mimeType: doc.mimeType || 'application/octet-stream',
        size: doc.size || 0,
      });

      if (!title) {
        setTitle(doc.name.split('.')[0] ?? doc.name);
      }
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Fehler', 'Datei konnte nicht ausgewählt werden.');
    }
  };

  const uploadFile = async () => {
    if (!title.trim()) return Alert.alert('Fehler', 'Bitte gib einen Titel ein.');
    if (!selectedProperty) return Alert.alert('Fehler', 'Bitte wähle eine Immobilie.');
    if (!file) return Alert.alert('Fehler', 'Bitte wähle ein Dokument aus.');
    if (!session?.user?.id) return;

    setSubmitting(true);
    try {
      // Create DB entry
      const { data: docRow, error: dbError } = await supabase
        .from('vault_documents')
        .insert({
          property_id: selectedProperty,
          type: type,
          title: title.trim(),
          mime_type: file.mimeType,
          size_bytes: file.size,
          visible_to_tenant: visible,
        })
        .select('id')
        .single();

      if (dbError) throw dbError;

      // Upload to Storage
      const response = await fetch(file.uri);
      const blob = await response.blob();
      
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        const base64Content = base64data.split(',')[1] ?? '';

        const filePath = `${selectedProperty}/${docRow.id}`;
        const { error: storageError } = await supabase.storage
          .from('vault')
          .upload(filePath, decode(base64Content), {
            contentType: file.mimeType,
          });

        if (storageError) {
          // Rollback db entry if storage fails
          await supabase.from('vault_documents').delete().eq('id', docRow.id);
          throw storageError;
        }

        Alert.alert('Erfolg', 'Das Dokument wurde erfolgreich hochgeladen.');
        router.back();
      };
    } catch (err: any) {
      console.error('Upload error:', err);
      Alert.alert('Fehler', err.message || 'Das Dokument konnte nicht hochgeladen werden.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="px-4 py-4 bg-white border-b border-gray-100 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
            <Ionicons name="arrow-back" size={24} color="#64748b" />
          </TouchableOpacity>
          <View>
            <Text className="text-xl font-bold text-gray-900">Neues Dokument</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {/* Document Picker */}
        <TouchableOpacity 
          onPress={pickDocument}
          className={`h-40 rounded-xl border-2 border-dashed items-center justify-center mb-6 bg-white ${file ? 'border-blue-400' : 'border-gray-300'}`}
        >
          {file ? (
            <View className="items-center px-4">
              <Ionicons name="document-text" size={40} color="#2563eb" />
              <Text className="text-sm font-medium text-gray-900 mt-2 text-center" numberOfLines={1}>{file.name}</Text>
              <Text className="text-xs text-gray-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</Text>
            </View>
          ) : (
            <View className="items-center">
              <Ionicons name="cloud-upload-outline" size={40} color="#94a3b8" />
              <Text className="text-sm text-gray-500 mt-2">Tippen, um eine Datei auszuwählen (PDF, Bild)</Text>
            </View>
          )}
        </TouchableOpacity>

        <View className="bg-white p-4 rounded-xl border border-gray-200 space-y-4">
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Titel</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="z.B. Hausordnung 2026"
              className="border border-gray-200 rounded-lg px-3 py-2 text-base text-gray-900"
            />
          </View>

          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Dokumenten-Typ</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
              {(Object.keys(VAULT_DOCUMENT_TYPE_LABELS_DE) as VaultDocumentType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setType(t)}
                  className={`mr-2 px-3 py-1.5 rounded-full border ${type === t ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}
                >
                  <Text className={`text-sm ${type === t ? 'text-blue-700 font-medium' : 'text-gray-600'}`}>
                    {VAULT_DOCUMENT_TYPE_LABELS_DE[t]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Zugehörige Immobilie</Text>
            <View className="border border-gray-200 rounded-lg overflow-hidden">
              {properties.map((p, idx) => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setSelectedProperty(p.id)}
                  className={`px-3 py-3 flex-row items-center justify-between ${idx !== properties.length - 1 ? 'border-b border-gray-100' : ''}`}
                >
                  <Text className={`text-base ${selectedProperty === p.id ? 'text-blue-600 font-medium' : 'text-gray-700'}`}>
                    {p.label}
                  </Text>
                  {selectedProperty === p.id && <Ionicons name="checkmark" size={20} color="#2563eb" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="flex-row items-center justify-between pt-2">
            <View className="flex-1 mr-4">
              <Text className="text-sm font-medium text-gray-900">Für Mieter sichtbar</Text>
              <Text className="text-xs text-gray-500">
                Mieter dieser Immobilie können das Dokument in ihrem Tresor sehen.
              </Text>
            </View>
            <Switch value={visible} onValueChange={setVisible} />
          </View>
        </View>

        <TouchableOpacity
          onPress={uploadFile}
          disabled={submitting}
          className={`mt-6 py-3 rounded-lg flex-row items-center justify-center ${submitting ? 'bg-blue-400' : 'bg-blue-600'}`}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color="white" />
              <Text className="text-white font-semibold text-base ml-2">Dokument speichern</Text>
            </>
          )}
        </TouchableOpacity>
        
        <View className="h-8" />
      </ScrollView>
    </View>
  );
}
