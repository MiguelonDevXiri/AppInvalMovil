import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Button, Divider, ProgressBar, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, GRADIENTS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';
import { getChecklistByMachineType } from '../../data/machineChecklists';
import { ChecklistMaterial, getChecklistByMachineId, getMachineById, Machine, saveChecklist } from '../../utils/storage';

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
  const { machineId, returnTo: returnToParam } = useLocalSearchParams();
  const returnTo = typeof returnToParam === 'string' ? returnToParam : Array.isArray(returnToParam) ? returnToParam[0] : undefined;
  const [machine, setMachine] = useState<Machine | null>(null);
  const [checklistCategories, setChecklistCategories] = useState<ChecklistCategory[]>([]);
  const [checklistResults, setChecklistResults] = useState<ChecklistResults>({});
  const [photos, setPhotos] = useState<Photos>({});
  const [materials, setMaterials] = useState<ChecklistMaterial[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentCategory, setCurrentCategory] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savingText, setSavingText] = useState('Guardando checklist...');

  const [commentDialogVisible, setCommentDialogVisible] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [currentComment, setCurrentComment] = useState('');
  
  // "No se puede" comments
  const [cantDoComments, setCantDoComments] = useState<{ [key: string]: string }>({});
  const [cantDoDialogVisible, setCantDoDialogVisible] = useState(false);
  const [cantDoItemId, setCantDoItemId] = useState<string | null>(null);
  const [cantDoText, setCantDoText] = useState('');

  const getPhotoUri = (photo: any): string => {
    if (typeof photo === 'string') return photo;
    if (photo && typeof photo === 'object' && photo.uri) return photo.uri;
    return '';
  };

  const getPhotoComment = (photo: any): string | undefined => {
    if (typeof photo === 'object' && photo && photo.comment) return photo.comment;
    return undefined;
  };

  const transformPhotoFormat = (photoData: any): PhotoWithComment[] => {
    if (!photoData) return [];
    if (Array.isArray(photoData) && photoData.length > 0 && typeof photoData[0] === 'object' && 'uri' in photoData[0]) return photoData;
    if (Array.isArray(photoData)) return photoData.map(uri => ({ uri, comment: '' }));
    if (typeof photoData === 'string') return [{ uri: photoData, comment: '' }];
    return [];
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!machineId) return;
        setLoading(true);

        const foundMachine = await getMachineById(machineId.toString());
        if (foundMachine) {
          setMachine(foundMachine);
          const machineChecklist = getChecklistByMachineType(foundMachine.machineType || 'otros');
          setChecklistCategories(machineChecklist);
        }

        const savedChecklist = await getChecklistByMachineId(machineId.toString());
        if (savedChecklist) {
          setChecklistResults(savedChecklist.results || {});
          if (savedChecklist.photos) {
            const photosData: Photos = {};
            Object.entries(savedChecklist.photos).forEach(([itemId, photoData]) => {
              photosData[itemId] = transformPhotoFormat(photoData);
            });
            setPhotos(photosData);
          }
          if (savedChecklist.cantDoComments) {
            setCantDoComments(savedChecklist.cantDoComments);
          }
          if (savedChecklist.materials) {
            setMaterials(savedChecklist.materials);
          }
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
      const totalItems = checklistCategories.reduce((sum, category) => sum + category.items.length, 0);
      const completedItems = Object.keys(checklistResults).length;
      setProgress(totalItems > 0 ? completedItems / totalItems : 0);
    }
  }, [checklistResults, checklistCategories]);

  const handleStatusChange = (itemId: string, status: string) => {
    setChecklistResults({ ...checklistResults, [itemId]: status });
  };

  const handleAddPhoto = async (itemId: string) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permisos requeridos', 'Se necesitan permisos para usar la cámara'); return; }

      const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, aspect: [4, 3], quality: 0.7 });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newPhoto = { uri: result.assets[0].uri, comment: '' };
        const newPhotos = [...(photos[itemId] || []), newPhoto];
        setPhotos({ ...photos, [itemId]: newPhotos });
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
      if (status !== 'granted') { Alert.alert('Permisos requeridos', 'Se necesitan permisos para acceder a la galería'); return; }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, aspect: [4, 3], quality: 0.7, allowsMultipleSelection: true, selectionLimit: 5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const currentPhotos = photos[itemId] || [];
        const newPhotos = [...currentPhotos];
        let lastAddedIndex = -1;
        result.assets.forEach(asset => {
          const exists = newPhotos.some(p => getPhotoUri(p) === asset.uri);
          if (!exists) { newPhotos.push({ uri: asset.uri, comment: '' }); lastAddedIndex = newPhotos.length - 1; }
        });
        setPhotos({ ...photos, [itemId]: newPhotos });
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
    Alert.alert('Eliminar foto', '¿Estás seguro de que quieres eliminar esta foto?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => {
        const newPhotos = (photos[itemId] || []).filter((_, idx) => idx !== photoIndex);
        setPhotos({ ...photos, [itemId]: newPhotos });
      }},
    ]);
  };

  const handleEditComment = (itemId: string, photoIndex: number) => {
    const photo = (photos[itemId] || [])[photoIndex];
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
    newPhotos[selectedPhotoIndex] = { uri: getPhotoUri(photo), comment: currentComment };
    setPhotos({ ...photos, [selectedItemId]: newPhotos });
    setCommentDialogVisible(false);
    setSelectedItemId(null);
    setSelectedPhotoIndex(null);
  };

  const handleCantDo = (itemId: string) => {
    setCantDoItemId(itemId);
    setCantDoText(cantDoComments[itemId] || '');
    setCantDoDialogVisible(true);
  };

  const handleSaveCantDo = () => {
    if (!cantDoItemId) return;
    if (!cantDoText.trim()) {
      Alert.alert('Comentario requerido', 'Debes indicar por qué no se puede revisar este punto.');
      return;
    }
    setChecklistResults({ ...checklistResults, [cantDoItemId]: 'cant' });
    setCantDoComments({ ...cantDoComments, [cantDoItemId]: cantDoText.trim() });
    setCantDoDialogVisible(false);
    setCantDoItemId(null);
    setCantDoText('');
  };

  const handlePrevCategory = () => { if (currentCategory > 0) setCurrentCategory(currentCategory - 1); };
  const handleNextCategory = () => { if (currentCategory < checklistCategories.length - 1) setCurrentCategory(currentCategory + 1); };

  const handleFinishChecklist = async () => {
    try {
      const totalItems = checklistCategories.reduce((sum, category) => sum + category.items.length, 0);
      if (Object.keys(checklistResults).length < totalItems) {
        Alert.alert('Checklist incompleto', '¿Estás seguro de que quieres continuar? Aún hay ítems sin revisar.', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Continuar', onPress: () => saveAndContinue() },
        ]);
      } else { saveAndContinue(); }
    } catch (error) {
      console.error('Error al finalizar el checklist:', error);
      Alert.alert('Error', 'Error al guardar los datos. Inténtalo de nuevo.');
    }
  };

  const saveAndContinue = async () => {
    try {
      if (!machineId) return;
      setSavingText('Guardando checklist...');
      setIsSaving(true);
      await saveChecklist({ machineId: machineId.toString(), results: checklistResults, photos, completedAt: new Date().toISOString(), cantDoComments, materials });
      setIsSaving(false);
      if (returnTo) {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace({ pathname: returnTo as any, params: { machineId: machineId.toString() } });
        }
        return;
      }
      setSavingText('Preparando materiales...');
      router.push({ pathname: '/checklist-materials', params: { machineId: machineId.toString() } });
    } catch (error) {
      console.error('Error al guardar el checklist:', error);
      setIsSaving(false);
      Alert.alert('Error', 'Error al guardar los datos. Inténtalo de nuevo.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <Text style={styles.loadingText}>Cargando datos...</Text>
      </SafeAreaView>
    );
  }

  if (!machine) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <Text style={styles.loadingText}>No se encontraron datos para esta máquina.</Text>
        <Button mode="contained" onPress={() => router.replace('/')} style={styles.returnButton} buttonColor={BRAND_COLORS.primaryOrange}>
          Volver al inicio
        </Button>
      </SafeAreaView>
    );
  }

  if (checklistCategories.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <Text style={styles.loadingText}>Cargando categorías del checklist...</Text>
      </SafeAreaView>
    );
  }

  const currentCategoryData = checklistCategories[currentCategory];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={GRADIENTS.primary as unknown as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => router.back()} style={{position:'absolute',left:12,top:12,zIndex:10,width:36,height:36,borderRadius:18,backgroundColor:'rgba(255,255,255,0.2)',justifyContent:'center',alignItems:'center'}}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
          </TouchableOpacity>
          <Text style={styles.machineTitle}>{machine.name}</Text>
          <Text style={styles.clientName}>Cliente: {machine.clientName}</Text>
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>Progreso: {Math.round(progress * 100)}%</Text>
            <ProgressBar progress={progress} color={BRAND_COLORS.primaryOrange} style={styles.progressBar} />
          </View>
        </LinearGradient>

        <View style={styles.categoryHeader}>
          <Text style={styles.categoryTitle}>{currentCategoryData.category}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryCount}>{currentCategory + 1}/{checklistCategories.length}</Text>
          </View>
        </View>

        <View style={styles.checklistItems}>
          {currentCategoryData.items.map(item => {
            const status = checklistResults[item.id] || null;
            const photoUris = photos[item.id] || [];

            return (
              <View key={item.id} style={styles.itemContainer}>
                <Text style={styles.itemText}>{item.text}</Text>
                <View style={styles.statusButtons}>
                  {(['ok', 'fail', 'na'] as const).map((s) => {
                    const labels = { ok: 'Bien', fail: 'Mal', na: 'N/A' };
                    const activeColors = { ok: BRAND_COLORS.success, fail: BRAND_COLORS.error, na: BRAND_COLORS.grayDark };
                    const isActive = status === s;
                    return (
                      <TouchableOpacity
                        key={s}
                        style={[styles.statusButton, isActive ? { backgroundColor: activeColors[s] } : styles.statusButtonOutline]}
                        onPress={() => handleStatusChange(item.id, s)}
                      >
                        <Text style={isActive ? styles.statusButtonTextActive : styles.statusButtonText}>{labels[s]}</Text>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity
                    style={[styles.statusButton, status === 'cant' ? { backgroundColor: '#7c3aed' } : styles.statusButtonOutline]}
                    onPress={() => handleCantDo(item.id)}
                  >
                    <Text style={status === 'cant' ? styles.statusButtonTextActive : styles.statusButtonText}>No se puede</Text>
                  </TouchableOpacity>
                </View>
                {status === 'cant' && cantDoComments[item.id] && (
                  <View style={{ backgroundColor: '#f3f0ff', padding: 8, borderRadius: 8, marginTop: 6, borderLeftWidth: 3, borderLeftColor: '#7c3aed' }}>
                    <Text style={{ fontSize: 12, color: '#5b21b6', fontWeight: '600' }}>Motivo: {cantDoComments[item.id]}</Text>
                  </View>
                )}

                {(status === 'fail' || status === 'cant') && (
                  <View style={styles.photoSection}>
                    {photoUris.length > 0 && (
                      <>
                        <Text style={styles.photosTitle}>Evidencias ({photoUris.length})</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScrollView}>
                          {photoUris.map((photo, index) => {
                            const uri = getPhotoUri(photo);
                            const comment = getPhotoComment(photo);
                            return (
                              <View key={`${item.id}_photo_${index}`} style={styles.photoContainer}>
                                <Image source={{ uri }} style={styles.photo} resizeMode="cover" />
                                <View style={styles.photoButtons}>
                                  <TouchableOpacity style={styles.deleteButton} onPress={() => handleRemovePhoto(item.id, index)}>
                                    <MaterialCommunityIcons name="close" size={14} color="white" />
                                  </TouchableOpacity>
                                  <TouchableOpacity style={styles.commentButton} onPress={() => handleEditComment(item.id, index)}>
                                    <MaterialCommunityIcons name="pencil" size={14} color="white" />
                                  </TouchableOpacity>
                                </View>
                                {comment ? <Text style={styles.commentPreview} numberOfLines={1}>{comment}</Text> : null}
                              </View>
                            );
                          })}
                        </ScrollView>
                      </>
                    )}

                    <View style={styles.photoActions}>
                      <Button mode="outlined" onPress={() => handleAddPhoto(item.id)} icon="camera" style={styles.actionButton} textColor={BRAND_COLORS.primaryBlue} compact>
                        Cámara
                      </Button>
                      <Button mode="outlined" onPress={() => handleChooseFromGallery(item.id)} icon="image-multiple" style={styles.actionButton} textColor={BRAND_COLORS.primaryBlue} compact>
                        Galería
                      </Button>
                    </View>
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
            disabled={currentCategory === 0 || isSaving}
            style={styles.navButton}
            icon="arrow-left"
            textColor={BRAND_COLORS.primaryBlue}
          >
            Anterior
          </Button>

          {currentCategory < checklistCategories.length - 1 ? (
            <Button
              mode="contained"
              onPress={handleNextCategory}
              disabled={isSaving}
              style={styles.navButton}
              icon="arrow-right"
              contentStyle={{ flexDirection: 'row-reverse' }}
              buttonColor={BRAND_COLORS.primaryBlue}
            >
              Siguiente
            </Button>
          ) : (
            <Button
              mode="contained"
              onPress={handleFinishChecklist}
              disabled={isSaving}
              style={styles.navButton}
              icon="check"
              contentStyle={{ flexDirection: 'row-reverse' }}
              buttonColor={BRAND_COLORS.primaryOrange}
            >
              Finalizar
            </Button>
          )}
        </View>
      </SafeAreaView>

      {isSaving && (
        <View style={styles.savingOverlay}>
          <View style={styles.savingCard}>
            <ActivityIndicator size="large" color={BRAND_COLORS.primaryBlue} />
            <Text style={styles.savingTitle}>{savingText}</Text>
            <Text style={styles.savingSubtitle}>Espera un momento, estamos preparando la siguiente pantalla.</Text>
          </View>
        </View>
      )}

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
              <Button onPress={() => setCommentDialogVisible(false)} textColor={BRAND_COLORS.grayDark}>Cancelar</Button>
              <Button onPress={handleSaveComment} textColor={BRAND_COLORS.primaryBlue}>Guardar</Button>
            </View>
          </View>
        </View>
      )}

      {cantDoDialogVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: '#7c3aed' }]}>¿Por qué no se puede?</Text>
            <Text style={{ fontSize: 13, color: BRAND_COLORS.grayText, marginBottom: 10 }}>Indica el motivo por el que no se ha podido revisar este punto.</Text>
            <TextInput
              style={styles.commentInput}
              multiline
              numberOfLines={3}
              value={cantDoText}
              onChangeText={setCantDoText}
              placeholder="Ej: No tiene luz, fuga de aceite, sin acceso..."
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Button onPress={() => { setCantDoDialogVisible(false); setCantDoItemId(null); }} textColor={BRAND_COLORS.grayDark}>Cancelar</Button>
              <Button onPress={handleSaveCantDo} textColor={'#7c3aed'}>Guardar</Button>
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
    backgroundColor: BRAND_COLORS.surface,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.surface,
  },
  loadingText: {
    color: BRAND_COLORS.grayText,
    fontSize: TYPOGRAPHY.sizes.md,
  },
  returnButton: {
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  header: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
    paddingTop: SPACING.md,
  },
  machineTitle: {
    fontSize: TYPOGRAPHY.sizes.xxl,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: 'white',
    letterSpacing: 0.2,
  },
  clientName: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: 'rgba(255,255,255,0.75)',
    marginTop: SPACING.xs,
  },
  progressContainer: {
    marginTop: SPACING.lg,
  },
  progressText: {
    marginBottom: SPACING.sm,
    fontSize: TYPOGRAPHY.sizes.sm,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: TYPOGRAPHY.weights.semibold as any,
  },
  progressBar: {
    height: 6,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: BRAND_COLORS.tertiaryBlue,
    borderBottomWidth: 0,
    borderLeftWidth: 4,
    borderLeftColor: BRAND_COLORS.primaryOrange,
  },
  categoryTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: BRAND_COLORS.primaryBlue,
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: BRAND_COLORS.primaryBlue,
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: SPACING.xs + 2,
    borderRadius: BORDER_RADIUS.full,
  },
  categoryCount: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: 'white',
    fontWeight: TYPOGRAPHY.weights.bold as any,
  },
  checklistItems: {
    padding: SPACING.lg,
  },
  itemContainer: {
    marginBottom: SPACING.md,
    backgroundColor: 'white',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.soft,
  },
  itemText: {
    fontSize: TYPOGRAPHY.sizes.md,
    marginBottom: SPACING.sm + 2,
    color: '#1e293b',
    fontWeight: TYPOGRAPHY.weights.medium as any,
    lineHeight: 22,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  statusButton: {
    flex: 1,
    padding: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  statusButtonOutline: {
    borderWidth: 1.5,
    borderColor: BRAND_COLORS.grayMedium,
    backgroundColor: BRAND_COLORS.grayLight,
  },
  statusButtonText: {
    color: BRAND_COLORS.grayDark,
    fontWeight: TYPOGRAPHY.weights.medium as any,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  statusButtonTextActive: {
    color: 'white',
    fontWeight: TYPOGRAPHY.weights.bold as any,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  photoSection: {
    marginTop: SPACING.sm,
    backgroundColor: BRAND_COLORS.errorLight,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  photosTitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: BRAND_COLORS.primaryBlue,
    marginBottom: SPACING.sm,
  },
  photosScrollView: {
    marginBottom: SPACING.sm,
  },
  photoContainer: {
    position: 'relative',
    marginRight: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    width: 110,
  },
  photo: {
    width: 110,
    height: 110,
    borderRadius: BORDER_RADIUS.md,
  },
  photoButtons: {
    flexDirection: 'row',
    position: 'absolute',
    top: 4,
    right: 4,
    gap: 4,
  },
  deleteButton: {
    width: 24,
    height: 24,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(220, 38, 38, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentButton: {
    width: 24,
    height: 24,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(30, 58, 138, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentPreview: {
    fontSize: TYPOGRAPHY.sizes.xs - 2,
    color: BRAND_COLORS.primaryBlue,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: SPACING.xs,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  photoActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    borderColor: BRAND_COLORS.primaryBlue,
    borderRadius: BORDER_RADIUS.md,
  },
  itemDivider: {
    marginTop: 0,
    height: 0,
  },
  buttonSafeArea: {
    backgroundColor: 'white',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.md,
    paddingTop: SPACING.md + 2,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: BRAND_COLORS.grayLight,
    ...SHADOWS.soft,
  },
  navButton: {
    flex: 1,
    marginHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  savingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1100,
  },
  savingCard: {
    backgroundColor: 'white',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    width: '80%',
    maxWidth: 320,
    ...SHADOWS.large,
  },
  savingTitle: {
    marginTop: SPACING.md,
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: BRAND_COLORS.primaryBlue,
    textAlign: 'center',
  },
  savingSubtitle: {
    marginTop: SPACING.sm,
    fontSize: TYPOGRAPHY.sizes.sm,
    color: BRAND_COLORS.grayText,
    textAlign: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: BORDER_RADIUS.xl + 4,
    padding: SPACING.xl,
    width: '88%',
    maxWidth: 400,
    ...SHADOWS.large,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    marginBottom: SPACING.md,
    color: BRAND_COLORS.primaryBlue,
  },
  commentInput: {
    borderWidth: 1.5,
    borderColor: BRAND_COLORS.grayMedium,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    backgroundColor: BRAND_COLORS.grayLight,
    textAlignVertical: 'top',
    minHeight: 90,
    fontSize: TYPOGRAPHY.sizes.md,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
});
