import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, GRADIENTS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';

export default function ActecoAveriaPhotoScreen() {
  const params = useLocalSearchParams();
  const [photos, setPhotos] = useState<string[]>([]);

  // Cargar fotos de avería existentes en modo edición
  useEffect(() => {
    if (params.averiaPhotos) {
      try {
        const parsed = JSON.parse(params.averiaPhotos as string);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log('✏️ Cargando fotos de avería para editar:', parsed.length);
          setPhotos(parsed);
        }
      } catch (e) {
        console.error('Error al parsear averiaPhotos:', e);
      }
    }
  }, []);

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Se necesitan permisos para usar la cámara');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotos([...photos, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Error al tomar la foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto. Inténtalo de nuevo.');
    }
  };

  const handleChooseFromGallery = async () => {
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

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newPhotos = result.assets.map(asset => asset.uri);
        setPhotos([...photos, ...newPhotos]);
      }
    } catch (error) {
      console.error('Error al seleccionar imágenes:', error);
      Alert.alert('Error', 'No se pudieron seleccionar las imágenes. Inténtalo de nuevo.');
    }
  };

  const handleRemovePhoto = (index: number) => {
    Alert.alert(
      'Eliminar foto',
      '¿Estás seguro de que quieres eliminar esta foto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            const newPhotos = photos.filter((_, i) => i !== index);
            setPhotos(newPhotos);
          }
        }
      ]
    );
  };

  const handleContinue = () => {
    if (photos.length === 0) {
      Alert.alert(
        'Sin fotos',
        '¿Deseas continuar sin fotos de la avería?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Continuar',
            onPress: () => navigateToNext()
          }
        ]
      );
    } else {
      navigateToNext();
    }
  };

  const navigateToNext = () => {
    const nextParams = {
      ...params,
      averiaPhotos: JSON.stringify(photos),
    };

    router.push({
      pathname: '/(tabs)/acteco-solucion-materiales' as any,
      params: nextParams
    });
  };

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
          <MaterialCommunityIcons name="camera-burst" size={24} color="rgba(255,255,255,0.7)" />
          <Text style={styles.headerTitle}>Fotos de la Avería</Text>
          <Text style={styles.headerSubtitle}>Documenta la avería con fotografías</Text>
        </LinearGradient>

        <Card style={styles.instructionsCard}>
          <Card.Content>
            <Text style={styles.instructionsText}>
              📸 Toma o selecciona fotos que muestren claramente la avería detectada
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.actionsCard}>
          <Card.Content>
            <Button
              mode="contained"
              icon="camera"
              onPress={handleTakePhoto}
              style={styles.actionButton}
              buttonColor={BRAND_COLORS.primaryBlue}
            >
              Tomar Foto
            </Button>

            <Button
              mode="outlined"
              icon="image-multiple"
              onPress={handleChooseFromGallery}
              style={styles.actionButton}
              textColor={BRAND_COLORS.primaryBlue}
            >
              Seleccionar de Galería
            </Button>
          </Card.Content>
        </Card>

        {photos.length > 0 && (
          <Card style={styles.photosCard}>
            <Card.Content>
              <Text style={styles.photosSectionTitle}>
                Fotos capturadas ({photos.length})
              </Text>
              <View style={styles.photosGrid}>
                {photos.map((uri, index) => (
                  <View key={index} style={styles.photoContainer}>
                    <Image source={{ uri }} style={styles.photo} />
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleRemovePhoto(index)}
                    >
                      <Text style={styles.deleteButtonText}>✕</Text>
                    </TouchableOpacity>
                    <Text style={styles.photoLabel}>Foto {index + 1}</Text>
                  </View>
                ))}
              </View>
            </Card.Content>
          </Card>
        )}

        {photos.length === 0 && (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>
                No se han añadido fotos todavía
              </Text>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      <SafeAreaView style={styles.buttonSafeArea} edges={['bottom']}>
        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            style={styles.backButton}
            onPress={() => router.back()}
            icon="arrow-left"
            textColor={BRAND_COLORS.primaryBlue}
          >
            Volver
          </Button>

          <Button
            mode="contained"
            style={styles.continueButton}
            onPress={handleContinue}
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
  safeArea: { flex: 1, backgroundColor: BRAND_COLORS.primaryBlue },
  scrollView: { flex: 1, backgroundColor: BRAND_COLORS.surface },
  scrollContent: { paddingBottom: SPACING.md },
  headerGradient: { padding: SPACING.lg, alignItems: 'center' },
  headerTitle: { fontSize: TYPOGRAPHY.sizes.xl, fontWeight: TYPOGRAPHY.weights.bold as any, color: 'white', marginTop: SPACING.sm },
  headerSubtitle: { fontSize: TYPOGRAPHY.sizes.sm, color: 'rgba(255,255,255,0.8)', marginTop: SPACING.xs },
  instructionsCard: { margin: SPACING.md, marginBottom: SPACING.sm, backgroundColor: BRAND_COLORS.infoLight, borderLeftWidth: 3, borderLeftColor: BRAND_COLORS.primaryBlue, borderRadius: BORDER_RADIUS.lg },
  instructionsText: { fontSize: TYPOGRAPHY.sizes.sm, lineHeight: 20 },
  actionsCard: { marginHorizontal: SPACING.md, marginBottom: SPACING.sm, borderRadius: BORDER_RADIUS.lg, ...SHADOWS.small },
  actionButton: { marginBottom: SPACING.sm, borderRadius: BORDER_RADIUS.md },
  photosCard: { marginHorizontal: SPACING.md, marginBottom: SPACING.sm, borderLeftWidth: 3, borderLeftColor: BRAND_COLORS.error, borderRadius: BORDER_RADIUS.lg, ...SHADOWS.small },
  photosSectionTitle: { fontSize: TYPOGRAPHY.sizes.md, fontWeight: TYPOGRAPHY.weights.bold as any, color: BRAND_COLORS.error, marginBottom: SPACING.sm },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  photoContainer: { width: '48%', marginBottom: SPACING.sm, position: 'relative' },
  photo: { width: '100%', height: 120, borderRadius: BORDER_RADIUS.md, borderWidth: 2, borderColor: BRAND_COLORS.error },
  deleteButton: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(220, 38, 38, 0.9)', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  deleteButtonText: { color: 'white', fontSize: 18, fontWeight: TYPOGRAPHY.weights.bold as any, lineHeight: 20 },
  photoLabel: { textAlign: 'center', marginTop: SPACING.xs, fontSize: TYPOGRAPHY.sizes.xs, color: BRAND_COLORS.grayText },
  emptyCard: { marginHorizontal: SPACING.md, marginBottom: SPACING.sm, backgroundColor: BRAND_COLORS.grayLight, borderRadius: BORDER_RADIUS.lg },
  emptyText: { textAlign: 'center', fontStyle: 'italic', color: BRAND_COLORS.grayText, padding: SPACING.lg },
  buttonSafeArea: { backgroundColor: 'white' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', padding: SPACING.md, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: BRAND_COLORS.grayMedium, ...SHADOWS.medium },
  backButton: { flex: 1, marginRight: SPACING.sm, borderRadius: BORDER_RADIUS.md },
  continueButton: { flex: 1, marginLeft: SPACING.sm, borderRadius: BORDER_RADIUS.md },
});
