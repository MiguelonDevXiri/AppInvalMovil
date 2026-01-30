import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND_COLORS } from '../../constants/Colors';

export default function ActecoAveriaPhotoScreen() {
  const params = useLocalSearchParams();
  const [photos, setPhotos] = useState<string[]>([]);

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
        <Card style={styles.headerCard}>
          <Card.Content>
            <Text style={styles.headerTitle}>Fotos de la Avería</Text>
            <Text style={styles.headerSubtitle}>Documenta la avería con fotografías</Text>
          </Card.Content>
        </Card>

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
              color={BRAND_COLORS.primaryBlue}
            >
              Tomar Foto
            </Button>

            <Button
              mode="outlined"
              icon="image-multiple"
              onPress={handleChooseFromGallery}
              style={styles.actionButton}
              color={BRAND_COLORS.primaryBlue}
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
          >
            Volver
          </Button>

          <Button
            mode="contained"
            style={styles.continueButton}
            onPress={handleContinue}
            icon="arrow-right"
            contentStyle={{ flexDirection: 'row-reverse' }}
          >
            Continuar
          </Button>
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 16 },
  headerCard: { marginBottom: 16, backgroundColor: BRAND_COLORS.primaryBlue },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white', textAlign: 'center' },
  headerSubtitle: { fontSize: 14, color: 'white', textAlign: 'center', marginTop: 4 },
  instructionsCard: { marginBottom: 16, backgroundColor: '#E3F2FD', borderLeftWidth: 3, borderLeftColor: BRAND_COLORS.primaryBlue },
  instructionsText: { fontSize: 14, lineHeight: 20 },
  actionsCard: { marginBottom: 16 },
  actionButton: { marginBottom: 12 },
  photosCard: { marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#F44336' },
  photosSectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#F44336', marginBottom: 12 },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  photoContainer: { width: '48%', marginBottom: 12, position: 'relative' },
  photo: { width: '100%', height: 120, borderRadius: 8, borderWidth: 2, borderColor: '#F44336' },
  deleteButton: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(244, 67, 54, 0.9)', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  deleteButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold', lineHeight: 20 },
  photoLabel: { textAlign: 'center', marginTop: 4, fontSize: 12, color: '#666' },
  emptyCard: { marginBottom: 16, backgroundColor: '#f9f9f9' },
  emptyText: { textAlign: 'center', fontStyle: 'italic', color: '#666', padding: 20 },
  buttonSafeArea: { backgroundColor: 'white' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e0e0e0' },
  backButton: { flex: 1, marginRight: 8, borderColor: BRAND_COLORS.primaryBlue },
  continueButton: { flex: 1, marginLeft: 8, backgroundColor: BRAND_COLORS.primaryOrange },
});