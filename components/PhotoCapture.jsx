import React, { useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Alert, Platform } from 'react-native';
import { Button, Text, Card, IconButton } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { BRAND_COLORS } from '../constants/Colors';

/**
 * Componente para capturar o seleccionar fotos
 * @param {Object} props - Propiedades del componente
 * @param {string} props.title - Título del componente
 * @param {string} [props.description=""] - Descripción opcional
 * @param {Function} props.onPhotoTaken - Función llamada cuando se toma una foto, recibe la URI como parámetro
 * @param {string|null} [props.photoUri=null] - URI de la foto actual, si existe
 * @param {Array<number>} [props.aspectRatio=[4,3]] - Relación de aspecto para la foto
 * @param {boolean} [props.allowsEditing=false] - Si se permite editar la foto
 * @param {number} [props.quality=0.7] - Calidad de la foto (0-1)
 * @param {string} [props.size="medium"] - Tamaño del componente: 'small', 'medium' o 'large'
 */
const PhotoCapture = ({ 
  title, 
  description = '', 
  onPhotoTaken, 
  photoUri = null,
  aspectRatio = [4, 3],
  allowsEditing = false,
  quality = 0.7,
  size = 'medium',
}) => {
  
  const getPhotoHeight = () => {
    switch (size) {
      case 'small':
        return 100;
      case 'large':
        return 220;
      case 'medium':
      default:
        return 160;
    }
  };
  
  const handleTakePhoto = async () => {
    try {
      // Pedir permisos para acceder a la cámara
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Se necesitan permisos para usar la cámara');
        return;
      }
      
      // Lanzar la cámara
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing,
        aspect: aspectRatio,
        quality,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (onPhotoTaken) {
          onPhotoTaken(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error('Error al tomar la foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto. Inténtalo de nuevo.');
    }
  };
  
  const handleChooseFromGallery = async () => {
    try {
      // Pedir permisos para acceder a la galería
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Se necesitan permisos para acceder a la galería');
        return;
      }
      
      // Lanzar el selector de imágenes
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing,
        aspect: aspectRatio,
        quality,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (onPhotoTaken) {
          onPhotoTaken(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error('Error al seleccionar la imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen. Inténtalo de nuevo.');
    }
  };
  
  return (
    <Card style={styles.card}>
      <Card.Content>
        {title && <Text style={styles.title}>{title}</Text>}
        
        {description && <Text style={styles.description}>{description}</Text>}
        
        {photoUri ? (
          <View style={styles.photoContainer}>
            <Image 
              source={{ uri: photoUri }} 
              style={[styles.photo, { height: getPhotoHeight() }]}
              resizeMode="cover"
            />
            
            <View style={styles.photoOverlay}>
              <IconButton
                icon="camera"
                color="white"
                size={24}
                style={styles.overlayButton}
                onPress={handleTakePhoto}
              />
              <IconButton
                icon="image"
                color="white"
                size={24}
                style={styles.overlayButton}
                onPress={handleChooseFromGallery}
              />
            </View>
          </View>
        ) : (
          <View style={styles.buttonsContainer}>
            <Button 
              mode="contained" 
              icon="camera"
              onPress={handleTakePhoto}
              style={styles.button}
              color={BRAND_COLORS.primaryBlue}
            >
              Tomar Foto
            </Button>
            
            <Button 
              mode="outlined" 
              icon="image"
              onPress={handleChooseFromGallery}
              style={styles.button}
              color={BRAND_COLORS.primaryBlue}
            >
              Galería
            </Button>
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: BRAND_COLORS.primaryBlue,
  },
  description: {
    marginBottom: 12,
    color: '#666',
  },
  photoContainer: {
    position: 'relative',
    marginVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    borderRadius: 8,
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderTopLeftRadius: 8,
  },
  overlayButton: {
    margin: 0,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 8,
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
  },
});

export default PhotoCapture;