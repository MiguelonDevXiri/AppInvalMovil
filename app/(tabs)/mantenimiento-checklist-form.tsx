import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Button, ProgressBar, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, BRAND_COLORS, GRADIENTS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';
import { inspectionToParams, paramsToInspection, type MantenimientoChecklistItem, type MantenimientoInspection } from '../../utils/mantenimientoStorage';

type StatusKey = 'ok' | 'fail' | 'na' | 'cant';

const STATUS_LABELS: Record<StatusKey, string> = {
  ok: 'Bien',
  fail: 'Mal',
  na: 'N/A',
  cant: 'No se puede',
};

const STATUS_COLORS: Record<StatusKey, string> = {
  ok: BRAND_COLORS.success,
  fail: BRAND_COLORS.error,
  na: BRAND_COLORS.grayDark,
  cant: '#7c3aed',
};

const normalizeCategory = (value: string) => value.trim() || 'Checklist';
const needsEvidence = (status?: string) => status === 'fail' || status === 'cant';

function SummaryPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.summaryPill}>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

export default function MantenimientoChecklistFormScreen() {
  const params = useLocalSearchParams();
  const [inspection, setInspection] = useState<MantenimientoInspection>(() => paramsToInspection(params));
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [commentDialogVisible, setCommentDialogVisible] = useState(false);
  const [commentItemIndex, setCommentItemIndex] = useState<number | null>(null);
  const [commentText, setCommentText] = useState('');

  const categories = useMemo(() => {
    const grouped: { category: string; rows: { item: MantenimientoChecklistItem; index: number }[] }[] = [];
    inspection.checklist.forEach((item, index) => {
      const categoryName = normalizeCategory(item.category);
      let group = grouped.find((entry) => entry.category === categoryName);
      if (!group) {
        group = { category: categoryName, rows: [] };
        grouped.push(group);
      }
      group.rows.push({ item, index });
    });
    return grouped;
  }, [inspection.checklist]);

  useEffect(() => {
    setExpandedCategories((current) => {
      if (Object.keys(current).length > 0) return current;
      return Object.fromEntries(categories.map((entry) => [entry.category, true]));
    });
  }, [categories]);

  const completedItems = inspection.checklist.filter((item) => item.status).length;
  const progress = inspection.checklist.length > 0 ? completedItems / inspection.checklist.length : 0;
  const counts = useMemo(() => ({
    ok: inspection.checklist.filter((item) => item.status === 'ok').length,
    fail: inspection.checklist.filter((item) => item.status === 'fail').length,
    na: inspection.checklist.filter((item) => item.status === 'na').length,
    cant: inspection.checklist.filter((item) => item.status === 'cant').length,
  }), [inspection.checklist]);

  const updateChecklist = (index: number, patch: Partial<MantenimientoChecklistItem>) => {
    setInspection((prev) => ({
      ...prev,
      checklist: prev.checklist.map((item, idx) => (idx === index ? { ...item, ...patch } : item)),
    }));
  };

  const handleStatusChange = (index: number, status: StatusKey) => {
    const shouldKeepEvidence = needsEvidence(status);
    updateChecklist(index, {
      status,
      ...(!shouldKeepEvidence ? { comment: '', photos: [] } : {}),
    });
  };

  const handleAddPhoto = async (index: number) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Se necesitan permisos para usar la cámara.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, aspect: [4, 3], quality: 0.7 });
      if (!result.canceled && result.assets?.[0]?.uri) {
        const item = inspection.checklist[index];
        updateChecklist(index, { photos: [...(item.photos || []), result.assets[0].uri] });
      }
    } catch (error) {
      console.error('Error al tomar la foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto. Inténtalo de nuevo.');
    }
  };

  const handleChooseFromGallery = async (index: number) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Se necesitan permisos para acceder a la galería.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, aspect: [4, 3], quality: 0.7, allowsMultipleSelection: true, selectionLimit: 5 });
      if (!result.canceled && result.assets?.length) {
        const item = inspection.checklist[index];
        const nextPhotos = [...(item.photos || [])];
        result.assets.forEach((asset) => {
          if (asset.uri && !nextPhotos.includes(asset.uri)) nextPhotos.push(asset.uri);
        });
        updateChecklist(index, { photos: nextPhotos });
      }
    } catch (error) {
      console.error('Error al seleccionar imágenes:', error);
      Alert.alert('Error', 'No se pudieron seleccionar las imágenes. Inténtalo de nuevo.');
    }
  };

  const handleRemovePhoto = (index: number, photoIndex: number) => {
    Alert.alert('Eliminar foto', '¿Quieres eliminar esta evidencia?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          const item = inspection.checklist[index];
          updateChecklist(index, { photos: (item.photos || []).filter((_, idx) => idx !== photoIndex) });
        },
      },
    ]);
  };

  const openCommentDialog = (index: number) => {
    setCommentItemIndex(index);
    setCommentText(inspection.checklist[index]?.comment || '');
    setCommentDialogVisible(true);
  };

  const handleSaveComment = () => {
    if (commentItemIndex === null) return;
    const item = inspection.checklist[commentItemIndex];
    if (item.status === 'cant' && !commentText.trim()) {
      Alert.alert('Comentario requerido', 'Debes indicar por qué no se puede revisar este punto.');
      return;
    }
    updateChecklist(commentItemIndex, { comment: commentText.trim() });
    setCommentDialogVisible(false);
    setCommentItemIndex(null);
    setCommentText('');
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((current) => ({ ...current, [category]: !current[category] }));
  };

  const goNext = () => {
    if (completedItems < inspection.checklist.length) {
      Alert.alert('Checklist incompleto', '¿Quieres continuar? Aún hay puntos sin revisar.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Continuar', onPress: () => router.push({ pathname: '/(tabs)/mantenimiento-final-form' as any, params: inspectionToParams(inspection) }) },
      ]);
      return;
    }
    router.push({ pathname: '/(tabs)/mantenimiento-final-form' as any, params: inspectionToParams(inspection) });
  };

  if (categories.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <Text style={styles.loadingText}>No hay checklist configurado para este mantenimiento.</Text>
        <Button mode="contained" onPress={goNext} buttonColor={BRAND_COLORS.primaryOrange} style={styles.returnButton}>Continuar</Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <LinearGradient colors={GRADIENTS.primary as unknown as [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
          </TouchableOpacity>
          <Text style={styles.machineTitle}>{inspection.brand || inspection.machineType || 'Mantenimiento'}</Text>
          <Text style={styles.clientName}>Cliente: {inspection.clientName || 'Sin cliente'} · Matrícula: {inspection.licensePlate || '—'}</Text>
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>Progreso: {Math.round(progress * 100)}%</Text>
            <ProgressBar progress={progress} color={BRAND_COLORS.primaryOrange} style={styles.progressBar} />
          </View>
        </LinearGradient>

        <View style={styles.summaryRow}>
          <SummaryPill label="Bien" value={counts.ok} color={STATUS_COLORS.ok} />
          <SummaryPill label="Mal" value={counts.fail} color={STATUS_COLORS.fail} />
          <SummaryPill label="N/A" value={counts.na} color={STATUS_COLORS.na} />
          <SummaryPill label="No se puede" value={counts.cant} color={STATUS_COLORS.cant} />
        </View>

        <View style={styles.checklistItems}>
          {categories.map((categoryData) => {
            const expanded = expandedCategories[categoryData.category] !== false;
            return (
              <View key={categoryData.category} style={styles.categoryCard}>
                <TouchableOpacity style={styles.categoryHeader} onPress={() => toggleCategory(categoryData.category)} activeOpacity={0.85}>
                  <View style={styles.categoryTitleRow}>
                    <MaterialCommunityIcons name={expanded ? 'chevron-down' : 'chevron-right'} size={22} color={BRAND_COLORS.primaryOrange} />
                    <Text style={styles.categoryTitle}>{categoryData.category}</Text>
                  </View>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryCount}>{categoryData.rows.filter(({ item }) => item.status).length}/{categoryData.rows.length}</Text>
                  </View>
                </TouchableOpacity>
                {expanded ? categoryData.rows.map(({ item, index }) => {
                  const status = item.status as StatusKey | '';
                  const photos = item.photos || [];
                  return (
                    <View key={`${item.id}-${index}`} style={styles.itemContainer}>
                      <Text style={styles.itemText}>• {item.text}</Text>
                      <View style={styles.statusButtons}>
                        {(['ok', 'fail', 'na'] as const).map((key) => {
                          const isActive = status === key;
                          return (
                            <TouchableOpacity key={key} style={[styles.statusButton, isActive ? { backgroundColor: STATUS_COLORS[key] } : styles.statusButtonOutline]} onPress={() => handleStatusChange(index, key)}>
                              <Text style={isActive ? styles.statusButtonTextActive : styles.statusButtonText}>{STATUS_LABELS[key]}</Text>
                            </TouchableOpacity>
                          );
                        })}
                        <TouchableOpacity style={[styles.statusButton, status === 'cant' ? { backgroundColor: STATUS_COLORS.cant } : styles.statusButtonOutline]} onPress={() => { handleStatusChange(index, 'cant'); openCommentDialog(index); }}>
                          <Text style={status === 'cant' ? styles.statusButtonTextActive : styles.statusButtonText}>No se puede</Text>
                        </TouchableOpacity>
                      </View>

                      {needsEvidence(status) ? (
                        <View style={styles.photoSection}>
                          {item.comment ? (
                            <View style={status === 'cant' ? styles.cantCommentBox : styles.commentBox}>
                              <Text style={status === 'cant' ? styles.cantCommentText : styles.commentText}>{status === 'cant' ? 'Motivo' : 'Comentario'}: {item.comment}</Text>
                            </View>
                          ) : null}
                          {photos.length > 0 ? (
                            <>
                              <Text style={styles.photosTitle}>Evidencias ({photos.length})</Text>
                              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScrollView}>
                                {photos.map((uri, photoIndex) => (
                                  <View key={`${item.id}_photo_${photoIndex}`} style={styles.photoContainer}>
                                    <Image source={{ uri }} style={styles.photo} resizeMode="cover" />
                                    <TouchableOpacity style={styles.deleteButton} onPress={() => handleRemovePhoto(index, photoIndex)}>
                                      <MaterialCommunityIcons name="close" size={14} color="white" />
                                    </TouchableOpacity>
                                  </View>
                                ))}
                              </ScrollView>
                            </>
                          ) : null}
                          <View style={styles.photoActions}>
                            <Button mode="outlined" onPress={() => handleAddPhoto(index)} icon="camera" style={styles.actionButton} textColor={BRAND_COLORS.primaryBlue} compact>Cámara</Button>
                            <Button mode="outlined" onPress={() => handleChooseFromGallery(index)} icon="image-multiple" style={styles.actionButton} textColor={BRAND_COLORS.primaryBlue} compact>Galería</Button>
                            <Button mode="outlined" onPress={() => openCommentDialog(index)} icon="pencil" style={styles.actionButton} textColor={BRAND_COLORS.primaryBlue} compact>Nota</Button>
                          </View>
                        </View>
                      ) : null}
                    </View>
                  );
                }) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <SafeAreaView style={styles.buttonSafeArea} edges={['bottom']}>
        <View style={styles.buttonsContainer}>
          <Button mode="outlined" onPress={() => router.back()} style={styles.navButton} icon="arrow-left" textColor={BRAND_COLORS.primaryBlue}>Volver</Button>
          <Button mode="contained" onPress={goNext} style={styles.navButton} icon="check" contentStyle={{ flexDirection: 'row-reverse' }} buttonColor={BRAND_COLORS.primaryOrange}>Finalizar</Button>
        </View>
      </SafeAreaView>

      {commentDialogVisible ? (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, inspection.checklist[commentItemIndex ?? -1]?.status === 'cant' && { color: STATUS_COLORS.cant }]}>
              {inspection.checklist[commentItemIndex ?? -1]?.status === 'cant' ? '¿Por qué no se puede?' : 'Comentario'}
            </Text>
            <TextInput style={styles.commentInput} multiline numberOfLines={4} value={commentText} onChangeText={setCommentText} placeholder="Añade observaciones o motivo" autoFocus />
            <View style={styles.modalButtons}>
              <Button onPress={() => setCommentDialogVisible(false)} textColor={BRAND_COLORS.grayDark}>Cancelar</Button>
              <Button onPress={handleSaveComment} textColor={inspection.checklist[commentItemIndex ?? -1]?.status === 'cant' ? STATUS_COLORS.cant : BRAND_COLORS.primaryBlue}>Guardar</Button>
            </View>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND_COLORS.surface },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: SPACING.md },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BRAND_COLORS.surface, padding: SPACING.lg },
  loadingText: { color: BRAND_COLORS.grayText, fontSize: TYPOGRAPHY.sizes.md, textAlign: 'center' },
  returnButton: { marginTop: SPACING.md, borderRadius: BORDER_RADIUS.md },
  header: { padding: SPACING.lg, paddingBottom: SPACING.xl, paddingTop: SPACING.md },
  backButton: { position: 'absolute', left: 12, top: 12, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  machineTitle: { fontSize: TYPOGRAPHY.sizes.xxl, fontWeight: TYPOGRAPHY.weights.bold as any, color: 'white', letterSpacing: 0.2, paddingLeft: 46 },
  clientName: { fontSize: TYPOGRAPHY.sizes.sm, color: 'rgba(255,255,255,0.75)', marginTop: SPACING.xs, paddingLeft: 46 },
  progressContainer: { marginTop: SPACING.lg },
  progressText: { marginBottom: SPACING.sm, fontSize: TYPOGRAPHY.sizes.sm, color: 'rgba(255,255,255,0.9)', fontWeight: TYPOGRAPHY.weights.semibold as any },
  progressBar: { height: 6, borderRadius: BORDER_RADIUS.full, backgroundColor: 'rgba(255,255,255,0.15)' },
  summaryRow: { flexDirection: 'row', gap: 8, paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  summaryPill: { flex: 1, backgroundColor: 'white', borderRadius: BORDER_RADIUS.lg, paddingVertical: SPACING.sm, paddingHorizontal: 4, alignItems: 'center', ...SHADOWS.small },
  summaryValue: { fontSize: 22, fontWeight: '900' },
  summaryLabel: { fontSize: 10, color: BRAND_COLORS.grayText, fontWeight: TYPOGRAPHY.weights.bold as any, textAlign: 'center' },
  categoryCard: { marginBottom: SPACING.md, backgroundColor: 'white', borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', ...SHADOWS.soft },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.md, paddingHorizontal: SPACING.md, backgroundColor: BRAND_COLORS.tertiaryBlue, borderLeftWidth: 4, borderLeftColor: BRAND_COLORS.primaryOrange },
  categoryTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, flex: 1 },
  categoryTitle: { fontSize: TYPOGRAPHY.sizes.lg, fontWeight: TYPOGRAPHY.weights.bold as any, color: BRAND_COLORS.primaryBlue, flex: 1 },
  categoryBadge: { backgroundColor: BRAND_COLORS.primaryBlue, paddingHorizontal: SPACING.sm + 4, paddingVertical: SPACING.xs + 2, borderRadius: BORDER_RADIUS.full },
  categoryCount: { fontSize: TYPOGRAPHY.sizes.xs, color: 'white', fontWeight: TYPOGRAPHY.weights.bold as any },
  checklistItems: { padding: SPACING.lg },
  itemContainer: { padding: SPACING.md, borderTopWidth: 1, borderTopColor: BRAND_COLORS.grayLight },
  itemText: { fontSize: TYPOGRAPHY.sizes.md, marginBottom: SPACING.sm + 2, color: '#1e293b', fontWeight: TYPOGRAPHY.weights.medium as any, lineHeight: 22 },
  statusButtons: { flexDirection: 'row', gap: SPACING.sm },
  statusButton: { flex: 1, padding: SPACING.sm + 2, borderRadius: BORDER_RADIUS.lg, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  statusButtonOutline: { borderWidth: 1.5, borderColor: BRAND_COLORS.grayMedium, backgroundColor: BRAND_COLORS.grayLight },
  statusButtonText: { color: BRAND_COLORS.grayDark, fontWeight: TYPOGRAPHY.weights.medium as any, fontSize: TYPOGRAPHY.sizes.sm, textAlign: 'center' },
  statusButtonTextActive: { color: 'white', fontWeight: TYPOGRAPHY.weights.bold as any, fontSize: TYPOGRAPHY.sizes.sm, textAlign: 'center' },
  photoSection: { marginTop: SPACING.sm, backgroundColor: BRAND_COLORS.errorLight, padding: SPACING.sm, borderRadius: BORDER_RADIUS.md },
  commentBox: { backgroundColor: 'white', padding: SPACING.sm, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.sm, borderLeftWidth: 3, borderLeftColor: BRAND_COLORS.primaryOrange },
  commentText: { fontSize: TYPOGRAPHY.sizes.xs, color: BRAND_COLORS.primaryBlue, fontWeight: TYPOGRAPHY.weights.semibold as any },
  cantCommentBox: { backgroundColor: '#f3f0ff', padding: SPACING.sm, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.sm, borderLeftWidth: 3, borderLeftColor: '#7c3aed' },
  cantCommentText: { fontSize: TYPOGRAPHY.sizes.xs, color: '#5b21b6', fontWeight: TYPOGRAPHY.weights.semibold as any },
  photosTitle: { fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.bold as any, color: BRAND_COLORS.primaryBlue, marginBottom: SPACING.sm },
  photosScrollView: { marginBottom: SPACING.sm },
  photoContainer: { position: 'relative', marginRight: SPACING.sm, borderRadius: BORDER_RADIUS.md, overflow: 'hidden', width: 110 },
  photo: { width: 110, height: 110, borderRadius: BORDER_RADIUS.md },
  deleteButton: { position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: BORDER_RADIUS.full, backgroundColor: 'rgba(220, 38, 38, 0.85)', justifyContent: 'center', alignItems: 'center' },
  photoActions: { flexDirection: 'row', gap: SPACING.sm },
  actionButton: { flex: 1, borderColor: BRAND_COLORS.primaryBlue, borderRadius: BORDER_RADIUS.md },
  buttonSafeArea: { backgroundColor: 'white' },
  buttonsContainer: { flexDirection: 'row', justifyContent: 'space-between', padding: SPACING.md, paddingTop: SPACING.md + 2, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: BRAND_COLORS.grayLight, ...SHADOWS.soft },
  navButton: { flex: 1, marginHorizontal: SPACING.sm, borderRadius: BORDER_RADIUS.lg },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: 'white', borderRadius: BORDER_RADIUS.xl + 4, padding: SPACING.xl, width: '88%', maxWidth: 400, ...SHADOWS.large },
  modalTitle: { fontSize: TYPOGRAPHY.sizes.xl, fontWeight: TYPOGRAPHY.weights.bold as any, marginBottom: SPACING.md, color: BRAND_COLORS.primaryBlue },
  commentInput: { borderWidth: 1.5, borderColor: BRAND_COLORS.grayMedium, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, backgroundColor: BRAND_COLORS.grayLight, textAlignVertical: 'top', minHeight: 90, fontSize: TYPOGRAPHY.sizes.md },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: SPACING.lg, gap: SPACING.sm },
});
