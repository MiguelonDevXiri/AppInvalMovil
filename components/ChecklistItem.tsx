import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, TextInput } from 'react-native';
import { Card, Text, Button, IconButton, Dialog, Portal } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { BRAND_COLORS } from '../constants/Colors';

// Interfaz para fotos con comentarios
interface PhotoWithComment {
  uri: string;
  comment?: string;
}

// Interfaz para los props del componente
interface ChecklistItemProps {
  item: {
    id: string;
    text: string;
  };
  status: string | null;
  photoUris: (string | PhotoWithComment)[];
  onStatusChange: (id: string, status: string) => void;
  onPhotosChange: (id: string, photos: (string | PhotoWithComment)[]) => void;
}

const ChecklistItem = ({ 
  item, 
  status: initialStatus, 
  photoUris: initialPhotoUris = [], 
  onStatusChange, 
  onPhotosChange
}: ChecklistItemProps) => {
  const [status, setStatus] = useState(initialStatus);
  const [photoUris, setPhotoUris] = useState<(string | PhotoWithComment)[]>(initialPhotoUris || []);
  const [commentDialogVisible, setCommentDialogVisible] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [currentComment, setCurrentComment] = useState('');
  
  // Actualizamos el estado local cuando cambian las props
  useEffect(() => {
    setStatus(initialStatus);
    setPhotoUris(initialPhotoUris || []);
  }, [initialStatus, initialPhotoUris]);
  
  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    onStatusChange(item.id, newStatus);
    
    // Si el estado es 'fail' y no hay fotos, ofrecemos tomar una
    if (newStatus === 'fail' && (!photoUris || photoUris.length === 0)) {
      handleAddPhoto();
    }
  };
  
  const handleAddPhoto = async () => {
    try {
      // Pedir permisos para acceder a la cámara
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Se necesitan permisos para usar la cámara');
        return;
      }
      
      // Lanzar la cámara
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        aspect: [4, 3],
        quality: 0.7,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newPhoto: PhotoWithComment = {
          uri: result.assets[0].uri,
          comment: ''
        };
        
        const newUris = [...photoUris, newPhoto];
        setPhotoUris(newUris);
        onPhotosChange(item.id, newUris);
        
        // Abrir diálogo para añadir comentario a la foto recién tomada
        setSelectedPhotoIndex(newUris.length - 1);
        setCurrentComment('');
        setCommentDialogVisible(true);
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
        allowsEditing: false,
        aspect: [4, 3],
        quality: 0.7,
        allowsMultipleSelection: true,
        selectionLimit: 5, // Máximo 5 fotos a la vez para no sobrecargar
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newUris = [...photoUris];
        let lastAddedIndex = -1;
        
        // Añadir cada nueva foto seleccionada
        result.assets.forEach(asset => {
          const newPhoto: PhotoWithComment = {
            uri: asset.uri,
            comment: ''
          };
          
          // Verificar que no existe ya (comparando URI)
          const exists = newUris.some(
            photo => typeof photo === 'string' 
              ? photo === asset.uri 
              : photo.uri === asset.uri
          );
          
          if (!exists) {
            newUris.push(newPhoto);
            lastAddedIndex = newUris.length - 1;
          }
        });
        
        setPhotoUris(newUris);
        onPhotosChange(item.id, newUris);
        
        // Si se añadió al menos una foto, abrimos el diálogo para la última
        if (lastAddedIndex >= 0) {
          setSelectedPhotoIndex(lastAddedIndex);
          setCurrentComment('');
          setCommentDialogVisible(true);
        }
      }
    } catch (error) {
      console.error('Error al seleccionar imágenes:', error);
      Alert.alert('Error', 'No se pudieron seleccionar las imágenes. Inténtalo de nuevo.');
    }
  };
  
  const handleRemovePhoto = (indexToRemove: number) => {
    Alert.alert(
      'Eliminar foto',
      '¿Estás seguro de que quieres eliminar esta foto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: () => {
            const newUris = photoUris.filter((_, index) => index !== indexToRemove);
            setPhotoUris(newUris);
            onPhotosChange(item.id, newUris);
          }
        }
      ]
    );
  };
  
  const handleEditComment = (index: number) => {
    const photo = photoUris[index];
    if (typeof photo === 'string') {
      // Convertir foto de string a objeto con comentario
      setCurrentComment('');
    } else {
      setCurrentComment(photo.comment || '');
    }
    
    setSelectedPhotoIndex(index);
    setCommentDialogVisible(true);
  };
  
  const handleSaveComment = () => {
    if (selectedPhotoIndex === null) return;
    
    const newPhotoUris = [...photoUris];
    const photo = newPhotoUris[selectedPhotoIndex];
    
    // Si la foto es una cadena URI, convertirla a objeto con comentario
    if (typeof photo === 'string') {
      newPhotoUris[selectedPhotoIndex] = {
        uri: photo,
        comment: currentComment
      };
    } else {
      // Si ya es un objeto, actualizar el comentario
      newPhotoUris[selectedPhotoIndex] = {
        ...photo,
        comment: currentComment
      };
    }
    
    setPhotoUris(newPhotoUris);
    onPhotosChange(item.id, newPhotoUris);
    setCommentDialogVisible(false);
    setSelectedPhotoIndex(null);
  };
  
  // Función para obtener la URI de la foto, ya sea string o objeto
  const getPhotoUri = (photo: string | PhotoWithComment): string => {
    return typeof photo === 'string' ? photo : photo.uri;
  };
  
  // Función para obtener el comentario de la foto, si existe
  const getPhotoComment = (photo: string | PhotoWithComment): string | undefined => {
    return typeof photo === 'string' ? undefined : photo.comment;
  };
  
  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text style={styles.itemText}>{item.text}</Text>
        
        <View style={styles.buttonsContainer}>
          <Button 
            mode={status === 'ok' ? 'contained' : 'outlined'} 
            onPress={() => handleStatusChange('ok')}
            style={[styles.button, status === 'ok' ? styles.okButton : null]}
            icon="check"
          >
            Bien
          </Button>
          
          <Button 
            mode={status === 'fail' ? 'contained' : 'outlined'} 
            onPress={() => handleStatusChange('fail')}
            style={[styles.button, status === 'fail' ? styles.failButton : null]}
            icon="close"
          >
            Mal
          </Button>
          
          <Button 
            mode={status === 'na' ? 'contained' : 'outlined'} 
            onPress={() => handleStatusChange('na')}
            style={[styles.button, status === 'na' ? styles.naButton : null]}
            icon="minus"
          >
            N/A
          </Button>
        </View>
        
        {status === 'fail' && (
          <View style={styles.photoSection}>
            {photoUris && photoUris.length > 0 ? (
              <View style={styles.photosContainer}>
                <Text style={styles.photosTitle}>
                  Evidencias fotográficas ({photoUris.length})
                </Text>
                
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.photosScrollView}
                >
                  {photoUris.map((photo, index) => {
                    const uri = getPhotoUri(photo);
                    const comment = getPhotoComment(photo);
                    
                    return (
                      <View key={`${item.id}_photo_${index}`} style={styles.photoContainer}>
                        <Image source={{ uri }} style={styles.photo} resizeMode="cover" />
                        <View style={styles.photoActions}>
                          <TouchableOpacity
                            style={[styles.photoButton, styles.deleteButton]}
                            onPress={() => handleRemovePhoto(index)}
                          >
                            <Text style={styles.buttonText}>×</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.photoButton, styles.commentButton]}
                            onPress={() => handleEditComment(index)}
                          >
                            <Text style={styles.buttonText}>✎</Text>
                          </TouchableOpacity>
                        </View>
                        {comment && (
                          <Text style={styles.commentPreview} numberOfLines={1}>
                            {comment}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
                
                <View style={styles.photoActions}>
                  <Button 
                    mode="outlined" 
                    onPress={handleAddPhoto}
                    icon="camera"
                    style={styles.actionButton}
                    color={BRAND_COLORS.primaryBlue}
                  >
                    Tomar Foto
                  </Button>
                  
                  <Button 
                    mode="outlined" 
                    onPress={handleChooseFromGallery}
                    icon="image-multiple"
                    style={styles.actionButton}
                    color={BRAND_COLORS.primaryBlue}
                  >
                    Galería
                  </Button>
                </View>
              </View>
            ) : (
              <View style={styles.noPhotosContainer}>
                <Text style={styles.noPhotosText}>
                  Añade fotos para documentar el problema
                </Text>
                
                <View style={styles.photoActions}>
                  <Button 
                    mode="outlined" 
                    onPress={handleAddPhoto}
                    icon="camera"
                    style={styles.actionButton}
                    color={BRAND_COLORS.primaryBlue}
                  >
                    Tomar Foto
                  </Button>
                  
                  <Button 
                    mode="outlined" 
                    onPress={handleChooseFromGallery}
                    icon="image-multiple"
                    style={styles.actionButton}
                    color={BRAND_COLORS.primaryBlue}
                  >
                    Galería
                  </Button>
                </View>
              </View>
            )}
          </View>
        )}
      </Card.Content>
      
      {/* Diálogo para añadir/editar comentarios */}
      <Portal>
        <Dialog visible={commentDialogVisible} onDismiss={() => setCommentDialogVisible(false)}>
          <Dialog.Title>Comentario de la foto</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              Añade un comentario descriptivo para esta foto
            </Text>
            <TextInput
              style={styles.commentInput}
              multiline
              numberOfLines={4}
              value={currentComment}
              onChangeText={setCurrentComment}
              placeholder="Describe el problema o añade observaciones"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCommentDialogVisible(false)}>Cancelar</Button>
            <Button onPress={handleSaveComment}>Guardar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    backgroundColor: 'white',
    borderLeftWidth: 3,
    borderLeftColor: '#ccc',
  },
  itemText: {
    fontSize: 16,
    marginBottom: 12,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
  },
  okButton: {
    backgroundColor: '#4CAF50',
  },
  failButton: {
    backgroundColor: '#F44336',
  },
  naButton: {
    backgroundColor: '#9E9E9E',
  },
  photoSection: {
    marginTop: 8,
    alignItems: 'center',
  },
  photosContainer: {
    width: '100%',
  },
  photosTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: BRAND_COLORS.primaryBlue,
    marginBottom: 8,
    textAlign: 'center',
  },
  photosScrollView: {
    width: '100%',
    maxHeight: 140,
    marginBottom: 10,
  },
  photoContainer: {
    position: 'relative',
    marginRight: 12,
    borderRadius: 8,
    overflow: 'hidden',
    width: 120,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  photoActions: {
    flexDirection: 'row',
    position: 'absolute',
    top: 4,
    right: 4,
  },
  photoButton: {
    margin: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.7)',
  },
  commentButton: {
    backgroundColor: 'rgba(33, 150, 243, 0.7)',
    marginLeft: 4,
  },
  buttonText: {
    color: 'white', 
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 20,
  },
  commentPreview: {
    fontSize: 10,
    color: BRAND_COLORS.primaryBlue,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 4,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  noPhotosContainer: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    width: '100%',
  },
  noPhotosText: {
    textAlign: 'center',
    marginBottom: 10,
    color: '#666',
  },
  dialogText: {
    marginBottom: 16,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 10,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
  },
});

export default ChecklistItem;