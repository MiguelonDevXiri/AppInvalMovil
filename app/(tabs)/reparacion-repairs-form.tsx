import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Card, Divider, IconButton, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';
import { type ReparacionRepair } from '../../utils/reparacionesInspectionStorage';

const ACCENT = '#b45309';
const GRADIENT = ['#92400e', '#d97706', '#fbbf24'] as const;

const buildEmptyRepair = (): ReparacionRepair => ({
  id: Date.now().toString(),
  description: '',
  photos: [],
});

export default function ReparacionRepairsFormScreen() {
  const params = useLocalSearchParams();
  const [repairs, setRepairs] = useState<ReparacionRepair[]>([buildEmptyRepair()]);

  useEffect(() => {
    if (typeof params.repairs !== 'string') {
      return;
    }

    try {
      const parsed = JSON.parse(params.repairs) as ReparacionRepair[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setRepairs(parsed);
      }
    } catch (error) {
      console.error('Error al recuperar reparaciones:', error);
    }
  }, [params.repairs]);

  const handleAddRepair = () => {
    setRepairs((current) => [...current, buildEmptyRepair()]);
  };

  const handleRemoveRepair = (id: string) => {
    if (repairs.length === 1) {
      Alert.alert('Aviso', 'Debe existir al menos una reparación.');
      return;
    }

    Alert.alert('Eliminar reparación', '¿Quieres eliminar esta reparación?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => setRepairs((current) => current.filter((repair) => repair.id !== id)),
      },
    ]);
  };

  const handleDescriptionChange = (id: string, description: string) => {
    setRepairs((current) =>
      current.map((repair) => (repair.id === id ? { ...repair, description } : repair))
    );
  };

  const handleTakePhoto = async (repairId: string) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Se necesitan permisos para usar la cámara.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.7 });
      if (!result.canceled && result.assets?.length > 0) {
        setRepairs((current) =>
          current.map((repair) =>
            repair.id === repairId
              ? { ...repair, photos: [...repair.photos, result.assets[0].uri] }
              : repair
          )
        );
      }
    } catch {
      Alert.alert('Error', 'No se pudo tomar la foto.');
    }
  };

  const handlePickPhotos = async (repairId: string) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Se necesitan permisos para acceder a la galería.');
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
        const nextPhotos = result.assets.map((asset) => asset.uri);
        setRepairs((current) =>
          current.map((repair) =>
            repair.id === repairId ? { ...repair, photos: [...repair.photos, ...nextPhotos] } : repair
          )
        );
      }
    } catch {
      Alert.alert('Error', 'No se pudieron seleccionar las imágenes.');
    }
  };

  const handleRemovePhoto = (repairId: string, photoIndex: number) => {
    Alert.alert('Eliminar foto', '¿Eliminar esta foto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () =>
          setRepairs((current) =>
            current.map((repair) =>
              repair.id === repairId
                ? { ...repair, photos: repair.photos.filter((_, index) => index !== photoIndex) }
                : repair
            )
          ),
      },
    ]);
  };

  const handleContinue = () => {
    const validRepairs = repairs.filter(
      (repair) => repair.description.trim() !== '' || repair.photos.length > 0
    );

    if (validRepairs.length === 0 || !validRepairs.some((repair) => repair.description.trim())) {
      Alert.alert('Campo requerido', 'Describe al menos una reparación antes de continuar.');
      return;
    }

    router.push({
      pathname: '/(tabs)/reparacion-final-form' as any,
      params: {
        ...params,
        repairs: JSON.stringify(validRepairs),
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <LinearGradient
            colors={GRADIENT as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerGradient}
          >
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Reparaciones realizadas</Text>
            <Text style={styles.headerSubtitle}>Añade una o varias actuaciones con sus fotos</Text>
          </LinearGradient>

          {repairs.map((repair, index) => (
            <Card key={repair.id} style={styles.repairCard}>
              <Card.Content>
                <View style={styles.repairHeader}>
                  <Text style={styles.repairTitle}>🛠️ Reparación {index + 1}</Text>
                  {repairs.length > 1 && (
                    <IconButton
                      icon="delete"
                      size={20}
                      onPress={() => handleRemoveRepair(repair.id)}
                      iconColor={BRAND_COLORS.error}
                    />
                  )}
                </View>
                <Divider style={styles.divider} />

                <TextInput
                  label="Descripción de la reparación *"
                  value={repair.description}
                  onChangeText={(value) => handleDescriptionChange(repair.id, value)}
                  style={styles.input}
                  mode="outlined"
                  multiline
                  numberOfLines={4}
                  outlineColor={BRAND_COLORS.grayMedium}
                  activeOutlineColor={ACCENT}
                  placeholder="Describe el trabajo realizado"
                />

                <View style={styles.photoActions}>
                  <Button
                    mode="contained"
                    icon="camera"
                    onPress={() => handleTakePhoto(repair.id)}
                    style={styles.photoBtn}
                    buttonColor={ACCENT}
                    compact
                  >
                    Foto
                  </Button>
                  <Button
                    mode="outlined"
                    icon="image-multiple"
                    onPress={() => handlePickPhotos(repair.id)}
                    style={styles.photoBtn}
                    textColor={ACCENT}
                    compact
                  >
                    Galería
                  </Button>
                </View>

                {repair.photos.length > 0 && (
                  <View style={styles.photosGrid}>
                    {repair.photos.map((uri, photoIndex) => (
                      <View key={`${repair.id}_${photoIndex}`} style={styles.photoContainer}>
                        <Image source={{ uri }} style={styles.photo} />
                        <TouchableOpacity
                          style={styles.deletePhotoBtn}
                          onPress={() => handleRemovePhoto(repair.id, photoIndex)}
                        >
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
            onPress={handleAddRepair}
            style={styles.addRepairBtn}
            textColor={ACCENT}
          >
            Añadir otra reparación
          </Button>
        </ScrollView>

        <SafeAreaView style={styles.buttonSafeArea} edges={['bottom']}>
          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              style={styles.navBtn}
              onPress={() => router.back()}
              icon="arrow-left"
              textColor={ACCENT}
            >
              Volver
            </Button>
            <Button
              mode="contained"
              style={styles.navBtn}
              onPress={handleContinue}
              icon="arrow-right"
              contentStyle={{ flexDirection: 'row-reverse' }}
              buttonColor={ACCENT}
            >
              Continuar
            </Button>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: ACCENT },
  keyboardView: { flex: 1, backgroundColor: BRAND_COLORS.surface },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  headerGradient: { padding: SPACING.lg, alignItems: 'center' },
  backBtn: {
    position: 'absolute',
    left: 12,
    top: 12,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: 'white',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: 'rgba(255,255,255,0.85)',
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  repairCard: {
    margin: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderLeftWidth: 3,
    borderLeftColor: ACCENT,
    ...SHADOWS.small,
  },
  repairHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  repairTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: ACCENT,
  },
  divider: { backgroundColor: '#fed7aa', height: 1, marginBottom: SPACING.md, marginTop: SPACING.xs },
  input: { marginBottom: SPACING.sm, backgroundColor: 'white' },
  photoActions: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  photoBtn: { flex: 1, borderRadius: BORDER_RADIUS.md },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  photoContainer: { width: '30%', aspectRatio: 1, position: 'relative' },
  photo: { width: '100%', height: '100%', borderRadius: BORDER_RADIUS.md, borderWidth: 2, borderColor: '#fdba74' },
  deletePhotoBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(220,38,38,0.9)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deletePhotoText: {
    color: 'white',
    fontSize: 14,
    fontWeight: TYPOGRAPHY.weights.bold as any,
  },
  addRepairBtn: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderColor: ACCENT,
  },
  buttonSafeArea: { backgroundColor: 'white' },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: BRAND_COLORS.grayMedium,
    ...SHADOWS.medium,
  },
  navBtn: { flex: 1, marginHorizontal: SPACING.xs, borderRadius: BORDER_RADIUS.md },
});
