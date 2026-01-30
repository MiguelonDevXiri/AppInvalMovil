import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Button, Divider, ProgressBar, Subheading, Text, Title } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND_COLORS } from '../../constants/Colors';
import { getChecklistByMachineType } from '../../data/machineChecklists';
import { getChecklistByMachineId, getMachineById, Machine, saveChecklist } from '../../utils/storage';

// Interfaces para tipos locales
interface ChecklistItemType {
  id: string;
  text: string;
}

interface ChecklistCategory {
  category: string;
  items: ChecklistItemType[];
}

interface ChecklistResults {
  [key: string]: string;
}

interface PhotoWithComment {
  uri: string;
  comment?: string;
}

interface Photos {
  [key: string]: PhotoWithComment[];
}

export default function ChecklistScreen() {
  const { machineId } = useLocalSearchParams();
  const [machine, setMachine] = useState<Machine | null>(null);
  const [checklistCategories, setChecklistCategories] = useState<ChecklistCategory[]>([]);
  const [checklistResults, setChecklistResults] = useState<ChecklistResults>({});
  const [photos, setPhotos] = useState<Photos>({});
  const [progress, setProgress] = useState(0);
  const [currentCategory, setCurrentCategory] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [commentDialogVisible, setCommentDialogVisible] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [currentComment, setCurrentComment] = useState('');

  const getPhotoUri = (photo: any): string => {
    if (typeof photo === 'string') {
      return photo;
    } else if (photo && typeof photo === 'object' && photo.uri) {
      return photo.uri;
    }
    return '';
  };

  const getPhotoComment = (photo: any): string | undefined => {
    if (typeof photo === 'object' && photo && photo.comment) {
      return photo.comment;
    }
    return undefined;
  };

  const transformPhotoFormat = (photoData: any): PhotoWithComment[] => {
    if (!photoData) return [];
    
    if (Array.isArray(photoData) && photoData.length > 0 && typeof photoData[0] === 'object' && 'uri' in photoData[0]) {
      return photoData;
    }
    
    if (Array.isArray(photoData)) {
      return photoData.map(uri => ({ uri, comment: '' }));
    }
    
    if (typeof photoData === 'string') {
      return [{ uri: photoData, comment: '' }];
    }
    
    return [];
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!machineId) {
          console.error("No se proporcionó ID de máquina");
          return;
        }
        
        setLoading(true);
        console.log("Cargando máquina con ID:", machineId.toString());
        
        const foundMachine = await getMachineById(machineId.toString());
        console.log("Máquina encontrada:", foundMachine);
        
        if (foundMachine) {
          setMachine(foundMachine);
          
          const machineChecklist = getChecklistByMachineType(foundMachine.machineType || 'otros');
          console.log("Checklist obtenido:", machineChecklist);
          setChecklistCategories(machineChecklist);
        } else {
          console.error("No se encontró la máquina con ID:", machineId.toString());
        }
        
        const savedChecklist = await getChecklistByMachineId(machineId.toString());
        if (savedChecklist) {
          console.log("Checklist guardado encontrado");
          setChecklistResults(savedChecklist.results || {});
          
          if (savedChecklist.photos) {
            const photosData: Photos = {};
            
            Object.entries(savedChecklist.photos).forEach(([itemId, photoData]) => {
              photosData[itemId] = transformPhotoFormat(photoData);
            });
            
            setPhotos(photosData);
          }
        } else {
          console.log("No hay checklist guardado para esta máquina");
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error al cargar los datos:', error);
        setLoading(false);
      }
    };

    loadData();
  }, [machineId]);

  useEffect(() => {
    if (checklistCategories.length > 0) {
      const totalItems = checklistCategories.reduce(
        (sum, category) => sum + category.items.length, 
        0
      );
      
      const completedItems = Object.keys(checklistResults).length;
      
      setProgress(totalItems > 0 ? completedItems / totalItems : 0);
    }
  }, [checklistResults, checklistCategories]);

  const handleStatusChange = (itemId: string, status: string) => {
    setChecklistResults({
      ...checklistResults,
      [itemId]: status
    });
  };

  const handleAddPhoto = async (itemId: string) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Se necesitan permisos para usar la cámara');
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        aspect: [4, 3],
        quality: 0.7,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newPhoto = {
          uri: result.assets[0].uri,
          comment: ''
        };
        
        const newPhotos = [...(photos[itemId] || []), newPhoto];
        const updatedPhotos = { ...photos };
        updatedPhotos[itemId] = newPhotos;
        setPhotos(updatedPhotos);
        
        setSelectedItemId(itemId);
        setSelectedPhotoIndex(newPhotos.length - 1);
        setCurrentComment('');
        setCommentDialogVisible(true);
      }
    } catch (error) {
      console.error('Error al tomar la foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto. Inténtalo de nuevo.');
    }
  };

  const handleChooseFromGallery = async (itemId: string) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Se necesitan permisos para acceder a la galería');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        aspect: [4, 3],
        quality: 0.7,
        allowsMultipleSelection: true,
        selectionLimit: 5,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const currentPhotos = photos[itemId] || [];
        const newPhotos = [...currentPhotos];
        let lastAddedIndex = -1;
        
        result.assets.forEach(asset => {
          const newPhoto = {
            uri: asset.uri,
            comment: ''
          };
          
          const exists = newPhotos.some(p => getPhotoUri(p) === asset.uri);
          
          if (!exists) {
            newPhotos.push(newPhoto);
            lastAddedIndex = newPhotos.length - 1;
          }
        });
        
        const updatedPhotos = { ...photos };
        updatedPhotos[itemId] = newPhotos;
        setPhotos(updatedPhotos);
        
        if (lastAddedIndex >= 0) {
          setSelectedItemId(itemId);
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

  const handleRemovePhoto = (itemId: string, photoIndex: number) => {
    Alert.alert(
      'Eliminar foto',
      '¿Estás seguro de que quieres eliminar esta foto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: () => {
            const itemPhotos = photos[itemId] || [];
            const newPhotos = itemPhotos.filter((_, idx) => idx !== photoIndex);
            
            const updatedPhotos = { ...photos };
            updatedPhotos[itemId] = newPhotos;
            setPhotos(updatedPhotos);
          }
        }
      ]
    );
  };

  const handleEditComment = (itemId: string, photoIndex: number) => {
    const itemPhotos = photos[itemId] || [];
    const photo = itemPhotos[photoIndex];
    setCurrentComment(getPhotoComment(photo) || '');
    
    setSelectedItemId(itemId);
    setSelectedPhotoIndex(photoIndex);
    setCommentDialogVisible(true);
  };

  const handleSaveComment = () => {
    if (!selectedItemId || selectedPhotoIndex === null) return;
    
    const itemPhotos = photos[selectedItemId] || [];
    const photo = itemPhotos[selectedPhotoIndex];
    const newPhotos = [...itemPhotos];
    
    newPhotos[selectedPhotoIndex] = {
      uri: getPhotoUri(photo),
      comment: currentComment
    };
    
    const updatedPhotos = { ...photos };
    updatedPhotos[selectedItemId] = newPhotos;
    setPhotos(updatedPhotos);
    
    setCommentDialogVisible(false);
    setSelectedItemId(null);
    setSelectedPhotoIndex(null);
  };

  const handlePrevCategory = () => {
    if (currentCategory > 0) {
      setCurrentCategory(currentCategory - 1);
    }
  };

  const handleNextCategory = () => {
    if (currentCategory < checklistCategories.length - 1) {
      setCurrentCategory(currentCategory + 1);
    }
  };

  const handleFinishChecklist = async () => {
    try {
      const totalItems = checklistCategories.reduce(
        (sum, category) => sum + category.items.length, 
        0
      );
      
      if (Object.keys(checklistResults).length < totalItems) {
        Alert.alert(
          'Checklist incompleto',
          '¿Estás seguro de que quieres continuar? Aún hay ítems sin revisar.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { 
              text: 'Continuar', 
              onPress: () => saveAndContinue() 
            }
          ]
        );
      } else {
        saveAndContinue();
      }
    } catch (error) {
      console.error('Error al finalizar el checklist:', error);
      Alert.alert('Error', 'Error al guardar los datos. Inténtalo de nuevo.');
    }
  };

  const saveAndContinue = async () => {
    try {
      if (!machineId) return;
      
      const checklistDataToSave = {
        machineId: machineId.toString(),
        results: checklistResults,
        photos: photos,
        completedAt: new Date().toISOString()
      };
      
      console.log("Guardando checklist:", checklistDataToSave);
      await saveChecklist(checklistDataToSave);
      
      console.log("Navegando a comentarios con ID:", machineId.toString());
      router.push({
        pathname: '/comments',
        params: { machineId: machineId.toString() }
      });
    } catch (error) {
      console.error('Error al guardar el checklist:', error);
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
    console.log("No se encontró la máquina, redirigiendo al inicio");
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <Text>No se encontraron datos para esta máquina.</Text>
        <Button
          mode="contained"
          onPress={() => router.replace('/')}
          style={{marginTop: 16}}
          color={BRAND_COLORS.primaryOrange}
        >
          Volver al inicio
        </Button>
      </SafeAreaView>
    );
  }

  if (checklistCategories.length === 0) {
    console.log("No hay categorías en el checklist, usando checklist por defecto");
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <Text>Cargando categorías del checklist...</Text>
      </SafeAreaView>
    );
  }

  const currentCategoryData = checklistCategories[currentCategory];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Title style={styles.machineTitle}>{machine.name}</Title>
          <Subheading>Cliente: {machine.clientName}</Subheading>
          
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              Progreso: {Math.round(progress * 100)}%
            </Text>
            <ProgressBar 
              progress={progress} 
              color={BRAND_COLORS.primaryOrange} 
              style={styles.progressBar}
            />
          </View>
        </View>
        
        <View style={styles.categoryHeader}>
          <Title style={styles.categoryTitle}>
            {currentCategoryData.category}
          </Title>
          <Text style={styles.categoryCount}>
            Categoría {currentCategory + 1} de {checklistCategories.length}
          </Text>
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.checklistItems}>
          {currentCategoryData.items.map(item => {
            const status = checklistResults[item.id] || null;
            const photoUris = photos[item.id] || [];
            
            return (
              <View key={item.id} style={styles.itemContainer}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemText}>{item.text}</Text>
                  <View style={styles.statusButtons}>
                    <TouchableOpacity
                      style={[
                        styles.statusButton,
                        status === 'ok' ? styles.okButton : styles.statusButtonOutline
                      ]}
                      onPress={() => handleStatusChange(item.id, 'ok')}
                    >
                      <Text style={status === 'ok' ? styles.statusButtonTextActive : styles.statusButtonText}>
                        Bien
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.statusButton,
                        status === 'fail' ? styles.failButton : styles.statusButtonOutline
                      ]}
                      onPress={() => handleStatusChange(item.id, 'fail')}
                    >
                      <Text style={status === 'fail' ? styles.statusButtonTextActive : styles.statusButtonText}>
                        Mal
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.statusButton,
                        status === 'na' ? styles.naButton : styles.statusButtonOutline
                      ]}
                      onPress={() => handleStatusChange(item.id, 'na')}
                    >
                      <Text style={status === 'na' ? styles.statusButtonTextActive : styles.statusButtonText}>
                        N/A
                      </Text>
                    </TouchableOpacity>
                  </View>
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
                                <View style={styles.photoButtons}>
                                  <TouchableOpacity
                                    style={[styles.photoButton, styles.deleteButton]}
                                    onPress={() => handleRemovePhoto(item.id, index)}
                                  >
                                    <Text style={styles.buttonText}>×</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={[styles.photoButton, styles.commentButton]}
                                    onPress={() => handleEditComment(item.id, index)}
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
                            onPress={() => handleAddPhoto(item.id)}
                            icon="camera"
                            style={styles.actionButton}
                            color={BRAND_COLORS.primaryBlue}
                          >
                            Tomar Foto
                          </Button>
                          
                          <Button 
                            mode="outlined" 
                            onPress={() => handleChooseFromGallery(item.id)}
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
                            onPress={() => handleAddPhoto(item.id)}
                            icon="camera"
                            style={styles.actionButton}
                            color={BRAND_COLORS.primaryBlue}
                          >
                            Tomar Foto
                          </Button>
                          
                          <Button 
                            mode="outlined" 
                            onPress={() => handleChooseFromGallery(item.id)}
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
                
                <Divider style={styles.itemDivider} />
              </View>
            );
          })}
        </View>
      </ScrollView>
      
      <SafeAreaView style={styles.buttonSafeArea} edges={['bottom']}>
        <View style={styles.buttonsContainer}>
          <Button 
            mode="outlined" 
            onPress={handlePrevCategory}
            disabled={currentCategory === 0}
            style={styles.navButton}
            icon="arrow-left"
            color={BRAND_COLORS.primaryBlue}
          >
            Anterior
          </Button>
          
          {currentCategory < checklistCategories.length - 1 ? (
            <Button 
              mode="contained" 
              onPress={handleNextCategory}
              style={styles.navButton}
              icon="arrow-right"
              contentStyle={{ flexDirection: 'row-reverse' }}
              color={BRAND_COLORS.primaryBlue}
            >
              Siguiente
            </Button>
          ) : (
            <Button 
              mode="contained" 
              onPress={handleFinishChecklist}
              style={styles.finishButton}
              icon="check"
              contentStyle={{ flexDirection: 'row-reverse' }}
            >
              Finalizar
            </Button>
          )}
        </View>
      </SafeAreaView>
      
      {commentDialogVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Comentario de la foto</Text>
            <TextInput
              style={styles.commentInput}
              multiline
              numberOfLines={4}
              value={currentComment}
              onChangeText={setCurrentComment}
              placeholder="Describe el problema o añade observaciones"
            />
            <View style={styles.modalButtons}>
              <Button onPress={() => setCommentDialogVisible(false)}>Cancelar</Button>
              <Button onPress={handleSaveComment}>Guardar</Button>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  machineTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: BRAND_COLORS.primaryBlue,
  },
  progressContainer: {
    marginTop: 16,
  },
  progressText: {
    marginBottom: 4,
    fontSize: 14,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#e3f2fd',
  },
  categoryTitle: {
    fontSize: 18,
    color: BRAND_COLORS.primaryBlue,
  },
  categoryCount: {
    fontSize: 14,
    color: BRAND_COLORS.grayDark,
  },
  divider: {
    height: 1,
    backgroundColor: BRAND_COLORS.primaryOrange,
  },
  checklistItems: {
    padding: 16,
    paddingBottom: 32,
  },
  itemContainer: {
    marginBottom: 16,
  },
  itemHeader: {
    marginBottom: 10,
  },
  itemText: {
    fontSize: 16,
    marginBottom: 8,
  },
  statusButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusButton: {
    flex: 1,
    padding: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statusButtonOutline: {
    borderWidth: 1,
    borderColor: '#ccc',
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
  statusButtonText: {
    color: '#333',
  },
  statusButtonTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  photoSection: {
    marginTop: 8,
    marginBottom: 12,
  },
  photosContainer: {
    width: '100%',
  },
  photosTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: BRAND_COLORS.primaryBlue,
    marginBottom: 8,
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
  photoButtons: {
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
  photoActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  itemDivider: {
    marginTop: 12,
  },
  buttonSafeArea: {
    backgroundColor: 'white',
  },
  buttonsContainer: {
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
  navButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  finishButton: {
    flex: 1,
    marginHorizontal: 8,
    backgroundColor: BRAND_COLORS.primaryOrange,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: BRAND_COLORS.primaryBlue,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 10,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
});