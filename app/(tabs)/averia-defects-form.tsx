import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Divider, IconButton, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';

interface DefectEntry {
  id: string;
  description: string;
  photos: string[];
}

export default function AveriaDefectsFormScreen() {
  const params = useLocalSearchParams();
  const [defects, setDefects] = useState<DefectEntry[]>([
    { id: Date.now().toString(), description: '', photos: [] },
  ]);

  useEffect(() => {
    if (params.defects) {
      try {
        const parsed = JSON.parse(params.defects as string);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setDefects(parsed);
        }
      } catch (e) {
        console.error('Error al parsear defects:', e);
      }
    }
  }, []);

  const handleAddDefect = () => {
    setDefects([...defects, { id: Date.now().toString(), description: '', photos: [] }]);
  };

  const handleRemoveDefect = (id: string) => {
    if (defects.length === 1) {
      Alert.alert('Aviso', 'Debe haber al menos una avería');
      return;
    }
    Alert.alert('Eliminar avería', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => setDefects(defects.filter(d => d.id !== id)) },
    ]);
  };

  const handleDescriptionChange = (id: string, text: string) => {
    setDefects(defects.map(d => d.id === id ? { ...d, description: text } : d));
  };

  const handleTakePhoto = async (defectId: string) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Se necesitan permisos para usar la cámara');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.7 });
      if (!result.canceled && result.assets?.length > 0) {
        setDefects(defects.map(d => d.id === defectId ? { ...d, photos: [...d.photos, result.assets[0].uri] } : d));
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const handlePickPhotos = async (defectId: string) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Se necesitan permisos para acceder a la galería');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.7,
        allowsMultipleSelection: true,
        selectionLimit: 10,
      });
      if (!result.canceled && result.assets?.length > 0) {
        const newPhotos = result.assets.map(a => a.uri);
        setDefects(defects.map(d => d.id === defectId ? { ...d, photos: [...d.photos, ...newPhotos] } : d));
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudieron seleccionar las imágenes');
    }
  };

  const handleRemovePhoto = (defectId: string, photoIndex: number) => {
    Alert.alert('Eliminar foto', '¿Eliminar esta foto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => setDefects(defects.map(d => d.id === defectId ? { ...d, photos: d.photos.filter((_, i) => i !== photoIndex) } : d)),
      },
    ]);
  };

  const handleContinue = () => {
    const hasAnyDescription = defects.some(d => d.description.trim() !== '');
    if (!hasAnyDescription) {
      Alert.alert('Campo requerido', 'Describe al menos una avería antes de continuar');
      return;
    }

    // Filtrar defectos vacíos
    const validDefects = defects.filter(d => d.description.trim() !== '' || d.photos.length > 0);

    router.push({
      pathname: '/(tabs)/averia-solucion-form' as any,
      params: {
        ...params,
        defects: JSON.stringify(validDefects),
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <LinearGradient
            colors={['#7c3aed', '#a78bfa', '#c4b5fd'] as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerGradient}
          >
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Averías Detectadas</Text>
            <Text style={styles.headerSubtitle}>Registra las averías encontradas</Text>
          </LinearGradient>

          {defects.map((defect, index) => (
            <Card key={defect.id} style={styles.defectCard}>
              <Card.Content>
                <View style={styles.defectHeader}>
                  <Text style={styles.defectTitle}>🔧 Avería {index + 1}</Text>
                  {defects.length > 1 && (
                    <IconButton icon="delete" size={20} onPress={() => handleRemoveDefect(defect.id)} iconColor={BRAND_COLORS.error} />
                  )}
                </View>
                <Divider style={styles.divider} />

                <TextInput
                  label="Descripción de la avería *"
                  value={defect.description}
                  onChangeText={(text) => handleDescriptionChange(defect.id, text)}
                  style={styles.input}
                  mode="outlined"
                  multiline
                  numberOfLines={4}
                  outlineColor={BRAND_COLORS.grayMedium}
                  activeOutlineColor="#7c3aed"
                  placeholder="Describe la avería detectada"
                />

                <View style={styles.photoActions}>
                  <Button mode="contained" icon="camera" onPress={() => handleTakePhoto(defect.id)} style={styles.photoBtn} buttonColor="#7c3aed" compact>
                    Foto
                  </Button>
                  <Button mode="outlined" icon="image-multiple" onPress={() => handlePickPhotos(defect.id)} style={styles.photoBtn} textColor="#7c3aed" compact>
                    Galería
                  </Button>
                </View>

                {defect.photos.length > 0 && (
                  <View style={styles.photosGrid}>
                    {defect.photos.map((uri, pIdx) => (
                      <View key={pIdx} style={styles.photoContainer}>
                        <Image source={{ uri }} style={styles.photo} />
                        <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => handleRemovePhoto(defect.id, pIdx)}>
                          <Text style={styles.deletePhotoText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </Card.Content>
            </Card>
          ))}

          <Button
            mode="outlined"
            icon="plus-circle"
            onPress={handleAddDefect}
            style={styles.addDefectBtn}
            textColor="#7c3aed"
          >
            Añadir otra avería
          </Button>
        </ScrollView>

        <SafeAreaView style={styles.buttonSafeArea} edges={['bottom']}>
          <View style={styles.buttonContainer}>
            <Button mode="outlined" style={styles.navBtn} onPress={() => router.back()} icon="arrow-left" textColor="#7c3aed">Volver</Button>
            <Button mode="contained" style={styles.navBtn} onPress={handleContinue} icon="arrow-right" contentStyle={{ flexDirection: 'row-reverse' }} buttonColor="#7c3aed">Continuar</Button>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#7c3aed' },
  keyboardView: { flex: 1, backgroundColor: BRAND_COLORS.surface },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  headerGradient: { padding: SPACING.lg, alignItems: 'center' },
  backBtn: { position: 'absolute', left: 12, top: 12, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: TYPOGRAPHY.sizes.xl, fontWeight: TYPOGRAPHY.weights.bold as any, color: 'white' },
  headerSubtitle: { fontSize: TYPOGRAPHY.sizes.sm, color: 'rgba(255,255,255,0.8)', marginTop: SPACING.xs },
  defectCard: { margin: SPACING.md, marginBottom: SPACING.sm, borderRadius: BORDER_RADIUS.lg, borderLeftWidth: 3, borderLeftColor: '#7c3aed', ...SHADOWS.small },
  defectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  defectTitle: { fontSize: TYPOGRAPHY.sizes.md, fontWeight: TYPOGRAPHY.weights.bold as any, color: '#7c3aed' },
  divider: { backgroundColor: '#c4b5fd', height: 1, marginBottom: SPACING.md, marginTop: SPACING.xs },
  input: { marginBottom: SPACING.sm, backgroundColor: 'white' },
  photoActions: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  photoBtn: { flex: 1, borderRadius: BORDER_RADIUS.md },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  photoContainer: { width: '30%', aspectRatio: 1, position: 'relative' },
  photo: { width: '100%', height: '100%', borderRadius: BORDER_RADIUS.md, borderWidth: 2, borderColor: '#c4b5fd' },
  deletePhotoBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(220,38,38,0.9)', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  deletePhotoText: { color: 'white', fontSize: 14, fontWeight: TYPOGRAPHY.weights.bold as any },
  addDefectBtn: { marginHorizontal: SPACING.md, marginTop: SPACING.sm, marginBottom: SPACING.md, borderRadius: BORDER_RADIUS.md, borderColor: '#7c3aed' },
  buttonSafeArea: { backgroundColor: 'white' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', padding: SPACING.md, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: BRAND_COLORS.grayMedium, ...SHADOWS.medium },
  navBtn: { flex: 1, marginHorizontal: SPACING.xs, borderRadius: BORDER_RADIUS.md },
});
