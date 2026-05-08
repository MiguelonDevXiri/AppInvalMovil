import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Button, Divider, ProgressBar, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, GRADIENTS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';
import { inspectionToParams, paramsToInspection, type MantenimientoChecklistItem, type MantenimientoInspection } from '../../utils/mantenimientoStorage';

/* ─── helpers ─── */
const normalizeCategory = (v: string) => v.trim() || 'Checklist';

interface CategoryGroup {
  category: string;
  rows: { item: MantenimientoChecklistItem; index: number }[];
}

/* ─── screen ─── */
export default function MantenimientoChecklistFormScreen() {
  const params = useLocalSearchParams();
  const [inspection, setInspection] = useState<MantenimientoInspection>(() => paramsToInspection(params));

  /* category paging — like Renoves */
  const categories = useMemo<CategoryGroup[]>(() => {
    const grouped: CategoryGroup[] = [];
    inspection.checklist.forEach((item, index) => {
      const name = normalizeCategory(item.category);
      let group = grouped.find((g) => g.category === name);
      if (!group) { group = { category: name, rows: [] }; grouped.push(group); }
      group.rows.push({ item, index });
    });
    return grouped;
  }, [inspection.checklist]);

  const [currentCategory, setCurrentCategory] = useState(0);

  /* progress */
  const completedItems = inspection.checklist.filter((i) => i.status).length;
  const totalItems = inspection.checklist.length;
  const progress = totalItems > 0 ? completedItems / totalItems : 0;

  /* photo-comment modal state */
  const [commentDialogVisible, setCommentDialogVisible] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [currentComment, setCurrentComment] = useState('');

  /* "no se puede" modal state */
  const [cantDoDialogVisible, setCantDoDialogVisible] = useState(false);
  const [cantDoItemIndex, setCantDoItemIndex] = useState<number | null>(null);
  const [cantDoText, setCantDoText] = useState('');

  /* ─── checklist mutations ─── */
  const updateChecklist = (index: number, patch: Partial<MantenimientoChecklistItem>) => {
    setInspection((prev) => ({
      ...prev,
      checklist: prev.checklist.map((item, idx) => (idx === index ? { ...item, ...patch } : item)),
    }));
  };

  const handleStatusChange = (index: number, status: string) => {
    updateChecklist(index, { status });
  };

  /* ─── photos ─── */
  const handleAddPhoto = async (index: number) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permisos requeridos', 'Se necesitan permisos para usar la cámara'); return; }
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, aspect: [4, 3], quality: 0.7 });
      if (!result.canceled && result.assets?.[0]?.uri) {
        const item = inspection.checklist[index];
        const newPhotos = [...(item.photos || []), result.assets[0].uri];
        updateChecklist(index, { photos: newPhotos });
        setSelectedItemIndex(index);
        setSelectedPhotoIndex(newPhotos.length - 1);
        setCurrentComment('');
        setCommentDialogVisible(true);
      }
    } catch (error) {
      console.error('Error al tomar la foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto. Inténtalo de nuevo.');
    }
  };

  const handleChooseFromGallery = async (index: number) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permisos requeridos', 'Se necesitan permisos para acceder a la galería'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, aspect: [4, 3], quality: 0.7, allowsMultipleSelection: true, selectionLimit: 5 });
      if (!result.canceled && result.assets?.length) {
        const item = inspection.checklist[index];
        const nextPhotos = [...(item.photos || [])];
        let lastAddedIndex = -1;
        result.assets.forEach((asset) => {
          if (asset.uri && !nextPhotos.includes(asset.uri)) { nextPhotos.push(asset.uri); lastAddedIndex = nextPhotos.length - 1; }
        });
        updateChecklist(index, { photos: nextPhotos });
        if (lastAddedIndex >= 0) {
          setSelectedItemIndex(index);
          setSelectedPhotoIndex(lastAddedIndex);
          setCurrentComment('');
          setCommentDialogVisible(true);
        }
      }
    } catch (error) {
      console.error('Error al seleccionar imágenes:', error);
      Alert.alert('Error', 'No se pudieron seleccionar las imágenes.');
    }
  };

  const handleRemovePhoto = (index: number, photoIndex: number) => {
    Alert.alert('Eliminar foto', '¿Estás seguro de que quieres eliminar esta foto?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => {
        const item = inspection.checklist[index];
        updateChecklist(index, { photos: (item.photos || []).filter((_, idx) => idx !== photoIndex) });
      }},
    ]);
  };

  const handleEditComment = (index: number, _photoIndex: number) => {
    setCurrentComment(inspection.checklist[index]?.comment || '');
    setSelectedItemIndex(index);
    setSelectedPhotoIndex(_photoIndex);
    setCommentDialogVisible(true);
  };

  const handleSaveComment = () => {
    if (selectedItemIndex === null) return;
    updateChecklist(selectedItemIndex, { comment: currentComment });
    setCommentDialogVisible(false);
    setSelectedItemIndex(null);
    setSelectedPhotoIndex(null);
  };

  /* ─── "no se puede" ─── */
  const handleCantDo = (index: number) => {
    setCantDoItemIndex(index);
    setCantDoText(inspection.checklist[index]?.comment || '');
    setCantDoDialogVisible(true);
  };

  const handleSaveCantDo = () => {
    if (cantDoItemIndex === null) return;
    if (!cantDoText.trim()) {
      Alert.alert('Comentario requerido', 'Debes indicar por qué no se puede revisar este punto.');
      return;
    }
    updateChecklist(cantDoItemIndex, { status: 'cant', comment: cantDoText.trim() });
    setCantDoDialogVisible(false);
    setCantDoItemIndex(null);
    setCantDoText('');
  };

  /* ─── navigation ─── */
  const handlePrevCategory = () => { if (currentCategory > 0) setCurrentCategory(currentCategory - 1); };
  const handleNextCategory = () => { if (currentCategory < categories.length - 1) setCurrentCategory(currentCategory + 1); };

  const handleFinishChecklist = () => {
    // Validate: "mal" needs photo, "no se puede" needs comment
    const failWithoutPhoto = inspection.checklist.filter((item) => item.status === 'fail' && (!item.photos || item.photos.length === 0));
    if (failWithoutPhoto.length > 0) {
      Alert.alert('Fotos requeridas', `Hay ${failWithoutPhoto.length} punto(s) marcados como "Mal" sin foto de evidencia.`);
      return;
    }
    const cantWithoutComment = inspection.checklist.filter((item) => item.status === 'cant' && !item.comment?.trim());
    if (cantWithoutComment.length > 0) {
      Alert.alert('Comentarios requeridos', `Hay ${cantWithoutComment.length} punto(s) marcados como "No se puede" sin comentario.`);
      return;
    }

    if (completedItems < totalItems) {
      Alert.alert('Checklist incompleto', '¿Estás seguro de que quieres continuar? Aún hay ítems sin revisar.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Continuar', onPress: () => navigateToMaterials() },
      ]);
    } else {
      navigateToMaterials();
    }
  };

  const navigateToMaterials = () => {
    router.push({ pathname: '/(tabs)/mantenimiento-final-form' as any, params: inspectionToParams(inspection) });
  };

  /* ─── loading/empty states ─── */
  if (categories.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <Text style={styles.loadingText}>No hay checklist configurado para este mantenimiento.</Text>
        <Button mode="contained" onPress={navigateToMaterials} buttonColor={BRAND_COLORS.primaryOrange} style={styles.returnButton}>Continuar</Button>
      </SafeAreaView>
    );
  }

  const currentCategoryData = categories[currentCategory];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header — idéntico a Renoves */}
        <LinearGradient
          colors={GRADIENTS.primary as unknown as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
          </TouchableOpacity>
          <Text style={styles.machineTitle}>{inspection.brand || inspection.machineType || 'Mantenimiento'}</Text>
          <Text style={styles.clientName}>Cliente: {inspection.clientName || 'Sin cliente'}</Text>
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>Progreso: {Math.round(progress * 100)}%</Text>
            <ProgressBar progress={progress} color={BRAND_COLORS.primaryOrange} style={styles.progressBar} />
          </View>
        </LinearGradient>

        {/* Category header — idéntico a Renoves */}
        <View style={styles.categoryHeader}>
          <Text style={styles.categoryTitle}>{currentCategoryData.category}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryCount}>{currentCategory + 1}/{categories.length}</Text>
          </View>
        </View>

        {/* Checklist items — idéntico a Renoves */}
        <View style={styles.checklistItems}>
          {currentCategoryData.rows.map(({ item, index }) => {
            const status = item.status || null;
            const photoUris = item.photos || [];

            return (
              <View key={`${item.id}-${index}`} style={styles.itemContainer}>
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
                        onPress={() => handleStatusChange(index, s)}
                      >
                        <Text style={isActive ? styles.statusButtonTextActive : styles.statusButtonText}>{labels[s]}</Text>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity
                    style={[styles.statusButton, status === 'cant' ? { backgroundColor: '#7c3aed' } : styles.statusButtonOutline]}
                    onPress={() => handleCantDo(index)}
                  >
                    <Text style={status === 'cant' ? styles.statusButtonTextActive : styles.statusButtonText}>No se puede</Text>
                  </TouchableOpacity>
                </View>

                {/* Motivo "no se puede" */}
                {status === 'cant' && item.comment ? (
                  <View style={{ backgroundColor: '#f3f0ff', padding: 8, borderRadius: 8, marginTop: 6, borderLeftWidth: 3, borderLeftColor: '#7c3aed' }}>
                    <Text style={{ fontSize: 12, color: '#5b21b6', fontWeight: '600' }}>Motivo: {item.comment}</Text>
                  </View>
                ) : null}

                {/* Evidence section (fail or cant) — idéntico a Renoves */}
                {(status === 'fail' || status === 'cant') ? (
                  <View style={styles.photoSection}>
                    {photoUris.length > 0 ? (
                      <>
                        <Text style={styles.photosTitle}>Evidencias ({photoUris.length})</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScrollView}>
                          {photoUris.map((uri, photoIndex) => (
                            <View key={`${item.id}_photo_${photoIndex}`} style={styles.photoContainer}>
                              <Image source={{ uri }} style={styles.photo} resizeMode="cover" />
                              <View style={styles.photoButtons}>
                                <TouchableOpacity style={styles.deletePhotoButton} onPress={() => handleRemovePhoto(index, photoIndex)}>
                                  <MaterialCommunityIcons name="close" size={14} color="white" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.commentPhotoButton} onPress={() => handleEditComment(index, photoIndex)}>
                                  <MaterialCommunityIcons name="pencil" size={14} color="white" />
                                </TouchableOpacity>
                              </View>
                              {item.comment ? <Text style={styles.commentPreview} numberOfLines={1}>{item.comment}</Text> : null}
                            </View>
                          ))}
                        </ScrollView>
                      </>
                    ) : null}

                    <View style={styles.photoActions}>
                      <Button mode="outlined" onPress={() => handleAddPhoto(index)} icon="camera" style={styles.actionButton} textColor={BRAND_COLORS.primaryBlue} compact>
                        Cámara
                      </Button>
                      <Button mode="outlined" onPress={() => handleChooseFromGallery(index)} icon="image-multiple" style={styles.actionButton} textColor={BRAND_COLORS.primaryBlue} compact>
                        Galería
                      </Button>
                    </View>
                  </View>
                ) : null}

                <Divider style={styles.itemDivider} />
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom navigation — idéntico a Renoves */}
      <SafeAreaView style={styles.buttonSafeArea} edges={['bottom']}>
        <View style={styles.buttonsContainer}>
          <Button
            mode="outlined"
            onPress={handlePrevCategory}
            disabled={currentCategory === 0}
            style={styles.navButton}
            icon="arrow-left"
            textColor={BRAND_COLORS.primaryBlue}
          >
            Anterior
          </Button>

          {currentCategory < categories.length - 1 ? (
            <Button
              mode="contained"
              onPress={handleNextCategory}
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

      {/* Comment modal — idéntico a Renoves */}
      {commentDialogVisible ? (
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
      ) : null}

      {/* "No se puede" modal — idéntico a Renoves */}
      {cantDoDialogVisible ? (
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
              <Button onPress={() => { setCantDoDialogVisible(false); setCantDoItemIndex(null); }} textColor={BRAND_COLORS.grayDark}>Cancelar</Button>
              <Button onPress={handleSaveCantDo} textColor={'#7c3aed'}>Guardar</Button>
            </View>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

/* ─── styles — copiados de checklist.tsx (Renoves) ─── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND_COLORS.surface },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: SPACING.md },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BRAND_COLORS.surface },
  loadingText: { color: BRAND_COLORS.grayText, fontSize: TYPOGRAPHY.sizes.md },
  returnButton: { marginTop: SPACING.md, borderRadius: BORDER_RADIUS.md },
  header: { padding: SPACING.lg, paddingBottom: SPACING.xl, paddingTop: SPACING.md },
  backButton: { position: 'absolute', left: 12, top: 12, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  machineTitle: { fontSize: TYPOGRAPHY.sizes.xxl, fontWeight: TYPOGRAPHY.weights.bold as any, color: 'white', letterSpacing: 0.2 },
  clientName: { fontSize: TYPOGRAPHY.sizes.sm, color: 'rgba(255,255,255,0.75)', marginTop: SPACING.xs },
  progressContainer: { marginTop: SPACING.lg },
  progressText: { marginBottom: SPACING.sm, fontSize: TYPOGRAPHY.sizes.sm, color: 'rgba(255,255,255,0.9)', fontWeight: TYPOGRAPHY.weights.semibold as any },
  progressBar: { height: 6, borderRadius: BORDER_RADIUS.full, backgroundColor: 'rgba(255,255,255,0.15)' },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg, backgroundColor: BRAND_COLORS.tertiaryBlue, borderBottomWidth: 0, borderLeftWidth: 4, borderLeftColor: BRAND_COLORS.primaryOrange },
  categoryTitle: { fontSize: TYPOGRAPHY.sizes.lg, fontWeight: TYPOGRAPHY.weights.bold as any, color: BRAND_COLORS.primaryBlue, flex: 1 },
  categoryBadge: { backgroundColor: BRAND_COLORS.primaryBlue, paddingHorizontal: SPACING.sm + 4, paddingVertical: SPACING.xs + 2, borderRadius: BORDER_RADIUS.full },
  categoryCount: { fontSize: TYPOGRAPHY.sizes.xs, color: 'white', fontWeight: TYPOGRAPHY.weights.bold as any },
  checklistItems: { padding: SPACING.lg },
  itemContainer: { marginBottom: SPACING.md, backgroundColor: 'white', borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, ...SHADOWS.soft },
  itemText: { fontSize: TYPOGRAPHY.sizes.md, marginBottom: SPACING.sm + 2, color: '#1e293b', fontWeight: TYPOGRAPHY.weights.medium as any, lineHeight: 22 },
  statusButtons: { flexDirection: 'row', gap: SPACING.sm },
  statusButton: { flex: 1, padding: SPACING.sm + 2, borderRadius: BORDER_RADIUS.lg, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  statusButtonOutline: { borderWidth: 1.5, borderColor: BRAND_COLORS.grayMedium, backgroundColor: BRAND_COLORS.grayLight },
  statusButtonText: { color: BRAND_COLORS.grayDark, fontWeight: TYPOGRAPHY.weights.medium as any, fontSize: TYPOGRAPHY.sizes.sm },
  statusButtonTextActive: { color: 'white', fontWeight: TYPOGRAPHY.weights.bold as any, fontSize: TYPOGRAPHY.sizes.sm },
  photoSection: { marginTop: SPACING.sm, backgroundColor: BRAND_COLORS.errorLight, padding: SPACING.sm, borderRadius: BORDER_RADIUS.md },
  photosTitle: { fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.bold as any, color: BRAND_COLORS.primaryBlue, marginBottom: SPACING.sm },
  photosScrollView: { marginBottom: SPACING.sm },
  photoContainer: { position: 'relative', marginRight: SPACING.sm, borderRadius: BORDER_RADIUS.md, overflow: 'hidden', width: 110 },
  photo: { width: 110, height: 110, borderRadius: BORDER_RADIUS.md },
  photoButtons: { flexDirection: 'row', position: 'absolute', top: 4, right: 4, gap: 4 },
  deletePhotoButton: { width: 24, height: 24, borderRadius: BORDER_RADIUS.full, backgroundColor: 'rgba(220, 38, 38, 0.8)', justifyContent: 'center', alignItems: 'center' },
  commentPhotoButton: { width: 24, height: 24, borderRadius: BORDER_RADIUS.full, backgroundColor: 'rgba(30, 58, 138, 0.8)', justifyContent: 'center', alignItems: 'center' },
  commentPreview: { fontSize: TYPOGRAPHY.sizes.xs - 2, color: BRAND_COLORS.primaryBlue, backgroundColor: 'rgba(255, 255, 255, 0.9)', padding: SPACING.xs, position: 'absolute', bottom: 0, left: 0, right: 0, textAlign: 'center' },
  photoActions: { flexDirection: 'row', gap: SPACING.sm },
  actionButton: { flex: 1, borderColor: BRAND_COLORS.primaryBlue, borderRadius: BORDER_RADIUS.md },
  itemDivider: { marginTop: 0, height: 0 },
  buttonSafeArea: { backgroundColor: 'white' },
  buttonsContainer: { flexDirection: 'row', justifyContent: 'space-between', padding: SPACING.md, paddingTop: SPACING.md + 2, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: BRAND_COLORS.grayLight, ...SHADOWS.soft },
  navButton: { flex: 1, marginHorizontal: SPACING.sm, borderRadius: BORDER_RADIUS.lg },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: 'white', borderRadius: BORDER_RADIUS.xl + 4, padding: SPACING.xl, width: '88%', maxWidth: 400, ...SHADOWS.large },
  modalTitle: { fontSize: TYPOGRAPHY.sizes.xl, fontWeight: TYPOGRAPHY.weights.bold as any, marginBottom: SPACING.md, color: BRAND_COLORS.primaryBlue },
  commentInput: { borderWidth: 1.5, borderColor: BRAND_COLORS.grayMedium, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, backgroundColor: BRAND_COLORS.grayLight, textAlignVertical: 'top', minHeight: 90, fontSize: TYPOGRAPHY.sizes.md },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: SPACING.lg, gap: SPACING.sm },
});
