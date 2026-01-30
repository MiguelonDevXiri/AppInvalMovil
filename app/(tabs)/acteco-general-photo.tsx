import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Text, Title } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND_COLORS } from '../../constants/Colors';

export default function ActecoGeneralPhotoScreen() {
  const params = useLocalSearchParams();
  // ✅ CAMBIO: 4 fotos en lugar de 1
  const [photo1, setPhoto1] = useState<string | null>(null);
  const [photo2, setPhoto2] = useState<string | null>(null);
  const [photo3, setPhoto3] = useState<string | null>(null);
  const [photo4, setPhoto4] = useState<string | null>(null);

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
        // ✅ CAMBIO: Pasar las 4 fotos con los nombres correctos
        photoGeneral1: photo1 || '',
        photoGeneral2: photo2 || '',
        photoGeneral3: photo3 || '',
        photoGeneral4: photo4 || '',
      }
    });
  };

  // ✅ Componente para cada foto
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
        <Card style={styles.headerCard}>
          <Card.Content>
            <Title style={styles.title}>Fotos Generales de la Máquina</Title>
            <Text style={styles.subtitle}>
              Captura hasta 4 fotos generales de la máquina
            </Text>
          </Card.Content>
        </Card>

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
              <Text style={styles.statusLabel}>Estado:</Text>
              <Text style={[
                styles.statusValue,
                photoCount > 0 ? styles.statusComplete : styles.statusIncomplete
              ]}>
                {photoCount > 0 
                  ? `✓ ${photoCount} foto${photoCount > 1 ? 's' : ''} capturada${photoCount > 1 ? 's' : ''}` 
                  : '⚠ Sin fotos'}
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
            color={BRAND_COLORS.primaryBlue}
          >
            Volver
          </Button>
          
          <Button 
            mode="contained" 
            onPress={handleContinue}
            style={styles.continueButton}
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
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 16,
  },
  headerCard: {
    marginBottom: 16,
    backgroundColor: BRAND_COLORS.primaryBlue,
  },
  title: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  subtitle: {
    color: 'white',
    marginTop: 4,
    fontSize: 14,
  },
  photoCard: {
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: BRAND_COLORS.primaryOrange,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  photoSlot: {
    width: '48%',
    marginBottom: 12,
  },
  photoSlotLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: BRAND_COLORS.primaryBlue,
    marginBottom: 6,
    textAlign: 'center',
  },
  photoThumb: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: BRAND_COLORS.primaryOrange,
  },
  emptyPhotoThumb: {
    width: '100%',
    height: 140,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ccc',
    borderStyle: 'dashed',
  },
  emptyPhotoIcon: {
    fontSize: 36,
  },
  emptyPhotoText: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  changePhotoText: {
    textAlign: 'center',
    marginTop: 4,
    color: BRAND_COLORS.primaryBlue,
    fontSize: 10,
    fontWeight: 'bold',
  },
  galleryButton: {
    marginTop: 4,
  },
  statusCard: {
    borderLeftWidth: 3,
    borderLeftColor: BRAND_COLORS.primaryBlue,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BRAND_COLORS.primaryBlue,
    marginRight: 8,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusComplete: {
    color: '#4CAF50',
  },
  statusIncomplete: {
    color: '#FF9800',
  },
  buttonSafeArea: {
    backgroundColor: 'white',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  backButton: {
    flex: 1,
    marginRight: 8,
  },
  continueButton: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: BRAND_COLORS.primaryOrange,
  },
});