import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  type AlertButton,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Card, Divider, Text, Title } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';

const ACCENT = '#b45309';
const GRADIENT = ['#92400e', '#d97706', '#fbbf24'] as const;
const ENTRY_PHOTO_LABELS = ['A1', 'A2', 'A3', 'A4'] as const;

export default function ReparacionEntryPhotosFormScreen() {
  const params = useLocalSearchParams();
  const [generalPhotos, setGeneralPhotos] = useState<(string | null)[]>([null, null, null, null]);

  useEffect(() => {
    if (typeof params.generalPhotos !== 'string') {
      return;
    }

    try {
      const parsed = JSON.parse(params.generalPhotos);
      if (Array.isArray(parsed)) {
        const slots: (string | null)[] = [null, null, null, null];
        parsed
          .filter((value) => typeof value === 'string')
          .slice(0, 4)
          .forEach((value, index) => {
            slots[index] = value as string;
          });
        setGeneralPhotos(slots);
      }
    } catch (error) {
      console.error('No se pudieron recuperar las fotos generales de reparación:', error);
    }
  }, [params.generalPhotos]);

  const photoCount = useMemo(() => generalPhotos.filter(Boolean).length, [generalPhotos]);

  const updateGeneralPhotoSlot = (index: number, uri: string | null) => {
    setGeneralPhotos((current) => {
      const next = [...current];
      next[index] = uri;
      return next;
    });
  };

  const pickPhotoFromCamera = async (index: number) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Se necesitan permisos para usar la cámara.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.7 });
      if (!result.canceled && result.assets?.length > 0) {
        updateGeneralPhotoSlot(index, result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error al tomar foto general de reparación:', error);
      Alert.alert('Error', 'No se pudo tomar la foto.');
    }
  };

  const pickPhotoFromLibrary = async (index: number) => {
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
        selectionLimit: 1,
      });

      if (!result.canceled && result.assets?.length > 0) {
        updateGeneralPhotoSlot(index, result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error al seleccionar foto general de reparación:', error);
      Alert.alert('Error', 'No se pudo seleccionar la foto.');
    }
  };

  const openGeneralPhotoOptions = (index: number) => {
    const hasPhoto = Boolean(generalPhotos[index]);
    const actions: AlertButton[] = [
      { text: 'Cámara', onPress: () => { void pickPhotoFromCamera(index); } },
      { text: 'Galería', onPress: () => { void pickPhotoFromLibrary(index); } },
    ];

    if (hasPhoto) {
      actions.push({
        text: 'Quitar foto',
        style: 'destructive' as const,
        onPress: () => updateGeneralPhotoSlot(index, null),
      });
    }

    actions.push({ text: 'Cancelar', style: 'cancel' as const });
    Alert.alert(`Foto ${ENTRY_PHOTO_LABELS[index]}`, 'Selecciona una opción', actions);
  };

  const goBackToMachineForm = () => {
    router.replace({
      pathname: '/(tabs)/reparacion-machine-form' as any,
      params: {
        ...params,
        generalPhotos: JSON.stringify(generalPhotos.filter((value): value is string => Boolean(value))),
      },
    });
  };

  const handleContinue = () => {
    if (!generalPhotos.some(Boolean)) {
      Alert.alert('Foto requerida', 'Añade al menos una foto general del antes para continuar.');
      return;
    }

    router.push({
      pathname: '/(tabs)/safety-checklist-form' as any,
      params: {
        ...params,
        module: 'reparacion',
        generalPhotos: JSON.stringify(generalPhotos.filter((value): value is string => Boolean(value))),
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <LinearGradient
            colors={GRADIENT as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerGradient}
          >
            <TouchableOpacity onPress={goBackToMachineForm} style={styles.backBtn}>
              <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Fotos generales del antes</Text>
            <Text style={styles.headerSubtitle}>Paso 2 · Añade entre 1 y 4 fotos</Text>
          </LinearGradient>

          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>📸 Fotos generales</Title>
              <Divider style={styles.divider} />
              <Text style={styles.infoText}>
                Haz las fotos en esta pantalla. La primera es obligatoria antes de continuar.
              </Text>

              <View style={styles.photosGrid}>
                {ENTRY_PHOTO_LABELS.map((label, index) => {
                  const uri = generalPhotos[index];
                  return (
                    <TouchableOpacity
                      key={label}
                      onPress={() => openGeneralPhotoOptions(index)}
                      style={styles.photoCardWrapper}
                      activeOpacity={0.85}
                    >
                      <Card style={styles.photoCard}>
                        <Card.Content style={styles.photoCardContent}>
                          <Text style={styles.photoTitle}>{label}</Text>
                          {uri ? (
                            <View style={styles.photoContainerInner}>
                              <Image source={{ uri }} style={styles.photo} />
                              <Text style={styles.photoHint}>Tocar para cambiar</Text>
                            </View>
                          ) : (
                            <View style={styles.photoPlaceholder}>
                              <MaterialCommunityIcons name="camera-plus-outline" size={30} color={BRAND_COLORS.grayText} />
                              <Text style={styles.photoPlaceholderText}>Tocar para añadir</Text>
                            </View>
                          )}
                          {uri ? (
                            <View style={styles.checkIndicator}>
                              <MaterialCommunityIcons name="check-circle" size={20} color={BRAND_COLORS.success} />
                            </View>
                          ) : null}
                        </Card.Content>
                      </Card>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>✅ Estado</Title>
              <Divider style={styles.divider} />
              <Text style={styles.infoText}>Fotos añadidas: {photoCount} de 4</Text>
            </Card.Content>
          </Card>
        </ScrollView>

        <SafeAreaView style={styles.buttonSafeArea} edges={['bottom']}>
          <View style={styles.buttonContainer}>
            <Button mode="outlined" onPress={goBackToMachineForm} style={styles.button} textColor={ACCENT}>
              Volver
            </Button>
            <Button
              mode="contained"
              onPress={handleContinue}
              style={styles.button}
              icon="arrow-right"
              buttonColor={ACCENT}
            >
              Continuar
            </Button>
          </View>
        </SafeAreaView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: ACCENT },
  container: { flex: 1, backgroundColor: BRAND_COLORS.surface },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
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
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: 'rgba(255,255,255,0.85)',
  },
  card: {
    margin: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.small,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: ACCENT,
    marginBottom: SPACING.sm,
  },
  divider: { marginBottom: SPACING.md },
  infoText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: BRAND_COLORS.grayText,
    lineHeight: 20,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
  },
  photoCardWrapper: {
    width: '48%',
    marginBottom: SPACING.sm,
  },
  photoCard: {
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.small,
  },
  photoCardContent: {
    position: 'relative',
  },
  photoTitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    marginBottom: SPACING.sm,
    color: ACCENT,
  },
  photoContainerInner: {
    alignItems: 'center',
  },
  photo: {
    width: '100%',
    height: 140,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: '#fdba74',
  },
  photoHint: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium as any,
    marginTop: SPACING.xs,
    color: ACCENT,
  },
  photoPlaceholder: {
    width: '100%',
    height: 140,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: BRAND_COLORS.grayLight,
    borderWidth: 2,
    borderColor: BRAND_COLORS.grayMedium,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    color: BRAND_COLORS.grayText,
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: SPACING.xs,
  },
  checkIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  buttonSafeArea: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: BRAND_COLORS.grayMedium,
  },
  buttonContainer: { flexDirection: 'row', padding: SPACING.md, gap: SPACING.sm },
  button: { flex: 1, borderRadius: BORDER_RADIUS.md },
});
