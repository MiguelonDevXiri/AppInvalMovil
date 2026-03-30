import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Text, Title } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, GRADIENTS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';

export default function ActecoGeneralPhotoScreen() {
  const params = useLocalSearchParams();
  const [photo1, setPhoto1] = useState<string | null>(null);
  const [photo2, setPhoto2] = useState<string | null>(null);
  const [photo3, setPhoto3] = useState<string | null>(null);
  const [photo4, setPhoto4] = useState<string | null>(null);

  // Cargar fotos existentes en modo edición
  useEffect(() => {
    if (params.isEditing === 'true') {
      console.log('✏️ Cargando fotos generales para editar');
      if (params.photoGeneral1 && (params.photoGeneral1 as string).trim() !== '') {
        setPhoto1(params.photoGeneral1 as string);
      }
      if (params.photoGeneral2 && (params.photoGeneral2 as string).trim() !== '') {
        setPhoto2(params.photoGeneral2 as string);
      }
      if (params.photoGeneral3 && (params.photoGeneral3 as string).trim() !== '') {
        setPhoto3(params.photoGeneral3 as string);
      }
      if (params.photoGeneral4 && (params.photoGeneral4 as string).trim() !== '') {
        setPhoto4(params.photoGeneral4 as string);
      }
    }
  }, []);

  const handleTakePhoto = async (photoNumber: 1 | 2 | 3 | 4) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Se necesitan permisos para usar la cámara');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        switch(photoNumber) {
          case 1: setPhoto1(uri); break;
          case 2: setPhoto2(uri); break;
          case 3: setPhoto3(uri); break;
          case 4: setPhoto4(uri); break;
        }
      }
    } catch (error) {
      console.error('Error al tomar la foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto. Inténtalo de nuevo.');
    }
  };

  const handleChooseFromGallery = async (photoNumber: 1 | 2 | 3 | 4) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Se necesitan permisos para acceder a la galería');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        switch(photoNumber) {
          case 1: setPhoto1(uri); break;
          case 2: setPhoto2(uri); break;
          case 3: setPhoto3(uri); break;
          case 4: setPhoto4(uri); break;
        }
      }
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen. Inténtalo de nuevo.');
    }
  };

  const handleContinue = () => {
    const photoCount = [photo1, photo2, photo3, photo4].filter(p => p).length;

    if (photoCount === 0) {
      Alert.alert(
        'Fotos requeridas',
        '¿Estás seguro de que quieres continuar sin fotos?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Continuar sin fotos',
            onPress: () => navigateNext()
          }
        ]
      );
    } else {
      navigateNext();
    }
  };

  const navigateNext = () => {
    router.push({
      pathname: '/(tabs)/acteco-averia-form' as any,
      params: {
        ...params,
        photoGeneral1: photo1 || '',
        photoGeneral2: photo2 || '',
        photoGeneral3: photo3 || '',
        photoGeneral4: photo4 || '',
      }
    });
  };

  const PhotoSlot = ({
    photoNumber,
    photo,
    onTakePhoto,
    onChooseGallery
  }: {
    photoNumber: number;
    photo: string | null;
    onTakePhoto: () => void;
    onChooseGallery: () => void;
  }) => (
    <View style={styles.photoSlot}>
      <Text style={styles.photoSlotLabel}>Foto {photoNumber}</Text>
      {photo ? (
        <TouchableOpacity onPress={onTakePhoto} activeOpacity={0.8}>
          <Image source={{ uri: photo }} style={styles.photoThumb} />
          <Text style={styles.changePhotoText}>✓ Tocar para cambiar</Text>
        </TouchableOpacity>
      ) : (
        <View>
          <TouchableOpacity
            style={styles.emptyPhotoThumb}
            onPress={onTakePhoto}
            activeOpacity={0.7}
          >
            <Text style={styles.emptyPhotoIcon}>📷</Text>
            <Text style={styles.emptyPhotoText}>Tomar foto</Text>
          </TouchableOpacity>
          <Button
            mode="text"
            onPress={onChooseGallery}
            style={styles.galleryButton}
            compact
            labelStyle={{ fontSize: 11 }}
          >
            o elegir de galería
          </Button>
        </View>
      )}
    </View>
  );

  const photoCount = [photo1, photo2, photo3, photo4].filter(p => p).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={GRADIENTS.primary as unknown as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerGradient}
        >
          <TouchableOpacity onPress={() => router.back()} style={{position:'absolute',left:12,top:12,zIndex:10,width:36,height:36,borderRadius:18,backgroundColor:'rgba(255,255,255,0.2)',justifyContent:'center',alignItems:'center'}}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
          </TouchableOpacity>
          <MaterialCommunityIcons name="camera-outline" size={24} color="rgba(255,255,255,0.7)" />
          <Text style={styles.headerTitle}>Fotos Generales de la Máquina</Text>
          <Text style={styles.headerSubtitle}>Captura hasta 4 fotos generales de la máquina</Text>
        </LinearGradient>

        <Card style={styles.photoCard}>
          <Card.Content>
            <View style={styles.photosGrid}>
              <PhotoSlot
                photoNumber={1}
                photo={photo1}
                onTakePhoto={() => handleTakePhoto(1)}
                onChooseGallery={() => handleChooseFromGallery(1)}
              />
              <PhotoSlot
                photoNumber={2}
                photo={photo2}
                onTakePhoto={() => handleTakePhoto(2)}
                onChooseGallery={() => handleChooseFromGallery(2)}
              />
              <PhotoSlot
                photoNumber={3}
                photo={photo3}
                onTakePhoto={() => handleTakePhoto(3)}
                onChooseGallery={() => handleChooseFromGallery(3)}
              />
              <PhotoSlot
                photoNumber={4}
                photo={photo4}
                onTakePhoto={() => handleTakePhoto(4)}
                onChooseGallery={() => handleChooseFromGallery(4)}
              />
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.statusCard}>
          <Card.Content>
            <View style={styles.statusRow}>
              <MaterialCommunityIcons
                name={photoCount > 0 ? 'check-circle' : 'information'}
                size={20}
                color={photoCount > 0 ? BRAND_COLORS.success : BRAND_COLORS.primaryBlue}
              />
              <Text style={[
                styles.statusValue,
                photoCount > 0 ? styles.statusComplete : styles.statusIncomplete
              ]}>
                {photoCount > 0
                  ? `${photoCount} foto${photoCount > 1 ? 's' : ''} capturada${photoCount > 1 ? 's' : ''}`
                  : 'Sin fotos'}
              </Text>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      <SafeAreaView style={styles.buttonSafeArea} edges={['bottom']}>
        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={() => router.back()}
            style={styles.backButton}
            icon="arrow-left"
            textColor={BRAND_COLORS.primaryBlue}
          >
            Volver
          </Button>

          <Button
            mode="contained"
            onPress={handleContinue}
            style={styles.continueButton}
            icon="arrow-right"
            contentStyle={{ flexDirection: 'row-reverse' }}
            buttonColor={BRAND_COLORS.primaryOrange}
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
    backgroundColor: BRAND_COLORS.primaryBlue,
  },
  scrollView: {
    flex: 1,
    backgroundColor: BRAND_COLORS.surface,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },
  headerGradient: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontWeight: TYPOGRAPHY.weights.bold as any,
    fontSize: TYPOGRAPHY.sizes.xl,
    marginTop: SPACING.sm,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: SPACING.xs,
  },
  photoCard: {
    margin: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderLeftWidth: 3,
    borderLeftColor: BRAND_COLORS.primaryOrange,
    ...SHADOWS.small,
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
    color: BRAND_COLORS.primaryBlue,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  photoThumb: {
    width: '100%',
    height: 140,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: BRAND_COLORS.primaryOrange,
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
  emptyPhotoIcon: {
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
    color: BRAND_COLORS.primaryBlue,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold as any,
  },
  galleryButton: {
    marginTop: SPACING.xs,
  },
  statusCard: {
    marginHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderLeftWidth: 3,
    borderLeftColor: BRAND_COLORS.primaryBlue,
    ...SHADOWS.small,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  statusValue: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold as any,
  },
  statusComplete: {
    color: BRAND_COLORS.success,
  },
  statusIncomplete: {
    color: BRAND_COLORS.warning,
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
  backButton: {
    flex: 1,
    marginRight: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  continueButton: {
    flex: 1,
    marginLeft: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
});
