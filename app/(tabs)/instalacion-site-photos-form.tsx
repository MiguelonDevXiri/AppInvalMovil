import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Divider, Text, Title } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BORDER_RADIUS,
  BRAND_COLORS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from '../../constants/Colors';

const INSTALLATION_GRADIENT = ['#0f766e', '#14b8a6', '#5eead4'] as const;
const INSTALLATION_PRIMARY = '#0f766e';
const INSTALLATION_BORDER = '#99f6e4';

export default function InstalacionSitePhotosFormScreen() {
  const params = useLocalSearchParams();

  const [photoSite1, setPhotoSite1] = useState<string | null>(null);
  const [photoSite2, setPhotoSite2] = useState<string | null>(null);
  const [photoSite3, setPhotoSite3] = useState<string | null>(null);
  const [photoSite4, setPhotoSite4] = useState<string | null>(null);

  useEffect(() => {
    if (params.photoSite1 && (params.photoSite1 as string).trim() !== '') setPhotoSite1(params.photoSite1 as string);
    if (params.photoSite2 && (params.photoSite2 as string).trim() !== '') setPhotoSite2(params.photoSite2 as string);
    if (params.photoSite3 && (params.photoSite3 as string).trim() !== '') setPhotoSite3(params.photoSite3 as string);
    if (params.photoSite4 && (params.photoSite4 as string).trim() !== '') setPhotoSite4(params.photoSite4 as string);
  }, []);

  const handleTakePhoto = async (slot: 1 | 2 | 3 | 4) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos', 'Se necesitan permisos para usar la cámara.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.8 });
      if (result.canceled || !result.assets?.length) return;

      const uri = result.assets[0].uri;
      if (slot === 1) setPhotoSite1(uri);
      if (slot === 2) setPhotoSite2(uri);
      if (slot === 3) setPhotoSite3(uri);
      if (slot === 4) setPhotoSite4(uri);
    } catch {
      Alert.alert('Error', 'No se pudo tomar la foto.');
    }
  };

  const handlePickPhoto = async (slot: 1 | 2 | 3 | 4) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos', 'Se necesitan permisos para acceder a la galería.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) return;

      const uri = result.assets[0].uri;
      if (slot === 1) setPhotoSite1(uri);
      if (slot === 2) setPhotoSite2(uri);
      if (slot === 3) setPhotoSite3(uri);
      if (slot === 4) setPhotoSite4(uri);
    } catch {
      Alert.alert('Error', 'No se pudo seleccionar la imagen.');
    }
  };

  const handleContinue = () => {
    if (!photoSite1 || !photoSite2 || !photoSite3 || !photoSite4) {
      Alert.alert('Fotos requeridas', 'Debes añadir las 4 fotos del sitio antes de continuar.');
      return;
    }

    router.push({
      pathname: '/(tabs)/instalacion-work-form' as any,
      params: {
        ...params,
        photoSite1: photoSite1 || '',
        photoSite2: photoSite2 || '',
        photoSite3: photoSite3 || '',
        photoSite4: photoSite4 || '',
      },
    });
  };

  const PhotoSlot = ({ slot, photo }: { slot: 1 | 2 | 3 | 4; photo: string | null }) => (
    <View style={styles.photoSlot}>
      <Text style={styles.photoSlotLabel}>Foto {slot}</Text>
      {photo ? (
        <TouchableOpacity onPress={() => handleTakePhoto(slot)} activeOpacity={0.85}>
          <Image source={{ uri: photo }} style={styles.photoThumb} />
          <Text style={styles.changePhotoText}>✓ Tocar para cambiar</Text>
        </TouchableOpacity>
      ) : (
        <View>
          <TouchableOpacity
            style={styles.emptyPhotoThumb}
            onPress={() => handleTakePhoto(slot)}
            activeOpacity={0.8}
          >
            <Text style={styles.cameraEmoji}>📷</Text>
            <Text style={styles.emptyPhotoText}>Tomar foto</Text>
          </TouchableOpacity>
          <Button mode="text" onPress={() => handlePickPhoto(slot)} compact labelStyle={styles.galleryText}>
            o elegir de galería
          </Button>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={INSTALLATION_GRADIENT as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerGradient}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Fotos del Sitio</Text>
          <Text style={styles.headerSubtitle}>Captura hasta 4 fotos del lugar de instalación</Text>
        </LinearGradient>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>📸 Estado del Sitio</Title>
            <Divider style={styles.divider} />
            <View style={styles.photosGrid}>
              <PhotoSlot slot={1} photo={photoSite1} />
              <PhotoSlot slot={2} photo={photoSite2} />
              <PhotoSlot slot={3} photo={photoSite3} />
              <PhotoSlot slot={4} photo={photoSite4} />
            </View>
            <Text style={styles.helpText}>
              Las 4 fotos del sitio son obligatorias para documentar correctamente la instalación.
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>

      <SafeAreaView style={styles.buttonSafeArea} edges={['bottom']}>
        <View style={styles.buttonContainer}>
          <Button mode="outlined" style={styles.navBtn} onPress={() => router.back()} icon="arrow-left" textColor={INSTALLATION_PRIMARY}>
            Volver
          </Button>
          <Button
            mode="contained"
            style={styles.navBtn}
            onPress={handleContinue}
            icon="arrow-right"
            contentStyle={{ flexDirection: 'row-reverse' }}
            buttonColor={INSTALLATION_PRIMARY}
          >
            Continuar
          </Button>
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: INSTALLATION_PRIMARY,
  },
  scrollView: {
    flex: 1,
    backgroundColor: BRAND_COLORS.surface,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  headerGradient: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
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
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: 'rgba(255,255,255,0.82)',
    marginTop: SPACING.xs,
  },
  card: {
    margin: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderLeftWidth: 3,
    borderLeftColor: INSTALLATION_PRIMARY,
    ...SHADOWS.small,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: INSTALLATION_PRIMARY,
    marginBottom: SPACING.sm,
  },
  divider: {
    backgroundColor: INSTALLATION_BORDER,
    height: 1,
    marginBottom: SPACING.md,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  photoSlot: {
    width: '48%',
    marginBottom: SPACING.sm,
  },
  photoSlotLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: INSTALLATION_PRIMARY,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  photoThumb: {
    width: '100%',
    height: 140,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: INSTALLATION_BORDER,
  },
  emptyPhotoThumb: {
    width: '100%',
    height: 140,
    backgroundColor: BRAND_COLORS.grayMedium,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: BRAND_COLORS.grayMedium,
    borderStyle: 'dashed',
  },
  cameraEmoji: {
    fontSize: 36,
  },
  emptyPhotoText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: BRAND_COLORS.grayText,
    marginTop: SPACING.xs,
  },
  changePhotoText: {
    textAlign: 'center',
    marginTop: SPACING.xs,
    color: INSTALLATION_PRIMARY,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold as any,
  },
  galleryText: {
    fontSize: 11,
    color: INSTALLATION_PRIMARY,
  },
  helpText: {
    marginTop: SPACING.md,
    fontSize: TYPOGRAPHY.sizes.xs,
    color: BRAND_COLORS.grayText,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  buttonSafeArea: {
    backgroundColor: 'white',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: BRAND_COLORS.grayMedium,
    ...SHADOWS.medium,
  },
  navBtn: {
    flex: 1,
    marginHorizontal: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
});
