import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Paragraph, Text, Title } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND_COLORS } from '../../constants/Colors';
import { getGeneralPhotosByMachineId, getMachineById, Machine, saveGeneralPhotos } from '../../utils/storage';

interface Photos {
  front: string | null;
  back: string | null;
  left: string | null;
  right: string | null;
}

export default function PhotoScreen() {
  const { machineId } = useLocalSearchParams();
  const [machine, setMachine] = useState<Machine | null>(null);
  const [photos, setPhotos] = useState<Photos>({
    front: null,
    back: null,
    left: null,
    right: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!machineId) return;
        
        setLoading(true);
        
        const foundMachine = await getMachineById(machineId.toString());
        if (foundMachine) {
          setMachine(foundMachine);
        }
        
        const existingPhotos = await getGeneralPhotosByMachineId(machineId.toString());
        if (existingPhotos && existingPhotos.photos) {
          console.log('Cargando fotos generales existentes');
          setPhotos({
            front: existingPhotos.photos.front || null,
            back: existingPhotos.photos.back || null,
            left: existingPhotos.photos.left || null,
            right: existingPhotos.photos.right || null,
          });
        } else {
          console.log('No hay fotos generales previas');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error al cargar los datos:', error);
        setLoading(false);
      }
    };

    loadData();
  }, [machineId]);

  const handleTakePhoto = async (position: keyof Photos) => {
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
        setPhotos({
          ...photos,
          [position]: result.assets[0].uri
        });
      }
    } catch (error) {
      console.error('Error al tomar la foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto. Inténtalo de nuevo.');
    }
  };

  const handleSavePhotos = async () => {
    try {
      if (!machineId) return false;
      
      const photosObject: Record<string, string> = {};
      
      for (const [key, value] of Object.entries(photos)) {
        if (value) photosObject[key] = value;
      }
      
      const generalPhotosData = {
        machineId: machineId.toString(),
        photos: photosObject,
        takenAt: new Date().toISOString()
      };
      
      await saveGeneralPhotos(generalPhotosData);
      return true;
    } catch (error) {
      console.error('Error al guardar las fotos:', error);
      Alert.alert('Error', 'Error al guardar los datos. Inténtalo de nuevo.');
      return false;
    }
  };

  const handleFinish = async () => {
    try {
      if (!machineId) return;
      
      const photosTaken = Object.values(photos).filter(uri => uri !== null).length;
      
      if (photosTaken < 4) {
        Alert.alert(
          'Fotos incompletas',
          'No has tomado todas las fotos de la máquina. ¿Estás seguro de que quieres continuar?',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Continuar', onPress: () => saveAndContinue() }
          ]
        );
      } else {
        saveAndContinue();
      }
    } catch (error) {
      console.error('Error al finalizar las fotos:', error);
      Alert.alert('Error', 'Error al guardar los datos. Inténtalo de nuevo.');
    }
  };

  const saveAndContinue = async () => {
    try {
      const saved = await handleSavePhotos();
      if (saved && machineId) {
        router.push({
          pathname: '/report',
          params: { machineId: machineId.toString() }
        });
      }
    } catch (error) {
      console.error('Error al guardar las fotos:', error);
      Alert.alert('Error', 'Error al guardar los datos. Inténtalo de nuevo.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <Text>Cargando datos...</Text>
      </SafeAreaView>
    );
  }

  if (!machine) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <Text>No se encontraron datos para esta máquina.</Text>
        <Button 
          mode="contained" 
          onPress={() => router.push('/')}
          style={{ marginTop: 16 }}
          color={BRAND_COLORS.primaryBlue}
        >
          Volver al inicio
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Card style={styles.headerCard}>
          <Card.Content>
            <Title style={styles.title}>Fotos Generales de la Máquina</Title>
            <Paragraph style={styles.subtitle}>
              Toma las 4 fotos generales de la máquina desde diferentes ángulos para documentar su estado general.
            </Paragraph>
            <Text style={styles.machineInfo}>
              {machine.name} - {machine.brand} {machine.model ? `(${machine.model})` : ''}
            </Text>
          </Card.Content>
        </Card>

        <View style={styles.photosGrid}>
          <View style={styles.photoRow}>
            <PhotoCard 
              title="Esquina 1" 
              photoUri={photos.front}
              onTakePhoto={() => handleTakePhoto('front')}
              cardColor={BRAND_COLORS.primaryBlue}
            />
            <PhotoCard 
              title="Esquina 2" 
              photoUri={photos.back}
              onTakePhoto={() => handleTakePhoto('back')}
              cardColor={BRAND_COLORS.primaryOrange}
            />
          </View>
          <View style={styles.photoRow}>
            <PhotoCard 
              title="Esquina 3" 
              photoUri={photos.left}
              onTakePhoto={() => handleTakePhoto('left')}
              cardColor={BRAND_COLORS.primaryOrange}
            />
            <PhotoCard 
              title="Esquina 4" 
              photoUri={photos.right}
              onTakePhoto={() => handleTakePhoto('right')}
              cardColor={BRAND_COLORS.primaryBlue}
            />
          </View>
        </View>
        
        <Text style={styles.progressText}>
          Fotos completadas: {Object.values(photos).filter(uri => uri !== null).length} de 4
        </Text>
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
            onPress={handleFinish}
            style={styles.finishButton}
            icon="check"
            contentStyle={{ flexDirection: 'row-reverse' }}
            color={BRAND_COLORS.primaryOrange}
          >
            Guardar
          </Button>
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}

interface PhotoCardProps {
  title: string;
  photoUri: string | null;
  onTakePhoto: () => void;
  cardColor: string;
}

const PhotoCard = ({ title, photoUri, onTakePhoto, cardColor }: PhotoCardProps) => (
  <Card style={[styles.photoCard, { borderLeftColor: cardColor }, photoUri ? styles.photoCardTaken : styles.photoCardEmpty]}>
    <Card.Content>
      <Title style={[styles.photoTitle, { color: cardColor }]}>{title}</Title>
      <TouchableOpacity onPress={onTakePhoto}>
        {photoUri ? (
          <View style={styles.photoContainer}>
            <Image source={{ uri: photoUri }} style={styles.photo} />
            <Text style={[styles.photoHint, { color: cardColor }]}>Tocar para cambiar</Text>
          </View>
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderText}>Tocar para tomar foto</Text>
          </View>
        )}
      </TouchableOpacity>
    </Card.Content>
  </Card>
);

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
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
    marginTop: 8,
    fontSize: 14,
  },
  machineInfo: {
    color: 'white',
    marginTop: 8,
    fontWeight: 'bold',
    fontSize: 14,
  },
  photosGrid: {
    marginBottom: 16,
  },
  photoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  photoCard: {
    flex: 1,
    margin: 4,
    borderLeftWidth: 5,
    elevation: 2,
  },
  photoCardEmpty: {
    borderLeftWidth: 5,
  },
  photoCardTaken: {
    borderLeftWidth: 5,
  },
  photoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  photoContainer: {
    alignItems: 'center',
  },
  photo: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginVertical: 8,
  },
  photoHint: {
    fontSize: 12,
    fontWeight: '500',
  },
  photoPlaceholder: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  photoPlaceholderText: {
    color: '#757575',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  progressText: {
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
    fontSize: 16,
    color: BRAND_COLORS.primaryBlue,
    fontWeight: 'bold',
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
    borderColor: BRAND_COLORS.primaryBlue,
  },
  finishButton: {
    flex: 1,
    marginLeft: 8,
  },
});